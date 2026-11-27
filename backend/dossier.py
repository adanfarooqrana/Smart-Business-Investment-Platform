"""Authoritative sample, signing, allocation and escrow state for investor dossiers."""

import base64
import binascii
import hashlib
import io
import json
import logging
import os
import re
import secrets
import smtplib
import ssl
import time
from tempfile import TemporaryDirectory
from typing import Annotated
from pathlib import Path
from email.message import EmailMessage
from urllib.parse import urlparse
from xml.etree import ElementTree
from zipfile import BadZipFile, ZipFile

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import Response
from firebase_admin import auth, storage
from PIL import Image
from pydantic import BaseModel, Field, StringConstraints, model_validator
from webauthn import generate_authentication_options, generate_registration_options
from webauthn import verify_authentication_response, verify_registration_response
from webauthn.helpers import options_to_json
from webauthn.helpers.exceptions import WebAuthnException
from webauthn.helpers.structs import (
    AuthenticatorAttachment, AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor, UserVerificationRequirement,
)

from .firebase_connection import FRONTEND_ORIGINS, firebase, reference
from .investor_kyc import db_read, db_update, document_portrait, read_card, scan_document, state
from .marketplace import require_verified_investor, seller

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)
KEY = re.compile(r"^[A-Za-z0-9_-]{1,128}$")
VIDEO_TOKEN = re.compile(r"^[A-Za-z0-9_-]{43}$")
PRIVATE_HEADERS = {"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"}


def now():
    return time.time_ns() // 1_000_000


def key(value):
    if not KEY.fullmatch(value):
        raise HTTPException(422, "Invalid dossier identifier.")
    return value


def digest(value):
    return hashlib.sha256(value.encode() if isinstance(value, str) else value).hexdigest()


def identifier(*parts):
    return digest(json.dumps(parts, separators=(",", ":")))


def record(value):
    return value if isinstance(value, dict) else {}


def owner_pitch(founder_id, pitch_id):
    pitch = db_read(f"founders/{key(founder_id)}/pitches/{key(pitch_id)}")
    if not isinstance(pitch, dict) or pitch.get("status") in ("draft", "deleted", "hidden"):
        raise HTTPException(404, "Published pitch not found.")
    return pitch


def title_for(pitch, pitch_id):
    return str(record(pitch.get("stage1")).get("ideaTitle") or pitch.get("title") or pitch_id)[:200]


def vault_path(founder_id, pitch_id):
    return f"dossierVault/{key(founder_id)}/{key(pitch_id)}"


def public_terms(vault):
    terms = dict(record(vault.get("terms")))
    if not terms:
        return None
    terms["assets"] = list(record(terms.get("assets")).values())
    terms["witnesses"] = [witness for _, witness in sorted(record(terms.get("witnesses")).items())]
    terms["gallery"] = [url for _, url in sorted(record(terms.get("gallery")).items())]
    reserved = record(vault.get("reserved"))
    return terms | {"assets": [
        item | {"availableChunks": max(0, item["chunks"] - reserved.get(item["id"], 0))}
        for item in terms["assets"]
    ]}


class Asset(BaseModel):
    id: str = Field(pattern=r"^[A-Za-z0-9_-]{1,64}$")
    name: str = Field(min_length=1, max_length=160)
    image: str = Field(default="", max_length=2048)
    supplier: str = Field(min_length=1, max_length=300)
    costPkr: int = Field(gt=0, le=10_000_000_000)
    chunks: int = Field(gt=0, le=100_000)


class Witness(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    relation: str = Field(min_length=1, max_length=120)
    video: str = Field(default="", max_length=2048)


class Terms(BaseModel):
    tagline: str = Field(default="", max_length=200)
    goals: str = Field(default="", max_length=1800)
    usp: str = Field(default="", max_length=1200)
    teamSize: int = Field(ge=0, le=100_000)
    fundingGoalPkr: int = Field(gt=0, le=10_000_000_000)
    pricePerChunk: int = Field(gt=0, le=10_000_000_000)
    profitPerChunk: int = Field(ge=0, le=10_000_000_000)
    payoutSchedule: str = Field(min_length=1, max_length=300)
    sampleName: str = Field(default="", max_length=160)
    sampleAvailable: bool | None = None
    gallery: list[str] = Field(default_factory=list, max_length=12)
    tourVideo: str = Field(default="", max_length=2048)
    witnesses: list[Witness] = Field(default_factory=list, max_length=2)
    assets: list[Asset] = Field(min_length=1, max_length=60)

    @model_validator(mode="after")
    def check_inventory(self):
        if self.sampleAvailable is True and not self.sampleName.strip():
            raise ValueError("Name the available product sample.")
        if len({item.id for item in self.assets}) != len(self.assets):
            raise ValueError("Each asset needs a unique ID.")
        if any(item.chunks * self.pricePerChunk != item.costPkr for item in self.assets):
            raise ValueError("Each asset cost must equal its chunk count times the chunk price.")
        if sum(item.costPkr for item in self.assets) != self.fundingGoalPkr:
            raise ValueError("Item costs must add up to the funding goal.")
        for url in [*self.gallery, self.tourVideo, *(item.image for item in self.assets),
                    *(witness.video for witness in self.witnesses)]:
            parsed = urlparse(url)
            local_upload = (parsed.scheme == "http" and parsed.hostname in ("127.0.0.1", "localhost")
                            and re.fullmatch(r"/static/uploads/[a-f0-9]{32}\.(?:jpg|png|gif|webp)", parsed.path))
            if url and (len(url) > 2048 or (not local_upload and (parsed.scheme != "https" or not parsed.hostname))):
                raise ValueError("Media URLs must use HTTPS.")
        return self


def parse_model(model, value):
    try:
        return model.model_validate_json(value)
    except ValueError as error:
        if hasattr(error, "errors"):
            raise HTTPException(422, error.errors(include_url=False)[0]["msg"]) from None
        raise HTTPException(422, "Invalid dossier form.") from None


def read_image(upload):
    data = upload.file.read(6_000_001)
    if not data or len(data) > 6_000_000:
        raise HTTPException(422, "Identity and signature images must be 6 MB or smaller.")
    try:
        with Image.open(io.BytesIO(data)) as image:
            if image.format not in {"JPEG", "PNG", "WEBP"} or image.width * image.height > 24_000_000:
                raise ValueError
            mime = Image.MIME[image.format]
            image.verify()
    except (OSError, SyntaxError, ValueError, Image.DecompressionBombError):
        raise HTTPException(422, "Upload a valid JPEG, PNG, or WebP image.") from None
    return data, mime


def private_upload(path, data, mime):
    blob = storage.bucket(app=firebase).blob(path)
    blob.cache_control = "private, no-store"
    blob.upload_from_string(data, content_type=mime, if_generation_match=0, timeout=60)
    return {"path": path, "mime": mime, "sha256": digest(data)}


def private_response(item, filename, inline=False):
    if not item:
        raise HTTPException(404, "File not available.")
    data = storage.bucket(app=firebase).blob(item["path"]).download_as_bytes(timeout=30)
    return Response(data, media_type=item["mime"], headers=PRIVATE_HEADERS | {
        "Content-Disposition": f'{"inline" if inline else "attachment"}; filename="{filename}"',
    })


def document_content(upload):
    data = upload.file.read(10_000_001)
    if not data or len(data) > 10_000_000:
        raise HTTPException(422, "The agreement must be 10 MB or smaller.")
    if data.startswith(b"%PDF-"):
        return data, "application/pdf", "pdf", ""
    try:
        with ZipFile(io.BytesIO(data)) as archive:
            entry = archive.getinfo("word/document.xml")
            if entry.file_size > 2_000_000 or "[Content_Types].xml" not in archive.namelist():
                raise ValueError
            xml = archive.read(entry)
            if b"<!DOCTYPE" in xml.upper() or b"<!ENTITY" in xml.upper():
                raise ValueError
            root = ElementTree.fromstring(xml)
            word = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
            paragraphs = ["".join(part.text or "" for part in node.iter(word + "t")) for node in root.iter(word + "p")]
            preview = "\n".join(paragraphs).strip()
            if not preview or len(preview) > 150_000:
                raise ValueError
    except (BadZipFile, KeyError, ElementTree.ParseError, RuntimeError, ValueError):
        raise HTTPException(422, "Upload a readable PDF or Word .docx agreement.") from None
    return data, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx", preview


@router.put("/dossiers/{pitch_id}")
def save_terms(
    pitch_id: str, terms: str = Form(...), agreement: UploadFile | None = File(None),
    witness0: UploadFile | None = File(None), witness1: UploadFile | None = File(None),
    uid=Depends(seller),
):
    owner_pitch(uid, pitch_id)
    return persist_terms(uid, pitch_id, parse_model(Terms, terms), agreement, (witness0, witness1))


def persist_terms(uid, pitch_id, validated, agreement, witness_uploads):
    path = vault_path(uid, pitch_id)
    revision = secrets.token_hex(16)
    prefix = f"private/dossiers/{uid}/{pitch_id}/{revision}"
    agreement_data = document_content(agreement) if agreement else None
    witnesses = [read_image(upload) if upload else None for upload in witness_uploads]
    if any(item and index >= len(validated.witnesses) for index, item in enumerate(witnesses)):
        raise HTTPException(422, "Add the witness details before attaching their CNIC.")
    files = {f"w{index}": private_upload(f"{prefix}/witness-{index}", *item)
             for index, item in enumerate(witnesses) if item}
    document = None
    if agreement_data:
        data, mime, extension, preview = agreement_data
        document = private_upload(f"{prefix}/agreement.{extension}", data, mime)
        document |= {"extension": extension, "preview": preview}

    def save(current):
        current = record(current)
        if current.get("agreements"):
            raise HTTPException(409, "This dossier has signed agreements. Publish revised terms as a new pitch.")
        existing_files = record(current.get("witnesses"))
        existing_witnesses = record(record(current.get("terms")).get("witnesses"))
        witness_details = {f"w{idx}": item.model_dump() for idx, item in enumerate(validated.witnesses)}
        merged = {idx: files.get(idx) or (existing_files.get(idx) if info == {k: v for k, v in record(existing_witnesses.get(idx)).items() if k != "hasCnic"} else None)
                  for idx, info in witness_details.items()}
        final_document = document or current.get("document")
        return current | {
            "terms": validated.model_dump(exclude={"assets", "witnesses", "gallery"}) | {
                "revision": revision,
                "assets": {item.id: item.model_dump() for item in validated.assets},
                "witnesses": {idx: info | {"hasCnic": bool(merged[idx])} for idx, info in witness_details.items()},
                "gallery": {f"g{idx:02d}": url for idx, url in enumerate(validated.gallery)},
            },
            "witnesses": {idx: file for idx, file in merged.items() if file},
            "document": final_document,
        }

    updated = reference(path).transaction(save)
    return dossier_details(updated)


class PitchBasics(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=160)]
    category: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=100)]
    description: Annotated[str, StringConstraints(strip_whitespace=True, min_length=5, max_length=3000)]


@router.put("/founder/pitches/{pitch_id}")
def publish_founder_pitch(
    pitch_id: str, basics: str = Form(...), terms: str = Form(...),
    agreement: UploadFile | None = File(None), witness0: UploadFile | None = File(None),
    witness1: UploadFile | None = File(None), uid=Depends(seller),
):
    uid, pitch_id = key(uid), key(pitch_id)
    pitch = parse_model(PitchBasics, basics)
    validated = parse_model(Terms, terms)
    existing = record(db_read(f"founders/{uid}/pitches/{pitch_id}"))
    root_pitch = record(db_read(f"pitches/{pitch_id}"))
    root_owner = root_pitch.get("founderId") or root_pitch.get("entrepreneurUid") or root_pitch.get("uid")
    if root_owner not in (None, uid):
        raise HTTPException(409, "That pitch ID is already in use.")
    previous = record(db_read(vault_path(uid, pitch_id)))
    if not (agreement or previous.get("document")):
        raise HTTPException(422, "Upload the investment agreement before publishing.")
    if (not validated.gallery or not validated.tourVideo or len(validated.witnesses) != 2
            or any(not proof.video.strip() for proof in validated.witnesses)
            or any(not item.image for item in validated.assets)
            or any(not value.strip() for value in (validated.tagline, validated.goals, validated.usp))
            or validated.teamSize < 1):
        raise HTTPException(422, "Complete the gallery, shop video, two witness videos, asset images and business details.")
    old_witnesses = record(record(previous.get("terms")).get("witnesses"))
    for index, upload in enumerate((witness0, witness1)):
        old = record(old_witnesses.get(f"w{index}"))
        same_witness = {k: v for k, v in old.items() if k != "hasCnic"} == validated.witnesses[index].model_dump()
        if not upload and not (old.get("hasCnic") and same_witness):
            raise HTTPException(422, "Attach a redacted CNIC preview for each witness.")
    packet = persist_terms(uid, pitch_id, validated, agreement, (witness0, witness1))
    if not packet["document"]:
        raise HTTPException(409, "Agreement unavailable. Retry publishing.")
    profile = record(db_read(f"founders/{uid}/profile"))
    stage1 = record(existing.get("stage1")) | {
        "ideaTitle": pitch.title.strip(), "categoryIndustry": pitch.category.strip(),
        "ideaDescription": pitch.description.strip(), "requiredInvestmentPkr": validated.fundingGoalPkr,
    }
    stage2 = record(existing.get("stage2")) | {
        "totalCapitalRequiredPkr": validated.fundingGoalPkr, "sampleProductName": validated.sampleName or "",
        "productImages": validated.gallery, "marketLocation": profile.get("location") or "Pakistan",
    }
    stage3 = record(existing.get("stage3")) | {
        "sampleAssetAvailable": validated.sampleAvailable is True, "sampleProductName": validated.sampleName or "",
    }
    public = {
        "id": pitch_id, "pitchId": pitch_id, "founderId": uid, "title": pitch.title.strip(),
        "founderName": profile.get("fullName") or "Founder", "status": "published",
        "productImages": validated.gallery, "productPhotoUrl": validated.gallery[0],
        "totalProductChunks": sum(item.chunks for item in validated.assets),
        "pricePerChunk": validated.pricePerChunk, "profitPerChunk": validated.profitPerChunk,
        "dossier": packet["terms"], "createdAt": existing.get("createdAt") or now(),
        "updatedAt": now(), "stage1": stage1, "stage2": stage2, "stage3": stage3,
    }
    db_update({f"{path}/{name}": value for path in (f"founders/{uid}/pitches/{pitch_id}", f"pitches/{pitch_id}")
               for name, value in public.items()})
    return public


def dossier_details(vault):
    document = record(vault.get("document"))
    return {"terms": public_terms(vault), "document": {
        "extension": document["extension"], "preview": document.get("preview", "")
    } if document else None}


@router.get("/founder/dossiers/{pitch_id}")
def founder_details(pitch_id: str, uid=Depends(seller)):
    owner_pitch(uid, pitch_id)
    return dossier_details(record(db_read(vault_path(uid, pitch_id))))


def shipment_id(founder_id, pitch_id, uid):
    return identifier("sample", founder_id, pitch_id, uid)


def agreement_id(founder_id, pitch_id, uid):
    return identifier("agreement", founder_id, pitch_id, uid)


def chat_id(pitch_id, uid):
    return f"{key(pitch_id)}_{key(uid)}"


@router.get("/dossiers/{founder_id}/{pitch_id}")
def details(founder_id: str, pitch_id: str, uid=Depends(require_verified_investor)):
    owner_pitch(founder_id, pitch_id)
    vault = record(db_read(vault_path(founder_id, pitch_id)))
    agreement = record(record(vault.get("agreements")).get(uid))
    order_id = shipment_id(founder_id, pitch_id, uid)
    order = db_read(f"sampleOrders/{order_id}")
    if agreement:
        project_agreement(agreement)
    contract_id = agreement_id(founder_id, pitch_id, uid)
    eligible = record(order).get("status") == "APPROVED" or record(vault.get("terms")).get("sampleAvailable") is False
    if eligible and not agreement:
        reference(f"dossierAgreementReaders/{contract_id}/{uid}").set(True)
    result = dossier_details(vault)
    if not eligible or agreement:
        result["document"] = None
    return result | {
        "sample": order, "agreement": summary(agreement) if agreement else None,
        "orderId": order_id, "agreementId": contract_id,
    }


@router.get("/dossiers/{founder_id}/{pitch_id}/document")
def read_document(founder_id: str, pitch_id: str, revision: str, uid=Depends(require_verified_investor)):
    owner_pitch(founder_id, pitch_id)
    vault = record(db_read(vault_path(founder_id, pitch_id)))
    if uid in record(vault.get("agreements")):
        raise HTTPException(403, "Unlock the signed agreement with your device.")
    order = record(db_read(f"sampleOrders/{shipment_id(founder_id, pitch_id, uid)}"))
    if order.get("status") != "APPROVED" and record(vault.get("terms")).get("sampleAvailable") is not False:
        raise HTTPException(403, "Approve your sample to view the agreement.")
    if record(vault.get("terms")).get("revision") != revision:
        raise HTTPException(409, "The founder changed the agreement. Refresh the dossier.")
    item = record(vault.get("document"))
    return private_response(item, f"agreement.{item.get('extension', 'pdf')}", inline=True)


@router.get("/dossiers/{founder_id}/{pitch_id}/witnesses/{index}")
def read_witness(founder_id: str, pitch_id: str, index: int, uid=Depends(require_verified_investor)):
    owner_pitch(founder_id, pitch_id)
    private = record(db_read(vault_path(founder_id, pitch_id)))
    return private_response(record(private.get("witnesses")).get(f"w{index}"), "witness-cnic", inline=True)


class SampleInput(BaseModel):
    founderId: str
    pitchId: str
    address: str = Field(min_length=5, max_length=350)
    phone: str = Field(pattern=r"^[+0-9 ()-]{7,26}$")


@router.post("/samples")
def order_sample(payload: SampleInput, request: Request, uid=Depends(require_verified_investor)):
    pitch = owner_pitch(payload.founderId, payload.pitchId)
    terms = record(record(db_read(vault_path(payload.founderId, payload.pitchId))).get("terms"))
    order_id = shipment_id(payload.founderId, payload.pitchId, uid)
    stage3 = record(pitch.get("stage3"))
    stage2 = record(pitch.get("stage2"))
    if terms.get("sampleAvailable") is False:
        raise HTTPException(409, "The founder has not offered a product sample.")
    name = terms.get("sampleName")
    if not name and stage3.get("sampleAssetAvailable") is True:
        name = stage2.get("sampleProductName") or stage3.get("sampleProductName") or title_for(pitch, payload.pitchId)
    if not name:
        raise HTTPException(409, "The founder has not offered a product sample.")
    if len(payload.address.strip()) < 5:
        raise HTTPException(422, "Enter the product sample delivery address.")
    order = reference(f"sampleOrders/{order_id}").transaction(lambda current: current or {
        "id": order_id, "investorId": uid, "founderId": payload.founderId, "pitchId": payload.pitchId,
        "pitchTitle": title_for(pitch, payload.pitchId), "productName": name,
        "address": payload.address.strip(), "phone": payload.phone.strip(), "status": "REQUESTED",
        "createdAt": now(), "frontendOrigin": frontend_origin(request),
    })
    notice = {"id": order_id, "type": "sample", "read": False, "userId": payload.founderId,
              "message": f'New sample request for {order["pitchTitle"]}.', "createdAt": order["createdAt"]}
    reference(f"notifications/{payload.founderId}/{order_id}").transaction(lambda current: current or notice)
    return order


class Delivery(BaseModel):
    estimatedDeliveryAt: int


@router.put("/samples/{order_id}/delivery")
def delivery(order_id: str, payload: Delivery, uid=Depends(seller)):
    estimate = payload.estimatedDeliveryAt
    if not now() < estimate <= now() + 180 * 86_400_000:
        raise HTTPException(422, "Set a delivery date within the next 180 days.")

    def update(current):
        order = record(current)
        if order.get("founderId") != uid:
            raise HTTPException(404, "Sample request not found.")
        if (order.get("status") not in ("REQUESTED", "SCHEDULED") or order.get("estimatedDeliveryAt", now() + 1) <= now()
                or order.get("notifyLeaseUntil", 0) > now() or order.get("notifiedAt")):
            raise HTTPException(409, "The delivery time is locked for this request.")
        return order | {"status": "SCHEDULED", "estimatedDeliveryAt": estimate, "nextNotificationAt": estimate}

    return reference(f"sampleOrders/{key(order_id)}").transaction(update)


class OrderId(BaseModel):
    orderId: str


def mail(recipient, subject, body, message_key):
    host, sender = os.getenv("DOSSIER_SMTP_HOST"), os.getenv("DOSSIER_SMTP_FROM")
    if not host or not sender:
        raise HTTPException(503, "Agreement and delivery email service is unconfigured.")
    message = EmailMessage()
    message["From"], message["To"], message["Subject"] = sender, recipient, subject
    message["Message-ID"] = f"<{message_key}@{sender.rsplit('@', 1)[-1]}>"
    message.set_content(body)
    context = ssl.create_default_context()
    try:
        with smtplib.SMTP(host, int(os.getenv("DOSSIER_SMTP_PORT", "587")), timeout=12) as client:
            client.starttls(context=context)
            username = os.getenv("DOSSIER_SMTP_USERNAME")
            if username:
                client.login(username, os.environ["DOSSIER_SMTP_PASSWORD"])
            client.send_message(message)
    except (OSError, smtplib.SMTPException, KeyError, ValueError):
        raise HTTPException(503, "The email service is temporarily unavailable.") from None


def frontend_origin(request=None):
    observed = request.headers.get("origin") if request else None
    raw = os.getenv("DOSSIER_FRONTEND_ORIGIN") or (observed if observed in FRONTEND_ORIGINS else FRONTEND_ORIGINS[0])
    origin = raw.rstrip("/")
    parsed = urlparse(origin)
    if parsed.scheme != "https" and not (parsed.scheme == "http" and parsed.hostname in ("localhost", "127.0.0.1")):
        raise HTTPException(503, "Configure an HTTPS dossier frontend origin.")
    return origin


def send_delivery_notice(order_id, uid=None):
    path = reference(f"sampleOrders/{key(order_id)}")
    lease = secrets.token_hex(16)

    def claim(current):
        order = record(current)
        if not order or (uid and order.get("investorId") != uid):
            raise HTTPException(404, "Sample request not found.")
        if order.get("status") not in ("SCHEDULED", "APPROVED") or order.get("nextNotificationAt", now() + 1) > now():
            return current
        return order | {"notifyLease": lease, "notifyLeaseUntil": now() + 60_000, "nextNotificationAt": now() + 60_000}

    order = path.transaction(claim)
    if order.get("notifyLease") != lease:
        return {"sent": bool(order.get("notifiedAt"))}
    sent = False
    try:
        account = auth.get_user(order["investorId"], app=firebase)
        if not account.email_verified or not account.email:
            raise HTTPException(409, "Verify the investor email to receive updates.")
        link = f'{order.get("frontendOrigin") or frontend_origin()}/app/investor/idea/{order["pitchId"]}?founderId={order["founderId"]}&stage=2'
        mail(account.email, "Confirm your InvestBiz product sample",
             f'The estimated delivery time for {order["productName"]} has passed.\n'
             f'If it arrived and you approve it, confirm delivery in your dossier:\n{link}', f"sample-{order_id}")
        sent = True
    finally:
        def finish(current):
            current = record(current)
            if current.get("notifyLease") != lease:
                return current
            updated = {k: v for k, v in current.items() if k not in ("notifyLease", "notifyLeaseUntil", "nextNotificationAt")}
            if sent:
                updated["notifiedAt"] = now()
            elif current.get("status") in ("SCHEDULED", "APPROVED"):
                updated["nextNotificationAt"] = now() + 300_000
            return updated
        path.transaction(finish)
    return {"sent": True}


def deliver_due_samples():
    if not os.getenv("DOSSIER_SMTP_HOST"):
        return
    due = reference("sampleOrders").order_by_child("nextNotificationAt").start_at(1).end_at(now()).limit_to_first(30).get() or {}
    for order_id in due:
        try:
            send_delivery_notice(order_id)
        except Exception:
            logger.warning("Sample delivery notification will be retried", exc_info=True)


@router.post("/samples/notify-delivered")
def notify_delivery(payload: OrderId, uid=Depends(require_verified_investor)):
    return send_delivery_notice(payload.orderId, uid)


@router.post("/samples/{order_id}/approve")
def approve_sample(order_id: str, uid=Depends(require_verified_investor)):
    def approve(current):
        order = record(current)
        if order.get("investorId") != uid:
            raise HTTPException(404, "Sample request not found.")
        if order.get("status") == "APPROVED":
            return order
        if order.get("status") != "SCHEDULED" or order.get("estimatedDeliveryAt", now() + 1) > now():
            raise HTTPException(409, "The delivery confirmation window has not opened.")
        return order | {"status": "APPROVED", "approvedAt": now()}

    return reference(f"sampleOrders/{key(order_id)}").transaction(approve)


@router.post("/dossiers/{founder_id}/{pitch_id}/chat")
def open_chat(founder_id: str, pitch_id: str, uid=Depends(require_verified_investor)):
    pitch = owner_pitch(founder_id, pitch_id)
    room_id = chat_id(pitch_id, uid)
    identity = auth.get_user(uid, app=firebase)
    meta = {"id": room_id, "pitchId": pitch_id, "founderId": founder_id, "investorId": uid,
            "pitchTitle": title_for(pitch, pitch_id), "investorName": identity.display_name or "Investor", "dossier": True}

    def create(current):
        if current and any(current.get(field) != meta[field] for field in ("pitchId", "investorId", "founderId", "dossier")):
            raise HTTPException(409, "This chat ID already belongs to another pitch.")
        return current or meta

    reference(f"chats/{room_id}").transaction(create)
    db_update({f"dossierFounderChats/{founder_id}/{room_id}": meta})
    return meta


class Selection(BaseModel):
    founderId: str
    pitchId: str
    revision: str = Field(pattern=r"^[a-f0-9]{32}$")
    quantities: dict[str, int] = Field(min_length=1, max_length=60)


def selection(vault, payload):
    terms = record(vault.get("terms"))
    if terms.get("revision") != payload.revision or not vault.get("document"):
        raise HTTPException(409, "The founder's terms changed or the agreement is missing. Refresh the dossier.")
    reserved = record(vault.get("reserved"))
    items = record(terms.get("assets"))
    lines = []
    for item_id, qty in sorted(payload.quantities.items()):
        item = record(items.get(item_id))
        if qty < 1 or qty > item.get("chunks", 0) - reserved.get(item_id, 0):
            raise HTTPException(409, "Your allocation exceeds the available chunks. Refresh the dossier.")
        lines.append({"itemId": item_id, "name": item["name"], "chunks": qty,
                      "amountPkr": qty * terms["pricePerChunk"]})
    chunks = sum(line["chunks"] for line in lines)
    return {"lines": lines, "chunks": chunks, "amountPkr": chunks * terms["pricePerChunk"],
            "estimatedProfitPkr": chunks * terms["profitPerChunk"], "payoutSchedule": terms["payoutSchedule"]}


def check_sample(founder_id, pitch_id, uid):
    vault = record(db_read(vault_path(founder_id, pitch_id)))
    if record(vault.get("terms")).get("sampleAvailable") is False:
        return
    order = record(db_read(f"sampleOrders/{shipment_id(founder_id, pitch_id, uid)}"))
    if order.get("status") != "APPROVED":
        raise HTTPException(403, "Approve your product sample first.")


def device_origin(request):
    origin = frontend_origin(request)
    return origin, os.getenv("DOSSIER_WEBAUTHN_RP_ID") or urlparse(origin).hostname


def encode(value):
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode()


def decode(value):
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def new_challenge(options, uid, contract_id, purpose, binding):
    challenge_id = secrets.token_hex(24)
    reference(f"dossierChallenges/{challenge_id}").set({
        "uid": uid, "agreementId": contract_id, "purpose": purpose, "binding": binding,
        "challenge": encode(options.challenge), "expiresAt": now() + 300_000,
    })
    return {"id": challenge_id, "options": json.loads(options_to_json(options))}


def claim_challenge(challenge_id, uid, contract_id, purpose, binding):
    def claim(current):
        current = record(current)
        if (current.get("uid"), current.get("agreementId"), current.get("purpose"), current.get("binding")) != (
            uid, contract_id, purpose, binding
        ) or current.get("used") or current.get("expiresAt", 0) < now():
            raise HTTPException(409, "The device verification expired. Please try again.")
        return current | {"used": True}

    return decode(reference(f"dossierChallenges/{key(challenge_id)}").transaction(claim)["challenge"])


def binding_for(payload):
    return digest(json.dumps(payload.model_dump(), sort_keys=True, separators=(",", ":")))


@router.post("/agreements/register-options")
def register_options(payload: Selection, request: Request, uid=Depends(require_verified_investor)):
    owner_pitch(payload.founderId, payload.pitchId)
    check_sample(payload.founderId, payload.pitchId, uid)
    vault = record(db_read(vault_path(payload.founderId, payload.pitchId)))
    if uid in record(vault.get("agreements")):
        raise HTTPException(409, "You already signed this agreement.")
    selection(vault, payload)
    _, rp_id = device_origin(request)
    options = generate_registration_options(
        rp_id=rp_id, rp_name="InvestBiz", user_name=uid, user_id=digest(uid).encode(),
        authenticator_selection=AuthenticatorSelectionCriteria(
            authenticator_attachment=AuthenticatorAttachment.PLATFORM,
            user_verification=UserVerificationRequirement.REQUIRED,
        ),
    )
    return new_challenge(options, uid, agreement_id(payload.founderId, payload.pitchId, uid),
                         "register", binding_for(payload))


@router.post("/agreements/send-sign-link")
def send_sign_link(payload: Selection, request: Request, uid=Depends(require_verified_investor)):
    pitch = owner_pitch(payload.founderId, payload.pitchId)
    check_sample(payload.founderId, payload.pitchId, uid)
    vault = record(db_read(vault_path(payload.founderId, payload.pitchId)))
    if uid in record(vault.get("agreements")):
        raise HTTPException(409, "You already signed this agreement.")
    selection(vault, payload)
    account = auth.get_user(uid, app=firebase)
    if not account.email_verified or not account.email:
        raise HTTPException(403, "Verify your email before requesting a signing link.")
    token = secrets.token_urlsafe(32)
    token_hash = digest(token)
    identifier = agreement_id(payload.founderId, payload.pitchId, uid)
    path = reference(f"dossierVideoLinks/{identifier}")
    def issue(current):
        current = record(current)
        if current.get("issuedAt", 0) > now() - 60_000:
            raise HTTPException(429, "Wait one minute before sending a new link.")
        return {"uid": uid, "issuedAt": now(), "expiresAt": now() + 1_800_000,
                "tokenHash": token_hash, "selection": payload.model_dump()}

    path.transaction(issue)
    try:
        mail(account.email, "Sign your InvestBiz agreement",
             f'Sign the agreement for {title_for(pitch, payload.pitchId)} within 30 minutes:\n'
             f'{frontend_origin(request)}/sign-agreement/{identifier}_{token}', f"sign-{token_hash}")
    except HTTPException:
        path.transaction(lambda current: {**current, "issuedAt": 0} if record(current).get("tokenHash") == token_hash else current)
        raise
    return {"sent": True}


def video_link(token, uid):
    link_id, secret = token[:64], token[65:]
    if token[64:65] != "_" or not re.fullmatch(r"[a-f0-9]{64}", link_id) or not VIDEO_TOKEN.fullmatch(secret):
        raise HTTPException(404, "Signing link is invalid or has expired.")
    value = record(db_read(f"dossierVideoLinks/{link_id}"))
    if (value.get("uid") != uid or value.get("expiresAt", 0) < now()
            or not secrets.compare_digest(value.get("tokenHash", ""), digest(secret))):
        raise HTTPException(404, "Signing link is invalid or has expired.")
    return Selection.model_validate(value["selection"])


@router.get("/agreements/video-link/{token}/document")
def video_agreement_document(token: str, uid=Depends(require_verified_investor)):
    payload = video_link(token, uid)
    return read_document(payload.founderId, payload.pitchId, payload.revision, uid)


@router.get("/agreements/video-link/{token}")
def get_video_link(token: str, uid=Depends(require_verified_investor)):
    payload = video_link(token, uid)
    pitch = owner_pitch(payload.founderId, payload.pitchId)
    vault = record(db_read(vault_path(payload.founderId, payload.pitchId)))
    if uid in record(vault.get("agreements")):
        raise HTTPException(409, "You already signed this agreement.")
    if not record(vault.get("document")):
        raise HTTPException(409, "The founder must publish an agreement before signing.")
    return {"selection": payload, "title": title_for(pitch, payload.pitchId),
            "allocation": selection(vault, payload), "document": dossier_details(vault)["document"]}


def summary(agreement):
    return {field: agreement[field] for field in (
        "id", "status", "pitchId", "founderId", "investorId", "pitchTitle", "signedAt",
        "countersignedAt", "investorBiometricHash", "allocation", "revision", "investorName", "founderReviewShared",
    ) if field in agreement}


def project_agreement(agreement):
    row = summary(agreement)
    reference(f"agreements/{row['id']}").transaction(
        lambda current: row if record(current).get("revision", 0) <= row["revision"] else current
    )


def recheck_investor_cnic(uid, front, back):
    verified_number = state(uid).get("cnicNumber")
    if not verified_number:
        raise HTTPException(409, "Reverify your investor identity before signing.")
    _, front_card = scan_document(front, "Front")
    _, back_card = scan_document(back, "Back")
    with TemporaryDirectory(prefix="investbiz-contract-") as temp:
        _, number = read_card(Path(temp), front_card, back_card, document_portrait(front_card))
    if not secrets.compare_digest(re.sub(r"\D", "", verified_number), re.sub(r"\D", "", number)):
        raise HTTPException(422, "Use the CNIC verified on this investor account.")
    front.file.seek(0)
    back.file.seek(0)


def evidence(prefix, cnic_front, cnic_back, signature, video=None):
    images = {name: read_image(file) for name, file in
              (("cnic-front", cnic_front), ("cnic-back", cnic_back), ("signature", signature))}
    with Image.open(io.BytesIO(images["signature"][0])) as ink:
        if ink.mode != "RGBA" or not ink.getchannel("A").getbbox():
            raise HTTPException(422, "Draw your signature before submitting.")
    if images["cnic-front"][0] == images["cnic-back"][0]:
        raise HTTPException(422, "Upload separate photos for the front and back of your CNIC.")
    if video:
        mime = (video.content_type or "").split(";")[0]
        content = video.file.read(35_000_001)
        if len(content) > 35_000_000 or not (
            (mime == "video/webm" and content.startswith(b"\x1a\x45\xdf\xa3"))
            or (mime == "video/mp4" and content[4:8] == b"ftyp")
        ):
            raise HTTPException(422, "Record a WebM or MP4 video no larger than 35 MB.")
        images["video"] = (content, mime)
    return {name: private_upload(f"{prefix}/{name}", *item) for name, item in images.items()}


@router.post("/agreements/sign")
def sign(
    request: Request, selection_json: str = Form(...), challenge_id: str = Form(...), credential: str = Form(...),
    cnic_front: UploadFile = File(...), cnic_back: UploadFile = File(...), signature: UploadFile = File(...),
    video_token: str = Form(""), video: UploadFile | None = File(None),
    share_founder_review: bool = Form(False), uid=Depends(require_verified_investor),
):
    payload = parse_model(Selection, selection_json)
    pitch = owner_pitch(payload.founderId, payload.pitchId)
    check_sample(payload.founderId, payload.pitchId, uid)
    if bool(video_token) != bool(video) or (video_token and video_link(video_token, uid) != payload):
        raise HTTPException(422, "The video signing link must match the selected agreement.")
    contract_id = agreement_id(payload.founderId, payload.pitchId, uid)
    path = reference(vault_path(payload.founderId, payload.pitchId))
    current = record(path.get())
    existing = record(current.get("agreements")).get(uid)
    if existing:
        project_agreement(existing)
        return summary(existing)
    selection(current, payload)
    challenge = claim_challenge(challenge_id, uid, contract_id, "register", binding_for(payload))
    origin, rp_id = device_origin(request)
    try:
        registered = verify_registration_response(credential=credential, expected_challenge=challenge,
                                                  expected_rp_id=rp_id, expected_origin=origin,
                                                  require_user_verification=True)
    except (WebAuthnException, ValueError, TypeError, binascii.Error):
        raise HTTPException(422, "Device verification failed.") from None

    recheck_investor_cnic(uid, cnic_front, cnic_back)
    investor_name = state(uid).get("fullName") or auth.get_user(uid, app=firebase).display_name or "Investor"
    package = evidence(f"private/agreements/{contract_id}/{secrets.token_hex(16)}/investor",
                       cnic_front, cnic_back, signature, video)

    def commit(vault):
        vault = record(vault)
        agreements = record(vault.get("agreements")).copy()
        if uid in agreements:
            return vault
        allocation = selection(vault, payload)
        reserved = record(vault.get("reserved")).copy()
        for line in allocation["lines"]:
            item = line["itemId"]
            reserved[item] = reserved.get(item, 0) + line["chunks"]
        agreements[uid] = {
            "id": contract_id, "status": "AWAITING_FOUNDER", "revision": 1, "signedAt": now(),
            "pitchId": payload.pitchId, "pitchTitle": title_for(pitch, payload.pitchId),
            "founderId": payload.founderId, "investorId": uid, "allocation": allocation,
            "investorName": investor_name, "founderReviewShared": share_founder_review,
            "termsRevision": payload.revision, "document": vault["document"],
            "investorEvidence": package, "signatureMethod": "VIDEO" if video else "DRAWN",
            "investorBiometricHash": digest(registered.credential_id),
            "credential": {"id": encode(registered.credential_id),
                           "key": encode(registered.credential_public_key), "count": registered.sign_count},
        }
        return vault | {"agreements": agreements, "reserved": reserved}

    agreement = path.transaction(commit)["agreements"][uid]
    project_agreement(agreement)
    return summary(agreement)


def lookup(contract_id, uid, role):
    row = record(db_read(f"agreements/{key(contract_id)}"))
    if row.get(role) != uid:
        raise HTTPException(404, "Agreement not found.")
    path = reference(vault_path(row["founderId"], row["pitchId"]))
    agreement = record(record(path.get()).get("agreements")).get(row["investorId"])
    if not agreement or agreement["id"] != contract_id or agreement[role] != uid:
        raise HTTPException(404, "Agreement not found.")
    return path, agreement


@router.get("/agreements/{contract_id}/founder-preview")
def founder_preview(contract_id: str, uid=Depends(seller)):
    _, agreement = lookup(contract_id, uid, "founderId")
    return dossier_details(agreement)["document"]


@router.get("/agreements/{contract_id}/founder-document")
def founder_document(contract_id: str, uid=Depends(seller)):
    _, agreement = lookup(contract_id, uid, "founderId")
    document = agreement["document"]
    return private_response(document, f'agreement.{document["extension"]}', inline=True)


@router.get("/agreements/{contract_id}/founder-evidence/{part}")
def founder_evidence(contract_id: str, part: str, uid=Depends(seller)):
    _, agreement = lookup(contract_id, uid, "founderId")
    if agreement.get("founderReviewShared") is not True or agreement.get("status") != "AWAITING_FOUNDER":
        raise HTTPException(403, "Investor evidence is available during countersignature with the investor's permission.")
    if part not in ("cnic-front", "cnic-back", "signature"):
        raise HTTPException(404, "Evidence not found.")
    item = record(record(agreement.get("investorEvidence")).get(part))
    if not item:
        raise HTTPException(404, "Evidence not found.")
    suffix = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}.get(item["mime"], "img")
    return private_response(item, f"{part}.{suffix}", inline=True)


@router.post("/agreements/{contract_id}/countersign")
def countersign(
    contract_id: str, cnic_front: UploadFile = File(...), cnic_back: UploadFile = File(...),
    signature: UploadFile = File(...), uid=Depends(seller),
):
    path, existing = lookup(contract_id, uid, "founderId")
    if existing["status"] == "COUNTERSIGNED":
        project_agreement(existing)
        return summary(existing)
    package = evidence(f"private/agreements/{contract_id}/{secrets.token_hex(16)}/founder",
                       cnic_front, cnic_back, signature)
    investor_id = existing["investorId"]

    def commit(vault):
        agreement = vault["agreements"][investor_id]
        if agreement["status"] == "AWAITING_FOUNDER":
            agreement.update({"status": "COUNTERSIGNED", "countersignedAt": now(),
                              "founderEvidence": package, "revision": agreement["revision"] + 1})
        return vault

    agreement = path.transaction(commit)["agreements"][investor_id]
    project_agreement(agreement)
    return summary(agreement)


@router.post("/agreements/{contract_id}/unlock-options")
def unlock_options(contract_id: str, request: Request, uid=Depends(require_verified_investor)):
    _, agreement = lookup(contract_id, uid, "investorId")
    _, rp_id = device_origin(request)
    options = generate_authentication_options(
        rp_id=rp_id,
        allow_credentials=[PublicKeyCredentialDescriptor(id=decode(agreement["credential"]["id"]))],
        user_verification=UserVerificationRequirement.REQUIRED,
    )
    return new_challenge(options, uid, contract_id, "unlock", "")


class Assertion(BaseModel):
    id: str
    credential: dict


@router.post("/agreements/{contract_id}/unlock")
def unlock(contract_id: str, payload: Assertion, request: Request, uid=Depends(require_verified_investor)):
    path, existing = lookup(contract_id, uid, "investorId")
    challenge = claim_challenge(payload.id, uid, contract_id, "unlock", "")
    origin, rp_id = device_origin(request)
    stored = existing["credential"]
    try:
        result = verify_authentication_response(
            credential=payload.credential, expected_challenge=challenge, expected_rp_id=rp_id,
            expected_origin=origin, credential_public_key=decode(stored["key"]),
            credential_current_sign_count=stored["count"], require_user_verification=True,
        )
    except (WebAuthnException, ValueError, TypeError, binascii.Error):
        raise HTTPException(403, "Your device could not unlock this agreement.") from None
    if digest(result.credential_id) != existing["investorBiometricHash"]:
        raise HTTPException(403, "This device credential does not match the agreement.")
    path.child("agreements").child(uid).child("credential").child("count").transaction(
        lambda count: max(count or 0, result.new_sign_count)
    )
    grant = secrets.token_urlsafe(32)
    reference(f"dossierGrants/{digest(grant)}").set({
        "uid": uid, "agreementId": contract_id, "expiresAt": now() + 300_000,
    })
    return {"grant": grant, "expiresAt": now() + 300_000, "extension": existing["document"]["extension"], "agreement": summary(existing),
            "documentHash": existing["document"]["sha256"], "documentPreview": existing["document"].get("preview", ""),
            "signatureMethod": existing["signatureMethod"],
            "hasFounderSignature": bool(existing.get("founderEvidence"))}


@router.post("/agreements/{contract_id}/signed-files/{part}")
def signed_file(contract_id: str, part: str, grant: str = Form(...), uid=Depends(require_verified_investor)):
    _, agreement = lookup(contract_id, uid, "investorId")
    authorized = record(db_read(f"dossierGrants/{digest(grant)}"))
    if (authorized.get("uid") != uid or authorized.get("agreementId") != contract_id
            or authorized.get("expiresAt", 0) < now()):
        raise HTTPException(403, "Unlock the agreement again to download its files.")
    document = agreement["document"]
    files = {
        "document": (document, f'agreement.{document["extension"]}'),
        "investor-signature": (agreement["investorEvidence"]["signature"], "investor-signature"),
        "investor-video": (agreement["investorEvidence"].get("video"), "investor-video"),
        "founder-signature": (record(agreement.get("founderEvidence")).get("signature"), "founder-signature"),
    }
    file, name = files.get(part, (None, part))
    return private_response(file, name)


@router.post("/agreements/{contract_id}/escrow")
def escrow_checkout(contract_id: str, uid=Depends(require_verified_investor)):
    _, agreement = lookup(contract_id, uid, "investorId")
    if agreement["status"] != "COUNTERSIGNED":
        raise HTTPException(409, "The founder must countersign before escrow checkout.")
    allocation = agreement["allocation"]
    intent = reference(f"dossierEscrowIntents/{contract_id}").transaction(lambda current: current or {
        "id": contract_id, "agreementId": contract_id, "investorId": uid, "founderId": agreement["founderId"],
        "amountPkr": allocation["amountPkr"], "chunks": allocation["chunks"], "lines": allocation["lines"],
        "state": "AWAITING_PAYMENT", "createdAt": now(),
    })
    return intent | {"providerConfigured": False}
