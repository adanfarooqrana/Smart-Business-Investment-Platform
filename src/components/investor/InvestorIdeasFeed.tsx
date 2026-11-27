import { OpenChunkIdeas, type MarketProduct } from "@/components/investor/InvestorMarketplace";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  TrendingUp,
  ArrowUpRight,
  Shield,
  Scale,
  User,
  Landmark,
  Sun,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  Building2,
  type LucideIcon,
} from "lucide-react";
import type { InvestorProfile } from "@/hooks/useAppState";
import { STARTUP_IDEAS, type StartupIdea } from "@/data/startupIdeas";
import { formatPkr } from "@/lib/investmentCalculator";
import { InvestorFeedSunHero } from "@/components/investor/InvestorFeedSunHero";
import { sendInvestorQueryToFounder } from "@/services/founderFirebaseService";
import {
  sendUnifiedChatMessage,
  streamInvestorPendingTransactions,
  peekActiveInvestorUid,
} from "@/services/investorCoreService";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/firebase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export type { StartupIdea };
export { STARTUP_IDEAS };

function resolveFounderId(idea: StartupIdea): string {
  return String(
    idea.founderId ||
      idea.entrepreneurUid ||
      (idea as { uid?: string }).uid ||
      "",
  ).trim();
}

function openInvestorJourney(
  navigate: ReturnType<typeof useNavigate>,
  idea: StartupIdea,
  stage: 1 | 2 | 3 | 4 = 1,
) {
  try {
    const founderId = resolveFounderId(idea);
    navigate({
      to: "/app/investor/idea/$ideaId",
      params: { ideaId: idea.id },
      search: {
        ...(founderId ? { founderId } : {}),
        stage,
      },
    });
  } catch (error) {
    console.error("openInvestorJourney navigation error:", error);
  }
}

const INDUSTRY_GRADIENTS: Record<string, string> = {
  "Food & Beverage": "from-amber-500 via-orange-500 to-rose-500",
  "SaaS / Tech": "from-violet-600 via-indigo-600 to-blue-600",
  "Retail & E-commerce": "from-fuchsia-500 via-pink-500 to-rose-500",
  "Health & Wellness": "from-emerald-500 via-teal-500 to-cyan-500",
  "Logistics & Transport": "from-slate-600 via-slate-700 to-slate-900",
  Agrotech: "from-lime-500 via-green-600 to-emerald-700",
  "EdTech": "from-sky-500 via-blue-600 to-indigo-600",
  Healthcare: "from-teal-500 via-emerald-600 to-green-700",
};

type InvestorIdeasFeedProps = {
  investor: InvestorProfile;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchInteract?: () => void;
  ideas: StartupIdea[];
  liveFounderCount?: number;
  chunkIdeas?: MarketProduct[];
  catalogError?: string;
  retryCatalog?: () => Promise<void>;
};

export function InvestorIdeasFeed({
  investor,
  searchQuery: searchInput,
  onSearchChange,
  onSearchInteract,
  ideas: ideaRows,
  liveFounderCount = 0,
  chunkIdeas: chunkRows,
  catalogError,
  retryCatalog,
}: InvestorIdeasFeedProps) {
  const { currentUser } = useAuth();
  const searchQuery = typeof searchInput === "string" ? searchInput : "";
  const ideas = Array.isArray(ideaRows) ? ideaRows.filter((idea) => typeof idea?.id === "string") : [];
  const chunkIdeas = Array.isArray(chunkRows) ? chunkRows.filter((idea) => typeof idea?.id === "string") : [];
  const [animEpoch, setAnimEpoch] = useState(0);
  const prevQuery = useRef(searchQuery);
  const [activeMessageIdea, setActiveMessageIdea] = useState<StartupIdea | null>(null);
  const [activeViewIdea, setActiveViewIdea] = useState<StartupIdea | null>(null);
  /** Pitch IDs with pending or approved payment_desk / transaction rows for this investor */
  const [investedPitchIds, setInvestedPitchIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (prevQuery.current !== searchQuery) {
      setAnimEpoch((e) => e + 1);
      prevQuery.current = searchQuery;
    }
  }, [searchQuery, ideas.length]);

  useEffect(() => {
    let uid = "";
    try {
      uid = String(
        currentUser?.uid || auth.currentUser?.uid || peekActiveInvestorUid() || "",
      ).trim();
    } catch {
      uid = "";
    }
    if (!uid) {
      setInvestedPitchIds(new Set());
      return;
    }
    let active = true;
    const unsub = streamInvestorPendingTransactions(uid, (items) => {
      try {
        if (!active) return;
        const next = new Set<string>();
        for (const tx of items || []) {
          const pitchId = String(tx?.pitchId || "").trim();
          // Catch pending proof submissions and approved logs
          if (pitchId && (tx.status === "pending" || tx.status === "approved")) {
            next.add(pitchId);
          }
        }
        setInvestedPitchIds(next);
      } catch (error) {
        console.error("InvestorIdeasFeed invested-pitch parse error:", error);
      }
    });
    return () => {
      active = false;
      try {
        unsub();
      } catch (error) {
        console.error("InvestorIdeasFeed invested-pitch unsub error:", error);
      }
    };
  }, [currentUser?.uid]);

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-300">
      <InvestorFeedSunHero
        investor={investor}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onSearchInteract={onSearchInteract}
        ideaCount={ideas.length + chunkIdeas.length}
        liveFounderCount={liveFounderCount}
      />

      <Link to="/app/investor" search={{ view: "founders" }}
        className="self-start rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-950 md:hidden">
        Explore Founders
      </Link>
      {catalogError && <p role="alert" className="rounded-lg bg-orange-50 p-3 text-sm text-orange-950">
        {catalogError}{" "}{retryCatalog && <button type="button" className="font-semibold underline" onClick={() => void retryCatalog()}>Retry catalog</button>}
      </p>}

      {/* Feed — real founder dossier grid */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm">
        <div className="investor-feed-scroll investor-planet-stage space-y-5 px-2 py-3 sm:px-3">
          {ideas.length === 0 && chunkIdeas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 duration-500">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100/80 text-orange-600 border border-orange-200/80 shadow-inner">
                <span className="text-3xl animate-bounce">🌱</span>
              </div>
              <p className="font-display text-base font-extrabold text-slate-800">
                Waiting for founders to publish custom pitches...
              </p>
              <p className="mt-1.5 max-w-md text-xs text-slate-500 leading-relaxed">
                {searchQuery.trim()
                  ? "No pitches match your active filter. Try clearing or updating your search query."
                  : "Registered founder pitches will populate here in real-time as soon as founders publish multi-stage dossiers."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4" key={animEpoch}>
              {ideas.map((idea, index) => (
                <DossierCard
                  key={`${animEpoch}-${idea.id}`}
                  idea={idea}
                  index={index}
                  isFiltered={!!searchQuery.trim()}
                  hasInvested={investedPitchIds.has(String(idea.id || "").trim())}
                  onOpenMessage={(selectedIdea) => setActiveMessageIdea(selectedIdea)}
                  onOpenViewBusiness={(selectedIdea) => setActiveViewIdea(selectedIdea)}
                />
              ))}
            </div>
          )}
          {chunkIdeas.length > 0 && <OpenChunkIdeas items={chunkIdeas} />}
        </div>
      </div>

      <p className="text-center text-[10px] font-medium uppercase tracking-widest text-slate-400">
        {ideas.length} live dossier{ideas.length === 1 ? "" : "s"} · click to open four-stage dossier
      </p>

      {/* Send Message Dialog */}
      {activeMessageIdea && (
        <SendMessageModal
          idea={activeMessageIdea}
          investor={investor}
          onClose={() => setActiveMessageIdea(null)}
        />
      )}

      {activeViewIdea && (
        <ViewBusinessModal idea={activeViewIdea} onClose={() => setActiveViewIdea(null)} />
      )}
    </div>
  );
}

function DossierCard({
  idea,
  index,
  isFiltered,
  hasInvested,
  onOpenMessage,
  onOpenViewBusiness,
}: {
  idea: StartupIdea;
  index: number;
  isFiltered: boolean;
  hasInvested: boolean;
  onOpenMessage: (idea: StartupIdea) => void;
  onOpenViewBusiness: (idea: StartupIdea) => void;
}) {
  const navigate = useNavigate();
  const title = String(idea.stage1?.ideaTitle ?? idea.startupTitle ?? "").trim();
  const category = String(idea.stage1?.categoryIndustry ?? idea.industry ?? "").trim();
  const description = String(idea.stage1?.ideaDescription ?? idea.description ?? "").trim();
  const raisePkr = Number(idea.stage1?.requiredInvestmentPkr ?? idea.stage2?.totalCapitalRequiredPkr ?? 0) || 0;
  const valuationPkr = Number(idea.stage2?.currentValuationPkr ?? 0) || 0;
  const roiPct = Number(idea.stage1?.expectedRoiPercent ?? 0) || 0;
  const equityPct = Number(idea.stage1?.equityOfferedPercent ?? 0) || 0;
  const roiLabel =
    roiPct > 0 ? `${roiPct}%` : String(idea.stage1?.expectedRoi ?? "").trim();
  const equityLabel =
    equityPct > 0 ? `${equityPct}%` : String(idea.stage1?.equityOffered ?? "").trim();
  const verificationScore = Number(idea.stage2?.founderBackground?.verificationScore ?? 0) || 0;
  const gradient = INDUSTRY_GRADIENTS[category] ?? "from-slate-600 to-slate-800";

  return (
    <div
      className={`investor-dossier-card group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-xl sm:flex-row ${
        isFiltered ? "investor-planet-enter" : "investor-planet-enter-soft"
      }`}
      style={{ animationDelay: `${index * 0.12}s` }}
    >
      {/* Left accent panel */}
      <div className={`relative flex w-full shrink-0 flex-col justify-between bg-gradient-to-br ${gradient} p-5 text-white sm:w-[220px] lg:w-[240px]`}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_55%)]" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            {category ? (
              <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm">
                {category}
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 font-display text-xl font-extrabold leading-tight tracking-tight">
            <Link to="/app/investor/idea/$ideaId" params={{ ideaId: idea.id }} search={{ founderId: resolveFounderId(idea) || undefined, stage: 1 }}
              className="hover:underline focus-visible:underline">{title}</Link>
          </h3>
          {idea.founderName ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-white/80">
              <User className="h-3 w-3" />
              {idea.founderName}
            </p>
          ) : null}
        </div>
        <div className="relative mt-4 flex items-end justify-between gap-2">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-white/60">Expected ROI</p>
            <p className="flex items-center gap-1 font-display text-lg font-black">
              <TrendingUp className="h-4 w-4" />
              {roiLabel}
            </p>
          </div>
          {equityLabel ? (
            <div className="rounded-lg bg-white/15 px-2 py-1 text-[10px] font-bold backdrop-blur-sm">
              {equityLabel}
            </div>
          ) : null}
        </div>
      </div>

      {/* Main body */}
      <div className="flex min-w-0 flex-1 flex-col justify-between p-5">
        <div>
          {description ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">{description}</p>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StagePill
              icon={Sun}
              label="Stage 1"
              sub="Showcase"
              color="slate"
              onClick={() => openInvestorJourney(navigate, idea, 1)}
            />
            <StagePill
              icon={Scale}
              label="Stage 2"
              sub="Samples"
              color="amber"
              onClick={() => openInvestorJourney(navigate, idea, 2)}
            />
            <StagePill
              icon={Shield}
              label="Stage 3"
              sub="Allocation & signing"
              color="emerald"
              onClick={() => openInvestorJourney(navigate, idea, 3)}
            />
            <StagePill
              icon={Landmark}
              label="Stage 4"
              sub="Escrow"
              color="amber"
              onClick={() => openInvestorJourney(navigate, idea, 4)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
            {raisePkr > 0 ? (
              <span>
                Raise: <strong className="text-slate-800">{formatPkr(raisePkr)}</strong>
              </span>
            ) : null}
            {valuationPkr > 0 ? (
              <span>
                Valuation: <strong className="text-slate-800">{formatPkr(valuationPkr)}</strong>
              </span>
            ) : null}
            {verificationScore > 0 ? (
              <span>
                Score: <strong className="text-emerald-600">{verificationScore}/100</strong>
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenViewBusiness(idea)}
              className="rounded-full border-amber-300 bg-amber-50 text-xs font-semibold text-amber-800 hover:border-amber-400 hover:bg-amber-100"
            >
              <Building2 className="mr-1.5 h-3.5 w-3.5" />
              View Business
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenMessage(idea)}
              className="rounded-full border-slate-300 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
            >
              <MessageSquare className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
              Send Message
            </Button>

            {hasInvested ? (
              <button
                type="button"
                disabled
                className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full bg-gray-600 px-4 py-2 text-xs font-bold text-gray-300"
              >
                Invested
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openInvestorJourney(navigate, idea, 1)}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-500/25"
              >
                Open 3-Stage Journey
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewBusinessModal({
  idea,
  onClose,
}: {
  idea: StartupIdea;
  onClose: () => void;
}) {
  const title = String(idea.stage1?.ideaTitle ?? idea.startupTitle ?? "").trim();
  const category = String(idea.stage1?.categoryIndustry ?? idea.industry ?? "").trim();
  const description = String(
    idea.stage1?.ideaDescription ??
      idea.stage1?.coreProblemSolution ??
      idea.description ??
      "",
  ).trim();
  const raisePkr =
    Number(idea.stage1?.requiredInvestmentPkr ?? idea.stage2?.totalCapitalRequiredPkr ?? 0) || 0;
  const valuationPkr = Number(idea.stage2?.currentValuationPkr ?? 0) || 0;
  const roiPct = Number(idea.stage1?.expectedRoiPercent ?? 0) || 0;
  const equityPct = Number(idea.stage1?.equityOfferedPercent ?? 0) || 0;
  const roiLabel =
    roiPct > 0 ? `${roiPct}%` : String(idea.stage1?.expectedRoi ?? "").trim() || "—";
  const equityLabel =
    equityPct > 0 ? `${equityPct}%` : String(idea.stage1?.equityOffered ?? "").trim() || "—";
  const location = String(idea.stage2?.marketInsight?.location ?? "").trim();
  const customers = String(idea.stage2?.customerBaseSize ?? "").trim();
  const experience = Number(idea.stage2?.founderBackground?.yearsExperience ?? 0) || 0;
  const education = String(idea.stage2?.founderBackground?.education ?? "").trim();
  const marketSummary = String(idea.stage2?.marketInsight?.marketSummary ?? "").trim();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-extrabold text-slate-900">
            {title || "Business details"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Quick overview of this founder pitch
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2">
            {category ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                {category}
              </span>
            ) : null}
            {idea.founderName ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">
                <User className="h-3 w-3" />
                {idea.founderName}
              </span>
            ) : null}
          </div>

          {description ? (
            <p className="leading-relaxed text-slate-600">{description}</p>
          ) : (
            <p className="text-slate-400">No description provided yet.</p>
          )}

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Investment needed</p>
              <p className="mt-0.5 font-bold text-slate-900">
                {raisePkr > 0 ? formatPkr(raisePkr) : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Equity offered</p>
              <p className="mt-0.5 font-bold text-slate-900">{equityLabel}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expected return</p>
              <p className="mt-0.5 font-bold text-slate-900">{roiLabel}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Business value</p>
              <p className="mt-0.5 font-bold text-slate-900">
                {valuationPkr > 0 ? formatPkr(valuationPkr) : "—"}
              </p>
            </div>
          </div>

          {(location || customers || experience > 0 || education || marketSummary) && (
            <div className="space-y-2 rounded-xl border border-slate-100 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">More details</p>
              {location ? (
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Location:</span> {location}
                </p>
              ) : null}
              {customers ? (
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Customers:</span> {customers}
                </p>
              ) : null}
              {experience > 0 ? (
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Founder experience:</span> {experience} years
                </p>
              ) : null}
              {education ? (
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Education:</span> {education}
                </p>
              ) : null}
              {marketSummary ? (
                <p className="text-xs leading-relaxed text-slate-600">{marketSummary}</p>
              ) : null}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="rounded-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SendMessageModal({
  idea,
  investor,
  onClose,
}: {
  idea: StartupIdea;
  investor: InvestorProfile;
  onClose: () => void;
}) {
  const { currentUser } = useAuth();
  const [messageText, setMessageText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const founderId = resolveFounderId(idea);
  const investorId = String(currentUser?.uid || "").trim();
  const pitchTitle = String(idea.stage1?.ideaTitle ?? idea.startupTitle ?? "").trim();

  const handleSubmit = async () => {
    if (!messageText.trim() || !founderId || !investorId) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const text = messageText.trim();

      // Unified room: chats/{pitchId}_{investorId}_{founderId}/messages
      await sendUnifiedChatMessage(
        idea.id,
        investorId,
        founderId,
        investorId,
        text,
        "General",
        {
          senderName: investor.name || currentUser?.displayName || "Investor",
          founderName: idea.founderName || "",
          startupTitle: pitchTitle || idea.id,
          investorName: investor.name || currentUser?.displayName || "Investor",
        },
      );

      try {
        await sendInvestorQueryToFounder({
          founderId,
          pitchId: idea.id,
          investorId,
          investorName: investor.name || "Verified Investor",
          messageText: text,
        });
      } catch (queryErr) {
        console.warn("Founder query matrix mirror skipped:", queryErr);
      }

      setMessageText("");
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      console.error("Failed sending message to founder:", err);
      setErrorMsg("Failed to dispatch message. Please check connection and try again.");
      toast.error("Could not send chat message.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
            <MessageSquare className="h-5 w-5 text-amber-500" />
            Send Message to Founder &bull; {idea.founderName}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Direct inquiry for <span className="font-semibold text-slate-800">{pitchTitle}</span>. Your message will be routed directly to the founder&apos;s Query Matrix.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="my-6 flex flex-col items-center justify-center gap-2 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-in zoom-in duration-300" />
            <p className="font-display text-sm font-bold text-slate-900">Message Dispatched!</p>
            <p className="text-xs text-slate-500">
              Registered under founder&apos;s Investor Query Matrix.
            </p>
          </div>
        ) : (
          <div className="my-4 space-y-3">
            {!investorId && (
              <p className="text-xs font-semibold text-amber-600">
                Sign in required to send a live chat message.
              </p>
            )}
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your question, term inquiry, or proposal for the founder..."
              rows={4}
              className="text-xs"
            />
            {errorMsg && <p className="text-xs font-semibold text-red-500">{errorMsg}</p>}
          </div>
        )}

        {!success && (
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || !messageText.trim() || !founderId || !investorId}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Send Message
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StagePill({
  icon: Icon,
  label,
  sub,
  color,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  sub: string;
  color: "slate" | "amber" | "emerald";
  onClick?: () => void;
}) {
  const styles = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    amber: "border-amber-200/80 bg-amber-50/80 text-amber-800",
    emerald: "border-emerald-200/80 bg-emerald-50/80 text-emerald-800",
  }[color];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-2.5 py-2 text-center transition-colors hover:brightness-95 ${styles}`}
    >
      <Icon className="mx-auto mb-1 h-3.5 w-3.5 opacity-70" />
      <p className="text-[9px] font-bold uppercase tracking-wide">{label}</p>
      <p className="text-[9px] opacity-70">{sub}</p>
    </button>
  );
}

export function filterStartupIdeas(ideas: StartupIdea[] | null | undefined, query: string | null | undefined): StartupIdea[] {
  const q = query?.trim().toLowerCase() ?? "";
  const rows = Array.isArray(ideas) ? ideas : [];
  return rows.filter((idea) => typeof idea?.id === "string" && (!q || [
    idea.stage1?.ideaTitle, idea.startupTitle, idea.founderName,
    idea.stage1?.categoryIndustry, idea.industry, idea.stage1?.ideaDescription,
    idea.description, idea.stage1?.productType,
  ].some((value) => typeof value === "string" && value.toLowerCase().includes(q))));
}