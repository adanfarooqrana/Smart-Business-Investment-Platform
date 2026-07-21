/**
 * Investor Firebase Service — exclusive capital settlement + portfolio API.
 * Paths:
 *   founders/{founderId}/bankingDetails
 *   pitches/{pitchId}/transactions/{investorId}
 *   investors/{investorId}/my_portfolio/{pitchId}
 */
import { database } from "../firebase";
import {
  ref,
  set,
  get,
  update,
  onValue,
  off,
  push,
} from "firebase/database";

// ─── Path helpers ────────────────────────────────────────────────────────────

export const FOUNDER_BANKING_DETAILS = (founderId: string) =>
  `founders/${founderId}/bankingDetails`;

export const PITCH_TRANSACTIONS = (pitchId: string) =>
  `pitches/${pitchId}/transactions`;

export const PITCH_TRANSACTION = (pitchId: string, investorId: string) =>
  `pitches/${pitchId}/transactions/${investorId}`;

export const INVESTOR_PORTFOLIO_ROOT = (investorUid: string) =>
  `investors/${investorUid}/my_portfolio`;

export const INVESTOR_PORTFOLIO_ITEM = (investorUid: string, pitchId: string) =>
  `investors/${investorUid}/my_portfolio/${pitchId}`;

// ─── Types ───────────────────────────────────────────────────────────────────

export type TransactionStatus = "pending" | "approved";

export interface FounderBankingDetails {
  bankName: string;
  accountTitleName: string;
  accountNumber: string;
}

export interface PitchTransactionNode {
  transactionId: string;
  investorId: string;
  investorName?: string;
  pitchId: string;
  founderId: string;
  startupTitle?: string;
  amountInvested: number;
  equityAcquired: number;
  roiExpected: number | string;
  receiptUrl: string;
  paymentReceiptUrl?: string;
  status: TransactionStatus;
  timestamp: number;
  /** Destination / transfer account snapshot (legacy keys) */
  bankName?: string;
  accountTitleName?: string;
  accountNumber?: string;
  /** Canonical investor-ledger banking fields */
  investorBankName?: string;
  investorAccountTitle?: string;
  investorAccountNumber?: string;
}

export interface PortfolioInvestmentNode {
  id: string;
  pitchId: string;
  businessName: string;
  startupTitle: string;
  category: string;
  industry: string;
  amount: string;
  amountPkr: number;
  expectedRoi: string;
  equityPercent: number;
  terms: string;
  date: string;
  timestamp: number;
  status?: TransactionStatus;
  receiptUrl?: string;
  founderId?: string;
  transactionId?: string;
}

// ─── Banking ─────────────────────────────────────────────────────────────────

/** Normalize founder banking from profile.bankDetails or bankingDetails mirror. */
function normalizeFounderBanking(raw: Record<string, unknown> | null | undefined): FounderBankingDetails | null {
  if (!raw || typeof raw !== "object") return null;
  const bankName = String(raw.bankName ?? "").trim();
  const accountTitleName = String(
    raw.accountTitleName ?? raw.accountTitle ?? "",
  ).trim();
  const accountNumber = String(raw.accountNumber ?? raw.iban ?? "").trim();
  if (!bankName && !accountTitleName && !accountNumber) return null;
  return { bankName, accountTitleName, accountNumber };
}

/** Read founders/{founderId}/profile/bankDetails first, then bankingDetails mirror. */
export async function fetchFounderBankingDetails(
  founderId: string,
): Promise<FounderBankingDetails | null> {
  try {
    if (!founderId) return null;

    const profileSnap = await get(ref(database, `founders/${founderId}/profile`));
    if (profileSnap.exists()) {
      const profile = profileSnap.val() as { bankDetails?: Record<string, unknown> };
      const fromProfile = normalizeFounderBanking(profile?.bankDetails ?? null);
      if (fromProfile) return fromProfile;
    }

    const bankingSnap = await get(ref(database, FOUNDER_BANKING_DETAILS(founderId)));
    if (bankingSnap.exists()) {
      return normalizeFounderBanking(bankingSnap.val() as Record<string, unknown>);
    }

    return null;
  } catch (error) {
    console.error("fetchFounderBankingDetails error:", error);
    return null;
  }
}

/**
 * Live founder payout instructions for Stage 3.
 * Primary: founders/{uid}/profile/bankDetails — Mirror: bankingDetails
 */
export function streamFounderBankingDetails(
  founderId: string,
  callback: (details: FounderBankingDetails | null) => void,
): () => void {
  if (!founderId) {
    callback(null);
    return () => undefined;
  }

  const profileRef = ref(database, `founders/${founderId}/profile`);
  const bankingRef = ref(database, FOUNDER_BANKING_DETAILS(founderId));
  let active = true;
  let fromProfile: FounderBankingDetails | null = null;
  let fromMirror: FounderBankingDetails | null = null;

  const emit = () => {
    if (!active) return;
    callback(fromProfile ?? fromMirror);
  };

  try {
    onValue(
      profileRef,
      (snap) => {
        try {
          if (!active) return;
          if (!snap.exists()) {
            fromProfile = null;
            emit();
            return;
          }
          const profile = snap.val() as { bankDetails?: Record<string, unknown> };
          fromProfile = normalizeFounderBanking(profile?.bankDetails ?? null);
          emit();
        } catch (error) {
          console.error("streamFounderBankingDetails profile handler error:", error);
          fromProfile = null;
          emit();
        }
      },
      (err) => {
        console.error("streamFounderBankingDetails profile listener error:", err);
        fromProfile = null;
        emit();
      },
    );

    onValue(
      bankingRef,
      (snap) => {
        try {
          if (!active) return;
          fromMirror = snap.exists()
            ? normalizeFounderBanking(snap.val() as Record<string, unknown>)
            : null;
          emit();
        } catch (error) {
          console.error("streamFounderBankingDetails mirror handler error:", error);
          fromMirror = null;
          emit();
        }
      },
      (err) => {
        console.error("streamFounderBankingDetails mirror listener error:", err);
        fromMirror = null;
        emit();
      },
    );
  } catch (error) {
    console.error("streamFounderBankingDetails setup error:", error);
    callback(null);
  }

  return () => {
    active = false;
    try {
      off(profileRef);
      off(bankingRef);
    } catch (error) {
      console.error("streamFounderBankingDetails cleanup error:", error);
    }
  };
}

/** Upsert founders/{uid}/bankingDetails (also called from founder profile seed). */
export async function upsertFounderBankingDetails(
  founderId: string,
  details: FounderBankingDetails,
): Promise<void> {
  try {
    await set(ref(database, FOUNDER_BANKING_DETAILS(founderId)), {
      bankName: details.bankName,
      accountTitleName: details.accountTitleName,
      accountNumber: details.accountNumber,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("upsertFounderBankingDetails error:", error);
    throw error;
  }
}

// ─── Receipt upload + submit deployed capital ────────────────────────────────

async function receiptFileToDataUrl(file: File): Promise<string> {
  const maxBytes = 1.5 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("Receipt image is too large (max ~1.5MB). Please compress and retry.");
  }
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "").trim();
        if (!result.startsWith("data:")) {
          reject(new Error("Could not encode receipt screenshot."));
          return;
        }
        resolve(result);
      };
      reader.onerror = () => reject(new Error("Failed to read receipt file."));
      reader.readAsDataURL(file);
    } catch (error) {
      reject(error);
    }
  });
}

async function uploadPaymentReceiptCloudinary(file: File): Promise<string> {
  const { uploadToCloudinary } = await import("@/lib/cloudinaryUpload");
  try {
    return await uploadToCloudinary(file, "payment_receipts");
  } catch (err) {
    console.warn("Cloudinary payment receipt failed, using data URL fallback:", err);
    return receiptFileToDataUrl(file);
  }
}

export type SubmitDeployedCapitalInput = {
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
 * Encode receipt as data-URL → write pitches/{pitchId}/transactions/{investorId}
 * + mirror pending row into investors/{investorId}/my_portfolio/{pitchId}
 * (No Firebase Storage — avoids infinite upload hangs.)
 */
export async function submitDeployedCapitalPayment(
  input: SubmitDeployedCapitalInput,
): Promise<PitchTransactionNode> {
  try {
    const pitchId = String(input.pitchId || "").trim();
    const founderId = String(input.founderId || "").trim();
    const investorId = String(input.investorId || "").trim();
    const {
      investorName,
      startupTitle,
      category,
      amountInvested,
      equityAcquired,
      roiExpected,
      receiptFile,
      bankName,
      accountTitleName,
      accountNumber,
    } = input;

    if (!pitchId || !founderId || !investorId) {
      throw new Error(
        `Missing ledger keys — pitchId="${pitchId}", founderId="${founderId}", investorId="${investorId}".`,
      );
    }
    if (!receiptFile) {
      throw new Error("Payment receipt proof screenshot is required.");
    }

    let banking = {
      bankName: String(bankName || "").trim(),
      accountTitleName: String(accountTitleName || "").trim(),
      accountNumber: String(accountNumber || "").trim(),
    };
    if (!banking.bankName && !banking.accountNumber) {
      const fetched = await fetchFounderBankingDetails(founderId);
      if (fetched) banking = fetched;
    }

    // Investor source bank from investors/{uid}/profile/bankDetails
    let investorBankName = "";
    let investorAccountTitle = "";
    let investorAccountNumber = "";
    try {
      const invSnap = await get(ref(database, `investors/${investorId}/profile`));
      if (invSnap.exists()) {
        const inv = invSnap.val() as {
          fullName?: string;
          bankDetails?: {
            bankName?: string;
            accountTitle?: string;
            accountNumber?: string;
          };
        };
        investorBankName = String(inv?.bankDetails?.bankName || "").trim();
        investorAccountTitle = String(
          inv?.bankDetails?.accountTitle || inv?.fullName || investorName || "",
        ).trim();
        investorAccountNumber = String(inv?.bankDetails?.accountNumber || "").trim();
      }
    } catch (invBankErr) {
      console.error("submitDeployedCapitalPayment investor bank read:", invBankErr);
    }

    const receiptUrl = await uploadPaymentReceiptCloudinary(receiptFile);
    const transactionId = `txn-${pitchId}-${investorId}-${Date.now()}`;
    const timestamp = Date.now();

    const transaction: PitchTransactionNode = {
      transactionId,
      investorId,
      investorName: investorName || "",
      pitchId,
      founderId,
      startupTitle: startupTitle || "",
      amountInvested: Number(amountInvested) || 0,
      equityAcquired: Number(equityAcquired) || 0,
      roiExpected,
      receiptUrl,
      paymentReceiptUrl: receiptUrl,
      status: "pending",
      timestamp,
      bankName: banking.bankName,
      accountTitleName: banking.accountTitleName,
      accountNumber: banking.accountNumber,
      investorBankName,
      investorAccountTitle,
      investorAccountNumber,
    };

    await set(ref(database, PITCH_TRANSACTION(pitchId, investorId)), transaction);

    // Pending portfolio rows removed — portfolio activates only on founder "Mark as Paid"
    // Stage tracking lives under investors/{investorId}/investments/{pitchId}
    try {
      const { saveInvestmentStageProgress } = await import("./investorCoreService");
      await saveInvestmentStageProgress(investorId, pitchId, {
        founderId,
        currentStage: 3,
        stage1Completed: true,
        stage2Completed: true,
        stage3Completed: true,
        startupTitle: startupTitle || "",
        amountInvested: Number(amountInvested) || 0,
        equityAcquired: Number(equityAcquired) || 0,
        roiExpected,
        paymentStatus: "pending",
      });
    } catch (stageErr) {
      console.warn("Investment stage mirror skipped:", stageErr);
    }

    return transaction;
  } catch (error) {
    console.error("submitDeployedCapitalPayment error:", error);
    throw error;
  }
}

// ─── Streams: transactions ───────────────────────────────────────────────────

function mapTransaction(
  investorId: string,
  raw: Record<string, unknown> | null,
): PitchTransactionNode | null {
  if (!raw || typeof raw !== "object") return null;
  return {
    transactionId: String(raw.transactionId ?? ""),
    investorId: String(raw.investorId ?? investorId),
    investorName: String(raw.investorName ?? ""),
    pitchId: String(raw.pitchId ?? ""),
    founderId: String(raw.founderId ?? ""),
    startupTitle: String(raw.startupTitle ?? ""),
    amountInvested: Number(raw.amountInvested ?? 0) || 0,
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
  };
}

/** Live fan-in of all pitches/{pitchId}/transactions for one investor. */
export function streamInvestorTransactions(
  investorId: string,
  callback: (items: PitchTransactionNode[]) => void,
): () => void {
  const cleanId = String(investorId || "").trim();
  if (!cleanId) {
    callback([]);
    return () => undefined;
  }

  const pitchesRef = ref(database, "pitches");
  let active = true;

  try {
    onValue(
      pitchesRef,
      (snap) => {
        try {
          if (!active) return;
          if (!snap.exists()) {
            callback([]);
            return;
          }
          const root = snap.val() as Record<
            string,
            { transactions?: Record<string, Record<string, unknown>> }
          >;
          const list: PitchTransactionNode[] = [];
          for (const pitchId of Object.keys(root || {})) {
            const txs = root[pitchId]?.transactions;
            if (!txs || typeof txs !== "object") continue;
            for (const invKey of Object.keys(txs)) {
              const mapped = mapTransaction(invKey, txs[invKey]);
              if (!mapped) continue;
              if (mapped.investorId !== cleanId && invKey !== cleanId) continue;
              if (!mapped.pitchId) mapped.pitchId = pitchId;
              list.push(mapped);
            }
          }
          list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          callback(list);
        } catch (error) {
          console.error("streamInvestorTransactions handler error:", error);
          callback([]);
        }
      },
      (err) => {
        console.error("streamInvestorTransactions listener error:", err);
        callback([]);
      },
    );
  } catch (error) {
    console.error("streamInvestorTransactions setup error:", error);
    callback([]);
  }

  return () => {
    active = false;
    try {
      off(pitchesRef);
    } catch (error) {
      console.error("streamInvestorTransactions cleanup error:", error);
    }
  };
}

export function streamPitchTransactions(
  pitchId: string,
  callback: (items: PitchTransactionNode[]) => void,
): () => void {
  if (!pitchId) {
    callback([]);
    return () => undefined;
  }

  const targetRef = ref(database, PITCH_TRANSACTIONS(pitchId));
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
          const raw = snap.val() as Record<string, Record<string, unknown>>;
          const list = Object.keys(raw)
            .map((k) => mapTransaction(k, raw[k]))
            .filter((t): t is PitchTransactionNode => !!t);
          list.sort((a, b) => b.timestamp - a.timestamp);
          callback(list);
        } catch (error) {
          console.error("streamPitchTransactions handler error:", error);
          callback([]);
        }
      },
      (err) => {
        console.error("streamPitchTransactions listener error:", err);
        callback([]);
      },
    );
  } catch (error) {
    console.error("streamPitchTransactions setup error:", error);
    callback([]);
  }

  return () => {
    active = false;
    try {
      off(targetRef);
    } catch (error) {
      console.error("streamPitchTransactions cleanup error:", error);
    }
  };
}

/** Live fan-in across a founder's pitch IDs. */
export function streamFounderInboundTransactions(
  pitchIds: string[],
  callback: (items: PitchTransactionNode[]) => void,
): () => void {
  const ids = [...new Set(pitchIds.filter(Boolean))];
  if (ids.length === 0) {
    callback([]);
    return () => undefined;
  }

  const byPitch = new Map<string, PitchTransactionNode[]>();
  const unsubs: Array<() => void> = [];
  let active = true;

  const emit = () => {
    if (!active) return;
    const merged = Array.from(byPitch.values()).flat();
    merged.sort((a, b) => b.timestamp - a.timestamp);
    callback(merged);
  };

  for (const pitchId of ids) {
    const unsub = streamPitchTransactions(pitchId, (items) => {
      byPitch.set(pitchId, items);
      emit();
    });
    unsubs.push(unsub);
  }

  return () => {
    active = false;
    for (const u of unsubs) {
      try {
        u();
      } catch (error) {
        console.error("streamFounderInboundTransactions cleanup error:", error);
      }
    }
    byPitch.clear();
  };
}

export function streamInvestorPitchTransaction(
  pitchId: string,
  investorId: string,
  callback: (tx: PitchTransactionNode | null) => void,
): () => void {
  if (!pitchId || !investorId) {
    callback(null);
    return () => undefined;
  }

  const targetRef = ref(database, PITCH_TRANSACTION(pitchId, investorId));
  let active = true;

  try {
    onValue(
      targetRef,
      (snap) => {
        try {
          if (!active) return;
          callback(snap.exists() ? mapTransaction(investorId, snap.val()) : null);
        } catch (error) {
          console.error("streamInvestorPitchTransaction handler error:", error);
          callback(null);
        }
      },
      (err) => {
        console.error("streamInvestorPitchTransaction listener error:", err);
        callback(null);
      },
    );
  } catch (error) {
    console.error("streamInvestorPitchTransaction setup error:", error);
    callback(null);
  }

  return () => {
    active = false;
    try {
      off(targetRef);
    } catch (error) {
      console.error("streamInvestorPitchTransaction cleanup error:", error);
    }
  };
}

// ─── Mark as Paid (atomic settlement) ────────────────────────────────────────

/**
 * 1) pitches/{pitchId}/transactions/{investorId}/status → approved
 * 2) investors/{investorId}/my_portfolio/{pitchId} ← confirmed venture snapshot
 * Delegates to isolated investorCoreService.
 */
export async function markTransactionAsPaid(
  pitchId: string,
  investorId: string,
): Promise<void> {
  const { markTransactionAsPaidAndActivatePortfolio } = await import("./investorCoreService");
  return markTransactionAsPaidAndActivatePortfolio(pitchId, investorId);
}

/** System notification: "Payment Received — Venture Portfolio Activated" */
export async function dispatchPaymentReceivedNotification(
  investorId: string,
  payload: { pitchId: string; startupTitle: string; amountPkr: number; activatedAt: number },
): Promise<void> {
  try {
    const notifId = `pay-received-${payload.pitchId}-${Date.now()}`;
    await set(ref(database, `notifications/${investorId}/${notifId}`), {
      id: notifId,
      type: "payment_received",
      title: "Payment Received — Venture Portfolio Activated",
      body: `Your investment in ${payload.startupTitle} (PKR ${Number(payload.amountPkr || 0).toLocaleString()}) is verified. Live portfolio tracking started ${new Date(payload.activatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`,
      pitchId: payload.pitchId,
      amountPkr: payload.amountPkr,
      status: "unread",
      emailDispatchState: "queued",
      emailSubject: "Payment Received — Venture Portfolio Activated",
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("dispatchPaymentReceivedNotification error:", error);
    throw error;
  }
}

// ─── Portfolio ───────────────────────────────────────────────────────────────

export const saveInvestorPortfolioItem = async (
  investorUid: string,
  item: Omit<PortfolioInvestmentNode, "id" | "timestamp"> & { id?: string },
) => {
  try {
    const targetId = item.pitchId || item.id || `inv-${Date.now()}`;
    const payload: PortfolioInvestmentNode = {
      id: targetId,
      pitchId: targetId,
      businessName: item.businessName || item.startupTitle || "Venture Pitch",
      startupTitle: item.startupTitle || item.businessName || "Venture Pitch",
      category: item.category || item.industry || "",
      industry: item.industry || item.category || "",
      amount: item.amount || `PKR ${Number(item.amountPkr || 0).toLocaleString()}`,
      amountPkr: item.amountPkr || 0,
      expectedRoi: item.expectedRoi || "",
      equityPercent: item.equityPercent || 0,
      terms: item.terms || `${item.equityPercent || 0}% Equity`,
      date:
        item.date ||
        new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      timestamp: Date.now(),
      status: item.status || "approved",
      receiptUrl: item.receiptUrl,
      founderId: item.founderId,
      transactionId: item.transactionId,
    };
    await set(ref(database, INVESTOR_PORTFOLIO_ITEM(investorUid, targetId)), payload);
    return targetId;
  } catch (err) {
    console.error("saveInvestorPortfolioItem error:", err);
    throw err;
  }
};

export const streamInvestorPortfolio = (
  investorUid: string,
  callback: (items: PortfolioInvestmentNode[]) => void,
) => {
  if (!investorUid) {
    callback([]);
    return () => undefined;
  }

  const targetRef = ref(database, INVESTOR_PORTFOLIO_ROOT(investorUid));
  let active = true;

  const handler = (snap: { exists: () => boolean; val: () => unknown }) => {
    try {
      if (!active) return;
      if (!snap.exists()) {
        callback([]);
        return;
      }
      const raw = snap.val() as Record<string, PortfolioInvestmentNode>;
      const list = Object.keys(raw).map((k) => ({ ...raw[k], id: k }));
      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      callback(list);
    } catch (error) {
      console.error("streamInvestorPortfolio handler error:", error);
      callback([]);
    }
  };

  try {
    onValue(targetRef, handler, (err) => {
      console.error("streamInvestorPortfolio listener error:", err);
      callback([]);
    });
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
};

// ─── Unified chat: chats/{pitchId}_{investorId}_{founderId}/messages ─────────

export interface BidirectionalChatMessage {
  messageId: string;
  senderId: string;
  text: string;
  timestamp: number;
  stageContext: string;
  /** Display-only; not required for room identity */
  senderName?: string;
}

export type ChatRoomMeta = {
  pitchId: string;
  investorId: string;
  founderId: string;
  founderName?: string;
  startupTitle?: string;
  updatedAt?: number;
  messages?: Record<string, BidirectionalChatMessage>;
};

export type SendChatMessageOptions = {
  senderName?: string;
  founderName?: string;
  startupTitle?: string;
};

const sanitizeChatSegment = (value: string, fallback: string) =>
  String(value || fallback).replace(/[^a-zA-Z0-9-]/g, "") || fallback;

/** Deterministic room key: pitchId_investorId_founderId */
export const getChatRoomId = (pitchId: string, investorId: string, founderId: string) => {
  const cleanPitch = sanitizeChatSegment(pitchId, "pitch-default");
  const cleanInv = sanitizeChatSegment(investorId, "investor");
  const cleanFounder = sanitizeChatSegment(founderId, "founder");
  return `${cleanPitch}_${cleanInv}_${cleanFounder}`;
};

export const getChatChannelPath = (pitchId: string, investorId: string, founderId: string) =>
  `chats/${getChatRoomId(pitchId, investorId, founderId)}/messages`;

/**
 * Push one message into chats/{roomId}/messages and upsert room meta so both
 * feed-modal and journey-stage entry points share the same live thread.
 */
export const sendBidirectionalChatMessage = async (
  pitchId: string,
  investorId: string,
  founderId: string,
  senderId: string,
  text: string,
  stageContext: string,
  options: SendChatMessageOptions = {},
) => {
  try {
    const cleanPitch = String(pitchId || "").trim();
    const cleanInv = String(investorId || "").trim();
    const cleanFounder = String(founderId || "").trim();
    const cleanSender = String(senderId || "").trim();
    const cleanText = String(text || "").trim();
    const cleanStage = String(stageContext || "General").trim() || "General";

    if (!cleanPitch || !cleanInv || !cleanFounder || !cleanSender || !cleanText) {
      throw new Error("pitchId, investorId, founderId, senderId, and text are required.");
    }

    const roomId = getChatRoomId(cleanPitch, cleanInv, cleanFounder);
    const roomRef = ref(database, `chats/${roomId}`);
    const messagesRef = ref(database, `chats/${roomId}/messages`);
    const newMsgRef = push(messagesRef);
    const messageId = newMsgRef.key!;
    const timestamp = Date.now();

    const payload: BidirectionalChatMessage = {
      messageId,
      senderId: cleanSender,
      text: cleanText,
      timestamp,
      stageContext: cleanStage,
      ...(options.senderName ? { senderName: String(options.senderName).trim() } : {}),
    };

    const metaPatch: ChatRoomMeta = {
      pitchId: cleanPitch,
      investorId: cleanInv,
      founderId: cleanFounder,
      updatedAt: timestamp,
      ...(options.founderName
        ? { founderName: String(options.founderName).trim() }
        : {}),
      ...(options.startupTitle
        ? { startupTitle: String(options.startupTitle).trim() }
        : {}),
    };

    await update(roomRef, metaPatch);
    await set(newMsgRef, payload);
    return messageId;
  } catch (err) {
    console.error("sendBidirectionalChatMessage error:", err);
    throw err;
  }
};

export const streamBidirectionalChat = (
  pitchId: string,
  investorId: string,
  founderId: string,
  callback: (messages: BidirectionalChatMessage[]) => void,
) => {
  try {
    const channelPath = getChatChannelPath(pitchId, investorId, founderId);
    const targetRef = ref(database, channelPath);

    onValue(
      targetRef,
      (snap) => {
        try {
          if (!snap.exists()) {
            callback([]);
            return;
          }
          const raw = snap.val() as Record<string, BidirectionalChatMessage>;
          const list = Object.keys(raw).map((k) => {
            const row = raw[k] || ({} as BidirectionalChatMessage);
            return {
              messageId: String(row.messageId || k),
              senderId: String(row.senderId || ""),
              text: String(row.text || ""),
              timestamp: Number(row.timestamp) || 0,
              stageContext: String(row.stageContext || "General"),
              senderName: row.senderName ? String(row.senderName) : undefined,
            };
          });
          list.sort((a, b) => a.timestamp - b.timestamp);
          callback(list);
        } catch (error) {
          console.error("streamBidirectionalChat handler error:", error);
          callback([]);
        }
      },
      (err) => {
        console.error("streamBidirectionalChat error:", err);
        callback([]);
      },
    );

    return () => {
      try {
        off(targetRef);
      } catch (error) {
        console.error("streamBidirectionalChat cleanup error:", error);
      }
    };
  } catch (error) {
    console.error("streamBidirectionalChat setup error:", error);
    callback([]);
    return () => undefined;
  }
};

export type InvestorChatThread = {
  channelId: string;
  pitchId: string;
  investorId: string;
  founderId: string;
  founderName?: string;
  startupTitle?: string;
  messages: BidirectionalChatMessage[];
  lastMessage?: BidirectionalChatMessage;
};

/** Live scan of chats/* for rooms where investorId matches the current user. */
export function streamInvestorChatThreads(
  investorId: string,
  callback: (threads: InvestorChatThread[]) => void,
): () => void {
  const rawInv = String(investorId || "").trim();
  const cleanInv = sanitizeChatSegment(rawInv, "");
  if (!rawInv || !cleanInv) {
    callback([]);
    return () => undefined;
  }

  const chatsRef = ref(database, "chats");
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
          const root = snap.val() as Record<string, ChatRoomMeta>;
          const threads: InvestorChatThread[] = [];

          for (const channelId of Object.keys(root)) {
            const room = root[channelId] || ({} as ChatRoomMeta);

            // Prefer stored meta; fall back to room key pitch_investor_founder
            const parts = channelId.split("_");
            const parsedFounderId = parts.length >= 3 ? parts[parts.length - 1] : "";
            const parsedInvId = parts.length >= 3 ? parts[parts.length - 2] : "";
            const parsedPitchId =
              parts.length >= 3 ? parts.slice(0, parts.length - 2).join("_") : channelId;

            const roomInvestorId = String(room.investorId || parsedInvId || "").trim();
            const roomInvestorClean = sanitizeChatSegment(roomInvestorId, "");
            if (
              roomInvestorId !== rawInv &&
              roomInvestorClean !== cleanInv &&
              parsedInvId !== cleanInv &&
              parsedInvId !== rawInv
            ) {
              continue;
            }

            const messagesRaw = room.messages || {};
            const messages = Object.keys(messagesRaw)
              .map((k) => {
                const row = messagesRaw[k] || ({} as BidirectionalChatMessage);
                return {
                  messageId: String(row.messageId || k),
                  senderId: String(row.senderId || ""),
                  text: String(row.text || ""),
                  timestamp: Number(row.timestamp) || 0,
                  stageContext: String(row.stageContext || "General"),
                  senderName: row.senderName ? String(row.senderName) : undefined,
                };
              })
              .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

            threads.push({
              channelId,
              pitchId: String(room.pitchId || parsedPitchId || ""),
              investorId: roomInvestorId || cleanInv,
              founderId: String(room.founderId || parsedFounderId || ""),
              founderName: room.founderName ? String(room.founderName) : undefined,
              startupTitle: room.startupTitle ? String(room.startupTitle) : undefined,
              messages,
              lastMessage: messages[messages.length - 1],
            });
          }

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
