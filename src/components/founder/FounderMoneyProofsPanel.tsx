import { Wallet, FileImage, Send, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EntrepreneurPayment } from "@/hooks/useAppState";
import { formatPkr } from "@/lib/investmentCalculator";

type Props = {
  payments: EntrepreneurPayment[];
  onSendProfit: () => void;
};

export function FounderMoneyProofsPanel({ payments = [], onSendProfit }: Props) {
  const totalReceived = payments.reduce((sum, p) => sum + p.amountPkr, 0);
  const pending = payments.filter((p) => p.status !== "received").length;

  return (
    <aside className="rounded-2xl border border-[#FFD700]/20 p-5"
      style={{ background: "rgba(255,255,255,0.03)" }}
    >
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#FFD700]">
        <Wallet className="h-4 w-4" /> Money &amp; Proofs
      </h3>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center">
          <p className="text-[10px] text-emerald-400">Total Received</p>
          <p className="font-display text-lg font-black text-white">
            {formatPkr(totalReceived)}
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-center">
          <p className="text-[10px] text-amber-400">Pending</p>
          <p className="font-display text-lg font-black text-white">{pending}</p>
        </div>
      </div>

      <div className="mb-4 max-h-48 space-y-2 overflow-y-auto">
        {payments.length === 0 ? (
          <p className="text-center text-xs text-slate-500 py-4">No payments yet.</p>
        ) : (
          payments.slice(0, 5).map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-white/5 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFD700]/20">
                <FileImage className="h-4 w-4 text-[#FFD700]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-white">{p.investorName}</p>
                <p className="text-[10px] text-slate-500">{p.paymentMethod} · {p.timestamp}</p>
              </div>
              <p className="text-xs font-bold text-emerald-400">{p.amountDisplay}</p>
            </div>
          ))
        )}
      </div>

      <Button
        className="w-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-xs font-bold text-[#1a1a2e]"
        onClick={onSendProfit}
      >
        <Send className="mr-1.5 h-3.5 w-3.5" /> Send Profit
      </Button>

      <div className="mt-3 flex items-center gap-1 text-[10px] text-slate-500">
        <TrendingUp className="h-3 w-3 text-[#FFD700]" />
        Proof attachments from investors shown above
      </div>
    </aside>
  );
}
