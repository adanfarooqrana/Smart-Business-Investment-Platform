import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  TrendingUp,
  ArrowUpRight,
  Shield,
  Scale,
  User,
  Sun,
  type LucideIcon,
} from "lucide-react";
import type { InvestorProfile } from "@/hooks/useAppState";
import { STARTUP_IDEAS, type StartupIdea, isFounderPitchedIdea } from "@/data/startupIdeas";
import { formatPkr } from "@/lib/investmentCalculator";
import { InvestorFeedSunHero } from "@/components/investor/InvestorFeedSunHero";

export type { StartupIdea };
export { STARTUP_IDEAS };

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
  loadingLive?: boolean;
};

export function InvestorIdeasFeed({
  investor,
  searchQuery,
  onSearchChange,
  onSearchInteract,
  ideas,
  liveFounderCount = 0,
  loadingLive = false,
}: InvestorIdeasFeedProps) {
  const [animEpoch, setAnimEpoch] = useState(0);
  const prevQuery = useRef(searchQuery);

  useEffect(() => {
    if (prevQuery.current !== searchQuery) {
      setAnimEpoch((e) => e + 1);
      prevQuery.current = searchQuery;
    }
  }, [searchQuery, ideas.length]);

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-300">
      <InvestorFeedSunHero
        investor={investor}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onSearchInteract={onSearchInteract}
        ideaCount={ideas.length}
        liveFounderCount={liveFounderCount}
      />

      {(liveFounderCount > 0 || loadingLive) && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-2.5 text-center">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <p className="text-xs font-semibold text-emerald-800">
            {loadingLive && liveFounderCount === 0
              ? "Connecting to founder pitches from Firebase…"
              : `${liveFounderCount} live founder pitch${liveFounderCount === 1 ? "" : "es"} from backend — Stage 1 · 2 · 3 ready`}
          </p>
        </div>
      )}

      {/* Feed — planet orbit perspective */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm">
        <div className="investor-feed-scroll investor-planet-stage max-h-[calc(100vh-20rem)] overflow-y-auto px-2 py-3 sm:px-3">
          {ideas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 investor-planet-float">
                <span className="text-2xl">🌑</span>
              </div>
              <p className="font-display text-base font-bold text-slate-700">No matching dossiers</p>
              <p className="mt-1 max-w-sm text-xs text-slate-500">Try another keyword or industry filter.</p>
            </div>
          ) : (
            <div className="grid gap-4" key={animEpoch}>
              {ideas.map((idea, index) => (
                <DossierCard key={`${animEpoch}-${idea.id}`} idea={idea} index={index} isFiltered={!!searchQuery.trim()} />
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-[10px] font-medium uppercase tracking-widest text-slate-400">
        {ideas.length} live dossier{ideas.length === 1 ? "" : "s"} · click to open full 3-stage journey
      </p>
    </div>
  );
}

function DossierCard({ idea, index, isFiltered }: { idea: StartupIdea; index: number; isFiltered: boolean }) {
  const gradient = INDUSTRY_GRADIENTS[idea.industry] ?? "from-slate-600 to-slate-800";
  const isLive = isFounderPitchedIdea(idea);
  const verificationScore = idea.stage2?.founderBackground?.verificationScore ?? 85;
  const totalCapital = idea.stage2?.totalCapitalRequiredPkr ?? 0;
  const valuation = idea.stage2?.currentValuationPkr ?? 0;

  return (
    <Link
      to="/app/investor/idea/$ideaId"
      params={{ ideaId: idea.id }}
      className={`investor-dossier-card group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl sm:flex-row ${
        isFiltered ? "investor-planet-enter" : "investor-planet-enter-soft"
      }`}
      style={{ animationDelay: `${index * 0.12}s` }}
    >
      {/* Planet orb accent */}
      <div
        className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20 blur-sm investor-planet-float"
        style={{
          background: `radial-gradient(circle, ${index % 2 === 0 ? "#fbbf24" : "#a78bfa"} 0%, transparent 70%)`,
          animationDelay: `${index * 0.2}s`,
        }}
      />
      {/* Left accent panel */}
      <div className={`relative flex w-full shrink-0 flex-col justify-between bg-gradient-to-br ${gradient} p-5 text-white sm:w-[220px] lg:w-[240px]`}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_55%)]" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm">
              {idea.industry}
            </span>
            {isLive && (
              <span className="inline-block rounded-full bg-emerald-400/30 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-50 ring-1 ring-emerald-200/40">
                Live · Founder DB
              </span>
            )}
          </div>
          <h3 className="mt-3 font-display text-xl font-extrabold leading-tight tracking-tight">
            {idea.startupTitle}
          </h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-white/80">
            <User className="h-3 w-3" />
            {idea.founderName}
          </p>
        </div>
        <div className="relative mt-4 flex items-end justify-between gap-2">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-white/60">Expected ROI</p>
            <p className="flex items-center gap-1 font-display text-lg font-black">
              <TrendingUp className="h-4 w-4" />
              {idea.stage1.expectedRoi}
            </p>
          </div>
          <div className="rounded-lg bg-white/15 px-2 py-1 text-[10px] font-bold backdrop-blur-sm">
            {idea.stage1.equityOffered}
          </div>
        </div>
      </div>

      {/* Main body */}
      <div className="flex min-w-0 flex-1 flex-col justify-between p-5">
        <div>
          <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">{idea.description}</p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <StagePill icon={Sun} label="Stage 1" sub="Idea & Terms" color="slate" />
            <StagePill icon={Scale} label="Stage 2" sub="Finance" color="amber" />
            <StagePill icon={Shield} label="Stage 3" sub="Legal & Pay" color="emerald" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
            <span>
              Raise: <strong className="text-slate-800">{formatPkr(totalCapital)}</strong>
            </span>
            <span>
              Valuation: <strong className="text-slate-800">{formatPkr(valuation)}</strong>
            </span>
            <span>
              Score: <strong className="text-emerald-600">{verificationScore}/100</strong>
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-all group-hover:bg-amber-500 group-hover:shadow-lg group-hover:shadow-amber-500/25">
            Open 3-Stage Journey
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function StagePill({
  icon: Icon,
  label,
  sub,
  color,
}: {
  icon: LucideIcon;
  label: string;
  sub: string;
  color: "slate" | "amber" | "emerald";
}) {
  const styles = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    amber: "border-amber-200/80 bg-amber-50/80 text-amber-800",
    emerald: "border-emerald-200/80 bg-emerald-50/80 text-emerald-800",
  }[color];

  return (
    <div className={`rounded-xl border px-2.5 py-2 text-center ${styles}`}>
      <Icon className="mx-auto mb-1 h-3.5 w-3.5 opacity-70" />
      <p className="text-[9px] font-bold uppercase tracking-wide">{label}</p>
      <p className="text-[9px] opacity-70">{sub}</p>
    </div>
  );
}

export function filterStartupIdeas(ideas: StartupIdea[], query: string): StartupIdea[] {
  const q = query.trim().toLowerCase();
  if (!q) return ideas;
  return ideas.filter(
    (idea) =>
      idea.founderName.toLowerCase().includes(q) ||
      idea.startupTitle.toLowerCase().includes(q) ||
      idea.industry.toLowerCase().includes(q) ||
      idea.description.toLowerCase().includes(q),
  );
}
