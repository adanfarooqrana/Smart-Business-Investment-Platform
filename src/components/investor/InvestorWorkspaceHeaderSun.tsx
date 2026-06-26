import { useMemo } from "react";
import { Sun } from "lucide-react";

type InvestorWorkspaceHeaderSunProps = {
  blink?: boolean;
  investorName?: string;
};

const MONEY_LABELS = ["₨", "PKR", "₨", "💰", "₨", "PKR"];

export function InvestorWorkspaceHeaderSun({ blink, investorName }: InvestorWorkspaceHeaderSunProps) {
  const coins = useMemo(
    () =>
      MONEY_LABELS.map((label, i) => ({
        id: i,
        label,
        left: 8 + i * 7,
        delay: i * 0.45,
        duration: 2.2 + (i % 3) * 0.4,
      })),
    [],
  );

  return (
    <div className="relative mb-4 overflow-visible rounded-2xl border border-amber-200/50 bg-gradient-to-r from-amber-50/80 via-white to-orange-50/60 px-4 py-3 sm:px-5">
      {/* Money rising from sun — full header width */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        {coins.map((c) => (
          <span
            key={c.id}
            className="investor-money-rise absolute text-xs font-black text-amber-600/90"
            style={{
              left: `${c.left}%`,
              bottom: "18%",
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
            }}
          >
            {c.label}
          </span>
        ))}
      </div>

      <div className="relative flex flex-wrap items-center gap-3 sm:gap-4">
        {/* Sun source for money animation */}
        <div className="relative shrink-0">
          <div
            className={`relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-400/40 ${
              blink ? "investor-sun-blink" : ""
            }`}
          >
            <div className="absolute inset-0 rounded-full border border-dashed border-amber-200/60 investor-sun-orbit-slow" />
            <Sun className="relative h-6 w-6 text-amber-950" />
          </div>
          {/* Local rise from sun */}
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="investor-money-rise-from-sun absolute left-1/2 text-[10px] font-black text-amber-500"
              style={{
                animationDelay: `${i * 0.55}s`,
                marginLeft: `${(i - 1.5) * 6}px`,
              }}
            >
              ₨
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-white/80 px-2.5 py-0.5 text-[10px] font-semibold text-amber-900 shadow-sm">
              <Sun className={`h-3 w-3 text-amber-500 ${blink ? "investor-sun-blink" : ""}`} />
              AI Capital Desk · Golden Feed
            </span>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 animate-pulse">
              Live
            </span>
          </div>
          <p className="mt-1 font-display text-sm font-bold text-slate-900 sm:text-base">
            {investorName ? `${investorName}'s` : "Your"} Investment Orbit
          </p>
          <p className="text-[10px] text-slate-500">
            Capital rises from insight · search below to discover matching startups
          </p>
        </div>
      </div>
    </div>
  );
}
