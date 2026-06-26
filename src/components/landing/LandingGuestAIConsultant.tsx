import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCharTypewriter } from "@/components/landing/landingUtils";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import type { PlatformStats } from "@/services/platformStatsService";

type ChatMsg = { role: "user" | "bot"; text: string; id: string };

const STARTER_PROMPTS = [
  "Kitne investors registered hain?",
  "Mera business score kaise improve ho?",
  "Wholesale deals kahan se milain gi?",
  "Community lounge kya hai?",
];

function buildRomanReply(input: string, stats: PlatformStats): string {
  const q = input.toLowerCase();

  if (q.includes("investor") || q.includes("capital") || q.includes("funding")) {
    return `Bilkul! Abhi platform par ${stats.investors} verified investors active hain aur ${stats.pitchedIdeas} startup ideas review pipeline mein hain. Aap founder profile complete karke investor feed par pitch kar sakte hain — escrow protection ke sath capital deploy hoti hai.`;
  }
  if (q.includes("score") || q.includes("reputation") || q.includes("review")) {
    return `SmartBiz score aapki online reputation ka live signal hai. Platform average abhi ${stats.avgBusinessScore || 75}/100 hai. Reviews sync karein, AI marketing blueprint follow karein, aur community mein active rahein — score 90+ par investors zyada respond karte hain.`;
  }
  if (q.includes("wholesale") || q.includes("supply") || q.includes("packaging")) {
    return `Wholesale hub par ${stats.wholesalers} verified suppliers hain. ${stats.packagingPosts} packaging ideas share ho chuki hain aur ${stats.sampleOrders} bulk/sample orders track ho rahe hain. Register karke catalog list karein ya bulk request bhejein.`;
  }
  if (q.includes("community") || q.includes("lounge") || q.includes("post")) {
    return `Community Lounge mein ${stats.communityPosts} live strategies hain aur total ${stats.totalVotes} votes ecosystem engagement show karte hain. Yahan founders aur consultants growth tactics share karte hain — aap bhi vote karke trending ho sakte hain.`;
  }
  if (q.includes("register") || q.includes("start") || q.includes("join")) {
    return `Shuruat simple hai: role choose karein (Business, Investor, Wholesaler, Founder), CNIC verify karein, aur dashboard unlock ho jata hai. Abhi ${stats.totalMembers} members ecosystem mein hain — aaj hi apni journey start karein!`;
  }
  if (q.includes("salam") || q.includes("hello") || q.includes("hi") || q.includes("hey")) {
    return `Wa alaikum assalam! Main aapka SmartBiz Guest AI Consultant hoon. Roman Urdu ya English — jis mein comfortable hon poochein. Live data ke sath growth, investors, wholesale aur community sab guide kar sakta hoon.`;
  }

  return `Samajh gaya! Live platform snapshot: ${stats.businessOwners} businesses, ${stats.investors} investors, ${stats.entrepreneurs} founders, aur ${stats.communityPosts} community posts. Specific sawaal poochein — jaise "investors kitne hain?" ya "score kaise badhe?" — main turant Roman Urdu mein guide karunga.`;
}

function BotMessage({ text, animate }: { text: string; animate: boolean }) {
  const typed = useCharTypewriter(text, 22, animate);
  const done = !animate || typed.length >= text.length;

  return (
    <div className="agent-card-pop rounded-2xl rounded-tl-sm border border-violet-500/20 bg-white/10 px-4 py-3 text-sm leading-relaxed text-slate-100 shadow-lg">
      {animate ? typed : text}
      {animate && !done && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-violet-300 align-middle" />}
    </div>
  );
}

export function LandingGuestAIConsultant() {
  const stats = usePlatformStats();
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "welcome",
      role: "bot",
      text: `Assalam-o-Alaikum! Main SmartBiz Guest AI Consultant hoon — Roman Urdu aur English dono mein baat kar sakta hoon. Live platform data ke sath aapki growth, investors, wholesale aur community questions ka jawab deta hoon. Neeche koi prompt try karein ya apna sawaal likhein!`,
    },
  ]);
  const [draft, setDraft] = useState("");
  const [typingReply, setTypingReply] = useState<string | null>(null);
  const [animateIds, setAnimateIds] = useState<Set<string>>(() => new Set(["welcome"]));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typingReply]);

  useEffect(() => {
    if (!typingReply) return;
    const ms = typingReply.length * 22 + 300;
    const t = window.setTimeout(() => {
      const id = `b-${Date.now()}`;
      setMessages((m) => [...m, { id, role: "bot", text: typingReply }]);
      setTypingReply(null);
    }, ms);
    return () => window.clearTimeout(t);
  }, [typingReply]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typingReply) return;
    setDraft("");
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", text: trimmed }]);
    window.setTimeout(() => setTypingReply(buildRomanReply(trimmed, stats)), 400);
  };

  return (
    <section className="relative overflow-hidden border-b border-slate-100 bg-white w-full">
      <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-violet-200/20 blur-3xl" />
      <div className="mx-auto max-w-[1600px] w-[95%] py-12 md:py-14">
        <div className="grid gap-10 lg:grid-cols-2 items-stretch">
          <div className="space-y-5 flex flex-col justify-center">
            <p className="inline-flex items-center gap-2 rounded-full bg-violet-100 border border-violet-200 px-3.5 py-1.5 text-xs font-bold text-violet-700 w-fit">
              <Bot className="h-3.5 w-3.5" /> AI Consultant — Guest Mode
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight">
              Roman Urdu mein advanced AI advisory — live platform ke sath
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed max-w-lg">
              Pehle jaisa interactive agent: sawaal poochein, character-by-character jawab aaye, aur har answer
              aapke real Firebase stats se connected ho.
            </p>
            <Link
              to="/app/register"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
            >
              Full AI Desk unlock karein
            </Link>
          </div>

          <div className="landing-ai-agent-panel relative overflow-hidden rounded-3xl border border-slate-700/50 bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 p-5 shadow-2xl min-h-[420px] flex flex-col">
            {/* Advanced video-like ambient layer */}
            <div className="landing-ai-agent-video pointer-events-none absolute inset-0 opacity-60" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:18px_18px] opacity-30" />

            <div className="relative z-10 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="landing-ai-agent-avatar relative flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/20 border border-violet-400/30">
                  <Bot className="h-5 w-5 text-violet-300" />
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white flex items-center gap-1.5">
                    Guest AI Consultant <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300/80">
                    Roman Urdu · Live data
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-1 text-[9px] font-bold uppercase text-emerald-400">
                <Zap className="h-3 w-3" /> Online
              </span>
            </div>

            <div ref={scrollRef} className="relative z-10 flex-1 space-y-3 overflow-y-auto pr-1 mb-3 max-h-[240px]">
              {messages.map((msg) =>
                msg.role === "user" ? (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[88%] rounded-2xl rounded-tr-sm bg-violet-600/90 px-4 py-2.5 text-sm text-white shadow-lg">
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="flex justify-start max-w-[92%]">
                    <BotMessage text={msg.text} animate={animateIds.has(msg.id)} />
                  </div>
                ),
              )}
              {typingReply && (
                <div className="flex justify-start max-w-[92%]">
                  <BotMessage text={typingReply} animate />
                </div>
              )}
            </div>

            <div className="relative z-10 mb-3 flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-semibold text-slate-200 hover:bg-violet-500/20 hover:border-violet-400/40 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="relative z-10 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(draft)}
                placeholder="Roman Urdu ya English mein sawaal likhein..."
                className="flex-1 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-violet-500/40"
              />
              <button
                type="button"
                onClick={() => send(draft)}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500 text-white hover:bg-violet-400 transition-colors shadow-lg shadow-violet-500/30"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
