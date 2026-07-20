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
  const [biz, userSnap, ownerProfileSnap] = await Promise.all([
    getBusinessProfile(uid).catch(() => null),
    get(ref(database, RTDB.users(uid))).catch(() => null),
    get(ref(database, `business_owners/${uid}/profile`)).catch(() => null),
  ]);

  const userVal = userSnap?.exists() ? (userSnap.val() as Record<string, unknown>) : null;
  const b = (biz ?? {}) as Record<string, unknown>;
  const ownerProfile = ownerProfileSnap?.exists()
    ? (ownerProfileSnap.val() as Record<string, unknown>)
    : null;

  const resolvedName =
    String(
      ownerProfile?.businessName ||
        ownerProfile?.fullName ||
        ownerProfile?.storeName ||
        b.businessName ||
        b.name ||
        userVal?.businessName ||
        userVal?.fullName ||
        userVal?.name ||
        fallback?.name ||
        "",
    ).trim() || "My Business Store";

  const resolvedEmail = String(
    b.email ?? userVal?.email ?? fallback?.email ?? "",
  ).trim();

  if (biz || userVal || ownerProfile) {
    registerBusiness({
      uid,
      name: resolvedName,
      email: resolvedEmail,
      phone: String(
        b.phone ?? userVal?.phone ?? userVal?.phoneNumber ?? ownerProfile?.phone ?? "",
      ),
      password: fallback?.password,
      category: String(
        b.category ?? ownerProfile?.coreCategory ?? ownerProfile?.category ?? "",
      ),
      subcategory: String(b.subcategory ?? ownerProfile?.subcategory ?? ""),
      location: String(
        b.location ?? ownerProfile?.operationalLocation ?? ownerProfile?.location ?? "",
      ),
      size: String(b.size ?? ownerProfile?.teamSize ?? ""),
      website: String(b.website ?? ""),
      about: String(
        b.about ?? b.landingPageAbout ?? ownerProfile?.pitch ?? "",
      ),
      registerNumber: String(b.registerNumber ?? ownerProfile?.registerNumber ?? ""),
      trademark: String(b.trademark ?? ownerProfile?.trademarkNumber ?? ownerProfile?.trademark ?? ""),
      score: Number(b.score ?? 75),
      visitors: Number(b.visitors ?? 0),
      profileCompletion: Number(b.profileCompletion ?? 75),
      landingPageCreated: Boolean(b.landingPageCreated),
      landingPageTemplate: String(b.landingPageTemplate ?? ""),
      landingPageAbout: String(b.landingPageAbout ?? ownerProfile?.pitch ?? ""),
      isRegistered: true,
      isApproved: Boolean(b.isApproved ?? true),
    });
    return;
  }

  if (fallback?.email) {
    registerBusiness({
      uid,
      name: resolvedName,
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
      const emailPrefix = String(business.email || "")
        .split("@")[0]
        .trim();
      const storedName = String(business.name || "").trim();
      const nameLooksBroken =
        !storedName ||
        storedName === emailPrefix ||
        /^\d+$/.test(storedName);

      if (!nameLooksBroken) {
        setSessionReady(true);
        return;
      }
      // Fall through — re-hydrate from business_owners/{uid}/profile
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
      name: String(userData?.businessName ?? userData?.name ?? business.name ?? "").trim(),
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
