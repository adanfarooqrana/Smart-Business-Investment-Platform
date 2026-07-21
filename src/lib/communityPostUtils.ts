import type { CommunityComment, CommunityPost, PackagingQuote } from "@/hooks/useAppState";

/** Firebase RTDB may store comments as array or keyed object. */
export function normalizeComments(raw: unknown): CommunityComment[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as CommunityComment[];
  if (typeof raw === "object") {
    return Object.values(raw as Record<string, CommunityComment>).filter(Boolean);
  }
  return [];
}

/** Packaging quotes may be an array or a keyed map (e.g. `{ default: {...} }`). */
export function getPrimaryPackagingQuote(
  quotes: PackagingQuote[] | Record<string, PackagingQuote> | undefined,
): PackagingQuote | undefined {
  if (!quotes) return undefined;
  if (Array.isArray(quotes)) return quotes[0];
  const record = quotes as Record<string, PackagingQuote>;
  return record.default ?? Object.values(record)[0];
}

export function getPackagingQuotePrice(
  quotes: PackagingQuote[] | Record<string, PackagingQuote> | undefined,
): string {
  return getPrimaryPackagingQuote(quotes)?.price ?? "Contact for quote";
}

/** Founder → personal name. Business → "Business Name · Owner Name". */
export function formatPostAuthorLabel(
  post: Pick<CommunityPost, "role" | "author" | "authorName" | "businessName">,
): string {
  const person = (post.authorName || post.author || "Member").replace(/^u\//, "").replace(/_/g, " ");
  if (post.role === "business" && post.businessName?.trim()) {
    return `${post.businessName.trim()} · ${person}`;
  }
  return person;
}
