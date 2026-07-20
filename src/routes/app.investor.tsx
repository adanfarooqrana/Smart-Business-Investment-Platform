import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAppState } from "@/hooks/useAppState";
import { useState, useEffect, useRef } from "react";
import {
  Loader2,
  Briefcase,
  Coins,
  MessageCircle,
} from "lucide-react";
import {
  InvestorIdeasFeed,
  filterStartupIdeas,
} from "@/components/investor/InvestorIdeasFeed";
import { usePitchedIdeas } from "@/hooks/usePitchedIdeas";
import { useInvestorSession } from "@/hooks/useInvestorSession";
import { useAuth } from "@/contexts/AuthContext";
import { WeeklyFollowUpPanel } from "@/components/investor/WeeklyFollowUpPanel";
import { InvestorDiscoverHeader } from "@/components/investor/InvestorDiscoverHeader";
import { InvestorPaymentDesk } from "@/components/investor/InvestorPaymentDesk";
import { InvestorPortfolio } from "@/components/investor/InvestorPortfolio";
import { InvestorChatsTab } from "@/components/investor/InvestorChatsTab";
import { ReviewSubmitWidget } from "@/components/ReviewSubmitWidget";
import { InvestorDashboardErrorBoundary } from "@/components/investor/InvestorDashboardErrorBoundary";
import { KycPendingGate } from "@/components/kyc/KycPendingGate";
import { streamUserKycStatus } from "@/services/adminKycService";

export const Route = createFileRoute("/app/investor")({
  component: InvestorPage,
});

type InvestorTab = "discover" | "portfolio" | "payment-desk" | "chats";

function InvestorPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isIdeaDetailRoute = /\/app\/investor\/idea\//.test(pathname);

  if (isIdeaDetailRoute) {
    return <Outlet />;
  }

  return (
    <InvestorDashboardErrorBoundary>
      <InvestorDashboard />
    </InvestorDashboardErrorBoundary>
  );
}

function InvestorDashboard() {
  const { investor, role } = useAppState();
  const { sessionReady, isInvestorRegistered } = useInvestorSession();
  const { currentUser, userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<InvestorTab>("discover");
  const [feedSearchQuery, setFeedSearchQuery] = useState("");
  const [headerSunBlink, setHeaderSunBlink] = useState(false);
  const headerBlinkTimer = useRef<number | null>(null);
  const [kycPending, setKycPending] = useState(false);
  const [kycChecked, setKycChecked] = useState(false);

  const investorUid = String(currentUser?.uid || "").trim();

  useEffect(() => {
    if (!investorUid) {
      setKycChecked(true);
      setKycPending(false);
      return;
    }
    return streamUserKycStatus(investorUid, (r) => {
      setKycPending(r?.kycStatus === "pending" || r?.kycStatus === "rejected");
      setKycChecked(true);
    });
  }, [investorUid]);

  const { pitchedIdeas, loading: pitchesLoading, liveCount } = usePitchedIdeas();
  const allStartupIdeas = pitchedIdeas;
  const filteredStartupIdeas = filterStartupIdeas(allStartupIdeas, feedSearchQuery);

  useEffect(() => {
    if (!sessionReady || authLoading) return;
    if (isInvestorRegistered) return;
    if (currentUser && (userData?.role === "investor" || role === "investor")) return;
    navigate({ to: "/app/login" });
  }, [sessionReady, authLoading, isInvestorRegistered, currentUser, userData?.role, role, navigate]);

  const triggerHeaderSunBlink = () => {
    setHeaderSunBlink(true);
    if (headerBlinkTimer.current) window.clearTimeout(headerBlinkTimer.current);
    headerBlinkTimer.current = window.setTimeout(() => setHeaderSunBlink(false), 700);
  };

  if (!sessionReady || !isInvestorRegistered) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-muted-foreground">Loading investor profile...</p>
      </div>
    );
  }

  if (!kycChecked) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-muted-foreground">Checking KYC approval…</p>
      </div>
    );
  }

  if (kycPending && investorUid) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-6">
        <KycPendingGate
          uid={investorUid}
          role="investor"
          email={investor?.email || currentUser?.email || ""}
          approvedPath="/app/investor"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {tab === "discover" ? (
        <InvestorDiscoverHeader
          investorName={investor.name}
          blink={headerSunBlink}
          ideaCount={filteredStartupIdeas.length}
        />
      ) : (
        <div className="mb-8 border-b border-border/40 pb-6">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-foreground/5 px-3 py-1 text-xs font-semibold text-foreground">
            <Briefcase className="h-3.5 w-3.5" />
            <span>AI Capital Desk &bull; {investor.entityType || "Firm"}</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Investor Workspace</h1>
        </div>
      )}

      <div className="mb-8 flex flex-wrap gap-1 rounded-full border border-orange-200/60 bg-orange-50/50 p-1">
        {(
          [
            ["discover", "Ideas Feed"],
            ["portfolio", "My Portfolio"],
            ["payment-desk", "Payment Desk"],
            ["chats", "Chats"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
              tab === id ? "bg-foreground text-background shadow-soft" : "text-muted-foreground hover:bg-white/80"
            }`}
          >
            {id === "payment-desk" && <Coins className="mr-1 inline h-3.5 w-3.5" />}
            {id === "chats" && <MessageCircle className="mr-1 inline h-3.5 w-3.5" />}
            {label}
          </button>
        ))}
      </div>

      {tab === "discover" && (
        <>
          <WeeklyFollowUpPanel />
          <InvestorIdeasFeed
            investor={investor}
            searchQuery={feedSearchQuery}
            onSearchChange={setFeedSearchQuery}
            onSearchInteract={triggerHeaderSunBlink}
            ideas={filteredStartupIdeas}
            liveFounderCount={liveCount}
            loadingLive={pitchesLoading}
          />
        </>
      )}

      {tab === "portfolio" && (
        <div className="space-y-6">
          <InvestorPortfolio />
          <ReviewSubmitWidget roleLabel="Investor" className="mt-6" />
        </div>
      )}

      {tab === "payment-desk" && <InvestorPaymentDesk />}

      {tab === "chats" && <InvestorChatsTab investorName={investor.name || "Investor"} />}
    </div>
  );
}
