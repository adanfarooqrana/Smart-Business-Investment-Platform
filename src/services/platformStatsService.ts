import { ref, onValue, get, update, type DataSnapshot } from "firebase/database";
import { database } from "@/firebase";
import { RTDB } from "@/lib/rtdbPaths";
import {
  subscribePlatformStatsOverride,
  type PlatformStatsOverride,
} from "@/services/landingContentService";

export type PlatformStats = {
  businessOwners: number;
  investors: number;
  wholesalers: number;
  entrepreneurs: number;
  totalMembers: number;
  communityPosts: number;
  totalVotes: number;
  totalComments: number;
  sampleOrders: number;
  pitchedIdeas: number;
  packagingPosts: number;
  avgBusinessScore: number;
  fundingDeployedPkr: number;
};

export const EMPTY_PLATFORM_STATS: PlatformStats = {
  businessOwners: 0,
  investors: 0,
  wholesalers: 0,
  entrepreneurs: 0,
  totalMembers: 0,
  communityPosts: 0,
  totalVotes: 0,
  totalComments: 0,
  sampleOrders: 0,
  pitchedIdeas: 0,
  packagingPosts: 0,
  avgBusinessScore: 0,
  fundingDeployedPkr: 0,
};

type RoleCounts = {
  business_owner: number;
  investor: number;
  wholesaler: number;
  entrepreneur: number;
};

function countChildren(snap: DataSnapshot): number {
  if (!snap.exists()) return 0;
  let n = 0;
  snap.forEach(() => {
    n += 1;
    return false;
  });
  return n;
}

function normalizeRole(raw: string | undefined): keyof RoleCounts | null {
  if (!raw) return null;
  const r = raw.toLowerCase().replace(/\s+/g, "_");
  if (r in { business_owner: 1, investor: 1, wholesaler: 1, entrepreneur: 1 }) {
    return r as keyof RoleCounts;
  }
  if (r.includes("business") || r === "owner") return "business_owner";
  if (r.includes("invest")) return "investor";
  if (r.includes("wholesale") || r.includes("supplier")) return "wholesaler";
  if (r.includes("entrepreneur") || r.includes("founder")) return "entrepreneur";
  return null;
}

function countRolesFromDirectory(snap: DataSnapshot): RoleCounts {
  const counts: RoleCounts = {
    business_owner: 0,
    investor: 0,
    wholesaler: 0,
    entrepreneur: 0,
  };
  if (!snap.exists()) return counts;
  snap.forEach((child) => {
    const role = normalizeRole(child.val()?.role as string | undefined);
    if (role) counts[role] += 1;
    return false;
  });
  return counts;
}

function aggregateCommunity(snap: DataSnapshot) {
  let posts = 0;
  let votes = 0;
  let comments = 0;
  let packaging = 0;
  if (!snap.exists()) return { posts, votes, comments, packaging };
  snap.forEach((child) => {
    posts += 1;
    const val = child.val() ?? {};
    votes += Number(val.votes ?? 0);
    if (Array.isArray(val.comments)) comments += val.comments.length;
    else if (val.comments && typeof val.comments === "object") comments += Object.keys(val.comments).length;
    if (val.isPackagingReq) packaging += 1;
    return false;
  });
  return { posts, votes, comments, packaging };
}

function aggregateBusinessScores(snap: DataSnapshot) {
  let sum = 0;
  let count = 0;
  if (!snap.exists()) return 0;
  snap.forEach((child) => {
    const score = Number(child.val()?.business?.score ?? child.val()?.score ?? 0);
    if (score > 0) {
      sum += score;
      count += 1;
    }
    return false;
  });
  return count > 0 ? Math.round(sum / count) : 0;
}

function aggregatePayments(snap: DataSnapshot) {
  let total = 0;
  if (!snap.exists()) return 0;
  snap.forEach((child) => {
    const val = child.val() ?? {};
    const amount = Number(val.amount ?? val.amountPkr ?? val.total ?? 0);
    if (amount > 0) total += amount;
    return false;
  });
  return total;
}

/** Normalize a metric to 0–100 bar fill (soft cap keeps bars readable at low counts). */
export function statFill(value: number, softCap: number): number {
  if (value <= 0 || softCap <= 0) return value > 0 ? 12 : 0;
  return Math.min(100, Math.max(8, Math.round((value / softCap) * 100)));
}

export function ecosystemShare(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

export function formatFundingPkr(amount: number): { value: number; suffix: string; prefix: string } {
  if (amount >= 1_000_000) return { prefix: "PKR ", value: amount / 1_000_000, suffix: "M+" };
  if (amount >= 1_000) return { prefix: "PKR ", value: amount / 1_000, suffix: "K+" };
  return { prefix: "PKR ", value: amount, suffix: "+" };
}

export function formatBusinessCount(count: number): { value: number; suffix: string } {
  if (count >= 1000) return { value: count / 1000, suffix: "k+" };
  return { value: count, suffix: "+" };
}

type PartialSources = {
  roles?: RoleCounts;
  community?: ReturnType<typeof aggregateCommunity>;
  sampleOrders?: number;
  pitchedIdeas?: number;
  avgScore?: number;
  fundingPkr?: number;
};

function pickStat(computed: number, override?: number): number {
  if (override === undefined || Number.isNaN(override)) return computed;
  return Math.max(computed, override);
}

function buildStats(src: PartialSources, override?: PlatformStatsOverride | null): PlatformStats {
  const roles = src.roles ?? {
    business_owner: 0,
    investor: 0,
    wholesaler: 0,
    entrepreneur: 0,
  };
  const community = src.community ?? { posts: 0, votes: 0, comments: 0, packaging: 0 };
  const totalMembers =
    roles.business_owner + roles.investor + roles.wholesaler + roles.entrepreneur;

  const base: PlatformStats = {
    businessOwners: roles.business_owner,
    investors: roles.investor,
    wholesalers: roles.wholesaler,
    entrepreneurs: roles.entrepreneur,
    totalMembers,
    communityPosts: community.posts,
    totalVotes: community.votes,
    totalComments: community.comments,
    sampleOrders: src.sampleOrders ?? 0,
    pitchedIdeas: src.pitchedIdeas ?? 0,
    packagingPosts: community.packaging,
    avgBusinessScore: src.avgScore ?? 0,
    fundingDeployedPkr: src.fundingPkr ?? 0,
  };

  if (!override) return base;

  const merged: PlatformStats = {
    businessOwners: pickStat(base.businessOwners, override.businessOwners),
    investors: pickStat(base.investors, override.investors),
    wholesalers: pickStat(base.wholesalers, override.wholesalers),
    entrepreneurs: pickStat(base.entrepreneurs, override.entrepreneurs),
    totalMembers: pickStat(base.totalMembers, override.totalMembers),
    communityPosts: pickStat(base.communityPosts, override.communityPosts),
    totalVotes: pickStat(base.totalVotes, override.totalVotes),
    totalComments: pickStat(base.totalComments, override.totalComments),
    sampleOrders: pickStat(base.sampleOrders, override.sampleOrders),
    pitchedIdeas: pickStat(base.pitchedIdeas, override.pitchedIdeas),
    packagingPosts: pickStat(base.packagingPosts, override.packagingPosts),
    avgBusinessScore: pickStat(base.avgBusinessScore, override.avgBusinessScore),
    fundingDeployedPkr: pickStat(base.fundingDeployedPkr, override.fundingDeployedPkr),
  };

  if (override.totalMembers === undefined) {
    const roleSum =
      merged.businessOwners + merged.investors + merged.wholesalers + merged.entrepreneurs;
    if (roleSum > merged.totalMembers) merged.totalMembers = roleSum;
  }
  return merged;
}

function safeOnValue(path: string, onData: (snap: DataSnapshot) => void): () => void {
  return onValue(
    ref(database, path),
    onData,
    (err) => console.warn(`[InvestBiz] RTDB listener denied at "${path}":`, err.message),
  );
}

/**
 * Pushes live counts from public RTDB paths into `platform_stats`
 * so landing graphs work even when guest users cannot read private nodes.
 */
export async function syncPlatformStatsToRtdb(): Promise<void> {
  try {
    const [dirSnap, postsSnap, feedSnap] = await Promise.all([
      get(ref(database, RTDB.userDirectory)),
      get(ref(database, RTDB.communityPosts)),
      get(ref(database, RTDB.investorFeed)),
    ]);

    const roles = countRolesFromDirectory(dirSnap);
    const community = aggregateCommunity(postsSnap);
    const pitchedIdeas = countChildren(feedSnap);
    const totalMembers =
      roles.business_owner + roles.investor + roles.wholesaler + roles.entrepreneur;

    await update(ref(database, RTDB.platformStats), {
      businessOwners: roles.business_owner,
      investors: roles.investor,
      wholesalers: roles.wholesaler,
      entrepreneurs: roles.entrepreneur,
      totalMembers,
      communityPosts: community.posts,
      totalVotes: community.votes,
      totalComments: community.comments,
      packagingPosts: community.packaging,
      pitchedIdeas,
      syncedAt: Date.now(),
    });
    console.log("[InvestBiz] platform_stats synced from live RTDB");
  } catch (err) {
    console.warn("[InvestBiz] platform_stats sync failed — publish database rules:", err);
  }
}

/** Live platform-wide stats from Firebase RTDB. */
export function subscribePlatformStats(onChange: (stats: PlatformStats) => void): () => void {
  const sources: PartialSources = {};
  let override: PlatformStatsOverride | null = null;
  let alive = true;

  const emit = () => {
    if (!alive) return;
    onChange(buildStats(sources, override));
  };

  const unsubs = [
    safeOnValue(RTDB.userDirectory, (snap) => {
      sources.roles = countRolesFromDirectory(snap);
      emit();
    }),
    safeOnValue(RTDB.communityPosts, (snap) => {
      sources.community = aggregateCommunity(snap);
      emit();
    }),
    safeOnValue(RTDB.investorFeed, (snap) => {
      sources.pitchedIdeas = countChildren(snap);
      emit();
    }),
    subscribePlatformStatsOverride((o) => {
      override = o;
      emit();
    }),
  ];

  // Private trees — only work when Firebase rules allow; failures are logged, not fatal.
  const unsubsExtra = [
    safeOnValue(RTDB.sampleOrders, (snap) => {
      sources.sampleOrders = countChildren(snap);
      emit();
    }),
    safeOnValue("users", (snap) => {
      sources.avgScore = aggregateBusinessScores(snap);
      emit();
    }),
    safeOnValue("payments", (snap) => {
      sources.fundingPkr = aggregatePayments(snap);
      emit();
    }),
  ];

  emit();

  return () => {
    alive = false;
    [...unsubs, ...unsubsExtra].forEach((u) => u());
  };
}
