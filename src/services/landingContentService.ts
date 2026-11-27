import {
  ref,
  onValue,
  push,
  set,
  remove,
  type DataSnapshot,
} from "firebase/database";
import { database } from "@/firebase";
import { RTDB } from "@/lib/rtdbPaths";
import type { TestimonialQuote } from "@/hooks/useAppState";
import type { PlatformStats } from "@/services/platformStatsService";

export type PlatformStatsOverride = Partial<PlatformStats>;

function parseTestimonials(snap: DataSnapshot): TestimonialQuote[] {
  if (!snap.exists()) return [];
  const list: TestimonialQuote[] = [];
  snap.forEach((child) => {
    const v = child.val() ?? {};
    if (!v.quote || !v.name) return false;
    list.push({
      id: child.key ?? `t-${Date.now()}`,
      name: String(v.name),
      role: String(v.role ?? "Business Owner"),
      quote: String(v.quote),
      imageUrl: String(v.imageUrl ?? ""),
      color: String(v.color ?? "#b45309"),
      createdAt: Number(v.createdAt ?? Date.now()),
    });
    return false;
  });
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

function parseStatsOverride(snap: DataSnapshot): PlatformStatsOverride | null {
  if (!snap.exists()) return null;
  const v = snap.val() ?? {};
  const out: PlatformStatsOverride = {};

  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const n = Number(v[k]);
      if (!Number.isNaN(n) && n >= 0) return n;
    }
    return undefined;
  };

  const map: [keyof PlatformStats, string[]][] = [
    ["businessOwners", ["businessOwners", "business_owners", "businesses", "business"]],
    ["investors", ["investors", "investor"]],
    ["wholesalers", ["wholesalers", "wholesaler"]],
    ["entrepreneurs", ["entrepreneurs", "entrepreneur", "founders", "founder"]],
    ["totalMembers", ["totalMembers", "total_members", "members", "liveMembers"]],
    ["communityPosts", ["communityPosts", "community_posts", "posts"]],
    ["totalVotes", ["totalVotes", "total_votes", "votes"]],
    ["totalComments", ["totalComments", "total_comments", "comments"]],
    ["sampleOrders", ["sampleOrders", "sample_orders", "orders"]],
    ["pitchedIdeas", ["pitchedIdeas", "pitched_ideas", "ideas"]],
    ["packagingPosts", ["packagingPosts", "packaging_posts", "packaging"]],
    ["avgBusinessScore", ["avgBusinessScore", "avg_business_score", "avgScore", "score"]],
    ["fundingDeployedPkr", ["fundingDeployedPkr", "funding_deployed_pkr", "funding", "fundingPkr"]],
  ];

  for (const [field, keys] of map) {
    const n = pick(...keys);
    if (n !== undefined) out[field] = n;
  }

  return Object.keys(out).length > 0 ? out : null;
}

function rtdbOnValue<T>(
  path: string,
  onData: (snap: DataSnapshot) => void,
): () => void {
  return onValue(
    ref(database, path),
    onData,
    (err) => {
      console.warn(`[InvestBiz] RTDB read blocked at "${path}":`, err.message);
    },
  );
}

/** Live verified reviews from RTDB (falls back handled by caller). */
export function subscribeLandingTestimonials(
  onChange: (quotes: TestimonialQuote[]) => void,
): () => void {
  return rtdbOnValue(RTDB.landingTestimonials, (snap) => {
    onChange(parseTestimonials(snap));
  });
}

/** Manual platform metrics entered in Firebase console or admin. */
export function subscribePlatformStatsOverride(
  onChange: (override: PlatformStatsOverride | null) => void,
): () => void {
  return rtdbOnValue(RTDB.platformStats, (snap) => {
    onChange(parseStatsOverride(snap));
  });
}

export async function addLandingTestimonial(data: {
  name: string;
  role: string;
  quote: string;
  imageUrl: string;
  color: string;
}): Promise<string> {
  const nodeRef = push(ref(database, RTDB.landingTestimonials));
  await set(nodeRef, { ...data, createdAt: Date.now() });
  return nodeRef.key ?? "";
}

export async function removeLandingTestimonial(id: string): Promise<void> {
  await remove(ref(database, `${RTDB.landingTestimonials}/${id}`));
}

export async function savePlatformStatsOverride(
  patch: PlatformStatsOverride,
): Promise<void> {
  await set(ref(database, RTDB.platformStats), patch);
}
