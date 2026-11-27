import type { User } from "firebase/auth";

export const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:8000").replace(/\/$/, "");

export async function backendRequest(user: User, endpoint: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", "Bearer " + await user.getIdToken());
  let response: Response;
  try {
    response = await fetch(backendUrl + endpoint, { ...options, headers });
  } catch {
    throw new Error("Cannot reach the InvestBiz backend on port 8000.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(typeof body?.detail === "string" ? body.detail : "InvestBiz backend request failed.");
  }
  return response;
}


/** Public product, listing or community assets only. KYC uses its private verification endpoint. */
export async function uploadPublicAsset(user: User, file: Blob, name: string): Promise<string> {
  const form = new FormData();
  form.append("file", file, name);
  const response = await backendRequest(user, "/api/uploads", { method: "POST", body: form });
  const result = await response.json();
  if (typeof result.url !== "string") throw new Error("Upload did not return a URL.");
  return result.url;
}
