import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Sparkles,
  Search,
  Bell,
  Bot,
  Users,
  ChevronDown,
  LogOut,
  User,
  Globe,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  founderName: string;
  avatarUrl?: string;
  unreadNotifications: number;
  unreadMessages: number;
  onOpenCommunity: () => void;
  onOpenGroups: () => void;
  onOpenAI: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
};

export function FounderTopNav({
  founderName,
  unreadNotifications,
  unreadMessages,
  onOpenCommunity,
  onOpenGroups,
  onOpenAI,
  searchQuery,
  onSearchChange,
}: Props) {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <nav
      className="sticky top-0 z-50 border-b border-[#FFD700]/20 backdrop-blur-xl"
      style={{ background: "rgba(26, 26, 46, 0.95)" }}
    >
      <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-3 md:px-6">
        {/* Logo */}
        <div className="flex shrink-0 items-center gap-2">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg"
            style={{
              background: "linear-gradient(135deg, #FFD700, #FFA500)",
              boxShadow: "0 0 20px rgba(255, 215, 0, 0.5)",
            }}
          >
            <Sparkles className="h-5 w-5" />
          </div>
          <span
            className="hidden font-display text-lg font-extrabold sm:inline"
            style={{ color: "#FFD700", textShadow: "0 0 12px rgba(255,215,0,0.6)" }}
          >
            InvestBiz
          </span>
        </div>

        {/* Search */}
        <div
          className={`mx-auto flex max-w-md flex-1 transition-all duration-300 ${
            searchFocused ? "max-w-lg" : ""
          }`}
        >
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FFD700]/60" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search problems, investors, community..."
              className="border-[#FFD700]/30 bg-[#1a1a2e]/80 pl-10 text-white placeholder:text-slate-500 focus:border-[#FFD700] focus:ring-[#FFD700]/30"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenCommunity}
            className="gap-1.5 text-[#FFD700] hover:bg-[#FFD700]/10"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Community</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenGroups}
            className="text-[#FFD700] hover:bg-[#FFD700]/10"
            title="Groups"
          >
            <Users className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenAI}
            className="founder-ai-pulse text-[#FFA500] hover:bg-[#FFA500]/10"
            title="AI Consultant"
          >
            <Bot className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setNotifOpen((o) => !o)}
              className="text-slate-300 hover:bg-white/10"
            >
              <Bell className="h-5 w-5" />
              {(unreadNotifications + unreadMessages) > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#FFA500] text-[9px] font-bold text-white">
                  {unreadNotifications + unreadMessages}
                </span>
              )}
            </Button>
            {notifOpen && (
              <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-[#FFD700]/20 bg-[#1a1a2e] p-3 shadow-2xl">
                <p className="mb-2 text-xs font-bold text-[#FFD700]">Notifications</p>
                <div className="space-y-2 text-xs text-slate-300">
                  {unreadMessages > 0 && (
                    <p className="rounded-lg bg-[#FFA500]/10 px-3 py-2">
                      {unreadMessages} unread investor message{unreadMessages > 1 ? "s" : ""}
                    </p>
                  )}
                  <p className="rounded-lg bg-[#FFD700]/10 px-3 py-2">
                    3 investors viewed your idea today
                  </p>
                  <p className="rounded-lg bg-emerald-500/10 px-3 py-2">
                    2 sample requests pending approval
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full border border-[#FFD700]/30 bg-[#FFD700]/10 px-2 py-1.5 transition hover:bg-[#FFD700]/20"
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
              >
                {founderName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden max-w-[80px] truncate text-xs font-semibold text-white md:inline">
                {founderName}
              </span>
              <ChevronDown className="h-3 w-3 text-[#FFD700]" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-12 z-50 w-48 rounded-2xl border border-[#FFD700]/20 bg-[#1a1a2e] p-2 shadow-2xl">
                <button
                  type="button"
                  onClick={() => { setProfileOpen(false); navigate({ to: "/founder/dashboard" }); }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/10"
                >
                  <User className="h-4 w-4" /> My Profile
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/app/login" })}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
