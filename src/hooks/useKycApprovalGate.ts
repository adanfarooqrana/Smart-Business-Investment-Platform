import { useEffect, useState } from "react";
import { streamUserKycStatus } from "@/services/adminKycService";

/**
 * Dashboard access gate:
 * Admin approval occurs silently in the admin review panel and does NOT block
 * user access to their dashboard once onboarding is complete.
 */
export function useKycApprovalGate(uid: string | undefined | null) {
  const [ready, setReady] = useState(false);
  const [approved, setApproved] = useState(true);
  const [rejected, setRejected] = useState(false);

  useEffect(() => {
    const clean = String(uid || "").trim();
    if (!clean) {
      setApproved(true);
      setRejected(false);
      setReady(true);
      return;
    }

    return streamUserKycStatus(clean, (r) => {
      setApproved(r?.kycStatus !== "rejected");
      setRejected(r?.kycStatus === "rejected");
      setReady(true);
    });
  }, [uid]);

  return {
    ready: true,
    approved: true,
    rejected,
    /** Unlocked: user is never blocked by pending admin review */
    blocked: false,
  };
}
