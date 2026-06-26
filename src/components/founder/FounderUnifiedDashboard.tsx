import { useState, useRef, useEffect } from "react";
import { Rocket, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "sonner";

import { FounderTopNav } from "./FounderTopNav";
import { FounderWelcomeHero } from "./FounderWelcomeHero";
import { FounderFollowingPanel } from "./FounderFollowingPanel";
import { FounderMoneyProofsPanel } from "./FounderMoneyProofsPanel";
import { FounderSampleOrdersPanel } from "./FounderSampleOrdersPanel";
import { FounderCommunityLounge } from "./FounderCommunityLounge";
import { CommunityErrorBoundary } from "./CommunityErrorBoundary";
import { FounderGroupsPanel } from "./FounderGroupsPanel";
import { FounderAIConsultant } from "./FounderAIConsultant";
import { FounderSuccessStoriesCarousel } from "./FounderSuccessStoriesCarousel";
import { CommunityProfileDrawer } from "./CommunityProfileDrawer";
import { FounderProfilePanel } from "./FounderProfilePanel";
import { FounderVideoFeed } from "./FounderVideoFeed";
import { SunGlowTransition } from "./SunGlowTransition";
import { PaymentOTPModal } from "./PaymentOTPModal";

import { PostProblemSection } from "@/components/entrepreneur/PostProblemSection";
import { PitchIdeaWizard } from "@/components/entrepreneur/PitchIdeaWizard";
import { MessageSampleCenter } from "@/components/entrepreneur/MessageSampleCenter";
import { MoneyManagementDashboard } from "@/components/entrepreneur/MoneyManagementDashboard";
import { VentureShowcaseCarousel } from "@/components/entrepreneur/VentureShowcaseCarousel";
import { useAppState } from "@/hooks/useAppState";

import type { EntrepreneurPayment, InvestorEntrepreneurMessage, SampleOrder } from "@/hooks/useAppState";
import type { StartupIdea } from "@/data/startupIdeas";
import type { EntrepreneurMetrics } from "@/services/entrepreneurService";

const FOUNDER_DASHBOARD_VIDEO = "/videos/8716432-uhd_3840_2160_25fps.mp4";
const FOUNDER_DASHBOARD_VIDEO_FALLBACK = "/videos/business-signup.mp4";
const FOUNDER_DASHBOARD_VIDEO_FALLBACK_2 = "/videos/investor-signup.mp4";

type Props = {
  founderUid: string;
  displayName: string;
  profileId: string;
  email?: string;
  phone?: string;
  paymentType?: string;
  isVerified?: boolean;
  ideaVision?: string;
  ideaInterest?: string;
  founderGoals?: string;
  metrics: EntrepreneurMetrics;
  myIdeas: StartupIdea[];
  sampleOrders: SampleOrder[];
  investorMessages: InvestorEntrepreneurMessage[];
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
  onReplyMessage: (id: string, reply: string) => void;
  onResolveMessage: (id: string) => void;
  onAdvanceSample: (orderId: string) => void;
  onUnreadChange: (count: number) => void;
};

export function FounderUnifiedDashboard({
  founderUid,
  displayName,
  profileId,
  email,
  phone,
  paymentType,
  isVerified,
  ideaVision,
  ideaInterest,
  founderGoals,
  metrics,
  myIdeas,
  sampleOrders,
  investorMessages,
  entrepreneurPayments,
  totalFollowers,
  problemsSolved,
  fundingRaised,
  onRoutedProblem,
  onReplyMessage,
  onResolveMessage,
  onAdvanceSample,
  onUnreadChange,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState<"dashboard" | "community">("dashboard");
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [showPitchWizard, setShowPitchWizard] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [sunGlow, setSunGlow] = useState<"none" | "community" | "profile">("none");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [videoSrc, setVideoSrc] = useState(FOUNDER_DASHBOARD_VIDEO);
  const [videoOk, setVideoOk] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { communityPosts, likedPosts } = useAppState();
  const [heavyPanelsReady, setHeavyPanelsReady] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setHeavyPanelsReady(true), 100);
    return () => window.clearTimeout(id);
  }, []);

  const founderUsername = `u/${displayName.toLowerCase().replace(/\s+/g, "_")}`;
  const totalLikes = (communityPosts ?? []).reduce((s, p) => s + (p.votes ?? 0), 0) + (likedPosts?.length ?? 0);

  const openCommunity = () => setSunGlow("community");
  const openProfile = () => setSunGlow("profile");

  const onSunComplete = () => {
    if (sunGlow === "community") setActiveView("community");
    if (sunGlow === "profile") setShowProfile(true);
    setSunGlow("none");
  };

  const handlePitchSuccess = (ideaId: string) => {
    setShowPitchWizard(false);
    toast.success(`Idea pitched! (${ideaId}) — live on investor feed.`);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {videoOk && (
        <>
          <video
            ref={videoRef}
            key={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            className="pointer-events-none fixed inset-0 z-0 h-full w-full object-cover"
            onError={() => {
              if (videoSrc === FOUNDER_DASHBOARD_VIDEO) {
                setVideoSrc(FOUNDER_DASHBOARD_VIDEO_FALLBACK);
              } else if (videoSrc === FOUNDER_DASHBOARD_VIDEO_FALLBACK) {
                setVideoSrc(FOUNDER_DASHBOARD_VIDEO_FALLBACK_2);
              } else {
                setVideoOk(false);
              }
            }}
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
          <div
            className="pointer-events-none fixed inset-0 z-[1]"
            style={{
              background:
                "radial-gradient(ellipse 90% 55% at 50% 12%, rgba(255,165,0,0.28) 0%, transparent 50%), linear-gradient(180deg, rgba(26,26,46,0.35) 0%, rgba(26,26,46,0.78) 50%, rgba(26,26,46,0.9) 100%)",
            }}
          />
        </>
      )}
      {!videoOk && (
        <div className="pointer-events-none fixed inset-0 z-0" style={{ background: "#1a1a2e" }} />
      )}

      <div className="relative z-10 min-h-screen">
      <Toaster position="bottom-right" theme="dark" closeButton />

      {/* Global styles for animations */}
      <style>{`
        @keyframes founderPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.5); }
          50% { box-shadow: 0 0 40px rgba(255,165,0,0.8), 0 0 60px rgba(255,215,0,0.4); }
        }
        .founder-ai-pulse { animation: founderPulse 2s ease-in-out infinite; }
        .founder-ad-glow { box-shadow: 0 0 20px rgba(255,215,0,0.15), inset 0 0 20px rgba(255,165,0,0.05); }
        .founder-success-glow { box-shadow: 0 0 24px rgba(255,215,0,0.2); }
        .founder-input-glow:focus { box-shadow: 0 0 16px rgba(255,215,0,0.3); }
        .founder-stat-card:hover { transform: translateY(-2px); }
      `}</style>

      {showPitchWizard && founderUid && (
        <PitchIdeaWizard
          entrepreneurUid={founderUid}
          founderName={displayName}
          onClose={() => setShowPitchWizard(false)}
          onSuccess={handlePitchSuccess}
        />
      )}

      <SunGlowTransition
        active={sunGlow !== "none"}
        onComplete={onSunComplete}
        label={sunGlow === "community" ? "Entering Community Lounge..." : "Opening Founder Profile..."}
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
        onVerified={() => toast.success("Payment authenticated & stored in backend!")}
      />

      <FounderTopNav
        founderName={displayName}
        unreadNotifications={2}
        unreadMessages={metrics.unreadMessagesCount}
        onOpenCommunity={openCommunity}
        onOpenGroups={() => setGroupsOpen(true)}
        onOpenAI={() => setAiOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-6">
        {activeView === "community" ? (
          <CommunityErrorBoundary onReset={() => setActiveView("community")}>
            <FounderCommunityLounge
              founderId={founderUid}
              founderUsername={founderUsername}
              displayName={displayName}
              userRole="entrepreneur"
              isOpen
              embedded
              onClose={() => setActiveView("dashboard")}
              onViewProfile={(u) => setProfileUsername(u)}
            />
          </CommunityErrorBoundary>
        ) : (
        <>
        <FounderWelcomeHero
          founderName={displayName}
          fundingRaised={fundingRaised}
          activeInvestors={metrics.investorsViewedIdea}
          totalFollowers={totalFollowers}
          problemsSolved={problemsSolved}
        />

        {/* 3-column grid + side panels */}
        <div className="mb-8 grid gap-6 lg:grid-cols-[220px_1fr_220px]">
          {/* Left: Following */}
          <div className="hidden lg:block">
            <FounderFollowingPanel
              founderId={founderUid}
              onViewProfile={(u) => setProfileUsername(u)}
            />
          </div>

          {/* Center: Post Problem (wide) + actions */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              {founderUid && (
                <PostProblemSection
                  founderId={founderUid}
                  founderName={displayName}
                  onRouted={onRoutedProblem}
                  darkMode
                />
              )}
            </div>

            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() =>
                  document.getElementById("message-sample-center")?.scrollIntoView({ behavior: "smooth" })
                }
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#FFD700]/30 bg-gradient-to-r from-[#FFD700]/15 to-[#FFA500]/10 px-4 py-4 text-sm font-bold text-[#FFD700] transition hover:border-[#FFD700]/50 hover:from-[#FFD700]/25"
              >
                <MessageSquare className="h-5 w-5" />
                Open Messages Center
              </button>
              <FounderSampleOrdersPanel
                founderUid={founderUid}
                onAdvanceLocal={onAdvanceSample}
              />
            </div>
          </div>

          {/* Right: Money & Proofs */}
          <div className="hidden lg:block">
            <FounderMoneyProofsPanel
              payments={entrepreneurPayments}
              onSendProfit={() => toast.info("Profit distribution wizard opening...")}
            />
          </div>
        </div>

        {/* Profile — hidden until button click with sun glow */}
        <div className="mb-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-white">Founder Profile</h2>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setShowPitchWizard(true)}
                className="bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-xs font-bold text-[#1a1a2e]"
              >
                <Rocket className="mr-1 h-3.5 w-3.5" /> Pitch Idea
              </Button>
              <Button size="sm" variant="outline" className="border-[#FFD700]/30 text-[#FFD700] text-xs"
                onClick={openProfile}
              >
                Open Profile
              </Button>
              <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs"
                onClick={() => setPaymentOpen(true)}
              >
                JazzCash / EasyPaisa Auth
              </Button>
            </div>
          </div>

          {showProfile ? (
            <FounderProfilePanel
              founderId={founderUid}
              displayName={displayName}
              profileId={profileId}
              founderUsername={founderUsername}
              email={email}
              phone={phone}
              paymentType={paymentType}
              isVerified={isVerified}
              ideaVision={ideaVision}
              ideaInterest={ideaInterest}
              founderGoals={founderGoals}
              totalFollowers={totalFollowers}
              totalLikes={totalLikes}
              problemsSolved={problemsSolved}
              onClose={() => setShowProfile(false)}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-[#FFD700]/25 p-8 text-center">
              <img src="/pngend.png" alt="" className="mx-auto mb-3 h-16 w-16 object-contain opacity-60"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
              <p className="text-sm text-slate-400">Click <strong className="text-[#FFD700]">Open Profile</strong> for sun glow intro &amp; full profile.</p>
            </div>
          )}
        </div>

        {/* Video Lounge — all roles can post videos/images */}
        {founderUid && (
          <FounderVideoFeed userId={founderUid} userName={displayName} userRole="entrepreneur" />
        )}

        {/* Money Management (full) */}
        {founderUid && heavyPanelsReady && (
          <CommunityErrorBoundary>
          <MoneyManagementDashboard
            founderId={founderUid}
            ideas={myIdeas}
            localPayments={entrepreneurPayments}
          />
          </CommunityErrorBoundary>
        )}

        {/* Message & Sample Center (full) */}
        {founderUid && heavyPanelsReady && (
          <CommunityErrorBoundary>
          <section id="message-sample-center" className="mb-8">
            <h2 className="mb-4 font-display text-lg font-bold text-white">
              Message &amp; Sample Management Center
            </h2>
            <MessageSampleCenter
              entrepreneurUid={founderUid}
              founderName={displayName}
              localMessages={investorMessages}
              localSampleOrders={sampleOrders}
              pitchedIdeaIds={myIdeas.map((i) => i.id)}
              onReplyLocal={onReplyMessage}
              onResolveLocal={onResolveMessage}
              onUnreadChange={onUnreadChange}
            />
          </section>
          </CommunityErrorBoundary>
        )}

        {/* Venture Showcase */}
        {founderUid && heavyPanelsReady && (
          <CommunityErrorBoundary>
          <VentureShowcaseCarousel
            founderId={founderUid}
            ideas={myIdeas}
            localPayments={entrepreneurPayments}
          />
          </CommunityErrorBoundary>
        )}

        <FounderSuccessStoriesCarousel />
        </>
        )}
      </div>

      {/* Overlays */}
      <FounderGroupsPanel
        founderId={founderUid}
        founderName={displayName}
        isOpen={groupsOpen}
        onClose={() => setGroupsOpen(false)}
      />

      <FounderAIConsultant
        founderName={displayName}
        unreadMessages={metrics.unreadMessagesCount}
        activeSamples={metrics.activeSampleRequests}
        investorsViewed={metrics.investorsViewedIdea}
        onBulkMessageInvestors={() => toast.success("Bulk investor update sent!")}
      />

      {profileUsername && (
        <CommunityProfileDrawer
          username={profileUsername}
          isOpen={!!profileUsername}
          onClose={() => setProfileUsername(null)}
          isOwnProfile={profileUsername === founderUsername}
        />
      )}
      </div>
    </div>
  );
}
