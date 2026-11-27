import { useEffect, useRef, useState } from "react";
import { Mail, Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  reloadAndCheckEmailVerified,
  resendEmailVerificationMail,
  friendlyIdentityError,
} from "@/services/identityVerificationService";

import type { RoleType } from "@/services/onboardingFirestoreService";

type EmailVerificationGateProps = {
  email: string;
  role: RoleType;
  onVerified: () => void | Promise<void>;
  accentClassName?: string;
  delivery?: "accepted" | "pending";
  deliveryError?: string;
};

/**
 * Blocks progress until auth.currentUser.emailVerified === true.
 * Polls every three seconds without overlapping requests.
 */
export function EmailVerificationGate({
  email,
  role,
  onVerified,
  accentClassName = "text-amber-600",
  delivery = "accepted",
  deliveryError = "",
}: EmailVerificationGateProps) {
  const [checking, setChecking] = useState(true);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [mailAccepted, setMailAccepted] = useState(delivery === "accepted");
  const [sendError, setSendError] = useState(deliveryError);

  const checkNow = useRef<() => void>(() => {});
  const onVerifiedRef = useRef(onVerified);
  useEffect(() => { onVerifiedRef.current = onVerified; }, [onVerified]);

  useEffect(() => {
    let disposed = false;
    let running = false;
    let complete = false;
    const tick = async () => {
      if (running || disposed || complete) return;
      running = true;
      try {
        if (!(await reloadAndCheckEmailVerified(email, role)) || disposed) return;
        await onVerifiedRef.current();
        complete = true;
      } catch (error) {
        if (!disposed) setError(friendlyIdentityError(error));
      } finally {
        if (!disposed) setChecking(false);
        running = false;
      }
    };
    void tick();
    checkNow.current = () => {
      if (running || complete || disposed) return;
      setError(null);
      setChecking(true);
      void tick();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") checkNow.current();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const timer = window.setInterval(() => void tick(), 3000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [email, role]);

  const handleResend = async () => {
    setResending(true);
    setError(null);
    setInfo(null);
    setSendError("");
    try {
      const result = await resendEmailVerificationMail(email);
      if (result === "verified") {
        checkNow.current();
        return;
      }
      setMailAccepted(true);
      setInfo("Firebase accepted the verification request. Check your inbox and spam folder.");
    } catch (err: unknown) {
      setSendError(friendlyIdentityError(err));
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
        {mailAccepted ? "Verification link requested for " : "Verify the email address "}
        <span className="font-semibold text-slate-800">{email}</span>.
        {mailAccepted ? " Check your inbox and spam folder." : " Use the button below to request a link."}
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

      {sendError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          Could not send a verification link. {sendError}
        </p>
      )}
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

      <Button type="button" onClick={() => checkNow.current()} disabled={checking} className="mr-2 rounded-full">
        I verified my email
      </Button>

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
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> {mailAccepted ? "Resend Verification Email" : "Send Verification Email"}
          </>
        )}
      </Button>
    </div>
  );
}
