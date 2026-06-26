import { useState, useMemo, useEffect } from "react";

import {

  FileText,

  Package,

  Calendar,

  Shield,

  Users,

  Gift,

  CheckCircle2,

  Circle,

  Lock,

  Video,

  AlertTriangle,

} from "lucide-react";

import type { StartupIdea } from "@/data/startupIdeas";

import type { Milestone } from "@/data/stage3Data";

import { formatPkr } from "@/lib/investmentCalculator";

import { PaymentGatewayModal, type PaymentMethod } from "@/components/investor/PaymentGatewayModal";

import { InvestmentAgreementModal } from "@/components/investor/InvestmentAgreementModal";

import { SampleOrderModal } from "@/components/investor/SampleOrderModal";
import { resolveEntrepreneurUidForIdea } from "@/services/messageService";

import {

  Dialog,

  DialogContent,

  DialogHeader,

  DialogTitle,

  DialogDescription,

  DialogFooter,

} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { useAppState } from "@/hooks/useAppState";



type IdeaStage3PanelProps = {

  idea: StartupIdea;

  investmentAmountPkr: number;

  equityPercent: number;

  agreementSigned: boolean;

  agreementRecord?: { signedAt: number; investorName: string; signatureText?: string; certificateId?: string };

  paymentCompleted: boolean;

  onAgreementSigned: (signatureText: string) => void;

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

  const {

    investor,

    recordEscrowPayment,

    saveAgreementDraft,

    placeSampleOrder,

    agreementDrafts,

    sampleOrders,

  } = useAppState();

  const s3 = idea.stage3;

  const investorName = investor.name || "Verified Investor";

  const draftKey = `${idea.id}-${investorName}`;

  const draft = agreementDrafts?.[draftKey];



  const [legalOpen, setLegalOpen] = useState(false);

  const [paymentOpen, setPaymentOpen] = useState(false);

  const [sampleOpen, setSampleOpen] = useState(false);
  const [founderUid, setFounderUid] = useState<string | null>(null);

  const [meetingOpen, setMeetingOpen] = useState(false);

  const [meetingScheduled, setMeetingScheduled] = useState(false);

  const [meetingDate, setMeetingDate] = useState("");

  const [meetingTime, setMeetingTime] = useState("");



  const existingSampleOrder = useMemo(

    () => sampleOrders.find((o) => o.ideaId === idea.id && o.investorName === investorName),

    [sampleOrders, idea.id, investorName],

  );

  const sampleOrdered = !!existingSampleOrder;

  useEffect(() => {
    void resolveEntrepreneurUidForIdea(idea.id).then(setFounderUid);
  }, [idea.id]);



  const milestones: Milestone[] = s3.milestones.map((m) => {

    if (m.id === "m1" && agreementSigned) return { ...m, status: "completed" };

    if (m.id === "m2" && paymentCompleted) return { ...m, status: "completed" };

    if (m.id === "m3" && sampleOrdered) return { ...m, status: "completed" };

    if (m.id === "m1" && !agreementSigned) return { ...m, status: "active" };

    if (m.id === "m2" && agreementSigned && !paymentCompleted) return { ...m, status: "active" };

    if (m.id === "m3" && paymentCompleted && !sampleOrdered) return { ...m, status: "pending" };

    return m;

  });



  const handlePaymentSuccess = (details: {

    method: PaymentMethod;

    phone?: string;

    receiptFileName?: string;

    aiVerifiedAmount?: number;

  }) => {

    recordEscrowPayment({

      ideaId: idea.id,

      startupTitle: idea.startupTitle,

      founderName: idea.founderName,

      investorName: investorName,

      amountPkr: details.aiVerifiedAmount ?? investmentAmountPkr,

      equityPercent,

      paymentMethod: details.method,

      terms: `${equityPercent.toFixed(2)}% Equity · SmartBiz Escrow`,

      receiptFileName: details.receiptFileName,

    });

    onPaymentCompleted();

  };



  return (

    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Milestone tracker */}

      <section className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 via-teal-50/50 to-cyan-50/30 p-5 shadow-sm">

        <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-emerald-800">

          <Shield className="h-4 w-4" /> Milestone Tracking

        </h3>

        <div className="space-y-3">

          {milestones.map((m, idx) => (

            <div key={m.id} className="flex items-center gap-3">

              {m.status === "completed" ? (

                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />

              ) : m.status === "active" ? (

                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-emerald-300">

                  <Circle className="h-2 w-2 fill-white text-white" />

                </div>

              ) : (

                <Circle className="h-5 w-5 shrink-0 text-slate-300" />

              )}

              <div className="flex-1">

                <p className={`text-xs font-semibold ${m.status === "completed" ? "text-emerald-800" : m.status === "active" ? "text-slate-900" : "text-slate-400"}`}>

                  {m.label}

                </p>

              </div>

              {idx < milestones.length - 1 && m.status === "completed" && (

                <span className="text-[9px] font-bold text-emerald-600">Done</span>

              )}

            </div>

          ))}

        </div>

      </section>



      {/* Digital agreement */}

      <section className="rounded-2xl border border-emerald-200/80 bg-white p-5 shadow-sm">

        <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-bold text-slate-900">

          <FileText className="h-4 w-4 text-emerald-600" /> Digital Investment Agreement

        </h3>



        {agreementSigned && agreementRecord ? (

          <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-5">

            <div className="flex flex-wrap items-start justify-between gap-4">

              <div>

                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Digitally Signed & Executed</p>

                <p className="mt-2 font-['Segoe_Script','Brush_Script_MT',cursive] text-3xl text-emerald-900">

                  {agreementRecord.signatureText || agreementRecord.investorName}

                </p>

                <p className="mt-2 text-xs text-slate-600">

                  Investor: <strong>{agreementRecord.investorName}</strong>

                </p>

                <p className="text-[10px] text-slate-500">

                  Signed: {new Date(agreementRecord.signedAt).toLocaleString("en-PK")} · ETO 2002 compliant

                </p>

              </div>

              <div className="rounded-xl border border-emerald-300/60 bg-white px-4 py-3 text-center shadow-sm">

                <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600">Certificate ID</p>

                <p className="font-mono text-xs font-bold text-emerald-800">{agreementRecord.certificateId}</p>

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

            <p className="text-sm text-slate-700 leading-relaxed">

              Review the entrepreneur-prepared contract, save a draft, then sign digitally to unlock escrow payment.

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



      {/* Legal & actions */}

      <section className="grid gap-3 sm:grid-cols-3">

        <ActionCard

          icon={FileText}

          title="Investment Agreement"

          desc={agreementSigned ? "Signed & executed" : draft ? "Draft saved — finish signing" : "Review entrepreneur contract"}

          accent="from-slate-800 to-slate-900"

          done={agreementSigned}

          onClick={() => setLegalOpen(true)}

        />

        <ActionCard

          icon={Package}

          title="Order Sample Product"

          desc={

            sampleOrdered

              ? `${existingSampleOrder?.stage === "sent" ? "Sent" : existingSampleOrder?.stage === "packed" ? "Packed" : "Approved"} · ${existingSampleOrder?.trackingId}`

              : `${s3.sampleProductName}`

          }

          accent="from-amber-500 to-orange-500"

          done={sampleOrdered}

          onClick={() => setSampleOpen(true)}

          disabled={!paymentCompleted}

        />

        <ActionCard

          icon={Video}

          title="Schedule Meeting"

          desc={meetingScheduled ? `Booked: ${meetingDate}` : "Meet the founder virtually"}

          accent="from-violet-600 to-indigo-600"

          done={meetingScheduled}

          onClick={() => setMeetingOpen(true)}

        />

      </section>



      {/* Escrow payment CTA */}

      <section className="rounded-2xl border-2 border-emerald-300/50 bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white shadow-lg">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200">Escrow Settlement</p>

            <p className="font-display mt-1 text-2xl font-black">{formatPkr(investmentAmountPkr)}</p>

            <p className="mt-1 text-xs text-emerald-100">

              {equityPercent.toFixed(2)}% equity &bull; JazzCash · EasyPaisa · Card

            </p>

          </div>

          <Button

            onClick={() => setPaymentOpen(true)}

            disabled={!agreementSigned || paymentCompleted}

            className="rounded-xl bg-white px-6 font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"

          >

            {paymentCompleted ? (

              <>

                <CheckCircle2 className="mr-2 h-4 w-4" /> Payment Complete

              </>

            ) : !agreementSigned ? (

              <>

                <Lock className="mr-2 h-4 w-4" /> Sign Agreement First

              </>

            ) : (

              "Pay via Escrow Gateway"

            )}

          </Button>

        </div>

      </section>



      {/* Social proof */}

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">

        <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-bold text-slate-900">

          <Users className="h-4 w-4 text-amber-600" /> Social Proof & Track Record

        </h3>



        <div className="grid gap-4 md:grid-cols-3">

          <div>

            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Previous Investors</p>

            <ul className="space-y-2">

              {s3.socialProof.previousInvestors.map((inv) => (

                <li key={inv.name} className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">

                  <p className="text-xs font-semibold text-slate-800">{inv.name}</p>

                  <p className="text-[10px] text-amber-700 font-bold">{inv.amount}</p>

                  <p className="text-[9px] text-slate-400">{inv.date}</p>

                </li>

              ))}

            </ul>

          </div>

          <div>

            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Past Payouts / Benefits</p>

            <ul className="space-y-2">

              {s3.socialProof.pastPayouts.map((p) => (

                <li key={p.description} className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2">

                  <div className="flex items-start gap-1.5">

                    <Gift className="h-3.5 w-3.5 shrink-0 text-emerald-600 mt-0.5" />

                    <div>

                      <p className="text-xs font-medium text-slate-700">{p.description}</p>

                      <p className="text-[10px] font-bold text-emerald-700">{p.amount}</p>

                      <p className="text-[9px] text-slate-400">{p.date}</p>

                    </div>

                  </div>

                </li>

              ))}

            </ul>

          </div>

          <div>

            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Co-Investors</p>

            <ul className="space-y-2">

              {s3.socialProof.coInvestors.map((c) => (

                <li key={c.name} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2">

                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-[10px] font-black text-white">

                    {c.name.charAt(0)}

                  </div>

                  <div>

                    <p className="text-xs font-semibold text-slate-800">{c.name}</p>

                    <p className="text-[9px] text-slate-500">{c.role}</p>

                  </div>

                </li>

              ))}

            </ul>

          </div>

        </div>

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



      <SampleOrderModal

        open={sampleOpen}

        onOpenChange={setSampleOpen}

        startupTitle={idea.startupTitle}

        ideaId={idea.id}

        founderId={founderUid ?? ""}

        productName={s3.sampleProductName}

        productPricePkr={s3.sampleProductPricePkr}

        investorName={investorName}

        onOrderPlaced={(order) => placeSampleOrder(order)}

      />



      {/* Schedule meeting */}

      <Dialog open={meetingOpen} onOpenChange={setMeetingOpen}>

        <DialogContent className="max-w-sm rounded-2xl">

          <DialogHeader>

            <DialogTitle className="flex items-center gap-2">

              <Calendar className="h-5 w-5" /> Schedule Founder Meeting

            </DialogTitle>

            <DialogDescription>Virtual meeting with {idea.founderName}</DialogDescription>

          </DialogHeader>

          <div className="space-y-3">

            <div>

              <Label className="text-xs">Preferred Date</Label>

              <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="mt-1" />

            </div>

            <div>

              <Label className="text-xs">Time Slot</Label>

              <Input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className="mt-1" />

            </div>

          </div>

          <DialogFooter>

            <Button

              onClick={() => {

                setMeetingScheduled(true);

                setMeetingOpen(false);

              }}

              disabled={!meetingDate}

              className="w-full rounded-xl"

            >

              Confirm Meeting Request

            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>



      <PaymentGatewayModal

        open={paymentOpen}

        onOpenChange={setPaymentOpen}

        amountPkr={investmentAmountPkr}

        startupTitle={idea.startupTitle}

        equityPercent={equityPercent}

        founderId={founderUid ?? undefined}

        investorName={investorName}

        onPaymentSuccess={handlePaymentSuccess}

      />

    </div>

  );

}



function ActionCard({

  icon: Icon,

  title,

  desc,

  accent,

  done,

  onClick,

  disabled,

}: {

  icon: typeof FileText;

  title: string;

  desc: string;

  accent: string;

  done?: boolean;

  onClick: () => void;

  disabled?: boolean;

}) {

  return (

    <button

      type="button"

      onClick={onClick}

      disabled={disabled}

      className={`rounded-2xl border p-4 text-left transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 ${

        done ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white hover:border-slate-300"

      }`}

    >

      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-sm`}>

        <Icon className="h-5 w-5" />

      </div>

      <p className="text-xs font-bold text-slate-900">{title}</p>

      <p className="mt-0.5 text-[10px] text-slate-500 line-clamp-2">{desc}</p>

      {done && (

        <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600">

          <CheckCircle2 className="h-3 w-3" /> Complete

        </span>

      )}

    </button>

  );

}

