import { Clock, CheckCircle2, MessageSquare, Send, AlertTriangle } from "lucide-react";
import type { InvestorEntrepreneurMessage } from "@/hooks/useAppState";
import type { StartupIdea } from "@/data/startupIdeas";
import { Button } from "@/components/ui/button";

type IdeaStage4PanelProps = {
  idea: StartupIdea;
  message: InvestorEntrepreneurMessage;
  onResolved?: () => void;
};

export function IdeaStage4Panel({ idea, message, onResolved }: IdeaStage4PanelProps) {
  const isPending = message.status === "pending";
  const isAnswered = message.status === "answered";

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="rounded-2xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-50 via-orange-50/80 to-yellow-50 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-200">
            {isPending ? (
              <Clock className="h-6 w-6 text-amber-700 animate-pulse" />
            ) : (
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Stage 4 · Pending Resolution</p>
            <h3 className="font-display text-lg font-bold text-slate-900">
              {isPending ? `Awaiting reply from ${idea.founderName}` : "Founder has responded"}
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Your {message.type === "agreement_objection" ? "agreement objection" : "message"} was delivered in SmartBiz official format.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <Send className="h-3.5 w-3.5" /> Your sent message
        </p>
        <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-mono text-[10px] leading-relaxed text-slate-700">
          {message.formattedPayload}
        </pre>
        <p className="mt-2 text-[10px] text-slate-400">Sent {message.timestamp}</p>
      </div>

      {isAnswered && message.entrepreneurReply && (
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/80 p-4 animate-in slide-in-from-bottom-2">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            <MessageSquare className="h-3.5 w-3.5" /> Reply from {idea.founderName}
          </p>
          <p className="text-sm leading-relaxed text-slate-800">{message.entrepreneurReply}</p>
          <p className="mt-2 text-[10px] text-slate-500">{message.repliedAt}</p>
          {onResolved && (
            <Button onClick={onResolved} className="mt-4 rounded-xl bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Resolved & Continue
            </Button>
          )}
        </div>
      )}

      {isPending && (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-500 mb-2" />
          <p className="text-sm font-semibold text-amber-900">Founder is reviewing your message</p>
          <p className="mt-1 text-xs text-slate-500">
            You can minimize the waiting banner and browse other stages. You&apos;ll see the reply here when {idea.founderName} responds on their dashboard.
          </p>
        </div>
      )}
    </div>
  );
}
