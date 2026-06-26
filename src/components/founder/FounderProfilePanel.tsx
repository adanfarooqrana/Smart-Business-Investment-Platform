import { useState } from "react";
import {
  User,
  Mail,
  Phone,
  CreditCard,
  Target,
  BadgeCheck,
  Lightbulb,
  Heart,
  Users,
  FileText,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FounderProfilePostsSection } from "./FounderProfilePostsSection";

type Props = {
  founderId: string;
  displayName: string;
  profileId: string;
  founderUsername: string;
  email?: string;
  phone?: string;
  paymentType?: string;
  isVerified?: boolean;
  ideaVision?: string;
  ideaInterest?: string;
  founderGoals?: string;
  totalFollowers: number;
  totalLikes: number;
  problemsSolved: number;
  onClose: () => void;
};

export function FounderProfilePanel({
  founderId,
  displayName,
  profileId,
  founderUsername,
  email,
  phone,
  paymentType,
  isVerified,
  ideaVision,
  ideaInterest,
  founderGoals,
  totalFollowers,
  totalLikes,
  problemsSolved,
  onClose,
}: Props) {
  const [tab, setTab] = useState<"overview" | "posts" | "videos">("overview");

  const paymentLabel =
    paymentType === "bank" ? "Bank Account" :
    paymentType === "jazzcash" ? "JazzCash" :
    paymentType === "easypaisa" ? "EasyPaisa" : "Payment linked";

  return (
    <div className="overflow-hidden rounded-3xl border border-[#FFD700]/30 shadow-2xl"
      style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)" }}
    >
      {/* Sun header with logo */}
      <div className="relative overflow-hidden px-6 pb-6 pt-8">
        <div className="pointer-events-none absolute inset-0 opacity-40"
          style={{ background: "radial-gradient(circle at 50% 0%, rgba(255,215,0,0.5) 0%, transparent 60%)" }}
        />
        <button type="button" onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-black/30 p-2 text-white hover:bg-black/50"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-end sm:gap-6">
          <div className="relative mb-4 sm:mb-0">
            <div className="founder-ai-pulse flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-[#FFD700]/50 sm:h-28 sm:w-28"
              style={{ background: "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,165,0,0.1))" }}
            >
              <img src="/pngend.png" alt="" className="h-16 w-16 object-contain"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
              <Lightbulb className="absolute h-10 w-10 text-[#FFD700]" style={{ display: "none" }} />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-sm font-black text-[#1a1a2e]">
              {displayName.charAt(0)}
            </div>
          </div>

          <div className="flex-1">
            <div className="mb-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="rounded-full bg-[#FFD700]/20 px-3 py-1 text-[10px] font-bold uppercase text-[#FFD700]">
                Entrepreneur / Founder
              </span>
              {isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
                  <BadgeCheck className="h-3 w-3" /> Verified
                </span>
              )}
            </div>
            <h2 className="font-display text-2xl font-extrabold text-white sm:text-3xl">{displayName}</h2>
            <p className="font-mono text-sm text-[#FFD700]">{profileId}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { icon: Users, label: "Followers", value: totalFollowers },
            { icon: Heart, label: "Likes", value: totalLikes },
            { icon: FileText, label: "Solved", value: problemsSolved },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-[#FFD700]/20 bg-white/5 p-3 text-center">
              <s.icon className="mx-auto mb-1 h-4 w-4 text-[#FFD700]" />
              <p className="font-display text-xl font-black text-white">{s.value}</p>
              <p className="text-[10px] text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-y border-[#FFD700]/15 px-4 py-2">
        {(["overview", "posts", "videos"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full py-2 text-xs font-bold capitalize transition ${
              tab === t ? "bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#1a1a2e]" : "text-slate-400 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === "overview" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm text-slate-300">
              {email && <span className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-[#FFD700]" />{email}</span>}
              {phone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-[#FFD700]" />{phone}</span>}
              {paymentType && <span className="flex items-center gap-1.5"><CreditCard className="h-4 w-4 text-[#FFD700]" />{paymentLabel}</span>}
            </div>
            {(ideaVision || ideaInterest || founderGoals) && (
              <div className="rounded-2xl border border-[#FFD700]/20 bg-[#FFD700]/5 p-4">
                {ideaInterest && <p className="mb-1 text-[10px] font-bold uppercase text-[#FFD700]">{ideaInterest}</p>}
                {ideaVision && <p className="font-medium text-white">{ideaVision}</p>}
                {founderGoals && (
                  <p className="mt-2 text-sm text-slate-400">
                    <Target className="mr-1 inline h-3.5 w-3.5 text-[#FFA500]" />{founderGoals}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "posts" && founderId && (
          <FounderProfilePostsSection
            founderId={founderId}
            founderName={displayName}
            founderUsername={founderUsername}
          />
        )}

        {tab === "videos" && (
          <p className="py-8 text-center text-sm text-slate-400">
            <Video className="mx-auto mb-2 h-8 w-8 text-[#FFD700]/50" />
            Upload videos from the Video Lounge panel on your dashboard.
          </p>
        )}
      </div>
    </div>
  );
}
