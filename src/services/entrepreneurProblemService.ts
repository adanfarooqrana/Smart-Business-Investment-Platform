import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { ref, get } from "firebase/database";
import { auth, firestore as db, database } from "../firebase";
import { RTDB } from "@/lib/rtdbPaths";
import type { RtdbProblemPayload } from "./backendSyncService";

export const PROBLEM_CATEGORIES = [
  "Supply Chain & Logistics",
  "Financing & Capital",
  "Marketing & Sales",
  "Operations & Inventory",
  "Product Sourcing",
  "Packaging & Materials",
  "Legal & Compliance",
  "Hiring & Team",
  "Technology & Automation",
  "Other",
] as const;

export type ProblemCategory = (typeof PROBLEM_CATEGORIES)[number];

export type ProblemTargetRole = "wholesalers" | "business_owners" | "both";

export type EntrepreneurProblemStatus = "open" | "routed" | "resolved";

export type EntrepreneurProblem = {
  id: string;
  founderId: string;
  problemText: string;
  targetRole: ProblemTargetRole;
  category: string;
  status: EntrepreneurProblemStatus;
  createdAt: Timestamp | ReturnType<typeof serverTimestamp> | number;
  title?: string;
  description?: string;
  aiRoutingSummary?: string;
  notifiedRoles?: string[];
  notifiedExperts?: string[];
};

export type ProblemRoutingResult = {
  summary: string;
  notifiedRoles: ("wholesaler" | "business")[];
  experts: string[];
  urgency: "High" | "Medium" | "Low";
  refinedCategory: string;
};

const WHOLESALER_EXPERTS: Record<string, string[]> = {
  "Supply Chain & Logistics": ["Sarah Sterling (Wholesale)", "Gujranwala Cargo Hub"],
  "Product Sourcing": ["Sarah Sterling (Wholesale)", "Aman Ullah (Retail Supply)"],
  "Packaging & Materials": ["Sarah Sterling (Wholesale)", "Gujranwala Package Co."],
  "Operations & Inventory": ["Sarah Sterling (Wholesale)", "Regional Stock Partners"],
  Default: ["Sarah Sterling (Wholesale)", "Verified Wholesaler Network"],
};

const BUSINESS_EXPERTS: Record<string, string[]> = {
  "Financing & Capital": ["Zain Malik (Business Finance)", "InvestBiz Capital Desk"],
  "Marketing & Sales": ["Zain Malik (SEO)", "Local Growth Collective"],
  "Legal & Compliance": ["Business Compliance Desk", "Gujranwala SME Legal"],
  "Hiring & Team": ["HR Connect Gujranwala", "Business Owners Guild"],
  "Technology & Automation": ["Tech SME Advisors", "Digital Retail Collective"],
  Default: ["Verified Business Owner Network", "Gujranwala SME Circle"],
};

const CATEGORY_RESOLUTIONS: Record<string, string> = {
  "Supply Chain & Logistics":
    "AI Routing: Matched to verified wholesalers specializing in regional dispatch and backup logistics loops.",
  "Financing & Capital":
    "AI Routing: Routed to business owners and finance mentors with verified scorecard programs.",
  "Marketing & Sales":
    "AI Routing: Pushed to business owners with proven local marketing playbooks and review velocity tools.",
  "Operations & Inventory":
    "AI Routing: Dual-routed to inventory wholesalers and retail operators for pooled buying power.",
  "Product Sourcing":
    "AI Routing: Prioritized verified wholesalers in your category for bulk sourcing quotes.",
  "Packaging & Materials":
    "AI Routing: Sent to packaging wholesalers and material suppliers in the Gujranwala registry.",
  "Legal & Compliance":
    "AI Routing: Forwarded to business owners with compliance mentorship badges.",
  "Hiring & Team":
    "AI Routing: Shared with business owner hiring circles and SME workforce partners.",
  "Technology & Automation":
    "AI Routing: Matched to tech-forward business owners for automation and POS integrations.",
  Other:
    "AI Routing: Scanned the Gujranwala mapping registry for category-aligned verified partners.",
};

function inferCategoryFromText(text: string, selected: string): string {
  const t = text.toLowerCase();
  if (/\b(logistics|shipping|delivery|cargo|transport)\b/.test(t)) return "Supply Chain & Logistics";
  if (/\b(fund|loan|capital|invest|financ)\b/.test(t)) return "Financing & Capital";
  if (/\b(market|seo|ads|brand|customer)\b/.test(t)) return "Marketing & Sales";
  if (/\b(inventory|stock|warehouse|ops)\b/.test(t)) return "Operations & Inventory";
  if (/\b(sourc|supplier|bulk|wholesale)\b/.test(t)) return "Product Sourcing";
  if (/\b(packag|material|label|box)\b/.test(t)) return "Packaging & Materials";
  if (/\b(legal|license|compliance|regulat)\b/.test(t)) return "Legal & Compliance";
  if (/\b(hire|staff|team|employee)\b/.test(t)) return "Hiring & Team";
  if (/\b(tech|software|automat|pos|app)\b/.test(t)) return "Technology & Automation";
  return selected || "Other";
}

function inferUrgency(text: string): "High" | "Medium" | "Low" {
  const t = text.toLowerCase();
  if (/\b(urgent|asap|critical|emergency|immediate)\b/.test(t)) return "High";
  if (/\b(soon|priority|blocked|stuck)\b/.test(t)) return "Medium";
  return "Low";
}

export function analyzeProblemRouting(
  category: string,
  title: string,
  description: string,
  targetRole: ProblemTargetRole,
): ProblemRoutingResult {
  const combined = `${title} ${description}`;
  const refinedCategory = inferCategoryFromText(combined, category);
  const urgency = inferUrgency(combined);

  const notifiedRoles: ("wholesaler" | "business")[] =
    targetRole === "both"
      ? ["wholesaler", "business"]
      : targetRole === "wholesalers"
        ? ["wholesaler"]
        : ["business"];

  const experts: string[] = [];
  if (notifiedRoles.includes("wholesaler")) {
    experts.push(...(WHOLESALER_EXPERTS[refinedCategory] || WHOLESALER_EXPERTS.Default));
  }
  if (notifiedRoles.includes("business")) {
    experts.push(...(BUSINESS_EXPERTS[refinedCategory] || BUSINESS_EXPERTS.Default));
  }

  const audienceLabel =
    targetRole === "both"
      ? "Registered Wholesalers and Business Owners"
      : targetRole === "wholesalers"
        ? "Registered Wholesalers"
        : "Registered Business Owners";

  const baseResolution = CATEGORY_RESOLUTIONS[refinedCategory] || CATEGORY_RESOLUTIONS.Other;
  const summary = `${baseResolution} Target audience: ${audienceLabel}. Category lock: ${refinedCategory}.`;

  return {
    summary,
    notifiedRoles,
    experts: [...new Set(experts)],
    urgency,
    refinedCategory,
  };
}

function resolveFounderId(fallbackId: string): string {
  if (auth.currentUser?.uid) return auth.currentUser.uid;
  if (fallbackId && !fallbackId.startsWith("local-")) return fallbackId;
  throw new Error("Please sign in with your email and password to post problems.");
}

export async function submitEntrepreneurProblem(payload: {
  founderId: string;
  founderName: string;
  title: string;
  description: string;
  category: string;
  targetRole: ProblemTargetRole;
}): Promise<{ problem: EntrepreneurProblem; routing: ProblemRoutingResult }> {
  if (!auth.currentUser) {
    throw new Error("Firebase login required. Please sign out and sign in again with email & password.");
  }

  const founderId = resolveFounderId(payload.founderId);
  const problemId = `epr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const problemText = `${payload.title.trim()}\n\n${payload.description.trim()}`;
  const now = Date.now();

  const routing = analyzeProblemRouting(
    payload.category,
    payload.title,
    payload.description,
    payload.targetRole,
  );

  const rtdbPayload: RtdbProblemPayload = {
    id: problemId,
    founderId,
    founderName: payload.founderName,
    title: payload.title.trim(),
    description: payload.description.trim(),
    problemText,
    targetRole: payload.targetRole,
    category: routing.refinedCategory,
    status: "routed",
    urgency: routing.urgency,
    aiRoutingSummary: routing.summary,
    notifiedRoles: routing.notifiedRoles,
    notifiedExperts: routing.experts,
    createdAt: now,
  };

  const { syncEntrepreneurProblemToRtdb } = await import("./backendSyncService");
  await syncEntrepreneurProblemToRtdb(rtdbPayload);

  const problem: EntrepreneurProblem = {
    id: problemId,
    founderId,
    problemText,
    targetRole: payload.targetRole,
    category: routing.refinedCategory,
    status: "routed",
    createdAt: now,
    title: payload.title.trim(),
    description: payload.description.trim(),
    aiRoutingSummary: routing.summary,
    notifiedRoles: routing.notifiedRoles,
    notifiedExperts: routing.experts,
  };

  // Firestore mirror — optional, never block success
  setDoc(doc(db, "entrepreneur_problems", problemId), {
    ...problem,
    createdAt: serverTimestamp(),
  }).catch((err) => console.warn("Firestore problem mirror skipped:", err));

  Promise.all(
    routing.notifiedRoles.map((audience) =>
      setDoc(doc(db, "problem_role_notifications", `${problemId}_${audience}`), {
        problemId,
        founderId,
        founderName: payload.founderName,
        title: payload.title.trim(),
        category: routing.refinedCategory,
        targetAudience: audience,
        targetRole: payload.targetRole,
        problemText,
        aiRoutingSummary: routing.summary,
        urgency: routing.urgency,
        read: false,
        createdAt: serverTimestamp(),
      }),
    ),
  ).catch((err) => console.warn("Firestore notifications skipped:", err));

  return { problem, routing };
}

export async function fetchEntrepreneurProblemsByFounder(
  founderId: string,
): Promise<EntrepreneurProblem[]> {
  const uid = auth.currentUser?.uid || founderId;

  try {
    const snap = await get(ref(database, `${RTDB.entrepreneurs(uid)}/problems`));
    if (snap.exists()) {
      const list: EntrepreneurProblem[] = [];
      snap.forEach((child) => {
        list.push({ id: child.key!, ...child.val() } as EntrepreneurProblem);
      });
      if (list.length > 0) {
        return list.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      }
    }
  } catch {
    /* try flat index next */
  }

  try {
    const flatSnap = await get(ref(database, RTDB.founderProblems));
    if (flatSnap.exists()) {
      const list: EntrepreneurProblem[] = [];
      flatSnap.forEach((child) => {
        const val = child.val();
        if (val?.founderId === uid) {
          list.push({ id: child.key!, ...val } as EntrepreneurProblem);
        }
      });
      if (list.length > 0) {
        return list.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      }
    }
  } catch {
    /* fall through to Firestore */
  }

  try {
    const q = query(
      collection(db, "entrepreneur_problems"),
      where("founderId", "==", uid),
      orderBy("createdAt", "desc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as EntrepreneurProblem);
  } catch {
    return [];
  }
}
