/**
 * Maps Entrepreneur Pitch wizard inputs → Firestore collections consumed by the Investor dashboard.
 *
 * Collections (read by assembleStartupIdea / subscribeToPitchedIdeaById):
 *   investment_ideas | stage1_data | stage2_data | stage3_data
 *
 * Investor UI references:
 *   Stage 1 — IdeaStage1Panel (stage1.*, stage3.socialProof.lookForChecklist)
 *   Stage 2 — IdeaStage2Panel (stage2.*)
 *   Stage 3 — IdeaStage3Panel, InvestmentAgreementModal (stage3.legalAgreementText, sampleProduct*)
 *   Feed    — InvestorIdeasFeed (startupTitle, description, stage1.expectedRoi, stage1.equityOffered, stage2.*)
 */
import type {
  StartupIdeaStage1,
  StartupIdeaStage2,
  ProofImage,
} from "@/data/startupIdeas";
import { buildStage3For } from "@/data/stage3Data";
import type { StartupIdeaStage3 } from "@/data/stage3Data";

export const PITCH_CATEGORIES = [
  "Rice & Agriculture",
  "Textile & Apparel",
  "Food & Beverage",
  "Tech / SaaS",
  "Retail & E-commerce",
  "Health & Wellness",
  "Logistics & Transport",
  "EdTech",
  "Healthcare",
  "Other",
] as const;

export type PitchCategory = (typeof PITCH_CATEGORIES)[number];

/** Wizard Step 1 — maps to investment_ideas + stage1_data (IdeaStage1Panel) */
export type PitchStage1Input = {
  ideaTitle: string;
  category: PitchCategory;
  description: string;
  problemSolution: string;
  requiredInvestmentPkr: number;
  equityPercent: number;
  expectedRoiPercent: number;
};

/** Wizard Step 2 — maps to stage2_data (IdeaStage2Panel) */
export type PitchStage2Input = {
  productImages: string[];
  setupPhotos: string[];
  customerLedgerUrl?: string;
  customerBaseSize: string;
  marketLocation?: string;
  marketSummary?: string;
  founderYearsExperience?: number;
  founderPriorVentures?: string;
  founderEducation?: string;
  verificationScore?: number;
};

/** Wizard Step 3 — maps to stage3_data (IdeaStage3Panel, InvestmentAgreementModal) */
export type PitchStage3Input = {
  agreementText: string;
  sampleProductName?: string;
  sampleProductPricePkr?: number;
  agreementPdfUrl?: string;
};

export type PitchIdeaPayload = {
  entrepreneurUid: string;
  founderName: string;
  stage1: PitchStage1Input;
  stage2: PitchStage2Input;
  stage3: PitchStage3Input;
  /** Optional user-edited profit projection (expense breakdown, valuation, etc.) */
  projections?: ProfitProjection;
};

export type ProfitProjection = {
  profitSharingPercent: string;
  ebitdaEstimate: string;
  suggestedProfitMarginPercent: number;
  currentValuationPkr: number;
  expenseBreakdown: { label: string; amountPkr: number; color: string }[];
  investmentFormula: {
    totalRaisePkr: number;
    maxEquityPercent: number;
    projectedAnnualReturnRate: number;
  };
};

const CATEGORY_TO_INDUSTRY: Record<PitchCategory, string> = {
  "Rice & Agriculture": "Agrotech",
  "Textile & Apparel": "Retail & E-commerce",
  "Food & Beverage": "Food & Beverage",
  "Tech / SaaS": "SaaS / Tech",
  "Retail & E-commerce": "Retail & E-commerce",
  "Health & Wellness": "Health & Wellness",
  "Logistics & Transport": "Logistics & Transport",
  EdTech: "EdTech",
  Healthcare: "Healthcare",
  Other: "SaaS / Tech",
};

const INDUSTRY_ACCENTS: Record<string, string> = {
  "Food & Beverage": "#fef3c7",
  "SaaS / Tech": "#e0f2fe",
  "Retail & E-commerce": "#fce7f3",
  Agrotech: "#ecfccb",
  "Health & Wellness": "#d1fae5",
  "Logistics & Transport": "#f1f5f9",
  EdTech: "#e0f2fe",
  Healthcare: "#ccfbf1",
};

export type InvestmentIdeaDoc = {
  id: string;
  entrepreneurUid: string;
  founderName: string;
  startupTitle: string;
  industry: string;
  category: PitchCategory;
  description: string;
  accent: string;
  requiredInvestmentPkr: number;
  equityPercent: number;
  expectedRoiPercent: number;
  status: "live";
};

export type Stage1DataDoc = StartupIdeaStage1 & {
  ideaId: string;
  problemSolution: string;
};

export type Stage2DataDoc = StartupIdeaStage2 & {
  ideaId: string;
  customerLedgerUrl?: string;
  suggestedProfitMarginPercent: number;
};

export type Stage3DataDoc = StartupIdeaStage3 & {
  ideaId: string;
  agreementPdfUrl?: string;
};

export function mapCategoryToIndustry(category: PitchCategory): string {
  return CATEGORY_TO_INDUSTRY[category];
}

export function buildInvestmentIdeaDoc(
  ideaId: string,
  entrepreneurUid: string,
  founderName: string,
  stage1: PitchStage1Input,
): InvestmentIdeaDoc {
  const industry = mapCategoryToIndustry(stage1.category);
  return {
    id: ideaId,
    entrepreneurUid,
    founderName,
    startupTitle: stage1.ideaTitle.trim(),
    industry,
    category: stage1.category,
    description: stage1.description.trim(),
    accent: INDUSTRY_ACCENTS[industry] ?? "#FFF8E1",
    requiredInvestmentPkr: stage1.requiredInvestmentPkr,
    equityPercent: stage1.equityPercent,
    expectedRoiPercent: stage1.expectedRoiPercent,
    status: "live",
  };
}

/** Stage 1 fields shown in IdeaStage1Panel financial terms grid */
export function buildStage1DataDoc(
  ideaId: string,
  stage1: PitchStage1Input,
  projections: ProfitProjection,
): Stage1DataDoc {
  const industry = mapCategoryToIndustry(stage1.category);
  const equityOffered = `${stage1.equityPercent}% for PKR ${stage1.requiredInvestmentPkr.toLocaleString()}`;
  const ideaDescription = [stage1.description.trim(), stage1.problemSolution.trim()]
    .filter(Boolean)
    .join("\n\n");

  return {
    ideaId,
    ideaDescription,
    expectedRoi: `${stage1.expectedRoiPercent}% annually`,
    profitSharingPercent: projections.profitSharingPercent,
    ebitdaEstimate: projections.ebitdaEstimate,
    equityOffered,
    industryField: `${stage1.category} — ${industry}`,
    problemSolution: stage1.problemSolution.trim(),
  };
}

function viabilityFromRoi(roiPercent: number): StartupIdeaStage2["marketInsight"]["viabilityRating"] {
  if (roiPercent >= 20) return "High";
  if (roiPercent >= 12) return "Medium";
  return "Moderate";
}

/** Stage 2 fields shown in IdeaStage2Panel (capital, gallery, calculator formula) */
export function buildStage2DataDoc(
  ideaId: string,
  stage1: PitchStage1Input,
  stage2: PitchStage2Input,
  projections: ProfitProjection,
  proofGallery: ProofImage[],
  customerLedgerUrl?: string,
): Stage2DataDoc {
  const location = stage2.marketLocation?.trim() || "Pakistan";
  const demandGrowthYoY = Math.min(25, Math.round(stage1.expectedRoiPercent * 0.8));

  return {
    ideaId,
    totalCapitalRequiredPkr: stage1.requiredInvestmentPkr,
    expenseBreakdown: projections.expenseBreakdown,
    customerBaseSize:
      stage2.customerBaseSize.trim() ||
      (customerLedgerUrl
        ? "Customer ledger on file — verified upload"
        : "Growing customer base — founder disclosed"),
    currentValuationPkr: projections.currentValuationPkr,
    investmentFormula: projections.investmentFormula,
    founderBackground: {
      yearsExperience: stage2.founderYearsExperience ?? 0,
      priorVentures: stage2.founderPriorVentures?.trim() || "Disclosed by founder at pitch",
      education: stage2.founderEducation?.trim() || "Verified via SmartBiz entrepreneur onboarding",
      verificationScore: stage2.verificationScore ?? 85,
    },
    marketInsight: {
      location,
      demandGrowthYoY,
      marketSummary:
        stage2.marketSummary?.trim() ||
        `Entrepreneur-pitched opportunity in ${stage1.category} (${location}) with ${stage1.expectedRoiPercent}% projected ROI.`,
      viabilityRating: viabilityFromRoi(stage1.expectedRoiPercent),
    },
    proofGallery,
    customerLedgerUrl,
    suggestedProfitMarginPercent: projections.suggestedProfitMarginPercent,
  };
}

/** Stage 3 fields shown in IdeaStage3Panel & InvestmentAgreementModal */
export function buildStage3DataDoc(
  ideaId: string,
  founderName: string,
  stage1: PitchStage1Input,
  stage3: PitchStage3Input,
  stage1Doc: Stage1DataDoc,
  stage2Doc: Stage2DataDoc,
): Stage3DataDoc {
  const industry = mapCategoryToIndustry(stage1.category);
  const ideaBase = {
    startupTitle: stage1.ideaTitle.trim(),
    founderName,
    industry,
    stage1: stage1Doc,
    stage2: stage2Doc,
  };

  const templateStage3 = buildStage3For(ideaBase);
  const legalAgreementText =
    stage3.agreementText.trim() || templateStage3.legalAgreementText;

  const sampleProductName =
    stage3.sampleProductName?.trim() || templateStage3.sampleProductName;
  const sampleProductPricePkr =
    stage3.sampleProductPricePkr ?? templateStage3.sampleProductPricePkr;

  return {
    ideaId,
    legalAgreementText,
    milestones: templateStage3.milestones,
    sampleProductName,
    sampleProductPricePkr,
    socialProof: {
      ...templateStage3.socialProof,
      investorCount: 0,
      totalInvestedPkr: 0,
      previousInvestors: [],
      pastPayouts: [],
    },
    agreementPdfUrl: stage3.agreementPdfUrl,
  };
}

export type AssembledPitchDocuments = {
  investmentIdea: InvestmentIdeaDoc;
  stage1Data: Stage1DataDoc;
  stage2Data: Stage2DataDoc;
  stage3Data: Stage3DataDoc;
};

/** Single entry point: wizard payload → all four Firestore document shapes */
export function assemblePitchFirestoreDocuments(
  ideaId: string,
  payload: {
    entrepreneurUid: string;
    founderName: string;
    stage1: PitchStage1Input;
    stage2: PitchStage2Input;
    stage3: PitchStage3Input;
    projections: ProfitProjection;
    proofGallery: ProofImage[];
    customerLedgerUrl?: string;
  },
): AssembledPitchDocuments {
  const investmentIdea = buildInvestmentIdeaDoc(
    ideaId,
    payload.entrepreneurUid,
    payload.founderName,
    payload.stage1,
  );
  const stage1Data = buildStage1DataDoc(ideaId, payload.stage1, payload.projections);
  const stage2Data = buildStage2DataDoc(
    ideaId,
    payload.stage1,
    payload.stage2,
    payload.projections,
    payload.proofGallery,
    payload.customerLedgerUrl,
  );
  const stage3Data = buildStage3DataDoc(
    ideaId,
    payload.founderName,
    payload.stage1,
    payload.stage3,
    stage1Data,
    stage2Data,
  );

  return { investmentIdea, stage1Data, stage2Data, stage3Data };
}
