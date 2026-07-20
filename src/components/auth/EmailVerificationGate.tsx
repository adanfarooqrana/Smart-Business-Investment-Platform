import { useEffect, useState } from "react";
import { Mail, Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  reloadAndCheckEmailVerified,
  resendEmailVerificationMail,
  friendlyIdentityError,
} from "@/services/identityVerificationService";

type EmailVerificationGateProps = {
  email: string;
  onVerified: () => void;
  accentClassName?: string;
};

/**
 * Blocks progress until auth.currentUser.emailVerified === true.
 * Polls reload() every 3s; offers Resend Verification Email.
 */
export function EmailVerificationGate({
  email,
  onVerified,
  accentClassName = "text-amber-600",
}: EmailVerificationGateProps) {
  const [checking, setChecking] = useState(true);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      try {
        const ok = await reloadAndCheckEmailVerified();
        if (cancelled) return;
        setChecking(false);
        if (ok) {
          if (timer) clearInterval(timer);
          onVerified();
        }
      } catch (err) {
        if (!cancelled) {
          setChecking(false);
          setError(friendlyIdentityError(err));
        }
      }
    };

    void tick();
    timer = setInterval(() => void tick(), 3000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [onVerified]);

  const handleResend = async () => {
    setResending(true);
    setError(null);
    setInfo(null);
    try {
      await resendEmailVerificationMail();
      setInfo("Verification email resent. Check inbox / spam.");
    } catch (err) {
      setError(friendlyIdentityError(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 text-center animate-in fade-in zoom-in-95 duration-300">
      <div
        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow ${accentClassName}`}
      >
        <Mail className="h-7 w-7" />
      </div>
      <h3 className="font-display text-lg font-bold text-slate-900">Verify your email</h3>
      <p className="text-sm font-semibold text-slate-800">
        Check your email and verify to continue.
      </p>
      <p className="text-xs text-slate-500">
        We sent a link to <span className="font-semibold text-slate-800">{email}</span>. This screen
        updates automatically after you verify.
      </p>

      <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
        {checking ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking verification status…
          </>
        ) : (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" /> Waiting for email confirmation…
          </>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
      {info && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          {info}
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        disabled={resending}
        onClick={() => void handleResend()}
        className="rounded-full"
      >
        {resending ? (
          <>
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Sending…
          </>
        ) : (
          <>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Resend Verification Email
          </>
        )}
      </Button>
    </div>
  );
}
