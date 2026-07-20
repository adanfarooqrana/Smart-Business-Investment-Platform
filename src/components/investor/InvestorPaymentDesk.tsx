import { useEffect, useMemo, useState } from "react";
import { Wallet, Building2, ExternalLink, Loader2 } from "lucide-react";
import { formatPkr } from "@/lib/investmentCalculator";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/firebase";
import {
  streamInvestorPendingTransactions,
  requireActiveInvestorUid,
  peekActiveInvestorUid,
  type PitchTransactionNode,
} from "@/services/investorCoreService";

/**
 * Build one ledger row from a unique payment_desk/{pitchId} route key.
 * Route key is always authoritative — never inherit a stale nested pitchId.
 */
function rowFromPitchRoute(
  routePitchId: string,
  node: PitchTransactionNode | Record<string, unknown>,
): PitchTransactionNode {
  const pitchId = String(routePitchId || "").trim();
  const raw = node as PitchTransactionNode & {
    businessName?: string;
    accountTitle?: string;
    amountPkr?: number;
  };
  return {
    transactionId: String(raw.transactionId || `${pitchId}-${raw.timestamp || 0}`),
    investorId: String(raw.investorId || "").trim(),
    investorName: String(raw.investorName || ""),
    pitchId,
    founderId: String(raw.founderId || ""),
    startupTitle: String(raw.businessName || raw.startupTitle || "").trim() || pitchId,
    amountInvested: Number(raw.amountInvested ?? raw.amountPkr) || 0,
    equityAcquired: Number(raw.equityAcquired) || 0,
    roiExpected: raw.roiExpected ?? "",
    receiptUrl: String(raw.receiptUrl || ""),
    status: raw.status === "approved" ? "approved" : "pending",
    timestamp: Number(raw.timestamp) || 0,
    bankName: String(raw.bankName || ""),
    accountTitleName: String(raw.accountTitleName || raw.accountTitle || ""),
    accountNumber: String(raw.accountNumber || ""),
    category: String(raw.category || ""),
  };
}

/**
 * Convert stream payload → unique Map by pitchId (RTDB object keys).
 * Prevents index-collision / cached Tim Hortans ↔ Calculator Pro bleed.
 */
function toUniquePitchRecords(items: PitchTransactionNode[]): PitchTransactionNode[] {
  const byPitchId = new Map<string, PitchTransactionNode>();
  for (const item of items || []) {
    const routePitchId = String(item?.pitchId || "").trim();
    if (!routePitchId) continue;
    byPitchId.set(routePitchId, rowFromPitchRoute(routePitchId, item));
  }
  return Array.from(byPitchId.values()).sort((a, b) => b.timestamp - a.timestamp);
}

export function InvestorPaymentDesk() {
  const { currentUser } = useAuth();
  // Prefer live auth.currentUser.uid — never a detached sibling investor root
  const investorId = String(
    peekActiveInvestorUid() || auth.currentUser?.uid || currentUser?.uid || "",
  ).trim();
  const [paymentRecords, setPaymentRecords] = useState<PitchTransactionNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let uid = "";
    try {
      uid = requireActiveInvestorUid(investorId || undefined);
    } catch {
      setPaymentRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setPaymentRecords([]);

    // Live root: investors/{auth.uid}/payment_desk — each child key = unique pitchId
    const unsub = streamInvestorPendingTransactions(uid, (items) => {
      try {
        if (!active) return;
        setPaymentRecords(toUniquePitchRecords(items));
        setLoading(false);
      } catch (error) {
        console.error("InvestorPaymentDesk parse error:", error);
        if (active) {
          setPaymentRecords([]);
          setLoading(false);
        }
      }
    });

    return () => {
      active = false;
      try {
        unsub();
      } catch (error) {
        console.error("InvestorPaymentDesk unsub error:", error);
      }
    };
  }, [investorId, currentUser?.uid]);

  const pendingCount = useMemo(
    () => paymentRecords.filter((t) => t?.status === "pending").length,
    [paymentRecords],
  );

  const totalSentPkr = useMemo(
    () => paymentRecords.reduce((sum, t) => sum + (Number(t?.amountInvested) || 0), 0),
    [paymentRecords],
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="relative overflow-hidden rounded-3xl border border-orange-200/60 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 p-6 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-100">
              Investor Payment Desk
            </p>
            <h2 className="font-display text-2xl font-black">Your Escrow & Orders Hub</h2>
            <p className="mt-1 text-xs text-orange-50/90">All payments by business</p>
          </div>
          <div className="rounded-2xl bg-white/20 px-5 py-3 text-center backdrop-blur-sm">
            <p className="text-[9px] font-bold uppercase tracking-wider text-orange-100">
              Total Sent
            </p>
            <p className="font-display text-2xl font-black">{formatPkr(totalSentPkr)}</p>
            {pendingCount > 0 ? (
              <p className="mt-1 text-[10px] font-semibold text-amber-100">
                {pendingCount} pending verification
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="flex items-center gap-2 font-display text-sm font-bold text-slate-900">
          <Wallet className="h-4 w-4 text-emerald-600" /> Payments by Business
        </h3>

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 py-12 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading live ledger…
          </div>
        ) : paymentRecords.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
            <p className="text-sm text-slate-500">
              No bank-transfer payments yet. Complete Stage 3 payment proof on an idea to see
              entries here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {paymentRecords.map((tx) => {
              const rowKey = tx.pitchId;
              const businessName = String(tx.startupTitle || tx.pitchId || "Venture").trim();
              const amountInvested = Number(tx.amountInvested) || 0;
              const isPending = tx.status !== "approved";
              const bankName = String(tx.bankName || "").trim();
              const accountTitle = String(tx.accountTitleName || "").trim();
              const accountNumber = String(tx.accountNumber || "").trim();
              const receiptUrl = String(tx.receiptUrl || "").trim();

              return (
                <div key={rowKey} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{businessName}</p>
                        <p className="mt-0.5 font-display text-lg font-black text-emerald-700">
                          {formatPkr(amountInvested)}
                        </p>
                        <p className="text-[10px] text-slate-500">Payment amount sent</p>
                      </div>
                    </div>
                    <span
                      aria-disabled="true"
                      className={`pointer-events-none shrink-0 select-none rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        isPending
                          ? "bg-amber-100 text-amber-900 ring-1 ring-amber-200/70"
                          : "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/70"
                      }`}
                    >
                      {isPending ? "Status: Pending Verification" : "Status: Approved"}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-[11px] text-slate-700">
                    <p>
                      <span className="font-semibold text-slate-500">Bank Name:</span>{" "}
                      <span className="font-bold text-slate-900">{bankName || "—"}</span>
                    </p>
                    <p>
                      <span className="font-semibold text-slate-500">Account Title:</span>{" "}
                      <span className="font-bold text-slate-900">{accountTitle || "—"}</span>
                    </p>
                    <p>
                      <span className="font-semibold text-slate-500">Account Number:</span>{" "}
                      <span className="font-mono font-bold text-slate-900">{accountNumber || "—"}</span>
                    </p>
                  </div>

                  {receiptUrl ? (
                    <a
                      href={receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 flex items-center gap-3 rounded-xl border border-amber-200/70 bg-amber-50/50 p-2 transition hover:border-amber-300"
                    >
                      <img
                        src={receiptUrl}
                        alt={`Receipt for ${businessName}`}
                        className="h-14 w-14 rounded-lg object-cover ring-1 ring-amber-200/60"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                          Receipt preview
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                          Open screenshot <ExternalLink className="h-3 w-3" />
                        </p>
                      </div>
                    </a>
                  ) : (
                    <p className="mt-3 text-[11px] text-slate-400">No receipt screenshot attached.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
