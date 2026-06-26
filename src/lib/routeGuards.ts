import { redirect } from "@tanstack/react-router";

export type AppRole =
  | "entrepreneur"
  | "investor"
  | "consultant"
  | "business"
  | "guest";

type StoredAppState = {
  role?: string;
  isLoggedIn?: boolean;
  entrepreneur?: { isRegistered?: boolean };
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

/**
 * Use inside a route's `beforeLoad` to require any logged-in session.
 * Redirects to `/app/login` when not authenticated.
 *
 *   beforeLoad: () => requireAuth(),
 */
export function requireAuth(redirectTo = "/app/login"): void {
  if (!isLoggedIn()) {
    throw redirect({ to: redirectTo });
  }
}

/**
 * Use inside a route's `beforeLoad` to require one of the given roles.
 * Redirects to `/app/login` when the session role does not match.
 *
 *   beforeLoad: () => requireRole(["investor"]),
 */
export function requireRole(roles: AppRole[], redirectTo = "/app/login"): void {
  const state = readStoredAppState();
  if (!isLoggedIn(state) || !roles.includes(currentRole(state))) {
    throw redirect({ to: redirectTo });
  }
}
