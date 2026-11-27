import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { backendRequest } from "@/lib/backendClient";
/**
 * Admin KYC review pipeline — complete signup payloads for Business / Founder / Investor.
 * Canonical queue: kyc_reviews/{uid}
 * Mirror: users/{uid} (full object for authenticated owners)
 */
import { auth, database } from "@/firebase";
import { ref, set, update, onValue, off, get } from "firebase/database";

export type KycReviewRole = "business_owner" | "founder" | "investor" | "wholesaler";
export type KycStatus = "pending" | "approved" | "rejected";

export type KycReviewRecord = {
  uid: string;
  role: KycReviewRole;
  fullName: string;
  email: string;
  phoneNumber: string;
  cnic: string;
  /** Founder / Investor only */
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  /** Business Owner storefront / KYC meta */
  businessName?: string;
  trademark?: string;
  location?: string;
  category?: string;
  registerNumber?: string;
  cnicFrontUrl: string;
  cnicBackUrl: string;
  liveSelfieUrl: string;
  matchConfidenceScore?: number;
  kycStatus: KycStatus;
  isApproved: boolean;
  createdAt: number;
  updatedAt: number;
};

export type SubmitKycReviewInput = {
  uid: string;
  role: KycReviewRole;
  fullName: string;
  email: string;
  phoneNumber: string;
  cnic: string;
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  businessName?: string;
  trademark?: string;
  location?: string;
  category?: string;
  registerNumber?: string;
  cnicFrontUrl: string;
  cnicBackUrl: string;
  liveSelfieUrl: string;
  matchConfidenceScore?: number;
};

export const KYC_REVIEW = (uid: string) => `kyc_reviews/${uid}`;
export const USER_NODE = (uid: string) => `users/${uid}`;

export async function isAdminSessionValid(): Promise<boolean> {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return false;
  const token = await user.getIdTokenResult().catch(() => null);
  return token?.claims.admin === true && token.claims.email_verified === true;
}

export async function clearAdminSession(): Promise<void> {
  await signOut(auth);
}

export async function authenticateAdmin(email: string, password: string): Promise<boolean> {
  const { user } = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  try {
    await backendRequest(user, "/api/admin/session");
    return true;
  } catch {
    await clearAdminSession();
    return false;
  }
}

function clean(v: unknown): string {
  return String(v ?? "").trim();
}

/** Persist complete signup + KYC media for admin review (pending). */
export async function submitPendingKycReview(
  input: SubmitKycReviewInput,
): Promise<KycReviewRecord> {
  try {
    const uid = clean(input.uid);
    if (!uid) throw new Error("uid is required for KYC review submission.");

    const now = Date.now();
    const isBusiness = input.role === "business_owner";
    const record: KycReviewRecord = {
      uid,
      role: input.role,
      fullName: clean(input.fullName),
      email: clean(input.email).toLowerCase(),
      phoneNumber: clean(input.phoneNumber),
      cnic: clean(input.cnic),
      ...(isBusiness
        ? {
            businessName: clean(input.businessName),
            trademark: clean(input.trademark),
            location: clean(input.location),
            category: clean(input.category),
            registerNumber: clean(input.registerNumber),
          }
        : {
            bankName: clean(input.bankName),
            accountTitle: clean(input.accountTitle),
            accountNumber: clean(input.accountNumber),
          }),
      cnicFrontUrl: clean(input.cnicFrontUrl),
      cnicBackUrl: clean(input.cnicBackUrl),
      liveSelfieUrl: clean(input.liveSelfieUrl),
      matchConfidenceScore: Number(input.matchConfidenceScore ?? 0) || 0,
      kycStatus: "pending",
      isApproved: false,
      createdAt: now,
      updatedAt: now,
    };

    const profileFields = {
        uid,
        role: input.role,
        fullName: record.fullName,
        email: record.email,
        phoneNumber: record.phoneNumber,
        phone: record.phoneNumber,
        cnic: record.cnic,
        ...(isBusiness
          ? {
              businessName: record.businessName || "",
              trademark: record.trademark || "",
              location: record.location || "",
              category: record.category || "",
              registerNumber: record.registerNumber || "",
            }
          : {
              bankName: record.bankName || "",
              accountTitle: record.accountTitle || "",
              accountNumber: record.accountNumber || "",
            }),
        cnicFrontUrl: record.cnicFrontUrl,
        cnicBackUrl: record.cnicBackUrl,
        liveSelfieUrl: record.liveSelfieUrl,
        matchConfidenceScore: record.matchConfidenceScore || 0,
        kycStatus: "pending",
        isApproved: false,
        updatedAt: now,
    };

    await update(ref(database), {
      [KYC_REVIEW(uid)]: record,
      ...Object.fromEntries(Object.entries(profileFields).map(([key, value]) => [USER_NODE(uid) + '/' + key, value])),
    });

    return record;
  } catch (error) {
    console.error("submitPendingKycReview error:", error);
    throw error;
  }
}

function mapReview(uid: string, raw: Record<string, unknown> | null): KycReviewRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const statusRaw = String(raw.kycStatus ?? "pending");
  const kycStatus: KycStatus =
    statusRaw === "approved" || statusRaw === "rejected" ? statusRaw : "pending";
  const role = (String(raw.role || "investor") as KycReviewRole) || "investor";
  return {
    uid: String(raw.uid || uid),
    role,
    fullName: String(raw.fullName ?? ""),
    email: String(raw.email ?? ""),
    phoneNumber: String(raw.phoneNumber ?? raw.phone ?? ""),
    cnic: String(raw.cnic ?? raw.cnicNumber ?? ""),
    bankName: String(raw.bankName ?? ""),
    accountTitle: String(raw.accountTitle ?? ""),
    accountNumber: String(raw.accountNumber ?? ""),
    businessName: String(raw.businessName ?? ""),
    trademark: String(raw.trademark ?? ""),
    location: String(raw.location ?? ""),
    category: String(raw.category ?? ""),
    registerNumber: String(raw.registerNumber ?? ""),
    cnicFrontUrl: String(raw.cnicFrontUrl ?? ""),
    cnicBackUrl: String(raw.cnicBackUrl ?? ""),
    liveSelfieUrl: String(raw.liveSelfieUrl ?? ""),
    matchConfidenceScore: Number(raw.matchConfidenceScore ?? 0) || 0,
    kycStatus,
    isApproved: Boolean(raw.isApproved) || kycStatus === "approved",
    createdAt: Number(raw.createdAt ?? 0) || 0,
    updatedAt: Number(raw.updatedAt ?? 0) || 0,
  };
}

/** Live stream of all KYC reviews (admin dashboard). */
export function streamAllKycReviews(
  callback: (items: KycReviewRecord[]) => void,
): () => void {
  const rootRef = ref(database, "kyc_reviews");
  let active = true;

  try {
    onValue(
      rootRef,
      (snap) => {
        try {
          if (!active) return;
          if (!snap.exists()) {
            callback([]);
            return;
          }
          const root = snap.val() as Record<string, Record<string, unknown>>;
          const list = Object.keys(root)
            .map((uid) => mapReview(uid, root[uid]))
            .filter((r): r is KycReviewRecord => Boolean(r));
          list.sort((a, b) => b.createdAt - a.createdAt);
          callback(list);
        } catch (error) {
          console.error("streamAllKycReviews handler error:", error);
          callback([]);
        }
      },
      (err) => {
        console.error("streamAllKycReviews listener error:", err);
        callback([]);
      },
    );
  } catch (error) {
    console.error("streamAllKycReviews setup error:", error);
    callback([]);
  }

  return () => {
    active = false;
    try {
      off(rootRef);
    } catch (error) {
      console.error("streamAllKycReviews cleanup error:", error);
    }
  };
}

/** Live status for a single user (waiting screen / route gate). */
export function streamUserKycStatus(
  uid: string,
  callback: (record: KycReviewRecord | null) => void,
): () => void {
  const cleanUid = clean(uid);
  if (!cleanUid) {
    callback(null);
    return () => undefined;
  }

  const targetRef = ref(database, KYC_REVIEW(cleanUid));
  let active = true;

  try {
    onValue(
      targetRef,
      (snap) => {
        try {
          if (!active) return;
          callback(snap.exists() ? mapReview(cleanUid, snap.val()) : null);
        } catch (error) {
          console.error("streamUserKycStatus handler error:", error);
          callback(null);
        }
      },
      (err) => {
        console.error("streamUserKycStatus listener error:", err);
        callback(null);
      },
    );
  } catch (error) {
    console.error("streamUserKycStatus setup error:", error);
    callback(null);
  }

  return () => {
    active = false;
    try {
      off(targetRef);
    } catch (error) {
      console.error("streamUserKycStatus cleanup error:", error);
    }
  };
}

async function syncRoleApproval(uid: string, role: KycReviewRole, approved: boolean): Promise<void> {
  const status = approved ? "approved" : "rejected";
  const patch = {
    kycStatus: status,
    isApproved: approved,
    status,
    updatedAt: Date.now(),
  };

  try {
    if (role === "founder") {
      await update(ref(database, `founders/${uid}/profile`), patch);
    } else if (role === "investor") {
      await update(ref(database, `investors/${uid}/profile`), patch);
    } else if (role === "business_owner") {
      await update(ref(database, `users/${uid}`), {
        kycStatus: status,
        isApproved: approved,
        updatedAt: Date.now(),
      });
      try {
        await update(ref(database, `business_owners/${uid}/profile`), {
          kycStatus: status,
          isApproved: approved,
          updatedAt: Date.now(),
        });
      } catch {
        /* optional mirror */
      }
    } else if (role === "wholesaler") {
      await update(ref(database, `consultants/${uid}`), {
        kycStatus: status,
        isApproved: approved,
        updatedAt: Date.now(),
      });
    }
  } catch (error) {
    console.error("syncRoleApproval error:", error);
  }
}

export async function approveKycReview(uid: string): Promise<void> {
  try {
    const cleanUid = clean(uid);
    if (!cleanUid) throw new Error("uid required");
    const now = Date.now();

    // Authenticated users self-sync role nodes via applyLocalRoleApproval on approve.
    await update(ref(database), {
      [`${KYC_REVIEW(cleanUid)}/kycStatus`]: "approved",
      [`${KYC_REVIEW(cleanUid)}/isApproved`]: true,
      [`${KYC_REVIEW(cleanUid)}/updatedAt`]: now,
    });
  } catch (error) {
    console.error("approveKycReview error:", error);
    throw error;
  }
}

export async function rejectKycReview(uid: string): Promise<void> {
  try {
    const cleanUid = clean(uid);
    if (!cleanUid) throw new Error("uid required");
    const now = Date.now();

    await update(ref(database), {
      [`${KYC_REVIEW(cleanUid)}/kycStatus`]: "rejected",
      [`${KYC_REVIEW(cleanUid)}/isApproved`]: false,
      [`${KYC_REVIEW(cleanUid)}/updatedAt`]: now,
    });
  } catch (error) {
    console.error("rejectKycReview error:", error);
    throw error;
  }
}

/** Called by the waiting user when they observe admin approval (self-sync role nodes). */
export async function applyLocalRoleApproval(uid: string, role: KycReviewRole): Promise<void> {
  try {
    await syncRoleApproval(uid, role, true);
    try {
      await update(ref(database, USER_NODE(uid)), {
        kycStatus: "approved",
        isApproved: true,
        updatedAt: Date.now(),
      });
    } catch (userErr) {
      console.warn("applyLocalRoleApproval users mirror skipped:", userErr);
    }
  } catch (error) {
    console.error("applyLocalRoleApproval error:", error);
  }
}
