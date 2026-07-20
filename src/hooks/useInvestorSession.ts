import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppState, type InvestorProfile } from "@/hooks/useAppState";
import { fetchInvestorProfile } from "@/services/investorCoreService";

type RegisterInvestor = (profile: Partial<InvestorProfile>) => void;

/** Load investor profile from RTDB investors/{uid}/profile into useAppState. */
export async function hydrateInvestorFromRtdb(
  uid: string,
  registerInvestor: RegisterInvestor,
  fallback?: { name?: string; email?: string; password?: string },
): Promise<void> {
  try {
    const profile = await fetchInvestorProfile(uid);

    if (profile) {
      registerInvestor({
        name: String(profile.fullName ?? fallback?.name ?? ""),
        email: String(profile.email ?? fallback?.email ?? ""),
        phone: String(profile.mobilePhoneForOtp ?? ""),
        password: fallback?.password,
        categories: [],
        ticketSize: "",
        budgetRange: "",
        location: "Pakistan",
        strategy: profile.bankDetails?.bankName
          ? `Bank: ${profile.bankDetails.bankName}`
          : "",
        entityType: "Normal Person",
      });
      return;
    }
  } catch (error) {
    console.error("hydrateInvestorFromRtdb error:", error);
  }

  if (fallback?.email) {
    registerInvestor({
      name: fallback.name ?? fallback.email.split("@")[0],
      email: fallback.email,
      password: fallback.password,
      phone: "",
      categories: [],
      ticketSize: "",
      budgetRange: "",
      location: "",
      strategy: "",
    });
  }
}

/**
 * Ensures Firebase-authenticated investors have local profile state loaded
 * so dashboards don't spin forever on `investor.isRegistered === false`.
 */
export function useInvestorSession() {
  const { currentUser, userData, loading: authLoading } = useAuth();
  const { investor, isLoggedIn, role, registerInvestor } = useAppState();
  const [sessionReady, setSessionReady] = useState(false);
  const hydratedUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      setSessionReady(false);
      return;
    }

    const isInvestorRole =
      role === "investor" || userData?.role === "investor";

    if (!isInvestorRole) {
      setSessionReady(true);
      return;
    }

    if (investor.isRegistered && isLoggedIn && role === "investor") {
      setSessionReady(true);
      return;
    }

    const uid = currentUser?.uid;
    if (!uid) {
      setSessionReady(true);
      return;
    }

    if (hydratedUidRef.current === uid) {
      setSessionReady(true);
      return;
    }

    hydratedUidRef.current = uid;
    let cancelled = false;

    hydrateInvestorFromRtdb(uid, registerInvestor, {
      name: userData?.name,
      email: userData?.email ?? currentUser.email ?? undefined,
    })
      .catch((err) => {
        console.warn("Investor session hydration failed:", err);
      })
      .finally(() => {
        if (!cancelled) setSessionReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    currentUser,
    userData,
    isLoggedIn,
    role,
    investor.isRegistered,
    registerInvestor,
  ]);

  const isInvestorRegistered =
    sessionReady && !authLoading && isLoggedIn && role === "investor" && investor.isRegistered;

  return { sessionReady: sessionReady && !authLoading, isInvestorRegistered, investor };
}
