import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Send, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToDirectMessages,
  sendDirectMessage,
  markDirectMessageRead,
  type RtdbDirectMessage,
} from "@/services/messageService";
import { toast } from "sonner";

type Props = {
  founderUid: string;
  founderName: string;
  onUnreadChange?: (count: number) => void;
};

type InboundThread = {
  otherUid: string;
  otherName: string;
  latest: RtdbDirectMessage;
  unread: number;
};

function groupInboundMessages(
  messages: RtdbDirectMessage[],
  founderUid: string,
): InboundThread[] {
  const byOther = new Map<string, RtdbDirectMessage[]>();

  for (const msg of messages) {
    if (msg.fromId !== founderUid && msg.toId !== founderUid) continue;
    const otherUid = msg.fromId === founderUid ? msg.toId : msg.fromId;
    if (!byOther.has(otherUid)) byOther.set(otherUid, []);
    byOther.get(otherUid)!.push(msg);
  }

  return Array.from(byOther.entries())
    .map(([otherUid, msgs]) => {
      const sorted = [...msgs].sort((a, b) => b.timestamp - a.timestamp);
      const latest = sorted[0]!;
      const otherName = msgs.find((m) => m.fromId === otherUid)?.fromName ?? latest.fromName;
      const unread = msgs.filter((m) => m.toId === founderUid && !m.read).length;
      return { otherUid, otherName, latest, unread };
    })
    .sort((a, b) => b.latest.timestamp - a.latest.timestamp);
}

export function FounderMessagesColumn({ founderUid, founderName, onUnreadChange }: Props) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<RtdbDirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOtherUid, setActiveOtherUid] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [sending, setSending] = useState(false);

  const uid = currentUser?.uid ?? founderUid;

  useEffect(() => {
    if (!uid) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeToDirectMessages(uid, (list) => {
      setMessages(list);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  const threads = useMemo(() => groupInboundMessages(messages, uid), [messages, uid]);

  const unreadTotal = useMemo(
    () => messages.filter((m) => m.toId === uid && !m.read).length,
    [messages, uid],
  );

  useEffect(() => {
    onUnreadChange?.(unreadTotal);
  }, [unreadTotal, onUnreadChange]);

  const activeThread = threads.find((t) => t.otherUid === activeOtherUid);
  const threadMessages = useMemo(() => {
    if (!activeOtherUid) return [];
    return messages.filter(
      (m) =>
        (m.fromId === uid && m.toId === activeOtherUid) ||
        (m.fromId === activeOtherUid && m.toId === uid),
    );
  }, [messages, uid, activeOtherUid]);

  const openThread = async (thread: InboundThread) => {
    setActiveOtherUid(thread.otherUid);
    setReplyDraft("");
    const unread = messages.filter(
      (m) => m.toId === uid && m.fromId === thread.otherUid && !m.read,
    );
    await Promise.all(unread.map((m) => markDirectMessageRead(m.id)));
  };

  const handleReply = async () => {
    if (!replyDraft.trim() || !activeOtherUid) return;
    if (!currentUser?.uid) {
      toast.error("Firebase login required to send messages.");
      return;
    }
    setSending(true);
    try {
      await sendDirectMessage({
        fromId: currentUser.uid,
        toId: activeOtherUid,
        fromName: founderName,
        text: replyDraft.trim(),
      });
      setReplyDraft("");
    } catch {
      toast.error("Failed to send reply.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="rounded-2xl border border-[#FFD700]/20 p-5 h-full"
      style={{ background: "rgba(255,255,255,0.03)" }}
    >
      <h3 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-white">
        <MessageSquare className="h-5 w-5 text-[#FFA500]" />
        Messages from Investors
        {unreadTotal > 0 && (
          <span className="ml-auto rounded-full bg-[#FFA500] px-2 py-0.5 text-[10px] font-bold text-white">
            {unreadTotal} new
          </span>
        )}
      </h3>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading messages...
        </div>
      ) : (
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {!currentUser?.uid && (
            <p className="py-4 text-center text-[10px] text-amber-400">
              Sign in with Firebase to load and send messages.
            </p>
          )}

          {activeThread ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setActiveOtherUid(null)}
                className="text-[10px] font-semibold text-[#FFD700] hover:underline"
              >
                ← Back to inbox
              </button>
              <p className="text-xs font-bold text-white">{activeThread.otherName}</p>
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-white/10 p-2">
                {threadMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-lg px-2 py-1.5 text-[11px] ${
                      m.fromId === uid
                        ? "ml-4 bg-[#FFA500]/20 text-white"
                        : "mr-4 bg-white/10 text-slate-300"
                    }`}
                  >
                    <p className="text-[9px] font-bold text-[#FFD700]">{m.fromName}</p>
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleReply()}
                  placeholder="Type your reply..."
                  className="h-8 border-white/10 bg-white/5 text-xs text-white"
                />
                <Button
                  size="sm"
                  className="h-8 bg-[#FFA500] px-2 text-[10px] text-white"
                  onClick={handleReply}
                  disabled={sending || !replyDraft.trim()}
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : threads.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">No investor messages yet.</p>
          ) : (
            threads.slice(0, 6).map((t) => (
              <button
                key={t.otherUid}
                type="button"
                onClick={() => openThread(t)}
                className="w-full rounded-xl border border-white/10 p-3 text-left transition hover:bg-white/5"
              >
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
                  >
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white">{t.otherName}</p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(t.latest.timestamp).toLocaleString("en-PK")}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      t.unread > 0
                        ? "bg-[#FFA500]/20 text-[#FFA500]"
                        : "bg-emerald-500/20 text-emerald-400"
                    }`}
                  >
                    {t.unread > 0 ? `${t.unread} new` : "read"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">{t.latest.text}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
