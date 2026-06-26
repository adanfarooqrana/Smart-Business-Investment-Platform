import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { auth, firestore as db, storage } from "../firebase";
import { ref as storageRef, uploadString, getDownloadURL } from "firebase/storage";

export type PaymentType = "bank" | "jazzcash" | "easypaisa";

export type EntrepreneurMetrics = {
  investorsViewedIdea: number;
  activeSampleRequests: number;
  unreadMessagesCount: number;
};

export type EntrepreneurProfile = {
  uid: string;
  profileId: string;
  fullName: string;
  email: string;
  phone: string;
  cnicFrontUrl: string;
  cnicBackUrl?: string;
  liveSelfieUrl?: string;
  faceMatchScore?: number;
  ideaVision?: string;
  ideaInterest?: string;
  founderGoals?: string;
  paymentType: PaymentType;
  bankAccountNumber?: string;
  mobileWalletNumber?: string;
  isVerified: boolean;
  isApproved: boolean;
  metrics: EntrepreneurMetrics;
  theme: {
    primary: string;
    secondary: string;
    background: string;
  };
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
};

export type EntrepreneurSignupPayload = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  cnicFrontDataUrl: string;
  cnicBackDataUrl: string;
  liveSelfieDataUrl: string;
  faceMatchScore: number;
  ideaVision?: string;
  ideaInterest?: string;
  founderGoals?: string;
  paymentType: PaymentType;
  bankAccountNumber?: string;
  mobileWalletNumber?: string;
};

function generateProfileId(): string {
  const segment =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()
      : Date.now().toString(36).toUpperCase();
  return `ENT-${segment}`;
}

async function uploadEntrepreneurImage(
  uid: string,
  folder: string,
  fileName: string,
  dataUrl: string,
): Promise<string> {
  try {
    const fileRef = storageRef(storage, `uploads/${uid}/entrepreneurs/${folder}/${fileName}`);
    const snapshot = await uploadString(fileRef, dataUrl, "data_url");
    return await getDownloadURL(snapshot.ref);
  } catch (err) {
    console.warn(`Entrepreneur image upload failed (${folder}), keeping data URL:`, err);
    return dataUrl;
  }
}

export async function registerEntrepreneur(
  payload: EntrepreneurSignupPayload,
): Promise<EntrepreneurProfile> {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    payload.email,
    payload.password,
  );
  const user = userCredential.user;

  const [cnicFrontUrl, cnicBackUrl, liveSelfieUrl] = await Promise.all([
    uploadEntrepreneurImage(user.uid, "cnic", "front.jpg", payload.cnicFrontDataUrl),
    uploadEntrepreneurImage(user.uid, "cnic", "back.jpg", payload.cnicBackDataUrl),
    uploadEntrepreneurImage(user.uid, "selfie", "live.jpg", payload.liveSelfieDataUrl),
  ]);
  const profileId = generateProfileId();

  const profile: EntrepreneurProfile = {
    uid: user.uid,
    profileId,
    fullName: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    cnicFrontUrl,
    cnicBackUrl,
    liveSelfieUrl,
    faceMatchScore: payload.faceMatchScore,
    ideaVision: payload.ideaVision,
    ideaInterest: payload.ideaInterest,
    founderGoals: payload.founderGoals,
    paymentType: payload.paymentType,
    bankAccountNumber:
      payload.paymentType === "bank" ? payload.bankAccountNumber : undefined,
    mobileWalletNumber:
      payload.paymentType !== "bank" ? payload.mobileWalletNumber : undefined,
    isVerified: payload.faceMatchScore >= 90,
    isApproved: payload.faceMatchScore >= 90,
    metrics: {
      investorsViewedIdea: 0,
      activeSampleRequests: 0,
      unreadMessagesCount: 0,
    },
    theme: {
      primary: "#FFA500",
      secondary: "#FFD700",
      background: "#FFF8E1",
    },
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, "entrepreneurs", user.uid), profile);
  await setDoc(doc(db, "users", user.uid), {
    id: user.uid,
    name: payload.fullName,
    email: payload.email,
    role: "entrepreneur",
    profileId,
    createdAt: serverTimestamp(),
  });

  const { syncEntrepreneurToRtdb } = await import("./backendSyncService");
  await syncEntrepreneurToRtdb(profile).catch((err) => {
    console.warn("RTDB entrepreneur sync failed:", err);
  });

  return profile;
}

export async function loginEntrepreneur(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function getEntrepreneurProfile(
  uid: string,
): Promise<EntrepreneurProfile | null> {
  const snap = await getDoc(doc(db, "entrepreneurs", uid));
  if (!snap.exists()) return null;
  return snap.data() as EntrepreneurProfile;
}

export async function updateEntrepreneurMetrics(
  uid: string,
  metrics: Partial<EntrepreneurMetrics>,
) {
  const ref = doc(db, "entrepreneurs", uid);
  const updates: Record<string, number> = {};
  if (metrics.investorsViewedIdea !== undefined) {
    updates["metrics.investorsViewedIdea"] = metrics.investorsViewedIdea;
  }
  if (metrics.activeSampleRequests !== undefined) {
    updates["metrics.activeSampleRequests"] = metrics.activeSampleRequests;
  }
  if (metrics.unreadMessagesCount !== undefined) {
    updates["metrics.unreadMessagesCount"] = metrics.unreadMessagesCount;
  }
  await updateDoc(ref, updates);
}
