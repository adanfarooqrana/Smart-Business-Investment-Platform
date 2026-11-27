import { Heart, MessageSquare, Pin } from "lucide-react";
import {
  DEFAULT_AUTHOR_AVATAR,
  type FirestoreCommunityPost,
} from "@/services/communityFirestoreService";

const TILTS = ["rotate-1", "-rotate-1", "rotate-2", "-rotate-2", "rotate-[0.5deg]", "-rotate-[1.5deg]"] as const;
const PASTELS = [
  "bg-amber-100/95 border-amber-200/80",
  "bg-yellow-50 border-amber-200/70",
  "bg-orange-50/95 border-orange-200/70",
  "bg-amber-50 border-amber-200/80",
] as const;

function authorLabel(post: FirestoreCommunityPost): string {
  const name = String(post?.authorName || "").trim() || "Business Owner";
  const business = String(post?.businessName || "").trim();
  if (post?.authorRole === "business_owner" && business) {
    return `${business} · ${name}`;
  }
  return name;
}

function badgeTone(badge: string): string {
  if (badge === "Founder" || badge === "Entrepreneur") return "bg-amber-600 text-white";
  if (badge === "Investor") return "bg-violet-600 text-white";
  if (badge === "Business Owner") return "bg-emerald-700 text-white";
  return "bg-slate-700 text-white";
}

/** Physical sticky-note card for workspace posters (BO / Founder / Investor). */
export function StickyNotePostCard({
  post,
  index = 0,
  liked = false,
  onOpen,
  onLike,
}: {
  post: FirestoreCommunityPost;
  index?: number;
  liked?: boolean;
  onOpen: () => void;
  onLike: () => void;
}) {
  if (!post?.id) return null;

  const tilt = TILTS[index % TILTS.length];
  const pastel = PASTELS[index % PASTELS.length];
  const likes = Array.isArray(post.likes) ? post.likes : [];
  const likeCount = likes.length;
  const photo = String(post.authorPhoto || "").trim() || DEFAULT_AUTHOR_AVATAR;
  const badge = post.badge === "Founder" ? "Entrepreneur" : post.badge || "Entrepreneur";

  return (
    <article
      className={`group relative cursor-pointer rounded-sm border ${pastel} p-5 pt-7 shadow-md transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl ${tilt}`}
      style={{ fontFamily: "'Caveat', 'Kalam', cursive" }}
      onClick={onOpen}
    >
      <div className="pointer-events-none absolute -top-3 left-1/2 z-10 -translate-x-1/2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-b from-rose-400 to-rose-600 shadow-md ring-2 ring-white/80">
          <Pin className="h-3.5 w-3.5 text-white" fill="currentColor" />
        </div>
      </div>
      <div className="pointer-events-none absolute -top-1 left-4 h-4 w-12 -rotate-6 rounded-[2px] bg-amber-200/70 shadow-sm" />

      <span
        className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-sans font-extrabold uppercase tracking-wide ${badgeTone(badge)}`}
      >
        {badge}
      </span>

      <div className="mb-2 flex items-center gap-2">
        <img
          src={photo}
          alt=""
          className="h-8 w-8 rounded-full object-cover ring-2 ring-white shadow-sm"
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_AUTHOR_AVATAR;
          }}
        />
        <p className="font-sans text-[11px] font-bold text-amber-900/80 leading-tight">
          {authorLabel(post)}
        </p>
      </div>

      <h3 className="mt-1 text-xl font-bold leading-snug text-slate-800">{post.title || "Untitled"}</h3>
      <p className="mt-2 line-clamp-4 text-base leading-relaxed text-slate-700">
        {post.content || ""}
      </p>

      {post.proofAttachment ? (
        <img
          src={post.proofAttachment}
          alt=""
          className="mt-3 h-28 w-full rounded-md object-cover shadow-inner"
        />
      ) : null}

      <div
        className="mt-4 flex items-center gap-3 border-t border-amber-200/60 pt-3 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={`flex items-center gap-1 text-xs font-bold transition ${
            liked ? "text-rose-600" : "text-rose-500/80 hover:text-rose-700"
          }`}
          onClick={onLike}
        >
          <Heart className={`h-3.5 w-3.5 ${liked ? "fill-rose-600" : ""}`} /> {likeCount}
        </button>
        <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
          <MessageSquare className="h-3.5 w-3.5" /> {post.commentCount || 0}
        </span>
      </div>
    </article>
  );
}

export function isStickyNoteEligible(post: FirestoreCommunityPost | null | undefined): boolean {
  if (!post) return false;
  return (
    post.authorRole === "business_owner" ||
    post.authorRole === "founder" ||
    post.authorRole === "entrepreneur" ||
    post.authorRole === "investor"
  );
}
