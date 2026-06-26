import type { StartupIdeaStage2 } from "@/data/startupIdeas";

export type InvestmentProjection = {
  assignedEquityPercent: number;
  projectedAnnualProfitPkr: number;
  investmentAmountPkr: number;
};

export function parseInvestmentInput(raw: string): number {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : 0;
}

export function formatPkr(amount: number): string {
  return `PKR ${Math.round(amount).toLocaleString("en-PK")}`;
}

export function calculateInvestmentProjection(
  amountPkr: number,
  formula: StartupIdeaStage2["investmentFormula"],
): InvestmentProjection {
  if (amountPkr <= 0) {
    return { assignedEquityPercent: 0, projectedAnnualProfitPkr: 0, investmentAmountPkr: 0 };
  }

  const rawEquity = (amountPkr / formula.totalRaisePkr) * formula.maxEquityPercent;
  const assignedEquityPercent = Math.min(
    Math.round(rawEquity * 100) / 100,
    formula.maxEquityPercent,
  );
  const projectedAnnualProfitPkr = Math.round(amountPkr * formula.projectedAnnualReturnRate);

  return {
    assignedEquityPercent,
    projectedAnnualProfitPkr,
    investmentAmountPkr: amountPkr,
  };
}

export function computeFounderConfidenceScore(
  background: StartupIdeaStage2["founderBackground"],
): number {
  const expScore = Math.min(background.yearsExperience * 8, 40);
  const verifyScore = background.verificationScore * 0.4;
  const ventureBonus = background.priorVentures.toLowerCase().includes("successful") ? 15 : 8;
  return Math.min(Math.round(expScore + verifyScore + ventureBonus), 98);
}
