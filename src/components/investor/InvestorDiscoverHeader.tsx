import { useMemo } from "react";

type InvestorDiscoverHeaderProps = {
  investorName?: string;
  blink?: boolean;
  ideaCount?: number;
};

const PAISA_TAGS = ["₨", "PKR", "₨", "PKR", "₨", "PKR", "₨", "PKR"];

export function InvestorDiscoverHeader({ investorName }: InvestorDiscoverHeaderProps) {
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
        <div className="min-w-0">
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
    </div>
  );
}
