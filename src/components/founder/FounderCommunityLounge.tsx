import { useEffect, useMemo, useRef, useState } from "react";
import {
  Heart,
  MessageSquare,
  Search,
  Bot,
  Trash2,
  Lock,
  Globe,
  Package,
  Lightbulb,
  ShoppingCart,
  Send,
  Upload,
  ImageIcon,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAppState, type CommunityPost } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  subscribeToStickyNotes,
  likeStickyNote,
  type StickyNote,
} from "@/services/founderCommunityService";
import { FounderVideoFeed } from "@/components/founder/FounderVideoFeed";
import { CommunityErrorBoundary } from "@/components/founder/CommunityErrorBoundary";
import { toast, Toaster } from "sonner";
import { getPackagingQuotePrice, getPrimaryPackagingQuote } from "@/lib/communityPostUtils";

export type CommunityUserRole = "entrepreneur" | "investor" | "wholesaler" | "business";
type Tab = "posts" | "strategies" | "packaging" | "videos";

type Props = {
  founderId: string;
  founderUsername: string;
  isOpen: boolean;
  onClose: () => void;
  onViewProfile: (username: string) => void;
  embedded?: boolean;
  userRole?: CommunityUserRole;
  displayName?: string;
};

const STICKY_COLORS = ["#FFD966", "#FFB3C6", "#B5EAD7", "#AED6F1", "#F0E6FF"];

function mapCommunityRole(userRole: CommunityUserRole): CommunityPost["role"] {
  if (userRole === "wholesaler") return "consultant";
  if (userRole === "business") return "business";
  if (userRole === "investor") return "investor";
  return "business";
}

function mapBadge(userRole: CommunityUserRole): CommunityPost["badge"] {
  if (userRole === "wholesaler") return "Verified Consultant";
  if (userRole === "business") return "Business Owner";
  if (userRole === "investor") return "Investor";
  return "Business Owner";
}

export function FounderCommunityLounge({
  founderId,
  founderUsername,
  isOpen,
  onClose,
  onViewProfile,
  embedded = false,
  userRole = "entrepreneur",
  displayName,
}: Props) {
  const navigate = useNavigate();
  const memberName = displayName || founderUsername.replace("u/", "").replace(/_/g, " ");
  const canPost = userRole !== "entrepreneur";

  const {
    isLoggedIn,
    communityPosts: rawCommunityPosts,
    toggleLikePost,
    addCommunityComment,
    addCommunityPost,
    likedPosts: rawLikedPosts,
    deleteCommunityPost,
    mergeCommunityPostsFromBackend,
  } = useAppState();

  const communityPosts = Array.isArray(rawCommunityPosts) ? rawCommunityPosts : [];
  const likedPosts = Array.isArray(rawLikedPosts) ? rawLikedPosts : [];

  const [tab, setTab] = useState<Tab>("posts");
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);

  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState("");
  const [packagingPrice, setPackagingPrice] = useState("");
  const [postKind, setPostKind] = useState<"post" | "strategy" | "packaging">("post");
  const [submittingPost, setSubmittingPost] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    let unsubNotes: (() => void) | undefined;
    let unsubPosts: (() => void) | undefined;

    try {
      unsubNotes = subscribeToStickyNotes(setStickyNotes);
    } catch {
      setStickyNotes([]);
    }

    void import("@/services/firebaseService")
      .then(({ subscribeToCommunityPosts }) => {
        unsubPosts = subscribeToCommunityPosts((posts) => {
          window.setTimeout(() => {
            try {
              mergeCommunityPostsFromBackend(posts);
            } catch {
              /* keep local posts */
            }
          }, 0);
        });
      })
      .catch(() => {});

    return () => {
      unsubNotes?.();
      unsubPosts?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const strategies = useMemo(
    () => communityPosts.filter((p) => p.isMarketingBlueprint || p.category === "Marketing Strategy"),
    [communityPosts],
  );

  const packaging = useMemo(
    () => communityPosts.filter((p) => p.isPackagingReq),
    [communityPosts],
  );

  const requireAuth = (action: () => void) => {
    if (!isLoggedIn) {
      toast.error("Please sign in to interact with community posts.");
      navigate({ to: "/app/login" });
      return;
    }
    action();
  };

  const handleLikeSticky = async (note: StickyNote) => {
    requireAuth(async () => {
      await likeStickyNote(note.id, founderId);
    });
  };

  const handleLikePost = (postId: string) => {
    requireAuth(() => toggleLikePost(postId));
  };

  const handleComment = (postId: string) => {
    const text = commentDraft[postId]?.trim();
    if (!text) return;
    requireAuth(() => {
      addCommunityComment(postId, {
        author: founderUsername,
        avatarColor: "bg-[#FFA500]",
        content: text,
      });
      setCommentDraft((d) => ({ ...d, [postId]: "" }));
      toast.success("Comment posted!");
    });
  };

  const handleDelete = (postId: string, author: string) => {
    if (!author.includes(founderUsername.replace("u/", ""))) {
      toast.error("You can only delete your own posts.");
      return;
    }
    if (!window.confirm("Delete this post permanently?")) return;
    deleteCommunityPost(postId);
    toast.success("Post deleted.");
    setSelectedPost(null);
  };

  const handleImagePick = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPostImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadPostImage = async (): Promise<string> => {
    if (!postImage.startsWith("data:")) return postImage;
    if (founderId.startsWith("local-")) return postImage;
    try {
      const { uploadBase64Image } = await import("@/services/firebaseService");
      return await uploadBase64Image(founderId, `community-${Date.now()}.jpg`, postImage);
    } catch {
      return postImage;
    }
  };

  const submitNewPost = async () => {
    if (!postTitle.trim() || !postContent.trim()) {
      toast.error("Title aur description likhein.");
      return;
    }
    requireAuth(async () => {
      setSubmittingPost(true);
      try {
        const imageUrl = postImage ? await uploadPostImage() : undefined;
        const base = {
          author: founderUsername,
          role: mapCommunityRole(userRole),
          badge: mapBadge(userRole),
          avatarColor: userRole === "wholesaler" ? "bg-cyan-500" : userRole === "investor" ? "bg-violet-500" : "bg-emerald-500",
          title: postTitle.trim(),
          content: postContent.trim(),
          proofAttachment: imageUrl,
        };

        if (postKind === "strategy") {
          addCommunityPost({
            ...base,
            category: "Marketing Strategy",
            isMarketingBlueprint: true,
            beforeMetrics: "Baseline metrics before strategy",
            afterMetrics: "Projected uplift after 90 days",
          });
        } else if (postKind === "packaging") {
          addCommunityPost({
            ...base,
            category: "Packaging",
            isPackagingReq: true,
            materialType: postTitle.trim(),
            packagingQuotes: {
              default: {
                id: "default",
                supplierName: memberName,
                avatarColor: "bg-[#FFA500]",
                price: packagingPrice || "Contact for quote",
                timeline: "7–14 days",
              },
            },
          });
        } else {
          addCommunityPost({
            ...base,
            category: "General",
          });
        }

        setPostTitle("");
        setPostContent("");
        setPostImage("");
        setPackagingPrice("");
        toast.success("Post live — backend synced!");
      } finally {
        setSubmittingPost(false);
      }
    });
  };

  const handleAddToCart = (post: CommunityPost) => {
    requireAuth(() => {
      const price = getPackagingQuotePrice(post.packagingQuotes);
      toast.success(`Added to cart: ${post.title} — ${price}`);
    });
  };

  const handleSendMessage = (post: CommunityPost) => {
    requireAuth(() => {
      toast.success(`Message sent to ${post.author} about "${post.title}"`);
      navigate({ to: "/app/login" });
    });
  };

  if (!isOpen) return null;

  const shellClass = embedded
    ? "flex min-h-[80vh] flex-col rounded-3xl border border-[#FFD700]/20 overflow-hidden"
    : "fixed inset-0 z-50 flex flex-col";

  const tabs: Tab[] = ["posts", "strategies", "packaging", "videos"];

  return (
    <div className={shellClass} style={{ background: "#1a1a2e" }}>
      <Toaster position="bottom-right" theme="dark" closeButton />
      <div className="flex items-center justify-between border-b border-[#FFD700]/20 px-6 py-4">
        <div className="flex items-center gap-3">
          <Globe className="h-6 w-6 text-[#FFD700]" />
          <div>
            <h2 className="font-display text-xl font-bold text-white">Community Lounge</h2>
            <p className="text-xs text-slate-400">Unified feed — investors, wholesalers &amp; business owners</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1 rounded-full border border-[#FFD700]/20 bg-white/5 p-1 sm:flex">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize transition ${
                  tab === t
                    ? "bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#1a1a2e]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t === "posts" ? "📝 Posts" : t === "strategies" ? "💡 Strategies" : t === "packaging" ? "📦 Packaging" : "🎬 Videos"}
              </button>
            ))}
          </div>
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
            {embedded ? "← Back to Dashboard" : "✕ Close"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex gap-1 rounded-full border border-[#FFD700]/20 bg-white/5 p-1 sm:hidden">
            {tabs.map((t) => (
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

          {canPost && tab !== "videos" && (
            <PostComposer
              postKind={postKind}
              onKindChange={setPostKind}
              title={postTitle}
              content={postContent}
              imagePreview={postImage}
              packagingPrice={packagingPrice}
              submitting={submittingPost}
              onTitleChange={setPostTitle}
              onContentChange={setPostContent}
              onPriceChange={setPackagingPrice}
              onImagePick={handleImagePick}
              onClearImage={() => setPostImage("")}
              onSubmit={submitNewPost}
              imageInputRef={imageInputRef}
            />
          )}

          {tab === "posts" && (
            <div>
              {userRole === "entrepreneur" && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
                  <Lock className="h-4 w-4 shrink-0" />
                  Founders post from Profile page. Browse community updates here.
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stickyNotes.map((note, i) => (
                  <div
                    key={note.id}
                    className="founder-sticky-note group relative cursor-pointer rounded-2xl p-5 shadow-lg transition hover:scale-[1.02]"
                    style={{
                      background: note.color || STICKY_COLORS[i % STICKY_COLORS.length],
                      fontFamily: "'Caveat', cursive",
                      minHeight: 160,
                    }}
                    onClick={() => note.author && onViewProfile(note.author)}
                  >
                    <p className="mb-3 text-lg font-semibold leading-snug text-slate-800">{note.content}</p>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span className="font-bold">{note.author}</span>
                      <span className="rounded-full bg-white/50 px-2 py-0.5">{note.category}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLikeSticky(note);
                      }}
                      className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 text-xs font-bold text-red-500"
                    >
                      <Heart className="h-3 w-3" /> {note.likes || 0}
                    </button>
                  </div>
                ))}
                {(communityPosts ?? [])
                  .filter((p) => !p.isMarketingBlueprint && !p.isPackagingReq)
                  .slice(0, 12)
                  .map((post) => (
                    <div
                      key={post.id}
                      className="rounded-2xl border border-[#FFD700]/20 bg-white/5 p-4"
                      onClick={() => setSelectedPost(post)}
                    >
                      <p className="text-xs font-bold text-[#FFD700]">{post.author}</p>
                      <h3 className="mt-1 font-bold text-white">{post.title}</h3>
                      <p className="mt-1 line-clamp-3 text-sm text-slate-400">{post.content}</p>
                      {post.proofAttachment && (
                        <img src={post.proofAttachment} alt="" className="mt-2 h-24 w-full rounded-lg object-cover" />
                      )}
                    </div>
                  ))}
                {stickyNotes.length === 0 && (communityPosts ?? []).length === 0 && (
                  <p className="col-span-3 text-center text-slate-500">No posts yet — be the first!</p>
                )}
              </div>
            </div>
          )}

          {tab === "strategies" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Search strategies..."
                  className="border-[#FFD700]/30 bg-white/5 text-white"
                />
                <Button className="shrink-0 bg-[#FFA500] text-white">
                  <Bot className="mr-1 h-4 w-4" /> Ask AI
                </Button>
              </div>
              {strategies
                .filter(
                  (p) =>
                    !searchQ ||
                    String(p.title ?? "")
                      .toLowerCase()
                      .includes(searchQ.toLowerCase()),
                )
                .map((post) => (
                  <StrategyCard
                    key={post.id}
                    post={post}
                    isLiked={(likedPosts ?? []).includes(post.id)}
                    onLike={() => handleLikePost(post.id)}
                    onComment={(text) => {
                      setCommentDraft((d) => ({ ...d, [post.id]: text }));
                      handleComment(post.id);
                    }}
                    onViewProfile={() => onViewProfile(post.author)}
                  />
                ))}
              {strategies.length === 0 && (
                <p className="text-center text-slate-500">No strategies posted yet.</p>
              )}
            </div>
          )}

          {tab === "packaging" && (
            <div className="space-y-4">
              {packaging.map((post) => {
                const quote = getPrimaryPackagingQuote(post.packagingQuotes);
                const price = quote?.price || "Contact for quote";
                return (
                  <div key={post.id} className="rounded-2xl border border-[#FFD700]/20 bg-white/5 p-5">
                    <div className="mb-2 flex items-center gap-2">
                      <Package className="h-4 w-4 text-[#FFA500]" />
                      <span className="text-xs font-bold text-[#FFD700]">{post.materialType || "Packaging"}</span>
                      <span className="ml-auto rounded-full bg-[#FFD700]/20 px-2 py-0.5 text-xs font-bold text-[#FFD700]">
                        {price}
                      </span>
                    </div>
                    <h3 className="font-bold text-white">{post.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">{post.content}</p>
                    {post.proofAttachment && (
                      <img src={post.proofAttachment} alt="" className="mt-3 h-32 w-full rounded-xl object-cover" />
                    )}
                    <div className="mt-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-xs text-cyan-100">
                      <Sparkles className="mr-1 inline h-3.5 w-3.5" />
                      Consultant tip: {post.materialType || "Eco"} packaging boosts shelf appeal and reduces damage in transit.
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleLikePost(post.id)}
                        className="flex items-center gap-1 text-xs text-[#FFD700]"
                      >
                        <Heart className="h-3.5 w-3.5" /> {post.votes}
                      </button>
                      <Button size="sm" variant="outline" className="border-[#FFD700]/30 text-xs text-[#FFD700]" onClick={() => handleSendMessage(post)}>
                        <Send className="mr-1 h-3 w-3" /> Message
                      </Button>
                      <Button size="sm" className="bg-[#FFA500] text-xs text-white" onClick={() => handleAddToCart(post)}>
                        <ShoppingCart className="mr-1 h-3 w-3" /> Add to Cart — {price}
                      </Button>
                    </div>
                  </div>
                );
              })}
              {packaging.length === 0 && (
                <p className="text-center text-slate-500">Wholesalers: post packaging ideas from the composer above.</p>
              )}
            </div>
          )}

          {tab === "videos" && (
            <CommunityErrorBoundary onReset={() => setTab("posts")}>
              <FounderVideoFeed
                userId={founderId}
                userName={memberName}
                userRole={userRole === "wholesaler" ? "consultant" : userRole}
              />
            </CommunityErrorBoundary>
          )}
        </div>

        <aside className="hidden w-64 shrink-0 overflow-y-auto border-l border-[#FFD700]/10 p-4 xl:block">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#FFD700]/70">Sponsored</p>
          <AdSidebarCard title="Premium Rice Wholesale" subtitle="Gujranwala · Bulk orders from Rs. 45/kg" glow />
          <AdSidebarCard title="Eco Packaging Solutions" subtitle="Biodegradable boxes · MOQ 500 units" />
          <AdSidebarCard title="Mobile Accessories Hub" subtitle="National shipping · Verified wholesaler" glow />
        </aside>
      </div>

      {selectedPost && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#FFD700]/30 bg-[#1a1a2e] p-6">
            <h3 className="font-bold text-white">{selectedPost.title}</h3>
            <p className="mt-2 text-sm text-slate-400">{selectedPost.content}</p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="destructive" onClick={() => handleDelete(selectedPost.id, selectedPost.author)}>
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedPost(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PostComposer({
  postKind,
  onKindChange,
  title,
  content,
  imagePreview,
  packagingPrice,
  submitting,
  onTitleChange,
  onContentChange,
  onPriceChange,
  onImagePick,
  onClearImage,
  onSubmit,
  imageInputRef,
}: {
  postKind: "post" | "strategy" | "packaging";
  onKindChange: (k: "post" | "strategy" | "packaging") => void;
  title: string;
  content: string;
  imagePreview: string;
  packagingPrice: string;
  submitting: boolean;
  onTitleChange: (v: string) => void;
  onContentChange: (v: string) => void;
  onPriceChange: (v: string) => void;
  onImagePick: (f: File | undefined) => void;
  onClearImage: () => void;
  onSubmit: () => void;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="mb-6 rounded-2xl border border-[#FFD700]/25 bg-gradient-to-br from-[#FFD700]/10 to-[#FFA500]/5 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#FFD700]">Create post</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {(["post", "strategy", "packaging"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onKindChange(k)}
            className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
              postKind === k ? "bg-[#FFD700] text-[#1a1a2e]" : "bg-white/10 text-slate-400"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
      <Input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder={postKind === "packaging" ? "Packaging type / material" : "Title"}
        className="mb-2 border-[#FFD700]/30 bg-white/5 text-white"
      />
      <Textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder="Share strategy, update, or packaging details..."
        rows={3}
        className="mb-2 border-[#FFD700]/30 bg-white/5 text-white"
      />
      {postKind === "packaging" && (
        <Input
          value={packagingPrice}
          onChange={(e) => onPriceChange(e.target.value)}
          placeholder="Price e.g. PKR 45/unit"
          className="mb-2 border-[#FFD700]/30 bg-white/5 text-white"
        />
      )}
      <div className="mb-3 flex items-center gap-2">
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onImagePick(e.target.files?.[0])} />
        <Button type="button" size="sm" variant="outline" className="border-[#FFD700]/30 text-xs" onClick={() => imageInputRef.current?.click()}>
          <ImageIcon className="mr-1 h-3.5 w-3.5" /> Upload image
        </Button>
        {imagePreview && (
          <>
            <img src={imagePreview} alt="" className="h-10 w-10 rounded-lg object-cover" />
            <button type="button" className="text-xs text-red-400" onClick={onClearImage}>
              Remove
            </button>
          </>
        )}
      </div>
      <Button disabled={submitting} className="bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#1a1a2e] font-bold" onClick={onSubmit}>
        <Upload className="mr-1 h-4 w-4" /> {submitting ? "Publishing..." : "Publish to Community"}
      </Button>
    </div>
  );
}

function StrategyCard({
  post,
  isLiked,
  onLike,
  onComment,
  onViewProfile,
}: {
  post: CommunityPost;
  isLiked: boolean;
  onLike: () => void;
  onComment: (text: string) => void;
  onViewProfile: () => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="rounded-2xl border border-[#FFD700]/20 bg-white/5 p-5">
      <div className="mb-3 flex items-center gap-3">
        <div
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
          onClick={onViewProfile}
        >
          {post.author.charAt(2)?.toUpperCase() ?? "U"}
        </div>
        <div>
          <button type="button" onClick={onViewProfile} className="text-sm font-bold text-[#FFD700] hover:underline">
            {post.author}
          </button>
          <p className="text-[10px] text-slate-500">{post.time}</p>
        </div>
      </div>
      <h3 className="font-bold text-white">{post.title}</h3>
      <p className="mt-1 text-sm text-slate-400">{post.content}</p>
      {post.proofAttachment && (
        <img src={post.proofAttachment} alt="" className="mt-3 max-h-48 w-full rounded-xl object-cover" />
      )}
      {post.beforeMetrics && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-red-500/10 p-2 text-red-300">
            <p className="font-bold">Before</p>
            <p>{post.beforeMetrics}</p>
          </div>
          <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-300">
            <p className="font-bold">After</p>
            <p>{post.afterMetrics}</p>
          </div>
        </div>
      )}
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={onLike} className={`flex items-center gap-1 text-xs ${isLiked ? "text-red-400" : "text-slate-400"}`}>
          <Heart className="h-3.5 w-3.5" fill={isLiked ? "currentColor" : "none"} /> {post.votes}
        </button>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <MessageSquare className="h-3.5 w-3.5" /> {(post.comments ?? []).length}
        </span>
        <Lightbulb className="ml-auto h-4 w-4 text-[#FFD700]" />
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none"
        />
        <Button size="sm" className="bg-[#FFA500] text-xs text-white" onClick={() => { onComment(draft); setDraft(""); }}>
          Post
        </Button>
      </div>
    </div>
  );
}

function AdSidebarCard({ title, subtitle, glow }: { title: string; subtitle: string; glow?: boolean }) {
  return (
    <div
      className={`mb-3 cursor-pointer rounded-2xl border p-4 transition hover:scale-[1.02] ${
        glow ? "founder-ad-glow border-[#FFD700]/50" : "border-white/10"
      }`}
      style={{ background: "rgba(255,215,0,0.05)" }}
    >
      <p className="text-sm font-bold text-[#FFD700]">{title}</p>
      <p className="mt-1 text-[10px] text-slate-400">{subtitle}</p>
    </div>
  );
}
