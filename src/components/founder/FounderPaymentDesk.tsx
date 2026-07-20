import { ExternalLink, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPkr } from "@/lib/investmentCalculator";
import type { PitchTransactionNode } from "@/services/investorFirebaseService";

type FounderPaymentDeskProps = {
  transactions: PitchTransactionNode[];
  approvingTxKey: string | null;
  onMarkAsPaid: (tx: PitchTransactionNode) => void | Promise<void>;
};

/**
 * Live inbound ledger for pitches/{pitchId}/transactions/{investorId}.
 * Founder confirms pending Stage-3 bank-transfer receipts via Mark as Paid.
 * (Admin escrow / Request Payout UI removed — this is the sole Cash Payout grid.)
 */
export function FounderPaymentDesk({
  transactions,
  approvingTxKey,
  onMarkAsPaid,
}: FounderPaymentDeskProps) {
  const rows = Array.isArray(transactions) ? transactions : [];

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
          No deployed capital payment proofs yet.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((tx) => {
            const pitchId = String(tx?.pitchId || "").trim();
            const investorId = String(tx?.investorId || "").trim();
            const key = `${pitchId}:${investorId}`;
            const approving = approvingTxKey === key;
            const isPending = tx?.status === "pending";
            const businessName = String(tx?.startupTitle || pitchId || "Venture").trim();
            const amount = Number(tx?.amountInvested) || 0;
            const bankName = String(tx?.investorBankName ?? "").trim();
            const accountTitle = String(tx?.investorAccountTitle ?? "").trim();
            const accountNumber = String(tx?.investorAccountNumber ?? "").trim();
            const receiptUrl = String(tx?.receiptUrl || "").trim();

            return (
              <div
                key={key || tx?.transactionId || businessName}
                className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{businessName}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Investor: {String(tx?.investorName || investorId || "—")}
                    </p>
                  </div>
                  <p className="shrink-0 font-display text-xl font-black tabular-nums text-amber-600">
                    {formatPkr(amount)}
                  </p>
                </div>

                <div className="space-y-2 rounded-xl border border-amber-200/80 bg-amber-50/40 px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800/80">
                    Investor Bank Verification Details
                  </p>
                  <div className="space-y-1.5 text-[11px] text-slate-700">
                    <p>
                      <span className="font-semibold text-slate-500">Investor Bank:</span>{" "}
                      <span className="font-bold text-slate-900">{bankName || "—"}</span>
                    </p>
                    <p>
                      <span className="font-semibold text-slate-500">Account Title:</span>{" "}
                      <span className="font-bold text-slate-900">{accountTitle || "—"}</span>
                    </p>
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-500">Account Number / IBAN:</span>
                      <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-900 ring-1 ring-amber-200/80">
                        {accountNumber || "—"}
                      </span>
                    </p>
                  </div>
                </div>

                {receiptUrl ? (
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 transition hover:border-amber-300 hover:bg-amber-100"
                  >
                    <FileText className="h-4 w-4" />
                    View payment receipt screenshot
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <p className="text-[11px] text-slate-400">No receipt screenshot attached.</p>
                )}

                {isPending ? (
                  <Button
                    size="sm"
                    disabled={!!approvingTxKey}
                    onClick={() => {
                      void (async () => {
                        try {
                          await onMarkAsPaid(tx);
                        } catch (error) {
                          console.error("Mark as Paid click handler error:", error);
                        }
                      })();
                    }}
                    className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    {approving ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Approving…
                      </>
                    ) : (
                      "Mark as Paid"
                    )}
                  </Button>
                ) : (
                  <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[11px] font-bold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Settled & Portfolio Activated
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
