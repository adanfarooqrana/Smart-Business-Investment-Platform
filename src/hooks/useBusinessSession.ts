import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppState, type BusinessProfile } from "@/hooks/useAppState";
import { getBusinessProfile } from "@/services/firebaseService";
import { ref, get } from "firebase/database";
import { database } from "@/firebase";
import { RTDB } from "@/lib/rtdbPaths";

type RegisterBusiness = (profile: Partial<BusinessProfile>) => void;

/** Load business profile from RTDB into useAppState. */
export async function hydrateBusinessFromRtdb(
  uid: string,
  registerBusiness: RegisterBusiness,
  fallback?: { name?: string; email?: string; password?: string },
): Promise<void> {
  const [biz, userSnap] = await Promise.all([
    getBusinessProfile(uid).catch(() => null),
    get(ref(database, RTDB.users(uid))).catch(() => null),
  ]);

  const userVal = userSnap?.exists() ? (userSnap.val() as Record<string, unknown>) : null;
  const b = (biz ?? {}) as Record<string, unknown>;

  if (biz || userVal) {
    registerBusiness({
      uid,
      name: String(b.name ?? userVal?.name ?? fallback?.name ?? ""),
      email: String(b.email ?? userVal?.email ?? fallback?.email ?? ""),
      phone: String(b.phone ?? userVal?.phone ?? ""),
      password: fallback?.password,
      category: String(b.category ?? ""),
      subcategory: String(b.subcategory ?? ""),
      location: String(b.location ?? ""),
      size: String(b.size ?? ""),
      website: String(b.website ?? ""),
      about: String(b.about ?? b.landingPageAbout ?? ""),
      registerNumber: String(b.registerNumber ?? ""),
      trademark: String(b.trademark ?? ""),
      score: Number(b.score ?? 75),
      visitors: Number(b.visitors ?? 0),
      profileCompletion: Number(b.profileCompletion ?? 75),
      landingPageCreated: Boolean(b.landingPageCreated),
      landingPageTemplate: String(b.landingPageTemplate ?? ""),
      landingPageAbout: String(b.landingPageAbout ?? ""),
      isRegistered: true,
      isApproved: Boolean(b.isApproved ?? true),
    });
    return;
  }

  if (fallback?.email) {
    registerBusiness({
      uid,
      name: fallback.name ?? fallback.email.split("@")[0],
      email: fallback.email,
      password: fallback.password,
      phone: "",
      category: "",
      subcategory: "",
      location: "",
      size: "",
      website: "",
      about: "",
      registerNumber: "",
      trademark: "",
      isRegistered: true,
      isApproved: true,
    });
  }
}

export function useBusinessSession() {
  const { currentUser, userData, loading: authLoading } = useAuth();
  const { business, isLoggedIn, role, registerBusiness } = useAppState();
  const [sessionReady, setSessionReady] = useState(false);
  const hydratedUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      setSessionReady(false);
      return;
    }

    const isBusinessRole = role === "business" || userData?.role === "business_owner";

    if (!isBusinessRole) {
      setSessionReady(true);
      return;
    }

    if (business.isRegistered && isLoggedIn && role === "business") {
      setSessionReady(true);
      return;
    }

    const uid = currentUser?.uid ?? business.uid;
    if (!uid) {
      setSessionReady(true);
      return;
    }

    if (hydratedUidRef.current === uid && business.isRegistered) {
      setSessionReady(true);
      return;
    }

    hydratedUidRef.current = uid;
    let cancelled = false;

    hydrateBusinessFromRtdb(uid, registerBusiness, {
      name: userData?.name ?? business.name,
      email: userData?.email ?? business.email ?? currentUser?.email ?? undefined,
    })
      .catch((err) => console.warn("Business session hydration failed:", err))
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
    business.isRegistered,
    business.uid,
    business.name,
    business.email,
    registerBusiness,
  ]);

  const isBusinessRegistered =
    sessionReady && !authLoading && isLoggedIn && role === "business" && business.isRegistered;

  return { sessionReady: sessionReady && !authLoading, isBusinessRegistered, business };
}
