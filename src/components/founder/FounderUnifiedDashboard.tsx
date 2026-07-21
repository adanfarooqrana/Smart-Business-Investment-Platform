import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Rocket, MessageSquare, Sun, ShieldCheck, Landmark, ArrowRight, CheckCircle2, X, LogOut, Layout, BookOpen, CreditCard, Users, ClipboardCheck, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "sonner";

import { FounderCommunityLounge } from "./FounderCommunityLounge";
import { CommunityErrorBoundary } from "./CommunityErrorBoundary";
import { FounderGroupsPanel } from "./FounderGroupsPanel";
import { CommunityProfileDrawer } from "./CommunityProfileDrawer";
import { FounderProfilePanel } from "./FounderProfilePanel";
import { SunGlowTransition } from "./SunGlowTransition";
import { PaymentOTPModal } from "./PaymentOTPModal";

import { PitchIdeaWizard } from "@/components/entrepreneur/PitchIdeaWizard";
import { FounderChatsPanel } from "@/components/founder/FounderChatsPanel";
import { FounderPaymentDesk } from "@/components/founder/FounderPaymentDesk";
import { useAppState } from "@/hooks/useAppState";
import { useAuth } from "@/contexts/AuthContext";
import {
  publishCustomFounderPitch,
  triggerPayoutRequest,
  lockPayoutAsCompleted,
  updateSampleOrderStage,
  removeSampleOrder,
  fetchFounderWorkspace,
  streamFounderWorkspace,
  streamFounderApprovedLedgerAndStats,
  attachPayoutReceipt,
  type FounderWorkspaceSnapshot,
  type FounderApprovedLedgerRow,
} from "../../services/founderFirebaseService";
import {
  streamFounderInboundTransactions,
  upsertFounderBankingDetails,
  type PitchTransactionNode,
} from "@/services/investorFirebaseService";
import { markTransactionAsPaidAndActivatePortfolio } from "@/services/investorCoreService";

import type { EntrepreneurPayment, SampleOrder } from "@/hooks/useAppState";
import type { StartupIdea } from "@/data/startupIdeas";
import type { EntrepreneurMetrics } from "@/services/entrepreneurService";

type FounderLiveMetrics = {
  totalFundingRaised: number;
  activeInvestorsCount: number;
};

type FounderBankDetails = {
  accountTitle: string;
  bankName: string;
  iban: string;
};

type Props = {
  founderUid: string;
  displayName: string;
  profileId: string;
  email?: string;
  phone?: string;
  paymentType?: string;
  bankAccountNumber?: string;
  isVerified?: boolean;
  ideaVision?: string;
  ideaInterest?: string;
  founderGoals?: string;
  metrics: EntrepreneurMetrics;
  myIdeas: StartupIdea[];
  sampleOrders: SampleOrder[];
  entrepreneurPayments: EntrepreneurPayment[];
  totalFollowers: number;
  problemsSolved: number;
  fundingRaised: number;
  onRoutedProblem: (data: {
    problemId: string;
    title: string;
    description: string;
    category: string;
    targetRole: "wholesalers" | "business_owners" | "both";
    urgency: "High" | "Medium" | "Low";
    experts: string[];
    routingSummary: string;
  }) => void;
  onAdvanceSample: (orderId: string) => void;
};

export function FounderUnifiedDashboard({
  founderUid,
  displayName,
  profileId,
  email,
  phone,
  paymentType,
  bankAccountNumber,
  isVerified,
  ideaVision: _legacyIdeaVision,
  ideaInterest,
  founderGoals,
  metrics: _legacyMetrics,
  myIdeas: _legacyMyIdeas,
  sampleOrders: _legacySampleOrders,
  entrepreneurPayments,
  totalFollowers,
  problemsSolved,
  fundingRaised: _legacyFundingRaised,
  onRoutedProblem,
  onAdvanceSample,
}: Props) {
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();
  const { communityPosts, likedPosts, resetState } = useAppState();
  const activeUid = founderUid || currentUser?.uid || "";
  const [activeView, setActiveView] = useState<"dashboard" | "community">("dashboard");
  const [activeTab, setActiveTab] = useState<"workspace" | "ideas" | "payout" | "community" | "samples" | "messages">("workspace");
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [showPitchWizard, setShowPitchWizard] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [sunGlow, setSunGlow] = useState<"none" | "community" | "profile">("none");
  const [paymentOpen, setPaymentOpen] = useState(false);

  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [editingInitialData, setEditingInitialData] = useState<any>(null);
  const [expandedIdeaId, setExpandedIdeaId] = useState<string | null>(null);
  const [payoutStatus, setPayoutStatus] = useState<"Pending" | "Delivered">("Pending");
  const [payoutStage, setPayoutStage] = useState<"initial" | "requested" | "proof_uploaded" | "completed">("initial");
  const [activePayoutId, setActivePayoutId] = useState<string | null>(null);
  const [payoutReceiptUrl, setPayoutReceiptUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tab #1: live 2-box stats from approved pitches/{pitchId}/transactions
  const [liveMetrics, setLiveMetrics] = useState<FounderLiveMetrics>({
    totalFundingRaised: 0,
    activeInvestorsCount: 0,
  });
  const [approvedLedger, setApprovedLedger] = useState<FounderApprovedLedgerRow[]>([]);
  const [bankDetails, setBankDetails] = useState<FounderBankDetails>({
    accountTitle: displayName || "",
    bankName: "",
    iban: bankAccountNumber || "",
  });

  // Tab #2: strict zero-state — no pre-generated onboarding ideas
  const [ideas, setIdeas] = useState<StartupIdea[]>([]);
  type DashboardPayment = Omit<EntrepreneurPayment, "status"> & {
    status: EntrepreneurPayment["status"] | "disbursed" | "requested" | "completed" | "proof_uploaded";
    updatedAt?: number;
  };
  const [payments, setPayments] = useState<DashboardPayment[]>(
    (entrepreneurPayments || []) as DashboardPayment[],
  );
  const [localSampleOrders, setLocalSampleOrders] = useState<SampleOrder[]>([]);
  const [inboundTransactions, setInboundTransactions] = useState<PitchTransactionNode[]>([]);
  const [approvingTxKey, setApprovingTxKey] = useState<string | null>(null);

  const pitchIds = useMemo(() => ideas.map((i) => i.id).filter(Boolean), [ideas]);

  useEffect(() => {
    if (pitchIds.length === 0) {
      setInboundTransactions([]);
      return;
    }
    return streamFounderInboundTransactions(pitchIds, setInboundTransactions);
  }, [pitchIds.join("|")]);

  // Real-time 2-box aggregator + approved ledger (pitches/{pitchId}/transactions)
  useEffect(() => {
    if (!activeUid) {
      setLiveMetrics({ totalFundingRaised: 0, activeInvestorsCount: 0 });
      setApprovedLedger([]);
      return;
    }
    return streamFounderApprovedLedgerAndStats(activeUid, ({ stats, approvedLedger: rows }) => {
      try {
        setLiveMetrics({
          totalFundingRaised: Number(stats.totalFundingRaised) || 0,
          activeInvestorsCount: Number(stats.activeInvestorsCount) || 0,
        });
        setApprovedLedger(Array.isArray(rows) ? rows : []);
      } catch (error) {
        console.error("Founder approved ledger UI sync error:", error);
      }
    });
  }, [activeUid]);

  useEffect(() => {
    // Only seed from parent props when Firebase nested payments are still empty
    if ((entrepreneurPayments || []).length === 0) return;
    setPayments((prev) => (prev.length > 0 ? prev : ((entrepreneurPayments || []) as DashboardPayment[])));
  }, [entrepreneurPayments]);

  const mapPitchToIdea = (raw: any): StartupIdea => {
    const stage1 = raw.stage1 && typeof raw.stage1 === "object" ? raw.stage1 : {};
    const stage2 = raw.stage2 && typeof raw.stage2 === "object" ? raw.stage2 : {};
    const stage3 = raw.stage3 && typeof raw.stage3 === "object" ? raw.stage3 : {};
    const description = String(stage1.ideaDescription || raw.ideaDescription || "");
    const industry = String(stage1.categoryIndustry || raw.categoryIndustry || "General");
    const yearsExp = Number(stage2.yearsOfExperience || 0) || 0;
    const investment = Number(stage1.requiredInvestmentPkr || 0) || 0;
    const equity = Number(stage1.equityOfferedPercent || 0) || 0;
    const roi = Number(stage1.expectedRoiPercent || 0) || 0;
    const pitch: StartupIdea = {
      id: String(raw.pitchId || raw.id),
      founderName: displayName,
      startupTitle: String(stage1.ideaTitle || raw.ideaTitle || "Untitled Idea"),
      industry,
      description,
      accent: "#FFD700",
      createdAt: Number(raw.createdAt || Date.now()),
      isFounderLive: true,
      stage1: {
        ideaDescription: description,
        expectedRoi: `${roi}% annually`,
        profitSharingPercent: "N/A",
        ebitdaEstimate: "N/A",
        equityOffered: `${equity}%`,
        industryField: industry,
      },
      stage2: {
        totalCapitalRequiredPkr: investment,
        expenseBreakdown: [],
        customerBaseSize: String(stage2.existingCustomerBaseSize || "N/A"),
        currentValuationPkr: equity > 0 ? Math.round(investment / (equity / 100)) : 0,
        investmentFormula: {
          totalRaisePkr: investment,
          maxEquityPercent: equity,
          projectedAnnualReturnRate: roi / 100,
        },
        founderBackground: {
          yearsExperience: yearsExp,
          priorVentures: "N/A",
          education: "N/A",
          verificationScore: 0,
        },
        marketInsight: {
          location: String(stage2.marketLocation || "Pakistan"),
          demandGrowthYoY: 0,
          marketSummary: String(stage2.marketSummary || ""),
          viabilityRating: "Medium",
        },
        proofGallery: [],
        productLiveUrl: String(stage2.productUrl || ""),
      },
      stage3: {
        legalAgreementText: String(stage3.customAgreementText || "N/A"),
        milestones: [],
        sampleProductName: String(stage2.sampleProductName ?? "N/A"),
        sampleProductPricePkr: Number(stage2.sampleProductPricePkr ?? 0) || 0,
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
    return Object.assign(pitch, {
      investorsViewedIdea: Number(raw.investorsViewedIdea || 0),
      productType: stage1.productType || raw.productType,
      stage1Meta: stage1,
      stage2Meta: stage2,
      stage3Meta: stage3,
    });
  };

  const applyWorkspaceSnapshot = (workspace: FounderWorkspaceSnapshot) => {
    try {
      // Interim 2-box hydrate — live pitches aggregator remains source of truth
      setLiveMetrics({
        totalFundingRaised: Number(workspace.stats.totalFundingRaised ?? 0) || 0,
        activeInvestorsCount: Number(workspace.stats.activeInvestorsCount ?? 0) || 0,
      });

      if (workspace.profile?.bankDetails) {
        const nextBank = {
          accountTitle: String(workspace.profile.bankDetails.accountTitle || displayName || ""),
          bankName: String(workspace.profile.bankDetails.bankName || ""),
          iban: String(workspace.profile.bankDetails.iban || ""),
        };
        setBankDetails(nextBank);
        if (activeUid) {
          void upsertFounderBankingDetails(activeUid, {
            bankName: nextBank.bankName,
            accountTitleName: nextBank.accountTitle,
            accountNumber: nextBank.iban,
          }).catch((err) => console.warn("bankingDetails sync skipped:", err));
        }
      }

      setIdeas((workspace.pitches || []).map(mapPitchToIdea).slice(0, 3));

      const paymentsList: DashboardPayment[] = (workspace.payments || []).map((raw: any) => ({
        id: String(raw.id || raw.payoutId),
        startupTitle: String(raw.startupTitle || "Investment Payout"),
        investorName: String(raw.investorName || "Investor"),
        amountPkr: Number(raw.amountPkr ?? raw.amount ?? 0),
        amountDisplay: String(
          raw.amountDisplay || `PKR ${Number(raw.amountPkr ?? raw.amount ?? 0).toLocaleString()}`,
        ),
        paymentMethod: String(raw.paymentMethod || "BANK"),
        timestamp: String(raw.timestamp || new Date().toLocaleString("en-PK")),
        status: (raw.status || "received") as DashboardPayment["status"],
        equityPercent: raw.equityPercent,
        updatedAt: Number(raw.updatedAt || 0),
      }));
      setPayments(paymentsList);

      const latest = [...paymentsList].sort(
        (a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0),
      )[0];
      if (latest?.status === "proof_uploaded") {
        setPayoutStage("proof_uploaded");
        setActivePayoutId(latest.id);
      } else if (latest?.status === "completed") {
        setPayoutStage("completed");
        setPayoutStatus("Delivered");
        setActivePayoutId(latest.id);
      } else if (latest?.status === "requested") {
        setPayoutStage("requested");
        setActivePayoutId(latest.id);
      }

      setLocalSampleOrders((workspace.sampleOrders || []) as SampleOrder[]);
    } catch (err) {
      console.error("applyWorkspaceSnapshot failed:", err);
    }
  };

  // Root mount: initial fetch + live founders/{uid} tree sync (survives hard refresh)
  useEffect(() => {
    if (!activeUid) return;
    let unsub: (() => void) | undefined;
    let cancelled = false;

    const boot = async () => {
      try {
        const initial = await fetchFounderWorkspace(activeUid);
        if (!cancelled) applyWorkspaceSnapshot(initial);
      } catch (err) {
        console.warn("Initial founder workspace fetch skipped:", err);
      }

      try {
        unsub = streamFounderWorkspace(activeUid, (workspace) => {
          if (!cancelled) applyWorkspaceSnapshot(workspace);
        });
      } catch (err) {
        console.warn("Founder workspace live stream skipped:", err);
      }
    };

    void boot();

    return () => {
      cancelled = true;
      if (typeof unsub === "function") unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUid, displayName]);

  const founderUsername = `u/${displayName.toLowerCase().replace(/\s+/g, "_")}`;
  const totalLikes = (communityPosts ?? []).reduce((s, p) => s + (p.votes ?? 0), 0) + (likedPosts?.length ?? 0);

  const openCommunity = () => setSunGlow("community");
  const openProfile = () => setSunGlow("profile");

  const onSunComplete = () => {
    if (sunGlow === "community") {
      setActiveTab("community");
      setActiveView("community");
    }
    if (sunGlow === "profile") setShowProfile(true);
    setSunGlow("none");
  };

  const handleLogout = async () => {
    try {
      const { clearCommunitySession } = await import(
        "@/components/community/CommunityGuestAuthPanel"
      );
      clearCommunitySession();
      await logout();
      resetState();
      if (typeof window !== "undefined") {
        try {
          sessionStorage.clear();
        } catch {
          /* ignore */
        }
      }
      navigate({ to: "/" });
      toast.success("Successfully logged out.");
    } catch (err) {
      console.error(err);
      toast.error("Logout failed.");
    }
  };

  // Strict zero-state idea grid — empty until wizard publishes Idea 1+
  const displayIdeas = ideas.slice(0, 3);
  const createdCount = displayIdeas.length;
  const remainingCount = Math.max(0, 3 - createdCount);

  const handlePitchSuccess = async (ideaId: string, updatedIdea?: any) => {
    if (!activeUid) {
      toast.error("Founder session missing. Please sign in again.");
      return;
    }
    setIsSubmitting(true);
    try {
      const s1 = updatedIdea?.stage1 && typeof updatedIdea.stage1 === "object" ? updatedIdea.stage1 : {};
      const s2 = updatedIdea?.stage2 && typeof updatedIdea.stage2 === "object" ? updatedIdea.stage2 : {};
      const s3 = updatedIdea?.stage3 && typeof updatedIdea.stage3 === "object" ? updatedIdea.stage3 : {};

      // Combine wizard multi-step state into rigid Stage 1 → 2 → 3 sequence
      const formData = {
        productType: String(updatedIdea?.productType || s1.productType || "Physical Product"),
        stage1: {
          ideaTitle: String(s1.ideaTitle || updatedIdea?.startupTitle || `Idea ${ideas.length + 1}`),
          categoryIndustry: String(s1.categoryIndustry || updatedIdea?.industry || ideaInterest || "General"),
          ideaDescription: String(s1.ideaDescription || updatedIdea?.description || ""),
          productType: String(updatedIdea?.productType || s1.productType || "Physical Product"),
          coreProblemSolution: String(s1.coreProblemSolution || ""),
          requiredInvestmentPkr: Number(
            s1.requiredInvestmentPkr ?? s2.totalCapitalRequiredPkr ?? 0,
          ),
          equityOfferedPercent: Number(
            s1.equityOfferedPercent ?? s2.investmentFormula?.maxEquityPercent ?? 0,
          ),
          expectedRoiPercent: Number(
            s1.expectedRoiPercent ??
              (typeof s2.investmentFormula?.projectedAnnualReturnRate === "number"
                ? s2.investmentFormula.projectedAnnualReturnRate * 100
                : 0),
          ),
        },
        stage2: {
          productUrl: String(
            s2.productUrl || s2.productLiveUrl || updatedIdea?.productLiveUrl || "N/A",
          ),
          existingCustomerBaseSize: String(
            s2.existingCustomerBaseSize || s2.customerBaseSize || "",
          ),
          marketLocation: String(s2.marketLocation || s2.marketInsight?.location || ""),
          yearsOfExperience: String(
            s2.yearsOfExperience ?? s2.founderBackground?.yearsExperience ?? "",
          ),
          marketSummary: String(s2.marketSummary || s2.marketInsight?.marketSummary || ""),
          sampleProductName: String(s2.sampleProductName || s3.sampleProductName || "N/A"),
          sampleProductPricePkr: Number(s2.sampleProductPricePkr ?? s3.sampleProductPricePkr ?? 0),
        },
        stage3: {
          customAgreementText: String(
            s3.customAgreementText || s3.legalAgreementText || "",
          ),
        },
      };

      const isEdit = Boolean(editingIdeaId && ideaId && editingIdeaId === ideaId);
      const publishedId = await publishCustomFounderPitch(
        activeUid,
        isEdit ? ideaId : null,
        formData,
      );

      const cardIdea = mapPitchToIdea({
        pitchId: publishedId,
        id: publishedId,
        ideaTitle: formData.stage1.ideaTitle,
        categoryIndustry: formData.stage1.categoryIndustry,
        ideaDescription: formData.stage1.ideaDescription,
        productType: formData.stage1.productType,
        createdAt: Date.now(),
        investorsViewedIdea: 0,
        stage1: formData.stage1,
        stage2: formData.stage2,
        stage3: formData.stage3,
      });

      setIdeas((prev) => {
        if (isEdit) {
          return prev.map((i) => (i.id === ideaId || i.id === publishedId ? cardIdea : i));
        }
        const exists = prev.some((i) => i.id === publishedId);
        if (exists) return prev.map((i) => (i.id === publishedId ? cardIdea : i));
        return [...prev, cardIdea].slice(0, 3);
      });
      setShowPitchWizard(false);
      setEditingIdeaId(null);
      setEditingInitialData(null);
      toast.success(isEdit ? "Venture data refreshed successfully." : `Idea ${Math.min(ideas.length + 1, 3)} published successfully!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to publish pitch.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestPayout = async () => {
    if (!activeUid || isSubmitting) return;
    setIsSubmitting(true);
    const payoutId = `payout-${Date.now()}`;
    const balance = 500000;
    try {
      await triggerPayoutRequest(activeUid, payoutId, balance);
      setActivePayoutId(payoutId);
      setPayoutStage("requested");
      toast.success("Payout request sent to admin!");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to request payout.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPayoutReceipt = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const payoutId = activePayoutId || `payout-completed-${Date.now()}`;
    try {
      if (payoutReceiptUrl && activeUid) {
        await attachPayoutReceipt(activeUid, payoutId, payoutReceiptUrl);
      }
      await lockPayoutAsCompleted(activeUid, payoutId, payoutReceiptUrl || undefined);
      setPayoutStage("completed");
      setPayoutStatus("Delivered");
      toast.success("Receipt confirmed & marked as paid! Funds transferred.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to confirm payout.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Escrow Payout Clearing & Log updates
  const handleDisburse = async (paymentId: string) => {
    setIsSubmitting(true);
    try {
      setPayments((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, status: "disbursed" as any } : p))
      );
      await lockPayoutAsCompleted(activeUid, paymentId);
      toast.success("Transaction cleared! Funds released to your verified personal bank ledger.");
    } catch (err) {
      console.error(err);
      toast.error("Disbursement failed. Please verify network state.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkTransactionPaid = async (tx: PitchTransactionNode) => {
    const key = `${tx.pitchId}:${tx.investorId}`;
    if (approvingTxKey || !tx.pitchId || !tx.investorId) return;
    setApprovingTxKey(key);
    try {
      await markTransactionAsPaidAndActivatePortfolio(tx.pitchId, tx.investorId);
      toast.success("Marked as paid — investor portfolio updated.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to approve transaction.");
    } finally {
      setApprovingTxKey(null);
    }
  };

  // Sample Request Pipeline update handlers
  const handleAcceptSample = async (orderId: string) => {
    setIsSubmitting(true);
    try {
      await updateSampleOrderStage(activeUid, orderId, "packed");
      setLocalSampleOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, stage: "packed" } : o))
      );
      onAdvanceSample(orderId);
      toast.success("B2B sample order accepted! Staging logistics workflow initialized.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to accept sample order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSample = async (orderId: string) => {
    setIsSubmitting(true);
    try {
      await removeSampleOrder(activeUid, orderId);
      setLocalSampleOrders((prev) => prev.filter((o) => o.id !== orderId));
      toast.info("B2B sample request rejected & cleared.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to reject sample order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sidebarMenu = [
    { id: "workspace", label: "Founder Quote", icon: Layout },
    { id: "ideas", label: "Idea Configuration", icon: BookOpen },
    { id: "payout", label: "Cash Payout", icon: CreditCard },
    { id: "community", label: "Community Lounge", icon: Users },
    { id: "samples", label: "Sample Request", icon: ClipboardCheck },
    { id: "messages", label: "Investor Query", icon: MessageSquare },
  ] as const;

  const founderInitials = displayName ? displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "F";

  return (
    <div className="flex min-h-screen bg-white text-[#0f172a] font-sans antialiased">
      <Toaster position="bottom-right" theme="light" closeButton />

      <style>{`
        .white-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 1.5rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        }
        .white-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #475569;
        }
        .white-value {
          font-size: 1.125rem;
          font-weight: 800;
          color: #0f172a;
        }
      `}</style>

      {showPitchWizard && activeUid && (
        <PitchIdeaWizard
          entrepreneurUid={activeUid}
          founderName={displayName}
          onClose={() => setShowPitchWizard(false)}
          onSuccess={handlePitchSuccess}
        />
      )}

      <SunGlowTransition
        active={sunGlow !== "none"}
        onComplete={onSunComplete}
        label={sunGlow === "community" ? "Opening Community Lounge..." : "Opening Founder Profile..."}
      />

      <PaymentOTPModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        method="jazzcash"
        userId={founderUid}
        userName={displayName}
        userRole="entrepreneur"
        email={email || ""}
        amountPkr={50000}
        onVerified={() => toast.success("Payment authenticated & logged!")}
      />

      {/* Left Sidebar Menu with Overflow and custom Scrollbar styling */}
      <aside className="h-screen sticky top-0 z-20 flex w-64 shrink-0 flex-col justify-between border-r border-slate-800 bg-[#0f172a] text-white px-5 py-6 shadow-xl overflow-y-auto max-h-screen scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <div>
          <div className="mb-8 flex items-center gap-3 border-b border-slate-800 pb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black shadow-md">
              <Sun className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <span className="font-display font-black text-xl tracking-tight text-orange-500 block">Founder</span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Founder Suite</span>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">
              WORKSPACE DASHBOARD
            </p>
            <nav className="flex flex-col gap-1">
              {sidebarMenu.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (item.id === "community") {
                        setActiveView("community");
                      } else {
                        setActiveView("dashboard");
                      }
                    }}
                    className={`flex w-full items-center gap-3.5 px-5 py-3.5 text-[15px] font-semibold rounded-lg transition ${
                      activeTab === item.id
                        ? "bg-slate-800 text-white"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Dynamic User Profile Card & Sign Out */}
        <div className="border-t border-slate-800 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-slate-950 font-bold text-sm">
              {founderInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-white truncate leading-snug">{displayName}</p>
              <p className="text-[11px] text-slate-400 truncate">{email || "founder@smartbiz.ai"}</p>
              <button
                onClick={handleLogout}
                className="text-red-400 hover:text-red-300 text-xs font-semibold block mt-0.5 transition"
              >
                Sign Out / Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Right Main Container (No top navbar wrapper) */}
      <div className="flex-1 min-h-screen bg-white">
        <main className="mx-auto max-w-[1300px] p-10">
          {activeView === "community" ? (
            <CommunityErrorBoundary onReset={() => setActiveView("community")}>
              <FounderCommunityLounge
                founderId={founderUid}
                founderUsername={founderUsername}
                displayName={displayName}
                ownerName={displayName}
                authorPhoto={
                  String(currentUser?.photoURL || "").trim() || undefined
                }
                userRole="entrepreneur"
                entry="workspace"
                backLabel="← Back to Dashboard"
                isOpen
                embedded
                onClose={() => {
                  setActiveTab("workspace");
                  setActiveView("dashboard");
                }}
                onViewProfile={(u) => setProfileUsername(u)}
              />
            </CommunityErrorBoundary>
          ) : (
            // Swappable Right Workspace Content Views
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* VIEW 1: MANAGE WORKSPACE (Exclusive 4 stats boxes in original colors) */}
              {activeTab === "workspace" && (
                <div className="space-y-6">
                  <div className="rounded-3xl border border-[#FFD700]/20 p-6 md:p-8"
                    style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)" }}
                  >
                    <div className="mb-6">
                      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#FFD700]/70">
                        Founder Command Center
                      </p>
                      <h2 className="font-display text-3xl font-extrabold text-white">
                        Welcome back, <span style={{ background: "linear-gradient(90deg, #FFD700, #FFA500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{displayName}</span>!
                      </h2>
                      <p className="mt-2 text-sm text-slate-400">
                        Here is a high-level overview of your venture progress and metrics.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* Card 1 — Total Funding Raised */}
                      <div className="rounded-2xl border border-white/10 p-5 bg-white/5 transition-all hover:border-[#FFD700]/40">
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                          style={{ background: "linear-gradient(135deg, #FFD70033, #FFD70011)", boxShadow: "0 0 16px #FFD70033" }}>
                          <Rocket className="h-5 w-5 text-[#FFD700]" />
                        </div>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Funding Raised</p>
                        <h4 className="font-display text-2xl font-black text-white mt-1">
                          {liveMetrics.totalFundingRaised > 0 ? `Rs. ${liveMetrics.totalFundingRaised.toLocaleString()}` : "Rs. 0"}
                        </h4>
                      </div>

                      {/* Card 2 — Active Investors */}
                      <div className="rounded-2xl border border-white/10 p-5 bg-white/5 transition-all hover:border-[#FFA500]/40">
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                          style={{ background: "linear-gradient(135deg, #FFA50033, #FFA50011)", boxShadow: "0 0 16px #FFA50033" }}>
                          <Users className="h-5 w-5 text-[#FFA500]" />
                        </div>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Investors</p>
                        <h4 className="font-display text-2xl font-black text-white mt-1">
                          {liveMetrics.activeInvestorsCount}
                        </h4>
                      </div>
                    </div>

                    {/* Approved investment breakdown — pitches / transactions (status approved) */}
                    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#FFD700]/70">
                        Approved Investment Ledger
                      </p>
                      {approvedLedger.length === 0 ? (
                        <p className="py-4 text-center text-xs text-slate-500">
                          No approved investments yet. Mark inbound payments as paid to populate this table.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[480px] text-left text-xs text-slate-300">
                            <thead>
                              <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
                                <th className="pb-2 pr-3 font-semibold">Investor</th>
                                <th className="pb-2 pr-3 font-semibold">Business</th>
                                <th className="pb-2 font-semibold text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {approvedLedger.map((row) => {
                                const invId = String(row.investorId || "").trim();
                                const invLabel = invId
                                  ? invId.length > 12
                                    ? `${invId.substring(0, 6)}...${invId.substring(invId.length - 4)}`
                                    : invId
                                  : "N/A";
                                return (
                                <tr
                                  key={`${row.pitchId}:${row.investorId}:${row.timestamp}`}
                                  className="border-b border-white/5 last:border-0"
                                >
                                  <td className="py-2.5 pr-3">
                                    <div className="flex flex-col items-start justify-center">
                                      <span className="font-semibold text-white">
                                        {String(row.investorName || invId || "—")}
                                      </span>
                                      <span className="mt-0.5 font-mono text-xs text-gray-400">
                                        ID: {invLabel}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 pr-3 text-slate-300">
                                    {String(row.startupTitle || row.pitchId || "—")}
                                  </td>
                                  <td className="py-2.5 text-right font-display font-bold tabular-nums text-[#FFD700]">
                                    {String(row.amountDisplay || `PKR ${Number(row.amountInvested || 0).toLocaleString()}`)}
                                  </td>
                                </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 2: IDEA SLOTS & CONFIGURATION */}
              {activeTab === "ideas" && (
                <div className="space-y-6">
                  {/* Account Limit Banner */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                      <span className="text-xs font-bold text-slate-700">
                        Account Idea Limits: 3 Maximum. {createdCount} Created, {remainingCount} Remaining
                      </span>
                    </div>
                    {createdCount < 3 && (
                      <Button
                        size="sm"
                        onClick={() => setShowPitchWizard(true)}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg px-4"
                      >
                        + Create Custom Pitch
                      </Button>
                    )}
                  </div>

                  {/* Capped Grid View */}
                  <div className="grid gap-6 md:grid-cols-3">
                    {displayIdeas.map((idea, idx) => {
                      const meta = idea as StartupIdea & {
                        investorsViewedIdea?: number;
                        productType?: string;
                        stage1Meta?: any;
                        stage2Meta?: any;
                        stage3Meta?: any;
                      };
                      const isExpanded = expandedIdeaId === idea.id;
                      const s1 = meta.stage1Meta || {};
                      const s2 = meta.stage2Meta || {};
                      return (
                      <div key={idea.id} className="white-card flex flex-col justify-between border-slate-200 hover:border-slate-300 transition duration-200">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                              Idea Slot #{idx + 1}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">{meta.productType || "Stage 1"}</span>
                          </div>
                          <h3 className="font-display font-black text-slate-900 text-base mb-3 flex items-center justify-between">
                            <span>{idea.startupTitle}</span>
                            <button
                              onClick={() => {
                                setEditingIdeaId(idea.id);
                                setEditingInitialData(idea);
                              }}
                              className="text-xs text-amber-600 hover:text-amber-700 font-bold underline"
                            >
                              Edit Profile
                            </button>
                          </h3>
                          
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Category Niche</p>
                          <p className="text-xs text-slate-600 font-semibold mb-3">{idea.industry}</p>
                          
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Startup Vision / Revenue Model</p>
                          <p className="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed">{idea.description}</p>

                          {isExpanded && (
                            <div className="mb-4 space-y-3 border-t border-slate-100 pt-3">
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Stage 1 — Financial Terms</p>
                                <p className="text-xs text-slate-600">Investment: PKR {Number(s1.requiredInvestmentPkr ?? idea.stage2.totalCapitalRequiredPkr ?? 0).toLocaleString()}</p>
                                <p className="text-xs text-slate-600">Equity: {String(s1.equityOfferedPercent ?? idea.stage2.investmentFormula.maxEquityPercent ?? 0)}%</p>
                                <p className="text-xs text-slate-600">Expected ROI: {String(s1.expectedRoiPercent ?? Math.round((idea.stage2.investmentFormula.projectedAnnualReturnRate || 0) * 100))}%</p>
                                <p className="text-xs text-slate-600">Product type: {String(meta.productType || s1.productType || "N/A")}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Stage 2 — Market Validation</p>
                                <p className="text-xs text-slate-600">Customer base: {idea.stage2.customerBaseSize}</p>
                                <p className="text-xs text-slate-600">Location: {idea.stage2.marketInsight.location}</p>
                                <p className="text-xs text-slate-600">Experience: {idea.stage2.founderBackground.yearsExperience} yrs</p>
                                {(idea.stage2.productLiveUrl || s2.productUrl || s2.websiteLink) && (
                                  <p className="text-xs text-slate-600 break-all">URL: {idea.stage2.productLiveUrl || s2.productUrl || s2.websiteLink}</p>
                                )}
                                <p className="text-xs text-slate-600 line-clamp-4">{idea.stage2.marketInsight.marketSummary || s2.marketSummary || "—"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Stage 3 — Legal Agreement</p>
                                <p className="text-xs text-slate-600">Sample: {String(s2.sampleProductName ?? idea.stage3.sampleProductName)} @ PKR {Number(s2.sampleProductPricePkr ?? idea.stage3.sampleProductPricePkr ?? 0)}</p>
                                <p className="text-xs text-slate-600 whitespace-pre-wrap line-clamp-6">{String((idea as any).stage3Meta?.customAgreementText || idea.stage3.legalAgreementText || "—")}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="border-t border-slate-100 pt-3 space-y-2">
                          <div className="text-[11px] text-emerald-600 font-semibold">
                            Custom pitch record published to Investor Feed.
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold bg-slate-50 p-2 rounded-xl border border-slate-200/60">
                            <span className="inline-block h-3.5 w-3.5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] text-slate-600">👁</span>
                            Investor Views: {meta.investorsViewedIdea ?? 0}
                          </div>
                          <button
                            type="button"
                            onClick={() => setExpandedIdeaId(isExpanded ? null : idea.id)}
                            className="flex w-full items-center justify-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800"
                          >
                            {isExpanded ? (
                              <>
                                See Less <ChevronUp className="h-3.5 w-3.5" />
                              </>
                            ) : (
                              <>
                                See More <ChevronDown className="h-3.5 w-3.5" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      );
                    })}

                    {Array.from({ length: remainingCount }).map((_, i) => (
                      <div key={i} className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-8 text-center min-h-[220px]">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-400 mb-2">
                          <Rocket className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-600">Available Idea Slot #{createdCount + i + 1}</p>
                        <p className="text-[11px] text-slate-400 mt-1">Unlock by pitching a new business blueprint.</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VIEW 3: CASH PAYOUT — live inbound ledger only */}
              {activeTab === "payout" && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="white-card space-y-5 border-slate-200">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Landmark className="h-5 w-5 text-slate-600" />
                      <h3 className="font-display font-black text-slate-900 text-base">Cash Payout Control Center</h3>
                    </div>

                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Incoming Payment
                    </p>

                    {/* Live inbound ledger: bank specs, receipt, Mark as Paid */}
                    <FounderPaymentDesk
                      transactions={inboundTransactions}
                      approvingTxKey={approvingTxKey}
                      onMarkAsPaid={handleMarkTransactionPaid}
                    />
                  </div>
                </div>
              )}

              {/* VIEW 4: COMMUNITY LOUNGE */}
              {activeTab === "community" && (
                <div className="space-y-6">
                  <div className="white-card max-w-xl mx-auto text-center space-y-6 p-10 border-slate-200">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-md">
                      <Sun className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-black text-slate-900">Community Lounge</h3>
                      <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                        Engage with other founders, follow wholesalers, and connect with advisors to grow your business network.
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setSunGlow("community");
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl px-8 py-4 text-xs"
                    >
                      Enter Community Lounge <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* VIEW 5: SAMPLE REQUEST */}
              {activeTab === "samples" && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="white-card space-y-4 border-slate-200">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="font-display font-black text-slate-900 text-base">Sample Request Portal</h3>
                      <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-lg">
                        Logistics &amp; Inspection Spec Flow
                      </span>
                    </div>

                    {localSampleOrders.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6 border border-dashed border-slate-200 rounded-xl">
                        No incoming product sample or inspection spec requests found.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {localSampleOrders.map((order) => (
                          <div key={order.id} className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-800">{order.investorName}</span>
                              <span className="text-[10px] font-bold text-slate-500 uppercase">{order.city}</span>
                            </div>
                            <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                              <div><strong className="text-slate-700">Shipping Address:</strong> {order.address}</div>
                              <div><strong className="text-slate-700">Contact:</strong> {order.phone}</div>
                              <div><strong className="text-slate-700">Requested Specs:</strong> {order.productName} ({order.notes || "Product inspection spec request"})</div>
                              <div className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-1 rounded border border-amber-200/50 mt-1">
                                Physical Product Spec Inspection Request — {order.productName}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                              {order.stage !== "packed" && order.stage !== "sent" ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleAcceptSample(order.id)}
                                    className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg px-3"
                                  >
                                    Accept Request
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRejectSample(order.id)}
                                    className="h-8 border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-lg px-3"
                                  >
                                    Reject Request
                                  </Button>
                                </>
                              ) : (
                                <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Package Staging &amp; Tracking Initialized
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* VIEW 6: INVESTOR QUERY — Photo 1 only (FounderChatsPanel) */}
              {activeTab === "messages" && (
                <div className="space-y-6">
                  <h3 className="font-display font-black text-slate-900 text-base">Investor Query Management Matrix</h3>
                  <FounderChatsPanel founderId={founderUid} founderName={displayName} />
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Dynamic Overlay Panels */}
      <FounderGroupsPanel
        founderId={founderUid}
        founderName={displayName}
        isOpen={groupsOpen}
        onClose={() => setGroupsOpen(false)}
      />

      {profileUsername && (
        <CommunityProfileDrawer
          username={profileUsername}
          isOpen={!!profileUsername}
          onClose={() => setProfileUsername(null)}
          isOwnProfile={profileUsername === founderUsername}
        />
      )}
      {editingIdeaId && activeUid && (
        <PitchIdeaWizard
          entrepreneurUid={activeUid}
          founderName={displayName}
          editIdeaId={editingIdeaId}
          initialData={editingInitialData}
          onClose={() => {
            setEditingIdeaId(null);
            setEditingInitialData(null);
          }}
          onSuccess={handlePitchSuccess}
        />
      )}
    </div>
  );
}
