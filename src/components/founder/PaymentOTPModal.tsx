import { useState } from "react";
import { Smartphone, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { sendPaymentOtp, verifyPaymentOtp, saveAuthSession } from "@/services/realtimeDataService";

type Props = {
  open: boolean;
  onClose: () => void;
  method: "jazzcash" | "easypaisa";
  userId: string;
  userName: string;
  userRole: string;
  email: string;
  amountPkr: number;
  onVerified: () => void;
};

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function PaymentOTPModal({
  open,
  onClose,
  method,
  userId,
  userName,
  userRole,
  email,
  amountPkr,
  onVerified,
}: Props) {
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [sentOtp, setSentOtp] = useState("");
  const [otpId, setOtpId] = useState("");
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const label = method === "jazzcash" ? "JazzCash" : "EasyPaisa";

  const handleSendOtp = async () => {
    if (!mobile.trim() || mobile.length < 10) {
      toast.error("Enter a valid mobile number (e.g. 03001234567)");
      return;
    }
    setLoading(true);
    const code = generateOtp();
    try {
      const record = await sendPaymentOtp({
        userId,
        method,
        mobile: mobile.trim(),
        otp: code,
        amountPkr,
      });
      setSentOtp(code);
      setOtpId(record.id);
      setStep("otp");
      toast.success(`OTP sent to ${mobile} via ${label}`, {
        description: `Demo OTP: ${code} (check backend payment_otp node)`,
        duration: 10000,
      });
    } catch {
      toast.error("Failed to send OTP. Check Firebase connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!otp.trim()) return;
    setLoading(true);
    try {
      const result = await verifyPaymentOtp(userId, otpId, otp.trim());
      if (!result.ok) {
        toast.error(result.error || "Invalid OTP");
        return;
      }
      await saveAuthSession({
        uid: userId,
        role: userRole,
        email,
        phone: mobile,
        name: userName,
        authenticatedAt: Date.now(),
        paymentMethod: method,
      });
      toast.success(`${label} payment authenticated! Data saved to backend.`);
      onVerified();
      onClose();
    } catch {
      toast.error("Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-3xl border border-[#FFD700]/30 p-6 shadow-2xl"
        style={{ background: "#1a1a2e" }}
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFD700] to-[#FFA500]">
            <Smartphone className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white">{label} Payment</h3>
            <p className="text-xs text-slate-400">Rs. {amountPkr.toLocaleString("en-PK")} · OTP Authentication</p>
          </div>
        </div>

        {step === "mobile" ? (
          <div className="space-y-3">
            <Input
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="03XX XXXXXXX"
              className="border-white/10 bg-white/5 text-white"
            />
            <Button className="w-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] font-bold text-[#1a1a2e]"
              onClick={handleSendOtp} disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send OTP to Mobile
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">Enter the 6-digit OTP sent to <strong className="text-white">{mobile}</strong></p>
            <Input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit OTP"
              maxLength={6}
              className="border-white/10 bg-white/5 text-center text-lg tracking-widest text-white"
            />
            <Button className="w-full bg-emerald-600 text-white" onClick={handleVerify} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Verify &amp; Authenticate
            </Button>
          </div>
        )}

        <Button variant="ghost" className="mt-3 w-full text-slate-400" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}
