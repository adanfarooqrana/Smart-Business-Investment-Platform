import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { subscribeToCommunityPosts } from "@/services/firebaseService";
import { subscribeToPostLikes, togglePostLike } from "@/services/realtimeDataService";
import { LandingCommunityLiveStats } from "@/components/landing/LandingCommunityLiveStats";

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
  consultant: { label: "Consultant Post", className: "bg-amber-500/10 text-amber-700 border-amber-500/10" },
  investor: { label: "Investor Post", className: "bg-teal-500/10 text-teal-700 border-teal-500/10" },
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

function guestVoteUserId(): string {
  const key = "sb_guest_vote_uid";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `guest_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

function mapPost(raw: Record<string, unknown> & { id: string }): PreviewPost {
  const role = String(raw.role ?? "guest");
  const badge = BADGE_MAP[role] ?? BADGE_MAP.guest;
  const author = String(raw.author ?? "u/member").replace(/^u\//, "");
  let commentCount = 0;
  if (Array.isArray(raw.comments)) commentCount = raw.comments.length;
  else if (raw.comments && typeof raw.comments === "object") commentCount = Object.keys(raw.comments).length;

  return {
    id: raw.id,
    author,
    role,
    badge: badge.label,
    badgeClass: badge.className,
    avatarColor: String(raw.avatarColor ?? "bg-indigo-500"),
    title: String(raw.title ?? "Community update"),
    content: String(raw.content ?? ""),
    votes: Number(raw.votes ?? 0),
    commentCount,
  };
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
      className={`flex flex-col rounded-3xl border p-6 shadow-sm transition-all duration-[600ms] relative overflow-hidden select-none ${
        active
          ? "border-orange-500 bg-gradient-to-br from-orange-100 via-orange-50 to-white shadow-[0_10px_30px_rgba(249,115,22,0.35)] scale-[0.99]"
          : "border-orange-200/60 bg-orange-50/40 hover:-translate-y-1 hover:shadow-lg"
      }`}
    >
      <div
        className={`absolute -right-16 -top-16 h-36 w-36 rounded-full transition-all duration-[600ms] blur-2xl pointer-events-none ${
          active ? "scale-[1.8] bg-orange-400/25" : "scale-100 bg-orange-400/5"
        }`}
      />
      <div className={`absolute top-0 right-0 text-[9px] font-extrabold uppercase px-3.5 py-1 rounded-bl-2xl border-l border-b font-mono ${post.badgeClass}`}>
        {post.badge}
      </div>

      <div className="flex items-center gap-2 mb-4 relative z-10">
        <div className={`h-7 w-7 rounded-xl text-white flex items-center justify-center font-bold text-xs ${post.avatarColor}`}>
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
            liked ? "text-orange-600 bg-orange-100" : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
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

  useEffect(() => {
    return subscribeToCommunityPosts((rawPosts) => {
      const mapped = rawPosts.map((p) => mapPost(p));
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

  useEffect(() => {
    if (posts.length === 0 || usingFallback) return;
    const unsubs = posts.map((post) =>
      subscribeToPostLikes(post.id, (count) => {
        setVoteCounts((prev) => ({ ...prev, [post.id]: count }));
      }),
    );
    return () => unsubs.forEach((u) => u());
  }, [posts, usingFallback]);

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
    const ok = await togglePostLike(postId, guestId, liked);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (ok) next.add(postId);
      else next.delete(postId);
      persistLikes(next);
      return next;
    });
  };

  return (
    <section id="community-teaser" className="relative overflow-hidden border-b border-slate-100 bg-white w-full">
      <div className="absolute right-0 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-orange-400/5 blur-3xl pointer-events-none" />
      <div className="mx-auto max-w-[1600px] w-[95%] py-12 md:py-14 relative">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-orange-100 border border-orange-200 px-3.5 py-1.5 text-xs font-bold text-orange-700">
            <svg className="h-3.5 w-3.5 fill-orange-600 animate-pulse" viewBox="0 0 20 20">
              <path d="M17.17 9.83a2.22 2.22 0 0 0-2.22-2.22c-.32 0-.62.07-.9.19-1.12-.82-2.64-1.34-4.33-1.4l.92-2.88 3 .65c0 .77.62 1.4 1.39 1.4a1.4 1.4 0 1 0-1.4-1.4c0 .07 0 .14.02.2l-3.23-.7a.44.44 0 0 0-.53.31l-.98 3.06c-1.74.04-3.3.56-4.44 1.4a2.22 2.22 0 0 0-3.12 3.12c0 .24.04.47.12.69-1.03.88-1.63 2.1-1.63 3.42 0 2.73 3.65 4.95 8.13 4.95s8.13-2.22 8.13-4.95c0-1.33-.6-2.54-1.63-3.42a2.16 2.16 0 0 0 .11-.69z" />
            </svg>
            <span>Social Strategy Exchange</span>
          </div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
            Step into the Community Lounge.
          </h2>
          <p className="mt-4 text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
            Live graphs from Firebase — signups, roles, and trending lounge posts update in real time.
          </p>
        </div>

        <LandingCommunityLiveStats />

        <div className="grid gap-8 md:grid-cols-3 mb-12">
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
          <p className="-mt-6 mb-8 text-center text-xs text-slate-400">
            Showing lounge previews — your signup appears in the live graphs above. Post after{" "}
            <Link to="/app/register" className="font-semibold text-orange-600 hover:underline">
              registration
            </Link>
            .
          </p>
        )}

        <div className="text-center">
          <Link
            to="/app/community"
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
          >
            Open Community Lounge
          </Link>
        </div>
      </div>
    </section>
  );
}
