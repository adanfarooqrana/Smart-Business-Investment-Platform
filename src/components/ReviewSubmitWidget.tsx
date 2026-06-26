import { useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Star, Send, CheckCircle2, MessageSquarePlus, Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const ROLE_META: Record<string, { label: string; color: string }> = {
  business: { label: "Business Owner", color: "#b45309" },
  investor: { label: "Investor", color: "#0f766e" },
  consultant: { label: "Wholesaler", color: "#9333ea" },
  guest: { label: "Member", color: "#0f172a" },
};

type ReviewSubmitWidgetProps = {
  /** Optional override for the displayed role label (e.g. "Wholesaler") */
  roleLabel?: string;
  className?: string;
};

export function ReviewSubmitWidget({ roleLabel, className = "" }: ReviewSubmitWidgetProps) {
  const { role, business, investor, consultant, currentUser, addTestimonialQuote } = useAppState();
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);

  const meta = ROLE_META[role] || ROLE_META.guest;
  const finalRoleLabel = roleLabel || meta.label;

  const name =
    (role === "business" && business?.name) ||
    (role === "investor" && investor?.name) ||
    (role === "consultant" && consultant?.name) ||
    currentUser?.name ||
    "SmartBiz Member";

  const avatar =
    currentUser?.avatarUrl && currentUser.avatarUrl.startsWith("http")
      ? currentUser.avatarUrl
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f59e0b&color=fff&size=200`;

  const submit = () => {
    if (!text.trim()) return;
    addTestimonialQuote({
      name,
      role: finalRoleLabel,
      quote: text.trim(),
      imageUrl: avatar,
      color: meta.color,
    });
    setText("");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className={`rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/70 to-white p-5 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
          <MessageSquarePlus className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-display text-sm font-bold text-slate-900">Share your experience</h3>
          <p className="text-[11px] text-slate-500">Aapka review homepage par "Voices of Growth" mein show hoga.</p>
        </div>
      </div>

      {submitted ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 animate-in fade-in zoom-in-95">
          <CheckCircle2 className="h-5 w-5" /> Shukriya! Aapka review live ho gaya hai.
        </div>
      ) : (
        <>
          {/* Rating */}
          <div className="mb-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} type="button" onClick={() => setRating(s)} aria-label={`${s} stars`}>
                <Star
                  className={`h-5 w-5 transition-all ${s <= rating ? "fill-amber-400 text-amber-400 scale-110" : "text-slate-300"}`}
                />
              </button>
            ))}
            <span className="ml-1 text-xs font-medium text-slate-400">as {finalRoleLabel}</span>
          </div>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Apna review yahan likhein... (e.g. SmartBiz se mujhe verified deals milay)"
            rows={3}
            className="resize-none border-amber-200/70 bg-white"
          />

          <Button
            onClick={submit}
            disabled={!text.trim()}
            className="mt-3 w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-600 font-bold text-white hover:from-amber-400 hover:to-orange-500 disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> Submit Review
          </Button>
          <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-amber-600">
            <Sparkles className="h-3 w-3" /> Reviews investor, business owner aur wholesaler — sab modules se yahan aate hain.
          </p>
        </>
      )}
    </div>
  );
}
