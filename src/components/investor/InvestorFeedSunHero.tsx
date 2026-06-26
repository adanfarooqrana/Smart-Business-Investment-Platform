import { useState, useCallback, useEffect, useRef } from "react";
import { Sun, Sparkles, Search } from "lucide-react";
import type { InvestorProfile } from "@/hooks/useAppState";

type InvestorFeedSunHeroProps = {
  investor: InvestorProfile;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchInteract?: () => void;
  ideaCount: number;
  liveFounderCount?: number;
};

export function InvestorFeedSunHero({
  investor,
  searchQuery,
  onSearchChange,
  onSearchInteract,
  ideaCount,
  liveFounderCount = 0,
}: InvestorFeedSunHeroProps) {
  const [sunLit, setSunLit] = useState(false);
  const [sunBlink, setSunBlink] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const blinkTimer = useRef<number | null>(null);

  const triggerBlink = useCallback(() => {
    setSunBlink(true);
    onSearchInteract?.();
    if (blinkTimer.current) window.clearTimeout(blinkTimer.current);
    blinkTimer.current = window.setTimeout(() => setSunBlink(false), 700);
  }, [onSearchInteract]);

  useEffect(
    () => () => {
      if (blinkTimer.current) window.clearTimeout(blinkTimer.current);
    },
    [],
  );

  const handleSunClick = useCallback(() => {
    setSunLit(true);
    setBurstKey((k) => k + 1);
    triggerBlink();
    window.setTimeout(() => setSunLit(false), 2400);
  }, [triggerBlink]);

  const handleSearchChange = (value: string) => {
    if (value.length > 0) triggerBlink();
    onSearchChange(value);
  };

  return (
    <div
      className={`investor-sun-hero relative overflow-hidden rounded-2xl border transition-all duration-700 ${
        sunLit
          ? "border-orange-300/80 bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-400 shadow-xl shadow-orange-400/40"
          : "border-orange-300/30 bg-gradient-to-br from-orange-600 via-amber-600 to-orange-700 shadow-xl shadow-orange-600/20"
      }`}
    >
      {sunLit && <div key={burstKey} className="investor-sun-burst pointer-events-none absolute inset-0 z-10" />}

      {/* Money rising from sun upward */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`investor-sun-rays ${sunLit ? "investor-sun-rays-lit" : ""}`} />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <span
            key={`money-${i}`}
            className={`investor-paisa-rise absolute font-black ${sunLit ? "text-yellow-200" : "text-amber-300/70"}`}
            style={{
              left: `${6 + i * 11}%`,
              bottom: "0%",
              fontSize: i % 2 === 0 ? "11px" : "13px",
              animationDelay: `${i * 0.38}s`,
              animationDuration: `${2 + (i % 3) * 0.5}s`,
            }}
          >
            {i % 2 === 0 ? "₨" : "PKR"}
          </span>
        ))}
      </div>

      <div className="relative z-20 flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center">
        <button
          type="button"
          onClick={handleSunClick}
          aria-label="Activate golden insight mode"
          className={`group relative flex shrink-0 flex-col items-center gap-2 rounded-2xl p-2 transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
            sunLit ? "scale-105" : "hover:scale-105"
          }`}
        >
          <div className="relative">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="investor-money-rise-from-sun absolute left-1/2 z-0 text-[11px] font-black text-amber-300"
                style={{ animationDelay: `${i * 0.5}s`, marginLeft: `${(i - 1) * 8}px` }}
              >
                ₨
              </span>
            ))}
            <div
              className={`relative flex h-16 w-16 items-center justify-center rounded-full transition-all duration-500 ${
                sunLit
                  ? "bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-400 shadow-[0_0_40px_12px_rgba(251,191,36,0.55)]"
                  : "bg-gradient-to-br from-amber-400/90 to-orange-500 shadow-lg shadow-amber-500/30 group-hover:shadow-amber-400/50"
              } ${sunBlink ? "investor-sun-blink" : ""}`}
            >
              <div
                className={`absolute inset-0 rounded-full border-2 border-dashed transition-all duration-700 ${
                  sunLit ? "border-yellow-200/80 investor-sun-orbit" : "border-amber-300/30 investor-sun-orbit-slow"
                }`}
              />
              <Sun
                className={`relative h-8 w-8 transition-all duration-500 ${
                  sunLit ? "text-yellow-50 animate-[spin_8s_linear_infinite]" : "text-amber-950 group-hover:rotate-45"
                }`}
              />
            </div>
          </div>
          <span
            className={`text-[9px] font-bold uppercase tracking-widest transition-colors duration-500 ${
              sunLit ? "text-amber-900" : "text-orange-100 group-hover:text-white"
            }`}
          >
            {sunLit ? "Golden Mode ✦" : "Tap Sun"}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p
              className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-500 ${
                sunLit ? "text-amber-800" : "text-orange-100"
              }`}
            >
              Investment Pipeline
            </p>
            {sunLit && (
              <span className="animate-in fade-in zoom-in flex items-center gap-1 rounded-full bg-amber-400/30 px-2 py-0.5 text-[9px] font-bold text-amber-900 duration-300">
                <Sparkles className="h-3 w-3" /> Insights Lit
              </span>
            )}
          </div>
          <p className={`font-display text-xl font-bold transition-colors duration-500 sm:text-2xl ${sunLit ? "text-amber-950" : "text-white"}`}>
            Curated Startup Dossiers
          </p>
          <p className={`mt-0.5 text-xs transition-colors duration-500 ${sunLit ? "text-amber-800/70" : "text-orange-50/80"}`}>
            {ideaCount} live opportunities
            {liveFounderCount > 0 ? ` · ${liveFounderCount} from founder backend` : ""}
            {" · "}matched ideas orbit forward like planets
          </p>

          <div className="relative mt-3">
            <Search
              className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${
                sunLit ? "text-amber-600" : "text-orange-100/70"
              }`}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={triggerBlink}
              onClick={triggerBlink}
              placeholder="Search industry, founder, or keyword…"
              className={`h-11 w-full rounded-xl border pl-10 pr-4 text-sm transition-all duration-500 focus:outline-none focus:ring-2 ${
                sunLit
                  ? "border-amber-300/80 bg-white/90 text-amber-950 placeholder:text-amber-600/50 focus:border-amber-400 focus:ring-amber-300/40"
                  : "border-white/25 bg-white/15 text-white placeholder:text-orange-100/60 focus:border-white/50 focus:ring-white/25"
              } ${sunBlink ? "ring-2 ring-yellow-200/60" : ""}`}
            />
          </div>
        </div>

        {investor.aiConsultantToken && (
          <div
            className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 transition-all duration-500 ${
              sunLit ? "border-amber-400/40 bg-white/70 shadow-sm" : "border-white/25 bg-white/15"
            }`}
          >
            <Sparkles className={`h-4 w-4 ${sunLit ? "text-amber-600" : "text-yellow-200"}`} />
            <div>
              <p className={`text-[9px] font-bold uppercase tracking-wider ${sunLit ? "text-amber-700" : "text-orange-100/80"}`}>
                Consultant AI
              </p>
              <p className={`font-mono text-[10px] font-semibold ${sunLit ? "text-amber-900" : "text-white"}`}>
                {investor.aiConsultantToken}
              </p>
            </div>
          </div>
        )}
      </div>

      {investor.budgetRange && (
        <p
          className={`relative z-20 border-t px-5 py-2.5 text-[11px] transition-all duration-500 sm:px-6 ${
            sunLit ? "border-amber-300/50 text-amber-800/80 bg-amber-50/50" : "border-white/5 text-slate-400"
          }`}
        >
          Your range: <span className={`font-semibold ${sunLit ? "text-amber-950" : "text-white"}`}>{investor.budgetRange}</span>
          {investor.categories?.length ? (
            <> &bull; <span className={sunLit ? "text-amber-900" : "text-slate-300"}>{investor.categories.join(" · ")}</span></>
          ) : null}
        </p>
      )}
    </div>
  );
}
