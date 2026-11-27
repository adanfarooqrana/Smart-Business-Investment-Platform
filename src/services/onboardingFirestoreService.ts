import { ref, serverTimestamp, update } from "firebase/database";
import { auth, database } from "@/firebase";
import { backendRequest } from "@/lib/backendClient";
import { sanitizeExtractedCnic } from "@/lib/kycOcrService";

export type RoleType = "business_owner" | "entrepreneur" | "investor" | "wholesaler";
export type OnboardingStage = 1 | 2 | 3 | "completed";

export type KycFirestoreSchema = {
  status: "pending" | "verified" | "failed";
  cnicFrontUrl: string;
  cnicBackUrl: string;
  selfieUrl: string;
  matchScore?: number;
  mode: "simulated" | "direct";
};

export type ProfileFirestoreSchema = {
  fullName: string;
  cnicNumber: string;
  roleDetails?: Record<string, unknown>;
};

export type UserOnboardingFirestoreDocument = {
  uid: string;
  email: string;
  role: RoleType;
  emailVerified: boolean;
  kyc?: KycFirestoreSchema;
  profile?: ProfileFirestoreSchema;
  onboardingStage: OnboardingStage;
  updatedAt?: unknown;
};

/**
 * Stage 1: Credentials & Email Verification sync.
 *
 * onboardingStage semantics:
 *   emailVerified=false → 1 (stay on credentials / verify email)
 *   emailVerified=true  → 2 (next UI is Stage 2 role details — NOT KYC)
 */
export async function syncStage1ToFirestore(params: {
  uid: string;
  email: string;
  role: RoleType;
  emailVerified: boolean;
  fullName?: string;
}): Promise<void> {
  if (!params.uid) return;
  const user = auth.currentUser;
  if (!user || user.uid !== params.uid) throw new Error("Sign in again to resume onboarding.");
  if (params.emailVerified) await user.getIdToken(true);
  await backendRequest(user, "/api/users/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: params.role, full_name: params.fullName || "" }),
  });
}

/**
 * Stage 2: Role-specific details & profile fields sync.
 * Sets onboardingStage=3 → next UI is Stage 3 KYC / biometric.
 */
export async function syncStage2ToFirestore(params: {
  uid: string;
  email: string;
  role: RoleType;
  fullName: string;
  cnicNumber: string;
  roleDetails: Record<string, unknown>;
}): Promise<void> {
  if (!params.uid) return;
  const userOnboarding = ref(database, "onboarding/" + params.uid);
  await update(userOnboarding, {
      uid: params.uid,
      email: params.email,
      role: params.role,
      profile: {
        fullName: String(params.fullName || "").trim(),
        cnicNumber:
          sanitizeExtractedCnic(params.cnicNumber) ||
          String(params.cnicNumber || "").replace(/\D/g, "").replace(/^(\d{5})(\d{7})(\d)$/, "$1-$2-$3") ||
          String(params.cnicNumber || "").trim(),
        roleDetails: params.roleDetails,
      },
      onboardingStage: 3,
      updatedAt: serverTimestamp(),
  });
}

/**
 * Stage 3: KYC document capture + onboarding completion sync.
 */
export async function syncStage3ToFirestore(params: {
  uid: string;
  email: string;
  role: RoleType;
  fullName: string;
  cnicNumber: string;
  roleDetails?: Record<string, unknown>;
  kyc: KycFirestoreSchema;
}): Promise<void> {
  if (!params.uid) return;
  const userOnboarding = ref(database, "onboarding/" + params.uid);
  const dataToSet: Partial<UserOnboardingFirestoreDocument> = {
    uid: params.uid,
    email: params.email,
    role: params.role,
    profile: {
      fullName: String(params.fullName || "").trim(),
      cnicNumber:
        sanitizeExtractedCnic(params.cnicNumber) ||
        String(params.cnicNumber || "").trim(),
      ...(params.roleDetails ? { roleDetails: params.roleDetails } : {}),
    },
    kyc: params.kyc,
    onboardingStage: "completed",
    updatedAt: serverTimestamp(),
  };

  await update(userOnboarding, dataToSet);
}

/**
 * Fetch current onboarding state document from Realtime Database onboarding/{uid}
 */
export async function getFirestoreOnboardingDoc(
  uid: string,
): Promise<UserOnboardingFirestoreDocument | null> {
  const user = auth.currentUser;
  if (!user || user.uid !== uid) return null;
  try {
    const response = await backendRequest(user, "/api/users/me/onboarding");
    return await response.json() as UserOnboardingFirestoreDocument | null;
  } catch (error) {
    console.warn("Could not read onboarding progress:", error);
    return null;
  }
}
