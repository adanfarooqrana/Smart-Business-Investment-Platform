import {
  collection,
  collectionGroup,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { ref as storageRef, uploadString, getDownloadURL } from "firebase/storage";
import { ref, onValue, get, set } from "firebase/database";
import { auth, firestore as db, storage, database } from "../firebase";
import { RTDB } from "@/lib/rtdbPaths";
import type {
  StartupIdea,
  StartupIdeaStage1,
  StartupIdeaStage2,
  ProofImage,
} from "@/data/startupIdeas";
import { buildStage3For } from "@/data/stage3Data";
import type { StartupIdeaStage3 } from "@/data/stage3Data";
import {
  assemblePitchFirestoreDocuments,
  type PitchCategory,
  type PitchStage1Input,
  type PitchStage2Input,
  type PitchStage3Input,
  type PitchIdeaPayload,
  type ProfitProjection,
  PITCH_CATEGORIES,
} from "@/lib/investorPitchSchema";

export {
  PITCH_CATEGORIES,
  isDigitalProductCategory,
  DIGITAL_PRODUCT_CATEGORIES,
  type PitchCategory,
  type PitchStage1Input,
  type PitchStage2Input,
  type PitchStage3Input,
  type PitchIdeaPayload,
  type ProfitProjection,
};

const EXPENSE_COLORS = ["#F59E0B", "#FB923C", "#FBBF24", "#F97316", "#EAB308"];

export function calculateProfitProjections(
  investmentPkr: number,
  roiPercent: number,
  equityPercent: number,
): ProfitProjection {
  const roi = roiPercent / 100;
  const annualReturn = investmentPkr * roi;
  const profitShare = Math.max(5, Math.round(roiPercent * 0.65));

  const expenseBreakdown = [
    { label: "Equipment & Setup", amountPkr: Math.round(investmentPkr * 0.35), color: EXPENSE_COLORS[0] },
    { label: "Rent & Facilities", amountPkr: Math.round(investmentPkr * 0.25), color: EXPENSE_COLORS[1] },
    { label: "Staff & Operations", amountPkr: Math.round(investmentPkr * 0.22), color: EXPENSE_COLORS[2] },
    { label: "Marketing & Launch", amountPkr: Math.round(investmentPkr * 0.18), color: EXPENSE_COLORS[3] },
  ];

  const valuation =
    equityPercent > 0 ? Math.round(investmentPkr / (equityPercent / 100)) : investmentPkr * 5;

  return {
    profitSharingPercent: `${profitShare}% of net operating profit`,
    ebitdaEstimate: `PKR ${Math.round(annualReturn * 0.85).toLocaleString()} – ${Math.round(annualReturn * 1.15).toLocaleString()} (Year 2)`,
    suggestedProfitMarginPercent: roiPercent,
    currentValuationPkr: valuation,
    expenseBreakdown,
    investmentFormula: {
      totalRaisePkr: investmentPkr,
      maxEquityPercent: equityPercent,
      projectedAnnualReturnRate: roi,
    },
  };
}

function generateIdeaId(): string {
  const segment =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Date.now().toString(36);
  return `pitch-${segment}`;
}

async function uploadPitchFile(
  uid: string,
  ideaId: string,
  folder: string,
  fileName: string,
  dataUrl: string,
): Promise<string> {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  try {
    const fileRef = storageRef(storage, `uploads/${uid}/pitches/${ideaId}/${folder}/${fileName}`);
    const snapshot = await Promise.race([
      uploadString(fileRef, dataUrl, "data_url"),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("upload timeout")), 20000),
      ),
    ]);
    return await getDownloadURL(snapshot.ref);
  } catch (err) {
    console.warn(`Pitch file upload failed (${folder}), using inline data:`, err);
    return dataUrl;
  }
}

function resolveEntrepreneurUid(fallbackUid: string): string {
  const authUid = auth.currentUser?.uid;
  if (authUid) return authUid;
  if (fallbackUid && !fallbackUid.startsWith("local-")) return fallbackUid;
  throw new Error("Firebase login required. Sign out and sign in with email & password, then publish again.");
}

function buildProofGallery(
  productImages: string[],
  setupPhotos: string[],
): ProofImage[] {
  const gallery: ProofImage[] = [];
  productImages.forEach((url, i) => {
    gallery.push({
      id: `product-${i}`,
      url,
      caption: `Product image ${i + 1} — entrepreneur verified upload`,
      type: "product",
    });
  });
  setupPhotos.forEach((url, i) => {
    gallery.push({
      id: `setup-${i}`,
      url,
      caption: `Shop / setup photo ${i + 1} — operational proof`,
      type: i === 0 ? "facility" : "operations",
    });
  });
  return gallery;
}

function normalizeStage1(stage1Doc: Record<string, unknown>, investmentIdea: Record<string, unknown>): StartupIdeaStage1 {
  const roi = investmentIdea.expectedRoiPercent;
  const equity = investmentIdea.equityPercent;
  const raise = investmentIdea.requiredInvestmentPkr;
  return {
    ideaDescription: String(
      stage1Doc.ideaDescription ?? investmentIdea.description ?? "Founder-pitched opportunity on SmartBiz.",
    ),
    expectedRoi: String(
      stage1Doc.expectedRoi ?? (roi != null ? `${roi}% annually` : "Disclosed at pitch"),
    ),
    profitSharingPercent: String(stage1Doc.profitSharingPercent ?? "15% of net operating profit"),
    ebitdaEstimate: String(stage1Doc.ebitdaEstimate ?? "Founder projections on file"),
    equityOffered: String(
      stage1Doc.equityOffered ??
        (equity != null && raise != null
          ? `${equity}% for PKR ${Number(raise).toLocaleString()}`
          : "Terms in dossier"),
    ),
    industryField: String(
      stage1Doc.industryField ??
        `${investmentIdea.category ?? investmentIdea.industry ?? "General"} — ${investmentIdea.industry ?? "Pakistan"}`,
    ),
  };
}

function normalizeStage2(
  stage2Doc: Record<string, unknown>,
  investmentIdea: Record<string, unknown>,
): StartupIdeaStage2 {
  const totalCapital = Number(
    stage2Doc.totalCapitalRequiredPkr ?? investmentIdea.requiredInvestmentPkr ?? 5_000_000,
  );
  const equity = Number(investmentIdea.equityPercent ?? 10);
  const roi = Number(investmentIdea.expectedRoiPercent ?? 15) / 100;
  const valuation = Number(stage2Doc.currentValuationPkr ?? (equity > 0 ? totalCapital / (equity / 100) : totalCapital * 5));

  const expenseBreakdown = Array.isArray(stage2Doc.expenseBreakdown)
    ? (stage2Doc.expenseBreakdown as StartupIdeaStage2["expenseBreakdown"])
    : [
        { label: "Equipment & Setup", amountPkr: Math.round(totalCapital * 0.35), color: EXPENSE_COLORS[0] },
        { label: "Rent & Facilities", amountPkr: Math.round(totalCapital * 0.25), color: EXPENSE_COLORS[1] },
        { label: "Staff & Operations", amountPkr: Math.round(totalCapital * 0.22), color: EXPENSE_COLORS[2] },
        { label: "Marketing & Launch", amountPkr: Math.round(totalCapital * 0.18), color: EXPENSE_COLORS[3] },
      ];

  const founderBg = (stage2Doc.founderBackground ?? {}) as Record<string, unknown>;
  const market = (stage2Doc.marketInsight ?? {}) as Record<string, unknown>;

  return {
    totalCapitalRequiredPkr: totalCapital,
    expenseBreakdown,
    customerBaseSize: String(stage2Doc.customerBaseSize ?? "Growing customer base — founder disclosed"),
    currentValuationPkr: valuation,
    investmentFormula: (stage2Doc.investmentFormula as StartupIdeaStage2["investmentFormula"]) ?? {
      totalRaisePkr: totalCapital,
      maxEquityPercent: equity,
      projectedAnnualReturnRate: roi,
    },
    founderBackground: {
      yearsExperience: Number(founderBg.yearsExperience ?? 0),
      priorVentures: String(founderBg.priorVentures ?? "Disclosed by founder at pitch"),
      education: String(founderBg.education ?? "Verified via SmartBiz entrepreneur onboarding"),
      verificationScore: Number(founderBg.verificationScore ?? 85),
    },
    marketInsight: {
      location: String(market.location ?? "Pakistan"),
      demandGrowthYoY: Number(market.demandGrowthYoY ?? 12),
      marketSummary: String(
        market.marketSummary ??
          `Entrepreneur-pitched opportunity in ${investmentIdea.industry ?? "local market"}.`,
      ),
      viabilityRating: (market.viabilityRating as StartupIdeaStage2["marketInsight"]["viabilityRating"]) ?? "Medium",
    },
    proofGallery: Array.isArray(stage2Doc.proofGallery)
      ? (stage2Doc.proofGallery as StartupIdeaStage2["proofGallery"])
      : [],
  };
}

function assembleStartupIdea(
  ideaDoc: Record<string, unknown>,
  stage1Doc: Record<string, unknown>,
  stage2Doc: Record<string, unknown>,
  stage3Doc: Record<string, unknown>,
  meta?: { createdAt?: number; isFounderLive?: boolean },
): StartupIdea {
  const investmentIdea = { ...ideaDoc };
  const stage1 = normalizeStage1(stage1Doc, investmentIdea);
  const stage2 = normalizeStage2(stage2Doc, investmentIdea);

  const base = {
    startupTitle: String(ideaDoc.startupTitle ?? ""),
    founderName: String(ideaDoc.founderName ?? "Founder"),
    industry: String(ideaDoc.industry ?? "SaaS / Tech"),
    stage1,
    stage2,
  };

  const defaultStage3 = buildStage3For(base);
  const stage3: StartupIdeaStage3 = {
    ...defaultStage3,
    legalAgreementText: String(stage3Doc.legalAgreementText ?? defaultStage3.legalAgreementText),
    milestones: (stage3Doc.milestones as StartupIdeaStage3["milestones"]) ?? defaultStage3.milestones,
    sampleProductName: String(stage3Doc.sampleProductName ?? defaultStage3.sampleProductName),
    sampleProductPricePkr: Number(stage3Doc.sampleProductPricePkr ?? defaultStage3.sampleProductPricePkr),
    socialProof: (stage3Doc.socialProof as StartupIdeaStage3["socialProof"]) ?? defaultStage3.socialProof,
  };

  const createdAtRaw = meta?.createdAt ?? Number(ideaDoc.createdAt ?? 0);

  return {
    id: String(ideaDoc.id ?? ""),
    founderName: base.founderName,
    startupTitle: base.startupTitle,
    industry: base.industry,
    description: String(ideaDoc.description ?? stage1.ideaDescription),
    accent: String(ideaDoc.accent ?? "#FFF8E1"),
    stage1,
    stage2,
    stage3,
    createdAt: createdAtRaw > 0 ? createdAtRaw : undefined,
    isFounderLive: meta?.isFounderLive,
  };
}

export async function pitchIdea(payload: PitchIdeaPayload): Promise<string> {
  const entrepreneurUid = resolveEntrepreneurUid(payload.entrepreneurUid);
  const ideaId = payload.editIdeaId || generateIdeaId();
  const { stage1: s1, stage2: s2, stage3: s3 } = payload;
  const projections =
    payload.projections ??
    calculateProfitProjections(s1.requiredInvestmentPkr, s1.expectedRoiPercent, s1.equityPercent);

  const productUrls = await Promise.all(
    s2.productImages.map((dataUrl, i) =>
      uploadPitchFile(entrepreneurUid, ideaId, "products", `product-${i}.jpg`, dataUrl),
    ),
  );
  const setupUrls = await Promise.all(
    s2.setupPhotos.map((dataUrl, i) =>
      uploadPitchFile(entrepreneurUid, ideaId, "setup", `setup-${i}.jpg`, dataUrl),
    ),
  );
  let customerLedgerUrl = s2.customerLedgerUrl;
  if (customerLedgerUrl?.startsWith("data:")) {
    customerLedgerUrl = await uploadPitchFile(
      entrepreneurUid,
      ideaId,
      "ledger",
      "customer-ledger.jpg",
      customerLedgerUrl,
    );
  }

  let agreementPdfUrl = s3.agreementPdfUrl;
  if (agreementPdfUrl?.startsWith("data:")) {
    agreementPdfUrl = await uploadPitchFile(
      entrepreneurUid,
      ideaId,
      "agreement",
      "agreement.pdf",
      agreementPdfUrl,
    );
  }

  const proofGallery = buildProofGallery(productUrls, setupUrls);
  if (customerLedgerUrl) {
    proofGallery.push({
      id: "ledger-1",
      url: customerLedgerUrl,
      caption: "Customer list / ledger — verified upload",
      type: "operations",
    });
  }

  const docs = assemblePitchFirestoreDocuments(ideaId, {
    entrepreneurUid,
    founderName: payload.founderName,
    stage1: s1,
    stage2: s2,
    stage3: { ...s3, agreementPdfUrl },
    projections,
    proofGallery,
    customerLedgerUrl,
  });

  const { syncPitchToRtdb } = await import("./backendSyncService");
  await syncPitchToRtdb(ideaId, docs, entrepreneurUid);

  await Promise.all([
    setDoc(doc(db, "investment_ideas", ideaId), {
      ...docs.investmentIdea,
      createdAt: serverTimestamp(),
    }),
    setDoc(doc(db, "pitches", ideaId), {
      ...docs.investmentIdea,
      uid: entrepreneurUid,
      createdAt: serverTimestamp(),
    }),
    setDoc(doc(db, "users", entrepreneurUid, "pitches", ideaId), {
      ...docs.investmentIdea,
      createdAt: serverTimestamp(),
    }),
    setDoc(doc(db, "stage1_data", ideaId), docs.stage1Data),
    setDoc(doc(db, "stage2_data", ideaId), docs.stage2Data),
    setDoc(doc(db, "stage3_data", ideaId), docs.stage3Data),
  ]).catch((err) => {
    console.warn("Firestore pitch mirror failed (RTDB feed is live):", err);
  });

  return ideaId;
}

export async function fetchPitchedIdeaById(ideaId: string): Promise<StartupIdea | null> {
  const ideaSnap = await getDoc(doc(db, "investment_ideas", ideaId));
  if (!ideaSnap.exists()) return null;

  const [s1Snap, s2Snap, s3Snap] = await Promise.all([
    getDoc(doc(db, "stage1_data", ideaId)),
    getDoc(doc(db, "stage2_data", ideaId)),
    getDoc(doc(db, "stage3_data", ideaId)),
  ]);

  if (!s1Snap.exists() || !s2Snap.exists() || !s3Snap.exists()) return null;

  return assembleStartupIdea(
    { id: ideaId, ...ideaSnap.data() },
    s1Snap.data(),
    s2Snap.data(),
    s3Snap.data(),
  );
}

export async function fetchAllPitchedIdeas(): Promise<StartupIdea[]> {
  const q = query(collection(db, "investment_ideas"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const ideas: StartupIdea[] = [];

  for (const ideaDoc of snap.docs) {
    const ideaId = ideaDoc.id;
    const assembled = await fetchPitchedIdeaById(ideaId);
    if (assembled) ideas.push(assembled);
  }

  return ideas;
}

export async function fetchPitchedIdeasByFounder(uid: string): Promise<StartupIdea[]> {
  const q = query(collection(db, "investment_ideas"), where("entrepreneurUid", "==", uid));
  const snap = await getDocs(q);
  const ideas: StartupIdea[] = [];

  for (const ideaDoc of snap.docs) {
    const assembled = await fetchPitchedIdeaById(ideaDoc.id);
    if (assembled) ideas.push(assembled);
  }

  return ideas;
}

function subscribeToIdeaStages(
  ideaId: string,
  onUpdate: (idea: StartupIdea | null) => void,
): () => void {
  let ideaMeta: Record<string, unknown> | null = null;
  let stage1: Record<string, unknown> | null = null;
  let stage2: Record<string, unknown> | null = null;
  let stage3: Record<string, unknown> | null = null;
  let ideaExists = false;

  const tryEmit = () => {
    if (!ideaExists) {
      onUpdate(null);
      return;
    }
    if (ideaMeta && stage1 && stage2 && stage3) {
      onUpdate(
        assembleStartupIdea({ id: ideaId, ...ideaMeta }, stage1, stage2, stage3),
      );
    }
  };

  const unsubs = [
    onSnapshot(doc(db, "investment_ideas", ideaId), (snap) => {
      ideaExists = snap.exists();
      ideaMeta = snap.exists() ? snap.data() : null;
      tryEmit();
    }),
    onSnapshot(doc(db, "stage1_data", ideaId), (snap) => {
      stage1 = snap.exists() ? snap.data() : null;
      tryEmit();
    }),
    onSnapshot(doc(db, "stage2_data", ideaId), (snap) => {
      stage2 = snap.exists() ? snap.data() : null;
      tryEmit();
    }),
    onSnapshot(doc(db, "stage3_data", ideaId), (snap) => {
      stage3 = snap.exists() ? snap.data() : null;
      tryEmit();
    }),
  ];

  return () => unsubs.forEach((u) => u());
}

function subscribeToPitchedIdeaCollection(
  firestoreQuery: ReturnType<typeof query>,
  callback: (ideas: StartupIdea[]) => void,
): () => void {
  const assembled = new Map<string, StartupIdea>();
  const ideaUnsubs = new Map<string, () => void>();

  const emitAll = () => {
    callback(sortIdeasNewestFirst(Array.from(assembled.values())));
  };

  const collectionUnsub = onSnapshot(
    firestoreQuery,
    (snap) => {
      const activeIds = new Set(snap.docs.map((d) => d.id));

      for (const [id, unsub] of ideaUnsubs) {
        if (!activeIds.has(id)) {
          unsub();
          ideaUnsubs.delete(id);
          assembled.delete(id);
        }
      }

      for (const ideaDoc of snap.docs) {
        const ideaId = ideaDoc.id;
        if (ideaUnsubs.has(ideaId)) continue;

        ideaUnsubs.set(
          ideaId,
          subscribeToIdeaStages(ideaId, (idea) => {
            if (idea) assembled.set(ideaId, { ...idea, isFounderLive: true });
            else assembled.delete(ideaId);
            emitAll();
          }),
        );
      }

      emitAll();
    },
    (err) => {
      console.warn("Pitched ideas listener error:", err);
      callback([]);
    },
  );

  return () => {
    collectionUnsub();
    ideaUnsubs.forEach((u) => u());
    ideaUnsubs.clear();
    assembled.clear();
  };
}

function assembleStartupIdeaFromFeed(
  ideaId: string,
  feed: Record<string, unknown>,
): StartupIdea | null {
  if (!feed || typeof feed !== "object") return null;

  const stage1Doc = ((feed.stage1 && typeof feed.stage1 === "object" ? feed.stage1 : feed) || {}) as Record<string, unknown>;
  const stage2Doc = ((feed.stage2 && typeof feed.stage2 === "object" ? feed.stage2 : feed) || {}) as Record<string, unknown>;
  const stage3Doc = ((feed.stage3 && typeof feed.stage3 === "object" ? feed.stage3 : feed) || {}) as Record<string, unknown>;

  const investmentIdea = (
    feed.investmentIdea && typeof feed.investmentIdea === "object"
      ? feed.investmentIdea
      : feed
  ) as Record<string, unknown>;

  const startupTitle = String(
    stage1Doc.ideaTitle ??
      stage1Doc.startupTitle ??
      investmentIdea.startupTitle ??
      feed.startupTitle ??
      feed.title ??
      feed.ideaTitle ??
      feed.businessName ??
      "",
  ).trim();

  if (!startupTitle) return null;

  const industry = String(
    stage1Doc.categoryIndustry ??
      stage1Doc.industry ??
      investmentIdea.industry ??
      feed.industry ??
      feed.categoryIndustry ??
      feed.category ??
      "SaaS / Tech",
  ).trim();

  const description = String(
    stage1Doc.ideaDescription ??
      stage1Doc.description ??
      investmentIdea.description ??
      feed.description ??
      feed.ideaDescription ??
      stage1Doc.coreProblemSolution ??
      "",
  ).trim();

  const productType = String(
    stage1Doc.productType ??
      feed.productType ??
      "Physical Product",
  );

  const founderName = String(
    investmentIdea.founderName ??
      feed.founderName ??
      feed.fullName ??
      "Verified Founder",
  );

  const createdAt = Number(feed.createdAt ?? feed.publishedAt ?? investmentIdea.createdAt ?? Date.now()) || Date.now();

  const assembled = assembleStartupIdea(
    {
      id: ideaId,
      ...investmentIdea,
      startupTitle,
      industry,
      description,
      founderName,
      productType,
    },
    stage1Doc,
    stage2Doc,
    stage3Doc,
    { createdAt, isFounderLive: true },
  );

  // Guarantee stage1 nested fields exist
  assembled.stage1 = {
    ...assembled.stage1,
    ideaTitle: startupTitle,
    categoryIndustry: industry,
    ideaDescription: description,
    productType,
  };
  (assembled as any).productType = productType;

  return assembled;
}

function sortIdeasNewestFirst(ideas: StartupIdea[]): StartupIdea[] {
  return [...ideas].sort((a, b) => {
    const ta = a.createdAt ?? 0;
    const tb = b.createdAt ?? 0;
    if (tb !== ta) return tb - ta;
    return a.startupTitle.localeCompare(b.startupTitle);
  });
}

/** Copy founder ideas from entrepreneurs/{uid}/ideas → investor_feed if missing. */
export async function backfillInvestorFeedForFounder(entrepreneurUid: string): Promise<number> {
  const ideasSnap = await get(ref(database, RTDB.entrepreneurIdeas(entrepreneurUid)));
  if (!ideasSnap.exists()) return 0;

  let synced = 0;
  const tasks: Promise<void>[] = [];

  ideasSnap.forEach((child) => {
    const ideaId = child.key!;
    tasks.push(
      (async () => {
        const existing = await get(ref(database, RTDB.investorFeedIdea(ideaId)));
        if (existing.exists()) return;

        const root = child.val() as Record<string, unknown>;
        const [s1Snap, s2Snap, s3Snap] = await Promise.all([
          get(ref(database, `${RTDB.entrepreneurIdea(entrepreneurUid, ideaId)}/stage1`)),
          get(ref(database, `${RTDB.entrepreneurIdea(entrepreneurUid, ideaId)}/stage2`)),
          get(ref(database, `${RTDB.entrepreneurIdea(entrepreneurUid, ideaId)}/stage3`)),
        ]);

        const ts = Number(root.createdAt ?? Date.now());
        const investmentIdea = { id: ideaId, entrepreneurUid, ...root };

        await set(ref(database, RTDB.investorFeedIdea(ideaId)), {
          entrepreneurUid,
          title: root.startupTitle ?? root.title,
          category: root.category,
          stage: "Stage 1",
          createdAt: ts,
          founderName: root.founderName,
          startupTitle: root.startupTitle,
          industry: root.industry,
          description: root.description,
          accent: root.accent,
          investmentIdea,
          stage1: s1Snap.exists() ? s1Snap.val() : {},
          stage2: s2Snap.exists() ? s2Snap.val() : {},
          stage3: s3Snap.exists() ? s3Snap.val() : {},
          status: root.status ?? "live",
          updatedAt: Date.now(),
        });
        synced += 1;
      })(),
    );
  });

  await Promise.all(tasks);
  return synced;
}

function subscribeToInvestorFeedRtdb(
  callback: (ideas: StartupIdea[]) => void,
  filterUid?: string,
): () => void {
  return onValue(
    ref(database, RTDB.investorFeed),
    (snap) => {
      const ideas: StartupIdea[] = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          const feed = child.val() as Record<string, unknown>;
          if (filterUid && feed.entrepreneurUid !== filterUid) return;
          const assembled = assembleStartupIdeaFromFeed(child.key!, feed);
          if (assembled) ideas.push(assembled);
        });
      }
      callback(sortIdeasNewestFirst(ideas));
    },
    (err) => {
      console.warn("investor_feed RTDB listener error:", err);
      callback([]);
    },
  );
}

/** Live listener for all pitched ideas — RTDB investor_feed + collectionGroup('pitches') + founders/{uid}/pitches. */
export function subscribeToAllPitchedIdeas(
  callback: (ideas: StartupIdea[]) => void,
): () => void {
  const rtdbIdeas = new Map<string, StartupIdea>();
  const fsIdeas = new Map<string, StartupIdea>();
  const foundersPitches = new Map<string, StartupIdea>();

  const emit = () => {
    const merged = new Map<string, StartupIdea>([...fsIdeas, ...foundersPitches, ...rtdbIdeas]);
    callback(sortIdeasNewestFirst(Array.from(merged.values())));
  };

  const unsubRtdb = subscribeToInvestorFeedRtdb((ideas) => {
    rtdbIdeas.clear();
    for (const idea of ideas) rtdbIdeas.set(idea.id, idea);
    emit();
  });

  const unsubFsGroup = onSnapshot(
    collectionGroup(db, "pitches"),
    (snap) => {
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const assembled = assembleStartupIdeaFromFeed(docSnap.id, data);
        if (assembled) {
          fsIdeas.set(docSnap.id, { ...assembled, isFounderLive: true });
        }
      });
      emit();
    },
    (err) => {
      console.warn("Collection group 'pitches' snapshot listener notice:", err);
    },
  );

  const unsubFs = subscribeToPitchedIdeaCollection(
    query(collection(db, "investment_ideas"), orderBy("createdAt", "desc")),
    (ideas) => {
      for (const idea of ideas) fsIdeas.set(idea.id, { ...idea, isFounderLive: true });
      emit();
    },
  );

  const unsubFoundersRtdb = onValue(
    ref(database, "founders"),
    (snap) => {
      foundersPitches.clear();
      if (snap.exists()) {
        snap.forEach((founderChild) => {
          const pitchesSnap = founderChild.child("pitches");
          if (pitchesSnap.exists()) {
            pitchesSnap.forEach((pitchChild) => {
              const feed = pitchChild.val() as Record<string, unknown>;
              const assembled = assembleStartupIdeaFromFeed(pitchChild.key!, feed);
              if (assembled) {
                foundersPitches.set(pitchChild.key!, { ...assembled, isFounderLive: true });
              }
            });
          }
        });
      }
      emit();
    },
    (err) => {
      console.warn("RTDB founders pitches listener notice:", err);
    },
  );

  const unsubRootPitchesRtdb = onValue(
    ref(database, "pitches"),
    (snap) => {
      if (snap.exists()) {
        snap.forEach((pitchChild) => {
          const feed = pitchChild.val() as Record<string, unknown>;
          const assembled = assembleStartupIdeaFromFeed(pitchChild.key!, feed);
          if (assembled) {
            foundersPitches.set(pitchChild.key!, { ...assembled, isFounderLive: true });
          }
        });
      }
      emit();
    },
    (err) => {
      console.warn("RTDB root pitches listener notice:", err);
    },
  );

  return () => {
    unsubRtdb();
    unsubFsGroup();
    unsubFs();
    unsubFoundersRtdb();
    unsubRootPitchesRtdb();
    rtdbIdeas.clear();
    fsIdeas.clear();
    foundersPitches.clear();
  };
}

/** Live listener for a founder's pitched ideas — RTDB investor_feed + Firestore. */
export function subscribeToPitchedIdeasByFounder(
  uid: string,
  callback: (ideas: StartupIdea[]) => void,
): () => void {
  const rtdbIdeas = new Map<string, StartupIdea>();
  const fsIdeas = new Map<string, StartupIdea>();

  const emit = () => {
    const merged = new Map<string, StartupIdea>([...fsIdeas, ...rtdbIdeas]);
    callback(sortIdeasNewestFirst(Array.from(merged.values())));
  };

  void backfillInvestorFeedForFounder(uid).catch((err) =>
    console.warn("Investor feed backfill skipped:", err),
  );

  const unsubRtdb = subscribeToInvestorFeedRtdb((ideas) => {
    rtdbIdeas.clear();
    for (const idea of ideas) rtdbIdeas.set(idea.id, idea);
    emit();
  }, uid);

  const unsubFs = subscribeToPitchedIdeaCollection(
    query(collection(db, "investment_ideas"), where("entrepreneurUid", "==", uid)),
    (ideas) => {
      fsIdeas.clear();
      for (const idea of ideas) fsIdeas.set(idea.id, { ...idea, isFounderLive: true });
      emit();
    },
  );

  return () => {
    unsubRtdb();
    unsubFs();
    rtdbIdeas.clear();
    fsIdeas.clear();
  };
}

/** Live listener for a single pitched idea — RTDB investor_feed (primary) + Firestore mirror. */
export function subscribeToPitchedIdeaById(
  ideaId: string,
  callback: (idea: StartupIdea | null) => void,
): () => void {
  let rtdbIdea: StartupIdea | null = null;
  let fsIdea: StartupIdea | null = null;
  let rtdbReady = false;
  let fsReady = false;

  const emit = () => {
    if (!rtdbReady && !fsReady) return;
    callback(rtdbIdea ?? fsIdea);
  };

  const unsubRtdb = onValue(
    ref(database, RTDB.investorFeedIdea(ideaId)),
    (snap) => {
      rtdbReady = true;
      rtdbIdea = snap.exists()
        ? assembleStartupIdeaFromFeed(ideaId, snap.val() as Record<string, unknown>)
        : null;
      emit();
    },
    (err) => {
      console.warn("investor_feed idea listener error:", err);
      rtdbReady = true;
      rtdbIdea = null;
      emit();
    },
  );

  const unsubFs = subscribeToIdeaStages(ideaId, (idea) => {
    fsReady = true;
    fsIdea = idea;
    emit();
  });

  return () => {
    unsubRtdb();
    unsubFs();
  };
}
