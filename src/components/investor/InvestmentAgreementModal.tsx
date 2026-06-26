import { useState, useEffect, useRef } from "react";
import { FileText, CheckCircle2, Save, PenLine, Shield, ChevronDown, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StartupIdea } from "@/data/startupIdeas";

type InvestmentAgreementModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idea: StartupIdea;
  agreementSigned: boolean;
  agreementRecord?: { signedAt: number; signatureText?: string; certificateId?: string; investorName: string };
  draftSignature?: string;
  onSaveDraft: (signatureText: string, agreeChecked: boolean) => void;
  onSign: (signatureText: string) => void;
};

export function InvestmentAgreementModal({
  open,
  onOpenChange,
  idea,
  agreementSigned,
  agreementRecord,
  draftSignature,
  onSaveDraft,
  onSign,
}: InvestmentAgreementModalProps) {
  const [signatureName, setSignatureName] = useState(draftSignature || "");
  const [agreeChecked, setAgreeChecked] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const signatureRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      if (draftSignature) setSignatureName(draftSignature);
      setShowSignature(false);
      scrollRef.current?.scrollTo({ top: 0 });
    }
  }, [open, draftSignature]);

  useEffect(() => {
    if (showSignature && signatureRef.current) {
      window.setTimeout(() => {
        signatureRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [showSignature]);

  const handleSave = () => {
    onSaveDraft(signatureName.trim(), agreeChecked);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-2xl flex-col overflow-hidden rounded-2xl border-2 border-amber-200/60 p-0 gap-0">
        {/* Compact header — fixed */}
        <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900 px-5 py-4">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-500/20 blur-2xl" />
          <DialogHeader className="relative text-left space-y-1 pr-8">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 ring-1 ring-amber-400/40">
                <Shield className="h-4 w-4 text-amber-300" />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-300/90">SmartBiz Legal · Escrow</p>
                <DialogTitle className="font-display text-lg font-bold text-white leading-tight">
                  Investment & Escrow Agreement
                </DialogTitle>
              </div>
            </div>
            <DialogDescription className="text-amber-100/70 text-[11px] pl-11">
              {idea.startupTitle} · {idea.founderName} · ETO 2002
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Single scrollable body — agreement + signature */}
        <div
          ref={scrollRef}
          className="investor-feed-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-[#f4efe4] touch-pan-y"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {/* Agreement document */}
          <div className="px-4 py-4">
            <div className="relative rounded-xl border border-amber-900/10 bg-[#fffef9] p-5 shadow-[inset_0_0_40px_rgba(180,140,80,0.08)]">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-600 via-amber-400 to-amber-600 rounded-l-xl" />
              <div className="mb-4 border-b-2 border-double border-amber-900/15 pb-3 text-center">
                <FileText className="mx-auto mb-1.5 h-7 w-7 text-amber-800/60" />
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-900/50">Official Investment Contract</p>
                <p className="font-display text-base font-bold text-amber-950">{idea.startupTitle}</p>
                <p className="text-[10px] text-amber-800/60 mt-0.5">Document ID: SB-AGR-{idea.id.padStart(4, "0")}</p>
              </div>
              <pre className="whitespace-pre-wrap font-serif text-[13px] leading-[1.8] text-amber-950/90">
                {idea.stage3.legalAgreementText}
              </pre>
            </div>
          </div>

          {/* Signed banner */}
          {agreementSigned && agreementRecord && (
            <div className="mx-4 mb-4 rounded-xl border-2 border-emerald-200 bg-gradient-to-b from-emerald-50 to-white px-5 py-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-9 w-9 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-bold text-emerald-900">Agreement Signed & Saved</p>
                  <p className="font-['Segoe_Script',cursive] text-xl text-emerald-800">{agreementRecord.signatureText}</p>
                  <p className="text-[10px] text-slate-500">{agreementRecord.certificateId}</p>
                </div>
              </div>
            </div>
          )}

          {/* Pen icon — open signature */}
          {!agreementSigned && !showSignature && (
            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={() => setShowSignature(true)}
                className="group mx-auto flex w-full max-w-sm flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-amber-300 bg-gradient-to-b from-amber-50 to-white py-4 transition-all hover:border-emerald-400 hover:from-emerald-50 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 transition-transform group-hover:scale-110">
                  <PenLine className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold text-amber-900">Tap to Sign Digitally</span>
                <span className="flex items-center gap-0.5 text-[10px] text-slate-500">
                  Scroll up to read · tap to sign below <ChevronDown className="h-3 w-3" />
                </span>
              </button>
            </div>
          )}

          {/* Signature panel — inside scroll area */}
          {!agreementSigned && showSignature && (
            <div
              ref={signatureRef}
              className="mx-4 mb-4 animate-in slide-in-from-bottom-4 fade-in duration-300 rounded-xl border-2 border-amber-300 bg-gradient-to-b from-amber-50 to-white px-4 py-4 shadow-lg"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-800">
                  <PenLine className="h-3.5 w-3.5" /> Digital Signature Zone
                </p>
                <button
                  type="button"
                  onClick={() => setShowSignature(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-200 bg-white text-slate-500 hover:bg-amber-50"
                  aria-label="Hide signature"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="rounded-xl border-2 border-dashed border-amber-300/80 bg-white p-3 mb-3">
                <Label className="text-xs font-semibold text-slate-700">Type your full legal name below</Label>
                <Input
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="Full name as on CNIC / passport"
                  className="mt-2 h-10 rounded-xl border-amber-200 text-base"
                />
                <div className="mt-3 border-t border-amber-100 pt-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Signature preview</p>
                  <div className="min-h-[44px] rounded-lg bg-amber-50/50 flex items-center justify-center border border-amber-100">
                    {signatureName.trim() ? (
                      <p className="font-['Segoe_Script','Brush_Script_MT',cursive] text-2xl text-emerald-900">
                        {signatureName}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Your signature appears here…</p>
                    )}
                  </div>
                </div>
              </div>
              <label className="mb-4 flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeChecked}
                  onChange={(e) => setAgreeChecked(e.target.checked)}
                  className="mt-1 rounded border-amber-400"
                />
                <span className="text-[11px] text-slate-600 leading-relaxed">
                  I agree to be bound electronically under the Electronic Transactions Ordinance, 2002 (Pakistan).
                  This constitutes my legal digital signature and I authorize escrow settlement.
                </span>
              </label>
              <div className="flex flex-wrap gap-2 pb-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSave}
                  disabled={!signatureName.trim()}
                  className="rounded-xl border-amber-300 text-amber-800 hover:bg-amber-50"
                >
                  <Save className="mr-1.5 h-4 w-4" />
                  {savedFlash ? "Saved ✓" : "Save Draft"}
                </Button>
                <Button
                  type="button"
                  disabled={!signatureName.trim() || !agreeChecked}
                  onClick={() => onSign(signatureName.trim())}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 font-bold hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50"
                >
                  <PenLine className="mr-1.5 h-4 w-4" />
                  Submit & Sign Agreement
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer — fixed */}
        <div className="shrink-0 flex items-center justify-between border-t border-amber-200 bg-white px-5 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl border-slate-200">
            Close
          </Button>
          {!agreementSigned && !showSignature && draftSignature && (
            <p className="text-[10px] font-semibold text-amber-700">Draft saved — scroll down & tap pen to sign</p>
          )}
          {!agreementSigned && showSignature && (
            <p className="text-[10px] text-slate-500">Scroll to see all fields ↑↓</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
