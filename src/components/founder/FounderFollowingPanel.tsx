import { useEffect, useState } from "react";
import { User, Circle } from "lucide-react";
import { subscribeToFollowing } from "@/services/founderCommunityService";
import { useAppState } from "@/hooks/useAppState";

type Props = {
  founderId: string;
  onViewProfile: (username: string) => void;
};

export function FounderFollowingPanel({ founderId, onViewProfile }: Props) {
  const { followedUsers, getFollowersCount } = useAppState();
  const [firebaseFollowing, setFirebaseFollowing] = useState<string[]>([]);

  useEffect(() => {
    if (!founderId) return;
    const unsub = subscribeToFollowing(founderId, setFirebaseFollowing);
    return unsub;
  }, [founderId]);

  const allFollowing = [...new Set([...(followedUsers ?? []), ...firebaseFollowing])];

  const mockProfiles = allFollowing.length > 0
    ? allFollowing.map((u) => ({
        username: u,
        role: u.includes("wholesale") ? "Wholesaler" : u.includes("invest") ? "Investor" : "Business Owner",
        online: Math.random() > 0.4,
      }))
    : [
        { username: "u/rice_king_pk", role: "Wholesaler", online: true },
        { username: "u/tech_investor", role: "Investor", online: false },
        { username: "u/cafe_founder", role: "Business Owner", online: true },
        { username: "u/packaging_pro", role: "Wholesaler", online: false },
      ];

  return (
    <aside className="rounded-2xl border border-[#FFD700]/20 p-4"
      style={{ background: "rgba(255,255,255,0.03)" }}
    >
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#FFD700]">
        <User className="h-4 w-4" /> Following ({mockProfiles.length})
      </h3>
      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {mockProfiles.map((p) => (
          <button
            key={p.username}
            type="button"
            onClick={() => onViewProfile(p.username)}
            className="flex w-full items-center gap-3 rounded-xl border border-white/5 p-3 text-left transition hover:border-[#FFD700]/30 hover:bg-white/5"
          >
            <div className="relative">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
              >
                {p.username.charAt(2)?.toUpperCase() ?? "U"}
              </div>
              <Circle
                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-current ${
                  p.online ? "text-emerald-400" : "text-slate-500"
                }`}
                strokeWidth={0}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white">{p.username}</p>
              <p className="text-[10px] text-slate-500">{p.role}</p>
            </div>
            <span className="text-[10px] text-slate-600">
              {getFollowersCount(p.username)} followers
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
