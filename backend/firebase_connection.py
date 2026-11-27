import json
import logging
import os
import re
import subprocess
import time
from email.parser import BytesHeaderParser
from pathlib import Path
from threading import Lock

import firebase_admin
import requests
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth, credentials, db, exceptions
from google.auth import jwt
from google.auth.exceptions import GoogleAuthError

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "investbiz-3d869")
DATABASE_URL = os.getenv("FIREBASE_DATABASE_URL", "https://investbiz-3d869-default-rtdb.firebaseio.com").rstrip("/")
STORAGE_BUCKET = os.getenv("FIREBASE_STORAGE_BUCKET", f"{PROJECT_ID}.firebasestorage.app")
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000").rstrip("/")
FRONTEND_ORIGINS = [
    origin.strip() for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000",
    ).split(",") if origin.strip()
]

account = BASE_DIR / os.getenv("FIREBASE_SERVICE_ACCOUNT", "firebase-service-account.json")
credential = credentials.Certificate(str(account))
if credential.project_id != PROJECT_ID or DATABASE_URL != f"https://{PROJECT_ID}-default-rtdb.firebaseio.com":
    raise RuntimeError("Firebase service account, project ID and database URL do not match.")
firebase = firebase_admin.initialize_app(credential, {
    "projectId": PROJECT_ID,
    "databaseURL": DATABASE_URL,
    "storageBucket": STORAGE_BUCKET,
    "httpTimeout": 12,
})
bearer = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)


# Google's documented alternate endpoint for Firebase Secure Token certificates.
CERTIFICATE_URL = "https://www.googleapis.com/service_accounts/v1/metadata/x509/securetoken@system.gserviceaccount.com"
certificate_lock = Lock()
certificate_cache = ({}, 0.0)


def fetch_signing_certificates():
    if os.name == "nt":
        # Windows curl uses Schannel, an independent TLS stack from Python's OpenSSL.
        curl = Path(os.environ.get("SystemRoot", r"C:\Windows")) / "System32" / "curl.exe"
        reply = subprocess.run(
            [str(curl), "--disable", "--proto", "=https", "--tlsv1.2", "--fail", "--silent",
             "--show-error", "--suppress-connect-headers", "--include", "--connect-timeout", "5",
             "--max-time", "9", CERTIFICATE_URL],
            capture_output=True, check=True, timeout=11,
        ).stdout
        raw_headers, separator, body = reply.partition(b"\r\n\r\n")
        if not separator or raw_headers.split(b"\r\n", 1)[0].split()[1:2] != [b"200"]:
            raise OSError("Unexpected response from the signing certificate endpoint")
        headers = BytesHeaderParser().parsebytes(raw_headers.split(b"\r\n", 1)[1])
        certificates = json.loads(body)
    else:
        reply = requests.get(CERTIFICATE_URL, timeout=(5, 9), allow_redirects=False)
        if reply.status_code != 200:
            raise OSError("Unexpected response from the signing certificate endpoint")
        headers, certificates = reply.headers, reply.json()
    if not isinstance(certificates, dict) or not certificates or any(
        not isinstance(pem, str) or not pem.startswith("-----BEGIN CERTIFICATE-----")
        for pem in certificates.values()
    ):
        raise OSError("Invalid Firebase signing certificate response")
    ttl = re.search(r"(?:^|,)\s*max-age\s*=\s*(\d+)", headers.get("Cache-Control", ""), re.I)
    age = headers.get("Age", "0")
    expires_in = max(0, int(ttl[1]) - (int(age) if age.isdecimal() else 0)) if ttl else 0
    return certificates, time.monotonic() + expires_in


def verify_with_signing_certificates(id_token, certificates):
    header = jwt.decode_header(id_token)
    if header.get("alg") != "RS256" or not isinstance(header.get("kid"), str) or not header["kid"]:
        raise ValueError("Invalid Firebase token header")
    claims = jwt.decode(id_token, certs=certificates, audience=PROJECT_ID)
    uid = claims.get("sub")
    if (claims.get("aud") != PROJECT_ID or claims.get("iss") != f"https://securetoken.google.com/{PROJECT_ID}" or
        not isinstance(uid, str) or not 1 <= len(uid) <= 128 or
        type(claims.get("auth_time")) is not int or claims["auth_time"] > time.time()):
        raise ValueError("Invalid Firebase token claims")
    user = auth.get_user(uid, app=firebase)
    if user.disabled or claims["iat"] * 1000 < user.tokens_valid_after_timestamp:
        raise ValueError("Firebase token has been revoked")
    return {**claims, "uid": uid}


def verify_firebase_token(id_token):
    global certificate_cache
    certificates, deadline = certificate_cache
    if time.monotonic() < deadline:
        return verify_with_signing_certificates(id_token, certificates)
    try:
        return auth.verify_id_token(id_token, app=firebase, check_revoked=True)
    except auth.CertificateFetchError:
        with certificate_lock:
            certificates, deadline = certificate_cache
            if time.monotonic() >= deadline:
                try:
                    certificate_cache = fetch_signing_certificates()
                    certificates, _ = certificate_cache
                except (OSError, ValueError, subprocess.SubprocessError, requests.RequestException) as error:
                    raise auth.CertificateFetchError("Firebase signing certificates are unavailable", error) from error
        return verify_with_signing_certificates(id_token, certificates)


def reference(path: str):
    return db.reference(path, app=firebase)


def require_user(token: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if token is None:
        raise HTTPException(401, "Firebase sign-in required", headers={"WWW-Authenticate": "Bearer"})
    transient_errors = (auth.CertificateFetchError, exceptions.DeadlineExceededError, exceptions.UnavailableError)
    for attempt in range(2):
        try:
            return verify_firebase_token(token.credentials)
        except (auth.InvalidIdTokenError, auth.ExpiredIdTokenError, auth.RevokedIdTokenError,
                auth.UserDisabledError, auth.UserNotFoundError, ValueError):
            raise HTTPException(401, "Sign in again with InvestBiz", headers={"WWW-Authenticate": "Bearer"}) from None
        except (exceptions.FirebaseError, GoogleAuthError, OSError) as error:
            if attempt == 0 and isinstance(error, transient_errors):
                logger.warning("Retrying Firebase token verification after %s", type(error).__name__)
                continue
            logger.exception("Firebase token verification service unavailable")
            raise HTTPException(503, "Firebase authentication temporarily unavailable. Please retry.") from None
