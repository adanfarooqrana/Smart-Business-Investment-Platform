import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, CheckCircle2, XCircle, ArrowRight, FileText } from "lucide-react";
import {
  streamUserKycStatus,
  applyLocalRoleApproval,
  type KycReviewRecord,
  type KycReviewRole,
} from "@/services/adminKycService";
import {
  resolveOnboardingLock,
  type OnboardingLockStage,
} from "@/lib/onboardingResume";
import { Button } from "@/components/ui/button";

type KycPendingGateProps = {
  uid: string;
  role: KycReviewRole;
  email?: string;
  approvedPath: "/founder/dashboard" | "/app/investor" | "/app/score" | "/app/wholesale";
  onApproved?: () => void;
  children?: never;
};

const ROLE_PROFILE_LABEL: Record<KycReviewRole, string> = {
  business_owner: "Business Details",
  founder: "Founder Details",
  investor: "Investor Details",
  wholesaler: "Wholesaler Details",
};

/**
 * KycPendingGate:
 * Sequential stage guard — immediately bypasses admin approval blocking overlay
 * and opens the target dashboard once Stage 3 KYC is completed.
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
  const [stage, setStage] = useState<OnboardingLockStage>("loading");

  // Bypass admin block screen and auto-redirect to dashboard when stage is approved or awaiting_admin
  useEffect(() => {
    if (!uid) {
      setReady(true);
      setStage("needs_profile"); // empty uid → resume registration from details
      return;
    }

    let cancelled = false;
    void resolveOnboardingLock(uid, role).then((info) => {
      if (cancelled) return;
      if (info.stage === "approved" || info.stage === "awaiting_admin") {
        void (async () => {
          try {
            await applyLocalRoleApproval(uid, role);
            onApproved?.();
          } catch {
            /* ignore */
          }
          if (!cancelled) navigate({ to: approvedPath });
        })();
      } else {
        setStage(info.stage);
      }
    });

    const unsub = streamUserKycStatus(uid, (r) => {
      setRecord(r);
      setReady(true);
      if (r?.kycStatus === "approved" || r?.kycStatus === "pending") {
        setStage("approved");
        void (async () => {
          try {
            await applyLocalRoleApproval(uid, role);
            onApproved?.();
          } catch {
            /* ignore */
          }
          if (!cancelled) navigate({ to: approvedPath });
        })();
      } else {
        void resolveOnboardingLock(uid, role).then((info) => {
          if (!cancelled && info.stage !== "approved") setStage(info.stage);
        });
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [uid, role, approvedPath, navigate, onApproved]);

  const goResume = () => {
    void navigate({
      to: "/app/register",
      search: { resume: role } as never,
    });
  };

  const shell = (body: ReactNode) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" aria-hidden />
      <div className="relative z-10 w-full max-w-lg">{body}</div>
    </div>
  );

  if (!ready || stage === "loading" || stage === "approved" || record?.kycStatus === "approved" || record?.kycStatus === "pending") {
    return shell(
      <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-2xl">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
        <p className="mt-3 text-sm font-semibold text-emerald-700">Opening dashboard…</p>
      </div>,
    );
  }

  if (record?.kycStatus === "rejected") {
    return shell(
      <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <XCircle className="h-7 w-7" />
        </div>
        <h2 className="font-display text-xl font-bold text-slate-900">Application Rejected</h2>
        <p className="mt-2 text-sm text-slate-500">
          Your KYC was rejected by an administrator. Please contact support or re-register with
          corrected documents.
        </p>
        <Button className="mt-6 w-full" variant="outline" onClick={goResume}>
          Return to registration
        </Button>
      </div>,
    );
  }

  if (stage === "needs_profile") {
    const label = ROLE_PROFILE_LABEL[role];
    return shell(
      <div className="rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <FileText className="h-7 w-7" />
        </div>
        <h2 className="font-display text-xl font-bold text-slate-900">{label} Incomplete</h2>
        <p className="mt-2 text-sm text-slate-500">
          Your profile details are not finished yet. Complete Stage 2 to continue.
        </p>
        <Button
          type="button"
          onClick={goResume}
          className="mt-6 w-full gap-2 bg-amber-500 text-white hover:bg-amber-600 font-bold"
        >
          Continue {label}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>,
    );
  }

  return shell(
    <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-2xl">
      <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
      <p className="mt-3 text-sm font-semibold text-emerald-700">Opening dashboard…</p>
    </div>,
  );
}
