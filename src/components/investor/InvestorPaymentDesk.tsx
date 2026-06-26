import { useState, useMemo } from "react";
import {
  Bot,
  Wallet,
  Package,
  Send,
  Sparkles,
  Building2,
  ChevronRight,
  Truck,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatPkr } from "@/lib/investmentCalculator";
import { useAppState, type SampleOrderStage } from "@/hooks/useAppState";
import { STARTUP_IDEAS } from "@/components/investor/InvestorIdeasFeed";

const STAGE_LABELS: Record<SampleOrderStage, string> = {
  approved: "Approved",
  packed: "Packed",
  sent: "Sent",
};

const STAGE_ORDER: SampleOrderStage[] = ["approved", "packed", "sent"];

export function InvestorPaymentDesk() {
  const {
    investor,
    investments,
    sampleOrders,
    founderQuestions,
    askFounderQuestion,
    advanceSampleOrderStage,
  } = useAppState();

  const investorName = investor.name || "Verified Investor";

  const escrowPayments = useMemo(
    () =>
      investments.filter(
        (inv) => inv.method === "platform" && inv.status === "completed" && inv.ideaId,
      ),
    [investments],
  );

  const byBusiness = useMemo(() => {
    const map = new Map<
      string,
      { businessName: string; ideaId?: string; totalPkr: number; payments: typeof escrowPayments }
    >();
    for (const inv of escrowPayments) {
      const key = inv.businessName;
      const existing = map.get(key) || {
        businessName: key,
        ideaId: inv.ideaId,
        totalPkr: 0,
        payments: [],
      };
      existing.totalPkr += inv.amountPkr || 0;
      existing.payments.push(inv);
      map.set(key, existing);
    }
    return Array.from(map.values());
  }, [escrowPayments]);

  const mySampleOrders = sampleOrders.filter((o) => o.investorName === investorName);
  const myQuestions = founderQuestions.filter(
    (q) => !q.founderName || founderQuestions.some((x) => x.startupTitle === q.startupTitle),
  );

  const [selectedBiz, setSelectedBiz] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const activeBiz = selectedBiz
    ? byBusiness.find((b) => b.businessName === selectedBiz)
    : byBusiness[0] ?? null;

  const ideaMeta = activeBiz?.ideaId
    ? STARTUP_IDEAS.find((i) => i.id === activeBiz.ideaId)
    : undefined;

  const handleAsk = async () => {
    if (!question.trim() || !activeBiz) return;
    setAsking(true);
    await new Promise((r) => setTimeout(r, 900));
    askFounderQuestion({
      startupTitle: activeBiz.businessName,
      ideaId: activeBiz.ideaId,
      founderName: ideaMeta?.founderName,
      question: question.trim(),
    });
    setQuestion("");
    setAsking(false);
  };

  const handleAdvanceOrder = async (orderId: string) => {
    setAdvancingId(orderId);
    await new Promise((r) => setTimeout(r, 700));
    advanceSampleOrderStage(orderId);
    setAdvancingId(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-orange-200/60 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 p-6 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-100">Investor Payment Desk</p>
            <h2 className="font-display text-2xl font-black">Your Escrow & Orders Hub</h2>
            <p className="mt-1 text-xs text-orange-50/90">
              All payments by business · Sample order tracking · AI founder relay
            </p>
          </div>
          <div className="rounded-2xl bg-white/20 px-5 py-3 backdrop-blur-sm text-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-orange-100">Total Escrowed</p>
            <p className="font-display text-2xl font-black">
              {formatPkr(byBusiness.reduce((s, b) => s + b.totalPkr, 0))}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Payments by business */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="flex items-center gap-2 font-display text-sm font-bold text-slate-900">
            <Wallet className="h-4 w-4 text-emerald-600" /> Payments by Business
          </h3>

          {byBusiness.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
              <p className="text-sm text-slate-500">No escrow payments yet. Complete Stage 3 on an idea to see payments here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {byBusiness.map((biz) => (
                <button
                  key={biz.businessName}
                  type="button"
                  onClick={() => setSelectedBiz(biz.businessName)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${
                    activeBiz?.businessName === biz.businessName
                      ? "border-emerald-300 bg-emerald-50/80 ring-2 ring-emerald-200"
                      : "border-slate-200 bg-white hover:border-emerald-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{biz.businessName}</p>
                        <p className="text-[10px] text-slate-500">{biz.payments.length} payment(s)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-black text-emerald-700">{formatPkr(biz.totalPkr)}</p>
                      <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                    {biz.payments.map((p) => (
                      <div key={p.id} className="flex justify-between text-[10px] text-slate-600">
                        <span>{p.date}</span>
                        <span className="font-bold">{p.amountPkr ? formatPkr(p.amountPkr) : p.amount}</span>
                        <span className="text-emerald-600">{p.paymentMethod?.toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* AI Founder Q&A */}
        <div className="lg:col-span-3 rounded-2xl border border-violet-200/60 bg-gradient-to-b from-violet-50/50 to-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-1.5">
                Ask the Founder <Sparkles className="h-3.5 w-3.5 text-violet-500" />
              </h3>
              <p className="text-[10px] text-slate-500">
                AI relays your question to {activeBiz?.businessName || "a business"} and returns founder answers
              </p>
            </div>
          </div>

          {activeBiz ? (
            <>
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={`Ask ${ideaMeta?.founderName || "the founder"} about revenue, milestones, risks…`}
                rows={3}
                className="rounded-xl border-violet-200 bg-white text-sm"
              />
              <Button
                onClick={handleAsk}
                disabled={asking || !question.trim()}
                className="mt-3 w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
              >
                {asking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Send via AI Relay
                  </>
                )}
              </Button>
            </>
          ) : (
            <p className="text-xs text-slate-500 italic">Select a business with payments to ask questions.</p>
          )}

          {myQuestions.length > 0 && (
            <div className="mt-5 max-h-64 space-y-3 overflow-y-auto investor-feed-scroll border-t border-violet-100 pt-4">
              {myQuestions.slice(0, 8).map((q) => (
                <div key={q.id} className="rounded-xl border border-violet-100 bg-white p-3">
                  <p className="text-[10px] font-bold text-violet-600">{q.startupTitle} · {q.timestamp}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-800">Q: {q.question}</p>
                  <p className="mt-2 rounded-lg bg-violet-50 p-2 text-[11px] leading-relaxed text-slate-700">
                    <Bot className="inline h-3 w-3 mr-1 text-violet-500" />
                    {q.aiAnswer}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sample orders — 3 stages */}
      <section className="rounded-2xl border border-orange-200/60 bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-bold text-slate-900">
          <Package className="h-4 w-4 text-orange-500" /> Sample Orders — 3-Stage Tracking
        </h3>

        {mySampleOrders.length === 0 ? (
          <p className="text-sm text-slate-500">
            No sample orders yet. After escrow payment, order a sample from Stage 3 to track delivery here.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {mySampleOrders.map((order) => (
              <SampleOrderCard
                key={order.id}
                order={order}
                advancing={advancingId === order.id}
                onAdvance={() => handleAdvanceOrder(order.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SampleOrderCard({
  order,
  advancing,
  onAdvance,
}: {
  order: import("@/hooks/useAppState").SampleOrder;
  advancing: boolean;
  onAdvance: () => void;
}) {
  const currentIdx = STAGE_ORDER.indexOf(order.stage);
  const canAdvance = order.stage !== "sent";

  return (
    <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50/80 to-amber-50/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-slate-900">{order.productName}</p>
          <p className="text-[10px] text-slate-500">{order.startupTitle} · {order.deliveryServiceLabel}</p>
        </div>
        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-bold text-orange-700">
          {order.trackingId}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        {STAGE_ORDER.map((stage, idx) => (
          <div key={stage} className="flex flex-1 flex-col items-center">
            {idx <= currentIdx ? (
              <CheckCircle2 className="h-5 w-5 text-orange-500" />
            ) : (
              <Circle className="h-5 w-5 text-slate-300" />
            )}
            <p className={`mt-1 text-[9px] font-bold ${idx <= currentIdx ? "text-orange-700" : "text-slate-400"}`}>
              {STAGE_LABELS[stage]}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-600">
        <span>{order.city} · {formatPkr(order.productPricePkr + order.deliveryCostPkr)}</span>
        {order.stage === "sent" ? (
          <span className="flex items-center gap-1 font-bold text-emerald-600">
            <Truck className="h-3 w-3" /> Dispatched
          </span>
        ) : canAdvance ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onAdvance}
            disabled={advancing}
            className="h-7 rounded-lg border-orange-300 text-[10px] text-orange-700"
          >
            {advancing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Demo: Next Stage"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
