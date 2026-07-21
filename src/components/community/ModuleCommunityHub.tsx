import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppState, type Role } from "@/hooks/useAppState";
import { FounderCommunityLounge } from "@/components/founder/FounderCommunityLounge";
import { CommunityErrorBoundary } from "@/components/founder/CommunityErrorBoundary";
import type { CommunityUserRole } from "@/components/founder/FounderCommunityLounge";
import {
  resolveCommunityIdentity,
  type ResolvedCommunityIdentity,
} from "@/lib/resolveCommunityIdentity";
import type { CommunityEntry } from "@/lib/communityEntry";
import { DEFAULT_AUTHOR_AVATAR } from "@/services/communityFirestoreService";

function mapAppRole(role: Role | undefined, authRole?: string | null): CommunityUserRole {
  if (authRole === "business_owner" || role === "business") return "business";
  if (authRole === "founder" || authRole === "entrepreneur" || role === "entrepreneur") {
    return "entrepreneur";
  }
  if (authRole === "investor" || role === "investor") return "investor";
  if (authRole === "wholesaler" || role === "consultant") return "wholesaler";
  if (authRole === "community_member" || String(role || "") === "community_member") {
    return "community_member";
  }
  return "guest";
}

type Props = {
  onClose: () => void;
  embedded?: boolean;
  fallbackName?: string;
  backLabel?: string;
  /** public = Landing Join Community; workspace = Dashboard */
  entry?: CommunityEntry;
};

export function ModuleCommunityHub({
  onClose,
  embedded = true,
  fallbackName,
  backLabel,
  entry = "public",
}: Props) {
  return (
    <CommunityErrorBoundary onReset={onClose}>
      <ModuleCommunityHubInner
        onClose={onClose}
        embedded={embedded}
        fallbackName={fallbackName}
        backLabel={backLabel}
        entry={entry}
      />
    </CommunityErrorBoundary>
  );
}

function ModuleCommunityHubInner({
  onClose,
  embedded = true,
  fallbackName,
  backLabel,
  entry = "public",
}: Props) {
  const { currentUser, userData } = useAuth();
  const { role, isLoggedIn, business, investor, consultant, entrepreneur } = useAppState();
  const [identity, setIdentity] = useState<ResolvedCommunityIdentity | null>(null);

  const ownerPersonalName =
    String(userData?.fullName ?? "").trim() ||
    String(userData?.name ?? "").trim() ||
    String(business?.name ?? "").trim() ||
    "Business Owner";

  const businessStoreName =
    String((userData as { businessName?: string } | null)?.businessName ?? "").trim() ||
    String(business?.name ?? "").trim() ||
    "";

  const hintDisplayName =
    String(
      fallbackName ||
        (role === "entrepreneur" || userData?.role === "founder" || userData?.role === "entrepreneur"
          ? entrepreneur?.name || userData?.name
          : undefined) ||
        (role === "business" || userData?.role === "business_owner" ? ownerPersonalName : undefined) ||
        investor?.name ||
        consultant?.name ||
        userData?.name ||
        currentUser?.displayName ||
        currentUser?.email?.split("@")[0] ||
        "Member",
    ).trim() || "Member";

  const hintPhoto =
    String(currentUser?.photoURL || "").trim() ||
    String((userData as { avatarUrl?: string; photoURL?: string; logoUrl?: string } | null)?.avatarUrl || "").trim() ||
    String((userData as { photoURL?: string } | null)?.photoURL || "").trim() ||
    String((userData as { logoUrl?: string } | null)?.logoUrl || "").trim() ||
    (business?.liveSelfie && String(business.liveSelfie).startsWith("http")
      ? String(business.liveSelfie)
      : "") ||
    DEFAULT_AUTHOR_AVATAR;

  useEffect(() => {
    let cancelled = false;
    const uid = currentUser?.uid;

    if (!uid && !isLoggedIn) {
      setIdentity({
        communityRole: "guest",
        firestoreRole: null,
        displayName: hintDisplayName,
        canPost: false,
        isWorkspaceAccount: false,
      });
      return;
    }

    void (async () => {
      const resolved = await resolveCommunityIdentity({
        uid: uid || null,
        authRole: userData?.role,
        appRole: role,
        fallbackName: hintDisplayName,
        photoURL: hintPhoto,
      });
      if (!cancelled) setIdentity(resolved);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid, userData?.role, role, isLoggedIn, entry]);

  const rawRole: CommunityUserRole =
    identity?.communityRole ||
    (!currentUser && !isLoggedIn ? "guest" : mapAppRole(role, userData?.role));

  const isWorkspaceIdentity =
    identity?.isWorkspaceAccount ||
    rawRole === "business" ||
    rawRole === "entrepreneur" ||
    rawRole === "investor";

  /**
   * Landing (`entry=public`): never show Business Owner / Founder posting chrome.
   * Downgrade visual role to community_member so Create Post stays hidden.
   */
  const communityRole: CommunityUserRole =
    entry === "public" && isWorkspaceIdentity ? "community_member" : rawRole;

  const displayName = identity?.displayName || hintDisplayName;
  const authorPhoto = identity?.authorPhoto || hintPhoto;
  const storeName = identity?.businessName || businessStoreName;

  const userId = currentUser?.uid || `local-${role || "guest"}`;
  const username = `u/${displayName.toLowerCase().replace(/\s+/g, "_") || "member"}`;

  const isWorkspaceView = entry === "workspace" && isWorkspaceIdentity;

  const resolvedBack =
    backLabel || (isWorkspaceView ? "← Back to Dashboard" : "← Back to Home");

  return (
    <FounderCommunityLounge
      founderId={userId}
      founderUsername={username}
      displayName={displayName}
      businessName={
        entry === "workspace" && rawRole === "business" ? storeName || undefined : undefined
      }
      ownerName={rawRole === "business" ? ownerPersonalName : displayName}
      authorPhoto={authorPhoto}
      userRole={communityRole}
      backLabel={resolvedBack}
      entry={entry}
      isOpen
      embedded={embedded}
      onClose={typeof onClose === "function" ? onClose : () => {}}
      onViewProfile={() => {}}
    />
  );
}
