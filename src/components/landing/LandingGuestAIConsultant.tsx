import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCharTypewriter } from "@/components/landing/landingUtils";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import type { PlatformStats } from "@/services/platformStatsService";

type ChatMsg = { role: "user" | "bot"; text: string; id: string };

const STARTER_PROMPTS = [
  "How many investors are registered?",
  "How can I improve my business score?",
  "Where do I find wholesale deals?",
  "What is the Community Lounge?",
];

function buildEnglishReply(input: string, stats: PlatformStats): string {
  const q = input.toLowerCase();

  if (q.includes("investor") || q.includes("capital") || q.includes("funding")) {
    return `Great question. There are currently ${stats.investors} verified investors on the platform and ${stats.pitchedIdeas} startup ideas in the review pipeline. Complete a founder profile to pitch on the investor feed — capital is deployed with escrow protection.`;
  }
  if (q.includes("score") || q.includes("reputation") || q.includes("review")) {
    return `Your SmartBiz score is a live signal of online reputation. The platform average is ${stats.avgBusinessScore || 75}/100. Sync reviews, follow AI growth blueprints, and stay active in the community — investors engage more when scores reach 90+.`;
  }
  if (q.includes("wholesale") || q.includes("supply") || q.includes("packaging") || q.includes("deal")) {
    return `The wholesale hub has ${stats.wholesalers} verified suppliers, ${stats.packagingPosts} packaging ideas shared, and ${stats.sampleOrders} bulk or sample orders tracked. Register to list a catalog or send a bulk request.`;
  }
  if (q.includes("community") || q.includes("lounge") || q.includes("post")) {
    return `The Community Lounge has ${stats.communityPosts} live strategy posts and ${stats.totalVotes} total votes across the ecosystem. Founders and consultants share growth tactics here — you can vote and rise in visibility too.`;
  }
  if (q.includes("register") || q.includes("start") || q.includes("join") || q.includes("grow")) {
    return `Getting started is simple: choose a role (Business, Investor, Wholesaler, or Founder), complete verification, and unlock your dashboard. ${stats.totalMembers} members are already building on the platform — start today.`;
  }
  if (q.includes("hello") || q.includes("hi") || q.includes("hey") || q.includes("salam")) {
    return `Hello! I'm your SmartBiz AI Consultant. Ask me about growth, investors, wholesale supply, or community strategies — I'll answer using live platform data.`;
  }

  return `Got it. Live snapshot: ${stats.businessOwners} businesses, ${stats.investors} investors, ${stats.entrepreneurs} founders, and ${stats.communityPosts} community posts. Try a specific question like "How many investors are registered?" or "How can I improve my business score?"`;
}

function BotMessage({ text, animate }: { text: string; animate: boolean }) {
  const typed = useCharTypewriter(text, 22, animate);
  const done = !animate || typed.length >= text.length;

  return (
    <div className="rounded-2xl rounded-tl-sm border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-sm">
      {animate ? typed : text}
      {animate && !done && (
        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-amber-500 align-middle" />
      )}
    </div>
  );
}

export function LandingGuestAIConsultant() {
  const stats = usePlatformStats();
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "welcome",
      role: "bot",
      text: `Hi — I'm your SmartBiz AI Consultant. I turn live platform data into clear growth advice on funding, investors, wholesale, and community. Pick a prompt below or type your own question.`,
    },
  ]);
  const [draft, setDraft] = useState("");
  const [typingReply, setTypingReply] = useState<string | null>(null);
  const [animateIds] = useState<Set<string>>(() => new Set(["welcome"]));
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
    window.setTimeout(() => setTypingReply(buildEnglishReply(trimmed, stats)), 400);
  };

  return (
    <section className="my-2 w-full bg-[#f5f5f5] px-4 md:my-3">
      <div className="mx-auto max-w-7xl rounded-[2.5rem] border border-slate-200/90 bg-white px-6 py-6 shadow-sm md:px-10 md:py-8">
        <div className="grid items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="flex flex-col justify-center space-y-2">
            <h2 className="font-display text-3xl font-extrabold leading-tight text-slate-900 md:text-4xl">
              Your on-demand AI growth partner
            </h2>
            <p className="max-w-lg text-sm leading-relaxed text-slate-600">
              Get sharp, data-backed guidance on scaling, funding, and supply — crafted for real operators building on
              SmartBiz.
            </p>
            <Link
              to="/app/register"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
            >
              AI consultant
            </Link>
          </div>

          <div className="flex min-h-[360px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 p-3 md:p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50">
                  <Bot className="h-5 w-5 text-amber-500" />
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    Guest AI Consultant <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-semibold uppercase text-emerald-700">
                <Zap className="h-3 w-3" /> Online
              </span>
            </div>

            <div ref={scrollRef} className="mb-3 max-h-[240px] flex-1 space-y-3 overflow-y-auto pr-1">
              {messages.map((msg) =>
                msg.role === "user" ? (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[88%] rounded-2xl rounded-tr-sm bg-slate-900 px-4 py-2.5 text-sm text-white shadow-sm">
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="flex max-w-[92%] justify-start">
                    <BotMessage text={msg.text} animate={animateIds.has(msg.id)} />
                  </div>
                ),
              )}
              {typingReply && (
                <div className="flex max-w-[92%] justify-start">
                  <BotMessage text={typingReply} animate />
                </div>
              )}
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-600 transition-colors hover:border-amber-300 hover:text-amber-600"
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(draft)}
                placeholder="Ask how to grow your business..."
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500/30"
              />
              <button
                type="button"
                onClick={() => send(draft)}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm transition-colors hover:bg-slate-800"
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
