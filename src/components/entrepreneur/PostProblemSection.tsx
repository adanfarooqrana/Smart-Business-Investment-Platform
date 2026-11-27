import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Loader2,
  Send,
  Target,
  CheckCircle2,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  PROBLEM_CATEGORIES,
  submitEntrepreneurProblem,
  fetchEntrepreneurProblemsByFounder,
  type EntrepreneurProblem,
  type ProblemTargetRole,
} from "@/services/entrepreneurProblemService";

const TARGET_OPTIONS: { value: ProblemTargetRole; label: string; desc: string }[] = [
  { value: "wholesalers", label: "Wholesalers", desc: "Bulk supply & sourcing" },
  { value: "business_owners", label: "Business Owners", desc: "Retail & operations" },
  { value: "both", label: "Both Networks", desc: "Maximum reach" },
];

type Props = {
  founderId: string;
  founderName: string;
  darkMode?: boolean;
  onRouted?: (data: {
    problemId: string;
    title: string;
    description: string;
    category: string;
    targetRole: ProblemTargetRole;
    routingSummary: string;
    experts: string[];
    urgency: "High" | "Medium" | "Low";
  }) => void;
};

export function PostProblemSection({ founderId, founderName, darkMode, onRouted }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(PROBLEM_CATEGORIES[0]);
  const [targetRole, setTargetRole] = useState<ProblemTargetRole>("both");
  const [urgency, setUrgency] = useState<"High" | "Medium" | "Low">("Medium");
  const [submitting, setSubmitting] = useState(false);
  const [recentProblems, setRecentProblems] = useState<EntrepreneurProblem[]>([]);
  const [lastRoutingSummary, setLastRoutingSummary] = useState<string | null>(null);

  const loadRecent = useCallback(async () => {
    if (!founderId) return;
    try {
      const list = await fetchEntrepreneurProblemsByFounder(founderId);
      setRecentProblems(list.slice(0, 3));
    } catch {
      setRecentProblems([]);
    }
  }, [founderId]);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Please enter a problem title and detailed description.");
      return;
    }
    if (!founderId) {
      toast.error("Founder session not found. Please sign in again.");
      return;
    }

    setSubmitting(true);
    try {
      const { problem, routing } = await submitEntrepreneurProblem({
        founderId,
        founderName,
        title: title.trim(),
        description: description.trim(),
        category,
        targetRole,
      });

      setLastRoutingSummary(routing.summary);
      onRouted?.({
        problemId: problem.id,
        title: title.trim(),
        description: description.trim(),
        category: routing.refinedCategory,
        targetRole,
        routingSummary: routing.summary,
        experts: routing.experts,
        urgency: routing.urgency,
      });

      toast.success("Problem posted — AI routed to matching partners.");
      setTitle("");
      setDescription("");
      await loadRecent();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Could not save problem.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (darkMode) {
    return (
      <section className="relative overflow-hidden rounded-2xl border border-[#FFD700]/20 bg-gradient-to-b from-[#1f1f38] to-[#16162a] shadow-xl shadow-black/30">
        {/* Accent glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#FFA500]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-[#FFD700]/10 blur-3xl" />

        <div className="relative border-b border-white/5 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#FFD700]/30 bg-[#FFD700]/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-[#FFD700]">
                <Sparkles className="h-3 w-3" /> AI Problem Portal
              </span>
              <h2 className="font-display text-base font-bold text-white">Post a Problem</h2>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                Describe your hurdle — AI routes it to verified wholesalers & business owners.
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFA500]/15 ring-1 ring-[#FFA500]/30">
              <AlertTriangle className="h-5 w-5 text-[#FFA500]" />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="relative space-y-4 px-5 py-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Problem title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Need reliable bulk rice supplier"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-[#FFD700]/50 focus:ring-2 focus:ring-[#FFD700]/20"
              maxLength={120}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Detailed description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What exactly is blocking your growth? Include quantity, location, timeline..."
              rows={4}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm leading-relaxed text-white placeholder:text-slate-600 outline-none transition focus:border-[#FFD700]/50 focus:ring-2 focus:ring-[#FFD700]/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Urgency level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["High", "Medium", "Low"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUrgency(u)}
                  className={`rounded-xl border px-2 py-2 text-[10px] font-bold transition ${
                    urgency === u
                      ? u === "High"
                        ? "border-red-400/50 bg-red-500/20 text-red-300"
                        : u === "Medium"
                          ? "border-[#FFA500]/50 bg-[#FFA500]/20 text-[#FFD700]"
                          : "border-emerald-400/50 bg-emerald-500/20 text-emerald-300"
                      : "border-white/10 bg-white/[0.02] text-slate-500 hover:border-white/20"
                  }`}
                >
                  <Zap className="mx-auto mb-0.5 h-3 w-3" />
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#141428] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#FFD700]/50"
            >
              {PROBLEM_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <Target className="h-3 w-3" /> Route to
            </label>
            <div className="space-y-1.5">
              {TARGET_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTargetRole(opt.value)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                    targetRole === opt.value
                      ? "border-[#FFD700]/40 bg-[#FFD700]/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  <Users className={`h-4 w-4 shrink-0 ${targetRole === opt.value ? "text-[#FFD700]" : "text-slate-500"}`} />
                  <div>
                    <p className={`text-xs font-semibold ${targetRole === opt.value ? "text-white" : "text-slate-300"}`}>
                      {opt.label}
                    </p>
                    <p className="text-[10px] text-slate-500">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {lastRoutingSummary && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" /> Last AI routing
              </p>
              <p className="text-[11px] leading-relaxed text-emerald-200/80">{lastRoutingSummary}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-[#FFA500] to-[#FFD700] py-5 text-sm font-bold text-[#1a1a2e] shadow-lg shadow-[#FFA500]/20 hover:opacity-95"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Routing to experts...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" /> Post & Route Problem
              </>
            )}
          </Button>

          <div className="flex items-center gap-2 rounded-xl border border-[#FFD700]/15 bg-[#FFD700]/5 px-3 py-2">
            <Bot className="h-4 w-4 shrink-0 text-[#FFA500]" />
            <p className="text-[10px] leading-snug text-slate-400">
              AI matches your problem with verified partners in the InvestBiz network.
            </p>
          </div>
        </form>

        {recentProblems.length > 0 && (
          <div className="border-t border-white/5 px-5 py-4">
            <h3 className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Recent problems
            </h3>
            <ul className="space-y-2">
              {recentProblems.map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-200">
                      {p.title || p.problemText.split("\n")[0]}
                    </span>
                    <span className="shrink-0 rounded-full bg-[#FFA500]/15 px-2 py-0.5 text-[9px] font-bold uppercase text-[#FFA500]">
                      {p.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {p.category} · {p.targetRole.replace("_", " ")}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    );
  }

  // Light mode (unchanged layout, minor polish)
  return (
    <section className="mb-8 rounded-3xl border border-[#FFA500]/25 bg-white/95 p-5 shadow-lg md:p-6">
      <div className="mb-5 flex flex-col gap-2">
        <div>
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            <AlertTriangle className="h-3 w-3" /> Founder Problem Portal
          </p>
          <h2 className="font-display text-lg font-extrabold text-slate-900 md:text-xl">Post a Problem</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            AI routes your problem to verified wholesalers & business owners.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-600">
            Title of Problem
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Need bulk rice supplier"
            className="w-full rounded-xl border border-[#FFA500]/25 bg-[#FFF8E1]/40 px-4 py-2.5 text-sm text-slate-900 outline-none ring-[#FFA500]/30 focus:border-[#FFA500] focus:ring-2"
            maxLength={120}
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-600">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the hurdle..."
            rows={3}
            className="w-full resize-y rounded-xl border border-[#FFA500]/25 bg-[#FFF8E1]/40 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#FFA500] focus:ring-2 focus:ring-[#FFA500]/30"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-600">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-[#FFA500]/25 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#FFA500] focus:ring-2 focus:ring-[#FFA500]/30"
            >
              {PROBLEM_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
              <Target className="h-3 w-3" /> Target Audience
            </label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value as ProblemTargetRole)}
              className="w-full rounded-xl border border-[#FFA500]/25 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#FFA500] focus:ring-2 focus:ring-[#FFA500]/30"
            >
              {TARGET_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#FFA500]/20"
          style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Routing problem...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> Post & Route Problem
            </>
          )}
        </Button>
      </form>
    </section>
  );
}
