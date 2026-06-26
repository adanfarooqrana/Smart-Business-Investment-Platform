import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MessageSquare,
  Package,
  Send,
  MapPin,
  Truck,
  Phone,
  Loader2,
  CheckCircle2,
  User,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { InvestorEntrepreneurMessage, SampleOrder } from "@/hooks/useAppState";
import {
  type InvestorThread,
  type FirebaseMessage,
  subscribeToEntrepreneurMessages,
  buildThreadsFromMessages,
  sendFirebaseMessage,
  markMessagesRead,
  approveSampleInStage3,
  saveSampleRequestToStage3,
  fetchSampleTrackingForIdea,
  threadIdFor,
  investorIdFromName,
} from "@/services/messageService";
import { FounderInvestmentExpert } from "@/components/entrepreneur/FounderInvestmentExpert";

type Props = {
  entrepreneurUid: string;
  founderName: string;
  localMessages: InvestorEntrepreneurMessage[];
  localSampleOrders: SampleOrder[];
  pitchedIdeaIds: string[];
  onReplyLocal: (messageId: string, reply: string) => void;
  onResolveLocal: (messageId: string) => void;
  onUnreadChange: (count: number) => void;
};

function seedFromLocal(
  entrepreneurUid: string,
  localMessages: InvestorEntrepreneurMessage[],
  localSampleOrders: SampleOrder[],
): FirebaseMessage[] {
  const seeded: FirebaseMessage[] = [];
  const now = Date.now();

  for (const m of localMessages) {
    const invId = investorIdFromName(m.investorName);
    const tid = threadIdFor(entrepreneurUid, invId, m.ideaId);
    seeded.push({
      id: `local-${m.id}`,
      threadId: tid,
      entrepreneurUid,
      investorName: m.investorName,
      investorId: invId,
      ideaId: m.ideaId,
      startupTitle: m.startupTitle,
      sender: "investor",
      text: m.investorConcern,
      read: m.status !== "pending",
      type: "text",
      createdAt: now - 3600000,
    });
    if (m.entrepreneurReply) {
      seeded.push({
        id: `local-reply-${m.id}`,
        threadId: tid,
        entrepreneurUid,
        investorName: m.investorName,
        investorId: invId,
        ideaId: m.ideaId,
        startupTitle: m.startupTitle,
        sender: "entrepreneur",
        text: m.entrepreneurReply,
        read: true,
        type: "text",
        createdAt: now - 1800000,
      });
    }
  }

  for (const o of localSampleOrders) {
    const invId = investorIdFromName(o.investorName);
    const tid = threadIdFor(entrepreneurUid, invId, o.ideaId);
    seeded.push({
      id: `local-sample-${o.id}`,
      threadId: tid,
      entrepreneurUid,
      investorName: o.investorName,
      investorId: invId,
      ideaId: o.ideaId,
      startupTitle: o.startupTitle,
      sender: "investor",
      text: `Sample request: ${o.productName} → ${o.address}, ${o.city} via ${o.deliveryServiceLabel}`,
      read: o.stage !== "approved",
      type: "sample_request",
      createdAt: o.createdAt,
    });
  }

  return seeded;
}

export function MessageSampleCenter({
  entrepreneurUid,
  founderName,
  localMessages,
  localSampleOrders,
  pitchedIdeaIds,
  onReplyLocal,
  onResolveLocal,
  onUnreadChange,
}: Props) {
  const [firebaseMessages, setFirebaseMessages] = useState<FirebaseMessage[]>([]);
  const [sampleByIdea, setSampleByIdea] = useState<
    Record<string, Record<string, import("@/services/messageService").SampleTrackingEntry>>
  >({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [approving, setApproving] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadSampleTracking = useCallback(async () => {
    const map: typeof sampleByIdea = {};
    for (const ideaId of pitchedIdeaIds) {
      map[ideaId] = await fetchSampleTrackingForIdea(ideaId);
    }
    for (const o of localSampleOrders) {
      if (!o.ideaId) continue;
      const key = investorIdFromName(o.investorName);
      if (!map[o.ideaId]) map[o.ideaId] = {};
      if (!map[o.ideaId][key]) {
        map[o.ideaId][key] = {
          status: o.stage === "approved" ? "pending" : o.stage === "sent" ? "sent" : "Picked",
          address: o.address,
          city: o.city,
          phone: o.phone,
          deliveryService: o.deliveryService,
          deliveryServiceLabel: o.deliveryServiceLabel,
          deliveryCostPkr: o.deliveryCostPkr,
          productName: o.productName,
          productPricePkr: o.productPricePkr,
          notes: o.notes,
          trackingId: o.trackingId,
          requestedAt: o.createdAt,
          investorName: o.investorName,
        };
      }
    }
    setSampleByIdea(map);
  }, [pitchedIdeaIds, localSampleOrders]);

  useEffect(() => {
    loadSampleTracking();
  }, [loadSampleTracking]);

  useEffect(() => {
    if (!entrepreneurUid) return;
    const unsub = subscribeToEntrepreneurMessages(entrepreneurUid, setFirebaseMessages);
    return unsub;
  }, [entrepreneurUid]);

  const allMessages = useMemo(() => {
    const local = seedFromLocal(entrepreneurUid, localMessages, localSampleOrders);
    const fbIds = new Set(firebaseMessages.map((m) => m.id));
    const merged = [...firebaseMessages];
    for (const lm of local) {
      if (!fbIds.has(lm.id)) merged.push(lm);
    }
    return merged.sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
  }, [entrepreneurUid, firebaseMessages, localMessages, localSampleOrders]);

  const threads = useMemo(
    () => buildThreadsFromMessages(allMessages, sampleByIdea),
    [allMessages, sampleByIdea],
  );

  const totalUnread = useMemo(
    () => threads.reduce((sum, t) => sum + t.unreadCount, 0),
    [threads],
  );

  useEffect(() => {
    onUnreadChange(totalUnread);
  }, [totalUnread, onUnreadChange]);

  const selected = threads.find((t) => t.threadId === selectedId) ?? threads[0] ?? null;

  useEffect(() => {
    if (!selectedId && threads[0]) setSelectedId(threads[0].threadId);
  }, [threads, selectedId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages.length]);

  const handleSelectThread = async (thread: InvestorThread) => {
    setSelectedId(thread.threadId);
    await markMessagesRead(thread.threadId);
    setFirebaseMessages((prev) =>
      prev.map((m) =>
        m.threadId === thread.threadId && m.sender === "investor" ? { ...m, read: true } : m,
      ),
    );
  };

  const handleSend = async () => {
    if (!selected || !draft.trim()) return;
    setSending(true);
    try {
      await sendFirebaseMessage({
        threadId: selected.threadId,
        entrepreneurUid,
        investorName: selected.investorName,
        investorId: selected.investorId,
        ideaId: selected.ideaId,
        startupTitle: selected.startupTitle,
        sender: "entrepreneur",
        text: draft.trim(),
        type: "text",
      });
      const localMatch = localMessages.find(
        (m) =>
          m.investorName === selected.investorName &&
          m.status === "pending" &&
          (!selected.ideaId || m.ideaId === selected.ideaId),
      );
      if (localMatch) {
        onReplyLocal(localMatch.id, draft.trim());
        onResolveLocal(localMatch.id);
      }
      setDraft("");
      toast.success("Reply sent");
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleApproveSample = async () => {
    if (!selected?.sampleRequest || !selected.ideaId) return;
    setApproving(true);
    const trackingId = `SB-TRK-${selected.ideaId.toUpperCase().slice(0, 8)}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    try {
      await approveSampleInStage3(selected.ideaId, selected.investorName, trackingId);
      await sendFirebaseMessage({
        threadId: selected.threadId,
        entrepreneurUid,
        investorName: selected.investorName,
        investorId: selected.investorId,
        ideaId: selected.ideaId,
        startupTitle: selected.startupTitle,
        sender: "system",
        text: `✅ Sample approved & picked for dispatch.\nTracking ID: ${trackingId}\nCourier: ${selected.sampleRequest.deliveryServiceLabel}\nDestination: ${selected.sampleRequest.address}, ${selected.sampleRequest.city}`,
        type: "system",
        read: true,
      });
      await loadSampleTracking();
      toast.success(`Sample approved — Tracking: ${trackingId}`);
    } catch {
      toast.error("Failed to approve sample");
    } finally {
      setApproving(false);
    }
  };

  const syncLocalSampleToFirebase = async (order: SampleOrder) => {
    if (!order.ideaId) return;
    await saveSampleRequestToStage3(order.ideaId, order.investorName, {
      address: order.address,
      city: order.city,
      phone: order.phone,
      deliveryService: order.deliveryService,
      deliveryServiceLabel: order.deliveryServiceLabel,
      deliveryCostPkr: order.deliveryCostPkr,
      productName: order.productName,
      productPricePkr: order.productPricePkr,
      notes: order.notes,
      status: "pending",
    });
  };

  useEffect(() => {
    for (const o of localSampleOrders) {
      if (o.stage === "approved" && o.ideaId && pitchedIdeaIds.includes(o.ideaId)) {
        syncLocalSampleToFirebase(o).catch(() => {});
      }
    }
  }, [localSampleOrders, pitchedIdeaIds]);

  return (
    <section className="overflow-hidden rounded-3xl border border-[#FFA500]/25 bg-white shadow-xl">
      <div className="flex h-[min(640px,75vh)] flex-col md:flex-row">
        {/* Left sidebar — WhatsApp style */}
        <aside className="flex w-full flex-col border-b border-[#FFA500]/15 md:w-[300px] md:border-b-0 md:border-r bg-[#FFF8E1]/40">
          <div
            className="border-b border-[#FFA500]/20 px-4 py-3"
            style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
          >
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <span className="font-display text-sm font-bold">Investor Inbox</span>
              </div>
              {totalUnread > 0 && (
                <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-white px-2 text-xs font-black text-[#FFA500]">
                  {totalUnread}
                </span>
              )}
            </div>
            <p className="mt-1 text-[10px] text-white/85">
              {threads.length} active conversation{threads.length === 1 ? "" : "s"} ·{" "}
              {totalUnread} unread
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {threads.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">
                No investor messages yet. When investors message or request samples, they appear here.
              </p>
            ) : (
              threads.map((t) => (
                <button
                  key={t.threadId}
                  type="button"
                  onClick={() => handleSelectThread(t)}
                  className={`flex w-full gap-3 border-b border-[#FFA500]/10 px-4 py-3 text-left transition-colors hover:bg-[#FFF8E1]/80 ${
                    selected?.threadId === t.threadId ? "bg-[#FFF8E1]" : ""
                  }`}
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
                  >
                    {t.investorName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-sm font-bold text-slate-900">
                        {t.investorName}
                      </span>
                      {t.unreadCount > 0 && (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFA500] text-[10px] font-bold text-white">
                          {t.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[10px] font-mono text-[#FFA500]/80">
                      ID: {t.investorId}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-violet-600">
                      <Sparkles className="h-2.5 w-2.5 shrink-0" />
                      <span className="line-clamp-1">{t.aiSummary}</span>
                    </p>
                    {t.hasSampleRequest && (
                      <span className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-[#FFA500]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#FFA500]">
                        <Package className="h-2.5 w-2.5" /> Sample
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Chat window */}
        <div className="relative flex flex-1 flex-col bg-[#e5ddd5]/30">
          {selected ? (
            <>
              <div className="flex items-center gap-3 border-b border-[#FFA500]/15 bg-[#FFF8E1]/90 px-4 py-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                  style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
                >
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{selected.investorName}</p>
                  <p className="text-[10px] text-slate-500">
                    {selected.startupTitle ?? "General inquiry"}
                    {selected.ideaId ? ` · ${selected.ideaId}` : ""}
                  </p>
                </div>
              </div>

              {/* Sample request alert */}
              {selected.samplePending && selected.sampleRequest && (
                <div className="mx-4 mt-3 rounded-2xl border-2 border-[#FFA500] bg-gradient-to-br from-[#FFF8E1] to-white p-4 shadow-md">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#FFA500]">
                    <Package className="h-4 w-4" /> Sample Request Alert — Stage 3
                  </p>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <p className="flex items-start gap-1.5">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FFA500]" />
                      {selected.sampleRequest.address}, {selected.sampleRequest.city}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 text-[#FFA500]" />
                      {selected.sampleRequest.deliveryServiceLabel}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-[#FFA500]" />
                      {selected.sampleRequest.phone}
                    </p>
                    {selected.sampleRequest.productName && (
                      <p className="text-slate-500">Product: {selected.sampleRequest.productName}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    disabled={approving}
                    onClick={handleApproveSample}
                    className="mt-3 w-full text-white font-bold"
                    style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
                  >
                    {approving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Approve Sample
                      </>
                    )}
                  </Button>
                </div>
              )}

              {selected.sampleRequest?.status === "Picked" && selected.sampleRequest.trackingId && (
                <div className="mx-4 mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
                  <CheckCircle2 className="mb-1 inline h-4 w-4" /> Sample picked · Tracking:{" "}
                  <strong className="font-mono">{selected.sampleRequest.trackingId}</strong>
                </div>
              )}

              <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
                {selected.messages.map((msg) => (
                  <ChatBubble key={msg.id} message={msg} />
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="flex items-center gap-2 border-t border-[#FFA500]/15 bg-white px-4 py-3">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Type a reply…"
                  className="flex-1 border-[#FFA500]/30"
                />
                <Button
                  type="button"
                  disabled={sending || !draft.trim()}
                  onClick={handleSend}
                  className="text-white"
                  style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>

              <FounderInvestmentExpert onInsertReply={setDraft} />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
              <MessageSquare className="mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm">Select an investor conversation</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ChatBubble({ message }: { message: FirebaseMessage }) {
  const isOwn = message.sender === "entrepreneur";
  const isSystem = message.sender === "system";

  if (isSystem) {
    return (
      <div className="mx-auto max-w-[90%] rounded-xl bg-[#FFF8E1] border border-[#FFD700]/50 px-3 py-2 text-center text-[11px] text-slate-600 whitespace-pre-line">
        {message.text}
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
          isOwn
            ? "rounded-br-sm bg-[#DCF8C6] text-slate-800"
            : "rounded-bl-sm bg-white text-slate-800"
        }`}
      >
        {message.type === "sample_request" && (
          <span className="mb-1 flex items-center gap-1 text-[10px] font-bold text-[#FFA500]">
            <Package className="h-3 w-3" /> Sample Request
          </span>
        )}
        <p className="whitespace-pre-line leading-relaxed">{message.text}</p>
        <p className="mt-1 text-[9px] text-slate-400 text-right">
          {new Date(Number(message.createdAt)).toLocaleTimeString("en-PK", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
