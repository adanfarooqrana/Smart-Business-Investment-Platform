import { useMemo } from "react";
import { Sun, Sparkles } from "lucide-react";

type InvestorDiscoverHeaderProps = {
  investorName?: string;
  blink?: boolean;
  ideaCount?: number;
};

const PAISA_TAGS = ["₨", "PKR", "₨", "PKR", "₨", "PKR", "₨", "PKR"];

export function InvestorDiscoverHeader({ investorName, blink, ideaCount = 0 }: InvestorDiscoverHeaderProps) {
  const paisa = useMemo(
    () =>
      PAISA_TAGS.map((tag, i) => ({
        id: i,
        tag,
        left: 4 + i * 11,
        delay: i * 0.35,
        dur: 2.1 + (i % 4) * 0.3,
      })),
    [],
  );

  return (
    <div className="investor-discover-hero relative mb-5 overflow-hidden rounded-2xl border border-orange-300/50 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 p-5 shadow-xl shadow-orange-500/25 sm:p-6">
      {/* Shine sweep */}
      <div className="pointer-events-none absolute inset-0 investor-discover-shine" />

      {/* Paisa rising */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        {paisa.map((p) => (
          <span
            key={p.id}
            className="investor-paisa-rise absolute font-black text-white/90 drop-shadow-sm"
            style={{
              left: `${p.left}%`,
              bottom: "0%",
              fontSize: p.id % 2 === 0 ? "12px" : "14px",
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
            }}
          >
            {p.tag}
          </span>
        ))}
      </div>

      <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          {/* Sun — paisa source */}
          <div className="relative shrink-0">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="investor-paisa-rise-from-sun absolute left-1/2 font-black text-yellow-100"
                style={{
                  fontSize: "11px",
                  animationDelay: `${i * 0.4}s`,
                  marginLeft: `${(i - 2) * 5}px`,
                }}
              >
                ₨
              </span>
            ))}
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm ring-2 ring-white/40 ${
                blink ? "investor-sun-blink" : ""
              }`}
            >
              <Sun className="h-7 w-7 text-yellow-100 drop-shadow-md" />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                <Sparkles className="h-3 w-3" /> Ideas Feed · Live
              </span>
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-semibold text-yellow-100">
                {ideaCount} startups
              </span>
            </div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Investor Workspace
            </h2>
            <p className="mt-1 max-w-lg text-sm text-orange-50/90">
              Curated deals for{" "}
              <span className="font-bold text-white">{investorName || "Verified Investor"}</span>
              {" "}— paisa flows up as opportunities rise.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex flex-col items-end gap-1 rounded-xl bg-white/15 px-4 py-2.5 backdrop-blur-sm ring-1 ring-white/25">
          <p className="text-[9px] font-bold uppercase tracking-widest text-yellow-100/80">Capital Desk</p>
          <p className="font-display text-lg font-black text-white">PKR Ready</p>
          <p className="text-[9px] text-orange-100">Escrow · 3-Stage Journey</p>
        </div>
      </div>
    </div>
  );
}
