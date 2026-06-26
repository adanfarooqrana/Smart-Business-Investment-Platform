/**
 * Mirrors Firestore founder/investor data to Firebase Realtime Database
 * (https://smart-business-investment-app-default-rtdb.firebaseio.com)
 */
import { ref, set, push } from "firebase/database";
import { database } from "../firebase";
import { RTDB } from "@/lib/rtdbPaths";
import type { EntrepreneurProfile } from "./entrepreneurService";
import type { AssembledPitchDocuments } from "@/lib/investorPitchSchema";

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const key of Object.keys(out)) {
    if (out[key] === undefined) delete out[key];
  }
  return out;
}

export type RtdbProblemPayload = {
  id: string;
  founderId: string;
  founderName: string;
  title: string;
  description: string;
  problemText: string;
  targetRole: string;
  category: string;
  status: string;
  urgency?: string;
  aiRoutingSummary?: string;
  notifiedRoles?: string[];
  notifiedExperts?: string[];
  createdAt: number;
};

/** Save problem to community_posts (primary) + founder_problems + entrepreneur folder. */
export async function syncEntrepreneurProblemToRtdb(
  problem: RtdbProblemPayload,
): Promise<void> {
  const ts = problem.createdAt || Date.now();
  const record = stripUndefined({
    id: problem.id,
    founderId: problem.founderId,
    founderName: problem.founderName,
    title: problem.title,
    description: problem.description,
    problemText: problem.problemText,
    targetRole: problem.targetRole,
    category: problem.category,
    status: problem.status,
    urgency: problem.urgency || "Medium",
    aiRoutingSummary: problem.aiRoutingSummary,
    notifiedRoles: problem.notifiedRoles,
    notifiedExperts: problem.notifiedExperts,
    createdAt: ts,
    updatedAt: ts,
  });

  // 1. Community feed — visible to all logged-in users
  const postRef = push(ref(database, RTDB.communityPosts));
  await set(postRef, {
    ...record,
    id: postRef.key,
    author: problem.founderName || "Founder",
    role: "entrepreneur",
    badge: "Founder",
    category: "Problems Hub",
    tag: "Problem",
    content: problem.description || problem.problemText,
    isProblem: true,
    entrepreneurProblem: true,
    founderProblemId: problem.id,
    votes: 0,
    shares: 0,
  });

  // 2. Flat index for reliable reads
  await set(ref(database, RTDB.founderProblem(problem.id)), record);

  // 3. Under entrepreneur profile (best-effort)
  try {
    await set(
      ref(database, `${RTDB.entrepreneurs(problem.founderId)}/problems/${problem.id}`),
      record,
    );
  } catch (err) {
    console.warn("entrepreneur problems sub-path skipped:", err);
  }
}

export async function syncEntrepreneurToRtdb(
  profile: EntrepreneurProfile & { password?: string },
): Promise<void> {
  const ts = Date.now();
  const payload = stripUndefined({
    ...profile,
    createdAt: ts,
    updatedAt: ts,
  });

  await Promise.all([
    set(ref(database, RTDB.entrepreneurs(profile.uid)), payload),
    set(ref(database, RTDB.users(profile.uid)), {
      uid: profile.uid,
      name: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      role: "entrepreneur",
      profileId: profile.profileId,
      createdAt: ts,
    }),
    set(ref(database, RTDB.userDirectoryEntry(profile.uid)), {
      uid: profile.uid,
      name: profile.fullName,
      email: profile.email,
      role: "entrepreneur",
      createdAt: ts,
    }),
  ]);
}

export async function syncPitchToRtdb(
  ideaId: string,
  docs: AssembledPitchDocuments,
  entrepreneurUid: string,
): Promise<void> {
  const ts = Date.now();
  await Promise.all([
    set(ref(database, RTDB.entrepreneurIdea(entrepreneurUid, ideaId)), {
      ...docs.investmentIdea,
      entrepreneurUid,
      createdAt: ts,
      updatedAt: ts,
    }),
    set(ref(database, `${RTDB.entrepreneurIdea(entrepreneurUid, ideaId)}/stage1`), {
      ...docs.stage1Data,
      updatedAt: ts,
    }),
    set(ref(database, `${RTDB.entrepreneurIdea(entrepreneurUid, ideaId)}/stage2`), {
      ...docs.stage2Data,
      updatedAt: ts,
    }),
    set(ref(database, `${RTDB.entrepreneurIdea(entrepreneurUid, ideaId)}/stage3`), {
      ...docs.stage3Data,
      updatedAt: ts,
    }),
    set(ref(database, `${RTDB.entrepreneurs(entrepreneurUid)}/pitches/${ideaId}`), {
      ideaId,
      startupTitle: docs.investmentIdea.startupTitle,
      category: docs.investmentIdea.category,
      status: "live",
      createdAt: ts,
    }),
    set(ref(database, RTDB.investorFeedIdea(ideaId)), {
      entrepreneurUid,
      title: docs.investmentIdea.startupTitle,
      category: docs.investmentIdea.category,
      stage: "Stage 1",
      createdAt: ts,
      founderName: docs.investmentIdea.founderName,
      startupTitle: docs.investmentIdea.startupTitle,
      industry: docs.investmentIdea.industry,
      description: docs.investmentIdea.description,
      accent: docs.investmentIdea.accent,
      investmentIdea: docs.investmentIdea,
      stage1: docs.stage1Data,
      stage2: docs.stage2Data,
      stage3: docs.stage3Data,
      status: "live",
      updatedAt: ts,
    }),
  ]);
}

export async function registerBusinessToBackend(payload: {
  email: string;
  password: string;
  fullName: string;
  businessName: string;
  phone: string;
  category: string;
  subcategory: string;
  location: string;
  size: string;
  website: string;
  about: string;
  registerNumber: string;
  trademark: string;
  cnicFront: string;
  cnicBack: string;
  liveSelfie: string;
}): Promise<string> {
  const { registerUser, saveBusinessProfile } = await import("./firebaseService");
  const cred = await registerUser(
    payload.email,
    payload.password,
    payload.fullName,
    "business",
  );
  const uid = cred.user.uid;
  await saveBusinessProfile(uid, {
    uid,
    name: payload.businessName,
    email: payload.email,
    phone: payload.phone,
    category: payload.category,
    subcategory: payload.subcategory,
    location: payload.location,
    size: payload.size,
    website: payload.website,
    about: payload.about,
    registerNumber: payload.registerNumber,
    trademark: payload.trademark,
    cnicFront: payload.cnicFront,
    cnicBack: payload.cnicBack,
    liveSelfie: payload.liveSelfie,
    isRegistered: true,
    isApproved: true,
    score: 75,
  });
  return uid;
}

export async function registerInvestorToBackend(payload: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  categories: string[];
  budgetRange: string;
  ticketSize: string;
  location: string;
  strategy: string;
  entityType: string;
  cnicFront: string;
  cnicBack: string;
  liveSelfie: string;
}): Promise<string> {
  const { registerUser, saveInvestorProfile } = await import("./firebaseService");
  const cred = await registerUser(
    payload.email,
    payload.password,
    payload.fullName,
    "investor",
  );
  const uid = cred.user.uid;
  await saveInvestorProfile(uid, {
    uid,
    name: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    categories: payload.categories,
    budgetRange: payload.budgetRange,
    ticketSize: payload.ticketSize,
    location: payload.location,
    strategy: payload.strategy,
    entityType: payload.entityType,
    cnicFront: payload.cnicFront,
    cnicBack: payload.cnicBack,
    liveSelfie: payload.liveSelfie,
    isRegistered: true,
    isApproved: true,
  });
  return uid;
}
