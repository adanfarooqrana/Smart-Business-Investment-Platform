import { useState, useEffect, useMemo } from "react";
import { Send, MessageCircle, X, AlertTriangle, Minimize2, Maximize2, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StartupIdea } from "@/data/startupIdeas";
import {
  buildInvestorMessageFormat,
  useAppState,
  type InvestorEntrepreneurMessage,
  type InvestorMessageType,
} from "@/hooks/useAppState";
import { useAuth } from "@/contexts/AuthContext";
import {
  sendDirectMessage,
  subscribeToDirectMessages,
  markDirectMessageRead,
  resolveEntrepreneurUidForIdea,
  type RtdbDirectMessage,
} from "@/services/messageService";
import { toast } from "sonner";

const AGREEMENT_CLAUSES = [
  "Section 1 — Parties & Investment Amount",
  "Section 2 — Equity & Ownership Rights",
  "Section 3 — Escrow & Milestone Release",
  "Section 4 — Representations & Warranties",
  "Section 5 — Governing Law & Dispute Resolution",
  "Other clause (specify below)",
];

type InvestorFounderMessengerProps = {
  idea: StartupIdea;
  investorName: string;
  stage: "Stage 1" | "Stage 2" | "Stage 3" | "Stage 4";
  entrepreneurUid?: string;
  onMessageSent?: (msg: InvestorEntrepreneurMessage) => void;
  defaultType?: InvestorMessageType;
  pendingMessage?: InvestorEntrepreneurMessage;
  composeOpen?: boolean;
  onComposeOpenChange?: (open: boolean) => void;
};

export function InvestorFounderMessenger({
  idea,
  investorName,
  stage,
  entrepreneurUid: entrepreneurUidProp,
  onMessageSent,
  defaultType = "general_query",
  pendingMessage,
  composeOpen,
  onComposeOpenChange,
}: InvestorFounderMessengerProps) {
  const { currentUser } = useAuth();
  const { sendInvestorMessage } = useAppState();
  const [open, setOpen] = useState(false);
  const [flying, setFlying] = useState(false);
  const [waitMinimized, setWaitMinimized] = useState(false);
  const [msgType, setMsgType] = useState<InvestorMessageType>(defaultType);
  const [issueSection, setIssueSection] = useState(AGREEMENT_CLAUSES[2]);
  const [issuePoint, setIssuePoint] = useState("");
  const [investorConcern, setInvestorConcern] = useState("");
  const [entrepreneurUid, setEntrepreneurUid] = useState<string | null>(
    entrepreneurUidProp ?? null,
  );
  const [rtdbMessages, setRtdbMessages] = useState<RtdbDirectMessage[]>([]);
  const [showThread, setShowThread] = useState(false);

  const dialogOpen = composeOpen ?? open;
  const setDialogOpen = (v: boolean) => {
    onComposeOpenChange?.(v);
    setOpen(v);
  };

  const investorUid = currentUser?.uid;

  useEffect(() => {
    if (entrepreneurUidProp) {
      setEntrepreneurUid(entrepreneurUidProp);
      return;
    }
    void resolveEntrepreneurUidForIdea(idea.id).then(setEntrepreneurUid);
  }, [idea.id, entrepreneurUidProp]);

  useEffect(() => {
    if (!investorUid) return;
    const unsub = subscribeToDirectMessages(investorUid, setRtdbMessages);
    return unsub;
  }, [investorUid]);

  const conversation = useMemo(() => {
    if (!investorUid || !entrepreneurUid) return [];
    return rtdbMessages.filter(
      (m) =>
        (m.fromId === investorUid && m.toId === entrepreneurUid) ||
        (m.fromId === entrepreneurUid && m.toId === investorUid),
    );
  }, [rtdbMessages, investorUid, entrepreneurUid]);

  useEffect(() => {
    if (!showThread || !investorUid || !entrepreneurUid) return;
    const unread = conversation.filter((m) => m.toId === investorUid && !m.read);
    void Promise.all(unread.map((m) => markDirectMessageRead(m.id)));
  }, [showThread, conversation, investorUid, entrepreneurUid]);

  useEffect(() => {
    if (composeOpen) setMsgType(defaultType);
  }, [composeOpen, defaultType]);

  const handleSend = async () => {
    if (!issuePoint.trim() || !investorConcern.trim()) return;
    if (!investorUid) {
      toast.error("Firebase login required to message the founder.");
      return;
    }
    if (!entrepreneurUid) {
      toast.error("Could not resolve founder account for this idea.");
      return;
    }

    setFlying(true);
    const formatted = buildInvestorMessageFormat({
      startupTitle: idea.startupTitle,
      founderName: idea.founderName,
      investorName,
      stage: msgType === "agreement_objection" ? "Stage 4" : stage,
      type: msgType,
      issueSection: msgType === "agreement_objection" ? issueSection : undefined,
      issuePoint: issuePoint.trim(),
      investorConcern: investorConcern.trim(),
    });

    try {
      await sendDirectMessage({
        fromId: investorUid,
        toId: entrepreneurUid,
        fromName: investorName,
        text: formatted,
      });

      const entry = sendInvestorMessage({
        ideaId: idea.id,
        startupTitle: idea.startupTitle,
        founderName: idea.founderName,
        investorName,
        stage: msgType === "agreement_objection" ? "Stage 4" : stage,
        type: msgType,
        issueSection: msgType === "agreement_objection" ? issueSection : undefined,
        issuePoint: issuePoint.trim(),
        investorConcern: investorConcern.trim(),
        formattedPayload: formatted,
      });

      setIssuePoint("");
      setInvestorConcern("");
      setDialogOpen(false);
      setShowThread(true);
      onMessageSent?.(entry);
    } catch (err) {
      console.error(err);
      toast.error("Failed to send message to founder.");
    } finally {
      setFlying(false);
    }
  };

  const showWaiting = pendingMessage && pendingMessage.status === "pending";

  return (
    <>
      {flying && (
        <div className="pointer-events-none fixed inset-0 z-[200] overflow-hidden">
          <div className="paper-plane-fly absolute bottom-24 right-8 flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2 text-white shadow-2xl">
            <Send className="h-5 w-5 -rotate-[30deg]" />
            <span className="text-xs font-bold">Message sent to {idea.founderName}</span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-600 text-white shadow-xl shadow-indigo-500/40 transition-transform hover:scale-110"
        title="Message Founder"
      >
        <MessageCircle className="h-6 w-6" />
        {showWaiting && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-amber-500 ring-2 ring-white" />
          </span>
        )}
      </button>

      {showThread && conversation.length > 0 && (
        <div className="fixed bottom-40 right-6 z-40 w-80 max-h-64 overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-indigo-100 bg-indigo-50 px-3 py-2">
            <p className="text-xs font-bold text-indigo-900">Chat with {idea.founderName}</p>
            <button type="button" onClick={() => setShowThread(false)} className="text-indigo-400 hover:text-indigo-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-44 space-y-2 overflow-y-auto p-3">
            {conversation.map((m) => (
              <div
                key={m.id}
                className={`rounded-xl px-2.5 py-2 text-[11px] ${
                  m.fromId === investorUid
                    ? "ml-6 bg-indigo-100 text-indigo-900"
                    : "mr-6 bg-slate-100 text-slate-700"
                }`}
              >
                <p className="text-[9px] font-bold text-indigo-600">{m.fromName}</p>
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-indigo-100 p-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs"
              onClick={() => {
                setShowThread(false);
                setDialogOpen(true);
              }}
            >
              <Send className="mr-1 h-3 w-3" /> New message
            </Button>
          </div>
        </div>
      )}

      {showWaiting &&
        pendingMessage &&
        (waitMinimized ? (
          <button
            type="button"
            onClick={() => setWaitMinimized(false)}
            className="fixed bottom-8 left-4 z-40 flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 shadow-lg sm:left-8"
          >
            <Clock className="h-4 w-4 text-amber-600 animate-pulse" />
            <span className="text-xs font-bold text-amber-800">Awaiting {idea.founderName}…</span>
            <Maximize2 className="h-3.5 w-3.5 text-amber-600" />
          </button>
        ) : (
          <div className="fixed bottom-8 left-4 right-4 z-40 mx-auto max-w-md rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-xl sm:left-8 sm:right-auto">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200">
                  <Clock className="h-5 w-5 text-amber-700 animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-900">Waiting for Founder Reply</p>
                  <p className="text-[10px] text-amber-700">Stage 4 · Pending resolution</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWaitMinimized(true)}
                className="rounded-lg p-1 text-amber-600 hover:bg-amber-100"
                aria-label="Minimize"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-600 line-clamp-2">{pendingMessage.issuePoint}</p>
            <p className="mt-1 text-[10px] text-slate-400">Sent {pendingMessage.timestamp}</p>
          </div>
        ))}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-hidden rounded-2xl border-indigo-200 p-0 gap-0">
          <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-700 px-5 py-4 text-white">
            <DialogHeader className="text-left">
              <DialogTitle className="flex items-center gap-2 font-display text-lg text-white">
                <Send className="h-5 w-5" /> Message to Founder
              </DialogTitle>
              <DialogDescription className="text-indigo-100 text-xs">
                {idea.startupTitle} · {idea.founderName} · {stage}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="max-h-[60vh] overflow-y-auto investor-feed-scroll p-5 space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMsgType("general_query")}
                className={`flex-1 rounded-xl border px-3 py-2 text-[10px] font-bold transition-all ${
                  msgType === "general_query"
                    ? "border-indigo-400 bg-indigo-50 text-indigo-800"
                    : "border-slate-200 text-slate-500"
                }`}
              >
                General Question
              </button>
              <button
                type="button"
                onClick={() => setMsgType("agreement_objection")}
                className={`flex-1 rounded-xl border px-3 py-2 text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                  msgType === "agreement_objection"
                    ? "border-amber-400 bg-amber-50 text-amber-800"
                    : "border-slate-200 text-slate-500"
                }`}
              >
                <AlertTriangle className="h-3 w-3" /> Agreement Objection
              </button>
            </div>

            {msgType === "agreement_objection" && (
              <div>
                <Label className="text-xs">Agreement clause in question</Label>
                <select
                  value={issueSection}
                  onChange={(e) => setIssueSection(e.target.value)}
                  className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 text-xs"
                >
                  {AGREEMENT_CLAUSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label className="text-xs">Issue point (short summary)</Label>
              <Input
                value={issuePoint}
                onChange={(e) => setIssuePoint(e.target.value)}
                placeholder="e.g. Escrow release timeline unclear"
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs">Your concern / question (detailed)</Label>
              <Textarea
                value={investorConcern}
                onChange={(e) => setInvestorConcern(e.target.value)}
                placeholder="Explain your issue in detail. Sent in SmartBiz official format to the entrepreneur."
                rows={4}
                className="mt-1 rounded-xl text-sm"
              />
            </div>

            {(issuePoint || investorConcern) && (
              <div className="rounded-xl border border-indigo-200 bg-slate-50 p-3">
                <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-indigo-600">
                  Message preview
                </p>
                <pre className="whitespace-pre-wrap font-mono text-[9px] leading-relaxed text-slate-700">
                  {buildInvestorMessageFormat({
                    startupTitle: idea.startupTitle,
                    founderName: idea.founderName,
                    investorName,
                    stage: msgType === "agreement_objection" ? "Stage 4" : stage,
                    type: msgType,
                    issueSection: msgType === "agreement_objection" ? issueSection : undefined,
                    issuePoint: issuePoint || "…",
                    investorConcern: investorConcern || "…",
                  })}
                </pre>
              </div>
            )}
          </div>

          <div className="flex gap-2 border-t border-indigo-100 bg-white px-5 py-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
              <X className="mr-1 h-4 w-4" /> Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!issuePoint.trim() || !investorConcern.trim() || flying || !investorUid}
              className="flex-1 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 font-bold hover:from-sky-600 hover:to-indigo-700"
            >
              <Send className="mr-2 h-4 w-4" />
              Send to Founder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
