import { redirect } from "@tanstack/react-router";

export type AppRole =
  | "entrepreneur"
  | "investor"
  | "consultant"
  | "business"
  | "guest"
  | "community_member";

type StoredAppState = {
  role?: string;
  isLoggedIn?: boolean;
  entrepreneur?: { isRegistered?: boolean; uid?: string };
  investor?: { isRegistered?: boolean };
  consultant?: { isRegistered?: boolean };
  business?: { isRegistered?: boolean };
};

export function readStoredAppState(): StoredAppState {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem("smartbiz_app_state_v2");
    if (saved) return JSON.parse(saved) as StoredAppState;
  } catch {
    /* ignore */
  }
  return {};
}

export function isLoggedIn(state: StoredAppState = readStoredAppState()): boolean {
  return !!state.isLoggedIn;
}

export function currentRole(state: StoredAppState = readStoredAppState()): AppRole {
  return (state.role as AppRole) || "guest";
}

/** True when app state indicates a verified workspace account (not a guest joiner). */
export function hasWorkspaceAppSession(state: StoredAppState = readStoredAppState()): boolean {
  if (!state.isLoggedIn) return false;
  const r = state.role;
  return (
    r === "business" ||
    r === "entrepreneur" ||
    r === "investor" ||
    r === "consultant"
  );
}

/**
 * Community-member (landing Join Community) session only.
 * Never returns true for an active workspace Dashboard session — leftover
 * `smartbiz_community_session` must not downgrade Business Owners / Founders / Investors.
 */
export function isCommunityMemberSession(): boolean {
  if (typeof window === "undefined") return false;
  if (hasWorkspaceAppSession()) return false;
  try {
    const raw = localStorage.getItem("smartbiz_community_session");
    if (raw) {
      const s = JSON.parse(raw) as { role?: string };
      if (s?.role === "community_member") return true;
    }
  } catch {
    /* ignore */
  }
  return currentRole() === "community_member";
}

/** Block community_member (landing joiners) from workspace dashboards. */
export function blockCommunityMemberFromWorkspace(): void {
  if (hasWorkspaceAppSession()) return;
  if (isCommunityMemberSession()) {
    throw redirect({ to: "/" });
  }
}

export function isEntrepreneurSession(state: StoredAppState = readStoredAppState()): boolean {
  return (
    !!state.isLoggedIn &&
    state.role === "entrepreneur" &&
    (!!state.entrepreneur?.isRegistered || !!state.entrepreneur?.uid)
  );
}

export function isInvestorSession(state: StoredAppState = readStoredAppState()): boolean {
  return (
    !!state.isLoggedIn &&
    state.role === "investor" &&
    (state.investor?.isRegistered ?? true)
  );
}

export function isBusinessSession(state: StoredAppState = readStoredAppState()): boolean {
  return (
    !!state.isLoggedIn &&
    state.role === "business" &&
    (state.business?.isRegistered ?? true)
  );
}

export function isConsultantSession(state: StoredAppState = readStoredAppState()): boolean {
  return (
    !!state.isLoggedIn &&
    state.role === "consultant" &&
    (state.consultant?.isRegistered ?? true)
  );
}

export function requireAuth(redirectTo = "/app/login"): void {
  if (!isLoggedIn()) {
    throw redirect({ to: redirectTo });
  }
}

export function requireRole(roles: AppRole[], redirectTo = "/app/login"): void {
  const state = readStoredAppState();
  if (!isLoggedIn(state) || !roles.includes(currentRole(state))) {
    throw redirect({ to: redirectTo });
  }
}
