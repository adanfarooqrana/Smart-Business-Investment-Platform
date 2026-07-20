import { db } from "../firebase";
import { ref, set, get, onValue, update, off, remove } from "firebase/database";
import type { StartupIdea } from "@/data/startupIdeas";
import { isDigitalProductCategory } from "@/lib/investorPitchSchema";

/** Nested schema root: founders/{uid}/... */
export const FOUNDER_ROOT = (uid: string) => `founders/${uid}`;
export const FOUNDER_PROFILE = (uid: string) => `founders/${uid}/profile`;
export const FOUNDER_STATS = (uid: string) => `founders/${uid}/stats`;
export const FOUNDER_PITCHES = (uid: string) => `founders/${uid}/pitches`;
export const FOUNDER_PITCH = (uid: string, pitchId: string) => `founders/${uid}/pitches/${pitchId}`;
export const FOUNDER_PAYMENTS = (uid: string) => `founders/${uid}/payments`;
export const FOUNDER_PAYMENT = (uid: string, payoutId: string) => `founders/${uid}/payments/${payoutId}`;
export const FOUNDER_SAMPLE_ORDERS = (uid: string) => `founders/${uid}/sample_orders`;
export const FOUNDER_SAMPLE_ORDER = (uid: string, orderId: string) =>
  `founders/${uid}/sample_orders/${orderId}`;
export const FOUNDER_INVESTOR_QUERIES = (uid: string) => `founders/${uid}/investor_queries`;
export const FOUNDER_INVESTOR_QUERY = (uid: string, queryId: string) =>
  `founders/${uid}/investor_queries/${queryId}`;

export interface FounderBankDetails {
  accountTitle: string;
  bankName: string;
  iban: string;
}

export interface FounderProfileNode {
  uid: string;
  role: "founder";
  fullName: string;
  phone: string;
  email: string;
  cnicNumber: string;
  cnicFrontUrl: string;
  cnicBackUrl: string;
  faceMatchScore: number;
  status: "pending" | "approved" | "rejected";
  kycStatus?: "pending" | "approved" | "rejected";
  isApproved?: boolean;
  createdAt: number;
  bankDetails: FounderBankDetails;
}

/** Clean signup payload for founders/{uid}/profile — no obsolete venture fields */
export type InitializeFounderProfileCreds = {
  fullName: string;
  phone: string;
  email: string;
  cnicNumber: string;
  accountTitle: string;
  bankName: string;
  iban: string;
  cnicFrontUrl?: string;
  cnicBackUrl?: string;
  faceMatchScore?: number;
};

export interface FounderStatsNode {
  totalFundingRaised: number;
  activeInvestorsCount: number;
}

/** Approved ledger row for founder workspace breakdown table */
export type FounderApprovedLedgerRow = {
  pitchId: string;
  investorId: string;
  investorName: string;
  startupTitle: string;
  amountInvested: number;
  amountDisplay: string;
  equityAcquired: number;
  timestamp: number;
  status: "approved";
};

const EMPTY_FOUNDER_STATS: FounderStatsNode = {
  totalFundingRaised: 0,
  activeInvestorsCount: 0,
};

/** Strip obsolete ROI / viability leaves — never return them to callers */
function normalizeFounderStats(raw: unknown): FounderStatsNode {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    totalFundingRaised: Number(data.totalFundingRaised ?? 0) || 0,
    activeInvestorsCount: Number(data.activeInvestorsCount ?? 0) || 0,
  };
}

/** @deprecated Prefer FounderProfileNode — kept for import compatibility */
export type FounderProfile = FounderProfileNode & FounderStatsNode;

function mapToList(data: Record<string, unknown> | null): any[] {
  if (!data || typeof data !== "object") return [];
  return Object.keys(data).map((key) => ({ id: key, ...(data[key] as object) }));
}

function isDigitalProduct(productType: string | undefined): boolean {
  const t = String(productType || '').trim().toLowerCase();
  return (
    t === 'digital' ||
    t === 'digital product / service' ||
    t === 'tech / saas' ||
    t.includes('digital') ||
    t.includes('saas')
  );
}

/** Canonical productType labels for Firebase pitch documents */
function normalizeProductTypeLabel(productType: string | undefined): 'Digital Product / Service' | 'Physical Product' {
  return isDigitalProduct(productType) ? 'Digital Product / Service' : 'Physical Product';
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

/**
 * PHASE 1 — Anti-duplication interceptor.
 * Scans founders/{uid}/profile only (no founder_registry).
 */
export const checkDuplicateFounderCredentials = async (
  email: string,
  cnic: string,
  phone: string,
) => {
  try {
    const emailNorm = String(email || "").trim().toLowerCase();
    const cnicNorm = String(cnic || "").trim();
    const phoneNorm = String(phone || "").trim();

    const snap = await get(ref(db, "founders"));
    if (!snap.exists()) return false;

    const all = snap.val() as Record<string, { profile?: FounderProfileNode }>;
    for (const existingUid of Object.keys(all)) {
      const p = all[existingUid]?.profile;
      if (!p) continue;
      if (String(p.email || "").trim().toLowerCase() === emailNorm) {
        throw new Error("This Email is already linked to an active founder account.");
      }
      if (cnicNorm && String(p.cnicNumber || "").trim() === cnicNorm) {
        throw new Error("This CNIC Number is already registered.");
      }
      if (phoneNorm && String(p.phone || "").trim() === phoneNorm) {
        throw new Error("This Phone Number is already registered.");
      }
    }

    return false;
  } catch (error: any) {
    const msg = String(error?.message || error || "");
    if (
      error?.code === "PERMISSION_DENIED" ||
      /permission_denied|permission denied/i.test(msg)
    ) {
      return false;
    }
    console.error("Duplication Prevention System Error:", msg);
    throw error;
  }
};

/**
 * PHASE 1 — Seed nested profile + stats only (zero pitches).
 * Writes only auth + verification + banking fields under founders/{uid}/profile.
 */
export const initializeFounderProfile = async (
  uid: string,
  creds: InitializeFounderProfileCreds,
) => {
  try {
    await checkDuplicateFounderCredentials(creds.email, creds.cnicNumber, creds.phone);

    const profile: FounderProfileNode = {
      uid,
      role: "founder",
      fullName: String(creds.fullName || "").trim(),
      phone: String(creds.phone || "").trim(),
      email: String(creds.email || "").trim(),
      cnicNumber: String(creds.cnicNumber || "").trim(),
      cnicFrontUrl: creds.cnicFrontUrl || "",
      cnicBackUrl: creds.cnicBackUrl || "",
      faceMatchScore: Number(creds.faceMatchScore ?? 100),
      status: "pending",
      kycStatus: "pending",
      isApproved: false,
      createdAt: Date.now(),
      bankDetails: {
        accountTitle: String(creds.accountTitle || creds.fullName || "").trim(),
        bankName: String(creds.bankName || "").trim(),
        iban: String(creds.iban || "").trim(),
      },
    };

    const stats: FounderStatsNode = {
      totalFundingRaised: 0,
      activeInvestorsCount: 0,
    };

    await set(ref(db, FOUNDER_PROFILE(uid)), profile);
    await set(ref(db, FOUNDER_STATS(uid)), stats);
    await set(ref(db, `founders/${uid}/bankingDetails`), {
      bankName: profile.bankDetails.bankName,
      accountTitleName: profile.bankDetails.accountTitle,
      accountNumber: profile.bankDetails.iban,
      updatedAt: Date.now(),
    });
    return true;
  } catch (error) {
    console.error("Error writing pristine founder node initialization:", error);
    throw error;
  }
};

/** PHASE 2 — Sign-in verification: founders/{uid}/profile must exist */
export const getFounderProfile = async (uid: string): Promise<FounderProfileNode | null> => {
  try {
    const snap = await get(ref(db, FOUNDER_PROFILE(uid)));
    if (!snap.exists()) return null;
    return snap.val() as FounderProfileNode;
  } catch (error) {
    console.error("getFounderProfile failed:", error);
    throw error;
  }
};

export const verifyFounderSession = async (uid: string): Promise<FounderProfileNode> => {
  try {
    const profile = await getFounderProfile(uid);
    if (!profile || profile.role !== "founder") {
      throw new Error(
        "Founder profile not found under founders/{uid}/profile. Access denied. Please complete founder registration.",
      );
    }
    return profile;
  } catch (error) {
    console.error("verifyFounderSession failed:", error);
    throw error;
  }
};

export const getFounderStats = async (uid: string): Promise<FounderStatsNode> => {
  try {
    const snap = await get(ref(db, FOUNDER_STATS(uid)));
    if (!snap.exists()) return { ...EMPTY_FOUNDER_STATS };
    return normalizeFounderStats(snap.val());
  } catch (error) {
    console.error("getFounderStats failed:", error);
    throw error;
  }
};

/** Tab #1 live stats listener — 2-box fields only */
export const streamFounderStats = (uid: string, callback: (stats: FounderStatsNode) => void) => {
  const targetRef = ref(db, FOUNDER_STATS(uid));
  onValue(targetRef, (snapshot) => {
    try {
      callback(normalizeFounderStats(snapshot.exists() ? snapshot.val() : {}));
    } catch (error) {
      console.error("streamFounderStats handler error:", error);
      callback({ ...EMPTY_FOUNDER_STATS });
    }
  });
  return () => off(targetRef);
};

/**
 * Reduce approved pitches/{pitchId}/transactions where founderId matches.
 * sum → totalFundingRaised; unique investor Set size → activeInvestorsCount.
 */
export function aggregateApprovedFundingFromPitchesRoot(
  pitchesRoot: Record<string, unknown> | null | undefined,
  founderId: string,
): { stats: FounderStatsNode; approvedLedger: FounderApprovedLedgerRow[] } {
  try {
    const cleanFounder = String(founderId || "").trim();
    const investorIds = new Set<string>();
    let totalFundingRaised = 0;
    const approvedLedger: FounderApprovedLedgerRow[] = [];

    if (!cleanFounder || !pitchesRoot || typeof pitchesRoot !== "object") {
      return { stats: { ...EMPTY_FOUNDER_STATS }, approvedLedger: [] };
    }

    for (const pitchKey of Object.keys(pitchesRoot)) {
      try {
        const pitchNode = pitchesRoot[pitchKey];
        if (!pitchNode || typeof pitchNode !== "object") continue;
        const txs = (pitchNode as { transactions?: Record<string, Record<string, unknown>> })
          .transactions;
        if (!txs || typeof txs !== "object") continue;

        for (const invKey of Object.keys(txs)) {
          try {
            const raw = txs[invKey];
            if (!raw || typeof raw !== "object") continue;
            if (String(raw.founderId || "").trim() !== cleanFounder) continue;
            if (String(raw.status || "").trim() !== "approved") continue;

            const investorId = String(raw.investorId || invKey || "").trim();
            const amountInvested =
              Number(raw.amountInvested ?? raw.amountPkr ?? 0) || 0;
            if (investorId) investorIds.add(investorId);
            totalFundingRaised += amountInvested;

            const startupTitle = String(
              raw.startupTitle ?? raw.businessName ?? pitchKey ?? "Venture",
            ).trim();
            const investorName = String(raw.investorName || investorId || "Investor").trim();

            approvedLedger.push({
              pitchId: String(raw.pitchId || pitchKey).trim(),
              investorId,
              investorName,
              startupTitle,
              amountInvested,
              amountDisplay: `PKR ${amountInvested.toLocaleString()}`,
              equityAcquired: Number(raw.equityAcquired ?? 0) || 0,
              timestamp: Number(raw.timestamp ?? 0) || 0,
              status: "approved",
            });
          } catch (rowErr) {
            console.warn("aggregateApprovedFunding row skip:", rowErr);
          }
        }
      } catch (pitchErr) {
        console.warn("aggregateApprovedFunding pitch skip:", pitchErr);
      }
    }

    approvedLedger.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return {
      stats: {
        totalFundingRaised,
        activeInvestorsCount: investorIds.size,
      },
      approvedLedger,
    };
  } catch (error) {
    console.error("aggregateApprovedFundingFromPitchesRoot error:", error);
    return { stats: { ...EMPTY_FOUNDER_STATS }, approvedLedger: [] };
  }
}

/** Atomic 2-box write + wipe obsolete ROI / viability leaves */
export async function persistFounderTwoBoxStats(
  founderId: string,
  stats: FounderStatsNode,
): Promise<void> {
  try {
    const uid = String(founderId || "").trim();
    if (!uid) return;
    await update(ref(db), {
      [`${FOUNDER_STATS(uid)}/totalFundingRaised`]: Number(stats.totalFundingRaised) || 0,
      [`${FOUNDER_STATS(uid)}/activeInvestorsCount`]: Number(stats.activeInvestorsCount) || 0,
      // DELETE obsolete evaluation properties from the stats node
      [`${FOUNDER_STATS(uid)}/returnOnInvestment`]: null,
      [`${FOUNDER_STATS(uid)}/growthViabilityRating`]: null,
      [`${FOUNDER_STATS(uid)}/roiCalculated`]: null,
      [`${FOUNDER_STATS(uid)}/viabilityScore`]: null,
    });
  } catch (error) {
    console.error("persistFounderTwoBoxStats error:", error);
  }
}

export async function recomputeAndPersistFounderStats(founderId: string): Promise<FounderStatsNode> {
  try {
    const uid = String(founderId || "").trim();
    if (!uid) return { ...EMPTY_FOUNDER_STATS };
    const snap = await get(ref(db, "pitches"));
    const { stats } = aggregateApprovedFundingFromPitchesRoot(
      snap.exists() ? (snap.val() as Record<string, unknown>) : null,
      uid,
    );
    await persistFounderTwoBoxStats(uid, stats);
    return stats;
  } catch (error) {
    console.error("recomputeAndPersistFounderStats error:", error);
    return { ...EMPTY_FOUNDER_STATS };
  }
}

/**
 * Live: pitches/{pitchId}/transactions -> approved rows for this founder + persist 2-box stats.
 * Non-blocking persist — UI gets aggregates even if the write is delayed.
 */
export function streamFounderApprovedLedgerAndStats(
  founderId: string,
  callback: (payload: {
    stats: FounderStatsNode;
    approvedLedger: FounderApprovedLedgerRow[];
  }) => void,
): () => void {
  const clean = String(founderId || "").trim();
  if (!clean) {
    callback({ stats: { ...EMPTY_FOUNDER_STATS }, approvedLedger: [] });
    return () => undefined;
  }

  const pitchesRef = ref(db, "pitches");
  let active = true;

  try {
    onValue(
      pitchesRef,
      (snapshot) => {
        try {
          if (!active) return;
          const { stats, approvedLedger } = aggregateApprovedFundingFromPitchesRoot(
            snapshot.exists() ? (snapshot.val() as Record<string, unknown>) : null,
            clean,
          );
          callback({ stats, approvedLedger });
          void persistFounderTwoBoxStats(clean, stats);
        } catch (error) {
          console.error("streamFounderApprovedLedgerAndStats handler error:", error);
          callback({ stats: { ...EMPTY_FOUNDER_STATS }, approvedLedger: [] });
        }
      },
      (err) => {
        console.error("streamFounderApprovedLedgerAndStats listener error:", err);
        callback({ stats: { ...EMPTY_FOUNDER_STATS }, approvedLedger: [] });
      },
    );
  } catch (error) {
    console.error("streamFounderApprovedLedgerAndStats setup error:", error);
    callback({ stats: { ...EMPTY_FOUNDER_STATS }, approvedLedger: [] });
  }

  return () => {
    active = false;
    try {
      off(pitchesRef);
    } catch (error) {
      console.error("streamFounderApprovedLedgerAndStats cleanup error:", error);
    }
  };
}

/**
 * Tab #2 — Rigid Stage 1 → Stage 2 → Stage 3 pitch payload.
 * Writes exclusively to founders/{uid}/pitches/{pitchId}.
 */
export const publishCustomFounderPitch = async (
  uid: string,
  pitchId: string | null,
  formData: any,
) => {
  try {
    const targetId = pitchId || `PITCH-${Date.now()}`;
    const stage1In = formData?.stage1 && typeof formData.stage1 === "object" ? formData.stage1 : {};
    const stage2In = formData?.stage2 && typeof formData.stage2 === "object" ? formData.stage2 : {};
    const stage3In = formData?.stage3 && typeof formData.stage3 === "object" ? formData.stage3 : {};

    const categoryIndustry = String(
      formData?.categoryIndustry || stage1In.categoryIndustry || formData?.industry || "General",
    ).trim();

    // Enforce product type vs category — non-digital industries cannot store Digital
    let productType = normalizeProductTypeLabel(
      String(formData?.productType || stage1In.productType || "Physical Product"),
    );
    if (!isDigitalProductCategory(categoryIndustry)) {
      productType = "Physical Product";
    }
    const digital = isDigitalProduct(productType);

    const sampleAssetAvailable =
      !digital &&
      (formData?.sampleAvailability === true ||
        stage3In?.sampleAssetAvailable === true ||
        formData?.stage3?.sampleAssetAvailable === true);

    // ── Stage 1: Idea & Financial Terms ──────────────────────────────
    const stage1 = {
      ideaTitle: String(
        formData?.ideaTitle || stage1In.ideaTitle || formData?.startupTitle || "Untitled Idea",
      ).trim(),
      categoryIndustry,
      ideaDescription: String(
        formData?.ideaDescription || stage1In.ideaDescription || formData?.description || "",
      ).trim(),
      productType,
      coreProblemSolution: String(
        formData?.coreProblemSolution ||
          stage1In.coreProblemSolution ||
          stage1In.problemSolution ||
          "",
      ).trim(),
      requiredInvestmentPkr: toFiniteNumber(
        formData?.requiredInvestmentPkr ??
          stage1In.requiredInvestmentPkr ??
          stage2In.totalCapitalRequiredPkr,
        0,
      ),
      equityOfferedPercent: toFiniteNumber(
        formData?.equityOfferedPercent ??
          stage1In.equityOfferedPercent ??
          stage2In.investmentFormula?.maxEquityPercent,
        0,
      ),
      expectedRoiPercent: toFiniteNumber(
        formData?.expectedRoiPercent ??
          stage1In.expectedRoiPercent ??
          (typeof stage2In.investmentFormula?.projectedAnnualReturnRate === "number"
            ? stage2In.investmentFormula.projectedAnnualReturnRate * 100
            : 0),
        0,
      ),
    };

    // ── Stage 2: Requirements & Validation (+ Digital/Physical routing) ─
    const productUrl = digital
      ? String(
          formData?.productUrl ||
            formData?.websiteLink ||
            stage2In.productUrl ||
            stage2In.websiteLink ||
            stage2In.productLiveUrl ||
            formData?.productLiveUrl ||
            "",
        ).trim() || "N/A"
      : "N/A";

    const rawMaterialLocation = digital
      ? ""
      : String(
          formData?.rawMaterialLocation ||
            formData?.sourcingLocation ||
            stage2In.rawMaterialLocation ||
            stage2In.sourcingLocation ||
            "",
        ).trim();

    const stage2: Record<string, unknown> = {
      productUrl,
      existingCustomerBaseSize: String(
        formData?.existingCustomerBaseSize ||
          stage2In.existingCustomerBaseSize ||
          stage2In.customerBaseSize ||
          "",
      ).trim(),
      marketLocation: String(
        formData?.marketLocation ||
          stage2In.marketLocation ||
          stage2In.marketInsight?.location ||
          "",
      ).trim(),
      yearsOfExperience: String(
        formData?.yearsOfExperience ??
          stage2In.yearsOfExperience ??
          stage2In.founderBackground?.yearsExperience ??
          "",
      ).trim(),
      marketSummary: String(
        formData?.marketSummary ||
          stage2In.marketSummary ||
          stage2In.marketInsight?.marketSummary ||
          "",
      ).trim(),
      rawMaterialLocation,
    };

    // Sample fields only when founder enabled the toggle — never write N/A placeholders
    if (sampleAssetAvailable) {
      stage2.sampleProductName = String(
        formData?.sampleProductName ||
          stage2In.sampleProductName ||
          stage3In.sampleProductName ||
          "",
      ).trim();
      stage2.sampleProductPricePkr = toFiniteNumber(
        formData?.sampleProductPricePkr ??
          stage2In.sampleProductPricePkr ??
          stage3In.sampleProductPricePkr ??
          stage3In.samplePrice,
        0,
      );
    }

    // ── Stage 3: Legal & Escrow ──────────────────────────────────────
    const stage3: Record<string, unknown> = {
      customAgreementText: String(
        formData?.customAgreementText ||
          stage3In.customAgreementText ||
          stage3In.legalAgreementText ||
          formData?.legalAgreementText ||
          "",
      ),
      sampleAssetAvailable: sampleAssetAvailable === true,
    };

    if (sampleAssetAvailable) {
      const samplePrice = toFiniteNumber(
        formData?.sampleProductPricePkr ??
          stage3In.sampleProductPricePkr ??
          stage3In.samplePrice ??
          stage2.sampleProductPricePkr,
        0,
      );
      stage3.sampleProductName = String(
        formData?.sampleProductName || stage3In.sampleProductName || stage2.sampleProductName || "",
      ).trim();
      stage3.sampleProductPricePkr = samplePrice;
      stage3.samplePrice = samplePrice;
      stage3.sampleSignatureRequired = true;
    } else {
      // Explicit sanitize — wipe sample garbage from cloud node
      stage3.sampleAssetAvailable = false;
      stage3.sampleProductName = "";
      stage3.sampleProductPricePkr = 0;
      // Omit samplePrice / sampleSignatureRequired entirely (no null litter)
    }

    const cleanPitchPayload = {
      pitchId: targetId,
      founderId: uid,
      ideaTitle: stage1.ideaTitle,
      categoryIndustry: stage1.categoryIndustry,
      ideaDescription: stage1.ideaDescription,
      productType: stage1.productType,
      investorsViewedIdea: toFiniteNumber(formData?.investorsViewedIdea, 0),
      createdAt: toFiniteNumber(formData?.createdAt, Date.now()) || Date.now(),
      updatedAt: Date.now(),
      stage1,
      stage2,
      stage3,
    };

    await set(ref(db, FOUNDER_PITCH(uid, targetId)), cleanPitchPayload);
    return targetId;
  } catch (error) {
    console.error("Failed compiling wizard pitch data:", error);
    throw error;
  }
};

export const streamFounderPitches = (uid: string, callback: (pitches: any[]) => void) => {
  const targetRef = ref(db, FOUNDER_PITCHES(uid));
  const handler = (snapshot: any) => {
    try {
      callback(mapToList(snapshot.exists() ? snapshot.val() : null));
    } catch (err) {
      console.error("streamFounderPitches callback error:", err);
      callback([]);
    }
  };
  onValue(targetRef, handler);
  return () => off(targetRef);
};

/**
 * Unified mount hydrate + live sync for the entire founders/{uid} tree.
 * Prevents Tab 1–6 local state wipe on hard refresh.
 */
export type FounderWorkspaceSnapshot = {
  profile: FounderProfileNode | null;
  stats: FounderStatsNode;
  pitches: any[];
  payments: any[];
  sampleOrders: any[];
  investorQueries: any[];
};

export const parseFounderWorkspace = (raw: any): FounderWorkspaceSnapshot => {
  const data = raw && typeof raw === "object" ? raw : {};
  const statsRaw = data.stats && typeof data.stats === "object" ? data.stats : {};
  return {
    profile: (data.profile as FounderProfileNode) || null,
    stats: normalizeFounderStats(statsRaw),
    pitches: mapToList(data.pitches || null),
    payments: mapToList(data.payments || null),
    sampleOrders: mapToList(data.sample_orders || null),
    investorQueries: mapToList(data.investor_queries || null),
  };
};

export const fetchFounderWorkspace = async (uid: string): Promise<FounderWorkspaceSnapshot> => {
  try {
    const snap = await get(ref(db, FOUNDER_ROOT(uid)));
    return parseFounderWorkspace(snap.exists() ? snap.val() : null);
  } catch (error) {
    console.error("fetchFounderWorkspace failed:", error);
    throw error;
  }
};

export const streamFounderWorkspace = (
  uid: string,
  callback: (workspace: FounderWorkspaceSnapshot) => void,
) => {
  const targetRef = ref(db, FOUNDER_ROOT(uid));
  const handler = (snapshot: any) => {
    try {
      callback(parseFounderWorkspace(snapshot.exists() ? snapshot.val() : null));
    } catch (err) {
      console.error("streamFounderWorkspace callback error:", err);
      callback(parseFounderWorkspace(null));
    }
  };
  onValue(targetRef, handler);
  return () => off(targetRef);
};

/** Tab #3 — nested payments only */
export const triggerPayoutRequest = async (uid: string, payoutId: string, balance: number) => {
  try {
    const payload = {
      payoutId,
      founderId: uid,
      amount: balance,
      amountPkr: balance,
      status: "requested",
      updatedAt: Date.now(),
      timestamp: new Date().toLocaleString("en-PK"),
    };
    await set(ref(db, FOUNDER_PAYMENT(uid, payoutId)), payload);
  } catch (error) {
    console.error("Payout request write error:", error);
    throw error;
  }
};

export const lockPayoutAsCompleted = async (uid: string, payoutId: string) => {
  try {
    await update(ref(db, FOUNDER_PAYMENT(uid, payoutId)), {
      status: "completed",
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Payout confirmation write error:", error);
    throw error;
  }
};

export const streamFounderPayments = (uid: string, callback: (payments: any[]) => void) => {
  const targetRef = ref(db, FOUNDER_PAYMENTS(uid));
  onValue(targetRef, (snapshot) => {
    callback(mapToList(snapshot.exists() ? snapshot.val() : null));
  });
  return () => off(targetRef);
};

/** Tab #5 — founders/{uid}/sample_orders */
export const streamSampleRequests = (uid: string, callback: (orders: any[]) => void) => {
  const targetRef = ref(db, FOUNDER_SAMPLE_ORDERS(uid));
  onValue(targetRef, (snapshot) => {
    callback(mapToList(snapshot.exists() ? snapshot.val() : null));
  });
  return () => off(targetRef);
};

export const updateSampleOrderStage = async (
  uid: string,
  orderId: string,
  stage: string,
) => {
  try {
    await update(ref(db, FOUNDER_SAMPLE_ORDER(uid, orderId)), {
      stage,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Sample order update error:", error);
    throw error;
  }
};

export const removeSampleOrder = async (uid: string, orderId: string) => {
  try {
    await remove(ref(db, FOUNDER_SAMPLE_ORDER(uid, orderId)));
  } catch (error) {
    console.error("Sample order remove error:", error);
    throw error;
  }
};

/** Tab #6 — founders/{uid}/investor_queries */
export const streamInvestorQueries = (uid: string, callback: (queries: any[]) => void) => {
  const targetRef = ref(db, FOUNDER_INVESTOR_QUERIES(uid));
  onValue(targetRef, (snapshot) => {
    callback(mapToList(snapshot.exists() ? snapshot.val() : null));
  });
  return () => off(targetRef);
};

export const submitQueryResponseText = async (uid: string, queryId: string, text: string) => {
  try {
    await update(ref(db, FOUNDER_INVESTOR_QUERY(uid, queryId)), {
      reply: text,
      status: "responded",
      repliedAt: Date.now(),
    });
  } catch (error) {
    console.error("Matrix chat response writing error:", error);
    throw error;
  }
};

/** Compatibility alias */
export const createOrUpdateCustomPitch = publishCustomFounderPitch;

export const sendInvestorQueryToFounder = async (payload: {
  founderId: string;
  pitchId: string;
  investorId: string;
  investorName?: string;
  messageText: string;
}) => {
  try {
    const queryId = `query-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const targetRef = ref(db, FOUNDER_INVESTOR_QUERY(payload.founderId, queryId));
    const queryPayload = {
      queryId,
      investorId: payload.investorId,
      investorName: payload.investorName || "Verified Investor",
      pitchId: payload.pitchId,
      messageText: payload.messageText,
      queryText: payload.messageText,
      status: "pending",
      createdAt: Date.now(),
    };
    await set(targetRef, queryPayload);
    return queryId;
  } catch (error) {
    console.error("sendInvestorQueryToFounder error:", error);
    throw error;
  }
};

/**
 * Map founders/{uid}/pitches/{pitchId} → StartupIdea with zero invented copy.
 * Blank founder inputs stay blank (no placeholder scripts).
 */
export function mapAuthenticFounderPitchToStartupIdea(
  pitchId: string,
  founderId: string,
  raw: Record<string, unknown> | null | undefined,
  founderProfileName = "",
): StartupIdea | null {
  try {
    if (!raw || typeof raw !== "object") return null;

    const stage1In =
      raw.stage1 && typeof raw.stage1 === "object"
        ? (raw.stage1 as Record<string, unknown>)
        : {};
    const stage2In =
      raw.stage2 && typeof raw.stage2 === "object"
        ? (raw.stage2 as Record<string, unknown>)
        : {};
    const stage3In =
      raw.stage3 && typeof raw.stage3 === "object"
        ? (raw.stage3 as Record<string, unknown>)
        : {};

    const ideaTitle = String(stage1In.ideaTitle ?? "").trim();
    const categoryIndustry = String(stage1In.categoryIndustry ?? "").trim();
    const ideaDescription = String(stage1In.ideaDescription ?? "").trim();
    const coreProblemSolution = String(stage1In.coreProblemSolution ?? "").trim();
    let productType = String(stage1In.productType ?? "").trim();
    if (!isDigitalProductCategory(categoryIndustry)) {
      productType = "Physical Product";
    } else {
      productType = normalizeProductTypeLabel(productType || "Physical Product");
    }

    const requiredInvestmentPkr = toFiniteNumber(stage1In.requiredInvestmentPkr, 0);
    const equityOfferedPercent = toFiniteNumber(stage1In.equityOfferedPercent, 0);
    const expectedRoiPercent = toFiniteNumber(stage1In.expectedRoiPercent, 0);

    // Implied pre-money from founder raise ÷ equity — not canned marketing copy
    const currentValuationPkr =
      equityOfferedPercent > 0
        ? Math.round(requiredInvestmentPkr / (equityOfferedPercent / 100))
        : 0;

    const founderName = String(
      founderProfileName || raw.founderName || "",
    ).trim();

    const expectedRoi = expectedRoiPercent > 0 ? `${expectedRoiPercent}%` : "";
    const equityOffered = equityOfferedPercent > 0 ? `${equityOfferedPercent}%` : "";

    const yearsExperience = toFiniteNumber(stage2In.yearsOfExperience, 0);
    const customAgreementText = String(stage3In.customAgreementText ?? "").trim();
    const sampleAssetAvailable = stage3In.sampleAssetAvailable === true;
    const sampleProductName = sampleAssetAvailable
      ? String(stage2In.sampleProductName ?? stage3In.sampleProductName ?? "").trim()
      : "";
    const sampleProductPricePkr = sampleAssetAvailable
      ? toFiniteNumber(stage2In.sampleProductPricePkr ?? stage3In.sampleProductPricePkr ?? stage3In.samplePrice, 0)
      : 0;
    const productUrl = String(stage2In.productUrl ?? "").trim();
    const createdAt = toFiniteNumber(raw.createdAt, 0);

    const idea: StartupIdea = {
      id: pitchId,
      founderId,
      entrepreneurUid: founderId,
      founderName,
      startupTitle: ideaTitle,
      industry: categoryIndustry,
      description: ideaDescription,
      accent: "#FFF8E1",
      createdAt: createdAt > 0 ? createdAt : undefined,
      isFounderLive: true,
      stage1: {
        ideaDescription,
        expectedRoi,
        profitSharingPercent: "",
        ebitdaEstimate: "",
        equityOffered,
        industryField: categoryIndustry,
        ideaTitle,
        categoryIndustry,
        productType,
        coreProblemSolution,
        requiredInvestmentPkr,
        equityOfferedPercent,
        expectedRoiPercent,
      },
      stage2: {
        totalCapitalRequiredPkr: requiredInvestmentPkr,
        expenseBreakdown: [],
        customerBaseSize: String(stage2In.existingCustomerBaseSize ?? "").trim(),
        currentValuationPkr,
        investmentFormula: {
          totalRaisePkr: requiredInvestmentPkr,
          maxEquityPercent: equityOfferedPercent,
          projectedAnnualReturnRate:
            expectedRoiPercent > 0 ? expectedRoiPercent / 100 : 0,
        },
        founderBackground: {
          yearsExperience,
          priorVentures: "",
          education: "",
          verificationScore: 0,
        },
        marketInsight: {
          location: String(stage2In.marketLocation ?? "").trim(),
          demandGrowthYoY: 0,
          marketSummary: String(stage2In.marketSummary ?? "").trim(),
          viabilityRating: "Moderate",
        },
        proofGallery: [],
        productLiveUrl: productUrl && productUrl !== "N/A" ? productUrl : undefined,
      },
      stage3: {
        legalAgreementText: customAgreementText,
        milestones: [],
        sampleAssetAvailable,
        sampleProductName: sampleProductName === "N/A" ? "" : sampleProductName,
        sampleProductPricePkr,
        socialProof: {
          investorCount: 0,
          totalInvestedPkr: 0,
          previousInvestors: [],
          pastPayouts: [],
          coInvestors: [],
          investorFeedback: [],
          lookForChecklist: [],
        },
      },
    };

    return idea;
  } catch (error) {
    console.error("mapAuthenticFounderPitchToStartupIdea error:", error);
    return null;
  }
}

/** Real-time investor feed: scan founders/{uid}/pitches/{pitchId} only. */
export function subscribeToAllFounderPitchesForInvestors(
  callback: (ideas: StartupIdea[]) => void,
): () => void {
  const targetRef = ref(db, "founders");
  let active = true;

  const handler = (snapshot: { exists: () => boolean; forEach: (fn: (child: any) => void) => void }) => {
    try {
      if (!active) return;
      const ideas: StartupIdea[] = [];
      if (snapshot.exists()) {
        snapshot.forEach((founderChild: any) => {
          const founderId = String(founderChild.key || "");
          if (!founderId) return;
          const profileVal = founderChild.child("profile").val();
          const founderName =
            profileVal && typeof profileVal === "object"
              ? String((profileVal as { fullName?: string }).fullName ?? "").trim()
              : "";
          const pitchesSnap = founderChild.child("pitches");
          if (!pitchesSnap.exists()) return;
          pitchesSnap.forEach((pitchChild: any) => {
            const pitchId = String(pitchChild.key || "");
            if (!pitchId) return;
            const mapped = mapAuthenticFounderPitchToStartupIdea(
              pitchId,
              founderId,
              pitchChild.val() as Record<string, unknown>,
              founderName,
            );
            if (mapped) ideas.push(mapped);
          });
        });
      }
      ideas.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      callback(ideas);
    } catch (error) {
      console.error("subscribeToAllFounderPitchesForInvestors handler error:", error);
      if (active) callback([]);
    }
  };

  try {
    onValue(targetRef, handler, (err) => {
      console.error("subscribeToAllFounderPitchesForInvestors listener error:", err);
      if (active) callback([]);
    });
  } catch (error) {
    console.error("subscribeToAllFounderPitchesForInvestors setup error:", error);
    callback([]);
  }

  return () => {
    active = false;
    try {
      off(targetRef);
    } catch (error) {
      console.error("subscribeToAllFounderPitchesForInvestors cleanup error:", error);
    }
  };
}

/**
 * Live single-pitch listener under founders/{founderId}/pitches/{pitchId}.
 * When founderId is missing, scans the founders tree for that pitchId.
 */
export function subscribeToFounderPitchById(
  pitchId: string,
  founderId: string | null | undefined,
  callback: (idea: StartupIdea | null) => void,
): () => void {
  let active = true;
  const cleanups: Array<() => void> = [];

  const emit = (idea: StartupIdea | null) => {
    if (active) callback(idea);
  };

  try {
    if (founderId) {
      const pitchRef = ref(db, FOUNDER_PITCH(founderId, pitchId));
      const profileRef = ref(db, FOUNDER_PROFILE(founderId));

      onValue(
        pitchRef,
        (snap) => {
          try {
            if (!active) return;
            if (!snap.exists()) {
              emit(null);
              return;
            }
            void get(profileRef)
              .then((pSnap) => {
                if (!active) return;
                const name = pSnap.exists()
                  ? String((pSnap.val() as { fullName?: string })?.fullName ?? "").trim()
                  : "";
                emit(
                  mapAuthenticFounderPitchToStartupIdea(
                    pitchId,
                    founderId,
                    snap.val() as Record<string, unknown>,
                    name,
                  ),
                );
              })
              .catch((error) => {
                console.error("subscribeToFounderPitchById profile fetch error:", error);
                if (!active) return;
                emit(
                  mapAuthenticFounderPitchToStartupIdea(
                    pitchId,
                    founderId,
                    snap.val() as Record<string, unknown>,
                    "",
                  ),
                );
              });
          } catch (error) {
            console.error("subscribeToFounderPitchById pitch handler error:", error);
            emit(null);
          }
        },
        (err) => {
          console.error("subscribeToFounderPitchById pitch listener error:", err);
          emit(null);
        },
      );
      cleanups.push(() => off(pitchRef));
    } else {
      const foundersRef = ref(db, "founders");
      onValue(
        foundersRef,
        (snap) => {
          try {
            if (!active) return;
            if (!snap.exists()) {
              emit(null);
              return;
            }
            let found: StartupIdea | null = null;
            snap.forEach((founderChild: any) => {
              if (found) return;
              const fid = String(founderChild.key || "");
              if (!fid) return;
              const pitchSnap = founderChild.child(`pitches/${pitchId}`);
              if (!pitchSnap.exists()) return;
              const profileVal = founderChild.child("profile").val();
              const founderName =
                profileVal && typeof profileVal === "object"
                  ? String((profileVal as { fullName?: string }).fullName ?? "").trim()
                  : "";
              found = mapAuthenticFounderPitchToStartupIdea(
                pitchId,
                fid,
                pitchSnap.val() as Record<string, unknown>,
                founderName,
              );
            });
            emit(found);
          } catch (error) {
            console.error("subscribeToFounderPitchById scan handler error:", error);
            emit(null);
          }
        },
        (err) => {
          console.error("subscribeToFounderPitchById scan listener error:", err);
          emit(null);
        },
      );
      cleanups.push(() => off(foundersRef));
    }
  } catch (error) {
    console.error("subscribeToFounderPitchById setup error:", error);
    emit(null);
  }

  return () => {
    active = false;
    for (const cleanup of cleanups) {
      try {
        cleanup();
      } catch (error) {
        console.error("subscribeToFounderPitchById cleanup error:", error);
      }
    }
  };
}
