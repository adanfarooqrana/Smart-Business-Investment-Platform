import { useState, useMemo, useEffect } from "react";
import {
  Banknote,
  Users,
  TrendingUp,
  Calculator,
  ImageIcon,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import type { StartupIdea } from "@/data/startupIdeas";
import {
  calculateInvestmentProjection,
  formatPkr,
  parseInvestmentInput,
} from "@/lib/investmentCalculator";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type IdeaStage2PanelProps = {
  idea: StartupIdea;
  onAskAi?: (term: string) => void;
  investInput?: string;
  onInvestInputChange?: (value: string) => void;
};

export function IdeaStage2Panel({ idea, onAskAi, investInput: controlledInput, onInvestInputChange }: IdeaStage2PanelProps) {
  const s2 = idea.stage2;
  const [localInput, setLocalInput] = useState("500000");
  const investInput = controlledInput ?? localInput;
  const setInvestInput = onInvestInputChange ?? setLocalInput;
  const [displayEquity, setDisplayEquity] = useState(0);
  const [displayProfit, setDisplayProfit] = useState(0);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const amount = parseInvestmentInput(investInput);
  const projection = useMemo(
    () => calculateInvestmentProjection(amount, s2.investmentFormula),
    [amount, s2.investmentFormula],
  );

  useEffect(() => {
    const duration = 280;
    const startEquity = displayEquity;
    const startProfit = displayProfit;
    const targetEquity = projection.assignedEquityPercent;
    const targetProfit = projection.projectedAnnualProfitPkr;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplayEquity(startEquity + (targetEquity - startEquity) * ease);
      setDisplayProfit(Math.round(startProfit + (targetProfit - startProfit) * ease));
      if (t < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [projection.assignedEquityPercent, projection.projectedAnnualProfitPkr]);

  const totalExpenses = s2.expenseBreakdown.reduce((sum, e) => sum + e.amountPkr, 0);
  const fundedPercent = Math.min((totalExpenses / s2.totalCapitalRequiredPkr) * 100, 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Money Requirement Bar */}
      <section className="overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-orange-50/80 to-yellow-50 shadow-sm">
        <div className="border-b border-amber-200/50 bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3">
          <div className="flex items-center gap-2 text-white">
            <Banknote className="h-5 w-5" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wider">
              Capital Requirement Overview
            </h3>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <FinancialMetric
              label="Total Capital Required"
              value={formatPkr(s2.totalCapitalRequiredPkr)}
              accent="from-amber-400 to-orange-500"
            />
            <FinancialMetric
              label="Current Valuation"
              value={formatPkr(s2.currentValuationPkr)}
              accent="from-yellow-400 to-amber-500"
            />
            <FinancialMetric
              label="Existing Customer Base"
              value={s2.customerBaseSize}
              accent="from-orange-400 to-amber-600"
              icon={Users}
            />
          </div>

          {/* Allocation bar */}
          <div>
            <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-800/70">
              <span>Expense Allocation</span>
              <span>{Math.round(fundedPercent)}% mapped</span>
            </div>
            <div className="flex h-4 overflow-hidden rounded-full bg-amber-100/80 ring-1 ring-amber-200/60">
              {s2.expenseBreakdown.map((line) => (
                <div
                  key={line.label}
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${(line.amountPkr / s2.totalCapitalRequiredPkr) * 100}%`,
                    backgroundColor: line.color,
                  }}
                  title={`${line.label}: ${formatPkr(line.amountPkr)}`}
                />
              ))}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {s2.expenseBreakdown.map((line) => (
                <div
                  key={line.label}
                  className="flex items-center justify-between rounded-xl border border-amber-200/40 bg-white/70 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: line.color }}
                    />
                    <span className="text-xs font-medium text-slate-700">{line.label}</span>
                  </div>
                  <span className="text-xs font-bold text-amber-900">{formatPkr(line.amountPkr)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Calculator */}
      <section className="rounded-2xl border border-orange-200/60 bg-white p-5 shadow-sm ring-1 ring-orange-100/50">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
            <Calculator className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-slate-900">Interactive Investment Calculator</h3>
            <p className="text-[10px] text-slate-500">Enter your investment amount — equity & profit update live</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="invest-amount" className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Your Investment (PKR)
            </Label>
            <Input
              id="invest-amount"
              value={investInput}
              onChange={(e) => setInvestInput(e.target.value)}
              placeholder="e.g. 500000"
              className="h-12 rounded-xl border-amber-200/80 bg-amber-50/30 text-base font-semibold text-slate-900 focus-visible:ring-amber-400/40"
            />
          </div>
          <div className="grid flex-1 grid-cols-2 gap-3">
            <div className="rounded-xl border border-amber-300/50 bg-gradient-to-br from-amber-50 to-yellow-50 p-4 text-center">
              <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700/80">Assigned Equity</p>
              <p className="font-display mt-1 text-2xl font-black text-amber-600 tabular-nums">
                {displayEquity.toFixed(2)}%
              </p>
            </div>
            <div className="rounded-xl border border-orange-300/50 bg-gradient-to-br from-orange-50 to-amber-50 p-4 text-center">
              <p className="text-[9px] font-bold uppercase tracking-wider text-orange-700/80">Projected Annual Profit</p>
              <p className="font-display mt-1 text-lg font-black text-orange-600 tabular-nums sm:text-xl">
                {formatPkr(displayProfit)}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-3 text-[10px] text-slate-400">
          Formula: Equity = (Investment ÷ {formatPkr(s2.investmentFormula.totalRaisePkr)}) × {s2.investmentFormula.maxEquityPercent}% max
          &bull; Profit = Investment × {(s2.investmentFormula.projectedAnnualReturnRate * 100).toFixed(0)}% projected return
        </p>

        {onAskAi && (
          <button
            type="button"
            onClick={() => onAskAi("Investment Calculator")}
            className="mt-3 text-[10px] font-semibold text-amber-700 hover:text-orange-600 hover:underline"
          >
            Ask Market Expert AI about this projection →
          </button>
        )}
      </section>

      {/* Proof Gallery */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-slate-500" />
            <h3 className="font-display text-sm font-bold text-slate-900">Operational Proof Gallery</h3>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-500">
            View Only
          </span>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-xl">
            <img
              src={s2.proofGallery[galleryIndex]?.url}
              alt={s2.proofGallery[galleryIndex]?.caption}
              className="aspect-[16/10] w-full cursor-zoom-in object-cover transition-transform hover:scale-[1.02]"
              onClick={() => setZoomImage(s2.proofGallery[galleryIndex]?.url ?? null)}
            />
          </div>
          <button
            type="button"
            onClick={() => setGalleryIndex((i) => (i === 0 ? s2.proofGallery.length - 1 : i - 1))}
            className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setGalleryIndex((i) => (i === s2.proofGallery.length - 1 ? 0 : i + 1))}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoomImage(s2.proofGallery[galleryIndex]?.url ?? null)}
            className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-slate-900/75 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm"
          >
            <ZoomIn className="h-3 w-3" /> Zoom
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-600">{s2.proofGallery[galleryIndex]?.caption}</p>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {s2.proofGallery.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setGalleryIndex(idx)}
              className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                idx === galleryIndex ? "border-amber-500 ring-2 ring-amber-400/30" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img src={img.url} alt={img.caption} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </section>

      {/* Market snapshot strip */}
      <section
        className="rounded-2xl border border-amber-200/50 bg-gradient-to-r from-amber-50/80 to-orange-50/60 p-4"
        onClick={() => onAskAi?.("Market Viability")}
        role={onAskAi ? "button" : undefined}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-600" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Market Signal · {s2.marketInsight.location}</p>
              <p className="text-xs text-slate-700">{s2.marketInsight.demandGrowthYoY}% YoY demand growth · {s2.marketInsight.viabilityRating} viability</p>
            </div>
          </div>
          {onAskAi && (
            <span className="text-[10px] font-bold text-orange-600">Ask Market Expert AI →</span>
          )}
        </div>
      </section>

      <Dialog open={!!zoomImage} onOpenChange={() => setZoomImage(null)}>
        <DialogContent className="max-w-4xl border-none bg-black/95 p-2 sm:p-4">
          <button
            type="button"
            onClick={() => setZoomImage(null)}
            className="absolute right-3 top-3 z-10 rounded-full bg-white/10 p-1.5 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
          {zoomImage && (
            <img src={zoomImage} alt="Proof zoom" className="max-h-[85vh] w-full rounded-lg object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FinancialMetric({
  label,
  value,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string;
  accent: string;
  icon?: typeof Users;
}) {
  return (
    <div className="rounded-xl border border-amber-200/40 bg-white/80 p-4 shadow-sm">
      <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${accent} text-white shadow-sm`}>
        {Icon ? <Icon className="h-4 w-4" /> : <Banknote className="h-4 w-4" />}
      </div>
      <p className="text-[9px] font-bold uppercase tracking-wider text-amber-800/60">{label}</p>
      <p className="font-display mt-0.5 text-sm font-bold leading-snug text-slate-900 sm:text-base">{value}</p>
    </div>
  );
}
