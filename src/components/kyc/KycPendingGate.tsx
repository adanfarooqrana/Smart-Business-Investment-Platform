import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import {
  streamUserKycStatus,
  applyLocalRoleApproval,
  approveKycReview,
  type KycReviewRecord,
  type KycReviewRole,
} from "@/services/adminKycService";
import { KYC_BYPASS_FOR_TESTING } from "@/lib/kycBypass";

type KycPendingGateProps = {
  uid: string;
  role: KycReviewRole;
  email?: string;
  /** Where to send the user after admin approval */
  approvedPath: "/founder/dashboard" | "/app/investor" | "/app/score";
  onApproved?: () => void;
  children?: never;
};

/**
 * Blocks dashboard access until kyc_reviews/{uid}.kycStatus === 'approved'.
 * When KYC_BYPASS_FOR_TESTING is true → auto-approve and open dashboard (code kept intact).
 */
export function KycPendingGate({
  uid,
  role,
  email,
  approvedPath,
  onApproved,
}: KycPendingGateProps) {
  const navigate = useNavigate();
  const [record, setRecord] = useState<KycReviewRecord | null>(null);
  const [ready, setReady] = useState(false);

  // Testing bypass: auto-approve → dashboard
  useEffect(() => {
    if (!KYC_BYPASS_FOR_TESTING || !uid) return;
    let cancelled = false;
    void (async () => {
      try {
        await approveKycReview(uid);
        await applyLocalRoleApproval(uid, role);
        onApproved?.();
      } catch (error) {
        console.warn("KYC bypass auto-approve:", error);
        try {
          await applyLocalRoleApproval(uid, role);
        } catch {
          /* continue locally */
        }
      }
      if (!cancelled) navigate({ to: approvedPath });
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, role, approvedPath, navigate, onApproved]);

  useEffect(() => {
    if (KYC_BYPASS_FOR_TESTING) return;
    if (!uid) {
      setReady(true);
      return;
    }
    return streamUserKycStatus(uid, (r) => {
      setRecord(r);
      setReady(true);
    });
  }, [uid]);

  useEffect(() => {
    if (KYC_BYPASS_FOR_TESTING) return;
    if (!ready || !record || record.kycStatus !== "approved") return;
    let cancelled = false;
    void (async () => {
      try {
        await applyLocalRoleApproval(uid, role);
        onApproved?.();
      } catch (error) {
        console.error("KycPendingGate sync error:", error);
      }
      if (!cancelled) {
        navigate({ to: approvedPath });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, record?.kycStatus, uid, role, approvedPath, navigate, onApproved]);

  if (KYC_BYPASS_FOR_TESTING) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm font-semibold text-emerald-700">
          KYC bypassed for testing — opening dashboard…
        </p>
        <p className="text-[11px] text-slate-400">
          Re-enable later: set KYC_BYPASS_FOR_TESTING = false in src/lib/kycBypass.ts
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        <p className="text-sm text-slate-500">Checking approval status…</p>
      </div>
    );
  }

  if (record?.kycStatus === "approved") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm font-semibold text-emerald-700">Approved — opening dashboard…</p>
      </div>
    );
  }

  if (record?.kycStatus === "rejected") {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-red-200 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <XCircle className="h-7 w-7" />
        </div>
        <h2 className="font-display text-xl font-bold text-slate-900">Application Rejected</h2>
        <p className="mt-2 text-sm text-slate-500">
          Your KYC submission was rejected by an administrator. Please contact support or re-register
          with corrected documents.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-xl">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 animate-pulse">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <h2 className="font-display text-xl font-bold text-slate-900">Waiting for Admin Approval</h2>
      <p className="mt-2 text-sm text-slate-500">
        Your complete signup profile and KYC photos are under review. This screen will open your
        dashboard automatically when an admin approves you.
      </p>
      <div className="mt-6 space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left font-mono text-[11px]">
        <div className="flex items-center gap-2 text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Signup + KYC payload submitted</span>
        </div>
        <div className="flex items-center gap-2 text-amber-600 animate-pulse">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>kycStatus: pending · isApproved: false</span>
        </div>
      </div>
      {email ? (
        <p className="mt-4 text-xs text-slate-400">
          Confirmation will be sent to <span className="font-semibold text-slate-700">{email}</span>
        </p>
      ) : null}
      <button
        type="button"
        disabled
        className="mt-6 w-full cursor-not-allowed rounded-full bg-slate-200 py-3 text-sm font-bold text-slate-500"
      >
        Done, wait for admin approval
      </button>
    </div>
  );
}
