import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { firestore as db } from "../firebase";
import type { StartupIdea } from "@/data/startupIdeas";

export type PaymentMethod = "jazzcash" | "easypaisa" | "card";

export type FounderPaymentRecord = {
  id: string;
  founderId: string;
  ideaId: string;
  investorName: string;
  startupTitle: string;
  amountPkr: number;
  equityPercent: number;
  profitSharingPercent: string;
  agreedProfitPkr: number;
  paymentMethod: PaymentMethod;
  receiptScreenshotUrl?: string;
  receiptFileName?: string;
  profitDistributionDueAt: number;
  status: "received" | "profit_due" | "profit_paid";
  investmentStatus: "in_progress" | "done";
  createdAt: number;
};

export type RecoveryPaymentRecord = {
  id: string;
  founderId: string;
  paymentId: string;
  ideaId: string;
  investorName: string;
  startupTitle: string;
  amountPkr: number;
  paymentMethod: PaymentMethod;
  distributedAt: number;
  status: "completed";
  type: "profit_distribution";
};

export type ProfitAlert = {
  paymentId: string;
  investorName: string;
  startupTitle: string;
  amountPkr: number;
  dueAt: number;
  overdue: boolean;
};

export type VentureShowcaseCard = {
  id: string;
  ideaId: string;
  startupTitle: string;
  headline: string;
  subline: string;
  imageUrl: string;
  creativeType: "wholesaler_products" | "business_setup";
  investmentStatus: "done";
  mutualGrowthTag: string;
};

const PROFIT_CYCLE_MS = 90 * 24 * 60 * 60 * 1000;

/** Coerce raw Firestore / local payment rows into safe renderable records. */
export function normalizeFounderPayment(
  raw: Record<string, unknown> & { id: string },
): FounderPaymentRecord {
  const createdAt =
    typeof raw.createdAt === "number"
      ? raw.createdAt
      : typeof (raw.createdAt as { toMillis?: () => number })?.toMillis === "function"
        ? (raw.createdAt as { toMillis: () => number }).toMillis()
        : Date.now();

  const amountPkr = Number(raw.amountPkr ?? 0);
  const profitSharingPercent = String(raw.profitSharingPercent ?? "15% of net operating profit");
  const methodRaw = String(raw.paymentMethod ?? "card").toLowerCase();
  const paymentMethod: PaymentMethod = methodRaw.includes("jazz")
    ? "jazzcash"
    : methodRaw.includes("easy")
      ? "easypaisa"
      : "card";

  return {
    id: raw.id,
    founderId: String(raw.founderId ?? ""),
    ideaId: String(raw.ideaId ?? "local"),
    investorName: String(raw.investorName ?? "Investor"),
    startupTitle: String(raw.startupTitle ?? "Startup"),
    amountPkr: Number.isFinite(amountPkr) ? amountPkr : 0,
    equityPercent: Number(raw.equityPercent ?? 0) || 0,
    profitSharingPercent,
    agreedProfitPkr: Number(raw.agreedProfitPkr ?? computeAgreedProfit(amountPkr, profitSharingPercent)) || 0,
    paymentMethod,
    receiptScreenshotUrl: raw.receiptScreenshotUrl as string | undefined,
    receiptFileName: raw.receiptFileName as string | undefined,
    profitDistributionDueAt:
      Number(raw.profitDistributionDueAt ?? createdAt + PROFIT_CYCLE_MS) || createdAt + PROFIT_CYCLE_MS,
    status: (raw.status as FounderPaymentRecord["status"]) ?? "received",
    investmentStatus: (raw.investmentStatus as FounderPaymentRecord["investmentStatus"]) ?? "in_progress",
    createdAt,
  };
}

function parseProfitSharePercent(text: string): number {
  const m = text.match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? parseFloat(m[1]) : 15;
}

function computeAgreedProfit(amountPkr: number, profitSharingPercent: string): number {
  const pct = parseProfitSharePercent(profitSharingPercent);
  return Math.round(amountPkr * (pct / 100) * 0.25);
}

export function generateReceiptScreenshotDataUrl(opts: {
  paymentMethod: PaymentMethod;
  investorName: string;
  amountPkr: number;
  startupTitle: string;
  receiptFileName?: string;
}): string {
  const wallet =
    opts.paymentMethod === "jazzcash"
      ? "JazzCash"
      : opts.paymentMethod === "easypaisa"
        ? "EasyPaisa"
        : "Card";
  const color =
    opts.paymentMethod === "jazzcash" ? "#DC2626" : opts.paymentMethod === "easypaisa" ? "#059669" : "#2563EB";
  const ts = new Date().toLocaleString("en-PK");
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="360" height="520" viewBox="0 0 360 520">
  <rect width="360" height="520" fill="#f8fafc"/>
  <rect x="20" y="20" width="320" height="80" rx="12" fill="${color}"/>
  <text x="180" y="55" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="18" font-weight="bold">${wallet} Payment Receipt</text>
  <text x="180" y="78" text-anchor="middle" fill="#fecaca" font-family="Arial,sans-serif" font-size="11">InvestBiz Escrow · Verified</text>
  <text x="40" y="130" fill="#64748b" font-family="Arial,sans-serif" font-size="11">TRANSACTION ID</text>
  <text x="40" y="150" fill="#0f172a" font-family="monospace" font-size="13">TXN-${Date.now().toString(36).toUpperCase()}</text>
  <text x="40" y="185" fill="#64748b" font-family="Arial,sans-serif" font-size="11">FROM (INVESTOR)</text>
  <text x="40" y="205" fill="#0f172a" font-family="Arial,sans-serif" font-size="14" font-weight="bold">${opts.investorName}</text>
  <text x="40" y="240" fill="#64748b" font-family="Arial,sans-serif" font-size="11">TO (STARTUP)</text>
  <text x="40" y="260" fill="#0f172a" font-family="Arial,sans-serif" font-size="14" font-weight="bold">${opts.startupTitle}</text>
  <text x="40" y="300" fill="#64748b" font-family="Arial,sans-serif" font-size="11">AMOUNT</text>
  <text x="40" y="330" fill="${color}" font-family="Arial,sans-serif" font-size="28" font-weight="bold">PKR ${opts.amountPkr.toLocaleString()}</text>
  <text x="40" y="370" fill="#64748b" font-family="Arial,sans-serif" font-size="11">DATE & TIME</text>
  <text x="40" y="390" fill="#0f172a" font-family="Arial,sans-serif" font-size="13">${ts}</text>
  ${opts.receiptFileName ? `<text x="40" y="425" fill="#64748b" font-family="Arial,sans-serif" font-size="10">Attachment: ${opts.receiptFileName}</text>` : ""}
  <rect x="40" y="440" width="280" height="50" rx="8" fill="#dcfce7"/>
  <text x="180" y="472" text-anchor="middle" fill="#166534" font-family="Arial,sans-serif" font-size="14" font-weight="bold">✓ PAYMENT SUCCESSFUL</text>
</svg>`.trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function resolveFounderIdForIdea(ideaId: string): Promise<string | null> {
  const snap = await getDoc(doc(db, "investment_ideas", ideaId));
  if (!snap.exists()) return null;
  return (snap.data().entrepreneurUid as string) || null;
}

async function fetchStage1ProfitShare(ideaId: string): Promise<string> {
  const snap = await getDoc(doc(db, "stage1_data", ideaId));
  if (!snap.exists()) return "15% of net operating profit";
  return String(snap.data().profitSharingPercent ?? "15% of net operating profit");
}

export async function syncEscrowPaymentToFirebase(payload: {
  ideaId: string;
  founderName: string;
  investorName: string;
  startupTitle: string;
  amountPkr: number;
  equityPercent: number;
  paymentMethod: PaymentMethod;
  receiptFileName?: string;
  founderId?: string;
}): Promise<string> {
  const founderId = payload.founderId ?? (await resolveFounderIdForIdea(payload.ideaId)) ?? "unknown";
  const profitSharingPercent = await fetchStage1ProfitShare(payload.ideaId);
  const now = Date.now();
  const paymentId = `pay-${payload.ideaId}-${now}`;

  const receiptScreenshotUrl = generateReceiptScreenshotDataUrl({
    paymentMethod: payload.paymentMethod,
    investorName: payload.investorName,
    amountPkr: payload.amountPkr,
    startupTitle: payload.startupTitle,
    receiptFileName: payload.receiptFileName,
  });

  const record: FounderPaymentRecord = {
    id: paymentId,
    founderId,
    ideaId: payload.ideaId,
    investorName: payload.investorName,
    startupTitle: payload.startupTitle,
    amountPkr: payload.amountPkr,
    equityPercent: payload.equityPercent,
    profitSharingPercent,
    agreedProfitPkr: computeAgreedProfit(payload.amountPkr, profitSharingPercent),
    paymentMethod: payload.paymentMethod,
    receiptScreenshotUrl,
    receiptFileName: payload.receiptFileName,
    profitDistributionDueAt: now + PROFIT_CYCLE_MS,
    status: "received",
    investmentStatus: "done",
    createdAt: now,
  };

  await setDoc(doc(db, "payments", paymentId), {
    ...record,
    createdAt: serverTimestamp(),
  });

  const stage3Ref = doc(db, "stage3_data", payload.ideaId);
  const stage3Snap = await getDoc(stage3Ref);
  const existing = stage3Snap.exists() ? stage3Snap.data() : {};
  const investorKey = payload.investorName.trim().toLowerCase().replace(/\s+/g, "-");
  await setDoc(
    stage3Ref,
    {
      ...existing,
      ideaId: payload.ideaId,
      investmentStatus: "done",
      investorPayments: {
        ...(existing.investorPayments ?? {}),
        [investorKey]: {
          investorName: payload.investorName,
          amountPkr: payload.amountPkr,
          equityPercent: payload.equityPercent,
          profitSharingPercent,
          paymentMethod: payload.paymentMethod,
          paymentId,
          status: "done",
          completedAt: now,
        },
      },
      milestones: (existing.milestones ?? []).map((m: { id: string; status: string }) =>
        ["m2", "m3", "m4", "m5"].includes(m.id) ? { ...m, status: "completed" } : m,
      ),
    },
    { merge: true },
  );

  return paymentId;
}

export async function fetchFounderPayments(founderId: string): Promise<FounderPaymentRecord[]> {
  const q = query(
    collection(db, "payments"),
    where("founderId", "==", founderId),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => normalizeFounderPayment({ ...d.data(), id: d.id }));
}

export async function fetchRecoveryPayments(founderId: string): Promise<RecoveryPaymentRecord[]> {
  const q = query(
    collection(db, "recovery_payments"),
    where("founderId", "==", founderId),
    orderBy("distributedAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    const distributedAt =
      typeof data.distributedAt === "number"
        ? data.distributedAt
        : data.distributedAt?.toMillis?.() ?? Date.now();
    return { ...data, id: d.id, distributedAt } as RecoveryPaymentRecord;
  });
}

export function buildProfitAlerts(payments: FounderPaymentRecord[]): ProfitAlert[] {
  const now = Date.now();
  return payments
    .filter((p) => typeof p.profitDistributionDueAt === "number" && p.profitDistributionDueAt <= now)
    .map((p) => ({
      paymentId: p.id,
      investorName: p.investorName ?? "Investor",
      startupTitle: p.startupTitle ?? "Startup",
      amountPkr: p.agreedProfitPkr ?? 0,
      dueAt: p.profitDistributionDueAt,
      overdue: p.profitDistributionDueAt < now,
    }));
}

export function formatCountdown(targetMs: number): string {
  if (!Number.isFinite(targetMs)) return "—";
  const diff = Math.max(0, targetMs - Date.now());
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  const secs = Math.floor((diff % (60 * 1000)) / 1000);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  return `${hours}h ${mins}m ${secs}s`;
}

export async function simulateProfitDistribution(
  payment: FounderPaymentRecord,
  method: "jazzcash" | "easypaisa",
): Promise<RecoveryPaymentRecord> {
  const now = Date.now();
  const recoveryId = `rec-${payment.id}-${now}`;

  const recovery: RecoveryPaymentRecord = {
    id: recoveryId,
    founderId: payment.founderId,
    paymentId: payment.id,
    ideaId: payment.ideaId,
    investorName: payment.investorName,
    startupTitle: payment.startupTitle,
    amountPkr: payment.agreedProfitPkr,
    paymentMethod: method,
    distributedAt: now,
    status: "completed",
    type: "profit_distribution",
  };

  await setDoc(doc(db, "recovery_payments", recoveryId), {
    ...recovery,
    distributedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "payments", payment.id), {
    status: "received",
    profitDistributionDueAt: now + PROFIT_CYCLE_MS,
    lastProfitPaidAt: now,
  });

  return recovery;
}

export function generateVentureShowcaseCards(
  payments: FounderPaymentRecord[],
  ideas: StartupIdea[],
): VentureShowcaseCard[] {
  const done = payments.filter((p) => p.investmentStatus === "done");
  const cards: VentureShowcaseCard[] = [];

  for (const payment of done) {
    const idea = ideas.find((i) => i.id === payment.ideaId);
    const products = idea?.stage2?.proofGallery?.filter((p) => p.type === "product") ?? [];
    const setups = idea?.stage2?.proofGallery?.filter((p) => p.type !== "product") ?? [];
    const useWholesaler = products.length > 0;
    const imageUrl = useWholesaler
      ? products[0]?.url
      : setups[0]?.url ?? products[0]?.url ?? "";

    if (!imageUrl) continue;

    cards.push({
      id: `showcase-${payment.id}`,
      ideaId: payment.ideaId,
      startupTitle: payment.startupTitle,
      headline: useWholesaler
        ? `${payment.startupTitle} — Wholesale Supply Success`
        : `${payment.startupTitle} — Business Growth Story`,
      subline: useWholesaler
        ? `Auto-generated ad featuring verified wholesaler products powering ${payment.investorName}'s investment.`
        : `Auto-generated creative showcasing the business setup driving mutual growth with ${payment.investorName}.`,
      imageUrl,
      creativeType: useWholesaler ? "wholesaler_products" : "business_setup",
      investmentStatus: "done",
      mutualGrowthTag: `Stage 3 Complete · ${payment.equityPercent}% Equity · ${payment.profitSharingPercent}`,
    });
  }

  return cards;
}

export function localPaymentToRecord(
  p: {
    id: string;
    startupTitle: string;
    investorName: string;
    amountPkr: number;
    amountDisplay: string;
    paymentMethod: string;
    timestamp: string;
    equityPercent?: number;
  },
  founderId: string,
  ideaId: string,
  profitSharingPercent: string,
): FounderPaymentRecord {
  const method = p.paymentMethod.toLowerCase().includes("jazz")
    ? "jazzcash"
    : p.paymentMethod.toLowerCase().includes("easy")
      ? "easypaisa"
      : "card";
  const createdAt = Date.now();
  return {
    id: p.id,
    founderId,
    ideaId,
    investorName: p.investorName,
    startupTitle: p.startupTitle,
    amountPkr: p.amountPkr,
    equityPercent: p.equityPercent ?? 0,
    profitSharingPercent,
    agreedProfitPkr: computeAgreedProfit(p.amountPkr, profitSharingPercent),
    paymentMethod: method as PaymentMethod,
    receiptScreenshotUrl: generateReceiptScreenshotDataUrl({
      paymentMethod: method as PaymentMethod,
      investorName: p.investorName,
      amountPkr: p.amountPkr,
      startupTitle: p.startupTitle,
    }),
    profitDistributionDueAt: createdAt + PROFIT_CYCLE_MS,
    status: "received",
    investmentStatus: "done",
    createdAt,
  };
}
