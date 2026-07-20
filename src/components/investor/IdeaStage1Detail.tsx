import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Lock, CheckCircle2, ChevronRight } from "lucide-react";
import type { StartupIdea } from "@/data/startupIdeas";
import { calculateInvestmentProjection, parseInvestmentInput } from "@/lib/investmentCalculator";
import { IdeaStage1Panel } from "@/components/investor/IdeaStage1Panel";
import { IdeaStage2Panel } from "@/components/investor/IdeaStage2Panel";
import { IdeaStage3Panel } from "@/components/investor/IdeaStage3Panel";
import { InvestorFounderMessenger } from "@/components/investor/InvestorFounderMessenger";
import { Badge } from "@/components/ui/badge";
import { useAppState } from "@/hooks/useAppState";
import { useAuth } from "@/contexts/AuthContext";
import { streamPitchTransaction, saveInvestmentStageProgress, requireActiveInvestorUid } from "@/services/investorCoreService";
import { auth } from "@/firebase";

const STAGES = [
  { id: 1 as const, label: "Stage 1", title: "Idea & Financial Terms", theme: "amber" as const },
  {
    id: 2 as const,
    label: "Stage 2",
    title: "Financial Requirements & Validation",
    theme: "orange" as const,
  },
  { id: 3 as const, label: "Stage 3", title: "Payment", theme: "emerald" as const },
];

type IdeaDetailViewProps = {
  idea: StartupIdea;
  initialStage?: 1 | 2 | 3;
};

export function IdeaDetailView({ idea, initialStage = 1 }: IdeaDetailViewProps) {
  const {
    investor,
    investments,
    signedAgreements,
    signIdeaAgreement,
    investorEntrepreneurMessages,
  } = useAppState();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [activeStage, setActiveStage] = useState<1 | 2 | 3>(initialStage);
  const [stageTransition, setStageTransition] = useState(false);
  const [stage1Done, setStage1Done] = useState(false);
  const [stage2Done, setStage2Done] = useState(false);
  const [investInput, setInvestInput] = useState("500000");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeType, setComposeType] = useState<"agreement_objection" | "general_query">(
    "general_query",
  );
  const [liveTxStatus, setLiveTxStatus] = useState<"pending" | "approved" | null>(null);

  useEffect(() => {
    // Reset journey state when switching Tim Hortans ↔ Calculator Pro (etc.)
    setActiveStage(initialStage === 1 || initialStage === 2 || initialStage === 3 ? initialStage : 1);
    setStage1Done(false);
    setStage2Done(false);
    setLiveTxStatus(null);
    setCheckedItems(new Set());
    setInvestInput("500000");
  }, [idea.id, initialStage]);

  const investorName = investor.name || "Verified Investor";
  const agreementKey = `${idea.id}-${investorName}`;
  const agreementSigned = !!signedAgreements?.[agreementKey];

  useEffect(() => {
    const pitchId = String(idea.id || "").trim();
    setLiveTxStatus(null);
    let investorId = "";
    try {
      investorId = requireActiveInvestorUid(auth.currentUser?.uid || currentUser?.uid);
    } catch {
      return;
    }
    if (!pitchId) return;
    return streamPitchTransaction(pitchId, investorId, (tx) => {
      if (tx && String(tx.pitchId || "").trim() && String(tx.pitchId).trim() !== pitchId) {
        return;
      }
      setLiveTxStatus(tx?.status ?? null);
    });
  }, [idea.id, currentUser?.uid]);

  const existingInvestment = investments.find(
    (inv) => inv.ideaId === idea.id && inv.status === "completed",
  );
  // Only this pitch's RTDB tx / completed investment counts
  const paymentCompleted = liveTxStatus === "approved" || !!existingInvestment;

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

  const amount = parseInvestmentInput(investInput);
  const projection = useMemo(
    () => calculateInvestmentProjection(amount, idea.stage2.investmentFormula),
    [amount, idea.stage2.investmentFormula],
  );

  const persistStageProgress = async (
    stage: 1 | 2 | 3,
    flags: { stage1Completed?: boolean; stage2Completed?: boolean; stage3Completed?: boolean },
  ) => {
    let investorId = "";
    try {
      investorId = requireActiveInvestorUid(auth.currentUser?.uid || currentUser?.uid);
    } catch (error) {
      console.error("persistStageProgress auth error:", error);
      return;
    }
    const founderId = String(idea.founderId || idea.entrepreneurUid || "").trim();
    if (!founderId) return;
    try {
      await saveInvestmentStageProgress(investorId, idea.id, {
        founderId,
        currentStage: stage,
        startupTitle: idea.stage1?.ideaTitle || idea.startupTitle,
        amountInvested: amount,
        equityAcquired: projection.assignedEquityPercent,
        roiExpected: idea.stage1?.expectedRoiPercent ?? idea.stage1?.expectedRoi ?? "",
        ...flags,
      });
    } catch (error) {
      console.error("saveInvestmentStageProgress error:", error);
    }
  };

  const goToStage = (next: 1 | 2 | 3) => {
    setStageTransition(true);
    setTimeout(() => {
      setActiveStage(next);
      setStageTransition(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 280);
  };

  const completeStage1 = () => {
    setStage1Done(true);
    void persistStageProgress(1, { stage1Completed: true });
    goToStage(2);
  };

  const completeStage2 = () => {
    setStage2Done(true);
    void persistStageProgress(2, { stage1Completed: true, stage2Completed: true });
    goToStage(3);
  };

  useEffect(() => {
    // L2 — open evaluation tunnel seeds investments/{pitchId}
    void persistStageProgress(activeStage, {
      stage1Completed: stage1Done || activeStage > 1,
      stage2Completed: stage2Done || activeStage > 2,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once per idea open / stage change
  }, [idea.id, activeStage]);

  useEffect(() => {
    if (agreementSigned && activeStage < 3) setStage1Done(true);
    if (paymentCompleted || liveTxStatus === "pending") {
      setStage1Done(true);
      setStage2Done(true);
    }
  }, [agreementSigned, paymentCompleted, liveTxStatus, activeStage]);

  const toggleCheck = (item: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };

  const stageComplete = (id: 1 | 2 | 3) => {
    if (id === 1) return stage1Done || agreementSigned;
    if (id === 2) return stage2Done || agreementSigned;
    if (id === 3) return paymentCompleted || liveTxStatus === "pending";
    return false;
  };

  const closePipelineAfterProof = () => {
    try {
      navigate({ to: "/app/investor" });
    } catch (error) {
      console.error("closePipelineAfterProof navigation error:", error);
    }
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

      <div className="mb-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="rounded-full border-slate-300 text-[10px] font-bold uppercase tracking-wider"
          >
            {idea.industry}
          </Badge>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            <Lock className="h-2.5 w-2.5" /> Entrepreneur Verified
          </span>
          {liveTxStatus === "pending" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              Pending Verification
            </span>
          )}
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

      {/* Stage stepper — no connecting line, Stages 1–3 only */}
      <div className="sticky top-14 z-20 mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-md backdrop-blur-md sm:top-[3.5rem]">
        <div className="relative flex items-stretch gap-0">
          {STAGES.map((stage) => {
            const isActive = activeStage === stage.id;
            const isComplete = stageComplete(stage.id);
            const canNavigate = stage.id <= activeStage || isComplete;

            return (
              <button
                key={stage.id}
                type="button"
                disabled={!canNavigate && stage.id > activeStage}
                onClick={() => canNavigate && goToStage(stage.id)}
                className={`relative z-10 flex flex-1 flex-col items-center gap-2 px-1 py-1 text-center transition-all sm:flex-row sm:gap-3 sm:px-3 sm:text-left ${
                  isActive
                    ? stage.theme === "emerald"
                      ? "opacity-100"
                      : stage.theme === "orange"
                        ? "opacity-100"
                        : "opacity-100"
                    : canNavigate
                      ? "opacity-80 hover:opacity-100"
                      : "opacity-40"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm ${
                    isActive
                      ? stage.theme === "emerald"
                        ? "bg-emerald-500 text-white ring-4 ring-emerald-200/60"
                        : stage.theme === "orange"
                          ? "bg-orange-500 text-white ring-4 ring-orange-200/60"
                          : "bg-amber-500 text-white ring-4 ring-amber-200/60"
                      : isComplete
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {isComplete && !isActive ? (
                    <CheckCircle2 className="h-5 w-5 animate-in zoom-in duration-300" />
                  ) : (
                    stage.id
                  )}
                </div>
                <div className="min-w-0 hidden sm:block">
                  <p
                    className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-slate-700" : "text-slate-400"}`}
                  >
                    {stage.label}
                  </p>
                  <p
                    className={`text-xs font-semibold leading-snug ${isActive ? "text-slate-900" : "text-slate-500"}`}
                  >
                    {stage.title}
                  </p>
                </div>
                <p
                  className={`text-[10px] font-bold uppercase sm:hidden ${isActive ? "text-slate-700" : "text-slate-400"}`}
                >
                  {stage.label}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`stage-content-transition ${stageTransition ? "stage-content-exit" : "stage-content-enter"}`}
      >
        {activeStage === 1 && (
          <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-b from-amber-50/30 to-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 border-b border-amber-100 pb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Stage 1</p>
              <h2 className="font-display text-lg font-bold text-amber-950">Idea & Financial Terms</h2>
            </div>
            <IdeaStage1Panel
              idea={idea}
              onAskAi={() => undefined}
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
            <div className="mb-5 border-b border-orange-100 pb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Stage 2</p>
              <h2 className="font-display text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Financial Requirements & Validation
              </h2>
            </div>
            <IdeaStage2Panel
              idea={idea}
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
                Payment
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Investment: PKR {amount.toLocaleString()} · Equity:{" "}
                {projection.assignedEquityPercent.toFixed(2)}%
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
              onPaymentCompleted={closePipelineAfterProof}
            />
          </div>
        )}
      </div>

      {/* Blue/purple direct founder messenger only — AI float removed */}
      <InvestorFounderMessenger
        idea={idea}
        investorName={investorName}
        stage={`Stage ${activeStage}` as "Stage 1" | "Stage 2" | "Stage 3"}
        entrepreneurUid={idea.founderId || idea.entrepreneurUid}
        pendingMessage={activeMessage}
        defaultType={composeType}
        composeOpen={composeOpen}
        onComposeOpenChange={setComposeOpen}
      />
    </div>
  );
}

export const IdeaStage1Detail = IdeaDetailView;
