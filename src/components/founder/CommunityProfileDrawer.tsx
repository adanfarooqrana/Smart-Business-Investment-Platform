import { useState } from "react";
import { Heart, MessageSquare, Share2, UserPlus, UserMinus, X, Trash2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  username: string;
  isOpen: boolean;
  onClose: () => void;
  isOwnProfile?: boolean;
};

export function CommunityProfileDrawer({ username, isOpen, onClose, isOwnProfile }: Props) {
  const navigate = useNavigate();
  const {
    isLoggedIn,
    communityPosts,
    followedUsers,
    toggleFollowUser,
    toggleLikePost,
    likedPosts,
    getFollowersCount,
    deleteCommunityPost,
  } = useAppState();

  const [tab, setTab] = useState<"posts" | "strategies" | "packaging">("posts");

  if (!isOpen) return null;

  const safeCommunityPosts = communityPosts ?? [];
  const following = followedUsers ?? [];

  const userPosts = safeCommunityPosts.filter((p) => p.author === username);
  const strategies = userPosts.filter((p) => p.isMarketingBlueprint);
  const packaging = userPosts.filter((p) => p.isPackagingReq);
  const posts = userPosts.filter((p) => !p.isMarketingBlueprint && !p.isPackagingReq);

  const isFollowing = following.includes(username);
  const followers = getFollowersCount(username);
  const totalLikes = userPosts.reduce((sum, p) => sum + (p.votes ?? 0), 0);

  const requireAuth = (action: () => void) => {
    if (!isLoggedIn) {
      toast.error("Please sign in to interact.");
      navigate({ to: "/app/login" });
      return;
    }
    action();
  };

  const displayPosts = tab === "strategies" ? strategies : tab === "packaging" ? packaging : posts;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[#FFD700]/30 shadow-2xl"
        style={{ background: "#1a1a2e", maxHeight: "90vh" }}
      >
        {/* Cover */}
        <div className="relative h-32"
          style={{ background: "linear-gradient(135deg, #FFD70033, #FFA50022, #1a1a2e)" }}
        >
          <button type="button" onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Avatar & info */}
        <div className="relative px-6 pb-4">
          <div className="absolute -top-10 left-6 flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-[#1a1a2e] text-2xl font-black text-white shadow-xl"
            style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)" }}
          >
            {username.charAt(2)?.toUpperCase() ?? "U"}
          </div>
          <div className="pt-12">
            <h2 className="font-display text-xl font-bold text-white">{username}</h2>
            <span className="mt-1 inline-block rounded-full bg-[#FFD700]/20 px-3 py-0.5 text-[10px] font-bold text-[#FFD700]">
              {isOwnProfile ? "Entrepreneur / Founder" : "Community Member"}
            </span>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Followers", value: followers },
              { label: "Posts", value: userPosts.length },
              { label: "Likes", value: totalLikes },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="font-display text-xl font-black text-white">{s.value}</p>
                <p className="text-[10px] text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            {!isOwnProfile && (
              <Button
                size="sm"
                className={`flex-1 text-xs font-bold ${isFollowing ? "bg-white/10 text-white" : "bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#1a1a2e]"}`}
                onClick={() => requireAuth(() => toggleFollowUser(username))}
              >
                {isFollowing ? <><UserMinus className="mr-1 h-3.5 w-3.5" /> Unfollow</> : <><UserPlus className="mr-1 h-3.5 w-3.5" /> Follow</>}
              </Button>
            )}
            <Button size="sm" variant="outline" className="flex-1 border-white/20 text-xs text-white">
              <MessageSquare className="mr-1 h-3.5 w-3.5" /> Message
            </Button>
            <Button size="sm" variant="outline" className="border-white/20 text-white">
              <Share2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Content tabs */}
        <div className="border-t border-white/10 px-6 pt-3">
          <div className="mb-3 flex gap-1 rounded-full border border-white/10 bg-white/5 p-1">
            {(["posts", "strategies", "packaging"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 rounded-full py-1.5 text-[10px] font-bold capitalize ${
                  tab === t ? "bg-[#FFD700] text-[#1a1a2e]" : "text-slate-400"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="max-h-48 space-y-2 overflow-y-auto pb-4">
            {displayPosts.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">No {tab} yet.</p>
            ) : (
              displayPosts.map((post) => (
                <div key={post.id} className="rounded-xl border border-white/10 p-3">
                  <p className="text-sm font-bold text-white">{post.title}</p>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">{post.content}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <button type="button" onClick={() => requireAuth(() => toggleLikePost(post.id))}
                      className={`flex items-center gap-1 text-[10px] ${likedPosts.includes(post.id) ? "text-red-400" : "text-slate-500"}`}
                    >
                      <Heart className="h-3 w-3" fill={likedPosts.includes(post.id) ? "currentColor" : "none"} />
                      {post.votes}
                    </button>
                    {isOwnProfile && (
                      <button type="button"
                        onClick={() => {
                          if (!window.confirm("Delete this post?")) return;
                          deleteCommunityPost(post.id);
                          toast.success("Post deleted.");
                        }}
                        className="ml-auto text-[10px] text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
