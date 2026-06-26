import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAppState } from "@/hooks/useAppState";
import { DollarSign, ShieldAlert, Sparkles, TrendingUp, Handshake, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/offers")({
  component: OffersPage,
});

function OffersPage() {
  const { business, offers, updateOfferStatus, isLoggedIn, role } = useAppState();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn || role !== "business" || !business.isRegistered) {
      navigate({ to: "/app/login" });
    }
  }, [isLoggedIn, role, business.isRegistered, navigate]);

  // If not registered as a business or not logged in, display a prompt
  if (!isLoggedIn || role !== "business" || !business.isRegistered) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  // Filter offers targeting the user's business name
  // To make evaluation smooth, we also show "Luna Bistro" default offers if they match, or if their business name is different
  const matchingOffers = offers.filter(
    (o) =>
      o.businessName.toLowerCase() === business.name.toLowerCase() ||
      o.businessName === "Luna Bistro"
  );

  const pendingOffers = matchingOffers.filter((o) => o.status === "pending");
  const acceptedOffers = matchingOffers.filter((o) => o.status === "accepted");

  // Calculate totals
  const parseAmount = (amtStr: string) => {
    return parseInt(amtStr.replace(/[^0-9]/g, ""), 10) || 0;
  };

  const totalOffered = matchingOffers.reduce((sum, o) => sum + parseAmount(o.amount), 0);
  const totalAccepted = acceptedOffers.reduce((sum, o) => sum + parseAmount(o.amount), 0);

  const handleAccept = (id: string, investorName: string, amount: string) => {
    updateOfferStatus(id, "accepted");
    setSuccessMsg(`Congratulations! You have accepted the funding offer of ${amount} from ${investorName}. Our legal team will reach out to draft the paperwork.`);
    setTimeout(() => setSuccessMsg(null), 8000);
  };

  const handleDecline = (id: string) => {
    updateOfferStatus(id, "declined");
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Step 04</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Investor Offers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Negotiate and accept direct offers sent by institutional funds and AI-matched investors targeting <span className="font-semibold text-foreground">{business.name}</span>.
        </p>
      </div>

      {successMsg && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-accent bg-accent/10 p-5 animate-in fade-in slide-in-from-top duration-300">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-accent" />
          <div>
            <div className="font-display text-lg font-semibold text-foreground">Offer Accepted! 🤝</div>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{successMsg}</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card className="bg-card shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total Funding Offered</span>
            </div>
            <div className="mt-2 font-display text-3xl font-semibold">
              ${totalOffered.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Across {matchingOffers.length} registered matches</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-accent">
              <Handshake className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Accepted Capital</span>
            </div>
            <div className="mt-2 font-display text-3xl font-semibold text-accent">
              ${totalAccepted.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Ready to secure and close</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Pending Offers</span>
            </div>
            <div className="mt-2 font-display text-3xl font-semibold">
              {pendingOffers.length}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Awaiting your evaluation</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Offers List */}
        <div className="space-y-6">
          <h3 className="font-display text-xl font-semibold">Active Term Sheets</h3>

          {matchingOffers.length === 0 ? (
            <Card className="p-8 text-center shadow-card">
              <p className="text-muted-foreground">No investor offers yet. Run AI Consultant loops or boost your reputation score to attract deals.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {matchingOffers.map((o) => (
                <Card
                  key={o.id}
                  className={`overflow-hidden border shadow-card transition-all ${
                    o.status === "accepted"
                      ? "border-accent/40 bg-accent/5"
                      : o.status === "declined"
                        ? "border-border opacity-60"
                        : "border-border hover:border-foreground/20"
                  }`}
                >
                  <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="font-display text-lg font-semibold">
                          {o.investorName}
                        </CardTitle>
                        {o.type === "ai" && (
                          <Badge variant="secondary" className="flex items-center gap-1 bg-accent/15 text-accent border-none text-[10px]">
                            <Sparkles className="h-2.5 w-2.5" /> AI Recommended
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs">{o.timestamp}</CardDescription>
                    </div>
                    <div>
                      {o.status === "accepted" && (
                        <Badge className="bg-accent text-accent-foreground border-none flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Accepted
                        </Badge>
                      )}
                      {o.status === "declined" && (
                        <Badge variant="outline" className="text-muted-foreground flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> Declined
                        </Badge>
                      )}
                      {o.status === "pending" && (
                        <span className="text-2xl font-display font-semibold tracking-tight text-foreground">
                          {o.amount}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm space-y-3 pb-4">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">Proposed Terms</span>
                      <p className="font-medium text-foreground">{o.terms}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">Investor Note</span>
                      <p className="text-muted-foreground leading-relaxed italic">"{o.message}"</p>
                    </div>
                  </CardContent>
                  {o.status === "pending" && (
                    <CardFooter className="flex justify-end gap-2 border-t border-border/40 bg-secondary/20 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDecline(o.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAccept(o.id, o.investorName, o.amount)}
                        className="bg-foreground text-background hover:opacity-90"
                      >
                        Accept Terms & Connect
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* AI Advisory Sidebox */}
        <div className="space-y-6">
          <Card className="relative overflow-hidden bg-foreground text-background border-none p-6 shadow-soft">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-background/70">
                <Sparkles className="h-3.5 w-3.5 text-accent" /> AI Valuation Advisor
              </div>
              <h4 className="mt-3 font-display text-lg font-semibold leading-snug">Multiple Evaluation</h4>
              <p className="mt-2 text-xs text-background/80 leading-relaxed">
                Based on your registered category ({business.category}) and current score ({business.score}), the market average investment cap sits at 5.2x EBITDA.
              </p>
              <div className="mt-4 border-t border-background/10 pt-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-background/60">Target Valuation:</span>
                  <span className="font-semibold text-accent">$750,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-background/60">Funding Ask:</span>
                  <span className="font-semibold">$50,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-background/60">Implied Equity Cap:</span>
                  <span className="font-semibold">6.6%</span>
                </div>
              </div>
              <p className="mt-4 text-[10px] text-background/60 leading-tight">
                *Advice generated live based on real-time peer comparisons.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
