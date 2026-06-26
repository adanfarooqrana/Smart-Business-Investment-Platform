import { useRef, useState, useMemo, useEffect, type RefObject, type Dispatch, type SetStateAction } from "react";
import {
  X,
  ArrowLeft,
  ArrowRight,
  UploadCloud,
  ImageIcon,
  FileText,
  TrendingUp,
  Sparkles,
  Loader2,
  CheckCircle2,
  Calculator,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  pitchIdea,
  PITCH_CATEGORIES,
  calculateProfitProjections,
  type PitchCategory,
} from "@/services/pitchIdeaService";
import { useAuth } from "@/contexts/AuthContext";
import { formatPkr } from "@/lib/investmentCalculator";

type Props = {
  entrepreneurUid: string;
  founderName: string;
  verificationScore?: number;
  onClose: () => void;
  onSuccess: (ideaId: string) => void;
};

const WIZARD_STEPS = [
  "Stage 1 — Idea & Financial Terms",
  "Stage 2 — Requirements & Validation",
  "Stage 3 — Legal & Escrow",
];

export function PitchIdeaWizard({
  entrepreneurUid,
  founderName,
  verificationScore,
  onClose,
  onSuccess,
}: Props) {
  const { currentUser } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [ideaTitle, setIdeaTitle] = useState("");
  const [category, setCategory] = useState<PitchCategory>("Food & Beverage");
  const [description, setDescription] = useState("");
  const [problemSolution, setProblemSolution] = useState("");
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [equityPercent, setEquityPercent] = useState("");
  const [roiPercent, setRoiPercent] = useState("");

  const [productImages, setProductImages] = useState<string[]>([]);
  const [setupPhotos, setSetupPhotos] = useState<string[]>([]);
  const [customerLedger, setCustomerLedger] = useState<string>("");
  const [customerBaseSize, setCustomerBaseSize] = useState("");
  const [marketLocation, setMarketLocation] = useState("");
  const [marketSummary, setMarketSummary] = useState("");
  const [founderYearsExperience, setFounderYearsExperience] = useState("");
  const [founderPriorVentures, setFounderPriorVentures] = useState("");
  const [founderEducation, setFounderEducation] = useState("");

  const [agreementText, setAgreementText] = useState("");
  const [sampleProductName, setSampleProductName] = useState("");
  const [sampleProductPricePkr, setSampleProductPricePkr] = useState("");
  const [agreementPdf, setAgreementPdf] = useState("");

  const productRef = useRef<HTMLInputElement>(null);
  const setupRef = useRef<HTMLInputElement>(null);
  const ledgerRef = useRef<HTMLInputElement>(null);
  const agreementPdfRef = useRef<HTMLInputElement>(null);

  const investmentPkr = parseInt(investmentAmount.replace(/[^0-9]/g, ""), 10) || 0;
  const equity = parseFloat(equityPercent) || 0;
  const roi = parseFloat(roiPercent) || 0;

  const projections = useMemo(() => {
    if (investmentPkr <= 0 || roi <= 0) return null;
    return calculateProfitProjections(investmentPkr, roi, equity);
  }, [investmentPkr, roi, equity]);

  const [expenseLines, setExpenseLines] = useState<
    { label: string; amountPkr: number; color: string }[]
  >([]);

  useEffect(() => {
    if (projections) {
      setExpenseLines(projections.expenseBreakdown.map((line) => ({ ...line })));
    }
  }, [projections]);

  const readFiles = (
    files: FileList | null,
    setter: Dispatch<SetStateAction<string[]>>,
    max = 5,
  ) => {
    if (!files) return;
    Array.from(files)
      .slice(0, max)
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => setter((prev) => [...prev, reader.result as string].slice(0, max));
        reader.readAsDataURL(file);
      });
  };

  const readSingle = (file: File | undefined, setter: (v: string) => void) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  const canNext = () => {
    if (step === 0) {
      return (
        ideaTitle.trim() &&
        description.trim() &&
        problemSolution.trim() &&
        investmentPkr > 0 &&
        equity > 0 &&
        equity <= 100 &&
        roi > 0
      );
    }
    if (step === 1) {
      return productImages.length > 0 && setupPhotos.length > 0;
    }
    return true;
  };

  const handlePitch = async () => {
    setError("");
    const uid = currentUser?.uid;
    if (!uid) {
      setError("Firebase login required. Sign out and sign in with your email & password, then pitch again.");
      return;
    }

    setSubmitting(true);
    try {
      const customProjections = projections
        ? { ...projections, expenseBreakdown: expenseLines }
        : undefined;

      const ideaId = await pitchIdea({
        entrepreneurUid: uid,
        founderName,
        projections: customProjections,
        stage1: {
          ideaTitle: ideaTitle.trim(),
          category,
          description: description.trim(),
          problemSolution: problemSolution.trim(),
          requiredInvestmentPkr: investmentPkr,
          equityPercent: equity,
          expectedRoiPercent: roi,
        },
        stage2: {
          productImages,
          setupPhotos,
          customerLedgerUrl: customerLedger || undefined,
          customerBaseSize: customerBaseSize.trim(),
          marketLocation: marketLocation.trim(),
          marketSummary: marketSummary.trim(),
          founderYearsExperience: parseInt(founderYearsExperience, 10) || undefined,
          founderPriorVentures: founderPriorVentures.trim(),
          founderEducation: founderEducation.trim(),
          verificationScore,
        },
        stage3: {
          agreementText: agreementText.trim(),
          sampleProductName: sampleProductName.trim() || undefined,
          sampleProductPricePkr: parseInt(sampleProductPricePkr.replace(/[^0-9]/g, ""), 10) || undefined,
          agreementPdfUrl: agreementPdf || undefined,
        },
      });
      onSuccess(ideaId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to pitch idea. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#FFA500]/30 bg-white shadow-2xl shadow-[#FFA500]/20"
        style={{ background: "linear-gradient(180deg, #FFF8E1 0%, #ffffff 120px)" }}
      >
        <div className="flex items-center justify-between border-b border-[#FFA500]/20 px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md"
              style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
            >
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#FFA500]">
                Pitch an Idea
              </p>
              <h2 className="font-display text-lg font-bold text-slate-900">
                {WIZARD_STEPS[step]}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1.5 px-6 pt-3">
          {WIZARD_STEPS.map((s, i) => (
            <div
              key={s}
              className="h-1.5 flex-1 rounded-full transition-all"
              style={{ backgroundColor: i <= step ? "#FFA500" : "#FFE082" }}
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {step === 0 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <p className="rounded-xl bg-[#FFF8E1] px-3 py-2 text-[11px] text-slate-600">
                Matches Investor <strong>Stage 1 — Idea & Financial Terms</strong>: title, category,
                description, expected ROI, and equity offered.
              </p>
              <div className="space-y-1.5">
                <Label>Idea Title <span className="text-red-500">*</span></Label>
                <Input
                  value={ideaTitle}
                  onChange={(e) => setIdeaTitle(e.target.value)}
                  placeholder="e.g. Organic Rice Export Co."
                />
              </div>

              <div className="space-y-1.5">
                <Label>Category / Industry Field <span className="text-red-500">*</span></Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FFA500]"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PitchCategory)}
                >
                  {PITCH_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Idea Description <span className="text-red-500">*</span></Label>
                <textarea
                  className="flex min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FFA500]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="One-paragraph pitch summary for the investor feed..."
                />
              </div>

              <div className="space-y-1.5">
                <Label>Core Problem & Solution <span className="text-red-500">*</span></Label>
                <textarea
                  className="flex min-h-[90px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FFA500]"
                  value={problemSolution}
                  onChange={(e) => setProblemSolution(e.target.value)}
                  placeholder="Describe the market problem you solve and your unique approach..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Required Investment (PKR) <span className="text-red-500">*</span></Label>
                  <p className="text-[10px] text-slate-400">→ stage2.totalCapitalRequiredPkr</p>
                  <Input
                    type="number"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(e.target.value)}
                    placeholder="3500000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Equity Offered (%) <span className="text-red-500">*</span></Label>
                  <p className="text-[10px] text-slate-400">→ stage1.equityOffered</p>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={equityPercent}
                    onChange={(e) => setEquityPercent(e.target.value)}
                    placeholder="15"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Expected ROI (%) <span className="text-red-500">*</span></Label>
                  <p className="text-[10px] text-slate-400">→ stage1.expectedRoi</p>
                  <Input
                    type="number"
                    value={roiPercent}
                    onChange={(e) => setRoiPercent(e.target.value)}
                    placeholder="18"
                  />
                </div>
              </div>

              {projections && (
                <div className="rounded-2xl border border-[#FFD700]/50 bg-[#FFF8E1]/80 p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#FFA500]">
                    <Calculator className="h-3.5 w-3.5" /> Auto-Calculated Projections
                  </p>
                  <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                    <span>Suggested profit margin: <strong>{projections.suggestedProfitMarginPercent}%</strong></span>
                    <span>Valuation: <strong>{formatPkr(projections.currentValuationPkr)}</strong></span>
                    <span className="sm:col-span-2">EBITDA: <strong>{projections.ebitdaEstimate}</strong></span>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <p className="rounded-xl bg-[#FFF8E1] px-3 py-2 text-[11px] text-slate-600">
                Matches Investor <strong>Stage 2 — Financial Requirements & Validation</strong>:
                capital required, proof gallery, customer base, and market insight.
              </p>
              <UploadZone
                label="Product Images"
                hint="→ stage2.proofGallery (type: product)"
                required
                images={productImages}
                inputRef={productRef}
                onPick={() => productRef.current?.click()}
                onFiles={(f) => readFiles(f, setProductImages, 4)}
                onRemove={(i) => setProductImages((p) => p.filter((_, idx) => idx !== i))}
              />

              <UploadZone
                label="Shop / Setup Photos"
                hint="→ stage2.proofGallery (facility / operations)"
                required
                images={setupPhotos}
                inputRef={setupRef}
                onPick={() => setupRef.current?.click()}
                onFiles={(f) => readFiles(f, setSetupPhotos, 4)}
                onRemove={(i) => setSetupPhotos((p) => p.filter((_, idx) => idx !== i))}
              />

              <div className="rounded-2xl border border-dashed border-[#FFA500]/40 bg-[#FFF8E1]/50 p-4">
                <p className="text-sm font-semibold text-slate-800">Customer List / Ledger</p>
                <p className="mb-3 text-[11px] text-slate-500">
                  → stage2.proofGallery + customerLedgerUrl (optional image or PDF)
                </p>
                <input
                  ref={ledgerRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => readSingle(e.target.files?.[0], setCustomerLedger)}
                />
                {customerLedger ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" /> Ledger uploaded
                    <button type="button" className="text-red-500 underline" onClick={() => setCustomerLedger("")}>Remove</button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => ledgerRef.current?.click()}>
                    <UploadCloud className="mr-1 h-3.5 w-3.5" /> Upload Ledger
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Existing Customer Base Size</Label>
                <p className="text-[10px] text-slate-400">→ stage2.customerBaseSize</p>
                <Input
                  value={customerBaseSize}
                  onChange={(e) => setCustomerBaseSize(e.target.value)}
                  placeholder="e.g. 1,200 active customers · 45 B2B accounts"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Market Location</Label>
                  <p className="text-[10px] text-slate-400">→ stage2.marketInsight.location</p>
                  <Input
                    value={marketLocation}
                    onChange={(e) => setMarketLocation(e.target.value)}
                    placeholder="e.g. Karachi, Pakistan"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Years of Experience</Label>
                  <p className="text-[10px] text-slate-400">→ stage2.founderBackground.yearsExperience</p>
                  <Input
                    type="number"
                    min={0}
                    value={founderYearsExperience}
                    onChange={(e) => setFounderYearsExperience(e.target.value)}
                    placeholder="e.g. 5"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Market Summary</Label>
                <p className="text-[10px] text-slate-400">→ stage2.marketInsight.marketSummary</p>
                <textarea
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FFA500]"
                  value={marketSummary}
                  onChange={(e) => setMarketSummary(e.target.value)}
                  placeholder="Demand trends, local opportunity, growth signals..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Prior Ventures</Label>
                  <p className="text-[10px] text-slate-400">→ stage2.founderBackground.priorVentures</p>
                  <Input
                    value={founderPriorVentures}
                    onChange={(e) => setFounderPriorVentures(e.target.value)}
                    placeholder="e.g. 1 successful exit in F&B"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Education / Credentials</Label>
                  <p className="text-[10px] text-slate-400">→ stage2.founderBackground.education</p>
                  <Input
                    value={founderEducation}
                    onChange={(e) => setFounderEducation(e.target.value)}
                    placeholder="e.g. BBA, IoBM Karachi"
                  />
                </div>
              </div>

              {projections && expenseLines.length > 0 && (
                <div className="rounded-2xl border border-[#FFA500]/25 bg-white p-4">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <TrendingUp className="h-3.5 w-3.5 text-[#FFA500]" /> Profit Projection Breakdown
                    <span className="ml-auto text-[10px] font-normal text-slate-400">Edit amounts (PKR)</span>
                  </p>
                  <div className="space-y-2">
                    {expenseLines.map((line, idx) => (
                      <div key={line.label} className="flex items-center gap-2">
                        <span className="w-[42%] shrink-0 text-[11px] text-slate-600">{line.label}</span>
                        <Input
                          type="number"
                          min={0}
                          value={line.amountPkr || ""}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setExpenseLines((prev) =>
                              prev.map((l, i) => (i === idx ? { ...l, amountPkr: val } : l)),
                            );
                          }}
                          className="h-8 flex-1 text-right font-mono text-xs"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 border-t border-[#FFA500]/15 pt-2 text-right text-xs font-bold text-slate-700">
                    Total: {formatPkr(expenseLines.reduce((s, l) => s + l.amountPkr, 0))}
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <p className="rounded-xl bg-[#FFF8E1] px-3 py-2 text-[11px] text-slate-600">
                Matches Investor <strong>Stage 3 — Legal, Escrow & Milestones</strong>: custom
                agreement text, sample product parameters, and optional agreement PDF.
              </p>
              <p className="text-xs text-slate-500">
                Write your custom investment agreement, or leave blank to use the SmartBiz
                auto-generated template (same as seeded investor dossiers via buildStage3For).
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Sample Product Name</Label>
                  <p className="text-[10px] text-slate-400">→ stage3.sampleProductName</p>
                  <Input
                    value={sampleProductName}
                    onChange={(e) => setSampleProductName(e.target.value)}
                    placeholder="e.g. Signature Tasting Box"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Sample Product Price (PKR)</Label>
                  <p className="text-[10px] text-slate-400">→ stage3.sampleProductPricePkr</p>
                  <Input
                    type="number"
                    value={sampleProductPricePkr}
                    onChange={(e) => setSampleProductPricePkr(e.target.value)}
                    placeholder="2500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> Custom Agreement Text
                </Label>
                <p className="text-[10px] text-slate-400">→ stage3.legalAgreementText</p>
                <textarea
                  className="flex min-h-[200px] w-full rounded-xl border border-input bg-transparent px-3 py-2 font-mono text-xs leading-relaxed shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FFA500]"
                  value={agreementText}
                  onChange={(e) => setAgreementText(e.target.value)}
                  placeholder={`SMARTBIZ GROW — INVESTMENT AGREEMENT\n\nFounder: ${founderName}\nVenture: ${ideaTitle || "[Your Idea Title]"}\n\n1. INVESTMENT TERMS\n   • Equity: ${equityPercent || "X"}%\n   • Capital: PKR ${investmentAmount || "X"}\n   • Expected ROI: ${roiPercent || "X"}%\n\n2. PROFIT SHARING\n   ...`}
                />
              </div>

              <div className="rounded-2xl border border-dashed border-[#FFA500]/40 bg-[#FFF8E1]/50 p-4">
                <p className="text-sm font-semibold text-slate-800">Agreement PDF (optional)</p>
                <p className="mb-3 text-[11px] text-slate-500">→ stage3.agreementPdfUrl</p>
                <input
                  ref={agreementPdfRef}
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => readSingle(e.target.files?.[0], setAgreementPdf)}
                />
                {agreementPdf ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" /> Agreement file attached
                    <button type="button" className="text-red-500 underline" onClick={() => setAgreementPdf("")}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => agreementPdfRef.current?.click()}>
                    <UploadCloud className="mr-1 h-3.5 w-3.5" /> Upload Agreement PDF
                  </Button>
                )}
              </div>

              <div className="rounded-2xl border border-[#FFD700]/40 bg-[#FFF8E1] p-4 text-xs text-slate-600">
                <p className="font-bold text-slate-800 mb-1">Ready to go live?</p>
                <p>
                  Clicking <strong>Pitch Idea</strong> publishes your dossier to the investor feed
                  instantly — all 3 stages will be visible in the Investor desk.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#FFA500]/20 px-6 py-4">
          <Button type="button" variant="ghost" onClick={() => (step === 0 ? onClose() : setStep((s) => s - 1))}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {step === 0 ? "Cancel" : "Back"}
          </Button>

          {step < 2 ? (
            <Button
              type="button"
              disabled={!canNext()}
              onClick={() => setStep((s) => s + 1)}
              className="text-white"
              style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
            >
              Continue <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              disabled={submitting}
              onClick={handlePitch}
              className="gap-2 px-6 font-bold text-white shadow-lg shadow-[#FFA500]/30"
              style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Publishing to Investor Feed...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Pitch Idea
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function UploadZone({
  label,
  hint,
  required,
  images,
  inputRef,
  onPick,
  onFiles,
  onRemove,
}: {
  label: string;
  hint: string;
  required?: boolean;
  images: string[];
  inputRef: RefObject<HTMLInputElement | null>;
  onPick: () => void;
  onFiles: (files: FileList | null) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#FFA500]/40 bg-[#FFF8E1]/40 p-4">
      <p className="text-sm font-semibold text-slate-800">
        {label} {required && <span className="text-red-500">*</span>}
      </p>
      <p className="mb-3 text-[11px] text-slate-500">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      <div className="flex flex-wrap gap-2">
        {images.map((src, i) => (
          <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-[#FFA500]/30">
            <img src={src} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center bg-red-500 text-[9px] text-white"
            >
              ×
            </button>
          </div>
        ))}
        {images.length < 4 && (
          <button
            type="button"
            onClick={onPick}
            className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border border-[#FFA500]/30 bg-white text-[#FFA500] hover:bg-[#FFF8E1]"
          >
            <ImageIcon className="h-4 w-4" />
            <span className="text-[8px] font-bold">Add</span>
          </button>
        )}
      </div>
    </div>
  );
}
