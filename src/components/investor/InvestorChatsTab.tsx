import { useEffect, useState } from "react";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  streamInvestorChatThreads,
  streamChatMessages,
  sendUnifiedChatMessage,
  type InvestorChatThread,
  type ChatMessageNode,
} from "@/services/investorCoreService";

type InvestorChatsTabProps = {
  investorName: string;
};

export function InvestorChatsTab({ investorName }: InvestorChatsTabProps) {
  const { currentUser } = useAuth();
  const investorId = currentUser?.uid || "";
  const [threads, setThreads] = useState<InvestorChatThread[]>([]);
  const [active, setActive] = useState<InvestorChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessageNode[]>([]);
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!investorId) {
      setThreads([]);
      return;
    }
    try {
      return streamInvestorChatThreads(investorId, (list) => {
        setThreads(list);
        setActive((prev) => {
          if (!prev) return list[0] ?? null;
          return list.find((t) => t.channelId === prev.channelId) ?? list[0] ?? null;
        });
      });
    } catch (err) {
      console.error("InvestorChatsTab thread subscribe error:", err);
      setThreads([]);
      return () => undefined;
    }
  }, [investorId]);

  useEffect(() => {
    if (!active || !investorId) {
      setMessages([]);
      return;
    }
    try {
      return streamChatMessages(
        active.pitchId,
        active.investorId,
        active.founderId,
        setMessages,
      );
    } catch (err) {
      console.error("InvestorChatsTab message stream error:", err);
      setMessages([]);
      return () => undefined;
    }
  }, [active?.channelId, active?.pitchId, active?.investorId, active?.founderId, investorId]);

  const handleSend = async () => {
    if (!active || !draft.trim() || !investorId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await sendUnifiedChatMessage(
        active.pitchId,
        active.investorId,
        active.founderId,
        investorId,
        draft.trim(),
        "General",
        {
          senderName: investorName || "Investor",
          founderName: active.founderName || "",
          startupTitle: active.startupTitle || active.pitchId,
          investorName: investorName || "",
        },
      );
      setDraft("");
    } catch (err) {
      console.error("InvestorChatsTab send error:", err);
      setError("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Active Chats
        </p>
        {threads.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-slate-400">
            No chat threads yet. Message a founder from an idea journey.
          </p>
        ) : (
          <ul className="space-y-1">
            {threads.map((t) => {
              const founderLabel = t.founderName || t.founderId || "Founder";
              const pitchLabel = t.startupTitle || t.pitchId || "Venture";
              return (
                <li key={t.channelId}>
                  <button
                    type="button"
                    onClick={() => setActive(t)}
                    className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                      active?.channelId === t.channelId
                        ? "bg-violet-50 ring-1 ring-violet-200"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <p className="truncate text-xs font-bold text-slate-900">{founderLabel}</p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">{pitchLabel}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      <section className="flex min-h-[420px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">
              {active
                ? active.founderName || active.founderId || "Founder"
                : "Select a chat"}
            </p>
            <p className="text-[10px] text-slate-500">
              {active
                ? active.startupTitle || active.pitchId || "Live founder conversation"
                : "Live founder conversations"}
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {!active ? (
            <p className="py-16 text-center text-xs text-slate-400">Choose a thread to read & reply.</p>
          ) : messages.length === 0 ? (
            <p className="py-16 text-center text-xs text-slate-400">No messages in this channel yet.</p>
          ) : (
            messages.map((m) => {
              const mine = m.senderId === investorId;
              return (
                <div
                  key={m.messageId}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${
                      mine
                        ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    <p className="mb-0.5 text-[9px] font-bold opacity-70">
                      {m.senderName || (mine ? investorName : "Founder")}
                      {m.stageContext ? ` · ${m.stageContext}` : ""}
                    </p>
                    <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {active && (
          <div className="border-t border-slate-100 p-3">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              placeholder="Write a reply to the founder…"
              className="mb-2 text-xs"
            />
            {error && <p className="mb-2 text-xs font-semibold text-red-500">{error}</p>}
            <Button
              size="sm"
              disabled={isSubmitting || !draft.trim()}
              onClick={() => void handleSend()}
              className="rounded-full bg-violet-600 hover:bg-violet-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Send className="mr-1.5 h-3.5 w-3.5" /> Send Reply
                </>
              )}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
