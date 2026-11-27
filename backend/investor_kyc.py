"""Investor-only CNIC, selfie and liveness verification."""
import hashlib
import json
import logging
import os
import re
import subprocess
import time
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from uuid import uuid4

import cv2
import numpy as np
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from firebase_admin import exceptions
from google.auth.exceptions import GoogleAuthError
from pydantic import BaseModel, Field

from .api import UPLOADS
from .firebase_connection import BASE_DIR, PUBLIC_BASE_URL, reference, require_user

router = APIRouter()
runtime = BASE_DIR / ".kyc-runtime"
os.environ.setdefault("DEEPFACE_HOME", str(runtime))
media = UPLOADS / "kyc"
logger = logging.getLogger(__name__)
guard = [Lock() for _ in range(64)]
challenge_guard = Lock()
face_engine_lock = Lock()
face_engine = None
CNIC = re.compile(r"(?<!\d)(\d{5})[ \-–]*(\d{7})[ \-–]*(\d)(?!\d)")
UID = re.compile(r"^[A-Za-z0-9_-]{1,128}$")
ATTEMPT = re.compile(r"^[a-f0-9]{32}$")
MISMATCH = "Face mismatch: Live selfie does not match CNIC photo"
EVIDENCE = {"front.jpg", "back.jpg", "cnic_face.jpg", "selfie.jpg", "liveness.jpg"}


def db_read(path):
    try:
        return reference(path).get()
    except (exceptions.FirebaseError, GoogleAuthError, OSError):
        raise HTTPException(503, "Firebase KYC status is unavailable") from None


def db_update(fields):
    try:
        reference("/").update(fields)
    except (exceptions.FirebaseError, GoogleAuthError, OSError):
        raise HTTPException(503, "Could not save KYC progress. Please retry.") from None


def investor(claims: dict = Depends(require_user)):
    uid = claims["uid"]
    if not UID.fullmatch(uid) or claims.get("email_verified") is not True:
        raise HTTPException(403, "Verify your investor email before starting KYC")
    profile = db_read(f"users/{uid}") or {}
    if profile.get("role") != "investor":
        raise HTTPException(403, "Investor account required")
    return uid


def state(uid):
    return db_read(f"investor_biometrics/{uid}") or {}


def response(record):
    return {key: record[key] for key in (
        "stage", "fullName", "cnicNumber", "frontQuality", "backQuality",
        "faceMatchScore", "livenessPassed", "verifiedAt",
    ) if key in record} | {"stage": record.get("stage", 0)}


def upload_image(file, *, min_dimension=260, blur_threshold=65, check_frame_quality=True):
    raw = file.file.read(10 * 1024 * 1024 + 1)
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(413, "Images must be 10 MB or smaller")
    try:
        image = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
    except cv2.error:
        image = None
    if image is None or min(image.shape[:2]) < min_dimension or max(image.shape[:2]) > 6500:
        raise HTTPException(400, "Capture a clear JPEG or PNG with the whole card or face visible")
    if max(image.shape[:2]) > 2100:
        scale = 2100 / max(image.shape[:2])
        image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    if not check_frame_quality:
        return image
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    laplacian = cv2.Laplacian(gray, cv2.CV_64F).var()
    if laplacian < blur_threshold or not 35 < np.mean(gray) < 235:
        raise HTTPException(400, "Image is blurry or poorly lit. Hold steady and retake it in even light.")
    return image


def crop_card_region(image):
    """Find the light card surface even when an edge touches the camera frame."""
    height, width = image.shape[:2]
    scale = min(1, 900 / max(width, height))
    sample = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA) if scale < 1 else image
    gray = cv2.cvtColor(sample, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(sample, cv2.COLOR_BGR2HSV)
    cutoff, _ = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    bright_card = ((gray >= np.clip(cutoff + 12, 103, 182)) & (hsv[:, :, 1] < 112)).astype(np.uint8)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (13, 9))
    mask = cv2.morphologyEx(bright_card, cv2.MORPH_CLOSE, kernel)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    best = None
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        if h < 150 * scale or w < 260 * scale or not 1.19 <= w / h <= 2.32:
            continue
        area = cv2.contourArea(contour)
        if area < .63 * w * h or area < .18 * gray.size:
            continue
        score = area / gray.size - .12 * abs(w / h - 1.59)
        if best is None or score > best[0]:
            best = (score, x, y, w, h)
    if best is None:
        return image
    _, x, y, w, h = best
    pad = 10 / scale
    return image[max(0, int(y / scale - pad)):min(height, int((y + h) / scale + pad)),
                 max(0, int(x / scale - pad)):min(width, int((x + w) / scale + pad))]


def document_details_visible(card):
    gray = cv2.cvtColor(card, cv2.COLOR_BGR2GRAY)
    scale = min(1, 1050 / max(gray.shape))
    if scale < 1:
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    usable_tiles = 0
    for row in np.array_split(gray, 4):
        for tile in np.array_split(row, 5, axis=1):
            low, high = np.percentile(tile, (10, 90))
            if 48 < np.median(tile) < 242 and high - low >= 20 and cv2.Laplacian(tile, cv2.CV_64F).var() >= 48:
                usable_tiles += 1
    return usable_tiles >= 2


def scan_document(file, side):
    try:
        original = upload_image(file, check_frame_quality=False)
    except HTTPException as error:
        raise HTTPException(error.status_code, f"CNIC {side}: {error.detail}") from None
    document = crop_card_region(original)
    if not document_details_visible(document):
        raise HTTPException(400, f"CNIC {side}: The card text is blurry or poorly lit. Retake this side in even light.")
    return original, document


def document_portrait(document):
    try:
        return detect_face(document, require_single=False)
    except HTTPException as error:
        if error.status_code != 400:
            raise
    # Correct uneven illumination for detection. Save the portrait from the original pixels.
    lab = cv2.cvtColor(document, cv2.COLOR_BGR2LAB)
    lab[:, :, 0] = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(lab[:, :, 0])
    try:
        return detect_face(cv2.cvtColor(lab, cv2.COLOR_LAB2BGR), require_single=False)
    except HTTPException as error:
        if error.status_code == 400:
            raise HTTPException(400, "CNIC Front: Could not detect the main portrait. Keep it fully visible and avoid glare.") from None
        raise


def detect_face(image, *, require_single=True):
    model = runtime / "yunet.onnx"
    if not model.is_file():
        raise HTTPException(503, "OpenCV face detector has not been installed")
    h, w = image.shape[:2]
    scale = min(1, 1000 / max(w, h))
    frame = cv2.resize(image, None, fx=scale, fy=scale) if scale < 1 else image
    try:
        detector = cv2.FaceDetectorYN_create(str(model), "", frame.shape[1::-1], .83, .3, 300)
        _, faces = detector.detect(frame)
    except cv2.error:
        logger.exception("OpenCV face detector failed")
        raise HTTPException(503, "Face detector is unavailable") from None
    if faces is None or (require_single and len(faces) != 1):
        raise HTTPException(400, "Exactly one clear human face is required")
    largest = max(faces, key=lambda face: face[2] * face[3])
    return largest[:-1] / scale


def crop_face(image, face):
    x, y, w, h = face[:4]
    margin = max(w, h) * .38
    return image[max(0, int(y-margin)):min(image.shape[0], int(y+h+margin)),
                 max(0, int(x-margin)):min(image.shape[1], int(x+w+margin))]


def write_image(path, image):
    ok, encoded = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 94])
    if not ok:
        raise HTTPException(400, "Image could not be encoded")
    temp = path.with_name(path.name + ".pending")
    try:
        temp.write_bytes(encoded.tobytes())
        os.replace(temp, path)
    finally:
        temp.unlink(missing_ok=True)


def ocr_input(image, path):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8)).apply(gray)
    write_image(path, gray)


def extract_text(folder, *images, mode="mixed"):
    paths = [folder / f"{index}.ocr.jpg" for index in range(len(images))]
    try:
        for image, path in zip(images, paths):
            ocr_input(image, path)
        result = subprocess.run(
            ["node", str(BASE_DIR / "kyc-ocr.cjs"), mode, *(str(path) for path in paths)],
            capture_output=True, timeout=75, check=True, encoding="utf-8",
        )
        return json.loads(result.stdout)
    except (OSError, ValueError, subprocess.SubprocessError):
        logger.warning("Investor KYC OCR runtime failed")
        raise HTTPException(503, "CNIC OCR is temporarily unavailable") from None
    finally:
        for path in paths:
            path.unlink(missing_ok=True)


def normalize_ocr(text):
    text = unicodedata.normalize("NFKC", text)
    return "".join(
        str(unicodedata.decimal(char)) if char.isdecimal() else "-" if unicodedata.category(char) == "Pd" or char == "\u2212" else char
        for char in text
        if unicodedata.category(char) != "Cf" and char != "\ufffd"
    )


NAME_LABEL = re.compile(r"^[^A-Za-z0-9]*(?:full\s+)?na(?:m|rn)e\b[\s:.-]*(.*)$", re.I)
OTHER_LABEL = re.compile(
    r"\b(?:father|mother|husband|guardian|signature|identity|country|gender|date|surname|national|pakistan)\b",
    re.I,
)


def extract_holder_name(front_text):
    lines = [line.strip() for line in normalize_ocr(front_text).splitlines() if line.strip()]
    for index, line in enumerate(lines):
        label = NAME_LABEL.match(line)
        if label is None:
            continue
        candidates = [label[1], *lines[index + 1:index + 3]]
        for candidate in candidates:
            if OTHER_LABEL.match(candidate) or NAME_LABEL.match(candidate):
                break
            candidate = OTHER_LABEL.split(candidate, maxsplit=1)[0].strip()
            # Bilingual OCR sometimes puts the Urdu column on the same line.
            printed = re.match(r"^[^A-Za-z0-9]*([A-Za-z][A-Za-z .'\-]*)", candidate)
            if not printed:
                continue
            full_name = " ".join(printed[1].split()).strip(" .-'")
            if len(full_name.split()) >= 2 and len(full_name) <= 100:
                return full_name
    return None


def extract_card_numbers(text):
    return ["-".join(match.groups()) for match in CNIC.finditer(normalize_ocr(text))]


def parse_front(front_text, official_name=None):
    numbers = extract_card_numbers(front_text)
    if not numbers:
        raise HTTPException(400, "Could not read a 13-digit CNIC from the front. Retake a clear photo.")
    name = official_name or extract_holder_name(front_text)
    if not name:
        raise HTTPException(400, "Could not read the Name field on the CNIC front. Use a glare-free photo.")
    return name, numbers[0]


def verify_card_back(folder, back, back_text, number):
    back_numbers = set(extract_card_numbers(back_text))
    if number in back_numbers:
        return

    height, width = back.shape[:2]
    gray = cv2.cvtColor(back, cv2.COLOR_BGR2GRAY)
    has_qr, corners = cv2.QRCodeDetector().detect(gray)
    areas = []
    if has_qr:
        # The printed CNIC number is above the QR, while the serial is below it.
        points = corners.reshape(4, 2)
        edge = points[1] - points[0]
        angle = float(np.degrees(np.arctan2(edge[1], edge[0])))
        transform = cv2.getRotationMatrix2D(tuple(map(float, points[0])), angle, 1)
        aligned = cv2.warpAffine(back, transform, (width, height), borderMode=cv2.BORDER_REPLICATE)
        x, y, w, h = cv2.boundingRect(cv2.transform(corners, transform).reshape(-1, 2))
        above_qr = aligned[max(0, int(y - .75 * h)):max(0, int(y - .07 * h))]
        # Keep adjacent address text out of the first pass. Try a wider crop
        # as well for layouts where the number extends farther left.
        for left_margin in (.16, .42):
            area = above_qr[:, max(0, int(x - left_margin * w)):min(width, int(x + 1.55 * w))]
            if area.size:
                areas.append(area)
    areas.append(back[:int(height * .18), int(width * .62):])
    lines = []
    for area in areas:
        scale = max(1, 115 / area.shape[0])
        lines.append(cv2.resize(area, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC) if scale > 1 else area)
    for text in extract_text(folder, *lines, mode="number"):
        back_numbers.update(extract_card_numbers(text))
    if number in back_numbers:
        return
    if back_numbers:
        raise HTTPException(400, "The CNIC number on the back does not match the front. Upload both sides of the same card.")

    # Some older layouts do not print the CNIC number on the back.
    back_text = normalize_ocr(back_text)
    back_marker = re.search(
        r"\b(?:address|nadra|identity|signature|authority|national)\b|\u067e\u062a\u06c1|\u0646\u0627\u062f\u0631\u0627|\u0634\u0646\u0627\u062e\u062a|\u062f\u0633\u062a\u062e\u0637",
        back_text, re.I,
    )
    if has_qr or not back_marker or len(re.findall(r"[^\W\d_]{2,}", back_text)) < 5:
        raise HTTPException(400, "Could not read the CNIC number on the back. Keep the number above the QR code fully visible.")


def read_card(folder, front, back, face):
    width = front.shape[1]
    x, _, face_width, _ = face[:4]
    center = (x + face_width / 2) / width
    text_region = None
    if center > .6:
        text_region = front[:, :max(1, int(x - face_width * .65))]
    elif center < .4:
        text_region = front[:, min(width - 1, int(x + face_width * 1.65)):]

    region = text_region if text_region is not None and text_region.shape[1] >= 260 else front
    front_text, back_text = extract_text(folder, region, back)
    try:
        name, number = parse_front(front_text)
    except HTTPException as error:
        if error.status_code != 400:
            raise

        height = region.shape[0]
        details = region[int(height * .14):int(height * .54)]
        if details.shape[0] < 280:
            details = cv2.resize(details, None, fx=1.55, fy=1.55, interpolation=cv2.INTER_CUBIC)
        alternate = extract_text(folder, details, region, mode="english")
        official_name = next((value for text in alternate if (value := extract_holder_name(text))), None)
        candidate = front_text if extract_card_numbers(front_text) else alternate[-1]
        if official_name and extract_card_numbers(candidate):
            name, number = parse_front(candidate, official_name)
        else:
            if region is not front:
                front_text, = extract_text(folder, front)
            name, number = parse_front(front_text, official_name)

    verify_card_back(folder, back, back_text, number)
    return name, number


def folder_for(uid, record):
    attempt = record.get("attempt")
    if not isinstance(attempt, str) or not ATTEMPT.fullmatch(attempt):
        raise HTTPException(409, "Start by verifying the CNIC front and back")
    return media / uid / attempt


def asset_url(uid, folder, name):
    return f"{PUBLIC_BASE_URL}/static/uploads/kyc/{uid}/{folder.name}/{name}"


def comparison_portrait(path):
    image = cv2.imread(str(path))
    if image is None:
        raise HTTPException(400, "Could not read a face image for comparison.")
    # Recover contrast in a printed portrait without changing its geometry.
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    lab[:, :, 0] = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(lab[:, :, 0])
    image = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    face = detect_face(image)
    right_eye, left_eye = face[4:6], face[6:8]
    edge = left_eye - right_eye
    center = (left_eye + right_eye) / 2
    angle = float(np.degrees(np.arctan2(edge[1], edge[0])))
    transform = cv2.getRotationMatrix2D(tuple(map(float, center)), angle, 1)
    aligned = cv2.warpAffine(image, transform, image.shape[1::-1], borderMode=cv2.BORDER_REPLICATE)
    # Rotate the face center too, as the pivot is between the eyes.
    x, y, w, h = face[:4]
    middle = transform @ np.array([x + w / 2, y + h / 2, 1])
    portrait = crop_face(aligned, (middle[0] - w / 2, middle[1] - h / 2, w, h))
    if min(portrait.shape[:2]) < 220:
        scale = 220 / min(portrait.shape[:2])
        portrait = cv2.resize(portrait, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    return portrait


def get_face_engine():
    global face_engine
    with face_engine_lock:
        if face_engine is None:
            from deepface import DeepFace

            start = time.monotonic()
            model = DeepFace.build_model("Facenet512")
            # Run one inference up front so TensorFlow prepares its CPU kernels.
            model.forward(np.zeros((*model.input_shape, 3), dtype=np.float32))
            face_engine = DeepFace
            logger.info("Investor FaceNet512 ready (weights and inference in %.1fs)", time.monotonic() - start)
        return face_engine


def warm_face_engine():
    try:
        get_face_engine()
    except Exception:
        logger.exception("Investor FaceNet512 warmup failed")


def is_face_detection_error(error):
    while error is not None:
        if type(error).__name__ == "FaceNotDetected" or (
            isinstance(error, ValueError) and
            any(phrase in str(error).lower() for phrase in ("face cannot be detected", "face could not be detected"))
        ):
            return True
        error = error.__cause__
    return False


def strict_match(first, second):
    if not first.is_file() or not second.is_file():
        raise HTTPException(409, "Verification images are missing. Restart from the CNIC capture.")
    try:
        engine = get_face_engine()
        for prepare in (str, comparison_portrait):
            try:
                result = engine.verify(prepare(first), prepare(second), model_name="Facenet512",
                                         enforce_detection=True, silent=True)
            except Exception as error:
                # DeepFace can wrap detector errors in a generic ValueError.
                if is_face_detection_error(error):
                    continue
                raise
            if result.get("verified") is True:
                distance = float(result["distance"])
                return round(max(0, min(100, 100 * (1 - distance))), 2)
    except HTTPException as error:
        if error.status_code != 400:
            raise
    except ImportError:
        raise HTTPException(503, "Strict FaceNet512 matching is not installed") from None
    except Exception as error:
        logger.warning("FaceNet512 could not run (%s)", type(error).__name__)
        raise HTTPException(503, "Strict FaceNet512 matching is temporarily unavailable") from None
    raise HTTPException(400, MISMATCH)


@router.get("/api/kyc/status")
def kyc_status(uid: str = Depends(investor)):
    return response(state(uid))


@router.get("/static/uploads/kyc/{uid}/{attempt}/{filename}", include_in_schema=False)
def read_kyc_media(uid: str, attempt: str, filename: str, claims: dict = Depends(require_user)):
    if claims["uid"] != uid and not (claims.get("admin") and claims.get("email_verified")):
        raise HTTPException(403, "KYC media access denied")
    if not UID.fullmatch(uid) or not ATTEMPT.fullmatch(attempt) or filename not in EVIDENCE:
        raise HTTPException(404)
    path = media / uid / attempt / filename
    if not path.is_file():
        raise HTTPException(404)
    return FileResponse(path, media_type="image/jpeg", headers={
        "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    })


@router.post("/api/kyc/extract-cnic")
def extract_cnic(front: UploadFile = File(...), back: UploadFile = File(...), uid: str = Depends(investor)):
    with guard[hash(uid) % len(guard)]:
        current = state(uid)
        if current.get("stage") == 3:
            return response(current)
        original_front, first = scan_document(front, "Front")
        original_back, second = scan_document(back, "Back")
        face = document_portrait(first)
        attempt = uuid4().hex
        folder = media / uid / attempt
        folder.mkdir(parents=True, exist_ok=False)
        name, number = read_card(folder, first, second, face)
        write_image(folder / "front.jpg", original_front)
        write_image(folder / "back.jpg", original_back)
        write_image(folder / "cnic_face.jpg", crop_face(first, face))
        fields = {
            "fullName": name, "cnicNumber": number,
            "cnicFrontUrl": asset_url(uid, folder, "front.jpg"),
            "cnicBackUrl": asset_url(uid, folder, "back.jpg"),
            "frontQuality": "OK", "backQuality": "OK",
        }
        record = {"stage": 1, "attempt": attempt, **fields}
        db_update({
            f"investor_biometrics/{uid}": record,
            f"users/{uid}/name": name, f"users/{uid}/fullName": name,
            f"users/{uid}/cnicNumber": number,
            f"users/{uid}/kyc": {**fields, "kycStatus": "CNIC_EXTRACTED"},
            f"onboarding/{uid}/profile/fullName": name,
            f"onboarding/{uid}/profile/cnicNumber": number,
        })
        return response(record)


@router.post("/api/kyc/verify-selfie")
def verify_selfie(selfie: UploadFile = File(...), uid: str = Depends(investor)):
    with guard[hash(uid) % len(guard)]:
        record = state(uid)
        if record.get("stage") == 3:
            return response(record)
        folder = folder_for(uid, record)
        frame = upload_image(selfie)
        try:
            detect_face(frame)
        except HTTPException as error:
            if error.status_code == 400:
                raise HTTPException(400, "Selfie needs one clear face. Face the camera in even light.") from None
            raise
        candidate = folder / "selfie.review.jpg"
        try:
            write_image(candidate, frame)
            score = strict_match(folder / "cnic_face.jpg", candidate)
            os.replace(candidate, folder / "selfie.jpg")
        finally:
            candidate.unlink(missing_ok=True)
        record |= {"stage": 2, "faceMatchScore": score, "liveSelfieUrl": asset_url(uid, folder, "selfie.jpg")}
        db_update({
            f"investor_biometrics/{uid}": record,
            f"users/{uid}/kyc/kycStatus": "SELFIE_MATCHED",
            f"users/{uid}/kyc/liveSelfieUrl": record["liveSelfieUrl"],
            f"users/{uid}/kyc/faceMatchScore": score,
        })
        with challenge_guard:
            challenges.pop(uid, None)
        return response(record)


@dataclass
class Challenge:
    token: str
    attempt: str
    expiry: float
    phase: int = 0
    baseline: float = 0
    baseline_turn: float = 0
    hits: int = 0
    last_hash: str = ""
    ready_hash: str = ""


challenges: dict[str, Challenge] = {}
CHALLENGE_IDLE_SECONDS = 120


@router.post("/api/kyc/start-liveness")
def start_liveness(uid: str = Depends(investor)):
    record = state(uid)
    if record.get("stage") != 2:
        raise HTTPException(409, "Match your live selfie before beginning liveness")
    now = time.monotonic()
    challenge = Challenge(uuid4().hex, record["attempt"], now + CHALLENGE_IDLE_SECONDS)
    with challenge_guard:
        for owner in [owner for owner, item in challenges.items() if item.expiry < now]:
            del challenges[owner]
        challenges[uid] = challenge
    return {"challenge": challenge.token}


def get_challenge(uid, token):
    current = challenges.get(uid)
    if current is None or current.token != token or current.expiry <= time.monotonic():
        raise HTTPException(409, "Liveness session expired. Start the camera challenge again.")
    return current


@router.post("/api/kyc/liveness-frame")
def liveness_frame(frame: UploadFile = File(...), challenge: str = Form(...), claims: dict = Depends(require_user)):
    uid = claims["uid"]
    if claims.get("email_verified") is not True:
        raise HTTPException(403, "Verify your email before liveness")
    with challenge_guard:
        get_challenge(uid, challenge)
    image = upload_image(frame, min_dimension=220, blur_threshold=23)
    face = detect_face(image)
    frame_hash = hashlib.sha256(image.tobytes()).hexdigest()
    nose = float(face[8]) / image.shape[1]
    eye_midpoint = (face[4] + face[6]) / 2
    eye_width = max(1, abs(face[4] - face[6]))
    turn = float((face[8] - eye_midpoint) / eye_width)
    with challenge_guard:
        current = get_challenge(uid, challenge)
        if current.phase >= 4 or frame_hash == current.last_hash:
            return {"phase": current.phase}
        current.last_hash = frame_hash
        if current.phase == 0:
            if not .29 < nose < .71 or abs(turn) > .24:
                return {"phase": 0}
            current.baseline = nose
            current.baseline_turn = turn
            current.phase = 1
            current.expiry = time.monotonic() + CHALLENGE_IDLE_SECONDS
            return {"phase": 1}
        # The preview is mirrored, so the user's left is positive in the raw frame.
        shift = nose - current.baseline
        turn_change = turn - current.baseline_turn
        accepted = (
            (current.phase == 1 and (shift > .055 or turn_change > .14)) or
            (current.phase == 2 and (shift < -.055 or turn_change < -.14)) or
            (current.phase == 3 and .27 < nose < .73 and abs(turn) < .27)
        )
        current.hits = current.hits + 1 if accepted else 0
        if current.hits >= 2:
            current.phase += 1
            current.hits = 0
            current.expiry = time.monotonic() + CHALLENGE_IDLE_SECONDS
            if current.phase == 4:
                current.ready_hash = frame_hash
        return {"phase": current.phase}


@router.post("/api/kyc/verify-liveness-video")
def verify_liveness_video(frame: UploadFile = File(...), challenge: str = Form(...),
                          uid: str = Depends(investor), claims: dict = Depends(require_user)):
    with guard[hash(uid) % len(guard)]:
        record = state(uid)
        if record.get("stage") == 3:
            return response(record)
        if record.get("stage") != 2:
            raise HTTPException(409, "Match your live selfie first")
        image = upload_image(frame, min_dimension=220, blur_threshold=23)
        with challenge_guard:
            current = get_challenge(uid, challenge)
            if (current.phase != 4 or current.attempt != record["attempt"] or
                current.ready_hash != hashlib.sha256(image.tobytes()).hexdigest()):
                raise HTTPException(400, "Complete the left, right and straight camera challenge")
        folder = folder_for(uid, record)
        candidate = folder / "liveness.review.jpg"
        try:
            write_image(candidate, image)
            score = min(strict_match(folder / "selfie.jpg", candidate),
                        strict_match(folder / "cnic_face.jpg", candidate), record["faceMatchScore"])
            os.replace(candidate, folder / "liveness.jpg")
        finally:
            candidate.unlink(missing_ok=True)
        verified = {
            **{key: record[key] for key in ("fullName", "cnicNumber", "cnicFrontUrl", "cnicBackUrl", "liveSelfieUrl")},
            "name": record["fullName"], "kycStatus": "VERIFIED", "livenessPassed": True,
            "faceMatchScore": score, "verifiedAt": {".sv": "timestamp"},
        }
        final = {**record, **verified, "stage": 3}
        db_update({
            f"investor_biometrics/{uid}": final,
            f"users/{uid}/kyc": verified,
            **{f"users/{uid}/{key}": value for key, value in verified.items()},
            f"onboarding/{uid}/onboardingStage": "completed",
            f"onboarding/{uid}/kyc": verified,
            f"investors/{uid}/profile/fullName": record["fullName"],
            f"investors/{uid}/profile/uid": uid,
            f"investors/{uid}/profile/role": "investor",
            f"investors/{uid}/profile/email": claims["email"],
            f"investors/{uid}/profile/kycStatus": "VERIFIED",
        })
        with challenge_guard:
            if challenges.get(uid) is current:
                del challenges[uid]
        return response(state(uid))

class InvestorFinancialDetails(BaseModel):
    bankName: str = Field(min_length=1, max_length=150)
    accountTitle: str = Field(min_length=1, max_length=150)
    accountNumber: str = Field(min_length=8, max_length=64)
    phone: str = Field(min_length=4, max_length=30)


@router.put("/api/kyc/investor-details")
def save_details(details: InvestorFinancialDetails, uid: str = Depends(investor)):
    if state(uid).get("stage") != 3:
        raise HTTPException(403, "Complete identity verification before adding banking details")
    bank = details.model_dump(exclude={"phone"})
    db_update({
        f"investors/{uid}/profile/bankDetails": bank,
        f"investors/{uid}/profile/mobilePhoneForOtp": details.phone,
    })
    return {"saved": True}
