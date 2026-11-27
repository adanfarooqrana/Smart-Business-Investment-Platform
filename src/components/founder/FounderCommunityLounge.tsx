import { useEffect, useMemo, useRef, useState } from "react";
import {
  Heart,
  MessageSquare,
  Bot,
  Trash2,
  Lock,
  Globe,
  Send,
  Upload,
  ImageIcon,
  LogOut,
  User,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FounderVideoFeed } from "@/components/founder/FounderVideoFeed";
import { CommunityErrorBoundary } from "@/components/founder/CommunityErrorBoundary";
import { CommunityGuestAuthPanel, clearCommunitySession } from "@/components/community/CommunityGuestAuthPanel";
import { StickyNotePostCard } from "@/components/community/StickyNotePostCard";
import { toast, Toaster } from "sonner";
import { formatPostAuthorLabel } from "@/lib/communityPostUtils";
import {
  subscribeToFirestorePosts,
  createFirestorePost,
  toggleFirestorePostLike,
  addFirestoreComment,
  shareFirestorePost,
  subscribeToFirestoreComments,
  deleteFirestorePost,
  purgeAllCommunityFeed,
  mapAuthorRoleFromCommunity,
  mapBadgeFromAuthorRole,
  resolveAuthorDisplayName,
  DEFAULT_AUTHOR_AVATAR,
  normalizeLikes,
  type FirestoreCommunityPost,
  type FirestoreComment,
} from "@/services/communityFirestoreService";

export type CommunityUserRole =
  | "entrepreneur"
  | "investor"
  | "wholesaler"
  | "business"
  | "guest"
  | "community_member";

export { formatPostAuthorLabel };

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
  businessName?: string;
  ownerName?: string;
  /** Optional avatar / business logo URL saved on create */
  authorPhoto?: string;
  backLabel?: string;
  /** public = Landing; workspace = Dashboard Community */
  entry?: "public" | "workspace";
};

export function FounderCommunityLounge({
  founderId = "local-guest",
  founderUsername = "u/member",
  isOpen,
  onClose,
  embedded = false,
  userRole = "entrepreneur",
  displayName,
  businessName,
  ownerName,
  authorPhoto,
  backLabel,
  entry = "public",
}: Props) {
  const { currentUser, userData, refreshUserData, logout, loading: authLoading } = useAuth();
  const safeUsername = String(founderUsername || "u/member");
  const memberName =
    String(ownerName || displayName || "").trim() ||
    safeUsername.replace(/^u\//, "").replace(/_/g, " ") ||
    (userRole === "business" ? "Business Owner" : "Entrepreneur");
  const memberEmail = String(currentUser?.email || userData?.email || "");
  const memberPhoto =
    String(authorPhoto || currentUser?.photoURL || "").trim() ||
    String((userData as { avatarUrl?: string; photoURL?: string } | null)?.avatarUrl || "").trim() ||
    String((userData as { photoURL?: string } | null)?.photoURL || "").trim() ||
    DEFAULT_AUTHOR_AVATAR;

  const authRole = String(userData?.role || "").trim().toLowerCase();
  const isFounderAccount =
    userRole === "entrepreneur" ||
    authRole === "founder" ||
    authRole === "entrepreneur";
  const isBusinessAccount =
    userRole === "business" || authRole === "business_owner" || authRole === "business";
  const isInvestorAccount =
    userRole === "investor" || authRole === "investor";

  const roleIsWorkspace = isFounderAccount || isBusinessAccount || isInvestorAccount;

  /**
   * Posting + Dashboard chrome when entered from Workspace (Founder Suite / BO Dashboard).
   * Landing (`entry=public`) never unlocks workspace posting.
   */
  const isWorkspacePoster = entry === "workspace" && roleIsWorkspace;

  const canPost = !!currentUser && isWorkspacePoster;

  /** BO/Founder from Dashboard: logout only via Sidebar. Members/guests: show Log out. */
  const showBannerLogout = !!currentUser && !isWorkspacePoster;

  const canEngage = !!currentUser;

  /** Hide Join Community for Founder Suite / workspace sessions (never treat as guest). */
  const showGuestJoin =
    !authLoading && !currentUser && entry !== "workspace";

  const resolvedBackLabel =
    backLabel ||
    (isWorkspacePoster ? "← Back to Dashboard" : "← Back to Home");

  const bannerSubtext = canPost
    ? isFounderAccount
      ? "Verified Entrepreneur (Full Posting Authority)"
      : isBusinessAccount
        ? "Verified Business Owner — You have full posting authority."
        : "Verified Investor — You have full posting authority."
    : "Community Member — You can like & comment. Posting is restricted to verified Entrepreneurs & Investors.";

  const [livePosts, setLivePosts] = useState<FirestoreCommunityPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("posts");
  const [searchQ, setSearchQ] = useState("");
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [selectedPost, setSelectedPost] = useState<FirestoreCommunityPost | null>(null);
  const [liveComments, setLiveComments] = useState<FirestoreComment[]>([]);
  const [authTick, setAuthTick] = useState(0);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState("");
  const [packagingPrice, setPackagingPrice] = useState("");
  const [postKind, setPostKind] = useState<"post" | "strategy" | "packaging">("post");
  const [submittingPost, setSubmittingPost] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Real-time Firestore posts feed — wipe leftover posts once, then subscribe
  useEffect(() => {
    if (!isOpen) return;
    setFeedLoading(true);
    let cancelled = false;
    let unsub: (() => void) | undefined;

    void (async () => {
      try {
        const key = "smartbiz_community_feed_purged_v3";
        if (typeof window !== "undefined" && !sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
        }
      } catch (err) {
        console.warn("Community feed check skipped:", err);
      }
      if (cancelled) return;
      try {
        unsub = subscribeToFirestorePosts((posts) => {
          if (cancelled) return;
          setLivePosts(Array.isArray(posts) ? posts.filter(Boolean) : []);
          setFeedLoading(false);
        });
      } catch (err) {
        console.warn("Community feed subscribe failed:", err);
        setLivePosts([]);
        setFeedLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      try {
        unsub?.();
      } catch {
        /* ignore */
      }
    };
  }, [isOpen]);

  // Live comments for selected post
  useEffect(() => {
    if (!selectedPost?.id) {
      setLiveComments([]);
      return;
    }
    const unsub = subscribeToFirestoreComments(selectedPost.id, setLiveComments);
    return () => unsub();
  }, [selectedPost?.id]);

  // Keep selected post in sync with live feed
  useEffect(() => {
    if (!selectedPost) return;
    const fresh = livePosts.find((p) => p.id === selectedPost.id);
    if (fresh) setSelectedPost(fresh);
  }, [livePosts, selectedPost?.id]);

  const generalPosts = useMemo(
    () => livePosts.filter((p) => p.category === "General" || (!p.isMarketingBlueprint && !p.isPackagingReq)),
    [livePosts],
  );

  const strategies = useMemo(
    () => livePosts.filter((p) => p.isMarketingBlueprint || p.category === "Marketing Strategy"),
    [livePosts],
  );

  const packaging = useMemo(
    () => livePosts.filter((p) => p.isPackagingReq || p.category === "Packaging"),
    [livePosts],
  );

  const requireEngage = (action: () => void) => {
    if (!currentUser) {
      setAuthModalOpen(true);
      toast.message("Join Community to like and comment.");
      return;
    }
    action();
  };

  const handleCommunityLogout = async () => {
    try {
      clearCommunitySession();
      await logout();
      setAuthModalOpen(false);
      setAuthTick((n) => n + 1);
      toast.success("Logged out. Join again anytime.");
      // Stay on public community — restore guest auth box (do NOT go to Dashboard)
    } catch {
      toast.error("Logout failed.");
    }
  };

  const handleLikePost = (post: FirestoreCommunityPost) => {
    requireEngage(async () => {
      if (!currentUser?.uid || !post?.id) return;
      const likes = normalizeLikes(post.likes);
      const liked = likes.includes(currentUser.uid);
      try {
        await toggleFirestorePostLike(post.id, currentUser.uid, liked);
      } catch (err) {
        console.warn(err);
        toast.error("Could not update like.");
      }
    });
  };

  const handleSharePost = (post: FirestoreCommunityPost) => {
    requireEngage(async () => {
      if (!post?.id) return;
      try {
        await shareFirestorePost(post.id);
        const url = `${window.location.origin}/app/community?entry=public`;
        if (navigator.share) {
          await navigator.share({ title: post.title, text: post.content, url }).catch(() => { });
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          toast.success("Link copied — share count updated.");
          return;
        }
        toast.success("Shared!");
      } catch (err) {
        console.warn(err);
        toast.error("Could not share post.");
      }
    });
  };

  const handleComment = (postId: string) => {
    const text = commentDraft[postId]?.trim();
    if (!text) return;
    requireEngage(async () => {
      if (!currentUser) return;
      try {
        await addFirestoreComment({
          postId,
          userId: currentUser.uid,
          userName: memberName,
          userEmail: memberEmail,
          commentText: text,
        });
        setCommentDraft((d) => ({ ...d, [postId]: "" }));
        toast.success("Comment posted!");
      } catch (err) {
        console.warn(err);
        toast.error("Could not post comment.");
      }
    });
  };

  const handleDelete = async (post: FirestoreCommunityPost) => {
    if (!currentUser || post.authorUid !== currentUser.uid) {
      toast.error("You can only delete your own posts.");
      return;
    }
    if (!window.confirm("Delete this post permanently?")) return;
    try {
      await deleteFirestorePost(post.id, post.authorUid, currentUser.uid);
      setSelectedPost(null);
      toast.success("Post deleted.");
    } catch (err) {
      console.warn(err);
      toast.error("Could not delete post.");
    }
  };

  const handleImagePick = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPostImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadPostImage = async (): Promise<string | undefined> => {
    if (!postImage) return undefined;
    if (!postImage.startsWith("data:") && /^https?:\/\//i.test(postImage)) return postImage;
    try {
      const { uploadToCloudinary } = await import("@/lib/cloudinaryUpload");
      toast.message("Uploading image...");
      const url = await uploadToCloudinary(postImage, "community_images");
      toast.success("Upload complete");
      return url;
    } catch (err) {
      console.warn("Cloudinary community image failed, trying Firebase Storage:", err);
      if (String(founderId || "").startsWith("local-") || !currentUser) return postImage;
      try {
        const { uploadBase64Image } = await import("@/services/firebaseService");
        return await uploadBase64Image(currentUser.uid, `community-${Date.now()}.jpg`, postImage);
      } catch {
        return postImage;
      }
    }
  };

  const submitNewPost = async () => {
    if (!canPost || !currentUser) {
      toast.error("Only Business Owners, Entrepreneurs, and Investors can post.");
      return;
    }
    if (!postTitle.trim() || !postContent.trim()) {
      toast.error("Please fill in title and description.");
      return;
    }
    setSubmittingPost(true);
    try {
      const imageUrl = await uploadPostImage();
      // Prefer explicit founder metadata when Founder Suite / auth role is founder
      const authorRole = isFounderAccount
        ? "founder"
        : mapAuthorRoleFromCommunity(userRole, authRole);
      const badge = mapBadgeFromAuthorRole(authorRole);
      const resolvedName = resolveAuthorDisplayName({
        displayName:
          memberName ||
          currentUser.displayName ||
          (isFounderAccount ? "Entrepreneur" : undefined),
        businessName,
        email: memberEmail || currentUser.email,
        role: authorRole,
      });

      await createFirestorePost({
        title: postTitle.trim(),
        content: postContent.trim(),
        category:
          postKind === "strategy" ? "Marketing Strategy" : postKind === "packaging" ? "Packaging" : "General",
        authorUid: currentUser.uid,
        authorName: resolvedName || currentUser.displayName || "Entrepreneur",
        authorPhoto: memberPhoto || currentUser.photoURL || DEFAULT_AUTHOR_AVATAR,
        authorEmail: memberEmail || currentUser.email || undefined,
        businessName: authorRole === "business_owner" ? businessName || undefined : undefined,
        authorRole,
        badge,
        proofAttachment: imageUrl,
        isMarketingBlueprint: postKind === "strategy",
        isPackagingReq: postKind === "packaging",
        materialType: postKind === "packaging" ? postTitle.trim() : undefined,
        packagingPrice: postKind === "packaging" ? packagingPrice || undefined : undefined,
      });

      setPostTitle("");
      setPostContent("");
      setPostImage("");
      setPackagingPrice("");
      setPostKind("post");
      toast.success("Sticky note published — live on Firestore.");
    } catch (err) {
      console.warn(err);
      toast.error("Failed to publish post.");
    } finally {
      setSubmittingPost(false);
    }
  };

  if (!isOpen) return null;

  const shellClass = embedded
    ? "flex min-h-[80vh] flex-col rounded-3xl border border-[#FFD700]/20 overflow-hidden"
    : "fixed inset-0 z-50 flex flex-col";

  const tabs: Tab[] = ["posts", "strategies", "packaging", "videos"];
  const uid = currentUser?.uid;

  const renderFeed = (posts: FirestoreCommunityPost[], emptyMsg: string) => (
    <div
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
        backgroundSize: "18px 18px",
      }}
    >
      {feedLoading && (
        <p className="col-span-3 text-center text-slate-500">Loading live posts…</p>
      )}
      {!feedLoading &&
        posts.map((post, i) => (
          <StickyNotePostCard
            key={post.id}
            post={post}
            index={i}
            liked={!!uid && normalizeLikes(post.likes).includes(uid)}
            onOpen={() => setSelectedPost(post)}
            onLike={() => handleLikePost(post)}
            onShare={() => handleSharePost(post)}
          />
        ))}
      {!feedLoading && posts.length === 0 && (
        <p className="col-span-3 rounded-2xl border border-dashed border-[#FFD700]/25 bg-white/5 px-6 py-10 text-center text-sm text-slate-400">
          {emptyMsg}
        </p>
      )}
    </div>
  );

  return (
    <div className={shellClass} style={{ background: "#1a1a2e" }} key={authTick}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Kalam:wght@400;700&display=swap');`}</style>
      <Toaster position="bottom-right" theme="dark" closeButton />

      <div className="flex items-center justify-between border-b border-[#FFD700]/20 px-6 py-4">
        <div className="flex items-center gap-3">
          <Globe className="h-6 w-6 text-[#FFD700]" />
          <div>
            <h2 className="font-display text-xl font-bold text-white">Community Lounge</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1 rounded-full border border-[#FFD700]/20 bg-white/5 p-1 sm:flex">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize transition ${tab === t
                  ? "bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#1a1a2e]"
                  : "text-slate-400 hover:text-white"
                  }`}
              >
                {t === "posts" ? "📝 Posts" : t === "strategies" ? "💡 Strategies" : t === "packaging" ? "📦 Packaging" : "🎬 Videos"}
              </button>
            ))}
          </div>
          {showGuestJoin && (
            <Button
              size="sm"
              className="rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-xs font-bold text-[#1a1a2e]"
              onClick={() => setAuthModalOpen(true)}
            >
              Join Community
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
            {resolvedBackLabel}
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
                className={`flex-1 rounded-full py-1.5 text-[10px] font-bold capitalize ${tab === t ? "bg-[#FFD700] text-[#1a1a2e]" : "text-slate-400"
                  }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Guest Join — ONLY for Landing/public entry (never Founder Suite workspace) */}
          {showGuestJoin && (
            <CommunityGuestAuthPanel
              open={authModalOpen || tab !== "videos"}
              variant={authModalOpen ? "modal" : "panel"}
              onClose={() => setAuthModalOpen(false)}
              onAuthenticated={async () => {
                setAuthModalOpen(false);
                window.setTimeout(async () => {
                  const uid = (await import("@/firebase")).auth.currentUser?.uid;
                  if (uid) await refreshUserData(uid);
                  setAuthTick((n) => n + 1);
                }, 100);
              }}
            />
          )}

          {entry === "workspace" && !currentUser && !authLoading && (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
              Entrepreneur session expired. Please sign in again from the Entrepreneur Suite to publish.
            </div>
          )}

          {/* Logged-in banner — members show Log out; workspace posters do not */}
          {currentUser && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#FFD700]/30 bg-gradient-to-r from-[#FFD700]/10 to-[#FFA500]/5 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFD700]/20 text-[#FFD700]">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    Logged in as {memberName}
                    {memberEmail ? (
                      <span className="font-normal text-slate-400"> ({memberEmail})</span>
                    ) : null}
                    {canPost && isFounderAccount ? (
                      <span className="font-normal text-[#FFD700]"> — {bannerSubtext}</span>
                    ) : null}
                  </p>
                  {!(canPost && isFounderAccount) ? (
                    <p className="text-[11px] text-slate-400">{bannerSubtext}</p>
                  ) : null}
                </div>
              </div>
              {showBannerLogout ? (
                <Button
                  size="sm"
                  className="shrink-0 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#1a1a2e] font-bold hover:opacity-90 border-none shadow-md"
                  onClick={handleCommunityLogout}
                >
                  <LogOut className="mr-1.5 h-3.5 w-3.5" /> Log out
                </Button>
              ) : null}
            </div>
          )}

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

          {currentUser && !canPost && tab !== "videos" && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-500/30 bg-white/5 px-4 py-3 text-xs text-slate-300">
              <Lock className="h-4 w-4 shrink-0 text-slate-400" />
              Create Post is hidden for community members. Like and comment on sticky notes below.
            </div>
          )}

          {tab === "posts" &&
            renderFeed(
              generalPosts,
              "No business posts yet. Posts from verified founders will appear here.",
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
              {renderFeed(
                strategies.filter(
                  (p) =>
                    !searchQ ||
                    p.title.toLowerCase().includes(searchQ.toLowerCase()),
                ),
                "No strategies yet. Verified accounts can publish via Create Post → Strategy.",
              )}
            </div>
          )}

          {tab === "packaging" &&
            renderFeed(packaging, "No packaging posts yet. Use Create Post → Packaging.")}

          {tab === "videos" && (
            <CommunityErrorBoundary onReset={() => setTab("posts")}>
              <FounderVideoFeed
                userId={founderId}
                userName={memberName}
                userRole={
                  userRole === "wholesaler"
                    ? "consultant"
                    : userRole === "community_member"
                      ? "guest"
                      : userRole
                }
              />
            </CommunityErrorBoundary>
          )}
        </div>
      </div>

      {selectedPost && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#FFD700]/30 bg-[#1a1a2e] p-6">
            <span className="rounded-full bg-[#FFD700]/20 px-2 py-0.5 text-[10px] font-bold uppercase text-[#FFD700]">
              {selectedPost.badge}
            </span>
            <div className="mt-3 flex items-center gap-3">
              <img
                src={selectedPost.authorPhoto || DEFAULT_AUTHOR_AVATAR}
                alt=""
                className="h-10 w-10 rounded-full object-cover ring-2 ring-[#FFD700]/40"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_AUTHOR_AVATAR;
                }}
              />
              <p className="text-xs font-bold text-[#FFD700]">
                {selectedPost.businessName
                  ? `${selectedPost.businessName} · ${selectedPost.authorName}`
                  : selectedPost.authorName || "Business Owner"}
              </p>
            </div>
            <h3 className="mt-2 font-bold text-white">{selectedPost.title}</h3>
            <p className="mt-2 text-sm text-slate-400">{selectedPost.content}</p>
            {selectedPost.proofAttachment && (
              <img
                src={selectedPost.proofAttachment}
                alt=""
                className="mt-3 max-h-56 w-full rounded-xl object-cover"
              />
            )}

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                className={`flex items-center gap-1 text-xs font-bold ${uid && normalizeLikes(selectedPost.likes).includes(uid) ? "text-rose-400" : "text-[#FFD700]"
                  }`}
                onClick={() => handleLikePost(selectedPost)}
              >
                <Heart
                  className={`h-3.5 w-3.5 ${uid && normalizeLikes(selectedPost.likes).includes(uid) ? "fill-rose-400" : ""}`}
                />{" "}
                {normalizeLikes(selectedPost.likes).length}
              </button>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <MessageSquare className="h-3.5 w-3.5" /> {liveComments.length}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Comments</p>
              {liveComments.length === 0 && (
                <p className="text-xs text-slate-500">No comments yet — be the first.</p>
              )}
              {liveComments.map((c) => (
                <div key={c.commentId} className="rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300">
                  <span className="font-bold text-[#FFD700]">{c.userName}</span>
                  {c.userEmail ? <span className="text-slate-500"> · {c.userEmail}</span> : null}
                  <p className="mt-0.5 text-slate-300">{c.commentText}</p>
                </div>
              ))}
              {canEngage && (
                <div className="flex gap-2 pt-1">
                  <Input
                    value={commentDraft[selectedPost.id] || ""}
                    onChange={(e) =>
                      setCommentDraft((d) => ({ ...d, [selectedPost.id]: e.target.value }))
                    }
                    placeholder="Write a comment..."
                    className="border-[#FFD700]/30 bg-white/5 text-white"
                  />
                  <Button
                    size="sm"
                    className="bg-[#FFA500] text-white"
                    onClick={() => handleComment(selectedPost.id)}
                  >
                    Send
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              {currentUser && selectedPost.authorUid === currentUser.uid && (
                <Button size="sm" variant="destructive" onClick={() => handleDelete(selectedPost)}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setSelectedPost(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal-only auth when guest tries like/comment while panel hidden (e.g. videos tab) */}
      {showGuestJoin && authModalOpen && tab === "videos" && (
        <CommunityGuestAuthPanel
          open
          variant="modal"
          onClose={() => setAuthModalOpen(false)}
          onAuthenticated={async () => {
            setAuthModalOpen(false);
            setAuthTick((n) => n + 1);
          }}
        />
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
            className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${postKind === k ? "bg-[#FFD700] text-[#1a1a2e]" : "bg-white/10 text-slate-400"
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
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onImagePick(e.target.files?.[0])}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-[#FFD700]/30 text-xs"
          onClick={() => imageInputRef.current?.click()}
        >
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
      <Button
        disabled={submitting}
        className="bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#1a1a2e] font-bold"
        onClick={onSubmit}
      >
        <Upload className="mr-1 h-4 w-4" /> {submitting ? "Publishing..." : "Publish to Community"}
      </Button>
    </div>
  );
}
