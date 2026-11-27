"""Marketplace catalog, seller payout profiles, and an isolated sandbox escrow ledger."""
import json
import time
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, StrictInt

from .firebase_connection import BASE_DIR, reference, require_user
from .investor_kyc import db_read, db_update, investor, state
from firebase_admin import exceptions
from google.auth.exceptions import GoogleAuthError

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])
SHOWCASE = json.loads((BASE_DIR / "marketplace_showcase.json").read_text(encoding="utf-8"))
PRODUCTS = {item["id"]: item for item in SHOWCASE["products"]}
VAULT = "escrowVault"


class Purchase(BaseModel):
    productId: str = Field(max_length=80)
    chunks: StrictInt = Field(ge=1, le=500)
    requestId: UUID


class PayoutAccount(BaseModel):
    bankOrWallet: str = Field(min_length=2, max_length=80)
    accountTitle: str = Field(min_length=2, max_length=100)
    ibanOrNumber: str = Field(min_length=7, max_length=34, pattern=r"^[A-Za-z0-9 -]+$")


class MilestoneAction(BaseModel):
    action: Literal["complete", "approve", "release"]


class Resale(BaseModel):
    enabled: bool


def put_transaction(path, mutate):
    try:
        return reference(path).transaction(mutate)
    except (exceptions.FirebaseError, GoogleAuthError, OSError):
        raise HTTPException(503, "Marketplace database temporarily unavailable. Please retry.") from None


def now():
    return time.time_ns() // 1_000_000


def require_verified_investor(uid=Depends(investor)):
    progress = state(uid)
    if progress.get("stage") != 3 or progress.get("livenessPassed") is not True:
        raise HTTPException(403, "Complete Investor KYC to use checkout.")
    return uid


def seller(claims=Depends(require_user)):
    uid = claims["uid"]
    if claims.get("email_verified") is not True or (db_read(f"users/{uid}") or {}).get("role") not in {
        "entrepreneur", "business_owner", "founder", "business",
    }:
        raise HTTPException(403, "A verified founder or business owner account is required.")
    return uid


@router.get("/payout-account")
def get_payout_account(uid=Depends(seller)):
    user = db_read(f"users/{uid}") or {}
    return user.get("payoutAccount")


@router.put("/payout-account")
def set_payout_account(account: PayoutAccount, uid=Depends(seller)):
    data = {key: value.strip() for key, value in account.model_dump().items()}
    if min(len(data["bankOrWallet"]), len(data["accountTitle"])) < 2 or len(
        "".join(char for char in data["ibanOrNumber"] if char.isalnum())
    ) < 7:
        raise HTTPException(422, "Enter valid payout account details.")
    db_update({f"users/{uid}/payoutAccount": data, f"marketplacePayoutAccounts/{uid}": data})
    return data


def catalog_founder(uid, name, profile, pitch):
    return {
        "id": uid, "founderName": name,
        "businessName": profile.get("businessName") or profile.get("startupName") or name,
        "category": pitch.get("category") or profile.get("category") or "Other", "location": profile.get("location") or "Pakistan",
        "education": profile.get("education") or "", "mobile": profile.get("publicPhone") or "",
        "about": profile.get("businessDescription") or profile.get("about") or "",
        "certificates": list((db_read(f"founderCertificates/{uid}") or {}).values()),
        "image": profile.get("photoUrl") or pitch.get("image"),
        "verified": db_read(f"kyc_reviews/{uid}/isApproved") is True, "demo": False,
    }


def live_pitch(uid, pitch_id, raw, profile):
    if not isinstance(raw, dict):
        return None
    details = raw.get("stage1") or raw
    title = details.get("ideaTitle") or details.get("startupTitle") or raw.get("title")
    if not isinstance(title, str) or not title.strip() or raw.get("status") in {"draft", "deleted", "hidden"}:
        return None
    stage2 = raw.get("stage2") or {}
    photos = raw.get("productImages") or stage2.get("productImages") or []
    if isinstance(photos, dict):
        photos = list(photos.values())
    photos = [url for url in photos if isinstance(url, str) and url.startswith(("https://", "http://localhost:", "http://127.0.0.1:", "/"))][:8] if isinstance(photos, list) else []
    image = raw.get("productPhotoUrl") or stage2.get("productPhotoUrl") or (photos[0] if photos else None)
    total, sold = raw.get("totalProductChunks"), raw.get("soldChunks")
    return {
        "id": pitch_id, "founderId": uid, "demo": False, "title": title,
        "description": details.get("ideaDescription") or raw.get("description") or "",
        "category": details.get("categoryIndustry") or raw.get("industry") or "Other",
        "location": profile.get("location") or stage2.get("marketLocation") or "Pakistan",
        "image": image, "images": photos, "pricePerChunk": raw.get("pricePerChunk"),
        "totalProductChunks": total if type(total) is int and total > 0 else None,
        "soldChunks": sold if type(sold) is int and sold >= 0 else None,
    }


@router.get("/catalog")
def catalog(_=Depends(require_verified_investor)):
    inventory = db_read(f"{VAULT}/sold") or {}
    founders = {item["id"]: item for item in SHOWCASE["founders"]}
    products = {
        (item["founderId"], item["id"]): {**item, "baselineSold": item["soldChunks"], "soldChunks": inventory.get(item["id"], item["soldChunks"])}
        for item in SHOWCASE["products"]
    }
    profiles = db_read("founders") or {}
    for uid, entry in profiles.items():
        if not isinstance(entry, dict):
            continue
        profile = entry.get("profile") or {}
        for pid, raw in (entry.get("pitches") or {}).items():
            product = live_pitch(uid, pid, raw, profile)
            if product:
                products[(uid, pid)] = product
                if uid not in founders:
                    founders[uid] = catalog_founder(uid, profile.get("fullName") or "Founder", profile, product)
        if uid not in founders and (profile.get("fullName") or profile.get("businessName")):
            founders[uid] = catalog_founder(uid, profile.get("fullName") or "Founder", profile, {})
    for pid, raw in (db_read("pitches") or {}).items():
        if not isinstance(raw, dict):
            continue
        uid = raw.get("founderId") or raw.get("entrepreneurUid") or raw.get("uid")
        if not isinstance(uid, str) or (uid, pid) in products:
            continue
        profile = (profiles.get(uid) or {}).get("profile") or {}
        product = live_pitch(uid, pid, raw, profile)
        if product:
            products[(uid, pid)] = product
            if uid not in founders:
                founders[uid] = catalog_founder(uid, profile.get("fullName") or raw.get("founderName") or "Founder", profile, product)
    return {"founders": list(founders.values()), "products": list(products.values())}


def project_revision(path, data):
    put_transaction(path, lambda old: old if old and old.get("revision", 0) > data["revision"] else data)


def project_deal(vault, deal_id):
    deal = vault["deals"][deal_id]
    project_revision(f"escrowDeals/{deal_id}", deal)
    pid, uid = deal["productId"], deal["investorUid"]
    project_revision(f"users/{uid}/portfolio/{pid}", vault["portfolio"][uid][pid])
    product = PRODUCTS[pid]
    if vault["sold"][pid] >= product["totalProductChunks"]:
        db_update({
            f"marketplaceFounderCatalog/{product['founderId']}/{pid}": {
                "productId": pid, "status": "FULLY_FUNDED", "soldChunks": vault["sold"][pid], "mode": "SANDBOX",
            },
        })
    return deal


@router.post("/purchases")
def purchase(payload: Purchase, uid=Depends(require_verified_investor)):
    product = PRODUCTS.get(payload.productId)
    if not product:
        raise HTTPException(409, "Live escrow checkout requires a connected payment provider.")
    pid = product["id"]
    deal_id = f"{uid}_{payload.requestId.hex}"

    def commit(existing):
        vault = existing or {}
        deals = vault.setdefault("deals", {})
        if prior := deals.get(deal_id):
            if prior["productId"] != pid or prior["chunks"] != payload.chunks:
                raise HTTPException(409, "This request ID was already used for a different purchase.")
            return vault
        sold = vault.setdefault("sold", {})
        current_sold = sold.get(pid, product["soldChunks"])
        if current_sold + payload.chunks > product["totalProductChunks"]:
            raise HTTPException(409, "This product no longer has that many chunks available.")
        amount = product["pricePerChunk"] * payload.chunks
        milestones = []
        remaining = amount
        for index, spec in enumerate(product["milestones"]):
            value = remaining if index == len(product["milestones"]) - 1 else amount * spec["weight"] // 100
            remaining -= value
            milestones.append({"label": spec["label"], "amountPkr": value, "status": "PENDING"})
        deals[deal_id] = {
            "id": deal_id, "investorUid": uid, "founderId": product["founderId"], "productId": pid,
            "title": product["title"], "chunks": payload.chunks, "amountPkr": amount, "releasedPkr": 0,
            "createdAt": now(), "status": "HELD_IN_ESCROW", "revision": 1,
            "mode": "SANDBOX", "milestones": milestones,
        }
        sold[pid] = current_sold + payload.chunks
        vault.setdefault("investorDeals", {}).setdefault(uid, {})[deal_id] = True
        holdings = vault.setdefault("portfolio", {}).setdefault(uid, {})
        prior = holdings.get(pid, {})
        holdings[pid] = {
            "id": pid, "title": product["title"], "mode": "SANDBOX",
            "investedPkr": prior.get("investedPkr", 0) + amount, "chunks": prior.get("chunks", 0) + payload.chunks,
            "profitPerChunk": product["profitPerChunk"], "resaleEnabled": prior.get("resaleEnabled", False),
            "revision": prior.get("revision", 0) + 1,
        }
        return vault

    return project_deal(put_transaction(VAULT, commit), deal_id)


@router.get("/portfolio")
def portfolio(uid=Depends(require_verified_investor)):
    rows = db_read(f"{VAULT}/portfolio/{uid}") or {}
    index = db_read(f"{VAULT}/investorDeals/{uid}") or {}
    deals = [db_read(f"{VAULT}/deals/{deal_id}") for deal_id in index]
    return {"holdings": list(rows.values()), "deals": [item for item in deals if item and item["investorUid"] == uid]}


@router.patch("/portfolio/{product_id}/resale")
def resale(product_id: str, payload: Resale, uid=Depends(require_verified_investor)):
    if product_id not in PRODUCTS:
        raise HTTPException(404, "Holding not found.")

    def update(old):
        if not old:
            raise HTTPException(404, "Holding not found.")
        return {**old, "resaleEnabled": payload.enabled, "revision": old["revision"] + 1}

    target = f"portfolio/{uid}/{product_id}"
    changed = put_transaction(f"{VAULT}/{target}", update)
    project_revision(f"users/{uid}/portfolio/{product_id}", changed)
    return changed


@router.post("/deals/{deal_id}/milestones/{index}")
def milestone(deal_id: str, index: int, payload: MilestoneAction, uid=Depends(require_verified_investor)):
    if not deal_id.startswith(uid + "_") or len(deal_id) != len(uid) + 33 or not 0 <= index < 3:
        raise HTTPException(404, "Sandbox deal not found.")
    try:
        UUID(hex=deal_id.rsplit("_", 1)[1])
    except ValueError:
        raise HTTPException(404, "Sandbox deal not found.") from None
    order = {"PENDING": 0, "COMPLETED": 1, "APPROVED": 2, "RELEASED": 3}
    transitions = {"complete": ("PENDING", "COMPLETED"), "approve": ("COMPLETED", "APPROVED"), "release": ("APPROVED", "RELEASED")}
    expected, desired = transitions[payload.action]

    def advance(vault):
        old = (vault or {}).get("deals", {}).get(deal_id)
        if not old or old.get("mode") != "SANDBOX" or old.get("investorUid") != uid:
            raise HTTPException(404, "Sandbox deal not found.")
        steps = old["milestones"]
        step = steps[index]
        if order[step["status"]] >= order[desired]:
            return vault
        if step["status"] != expected or any(prior["status"] != "RELEASED" for prior in steps[:index]):
            raise HTTPException(409, "Complete the milestone actions in order.")
        step["status"] = desired
        old["revision"] += 1
        if desired == "RELEASED":
            old["releasedPkr"] += step["amountPkr"]
            balances = vault.setdefault("sandboxBalances", {})
            founder = old["founderId"]
            balances[founder] = balances.get(founder, 0) + step["amountPkr"]
            step["destination"] = "Showcase founder demo balance"
            if old["releasedPkr"] == old["amountPkr"]:
                old["status"] = "RELEASED"
        return vault

    changed = put_transaction(VAULT, advance)["deals"][deal_id]
    project_revision(f"escrowDeals/{deal_id}", changed)
    return changed
