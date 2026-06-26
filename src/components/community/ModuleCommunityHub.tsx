import { useAuth } from "@/contexts/AuthContext";
import { useAppState, type Role } from "@/hooks/useAppState";
import { FounderCommunityLounge } from "@/components/founder/FounderCommunityLounge";
import { CommunityErrorBoundary } from "@/components/founder/CommunityErrorBoundary";
import type { CommunityUserRole } from "@/components/founder/FounderCommunityLounge";

function mapAppRole(role: Role): CommunityUserRole {
  if (role === "consultant") return "wholesaler";
  if (role === "business") return "business";
  if (role === "investor") return "investor";
  return "entrepreneur";
}

type Props = {
  onClose: () => void;
  embedded?: boolean;
  /** Override display name when local profile name is empty */
  fallbackName?: string;
};

export function ModuleCommunityHub({ onClose, embedded = true, fallbackName }: Props) {
  return (
    <CommunityErrorBoundary onReset={onClose}>
      <ModuleCommunityHubInner onClose={onClose} embedded={embedded} fallbackName={fallbackName} />
    </CommunityErrorBoundary>
  );
}

function ModuleCommunityHubInner({ onClose, embedded = true, fallbackName }: Props) {
  const { currentUser, userData } = useAuth();
  const { role, business, investor, consultant, entrepreneur } = useAppState();

  const displayName =
    fallbackName ||
    investor?.name ||
    consultant?.name ||
    business?.name ||
    entrepreneur?.name ||
    userData?.name ||
    currentUser?.email?.split("@")[0] ||
    "Member";

  const userId = currentUser?.uid || `local-${role || "guest"}`;
  const username = `u/${String(displayName).toLowerCase().replace(/\s+/g, "_")}`;

  const communityRole: CommunityUserRole =
    investor?.isRegistered || role === "investor" || userData?.role === "investor"
      ? "investor"
      : mapAppRole(role);

  return (
    <FounderCommunityLounge
      founderId={userId}
      founderUsername={username}
      displayName={displayName}
      userRole={communityRole}
      isOpen
      embedded={embedded}
      onClose={onClose}
      onViewProfile={() => {
        /* profile drawer can be added per module later */
      }}
    />
  );
}
