import { useState, useMemo, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Lock,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import type { StartupIdea } from "@/data/startupIdeas";
import type { InvestorStage } from "@/lib/investorIntelligentAi";
import { calculateInvestmentProjection, parseInvestmentInput } from "@/lib/investmentCalculator";
import { InvestorIntelligentAI, InvestorAiFloatingButton } from "@/components/investor/InvestorIntelligentAI";
import { IdeaStage1Panel } from "@/components/investor/IdeaStage1Panel";
import { IdeaStage2Panel } from "@/components/investor/IdeaStage2Panel";
import { IdeaStage3Panel } from "@/components/investor/IdeaStage3Panel";
import { IdeaStage4Panel } from "@/components/investor/IdeaStage4Panel";
import { InvestorFounderMessenger } from "@/components/investor/InvestorFounderMessenger";
import { Badge } from "@/components/ui/badge";
import { useAppState } from "@/hooks/useAppState";

const STAGES = [
  { id: 1 as const, label: "Stage 1", title: "Idea & Financial Terms", theme: "amber" as const },
  { id: 2 as const, label: "Stage 2", title: "Financial Requirements & Validation", theme: "orange" as const },
  { id: 3 as const, label: "Stage 3", title: "Legal, Escrow & Milestones", theme: "emerald" as const },
  { id: 4 as const, label: "Stage 4", title: "Founder Response · Pending", theme: "violet" as const },
];

type IdeaDetailViewProps = {
  idea: StartupIdea;
};

export function IdeaDetailView({ idea }: IdeaDetailViewProps) {
  const {
    investor,
    investments,
    signedAgreements,
    signIdeaAgreement,
    investorEntrepreneurMessages,
    resolveInvestorMessage,
  } = useAppState();
  const [activeStage, setActiveStage] = useState<1 | 2 | 3 | 4>(1);
  const [stageTransition, setStageTransition] = useState(false);
  const [stage1Done, setStage1Done] = useState(false);
  const [stage2Done, setStage2Done] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [highlightedTerm, setHighlightedTerm] = useState("Idea Description");
  const [investInput, setInvestInput] = useState("500000");
  const [aiStage, setAiStage] = useState<InvestorStage>(1);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeType, setComposeType] = useState<"agreement_objection" | "general_query">("general_query");

  const investorName = investor.name || "Verified Investor";
  const agreementKey = `${idea.id}-${investorName}`;
  const agreementSigned = !!signedAgreements?.[agreementKey];
  const existingInvestment = investments.find(
    (inv) => inv.ideaId === idea.id && inv.status === "completed",
  );
  const paymentCompleted = !!existingInvestment;

  const activeMessage = useMemo(
    () =>
      investorEntrepreneurMessages.find(
        (m) =>
          m.ideaId === idea.id &&
          m.investorName === investorName &&
          m.status !== "resolved",
      ),
    [investorEntrepreneurMessages, idea.id, investorName],
  );
  const hasPendingStage4 = !!activeMessage && activeMessage.status !== "resolved";

  const stageLabel = (id: 1 | 2 | 3 | 4): "Stage 1" | "Stage 2" | "Stage 3" | "Stage 4" =>
    `Stage ${id}` as "Stage 1" | "Stage 2" | "Stage 3" | "Stage 4";

  const amount = parseInvestmentInput(investInput);
  const projection = useMemo(
    () => calculateInvestmentProjection(amount, idea.stage2.investmentFormula),
    [amount, idea.stage2.investmentFormula],
  );

  const goToStage = (next: 1 | 2 | 3 | 4) => {
    setStageTransition(true);
    setTimeout(() => {
      setActiveStage(next);
      setStageTransition(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 280);
  };

  const completeStage1 = () => {
    setStage1Done(true);
    goToStage(2);
  };

  const completeStage2 = () => {
    setStage2Done(true);
    goToStage(3);
  };

  useEffect(() => {
    if (activeMessage && (activeMessage.status === "pending" || activeMessage.status === "answered")) {
      setActiveStage(4);
    }
  }, [activeMessage?.id, activeMessage?.status]);

  useEffect(() => {
    if (agreementSigned && activeStage < 3) setStage1Done(true);
    if (paymentCompleted) {
      setStage1Done(true);
      setStage2Done(true);
    }
  }, [agreementSigned, paymentCompleted, activeStage]);

  const openAi = (term?: string, stage: InvestorStage = 1) => {
    if (term) setHighlightedTerm(term);
    setAiStage(stage);
    setAiOpen(true);
  };

  const toggleCheck = (item: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };

  const stageComplete = (id: 1 | 2 | 3 | 4) => {
    if (id === 1) return stage1Done || agreementSigned;
    if (id === 2) return stage2Done || agreementSigned;
    if (id === 3) return paymentCompleted && !hasPendingStage4;
    if (id === 4) return activeMessage?.status === "resolved";
    return false;
  };

  const handleMessageSent = () => {
    goToStage(4);
  };

  return (
    <div className="relative mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        to="/app/investor"
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Ideas Feed
      </Link>

      {/* Header */}
      <div className="mb-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full border-slate-300 text-[10px] font-bold uppercase tracking-wider">
            {idea.industry}
          </Badge>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            <Lock className="h-2.5 w-2.5" /> Entrepreneur Verified
          </span>
          {paymentCompleted && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> Invested
            </span>
          )}
        </div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          {idea.startupTitle}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Founder: <span className="font-semibold text-slate-700">{idea.founderName}</span>
        </p>
      </div>

      {/* Top horizontal stage stepper */}
      <div className="sticky top-14 z-20 mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-md backdrop-blur-md sm:top-[3.5rem]">
        <div className="relative flex items-stretch gap-0">
          {/* Progress line behind steps */}
          <div className="absolute left-[12.5%] right-[12.5%] top-5 hidden h-0.5 bg-slate-200 sm:block">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-orange-400 via-emerald-500 to-violet-500 transition-all duration-700 ease-out"
              style={{
                width:
                  activeStage === 1 ? "0%" : activeStage === 2 ? "33%" : activeStage === 3 ? "66%" : "100%",
              }}
            />
          </div>

          {STAGES.map((stage) => {
            const isActive = activeStage === stage.id;
            const isComplete = stageComplete(stage.id);
            const canNavigate =
              stage.id === 4 ? !!activeMessage : stage.id <= activeStage || isComplete || !!activeMessage;

            return (
              <button
                key={stage.id}
                type="button"
                disabled={!canNavigate && stage.id > activeStage}
                onClick={() => canNavigate && goToStage(stage.id)}
                className={`relative flex flex-1 flex-col items-center gap-2 px-2 py-1 text-center transition-all duration-300 sm:flex-row sm:justify-center sm:gap-3 sm:px-4 sm:py-2 sm:text-left ${
                  isActive
                    ? stage.theme === "emerald"
                      ? "rounded-xl border border-emerald-300 bg-emerald-50 shadow-sm ring-1 ring-emerald-200"
                      : stage.theme === "orange"
                      ? "rounded-xl border border-orange-300 bg-orange-50 shadow-sm ring-1 ring-orange-200"
                      : stage.theme === "violet"
                      ? "rounded-xl border border-violet-300 bg-violet-50 shadow-sm ring-1 ring-violet-200"
                      : "rounded-xl border border-amber-300 bg-amber-50 shadow-sm ring-1 ring-amber-200"
                    : "rounded-xl border border-transparent hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black transition-all duration-500 ${
                    isComplete && !isActive
                      ? "bg-emerald-100 text-emerald-700 scale-95"
                      : isActive
                      ? stage.theme === "emerald"
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-110"
                        : stage.theme === "orange"
                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-110"
                        : stage.theme === "violet"
                        ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30 scale-110 animate-pulse"
                        : "bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-110"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {isComplete && !isActive ? (
                    <CheckCircle2 className="h-5 w-5 animate-in zoom-in duration-300" />
                  ) : (
                    stage.id
                  )}
                </div>
                <div className="min-w-0 hidden sm:block">
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-slate-700" : "text-slate-400"}`}>
                    {stage.label}
                  </p>
                  <p className={`text-xs font-semibold leading-snug ${isActive ? "text-slate-900" : "text-slate-500"}`}>
                    {stage.title}
                  </p>
                </div>
                <p className={`text-[10px] font-bold uppercase sm:hidden ${isActive ? "text-slate-700" : "text-slate-400"}`}>
                  {stage.label}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Single active stage with transition */}
      <div
        className={`stage-content-transition ${stageTransition ? "stage-content-exit" : "stage-content-enter"}`}
      >
        {activeStage === 1 && (
          <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-b from-amber-50/30 to-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between border-b border-amber-100 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Stage 1</p>
                <h2 className="font-display text-lg font-bold text-amber-950">Idea & Financial Terms</h2>
              </div>
              <button
                type="button"
                onClick={() => openAi(undefined, 1)}
                className="rounded-full bg-amber-500 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-amber-600"
              >
                Ask AI
              </button>
            </div>
            <IdeaStage1Panel
              idea={idea}
              onAskAi={(term) => openAi(term, 1)}
              checkedItems={checkedItems}
              onToggleCheck={toggleCheck}
            />
            <button
              type="button"
              onClick={completeStage1}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl hover:shadow-amber-500/30"
            >
              Stage 1 Complete — Continue to Stage 2
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {activeStage === 2 && (
          <div className="rounded-2xl border border-orange-200/60 bg-gradient-to-b from-orange-50/40 to-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between border-b border-orange-100 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Stage 2</p>
                <h2 className="font-display text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  Financial Requirements & Validation
                </h2>
              </div>
              <button
                type="button"
                onClick={() => openAi("Market Viability", 2)}
                className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1.5 text-[10px] font-bold text-white"
              >
                Market Expert AI
              </button>
            </div>
            <IdeaStage2Panel
              idea={idea}
              onAskAi={(term) => openAi(term, 2)}
              investInput={investInput}
              onInvestInputChange={setInvestInput}
            />
            <button
              type="button"
              onClick={completeStage2}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:shadow-xl"
            >
              Stage 2 Complete — Proceed to Stage 3
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {activeStage === 3 && (
          <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-b from-emerald-50/40 to-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 border-b border-emerald-100 pb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Stage 3</p>
              <h2 className="font-display text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Legal, Escrow Payment & Milestone Tracking
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Investment: PKR {amount.toLocaleString()} · Equity: {projection.assignedEquityPercent.toFixed(2)}%
              </p>
            </div>
            <IdeaStage3Panel
              idea={idea}
              investmentAmountPkr={amount}
              equityPercent={projection.assignedEquityPercent}
              agreementSigned={agreementSigned}
              agreementRecord={signedAgreements?.[agreementKey]}
              paymentCompleted={paymentCompleted}
              onAgreementSigned={(signatureText) =>
                signIdeaAgreement(idea.id, investorName, { signatureText })
              }
              onRaiseObjection={() => {
                setComposeType("agreement_objection");
                setComposeOpen(true);
              }}
              onPaymentCompleted={() => goToStage(3)}
            />
          </div>
        )}

        {activeStage === 4 && activeMessage && (
          <div className="rounded-2xl border border-violet-200/60 bg-gradient-to-b from-violet-50/40 to-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 border-b border-violet-100 pb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600">Stage 4</p>
              <h2 className="font-display text-lg font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                Founder Response · Pending Resolution
              </h2>
            </div>
            <IdeaStage4Panel
              idea={idea}
              message={activeMessage}
              onResolved={() => {
                resolveInvestorMessage(activeMessage.id);
                goToStage(3);
              }}
            />
          </div>
        )}
      </div>

      <InvestorFounderMessenger
        idea={idea}
        investorName={investorName}
        stage={stageLabel(activeStage === 4 ? 3 : activeStage)}
        pendingMessage={activeMessage}
        defaultType={composeType}
        composeOpen={composeOpen}
        onComposeOpenChange={setComposeOpen}
        onMessageSent={handleMessageSent}
      />

      <InvestorAiFloatingButton onClick={() => openAi(undefined, aiStage)} stage={aiStage} />

      <InvestorIntelligentAI
        open={aiOpen}
        onOpenChange={setAiOpen}
        idea={idea}
        stage={aiStage}
        activeTerm={highlightedTerm}
        onActiveTermChange={setHighlightedTerm}
      />
    </div>
  );
}

export const IdeaStage1Detail = IdeaDetailView;
