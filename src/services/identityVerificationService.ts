/**
 * Shared identity verification: email/password signup + email verification link.
 */
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  reload,
  type User,
} from "firebase/auth";
import { auth } from "@/firebase";

export function friendlyIdentityError(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
  if (code === "auth/email-already-in-use") {
    return "Yeh email pehle se registered hai. Login karein ya nayi email use karein.";
  }
  if (code === "auth/weak-password") return "Password kam az kam 6 characters ka hona chahiye.";
  if (code === "auth/invalid-email") return "Email format sahi nahi hai.";
  if (code === "auth/too-many-requests") return "Bohat zyada attempts. Thori der baad try karein.";
  if (err instanceof Error && err.message) return err.message;
  return "Verification failed. Please try again.";
}

export async function createEmailPasswordAndSendVerification(input: {
  email: string;
  password: string;
  fullName: string;
}): Promise<User> {
  const email = String(input.email || "").trim().toLowerCase();
  const password = String(input.password || "");
  const fullName = String(input.fullName || "").trim();
  if (!email || !password || !fullName) {
    throw new Error("Full name, email, and password are required.");
  }

  const cred = await createUserWithEmailAndPassword(auth, email, password);
  try {
    if (fullName) {
      await updateProfile(cred.user, { displayName: fullName });
    }
  } catch (profileErr) {
    console.warn("updateProfile skipped:", profileErr);
  }

  try {
    await sendEmailVerification(cred.user);
  } catch (mailErr) {
    console.error("sendEmailVerification failed:", mailErr);
    throw new Error(
      friendlyIdentityError(mailErr) ||
        "Account ban gaya lekin verification email nahi gayi. Resend try karein.",
    );
  }

  return cred.user;
}

export async function resendEmailVerificationMail(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("No signed-in user. Sign up again.");
  if (user.emailVerified) return;
  await sendEmailVerification(user);
}

export async function reloadAndCheckEmailVerified(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  try {
    await reload(user);
    return Boolean(auth.currentUser?.emailVerified);
  } catch (error) {
    console.error("reloadAndCheckEmailVerified error:", error);
    return false;
  }
}
