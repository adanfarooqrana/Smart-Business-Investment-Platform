import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  subscribeToFirestorePosts,
  toggleFirestorePostLike,
  type FirestoreCommunityPost,
} from "@/services/communityFirestoreService";
import { useAuth } from "@/contexts/AuthContext";

type PreviewPost = {
  id: string;
  author: string;
  role: string;
  badge: string;
  badgeClass: string;
  avatarColor: string;
  title: string;
  content: string;
  votes: number;
  commentCount: number;
};

const BADGE_MAP: Record<string, { label: string; className: string }> = {
  business: { label: "Business Owner Post", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/10" },
  business_owner: {
    label: "Business Owner Post",
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/10",
  },
  consultant: { label: "Consultant Post", className: "bg-amber-500/10 text-amber-700 border-amber-500/10" },
  investor: { label: "Investor Post", className: "bg-teal-500/10 text-teal-700 border-teal-500/10" },
  founder: { label: "Founder Post", className: "bg-amber-500/10 text-amber-700 border-amber-500/10" },
  entrepreneur: { label: "Founder Post", className: "bg-amber-500/10 text-amber-700 border-amber-500/10" },
  guest: { label: "Community Post", className: "bg-slate-100 text-slate-700 border-slate-100" },
};

const FALLBACK_POSTS: PreviewPost[] = [
  {
    id: "preview-mkt",
    author: "coffee_bean_founder",
    role: "business",
    badge: "Business Owner Post",
    badgeClass: BADGE_MAP.business.className,
    avatarColor: "bg-emerald-500",
    title: "Loyalty app launch — 48% return visits in 30 days",
    content:
      "We rotated weekly discounts on our digital stamp card. Score jumped from 4.1 to 4.8 — sharing the full playbook in the lounge.",
    votes: 55,
    commentCount: 8,
  },
  {
    id: "preview-pkg",
    author: "retail_revolution",
    role: "business",
    badge: "Business Owner Post",
    badgeClass: BADGE_MAP.business.className,
    avatarColor: "bg-emerald-600",
    title: "Need 5,000 biodegradable courier bags — quotes open",
    content:
      "Gold-leaf branding, water-resistant kraft material. Wholesalers already quoting in the packaging channel.",
    votes: 12,
    commentCount: 4,
  },
  {
    id: "preview-strat",
    author: "growth_hacker_pk",
    role: "consultant",
    badge: "Consultant Post",
    badgeClass: BADGE_MAP.consultant.className,
    avatarColor: "bg-blue-600",
    title: "Gujranwala wholesale shift → eco packaging +40% demand",
    content:
      "Market prediction verified by 3 suppliers. Full strategy thread with supplier contacts inside the lounge.",
    votes: 38,
    commentCount: 11,
  },
];

function mapFirestorePost(raw: FirestoreCommunityPost): PreviewPost {
  const role = String(raw.authorRole ?? "guest");
  const badge = BADGE_MAP[role] ?? BADGE_MAP.guest;
  return {
    id: raw.id,
    author: String(raw.authorName || "member").replace(/^u\//, ""),
    role,
    badge: badge.label,
    badgeClass: badge.className,
    avatarColor: "bg-indigo-500",
    title: String(raw.title ?? "Community update"),
    content: String(raw.content ?? ""),
    votes: Array.isArray(raw.likes) ? raw.likes.length : Number(raw.likes?.length ?? 0) || 0,
    commentCount: Number(raw.commentCount ?? 0) || 0,
  };
}

function guestVoteUserId(): string {
  const key = "sb_guest_vote_uid";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `guest_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

function PostCard({
  post,
  active,
  onHover,
  onLeave,
  onToggleLike,
  liked,
  liveVotes,
  isPreview,
}: {
  post: PreviewPost;
  active: boolean;
  onHover: () => void;
  onLeave: () => void;
  onToggleLike: () => void;
  liked: boolean;
  liveVotes: number;
  isPreview?: boolean;
}) {
  const initial = post.author.charAt(0).toUpperCase() || "?";

  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`relative flex select-none flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm transition-all duration-300 md:p-4 ${
        active ? "border-amber-300" : "hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      <div className={`absolute right-0 top-0 rounded-bl-2xl border-b border-l px-3.5 py-1 font-mono text-[9px] font-semibold uppercase ${post.badgeClass}`}>
        {post.badge}
      </div>

      <div className="relative z-10 mb-4 flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-bold text-white ${post.avatarColor}`}>
          {initial}
        </div>
        <div>
          <span className="text-xs font-bold text-slate-800 block">{post.author}</span>
          <span className="inline-flex items-center gap-0.5 text-[8px] font-extrabold uppercase bg-white/60 text-slate-600 px-1.5 py-0.5 rounded font-mono">
            {isPreview ? "Preview" : "Live from platform"}
          </span>
        </div>
      </div>

      <h3 className="font-display text-base font-bold text-slate-900 mb-2 leading-snug relative z-10">{post.title}</h3>
      <p className="text-xs text-slate-500 line-clamp-4 leading-relaxed mb-6 flex-1 relative z-10">{post.content}</p>

      <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-[10px] text-slate-400 relative z-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike();
          }}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-mono font-bold transition-colors ${
            liked ? "bg-amber-50 text-amber-600" : "text-slate-600 hover:bg-amber-50 hover:text-amber-600"
          }`}
        >
          ▲ {liveVotes} {liked ? "Liked" : "Vote"}
        </button>
        <span className="font-semibold text-slate-500">
          {post.commentCount} Comment{post.commentCount === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}

export function LandingCommunityPreview() {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState<PreviewPost[]>(FALLBACK_POSTS);
  const [usingFallback, setUsingFallback] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("sb_landing_liked_posts");
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(FALLBACK_POSTS.map((p) => [p.id, p.votes])),
  );
  const guestId = useMemo(() => guestVoteUserId(), []);
  const likeUid = currentUser?.uid || guestId;

  useEffect(() => {
    return subscribeToFirestorePosts((rawPosts) => {
      const mapped = rawPosts.map(mapFirestorePost);
      const top = [...mapped].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0)).slice(0, 3);
      if (top.length > 0) {
        setUsingFallback(false);
        setPosts(top);
      } else {
        setUsingFallback(true);
        setPosts(FALLBACK_POSTS);
      }
      setVoteCounts((prev) => {
        const next = { ...prev };
        for (const p of top.length > 0 ? top : FALLBACK_POSTS) next[p.id] = p.votes;
        return next;
      });
    });
  }, []);

  const displayPosts = posts.length > 0 ? posts : FALLBACK_POSTS;

  const persistLikes = (next: Set<string>) => {
    localStorage.setItem("sb_landing_liked_posts", JSON.stringify([...next]));
  };

  const handleLike = async (postId: string) => {
    const liked = likedIds.has(postId);
    if (usingFallback || postId.startsWith("preview-")) {
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (liked) next.delete(postId);
        else next.add(postId);
        persistLikes(next);
        return next;
      });
      setVoteCounts((prev) => ({
        ...prev,
        [postId]: Math.max(0, (prev[postId] ?? 0) + (liked ? -1 : 1)),
      }));
      return;
    }
    try {
      await toggleFirestorePostLike(postId, likeUid, liked);
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (liked) next.delete(postId);
        else next.add(postId);
        persistLikes(next);
        return next;
      });
      setVoteCounts((prev) => ({
        ...prev,
        [postId]: Math.max(0, (prev[postId] ?? 0) + (liked ? -1 : 1)),
      }));
    } catch (err) {
      console.warn("landing like failed:", err);
    }
  };

  return (
    <section id="community-teaser" className="my-2 w-full bg-[#f5f5f5] px-4 md:my-3">
      <div className="relative mx-auto max-w-7xl rounded-[2.5rem] border border-slate-200/90 bg-white px-6 py-6 shadow-sm md:px-10 md:py-8">
        <div className="mb-4 text-center">
          <h2 className="font-display text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
            Step into the Community Lounge.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-slate-600">
            Trending lounge posts from the community — vote live and join the conversation.
          </p>
        </div>

        <div className="mb-4 grid gap-4 md:grid-cols-3 md:gap-6">
          {displayPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                active={hoveredId === post.id || activeId === post.id}
                onHover={() => setHoveredId(post.id)}
                onLeave={() => setHoveredId(null)}
                onToggleLike={() => {
                  setActiveId(post.id);
                  void handleLike(post.id);
                }}
                liked={likedIds.has(post.id)}
                liveVotes={voteCounts[post.id] ?? post.votes}
                isPreview={usingFallback || post.id.startsWith("preview-")}
              />
            ))}
        </div>

        {usingFallback && (
          <p className="-mt-2 mb-4 text-center text-xs text-slate-400">
            Showing lounge previews — your signup appears in the live graphs above. Post after{" "}
            <Link to="/app/register" className="font-semibold text-amber-600 hover:underline">
              registration
            </Link>
            .
          </p>
        )}

        <div className="text-center">
          <Link
            to="/app/community"
            search={{ entry: "public" }}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
          >
            Open Community Lounge
          </Link>
        </div>
      </div>
    </section>
  );
}
