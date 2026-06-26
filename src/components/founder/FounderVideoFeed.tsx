import { useEffect, useRef, useState } from "react";
import {
  Video,
  Heart,
  MessageSquare,
  Star,
  Users,
  Upload,
  Lightbulb,
  Send,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToVideos,
  uploadCommunityVideo,
  toggleVideoLike,
  toggleVideoFavorite,
  addVideoComment,
  subscribeToVideoComments,
  subscribeToVideoLikeState,
  subscribeToVideoCommentCount,
  postVideoAdvice,
  subscribeToVideoAdvice,
  requestGroupJoin,
  type CommunityVideo,
  type VideoAdvice,
  type VideoComment,
} from "@/services/realtimeDataService";

type Props = {
  userId: string;
  userName: string;
  userRole: string;
};

type VideoEngagement = {
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

export function FounderVideoFeed({ userId, userName, userRole }: Props) {
  const { currentUser } = useAuth();
  const authUid = currentUser?.uid ?? userId;

  const [videos, setVideos] = useState<CommunityVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [engagement, setEngagement] = useState<Record<string, VideoEngagement>>({});
  const [selected, setSelected] = useState<CommunityVideo | null>(null);
  const [advice, setAdvice] = useState<VideoAdvice[]>([]);
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [comment, setComment] = useState("");
  const [adviceText, setAdviceText] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState<CommunityVideo["category"]>("general");
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [submittingComment, setSubmittingComment] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mediaPreview, setMediaPreview] = useState("");

  // Live listener: video_lounge/videos/
  useEffect(() => {
    setLoadingVideos(true);
    const unsub = subscribeToVideos((list) => {
      setVideos(list);
      setLoadingVideos(false);
    });
    return unsub;
  }, []);

  // Per-video like counts from video_lounge/likes/{videoId}/
  useEffect(() => {
    if (videos.length === 0) return;
    const unsubs = videos.map((v) =>
      subscribeToVideoLikeState(v.id, authUid, ({ count, likedByMe }) => {
        setEngagement((prev) => ({
          ...prev,
          [v.id]: {
            ...prev[v.id],
            likeCount: count,
            likedByMe,
            commentCount: prev[v.id]?.commentCount ?? 0,
          },
        }));
      }),
    );
    return () => unsubs.forEach((u) => u());
  }, [videos, authUid]);

  // Per-video comment counts from video_lounge/comments/{videoId}/
  useEffect(() => {
    if (videos.length === 0) return;
    const unsubs = videos.map((v) =>
      subscribeToVideoCommentCount(v.id, (count) => {
        setEngagement((prev) => ({
          ...prev,
          [v.id]: {
            likeCount: prev[v.id]?.likeCount ?? 0,
            likedByMe: prev[v.id]?.likedByMe ?? false,
            commentCount: count,
          },
        }));
      }),
    );
    return () => unsubs.forEach((u) => u());
  }, [videos]);

  useEffect(() => {
    if (!selected) {
      setComments([]);
      return;
    }
    const unsub = subscribeToVideoComments(selected.id, setComments);
    return unsub;
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const unsub = subscribeToVideoAdvice(selected.id, setAdvice);
    return unsub;
  }, [selected]);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setMediaPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!authUid) {
      toast.error("Firebase login required to upload.");
      return;
    }
    if (!title.trim() || !mediaPreview) {
      toast.error("Add a title and video/image file.");
      return;
    }
    const isVideo = mediaPreview.startsWith("data:video");
    try {
      await uploadCommunityVideo({
        userId: authUid,
        author: userName,
        role: userRole,
        title: title.trim(),
        caption: caption.trim(),
        videoUrl: isVideo ? mediaPreview : "",
        imageUrl: !isVideo ? mediaPreview : undefined,
        thumbnailUrl: !isVideo ? mediaPreview : undefined,
        category,
      });
      toast.success("Posted to Video Lounge!");
      setTitle("");
      setCaption("");
      setMediaPreview("");
    } catch {
      toast.error("Failed to upload video.");
    }
  };

  const handleLike = async (v: CommunityVideo) => {
    if (!authUid) {
      toast.error("Sign in to like videos.");
      return;
    }
    try {
      await toggleVideoLike(v.id, authUid);
    } catch {
      toast.error("Could not update like.");
    }
  };

  const handleFavorite = async (v: CommunityVideo) => {
    if (!authUid) return;
    const fav = favIds.has(v.id);
    try {
      await toggleVideoFavorite(v.id, authUid);
      setFavIds((s) => {
        const n = new Set(s);
        if (fav) n.delete(v.id);
        else n.add(v.id);
        return n;
      });
      toast.success(fav ? "Removed from favorites" : "Added to favorites!");
    } catch {
      toast.error("Could not update favorite.");
    }
  };

  const handleComment = async () => {
    if (!selected || !comment.trim()) return;
    if (!authUid) {
      toast.error("Sign in to comment.");
      return;
    }
    setSubmittingComment(true);
    try {
      await addVideoComment(selected.id, authUid, userName, comment.trim());
      setComment("");
      toast.success("Comment posted!");
    } catch {
      toast.error("Failed to post comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const getEngagement = (videoId: string): VideoEngagement =>
    engagement[videoId] ?? { likeCount: 0, commentCount: 0, likedByMe: false };

  return (
    <section
      className="mb-8 overflow-hidden rounded-3xl border border-[#FFD700]/20"
      style={{ background: "rgba(255,255,255,0.03)" }}
    >
      <div className="flex flex-col gap-4 border-b border-[#FFD700]/15 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
            <Video className="h-5 w-5 text-[#FFD700]" /> Video Lounge
          </h2>
          <p className="text-xs text-slate-400">
            Firebase feed — videos, likes, comments &amp; advice
          </p>
        </div>
        <Button size="sm" className="bg-[#FFA500] text-white" onClick={() => fileRef.current?.click()}>
          <Upload className="mr-1 h-3.5 w-3.5" /> Upload Video / Image
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="video/*,image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {mediaPreview && (
        <div className="border-b border-[#FFD700]/10 p-5">
          <div className="mb-3 flex gap-4">
            {mediaPreview.startsWith("data:video") ? (
              <video src={mediaPreview} className="h-32 w-48 rounded-xl object-cover" controls />
            ) : (
              <img src={mediaPreview} alt="" className="h-32 w-48 rounded-xl object-cover" />
            )}
            <div className="flex-1 space-y-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title..."
                className="border-white/10 bg-white/5 text-white"
              />
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Caption..."
                className="border-white/10 bg-white/5 text-white"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CommunityVideo["category"])}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              >
                <option value="general">General</option>
                <option value="packaging">Packaging</option>
                <option value="strategy">Strategy</option>
                <option value="profile">Profile</option>
              </select>
              <Button
                className="bg-gradient-to-r from-[#FFD700] to-[#FFA500] font-bold text-[#1a1a2e]"
                onClick={handleUpload}
              >
                Post to Video Lounge
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 p-5 lg:grid-cols-[1fr_320px]">
        <div className="max-h-[600px] space-y-4 overflow-y-auto pr-2">
          {loadingVideos ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading videos...
            </div>
          ) : videos.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">No videos yet. Be the first to upload!</p>
          ) : (
            videos.map((v) => {
              const eg = getEngagement(v.id);
              return (
                <div
                  key={v.id}
                  className={`cursor-pointer rounded-2xl border p-4 transition hover:border-[#FFD700]/40 ${
                    selected?.id === v.id ? "border-[#FFD700]/50 bg-[#FFD700]/5" : "border-white/10 bg-white/5"
                  }`}
                  onClick={() => setSelected(v)}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-xs font-bold text-[#1a1a2e]">
                      {v.author.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{v.author}</p>
                      <p className="text-[10px] text-slate-500">
                        {v.role} · {v.category}
                      </p>
                    </div>
                  </div>
                  <h3 className="font-bold text-white">{v.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{v.caption}</p>
                  {v.videoUrl ? (
                    <video
                      src={v.videoUrl}
                      className="mt-3 max-h-48 w-full rounded-xl object-cover"
                      controls
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : v.imageUrl ? (
                    <img src={v.imageUrl} alt="" className="mt-3 max-h-48 w-full rounded-xl object-cover" />
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleLike(v);
                      }}
                      className={`flex items-center gap-1 text-xs ${eg.likedByMe ? "text-red-400" : "text-slate-400"}`}
                    >
                      <Heart className="h-3.5 w-3.5" fill={eg.likedByMe ? "currentColor" : "none"} />{" "}
                      {eg.likeCount}
                    </button>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <MessageSquare className="h-3.5 w-3.5" /> {eg.commentCount}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleFavorite(v);
                      }}
                      className={`flex items-center gap-1 text-xs ${favIds.has(v.id) ? "text-[#FFD700]" : "text-slate-400"}`}
                    >
                      <Star className="h-3.5 w-3.5" fill={favIds.has(v.id) ? "currentColor" : "none"} /> Favorite
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void requestGroupJoin("default-group", authUid, userName);
                        toast.success("Group join request sent!");
                      }}
                      className="flex items-center gap-1 text-xs text-[#FFA500]"
                    >
                      <Users className="h-3.5 w-3.5" /> Join Group
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <aside className="rounded-2xl border border-[#FFD700]/15 bg-white/5 p-4">
          {selected ? (
            <div>
              <h3 className="mb-3 font-bold text-white">{selected.title}</h3>

              <div className="mb-3 max-h-28 space-y-2 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-[10px] text-slate-500">No comments yet.</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="rounded-xl bg-white/5 p-2 text-xs">
                      <p className="font-bold text-[#FFD700]">{c.userName}</p>
                      <p className="text-slate-300">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="mb-3 max-h-24 space-y-2 overflow-y-auto">
                {advice.map((a) => (
                  <div key={a.id} className="rounded-xl bg-[#FFD700]/10 p-2 text-xs">
                    <p className="flex items-center gap-1 font-bold text-[#FFD700]">
                      <Lightbulb className="h-3 w-3" /> {a.fromName}
                    </p>
                    <p className="text-slate-300">{a.advice}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void handleComment()}
                  placeholder="Comment..."
                  className="h-8 border-white/10 bg-white/5 text-xs text-white"
                />
                <Button
                  size="sm"
                  disabled={submittingComment}
                  className="w-full bg-[#FFA500] text-xs text-white"
                  onClick={() => void handleComment()}
                >
                  {submittingComment ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="mr-1 h-3 w-3" />
                  )}{" "}
                  Comment
                </Button>
                <Input
                  value={adviceText}
                  onChange={(e) => setAdviceText(e.target.value)}
                  placeholder="Give advice..."
                  className="h-8 border-white/10 bg-white/5 text-xs text-white"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-[#FFD700]/30 text-xs text-[#FFD700]"
                  onClick={async () => {
                    if (!adviceText.trim() || !authUid) return;
                    await postVideoAdvice({
                      videoId: selected.id,
                      fromUserId: authUid,
                      fromName: userName,
                      advice: adviceText.trim(),
                    });
                    setAdviceText("");
                    toast.success("Advice posted!");
                  }}
                >
                  <Lightbulb className="mr-1 h-3 w-3" /> Post Advice
                </Button>
              </div>
            </div>
          ) : (
            <p className="py-12 text-center text-xs text-slate-500">Select a video to comment or give advice</p>
          )}
        </aside>
      </div>
    </section>
  );
}
