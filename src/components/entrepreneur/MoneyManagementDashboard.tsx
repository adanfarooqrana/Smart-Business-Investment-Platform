import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Wallet,
  Clock,
  AlertTriangle,
  ImageIcon,
  PieChart,
  TrendingUp,
  Loader2,
  Send,
  CheckCircle2,
  History,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatPkr } from "@/lib/investmentCalculator";
import type { StartupIdea } from "@/data/startupIdeas";
import type { EntrepreneurPayment } from "@/hooks/useAppState";
import {
  fetchFounderPayments,
  fetchRecoveryPayments,
  buildProfitAlerts,
  formatCountdown,
  simulateProfitDistribution,
  localPaymentToRecord,
  normalizeFounderPayment,
  type FounderPaymentRecord,
  type RecoveryPaymentRecord,
} from "@/services/moneyManagementService";

type Props = {
  founderId: string;
  ideas: StartupIdea[];
  localPayments: EntrepreneurPayment[];
};

export function MoneyManagementDashboard({ founderId, ideas, localPayments }: Props) {
  const [payments, setPayments] = useState<FounderPaymentRecord[]>([]);
  const [recoveryPayments, setRecoveryPayments] = useState<RecoveryPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<"jazzcash" | "easypaisa">("jazzcash");
  const [selectedPayment, setSelectedPayment] = useState<FounderPaymentRecord | null>(null);
  const [processingPayout, setProcessingPayout] = useState(false);

  const ideaTitleSet = useMemo(
    () => new Set(ideas.map((i) => i.startupTitle.toLowerCase())),
    [ideas],
  );

  const ideaIdByTitle = useMemo(() => {
    const map = new Map<string, string>();
    for (const idea of ideas) map.set(idea.startupTitle.toLowerCase(), idea.id);
    return map;
  }, [ideas]);

  const profitShareByIdea = useMemo(() => {
    const map = new Map<string, string>();
    for (const idea of ideas) {
      map.set(idea.id, idea.stage1?.profitSharingPercent ?? "—");
    }
    return map;
  }, [ideas]);

  const loadData = useCallback(async () => {
    if (!founderId) return;
    setLoading(true);
    try {
      const [firebasePayments, recoveries] = await Promise.all([
        fetchFounderPayments(founderId),
        fetchRecoveryPayments(founderId),
      ]);

      let merged = firebasePayments;

      if (merged.length === 0 && localPayments.length > 0) {
        merged = localPayments
          .filter((p) => ideaTitleSet.has(p.startupTitle.toLowerCase()))
          .map((p) => {
            const ideaId = ideaIdByTitle.get(p.startupTitle.toLowerCase()) ?? "local";
            const profitShare = profitShareByIdea.get(ideaId) ?? "15% of net operating profit";
            return localPaymentToRecord(p, founderId, ideaId, profitShare);
          });
      }

      setPayments(merged.map((p) => normalizeFounderPayment(p as Record<string, unknown> & { id: string })));
      setRecoveryPayments(recoveries);
    } catch {
      const fallback = localPayments
        .filter((p) => ideaTitleSet.has(p.startupTitle.toLowerCase()))
        .map((p) => {
          const ideaId = ideaIdByTitle.get(p.startupTitle.toLowerCase()) ?? "local";
          const profitShare = profitShareByIdea.get(ideaId) ?? "15% of net operating profit";
          return localPaymentToRecord(p, founderId, ideaId, profitShare);
        });
      setPayments(fallback);
      setRecoveryPayments([]);
    } finally {
      setLoading(false);
    }
  }, [founderId, localPayments, ideaTitleSet, ideaIdByTitle, profitShareByIdea]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const alerts = useMemo(() => buildProfitAlerts(payments), [payments, tick]);

  const nextDistribution = useMemo(() => {
    const upcoming = payments
      .filter((p) => p.profitDistributionDueAt > Date.now())
      .sort((a, b) => a.profitDistributionDueAt - b.profitDistributionDueAt);
    return upcoming[0] ?? null;
  }, [payments, tick]);

  const openPayout = (payment: FounderPaymentRecord) => {
    setSelectedPayment(payment);
    setShowPayoutModal(true);
  };

  const handleDistribute = async () => {
    if (!selectedPayment) return;
    setProcessingPayout(true);
    try {
      const recovery = await simulateProfitDistribution(selectedPayment, payoutMethod);
      toast.success(
        `Profit distributed to ${selectedPayment.investorName} via ${payoutMethod === "jazzcash" ? "JazzCash" : "EasyPaisa"}`,
      );
      setRecoveryPayments((prev) => [recovery, ...prev]);
      setPayments((prev) =>
        prev.map((p) =>
          p.id === selectedPayment.id
            ? {
                ...p,
                status: "received" as const,
                profitDistributionDueAt: Date.now() + 90 * 86400000,
              }
            : p,
        ),
      );
      setShowPayoutModal(false);
      setSelectedPayment(null);
    } catch {
      toast.error("Payout simulation failed. Please try again.");
    } finally {
      setProcessingPayout(false);
    }
  };

  return (
    <section className="mb-8 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            <Wallet className="h-3 w-3" /> Money Management
          </p>
          <h2 className="font-display text-xl font-extrabold text-slate-900 md:text-2xl">
            Money Management & Automated Campaign Dashboard
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Track investor escrow payments, equity vs profit terms, profit distribution countdowns,
            and automated payout alerts.
          </p>
        </div>
        {nextDistribution && (
          <div className="rounded-2xl border border-[#FFA500]/30 bg-[#FFF8E1] px-4 py-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#FFA500]">
              Next profit distribution
            </p>
            <p className="font-mono text-lg font-black text-slate-900">
              {formatCountdown(nextDistribution.profitDistributionDueAt)}
            </p>
            <p className="text-[10px] text-slate-500">{nextDistribution.investorName}</p>
          </div>
        )}
      </div>

      {alerts.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-900">
            <Bell className="h-4 w-4 animate-pulse" /> Alerts Section
          </h3>
          <ul className="space-y-2">
            {alerts.map((alert) => (
              <li
                key={alert.paymentId}
                className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Pay Profit to Investor {alert.investorName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {alert.startupTitle} · Due {new Date(alert.dueAt).toLocaleDateString("en-PK")} ·{" "}
                    {formatPkr(alert.amountPkr)}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="rounded-full bg-amber-500 text-white hover:bg-amber-600"
                  onClick={() => {
                    const pay = payments.find((p) => p.id === alert.paymentId);
                    if (pay) openPayout(pay);
                  }}
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" /> Distribute Profit
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-3xl border border-[#FFA500]/25 bg-white p-6 shadow-lg">
        <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-slate-900">
          <TrendingUp className="h-5 w-5 text-[#FFA500]" />
          Investor Payment Tracking
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading payments...
          </div>
        ) : payments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#FFA500]/40 bg-[#FFF8E1]/50 p-8 text-center">
            <Wallet className="mx-auto mb-2 h-8 w-8 text-[#FFA500]/50" />
            <p className="text-sm font-medium text-slate-600">No investor payments yet</p>
            <p className="mt-1 text-xs text-slate-400">
              When investors complete Stage 3 escrow via JazzCash or EasyPaisa, payments appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => {
              const isDue = payment.profitDistributionDueAt <= Date.now();
              return (
                <div
                  key={payment.id}
                  className="rounded-2xl border border-[#FFD700]/40 bg-[#FFF8E1]/40 p-4 md:p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            payment.paymentMethod === "jazzcash"
                              ? "bg-red-100 text-red-700"
                              : payment.paymentMethod === "easypaisa"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {payment.paymentMethod === "jazzcash"
                            ? "JazzCash"
                            : payment.paymentMethod === "easypaisa"
                              ? "EasyPaisa"
                              : "Card"}
                        </span>
                        <span className="rounded-full bg-[#FFA500]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#FFA500]">
                          {payment.investmentStatus === "done" ? "Stage 3 Done" : "In Progress"}
                        </span>
                        {isDue && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                            <AlertTriangle className="h-3 w-3" /> Profit Due
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-900">
                        Payment from <span className="text-emerald-700">{payment.investorName}</span>
                      </p>
                      <p className="mt-1 text-2xl font-black text-slate-900">
                        {formatPkr(payment.amountPkr)}
                      </p>
                      <p className="text-xs text-slate-500">{payment.startupTitle}</p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-white bg-white/80 p-3">
                          <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase text-slate-500">
                            <PieChart className="h-3 w-3" /> Equity Assigned
                          </p>
                          <p className="text-lg font-bold text-[#FFA500]">
                            {(payment.equityPercent ?? 0).toFixed(2)}%
                          </p>
                        </div>
                        <div className="rounded-xl border border-white bg-white/80 p-3">
                          <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase text-slate-500">
                            <TrendingUp className="h-3 w-3" /> Profit Agreed
                          </p>
                          <p className="text-sm font-bold text-emerald-700">
                            {payment.profitSharingPercent}
                          </p>
                          <p className="text-xs text-slate-500">
                            Qtr. payout: {formatPkr(payment.agreedProfitPkr)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-3 lg:w-52">
                      <div className="rounded-xl border border-[#FFA500]/20 bg-white p-3 text-center">
                        <p className="mb-1 flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-slate-500">
                          <Clock className="h-3 w-3" /> Profit Countdown
                        </p>
                        <p className="font-mono text-base font-black text-slate-900">
                          {formatCountdown(payment.profitDistributionDueAt)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border-[#FFA500]/40 text-[#FFA500]"
                        onClick={() => {
                          setPreviewUrl(payment.receiptScreenshotUrl ?? null);
                          setPreviewTitle(`${payment.investorName} — ${payment.paymentMethod.toUpperCase()} Receipt`);
                        }}
                      >
                        <ImageIcon className="mr-1.5 h-3.5 w-3.5" /> Preview Payment Screenshot
                      </Button>
                      {isDue && (
                        <Button
                          size="sm"
                          className="rounded-full text-white"
                          style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
                          onClick={() => openPayout(payment)}
                        >
                          <Send className="mr-1.5 h-3.5 w-3.5" /> Distribute Profit
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-slate-900">
          <History className="h-5 w-5 text-slate-600" />
          Recovery Payments
        </h3>
        {recoveryPayments.length === 0 ? (
          <p className="text-sm text-slate-500">
            Processed profit distributions via JazzCash/EasyPaisa will appear here.
          </p>
        ) : (
          <ul className="space-y-2">
            {recoveryPayments.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Profit paid to {r.investorName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {r.startupTitle} · via{" "}
                    {r.paymentMethod === "jazzcash" ? "JazzCash" : "EasyPaisa"} ·{" "}
                    {new Date(r.distributedAt).toLocaleString("en-PK")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-700">{formatPkr(r.amountPkr)}</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
            <DialogDescription>Escrow payment screenshot preview</DialogDescription>
          </DialogHeader>
          {previewUrl && (
            <img src={previewUrl} alt="Payment receipt" className="w-full rounded-xl border" />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showPayoutModal} onOpenChange={setShowPayoutModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Distribute Profit via Wallet</DialogTitle>
            <DialogDescription>
              Simulate payout to {selectedPayment?.investorName} —{" "}
              {selectedPayment ? formatPkr(selectedPayment.agreedProfitPkr) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <button
              type="button"
              onClick={() => setPayoutMethod("jazzcash")}
              className={`w-full rounded-xl border p-4 text-left transition ${
                payoutMethod === "jazzcash"
                  ? "border-red-400 bg-red-50"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <p className="font-bold text-red-700">JazzCash</p>
              <p className="text-xs text-slate-500">Instant mobile wallet transfer</p>
            </button>
            <button
              type="button"
              onClick={() => setPayoutMethod("easypaisa")}
              className={`w-full rounded-xl border p-4 text-left transition ${
                payoutMethod === "easypaisa"
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <p className="font-bold text-emerald-700">EasyPaisa</p>
              <p className="text-xs text-slate-500">Simulated profit recovery payout</p>
            </button>
            <Button
              className="w-full rounded-full text-white"
              style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
              disabled={processingPayout}
              onClick={handleDistribute}
            >
              {processingPayout ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" /> Distribute Profit via{" "}
                  {payoutMethod === "jazzcash" ? "JazzCash" : "EasyPaisa"}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
