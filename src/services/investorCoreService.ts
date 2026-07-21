/**
 * Investor Core Service — strict 5-level RTDB schema.
 *
 * L1  investors/{uid}/profile
 * L2  investors/{uid}/investments/{pitchId}
 * L3  investors/{uid}/payment_desk/{pitchId}  (+ pitches/{pitchId}/transactions/{investorId})
 * L4  investors/{uid}/my_portfolio/{pitchId}
 * L5  chats/{pitchId}_{investorId}_{founderId}/messages
 */
import { database, auth } from "../firebase";
import {
  ref,
  set,
  get,
  update,
  onValue,
  off,
  push,
} from "firebase/database";
import type { StartupIdea } from "@/data/startupIdeas";
import {
  mapAuthenticFounderPitchToStartupIdea,
} from "@/services/founderFirebaseService";

// ─── Paths ───────────────────────────────────────────────────────────────────

export const INVESTOR_PROFILE = (investorId: string) =>
  `investors/${investorId}/profile`;

export const INVESTOR_INVESTMENT = (investorId: string, pitchId: string) =>
  `investors/${investorId}/investments/${pitchId}`;

export const INVESTOR_PAYMENT_DESK = (investorId: string, pitchId: string) =>
  `investors/${investorId}/payment_desk/${pitchId}`;

export const INVESTOR_PAYMENT_DESK_ROOT = (investorId: string) =>
  `investors/${investorId}/payment_desk`;

export const INVESTOR_PORTFOLIO_ITEM = (investorId: string, pitchId: string) =>
  `investors/${investorId}/my_portfolio/${pitchId}`;

export const INVESTOR_PORTFOLIO_ROOT = (investorId: string) =>
  `investors/${investorId}/my_portfolio`;

export const PITCH_TRANSACTION = (pitchId: string, investorId: string) =>
  `pitches/${pitchId}/transactions/${investorId}`;

/**
 * SINGLE source of truth for investor RTDB branch keys.
 * Always auth.currentUser.uid — never push keys, names, or React-cache UIDs.
 */
export function requireActiveInvestorUid(claimedUid?: string | null): string {
  try {
    const uid = String(auth.currentUser?.uid || "").trim();
    if (!uid) {
      throw new Error(
        "No authenticated Firebase investor session. Please sign in again before investing.",
      );
    }
    const claimed = String(claimedUid || "").trim();
    if (claimed && claimed !== uid) {
      console.error("Investor UID mismatch blocked:", { claimed, authUid: uid });
      throw new Error(
        "Session mismatch: investment writes must stay under your original account. Sign out and sign in with the same investor email.",
      );
    }
    return uid;
  } catch (error) {
    console.error("requireActiveInvestorUid error:", error);
    throw error;
  }
}

/** Non-throwing UID peek for stream listeners (empty string if signed out). */
export function peekActiveInvestorUid(): string {
  try {
    return String(auth.currentUser?.uid || "").trim();
  } catch {
    return "";
  }
}

export const getChatRoomId = (pitchId: string, investorId: string, founderId: string) => {
  const clean = (v: string, fb: string) =>
    String(v || fb).replace(/[^a-zA-Z0-9-]/g, "") || fb;
  return `${clean(pitchId, "pitch")}_${clean(investorId, "investor")}_${clean(founderId, "founder")}`;
};

/** Primary: investors/{investorId}/chats/{chatId} */
export const INVESTOR_CHAT_ROOM = (investorId: string, chatId: string) =>
  `investors/${investorId}/chats/${chatId}`;

export const INVESTOR_CHAT_MESSAGES = (investorId: string, chatId: string) =>
  `investors/${investorId}/chats/${chatId}/messages`;

export const INVESTOR_CHATS_ROOT = (investorId: string) =>
  `investors/${investorId}/chats`;

/** Founder inbox index for reactive thread list */
export const FOUNDER_CHAT_INDEX = (founderId: string, chatId: string) =>
  `founders/${founderId}/chat_index/${chatId}`;

export const FOUNDER_CHAT_INDEX_ROOT = (founderId: string) =>
  `founders/${founderId}/chat_index`;

/** @deprecated Legacy root chats/* — kept for ID helper compatibility */
export const CHAT_MESSAGES = (pitchId: string, investorId: string, founderId: string) =>
  `chats/${getChatRoomId(pitchId, investorId, founderId)}/messages`;

// ─── Types ───────────────────────────────────────────────────────────────────

export type InvestorBankDetails = {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
};

/** L1 — Strict private profile under investors/{uid}/profile only */
export type InvestorProfileNode = {
  fullName: string;
  email: string;
  password: string;
  cnic: string;
  mobilePhoneForOtp: string;
  role: "investor";
  uid: string;
  createdAt: number;
  bankDetails: InvestorBankDetails;
  kycStatus?: "pending" | "approved" | "rejected";
  isApproved?: boolean;
};

export type InvestmentStageRecord = {
  pitchId: string;
  founderId: string;
  startupTitle?: string;
  currentStage: 1 | 2 | 3;
  stage1Completed?: boolean;
  stage2Completed?: boolean;
  stage3Completed?: boolean;
  amountInvested?: number;
  equityAcquired?: number;
  roiExpected?: number | string;
  paymentStatus?: "none" | "pending" | "approved";
  updatedAt: number;
  createdAt?: number;
};

export type TransactionStatus = "pending" | "approved";

/** L3 ledger keys (payment_desk + pitch transactions share this shape) */
export type PitchTransactionNode = {
  transactionId: string;
  investorId: string;
  investorName?: string;
  pitchId: string;
  founderId: string;
  startupTitle: string;
  amountInvested: number;
  equityAcquired: number;
  roiExpected: number | string;
  receiptUrl: string;
  /** Cloudinary secure URL for Stage-3 payment proof */
  paymentReceiptUrl?: string;
  status: TransactionStatus;
  timestamp: number;
  /** Founder destination account (payment instructions snapshot) */
  bankName: string;
  accountTitleName: string;
  accountNumber: string;
  /** Investor source bank — for founder Cash Payout verification */
  investorBankName?: string;
  investorAccountTitle?: string;
  investorAccountNumber?: string;
  category?: string;
};

export type PortfolioInvestmentNode = {
  id: string;
  pitchId: string;
  businessName: string;
  startupTitle?: string;
  category: string;
  industry?: string;
  amount: string;
  amountPkr: number;
  expectedRoi: string;
  equityPercent: number;
  terms: string;
  date: string;
  timestamp: number;
  status: "approved";
  receiptUrl?: string;
  founderId?: string;
  transactionId?: string;
};

export type ChatMessageNode = {
  messageId: string;
  senderId: string;
  text: string;
  timestamp: number;
  stageContext?: string;
  senderName?: string;
};

export type InvestorChatThread = {
  channelId: string;
  pitchId: string;
  investorId: string;
  founderId: string;
  founderName?: string;
  investorName?: string;
  startupTitle?: string;
  messages: ChatMessageNode[];
  lastMessage?: ChatMessageNode;
};

// ─── POINT 1: Profile ────────────────────────────────────────────────────────

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export function assertInvestorPassword(password: string): void {
  if (!PASSWORD_RULE.test(String(password || ""))) {
    throw new Error("Password must be at least 8 characters with letters and numbers.");
  }
}

export async function commitInvestorProfile(
  investorId: string,
  payload: {
    fullName: string;
    email: string;
    password: string;
    cnic: string;
    bankDetails: InvestorBankDetails;
    mobilePhoneForOtp: string;
  },
): Promise<void> {
  try {
    // Profile always lands under the live Auth UID (never a generated sibling root)
    const uid = requireActiveInvestorUid(investorId);
    assertInvestorPassword(payload.password);

    // L1 only — never write sensitive fields to investors/{uid} root; never wipe siblings
    const node: InvestorProfileNode = {
      fullName: String(payload.fullName || "").trim(),
      email: String(payload.email || "").trim().toLowerCase(),
      password: String(payload.password || ""),
      cnic: String(payload.cnic || "").trim(),
      mobilePhoneForOtp: String(payload.mobilePhoneForOtp || "").trim(),
      role: "investor",
      uid,
      createdAt: Date.now(),
      bankDetails: {
        bankName: String(payload.bankDetails?.bankName || "").trim(),
        accountTitle: String(payload.bankDetails?.accountTitle || "").trim(),
        accountNumber: String(payload.bankDetails?.accountNumber || "").trim(),
      },
      kycStatus: "pending",
      isApproved: false,
    };

    if (!node.fullName || !node.email || !node.cnic || !node.mobilePhoneForOtp) {
      throw new Error("fullName, email, cnic, and mobilePhoneForOtp are required.");
    }

    await update(ref(database), {
      [INVESTOR_PROFILE(uid)]: node,
    });
  } catch (error) {
    console.error("commitInvestorProfile error:", error);
    throw error;
  }
}

export async function fetchInvestorProfile(
  investorId: string,
): Promise<InvestorProfileNode | null> {
  try {
    const snap = await get(ref(database, INVESTOR_PROFILE(investorId)));
    if (!snap.exists()) return null;
    return snap.val() as InvestorProfileNode;
  } catch (error) {
    console.error("fetchInvestorProfile error:", error);
    return null;
  }
}

// ─── POINT 2: Live founder pitches feed ──────────────────────────────────────

/** Live scan of founders/{uid}/pitches → StartupIdea cards */
export function streamFounderPitchesForInvestorFeed(
  callback: (ideas: StartupIdea[]) => void,
): () => void {
  const targetRef = ref(database, "founders");
  let active = true;

  try {
    onValue(
      targetRef,
      (snapshot) => {
        try {
          if (!active) return;
          const ideas: StartupIdea[] = [];
          if (snapshot.exists()) {
            snapshot.forEach((founderChild) => {
              const founderId = String(founderChild.key || "");
              if (!founderId) return;
              const profileVal = founderChild.child("profile").val() as
                | { fullName?: string }
                | null;
              const founderName = String(profileVal?.fullName ?? "").trim();
              const pitchesSnap = founderChild.child("pitches");
              if (!pitchesSnap.exists()) return;
              pitchesSnap.forEach((pitchChild) => {
                const pitchId = String(pitchChild.key || "");
                if (!pitchId) return;
                const mapped = mapAuthenticFounderPitchToStartupIdea(
                  pitchId,
                  founderId,
                  pitchChild.val() as Record<string, unknown>,
                  founderName,
                );
                if (mapped) ideas.push(mapped);
              });
            });
          }
          ideas.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
          callback(ideas);
        } catch (error) {
          console.error("streamFounderPitchesForInvestorFeed handler error:", error);
          if (active) callback([]);
        }
      },
      (err) => {
        console.error("streamFounderPitchesForInvestorFeed listener error:", err);
        if (active) callback([]);
      },
    );
  } catch (error) {
    console.error("streamFounderPitchesForInvestorFeed setup error:", error);
    callback([]);
  }

  return () => {
    active = false;
    try {
      off(targetRef);
    } catch (error) {
      console.error("streamFounderPitchesForInvestorFeed cleanup error:", error);
    }
  };
}

// ─── POINT 3: Investment stage tracking ──────────────────────────────────────

export async function saveInvestmentStageProgress(
  investorId: string,
  pitchId: string,
  patch: Partial<InvestmentStageRecord> & {
    founderId: string;
    currentStage: 1 | 2 | 3;
  },
): Promise<void> {
  try {
    const inv = requireActiveInvestorUid(investorId);
    const pid = String(pitchId || "").trim();
    if (!pid) throw new Error("pitchId is required.");

    // Atomic sibling write: investors/{authUid}/investments/{pitchId}
    const path = INVESTOR_INVESTMENT(inv, pid);
    const existing = await get(ref(database, path));
    const prev = existing.exists() ? (existing.val() as InvestmentStageRecord) : null;

    const next: InvestmentStageRecord = {
      pitchId: pid,
      founderId: String(patch.founderId || prev?.founderId || "").trim(),
      startupTitle: patch.startupTitle ?? prev?.startupTitle ?? "",
      currentStage: patch.currentStage,
      stage1Completed: patch.stage1Completed ?? prev?.stage1Completed ?? false,
      stage2Completed: patch.stage2Completed ?? prev?.stage2Completed ?? false,
      stage3Completed: patch.stage3Completed ?? prev?.stage3Completed ?? false,
      amountInvested: patch.amountInvested ?? prev?.amountInvested,
      equityAcquired: patch.equityAcquired ?? prev?.equityAcquired,
      roiExpected: patch.roiExpected ?? prev?.roiExpected,
      paymentStatus: patch.paymentStatus ?? prev?.paymentStatus ?? "none",
      createdAt: prev?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };

    await update(ref(database), {
      [path]: next,
    });
  } catch (error) {
    console.error("saveInvestmentStageProgress error:", error);
    throw error;
  }
}

// ─── POINT 3/4: Payment handshake ────────────────────────────────────────────

function receiptFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read receipt file."));
      reader.readAsDataURL(file);
    } catch (error) {
      reject(error);
    }
  });
}

async function uploadPaymentReceipt(file: File): Promise<string> {
  const { uploadToCloudinary } = await import("@/lib/cloudinaryUpload");
  try {
    return await uploadToCloudinary(file, "payment_receipts");
  } catch (err) {
    console.warn("Cloudinary receipt upload failed, falling back to data URL:", err);
    return receiptFileToDataUrl(file);
  }
}

export type SubmitPendingPaymentInput = {
  pitchId: string;
  founderId: string;
  investorId: string;
  investorName?: string;
  startupTitle?: string;
  category?: string;
  amountInvested: number;
  equityAcquired: number;
  roiExpected: number | string;
  receiptFile: File;
  bankName?: string;
  accountTitleName?: string;
  accountNumber?: string;
};

/**
 * L3 Stage 3 Done → dual write:
 *   pitches/{pitchId}/transactions/{investorId}
 *   investors/{uid}/payment_desk/{pitchId}
 * + L2 investments paymentStatus:pending
 * (my_portfolio only on founder approve — L4)
 */
export async function submitPendingPaymentTransaction(
  input: SubmitPendingPaymentInput,
): Promise<PitchTransactionNode> {
  try {
    const pitchId = String(input.pitchId || "").trim();
    const founderId = String(input.founderId || "").trim();
    // Force live Auth UID — never accept a detached / generated parent investor id
    const investorId = requireActiveInvestorUid(input.investorId);
    if (!pitchId || !founderId) {
      throw new Error("pitchId and founderId are required.");
    }
    if (!input.receiptFile) throw new Error("Payment receipt proof is required.");

    const receiptUrl = await uploadPaymentReceipt(input.receiptFile);
    const paymentReceiptUrl = receiptUrl;
    const timestamp = Date.now();
    const transactionId = `txn-${pitchId}-${investorId}-${timestamp}`;

    const bankName = String(input.bankName || "").trim();
    const accountTitleName = String(input.accountTitleName || "").trim();
    const accountNumber = String(input.accountNumber || "").trim();
    const startupTitle = String(input.startupTitle || "").trim();

    // Investor source bank from investors/{uid}/profile/bankDetails
    let investorBankName = "";
    let investorAccountTitle = "";
    let investorAccountNumber = "";
    try {
      const invProfile = await fetchInvestorProfile(investorId);
      const bd = invProfile?.bankDetails;
      investorBankName = String(bd?.bankName || "").trim();
      investorAccountTitle = String(
        bd?.accountTitle || invProfile?.fullName || input.investorName || "",
      ).trim();
      investorAccountNumber = String(bd?.accountNumber || "").trim();
    } catch (profileErr) {
      console.error("submitPendingPaymentTransaction investor profile bank read:", profileErr);
    }

    const transaction: PitchTransactionNode = {
      transactionId,
      investorId,
      investorName: input.investorName || "",
      pitchId,
      founderId,
      startupTitle,
      amountInvested: Number(input.amountInvested) || 0,
      equityAcquired: Number(input.equityAcquired) || 0,
      roiExpected: input.roiExpected,
      receiptUrl,
      paymentReceiptUrl,
      status: "pending",
      timestamp,
      bankName,
      accountTitleName,
      accountNumber,
      investorBankName,
      investorAccountTitle,
      investorAccountNumber,
      category: String(input.category || "").trim(),
    };

    // Atomic multi-path update — sibling pitch keys under ONE auth UID root
    // Correct: investors/{auth.uid}/payment_desk/{pitchId}
    // Correct: investors/{auth.uid}/investments/{pitchId}
    await update(ref(database), {
      [PITCH_TRANSACTION(pitchId, investorId)]: transaction,
      [INVESTOR_PAYMENT_DESK(investorId, pitchId)]: {
        accountNumber: transaction.accountNumber,
        accountTitleName: transaction.accountTitleName,
        amountInvested: transaction.amountInvested,
        bankName: transaction.bankName,
        equityAcquired: transaction.equityAcquired,
        roiExpected: transaction.roiExpected,
        receiptUrl: transaction.receiptUrl,
        startupTitle: transaction.startupTitle,
        timestamp: transaction.timestamp,
        status: "pending",
        transactionId: transaction.transactionId,
        pitchId: transaction.pitchId,
        investorId: transaction.investorId,
        founderId: transaction.founderId,
        investorName: transaction.investorName || "",
        category: transaction.category || "",
        investorBankName: transaction.investorBankName || "",
        investorAccountTitle: transaction.investorAccountTitle || "",
        investorAccountNumber: transaction.investorAccountNumber || "",
      },
    });

    await saveInvestmentStageProgress(investorId, pitchId, {
      founderId,
      currentStage: 3,
      stage1Completed: true,
      stage2Completed: true,
      stage3Completed: true,
      startupTitle,
      amountInvested: transaction.amountInvested,
      equityAcquired: transaction.equityAcquired,
      roiExpected: transaction.roiExpected,
      paymentStatus: "pending",
    });

    return transaction;
  } catch (error) {
    console.error("submitPendingPaymentTransaction error:", error);
    throw error;
  }
}

function mapTransaction(
  investorId: string,
  raw: Record<string, unknown> | null,
  /** RTDB map key under payment_desk/{pitchId} — always authoritative */
  routePitchId = "",
): PitchTransactionNode | null {
  if (!raw || typeof raw !== "object") return null;
  // Nested pitchId fields can be stale/cross-contaminated; route key wins.
  const pitchId = String(routePitchId || raw.pitchId || "").trim();
  if (!pitchId) return null;
  return {
    transactionId: String(raw.transactionId ?? ""),
    investorId: String(raw.investorId ?? investorId),
    investorName: String(raw.investorName ?? ""),
    pitchId,
    founderId: String(raw.founderId ?? ""),
    startupTitle: String(raw.startupTitle ?? raw.businessName ?? "").trim(),
    amountInvested: Number(raw.amountInvested ?? raw.amountPkr ?? 0) || 0,
    equityAcquired: Number(raw.equityAcquired ?? 0) || 0,
    roiExpected: (raw.roiExpected as number | string) ?? "",
    receiptUrl: String(raw.receiptUrl ?? ""),
    status: raw.status === "approved" ? "approved" : "pending",
    timestamp: Number(raw.timestamp ?? 0) || 0,
    bankName: String(raw.bankName ?? ""),
    accountTitleName: String(raw.accountTitleName ?? ""),
    accountNumber: String(raw.accountNumber ?? ""),
    investorBankName: String(raw.investorBankName ?? ""),
    investorAccountTitle: String(raw.investorAccountTitle ?? ""),
    investorAccountNumber: String(raw.investorAccountNumber ?? ""),
    category: String(raw.category ?? ""),
  };
}

/** L3 — Payment Desk tab streams exclusively from investors/{uid}/payment_desk */
export function streamInvestorPendingTransactions(
  investorId: string,
  callback: (items: PitchTransactionNode[]) => void,
): () => void {
  let cleanId = "";
  try {
    cleanId = requireActiveInvestorUid(investorId);
  } catch (error) {
    console.error("streamInvestorPendingTransactions auth error:", error);
    callback([]);
    return () => undefined;
  }

  const deskRef = ref(database, INVESTOR_PAYMENT_DESK_ROOT(cleanId));
  let active = true;

  try {
    onValue(
      deskRef,
      (snap) => {
        try {
          if (!active) return;
          if (!snap.exists()) {
            callback([]);
            return;
          }
          const snapshotVal = (snap.val() || {}) as Record<string, Record<string, unknown>>;
          // Each Object key IS investors/{uid}/payment_desk/{pitchId} — never index-merge
          const list = Object.keys(snapshotVal)
            .map((key) => {
              const node = snapshotVal[key];
              if (!node || typeof node !== "object") return null;
              return mapTransaction(cleanId, { ...node, pitchId: key }, key);
            })
            .filter((row): row is PitchTransactionNode => Boolean(row));
          list.sort((a, b) => b.timestamp - a.timestamp);
          callback(list);
        } catch (error) {
          console.error("streamInvestorPendingTransactions handler error:", error);
          callback([]);
        }
      },
      (err) => {
        console.error("streamInvestorPendingTransactions listener error:", err);
        callback([]);
      },
    );
  } catch (error) {
    console.error("streamInvestorPendingTransactions setup error:", error);
    callback([]);
  }

  return () => {
    active = false;
    try {
      off(deskRef);
    } catch (error) {
      console.error("streamInvestorPendingTransactions cleanup error:", error);
    }
  };
}

export function streamPitchTransaction(
  pitchId: string,
  investorId: string,
  callback: (tx: PitchTransactionNode | null) => void,
): () => void {
  try {
    const targetRef = ref(database, PITCH_TRANSACTION(pitchId, investorId));
    onValue(
      targetRef,
      (snap) => {
        try {
          if (!snap.exists()) {
            callback(null);
            return;
          }
          callback(mapTransaction(investorId, snap.val() as Record<string, unknown>, pitchId));
        } catch (error) {
          console.error("streamPitchTransaction handler error:", error);
          callback(null);
        }
      },
      (err) => {
        console.error("streamPitchTransaction listener error:", err);
        callback(null);
      },
    );
    return () => {
      try {
        off(targetRef);
      } catch (error) {
        console.error("streamPitchTransaction cleanup error:", error);
      }
    };
  } catch (error) {
    console.error("streamPitchTransaction setup error:", error);
    callback(null);
    return () => undefined;
  }
}

/**
 * L4 Founder Mark as Paid:
 * 1) pitches/.../transactions + payment_desk → approved
 * 2) clone → investors/{uid}/my_portfolio/{pitchId}
 * 3) investments paymentStatus → approved
 */
export async function markTransactionAsPaidAndActivatePortfolio(
  pitchId: string,
  investorId: string,
): Promise<void> {
  try {
    if (!pitchId || !investorId) throw new Error("pitchId and investorId are required.");

    const txRef = ref(database, PITCH_TRANSACTION(pitchId, investorId));
    const txSnap = await get(txRef);
    if (!txSnap.exists()) throw new Error("Transaction not found.");

    const tx = mapTransaction(investorId, txSnap.val() as Record<string, unknown>, pitchId);
    if (!tx) throw new Error("Invalid transaction payload.");

    const activatedAt = Date.now();
    const roiLabel =
      typeof tx.roiExpected === "number"
        ? `${tx.roiExpected}%`
        : String(tx.roiExpected || "").trim();

    const dateLabel = new Date(activatedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const portfolio: PortfolioInvestmentNode = {
      id: pitchId,
      pitchId,
      businessName: tx.startupTitle || "Venture Pitch",
      startupTitle: tx.startupTitle || "Venture Pitch",
      category: tx.category || "",
      industry: tx.category || "",
      amount: `PKR ${Number(tx.amountInvested || 0).toLocaleString()}`,
      amountPkr: Number(tx.amountInvested) || 0,
      expectedRoi: roiLabel,
      equityPercent: Number(tx.equityAcquired) || 0,
      terms: `${Number(tx.equityAcquired || 0).toFixed(2)}% Equity · Approved`,
      date: dateLabel,
      timestamp: activatedAt,
      status: "approved",
      receiptUrl: tx.receiptUrl,
      founderId: tx.founderId,
      transactionId: tx.transactionId,
    };

    await update(ref(database), {
      [`${PITCH_TRANSACTION(pitchId, investorId)}/status`]: "approved",
      [`${PITCH_TRANSACTION(pitchId, investorId)}/approvedAt`]: activatedAt,
      [`${INVESTOR_PAYMENT_DESK(investorId, pitchId)}/status`]: "approved",
      [`${INVESTOR_PAYMENT_DESK(investorId, pitchId)}/approvedAt`]: activatedAt,
      [INVESTOR_PORTFOLIO_ITEM(investorId, pitchId)]: portfolio,
      [`${INVESTOR_INVESTMENT(investorId, pitchId)}/paymentStatus`]: "approved",
      [`${INVESTOR_INVESTMENT(investorId, pitchId)}/stage3Completed`]: true,
      [`${INVESTOR_INVESTMENT(investorId, pitchId)}/updatedAt`]: activatedAt,
    });

    // Non-blocking 2-box founder stats refresh from approved ledger
    try {
      const founderId = String(tx.founderId || "").trim();
      if (founderId) {
        const { recomputeAndPersistFounderStats } = await import(
          "@/services/founderFirebaseService"
        );
        void recomputeAndPersistFounderStats(founderId);
      }
    } catch (statsErr) {
      console.warn("Founder stats recompute after Mark as Paid skipped:", statsErr);
    }
  } catch (error) {
    console.error("markTransactionAsPaidAndActivatePortfolio error:", error);
    throw error;
  }
}

export function streamInvestorPortfolio(
  investorId: string,
  callback: (items: PortfolioInvestmentNode[]) => void,
): () => void {
  let cleanId = "";
  try {
    cleanId = requireActiveInvestorUid(investorId);
  } catch (error) {
    console.error("streamInvestorPortfolio auth error:", error);
    callback([]);
    return () => undefined;
  }

  const targetRef = ref(database, INVESTOR_PORTFOLIO_ROOT(cleanId));
  let active = true;

  try {
    onValue(
      targetRef,
      (snap) => {
        try {
          if (!active) return;
          if (!snap.exists()) {
            callback([]);
            return;
          }
          const snapshotVal = (snap.val() || {}) as Record<string, Record<string, unknown>>;
          // Each Object key IS investors/{uid}/my_portfolio/{pitchId} — route key wins
          const list: PortfolioInvestmentNode[] = Object.keys(snapshotVal).map((key) => {
            const row = { ...(snapshotVal[key] || {}), pitchId: key };
            const pitchId = key;
            const businessName = String(
              row.businessName ?? row.startupTitle ?? pitchId,
            ).trim();
            const startupTitle = String(
              row.startupTitle ?? row.businessName ?? businessName,
            ).trim();
            return {
              id: pitchId,
              pitchId,
              businessName,
              startupTitle,
              category: String(row.category ?? ""),
              industry: String(row.industry ?? row.category ?? ""),
              amount: String(row.amount ?? `PKR ${Number(row.amountPkr ?? 0).toLocaleString()}`),
              amountPkr: Number(row.amountPkr ?? 0) || 0,
              expectedRoi: String(row.expectedRoi ?? ""),
              equityPercent: Number(row.equityPercent ?? 0) || 0,
              terms: String(row.terms ?? ""),
              date: String(row.date ?? ""),
              timestamp: Number(row.timestamp ?? 0) || 0,
              status: "approved" as const,
              receiptUrl: row.receiptUrl ? String(row.receiptUrl) : undefined,
              founderId: row.founderId ? String(row.founderId) : undefined,
              transactionId: row.transactionId ? String(row.transactionId) : undefined,
            };
          });
          list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          callback(list);
        } catch (error) {
          console.error("streamInvestorPortfolio handler error:", error);
          callback([]);
        }
      },
      (err) => {
        console.error("streamInvestorPortfolio listener error:", err);
        callback([]);
      },
    );
  } catch (error) {
    console.error("streamInvestorPortfolio setup error:", error);
    callback([]);
  }

  return () => {
    active = false;
    try {
      off(targetRef);
    } catch (error) {
      console.error("streamInvestorPortfolio cleanup error:", error);
    }
  };
}

// ─── POINT 5: Bidirectional Messenger chat (investor branch + founder index) ─

export type ChatRoomMeta = {
  pitchId: string;
  investorId: string;
  founderId: string;
  founderName?: string;
  investorName?: string;
  startupTitle?: string;
  /** Preview: full last message node (senderId, senderName, text, timestamp) */
  lastMessage?: ChatMessageNode | string;
  lastTimestamp?: number;
  updatedAt?: number;
};

function coerceLastMessagePreview(
  raw: unknown,
  fallbackTs = 0,
): ChatMessageNode | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return undefined;
    return {
      messageId: "meta",
      senderId: "",
      text,
      timestamp: fallbackTs,
      stageContext: "General",
    };
  }
  if (typeof raw === "object") {
    const m = raw as Record<string, unknown>;
    return {
      messageId: String(m.messageId || "meta"),
      senderId: String(m.senderId || ""),
      text: String(m.text || ""),
      timestamp: Number(m.timestamp) || fallbackTs,
      stageContext: String(m.stageContext || "General"),
      senderName: m.senderName ? String(m.senderName) : undefined,
    };
  }
  return undefined;
}

/**
 * Atomic multi-path send:
 *   investors/{inv}/chats/{chatId}/messages/{msgId}
 *   investors/{inv}/chats/{chatId} meta
 *   founders/{fnd}/chat_index/{chatId} mirror meta
 */
export async function sendUnifiedChatMessage(
  pitchId: string,
  investorId: string,
  founderId: string,
  senderId: string,
  text: string,
  stageContext: string = "General",
  options: {
    senderName?: string;
    founderName?: string;
    startupTitle?: string;
    investorName?: string;
  } = {},
): Promise<string> {
  try {
    const cleanPitch = String(pitchId || "").trim();
    const cleanInv = String(investorId || "").trim();
    const cleanFounder = String(founderId || "").trim();
    const cleanSender = String(senderId || auth.currentUser?.uid || "").trim();
    const cleanText = String(text || "").trim();
    const senderName = String(options.senderName || "").trim() || "User";

    if (!cleanPitch || !cleanInv || !cleanFounder || !cleanSender || !cleanText) {
      throw new Error("Chat identifiers and text are required.");
    }

    const chatId = getChatRoomId(cleanPitch, cleanInv, cleanFounder);
    const messageId = push(ref(database, INVESTOR_CHAT_MESSAGES(cleanInv, chatId))).key;
    if (!messageId) throw new Error("Failed to allocate message id.");
    const timestamp = Date.now();

    const messagePayload = {
      senderId: cleanSender,
      senderName,
      text: cleanText,
      timestamp,
      messageId,
      stageContext: String(stageContext || "General").trim() || "General",
    };

    const lastMessagePreview = {
      senderId: cleanSender,
      senderName,
      text: cleanText.slice(0, 200),
      timestamp,
    };

    const roomMeta: ChatRoomMeta = {
      pitchId: cleanPitch,
      investorId: cleanInv,
      founderId: cleanFounder,
      founderName: String(options.founderName || "").trim() || undefined,
      investorName: String(options.investorName || "").trim() || undefined,
      startupTitle: String(options.startupTitle || "").trim() || undefined,
      lastMessage: lastMessagePreview as ChatMessageNode,
      lastTimestamp: timestamp,
      updatedAt: timestamp,
    };

    // Strip undefined for RTDB (keep lastMessage object)
    const metaClean = Object.fromEntries(
      Object.entries(roomMeta).filter(([, v]) => v !== undefined && v !== ""),
    );

    const updates: Record<string, unknown> = {
      [`${INVESTOR_CHAT_ROOM(cleanInv, chatId)}/pitchId`]: cleanPitch,
      [`${INVESTOR_CHAT_ROOM(cleanInv, chatId)}/investorId`]: cleanInv,
      [`${INVESTOR_CHAT_ROOM(cleanInv, chatId)}/founderId`]: cleanFounder,
      [`${INVESTOR_CHAT_ROOM(cleanInv, chatId)}/lastMessage`]: lastMessagePreview,
      [`${INVESTOR_CHAT_ROOM(cleanInv, chatId)}/lastTimestamp`]: timestamp,
      [`${INVESTOR_CHAT_ROOM(cleanInv, chatId)}/updatedAt`]: timestamp,
      [`${INVESTOR_CHAT_MESSAGES(cleanInv, chatId)}/${messageId}`]: messagePayload,
      [FOUNDER_CHAT_INDEX(cleanFounder, chatId)]: {
        ...metaClean,
        lastMessage: lastMessagePreview,
        chatId,
      },
    };

    if (metaClean.founderName) {
      updates[`${INVESTOR_CHAT_ROOM(cleanInv, chatId)}/founderName`] = metaClean.founderName;
    }
    if (metaClean.investorName) {
      updates[`${INVESTOR_CHAT_ROOM(cleanInv, chatId)}/investorName`] = metaClean.investorName;
    }
    if (metaClean.startupTitle) {
      updates[`${INVESTOR_CHAT_ROOM(cleanInv, chatId)}/startupTitle`] = metaClean.startupTitle;
    }

    await update(ref(database), updates);
    return messageId;
  } catch (error) {
    console.error("sendUnifiedChatMessage error:", error);
    throw error;
  }
}

export function streamChatMessages(
  pitchId: string,
  investorId: string,
  founderId: string,
  callback: (messages: ChatMessageNode[]) => void,
): () => void {
  try {
    const cleanInv = String(investorId || "").trim();
    const chatId = getChatRoomId(pitchId, investorId, founderId);
    if (!cleanInv || !chatId) {
      callback([]);
      return () => undefined;
    }
    const targetRef = ref(database, INVESTOR_CHAT_MESSAGES(cleanInv, chatId));
    onValue(
      targetRef,
      (snap) => {
        try {
          if (!snap.exists()) {
            callback([]);
            return;
          }
          const raw = snap.val() as Record<string, ChatMessageNode>;
          const list = Object.keys(raw).map((k) => ({
            messageId: String(raw[k]?.messageId || k),
            senderId: String(raw[k]?.senderId || ""),
            text: String(raw[k]?.text || ""),
            timestamp: Number(raw[k]?.timestamp) || 0,
            stageContext: String(raw[k]?.stageContext || "General"),
            senderName: raw[k]?.senderName ? String(raw[k].senderName) : undefined,
          }));
          list.sort((a, b) => a.timestamp - b.timestamp);
          callback(list);
        } catch (error) {
          console.error("streamChatMessages handler error:", error);
          callback([]);
        }
      },
      (err) => {
        console.error("streamChatMessages listener error:", err);
        callback([]);
      },
    );
    return () => {
      try {
        off(targetRef);
      } catch (error) {
        console.error("streamChatMessages cleanup error:", error);
      }
    };
  } catch (error) {
    console.error("streamChatMessages setup error:", error);
    callback([]);
    return () => undefined;
  }
}

function mapChatRoomToThread(
  chatId: string,
  room: Record<string, unknown>,
): InvestorChatThread {
  const messagesRaw =
    room.messages && typeof room.messages === "object"
      ? (room.messages as Record<string, ChatMessageNode>)
      : {};
  const messages = Object.keys(messagesRaw)
    .map((k) => ({
      messageId: String(messagesRaw[k]?.messageId || k),
      senderId: String(messagesRaw[k]?.senderId || ""),
      text: String(messagesRaw[k]?.text || ""),
      timestamp: Number(messagesRaw[k]?.timestamp) || 0,
      stageContext: String(messagesRaw[k]?.stageContext || "General"),
      senderName: messagesRaw[k]?.senderName ? String(messagesRaw[k].senderName) : undefined,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  const lastFromMeta = coerceLastMessagePreview(
    room.lastMessage,
    Number(room.lastTimestamp || room.updatedAt || 0) || 0,
  );

  return {
    channelId: chatId,
    pitchId: String(room.pitchId || ""),
    investorId: String(room.investorId || ""),
    founderId: String(room.founderId || ""),
    founderName: room.founderName ? String(room.founderName) : undefined,
    investorName: room.investorName ? String(room.investorName) : undefined,
    startupTitle: room.startupTitle ? String(room.startupTitle) : undefined,
    messages,
    lastMessage: messages[messages.length - 1] || lastFromMeta,
  };
}

/** Investor Chats tab — live investors/{uid}/chats */
export function streamInvestorChatThreads(
  investorId: string,
  callback: (threads: InvestorChatThread[]) => void,
): () => void {
  const cleanInv = String(investorId || "").trim();
  if (!cleanInv) {
    callback([]);
    return () => undefined;
  }

  const chatsRef = ref(database, INVESTOR_CHATS_ROOT(cleanInv));
  let active = true;

  try {
    onValue(
      chatsRef,
      (snap) => {
        try {
          if (!active) return;
          if (!snap.exists()) {
            callback([]);
            return;
          }
          const root = snap.val() as Record<string, Record<string, unknown>>;
          const threads = Object.keys(root).map((chatId) =>
            mapChatRoomToThread(chatId, root[chatId] || {}),
          );
          threads.sort(
            (a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0),
          );
          callback(threads);
        } catch (error) {
          console.error("streamInvestorChatThreads handler error:", error);
          callback([]);
        }
      },
      (err) => {
        console.error("streamInvestorChatThreads listener error:", err);
        callback([]);
      },
    );
  } catch (error) {
    console.error("streamInvestorChatThreads setup error:", error);
    callback([]);
  }

  return () => {
    active = false;
    try {
      off(chatsRef);
    } catch (error) {
      console.error("streamInvestorChatThreads cleanup error:", error);
    }
  };
}

/** Founder Investor Query — live founders/{uid}/chat_index → room meta */
export function streamFounderChatThreads(
  founderId: string,
  callback: (threads: InvestorChatThread[]) => void,
): () => void {
  const cleanFnd = String(founderId || "").trim();
  if (!cleanFnd) {
    callback([]);
    return () => undefined;
  }

  const indexRef = ref(database, FOUNDER_CHAT_INDEX_ROOT(cleanFnd));
  let active = true;

  try {
    onValue(
      indexRef,
      (snap) => {
        try {
          if (!active) return;
          if (!snap.exists()) {
            callback([]);
            return;
          }
          const root = snap.val() as Record<string, Record<string, unknown>>;
          const threads: InvestorChatThread[] = Object.keys(root).map((chatId) => {
            const room = root[chatId] || {};
            const lastTs = Number(room.lastTimestamp || room.updatedAt || 0) || 0;
            const invName = room.investorName ? String(room.investorName) : undefined;
            return {
              channelId: chatId,
              pitchId: String(room.pitchId || ""),
              investorId: String(room.investorId || ""),
              founderId: String(room.founderId || cleanFnd),
              founderName: room.founderName ? String(room.founderName) : undefined,
              investorName: invName,
              startupTitle: room.startupTitle ? String(room.startupTitle) : undefined,
              messages: [],
              lastMessage: coerceLastMessagePreview(room.lastMessage, lastTs),
            };
          });
          threads.sort(
            (a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0),
          );
          callback(threads);
        } catch (error) {
          console.error("streamFounderChatThreads handler error:", error);
          callback([]);
        }
      },
      (err) => {
        console.error("streamFounderChatThreads listener error:", err);
        callback([]);
      },
    );
  } catch (error) {
    console.error("streamFounderChatThreads setup error:", error);
    callback([]);
  }

  return () => {
    active = false;
    try {
      off(indexRef);
    } catch (error) {
      console.error("streamFounderChatThreads cleanup error:", error);
    }
  };
}
