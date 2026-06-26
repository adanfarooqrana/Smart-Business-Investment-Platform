import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAppState } from "@/hooks/useAppState";
import { useState, useEffect, useRef } from "react";
import {
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Send,
  Handshake,
  CheckCircle2,
  XCircle,
  Loader2,
  Building,
  Globe,
  Bot,
  Briefcase,
  Sun,
  Coins,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  InvestorIdeasFeed,
  STARTUP_IDEAS,
  filterStartupIdeas,
} from "@/components/investor/InvestorIdeasFeed";
import { mergeStartupIdeas } from "@/data/startupIdeas";
import { usePitchedIdeas } from "@/hooks/usePitchedIdeas";
import { useInvestorSession } from "@/hooks/useInvestorSession";
import { useAuth } from "@/contexts/AuthContext";
import { WeeklyFollowUpPanel } from "@/components/investor/WeeklyFollowUpPanel";
import { InvestorDiscoverHeader } from "@/components/investor/InvestorDiscoverHeader";
import { InvestorAIInvestmentExpert } from "@/components/investor/InvestorAIInvestmentExpert";
import { InvestorPaymentDesk } from "@/components/investor/InvestorPaymentDesk";
import { ReviewSubmitWidget } from "@/components/ReviewSubmitWidget";
import { InvestorDashboardErrorBoundary } from "@/components/investor/InvestorDashboardErrorBoundary";

export const Route = createFileRoute("/app/investor")({
  component: InvestorPage,
});

const DEFAULT_ON_PLATFORM = [
  { name: "Luna Bistro", cat: "Food & Beverage", score: 87, ask: "$50k", momentum: "+24%", match: 94, location: "San Francisco, USA" },
  { name: "NorthGrid SaaS", cat: "SaaS / Tech", score: 81, ask: "$120k", momentum: "+18%", match: 89, location: "Boston, USA" },
  { name: "Atelier Mira", cat: "Retail & E-commerce", score: 76, ask: "$40k", momentum: "+11%", match: 82, location: "New York, USA" },
  { name: "Brick & Brew", cat: "Food & Beverage", score: 72, ask: "$60k", momentum: "+9%", match: 78, location: "Chicago, USA" },
];

const OFF_PLATFORM_LISTED = [
  { name: "Zenith Logistics", cat: "Logistics & Transport", ask: "$150k", growth: "+31%", location: "Dallas, USA", match: 85 },
  { name: "Greenscape Cafe", cat: "Food & Beverage", ask: "$45k", growth: "+14%", location: "Seattle, USA", match: 79 },
  { name: "Prime Fleet Solutions", cat: "Automotive / Fleet", ask: "$200k", growth: "+22%", location: "Chicago, USA", match: 81 },
  { name: "Apex Agritech", cat: "Agrotech", ask: "$80k", growth: "+28%", location: "Austin, USA", match: 88 },
];

type InvestorTab = "discover" | "listings" | "portfolio" | "quotes" | "payment-desk" | "chatbot";

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
  const { investor, business, offers, investments, addOffer, addInvestment, role } = useAppState();
  const { sessionReady, isInvestorRegistered } = useInvestorSession();
  const { currentUser, userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<InvestorTab>("discover");
  const [feedSearchQuery, setFeedSearchQuery] = useState("");
  const [headerSunBlink, setHeaderSunBlink] = useState(false);
  const headerBlinkTimer = useRef<number | null>(null);

  const [selectedBizOffer, setSelectedBizOffer] = useState<string | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerTerms, setOfferTerms] = useState("");
  const [offerMessage, setOfferMessage] = useState("");

  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [deployBiz, setDeployBiz] = useState("");
  const [deployAmount, setDeployAmount] = useState("");
  const [deployTerms, setDeployTerms] = useState("");
  const [deployType, setDeployType] = useState<"on-platform" | "off-platform">("on-platform");
  const [deployMethod, setDeployMethod] = useState<"self" | "platform">("platform");

  const [successToast, setSuccessToast] = useState<string | null>(null);

  const { pitchedIdeas, loading: pitchesLoading, liveCount } = usePitchedIdeas();
  const allStartupIdeas = mergeStartupIdeas(STARTUP_IDEAS, pitchedIdeas);
  const filteredStartupIdeas = filterStartupIdeas(allStartupIdeas, feedSearchQuery);

  const openCommunityLounge = () => navigate({ to: "/app/community" });

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

  const userBiz = business.isRegistered
    ? [{ name: business.name, cat: business.category, score: business.score, ask: "$50k", momentum: "+15%", match: 91, location: business.location }]
    : [];

  const allOnPlatform = [...userBiz, ...DEFAULT_ON_PLATFORM.filter((o) => o.name !== business.name)];

  const sentOffers = offers.filter(
    (o) =>
      o.investorName === investor.name ||
      o.investorName === "Vanguard Partners" ||
      o.investorName === "Vanguard Ventures",
  );

  const totalDeployed = investments.reduce((acc, curr) => {
    const num = parseInt(curr.amount.replace(/[^0-9]/g, ""), 10);
    return acc + (Number.isNaN(num) ? 0 : num);
  }, 0);

  const selfInvestedSum = investments
    .filter((i) => i.method === "self")
    .reduce((acc, curr) => {
      const num = parseInt(curr.amount.replace(/[^0-9]/g, ""), 10);
      return acc + (Number.isNaN(num) ? 0 : num);
    }, 0);

  const platformInvestedSum = investments
    .filter((i) => i.method === "platform")
    .reduce((acc, curr) => {
      const num = parseInt(curr.amount.replace(/[^0-9]/g, ""), 10);
      return acc + (Number.isNaN(num) ? 0 : num);
    }, 0);

  const openOfferModal = (bizName: string) => {
    setSelectedBizOffer(bizName);
    setOfferAmount("");
    setOfferTerms("");
    setOfferMessage("");
  };

  const handleGenerateAIOffer = () => {
    if (!selectedBizOffer) return;
    const biz = allOnPlatform.find((o) => o.name === selectedBizOffer);
    const score = biz ? biz.score : 82;
    if (score >= 80) {
      setOfferAmount("$75,000");
      setOfferTerms("8% Equity, Advisory Seat");
      setOfferMessage(
        `We audited ${selectedBizOffer}'s stellar reputation score of ${score}/100. Our AI metrics indicate solid local creditworthiness.`,
      );
    } else {
      setOfferAmount("$40,000");
      setOfferTerms("Convertible Note, 7% Interest Cap");
      setOfferMessage(`We reviewed your reputation ledger of ${score}/100 and want to provide early capital.`);
    }
  };

  const submitOffer = () => {
    if (!selectedBizOffer || !offerAmount.trim() || !offerTerms.trim()) return;
    addOffer({
      businessName: selectedBizOffer,
      investorName: investor.name || "Vanguard Partners",
      amount: offerAmount.trim(),
      terms: offerTerms.trim(),
      message: offerMessage.trim() || "Formal term sheet quote dispatched.",
      type: "manual",
    });
    const biz = selectedBizOffer;
    setSelectedBizOffer(null);
    setSuccessToast(`Dispatched term sheet quote of ${offerAmount} to ${biz}!`);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  const openDeployModal = (name: string, ask: string, type: "on-platform" | "off-platform") => {
    setDeployBiz(name);
    setDeployAmount(ask);
    setDeployTerms("10% Equity");
    setDeployType(type);
    setDeployMethod("platform");
    setDeployModalOpen(true);
  };

  const handleDeployInvestment = () => {
    if (!deployBiz || !deployAmount) return;
    addInvestment({
      businessName: deployBiz,
      amount: deployAmount,
      terms: deployTerms,
      type: deployType,
      method: deployMethod,
    });
    setDeployModalOpen(false);
    setSuccessToast(`Capital of ${deployAmount} deployed to ${deployBiz}.`);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 rounded-2xl border border-orange-200/60 bg-gradient-to-r from-orange-50 to-amber-50/80 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">Your Investor Profile</p>
            <h2 className="font-display text-xl font-bold text-foreground">{investor.name || "Investor"}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {investor.entityType || "Individual"} &bull; {investor.location || "Location not set"}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full border-orange-300 text-orange-700"
            onClick={openCommunityLounge}
          >
            <Globe className="mr-1.5 h-4 w-4" /> Community Lounge
          </Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white/80 p-3 text-xs">
            <p className="font-bold text-orange-800">Capital Range</p>
            <p className="mt-1 text-foreground">{investor.budgetRange || investor.ticketSize || "—"}</p>
          </div>
          <div className="rounded-xl bg-white/80 p-3 text-xs">
            <p className="font-bold text-orange-800">Focus Categories</p>
            <p className="mt-1 text-foreground">{(investor.categories ?? []).join(", ") || "—"}</p>
          </div>
          <div className="rounded-xl bg-white/80 p-3 text-xs">
            <p className="font-bold text-orange-800">Investment Strategy</p>
            <p className="mt-1 line-clamp-3 text-foreground">{investor.strategy || "—"}</p>
          </div>
        </div>
      </div>

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
            ["listings", "Deal Listings"],
            ["portfolio", `My Portfolio (${investments.length})`],
            ["quotes", `Quotes (${sentOffers.length})`],
            ["payment-desk", "Payment Desk"],
            ["chatbot", "AI Expert"],
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
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={openCommunityLounge}
          className="rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground transition-all hover:bg-white/80"
        >
          <Globe className="mr-1 inline h-3.5 w-3.5" />
          Community
        </button>
      </div>

      {successToast && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-green-500 bg-green-500/10 p-5">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600" />
          <p className="text-xs text-muted-foreground">{successToast}</p>
        </div>
      )}

      {tab !== "discover" && (
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={Sun} label="Total Deployed" value={`$${(totalDeployed / 1000).toFixed(0)}k`} subText="Funds committed" />
          <StatCard icon={TrendingUp} label="Self-Invested" value={`$${(selfInvestedSum / 1000).toFixed(0)}k`} subText="Direct" />
          <StatCard icon={ShieldCheck} label="Via Platform" value={`$${(platformInvestedSum / 1000).toFixed(0)}k`} subText="Escrow" />
          <StatCard icon={Handshake} label="Active Quotes" value={String(sentOffers.length)} subText="Pending" />
        </div>
      )}

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

      {tab === "listings" && (
        <div className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            {allOnPlatform.map((o) => (
              <Card key={o.name} className="rounded-3xl p-5">
                <h4 className="font-display text-lg font-bold">{o.name}</h4>
                <p className="text-xs text-muted-foreground">{o.location} &bull; {o.cat}</p>
                <p className="mt-2 font-display text-2xl font-black">{o.score}/100</p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={() => openDeployModal(o.name, o.ask, "on-platform")}>
                    <Coins className="mr-1 h-3.5 w-3.5" /> Deploy
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openOfferModal(o.name)}>
                    <Handshake className="mr-1 h-3.5 w-3.5" /> Quote
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {OFF_PLATFORM_LISTED.map((o) => (
              <Card key={o.name} className="rounded-3xl p-5 opacity-90">
                <h4 className="font-display text-base font-bold">{o.name}</h4>
                <p className="text-xs text-muted-foreground">{o.location} &bull; {o.cat}</p>
                <Button size="sm" className="mt-4" variant="outline" onClick={() => openDeployModal(o.name, o.ask, "off-platform")}>
                  <Coins className="mr-1 h-3.5 w-3.5" /> Deploy
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "portfolio" && (
        <div className="space-y-4">
          {investments.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No investments logged yet.</p>
            </Card>
          ) : (
            investments.map((inv) => (
              <Card key={inv.id} className="rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Building className="h-5 w-5" />
                    <div>
                      <h4 className="font-bold">{inv.businessName}</h4>
                      <p className="text-xs text-muted-foreground">{inv.terms} &bull; {inv.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black">{inv.amount}</p>
                    {inv.equityPercent != null && (
                      <p className="text-xs text-muted-foreground">{Number(inv.equityPercent).toFixed(2)}% equity</p>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
          <ReviewSubmitWidget roleLabel="Investor" className="mt-6" />
        </div>
      )}

      {tab === "quotes" && (
        <div className="space-y-4">
          {sentOffers.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No quotes dispatched yet.</p>
            </Card>
          ) : (
            sentOffers.map((o) => (
              <Card key={o.id} className="rounded-2xl p-5">
                <h4 className="font-bold">{o.businessName}</h4>
                <p className="text-sm font-semibold">{o.amount} &middot; {o.terms}</p>
                <p className="mt-2 text-xs italic text-muted-foreground">&quot;{o.message}&quot;</p>
                <div className="mt-3">
                  {o.status === "accepted" && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Accepted
                    </span>
                  )}
                  {o.status === "declined" && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-destructive">
                      <XCircle className="h-3.5 w-3.5" /> Declined
                    </span>
                  )}
                  {o.status === "pending" && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Pending
                    </span>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "payment-desk" && <InvestorPaymentDesk />}
      {tab === "chatbot" && <InvestorAIInvestmentExpert />}

      <Dialog open={selectedBizOffer !== null} onOpenChange={(open) => !open && setSelectedBizOffer(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <Handshake className="h-5 w-5 text-accent" />
              Propose Quote &middot; {selectedBizOffer}
            </DialogTitle>
            <DialogDescription className="text-xs">Dispatch a formal term sheet to the business owner.</DialogDescription>
          </DialogHeader>
          <div className="my-4 space-y-4">
            <div>
              <Label className="text-xs">Offer Amount</Label>
              <Input value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} className="h-9 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Terms</Label>
              <Input value={offerTerms} onChange={(e) => setOfferTerms(e.target.value)} className="h-9 text-xs" />
            </div>
            <div>
              <div className="mb-1 flex justify-between">
                <Label className="text-xs">Note to Founder</Label>
                <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={handleGenerateAIOffer}>
                  <Sparkles className="mr-1 h-3 w-3" /> AI Draft
                </Button>
              </div>
              <Textarea value={offerMessage} onChange={(e) => setOfferMessage(e.target.value)} rows={4} className="text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedBizOffer(null)}>Cancel</Button>
            <Button onClick={submitOffer}>
              <Send className="mr-1 h-3.5 w-3.5" /> Dispatch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deployModalOpen} onOpenChange={setDeployModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <Coins className="h-5 w-5 text-accent" />
              Deploy Capital
            </DialogTitle>
            <DialogDescription className="text-xs">Commit capital to {deployBiz}</DialogDescription>
          </DialogHeader>
          <div className="my-4 space-y-4">
            <Input value={deployAmount} onChange={(e) => setDeployAmount(e.target.value)} placeholder="Amount" className="h-9 text-xs" />
            <Input value={deployTerms} onChange={(e) => setDeployTerms(e.target.value)} placeholder="Terms" className="h-9 text-xs" />
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-xs"
              value={deployMethod}
              onChange={(e) => setDeployMethod(e.target.value as "self" | "platform")}
            >
              <option value="platform">Via Platform Escrow</option>
              <option value="self">Self-Invested (Direct)</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeployModalOpen(false)}>Cancel</Button>
            <Button onClick={handleDeployInvestment}>
              <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Execute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subText,
}: {
  icon: typeof Sun;
  label: string;
  value: string;
  subText: string;
}) {
  return (
    <Card className="rounded-2xl border border-border shadow-soft">
      <CardContent className="flex flex-col justify-between p-4.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
          <Icon className="h-4.5 w-4.5 text-muted-foreground" />
        </div>
        <div className="mt-3">
          <div className="font-display text-2xl font-black tracking-tight">{value}</div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">{subText}</div>
        </div>
      </CardContent>
    </Card>
  );
}
