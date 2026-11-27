"""Founder onboarding evidence and private pitch analytics."""
import io
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from firebase_admin.exceptions import InvalidArgumentError
from PIL import Image, ImageOps
from pydantic import BaseModel, Field, StringConstraints
from typing import Annotated, Literal

from .api import UPLOADS
from .dossier import PRIVATE_HEADERS, key, now, owner_pitch, parse_model, read_image, record
from .firebase_connection import reference, require_user
from .investor_kyc import db_read, db_update
from .marketplace import require_verified_investor, seller

router = APIRouter(prefix="/api")
EVIDENCE_ROOT = UPLOADS / "founders"
MAX_CERTIFICATES = 12
RECENT_READER_MS = 65_000


class ReferenceProfile(BaseModel):
    fullName: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=160)]
    occupation: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=160)]
    incomeSource: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=200)]


class EvidenceInput(BaseModel):
    references: list[ReferenceProfile] = Field(min_length=2, max_length=2)
    publishCertificates: bool = False


def admin(claims=Depends(require_user)):
    if claims.get("admin") is not True or claims.get("email_verified") is not True:
        raise HTTPException(403, "Verified administrator access required.")
    return claims


def statement_file(upload):
    data = upload.file.read(10_000_001)
    if data.startswith(b"%PDF-") and len(data) <= 10_000_000:
        return data, "application/pdf"
    upload.file.seek(0)
    return read_image(upload)


def public_image(upload):
    data, _ = read_image(upload)
    with Image.open(io.BytesIO(data)) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
        image.thumbnail((2200, 2200), Image.Resampling.LANCZOS)
        converted = io.BytesIO()
        image.save(converted, "JPEG", quality=90, optimize=True)
    return converted.getvalue(), "image/jpeg"


def evidence_file(directory, part, content):
    data, mime = content
    ext = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf"}[mime]
    filename = part + ext
    with (directory / filename).open("xb") as target:
        target.write(data)
    return {"filename": filename, "contentType": mime}


def evidence_record(uid):
    return record(db_read(f"founderSubmissions/{key(uid)}"))


@router.get("/founder-workspace/setup")
def founder_setup(uid=Depends(seller)):
    entry = evidence_record(uid)
    return {"submitted": bool(entry), "bankStatus": entry.get("bankStatus"),
            "references": entry.get("references", {}),
            "certificates": list(record(db_read(f"founderCertificates/{uid}")).values())}


@router.post("/founder-workspace/setup")
def submit_founder_setup(
    details: str = Form(...), bank_statement: UploadFile = File(...),
    bank_transactions: list[UploadFile] = File(...),
    reference_front: list[UploadFile] = File(...), reference_back: list[UploadFile] = File(...),
    certificates: list[UploadFile] | None = File(None), uid=Depends(seller),
):
    key(uid)
    payload = parse_model(EvidenceInput, details)
    certificates = certificates or []
    if len({row.fullName.casefold() for row in payload.references}) != 2:
        raise HTTPException(422, "Enter two different references.")
    if not 1 <= len(bank_transactions) <= 6 or len(reference_front) != 2 or len(reference_back) != 2:
        raise HTTPException(422, "Add one to six transaction screenshots and both CNIC images for each reference.")
    previous_certificates = record(db_read(f"founderCertificates/{uid}"))
    if len(certificates) + len(previous_certificates) > MAX_CERTIFICATES:
        raise HTTPException(422, "The gallery supports up to 12 certificates.")
    if certificates and not payload.publishCertificates:
        raise HTTPException(422, "Confirm that investors can see the certificate images.")
    uploads = {"bank-statement": statement_file(bank_statement)}
    uploads.update({f"transaction-{i + 1}": read_image(file) for i, file in enumerate(bank_transactions)})
    for i, (front, back) in enumerate(zip(reference_front, reference_back), start=1):
        first, second = read_image(front), read_image(back)
        if first[0] == second[0]:
            raise HTTPException(422, "The reference CNIC front and back must be different images.")
        uploads[f"reference-{i}-front"] = first
        uploads[f"reference-{i}-back"] = second
    gallery = [(uuid4().hex, public_image(file)) for file in certificates]

    submission = uuid4().hex
    directory = EVIDENCE_ROOT / uid / submission
    directory.mkdir(mode=0o700, parents=True, exist_ok=False)
    files = {part: evidence_file(directory, part, item) for part, item in uploads.items()}
    public_rows = {}
    for i, (certificate_id, image) in enumerate(gallery, start=len(previous_certificates) + 1):
        part = evidence_file(directory, "certificate-" + certificate_id, image)
        public_rows[certificate_id] = {"id": certificate_id, "caption": f"Degree or achievement {i}",
                                       "url": f"/api/founders/{uid}/certificates/{certificate_id}"}
        files["certificate-" + certificate_id] = part
    references = {str(i): item.model_dump() for i, item in enumerate(payload.references, start=1)}
    entry = {"id": submission, "submittedAt": now(), "bankStatus": "PENDING_REVIEW",
             "references": references, "files": files}
    updates = {f"founderSubmissions/{uid}": entry, f"users/{uid}/founderEvidence": entry}
    for cid, public in public_rows.items():
        updates[f"founderCertificates/{uid}/{cid}"] = public
        updates[f"users/{uid}/founderCertificates/{cid}"] = public
        updates[f"founderCertificateFiles/{uid}/{cid}"] = {"submission": submission, **files["certificate-" + cid]}
    db_update(updates)
    return {"submitted": True, "bankStatus": entry["bankStatus"], "references": references,
            "certificates": list((previous_certificates | public_rows).values())}


def local_file(uid, submission, metadata):
    filename = metadata.get("filename", "")
    if not filename or Path(filename).name != filename:
        raise HTTPException(404, "Document not found.")
    path = EVIDENCE_ROOT / key(uid) / key(submission) / filename
    if not path.is_file():
        raise HTTPException(404, "Document not found on this server.")
    return FileResponse(path, media_type=metadata.get("contentType"),
                        headers=PRIVATE_HEADERS | {"Content-Security-Policy": "default-src 'none'; sandbox"})


@router.get("/founders/{uid}/certificates/{certificate_id}")
def founder_certificate(uid: str, certificate_id: str, claims=Depends(require_user)):
    viewer = claims["uid"]
    is_admin = claims.get("admin") is True and claims.get("email_verified") is True
    if viewer != uid and not is_admin:
        if claims.get("email_verified") is not True or record(db_read(f"users/{key(viewer)}")).get("role") != "investor":
            raise HTTPException(403, "Sign in as an investor to view founder certificates.")
    metadata = record(db_read(f"founderCertificateFiles/{key(uid)}/{key(certificate_id)}"))
    if not metadata:
        raise HTTPException(404, "Certificate not found.")
    return local_file(uid, metadata["submission"], metadata)


@router.get("/admin/founders/{uid}/evidence")
def founder_review(uid: str, _=Depends(admin)):
    return evidence_record(uid)


@router.get("/admin/founders/{uid}/evidence/{part}")
def founder_review_file(uid: str, part: str, _=Depends(admin)):
    entry = evidence_record(uid)
    metadata = record(record(entry.get("files")).get(key(part)))
    if not metadata:
        raise HTTPException(404, "Document not found.")
    return local_file(uid, entry["id"], metadata)


class BankReview(BaseModel):
    submissionId: str
    bankStatus: Literal["VERIFIED", "NEEDS_NEW_EVIDENCE"]


@router.put("/admin/founders/{uid}/evidence")
def decide_founder_bank(uid: str, review: BankReview, claims=Depends(admin)):
    uid = key(uid)

    def decide(entry):
        entry = record(entry)
        if entry.get("id") != review.submissionId:
            raise HTTPException(409, "This submission has changed. Reopen the current evidence.")
        return entry | {"bankStatus": review.bankStatus, "reviewedAt": now(), "reviewedBy": claims["uid"]}

    entry = reference(f"founderSubmissions/{uid}").transaction(decide)
    reference(f"users/{uid}/founderEvidence").transaction(
        lambda old: entry if record(old).get("id") == review.submissionId else old
    )
    return {"bankStatus": entry["bankStatus"]}


@router.post("/dossiers/{founder_id}/{pitch_id}/reader")
def pitch_reader(founder_id: str, pitch_id: str, uid=Depends(require_verified_investor)):
    owner_pitch(founder_id, pitch_id)
    path = reference(f"pitchViews/{pitch_id}/{founder_id}/{key(uid)}")
    moment = now()
    path.transaction(lambda old: max(old or 0, moment))
    return {"recorded": True}


@router.get("/founder-workspace/analytics")
def founder_analytics(uid=Depends(seller)):
    workspace = record(db_read(f"founders/{key(uid)}"))
    pitches = record(workspace.get("pitches"))
    rooms = record(db_read(f"dossierFounderChats/{uid}"))
    cutoff = now() - RECENT_READER_MS
    result = {}
    for pitch_id, raw in pitches.items():
        row = record(raw)
        if not row or row.get("status") in {"draft", "hidden", "deleted"}:
            continue
        viewers = record(db_read(f"pitchViews/{key(pitch_id)}/{uid}"))
        readers = sum(isinstance(at, (int, float)) and at >= cutoff for at in viewers.values())
        vault = record(db_read(f"dossierVault/{uid}/{pitch_id}"))
        terms = record(vault.get("terms"))
        total = sum(record(item).get("chunks", 0) for item in record(terms.get("assets")).values())
        reserved = sum(n for n in record(vault.get("reserved")).values() if type(n) is int)
        interested = set(viewers) | set(record(vault.get("agreements")))
        interested.update(room["investorId"] for room in rooms.values()
                          if isinstance(room, dict) and room.get("pitchId") == pitch_id and room.get("investorId"))
        funded = row.get("soldChunks", 0)
        result[pitch_id] = {"activeReaders": readers, "interestedInvestors": len(interested), "reservedChunks": reserved,
                            "fundedChunks": funded if type(funded) is int else 0, "totalChunks": total or row.get("totalProductChunks", 0)}
    return result


@router.get("/founder-workspace/profile")
def own_founder_profile(uid=Depends(seller)):
    from .marketplace import catalog_founder, live_pitch

    workspace = record(db_read(f"founders/{key(uid)}"))
    profile = record(workspace.get("profile"))
    user = record(db_read(f"users/{uid}"))
    try:
        legacy = record(reference("pitches").order_by_child("founderId").equal_to(uid).get())
    except InvalidArgumentError:
        legacy = {pid: raw for pid, raw in record(db_read("pitches")).items()
                  if record(raw).get("founderId") == uid}
    all_pitches = legacy | record(workspace.get("pitches"))
    products = [product for pitch_id, raw in all_pitches.items() if (product := live_pitch(uid, pitch_id, raw, profile))]
    return {"founder": catalog_founder(uid, profile.get("fullName") or user.get("name") or "Founder", profile, {}),
            "products": products, "bankStatus": evidence_record(uid).get("bankStatus")}

class ProfileDetails(BaseModel):
    businessName: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=160)]
    location: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=160)]
    education: str = Field(default="", max_length=200)
    about: str = Field(default="", max_length=1500)


@router.put("/founder-workspace/profile")
def save_founder_profile(payload: ProfileDetails, uid=Depends(seller)):
    info = payload.model_dump()
    info["businessDescription"] = info.pop("about").strip()
    reference(f"founders/{key(uid)}/profile").update(info)
    return own_founder_profile(uid)

@router.post("/founder-workspace/certificates")
def add_founder_certificates(
    certificates: list[UploadFile] = File(...), publish: bool = Form(...), uid=Depends(seller),
):
    uid = key(uid)
    previous = record(db_read(f"founderCertificates/{uid}"))
    if not publish or not certificates or len(previous) + len(certificates) > MAX_CERTIFICATES:
        raise HTTPException(422, "Confirm the gallery publication and upload up to 12 certificates in total.")
    images = [public_image(file) for file in certificates]
    submission = uuid4().hex
    directory = EVIDENCE_ROOT / uid / submission
    directory.mkdir(mode=0o700, parents=True, exist_ok=False)
    updates = {}
    for index, image in enumerate(images, start=len(previous) + 1):
        cid = uuid4().hex
        private = evidence_file(directory, "certificate-" + cid, image)
        public = {"id": cid, "caption": f"Degree or achievement {index}", "url": f"/api/founders/{uid}/certificates/{cid}"}
        updates[f"founderCertificates/{uid}/{cid}"] = public
        updates[f"users/{uid}/founderCertificates/{cid}"] = public
        updates[f"founderCertificateFiles/{uid}/{cid}"] = {"submission": submission, **private}
    db_update(updates)
    return own_founder_profile(uid)