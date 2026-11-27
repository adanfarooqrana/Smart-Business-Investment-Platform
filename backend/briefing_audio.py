"""Authenticated local Urdu speech for the Investor idea briefing."""
import os
import shutil
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import BoundedSemaphore

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field

from .firebase_connection import BASE_DIR, require_user

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])
speech_slots = BoundedSemaphore(2)


class BriefingAudio(BaseModel):
    text: str = Field(min_length=3, max_length=1200)


@router.post("/briefing-audio")
def briefing_audio(payload: BriefingAudio, claims: dict = Depends(require_user)):
    if claims.get("email_verified") is not True:
        raise HTTPException(403, "Verify your email before playing a briefing.")
    text = payload.text.strip()
    if not any("\u0600" <= char <= "\u06ff" for char in text):
        raise HTTPException(422, "An Urdu briefing is required.")
    path = next((BASE_DIR / ".kyc-runtime/urdu-voice").rglob("espeak-ng.exe"), None)
    executable = str(path) if path else shutil.which("espeak-ng")
    if not executable:
        raise HTTPException(503, "Urdu speech is unavailable on this server.")
    if not speech_slots.acquire(blocking=False):
        raise HTTPException(503, "Urdu speech is busy. Try again.")
    try:
        with TemporaryDirectory(prefix="investbiz-urdu-") as directory:
            wav_path = Path(directory) / "briefing.wav"
            environment = {**os.environ, "ESPEAK_DATA_PATH": str(path.parent)} if path else None
            subprocess.run(
                [executable, "-v", "ur", "-s", "145", "-b", "1", "--stdin", "-w", str(wav_path)],
                input=text.encode("utf-8"), env=environment, capture_output=True, timeout=12, check=True,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            )
            return Response(wav_path.read_bytes(), media_type="audio/wav", headers={"Cache-Control": "no-store"})
    except (OSError, subprocess.SubprocessError):
        raise HTTPException(503, "Urdu speech could not be generated.") from None
    finally:
        speech_slots.release()
