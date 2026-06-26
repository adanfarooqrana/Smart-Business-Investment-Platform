import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppState, type InvestorProfile } from "@/hooks/useAppState";
import { getInvestorProfile } from "@/services/firebaseService";

type RegisterInvestor = (profile: Partial<InvestorProfile>) => void;

/** Load investor profile from RTDB into useAppState (localStorage). */
export async function hydrateInvestorFromRtdb(
  uid: string,
  registerInvestor: RegisterInvestor,
  fallback?: { name?: string; email?: string; password?: string },
): Promise<void> {
  const profile = await getInvestorProfile(uid);

  if (profile) {
    registerInvestor({
      name: String(profile.name ?? fallback?.name ?? ""),
      email: String(profile.email ?? fallback?.email ?? ""),
      phone: String(profile.phone ?? ""),
      password: fallback?.password,
      categories: Array.isArray(profile.categories) ? profile.categories : [],
      ticketSize: String(profile.ticketSize ?? ""),
      budgetRange: (profile.budgetRange as InvestorProfile["budgetRange"]) ?? "",
      location: String(profile.location ?? ""),
      strategy: String(profile.strategy ?? ""),
      entityType: profile.entityType as InvestorProfile["entityType"],
      cnicFront: profile.cnicFront,
      cnicBack: profile.cnicBack,
      liveSelfie: profile.liveSelfie,
    });
    return;
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
