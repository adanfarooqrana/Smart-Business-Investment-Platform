import { get, ref } from "firebase/database";
import { database, auth } from "@/firebase";
import type { KycReviewRole } from "@/services/adminKycService";
import type {
  KycFirestoreSchema,
  UserOnboardingFirestoreDocument,
} from "@/services/onboardingFirestoreService";

export type OnboardingLockStage =
  | "loading"
  | "approved"
  | "awaiting_admin"
  | "needs_kyc"
  | "needs_profile"
  | "needs_email";

export type OnboardingLockInfo = {
  stage: OnboardingLockStage;
  resumePath: "/app/register";
  resumeRole: KycReviewRole;
};

/**
 * Canonical Firestore `onboardingStage` semantics (writers in onboardingFirestoreService):
 *   1         → Stage 1 credentials / email not verified
 *   2         → email verified → MUST show Stage 2 role details (never Stage 3 KYC yet)
 *   3         → role details synced → Stage 3 KYC / biometric
 *   completed → onboarding finished → dashboard
 */
export type WizardUiStage = 1 | 2 | 3;

export type ResolvedWizardStep = {
  /** 1-based UI: 1=credentials, 2=role details, 3=KYC */
  stage: WizardUiStage;
  goDashboard: boolean;
  /** Missing Firestore user doc — caller should create Stage 1 sync */
  ensureStage1Doc: boolean;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

/** True when Firestore KYC object has all three document URLs. */
export function hasValidKycData(kyc?: KycFirestoreSchema | null): boolean {
  if (!kyc) return false;
  return Boolean(
    String(kyc.cnicFrontUrl || "").trim() &&
      String(kyc.cnicBackUrl || "").trim() &&
      String(kyc.selfieUrl || "").trim(),
  );
}

/**
 * Clear stale onboarding caches on wizard mount / new registration.
 * Preserves USE_SIMULATED_KYC admin toggle.
 */
export function clearLocalOnboardingSession() {
  try {
    if (typeof window === "undefined") return;
    let simulatedKyc: string | null = null;
    try {
      simulatedKyc = window.localStorage.getItem("USE_SIMULATED_KYC");
    } catch {
      /* ignore */
    }

    try {
      window.sessionStorage.clear();
    } catch {
      /* ignore */
    }

    try {
      window.localStorage.removeItem("onboardingStage");
      window.localStorage.removeItem("kycData");
      window.localStorage.removeItem("biz_onboarding_stage");
      window.localStorage.removeItem("founder_onboarding_stage");
      window.localStorage.removeItem("investor_onboarding_stage");
      window.localStorage.removeItem("wholesaler_onboarding_stage");
      window.localStorage.removeItem("currentStage");
      window.localStorage.removeItem("onboarding_step");
      window.localStorage.removeItem("wizardStep");
    } catch {
      /* ignore */
    }

    if (simulatedKyc === "true" || simulatedKyc === "false") {
      try {
        window.localStorage.setItem("USE_SIMULATED_KYC", simulatedKyc);
      } catch {
        /* ignore */
      }
    }
  } catch (err) {
    console.warn("Failed to clear local onboarding session:", err);
  }
}

/**
 * Map Auth + Firestore onboarding doc → wizard UI stage.
 * Stage 2 = role details; Stage 3 = KYC (last before dashboard).
 */
export function resolveWizardUiStage(opts: {
  emailVerified: boolean;
  fsDoc: UserOnboardingFirestoreDocument | null;
}): ResolvedWizardStep {
  if (!opts.emailVerified) {
    return { stage: 1, goDashboard: false, ensureStage1Doc: !opts.fsDoc };
  }

  const doc = opts.fsDoc;
  if (!doc || typeof doc.onboardingStage === "undefined" || doc.onboardingStage === null) {
    // New / re-registered user (no Firestore doc) with verified email → Stage 2 details
    return { stage: 2, goDashboard: false, ensureStage1Doc: true };
  }

  const stage = doc.onboardingStage;
  if (stage === "completed") {
    return { stage: 3, goDashboard: true, ensureStage1Doc: false };
  }

  // Stage 3 in Firestore = role details done → show KYC
  if (stage === 3) {
    return { stage: 3, goDashboard: false, ensureStage1Doc: false };
  }

  // Stage 2 in Firestore = email verified → role details
  if (stage === 2) {
    return { stage: 2, goDashboard: false, ensureStage1Doc: false };
  }

  // Stage 1 leftover while email already verified → advance to details
  if (stage === 1) {
    return { stage: 2, goDashboard: false, ensureStage1Doc: false };
  }

  return { stage: 1, goDashboard: false, ensureStage1Doc: false };
}

/**
 * Sequential Onboarding Resume Guard for dashboard / KycPendingGate.
 */
export async function resolveOnboardingLock(
  uid: string,
  role: KycReviewRole,
): Promise<OnboardingLockInfo> {
  const cleanUid = String(uid || "").trim();
  const base: OnboardingLockInfo = {
    stage: "needs_profile",
    resumePath: "/app/register",
    resumeRole: role,
  };
  if (!cleanUid) return base;

  try {
    try {
      if (auth.currentUser?.uid === cleanUid) {
        await auth.currentUser.reload();
        if (!auth.currentUser.emailVerified) {
          return { ...base, stage: "needs_email" };
        }
      }
    } catch {
      /* continue */
    }

    try {
      const { getFirestoreOnboardingDoc } = await import("@/services/onboardingFirestoreService");
      const fsDoc = await getFirestoreOnboardingDoc(cleanUid);
      const emailVerified =
        auth.currentUser?.uid === cleanUid
          ? Boolean(auth.currentUser.emailVerified)
          : Boolean(fsDoc?.emailVerified);

      if (!emailVerified) {
        return { ...base, stage: "needs_email" };
      }

      const resolved = resolveWizardUiStage({ emailVerified: true, fsDoc });
      if (resolved.goDashboard) {
        return { ...base, stage: "approved" };
      }
      // UI stage 3 = KYC last; UI stage 2 = role details
      if (resolved.stage === 3) {
        return { ...base, stage: "needs_kyc" };
      }
      if (resolved.stage === 2) {
        return { ...base, stage: "needs_profile" };
      }
      return { ...base, stage: "needs_email" };
    } catch {
      /* continue with RTDB */
    }

    const [userSnap, kycSnap] = await Promise.all([
      get(ref(database, `users/${cleanUid}`)),
      get(ref(database, `kyc_reviews/${cleanUid}`)),
    ]);

    const user = asRecord(userSnap.exists() ? userSnap.val() : null);
    const kyc = asRecord(kycSnap.exists() ? kycSnap.val() : null);
    const kycStatus = String(kyc?.kycStatus || user?.kycStatus || "").toLowerCase();

    if (kycStatus === "approved" || kycStatus === "pending") {
      return { ...base, stage: "approved" };
    }

    const hasSelfieUrl = Boolean(
      String(kyc?.liveSelfieUrl || kyc?.selfieUrl || user?.liveSelfieUrl || "").trim(),
    );
    const hasCnic = Boolean(
      String(kyc?.cnicFrontUrl || user?.cnicFrontUrl || "").trim(),
    );

    if (role === "business_owner") {
      const step = Number(user?.stepCompleted ?? 0) || 0;
      if (step >= 3 && hasSelfieUrl && hasCnic) return { ...base, stage: "approved" };
      if (step >= 3 && !(hasSelfieUrl && hasCnic)) return { ...base, stage: "needs_kyc" };
      if (hasSelfieUrl && hasCnic) return { ...base, stage: "approved" };
      // Details before KYC: missing business profile → needs_profile
      if (step < 3) return { ...base, stage: "needs_profile" };
      return { ...base, stage: "needs_kyc" };
    }

    if (role === "founder") {
      const founderSnap = await get(ref(database, `founders/${cleanUid}/profile`));
      const founder = asRecord(founderSnap.exists() ? founderSnap.val() : null);
      if (!founder) return { ...base, stage: "needs_profile" };
      const hasDetails = Boolean(
        String(founder.cnicNumber || founder.phone || founder.bankName || "").trim(),
      );
      if (!hasDetails) return { ...base, stage: "needs_profile" };
      const hasSelfie = Boolean(String(founder.liveSelfieUrl || "").trim());
      if (!hasSelfie) return { ...base, stage: "needs_kyc" };
      return { ...base, stage: "approved" };
    }

    if (role === "investor") {
      const invSnap = await get(ref(database, `investors/${cleanUid}/profile`));
      const inv = asRecord(invSnap.exists() ? invSnap.val() : null);
      if (!inv) return { ...base, stage: "needs_profile" };
      const invKyc = String(inv.kycStatus || "").toLowerCase();
      if (invKyc === "pending" || invKyc === "approved") return { ...base, stage: "approved" };
      const hasInvSelfie = Boolean(String(inv.liveSelfieUrl || inv.selfieUrl || "").trim());
      const hasInvDetails = Boolean(
        String(inv.cnic || inv.phone || inv.bankName || "").trim(),
      );
      if (!hasInvDetails) return { ...base, stage: "needs_profile" };
      if (!hasInvSelfie) return { ...base, stage: "needs_kyc" };
      return { ...base, stage: "needs_kyc" };
    }

    const consSnap = await get(ref(database, `consultants/${cleanUid}`));
    const cons = asRecord(consSnap.exists() ? consSnap.val() : null);
    if (!cons) return { ...base, stage: "needs_profile" };
    const hasWholesalerDetails = Boolean(
      String(cons.businessName || cons.phone || cons.cnicNumber || "").trim(),
    );
    if (!hasWholesalerDetails) return { ...base, stage: "needs_profile" };
    const hasSelfie = Boolean(String(cons.liveSelfie || cons.liveSelfieUrl || "").trim());
    if (!hasSelfie) return { ...base, stage: "needs_kyc" };
    return { ...base, stage: "approved" };
  } catch (error) {
    console.error("resolveOnboardingLock error:", error);
    return { ...base, stage: "needs_profile" };
  }
}

export function resumeRegisterSearch(role: KycReviewRole): { resume: string } {
  return { resume: role };
}
