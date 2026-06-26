import { Link } from "@tanstack/react-router";
import {
  Lightbulb,
  Users,
  Eye,
  Package,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import type { EntrepreneurMetrics } from "@/services/entrepreneurService";

type Props = {
  fullName: string;
  profileId: string;
  metrics: EntrepreneurMetrics;
};

export function EntrepreneurWorkspaceHeader({ fullName, profileId, metrics }: Props) {
  return (
    <header
      className="sticky top-0 z-40 border-b border-[#FFA500]/25 backdrop-blur-xl"
      style={{ backgroundColor: "rgba(255, 248, 225, 0.92)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
            style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
          >
            <Lightbulb className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold text-slate-900 md:text-base">
              {fullName}
            </p>
            <p className="truncate text-[10px] font-mono text-[#FFA500]">{profileId}</p>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <MetricPill
            icon={Eye}
            label="Investors Viewed Idea"
            value={metrics.investorsViewedIdea}
          />
          <MetricPill
            icon={Package}
            label="Active Sample Requests"
            value={metrics.activeSampleRequests}
          />
          <MetricPill
            icon={MessageSquare}
            label="Unread Messages"
            value={metrics.unreadMessagesCount}
            highlight={metrics.unreadMessagesCount > 0}
          />
        </div>

        <Link
          to="/app/community"
          className="flex shrink-0 items-center gap-2 rounded-full border border-[#FFA500]/40 bg-white px-3 py-2 text-xs font-bold text-[#FFA500] shadow-sm transition-all hover:bg-[#FFF8E1] hover:shadow-md md:px-4"
          title="Community Lounge — view strategies & sticky notes"
        >
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Community</span>
        </Link>
      </div>

      <div className="flex items-center justify-center gap-2 border-t border-[#FFA500]/15 px-4 py-2 md:hidden">
        <MetricPill
          icon={Eye}
          label="Viewed"
          value={metrics.investorsViewedIdea}
          compact
        />
        <MetricPill
          icon={Package}
          label="Samples"
          value={metrics.activeSampleRequests}
          compact
        />
        <MetricPill
          icon={MessageSquare}
          label="Unread"
          value={metrics.unreadMessagesCount}
          highlight={metrics.unreadMessagesCount > 0}
          compact
        />
      </div>
    </header>
  );
}

function MetricPill({
  icon: Icon,
  label,
  value,
  highlight,
  compact,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
  highlight?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 ${
        highlight
          ? "border-[#FFA500] bg-[#FFA500]/10"
          : "border-[#FFD700]/50 bg-white/80"
      } ${compact ? "text-[10px]" : "text-xs"}`}
    >
      <Icon className={`h-3.5 w-3.5 ${highlight ? "text-[#FFA500]" : "text-slate-500"}`} />
      <span className="font-bold text-slate-800">{value}</span>
      {!compact && (
        <span className="hidden text-slate-500 lg:inline">{label}</span>
      )}
      {compact && <span className="text-slate-500">{label}</span>}
      {highlight && value > 0 && (
        <Sparkles className="h-3 w-3 animate-pulse text-[#FFA500]" />
      )}
    </div>
  );
}
