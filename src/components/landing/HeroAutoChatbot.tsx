import { useEffect, useState } from "react";
import { Bot, Sparkles } from "lucide-react";
import { useCharTypewriter } from "@/components/landing/landingUtils";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import type { PlatformStats } from "@/services/platformStatsService";

const AUTO_DIALOGUE: { q: string; a: (s: PlatformStats) => string }[] = [
  {
    q: "SmartBiz Grow kya hai?",
    a: (s) =>
      `Yeh Pakistan ka AI business ecosystem hai — abhi ${s.totalMembers} members, ${s.investors} investors aur ${s.communityPosts} community strategies live hain.`,
  },
  {
    q: "Register kaise karun?",
    a: () =>
      "Role choose karein (Business, Investor, Wholesaler, Founder), CNIC verify karein — dashboard turant unlock ho jata hai.",
  },
  {
    q: "Investor matching kaise hoti hai?",
    a: (s) =>
      `${s.pitchedIdeas} ideas investor feed par hain. Escrow protection ke sath capital deploy hoti hai — funds safe rehte hain.`,
  },
  {
    q: "AI Consultant kya karta hai?",
    a: (s) =>
      `Roman Urdu mein growth, marketing aur operations guide karta hai. Platform average score abhi ${s.avgBusinessScore || 75}/100 hai.`,
  },
];

export function HeroAutoChatbot() {
  const stats = usePlatformStats();
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"question" | "answer">("question");
  const dialogue = AUTO_DIALOGUE[step % AUTO_DIALOGUE.length];
  const questionText = dialogue.q;
  const answerText = dialogue.a(stats);
  const displayText = phase === "question" ? questionText : answerText;
  const typed = useCharTypewriter(displayText, 24, true);
  const typingDone = typed.length >= displayText.length;

  useEffect(() => {
    if (!typingDone) return;
    const delay = phase === "question" ? 900 : 2200;
    const t = window.setTimeout(() => {
      if (phase === "question") setPhase("answer");
      else {
        setPhase("question");
        setStep((s) => (s + 1) % AUTO_DIALOGUE.length);
      }
    }, delay);
    return () => window.clearTimeout(t);
  }, [typingDone, phase]);

  return (
    <div className="hero-auto-chat relative w-full max-w-md">
      <div className="hero-auto-chat-glow pointer-events-none absolute -inset-3 rounded-3xl bg-violet-400/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-violet-200/60 bg-white/95 p-4 shadow-xl shadow-violet-500/10 backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(139,92,246,0.04),transparent_50%)]" />
        <div className="relative mb-3 flex items-center gap-2.5">
          <div className="hero-auto-chat-avatar flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-300/40">
            <Bot className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 flex items-center gap-1">
              SmartBiz AI <Sparkles className="h-3 w-3 text-amber-500" />
            </p>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-violet-600">
              Auto Q&A · Live data
            </p>
          </div>
          <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold uppercase text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>

        <div className="relative space-y-2 min-h-[88px]">
          <div
            className={`rounded-xl px-3 py-2 text-xs leading-relaxed transition-all duration-300 ${
              phase === "question"
                ? "bg-slate-100 text-slate-700 border border-slate-200"
                : "bg-gradient-to-br from-violet-600 to-violet-700 text-white shadow-md shadow-violet-500/25"
            }`}
          >
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-70 block mb-1">
              {phase === "question" ? "Sawaal" : "Jawab"}
            </span>
            {typed}
            {!typingDone && (
              <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-current align-middle opacity-70" />
            )}
          </div>
        </div>

        <div className="relative mt-3 flex gap-1">
          {AUTO_DIALOGUE.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i === step ? "bg-violet-500" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
