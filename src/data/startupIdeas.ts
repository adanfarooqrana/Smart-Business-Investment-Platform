import { buildStage3For } from "@/data/stage3Data";

export type ExpenseLine = {
  label: string;
  amountPkr: number;
  color: string;
};

export type ProofImage = {
  id: string;
  url: string;
  caption: string;
  type: "product" | "operations" | "facility";
};

export type StartupIdeaStage1 = {
  ideaDescription: string;
  expectedRoi: string;
  profitSharingPercent: string;
  ebitdaEstimate: string;
  equityOffered: string;
  industryField: string;
};

export type StartupIdeaStage2 = {
  totalCapitalRequiredPkr: number;
  expenseBreakdown: ExpenseLine[];
  customerBaseSize: string;
  currentValuationPkr: number;
  investmentFormula: {
    totalRaisePkr: number;
    maxEquityPercent: number;
    projectedAnnualReturnRate: number;
  };
  founderBackground: {
    yearsExperience: number;
    priorVentures: string;
    education: string;
    verificationScore: number;
  };
  marketInsight: {
    location: string;
    demandGrowthYoY: number;
    marketSummary: string;
    viabilityRating: "High" | "Medium" | "Moderate";
  };
  proofGallery: ProofImage[];
};

export type StartupIdeaStage3 = import("@/data/stage3Data").StartupIdeaStage3;

export type StartupIdea = {
  id: string;
  founderName: string;
  startupTitle: string;
  industry: string;
  description: string;
  accent: string;
  stage1: StartupIdeaStage1;
  stage2: StartupIdeaStage2;
  stage3: StartupIdeaStage3;
  /** Unix ms when pitched to Firebase */
  createdAt?: number;
  /** True when loaded live from founder pitch (RTDB investor_feed) */
  isFounderLive?: boolean;
};

type StartupIdeaRaw = Omit<StartupIdea, "stage3">;

const EXPENSE_COLORS = ["#F59E0B", "#FB923C", "#FBBF24", "#F97316", "#EAB308"];

function buildStage2(
  overrides: Partial<StartupIdeaStage2> & Pick<StartupIdeaStage2, "totalCapitalRequiredPkr" | "currentValuationPkr" | "investmentFormula">,
): StartupIdeaStage2 {
  const total = overrides.totalCapitalRequiredPkr;
  const defaultBreakdown: ExpenseLine[] = overrides.expenseBreakdown ?? [
    { label: "Equipment & Setup", amountPkr: Math.round(total * 0.35), color: EXPENSE_COLORS[0] },
    { label: "Rent & Facilities", amountPkr: Math.round(total * 0.25), color: EXPENSE_COLORS[1] },
    { label: "Staff & Operations", amountPkr: Math.round(total * 0.22), color: EXPENSE_COLORS[2] },
    { label: "Marketing & Launch", amountPkr: Math.round(total * 0.18), color: EXPENSE_COLORS[3] },
  ];

  return {
    customerBaseSize: "1,200+ active customers",
    founderBackground: {
      yearsExperience: 5,
      priorVentures: "1 prior venture — operational",
      education: "BBA / Business Management",
      verificationScore: 82,
    },
    marketInsight: {
      location: "Pakistan — Major Metro",
      demandGrowthYoY: 10,
      marketSummary: "Steady demand growth in this sector across urban Pakistan.",
      viabilityRating: "Medium",
    },
    proofGallery: [
      {
        id: "p1",
        url: "https://images.unsplash.com/photo-1556745757-8d76bdb6834a?auto=format&fit=crop&w=800&q=80",
        caption: "Operational workspace — entrepreneur verified upload",
        type: "operations",
      },
      {
        id: "p2",
        url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
        caption: "Product / service delivery in action",
        type: "product",
      },
      {
        id: "p3",
        url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
        caption: "Facility & infrastructure overview",
        type: "facility",
      },
    ],
    ...overrides,
    expenseBreakdown: overrides.expenseBreakdown ?? defaultBreakdown,
  };
}

const RAW_STARTUP_IDEAS: StartupIdeaRaw[] = [
  {
    id: "1",
    founderName: "Aanya Mehta",
    startupTitle: "Luna Bistro",
    industry: "Food & Beverage",
    description: "Farm-to-table café chain scaling three premium outlets across Karachi with verified 87/100 reputation score.",
    accent: "#fef3c7",
    stage1: {
      ideaDescription:
        "Luna Bistro is a premium farm-to-table café chain targeting urban professionals in Karachi. The model combines dine-in experience with a subscription meal-plan channel for corporate offices, leveraging verified supplier networks and a 87/100 SmartBiz reputation score to accelerate trust-based customer acquisition.",
      expectedRoi: "18% annually",
      profitSharingPercent: "12% of net operating profit",
      ebitdaEstimate: "PKR 4.2M – 5.8M (Year 2)",
      equityOffered: "15% for PKR 3.5M",
      industryField: "Food & Beverage — Premium Casual Dining & Custom Cakes",
    },
    stage2: buildStage2({
      totalCapitalRequiredPkr: 3_500_000,
      currentValuationPkr: 18_000_000,
      customerBaseSize: "2,400 meal-plan subscribers · 850 weekly dine-in guests",
      investmentFormula: {
        totalRaisePkr: 3_500_000,
        maxEquityPercent: 15,
        projectedAnnualReturnRate: 0.18,
      },
      expenseBreakdown: [
        { label: "Kitchen Equipment & Ovens", amountPkr: 980_000, color: EXPENSE_COLORS[0] },
        { label: "Clifton Outlet Rent (12 mo)", amountPkr: 875_000, color: EXPENSE_COLORS[1] },
        { label: "Pastry Chefs & Staff", amountPkr: 770_000, color: EXPENSE_COLORS[2] },
        { label: "Custom Cake Marketing", amountPkr: 525_000, color: EXPENSE_COLORS[3] },
        { label: "Inventory & Ingredients", amountPkr: 350_000, color: EXPENSE_COLORS[4] },
      ],
      founderBackground: {
        yearsExperience: 8,
        priorVentures: "2 ventures — Luna Home Cakes (successful exit)",
        education: "Culinary Arts Diploma + BBA (IoBM Karachi)",
        verificationScore: 91,
      },
      marketInsight: {
        location: "Karachi, Pakistan",
        demandGrowthYoY: 12,
        marketSummary:
          "The demand for customized cakes and premium café dining in Karachi is growing at 12% YoY. DHA and Clifton corridors show high footfall for artisan bakeries; corporate catering contracts add recurring B2B revenue.",
        viabilityRating: "High",
      },
      proofGallery: [
        {
          id: "luna-1",
          url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80",
          caption: "Signature custom fondant cakes — flagship product line",
          type: "product",
        },
        {
          id: "luna-2",
          url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80",
          caption: "Clifton outlet interior — dine-in & takeaway operations",
          type: "facility",
        },
        {
          id: "luna-3",
          url: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=800&q=80",
          caption: "Commercial kitchen & pastry production line",
          type: "operations",
        },
        {
          id: "luna-4",
          url: "https://images.unsplash.com/photo-1486427944299-195164d2e495?auto=format&fit=crop&w=800&q=80",
          caption: "Corporate catering setup — verified B2B channel",
          type: "operations",
        },
      ],
    }),
  },
  {
    id: "2",
    founderName: "Omar Farooq",
    startupTitle: "NorthGrid SaaS",
    industry: "SaaS / Tech",
    description: "B2B workflow automation for Pakistani SMEs — ARR growing 18% MoM with 40+ paying clients.",
    accent: "#e0f2fe",
    stage1: {
      ideaDescription:
        "NorthGrid SaaS provides workflow automation for Pakistani SMEs — invoicing, inventory sync, and payroll in one dashboard. With 40+ paying clients and 18% MoM ARR growth, the platform is positioned to capture the underserved mid-market segment before international competitors localize.",
      expectedRoi: "28% annually",
      profitSharingPercent: "8% of gross revenue (profit-share tranche)",
      ebitdaEstimate: "PKR 8.5M – 12M (Year 2)",
      equityOffered: "10% for PKR 6M",
      industryField: "SaaS / Tech — B2B Workflow Automation",
    },
    stage2: buildStage2({
      totalCapitalRequiredPkr: 6_000_000,
      currentValuationPkr: 42_000_000,
      customerBaseSize: "42 SME clients · 3,800 monthly active users",
      investmentFormula: { totalRaisePkr: 6_000_000, maxEquityPercent: 10, projectedAnnualReturnRate: 0.28 },
      marketInsight: {
        location: "Lahore & Islamabad, Pakistan",
        demandGrowthYoY: 22,
        marketSummary: "Pakistani SME digitization is accelerating — workflow SaaS adoption grew 22% YoY as FBR e-invoicing mandates drive software upgrades.",
        viabilityRating: "High",
      },
      founderBackground: {
        yearsExperience: 10,
        priorVentures: "1 successful SaaS bootstrap — acquired 2021",
        education: "BS Computer Science (LUMS)",
        verificationScore: 94,
      },
    }),
  },
  {
    id: "3",
    founderName: "Sana Iqbal",
    startupTitle: "Atelier Mira",
    industry: "Retail & E-commerce",
    description: "Curated luxury fashion marketplace connecting local designers to global buyers via smart logistics.",
    accent: "#fce7f3",
    stage1: {
      ideaDescription:
        "Atelier Mira is a curated luxury fashion marketplace bridging Pakistani designers with GCC and European buyers. Smart logistics partnerships reduce delivery times by 40%, while the platform takes a commission on each transaction plus premium listing fees for verified ateliers.",
      expectedRoi: "22% annually",
      profitSharingPercent: "15% of platform net margin",
      ebitdaEstimate: "PKR 3.1M – 4.5M (Year 2)",
      equityOffered: "12% for PKR 4M",
      industryField: "Retail & E-commerce — Luxury Fashion Marketplace",
    },
    stage2: buildStage2({
      totalCapitalRequiredPkr: 4_000_000,
      currentValuationPkr: 22_000_000,
      customerBaseSize: "18 designer partners · 6,200 registered buyers",
      investmentFormula: { totalRaisePkr: 4_000_000, maxEquityPercent: 12, projectedAnnualReturnRate: 0.22 },
      marketInsight: {
        location: "Karachi + GCC export corridor",
        demandGrowthYoY: 15,
        marketSummary: "Pakistani luxury fashion exports to GCC grew 15% YoY; curated marketplaces capture premium margins vs. unorganized social selling.",
        viabilityRating: "High",
      },
    }),
  },
  {
    id: "4",
    founderName: "Bilal Ahmed",
    startupTitle: "GreenHarvest Agrotech",
    industry: "Agrotech",
    description: "IoT-powered vertical farming kits for urban households — reducing water use by 70% with AI crop monitoring.",
    accent: "#dcfce7",
    stage1: {
      ideaDescription:
        "GreenHarvest sells IoT-enabled vertical farming kits for urban households and small restaurants. AI crop monitoring reduces water usage by 70% while subscription seed-and-nutrient refills create recurring revenue beyond the initial hardware sale.",
      expectedRoi: "16% annually",
      profitSharingPercent: "10% of net profit after hardware COGS",
      ebitdaEstimate: "PKR 2.4M – 3.6M (Year 2)",
      equityOffered: "18% for PKR 2.5M",
      industryField: "Agrotech — Urban Vertical Farming",
    },
    stage2: buildStage2({
      totalCapitalRequiredPkr: 2_500_000,
      currentValuationPkr: 12_000_000,
      customerBaseSize: "890 kit owners · 340 active refill subscribers",
      investmentFormula: { totalRaisePkr: 2_500_000, maxEquityPercent: 18, projectedAnnualReturnRate: 0.16 },
      marketInsight: {
        location: "Urban Punjab & Sindh",
        demandGrowthYoY: 18,
        marketSummary: "Urban home-gardening and restaurant herb sourcing demand rose 18% YoY amid rising produce prices and sustainability awareness.",
        viabilityRating: "Medium",
      },
    }),
  },
  {
    id: "5",
    founderName: "Zain Malik",
    startupTitle: "SwiftFleet Logistics",
    industry: "Logistics & Transport",
    description: "Last-mile delivery network for e-commerce sellers in Lahore, Islamabad, and Rawalpindi.",
    accent: "#f3e8ff",
    stage1: {
      ideaDescription:
        "SwiftFleet operates a last-mile delivery network for e-commerce sellers across Lahore, Islamabad, and Rawalpindi. Route-optimization AI and a gig-rider pool keep unit economics positive while same-day delivery SLAs differentiate from legacy couriers.",
      expectedRoi: "20% annually",
      profitSharingPercent: "11% of route-level net profit",
      ebitdaEstimate: "PKR 5.5M – 7.2M (Year 2)",
      equityOffered: "14% for PKR 5M",
      industryField: "Logistics & Transport — Last-Mile Delivery",
    },
    stage2: buildStage2({
      totalCapitalRequiredPkr: 5_000_000,
      currentValuationPkr: 28_000_000,
      customerBaseSize: "120 e-commerce merchant partners · 45 active riders",
      investmentFormula: { totalRaisePkr: 5_000_000, maxEquityPercent: 14, projectedAnnualReturnRate: 0.2 },
      marketInsight: {
        location: "Lahore · Islamabad · Rawalpindi",
        demandGrowthYoY: 24,
        marketSummary: "E-commerce parcel volume in twin cities grew 24% YoY; same-day last-mile remains underserved vs. 2–3 day standard couriers.",
        viabilityRating: "High",
      },
    }),
  },
  {
    id: "6",
    founderName: "Hira Shah",
    startupTitle: "EduSpark Academy",
    industry: "EdTech",
    description: "AI-personalized STEM tutoring platform for grades 6–12 with 92% parent satisfaction rating.",
    accent: "#ffedd5",
    stage1: {
      ideaDescription:
        "EduSpark Academy delivers AI-personalized STEM tutoring for grades 6–12 via live sessions and adaptive practice modules. A 92% parent satisfaction rating and school partnership pipeline drive predictable enrollment cycles each academic term.",
      expectedRoi: "24% annually",
      profitSharingPercent: "9% of tuition net revenue",
      ebitdaEstimate: "PKR 3.8M – 5.1M (Year 2)",
      equityOffered: "11% for PKR 3M",
      industryField: "EdTech — K-12 STEM Tutoring",
    },
    stage2: buildStage2({
      totalCapitalRequiredPkr: 3_000_000,
      currentValuationPkr: 16_000_000,
      customerBaseSize: "680 enrolled students · 14 school partnerships",
      investmentFormula: { totalRaisePkr: 3_000_000, maxEquityPercent: 11, projectedAnnualReturnRate: 0.24 },
      marketInsight: {
        location: "Karachi & Hyderabad",
        demandGrowthYoY: 20,
        marketSummary: "Private STEM tutoring demand in Sindh grew 20% YoY driven by board exam competition and O/A-Level pipeline growth.",
        viabilityRating: "High",
      },
    }),
  },
  {
    id: "7",
    founderName: "Usman Raza",
    startupTitle: "Brick & Brew Roasters",
    industry: "Food & Beverage",
    description: "Specialty coffee roastery expanding wholesale B2B supply to hotels and corporate campuses nationwide.",
    accent: "#fef9c3",
    stage1: {
      ideaDescription:
        "Brick & Brew Roasters is a specialty coffee roastery scaling wholesale B2B supply to hotels and corporate campuses. Direct trade sourcing and in-house roasting give margin control that retail-only cafés cannot match, with contracts already signed with two hotel groups.",
      expectedRoi: "17% annually",
      profitSharingPercent: "13% of wholesale net profit",
      ebitdaEstimate: "PKR 3.5M – 4.8M (Year 2)",
      equityOffered: "16% for PKR 2.8M",
      industryField: "Food & Beverage — Specialty Coffee Wholesale",
    },
    stage2: buildStage2({
      totalCapitalRequiredPkr: 2_800_000,
      currentValuationPkr: 14_000_000,
      customerBaseSize: "2 hotel groups · 35 corporate accounts",
      investmentFormula: { totalRaisePkr: 2_800_000, maxEquityPercent: 16, projectedAnnualReturnRate: 0.17 },
      marketInsight: {
        location: "Nationwide B2B — hub in Lahore",
        demandGrowthYoY: 14,
        marketSummary: "Specialty coffee wholesale to hospitality grew 14% YoY as hotels upgrade F&B offerings post-tourism recovery.",
        viabilityRating: "Medium",
      },
    }),
  },
  {
    id: "8",
    founderName: "Fatima Noor",
    startupTitle: "MediConnect PK",
    industry: "HealthTech",
    description: "Telehealth platform linking rural clinics with specialist doctors — 15k consultations completed.",
    accent: "#ccfbf1",
    stage1: {
      ideaDescription:
        "MediConnect PK links rural clinics with specialist doctors via telehealth — 15,000 consultations completed to date. Revenue comes from clinic subscriptions, per-consultation fees, and government partnership grants for underserved districts.",
      expectedRoi: "19% annually",
      profitSharingPercent: "10% of net operating profit",
      ebitdaEstimate: "PKR 6M – 9M (Year 2)",
      equityOffered: "13% for PKR 7M",
      industryField: "HealthTech — Rural Telehealth",
    },
    stage2: buildStage2({
      totalCapitalRequiredPkr: 7_000_000,
      currentValuationPkr: 35_000_000,
      customerBaseSize: "85 rural clinics · 15,000+ consultations completed",
      investmentFormula: { totalRaisePkr: 7_000_000, maxEquityPercent: 13, projectedAnnualReturnRate: 0.19 },
      marketInsight: {
        location: "Rural Sindh & South Punjab",
        demandGrowthYoY: 16,
        marketSummary: "Rural telehealth adoption grew 16% YoY with government digital health initiatives and specialist shortage in tier-3 districts.",
        viabilityRating: "High",
      },
      founderBackground: {
        yearsExperience: 12,
        priorVentures: "Healthcare NGO founder — 8 years",
        education: "MBBS + MPH (Public Health)",
        verificationScore: 96,
      },
    }),
  },
];

export const STARTUP_IDEAS: StartupIdea[] = RAW_STARTUP_IDEAS.map((idea) => ({
  ...idea,
  stage3: buildStage3For(idea),
}));

export function getStartupIdeaById(id: string): StartupIdea | undefined {
  return STARTUP_IDEAS.find((idea) => idea.id === id);
}

/** Merge entrepreneur-pitched ideas (newest first) with seeded static dossiers. */
export function mergeStartupIdeas(
  staticIdeas: StartupIdea[],
  pitchedIdeas: StartupIdea[],
): StartupIdea[] {
  const staticIds = new Set(staticIdeas.map((i) => i.id));
  const uniquePitched = pitchedIdeas
    .filter((p) => !staticIds.has(p.id))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return [...uniquePitched, ...staticIdeas];
}

export function isFounderPitchedIdea(idea: StartupIdea): boolean {
  return idea.isFounderLive === true || idea.id.startsWith("pitch-");
}
