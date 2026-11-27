import logging
import os
import re
from pathlib import Path
from typing import Literal
from urllib.parse import quote
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from firebase_admin import exceptions, storage
from google.api_core.exceptions import GoogleAPICallError
from google.auth.exceptions import GoogleAuthError
from pydantic import BaseModel, Field
from starlette.staticfiles import StaticFiles

from .firebase_connection import BASE_DIR, PROJECT_ID, PUBLIC_BASE_URL, firebase, reference, require_user

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)
UPLOADS = BASE_DIR / "static" / "uploads"
UPLOADS.mkdir(parents=True, exist_ok=True)
MAX_UPLOAD = 10 * 1024 * 1024
FILE_TYPES = {
    "image/jpeg": (".jpg", (b"\xff\xd8\xff",)),
    "image/png": (".png", (b"\x89PNG\r\n\x1a\n",)),
    "image/gif": (".gif", (b"GIF87a", b"GIF89a")),
    "image/webp": (".webp", (b"RIFF",)),
    "application/pdf": (".pdf", (b"%PDF-",)),
}


class PublicUploads(StaticFiles):
    async def get_response(self, path, scope):
        # Private KYC files use the authenticated route above this mount.
        if not re.fullmatch(r"[a-f0-9]{32}\.(?:jpg|png|gif|webp|pdf)", path):
            raise HTTPException(404)
        response = await super().get_response(path, scope)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Content-Security-Policy"] = "default-src 'none'; sandbox"
        return response


class ProfileUpdate(BaseModel):
    role: Literal["investor", "business_owner", "entrepreneur", "wholesaler"]
    full_name: str = Field(default="", max_length=160)


@router.get("/admin/session")
def verify_admin_session(claims: dict = Depends(require_user)):
    if claims.get("admin") is not True or claims.get("email_verified") is not True:
        raise HTTPException(403, "Verified Firebase administrator access required")
    return {"uid": claims["uid"], "project": PROJECT_ID}


@router.get("/health/firebase")
def firebase_health():
    try:
        reference("platform_stats").get(shallow=True)
    except (exceptions.FirebaseError, GoogleAuthError, OSError):
        raise HTTPException(503, "Firebase Realtime Database unavailable") from None
    return {"status": "ok", "project": PROJECT_ID, "database": "realtime"}


@router.put("/users/me")
def sync_user(input: ProfileUpdate, claims: dict = Depends(require_user)):
    uid = claims["uid"]
    email = claims.get("email")
    if not email:
        raise HTTPException(400, "An email/password account is required")

    def merge(current):
        current = current if isinstance(current, dict) else {}
        existing_role = {"founder": "entrepreneur", "business": "business_owner"}.get(
            current.get("role"), current.get("role")
        )
        if existing_role and existing_role != input.role:
            raise HTTPException(409, "This account is already assigned to a different role")
        return {
            **current,
            "uid": uid,
            "email": email,
            "role": input.role,
            "emailVerified": claims.get("email_verified") is True,
            "createdAt": current.get("createdAt") or {".sv": "timestamp"},
            **({"name": input.full_name.strip()} if input.full_name.strip() and not current.get("cnicNumber") else {}),
        }

    def merge_onboarding(current):
        current = current if isinstance(current, dict) else {}
        if current.get("role", input.role) != input.role:
            raise HTTPException(409, "This account already has onboarding for a different role")
        verified = current.get("emailVerified") is True or claims.get("email_verified") is True
        stage = current.get("onboardingStage")
        result = {
            **current,
            "uid": uid,
            "email": email,
            "role": input.role,
            "emailVerified": verified,
            "onboardingStage": stage if stage in (3, "completed") else (2 if verified else 1),
            "updatedAt": {".sv": "timestamp"},
        }
        if input.full_name.strip() and not (current.get("profile") or {}).get("cnicNumber"):
            result["profile"] = {**(current.get("profile") or {}), "fullName": input.full_name.strip()}
        return result

    try:
        profile = reference(f"users/{uid}").transaction(merge)
        reference(f"onboarding/{uid}").transaction(merge_onboarding)
    except (exceptions.FirebaseError, GoogleAuthError, OSError):
        raise HTTPException(503, "Could not sync account to Firebase") from None
    return {"uid": uid, "role": profile["role"], "emailVerified": profile["emailVerified"]}


@router.get("/users/me/onboarding")
def get_onboarding(claims: dict = Depends(require_user)):
    try:
        return reference(f"onboarding/{claims['uid']}").get()
    except (exceptions.FirebaseError, GoogleAuthError, OSError):
        raise HTTPException(503, "Could not read onboarding progress from Firebase") from None


@router.get("/users/me")
def get_user(claims: dict = Depends(require_user)):
    uid = claims["uid"]
    try:
        profile = reference(f"users/{uid}").get() or {}
    except (exceptions.FirebaseError, GoogleAuthError, OSError):
        raise HTTPException(503, "Could not read account from Firebase") from None
    return {"uid": uid, "email": claims.get("email"), "role": profile.get("role"),
            "emailVerified": claims.get("email_verified") is True}


@router.post("/uploads")
def upload_public_asset(file: UploadFile = File(...), claims: dict = Depends(require_user)):
    if claims.get("email_verified") is not True:
        raise HTTPException(403, "Verify your email before uploading")
    content_type = file.content_type or ""
    supported = FILE_TYPES.get(content_type)
    if not supported:
        raise HTTPException(415, "Upload a JPEG, PNG, GIF, WebP or PDF file")
    content = file.file.read(MAX_UPLOAD + 1)
    if len(content) > MAX_UPLOAD:
        raise HTTPException(413, "Files must be 10 MB or smaller")
    extension, signatures = supported
    if not content.startswith(signatures) or (
        content_type == "image/webp" and content[8:12] != b"WEBP"
    ):
        raise HTTPException(415, "File content does not match the declared type")

    uid = claims["uid"]
    upload_id = uuid4().hex
    filename = upload_id + extension
    remote_path = f"uploads/{uid}/{filename}"
    local_path = UPLOADS / filename
    bucket = storage.bucket(app=firebase)
    blob = bucket.blob(remote_path)
    download_token = uuid4().hex
    blob.metadata = {"firebaseStorageDownloadTokens": download_token}
    provider = "firebase"
    try:
        blob.upload_from_string(content, content_type=content_type, timeout=5, retry=None,
                                if_generation_match=0)
        url = (f"https://firebasestorage.googleapis.com/v0/b/{bucket.name}/o/"
               f"{quote(remote_path, safe='')}?alt=media&token={download_token}")
    except (GoogleAPICallError, GoogleAuthError, OSError) as error:
        logger.warning("Firebase Storage unavailable for public upload (%s)", type(error).__name__)
        provider = "local"
        pending = local_path.with_suffix(".pending")
        try:
            pending.write_bytes(content)
            os.replace(pending, local_path)
        finally:
            pending.unlink(missing_ok=True)
        url = f"{PUBLIC_BASE_URL}/static/uploads/{filename}"

    try:
        reference(f"uploads/{uid}/{upload_id}").set({
            "url": url, "provider": provider, "contentType": content_type,
            "size": len(content), "createdAt": {".sv": "timestamp"},
        })
    except (exceptions.FirebaseError, GoogleAuthError, OSError):
        if provider == "local":
            local_path.unlink(missing_ok=True)
        else:
            try:
                blob.delete(timeout=5, retry=None)
            except (GoogleAPICallError, GoogleAuthError, OSError):
                logger.exception("Could not remove unregistered cloud upload")
        raise HTTPException(503, "Could not record upload in Firebase") from None
    return {"id": upload_id, "url": url, "provider": provider}
