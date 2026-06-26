import { useState } from "react";
import { Bot, X, Send, Sparkles, MessageSquare, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  founderName: string;
  unreadMessages: number;
  activeSamples: number;
  investorsViewed: number;
  onBulkMessageInvestors: () => void;
};

const PREBUILT = [
  { icon: Users, label: "Who invested in my idea?", answer: "Based on your escrow records, 2 investors have completed Stage 3 payments. Vanguard Ventures (Rs. 500,000) and Apex Capital (Rs. 250,000)." },
  { icon: TrendingUp, label: "Which expert solved my problem?", answer: "Your rice supply problem was solved by u/rice_king_pk (Wholesaler). Their solution was marked OK — they earned +1 point." },
  { icon: Sparkles, label: "What should I do next?", answer: "Priority actions: 1) Approve 2 pending sample requests. 2) Reply to 1 unread investor message. 3) Post a growth update to your followers from your Profile page." },
  { icon: MessageSquare, label: "Draft investor update", answer: `Dear Investors,\n\nQuick update from ${""} — we remain on track against disclosed milestones. Revenue metrics in Stage 2 are current. Happy to schedule a call.\n\nBest,\nFounder` },
];

export function FounderAIConsultant({
  founderName,
  unreadMessages,
  activeSamples,
  investorsViewed,
  onBulkMessageInvestors,
}: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "ai" | "user"; text: string }[]>([]);
  const [draft, setDraft] = useState("");

  const suggestions = [
    `${investorsViewed} investors viewed your idea today`,
    `${activeSamples} sample request${activeSamples !== 1 ? "s" : ""} pending`,
    unreadMessages > 0 ? `${unreadMessages} investor wants to meet` : "No pending meetings",
  ];

  const ask = (text: string) => {
    setMessages((m) => [...m, { role: "user", text }]);
    const match = PREBUILT.find((p) => p.label.toLowerCase().includes(text.toLowerCase().slice(0, 10)));
    const reply = match?.answer.replace("Founder", founderName) ??
      `Based on your founder data: you have ${investorsViewed} investor views, ${activeSamples} active samples, and ${unreadMessages} unread messages. Focus on responding to investors and approving samples.`;
    setTimeout(() => {
      setMessages((m) => [...m, { role: "ai", text: reply }]);
    }, 600);
  };

  return (
    <>
      {/* Floating icon — always visible */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="founder-ai-pulse fixed bottom-6 right-6 z-40 flex h-16 w-16 items-center justify-center rounded-full text-2xl shadow-2xl transition-transform hover:scale-110"
        style={{
          background: "linear-gradient(135deg, #FFD700, #FFA500)",
          boxShadow: "0 0 30px rgba(255, 215, 0, 0.6), 0 8px 24px rgba(255,165,0,0.4)",
        }}
        title="AI Consultant — always on"
      >
        <Bot className="h-7 w-7 text-white" />
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 flex w-80 flex-col rounded-3xl border border-[#FFD700]/30 shadow-2xl md:w-96"
          style={{ background: "#1a1a2e", maxHeight: "70vh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#FFD700]/20 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)" }}
              >
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">AI Consultant</p>
                <p className="text-[10px] text-[#FFD700]">Always on · Intelligent suggestions</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Suggestions */}
          <div className="space-y-1.5 border-b border-white/5 p-3">
            {suggestions.map((s) => (
              <p key={s} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <Sparkles className="h-3 w-3 text-[#FFD700]" /> {s}
              </p>
            ))}
          </div>

          {/* Chat */}
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                {PREBUILT.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => ask(p.label)}
                    className="flex w-full items-start gap-2 rounded-xl border border-[#FFD700]/20 bg-white/5 px-3 py-2 text-left text-[11px] text-slate-300 hover:border-[#FFD700]/50"
                  >
                    <p.icon className="mt-0.5 h-3 w-3 shrink-0 text-[#FFA500]" />
                    {p.label}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-xl px-3 py-2 text-xs ${
                  m.role === "ai"
                    ? "bg-[#FFD700]/10 text-slate-200"
                    : "ml-8 bg-[#FFA500]/20 text-white"
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="border-t border-white/5 p-3">
            <div className="mb-2 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { ask(draft); setDraft(""); } }}
                placeholder="Ask anything..."
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-[#FFD700]"
              />
              <Button
                size="icon"
                className="h-8 w-8 shrink-0 bg-[#FFA500]"
                onClick={() => { if (draft.trim()) { ask(draft); setDraft(""); } }}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button
              size="sm"
              className="w-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-xs font-bold text-[#1a1a2e]"
              onClick={() => {
                onBulkMessageInvestors();
                toast.success("Bulk update sent to all investors!");
              }}
            >
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Message All Investors
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
