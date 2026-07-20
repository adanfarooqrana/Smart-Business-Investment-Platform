import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppState, type EntrepreneurLocalProfile } from "@/hooks/useAppState";
import {
  getFounderProfile,
  getFounderStats,
  verifyFounderSession,
} from "@/services/founderFirebaseService";

type RegisterEntrepreneur = (profile: Partial<EntrepreneurLocalProfile>) => void;

/** Load founder profile from nested founders/{uid}/profile into useAppState. */
export async function hydrateEntrepreneurFromRtdb(
  uid: string,
  registerEntrepreneur: RegisterEntrepreneur,
  fallback?: { name?: string; email?: string; password?: string },
): Promise<void> {
  try {
    const profile = await getFounderProfile(uid);
    if (!profile) {
      throw new Error("Founder profile not found under founders/{uid}/profile.");
    }

    const stats = await getFounderStats(uid).catch(() => ({
      totalFundingRaised: 0,
      activeInvestorsCount: 0,
    }));

    registerEntrepreneur({
      uid,
      profileId: `FND-${uid.slice(0, 8).toUpperCase()}`,
      name: String(profile.fullName || fallback?.name || ""),
      email: String(profile.email || fallback?.email || ""),
      phone: String(profile.phone || ""),
      password: fallback?.password,
      paymentType: "bank",
      bankAccountNumber: profile.bankDetails?.iban,
      isRegistered: true,
      isApproved: profile.status === "approved",
      metrics: {
        investorsViewedIdea: 0,
        activeSampleRequests: 0,
        unreadMessagesCount: 0,
        totalFundingRaised: stats.totalFundingRaised,
        activeInvestorsCount: stats.activeInvestorsCount,
      } as any,
    });
  } catch (error) {
    console.error("hydrateEntrepreneurFromRtdb failed:", error);
    throw error;
  }
}

/**
 * Ensures Firebase-authenticated founders have local profile state loaded
 * from founders/{uid}/profile so the dashboard mounts cleanly.
 * Does not wipe an already-hydrated session on transient auth flickers.
 */
export function useFounderSession() {
  const { currentUser, userData, loading: authLoading } = useAuth();
  const { entrepreneur, isLoggedIn, role, registerEntrepreneur } = useAppState();
  const [sessionReady, setSessionReady] = useState(false);
  const hydratedUidRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      // While auth is resolving, keep ready=true if we already hydrated this founder
      if (authLoading) {
        if (!(hydratedUidRef.current && entrepreneur?.isRegistered)) {
          setSessionReady(false);
        }
        return;
      }

      const isFounderRole =
        role === "entrepreneur" ||
        userData?.role === "founder" ||
        userData?.role === "entrepreneur";

      if (!isFounderRole) {
        setSessionReady(true);
        return;
      }

      if (
        entrepreneur?.isRegistered &&
        entrepreneur?.uid &&
        (isLoggedIn || currentUser || hydratedUidRef.current === entrepreneur.uid) &&
        role === "entrepreneur"
      ) {
        hydratedUidRef.current = entrepreneur.uid;
        setSessionReady(true);
        return;
      }

      const uid = currentUser?.uid ?? entrepreneur?.uid ?? hydratedUidRef.current;
      if (!uid) {
        // Soft wait — don't declare "unregistered" during flicker without uid
        setSessionReady(true);
        return;
      }

      if (hydratedUidRef.current === uid && entrepreneur?.isRegistered) {
        setSessionReady(true);
        return;
      }

      hydratedUidRef.current = uid;
      let cancelled = false;

      verifyFounderSession(uid)
        .then(() =>
          hydrateEntrepreneurFromRtdb(uid, registerEntrepreneur, {
            name: userData?.name ?? entrepreneur?.name,
            email: userData?.email ?? entrepreneur?.email ?? currentUser?.email ?? undefined,
            password: entrepreneur?.password,
          }),
        )
        .catch((err) => {
          console.warn("Founder session hydration failed:", err);
          // Keep prior local entrepreneur registration if hydrate fails mid-session
        })
        .finally(() => {
          if (!cancelled) setSessionReady(true);
        });

      return () => {
        cancelled = true;
      };
    } catch (error) {
      console.error("useFounderSession effect error:", error);
      setSessionReady(true);
    }
  }, [
    authLoading,
    currentUser,
    userData,
    isLoggedIn,
    role,
    entrepreneur?.isRegistered,
    entrepreneur?.uid,
    entrepreneur?.name,
    entrepreneur?.email,
    registerEntrepreneur,
  ]);

  const hasCachedFounder =
    !!hydratedUidRef.current ||
    !!entrepreneur?.uid ||
    !!entrepreneur?.isRegistered ||
    !!currentUser?.uid;

  const isFounderRegistered =
    sessionReady &&
    (isLoggedIn || !!currentUser || hasCachedFounder) &&
    (role === "entrepreneur" ||
      userData?.role === "founder" ||
      userData?.role === "entrepreneur" ||
      !!entrepreneur?.isRegistered) &&
    (entrepreneur?.isRegistered || !!entrepreneur?.uid || !!currentUser?.uid);

  return {
    sessionReady: sessionReady && (!authLoading || hasCachedFounder),
    isFounderRegistered,
    entrepreneur,
  };
}
