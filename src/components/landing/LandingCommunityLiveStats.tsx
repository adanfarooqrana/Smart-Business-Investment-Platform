import { useEffect, useMemo, useState } from "react";
import { Activity, TrendingUp, Users, Zap } from "lucide-react";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import { statFill } from "@/services/platformStatsService";
import {
  subscribeToUserDirectory,
  type DirectoryUser,
} from "@/services/founderCommunityService";
import { CountUp } from "@/components/landing/landingUtils";

const ROLE_LABEL: Record<string, string> = {
  entrepreneur: "Founder",
  business_owner: "Business",
  business: "Business",
  investor: "Investor",
  wholesaler: "Wholesaler",
  consultant: "Wholesaler",
};

const ROLE_COLOR: Record<string, string> = {
  entrepreneur: "#eab308",
  business_owner: "#10b981",
  business: "#10b981",
  investor: "#06b6d4",
  wholesaler: "#f97316",
  consultant: "#f97316",
};

function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role.replace(/_/g, " ");
}

function roleColor(role: string): string {
  return ROLE_COLOR[role] ?? "#6366f1";
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function buildWeeklySignups(users: DirectoryUser[]): { label: string; count: number }[] {
  const days: { label: string; count: number; start: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      count: 0,
      start: d.getTime(),
    });
  }

  for (const u of users) {
    const ts = u.createdAt ?? 0;
    if (!ts) continue;
    for (let i = 0; i < days.length; i++) {
      const end = i < days.length - 1 ? days[i + 1].start : Date.now() + 86_400_000;
      if (ts >= days[i].start && ts < end) {
        days[i].count += 1;
        break;
      }
    }
  }

  return days.map(({ label, count }) => ({ label, count }));
}

function GlowPanel({
  title,
  icon,
  children,
  accent = "orange",
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  accent?: "orange" | "emerald" | "cyan";
}) {
  const glow =
    accent === "emerald"
      ? "from-emerald-400/20 via-emerald-50/40 to-white shadow-emerald-200/40"
      : accent === "cyan"
        ? "from-cyan-400/20 via-cyan-50/40 to-white shadow-cyan-200/40"
        : "from-orange-400/20 via-orange-50/40 to-white shadow-orange-200/40";

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-orange-200/60 bg-gradient-to-br p-5 shadow-lg ${glow}`}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-400/15 blur-2xl" />
      <div className="relative z-10 mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-orange-600 shadow-sm">
          {icon}
        </div>
        <h3 className="font-display text-sm font-bold text-slate-900">{title}</h3>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Live DB
        </span>
      </div>
      {children}
    </div>
  );
}

export function LandingCommunityLiveStats() {
  const stats = usePlatformStats();
  const [members, setMembers] = useState<DirectoryUser[]>([]);

  useEffect(() => subscribeToUserDirectory(setMembers), []);

  const weekly = useMemo(() => buildWeeklySignups(members), [members]);
  const maxWeek = Math.max(1, ...weekly.map((d) => d.count));

  const roleBars = useMemo(
    () => [
      { label: "Founders", value: stats.entrepreneurs, color: "#eab308" },
      { label: "Business", value: stats.businessOwners, color: "#10b981" },
      { label: "Investors", value: stats.investors, color: "#06b6d4" },
      { label: "Wholesalers", value: stats.wholesalers, color: "#f97316" },
    ],
    [stats],
  );

  const recent = useMemo(
    () =>
      [...members]
        .filter((m) => m.name || m.email)
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        .slice(0, 6),
    [members],
  );

  const activeToday = useMemo(() => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    return members.filter((m) => (m.lastSeen ?? m.createdAt ?? 0) >= dayStart.getTime()).length;
  }, [members]);

  return (
    <div className="mb-10 grid gap-5 lg:grid-cols-3">
      <GlowPanel title="Weekly signups" icon={<TrendingUp className="h-4 w-4" />}>
        <div className="flex h-36 items-end justify-between gap-1.5 px-1">
          {weekly.map((d) => {
            const h = Math.max(8, Math.round((d.count / maxWeek) * 100));
            return (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-orange-600">{d.count || ""}</span>
                <div
                  className="w-full max-w-[2.5rem] rounded-t-lg bg-gradient-to-t from-orange-500 to-amber-300 shadow-[0_0_12px_rgba(249,115,22,0.45)] transition-all duration-500"
                  style={{ height: `${h}%`, minHeight: d.count > 0 ? "1.5rem" : "0.5rem" }}
                />
                <span className="text-[9px] font-semibold text-slate-500">{d.label}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-center text-[10px] text-slate-500">
          New registrations from Firebase <code className="text-orange-600">user_directory</code>
        </p>
      </GlowPanel>

      <GlowPanel title="Ecosystem split" icon={<Users className="h-4 w-4" />} accent="emerald">
        <div className="space-y-3">
          {roleBars.map((r) => (
            <div key={r.label}>
              <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-700">
                <span>{r.label}</span>
                <CountUp target={r.value} suffix="+" />
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/60">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${statFill(r.value, 50)}%`,
                    background: `linear-gradient(90deg, ${r.color}, ${r.color}99)`,
                    boxShadow: `0 0 10px ${r.color}66`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-white/70 px-2 py-2">
            <p className="text-[9px] font-bold uppercase text-slate-500">Total members</p>
            <p className="font-display text-lg font-black text-slate-900">
              <CountUp target={stats.totalMembers} />
            </p>
          </div>
          <div className="rounded-xl bg-white/70 px-2 py-2">
            <p className="text-[9px] font-bold uppercase text-slate-500">Community votes</p>
            <p className="font-display text-lg font-black text-slate-900">
              <CountUp target={stats.totalVotes} />
            </p>
          </div>
        </div>
      </GlowPanel>

      <GlowPanel title="Recent activity" icon={<Activity className="h-4 w-4" />} accent="cyan">
        {recent.length === 0 ? (
          <div className="flex h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-200/80 bg-white/50 text-center">
            <Zap className="mb-2 h-6 w-6 text-cyan-400" />
            <p className="text-xs font-semibold text-slate-600">Waiting for signups…</p>
            <p className="mt-1 text-[10px] text-slate-400">Register to appear here live</p>
          </div>
        ) : (
          <ul className="max-h-40 space-y-2 overflow-y-auto pr-1">
            {recent.map((m) => (
              <li
                key={m.uid}
                className="flex items-center gap-2.5 rounded-xl border border-white/80 bg-white/70 px-3 py-2"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                  style={{ background: roleColor(m.role) }}
                >
                  {(m.name || m.email || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-800">{m.name || m.email}</p>
                  <p className="text-[10px] text-slate-500">
                    {roleLabel(m.role)} · {m.createdAt ? timeAgo(m.createdAt) : "Joined"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[8px] font-bold uppercase text-cyan-700">
                  New
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-center text-[10px] text-slate-500">
          <span className="font-bold text-cyan-700">{activeToday}</span> active today ·{" "}
          <span className="font-bold text-cyan-700">{stats.communityPosts}</span> lounge posts
        </p>
      </GlowPanel>
    </div>
  );
}
