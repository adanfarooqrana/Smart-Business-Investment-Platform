import { useState } from "react";
import { Bot, X, Sparkles } from "lucide-react";

const QUICK_PROMPTS = [
  {
    label: "How to counter equity demands?",
    reply:
      "Thank you for your interest. Our equity offer reflects current valuation and growth runway. We're open to discussing milestone-based tranches — happy to schedule a call to align on terms that protect both parties.",
  },
  {
    label: "Draft a formal update text",
    reply:
      "Dear Investor,\n\nQuick operational update: we remain on track against our disclosed milestones. Revenue metrics and proof uploads in Stage 2 are current as of this week. Please let me know if you need any additional documentation.\n\nBest regards,\nFounder",
  },
  {
    label: "Respond to ROI concerns",
    reply:
      "Our projected ROI is based on verified unit economics shared in Stage 2. Happy to walk through assumptions line-by-line — our expense breakdown and customer base data support the forecast conservatively.",
  },
  {
    label: "Sample shipment confirmation",
    reply:
      "Your sample request has been approved and picked for dispatch. Tracking details are attached — expect delivery within the courier SLA. Please confirm receipt so we can proceed to the next investment milestone.",
  },
];

type Props = {
  onInsertReply: (text: string) => void;
};

export function FounderInvestmentExpert({ onInsertReply }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="absolute bottom-24 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full text-2xl shadow-xl transition-transform hover:scale-105"
        style={{
          background: "linear-gradient(135deg, #FFA500, #FFD700)",
          boxShadow: "0 8px 24px rgba(255,165,0,0.45)",
        }}
        title="Investment Expert AI"
      >
        🤖
      </button>

      {open && (
        <div className="absolute bottom-40 right-4 z-20 w-72 rounded-2xl border border-[#FFA500]/30 bg-white p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
              >
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Investment Expert AI</p>
                <p className="text-[9px] text-[#FFA500]">Founder quick-reply desk</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  onInsertReply(p.reply);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2 rounded-xl border border-[#FFD700]/40 bg-[#FFF8E1]/60 px-3 py-2 text-left text-[11px] font-medium text-slate-700 transition-colors hover:border-[#FFA500] hover:bg-[#FFF8E1]"
              >
                <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-[#FFA500]" />
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
