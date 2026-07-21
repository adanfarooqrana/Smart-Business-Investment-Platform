import { useState, useEffect } from "react";
import { auth } from "@/firebase";
import { syncEscrowPaymentToFirebase } from "@/services/moneyManagementService";
import { normalizeComments } from "@/lib/communityPostUtils";

export type Role = "guest" | "business" | "investor" | "consultant" | "entrepreneur";

export type CommunityComment = {
  author: string;
  avatarColor: string;
  time: string;
  content: string;
};

export type PackagingQuote = {
  id: string;
  supplierName: string;
  avatarColor: string;
  price: string;
  timeline: string;
  accepted?: boolean;
};

export type CommunityPost = {
  id: string;
  author: string;
  /** Personal display name (founder name, or owner name for business) */
  authorName?: string;
  /** Business store name — shown with authorName for business posts */
  businessName?: string;
  role: "business" | "consultant" | "investor" | "admin" | "guest" | "system" | "entrepreneur" | "community_member";
  badge?: "Verified Consultant" | "Business Owner" | "Investor" | "Admin" | "Guest" | "Founder" | "Community Member";
  category?: string;
  tag?: string;
  avatarColor: string;
  time: string;
  title: string;
  content: string;
  photoType?: string; // "team" | "chart" | "coffee" | "office" | "stats"
  quote?: string;
  votes: number;
  comments: CommunityComment[];
  shares?: number;
  isStatsPost?: boolean;
  stats?: {
    score: number;
    reviewsCount: number;
    visitorsCount: number;
  };
  // Community upgrade fields
  isPrediction?: boolean;
  predictionTimer?: number;
  predictionExpiryTime?: number;
  predictionStatus?: "active" | "expired_pending" | "correct" | "incorrect";
  isMarketingBlueprint?: boolean;
  beforeMetrics?: string;
  afterMetrics?: string;
  isPackagingReq?: boolean;
  materialType?: string;
  packagingQuotes?: PackagingQuote[] | Record<string, PackagingQuote>;
  isProblem?: boolean;
  urgency?: "High" | "Medium" | "Low";
  nicheOwnersNotified?: string[];
  aiResolutionMock?: string;
  proofAttachment?: string;
  entrepreneurProblem?: boolean;
  entrepreneurTargetRole?: "wholesalers" | "business_owners" | "both";
  founderProblemId?: string;
};

export type CommunityUserProfile = {
  name: string;
  email: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  roleBadge: string;
  nameLastChanged?: number; // unix timestamp ms
  // Custom multi-role fields
  businessName?: string;
  businessWebsite?: string;
  consultancyName?: string;
  expertiseNiche?: string;
  certificationKey?: string;
  followerCount?: number;
  registeredSeminars?: string[];
};

export type ConsultantProfile = {
  name: string;
  email: string;
  phone: string;
  password?: string;
  specialty: string;
  experience: string;
  location: string;
  bio: string;
  isRegistered: boolean;
  isApproved: boolean;
  cnicFront?: string;
  cnicBack?: string;
  liveSelfie?: string;
  faceMatchScore?: number;
  // Wholesaler extras
  lat?: number;
  lng?: number;
  mapAddress?: string;
  seoKeywords?: string[];
  factoryImages?: string[];
  materials?: string[];
  profilePrompt?: string;
  aiSalesperson?: {
    name: string;
    active: boolean;
    persona: string;
    languages: string[];
  };
};

export type EntrepreneurLocalProfile = {
  uid?: string;
  profileId?: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  cnicFrontUrl?: string;
  paymentType?: "bank" | "jazzcash" | "easypaisa";
  bankAccountNumber?: string;
  mobileWalletNumber?: string;
  isRegistered: boolean;
  isApproved: boolean;
  metrics?: {
    investorsViewedIdea: number;
    activeSampleRequests: number;
    unreadMessagesCount: number;
  };
};

export type WholesalerProduct = {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  unit: string;
  quantity: number;
  tiers?: string;
};

export type WholesaleOrder = {
  id: string;
  productName: string;
  qty: number;
  unitPrice: number;
  total: number;
  customerName: string;
  customerCity: string;
  shipping: string;
  deliverBy: string;
  status: "done" | "verified";
  createdAt: number;
};

export type SalesConversation = {
  id: string;
  customerName: string;
  customerCity: string;
  language: "English" | "Urdu" | "Punjabi";
  sentiment: "positive" | "neutral" | "negative";
  isBig: boolean;
  lastMessage: string;
  unread: number;
  aiHandling: boolean;
  messages: { from: "customer" | "ai" | "seller"; text: string; at: number }[];
};

// Saved into a dedicated "storageinfo" store so the AI salesperson can recall it later
export type CallNote = {
  id: string;
  customerName: string;
  businessOwner: string;
  sessionId: string;
  sessionDate: number;
  notes: string;
  paymentNotes?: string[];
  attachments?: { name: string; url: string }[];
};

const DEFAULT_COMMUNITY_POSTS: CommunityPost[] = [];

export type Review = {
  id: string;
  name: string;
  rating: number;
  text: string;
  date: string;
};

export type Deal = {
  id: string;
  title: string;
  description: string;
  discount: string;
  visitors: number;
};

export type BusinessProfile = {
  uid?: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  category: string;
  subcategory: string;
  location: string;
  size: string;
  website: string;
  about: string;
  registerNumber: string;
  trademark: string;
  cnicFront: string; // Base64 or mock image url
  cnicBack: string; // Base64 or mock image url
  liveSelfie: string; // Base64 or mock image url
  isRegistered: boolean;
  isApproved: boolean; // Verification status
  profileCompletion: number; // 75% initially, 100% when social & landing page done
  landingPageCreated: boolean;
  landingPageTemplate: string;
  landingPageAbout: string;
  reviews: Review[];
  visitors: number;
  deals: Deal[];
  socialLinks: {
    instagram: string;
    facebook: string;
    twitter: string;
    linkedin: string;
  };
  score: number;
};

export type InvestorBudgetRange = "100k-500k PKR" | "500k-5M PKR" | "5M+ PKR";

export type InvestorProfile = {
  name: string;
  email: string;
  phone: string;
  password?: string;
  categories: string[];
  ticketSize: string;
  budgetRange: InvestorBudgetRange | "";
  location: string;
  strategy: string;
  isRegistered: boolean;
  isApproved: boolean;
  entityType?: "Company" | "Firm" | "Normal Person";
  aiConsultantToken?: string;
  cnicFront?: string;
  cnicBack?: string;
  liveSelfie?: string;
};

export function generateInvestorAiToken(): string {
  const segment =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()
      : Date.now().toString(36).toUpperCase();
  return `ICAI-${segment}`;
}

export type Investment = {
  id: string;
  businessName: string;
  amount: string;
  terms: string;
  type: "on-platform" | "off-platform";
  method: "self" | "platform";
  date: string;
  status: "completed" | "pending";
  ideaId?: string;
  amountPkr?: number;
  equityPercent?: number;
  paymentMethod?: "jazzcash" | "easypaisa" | "card";
  investedAt?: number;
  followUpDueAt?: number;
  followUpCompleted?: boolean;
};

export type EntrepreneurPayment = {
  id: string;
  startupTitle: string;
  investorName: string;
  amountPkr: number;
  amountDisplay: string;
  paymentMethod: string;
  timestamp: string;
  status: "received";
  equityPercent?: number;
};

export type WeeklyFollowUp = {
  id: string;
  ideaId: string;
  startupTitle: string;
  investorName: string;
  dueAt: number;
  status: "pending" | "completed";
  suggestedMetrics: string[];
};

export type SampleOrderStage = "approved" | "packed" | "sent";

export type SampleOrder = {
  id: string;
  ideaId: string;
  startupTitle: string;
  productName: string;
  investorName: string;
  address: string;
  city: string;
  phone: string;
  deliveryService: "tcs" | "leopard" | "postex" | "rider";
  deliveryServiceLabel: string;
  deliveryCostPkr: number;
  productPricePkr: number;
  notes: string;
  stage: SampleOrderStage;
  trackingId: string;
  createdAt: number;
};

export type InvestorFounderQuestion = {
  id: string;
  startupTitle: string;
  ideaId?: string;
  founderName?: string;
  question: string;
  aiAnswer: string;
  timestamp: string;
};

export type Stage1InvestorQuery = {
  id: string;
  ideaId: string;
  startupTitle: string;
  founderName: string;
  investorName: string;
  flaggedTerm: string;
  message: string;
  status: "pending" | "resolved";
  timestamp: string;
  stage: "Stage 1" | "Stage 2" | "Stage 3" | "Stage 4";
};

export type InvestorMessageType = "agreement_objection" | "general_query";

export type InvestorEntrepreneurMessage = {
  id: string;
  ideaId: string;
  startupTitle: string;
  founderName: string;
  investorName: string;
  stage: "Stage 1" | "Stage 2" | "Stage 3" | "Stage 4";
  type: InvestorMessageType;
  issueSection?: string;
  issuePoint: string;
  investorConcern: string;
  formattedPayload: string;
  status: "pending" | "answered" | "resolved";
  entrepreneurReply?: string;
  timestamp: string;
  repliedAt?: string;
};

export type Offer = {
  id: string;
  businessName: string;
  investorName: string;
  amount: string;
  terms: string;
  message: string;
  status: "pending" | "accepted" | "declined";
  timestamp: string;
  type: "ai" | "manual";
};

const DEFAULT_OFFERS: Offer[] = [
  {
    id: "off-1",
    businessName: "Luna Bistro",
    investorName: "Apex AI Ventures",
    amount: "$50,000",
    terms: "7% Equity, Advisory Seat",
    message: "We analyzed your growth metrics and restaurant score. Your local reviews show extremely high customer satisfaction. We would love to back your growth.",
    status: "pending",
    timestamp: "2 hours ago",
    type: "ai",
  },
  {
    id: "off-2",
    businessName: "Luna Bistro",
    investorName: "Blue Horizon Partners",
    amount: "$120,000",
    terms: "Convertible Note, 6% Cap",
    message: "Excellent footfall indicators and review momentum. We are ready to deploy to support your secondary location expansion.",
    status: "pending",
    timestamp: "Yesterday",
    type: "manual",
  },
];

const DEFAULT_INVESTMENTS: Investment[] = [];

const DEFAULT_REVIEWS: Review[] = [
  {
    id: "rev-1",
    name: "Aisha Khan",
    rating: 5,
    text: "Absolutely love the fresh, locally-sourced menu! The service is incredibly fast and standard of food is premium.",
    date: "Just now",
  },
  {
    id: "rev-2",
    name: "John Doe",
    rating: 4,
    text: "Great atmosphere and lovely organic dishes. Definitely coming back for their weekend brunches.",
    date: "1 day ago",
  },
];

export type TestimonialQuote = {
  id: string;
  name: string;
  role: string; // e.g. "Investor", "Business Owner"
  quote: string;
  imageUrl: string; // URL or data URI
  color: string; // hex/tailwind text color for the quote text
  createdAt: number;
};

export const DEFAULT_TESTIMONIALS: TestimonialQuote[] = [
  {
    id: "t-seed-1",
    name: "Ayesha Khan",
    role: "Business Owner",
    quote: "SmartBiz ne meri dukaan ko 3 mahine mein online le aaya. Sales double ho gayi!",
    imageUrl: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&q=80&auto=format&fit=crop",
    color: "#b45309",
    createdAt: Date.now() - 600000,
  },
  {
    id: "t-seed-2",
    name: "Bilal Ahmed",
    role: "Investor",
    quote: "AI matching se mujhe verified businesses milay. Best investment platform in Pakistan.",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&auto=format&fit=crop",
    color: "#0f766e",
    createdAt: Date.now() - 500000,
  },
  {
    id: "t-seed-3",
    name: "Fatima Noor",
    role: "Wholesaler",
    quote: "Packaging aur supply deals yahan se bohot affordable milay. Highly recommended!",
    imageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80&auto=format&fit=crop",
    color: "#9333ea",
    createdAt: Date.now() - 400000,
  },
  {
    id: "t-seed-4",
    name: "Usman Tariq",
    role: "Investor",
    quote: "Escrow system aur stage tracking ne trust build kiya. Funds safe hain.",
    imageUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80&auto=format&fit=crop",
    color: "#c2410c",
    createdAt: Date.now() - 300000,
  },
];

let globalState = {
  role: "guest" as Role,
  isLoggedIn: false,
  business: {
    name: "",
    email: "",
    phone: "",
    password: "",
    category: "",
    subcategory: "",
    location: "",
    size: "",
    website: "",
    about: "",
    registerNumber: "",
    trademark: "",
    cnicFront: "",
    cnicBack: "",
    liveSelfie: "",
    isRegistered: false,
    isApproved: false,
    profileCompletion: 75,
    landingPageCreated: false,
    landingPageTemplate: "",
    landingPageAbout: "",
    reviews: DEFAULT_REVIEWS,
    visitors: 240,
    deals: [],
    socialLinks: {
      instagram: "",
      facebook: "",
      twitter: "",
      linkedin: "",
    },
    score: 75,
  } as BusinessProfile,
  investor: {
    name: "",
    email: "",
    phone: "",
    password: "",
    categories: [],
    ticketSize: "",
    budgetRange: "",
    location: "",
    strategy: "",
    isRegistered: false,
    isApproved: true,
    entityType: "Normal Person",
    aiConsultantToken: "",
    cnicFront: "",
    cnicBack: "",
    liveSelfie: "",
  } as InvestorProfile,
  offers: DEFAULT_OFFERS as Offer[],
  investments: DEFAULT_INVESTMENTS as Investment[],
  communityPosts: DEFAULT_COMMUNITY_POSTS as CommunityPost[],
  consultant: {
    name: "",
    email: "",
    phone: "",
    password: "",
    specialty: "",
    experience: "",
    location: "",
    bio: "",
    isRegistered: false,
    isApproved: false,
    cnicFront: "",
    cnicBack: "",
    liveSelfie: "",
  } as ConsultantProfile,
  entrepreneur: {
    name: "",
    email: "",
    phone: "",
    password: "",
    isRegistered: false,
    isApproved: false,
    metrics: {
      investorsViewedIdea: 0,
      activeSampleRequests: 0,
      unreadMessagesCount: 0,
    },
  } as EntrepreneurLocalProfile,
  savedPosts: [] as string[],
  followedUsers: [] as string[],
  likedPosts: [] as string[],
  // username → follower count map (persisted)
  followerCounts: {} as Record<string, number>,
  currentUser: {
    name: "Anonymous Guest",
    email: "guest@smartbiz.ai",
    avatarUrl: "",
    coverUrl: "",
    bio: "Public guest exploring community insights.",
    roleBadge: "Guest Account",
  } as CommunityUserProfile,
  points: 120,
  weaknessFeedback: [
    { id: "w-1", text: "Customer reviews hint that regional shipping could be optimized for transit security.", date: "2 days ago" },
    { id: "w-2", text: "Product packaging materials need more robust eco-friendly options for high volume orders.", date: "4 days ago" }
  ] as { id: string; text: string; date: string }[],
  stage1InvestorQueries: [] as Stage1InvestorQuery[],
  entrepreneurPayments: [] as EntrepreneurPayment[],
  weeklyFollowUps: [
    {
      id: "wf-demo-atelier",
      ideaId: "3",
      startupTitle: "Atelier Mira",
      investorName: "Vanguard Ventures",
      dueAt: Date.now() - 86400000,
      status: "pending" as const,
      suggestedMetrics: [
        "Weekly revenue vs. projection",
        "Designer partner onboarding rate",
        "GCC export fulfillment SLA",
        "Platform commission growth",
        "Upcoming milestone timeline",
      ],
    },
  ] as WeeklyFollowUp[],
  signedAgreements: {} as Record<string, { ideaId: string; signedAt: number; investorName: string; signatureText?: string; certificateId?: string }>,
  agreementDrafts: {} as Record<string, { signatureText: string; agreeChecked: boolean; savedAt: number }>,
  sampleOrders: [] as SampleOrder[],
  founderQuestions: [] as InvestorFounderQuestion[],
  investorEntrepreneurMessages: [] as InvestorEntrepreneurMessage[],
  testimonialQuotes: DEFAULT_TESTIMONIALS as TestimonialQuote[],
  wholesalerProducts: [] as WholesalerProduct[],
  wholesaleOrders: [] as WholesaleOrder[],
  salesConversations: [] as SalesConversation[],
  callNotes: [] as CallNote[],
};

const listeners: (() => void)[] = [];

function defaultEntrepreneurProfile(): EntrepreneurLocalProfile {
  return {
    name: "",
    email: "",
    phone: "",
    password: "",
    isRegistered: false,
    isApproved: false,
    metrics: {
      investorsViewedIdea: 0,
      activeSampleRequests: 0,
      unreadMessagesCount: 0,
    },
  };
}

/** Fix corrupted or partial localStorage so dashboards never crash on null profiles. */
export function repairAppState(): void {
  const e = globalState.entrepreneur;
  globalState.entrepreneur = {
    ...defaultEntrepreneurProfile(),
    ...(e && typeof e === "object" ? e : {}),
    metrics: {
      investorsViewedIdea: 0,
      activeSampleRequests: 0,
      unreadMessagesCount: 0,
      ...(e && typeof e === "object" && e.metrics && typeof e.metrics === "object" ? e.metrics : {}),
    },
  };

  if (!globalState.business || typeof globalState.business !== "object") {
    globalState.business = {
      name: "",
      email: "",
      phone: "",
      password: "",
      category: "",
      subcategory: "",
      location: "",
      size: "",
      website: "",
      about: "",
      registerNumber: "",
      trademark: "",
      isRegistered: false,
      isApproved: false,
      profileCompletion: 0,
      score: 75,
    };
  }
  if (!globalState.investor || typeof globalState.investor !== "object") {
    globalState.investor = {
      name: "",
      email: "",
      phone: "",
      password: "",
      categories: [],
      ticketSize: "",
      budgetRange: "",
      location: "",
      strategy: "",
      isRegistered: false,
      isApproved: true,
      entityType: "Normal Person",
      aiConsultantToken: "",
      cnicFront: "",
      cnicBack: "",
      liveSelfie: "",
    };
  }
  if (!globalState.consultant || typeof globalState.consultant !== "object") {
    globalState.consultant = {
      name: "",
      email: "",
      phone: "",
      password: "",
      specialty: "",
      experience: "",
      location: "",
      bio: "",
      isRegistered: false,
      isApproved: false,
      cnicFront: "",
      cnicBack: "",
      liveSelfie: "",
    };
  }
  if (!Array.isArray(globalState.followedUsers)) globalState.followedUsers = [];
  if (!Array.isArray(globalState.communityPosts)) globalState.communityPosts = DEFAULT_COMMUNITY_POSTS;
  if (!Array.isArray(globalState.stage1InvestorQueries)) globalState.stage1InvestorQueries = [];
  if (!Array.isArray(globalState.entrepreneurPayments)) globalState.entrepreneurPayments = [];
  if (!Array.isArray(globalState.sampleOrders)) globalState.sampleOrders = [];
  if (!Array.isArray(globalState.investorEntrepreneurMessages)) {
    globalState.investorEntrepreneurMessages = [];
  }
}

if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem("smartbiz_app_state_v2");
    if (saved) {
      globalState = { ...globalState, ...JSON.parse(saved) };
    }
    repairAppState();
    if (!globalState.communityPosts) {
      globalState.communityPosts = DEFAULT_COMMUNITY_POSTS;
    }
    // Drop legacy demo / seed community posts from older localStorage snapshots
    const DEMO_POST_IDS = new Set([
      "post-pred-1",
      "post-mkt-1",
      "post-pkg-1",
      "post-prob-1",
      "post-1",
      "demo-1",
      "demo-2",
      "demo-3",
    ]);
    if (Array.isArray(globalState.communityPosts)) {
      globalState.communityPosts = globalState.communityPosts.filter(
        (p) => p && !DEMO_POST_IDS.has(p.id) && !String(p.id).startsWith("demo-"),
      );
    }
    if (!globalState.likedPosts) {
      globalState.likedPosts = [];
    }
    if (!globalState.followerCounts) {
      globalState.followerCounts = {};
    }
    if (globalState.points === undefined) {
      globalState.points = 120;
    }
    if (!globalState.weaknessFeedback) {
      globalState.weaknessFeedback = [
        { id: "w-1", text: "Customer reviews hint that regional shipping could be optimized for transit security.", date: "2 days ago" },
        { id: "w-2", text: "Product packaging materials need more robust eco-friendly options for high volume orders.", date: "4 days ago" }
      ];
    }
    if (!globalState.stage1InvestorQueries) {
      globalState.stage1InvestorQueries = [];
    }
    if (!globalState.entrepreneurPayments) {
      globalState.entrepreneurPayments = [];
    }
    if (!globalState.weeklyFollowUps) {
      globalState.weeklyFollowUps = [
        {
          id: "wf-demo-atelier",
          ideaId: "3",
          startupTitle: "Atelier Mira",
          investorName: "Vanguard Ventures",
          dueAt: Date.now() - 86400000,
          status: "pending",
          suggestedMetrics: [
            "Weekly revenue vs. projection",
            "Designer partner onboarding rate",
            "GCC export fulfillment SLA",
            "Platform commission growth",
            "Upcoming milestone timeline",
          ],
        },
      ];
    }
    if (!globalState.signedAgreements) {
      globalState.signedAgreements = {};
    }
    if (!globalState.agreementDrafts) {
      globalState.agreementDrafts = {};
    }
    if (!globalState.sampleOrders) {
      globalState.sampleOrders = [];
    }
    if (!globalState.founderQuestions) {
      globalState.founderQuestions = [];
    }
    if (!globalState.investorEntrepreneurMessages) {
      globalState.investorEntrepreneurMessages = [];
    }
    if (!globalState.testimonialQuotes || globalState.testimonialQuotes.length === 0) {
      globalState.testimonialQuotes = DEFAULT_TESTIMONIALS;
    }
    if (!globalState.wholesalerProducts) {
      globalState.wholesalerProducts = [];
    }
    if (!globalState.wholesaleOrders) {
      globalState.wholesaleOrders = [];
    }
    if (!globalState.salesConversations) {
      globalState.salesConversations = [];
    }
    if (!globalState.callNotes) {
      globalState.callNotes = [];
    }
    // Merge in the dedicated storageinfo store if present
    try {
      const storageInfo = localStorage.getItem("storageinfo");
      if (storageInfo) {
        const parsed = JSON.parse(storageInfo) as CallNote[];
        if (Array.isArray(parsed) && parsed.length) {
          const ids = new Set(globalState.callNotes.map((n) => n.id));
          globalState.callNotes = [...parsed.filter((n) => !ids.has(n.id)), ...globalState.callNotes];
        }
      }
    } catch { /* ignore */ }
    if (!globalState.currentUser) {
      globalState.currentUser = {
        name: "Anonymous Guest",
        email: "guest@smartbiz.ai",
        avatarUrl: "",
        coverUrl: "",
        bio: "Public guest exploring community insights.",
        roleBadge: "Guest Account",
      };
    }
  } catch (e) {
    console.error("Failed to load state", e);
  }
}

function saveState() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("smartbiz_app_state_v2", JSON.stringify(globalState));
    } catch (e) {
      console.error("Failed to save state", e);
    }
  }
  listeners.forEach((l) => l());
}

/** Sync Firebase points into local app state (e.g. on auth login). */
export function setGlobalPoints(points: number) {
  globalState.points = points;
  saveState();
}

function formatCommunityTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function mapFirebaseCommunityPost(fp: Record<string, unknown> & { id: string }): CommunityPost {
  return {
    id: fp.id,
    author: String(fp.author ?? "u/anonymous"),
    authorName: fp.authorName as string | undefined,
    businessName: fp.businessName as string | undefined,
    role: (fp.role as CommunityPost["role"]) ?? "guest",
    badge: fp.badge as CommunityPost["badge"],
    category: fp.category as string | undefined,
    tag: fp.tag as string | undefined,
    avatarColor: String(fp.avatarColor ?? "bg-slate-600"),
    time: fp.createdAt ? formatCommunityTime(Number(fp.createdAt)) : "Recently",
    title: String(fp.title ?? ""),
    content: String(fp.content ?? ""),
    photoType: fp.photoType as string | undefined,
    quote: fp.quote as string | undefined,
    votes: Number(fp.votes ?? 0),
    comments: normalizeComments(fp.comments),
    shares: Number(fp.shares ?? 0),
    isStatsPost: fp.isStatsPost as boolean | undefined,
    stats: fp.stats as CommunityPost["stats"],
    isPrediction: fp.isPrediction as boolean | undefined,
    predictionExpiryTime: fp.predictionExpiryTime as number | undefined,
    predictionStatus: fp.predictionStatus as CommunityPost["predictionStatus"],
    isMarketingBlueprint: fp.isMarketingBlueprint as boolean | undefined,
    beforeMetrics: fp.beforeMetrics as string | undefined,
    afterMetrics: fp.afterMetrics as string | undefined,
    isPackagingReq: fp.isPackagingReq as boolean | undefined,
    materialType: fp.materialType as string | undefined,
    packagingQuotes: fp.packagingQuotes as CommunityPost["packagingQuotes"],
    isProblem: fp.isProblem as boolean | undefined,
    urgency: fp.urgency as CommunityPost["urgency"],
    nicheOwnersNotified: fp.nicheOwnersNotified as string[] | undefined,
    aiResolutionMock: fp.aiResolutionMock as string | undefined,
    proofAttachment: fp.proofAttachment as string | undefined,
    entrepreneurProblem: fp.entrepreneurProblem as boolean | undefined,
    entrepreneurTargetRole: fp.entrepreneurTargetRole as CommunityPost["entrepreneurTargetRole"],
    founderProblemId: fp.founderProblemId as string | undefined,
  };
}

function syncCommunityPostPayload(
  post: Omit<CommunityPost, "id" | "time" | "votes" | "comments" | "shares">,
) {
  return {
    author: post.author,
    authorName: post.authorName,
    businessName: post.businessName,
    role: post.role,
    badge: post.badge,
    category: post.category,
    tag: post.tag,
    avatarColor: post.avatarColor,
    title: post.title,
    content: post.content,
    photoType: post.photoType,
    quote: post.quote,
    isStatsPost: post.isStatsPost,
    stats: post.stats,
    isPrediction: post.isPrediction,
    predictionStatus: post.predictionStatus,
    predictionExpiryTime: post.predictionExpiryTime,
    isMarketingBlueprint: post.isMarketingBlueprint,
    beforeMetrics: post.beforeMetrics,
    afterMetrics: post.afterMetrics,
    isPackagingReq: post.isPackagingReq,
    materialType: post.materialType,
    packagingQuotes: post.packagingQuotes,
    isProblem: post.isProblem,
    urgency: post.urgency,
    nicheOwnersNotified: post.nicheOwnersNotified,
    aiResolutionMock: post.aiResolutionMock,
    proofAttachment: post.proofAttachment,
    entrepreneurProblem: post.entrepreneurProblem,
    entrepreneurTargetRole: post.entrepreneurTargetRole,
    founderProblemId: post.founderProblemId,
    votes: 1,
    shares: 0,
  };
}

export function useAppState() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const forceUpdate = () => setTick((t) => t + 1);
    listeners.push(forceUpdate);
    return () => {
      const idx = listeners.indexOf(forceUpdate);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  const setRole = (role: Role) => {
    globalState.role = role;
    saveState();
  };

  const setIsLoggedIn = (loggedIn: boolean) => {
    globalState.isLoggedIn = loggedIn;
    saveState();
  };

  const registerBusiness = (profile: Partial<BusinessProfile>) => {
    globalState.business = {
      ...globalState.business,
      ...profile,
      isRegistered: true,
      isApproved: true, // Auto-approve immediately to let users play sandbox directly!
      profileCompletion: 75, // Initial profile completion
    };
    globalState.role = "business";
    globalState.isLoggedIn = true; // Auto login!
    recalculateScore();
    saveState();
  };

  const approveBusiness = () => {
    globalState.business.isApproved = true;
    saveState();
  };

  const registerInvestor = (profile: Partial<InvestorProfile>) => {
    globalState.investor = {
      ...globalState.investor,
      ...profile,
      aiConsultantToken: profile.aiConsultantToken ?? generateInvestorAiToken(),
      isRegistered: true,
      isApproved: true,
    };
    globalState.role = "investor";
    globalState.isLoggedIn = true;
    saveState();
  };

  const updateBusinessProfile = (profile: Partial<BusinessProfile>) => {
    globalState.business = {
      ...globalState.business,
      ...profile,
    };
    recalculateScore();
    saveState();
  };

  const addReview = (review: Omit<Review, "id" | "date">) => {
    const newReview: Review = {
      ...review,
      id: "rev-" + Math.random().toString(36).substr(2, 9),
      date: "Just now",
    };
    globalState.business.reviews = [newReview, ...globalState.business.reviews];
    globalState.business.visitors += Math.floor(Math.random() * 5) + 1; // simulation increment
    recalculateScore();
    if (review.rating >= 4) {
      globalState.points = (globalState.points || 0) + 1;
    }
    saveState();
  };

  const addDeal = (deal: Omit<Deal, "id" | "visitors">) => {
    const newDeal: Deal = {
      ...deal,
      id: "deal-" + Math.random().toString(36).substr(2, 9),
      visitors: 0,
    };
    globalState.business.deals = [...globalState.business.deals, newDeal];
    recalculateScore();
    saveState();
  };

  const recordLandingPageVisit = () => {
    globalState.business.visitors += 1;
    if (globalState.business.deals.length > 0) {
      // randomly increment deal visits too
      globalState.business.deals = globalState.business.deals.map(d => ({
        ...d,
        visitors: d.visitors + 1
      }));
    }
    recalculateScore();
    saveState();
  };

  const updateSocialLinks = (links: { instagram?: string; facebook?: string; twitter?: string; linkedin?: string }) => {
    globalState.business.socialLinks = {
      ...globalState.business.socialLinks,
      ...links
    };
    recalculateScore();
    saveState();
  };

  const createLandingPage = (template: string, aboutText: string) => {
    globalState.business.landingPageCreated = true;
    globalState.business.landingPageTemplate = template;
    globalState.business.landingPageAbout = aboutText;
    recalculateScore();
    saveState();
  };

  const recalculateScore = () => {
    let score = 65; // Base reputation score

    // Reviews factor (Average rating out of 5 stars)
    const reviews = globalState.business.reviews;
    if (reviews.length > 0) {
      const avgRating = reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length;
      score += avgRating * 4; // Max +20 points
    }

    // Visitor counts
    const visitors = globalState.business.visitors;
    if (visitors > 200) score += 3;
    if (visitors > 500) score += 3;
    if (visitors > 1000) score += 4; // Max +10 points

    // Deals added (+5 points per active deal up to 10 points)
    const dealCount = globalState.business.deals.length;
    score += Math.min(dealCount * 5, 10);

    // Social Links connected (+3 points per social profile connected)
    const socials = globalState.business.socialLinks;
    let socialCount = 0;
    if (socials.instagram) socialCount++;
    if (socials.facebook) socialCount++;
    if (socials.twitter) socialCount++;
    if (socials.linkedin) socialCount++;
    score += socialCount * 2.5; // Max +10 points

    // Clamp score to 100 max
    globalState.business.score = Math.min(Math.round(score), 100);

    // Update Profile Completion (base is 75%, adding social media and landing page gets to 100%)
    let completion = 75;
    if (globalState.business.landingPageCreated) completion += 15;
    if (socialCount > 0) completion += 10;
    globalState.business.profileCompletion = Math.min(completion, 100);
  };

  const addOffer = (offer: Omit<Offer, "id" | "timestamp" | "status">) => {
    const newOffer: Offer = {
      ...offer,
      id: "off-" + Math.random().toString(36).substr(2, 9),
      status: "pending",
      timestamp: "Just now",
    };
    globalState.offers = [newOffer, ...globalState.offers];
    saveState();
  };

  const updateOfferStatus = (id: string, status: "accepted" | "declined") => {
    globalState.offers = globalState.offers.map((o) =>
      o.id === id ? { ...o, status } : o
    );
    saveState();
  };

  const addInvestment = (inv: Omit<Investment, "id" | "date" | "status">) => {
    const newInv: Investment = {
      ...inv,
      id: "inv-" + Math.random().toString(36).substr(2, 9),
      date: "Just now",
      status: "completed",
    };
    globalState.investments = [newInv, ...globalState.investments];
    saveState();
  };

  const recordEscrowPayment = (payload: {
    ideaId: string;
    startupTitle: string;
    founderName: string;
    investorName: string;
    amountPkr: number;
    equityPercent: number;
    paymentMethod: "jazzcash" | "easypaisa" | "card";
    terms: string;
    receiptFileName?: string;
  }) => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const amountDisplay = `PKR ${payload.amountPkr.toLocaleString()}`;

    addInvestment({
      businessName: payload.startupTitle,
      amount: amountDisplay,
      terms: payload.terms,
      type: "on-platform",
      method: "platform",
      ideaId: payload.ideaId,
      amountPkr: payload.amountPkr,
      equityPercent: payload.equityPercent,
      paymentMethod: payload.paymentMethod,
      investedAt: now,
      followUpDueAt: now + weekMs,
      followUpCompleted: false,
    });

    const payment: EntrepreneurPayment = {
      id: "ep-" + now,
      startupTitle: payload.startupTitle,
      investorName: payload.investorName,
      amountPkr: payload.amountPkr,
      amountDisplay,
      paymentMethod: payload.paymentMethod.toUpperCase(),
      timestamp: new Date().toLocaleString(),
      status: "received",
      equityPercent: payload.equityPercent,
    };
    globalState.entrepreneurPayments = [payment, ...(globalState.entrepreneurPayments || [])];

    const followUp: WeeklyFollowUp = {
      id: "wf-" + now,
      ideaId: payload.ideaId,
      startupTitle: payload.startupTitle,
      investorName: payload.investorName,
      dueAt: now + weekMs,
      status: "pending",
      suggestedMetrics: [
        "Weekly revenue vs. projection",
        "Customer acquisition this week",
        "Capital deployment status",
        "Operational blockers",
        "Upcoming milestone timeline",
      ],
    };
    globalState.weeklyFollowUps = [followUp, ...(globalState.weeklyFollowUps || [])];
    saveState();

    syncEscrowPaymentToFirebase({
      ideaId: payload.ideaId,
      founderName: payload.founderName,
      investorName: payload.investorName,
      startupTitle: payload.startupTitle,
      amountPkr: payload.amountPkr,
      equityPercent: payload.equityPercent,
      paymentMethod: payload.paymentMethod,
      receiptFileName: payload.receiptFileName,
    }).catch(() => {
      /* Firebase sync is best-effort; local state remains source of truth */
    });
  };

  const signIdeaAgreement = (
    ideaId: string,
    investorName: string,
    opts?: { signatureText?: string },
  ) => {
    const signedAt = Date.now();
    globalState.signedAgreements = {
      ...(globalState.signedAgreements || {}),
      [`${ideaId}-${investorName}`]: {
        ideaId,
        signedAt,
        investorName,
        signatureText: opts?.signatureText || investorName,
        certificateId: `SB-SIGN-${signedAt.toString(36).toUpperCase()}`,
      },
    };
    saveState();
  };

  const completeWeeklyFollowUp = (followUpId: string) => {
    globalState.weeklyFollowUps = (globalState.weeklyFollowUps || []).map((f) =>
      f.id === followUpId ? { ...f, status: "completed" as const } : f,
    );
    const followUp = globalState.weeklyFollowUps.find((f) => f.id === followUpId);
    if (followUp) {
      globalState.investments = globalState.investments.map((inv) =>
        inv.ideaId === followUp.ideaId ? { ...inv, followUpCompleted: true } : inv,
      );
    }
    saveState();
  };

  const saveAgreementDraft = (ideaId: string, investorName: string, draft: { signatureText: string; agreeChecked: boolean }) => {
    globalState.agreementDrafts = {
      ...(globalState.agreementDrafts || {}),
      [`${ideaId}-${investorName}`]: { ...draft, savedAt: Date.now() },
    };
    saveState();
  };

  const placeSampleOrder = (order: Omit<SampleOrder, "id" | "createdAt" | "stage" | "trackingId">) => {
    const id = "so-" + Date.now();
    const trackingId = `SB-TRK-${order.ideaId.toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const newOrder: SampleOrder = {
      ...order,
      id,
      trackingId,
      stage: "approved",
      createdAt: Date.now(),
    };
    globalState.sampleOrders = [newOrder, ...(globalState.sampleOrders || [])];
    saveState();
    return newOrder;
  };

  const advanceSampleOrderStage = (orderId: string) => {
    const stages: SampleOrderStage[] = ["approved", "packed", "sent"];
    globalState.sampleOrders = (globalState.sampleOrders || []).map((o) => {
      if (o.id !== orderId) return o;
      const idx = stages.indexOf(o.stage);
      if (idx < stages.length - 1) return { ...o, stage: stages[idx + 1] };
      return o;
    });
    saveState();
  };

  const askFounderQuestion = (payload: {
    startupTitle: string;
    ideaId?: string;
    founderName?: string;
    question: string;
  }) => {
    const answer = generateFounderAiAnswer(payload.startupTitle, payload.question, payload.founderName);
    const entry: InvestorFounderQuestion = {
      id: "fq-" + Date.now(),
      startupTitle: payload.startupTitle,
      ideaId: payload.ideaId,
      founderName: payload.founderName,
      question: payload.question,
      aiAnswer: answer,
      timestamp: new Date().toLocaleString("en-PK"),
    };
    globalState.founderQuestions = [entry, ...(globalState.founderQuestions || [])];
    saveState();
    return entry;
  };

  const addCommunityPost = (post: Omit<CommunityPost, "id" | "time" | "votes" | "comments" | "shares">) => {
    const localId = "post-" + Math.random().toString(36).substr(2, 9);
    const newPost: CommunityPost = {
      ...post,
      id: localId,
      time: "Just now",
      votes: 1,
      comments: [],
      shares: 0
    };
    globalState.communityPosts = [newPost, ...globalState.communityPosts];
    saveState();

    void import("@/services/firebaseService")
      .then(({ addCommunityPost: pushPost }) => pushPost(syncCommunityPostPayload(post)))
      .then((firebaseId) => {
        if (!firebaseId) return;
        globalState.communityPosts = globalState.communityPosts.map((p) =>
          p.id === localId ? { ...p, id: firebaseId } : p,
        );
        saveState();
      })
      .catch((err) => console.warn("Community post RTDB sync failed:", err));
  };

  const mergeCommunityPostsFromBackend = (
    firebasePosts: Array<Record<string, unknown> & { id: string }>,
  ) => {
    const mapped: CommunityPost[] = [];
    for (const fp of firebasePosts) {
      try {
        mapped.push(mapFirebaseCommunityPost(fp));
      } catch (err) {
        console.warn("Skipping malformed community post:", fp.id, err);
      }
    }
    const firebaseIds = new Set(mapped.map((p) => p.id));
    const pendingLocal = globalState.communityPosts.filter(
      (p) => p.id.startsWith("post-") && !firebaseIds.has(p.id),
    );
    globalState.communityPosts = [...mapped, ...pendingLocal];
    saveState();
  };

  const upvoteCommunityPost = (id: string, diff: number) => {
    globalState.communityPosts = globalState.communityPosts.map(p => {
      if (p.id === id) {
        return { ...p, votes: p.votes + diff };
      }
      return p;
    });
    saveState();

    void import("@/services/firebaseService")
      .then(({ upvoteCommunityPost: syncVote }) => syncVote(id, diff))
      .catch((err) => console.warn("Community vote RTDB sync failed:", err));
  };

  const addCommunityComment = (postId: string, comment: Omit<CommunityComment, "time">) => {
    const newComment: CommunityComment = {
      ...comment,
      time: "Just now"
    };
    globalState.communityPosts = globalState.communityPosts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: [...normalizeComments(p.comments), newComment]
        };
      }
      return p;
    });
    saveState();

    void import("@/services/firebaseService")
      .then(({ addCommunityComment: syncComment }) =>
        syncComment(postId, {
          author: comment.author,
          avatarColor: comment.avatarColor,
          content: comment.content,
        }),
      )
      .catch((err) => console.warn("Community comment RTDB sync failed:", err));
  };

  const shareBusinessStatsToCommunity = () => {
    const biz = globalState.business;
    const author = `u/${biz.name.toLowerCase().replace(/\s+/g, "_") || "local_owner"}`;
    const newPost: CommunityPost = {
      id: "post-" + Math.random().toString(36).substr(2, 9),
      author,
      role: "business",
      avatarColor: "bg-emerald-600",
      time: "Just now",
      title: `📈 Official reputation & growth scorecard shared by ${biz.name || "Ecosystem Partner"}!`,
      content: `We are verified members of the SmartBiz AI Ecosystem! Here is our current sandbox progress snapshot. We are open to wholesaling and investor inquiries.`,
      votes: 5,
      comments: [],
      isStatsPost: true,
      stats: {
        score: biz.score,
        reviewsCount: biz.reviews.length,
        visitorsCount: biz.visitors
      }
    };
    globalState.communityPosts = [newPost, ...globalState.communityPosts];
    saveState();
  };
  const registerConsultant = (profile: Partial<ConsultantProfile>) => {
    globalState.consultant = {
      ...globalState.consultant,
      ...profile,
      isRegistered: true,
      isApproved: true,
    };
    globalState.role = "consultant";
    globalState.isLoggedIn = true;
    saveState();
  };

  const registerEntrepreneur = (profile: Partial<EntrepreneurLocalProfile>) => {
    repairAppState();
    globalState.entrepreneur = {
      ...globalState.entrepreneur,
      ...profile,
      isRegistered: true,
      isApproved: true,
      metrics: profile.metrics ?? {
        investorsViewedIdea: 0,
        activeSampleRequests: 0,
        unreadMessagesCount: 0,
      },
    };
    globalState.role = "entrepreneur";
    globalState.isLoggedIn = true;
    saveState();
  };

  const toggleSavePost = (postId: string) => {
    if (!globalState.savedPosts) globalState.savedPosts = [];
    if (globalState.savedPosts.includes(postId)) {
      globalState.savedPosts = globalState.savedPosts.filter(id => id !== postId);
    } else {
      globalState.savedPosts = [...globalState.savedPosts, postId];
    }
    saveState();
  };

  const toggleFollowUser = (username: string) => {
    if (!globalState.followedUsers) globalState.followedUsers = [];
    if (!globalState.followerCounts) globalState.followerCounts = {};
    if (globalState.followedUsers.includes(username)) {
      globalState.followedUsers = globalState.followedUsers.filter(u => u !== username);
      // Decrement follower count for that user
      globalState.followerCounts[username] = Math.max(0, (globalState.followerCounts[username] || 1) - 1);
    } else {
      globalState.followedUsers = [...globalState.followedUsers, username];
      // Increment follower count for that user
      globalState.followerCounts[username] = (globalState.followerCounts[username] || 0) + 1;
    }
    saveState();
  };

  const getFollowersCount = (username: string): number => {
    return globalState.followerCounts?.[username] || 0;
  };

  const getFollowingCount = (): number => {
    return (globalState.followedUsers || []).length;
  };

  // Update display name with 30-day lock
  const updateUserName = (newName: string): { success: boolean; daysLeft?: number } => {
    const now = Date.now();
    const last = globalState.currentUser?.nameLastChanged;
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    if (last && now - last < THIRTY_DAYS) {
      const daysLeft = Math.ceil((THIRTY_DAYS - (now - last)) / (24 * 60 * 60 * 1000));
      return { success: false, daysLeft };
    }
    if (!globalState.currentUser) return { success: false };
    globalState.currentUser = {
      ...globalState.currentUser,
      name: newName.trim(),
      nameLastChanged: now,
    };
    saveState();
    return { success: true };
  };

  const toggleLikePost = (postId: string) => {
    if (!globalState.isLoggedIn) return;
    if (!globalState.likedPosts) globalState.likedPosts = [];
    const wasLiked = globalState.likedPosts.includes(postId);
    let voteDiff = 0;
    if (wasLiked) {
      globalState.likedPosts = globalState.likedPosts.filter(id => id !== postId);
      voteDiff = -1;
    } else {
      globalState.likedPosts = [...globalState.likedPosts, postId];
      voteDiff = 1;
    }
    globalState.communityPosts = globalState.communityPosts.map(p => {
      if (p.id === postId) {
        return { ...p, votes: Math.max(0, p.votes + voteDiff) };
      }
      return p;
    });
    saveState();

    const uid = globalState.entrepreneur?.uid || globalState.business?.email || "guest";
    void import("@/services/realtimeDataService")
      .then(({ togglePostLike }) => togglePostLike(postId, uid, wasLiked))
      .catch((err) => console.warn("Like RTDB sync failed:", err));
  };

  const deleteCommunityPost = (postId: string) => {
    globalState.communityPosts = globalState.communityPosts.filter((p) => p.id !== postId);
    if (globalState.likedPosts) {
      globalState.likedPosts = globalState.likedPosts.filter((id) => id !== postId);
    }
    if (globalState.savedPosts) {
      globalState.savedPosts = globalState.savedPosts.filter((id) => id !== postId);
    }
    saveState();
    void import("@/services/founderCommunityService")
      .then(({ deleteCommunityPostFromDb }) => deleteCommunityPostFromDb(postId))
      .catch((err) => console.warn("Community post delete RTDB sync failed:", err));
  };

  const registerCommunityMember = (
    username: string,
    selectedRole: Role,
    advancedFields?: {
      email?: string;
      businessName?: string;
      businessWebsite?: string;
      consultancyName?: string;
      expertiseNiche?: string;
      certificationKey?: string;
    }
  ) => {
    globalState.isLoggedIn = true;
    globalState.role = selectedRole;
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, "_") || "user";
    const formattedName = username.trim() || "Community Member";

    let email = advancedFields?.email || `${cleanUsername}@smartbiz.ai`;
    let roleBadge = "Community Member";
    let bio = "Community explorer. Connect with me for B2B advice and collaboration.";

    if (selectedRole === "business") {
      email = advancedFields?.email || `${cleanUsername}@brand.com`;
      roleBadge = "Business Owner";
      bio = `Business Owner. Sharing B2B strategies and seeking growth partnerships.`;
      globalState.business = {
        ...globalState.business,
        name: formattedName,
        email: email,
        isRegistered: true,
        isApproved: true,
        score: 80,
      };
    } else if (selectedRole === "consultant") {
      email = advancedFields?.email || `${cleanUsername}@consultant.com`;
      roleBadge = "Consultant";
      bio = `Certified B2B Consultant specialising in ${advancedFields?.expertiseNiche || "Growth Strategy"}. Ask me anything.`;
      globalState.consultant = {
        ...globalState.consultant,
        name: formattedName,
        email: email,
        specialty: advancedFields?.expertiseNiche || "Growth Strategy",
        experience: "3+ Years",
        isRegistered: true,
        isApproved: true,
      };
    } else {
      email = advancedFields?.email || `${cleanUsername}@gmail.com`;
      roleBadge = "Community Member";
      bio = "Active community member. Strategy enthusiast open to collaboration.";
    }

    globalState.currentUser = {
      name: formattedName,
      email,
      avatarUrl: "",
      coverUrl: "",
      bio,
      roleBadge,
      businessName: advancedFields?.businessName,
      businessWebsite: advancedFields?.businessWebsite,
      consultancyName: advancedFields?.consultancyName,
      expertiseNiche: advancedFields?.expertiseNiche,
      certificationKey: advancedFields?.certificationKey,
      followerCount: 12500, // Default to 12.5k to display Silver tier milestones!
      registeredSeminars: []
    };

    saveState();
  };

  const registerForSeminar = (seminarId: string) => {
    if (!globalState.currentUser) return;
    if (!globalState.currentUser.registeredSeminars) {
      globalState.currentUser.registeredSeminars = [];
    }
    if (!globalState.currentUser.registeredSeminars.includes(seminarId)) {
      globalState.currentUser.registeredSeminars = [
        ...globalState.currentUser.registeredSeminars,
        seminarId
      ];
    }
    saveState();
  };

  const updateCurrentUserProfile = (profile: Partial<CommunityUserProfile>) => {
    if (!globalState.currentUser) {
      globalState.currentUser = {
        name: "Anonymous Guest",
        email: "guest@smartbiz.ai",
        roleBadge: "Guest Account",
      };
    }
    globalState.currentUser = {
      ...globalState.currentUser,
      ...profile,
    };
    saveState();
  };

  const logoutCommunityUser = () => {
    globalState.isLoggedIn = false;
    globalState.role = "guest";
    globalState.currentUser = {
      name: "Anonymous Guest",
      email: "guest@smartbiz.ai",
      avatarUrl: "",
      coverUrl: "",
      bio: "Public guest exploring community insights.",
      roleBadge: "Guest Account",
    };
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("session_token");
      localStorage.removeItem("auth_token");
      sessionStorage.clear();
    }
    saveState();
  };

  const shareCommunityPost = (postId: string) => {
    globalState.communityPosts = globalState.communityPosts.map(p => {
      if (p.id === postId) {
        return { ...p, shares: (p.shares || 0) + 1 };
      }
      return p;
    });
    saveState();
  };

  const resetState = () => {
    globalState = {
      role: "guest",
      isLoggedIn: false,
      business: {
        name: "",
        email: "",
        phone: "",
        password: "",
        category: "",
        subcategory: "",
        location: "",
        size: "",
        website: "",
        about: "",
        registerNumber: "",
        trademark: "",
        cnicFront: "",
        cnicBack: "",
        liveSelfie: "",
        isRegistered: false,
        isApproved: false,
        profileCompletion: 75,
        landingPageCreated: false,
        landingPageTemplate: "",
        landingPageAbout: "",
        reviews: DEFAULT_REVIEWS,
        visitors: 240,
        deals: [],
        socialLinks: {
          instagram: "",
          facebook: "",
          twitter: "",
          linkedin: "",
        },
        score: 75,
      },
      investor: {
        name: "",
        email: "",
        phone: "",
        password: "",
        categories: [],
        ticketSize: "",
        budgetRange: "",
        location: "",
        strategy: "",
        isRegistered: false,
        isApproved: true,
        entityType: "Normal Person",
        aiConsultantToken: "",
        cnicFront: "",
        cnicBack: "",
        liveSelfie: "",
      },
      offers: DEFAULT_OFFERS,
      investments: DEFAULT_INVESTMENTS,
      communityPosts: DEFAULT_COMMUNITY_POSTS,
      consultant: {
        name: "",
        email: "",
        phone: "",
        password: "",
        specialty: "",
        experience: "",
        location: "",
        bio: "",
        isRegistered: false,
        isApproved: false,
        cnicFront: "",
        cnicBack: "",
        liveSelfie: "",
      },
      entrepreneur: {
        name: "",
        email: "",
        phone: "",
        password: "",
        isRegistered: false,
        isApproved: false,
        metrics: {
          investorsViewedIdea: 0,
          activeSampleRequests: 0,
          unreadMessagesCount: 0,
        },
      },
      savedPosts: [],
      followedUsers: [],
      likedPosts: [],
      followerCounts: {},
      currentUser: {
        name: "Anonymous Guest",
        email: "guest@smartbiz.ai",
        avatarUrl: "",
        coverUrl: "",
        bio: "Public guest exploring community insights.",
        roleBadge: "Guest Account",
      },
      points: 120,
      weaknessFeedback: [
        { id: "w-1", text: "Customer reviews hint that regional shipping could be optimized for transit security.", date: "2 days ago" },
        { id: "w-2", text: "Product packaging materials need more robust eco-friendly options for high volume orders.", date: "4 days ago" }
      ],
      stage1InvestorQueries: [],
      entrepreneurPayments: [],
      weeklyFollowUps: [],
      signedAgreements: {},
      agreementDrafts: {},
      sampleOrders: [],
      founderQuestions: [],
      investorEntrepreneurMessages: [],
    };
    saveState();
  };

  const flagStage1InvestorQuery = (
    query: Omit<Stage1InvestorQuery, "id" | "timestamp" | "status">,
  ): Stage1InvestorQuery => {
    const newQuery: Stage1InvestorQuery = {
      ...query,
      id: "sq-" + Date.now(),
      timestamp: new Date().toLocaleString(),
      status: "pending",
      stage: query.stage ?? "Stage 1",
    };
    globalState.stage1InvestorQueries = [...(globalState.stage1InvestorQueries || []), newQuery];
    saveState();
    return newQuery;
  };

  const resolveStage1InvestorQuery = (queryId: string) => {
    globalState.stage1InvestorQueries = (globalState.stage1InvestorQueries || []).map((q) =>
      q.id === queryId ? { ...q, status: "resolved" as const } : q,
    );
    saveState();
  };

  const sendInvestorMessage = (
    payload: Omit<
      InvestorEntrepreneurMessage,
      "id" | "timestamp" | "status" | "formattedPayload"
    > & { formattedPayload?: string },
  ): InvestorEntrepreneurMessage => {
    const formatted =
      payload.formattedPayload ??
      buildInvestorMessageFormat({
        startupTitle: payload.startupTitle,
        founderName: payload.founderName,
        investorName: payload.investorName,
        stage: payload.stage,
        type: payload.type,
        issueSection: payload.issueSection,
        issuePoint: payload.issuePoint,
        investorConcern: payload.investorConcern,
      });
    const entry: InvestorEntrepreneurMessage = {
      ...payload,
      formattedPayload: formatted,
      id: "iem-" + Date.now(),
      timestamp: new Date().toLocaleString("en-PK"),
      status: "pending",
    };
    globalState.investorEntrepreneurMessages = [
      entry,
      ...(globalState.investorEntrepreneurMessages || []),
    ];
    saveState();
    return entry;
  };

  const replyInvestorMessage = (messageId: string, reply: string) => {
    globalState.investorEntrepreneurMessages = (globalState.investorEntrepreneurMessages || []).map(
      (m) =>
        m.id === messageId
          ? {
              ...m,
              status: "answered" as const,
              entrepreneurReply: reply,
              repliedAt: new Date().toLocaleString("en-PK"),
            }
          : m,
    );
    saveState();
  };

  const resolveInvestorMessage = (messageId: string) => {
    globalState.investorEntrepreneurMessages = (globalState.investorEntrepreneurMessages || []).map(
      (m) => (m.id === messageId ? { ...m, status: "resolved" as const } : m),
    );
    saveState();
  };

  const awardPoints = (amount: number) => {
    globalState.points = (globalState.points || 0) + amount;
    saveState();
    void import("@/services/firebaseService")
      .then(({ awardPoints: syncPoints }) => {
        const uid = globalState.entrepreneur?.uid || auth.currentUser?.uid;
        if (uid) syncPoints(uid, amount);
      })
      .catch((err) => console.warn("Points sync failed:", err));
  };

  const addWeaknessFeedback = (text: string) => {
    const feedbackItem = {
      id: "w-" + Math.random().toString(36).substr(2, 9),
      text,
      date: "Just now"
    };
    globalState.weaknessFeedback = [feedbackItem, ...(globalState.weaknessFeedback || [])];
    saveState();
  };

  const verifyPrediction = (postId: string, isCorrect: boolean) => {
    globalState.communityPosts = globalState.communityPosts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          predictionStatus: isCorrect ? ("correct" as const) : ("incorrect" as const)
        };
      }
      return p;
    });
    if (isCorrect) {
      globalState.points = (globalState.points || 0) + 10;
    }
    saveState();
  };

  const acceptQuote = (postId: string, quoteId: string) => {
    globalState.communityPosts = globalState.communityPosts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          packagingQuotes: p.packagingQuotes?.map(q =>
            q.id === quoteId ? { ...q, accepted: true } : q
          )
        };
      }
      return p;
    });
    globalState.points = (globalState.points || 0) + 5;
    saveState();
  };

  const submitProblem = (title: string, content: string, urgency: "High" | "Medium" | "Low", tag: string) => {
    const resolutions: Record<string, string> = {
      Logistics: "AI Recommendation: Partner with Gujranwala cargo dispatch loops to establish a 24-hour backup route. This typically reduces regional lead times by 32%.",
      Financing: "AI Recommendation: Prepare a Verified Scorecard PDF and link it to your Pitch Desk. Vetted investors on SmartBiz are currently offering a 12% lower cost of capital for businesses scoring above 85.",
      Marketing: "AI Recommendation: Trigger a Click-and-Collect promotion combined with an automated review SMS loop to increase review velocity by 2.4x.",
      Default: "AI Recommendation: Scan matching specialized niche owners in the Gujranwala mapping registry. Establishing co-op supply hubs will pool buying power and mitigate logistics bottlenecks."
    };
    const resolution = resolutions[tag] || resolutions.Default;
    const experts = ["Sarah Sterling (Wholesale)", "Zain Malik (SEO)", "Aman Ullah (Retail)"];

    const cleanName = currentUser.name.trim().toLowerCase().replace(/\s+/g, "_") || "member";
    const authorName = `u/${cleanName}`;
    const authorRole: CommunityPost["role"] = (role === "business" || role === "consultant" || role === "investor") ? role : "guest";
    const color = currentUser.avatarUrl && !currentUser.avatarUrl.startsWith("bg-")
      ? "bg-gradient-to-tr from-amber-500 to-orange-500"
      : (currentUser.avatarUrl || "bg-gradient-to-tr from-amber-500 to-orange-500");

    addCommunityPost({
      author: authorName,
      role: authorRole,
      badge: undefined,
      category: "Problems Hub",
      tag: tag || "Operations",
      avatarColor: color,
      title: `⚠️ Problem: ${title}`,
      content: content,
      isProblem: true,
      urgency: urgency,
      nicheOwnersNotified: experts,
      aiResolutionMock: resolution
    });
  };

  const submitEntrepreneurProblem = (data: {
    founderId: string;
    founderName: string;
    problemId: string;
    title: string;
    content: string;
    category: string;
    targetRole: "wholesalers" | "business_owners" | "both";
    urgency: "High" | "Medium" | "Low";
    experts: string[];
    aiResolution: string;
  }) => {
    const cleanName = data.founderName.trim().toLowerCase().replace(/\s+/g, "_") || "founder";
    const authorName = `u/${cleanName}`;

    addCommunityPost({
      author: authorName,
      role: "guest",
      badge: undefined,
      category: "Problems Hub",
      tag: data.category,
      avatarColor: "bg-gradient-to-tr from-amber-500 to-orange-500",
      title: `🚀 Founder Problem: ${data.title}`,
      content: data.content,
      isProblem: true,
      urgency: data.urgency,
      nicheOwnersNotified: data.experts,
      aiResolutionMock: data.aiResolution,
      entrepreneurProblem: true,
      entrepreneurTargetRole: data.targetRole,
      founderProblemId: data.problemId,
    });
  };

  const addTestimonialQuote = (data: {
    name: string;
    role: string;
    quote: string;
    imageUrl: string;
    color: string;
  }) => {
    const newQuote: TestimonialQuote = {
      id: `t-${Date.now()}`,
      name: data.name,
      role: data.role,
      quote: data.quote,
      imageUrl: data.imageUrl,
      color: data.color,
      createdAt: Date.now(),
    };
    globalState.testimonialQuotes = [newQuote, ...(globalState.testimonialQuotes || [])];
    saveState();
  };

  const removeTestimonialQuote = (id: string) => {
    globalState.testimonialQuotes = (globalState.testimonialQuotes || []).filter((q) => q.id !== id);
    saveState();
  };

  // ---- Wholesaler module ----
  const updateWholesalerProfile = (patch: Partial<ConsultantProfile>) => {
    globalState.consultant = { ...globalState.consultant, ...patch };
    saveState();
  };

  const setWholesalerProducts = (products: WholesalerProduct[]) => {
    globalState.wholesalerProducts = products;
    saveState();
  };

  const addWholesalerProduct = (p: Omit<WholesalerProduct, "id">) => {
    const item: WholesalerProduct = { ...p, id: `wp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
    globalState.wholesalerProducts = [item, ...(globalState.wholesalerProducts || [])];
    saveState();
  };

  const removeWholesalerProduct = (id: string) => {
    globalState.wholesalerProducts = (globalState.wholesalerProducts || []).filter((p) => p.id !== id);
    saveState();
  };

  const activateAiSalesperson = (name: string, persona: string, languages: string[]) => {
    globalState.consultant = {
      ...globalState.consultant,
      aiSalesperson: { name, persona, languages, active: true },
    };
    saveState();
  };

  const toggleAiSalesperson = (active: boolean) => {
    if (!globalState.consultant.aiSalesperson) return;
    globalState.consultant.aiSalesperson = { ...globalState.consultant.aiSalesperson, active };
    saveState();
  };

  const addWholesaleOrder = (o: Omit<WholesaleOrder, "id" | "createdAt" | "status">) => {
    const order: WholesaleOrder = {
      ...o,
      id: `wo-${Date.now()}`,
      status: "done",
      createdAt: Date.now(),
    };
    globalState.wholesaleOrders = [order, ...(globalState.wholesaleOrders || [])];
    saveState();
  };

  const verifyWholesaleOrder = (id: string) => {
    globalState.wholesaleOrders = (globalState.wholesaleOrders || []).map((o) =>
      o.id === id ? { ...o, status: "verified" } : o,
    );
    saveState();
  };

  const setSalesConversations = (convos: SalesConversation[]) => {
    globalState.salesConversations = convos;
    saveState();
  };

  const sendSellerMessage = (convoId: string, text: string) => {
    globalState.salesConversations = (globalState.salesConversations || []).map((c) =>
      c.id === convoId
        ? {
            ...c,
            aiHandling: false,
            unread: 0,
            lastMessage: text,
            messages: [...c.messages, { from: "seller", text, at: Date.now() }],
          }
        : c,
    );
    saveState();
  };

  const setConversationAi = (convoId: string, aiHandling: boolean) => {
    globalState.salesConversations = (globalState.salesConversations || []).map((c) =>
      c.id === convoId ? { ...c, aiHandling } : c,
    );
    saveState();
  };

  const appendAiMessage = (convoId: string, text: string) => {
    globalState.salesConversations = (globalState.salesConversations || []).map((c) =>
      c.id === convoId
        ? { ...c, lastMessage: text, messages: [...c.messages, { from: "ai" as const, text, at: Date.now() }] }
        : c,
    );
    saveState();
  };

  // Persist a call-session notepad into the dedicated "storageinfo" store
  const saveCallNote = (note: {
    id?: string;
    customerName: string;
    businessOwner: string;
    sessionId: string;
    notes: string;
    paymentNotes?: string[];
    attachments?: { name: string; url: string }[];
  }) => {
    const list = globalState.callNotes || [];
    const id = note.id || `note-${Date.now()}`;
    const full: CallNote = {
      id,
      customerName: note.customerName,
      businessOwner: note.businessOwner,
      sessionId: note.sessionId,
      sessionDate: Date.now(),
      notes: note.notes,
      paymentNotes: note.paymentNotes || [],
      attachments: note.attachments || [],
    };
    const idx = list.findIndex((n) => n.id === id);
    if (idx >= 0) list[idx] = { ...list[idx], ...full };
    else list.unshift(full);
    globalState.callNotes = list;
    saveState();
    try {
      localStorage.setItem("storageinfo", JSON.stringify(globalState.callNotes));
    } catch { /* ignore */ }
    return id;
  };

  // The AI salesperson recalls saved notes filtered by the business owner's name
  const getCallNotesByOwner = (owner: string) =>
    (globalState.callNotes || []).filter(
      (n) => (n.businessOwner || "").toLowerCase().trim() === (owner || "").toLowerCase().trim(),
    );

  return {
    role: globalState.role,
    isLoggedIn: globalState.isLoggedIn,
    business: globalState.business,
    investor: globalState.investor,
    consultant: globalState.consultant,
    entrepreneur: globalState.entrepreneur ?? defaultEntrepreneurProfile(),
    savedPosts: globalState.savedPosts || [],
    followedUsers: globalState.followedUsers || [],
    likedPosts: Array.isArray(globalState.likedPosts) ? globalState.likedPosts : [],
    followerCounts: globalState.followerCounts || {},
    currentUser: globalState.currentUser,
    offers: globalState.offers,
    investments: globalState.investments,
    communityPosts: Array.isArray(globalState.communityPosts)
      ? globalState.communityPosts
      : [],
    points: globalState.points !== undefined ? globalState.points : 120,
    weaknessFeedback: globalState.weaknessFeedback || [],
    stage1InvestorQueries: globalState.stage1InvestorQueries || [],
    entrepreneurPayments: globalState.entrepreneurPayments || [],
    weeklyFollowUps: globalState.weeklyFollowUps || [],
    signedAgreements: globalState.signedAgreements || {},
    agreementDrafts: globalState.agreementDrafts || {},
    sampleOrders: globalState.sampleOrders || [],
    founderQuestions: globalState.founderQuestions || [],
    investorEntrepreneurMessages: globalState.investorEntrepreneurMessages || [],
    testimonialQuotes: globalState.testimonialQuotes || [],
    wholesalerProducts: globalState.wholesalerProducts || [],
    wholesaleOrders: globalState.wholesaleOrders || [],
    salesConversations: globalState.salesConversations || [],
    callNotes: globalState.callNotes || [],
    setRole,
    setIsLoggedIn,
    registerBusiness,
    approveBusiness,
    registerInvestor,
    registerConsultant,
    registerEntrepreneur,
    toggleSavePost,
    toggleFollowUser,
    toggleLikePost,
    deleteCommunityPost,
    registerCommunityMember,
    updateCurrentUserProfile,
    updateUserName,
    logoutCommunityUser,
    shareCommunityPost,
    getFollowersCount,
    getFollowingCount,
    updateBusinessProfile,
    addReview,
    addDeal,
    recordLandingPageVisit,
    updateSocialLinks,
    createLandingPage,
    addOffer,
    updateOfferStatus,
    addInvestment,
    addCommunityPost,
    mergeCommunityPostsFromBackend,
    upvoteCommunityPost,
    addCommunityComment,
    shareBusinessStatsToCommunity,
    resetState,
    awardPoints,
    addWeaknessFeedback,
    verifyPrediction,
    acceptQuote,
    submitProblem,
    submitEntrepreneurProblem,
    registerForSeminar,
    flagStage1InvestorQuery,
    resolveStage1InvestorQuery,
    sendInvestorMessage,
    replyInvestorMessage,
    resolveInvestorMessage,
    recordEscrowPayment,
    signIdeaAgreement,
    completeWeeklyFollowUp,
    saveAgreementDraft,
    placeSampleOrder,
    advanceSampleOrderStage,
    askFounderQuestion,
    addTestimonialQuote,
    removeTestimonialQuote,
    updateWholesalerProfile,
    setWholesalerProducts,
    addWholesalerProduct,
    removeWholesalerProduct,
    activateAiSalesperson,
    toggleAiSalesperson,
    addWholesaleOrder,
    verifyWholesaleOrder,
    setSalesConversations,
    sendSellerMessage,
    setConversationAi,
    appendAiMessage,
    saveCallNote,
    getCallNotesByOwner,
  };
}

export function buildInvestorMessageFormat(opts: {
  startupTitle: string;
  founderName: string;
  investorName: string;
  stage: InvestorEntrepreneurMessage["stage"];
  type: InvestorMessageType;
  issueSection?: string;
  issuePoint: string;
  investorConcern: string;
}): string {
  const header =
    opts.type === "agreement_objection"
      ? "📋 SMARTBIZ AGREEMENT OBJECTION"
      : "✉️ SMARTBIZ INVESTOR MESSAGE";
  return [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    header,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `Startup   : ${opts.startupTitle}`,
    `Founder   : ${opts.founderName}`,
    `Investor  : ${opts.investorName}`,
    `Stage     : ${opts.stage}`,
    opts.issueSection ? `Clause    : ${opts.issueSection}` : null,
    "──────────────────────────────────",
    `ISSUE POINT:`,
    opts.issuePoint,
    "──────────────────────────────────",
    `INVESTOR CONCERN / REQUEST:`,
    opts.investorConcern,
    "──────────────────────────────────",
    opts.type === "agreement_objection"
      ? "ACTION: Clarification or amendment requested before proceeding."
      : "ACTION: Founder response requested.",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  ]
    .filter(Boolean)
    .join("\n");
}

function generateFounderAiAnswer(startup: string, question: string, founder?: string): string {
  const q = question.toLowerCase();
  const founderRef = founder || "the founder";
  if (q.includes("revenue") || q.includes("sales"))
    return `[AI relay from ${founderRef} · ${startup}] Last month revenue was ahead of projection by 8%. Q2 pipeline looks strong with 3 new B2B contracts pending.`;
  if (q.includes("milestone") || q.includes("timeline"))
    return `[AI relay from ${founderRef} · ${startup}] Milestone 1 (product launch) is on track for next month. Escrow release conditions will be met once QA sign-off completes.`;
  if (q.includes("risk") || q.includes("concern"))
    return `[AI relay from ${founderRef} · ${startup}] Primary risk is supply chain delay — mitigated with backup vendor. No material compliance issues reported.`;
  return `[AI relay from ${founderRef} · ${startup}] Thank you for your question. Based on founder disclosures: operations are stable, investor updates are shared weekly, and we're happy to schedule a call for deeper detail on "${question.slice(0, 60)}${question.length > 60 ? "…" : ""}".`;
}
