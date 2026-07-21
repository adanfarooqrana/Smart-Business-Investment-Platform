import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  getDocs,
  getDoc,
  increment,
  type Unsubscribe,
  type Timestamp,
} from "firebase/firestore";
import { ref, set, update, remove } from "firebase/database";
import { firestore, database } from "@/firebase";
import { RTDB } from "@/lib/rtdbPaths";

export type FirestoreAuthorRole = "business_owner" | "founder" | "entrepreneur" | "investor";

export type FirestoreCommunityPost = {
  id: string;
  title: string;
  content: string;
  category: "General" | "Marketing Strategy" | "Packaging";
  authorUid: string;
  authorName: string;
  authorPhoto?: string;
  authorEmail?: string;
  businessName?: string;
  authorRole: FirestoreAuthorRole;
  badge: "Business Owner" | "Founder" | "Investor";
  proofAttachment?: string;
  likes: string[];
  shares: number;
  commentCount: number;
  isMarketingBlueprint?: boolean;
  isPackagingReq?: boolean;
  materialType?: string;
  packagingPrice?: string;
  createdAt: number;
};

export type FirestoreComment = {
  commentId: string;
  userId: string;
  userName: string;
  userEmail: string;
  commentText: string;
  createdAt: number;
};

const POSTS = "posts";

export const DEFAULT_AUTHOR_AVATAR =
  "https://ui-avatars.com/api/?name=Member&background=F59E0B&color=fff&size=128";

const WORKSPACE_ROLES = new Set<string>([
  "business_owner",
  "founder",
  "entrepreneur",
  "investor",
]);

function toMillis(value: unknown): number {
  if (!value) return Date.now();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "toMillis" in value) {
    try {
      return (value as Timestamp).toMillis();
    } catch {
      return Date.now();
    }
  }
  return Date.now();
}

/** Firestore may store likes as array OR keyed map — never crash. */
export function normalizeLikes(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x ?? "")).filter(Boolean);
  if (typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>)
      .filter(([, v]) => v === true || v === 1 || typeof v === "string")
      .map(([k, v]) => (typeof v === "string" && v.length > 0 ? v : k))
      .filter(Boolean);
  }
  return [];
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const key of Object.keys(out)) {
    if (out[key] === undefined) delete out[key];
  }
  return out;
}

function inferRole(data: Record<string, unknown>): FirestoreAuthorRole | null {
  const raw = String(data.authorRole ?? data.role ?? "").trim();
  if (WORKSPACE_ROLES.has(raw)) return raw as FirestoreAuthorRole;
  const badge = String(data.badge ?? "").toLowerCase();
  if (badge.includes("business")) return "business_owner";
  if (badge.includes("investor")) return "investor";
  if (badge.includes("founder")) return "founder";
  if (data.title || data.content) return "founder";
  return null;
}

function mapRtdbRole(authorRole: FirestoreAuthorRole): string {
  if (authorRole === "business_owner") return "business";
  if (authorRole === "investor") return "investor";
  return "entrepreneur";
}

function mapDoc(id: string, data: Record<string, unknown> | undefined): FirestoreCommunityPost | null {
  try {
    if (!id || !data || typeof data !== "object") return null;
    const authorRole = inferRole(data);
    if (!authorRole) return null;

    const authorName =
      String(data.authorName ?? data.displayName ?? data.businessName ?? "").trim() ||
      "Business Owner";

    return {
      id,
      title: String(data.title ?? ""),
      content: String(data.content ?? ""),
      category: (data.category as FirestoreCommunityPost["category"]) || "General",
      authorUid: String(data.authorUid ?? ""),
      authorName,
      authorPhoto: String(data.authorPhoto ?? data.photoURL ?? "").trim() || DEFAULT_AUTHOR_AVATAR,
      authorEmail: data.authorEmail ? String(data.authorEmail) : undefined,
      businessName: data.businessName ? String(data.businessName) : undefined,
      authorRole,
      badge: (data.badge as FirestoreCommunityPost["badge"]) || mapBadgeFromAuthorRole(authorRole),
      proofAttachment: data.proofAttachment ? String(data.proofAttachment) : undefined,
      likes: normalizeLikes(data.likes),
      shares: Number(data.shares ?? 0) || 0,
      commentCount: Number(data.commentCount ?? 0) || 0,
      isMarketingBlueprint: Boolean(data.isMarketingBlueprint),
      isPackagingReq: Boolean(data.isPackagingReq),
      materialType: data.materialType ? String(data.materialType) : undefined,
      packagingPrice: data.packagingPrice ? String(data.packagingPrice) : undefined,
      createdAt: toMillis(data.createdAt),
    };
  } catch (err) {
    console.warn("Skipping malformed community post:", id, err);
    return null;
  }
}

/** Mirror lounge posts into RTDB so Console / landing / stats also see them. */
async function mirrorPostToRtdb(
  postId: string,
  payload: Record<string, unknown>,
  likeCount = 0,
) {
  try {
    const authorRole = String(payload.authorRole || "founder") as FirestoreAuthorRole;
    await set(ref(database, RTDB.communityPost(postId)), {
      title: payload.title ?? "",
      content: payload.content ?? "",
      category: payload.category ?? "General",
      author: String(payload.authorName || "Business Owner"),
      authorName: payload.authorName ?? "",
      authorUid: payload.authorUid ?? null,
      authorEmail: payload.authorEmail ?? null,
      authorPhoto: payload.authorPhoto ?? null,
      businessName: payload.businessName ?? null,
      role: mapRtdbRole(authorRole),
      authorRole,
      badge: payload.badge ?? "Founder",
      proofAttachment: payload.proofAttachment ?? null,
      isMarketingBlueprint: Boolean(payload.isMarketingBlueprint),
      isPackagingReq: Boolean(payload.isPackagingReq),
      materialType: payload.materialType ?? null,
      packagingPrice: payload.packagingPrice ?? null,
      votes: likeCount,
      shares: Number(payload.shares ?? 0) || 0,
      commentCount: Number(payload.commentCount ?? 0) || 0,
      comments: {},
      likes: {},
      createdAt: Date.now(),
      source: "firestore_lounge",
    });
  } catch (err) {
    console.warn("RTDB community_posts mirror failed:", err);
  }
}

async function syncRtdbLikeCount(postId: string, likes: string[], uid: string, liked: boolean) {
  try {
    await update(ref(database, RTDB.communityPost(postId)), { votes: likes.length });
    const likeRef = ref(database, RTDB.communityPostLikes(postId, uid));
    if (liked) {
      await set(likeRef, { userId: uid, likedAt: Date.now() });
    } else {
      await remove(likeRef);
    }
  } catch (err) {
    console.warn("RTDB like sync failed:", err);
  }
}

async function mirrorCommentToRtdb(input: {
  postId: string;
  commentId: string;
  userId: string;
  userName: string;
  commentText: string;
  commentCount: number;
}) {
  try {
    await set(ref(database, `${RTDB.communityPostComments(input.postId)}/${input.commentId}`), {
      id: input.commentId,
      postId: input.postId,
      userId: input.userId,
      author: input.userName,
      content: input.commentText,
      createdAt: Date.now(),
    });
    await update(ref(database, RTDB.communityPost(input.postId)), {
      commentCount: input.commentCount,
    });
  } catch (err) {
    console.warn("RTDB comment mirror failed:", err);
  }
}

function mapSnapToList(snap: { forEach: (fn: (d: { id: string; data: () => Record<string, unknown> }) => void) => void }) {
  const list: FirestoreCommunityPost[] = [];
  snap.forEach((d) => {
    const mapped = mapDoc(d.id, d.data());
    if (mapped) list.push(mapped);
  });
  return list;
}

/** Live feed — Firestore `posts` (source of truth). */
export function subscribeToFirestorePosts(
  callback: (posts: FirestoreCommunityPost[]) => void,
): Unsubscribe {
  let fallbackUnsub: Unsubscribe | null = null;

  const emit = (list: FirestoreCommunityPost[]) => {
    callback(list.sort((a, b) => b.createdAt - a.createdAt));
  };

  try {
    const q = query(collection(firestore, POSTS), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        try {
          emit(mapSnapToList(snap as unknown as Parameters<typeof mapSnapToList>[0]));
        } catch (err) {
          console.warn("posts map error:", err);
          callback([]);
        }
      },
      (err) => {
        console.warn("posts onSnapshot (ordered) error:", err);
        // Fallback: unordered collection listener (no composite index required)
        try {
          fallbackUnsub = onSnapshot(
            collection(firestore, POSTS),
            (snap2) => {
              const list: FirestoreCommunityPost[] = [];
              snap2.forEach((d) => {
                const mapped = mapDoc(d.id, d.data() as Record<string, unknown>);
                if (mapped) list.push(mapped);
              });
              emit(list);
            },
            (err2) => {
              console.warn("posts onSnapshot fallback error:", err2);
              callback([]);
            },
          );
        } catch {
          callback([]);
        }
      },
    );

    return () => {
      unsub();
      fallbackUnsub?.();
    };
  } catch (err) {
    console.warn("subscribeToFirestorePosts init failed:", err);
    callback([]);
    return () => {};
  }
}

export async function createFirestorePost(input: {
  title: string;
  content: string;
  category: "General" | "Marketing Strategy" | "Packaging";
  authorUid: string;
  authorName: string;
  authorPhoto?: string;
  authorEmail?: string;
  businessName?: string;
  authorRole: FirestoreAuthorRole;
  badge: "Business Owner" | "Founder" | "Investor";
  proofAttachment?: string;
  isMarketingBlueprint?: boolean;
  isPackagingReq?: boolean;
  materialType?: string;
  packagingPrice?: string;
}): Promise<string> {
  // Avoid Firestore 1MB doc limit — skip huge inline base64 images
  let proof = input.proofAttachment || null;
  if (proof && proof.startsWith("data:") && proof.length > 700_000) {
    console.warn("proofAttachment too large for Firestore — omitting image");
    proof = null;
  }

  const payload = stripUndefined({
    title: input.title,
    content: input.content,
    category: input.category,
    authorUid: input.authorUid,
    authorName: String(input.authorName || "").trim() || "Business Owner",
    authorPhoto: String(input.authorPhoto || "").trim() || DEFAULT_AUTHOR_AVATAR,
    authorEmail: input.authorEmail || null,
    businessName: input.businessName || null,
    authorRole: input.authorRole,
    badge: input.badge,
    proofAttachment: proof,
    isMarketingBlueprint: Boolean(input.isMarketingBlueprint),
    isPackagingReq: Boolean(input.isPackagingReq),
    materialType: input.materialType || null,
    packagingPrice: input.packagingPrice || null,
    likes: [] as string[],
    shares: 0,
    commentCount: 0,
    createdAt: serverTimestamp(),
  });

  const docRef = await addDoc(collection(firestore, POSTS), payload);
  await mirrorPostToRtdb(docRef.id, { ...payload, createdAt: Date.now() }, 0);
  return docRef.id;
}

export async function toggleFirestorePostLike(postId: string, uid: string, currentlyLiked: boolean) {
  if (!postId || !uid) return;
  const postRef = doc(firestore, POSTS, postId);
  await updateDoc(postRef, {
    likes: currentlyLiked ? arrayRemove(uid) : arrayUnion(uid),
  });

  try {
    const snap = await getDoc(postRef);
    const likes = normalizeLikes(snap.data()?.likes);
    await syncRtdbLikeCount(postId, likes, uid, !currentlyLiked);
  } catch (err) {
    console.warn("like count sync skipped:", err);
  }
}

export async function shareFirestorePost(postId: string): Promise<number> {
  if (!postId) return 0;
  const postRef = doc(firestore, POSTS, postId);
  await updateDoc(postRef, { shares: increment(1) });
  try {
    const snap = await getDoc(postRef);
    const shares = Number(snap.data()?.shares ?? 0) || 0;
    await update(ref(database, RTDB.communityPost(postId)), { shares });
    return shares;
  } catch {
    return 0;
  }
}

export async function addFirestoreComment(input: {
  postId: string;
  userId: string;
  userName: string;
  userEmail: string;
  commentText: string;
}): Promise<string> {
  if (!input.postId || !input.userId || !input.commentText.trim()) {
    throw new Error("Invalid comment payload");
  }
  const commentsRef = collection(firestore, POSTS, input.postId, "comments");
  const added = await addDoc(
    commentsRef,
    stripUndefined({
      userId: input.userId,
      userName: String(input.userName || "Member").trim() || "Member",
      userEmail: String(input.userEmail || ""),
      text: input.commentText.trim(),
      commentText: input.commentText.trim(),
      createdAt: serverTimestamp(),
    }),
  );

  let commentCount = 0;
  try {
    const postRef = doc(firestore, POSTS, input.postId);
    const existing = await getDocs(commentsRef);
    commentCount = existing.size;
    await updateDoc(postRef, { commentCount });
  } catch (err) {
    console.warn("commentCount update skipped:", err);
  }

  await mirrorCommentToRtdb({
    postId: input.postId,
    commentId: added.id,
    userId: input.userId,
    userName: String(input.userName || "Member"),
    commentText: input.commentText.trim(),
    commentCount,
  });

  return added.id;
}

export function subscribeToFirestoreComments(
  postId: string,
  callback: (comments: FirestoreComment[]) => void,
): Unsubscribe {
  if (!postId) {
    callback([]);
    return () => {};
  }
  try {
    const q = query(collection(firestore, POSTS, postId, "comments"), orderBy("createdAt", "asc"));
    return onSnapshot(
      q,
      (snap) => {
        const list: FirestoreComment[] = [];
        snap.forEach((d) => {
          try {
            const data = d.data() || {};
            list.push({
              commentId: d.id,
              userId: String(data.userId ?? ""),
              userName: String(data.userName ?? "Member"),
              userEmail: String(data.userEmail ?? ""),
              commentText: String(data.commentText ?? data.text ?? ""),
              createdAt: toMillis(data.createdAt),
            });
          } catch {
            /* skip bad comment */
          }
        });
        callback(list);
      },
      (err) => {
        console.warn("comments onSnapshot error:", err);
        // Unordered fallback
        try {
          return onSnapshot(collection(firestore, POSTS, postId, "comments"), (snap2) => {
            const list: FirestoreComment[] = [];
            snap2.forEach((d) => {
              const data = d.data() || {};
              list.push({
                commentId: d.id,
                userId: String(data.userId ?? ""),
                userName: String(data.userName ?? "Member"),
                userEmail: String(data.userEmail ?? ""),
                commentText: String(data.commentText ?? data.text ?? ""),
                createdAt: toMillis(data.createdAt),
              });
            });
            list.sort((a, b) => a.createdAt - b.createdAt);
            callback(list);
          });
        } catch {
          callback([]);
        }
      },
    );
  } catch (err) {
    console.warn("subscribeToFirestoreComments failed:", err);
    callback([]);
    return () => {};
  }
}

export async function deleteFirestorePost(postId: string, authorUid: string, requesterUid: string) {
  if (!postId || authorUid !== requesterUid) {
    throw new Error("You can only delete your own posts.");
  }
  await deleteDoc(doc(firestore, POSTS, postId));
  try {
    await remove(ref(database, RTDB.communityPost(postId)));
  } catch {
    /* non-fatal */
  }
}

export function mapAuthorRoleFromCommunity(
  userRole: string,
  authRole?: string | null,
): FirestoreAuthorRole {
  if (authRole === "business_owner" || userRole === "business") return "business_owner";
  if (authRole === "investor" || userRole === "investor") return "investor";
  if (
    authRole === "founder" ||
    authRole === "entrepreneur" ||
    userRole === "entrepreneur" ||
    userRole === "founder"
  ) {
    return "founder";
  }
  return "founder";
}

export function mapBadgeFromAuthorRole(
  role: FirestoreAuthorRole,
): "Business Owner" | "Founder" | "Investor" {
  if (role === "business_owner") return "Business Owner";
  if (role === "investor") return "Investor";
  return "Founder";
}

export function resolveAuthorDisplayName(opts: {
  displayName?: string | null;
  businessName?: string | null;
  email?: string | null;
  role?: FirestoreAuthorRole;
}): string {
  const business = String(opts.businessName || "").trim();
  const person = String(opts.displayName || "").trim();
  if (opts.role === "business_owner" && business) return person || business;
  if (person) return person;
  if (business) return business;
  const emailName = String(opts.email || "").split("@")[0];
  if (emailName) return emailName;
  return opts.role === "business_owner" ? "Business Owner" : "Founder";
}

/** One-shot fetch (debug / landing). */
export async function fetchFirestorePostsOnce(): Promise<FirestoreCommunityPost[]> {
  const snap = await getDocs(collection(firestore, POSTS));
  const list: FirestoreCommunityPost[] = [];
  snap.forEach((d) => {
    const mapped = mapDoc(d.id, d.data() as Record<string, unknown>);
    if (mapped) list.push(mapped);
  });
  return list.sort((a, b) => b.createdAt - a.createdAt);
}
