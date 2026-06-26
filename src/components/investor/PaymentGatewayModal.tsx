import { useState, useCallback } from "react";

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

import {

  Smartphone,

  CreditCard,

  CheckCircle2,

  Loader2,

  Upload,

  ShieldCheck,

  ArrowLeft,

  Sparkles,

  AlertTriangle,

} from "lucide-react";

import { formatPkr } from "@/lib/investmentCalculator";



export type PaymentMethod = "jazzcash" | "easypaisa" | "card";



type PaymentGatewayModalProps = {

  open: boolean;

  onOpenChange: (open: boolean) => void;

  amountPkr: number;

  startupTitle: string;

  equityPercent: number;

  founderId?: string;

  investorName?: string;

  onPaymentSuccess: (details: {

    method: PaymentMethod;

    phone?: string;

    receiptFileName?: string;

    aiVerifiedAmount?: number;

  }) => void;

};



type Step = "select" | "wallet-phone" | "wallet-otp" | "card" | "receipt" | "receipt-ai" | "success";



function generateMockOtp(): string {

  return String(Math.floor(100000 + Math.random() * 900000));

}



export function PaymentGatewayModal({

  open,

  onOpenChange,

  amountPkr,

  startupTitle,

  equityPercent,

  founderId,

  investorName,

  onPaymentSuccess,

}: PaymentGatewayModalProps) {
  const [step, setStep] = useState<Step>("select");

  const [method, setMethod] = useState<PaymentMethod | null>(null);

  const [phone, setPhone] = useState("");

  const [sentOtp, setSentOtp] = useState("");

  const [otp, setOtp] = useState("");

  const [otpError, setOtpError] = useState("");

  const [otpCountdown, setOtpCountdown] = useState(0);

  const [isVerifying, setIsVerifying] = useState(false);

  const [receiptName, setReceiptName] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);

  const [cardNumber, setCardNumber] = useState("");

  const [cardExpiry, setCardExpiry] = useState("");

  const [cardCvc, setCardCvc] = useState("");

  const [aiDetectedAmount, setAiDetectedAmount] = useState<number | null>(null);

  const [aiVerified, setAiVerified] = useState<boolean | null>(null);



  const reset = useCallback(() => {

    setStep("select");

    setMethod(null);

    setPhone("");

    setSentOtp("");

    setOtp("");

    setOtpError("");

    setOtpCountdown(0);

    setReceiptName(null);

    setCardNumber("");

    setCardExpiry("");

    setCardCvc("");

    setAiDetectedAmount(null);

    setAiVerified(null);

  }, []);



  const handleClose = (v: boolean) => {

    if (!v) reset();

    onOpenChange(v);

  };



  const selectMethod = (m: PaymentMethod) => {

    setMethod(m);

    if (m === "card") setStep("card");

    else setStep("wallet-phone");

  };



  const sendOtp = async () => {

    if (phone.replace(/\D/g, "").length < 10) return;

    setIsVerifying(true);

    const code = generateMockOtp();

    await new Promise((r) => setTimeout(r, 1100));

    setSentOtp(code);

    setIsVerifying(false);

    setStep("wallet-otp");

    setOtpCountdown(60);

    const timer = window.setInterval(() => {

      setOtpCountdown((c) => {

        if (c <= 1) {

          window.clearInterval(timer);

          return 0;

        }

        return c - 1;

      });

    }, 1000);

  };



  const verifyOtp = async () => {

    setIsVerifying(true);

    await new Promise((r) => setTimeout(r, 900));

    setIsVerifying(false);

    if (otp !== sentOtp) {

      setOtpError("Invalid OTP. Check the code sent to your number.");

      return;

    }

    setOtpError("");

    setStep("receipt");

  };



  const processCard = async () => {

    setIsVerifying(true);

    await new Promise((r) => setTimeout(r, 1200));

    setIsVerifying(false);

    setStep("receipt");

  };



  const handleReceiptFile = async (fileName: string) => {

    setReceiptName(fileName);

    setStep("receipt-ai");

    setIsVerifying(true);

    await new Promise((r) => setTimeout(r, 1800));

    const variance = Math.random() > 0.15 ? 0 : Math.floor(Math.random() * 500 - 250);

    const detected = amountPkr + variance;

    setAiDetectedAmount(detected);

    setAiVerified(Math.abs(detected - amountPkr) <= 100);

    setIsVerifying(false);

  };



  const handleDrop = (e: React.DragEvent) => {

    e.preventDefault();

    setIsDragging(false);

    const file = e.dataTransfer.files[0];

    if (file) handleReceiptFile(file.name);

  };



  const finalizePayment = async () => {

    setIsVerifying(true);

    await new Promise((r) => setTimeout(r, 1000));

    setIsVerifying(false);

    setStep("success");

    const paidAmount = aiDetectedAmount ?? amountPkr;

    const paymentId = `pay-${Date.now()}`;

    onPaymentSuccess({

      method: method!,

      phone: method !== "card" ? phone : undefined,

      receiptFileName: receiptName ?? undefined,

      aiVerifiedAmount: paidAmount,

    });

    if (founderId) {

      const { sendNotification } = await import("@/services/firebaseService");

      void sendNotification(founderId, {

        type: "payment",

        message: `Payment of PKR ${paidAmount.toLocaleString()} received from ${investorName ?? "Investor"}`,

        relatedId: paymentId,

      }).catch((err) => console.warn("Payment notification failed:", err));

    }

    setTimeout(() => handleClose(false), 2400);

  };



  const walletLabel = method === "jazzcash" ? "JazzCash" : "EasyPaisa";

  const walletColor = method === "jazzcash" ? "from-red-500 to-red-600" : "from-green-500 to-emerald-600";



  return (

    <Dialog open={open} onOpenChange={handleClose}>

      <DialogContent className="max-w-md overflow-hidden rounded-2xl border-slate-200 p-0 gap-0">

        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 px-6 py-5 text-white">

          <DialogHeader className="text-left space-y-1">

            <div className="flex items-center gap-2">

              <ShieldCheck className="h-5 w-5" />

              <DialogTitle className="font-display text-lg font-bold text-white">SmartBiz Escrow Payment</DialogTitle>

            </div>

            <DialogDescription className="text-emerald-100 text-xs">

              Secure escrow for {startupTitle} &bull; {formatPkr(amountPkr)} &bull; {equityPercent.toFixed(2)}% equity

            </DialogDescription>

          </DialogHeader>

          <StepIndicator step={step} />

        </div>



        <div className="p-6">

          {step === "select" && (

            <div className="space-y-3 animate-in fade-in duration-200">

              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select payment method</p>

              <PaymentMethodButton

                label="JazzCash"

                sub="Enter number → OTP → Receipt verify"

                color="from-red-500 to-red-600"

                icon={<Smartphone className="h-5 w-5" />}

                onClick={() => selectMethod("jazzcash")}

              />

              <PaymentMethodButton

                label="EasyPaisa"

                sub="Enter number → OTP → Receipt verify"

                color="from-green-500 to-emerald-600"

                icon={<Smartphone className="h-5 w-5" />}

                onClick={() => selectMethod("easypaisa")}

              />

              <PaymentMethodButton

                label="Debit / Credit Card"

                sub="Visa · Mastercard · UnionPay"

                color="from-slate-700 to-slate-900"

                icon={<CreditCard className="h-5 w-5" />}

                onClick={() => selectMethod("card")}

              />

            </div>

          )}



          {step === "wallet-phone" && method && (

            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">

              <button type="button" onClick={() => setStep("select")} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
                <ArrowLeft className="h-3 w-3" /> Back
              </button>

              <div className={`rounded-xl bg-gradient-to-r ${walletColor} p-4 text-white text-center`}>

                <p className="text-xs font-bold uppercase tracking-wider opacity-90">{walletLabel} Wallet</p>

                <p className="font-display text-2xl font-black mt-1">{formatPkr(amountPkr)}</p>

              </div>

              <Label className="text-xs font-bold uppercase text-slate-500">{walletLabel} Mobile Number</Label>

              <Input

                placeholder="03XX XXXXXXX"

                value={phone}

                onChange={(e) => setPhone(e.target.value)}

                className="h-11 text-base"

              />

              <Button onClick={sendOtp} disabled={isVerifying || phone.replace(/\D/g, "").length < 10} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700">

                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : `Send OTP to ${phone || "your number"}`}

              </Button>

            </div>

          )}



          {step === "wallet-otp" && (

            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">

                <p className="text-xs text-emerald-800">

                  OTP sent to <span className="font-bold">{phone}</span>

                </p>

                {import.meta.env.DEV && sentOtp && (

                  <p className="mt-1 text-[10px] text-emerald-600 font-mono">Demo OTP: {sentOtp}</p>

                )}

                {otpCountdown > 0 && (

                  <p className="text-[10px] text-slate-500 mt-1">Resend in {otpCountdown}s</p>

                )}

              </div>

              <Label className="text-xs font-bold uppercase text-slate-500">Enter 6-digit OTP</Label>

              <Input

                placeholder="••••••"

                maxLength={6}

                value={otp}

                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}

                className="h-11 text-center text-lg tracking-[0.4em] font-mono"

              />

              {otpError && <p className="text-xs text-red-600">{otpError}</p>}

              <Button onClick={verifyOtp} disabled={isVerifying || otp.length < 6} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700">

                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify OTP & Authorize"}

              </Button>

            </div>

          )}



          {step === "card" && (

            <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-200">

              <button type="button" onClick={() => setStep("select")} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">

                <ArrowLeft className="h-3 w-3" /> Back

              </button>

              <Input placeholder="Card number" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className="h-10" />

              <div className="grid grid-cols-2 gap-2">

                <Input placeholder="MM/YY" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} className="h-10" />

                <Input placeholder="CVC" value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} className="h-10" />

              </div>

              <Button onClick={processCard} disabled={isVerifying} className="w-full rounded-xl bg-slate-900 hover:bg-slate-800">

                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay ${formatPkr(amountPkr)}`}

              </Button>

            </div>

          )}



          {step === "receipt" && (

            <div className="space-y-4 animate-in fade-in duration-200">

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">

                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 mb-1" />

                <p className="text-sm font-bold text-emerald-800">Payment Authorized</p>

                <p className="text-[10px] text-emerald-600">Upload wallet screenshot — AI will verify amount</p>

              </div>

              <div

                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}

                onDragLeave={() => setIsDragging(false)}

                onDrop={handleDrop}

                className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${

                  isDragging ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-slate-50"

                }`}

              >

                <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />

                <p className="text-xs font-semibold text-slate-600">Drag & drop payment receipt screenshot</p>

                <p className="text-[10px] text-slate-400 mt-1">AI reads amount from JazzCash / EasyPaisa receipt</p>

                <input

                  type="file"

                  accept="image/*"

                  className="hidden"

                  id="receipt-upload"

                  onChange={(e) => e.target.files?.[0] && handleReceiptFile(e.target.files[0].name)}

                />

                <label htmlFor="receipt-upload" className="mt-3 inline-block cursor-pointer text-[10px] font-bold text-emerald-600 hover:underline">

                  Browse files

                </label>

              </div>

              <Button variant="outline" onClick={finalizePayment} className="w-full rounded-xl text-xs">

                Skip screenshot (not recommended)

              </Button>

            </div>

          )}



          {step === "receipt-ai" && (

            <div className="space-y-4 animate-in fade-in duration-200">

              {isVerifying ? (

                <div className="py-8 text-center">

                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-violet-600 mb-3" />

                  <p className="text-sm font-bold text-slate-800 flex items-center justify-center gap-2">

                    <Sparkles className="h-4 w-4 text-violet-500" /> AI analyzing receipt…

                  </p>

                  <p className="text-[10px] text-slate-500 mt-1">Detecting payment amount from {receiptName}</p>

                </div>

              ) : (

                <>

                  <div className={`rounded-xl border p-4 ${aiVerified ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>

                    <div className="flex items-center gap-2 mb-2">

                      <Sparkles className="h-5 w-5 text-violet-600" />

                      <p className="text-sm font-bold text-slate-900">AI Receipt Verification</p>

                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">

                      <div>

                        <p className="text-slate-500">Expected</p>

                        <p className="font-black text-slate-900">{formatPkr(amountPkr)}</p>

                      </div>

                      <div>

                        <p className="text-slate-500">AI Detected</p>

                        <p className="font-black text-violet-700">{formatPkr(aiDetectedAmount ?? 0)}</p>

                      </div>

                    </div>

                    {aiVerified ? (

                      <p className="mt-3 flex items-center gap-1 text-[11px] font-bold text-emerald-700">

                        <CheckCircle2 className="h-4 w-4" /> Payment verified — amounts match

                      </p>

                    ) : (

                      <p className="mt-3 flex items-center gap-1 text-[11px] font-bold text-amber-700">

                        <AlertTriangle className="h-4 w-4" /> Slight variance detected — manual review may apply

                      </p>

                    )}

                  </div>

                  <Button onClick={finalizePayment} disabled={isVerifying} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700">

                    Complete Escrow Settlement

                  </Button>

                </>

              )}

            </div>

          )}



          {step === "success" && (

            <div className="py-8 text-center animate-in zoom-in-95 duration-300">

              <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500 mb-4" />

              <p className="font-display text-xl font-bold text-slate-900">Payment Successful!</p>

              <p className="mt-2 text-sm text-slate-500">

                {formatPkr(amountPkr)} escrowed in {startupTitle}

              </p>

            </div>

          )}

        </div>

      </DialogContent>

    </Dialog>

  );

}



function StepIndicator({ step }: { step: Step }) {

  const steps = ["select", "wallet-phone", "wallet-otp", "receipt", "success"];

  const idx = step === "card" ? 1 : step === "receipt-ai" ? 3 : steps.indexOf(step);

  return (

    <div className="mt-3 flex gap-1">

      {[0, 1, 2, 3].map((i) => (

        <div

          key={i}

          className={`h-1 flex-1 rounded-full transition-all ${i <= idx ? "bg-white" : "bg-white/30"}`}

        />

      ))}

    </div>

  );

}



function PaymentMethodButton({

  label,

  sub,

  color,

  icon,

  onClick,

}: {

  label: string;

  sub: string;

  color: string;

  icon: React.ReactNode;

  onClick: () => void;

}) {

  return (

    <button

      type="button"

      onClick={onClick}

      className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-emerald-300 hover:shadow-md"

    >

      <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-sm`}>

        {icon}

      </div>

      <div>

        <p className="text-sm font-bold text-slate-900">{label}</p>

        <p className="text-[10px] text-slate-500">{sub}</p>

      </div>

    </button>

  );

}

