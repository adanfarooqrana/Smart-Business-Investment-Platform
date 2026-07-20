import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Boxes,
  TrendingUp,
  Sparkles,
  LogIn,
  RotateCw,
  ArrowRight,
  Star,
  Package,
  Coins,
  Lightbulb,
  BarChart3,
  Users,
  Loader2,
} from "lucide-react";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import { ecosystemShare, statFill, type PlatformStats } from "@/services/platformStatsService";
import { OrbitLaunchTransition } from "@/components/ui/OrbitLaunchTransition";
export type JourneyRole = "business" | "wholesaler" | "investor" | "entrepreneur";

type RoleConfig = {
  id: JourneyRole;
  label: string;
  tagline: string;
  blurb: string;
  perks: string[];
  icon: typeof Briefcase;
  ring: string;
  glow: string;
  chip: string;
  btn: string;
  color: string;
  pieColor: string;
  ecosystemPct: number;
  stats: { label: string; value: number; fill: number }[];
};

type RoleBase = Omit<RoleConfig, "ecosystemPct" | "stats">;

const ROLE_BASE: RoleBase[] = [  {
    id: "business",
    label: "Business Owner",
    tagline: "Build score & investor-ready dashboard",
    blurb: "Register your venture, grow a verified reputation score, and unlock a funding-ready dashboard.",
    perks: ["Reputation scoring", "AI growth desk", "Investor visibility"],
    icon: Briefcase,
    ring: "ring-amber-400 border-amber-400",
    glow: "from-amber-400 via-orange-400 to-amber-500 shadow-amber-500/40",
    chip: "bg-amber-100 text-amber-700",
    btn: "from-amber-500 to-orange-500 shadow-amber-500/30",
    color: "#f59e0b",
    pieColor: "#fbbf24",
  },  {
    id: "wholesaler",
    label: "Wholesaler",
    tagline: "Supply products & win bulk orders",
    blurb: "List your catalog, receive packaging & supply requests, and fulfil bulk orders from verified businesses.",
    perks: ["Product catalog", "Bulk order leads", "Verified supplier badge"],
    icon: Boxes,
    ring: "ring-orange-400 border-orange-400",
    glow: "from-orange-400 via-amber-500 to-yellow-400 shadow-orange-500/40",
    chip: "bg-orange-100 text-orange-700",
    btn: "from-orange-500 to-amber-500 shadow-orange-500/30",
    color: "#f97316",
    pieColor: "#fb923c",
  },  {
    id: "investor",
    label: "Investor",
    tagline: "Fund verified startups & track ROI",
    blurb: "Discover vetted startup ideas, deploy capital via escrow, and track returns from your AI capital desk.",
    perks: ["Vetted deal flow", "Escrow protection", "ROI tracking"],
    icon: TrendingUp,
    ring: "ring-emerald-400 border-emerald-400",
    glow: "from-emerald-400 via-teal-400 to-emerald-500 shadow-emerald-500/40",
    chip: "bg-emerald-100 text-emerald-700",
    btn: "from-emerald-500 to-teal-500 shadow-emerald-500/30",
    color: "#10b981",
    pieColor: "#34d399",
  },  {
    id: "entrepreneur",
    label: "Entrepreneur / Founder",
    tagline: "Pitch ideas & attract investor capital",
    blurb: "Register your founder profile, upload CNIC verification, and showcase startup ideas to verified investors on the platform.",
    perks: ["Investor visibility", "Sample requests", "Founder messaging"],
    icon: Lightbulb,
    ring: "ring-yellow-400 border-yellow-400",
    glow: "from-yellow-400 via-[#FFA500] to-[#FFD700] shadow-[#FFA500]/40",
    chip: "bg-[#FFF8E1] text-[#FFA500]",
    btn: "from-[#FFA500] to-[#FFD700] shadow-[#FFA500]/30",
    color: "#FFA500",
    pieColor: "#FFD700",
  },
];

function fundingReadyCount(stats: PlatformStats): number {
  if (stats.avgBusinessScore >= 80 && stats.businessOwners > 0) {
    return Math.max(1, Math.round(stats.businessOwners * 0.35));
  }
  return Math.max(0, Math.round(stats.businessOwners * 0.2));
}

function buildRolesFromStats(stats: PlatformStats): RoleConfig[] {
  const total = stats.totalMembers || 1;
  const fundingM = Math.round(stats.fundingDeployedPkr / 1_000_000);

  const statsByRole: Record<JourneyRole, RoleConfig["stats"]> = {
    business: [
      { label: "Registered businesses", value: stats.businessOwners, fill: statFill(stats.businessOwners, 200) },
      { label: "Avg reputation score", value: stats.avgBusinessScore, fill: statFill(stats.avgBusinessScore, 100) },
      { label: "Community post votes", value: stats.totalVotes, fill: statFill(stats.totalVotes, 500) },
      { label: "Funding-ready ventures", value: fundingReadyCount(stats), fill: statFill(fundingReadyCount(stats), 100) },
    ],
    wholesaler: [
      { label: "Active wholesalers", value: stats.wholesalers, fill: statFill(stats.wholesalers, 150) },
      { label: "Sample / bulk orders", value: stats.sampleOrders, fill: statFill(stats.sampleOrders, 200) },
      { label: "Packaging ideas shared", value: stats.packagingPosts, fill: statFill(stats.packagingPosts, 100) },
      { label: "Community engagement", value: stats.communityPosts, fill: statFill(stats.communityPosts, 300) },
    ],
    investor: [
      { label: "Verified investors", value: stats.investors, fill: statFill(stats.investors, 100) },
      { label: "Capital deployed (PKR M)", value: fundingM, fill: statFill(fundingM, 50) },
      { label: "Startup ideas reviewed", value: stats.pitchedIdeas, fill: statFill(stats.pitchedIdeas, 200) },
      { label: "Platform members", value: stats.totalMembers, fill: statFill(stats.totalMembers, 500) },
    ],
    entrepreneur: [
      { label: "Founders on platform", value: stats.entrepreneurs, fill: statFill(stats.entrepreneurs, 200) },
      { label: "Ideas pitched live", value: stats.pitchedIdeas, fill: statFill(stats.pitchedIdeas, 200) },
      { label: "Sample requests sent", value: stats.sampleOrders, fill: statFill(stats.sampleOrders, 200) },
      { label: "Investor matches", value: stats.investors, fill: statFill(stats.investors, 100) },
    ],
  };

  const shareByRole: Record<JourneyRole, number> = {
    business: ecosystemShare(stats.businessOwners, total),
    wholesaler: ecosystemShare(stats.wholesalers, total),
    investor: ecosystemShare(stats.investors, total),
    entrepreneur: ecosystemShare(stats.entrepreneurs, total),
  };

  return ROLE_BASE.map((base) => ({
    ...base,
    ecosystemPct: shareByRole[base.id],
    stats: statsByRole[base.id],
  }));
}
const PERK_ICONS = [Star, Package, Coins];

function useTypewriter(text: string, speed = 75) {
  const [out, setOut] = useState("");
  useEffect(() => {
    setOut("");
    let i = 0;
    const t = window.setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) window.clearInterval(t);
    }, speed);
    return () => window.clearInterval(t);
  }, [text, speed]);
  return out;
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function pieSlice(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polar(cx, cy, r, endDeg);
  const end = polar(cx, cy, r, startDeg);
  const large = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} Z`;
}

function EcosystemPieChart({ activeIndex, roles }: { activeIndex: number; roles: RoleConfig[] }) {
  const cx = 100;
  const cy = 100;
  const r = 78;
  const sliceDeg = 360 / roles.length;
  const rotation = -activeIndex * sliceDeg;
  const active = roles[activeIndex];
  return (
    <div className="relative mx-auto w-full max-w-[240px]">
      <div
        className="journey-pie-glow pointer-events-none absolute inset-0 rounded-full blur-2xl transition-all duration-700"
        style={{ background: `radial-gradient(circle, ${active.color}55 0%, transparent 70%)` }}
      />
      <svg viewBox="0 0 200 200" className="relative w-full drop-shadow-lg">
        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "100px 100px",
            transition: "transform 0.85s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {roles.map((role, i) => {
            const start = i * sliceDeg;
            const end = (i + 1) * sliceDeg;
            const isActive = i === activeIndex;
            return (
              <path
                key={role.id}
                d={pieSlice(cx, cy, r, start, end)}
                fill={role.pieColor}
                opacity={isActive ? 1 : 0.55}
                className={isActive ? "journey-pie-slice-active" : ""}
                style={
                  isActive
                    ? { filter: `drop-shadow(0 0 12px ${role.color}) drop-shadow(0 0 24px ${role.color}88)` }
                    : undefined
                }
              />
            );
          })}
        </g>
        <circle cx={cx} cy={cy} r={42} fill="white" fillOpacity={0.95} />
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-slate-900 text-[13px] font-bold" style={{ fontSize: 13 }}>
          {active.ecosystemPct}%
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 9 }}>
          ecosystem share
        </text>
        <polygon points="100,14 94,28 106,28" fill={active.color} className="journey-pie-pointer" />
      </svg>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {roles.map((role, i) => (          <span
            key={role.id}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold transition-all duration-500 ${
              i === activeIndex ? "scale-105 shadow-md" : "opacity-60"
            }`}
            style={{
              background: i === activeIndex ? `${role.color}22` : "#f1f5f9",
              color: i === activeIndex ? role.color : "#64748b",
              boxShadow: i === activeIndex ? `0 0 14px ${role.color}66` : undefined,
            }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: role.pieColor }} />
            {role.label.split(" ")[0]}
          </span>
        ))}
      </div>
    </div>
  );
}

function RoleAnalyticsPanel({
  role,
  animateKey,
  roles,
}: {
  role: RoleConfig;
  animateKey: number;
  roles: RoleConfig[];
}) {  return (
    <div
      key={`${role.id}-${animateKey}`}
      className="journey-analytics-panel rounded-3xl border border-white/60 bg-white/80 p-5 shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-500"
    >
      <div className="mb-4 flex items-center gap-2">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${role.color}, ${role.pieColor})` }}
        >
          <BarChart3 className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Live platform data</p>          <h3 className="font-display text-sm font-bold text-slate-900">{role.label} metrics</h3>
        </div>
      </div>

      <EcosystemPieChart activeIndex={roles.findIndex((r) => r.id === role.id)} roles={roles} />
      <div className="mt-5 space-y-3">
        {role.stats.map((stat, idx) => (
          <div key={stat.label}>
            <div className="mb-1 flex items-center justify-between text-[10px]">
              <span className="font-medium text-slate-600">{stat.label}</span>
              <span className="font-bold tabular-nums text-slate-900">{stat.value.toLocaleString()}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="journey-bar-fill h-full rounded-full"
                style={{
                  ["--bar-fill" as string]: `${stat.fill}%`,
                  ["--bar-color" as string]: role.color,
                  animationDelay: `${idx * 0.12}s`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-[10px] text-slate-600">
        <Users className="h-3.5 w-3.5 shrink-0" style={{ color: role.color }} />
        <span>
          <strong style={{ color: role.color }}>{role.ecosystemPct}%</strong> of SmartBiz ecosystem — synced from Firebase        </span>
      </div>
    </div>
  );
}

function TrendSparkPanel({ role, animateKey }: { role: RoleConfig; animateKey: number }) {
  const points = useMemo(() => {
    const base = role.stats.map((s) => s.fill);
    return [...base, base[0] * 0.95, base[1] * 1.02];
  }, [role]);

  const pathD = points
    .map((v, i) => {
      const x = 10 + (i / (points.length - 1)) * 180;
      const y = 90 - (v / 100) * 70;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div
      key={`trend-${role.id}-${animateKey}`}
      className="w-full rounded-3xl border border-white/60 bg-white/75 p-5 shadow-xl backdrop-blur-xl animate-in fade-in duration-500"
    >
      <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Growth trajectory
      </p>
      <svg viewBox="0 0 200 100" className="w-full">
        <defs>
          <linearGradient id={`trend-grad-${role.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={role.color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={role.color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${pathD} L 190 100 L 10 100 Z`} fill={`url(#trend-grad-${role.id})`} className="journey-trend-area" />
        <path
          d={pathD}
          fill="none"
          stroke={role.color}
          strokeWidth="2.5"
          strokeLinecap="round"
          className="journey-trend-line"
        />
      </svg>
      <p className="mt-4 text-center text-xs leading-relaxed text-slate-600">{role.blurb}</p>
      <div className="mt-3 flex justify-center gap-3">
        {role.perks.map((p) => (
          <span key={p} className="text-[9px] font-semibold" style={{ color: role.color }}>
            • {p}
          </span>
        ))}
      </div>
    </div>
  );
}

const RAY_COUNT = 16;

function SunlightBackdrop({
  accent,
  gold,
  launching,
}: {
  accent: string;
  gold: string;
  launching: boolean;
}) {
  return (
    <div className={`journey-sun-backdrop pointer-events-none absolute inset-0 -z-[25] overflow-hidden ${launching ? "journey-sun-backdrop-soft" : ""}`}>
      <div
        className="journey-sun-atmosphere absolute inset-0 transition-all duration-[1.2s] ease-out"
        style={{
          background: `
            radial-gradient(ellipse 90% 70% at 50% -10%, ${gold}28 0%, transparent 52%),
            radial-gradient(ellipse 60% 50% at 50% 20%, ${accent}18 0%, transparent 55%),
            radial-gradient(ellipse 100% 80% at 50% 100%, ${accent}08 0%, transparent 50%)
          `,
        }}
      />
      <div className="journey-sun-position absolute left-1/2 top-[8%] -translate-x-1/2">
        <div
          className={`journey-sun-rays-wrap ${launching ? "journey-sun-rays-soft" : ""}`}
          style={{ ["--sun-accent" as string]: accent, ["--sun-gold" as string]: gold }}
        >
          {Array.from({ length: RAY_COUNT }).map((_, i) => (
            <span
              key={i}
              className="journey-sun-ray"
              style={{ transform: `rotate(${i * (360 / RAY_COUNT)}deg)` }}
            />
          ))}
        </div>
        <div
          className={`journey-sun-disc ${launching ? "journey-sun-disc-soft" : ""}`}
          style={{
            background: `radial-gradient(circle, #fff 0%, ${gold} 35%, ${accent} 70%, transparent 100%)`,
            boxShadow: `0 0 30px ${gold}44, 0 0 60px ${accent}33`,
          }}
        />
      </div>
      <div className="journey-sun-shimmer absolute inset-0" />
    </div>
  );
}

type JourneyChooserProps = {
  onSelect: (role: JourneyRole) => void;
  onLogin: () => void;
};

export function JourneyChooser({ onSelect, onLogin }: JourneyChooserProps) {
  const platformStats = usePlatformStats();
  const ROLES = useMemo(() => buildRolesFromStats(platformStats), [platformStats]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [turns, setTurns] = useState(0);
  const [launching, setLaunching] = useState<JourneyRole | null>(null);
  const [animTick, setAnimTick] = useState(0);

  const typed = useTypewriter("Choose your journey", 70);
  const active = ROLES[activeIndex];

  const slotOf = (i: number) => (i - activeIndex + ROLES.length) % ROLES.length;

  const SLOT_ANGLE = ROLES.map((_, i) => -90 + (360 / ROLES.length) * i);
  const RADIUS = 150;

  const rotateClockwise = () => {
    setActiveIndex((p) => (p + 1) % ROLES.length);
    setTurns((t) => t + 360 / ROLES.length);
    setAnimTick((n) => n + 1);
  };

  const focusRole = (i: number) => {
    const steps = (i - activeIndex + ROLES.length) % ROLES.length;
    setActiveIndex(i);
    setTurns((t) => t + steps * (360 / ROLES.length));
    setAnimTick((n) => n + 1);
  };

  const launch = (role: JourneyRole) => {
    if (launching) return;
    setLaunching(role);
    window.setTimeout(() => onSelect(role), 1800);
  };

  const launchRole = launching ? ROLES.find((r) => r.id === launching) : null;

  const moneyTokens = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        left: `${4 + (i * 5.5) % 92}%`,
        delay: `${(i * 0.35) % 5}s`,
        dur: `${2.2 + (i % 4) * 0.45}s`,
        size: i % 3 === 0 ? "15px" : i % 3 === 1 ? "11px" : "18px",
        glyph: i % 2 === 0 ? "₨" : "PKR",
      })),
    [],
  );

  const particles = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => ({
        left: `${(i * 17) % 100}%`,
        top: `${(i * 23) % 100}%`,
        delay: `${(i * 0.2) % 4}s`,
        size: 3 + (i % 4),
      })),
    [],
  );

  return (
    <div className="relative mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-7xl flex-col items-center justify-center overflow-hidden px-4 py-4 md:py-6">      <SunlightBackdrop accent={active.color} gold={active.pieColor} launching={!!launching} />

      {launchRole && (
        <OrbitLaunchTransition accent={launchRole.color} label={launchRole.label} icon={launchRole.icon} />
      )}

      <div className={`relative z-10 flex w-full flex-col items-center transition-all duration-700 ${launching ? "journey-content-exit pointer-events-none" : ""}`}>
      {/* Professional layered background */}
      <div className="pointer-events-none absolute inset-0 -z-30">
        <div className="journey-aurora absolute inset-0" />
        <div className="journey-mesh absolute inset-0" />
        <div className="journey-grid-glow absolute inset-0" />
      </div>

      <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
        <div className="journey-etch absolute inset-0" />
        {particles.map((p, i) => (
          <span
            key={i}
            className="journey-particle absolute rounded-full bg-amber-400/30"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
            }}
          />
        ))}
        <span className="journey-ball journey-ball-1" aria-hidden />
        <span className="journey-ball journey-ball-2" aria-hidden />
        <span className="journey-ball journey-ball-3" aria-hidden />
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {moneyTokens.map((m, i) => (
          <span
            key={i}
            className="journey-paisa absolute font-black text-amber-400/35"
            style={{
              left: m.left,
              bottom: "-6%",
              fontSize: m.size,
              animationDelay: m.delay,
              animationDuration: m.dur,
            }}
          >
            {m.glyph}
          </span>
        ))}
      </div>

      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-all duration-700"
        style={{
          background: `radial-gradient(circle, ${active.color}28 0%, transparent 65%)`,
        }}
      />

      {/* Heading */}
      <div className="relative mb-6 text-center lg:mb-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-50/70 px-4 py-1.5 text-xs font-semibold text-amber-700 shadow-inner backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          <span>Interactive Workspace Onboarding</span>
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight md:text-6xl">
          <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">
            {typed}
          </span>
          <span className="journey-caret ml-1 inline-block w-[3px] translate-y-1 self-stretch bg-orange-500" aria-hidden>
            &nbsp;
          </span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Spin the wheel and pick your role — your dashboard adapts to it.
        </p>
      </div>

      {/* Centered selector wheel */}
      <div className="flex w-full justify-center items-center py-4">
        {/* Clockwise orbit selector */}
        <div className="relative flex h-[420px] w-full max-w-[440px] items-center justify-center">
          <div
            className="absolute h-[330px] w-[330px] rounded-full border-2 border-dashed transition-colors duration-700"
            style={{
              borderColor: `${active.color}66`,
              transform: `rotate(${turns}deg)`,
              transition: "transform 0.7s cubic-bezier(0.22,1,0.36,1), border-color 0.7s",
              boxShadow: `0 0 40px ${active.color}22`,
            }}
          />

          <div
            className="relative z-20 flex h-[200px] w-[200px] flex-col items-center justify-center rounded-full border bg-white/90 p-5 text-center shadow-2xl backdrop-blur-md transition-shadow duration-700"
            style={{
              borderColor: `${active.color}44`,
              boxShadow: `0 20px 50px ${active.color}33, 0 0 0 1px ${active.color}22`,
            }}
          >
            <div
              className={`mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-all duration-500 ${active.glow} ${
                launching ? "scale-125" : "journey-hub-pulse"
              }`}
            >
              <active.icon className="h-7 w-7" />
            </div>
            <h3 className="font-display text-base font-bold leading-tight text-slate-900">{active.label}</h3>
            <p className="mt-1 text-[10px] leading-snug text-slate-500">{active.tagline}</p>
            <button
              type="button"
              disabled={!!launching}
              onClick={() => launch(active.id)}
              className={`mt-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r px-4 py-1.5 text-[11px] font-bold text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-70 ${active.btn}`}
            >
              {launching === active.id ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Opening...
                </>
              ) : (
                <>
                  Begin <ArrowRight className="h-3 w-3" />
                </>
              )}
            </button>
          </div>

          {ROLES.map((role, i) => {
            const slot = slotOf(i);
            const angle = (SLOT_ANGLE[slot] * Math.PI) / 180;
            const x = Math.cos(angle) * RADIUS;
            const y = Math.sin(angle) * RADIUS;
            const isActive = i === activeIndex;
            const Icon = role.icon;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => (isActive ? launch(role.id) : focusRole(i))}
                className="absolute left-1/2 top-1/2 z-10 flex flex-col items-center"
                style={{
                  transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                  transition: "transform 0.7s cubic-bezier(0.22,1,0.36,1)",
                }}
              >
                <div
                  className={`flex items-center justify-center rounded-2xl border-2 bg-white shadow-lg transition-all duration-500 ${
                    isActive
                      ? `h-16 w-16 ring-4 ${role.ring} ${launching === role.id ? "journey-launch" : ""}`
                      : "h-12 w-12 border-slate-200 opacity-70 hover:opacity-100"
                  }`}
                  style={
                    isActive
                      ? { boxShadow: `0 0 24px ${role.color}66, 0 8px 24px rgba(0,0,0,0.08)` }
                      : undefined
                  }
                >
                  <Icon className={`${isActive ? "h-8 w-8" : "h-6 w-6"} ${isActive ? "text-slate-900" : "text-slate-400"}`} />
                </div>
                <span
                  className={`mt-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold transition-all ${
                    isActive ? role.chip : "text-slate-400"
                  }`}
                >
                  {role.label}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={rotateClockwise}
            className="absolute -bottom-2 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full border bg-white px-4 py-2 text-xs font-bold shadow-md transition-all hover:shadow-lg"
            style={{ borderColor: `${active.color}55`, color: active.color }}
          >
            <RotateCw className="h-3.5 w-3.5" /> Rotate
          </button>
        </div>
      </div>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onLogin}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/60 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-white hover:text-foreground"
        >
          <LogIn className="h-3.5 w-3.5" />
          Already registered? <span className="font-semibold text-amber-600 underline">Sign in</span>
        </button>
      </div>
      </div>
    </div>
  );
}
