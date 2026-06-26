import { useState } from "react";
import { Plus, Send, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { postFromProfile } from "@/services/founderCommunityService";
import { useAppState } from "@/hooks/useAppState";
import { toast } from "sonner";

type Props = {
  founderId: string;
  founderName: string;
  founderUsername: string;
};

/**
 * Profile-only posting section.
 * Founders CANNOT post from the main dashboard — only from here on their profile.
 */
export function FounderProfilePostsSection({ founderId, founderName, founderUsername }: Props) {
  const { addCommunityPost } = useAppState();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [postType, setPostType] = useState<"post" | "strategy" | "packaging">("post");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required.");
      return;
    }
    setSubmitting(true);
    try {
      await postFromProfile({
        userId: founderId,
        author: founderUsername,
        role: "entrepreneur",
        title: title.trim(),
        content: content.trim(),
        category,
        type: postType,
      });

      addCommunityPost({
        author: founderUsername,
        role: "business",
        badge: "Business Owner",
        category,
        avatarColor: "bg-[#FFA500]",
        title: title.trim(),
        content: content.trim(),
        isMarketingBlueprint: postType === "strategy",
        isPackagingReq: postType === "packaging",
      });

      toast.success("Posted to your followers!");
      setTitle("");
      setContent("");
      setShowForm(false);
    } catch {
      toast.error("Failed to post. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mb-6 rounded-2xl border border-[#FFD700]/20 p-5"
      style={{ background: "rgba(255,215,0,0.04)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#FFD700]">Post to Followers</h3>
          <p className="text-[10px] text-slate-500 flex items-center gap-1">
            <Lock className="h-3 w-3" /> Profile-only posting — not available on dashboard
          </p>
        </div>
        <Button
          size="sm"
          className="bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-xs font-bold text-[#1a1a2e]"
          onClick={() => setShowForm((s) => !s)}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> New Post
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            {(["post", "strategy", "packaging"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPostType(t)}
                className={`rounded-full px-3 py-1 text-[10px] font-bold capitalize ${
                  postType === t ? "bg-[#FFD700] text-[#1a1a2e]" : "bg-white/10 text-slate-400"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title..."
            className="w-full rounded-xl border border-[#FFD700]/30 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-[#FFD700] founder-input-glow"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share an update with your followers..."
            rows={3}
            className="w-full resize-y rounded-xl border border-[#FFD700]/30 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-[#FFD700]"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            {["General", "Business", "Marketing", "Financial", "Technical"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}
              className="flex-1 bg-[#FFA500] text-white"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {submitting ? "Posting..." : "Post to Followers"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="text-slate-400">
              Cancel
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
