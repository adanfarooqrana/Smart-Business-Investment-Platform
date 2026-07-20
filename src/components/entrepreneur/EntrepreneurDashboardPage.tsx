import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { useFounderPitchedIdeas } from "@/hooks/useFounderPitchedIdeas";
import { useFounderSession } from "@/hooks/useFounderSession";
import { useAuth } from "@/contexts/AuthContext";
import { FounderUnifiedDashboard } from "@/components/founder/FounderUnifiedDashboard";
import { FounderDashboardErrorBoundary } from "@/components/founder/FounderDashboardErrorBoundary";
import {
  getEntrepreneurProfile,
  type EntrepreneurProfile,
  type EntrepreneurMetrics,
} from "@/services/entrepreneurService";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KycPendingGate } from "@/components/kyc/KycPendingGate";
import { streamUserKycStatus } from "@/services/adminKycService";

export function EntrepreneurDashboardPage() {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const { sessionReady, isFounderRegistered } = useFounderSession();
  const {
    entrepreneur,
    sampleOrders,
    investorEntrepreneurMessages,
    stage1InvestorQueries,
    submitEntrepreneurProblem,
    entrepreneurPayments,
    advanceSampleOrderStage,
    getFollowingCount,
    communityPosts,
  } = useAppState();

  const [firestoreProfile, setFirestoreProfile] = useState<EntrepreneurProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [kycPending, setKycPending] = useState(false);
  const [kycChecked, setKycChecked] = useState(false);

  const founderUid = currentUser?.uid || entrepreneur?.uid || "";
  const { ideas: myIdeas } = useFounderPitchedIdeas(founderUid || undefined);

  useEffect(() => {
    if (!founderUid) {
      setKycChecked(true);
      setKycPending(false);
      return;
    }
    return streamUserKycStatus(founderUid, (r) => {
      setKycPending(r?.kycStatus === "pending" || r?.kycStatus === "rejected");
      setKycChecked(true);
    });
  }, [founderUid]);

  useEffect(() => {
    if (!founderUid) return;
    import("@/services/pitchIdeaService").then(({ backfillInvestorFeedForFounder }) => {
      void backfillInvestorFeedForFounder(founderUid).catch(() => undefined);
    });
  }, [founderUid]);

  useEffect(() => {
    const load = async () => {
      const uid = entrepreneur?.uid || currentUser?.uid;
      if (uid) {
        try {
          const profile = await getEntrepreneurProfile(uid);
          if (profile) setFirestoreProfile(profile);
        } catch {
          /* use local state fallback */
        }
      }
      setProfileLoading(false);
    };
    load();
  }, [entrepreneur?.uid, currentUser?.uid]);

  const metrics: EntrepreneurMetrics = useMemo(() => {
    const pendingMessages = (investorEntrepreneurMessages || []).filter(
      (m) => m.status === "pending",
    ).length;
    const activeSamples = (sampleOrders || []).filter((o) => o.stage !== "sent").length;
    const investorViews =
      firestoreProfile?.metrics.investorsViewedIdea ??
      entrepreneur?.metrics?.investorsViewedIdea ??
      (stage1InvestorQueries ?? []).length;

    return {
      investorsViewedIdea: investorViews,
      activeSampleRequests: activeSamples,
      unreadMessagesCount: Math.max(
        pendingMessages,
        firestoreProfile?.metrics.unreadMessagesCount ??
          entrepreneur?.metrics?.unreadMessagesCount ??
          0,
      ),
    };
  }, [
    firestoreProfile,
    entrepreneur?.metrics,
    investorEntrepreneurMessages,
    sampleOrders,
    stage1InvestorQueries,
  ]);

  const fundingRaised = useMemo(
    () => (entrepreneurPayments || []).reduce((sum, p) => sum + p.amountPkr, 0),
    [entrepreneurPayments],
  );

  const problemsSolved = useMemo(
    () => (communityPosts ?? []).filter((p) => p.entrepreneurProblem && p.aiResolutionMock).length,
    [communityPosts],
  );

  if (!sessionReady || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#1a1a2e" }}>
        <p className="text-sm text-[#FFD700] animate-pulse">Loading Founder Dashboard...</p>
      </div>
    );
  }

  if (!isFounderRegistered) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center px-6"
        style={{ backgroundColor: "#1a1a2e" }}
      >
        <Lightbulb className="mb-4 h-12 w-12 text-[#FFD700]" />
        <h2 className="font-display text-xl font-bold text-white">Founder access required</h2>
        <p className="mt-2 text-sm text-slate-400">
          Only registered entrepreneurs can access the Founder Dashboard.
        </p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={() => navigate({ to: "/app/register" })}>
            Sign Up
          </Button>
          <Button
            onClick={() => navigate({ to: "/app/login" })}
            style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
            className="text-white"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (!kycChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#1a1a2e" }}>
        <p className="text-sm text-[#FFD700] animate-pulse">Checking KYC approval…</p>
      </div>
    );
  }

  if (kycPending && founderUid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <KycPendingGate
          uid={founderUid}
          role="founder"
          email={entrepreneur?.email || currentUser?.email || ""}
          approvedPath="/founder/dashboard"
        />
      </div>
    );
  }

  const displayName = firestoreProfile?.fullName || entrepreneur?.name || "Founder";
  const profileId = firestoreProfile?.profileId || entrepreneur?.profileId || "ENT-PENDING";

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#1a1a2e" }}>
        <p className="text-sm text-[#FFD700] animate-pulse">Loading Founder Dashboard...</p>
      </div>
    );
  }

  if (!founderUid) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center px-6"
        style={{ backgroundColor: "#1a1a2e" }}
      >
        <Lightbulb className="mb-4 h-12 w-12 text-[#FFD700]" />
        <h2 className="font-display text-xl font-bold text-white">Syncing your session...</h2>
        <p className="mt-2 text-sm text-slate-400">Please wait a moment or sign in again.</p>
        <Button
          className="mt-6"
          onClick={() => navigate({ to: "/app/login" })}
          style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
        >
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <FounderDashboardErrorBoundary>
    <FounderUnifiedDashboard
      founderUid={founderUid}
      displayName={displayName}
      profileId={profileId}
      email={firestoreProfile?.email || entrepreneur?.email}
      phone={firestoreProfile?.phone || entrepreneur?.phone}
      paymentType={firestoreProfile?.paymentType || entrepreneur?.paymentType}
      bankAccountNumber={firestoreProfile?.bankAccountNumber || (entrepreneur as any)?.bankAccountNumber}
      isVerified={firestoreProfile?.isVerified ?? entrepreneur?.isApproved}
      ideaVision={firestoreProfile?.ideaVision}
      ideaInterest={firestoreProfile?.ideaInterest}
      founderGoals={firestoreProfile?.founderGoals}
      metrics={metrics}
      myIdeas={myIdeas}
      sampleOrders={sampleOrders || []}
      entrepreneurPayments={entrepreneurPayments || []}
      totalFollowers={getFollowingCount()}
      problemsSolved={problemsSolved}
      fundingRaised={fundingRaised}
      onRoutedProblem={(data) =>
        submitEntrepreneurProblem({
          founderId: founderUid,
          founderName: displayName,
          problemId: data.problemId,
          title: data.title,
          content: data.description,
          category: data.category,
          targetRole: data.targetRole,
          urgency: data.urgency,
          experts: data.experts,
          aiResolution: data.routingSummary,
        })
      }
      onAdvanceSample={advanceSampleOrderStage}
    />
    </FounderDashboardErrorBoundary>
  );
}
