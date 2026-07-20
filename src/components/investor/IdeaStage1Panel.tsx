import {
  BookOpen,
  TrendingUp,
  PieChart,
  Building2,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";
import type { StartupIdea } from "@/data/startupIdeas";

type IdeaStage1PanelProps = {
  idea: StartupIdea;
  onAskAi: (term: string) => void;
  checkedItems: Set<string>;
  onToggleCheck: (item: string) => void;
};

export function IdeaStage1Panel({ idea, onAskAi, checkedItems, onToggleCheck }: IdeaStage1PanelProps) {
  const sp = idea.stage3.socialProof;

  const terms = [
    { key: "ideaDescription", label: "Business Description", value: idea.stage1.ideaDescription, icon: BookOpen, termId: "Business Description" },
    {
      key: "coreProblemSolution",
      label: "Problem / Solution",
      value: idea.stage1.coreProblemSolution ?? "",
      icon: Lightbulb,
      termId: "Problem / Solution",
    },
    { key: "expectedRoi", label: "Expected ROI", value: idea.stage1.expectedRoi, icon: TrendingUp, termId: "Expected ROI" },
    { key: "equity", label: "Equity Offered", value: idea.stage1.equityOffered, icon: PieChart, termId: "Equity Offered" },
    { key: "industry", label: "Industry Field", value: idea.stage1.industryField || idea.stage1.categoryIndustry || "", icon: Building2, termId: "Industry Field" },
  ].filter((term) => String(term.value ?? "").trim().length > 0);

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

      {/* Main content — authentic founder terms only */}
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {terms.map((term) => {
            const Icon = term.icon;
            return (
              <button
                key={term.key}
                type="button"
                onClick={() => onAskAi(term.termId)}
                className={`group rounded-2xl border p-4 text-left transition-all hover:shadow-md ${
                  term.key === "ideaDescription" || term.key === "coreProblemSolution" ? "sm:col-span-2" : ""
                } border-amber-100/80 bg-white hover:border-amber-200`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 group-hover:bg-amber-500 group-hover:text-white">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700/70">{term.label}</span>
                </div>
                <p
                  className={`text-sm text-slate-800 ${
                    term.key !== "ideaDescription" && term.key !== "coreProblemSolution"
                      ? "font-display font-bold"
                      : ""
                  }`}
                >
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
