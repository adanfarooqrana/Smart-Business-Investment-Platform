import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppState, type EntrepreneurLocalProfile } from "@/hooks/useAppState";
import { getEntrepreneurRtdbProfile } from "@/services/firebaseService";
import { getEntrepreneurProfile } from "@/services/entrepreneurService";

type RegisterEntrepreneur = (profile: Partial<EntrepreneurLocalProfile>) => void;

/** Load founder profile from RTDB / Firestore into useAppState (localStorage). */
export async function hydrateEntrepreneurFromRtdb(
  uid: string,
  registerEntrepreneur: RegisterEntrepreneur,
  fallback?: { name?: string; email?: string; password?: string },
): Promise<void> {
  const rtdb = await getEntrepreneurRtdbProfile(uid).catch(() => null);
  const firestore = await getEntrepreneurProfile(uid).catch(() => null);
  const profile = rtdb ?? firestore;

  if (profile) {
    const p = profile as Record<string, unknown>;
    registerEntrepreneur({
      uid,
      profileId: String(p.profileId ?? `ENT-${uid.slice(0, 8).toUpperCase()}`),
      name: String(p.fullName ?? p.name ?? fallback?.name ?? ""),
      email: String(p.email ?? fallback?.email ?? ""),
      phone: String(p.phone ?? ""),
      password: fallback?.password,
      cnicFrontUrl: (p.cnicFrontUrl as string) ?? (p.cnicFront as string),
      paymentType: (p.paymentType as EntrepreneurLocalProfile["paymentType"]) ?? "bank",
      bankAccountNumber: p.bankAccountNumber as string | undefined,
      mobileWalletNumber: p.mobileWalletNumber as string | undefined,
      isRegistered: true,
      isApproved: Boolean(p.isApproved ?? p.isVerified ?? true),
      metrics: (p.metrics as EntrepreneurLocalProfile["metrics"]) ?? {
        investorsViewedIdea: 0,
        activeSampleRequests: 0,
        unreadMessagesCount: 0,
      },
    });
    return;
  }

  registerEntrepreneur({
    uid,
    profileId: `ENT-${uid.slice(0, 8).toUpperCase()}`,
    name: fallback?.name ?? fallback?.email?.split("@")[0] ?? "Founder",
    email: fallback?.email ?? "",
    password: fallback?.password,
    phone: "",
    isRegistered: true,
    isApproved: true,
    metrics: {
      investorsViewedIdea: 0,
      activeSampleRequests: 0,
      unreadMessagesCount: 0,
    },
  });
}

/**
 * Ensures Firebase-authenticated founders have local profile state loaded
 * so the dashboard does not error or bounce after login.
 */
export function useFounderSession() {
  const { currentUser, userData, loading: authLoading } = useAuth();
  const { entrepreneur, isLoggedIn, role, registerEntrepreneur } = useAppState();
  const [sessionReady, setSessionReady] = useState(false);
  const hydratedUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      setSessionReady(false);
      return;
    }

    const isFounderRole =
      role === "entrepreneur" || userData?.role === "entrepreneur";

    if (!isFounderRole) {
      setSessionReady(true);
      return;
    }

    if (entrepreneur?.isRegistered && entrepreneur?.uid && (isLoggedIn || currentUser) && role === "entrepreneur") {
      setSessionReady(true);
      return;
    }

    const uid = currentUser?.uid ?? entrepreneur?.uid;
    if (!uid) {
      setSessionReady(true);
      return;
    }

    const isFounderByAuth =
      userData?.role === "entrepreneur" || role === "entrepreneur";

    if (!isFounderByAuth && !entrepreneur?.isRegistered) {
      setSessionReady(true);
      return;
    }

    if (hydratedUidRef.current === uid && entrepreneur?.isRegistered) {
      setSessionReady(true);
      return;
    }

    hydratedUidRef.current = uid;
    let cancelled = false;

    hydrateEntrepreneurFromRtdb(uid, registerEntrepreneur, {
      name: userData?.name ?? entrepreneur?.name,
      email: userData?.email ?? entrepreneur?.email ?? currentUser?.email ?? undefined,
      password: entrepreneur?.password,
    })
      .catch((err) => {
        console.warn("Founder session hydration failed:", err);
        registerEntrepreneur({
          uid,
          profileId: `ENT-${uid.slice(0, 8).toUpperCase()}`,
          name: userData?.name ?? entrepreneur?.name ?? currentUser?.email?.split("@")[0] ?? "Founder",
          email: userData?.email ?? entrepreneur?.email ?? currentUser?.email ?? "",
          isRegistered: true,
          isApproved: true,
        });
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
    entrepreneur?.isRegistered,
    entrepreneur?.uid,
    entrepreneur?.name,
    entrepreneur?.email,
    registerEntrepreneur,
  ]);

  const isFounderRegistered =
    sessionReady &&
    !authLoading &&
    (isLoggedIn || !!currentUser) &&
    (role === "entrepreneur" || userData?.role === "entrepreneur") &&
    (entrepreneur?.isRegistered || !!entrepreneur?.uid || !!currentUser?.uid);

  return { sessionReady: sessionReady && !authLoading, isFounderRegistered, entrepreneur };
}
