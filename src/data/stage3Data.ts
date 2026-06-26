import type { StartupIdeaStage1, StartupIdeaStage2 } from "@/data/startupIdeas";

export type Milestone = {
  id: string;
  label: string;
  status: "completed" | "active" | "pending";
};

export type StartupIdeaStage3 = {
  legalAgreementText: string;
  milestones: Milestone[];
  sampleProductName: string;
  sampleProductPricePkr: number;
  socialProof: {
    investorCount: number;
    totalInvestedPkr: number;
    previousInvestors: { name: string; amount: string; date: string }[];
    pastPayouts: { description: string; amount: string; date: string }[];
    coInvestors: { name: string; role: string }[];
    investorFeedback: { author: string; role: string; comment: string; rating: number }[];
    lookForChecklist: string[];
  };
};

type IdeaBase = {
  startupTitle: string;
  founderName: string;
  industry: string;
  stage1: StartupIdeaStage1;
  stage2: StartupIdeaStage2;
};

export function buildStage3For(idea: IdeaBase): StartupIdeaStage3 {
  const raise = idea.stage2.investmentFormula.totalRaisePkr;
  const equity = idea.stage1.equityOffered;
  const isFood = idea.industry === "Food & Beverage";

  const sampleProductName = isFood
    ? idea.startupTitle.includes("Bistro") || idea.startupTitle.includes("Brew")
      ? "Signature Tasting Box / Sample Cake Pack"
      : "Product Sample Pack"
    : `${idea.industry} Demo Kit`;

  return {
    legalAgreementText: `
SMARTBIZ GROW — INVESTMENT & ESCROW AGREEMENT
═══════════════════════════════════════════════

PARTIES
  Founder:    ${idea.founderName}
  Company:    ${idea.startupTitle}
  Investor:   [Investor Legal Name — to be filled on signing]

1. PURPOSE
   This Agreement governs the equity investment in ${idea.startupTitle}, a ${idea.stage1.industryField} venture, pursuant to SmartBiz Grow Stage 3 escrow settlement.

2. INVESTMENT TERMS (from Entrepreneur disclosure)
   • Expected ROI: ${idea.stage1.expectedRoi}
   • Profit Sharing: ${idea.stage1.profitSharingPercent}
   • EBITDA Projection: ${idea.stage1.ebitdaEstimate}
   • Equity Offer: ${equity}
   • Total Capital Raise Target: PKR ${raise.toLocaleString()}

3. ESCROW & MILESTONE RELEASE
   Funds deposited via JazzCash, EasyPaisa, or Card are held in SmartBiz Escrow. Release occurs upon verified milestone completion as tracked in the investor dashboard.

4. REPRESENTATIONS
   The Founder represents that all Stage 1 & Stage 2 disclosures, proof gallery uploads, and financial projections were prepared in good faith.

5. GOVERNING LAW
   This Agreement is governed by the laws of the Islamic Republic of Pakistan. Disputes resolved via SmartBiz arbitration panel.

6. SIGNATURES
   By clicking "Accept & Sign Agreement", both parties agree to be bound by these terms electronically under the Electronic Transactions Ordinance, 2002.

Prepared by: ${idea.founderName} · ${new Date().toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })}
`.trim(),
    milestones: [
      { id: "m1", label: "Agreement Signed", status: "pending" },
      { id: "m2", label: "Escrow Payment Received", status: "pending" },
      { id: "m3", label: "Sample Product Delivered", status: "pending" },
      { id: "m4", label: "Milestone 1 — Capital Deployed", status: "pending" },
      { id: "m5", label: "Q1 Investor Report", status: "pending" },
    ],
    sampleProductName,
    sampleProductPricePkr: isFood ? 2500 : 5000,
    socialProof: {
      investorCount: 12 + Math.floor(raise / 500000),
      totalInvestedPkr: Math.round(raise * 0.65),
      previousInvestors: [
        { name: "Karachi Angel Network", amount: `PKR ${Math.round(raise * 0.3).toLocaleString()}`, date: "Jan 2025" },
        { name: "Sindh Seed Fund", amount: `PKR ${Math.round(raise * 0.2).toLocaleString()}`, date: "Nov 2024" },
        { name: "Private Investor (NDA)", amount: `PKR ${Math.round(raise * 0.15).toLocaleString()}`, date: "Sep 2024" },
      ],
      pastPayouts: [
        { description: "Q4 Profit-share distribution", amount: "PKR 185,000", date: "Dec 2024" },
        { description: "Early investor bonus — milestone bonus", amount: "PKR 42,000", date: "Oct 2024" },
      ],
      coInvestors: [
        { name: "Ayesha Rahman", role: "Lead Angel · Food & Beverage" },
        { name: "VentureOne PK", role: "Syndicate Partner" },
        { name: "Hassan T.", role: `Co-investor · ${idea.stage2.marketInsight.location.split(",")[0]}` },
      ],
      investorFeedback: [
        {
          author: "Ayesha Rahman",
          role: "Lead Angel Investor",
          comment: `Strong founder-market fit. ${idea.startupTitle} has clear unit economics and the ${idea.stage1.expectedRoi} ROI projection looks conservative given local demand.`,
          rating: 5,
        },
        {
          author: "VentureOne PK",
          role: "Syndicate Partner",
          comment: `We co-invested after reviewing Stage 1 disclosures. Profit-sharing at ${idea.stage1.profitSharingPercent} is fair for this growth stage.`,
          rating: 4,
        },
        {
          author: "Hassan T.",
          role: "Private Investor",
          comment: `Transparent financials and verified proof gallery. ${idea.founderName} responds quickly to investor queries — a green flag.`,
          rating: 5,
        },
      ],
      lookForChecklist: [
        "Expected ROI vs. industry benchmarks",
        "Profit-sharing % and equity offered",
        "EBITDA projections & assumptions",
        "Founder background & verification score",
        "Previous investor track record",
        "Total capital already deployed",
      ],
    },
  };
}
