import { useState, useMemo, useEffect } from "react";
import {
  FileText,
  Package,
  CheckCircle2,
  Lock,
  AlertTriangle,
  CreditCard,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import type { StartupIdea } from "@/data/startupIdeas";
import { formatPkr } from "@/lib/investmentCalculator";
import { InvestmentAgreementModal } from "@/components/investor/InvestmentAgreementModal";
import { SampleOrderModal } from "@/components/investor/SampleOrderModal";
import { resolveEntrepreneurUidForIdea } from "@/services/messageService";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAppState } from "@/hooks/useAppState";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/firebase";
import {
  streamFounderBankingDetails,
  type FounderBankingDetails,
} from "@/services/investorFirebaseService";
import {
  streamPitchTransaction,
  submitPendingPaymentTransaction,
  requireActiveInvestorUid,
  type PitchTransactionNode,
} from "@/services/investorCoreService";

type IdeaStage3PanelProps = {
  idea: StartupIdea;
  investmentAmountPkr: number;
  equityPercent: number;
  agreementSigned: boolean;
  agreementRecord?: {
    signedAt: number;
    investorName: string;
    signatureText?: string;
    certificateId?: string;
  };
  paymentCompleted: boolean;
  onAgreementSigned: (signatureText: string) => void;
  /** Called after payment proof is submitted (status pending) — closes pipeline */
  onPaymentCompleted: () => void;
  onRaiseObjection?: () => void;
};

export function IdeaStage3Panel({
  idea,
  investmentAmountPkr,
  equityPercent,
  agreementSigned,
  agreementRecord,
  paymentCompleted,
  onAgreementSigned,
  onPaymentCompleted,
  onRaiseObjection,
}: IdeaStage3PanelProps) {
  const { investor, saveAgreementDraft, placeSampleOrder, agreementDrafts, sampleOrders } =
    useAppState();
  const { currentUser } = useAuth();

  const s3 = idea.stage3;
  const investorName = investor.name || "Verified Investor";
  // LIVE Firebase Auth UID only — never localStorage / React-cache aliases
  const investorId = String(auth.currentUser?.uid || currentUser?.uid || "").trim();
  const draftKey = `${idea.id}-${investorName}`;
  const draft = agreementDrafts?.[draftKey];
  // Strict founder toggle — sample UI only when stage3.sampleAssetAvailable === true
  const isSampleRequired = idea.stage3?.sampleAssetAvailable === true;

  const [legalOpen, setLegalOpen] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [founderUid, setFounderUid] = useState<string | null>(
    idea.founderId || idea.entrepreneurUid || null,
  );
  const [banking, setBanking] = useState<FounderBankingDetails | null>(null);
  const [liveTx, setLiveTx] = useState<PitchTransactionNode | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const existingSampleOrder = useMemo(
    () => sampleOrders.find((o) => o.ideaId === idea.id && o.investorName === investorName),
    [sampleOrders, idea.id, investorName],
  );
  const sampleOrdered = !!existingSampleOrder;
  useEffect(() => {
    const fromIdea = idea.founderId || idea.entrepreneurUid || null;
    if (fromIdea) {
      setFounderUid(fromIdea);
      return;
    }
    let active = true;
    void resolveEntrepreneurUidForIdea(idea.id)
      .then((uid) => {
        if (active) setFounderUid(uid);
      })
      .catch((err) => console.error("resolveEntrepreneurUidForIdea error:", err));
    return () => {
      active = false;
    };
  }, [idea.id, idea.founderId, idea.entrepreneurUid]);

  useEffect(() => {
    if (!founderUid) {
      setBanking(null);
      return;
    }
    return streamFounderBankingDetails(founderUid, setBanking);
  }, [founderUid]);

  useEffect(() => {
    // Hard-reset per pitch so Tim Hortans tx never bleeds into Calculator Pro
    setLiveTx(null);
    setReceiptFile(null);
    setSubmitError(null);
    setIsSubmitting(false);

    const pitchId = String(idea.id || "").trim();
    if (!investorId || !pitchId) return;

    return streamPitchTransaction(pitchId, investorId, (tx) => {
      // Only accept ledger rows that belong to THIS pitch route key
      if (tx && String(tx.pitchId || "").trim() && String(tx.pitchId).trim() !== pitchId) {
        return;
      }
      setLiveTx(tx);
    });
  }, [idea.id, investorId]);

  // Scope status to the open pitch only (never previous idea's pending/approved)
  const scopedLiveTx =
    liveTx && String(liveTx.pitchId || idea.id).trim() === String(idea.id || "").trim()
      ? liveTx
      : null;
  const paymentPending = scopedLiveTx?.status === "pending";
  const paymentApproved = paymentCompleted || scopedLiveTx?.status === "approved";
  const thisPitchAlreadyInDesk =
    scopedLiveTx?.status === "pending" || scopedLiveTx?.status === "approved";

  /**
   * Submit payment proof → RTDB ledger (receipt as data-URL, no Storage hang).
   */
  const handleDoneSubmitPaymentProof = async () => {
    const pitchId = String(idea.id || "").trim();

    // Only skip write if THIS pitch already has a desk row — not a prior venture
    if (thisPitchAlreadyInDesk) {
      try {
        onPaymentCompleted();
      } catch (error) {
        console.error("Payment submission failure:", error);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const resolvedFounderId = String(
      founderUid || idea.founderId || idea.entrepreneurUid || "",
    ).trim();

    if (!agreementSigned) {
      toast.error("Sign the investment agreement before submitting payment proof.");
      return;
    }
    if (!receiptFile) {
      toast.error("Upload a payment receipt proof screenshot first.");
      return;
    }

    let resolvedInvestorId = "";
    try {
      resolvedInvestorId = requireActiveInvestorUid(
        auth.currentUser?.uid || currentUser?.uid || investorId,
      );
    } catch (authErr) {
      const msg =
        authErr instanceof Error
          ? authErr.message
          : "Missing investorId — Firebase login session required. Please sign in again.";
      console.error("Payment submission failure:", msg);
      setSubmitError(msg);
      toast.error("Login required: sign in again with your original investor account.");
      setIsSubmitting(false);
      return;
    }
    if (!pitchId || !resolvedFounderId) {
      const msg = `Missing ledger keys (pitchId=${pitchId || "—"}, founderId=${resolvedFounderId || "—"}, investorId=${resolvedInvestorId || "—"}).`;
      console.error("Payment submission failure:", msg);
      setSubmitError(msg);
      toast.error("Submission failed: missing pitch or founder identifiers");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const roiExpected =
        idea.stage1?.expectedRoiPercent ?? idea.stage1?.expectedRoi ?? "";

      await submitPendingPaymentTransaction({
        pitchId,
        founderId: resolvedFounderId,
        investorId: resolvedInvestorId,
        investorName,
        startupTitle: idea.stage1?.ideaTitle || idea.startupTitle,
        category: idea.stage1?.categoryIndustry || idea.industry,
        amountInvested: investmentAmountPkr,
        equityAcquired: equityPercent,
        roiExpected,
        receiptFile,
        bankName: banking?.bankName,
        accountTitleName: banking?.accountTitleName,
        accountNumber: banking?.accountNumber,
      });

      setReceiptFile(null);
      toast.success("Payment proof submitted — pending founder verification.");
      onPaymentCompleted();
    } catch (error) {
      console.error("Payment submission failure:", error);
      const detail =
        error instanceof Error ? error.message : "Please check file size or network rules";
      setSubmitError(`Submission failed: ${detail}`);
      toast.error("Submission failed: Please check file size or network rules");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Toaster position="top-center" richColors closeButton />
      {/* Digital agreement */}
      <section className="rounded-2xl border border-emerald-200/80 bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-bold text-slate-900">
          <FileText className="h-4 w-4 text-emerald-600" /> Digital Investment Agreement
        </h3>
        {agreementSigned && agreementRecord ? (
          <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                  Digitally Signed & Executed
                </p>
                <p className="mt-2 font-['Segoe_Script','Brush_Script_MT',cursive] text-3xl text-emerald-900">
                  {agreementRecord.signatureText || agreementRecord.investorName}
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  Investor: <strong>{agreementRecord.investorName}</strong>
                </p>
                <p className="text-[10px] text-slate-500">
                  Signed: {new Date(agreementRecord.signedAt).toLocaleString("en-PK")} · ETO 2002
                  compliant
                </p>
              </div>
              <div className="rounded-xl border border-emerald-300/60 bg-white px-4 py-3 text-center shadow-sm">
                <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600">
                  Certificate ID
                </p>
                <p className="font-mono text-xs font-bold text-emerald-800">
                  {agreementRecord.certificateId}
                </p>
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> Verified
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLegalOpen(true)}
              className="mt-4 text-xs font-semibold text-emerald-700 hover:underline"
            >
              View full agreement document →
            </button>
            {onRaiseObjection && (
              <button
                type="button"
                onClick={onRaiseObjection}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 py-2.5 text-xs font-bold text-amber-800 hover:bg-amber-100"
              >
                <AlertTriangle className="h-4 w-4" /> Raise Agreement Objection
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-emerald-300/60 bg-emerald-50/30 p-5">
            <p className="text-sm leading-relaxed text-slate-700">
              Review the entrepreneur-prepared contract, save a draft, then sign digitally to unlock
              payment.
            </p>
            {draft && (
              <p className="mt-2 text-[10px] font-semibold text-amber-700">
                Draft saved — signature: &quot;{draft.signatureText}&quot;
              </p>
            )}
            <button
              type="button"
              onClick={() => setLegalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg"
            >
              <FileText className="h-4 w-4" />
              Open Agreement & Sign Digitally
            </button>
            {onRaiseObjection && (
              <button
                type="button"
                onClick={onRaiseObjection}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white py-2.5 text-xs font-bold text-amber-800 hover:bg-amber-50"
              >
                <AlertTriangle className="h-4 w-4" /> Issue with agreement? Raise Objection
              </button>
            )}
          </div>
        )}
      </section>

      {/* Optional sample — only when founder enabled Physical Sample Asset Availability */}
      {isSampleRequired && (
        <section className="grid gap-3 sm:grid-cols-1">
          <button
            type="button"
            onClick={() => setSampleOpen(true)}
            className={`rounded-2xl border p-4 text-left transition-all hover:shadow-md ${
              sampleOrdered
                ? "border-emerald-200 bg-emerald-50/50"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm">
              <Package className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-900">Order Sample Product</p>
            <p className="mt-0.5 text-[10px] text-slate-500 line-clamp-2">
              {sampleOrdered
                ? `${existingSampleOrder?.stage === "sent" ? "Sent" : existingSampleOrder?.stage === "packed" ? "Packed" : "Approved"} · ${existingSampleOrder?.trackingId}`
                : `${s3?.sampleProductName || "Physical sample"} · Available`}
            </p>
            {sampleOrdered && (
              <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> Complete
              </span>
            )}
          </button>
        </section>
      )}

      {/* Bank transfer settlement desk */}
      <section className="rounded-2xl border-2 border-emerald-300/50 bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200">
              Deployed Capital · Bank Transfer
            </p>
            <p className="font-display mt-1 text-2xl font-black">{formatPkr(investmentAmountPkr)}</p>
            <p className="mt-1 text-xs text-emerald-100">
              {equityPercent.toFixed(2)}% equity · Transfer to founder corporate account
            </p>
          </div>
          {paymentPending && (
            <span className="inline-flex items-center rounded-full bg-amber-400/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-100 ring-1 ring-amber-200/40">
              Pending Verification
            </span>
          )}
          {paymentApproved && !paymentPending && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white ring-1 ring-white/30">
              <CheckCircle2 className="h-3.5 w-3.5" /> Approved
            </span>
          )}
        </div>

        <div className="mt-5 rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-100">
            <CreditCard className="h-3.5 w-3.5" /> Founder Banking Specs
          </p>
          <div className="grid gap-2 text-xs sm:grid-cols-3">
            <div>
              <p className="text-emerald-200/80">Bank Name</p>
              <p className="font-semibold text-white">{banking?.bankName || "—"}</p>
            </div>
            <div>
              <p className="text-emerald-200/80">Account Title</p>
              <p className="font-semibold text-white">{banking?.accountTitleName || "—"}</p>
            </div>
            <div>
              <p className="text-emerald-200/80">Account Number / IBAN</p>
              <p className="font-mono font-semibold text-white">{banking?.accountNumber || "—"}</p>
            </div>
          </div>
        </div>

        {!paymentApproved && !paymentPending && (
          <div className="mt-4 space-y-3">
            <div>
              <Label
                htmlFor="payment-receipt-proof"
                className="text-[10px] font-bold uppercase tracking-wider text-emerald-100"
              >
                Upload Payment Receipt Proof Screenshot
              </Label>
              <input
                id="payment-receipt-proof"
                type="file"
                accept="image/*"
                disabled={!agreementSigned || isSubmitting}
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                className="mt-2 block w-full text-xs text-emerald-50 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-bold file:text-emerald-800"
              />
              {receiptFile && (
                <p className="mt-1 text-[10px] text-emerald-100">Selected: {receiptFile.name}</p>
              )}
            </div>
            {!investorId && (
              <p className="rounded-lg border border-amber-300/40 bg-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-100">
                Firebase login session missing. Log out and sign in again with your investor email
                before submitting payment proof.
              </p>
            )}
            {submitError && <p className="text-xs font-semibold text-amber-200">{submitError}</p>}
          </div>
        )}

        {paymentPending && scopedLiveTx?.receiptUrl && (
          <a
            href={scopedLiveTx.receiptUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-100 underline"
          >
            View uploaded receipt <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}

        <Button
          onClick={() => void handleDoneSubmitPaymentProof()}
          disabled={
            isSubmitting ||
            !investorId ||
            (!paymentPending &&
              !paymentApproved &&
              (!agreementSigned || !receiptFile))
          }
          className="mt-5 w-full rounded-xl bg-white py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
            </>
          ) : !agreementSigned && !paymentPending && !paymentApproved ? (
            <>
              <Lock className="mr-2 h-4 w-4" /> Sign Agreement First
            </>
          ) : (
            "Done / Submit Payment Proof"
          )}
        </Button>
      </section>

      <InvestmentAgreementModal
        open={legalOpen}
        onOpenChange={setLegalOpen}
        idea={idea}
        agreementSigned={agreementSigned}
        agreementRecord={agreementRecord}
        draftSignature={draft?.signatureText}
        onSaveDraft={(signatureText, agreeChecked) =>
          saveAgreementDraft(idea.id, investorName, { signatureText, agreeChecked })
        }
        onSign={(signatureText) => {
          onAgreementSigned(signatureText);
          setLegalOpen(false);
        }}
      />

      {isSampleRequired && (
        <SampleOrderModal
          open={sampleOpen}
          onOpenChange={setSampleOpen}
          startupTitle={idea.startupTitle}
          ideaId={idea.id}
          founderId={founderUid ?? ""}
          productName={s3?.sampleProductName || ""}
          productPricePkr={s3?.sampleProductPricePkr || 0}
          investorName={investorName}
          onOrderPlaced={(order) => placeSampleOrder(order)}
        />
      )}
    </div>
  );
}
