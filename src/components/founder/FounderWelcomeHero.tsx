import { TrendingUp, Users, Heart, CheckCircle2 } from "lucide-react";

type Props = {
  founderName: string;
  fundingRaised: number;
  activeInvestors: number;
  totalFollowers: number;
  problemsSolved: number;
};

export function FounderWelcomeHero({
  founderName,
  fundingRaised,
  activeInvestors,
  totalFollowers,
  problemsSolved,
}: Props) {
  const stats = [
    {
      label: "Total Funding Raised",
      value: `Rs. ${fundingRaised.toLocaleString("en-PK")}`,
      icon: TrendingUp,
      glow: "#FFD700",
    },
    {
      label: "Active Investors",
      value: String(activeInvestors),
      icon: Users,
      glow: "#FFA500",
    },
    {
      label: "Total Followers",
      value: String(totalFollowers),
      icon: Heart,
      glow: "#FFD700",
    },
    {
      label: "Problems Solved",
      value: String(problemsSolved),
      icon: CheckCircle2,
      glow: "#FFA500",
    },
  ];

  return (
    <section className="mb-8 overflow-hidden rounded-3xl border border-[#FFD700]/20 p-6 md:p-8"
      style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)" }}
    >
      <div className="mb-6">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#FFD700]/70">
          Founder Command Center
        </p>
        <h1 className="font-display text-3xl font-extrabold text-white md:text-4xl">
          Welcome back,{" "}
          <span
            style={{
              background: "linear-gradient(90deg, #FFD700, #FFA500)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {founderName}
          </span>
          !
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Your unified workspace — community, investors, samples &amp; AI consultant in one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="founder-stat-card rounded-2xl border border-white/10 p-5 transition-all hover:border-[#FFD700]/40"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <div
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: `linear-gradient(135deg, ${s.glow}33, ${s.glow}11)`,
                boxShadow: `0 0 16px ${s.glow}33`,
              }}
            >
              <s.icon className="h-5 w-5" style={{ color: s.glow }} />
            </div>
            <p className="font-display text-2xl font-black text-white">{s.value}</p>
            <p className="mt-1 text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
