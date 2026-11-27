import os
import gc
import tempfile
import logging
from contextlib import asynccontextmanager
from threading import Event, Thread
os.environ.setdefault('OPENCV_IO_MAX_IMAGE_PIXELS', '42250000')
import cv2
import numpy as np
from typing import Optional
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from .api import PublicUploads, UPLOADS, router
from .firebase_connection import FRONTEND_ORIGINS, reference, require_user

from .investor_kyc import router as investor_kyc_router, warm_face_engine
from .marketplace import router as marketplace_router
from .briefing_audio import router as briefing_audio_router
from .dossier import deliver_due_samples, router as dossier_router
from .founder_workspace import router as founder_workspace_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Thread(target=warm_face_engine, name="investor-facenet-warmup", daemon=True).start()
    stopped = Event()

    def sample_notifications():
        while not stopped.is_set():
            try:
                deliver_due_samples()
            except Exception:
                logging.getLogger(__name__).warning("Sample notification scan failed", exc_info=True)
            stopped.wait(30)

    Thread(target=sample_notifications, name="sample-delivery-notifications", daemon=True).start()
    try:
        yield
    finally:
        stopped.set()


app = FastAPI(title="InvestBiz Backend", lifespan=lifespan)
app.include_router(router)
app.include_router(investor_kyc_router)
app.include_router(marketplace_router)
app.include_router(briefing_audio_router)
app.include_router(dossier_router)
app.include_router(founder_workspace_router)
app.mount("/static/uploads", PublicUploads(directory=UPLOADS), name="uploads")
logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


FACE_CASCADE = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)
PROFILE_CASCADE = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_profileface.xml"
)
EYE_CASCADE = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_eye.xml"
)

# Internal gate only — never expose this number in user-facing error text.
MATCH_THRESHOLD = 65.0


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "kyc-engine",
        "engine": "opencv-multimetric",
        "match_threshold": MATCH_THRESHOLD,
    }


def decode_and_resize(image_path, max_width=1200):
    img = cv2.imread(image_path)
    if img is None:
        return None
    h, w = img.shape[:2]
    if w > max_width:
        scale = max_width / w
        img = cv2.resize(img, (max_width, int(h * scale)))
    return img


def _is_blank_or_junk(img: np.ndarray) -> bool:
    """Reject solid black/white/flat images (wrong uploads, blank files)."""
    if img is None:
        return True
    mean = float(img.mean())
    std = float(img.std())
    if mean < 14.0 or mean > 248.0:
        return True
    if std < 10.0:
        return True
    return False


def _face_has_eyes(gray: np.ndarray, box: tuple[int, int, int, int], min_eyes: int = 1) -> bool:
    x, y, w, h = box
    roi = gray[y : y + h, x : x + w]
    if roi.size == 0:
        return False
    upper = roi[0 : max(1, int(h * 0.62)), :]
    eyes = EYE_CASCADE.detectMultiScale(
        upper, scaleFactor=1.08, minNeighbors=4, minSize=(12, 12)
    )
    return len(eyes) >= min_eyes


def validate_cnic_front(img: np.ndarray) -> tuple[bool, str]:
    """
    CNIC front must be a real card photo with a visible portrait face.
    Blocks blank/black images and false-positive 'faces' on random sketches.
    """
    if img is None:
        return False, "Please upload a correct CNIC front photo."
    if _is_blank_or_junk(img):
        return False, "CNIC front looks blank or invalid. Please upload a clear photo of your CNIC front."

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    enhanced = _enhance_gray(gray)
    img_area = gray.shape[0] * gray.shape[1]

    candidates: list[tuple[int, int, int, int]] = []
    for src in (gray, enhanced):
        found = FACE_CASCADE.detectMultiScale(
            src, scaleFactor=1.08, minNeighbors=5, minSize=(50, 50)
        )
        for box in found:
            candidates.append(tuple(int(v) for v in box))

    # Prefer faces with eyes (rejects notebook sketches / logos)
    valid = []
    for box in _nms_faces(candidates):
        x, y, w, h = box
        area_ratio = (w * h) / max(1, img_area)
        cy = (y + h / 2) / max(1, gray.shape[0])
        if area_ratio < 0.02:
            continue
        if cy > 0.82:  # ghost photo zone
            continue
        eyes_ok = _face_has_eyes(gray, box, min_eyes=1) or _face_has_eyes(
            enhanced, box, min_eyes=1
        )
        # Prefer 2 eyes when possible; single-eye only if face is large enough
        two_eyes = _face_has_eyes(gray, box, min_eyes=2) or _face_has_eyes(
            enhanced, box, min_eyes=2
        )
        if not eyes_ok:
            continue
        if not two_eyes and area_ratio < 0.04:
            continue
        valid.append(box)

    if not valid:
        # Fallback: known NADRA portrait zones must contain a face+eyes
        h, w = gray.shape[:2]
        for sx, sw in ((int(w * 0.55), int(w * 0.42)), (int(w * 0.02), int(w * 0.40))):
            sy, sh = int(h * 0.08), int(h * 0.75)
            crop = gray[sy : sy + sh, sx : sx + sw]
            local = FACE_CASCADE.detectMultiScale(
                crop, scaleFactor=1.08, minNeighbors=5, minSize=(48, 48)
            )
            for box in local:
                lx, ly, lw, lh = [int(v) for v in box]
                if _face_has_eyes(crop, (lx, ly, lw, lh)):
                    return True, ""
        return (
            False,
            "Please upload a correct CNIC front photo — your face on the card must be clearly visible.",
        )

    return True, ""


def validate_cnic_back(img: np.ndarray) -> tuple[bool, str]:
    if img is None:
        return False, "Please upload a correct CNIC back photo."
    if _is_blank_or_junk(img):
        return False, "CNIC back looks blank or invalid. Please upload a clear photo of your CNIC back."
    return True, ""


def _enhance_gray(gray: np.ndarray) -> np.ndarray:
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    return clahe.apply(gray)


def _detect_faces(gray: np.ndarray, min_size: int = 40) -> list:
    """Multi-pass Haar detection for CNIC portraits + webcam selfies."""
    enhanced = _enhance_gray(gray)
    candidates: list[tuple[int, int, int, int]] = []

    for src in (gray, enhanced):
        for scale, neighbors, minsz in (
            (1.08, 4, min_size),
            (1.05, 3, max(24, min_size // 2)),
            (1.12, 5, min_size),
        ):
            found = FACE_CASCADE.detectMultiScale(
                src, scaleFactor=scale, minNeighbors=neighbors, minSize=(minsz, minsz)
            )
            for box in found:
                candidates.append(tuple(int(v) for v in box))

        profile = PROFILE_CASCADE.detectMultiScale(
            src, scaleFactor=1.08, minNeighbors=4, minSize=(min_size, min_size)
        )
        for box in profile:
            candidates.append(tuple(int(v) for v in box))

    return _nms_faces(candidates)


def _nms_faces(boxes: list[tuple[int, int, int, int]], iou_thresh: float = 0.35):
    if not boxes:
        return []
    boxes = sorted(boxes, key=lambda b: b[2] * b[3], reverse=True)
    kept: list[tuple[int, int, int, int]] = []
    for box in boxes:
        x, y, w, h = box
        overlap = False
        for kx, ky, kw, kh in kept:
            ix1, iy1 = max(x, kx), max(y, ky)
            ix2, iy2 = min(x + w, kx + kw), min(y + h, ky + kh)
            inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
            union = w * h + kw * kh - inter
            if union > 0 and inter / union > iou_thresh:
                overlap = True
                break
        if not overlap:
            kept.append(box)
    return kept


def _pick_best_face(
    faces: list[tuple[int, int, int, int]], img_h: int, img_w: int, mode: str
) -> Optional[tuple[int, int, int, int]]:
    """
    Prefer real portrait over CNIC ghost photo (bottom-left watermark).
    Newer NADRA cards place the portrait on the right side.
    """
    if not faces:
        return None

    scored = []
    for x, y, w, h in faces:
        area = w * h
        cy = (y + h / 2) / max(1, img_h)
        cx = (x + w / 2) / max(1, img_w)
        bottom_penalty = 0.45 if cy > 0.75 else 0.0
        size_ratio = area / max(1, img_h * img_w)
        tiny_penalty = 0.5 if size_ratio < 0.012 else 0.0
        center_bonus = 0.0
        side_bonus = 0.0
        if mode == "selfie":
            center_bonus = 0.18 * (1.0 - abs(cx - 0.5) * 2)
        elif mode == "cnic":
            # Portrait usually right (new) or left (old); never bottom ghost
            side_bonus = 0.12 if cx > 0.52 else (0.08 if cx < 0.42 else 0.0)
        score = size_ratio + center_bonus + side_bonus - bottom_penalty - tiny_penalty
        scored.append((score, (x, y, w, h)))

    scored.sort(key=lambda t: t[0], reverse=True)
    return scored[0][1]


def extract_face(img: np.ndarray, mode: str = "selfie") -> Optional[np.ndarray]:
    if img is None:
        return None
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = _detect_faces(gray, min_size=36 if mode == "cnic" else 50)
    box = _pick_best_face(faces, gray.shape[0], gray.shape[1], mode)
    if box is None:
        if mode == "cnic":
            h, w = gray.shape[:2]
            for sx, sw in ((int(w * 0.55), int(w * 0.42)), (int(w * 0.02), int(w * 0.40))):
                sy, sh = int(h * 0.10), int(h * 0.72)
                crop = gray[sy : sy + sh, sx : sx + sw]
                local = _detect_faces(crop, min_size=28)
                if local:
                    x, y, fw, fh = max(local, key=lambda f: f[2] * f[3])
                    face = crop[y : y + fh, x : x + fw]
                    return cv2.resize(_enhance_gray(face), (160, 160))
            sx, sw = int(w * 0.55), int(w * 0.42)
            sy, sh = int(h * 0.10), int(h * 0.72)
            face = gray[sy : sy + sh, sx : sx + sw]
            return cv2.resize(_enhance_gray(face), (160, 160))
        return None

    x, y, w, h = box
    pad = int(0.10 * max(w, h))
    x1, y1 = max(0, x - pad), max(0, y - pad)
    x2, y2 = min(gray.shape[1], x + w + pad), min(gray.shape[0], y + h + pad)
    face = gray[y1:y2, x1:x2]
    if face.size == 0:
        return None
    return cv2.resize(_enhance_gray(face), (160, 160))


def has_face_in_image(img: np.ndarray) -> bool:
    return extract_face(img, mode="cnic") is not None


def _hist_score(a: np.ndarray, b: np.ndarray) -> float:
    ha = cv2.calcHist([a], [0], None, [64], [0, 256])
    hb = cv2.calcHist([b], [0], None, [64], [0, 256])
    cv2.normalize(ha, ha)
    cv2.normalize(hb, hb)
    return float(cv2.compareHist(ha, hb, cv2.HISTCMP_CORREL))


def _ncc_score(a: np.ndarray, b: np.ndarray) -> float:
    a32 = a.astype(np.float32)
    best = float(cv2.matchTemplate(a32, b.astype(np.float32), cv2.TM_CCOEFF_NORMED)[0][0])
    for scale in (0.88, 0.95, 1.05, 1.12):
        side = max(48, int(160 * scale))
        scaled = cv2.resize(b, (side, side))
        scaled = cv2.resize(scaled, (160, 160))
        score = float(cv2.matchTemplate(a32, scaled.astype(np.float32), cv2.TM_CCOEFF_NORMED)[0][0])
        best = max(best, score)
    return best


def _edge_score(a: np.ndarray, b: np.ndarray) -> float:
    ea = cv2.Canny(a, 50, 130)
    eb = cv2.Canny(b, 50, 130)
    inter = np.logical_and(ea > 0, eb > 0).sum()
    union = np.logical_or(ea > 0, eb > 0).sum()
    if union == 0:
        return 0.0
    return float(inter / union)


def _orb_score(a: np.ndarray, b: np.ndarray) -> float:
    orb = cv2.ORB_create(nfeatures=600)
    _kp1, d1 = orb.detectAndCompute(a, None)
    _kp2, d2 = orb.detectAndCompute(b, None)
    if d1 is None or d2 is None or len(d1) < 8 or len(d2) < 8:
        return 0.0
    matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = matcher.match(d1, d2)
    if not matches:
        return 0.0
    # Stricter: need many good matches — old /18 made almost everyone ~100% ORB
    good = sum(1 for m in matches if m.distance < 64)
    return min(1.0, good / 36.0)


def _to_confidence(raw: float) -> float:
    """
    Map raw OpenCV similarity to % — varies by capture quality.
    Same person good light: ~66–80%. Weak / wrong face: stays under 65%.
    """
    raw = max(0.0, min(1.0, float(raw)))
    if raw < 0.54:
        return raw / 0.54 * 60.0  # below pass band
    if raw <= 0.72:
        t = (raw - 0.54) / 0.18
        return 65.0 + t * 13.0  # 0.54→65, 0.72→78
    t = (raw - 0.72) / 0.28
    return 78.0 + t * 14.0  # up to ~92 max, not stuck there


def compare_faces(id_img: np.ndarray, live_img: np.ndarray) -> tuple[float, bool, dict]:
    """
    OpenCV lite face match. Pass at MATCH_THRESHOLD (65%).
    Confidence varies with quality — not a fixed ~92%.
    """
    id_face = extract_face(id_img, mode="cnic")
    live_face = extract_face(live_img, mode="selfie")

    details = {"id_face": id_face is not None, "live_face": live_face is not None}

    if id_face is None:
        return 0.0, False, {**details, "fail_reason": "NO_FACE_CNIC"}
    if live_face is None:
        return 0.0, False, {**details, "fail_reason": "NO_FACE_SELFIE"}

    id_face = cv2.GaussianBlur(id_face, (3, 3), 0)
    live_face = cv2.GaussianBlur(live_face, (3, 3), 0)

    candidates = [live_face, cv2.flip(live_face, 1)]
    best_raw = -1.0
    best_parts = (0.0, 0.0, 0.0, 0.0)

    for face_b in candidates:
        hist = max(0.0, _hist_score(id_face, face_b))
        ncc = max(0.0, _ncc_score(id_face, face_b))
        edge = max(0.0, _edge_score(id_face, face_b))
        orb = max(0.0, _orb_score(id_face, face_b))
        raw = 0.18 * hist + 0.40 * ncc + 0.07 * edge + 0.35 * orb
        if raw > best_raw:
            best_raw = raw
            best_parts = (hist, ncc, edge, orb)

    hist, ncc, edge, orb = best_parts
    confidence = round(min(95.0, max(0.0, _to_confidence(best_raw))), 2)
    # NCC + hist prove real photo faces (blocks sketches); allow mild webcam variance
    verified = (
        confidence >= MATCH_THRESHOLD
        and ncc >= 0.40
        and hist >= 0.28
    )

    details.update(
        {
            "hist": round(hist * 100, 2),
            "ncc": round(ncc * 100, 2),
            "edge": round(edge * 100, 2),
            "orb": round(orb * 100, 2),
            "raw": round(best_raw * 100, 2),
            "combined": confidence,
        }
    )
    return confidence, verified, details


def _is_nearly_black(img: np.ndarray) -> bool:
    if img is None:
        return True
    return float(img.mean()) < 12.0


def copy_kyc_image(upload: UploadFile, destination):
    limit = 10 * 1024 * 1024
    content = upload.file.read(limit + 1)
    if len(content) > limit:
        raise HTTPException(413, "KYC images must be 10 MB or smaller")
    destination.write(content)


@app.post("/verify-kyc")
async def verify_kyc(
    id_card: UploadFile = File(...),
    live_face: UploadFile = File(...),
    researcher_id: str = Form(...),
    id_card_back: Optional[UploadFile] = File(default=None),
    claims: dict = Depends(require_user),
):
    if claims.get("email_verified") is not True:
        raise HTTPException(403, "Verify your email before KYC")
    attempt = tempfile.TemporaryDirectory(prefix="investbiz-kyc-")
    researcher_folder = attempt.name
    id_path = os.path.join(researcher_folder, "cnic_front.jpg")
    live_path = os.path.join(researcher_folder, "live.jpg")
    back_path = None

    try:
        # Rewind upload streams — retries can leave pointer at EOF
        try:
            id_card.file.seek(0)
        except Exception:
            pass
        try:
            live_face.file.seek(0)
        except Exception:
            pass

        with open(id_path, "wb") as f:
            copy_kyc_image(id_card, f)
        with open(live_path, "wb") as f:
            copy_kyc_image(live_face, f)
        if id_card_back and id_card_back.filename:
            try:
                id_card_back.file.seek(0)
            except Exception:
                pass
            back_path = os.path.join(researcher_folder, "cnic_back.jpg")
            with open(back_path, "wb") as f:
                copy_kyc_image(id_card_back, f)

        img_id = decode_and_resize(id_path)
        img_live = decode_and_resize(live_path)
        img_back = decode_and_resize(back_path) if back_path else None

        if img_id is None:
            return JSONResponse(
                content={
                    "success": False,
                    "error": "INVALID_CNIC_FRONT",
                    "confidence": 0,
                    "message": "Please upload a correct CNIC front photo.",
                }
            )
        if img_live is None:
            return JSONResponse(
                content={
                    "success": False,
                    "error": "INVALID_SELFIE",
                    "confidence": 0,
                    "message": "Live selfie is invalid. Open the camera and capture again.",
                }
            )

        ok_front, front_msg = validate_cnic_front(img_id)
        if not ok_front:
            return JSONResponse(
                content={
                    "success": False,
                    "error": "INVALID_CNIC_FRONT",
                    "confidence": 0,
                    "verdict": "INVALID CNIC",
                    "message": front_msg,
                }
            )

        if id_card_back and id_card_back.filename:
            ok_back, back_msg = validate_cnic_back(img_back if img_back is not None else np.zeros((10, 10, 3), np.uint8))
            if img_back is None or not ok_back:
                return JSONResponse(
                    content={
                        "success": False,
                        "error": "INVALID_CNIC_BACK",
                        "confidence": 0,
                        "verdict": "INVALID CNIC BACK",
                        "message": back_msg if img_back is not None else "Please upload a correct CNIC back photo.",
                    }
                )

        if _is_blank_or_junk(img_live) or _is_nearly_black(img_live):
            return JSONResponse(
                content={
                    "success": False,
                    "error": "BLACK_SELFIE",
                    "confidence": 0,
                    "verdict": "CAPTURE FAILED",
                    "message": "Live selfie is too dark or blank. Wait for a clear camera preview, then snap again.",
                }
            )

        confidence, verified, details = compare_faces(img_id, img_live)

        if details.get("fail_reason") == "NO_FACE_CNIC":
            return JSONResponse(
                content={
                    "success": False,
                    "error": "NO_FACE_CNIC",
                    "confidence": 0,
                    "verdict": "NO FACE ON CNIC",
                    "message": "Face not found on CNIC. Please upload a clear CNIC front photo with your face visible (less glare).",
                    "details": details,
                }
            )

        if details.get("fail_reason") == "NO_FACE_SELFIE":
            return JSONResponse(
                content={
                    "success": False,
                    "error": "NO_FACE_SELFIE",
                    "confidence": 0,
                    "verdict": "NO FACE IN SELFIE",
                    "message": "Face not found in live selfie. Face the camera in good light and snap again.",
                    "details": details,
                }
            )

        try:
            reference(f"kyc_engine_results/{claims['uid']}").set({
                "success": bool(verified), "confidence": confidence,
                "checkedAt": {".sv": "timestamp"},
            })
        except Exception:
            logger.exception("Could not store KYC result")
            raise HTTPException(503, "Could not store KYC result in Firebase") from None
        return JSONResponse(
            content={
                "success": bool(verified),
                "confidence": confidence,
                "verdict": "VERIFIED" if verified else "MATCH FAILED",
                "message": (
                    f"Face matched successfully ({round(confidence)}% confidence)!"
                    if verified
                    else (
                        f"Face not matched ({round(confidence)}% confidence). "
                        "Retake a clear live selfie in good light (face the camera). "
                        "If it still fails, re-upload a sharp CNIC front with your photo visible."
                    )
                ),
                "details": details,
            }
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("KYC verification failed")
        return JSONResponse(status_code=500, content={"success": False, "error": "KYC verification failed"})
    finally:
        attempt.cleanup()
        gc.collect()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=False, workers=1)
