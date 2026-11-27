import { useMemo, useState, type CSSProperties } from "react";
import {
  Briefcase,
  Boxes,
  TrendingUp,
  LogIn,
  RotateCw,
  ArrowRight,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import { ecosystemShare, statFill, type PlatformStats } from "@/services/platformStatsService";
import { OrbitLaunchTransition } from "@/components/ui/OrbitLaunchTransition";
import journeyStyles from "./JourneyChooser.css?inline";

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

const ROLE_LABELS: Record<JourneyRole, string> = {
  business: "Business Owner",
  wholesaler: "Wholesaler",
  investor: "Investor",
  entrepreneur: "Entrepreneur",
};

function JourneyAtmosphere() {
  return (
    <div className="journey-atmosphere" aria-hidden="true">
      <div className="journey-sun-atmosphere journey-dawn" />
      <div className="journey-sun-rays-wrap journey-dawn-rays" />
      <span className="journey-ball journey-ball-1" />
      <span className="journey-ball journey-ball-2" />
      <span className="journey-ball journey-ball-3" />
      {Array.from({ length: 12 }, (_, index) => (
        <span
          key={index}
          className="journey-paisa journey-ember"
          style={{
            left: (index * 31 + 4) % 97 + "%",
            animationDelay: -(index * 1.3) + "s",
            animationDuration: (9 + index % 5) + "s",
          }}
        >
          {index % 3 === 0 ? "PKR" : "\u20a8"}
        </span>
      ))}
    </div>
  );
}

function JourneyCompanion({ role }: { role: JourneyRole }) {
  return (
    <svg key={role} className="journey-illustration" viewBox="0 0 360 280" aria-hidden="true">
      <defs>
        <linearGradient id="journey-ink" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#694066" /><stop offset="1" stopColor="#302036" />
        </linearGradient>
        <linearGradient id="journey-gold" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ffe9a8" /><stop offset="1" stopColor="#e67e22" />
        </linearGradient>
        <linearGradient id="journey-skin" x1="0" y1="0" x2=".86" y2="1">
          <stop stopColor="#ffd2a1" /><stop offset=".55" stopColor="#e89b73" /><stop offset="1" stopColor="#b15f4d" />
        </linearGradient>
        <radialGradient id="journey-light">
          <stop stopColor="#fff9db" /><stop offset="1" stopColor="#ffd094" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="174" cy="140" r="126" fill="url(#journey-light)" />
      <circle cx="174" cy="140" r="94" fill="none" stroke="#f2b472" strokeDasharray="2 7" />
      <path d="M36 215H323" stroke="#bd641a" strokeOpacity=".34" />
      <ellipse cx="177" cy="223" rx="119" ry="13" fill="#ae5527" opacity=".10" />

      <g className="journey-person">
        <path d="M101 214v-25c0-32 21-50 47-55h24c31 6 49 25 49 55v25z" fill="url(#journey-ink)" />
        <path d="M144 125v14c0 13 30 15 33 0v-17z" fill="#bc6b50" />
        <g className="journey-face">
          <path d="M126 89c0-24 15-39 37-39 26 0 40 18 39 46l-9 24-65-4z" fill="#332137" />
        <path d="M138 91c15 0 30-7 42-21l10 13v21c0 24-14 38-29 38s-28-14-28-37c-10 2-13-14-5-16z" fill="url(#journey-skin)" />
          <path d="M133 81q16-32 46-24m-44 16q22-18 46-12" fill="none" stroke="#94627a" strokeOpacity=".51" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M145 97q5-3 11-1m12 0q6-3 11 0m-15 7-2 10 4 1m-8 6c3 3 7 3 10 0" fill="none" stroke="#7b4346" strokeWidth="1.5" strokeLinecap="round" />
          <g className="journey-eyes" fill="#422532">
            <ellipse cx="152" cy="103" rx="2.1" ry="2.6" /><ellipse cx="174" cy="103" rx="2.1" ry="2.6" />
          </g>
        </g>
        <path d="M111 212v-20c0-22 10-36 27-43" fill="none" stroke="#ad7490" strokeOpacity=".55" strokeWidth="2" />
      </g>

      {role === "investor" && (
        <>
          <g className="journey-prop">
            <rect x="222" y="46" width="91" height="67" rx="14" fill="#fffbeb" stroke="#efb974" />
            <path d="M238 98h59m-53-4V82m13 12V77m13 17V69m13 25V61" stroke="#e3984a" strokeWidth="3.5" strokeLinecap="round" opacity=".5" />
            <path d="m239 83 13-10 11 3 18-15m-8 0h8v8" fill="none" stroke="#a64d17" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <g className="journey-prop journey-prop-delayed" fill="url(#journey-gold)" stroke="#b86219">
            <circle cx="73" cy="110" r="17" /><circle cx="73" cy="110" r="11" fill="none" />
            <circle cx="279" cy="140" r="11" /><path d="M73 105v10m206 21v8" strokeWidth="2" />
          </g>
          <path className="journey-gesture journey-type" d="M119 178q6 25 37 23h26" fill="none" stroke="url(#journey-skin)" strokeWidth="13" strokeLinecap="round" />
          <path className="journey-gesture journey-type journey-type-right" d="M200 173q-2 11-16 21h-11" fill="none" stroke="url(#journey-skin)" strokeWidth="12" strokeLinecap="round" />
          <rect x="159" y="159" width="83" height="52" rx="7" fill="#ffcc7e" className="journey-glowing-prop" />
          <rect x="164" y="164" width="73" height="42" rx="5" fill="#4e324b" />
          <path d="m185 191 9-9 8 5 13-13" fill="none" stroke="#ffce7b" strokeWidth="2.5" strokeLinecap="round" />
          <path className="journey-laptop-glint" d="M174 170h55m-37 30h15" fill="none" stroke="#ffc979" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M144 209h104v6H144z" fill="#a55f48" />
        </>
      )}

      {role === "wholesaler" && (
        <>
          <g className="journey-prop">
            <circle cx="255" cy="73" r="19" fill="#fff7df" fillOpacity=".85" stroke="#aa591f" strokeWidth="4" />
            <path d="m269 87 16 16" stroke="#aa591f" strokeWidth="7" strokeLinecap="round" />
          </g>
          <g className="journey-prop journey-prop-delayed">
            <rect x="57" y="94" width="51" height="32" rx="9" fill="#fffbeb" stroke="#db9a5a" />
            <path d="M68 110l4 4 6-8m6 2h13m-13 6h10" fill="none" stroke="#92502e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <path d="m183 171 34-17 40 15v42l-38 12-36-12z" fill="#dc9358" stroke="#ad5830" />
          <path d="m183 171 36 13 38-15-40-15z" fill="#f9c88b" stroke="#ad5830" />
          <path d="M219 185v37m-17-59 38 14v14l-8 3v-14" fill="none" stroke="#a65e36" />
          <path d="M251 192h40v23h-40z" fill="#eeb482" stroke="#ad5830" />
          <path d="M266 193h9v13h-9z" fill="#ffe3a5" />
          <path d="M117 175q19 27 66 14" fill="none" stroke="url(#journey-skin)" strokeWidth="13" strokeLinecap="round" />
          <g className="journey-gesture journey-pack">
            <path d="M187 162q12-3 27 9" fill="none" stroke="url(#journey-skin)" strokeWidth="13" strokeLinecap="round" />
            <path d="M210 166l12-5 13 8-11 7z" fill="#fae5ab" stroke="#aa6030" strokeLinejoin="round" />
            <circle cx="221" cy="167" r="3.4" fill="#ab672e" />
          </g>
        </>
      )}

      {role === "entrepreneur" && (
        <>
          <g className="journey-prop">
            <g className="journey-glowing-prop">
              <path d="M245 71a20 20 0 1 1 28 0c-4 4-4 9-4 11h-20c0-2 0-7-4-11z" fill="url(#journey-gold)" stroke="#b36a1e" strokeWidth="2" />
              <path d="M253 86h12m-9 5h6m-3-63v-8m-23 16-6-6m53 6 6-6m-57 23h-8m63 0h8" fill="none" stroke="#bd661b" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          </g>
          <g className="journey-prop journey-prop-delayed">
            <rect x="60" y="56" width="58" height="47" rx="10" fill="#fff5dd" stroke="#cc8c52" />
            <path d="M69 63v34m9-34v34m9-34v34m9-34v34m9-34v34m-39-29h46m-46 7h46m-46 7h46m-46 7h46" stroke="#eac49c" strokeWidth=".8" />
            <path d="M76 90l12-19 14 19zm9-7h7m26-37v10m-5-5h10" fill="none" stroke="#a25025" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <path className="journey-gesture journey-think" d="M206 173q-9 29-25 21l-20-51" fill="none" stroke="url(#journey-skin)" strokeWidth="13" strokeLinecap="round" />
          <path className="journey-bulb-sparks" d="M283 107h14m-7-7v14m-53-4h8m-4-4v8" fill="none" stroke="#dd9028" strokeWidth="2" strokeLinecap="round" />
          <path d="m184 207 43-27 45 14-46 25z" fill="#fff8e8" stroke="#b7764a" />
          <path d="m207 206 14 4 24-16-15-4z" fill="none" stroke="#bc784a" />
          <g className="journey-gesture journey-write">
            <path d="M118 176q14 35 68 24" fill="none" stroke="url(#journey-skin)" strokeWidth="13" strokeLinecap="round" />
            <path d="m181 196 21 10" stroke="#804632" strokeWidth="2.8" strokeLinecap="round" />
          </g>
        </>
      )}

      {role === "business" && (
        <>
          <g className="journey-prop">
            <rect x="222" y="60" width="69" height="56" rx="13" fill="#fff8e3" stroke="#d99b61" />
            <path d="m234 78 4 4 7-8m-11 19 4 4 7-8m8-10h24m-24 15h17" fill="none" stroke="#a3562a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <path className="journey-gesture journey-write" d="M118 175q11 28 44 23m38-21-10 21" fill="none" stroke="url(#journey-skin)" strokeWidth="13" strokeLinecap="round" />
          <rect x="156" y="168" width="80" height="48" rx="8" fill="#f6bd7e" stroke="#a25835" />
          <path d="M185 168v-5a4 4 0 0 1 4-4h14a4 4 0 0 1 4 4v5m-51 21h80m-45-3h11v7h-11z" fill="none" stroke="#a25835" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}

type JourneyChooserProps = {
  onSelect: (role: JourneyRole) => void;
  onLogin: () => void;
};

export function JourneyChooser({ onSelect, onLogin }: JourneyChooserProps) {
  const platformStats = usePlatformStats();
  const roles = useMemo(() => buildRolesFromStats(platformStats), [platformStats]);
  const [rotationSteps, setRotationSteps] = useState(0);
  const activeIndex = rotationSteps % roles.length;
  const [launching, setLaunching] = useState(false);
  const active = roles[activeIndex];

  const launch = () => {
    if (launching) return;
    setLaunching(true);
    window.setTimeout(() => onSelect(active.id), 1800);
  };

  return (
    <section className="journey-chooser min-h-screen w-full bg-gradient-to-br from-[#FFF7ED] via-[#FFEDD5] to-[#FED7AA]">
      <style>{journeyStyles}</style>
      <JourneyAtmosphere />
      {launching && <OrbitLaunchTransition accent={active.color} label={active.label} icon={active.icon} />}
      <div className={launching ? "journey-layout journey-content-exit pointer-events-none" : "journey-layout"}>
        <div className="journey-heading">
          <h1>Choose your journey</h1>
          <p>Pick a role to preview your workspace.</p>
        </div>

        <div className="journey-stage">
          <div className="journey-selector">
            <div className="journey-dial">
              <div className="journey-ring" aria-hidden="true">
                <span className="journey-orb-motion"><span className="journey-orb" /></span>
              </div>

              <div className="journey-hub" aria-live="polite">
                <span className="journey-hub-icon"><active.icon aria-hidden="true" /></span>
                <h2>{ROLE_LABELS[active.id]}</h2>
                <button type="button" className="journey-begin" onClick={launch} disabled={launching}>
                  {launching ? <><Loader2 aria-hidden="true" className="animate-spin" /> Opening...</> : <>Begin <ArrowRight aria-hidden="true" /></>}
                </button>
              </div>

              {roles.map((role, index) => (
                <button
                  key={role.id}
                  type="button"
                  className="journey-role-pill"
                  data-role={role.id}
                  aria-pressed={index === activeIndex}
                  style={{ "--journey-angle": (index - rotationSteps) * 360 / roles.length + "deg" } as CSSProperties}
                  onClick={() => setRotationSteps((steps) => steps + (index - steps % roles.length + roles.length) % roles.length)}
                  disabled={launching}
                >
                  <role.icon aria-hidden="true" />
                  <span>{ROLE_LABELS[role.id]}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="journey-rotate"
              onClick={() => setRotationSteps((steps) => steps + 1)}
              disabled={launching}
            >
              <RotateCw aria-hidden="true" /> Rotate
            </button>
          </div>

          <div className="journey-preview" data-preview-role={active.id}>
            <JourneyCompanion role={active.id} />
            <div className="journey-preview-copy">
              <p>{active.tagline}</p>
              <ul>{active.perks.map((perk) => <li key={perk}>{perk}</li>)}</ul>
            </div>
          </div>
        </div>

        <button type="button" className="journey-signin" onClick={onLogin} disabled={launching}>
          <LogIn aria-hidden="true" /> Already registered? <strong>Sign in</strong>
        </button>
      </div>
    </section>
  );
}
