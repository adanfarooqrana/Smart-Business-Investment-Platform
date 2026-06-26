import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import { statFill, type PlatformStats } from "@/services/platformStatsService";

type OrbitNode = {
  id: string;
  label: string;
  sublabel: string;
  value: number;
  color: string;
  glow: string;
  angle: number;
};

function buildNodes(stats: PlatformStats): OrbitNode[] {
  return [
    {
      id: "investors",
      label: "Verified Investors",
      sublabel: "Capital partners",
      value: stats.investors,
      color: "#10b981",
      glow: "rgba(16, 185, 129, 0.55)",
      angle: -90,
    },
    {
      id: "wholesalers",
      label: "Wholesalers",
      sublabel: "Supply network",
      value: stats.wholesalers,
      color: "#f97316",
      glow: "rgba(249, 115, 22, 0.55)",
      angle: -30,
    },
    {
      id: "success",
      label: "Success is Waiting",
      sublabel: "Founder pipeline",
      value: stats.entrepreneurs,
      color: "#eab308",
      glow: "rgba(234, 179, 8, 0.55)",
      angle: 30,
    },
    {
      id: "quality",
      label: "Invest in Quality",
      sublabel: "Vetted ideas",
      value: stats.pitchedIdeas,
      color: "#6366f1",
      glow: "rgba(99, 102, 241, 0.55)",
      angle: 90,
    },
    {
      id: "community",
      label: "Community Momentum",
      sublabel: "Live strategies",
      value: stats.communityPosts,
      color: "#06b6d4",
      glow: "rgba(6, 182, 212, 0.55)",
      angle: 150,
    },
    {
      id: "business",
      label: "Verified Businesses",
      sublabel: "Trust score growth",
      value: stats.businessOwners,
      color: "#f59e0b",
      glow: "rgba(245, 158, 11, 0.55)",
      angle: 210,
    },
  ];
}

function buildGrowthPath(stats: PlatformStats): string {
  const pts = [
    statFill(stats.businessOwners, 200),
    statFill(stats.wholesalers, 150),
    statFill(stats.investors, 100),
    statFill(stats.entrepreneurs, 200),
    statFill(stats.pitchedIdeas, 200),
    statFill(stats.communityPosts, 300),
    statFill(stats.totalMembers, 500),
  ];
  return pts
    .map((v, i) => {
      const x = 16 + (i / (pts.length - 1)) * 288;
      const y = 88 - (v / 100) * 64;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function DonutSegments({ stats }: { stats: PlatformStats }) {
  const cx = 100;
  const cy = 100;
  const r = 72;
  const stroke = 14;
  const circumference = 2 * Math.PI * r;

  const slices = useMemo(() => {
    const raw = [
      { value: stats.investors, color: "#10b981" },
      { value: stats.wholesalers, color: "#f97316" },
      { value: stats.entrepreneurs, color: "#eab308" },
      { value: stats.businessOwners, color: "#f59e0b" },
    ];
    const total = raw.reduce((s, x) => s + x.value, 0) || 1;
    let offset = 0;
    return raw.map((slice) => {
      const len = (slice.value / total) * circumference;
      const seg = { ...slice, dasharray: `${len} ${circumference - len}`, offset: -offset };
      offset += len;
      return seg;
    });
  }, [stats, circumference]);

  return (
    <svg viewBox="0 0 200 200" className="hero-constellation-donut h-full w-full">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      {slices.map((s, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={s.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={s.dasharray}
          strokeDashoffset={s.offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          className="hero-constellation-segment"
          style={{ animationDelay: `${i * 0.15}s`, filter: `drop-shadow(0 0 6px ${s.color}88)` }}
        />
      ))}
      <circle cx={cx} cy={cy} r={48} fill="rgba(15,23,42,0.85)" />
    </svg>
  );
}

export function HeroGrowthConstellation() {
  const stats = usePlatformStats();
  const nodes = useMemo(() => buildNodes(stats), [stats]);
  const growthPath = useMemo(() => buildGrowthPath(stats), [stats]);
  const growthPct =
    stats.totalMembers > 0
      ? Math.min(999, Math.round((stats.communityPosts / stats.totalMembers) * 100))
      : 0;

  const tickerItems = nodes.map((n) => `${n.label} · ${n.value.toLocaleString()}`);

  return (
    <div className="hero-constellation relative mx-auto w-full max-w-[440px]">
      <div className="hero-constellation-card relative overflow-hidden rounded-[1.75rem] border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.45)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:20px_20px] opacity-40" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

        {/* Header */}
        <div className="relative z-10 mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Ecosystem</p>
              <p className="text-xs font-bold text-white">Growth Constellation</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        </div>

        {/* Orbit + center chart */}
        <div className="relative z-10 mx-auto mb-4 h-[300px] w-full max-w-[320px]">
          <div className="hero-constellation-orbit-ring pointer-events-none absolute inset-0">
            {nodes.map((node) => (
              <div
                key={node.id}
                className="hero-constellation-orbit-item absolute left-1/2 top-1/2"
                style={{ ["--orbit-angle" as string]: `${node.angle}deg`, ["--node-color" as string]: node.color }}
              >
                <div
                  className="hero-constellation-label-wrap relative flex items-center"
                  style={{ ["--node-glow" as string]: node.glow }}
                >
                  <span
                    className="hero-constellation-spoke absolute right-full top-1/2 mr-1 h-px w-14 -translate-y-1/2"
                    style={{ background: `linear-gradient(270deg, ${node.color}aa, transparent)` }}
                  />
                  <div
                    className="hero-constellation-label rounded-full border px-2.5 py-1 shadow-lg backdrop-blur-md"
                    style={{
                      borderColor: `${node.color}66`,
                      background: `linear-gradient(135deg, ${node.color}22, rgba(15,23,42,0.92))`,
                      boxShadow: `0 0 18px ${node.glow}, 0 4px 16px rgba(0,0,0,0.25)`,
                    }}
                  >
                    <span className="block text-[9px] font-bold leading-tight" style={{ color: node.color }}>
                      {node.label}
                    </span>
                    <span className="block text-[8px] font-semibold text-slate-400">{node.value.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="absolute left-1/2 top-1/2 z-10 h-[168px] w-[168px] -translate-x-1/2 -translate-y-1/2">
            <DonutSegments stats={stats} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black tabular-nums text-white">{stats.totalMembers.toLocaleString()}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Members</span>
              <span className="mt-1 text-[10px] font-bold text-emerald-400">+{growthPct}% momentum</span>
            </div>
          </div>
        </div>

        {/* Flowing growth line — DB-driven path */}
        <div className="relative z-10 mb-3 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 px-2 py-2">
          <svg viewBox="0 0 320 96" className="h-20 w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="hero-flow-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.1" />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.15" />
              </linearGradient>
            </defs>
            <path d={`${growthPath} L 304 96 L 16 96 Z`} fill="url(#hero-flow-grad)" opacity="0.35" />
            <path
              d={growthPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="hero-constellation-flow-line"
            />
            <path
              d={growthPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeOpacity="0.55"
              className="hero-constellation-flow-line-alt"
            />
          </svg>
        </div>

        {/* Scrolling ticker — last loops to start */}
        <div className="hero-constellation-ticker relative z-10 overflow-hidden rounded-xl border border-white/10 bg-white/5 py-2">
          <div className="hero-constellation-ticker-track flex gap-8 whitespace-nowrap px-3">
            {[...tickerItems, ...tickerItems].map((item, i) => (
              <span key={`${item}-${i}`} className="inline-flex items-center gap-2 text-[10px] font-semibold text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Live metric strip */}
        <div className="relative z-10 mt-3 grid grid-cols-3 gap-2">
          {[
            { label: "Investors", value: stats.investors, color: "#10b981" },
            { label: "Ideas Live", value: stats.pitchedIdeas, color: "#6366f1" },
            { label: "Avg Score", value: stats.avgBusinessScore, color: "#f59e0b" },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-center"
              style={{ boxShadow: `inset 0 0 12px ${m.color}12` }}
            >
              <p className="text-sm font-black tabular-nums text-white">{m.value.toLocaleString()}</p>
              <p className="text-[8px] font-bold uppercase tracking-wide" style={{ color: m.color }}>
                {m.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
