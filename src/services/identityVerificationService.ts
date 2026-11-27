/**
 * Shared identity verification: email/password signup + email verification link.
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  reload,
  type User,
} from "firebase/auth";
import { auth } from "@/firebase";
import { clearLocalOnboardingSession } from "@/lib/onboardingResume";

import { backendRequest } from "@/lib/backendClient";
import type { RoleType } from "@/services/onboardingFirestoreService";

async function syncEmailProfile(user: User, role: RoleType, fullName?: string) {
  const result = await backendRequest(user, "/api/users/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, full_name: fullName || "" }),
  });
  return await result.json() as { emailVerified: boolean };
}

export function friendlyIdentityError(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
  const msg = err instanceof Error ? err.message : String(err || "");

  if (
    code.includes("error-code:-26") ||
    msg.includes("error-code:-26") ||
    code === "auth/too-many-requests" || code === "auth/quota-exceeded" ||
    msg.includes("too-many-requests")
  ) {
    return "Firebase temporarily blocked the request. Wait a minute before retrying. If a link already arrived, use that link.";
  }
  if (code === "auth/network-request-failed") return "Could not reach Firebase. Check your connection and retry.";
  if (code === "auth/email-already-in-use") {
    return "Yeh email pehle se registered hai. Login karein ya nayi email use karein.";
  }
  if (code === "auth/weak-password") return "Password kam az kam 6 characters ka hona chahiye.";
  if (code === "auth/invalid-email") return "Email format sahi nahi hai.";
  if (err instanceof Error && err.message) return err.message;
  return "Verification failed. Please try again.";
}

export async function createEmailPasswordAndSendVerification(input: {
  email: string;
  password: string;
  fullName?: string;
  role: RoleType;
}): Promise<User> {
  const email = String(input.email || "").trim().toLowerCase();
  const password = String(input.password || "");
  const fullName = String(input.fullName || "").trim();
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  // Clear stale local onboarding session for new registration
  clearLocalOnboardingSession();

  let user: User;
  try {
    user = (await createUserWithEmailAndPassword(auth, email, password)).user;
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "auth/email-already-in-use")) throw error;
    // Retries require the entered password and retain the role stored in RTDB.
    user = (await signInWithEmailAndPassword(auth, email, password)).user;
  }
  await syncEmailProfile(user, input.role, fullName);
  try {
    if (fullName) {
      await updateProfile(user, { displayName: fullName });
    }
  } catch (profileErr) {
    console.warn("updateProfile skipped:", profileErr);
  }

  if (!user.emailVerified) {
    try {
      await sendEmailVerification(user);
    } catch (error) {
      throw new VerificationDeliveryError(error);
    }
  }
  return user;
}

export class VerificationDeliveryError extends Error {
  constructor(error: unknown) {
    super(friendlyIdentityError(error));
    this.name = "VerificationDeliveryError";
  }
}

export async function resendEmailVerificationMail(email: string): Promise<"accepted" | "verified"> {
  const user = auth.currentUser;
  if (!user || user.email?.toLowerCase() !== email.trim().toLowerCase()) {
    throw new Error("Sign in with the same email address to continue verification.");
  }
  await reload(user);
  if (user.emailVerified) return "verified";
  await sendEmailVerification(user);
  return "accepted";
}

export async function reloadAndCheckEmailVerified(email: string, role: RoleType): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || user.email?.toLowerCase() !== email.trim().toLowerCase()) return false;
  await reload(user);
  if (!user.emailVerified || auth.currentUser?.uid !== user.uid) return false;
  await user.getIdToken(true);
  if (auth.currentUser?.uid !== user.uid) return false;
  const saved = await syncEmailProfile(user, role);
  return saved.emailVerified === true && auth.currentUser?.uid === user.uid;
}
