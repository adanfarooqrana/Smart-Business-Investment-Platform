import { doc, getDoc } from "firebase/firestore";
import { get, ref } from "firebase/database";
import { firestore, database } from "@/firebase";
import type { CommunityUserRole } from "@/components/founder/FounderCommunityLounge";

export type ResolvedCommunityIdentity = {
  communityRole: CommunityUserRole;
  firestoreRole: string | null;
  displayName: string;
  businessName?: string;
  authorPhoto?: string;
  canPost: boolean;
  isWorkspaceAccount: boolean;
};

const WORKSPACE_FIRESTORE_ROLES = new Set([
  "business_owner",
  "founder",
  "entrepreneur",
  "investor",
]);

function mapFirestoreRoleToCommunity(role: string | null | undefined): CommunityUserRole | null {
  const r = String(role || "").trim().toLowerCase();
  if (r === "business_owner" || r === "business") return "business";
  if (r === "founder" || r === "entrepreneur") return "entrepreneur";
  if (r === "investor") return "investor";
  if (r === "wholesaler" || r === "consultant") return "wholesaler";
  if (r === "community_member") return "community_member";
  return null;
}

/**
 * Resolve the true community authority for the signed-in user.
 * Priority: Firestore users/{uid}.role → RTDB workspace profiles → community_member → guest.
 * Never lets a leftover localStorage community session downgrade a workspace account.
 */
export async function resolveCommunityIdentity(opts: {
  uid: string | null | undefined;
  authRole?: string | null;
  appRole?: string | null;
  fallbackName?: string;
  photoURL?: string | null;
}): Promise<ResolvedCommunityIdentity> {
  const uid = String(opts.uid || "").trim();
  const fallbackName = String(opts.fallbackName || "").trim() || "Member";

  if (!uid) {
    return {
      communityRole: "guest",
      firestoreRole: null,
      displayName: fallbackName,
      canPost: false,
      isWorkspaceAccount: false,
    };
  }

  let firestoreRole: string | null = null;
  let displayName = fallbackName;
  let businessName: string | undefined;
  let authorPhoto = String(opts.photoURL || "").trim() || undefined;

  // 1) Canonical Firestore users/{uid}
  try {
    const snap = await getDoc(doc(firestore, "users", uid));
    if (snap.exists()) {
      const data = snap.data() as Record<string, unknown>;
      firestoreRole = String(data.role ?? "").trim() || null;
      displayName =
        String(data.fullName ?? data.name ?? data.displayName ?? "").trim() || displayName;
      businessName = String(data.businessName ?? "").trim() || undefined;
      authorPhoto =
        String(data.photoURL ?? data.avatarUrl ?? data.logoUrl ?? "").trim() || authorPhoto;
    }
  } catch (err) {
    console.warn("resolveCommunityIdentity Firestore users read failed:", err);
  }

  // 2) RTDB workspace profiles (authoritative for BO / founder / investor)
  let rtdbWorkspaceRole: CommunityUserRole | null = null;
  try {
    const [ownerSnap, founderSnap, investorSnap, usersSnap] = await Promise.all([
      get(ref(database, `business_owners/${uid}/profile`)),
      get(ref(database, `founders/${uid}/profile`)),
      get(ref(database, `investors/${uid}/profile`)),
      get(ref(database, `users/${uid}`)),
    ]);

    if (ownerSnap.exists() || String(usersSnap.val()?.role || "") === "business_owner") {
      rtdbWorkspaceRole = "business";
      const profile = (ownerSnap.exists() ? ownerSnap.val() : {}) as Record<string, unknown>;
      const usersVal = (usersSnap.exists() ? usersSnap.val() : {}) as Record<string, unknown>;
      businessName =
        String(profile.businessName ?? profile.storeName ?? usersVal.businessName ?? "").trim() ||
        businessName;
      displayName =
        String(profile.fullName ?? profile.name ?? usersVal.name ?? usersVal.fullName ?? "").trim() ||
        businessName ||
        displayName;
      if (!firestoreRole) firestoreRole = "business_owner";
    } else if (founderSnap.exists()) {
      rtdbWorkspaceRole = "entrepreneur";
      const profile = founderSnap.val() as Record<string, unknown>;
      displayName =
        String(profile.fullName ?? profile.name ?? "").trim() || displayName;
      if (!firestoreRole) firestoreRole = "founder";
    } else if (investorSnap.exists()) {
      rtdbWorkspaceRole = "investor";
      const profile = investorSnap.val() as Record<string, unknown>;
      displayName =
        String(profile.fullName ?? profile.name ?? "").trim() || displayName;
      if (!firestoreRole) firestoreRole = "investor";
    }
  } catch (err) {
    console.warn("resolveCommunityIdentity RTDB read failed:", err);
  }

  // AuthContext / app state hints (workspace first)
  // Founder Suite uses app role "entrepreneur" and auth role "founder"
  const hintRole =
    mapFirestoreRoleToCommunity(opts.authRole) ||
    mapFirestoreRoleToCommunity(
      opts.appRole === "business"
        ? "business_owner"
        : opts.appRole === "entrepreneur"
          ? "founder"
          : opts.appRole,
    );

  const fromFirestore = mapFirestoreRoleToCommunity(firestoreRole);
  const workspaceHint =
    hintRole === "business" || hintRole === "entrepreneur" || hintRole === "investor"
      ? hintRole
      : null;

  let communityRole: CommunityUserRole =
    rtdbWorkspaceRole ||
    (fromFirestore && fromFirestore !== "community_member" && fromFirestore !== "guest"
      ? fromFirestore
      : null) ||
    workspaceHint ||
    fromFirestore ||
    "community_member";

  if (communityRole === "guest") communityRole = "community_member";

  const isWorkspaceAccount =
    communityRole === "business" ||
    communityRole === "entrepreneur" ||
    communityRole === "investor" ||
    WORKSPACE_FIRESTORE_ROLES.has(String(firestoreRole || "").toLowerCase());

  // Clear stale guest community session so it cannot downgrade workspace users.
  // Read-only: never writes to Firestore / RTDB profile docs.
  if (isWorkspaceAccount && typeof window !== "undefined") {
    try {
      localStorage.removeItem("smartbiz_community_session");
    } catch {
      /* ignore */
    }
  }

  const canPost =
    isWorkspaceAccount &&
    (communityRole === "business" ||
      communityRole === "entrepreneur" ||
      communityRole === "investor");

  return {
    communityRole,
    firestoreRole,
    displayName: displayName || "Member",
    businessName,
    authorPhoto,
    canPost,
    isWorkspaceAccount,
  };
}
