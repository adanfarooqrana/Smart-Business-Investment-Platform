import {
  BookOpen,
  TrendingUp,
  PieChart,
  BarChart3,
  Percent,
  Building2,
  Lightbulb,
  Users,
  Coins,
  Star,
  MessageCircle,
  CheckCircle2,
} from "lucide-react";
import type { StartupIdea } from "@/data/startupIdeas";
import { formatPkr } from "@/lib/investmentCalculator";

type IdeaStage1PanelProps = {
  idea: StartupIdea;
  onAskAi: (term: string) => void;
  checkedItems: Set<string>;
  onToggleCheck: (item: string) => void;
};

export function IdeaStage1Panel({ idea, onAskAi, checkedItems, onToggleCheck }: IdeaStage1PanelProps) {
  const sp = idea.stage3.socialProof;

  const terms = [
    { key: "ideaDescription", label: "Idea Description", value: idea.stage1.ideaDescription, icon: BookOpen, termId: "Idea Description" },
    { key: "expectedRoi", label: "Expected ROI", value: idea.stage1.expectedRoi, icon: TrendingUp, termId: "Expected ROI" },
    { key: "profitSharing", label: "Profit Sharing", value: idea.stage1.profitSharingPercent, icon: Percent, termId: "Profit Sharing" },
    { key: "ebitda", label: "EBITDA Estimate", value: idea.stage1.ebitdaEstimate, icon: BarChart3, termId: "EBITDA Estimate" },
    { key: "equity", label: "Equity Offered", value: idea.stage1.equityOffered, icon: PieChart, termId: "Equity Offered" },
    { key: "industry", label: "Industry Field", value: idea.stage1.industryField, icon: Building2, termId: "Industry Field" },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
      {/* Left — What to look at (sunlight sidebar) */}
      <aside className="rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50 via-orange-50/80 to-yellow-50/60 p-4 shadow-sm lg:sticky lg:top-36 lg:self-start">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-400/30">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700/80">Investor Guide</p>
            <p className="text-sm font-bold text-amber-950">Kya Dekhna Hai?</p>
          </div>
        </div>
        <p className="mb-3 text-[11px] leading-relaxed text-amber-900/70">
          Stage 1 review checklist — tick each item as you verify entrepreneur disclosures.
        </p>
        <ul className="space-y-2">
          {sp.lookForChecklist.map((item) => {
            const checked = checkedItems.has(item);
            return (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => onToggleCheck(item)}
                  className={`flex w-full items-start gap-2 rounded-xl border px-2.5 py-2 text-left text-[11px] transition-all ${
                    checked
                      ? "border-emerald-300/80 bg-emerald-50/80 text-emerald-900"
                      : "border-amber-200/60 bg-white/70 text-amber-950 hover:border-amber-300"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-amber-300 bg-white"
                    }`}
                  >
                    {checked && <CheckCircle2 className="h-2.5 w-2.5" />}
                  </span>
                  {item}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Main content */}
      <div className="space-y-5">
        {/* Social proof strip — sunlight theme */}
        <section className="relative overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-100/90 via-orange-50 to-yellow-50 p-5 shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(251,191,36,0.25),transparent_50%)]" />
          <div className="relative grid gap-4 sm:grid-cols-3">
            <StatBlock
              icon={Users}
              label="Investors Joined"
              value={`${sp.investorCount}+`}
              sub="verified on-platform"
            />
            <StatBlock
              icon={Coins}
              label="Total Invested"
              value={formatPkr(sp.totalInvestedPkr)}
              sub="in this startup"
            />
            <StatBlock
              icon={Star}
              label="Avg. Rating"
              value={`${(sp.investorFeedback.reduce((a, f) => a + f.rating, 0) / sp.investorFeedback.length).toFixed(1)}/5`}
              sub="investor sentiment"
            />
          </div>

          {/* Investor voices */}
          <div className="relative mt-5 border-t border-amber-200/60 pt-4">
            <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-800/80">
              <MessageCircle className="h-3.5 w-3.5" />
              Investors Is Idea Ke Baare Mein Kya Kehte Hain
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sp.investorFeedback.map((fb) => (
                <blockquote
                  key={fb.author}
                  className="rounded-xl border border-white/80 bg-white/70 p-3 shadow-sm backdrop-blur-sm"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{fb.author}</p>
                      <p className="text-[9px] text-slate-500">{fb.role}</p>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: fb.rating }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-700 italic">"{fb.comment}"</p>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        {/* Financial terms grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {terms.map((term) => {
            const Icon = term.icon;
            return (
              <button
                key={term.key}
                type="button"
                onClick={() => onAskAi(term.termId)}
                className={`group rounded-2xl border p-4 text-left transition-all hover:shadow-md ${
                  term.key === "ideaDescription" ? "sm:col-span-2" : ""
                } border-amber-100/80 bg-white hover:border-amber-200`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 group-hover:bg-amber-500 group-hover:text-white">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700/70">{term.label}</span>
                </div>
                <p className={`text-sm text-slate-800 ${term.key !== "ideaDescription" ? "font-display font-bold" : ""}`}>
                  {term.value}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatBlock({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-white/60 bg-white/60 p-3 backdrop-blur-sm">
      <Icon className="mb-1.5 h-4 w-4 text-amber-600" />
      <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700/70">{label}</p>
      <p className="font-display text-lg font-black text-amber-950">{value}</p>
      <p className="text-[9px] text-amber-800/60">{sub}</p>
    </div>
  );
}
