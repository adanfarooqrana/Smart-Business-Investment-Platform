import type { StartupIdea } from "@/data/startupIdeas";
import { computeFounderConfidenceScore, formatPkr } from "@/lib/investmentCalculator";

export type InvestorStage = 1 | 2;

export type AiChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  flaggedTerm?: string;
};

export type AiResponseResult = {
  reply: string;
  detectedTerm?: string;
  shouldFlagForFounder: boolean;
  flagMessage?: string;
  flagStage?: "Stage 1" | "Stage 2";
};

const INDUSTRY_BENCHMARKS: Record<string, { roiMin: number; roiMax: number; equityTypical: string }> = {
  "Food & Beverage": { roiMin: 12, roiMax: 22, equityTypical: "8–15%" },
  "SaaS / Tech": { roiMin: 20, roiMax: 40, equityTypical: "10–20%" },
  "Retail & E-commerce": { roiMin: 15, roiMax: 28, equityTypical: "10–18%" },
  Agrotech: { roiMin: 14, roiMax: 24, equityTypical: "12–20%" },
  "Logistics & Transport": { roiMin: 16, roiMax: 26, equityTypical: "10–16%" },
  EdTech: { roiMin: 18, roiMax: 30, equityTypical: "8–15%" },
  HealthTech: { roiMin: 15, roiMax: 25, equityTypical: "10–18%" },
};

function parseRoiPercent(roi: string): number {
  const match = roi.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

function detectTerm(message: string, stage: InvestorStage): string | undefined {
  const lower = message.toLowerCase();
  if (stage === 2) {
    if (lower.includes("valuation")) return "Business Valuation";
    if (lower.includes("capital") || lower.includes("money") || lower.includes("fund")) return "Capital Requirement";
    if (lower.includes("customer") || lower.includes("base")) return "Customer Base";
    if (lower.includes("calculator") || lower.includes("equity") && lower.includes("invest")) return "Investment Calculator";
    if (lower.includes("market") || lower.includes("viability") || lower.includes("demand")) return "Market Viability";
    if (lower.includes("confidence") || lower.includes("founder") || lower.includes("background")) return "Founder Confidence";
    if (lower.includes("proof") || lower.includes("gallery") || lower.includes("photo")) return "Proof Gallery";
    if (lower.includes("expense") || lower.includes("breakdown")) return "Expense Breakdown";
  }
  if (lower.includes("roi") || lower.includes("return")) return "Expected ROI";
  if (lower.includes("profit") && lower.includes("shar")) return "Profit Sharing";
  if (lower.includes("ebitda")) return "EBITDA Estimate";
  if (lower.includes("equity")) return "Equity Offered";
  if (lower.includes("industry") || lower.includes("field") || lower.includes("sector")) return "Industry Field";
  if (lower.includes("idea") || lower.includes("description") || lower.includes("business model")) return "Idea Description";
  return undefined;
}

function wantsFounderClarification(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("tell the founder") ||
    lower.includes("ask the founder") ||
    lower.includes("clarify this") ||
    lower.includes("clarify that") ||
    lower.includes("flag this") ||
    lower.includes("notify founder") ||
    lower.includes("founder to clarify")
  );
}

function generateStage2Response(
  userMessage: string,
  idea: StartupIdea,
  investorName: string,
  activeTerm?: string,
): AiResponseResult {
  const lower = userMessage.toLowerCase();
  const s2 = idea.stage2;
  const term = activeTerm || detectTerm(userMessage, 2) || "Market Viability";
  const confidence = computeFounderConfidenceScore(s2.founderBackground);
  const flagStage = "Stage 2" as const;

  if (wantsFounderClarification(userMessage)) {
    return {
      reply: `I've flagged "${term}" and prepared a notification for ${idea.founderName}'s Entrepreneur dashboard — marked as "Query from Stage 2 Investor". They'll see your clarification request on their validation review queue.`,
      detectedTerm: term,
      shouldFlagForFounder: true,
      flagMessage: `Investor ${investorName} requests Stage 2 clarification on "${term}" for ${idea.startupTitle}. Concern: "${userMessage.trim()}"`,
      flagStage,
    };
  }

  const isBakeryOrCake =
    lower.includes("bakery") ||
    lower.includes("cake") ||
    lower.includes("café") ||
    lower.includes("cafe") ||
    idea.stage1.industryField.toLowerCase().includes("cake") ||
    idea.startupTitle.toLowerCase().includes("bistro");

  if (
    lower.includes("viability") ||
    lower.includes("viable") ||
    lower.includes("invest") && lower.includes("worth") ||
    (isBakeryOrCake && (lower.includes("good idea") || lower.includes("should i")))
  ) {
    const bakeryNote =
      isBakeryOrCake && idea.industry === "Food & Beverage"
        ? `The demand for customized cakes and premium café experiences in ${s2.marketInsight.location} is growing at ${s2.marketInsight.demandGrowthYoY}% YoY. Investing in this location holds a ${s2.marketInsight.viabilityRating.toLowerCase()} success probability — especially with ${idea.startupTitle}'s existing customer base of ${s2.customerBaseSize}. `
        : "";

    return {
      reply: `${bakeryNote}${s2.marketInsight.marketSummary} Overall viability rating: ${s2.marketInsight.viabilityRating}. Founder confidence score: ${confidence}/100 (${s2.founderBackground.yearsExperience} yrs experience, ${s2.founderBackground.priorVentures}).`,
      detectedTerm: "Market Viability",
      shouldFlagForFounder: false,
    };
  }

  if (lower.includes("confidence") || lower.includes("founder") && lower.includes("background")) {
    return {
      reply: `Founder Confidence Score: ${confidence}/100 for ${idea.founderName}. Background: ${s2.founderBackground.education}, ${s2.founderBackground.yearsExperience} years experience, ${s2.founderBackground.priorVentures}. InvestBiz verification: ${s2.founderBackground.verificationScore}/100. ${confidence >= 85 ? "Strong founder-market fit — above average for seed-stage deals in Pakistan." : confidence >= 70 ? "Solid profile — recommend validating operational proofs in the gallery." : "Moderate confidence — dig deeper into unit economics before committing."}`,
      detectedTerm: "Founder Confidence",
      shouldFlagForFounder: false,
    };
  }

  if (lower.includes("valuation") || lower.includes("worth")) {
    const impliedMultiple = (s2.currentValuationPkr / s2.totalCapitalRequiredPkr).toFixed(1);
    return {
      reply: `Current pre-money valuation: ${formatPkr(s2.currentValuationPkr)} against a capital ask of ${formatPkr(s2.totalCapitalRequiredPkr)} (${impliedMultiple}× raise). For ${idea.industry} in ${s2.marketInsight.location}, this is ${parseFloat(impliedMultiple) <= 6 ? "reasonable" : "on the higher side"} — cross-check against Year 2 EBITDA projections from Stage 1.`,
      detectedTerm: "Business Valuation",
      shouldFlagForFounder: false,
    };
  }

  if (lower.includes("capital") || lower.includes("expense") || lower.includes("breakdown") || lower.includes("where")) {
    const topExpense = s2.expenseBreakdown.reduce((a, b) => (a.amountPkr > b.amountPkr ? a : b));
    return {
      reply: `Total capital required: ${formatPkr(s2.totalCapitalRequiredPkr)}. Largest allocation: ${topExpense.label} at ${formatPkr(topExpense.amountPkr)}. Customer base: ${s2.customerBaseSize}. Expense breakdown is entrepreneur-uploaded and read-only — verify against proof gallery photos.`,
      detectedTerm: "Capital Requirement",
      shouldFlagForFounder: false,
    };
  }

  if (lower.includes("calculator") || lower.match(/\d[\d,]*\s*(pkr|rs)/)) {
    return {
      reply: `Use the calculator bar to model your entry. At full raise (${formatPkr(s2.investmentFormula.totalRaisePkr)}), max equity is ${s2.investmentFormula.maxEquityPercent}% with ${(s2.investmentFormula.projectedAnnualReturnRate * 100).toFixed(0)}% projected annual return on invested capital. Example: PKR 500,000 → ~${((500_000 / s2.investmentFormula.totalRaisePkr) * s2.investmentFormula.maxEquityPercent).toFixed(2)}% equity and ~${formatPkr(500_000 * s2.investmentFormula.projectedAnnualReturnRate)} projected profit.`,
      detectedTerm: "Investment Calculator",
      shouldFlagForFounder: false,
    };
  }

  if (lower.includes("market") || lower.includes("demand") || lower.includes("growth")) {
    return {
      reply: `Local market analysis (${s2.marketInsight.location}): ${s2.marketInsight.demandGrowthYoY}% YoY demand growth. ${s2.marketInsight.marketSummary} Viability: ${s2.marketInsight.viabilityRating}. Combined with founder score ${confidence}/100, this ranks ${s2.marketInsight.viabilityRating === "High" ? "above" : "at"} median for ${idea.industry} deals on InvestBiz.`,
      detectedTerm: "Market Viability",
      shouldFlagForFounder: false,
    };
  }

  if (lower.includes("proof") || lower.includes("gallery") || lower.includes("photo")) {
    return {
      reply: `${s2.proofGallery.length} operational proofs uploaded by the entrepreneur — product shots, facility photos, and machinery/operations images. Review these against the expense breakdown to validate capital allocation claims. You can zoom but not edit (read-only investor access).`,
      detectedTerm: "Proof Gallery",
      shouldFlagForFounder: false,
    };
  }

  if (lower.includes("customer")) {
    return {
      reply: `Existing customer base: ${s2.customerBaseSize}. This de-risks the ${formatPkr(s2.totalCapitalRequiredPkr)} raise — ${s2.marketInsight.viabilityRating} market viability in ${s2.marketInsight.location} supports scaling from this installed base.`,
      detectedTerm: "Customer Base",
      shouldFlagForFounder: false,
    };
  }

  return {
    reply: `Market Expert AI — Stage 2 analysis for ${idea.startupTitle}. Capital ask: ${formatPkr(s2.totalCapitalRequiredPkr)} · Valuation: ${formatPkr(s2.currentValuationPkr)} · Market growth: ${s2.marketInsight.demandGrowthYoY}% YoY · Founder confidence: ${confidence}/100. Ask about viability, valuation, expense breakdown, or local market demand.`,
    detectedTerm: term,
    shouldFlagForFounder: false,
  };
}

function generateStage1Response(
  userMessage: string,
  idea: StartupIdea,
  investorName: string,
  activeTerm?: string,
): AiResponseResult {
  const lower = userMessage.toLowerCase();
  const term = activeTerm || detectTerm(userMessage, 1) || "Idea Description";
  const benchmark = INDUSTRY_BENCHMARKS[idea.industry] ?? { roiMin: 15, roiMax: 25, equityTypical: "10–18%" };
  const roiValue = parseRoiPercent(idea.stage1.expectedRoi);

  if (wantsFounderClarification(userMessage)) {
    return {
      reply: `Understood. I've flagged "${term}" and prepared a notification for ${idea.founderName} on their Entrepreneur dashboard, marked as "Query from Stage 1 Investor". They'll receive your clarification request shortly.`,
      detectedTerm: term,
      shouldFlagForFounder: true,
      flagMessage: `Investor ${investorName} requests clarification on "${term}" for ${idea.startupTitle} (Stage 1). Original concern: "${userMessage.trim()}"`,
      flagStage: "Stage 1",
    };
  }

  if (lower.includes("roi") || lower.includes("return on investment") || lower.match(/\d+\s*%\s*roi/)) {
    const isGood = roiValue >= benchmark.roiMin && roiValue <= benchmark.roiMax + 5;
    const aboveAvg = roiValue > benchmark.roiMax;
    let assessment = "";
    if (aboveAvg) {
      assessment = `At ${idea.stage1.expectedRoi}, this exceeds the typical ${idea.industry} range of ${benchmark.roiMin}–${benchmark.roiMax}%. Strong upside, but verify assumptions — especially customer acquisition cost and ramp timeline.`;
    } else if (isGood) {
      assessment = `${idea.stage1.expectedRoi} sits within the ${idea.industry} benchmark band of ${benchmark.roiMin}–${benchmark.roiMax}%. For ${idea.startupTitle}, this is a solid, realistic target.`;
    } else {
      assessment = `${idea.stage1.expectedRoi} is below the ${idea.industry} median (${benchmark.roiMin}–${benchmark.roiMax}%). Consider negotiating better terms or asking the founder to justify lower returns.`;
    }
    return { reply: assessment, detectedTerm: "Expected ROI", shouldFlagForFounder: false };
  }

  if (lower.includes("profit") && (lower.includes("shar") || lower.includes("split"))) {
    return {
      reply: `The founder offers ${idea.stage1.profitSharingPercent}. In ${idea.industry}, profit-share deals typically complement equity. Evaluate whether this applies to gross or net profit.`,
      detectedTerm: "Profit Sharing",
      shouldFlagForFounder: false,
    };
  }

  if (lower.includes("ebitda")) {
    return {
      reply: `${idea.stage1.ebitdaEstimate} is the Year 2 EBITDA projection. Cross-check against ${idea.stage1.equityOffered} — implied valuation should align with ${idea.industry} multiples (typically 4–8× EBITDA).`,
      detectedTerm: "EBITDA Estimate",
      shouldFlagForFounder: false,
    };
  }

  if (lower.includes("equity")) {
    return {
      reply: `${idea.stage1.equityOffered} is on offer. Industry typical equity for ${idea.industry} is ${benchmark.equityTypical}. Compare against ${idea.stage1.ebitdaEstimate}.`,
      detectedTerm: "Equity Offered",
      shouldFlagForFounder: false,
    };
  }

  if (lower.includes("good") || lower.includes("fair") || lower.includes("reasonable")) {
    return {
      reply: `Based on Stage 1 terms — ${idea.stage1.expectedRoi} ROI, ${idea.stage1.equityOffered} equity, ${idea.stage1.ebitdaEstimate} EBITDA — the package is ${roiValue >= benchmark.roiMin ? "competitive for" : "conservative in"} ${idea.industry}. Proceed to Stage 2 for capital breakdown and market validation.`,
      detectedTerm: term,
      shouldFlagForFounder: false,
    };
  }

  return {
    reply: `Analyzing ${idea.startupTitle} Stage 1: ROI ${idea.stage1.expectedRoi}, profit share ${idea.stage1.profitSharingPercent}, EBITDA ${idea.stage1.ebitdaEstimate}, equity ${idea.stage1.equityOffered}. Ask about any term, or switch to Stage 2 for market expert analysis.`,
    detectedTerm: term,
    shouldFlagForFounder: false,
  };
}

export function generateInvestorAiResponse(
  userMessage: string,
  idea: StartupIdea,
  investorName: string,
  stage: InvestorStage,
  activeTerm?: string,
): AiResponseResult {
  if (stage === 2) {
    return generateStage2Response(userMessage, idea, investorName, activeTerm);
  }
  return generateStage1Response(userMessage, idea, investorName, activeTerm);
}

export function buildWelcomeMessage(idea: StartupIdea, stage: InvestorStage): AiChatMessage {
  if (stage === 2) {
    const confidence = computeFounderConfidenceScore(idea.stage2.founderBackground);
    return {
      id: "welcome",
      role: "assistant",
      content: `Market Expert AI online — analyzing ${idea.startupTitle} Stage 2 validation data for ${idea.stage2.marketInsight.location}. Founder confidence: ${confidence}/100. Ask about market viability (e.g. "Is this bakery idea viable in Karachi?"), valuation, capital breakdown, or use the investment calculator.`,
    };
  }
  return {
    id: "welcome",
    role: "assistant",
    content: `Hello! I'm your Investor Intelligent AI, pre-loaded with ${idea.startupTitle}'s Stage 1 financial terms. Ask me anything — e.g. "Is ${idea.stage1.expectedRoi} ROI good for ${idea.industry}?" — or say "Tell the founder to clarify the equity terms."`,
  };
}

export function getAiTitle(stage: InvestorStage): string {
  return stage === 2 ? "Market Expert AI" : "Investor Intelligent AI";
}
