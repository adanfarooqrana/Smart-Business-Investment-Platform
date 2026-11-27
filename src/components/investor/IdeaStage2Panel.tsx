import { useState, useMemo, useEffect } from "react";
import { Banknote, Calculator } from "lucide-react";
import type { StartupIdea } from "@/data/startupIdeas";
import {
  calculateInvestmentProjection,
  formatPkr,
  parseInvestmentInput,
} from "@/lib/investmentCalculator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type IdeaStage2PanelProps = {
  idea: StartupIdea;
  investInput?: string;
  onInvestInputChange?: (value: string) => void;
};

export function IdeaStage2Panel({
  idea,
  investInput: controlledInput,
  onInvestInputChange,
}: IdeaStage2PanelProps) {
  const s2 = idea.stage2;
  const expenseBreakdown = Array.isArray(s2.expenseBreakdown) ? s2.expenseBreakdown : [];
  /** Show whenever expense lines exist (founder stage 2) */
  const showExpenseAllocation = expenseBreakdown.length > 0;

  const [localInput, setLocalInput] = useState("500000");
  const investInput = controlledInput ?? localInput;
  const setInvestInput = onInvestInputChange ?? setLocalInput;
  const [displayEquity, setDisplayEquity] = useState(0);
  const [displayProfit, setDisplayProfit] = useState(0);

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

  const totalExpenses = expenseBreakdown.reduce((sum, e) => sum + e.amountPkr, 0);
  const fundedPercent =
    s2.totalCapitalRequiredPkr > 0
      ? Math.min((totalExpenses / s2.totalCapitalRequiredPkr) * 100, 100)
      : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-amber-200/40 bg-white/80 p-4 shadow-sm">
              <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
                <Banknote className="h-4 w-4" />
              </div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-amber-800/60">
                Total Capital Required
              </p>
              <p className="font-display mt-0.5 text-sm font-bold leading-snug text-slate-900 sm:text-base">
                {formatPkr(s2.totalCapitalRequiredPkr)}
              </p>
            </div>
            <div className="rounded-xl border border-amber-200/40 bg-white/80 p-4 shadow-sm">
              <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-sm">
                <Banknote className="h-4 w-4" />
              </div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-amber-800/60">
                Total Valuation
              </p>
              <p className="font-display mt-0.5 text-sm font-bold leading-snug text-slate-900 sm:text-base">
                {formatPkr(s2.currentValuationPkr)}
              </p>
            </div>
          </div>

          {showExpenseAllocation && (
            <div>
              <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-800/70">
                <span>Expense Allocation</span>
                <span>{Math.round(fundedPercent)}% mapped</span>
              </div>
              <div className="flex h-4 overflow-hidden rounded-full bg-amber-100/80 ring-1 ring-amber-200/60">
                {expenseBreakdown.map((line) => (
                  <div
                    key={line.label}
                    className="h-full transition-all duration-500"
                    style={{
                      width:
                        s2.totalCapitalRequiredPkr > 0
                          ? `${(line.amountPkr / s2.totalCapitalRequiredPkr) * 100}%`
                          : "0%",
                      backgroundColor: line.color,
                    }}
                    title={`${line.label}: ${formatPkr(line.amountPkr)}`}
                  />
                ))}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {expenseBreakdown.map((line) => (
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
          )}
        </div>
      </section>

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
      </section>
    </div>
  );
}
