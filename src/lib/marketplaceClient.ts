import { auth } from "@/firebase";
import { backendRequest } from "@/lib/backendClient";

export async function marketplaceRequest<T>(path: string, method = "GET", data?: object): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in to continue.");
  const response = await backendRequest(user, "/api/marketplace/" + path, {
    method, ...(data ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) } : {}),
  });
  return response.json() as Promise<T>;
}
