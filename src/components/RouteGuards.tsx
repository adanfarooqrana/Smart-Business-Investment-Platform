import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAppState, type Role } from "@/hooks/useAppState";
import { useAuth, type UserRole } from "@/contexts/AuthContext";
import type { AppRole } from "@/lib/routeGuards";

function Redirecting() {
  return (
    <div className="flex h-[80vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
    </div>
  );
}

function mapFirebaseRoleToAppRole(firebaseRole: UserRole | string | undefined): Role {
  switch (firebaseRole) {
    case "entrepreneur":
      return "entrepreneur";
    case "investor":
      return "investor";
    case "wholesaler":
      return "consultant";
    case "business_owner":
      return "business";
    default:
      return "guest";
  }
}

/**
 * Keeps Firebase Auth (`currentUser`) and useAppState (`isLoggedIn` / `role`) in sync.
 */
function useAuthSessionSync() {
  const { currentUser, userData, loading } = useAuth();
  const { isLoggedIn, role, logoutCommunityUser, setIsLoggedIn, setRole } = useAppState();

  useEffect(() => {
    if (loading) return;

    if (!currentUser && isLoggedIn) {
      logoutCommunityUser();
      return;
    }

    if (currentUser && !isLoggedIn) {
      setIsLoggedIn(true);
      if (userData?.role) {
        setRole(mapFirebaseRoleToAppRole(userData.role));
      }
    }
  }, [
    loading,
    currentUser,
    isLoggedIn,
    userData,
    logoutCommunityUser,
    setIsLoggedIn,
    setRole,
  ]);

  const inSync = !!currentUser === isLoggedIn;
  const ready = !loading && inSync;
  const authenticated = ready && !!currentUser && isLoggedIn;

  return { ready, authenticated, role };
}

/**
 * Renders `children` only when a user session is active. Otherwise redirects
 * to `redirectTo` (default `/app/login`).
 *
 *   <ProtectedRoute><Dashboard /></ProtectedRoute>
 */
export function ProtectedRoute({
  children,
  redirectTo = "/app/login",
}: {
  children: ReactNode;
  redirectTo?: string;
}) {
  const navigate = useNavigate();
  const { ready, authenticated } = useAuthSessionSync();

  useEffect(() => {
    if (ready && !authenticated) {
      navigate({ to: redirectTo });
    }
  }, [ready, authenticated, navigate, redirectTo]);

  if (!ready || !authenticated) return <Redirecting />;
  return <>{children}</>;
}

/**
 * Renders `children` only when the active session matches one of `allow`.
 * Redirects to `redirectTo` (default `/app/login`) otherwise.
 *
 *   <RoleBasedRoute allow={["investor"]}><InvestorDashboard /></RoleBasedRoute>
 */
export function RoleBasedRoute({
  children,
  allow,
  redirectTo = "/app/login",
}: {
  children: ReactNode;
  allow: AppRole[];
  redirectTo?: string;
}) {
  const navigate = useNavigate();
  const { ready, authenticated, role } = useAuthSessionSync();
  const permitted = authenticated && allow.includes(role as AppRole);

  useEffect(() => {
    if (ready && !permitted) {
      navigate({ to: redirectTo });
    }
  }, [ready, permitted, navigate, redirectTo]);

  if (!ready || !permitted) return <Redirecting />;
  return <>{children}</>;
}
