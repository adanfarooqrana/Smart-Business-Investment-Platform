/** Community entry channel — separates Landing (public) from Dashboard (workspace). */

export type CommunityEntry = "public" | "workspace";

export const COMMUNITY_ENTRY_KEY = "smartbiz_community_entry";

export function parseCommunityEntry(raw: unknown): CommunityEntry {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "workspace" || v === "dashboard") return "workspace";
  if (v === "public" || v === "landing" || v === "guest") return "public";
  return "public";
}

export function persistCommunityEntry(entry: CommunityEntry) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(COMMUNITY_ENTRY_KEY, entry);
  } catch {
    /* ignore */
  }
}

export function readPersistedCommunityEntry(): CommunityEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(COMMUNITY_ENTRY_KEY);
    if (v === "workspace" || v === "public") return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function clearPersistedCommunityEntry() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(COMMUNITY_ENTRY_KEY);
  } catch {
    /* ignore */
  }
}
