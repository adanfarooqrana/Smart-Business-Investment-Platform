import { useState, useMemo } from "react";
import { Bot, Send, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/hooks/useAppState";

export function WeeklyFollowUpPanel() {
  const { weeklyFollowUps, completeWeeklyFollowUp } = useAppState();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const dueFollowUps = useMemo(
    () =>
      (weeklyFollowUps || []).filter(
        (f) => f.status === "pending" && Date.now() >= f.dueAt,
      ),
    [weeklyFollowUps],
  );

  if (dueFollowUps.length === 0) return null;

  return (
    <div className="mb-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
      {dueFollowUps.map((followUp) => (
        <div
          key={followUp.id}
          className="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50 via-indigo-50/80 to-slate-50 p-5 shadow-sm"
        >
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600">
                Weekly AI Follow-up · 1 Week Post-Investment
              </p>
              <h3 className="font-display text-base font-bold text-slate-900">
                Update request generator for {followUp.startupTitle}
              </h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Let's ask the founder about these metrics. SmartBiz AI has pre-loaded suggested questions based on your investment terms.
              </p>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {followUp.suggestedMetrics.map((metric) => (
              <span
                key={metric}
                className="rounded-full border border-violet-200 bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-violet-800"
              >
                {metric}
              </span>
            ))}
          </div>

          <div className="rounded-xl border border-violet-100 bg-white/90 p-3 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-4 w-4 text-violet-600" />
              <span className="text-[10px] font-bold uppercase text-violet-700">AI Draft Message to Founder</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed italic">
              "Hi — this is my 1-week post-investment check-in for {followUp.startupTitle}. Could you share updates on: {followUp.suggestedMetrics.slice(0, 3).join("; ")}? Looking forward to the weekly report."
            </p>
          </div>

          <textarea
            rows={2}
            placeholder="Customize your weekly update request to the founder…"
            value={drafts[followUp.id] ?? ""}
            onChange={(e) => setDrafts((d) => ({ ...d, [followUp.id]: e.target.value }))}
            className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400/30"
          />

          <div className="flex gap-2">
            <Button
              size="sm"
              className="rounded-xl bg-violet-600 hover:bg-violet-700 text-xs"
              onClick={() => completeWeeklyFollowUp(followUp.id)}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Send Weekly Update Request
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-xs"
              onClick={() => completeWeeklyFollowUp(followUp.id)}
            >
              Mark as Sent
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
