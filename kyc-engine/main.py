import os
import gc
import cv2
import numpy as np
import shutil
from typing import Optional
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SmartBiz KYC Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")

FACE_CASCADE = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "kyc-engine", "engine": "opencv-lite"}


def decode_and_resize(image_path, max_width=1000):
    img = cv2.imread(image_path)
    if img is None:
        return None
    h, w = img.shape[:2]
    if w > max_width:
        scale = max_width / w
        img = cv2.resize(img, (max_width, int(h * scale)))
    return img


def has_face_in_image(img: np.ndarray) -> bool:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = FACE_CASCADE.detectMultiScale(gray, 1.1, 5, minSize=(50, 50))
    return len(faces) > 0


def extract_largest_face(gray_img: np.ndarray) -> Optional[np.ndarray]:
    faces = FACE_CASCADE.detectMultiScale(gray_img, 1.1, 5, minSize=(60, 60))
    if len(faces) == 0:
        return None
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    face = gray_img[y : y + h, x : x + w]
    return cv2.resize(face, (160, 160))


def compare_faces(id_path: str, live_path: str) -> tuple[float, bool]:
    id_img = cv2.imread(id_path)
    live_img = cv2.imread(live_path)
    if id_img is None or live_img is None:
        return 0.0, False

    id_face = extract_largest_face(cv2.cvtColor(id_img, cv2.COLOR_BGR2GRAY))
    live_face = extract_largest_face(cv2.cvtColor(live_img, cv2.COLOR_BGR2GRAY))
    if id_face is None or live_face is None:
        return 0.0, False

    id_hist = cv2.calcHist([id_face], [0], None, [64], [0, 256])
    live_hist = cv2.calcHist([live_face], [0], None, [64], [0, 256])
    cv2.normalize(id_hist, id_hist)
    cv2.normalize(live_hist, live_hist)

    score = float(cv2.compareHist(id_hist, live_hist, cv2.HISTCMP_CORREL))
    confidence = round(max(0.0, min(100.0, score * 100)), 2)
    return confidence, confidence >= 70.0


@app.post("/verify-kyc")
async def verify_kyc(
    id_card: UploadFile = File(...),
    live_face: UploadFile = File(...),
    researcher_id: str = Form(...),
    id_card_back: Optional[UploadFile] = File(default=None),
):
    researcher_folder = os.path.join(UPLOADS_DIR, "researchers", researcher_id)
    os.makedirs(researcher_folder, exist_ok=True)

    id_path = os.path.join(researcher_folder, f"cnic_front_{id_card.filename}")
    live_path = os.path.join(researcher_folder, f"live_{live_face.filename}")
    back_path = None

    try:
        with open(id_path, "wb") as f:
            shutil.copyfileobj(id_card.file, f)
        with open(live_path, "wb") as f:
            shutil.copyfileobj(live_face.file, f)
        if id_card_back and id_card_back.filename:
            back_path = os.path.join(researcher_folder, f"cnic_back_{id_card_back.filename}")
            with open(back_path, "wb") as f:
                shutil.copyfileobj(id_card_back.file, f)

        img_id = decode_and_resize(id_path)
        if img_id is None:
            return JSONResponse(status_code=400, content={"success": False, "message": "Invalid CNIC front image."})

        if not has_face_in_image(img_id):
            return JSONResponse(
                content={
                    "success": False,
                    "error": "INVALID_DOCUMENT",
                    "message": "No face detected on CNIC front. Upload a clear photo.",
                }
            )

        confidence, verified = compare_faces(id_path, live_path)
        final_verdict = verified and confidence >= 70

        return JSONResponse(
            content={
                "success": final_verdict,
                "confidence": confidence,
                "verdict": "VERIFIED" if final_verdict else "MATCH FAILED",
                "message": f"Face matched successfully ({round(confidence)}% confidence)!"
                if final_verdict
                else "Try again: Face does not match the provided CNIC image.",
                "paths": {"cnic_front": id_path, "cnic_back": back_path, "live_face": live_path},
            }
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
    finally:
        gc.collect()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False, workers=1)
