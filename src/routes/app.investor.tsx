import { InvestorMarketplace, MarketplacePortfolio, available, useMarketCatalog } from "@/components/investor/InvestorMarketplace";
import { createFileRoute, redirect, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
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
import { InvestorDiscoverHeader } from "@/components/investor/InvestorDiscoverHeader";
import { InvestorPaymentDesk } from "@/components/investor/InvestorPaymentDesk";
import { InvestorPortfolio } from "@/components/investor/InvestorPortfolio";
import { InvestorChatsTab } from "@/components/investor/InvestorChatsTab";
import { ReviewSubmitWidget } from "@/components/ReviewSubmitWidget";
import { InvestorDashboardErrorBoundary } from "@/components/investor/InvestorDashboardErrorBoundary";
import { KycPendingGate } from "@/components/kyc/KycPendingGate";
import { useKycApprovalGate } from "@/hooks/useKycApprovalGate";
import { auth } from "@/firebase";
import { getInvestorKycStatus } from "@/components/investor/InvestorKycVerification";
import { blockCommunityMemberFromWorkspace } from "@/lib/routeGuards";

export const Route = createFileRoute("/app/investor")({
  validateSearch: (search: Record<string, unknown>) => ({
    view: search.view === "founders" ? "founders" as const : undefined,
    founder: search.view === "founders" && typeof search.founder === "string" ? search.founder : undefined,
  }),
  beforeLoad: async () => {
    blockCommunityMemberFromWorkspace();
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user) throw redirect({ to: "/app/login" });
    if (!user.emailVerified) {
      throw redirect({ to: "/app/register", search: { resume: "investor" } });
    }
    const kyc = await getInvestorKycStatus();
    if (kyc.stage !== 3 || !kyc.livenessPassed) {
      throw redirect({ to: "/app/register", search: { resume: "investor" } });
    }
  },
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

  const investorUid = String(currentUser?.uid || "").trim();
  const { ready: kycReady, blocked: kycBlocked } = useKycApprovalGate(investorUid);

  const { pitchedIdeas, liveCount } = usePitchedIdeas();
  const { view, founder } = Route.useSearch();
  const { catalog, error: catalogError, refresh: refreshCatalog } = useMarketCatalog(investorUid);
  const funded = new Set(catalog.products.filter((item) => !item.demo && item.totalProductChunks &&
    (item.soldChunks ?? 0) >= item.totalProductChunks).map((item) => item.founderId + "/" + item.id));
  const allStartupIdeas = (Array.isArray(pitchedIdeas) ? pitchedIdeas : []).filter((item) => typeof item?.id === "string" && !funded.has((item.founderId ?? item.entrepreneurUid) + "/" + item.id));
  const filteredStartupIdeas = filterStartupIdeas(allStartupIdeas, feedSearchQuery);
  const query = feedSearchQuery.trim().toLowerCase();
  const chunkIdeas = catalog.products.filter((item) => item.demo && available(item) > 0 &&
    (!query || [item.title, item.category, item.description,
      catalog.founders.find((entry) => entry.id === item.founderId)?.founderName]
      .some((text) => typeof text === "string" && text.toLowerCase().includes(query))));

  useEffect(() => {
    if (!sessionReady || authLoading) return;
    if (isInvestorRegistered) return;
    if (currentUser && (userData?.role === "investor" || role === "investor")) return;
    navigate({ to: "/app/login" });
  }, [sessionReady, authLoading, isInvestorRegistered, currentUser, userData?.role, role, navigate]);

  useEffect(() => { if (view === "founders") setTab("discover"); }, [view]);

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

  if (!kycReady) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-muted-foreground">Checking KYC approval…</p>
      </div>
    );
  }

  if (kycBlocked && investorUid) {
    return (
      <KycPendingGate
        uid={investorUid}
        role="investor"
        email={investor?.email || currentUser?.email || ""}
        approvedPath="/app/investor"
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {tab === "discover" ? (
        <InvestorDiscoverHeader
          investorName={investor?.name || "Investor"}
          blink={headerSunBlink}
          ideaCount={filteredStartupIdeas.length}
        />
      ) : (
        <div className="mb-8 border-b border-border/40 pb-6">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-foreground/5 px-3 py-1 text-xs font-semibold text-foreground">
            <Briefcase className="h-3.5 w-3.5" />
            <span>AI Capital Desk &bull; {investor?.entityType || "Firm"}</span>
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
            onClick={() => {
              setTab(id);
              if (view === "founders") void navigate({ to: "/app/investor", search: {} });
            }}
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

      {tab === "discover" && (view === "founders" ? (
        <InvestorMarketplace key={founder ?? ""} catalog={catalog} error={catalogError}
          refresh={refreshCatalog} initialFounder={founder} />
      ) : (
        <InvestorDashboardErrorBoundary>
          <InvestorIdeasFeed
          investor={investor}
          searchQuery={feedSearchQuery}
          onSearchChange={setFeedSearchQuery}
          onSearchInteract={triggerHeaderSunBlink}
          ideas={filteredStartupIdeas}
          liveFounderCount={liveCount}
          chunkIdeas={chunkIdeas}
          catalogError={catalogError}
          retryCatalog={refreshCatalog}
          />
        </InvestorDashboardErrorBoundary>
      ))}

      {tab === "portfolio" && (
        <div className="space-y-6">
          <InvestorPortfolio />
          <MarketplacePortfolio />
          <ReviewSubmitWidget roleLabel="Investor" className="mt-6" />
        </div>
      )}

      {tab === "payment-desk" && <InvestorPaymentDesk />}

      {tab === "chats" && <InvestorChatsTab investorName={investor.name || "Investor"} />}
    </div>
  );
}
