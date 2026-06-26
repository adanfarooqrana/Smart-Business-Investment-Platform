/**
 * Unified Firebase Realtime Database service for all platform modules.
 */
import { ref, push, set, get, update, remove, onValue } from "firebase/database";
import { database } from "@/firebase";
import { RTDB } from "@/lib/rtdbPaths";

// ─── Likes ───────────────────────────────────────────────────────────────────

export async function togglePostLike(postId: string, userId: string, currentlyLiked: boolean) {
  const likeRef = ref(database, RTDB.communityPostLikes(postId, userId));
  const votesRef = ref(database, `${RTDB.communityPost(postId)}/votes`);
  if (currentlyLiked) {
    await remove(likeRef);
    const snap = await get(votesRef);
    const cur = snap.exists() ? Number(snap.val()) : 0;
    await set(votesRef, Math.max(0, cur - 1));
    return false;
  }
  await set(likeRef, { userId, likedAt: Date.now() });
  const snap = await get(votesRef);
  const cur = snap.exists() ? Number(snap.val()) : 0;
  await set(votesRef, cur + 1);
  return true;
}

export function subscribeToPostLikes(postId: string, callback: (count: number) => void) {
  const votesRef = ref(database, `${RTDB.communityPost(postId)}/votes`);
  return onValue(votesRef, (snap) => callback(snap.exists() ? Number(snap.val()) : 0));
}

// ─── Comments ────────────────────────────────────────────────────────────────

export type RtComment = {
  id: string;
  postId: string;
  author: string;
  userId: string;
  content: string;
  createdAt: number;
};

export async function addPostComment(data: Omit<RtComment, "id" | "createdAt">) {
  const newRef = push(ref(database, RTDB.communityPostComments(data.postId)));
  const comment: RtComment = { ...data, id: newRef.key!, createdAt: Date.now() };
  await set(newRef, comment);
  return comment;
}

export function subscribeToComments(postId: string, callback: (comments: RtComment[]) => void) {
  return onValue(ref(database, RTDB.communityPostComments(postId)), (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const list: RtComment[] = [];
    snap.forEach((child) => list.push({ id: child.key!, ...child.val() }));
    callback(list.sort((a, b) => a.createdAt - b.createdAt));
  });
}

// ─── Videos (video_lounge) ───────────────────────────────────────────────────

export type CommunityVideo = {
  id: string;
  userId: string;
  author: string;
  role: string;
  title: string;
  caption: string;
  videoUrl: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  category: "general" | "packaging" | "strategy" | "profile";
  likes: number;
  comments: number;
  favorites: number;
  createdAt: number;
};

export async function uploadCommunityVideo(data: Omit<CommunityVideo, "id" | "likes" | "comments" | "favorites" | "createdAt">) {
  const newRef = push(ref(database, RTDB.videoLoungeVideos));
  const video: CommunityVideo = {
    ...data,
    id: newRef.key!,
    likes: 0,
    comments: 0,
    favorites: 0,
    createdAt: Date.now(),
  };
  await set(newRef, video);
  return video;
}

export function subscribeToVideos(callback: (videos: CommunityVideo[]) => void) {
  return onValue(
    ref(database, RTDB.videoLoungeVideos),
    (snap) => {
      if (!snap.exists()) {
        callback([]);
        return;
      }
      const list: CommunityVideo[] = [];
      snap.forEach((child) => list.push({ id: child.key!, ...child.val() }));
      callback(list.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0)));
    },
    (err) => {
      console.warn("video_lounge subscribe error:", err);
      callback([]);
    },
  );
}

export async function toggleVideoLike(videoId: string, userId: string) {
  const likeRef = ref(database, RTDB.videoLoungeLikes(videoId, userId));
  const snap = await get(likeRef);
  if (snap.exists()) {
    await remove(likeRef);
    return false;
  }
  await set(likeRef, true);
  return true;
}

/** Live like count + whether the current user liked (from `video_lounge/likes/{videoId}/`). */
export function subscribeToVideoLikeState(
  videoId: string,
  userId: string | undefined,
  callback: (state: { count: number; likedByMe: boolean }) => void,
) {
  return onValue(ref(database, RTDB.videoLoungeVideoLikes(videoId)), (snap) => {
    if (!snap.exists()) {
      callback({ count: 0, likedByMe: false });
      return;
    }
    let count = 0;
    let likedByMe = false;
    snap.forEach((child) => {
      if (child.val()) {
        count += 1;
        if (userId && child.key === userId) likedByMe = true;
      }
    });
    callback({ count, likedByMe });
  });
}

export async function toggleVideoFavorite(videoId: string, userId: string) {
  const favRef = ref(database, RTDB.videoLoungeFavorites(userId, videoId));
  const snap = await get(favRef);
  if (snap.exists()) {
    await remove(favRef);
    return false;
  }
  await set(favRef, { savedAt: Date.now() });
  return true;
}

export type VideoAdvice = {
  id: string;
  videoId: string;
  fromUserId: string;
  fromName: string;
  advice: string;
  createdAt: number;
};

export async function postVideoAdvice(data: Omit<VideoAdvice, "id" | "createdAt">) {
  const newRef = push(ref(database, RTDB.videoLoungeAdvice(data.videoId)));
  const item: VideoAdvice = { ...data, id: newRef.key!, createdAt: Date.now() };
  await set(newRef, item);
  return item;
}

export function subscribeToVideoAdvice(videoId: string, callback: (items: VideoAdvice[]) => void) {
  return onValue(ref(database, RTDB.videoLoungeAdvice(videoId)), (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const list: VideoAdvice[] = [];
    snap.forEach((child) => list.push({ id: child.key!, ...child.val() }));
    callback(list.sort((a, b) => b.createdAt - a.createdAt));
  });
}

export type VideoComment = {
  id: string;
  videoId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
};

export async function addVideoComment(
  videoId: string,
  userId: string,
  userName: string,
  text: string,
) {
  const newRef = push(ref(database, RTDB.videoLoungeComments(videoId)));
  await set(newRef, { userId, userName, text, createdAt: Date.now() });
  return newRef.key!;
}

export function subscribeToVideoComments(
  videoId: string,
  callback: (comments: VideoComment[]) => void,
) {
  return onValue(ref(database, RTDB.videoLoungeComments(videoId)), (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const list: VideoComment[] = [];
    snap.forEach((child) =>
      list.push({ id: child.key!, videoId, ...child.val() }),
    );
    callback(list.sort((a, b) => a.createdAt - b.createdAt));
  });
}

export function subscribeToVideoCommentCount(
  videoId: string,
  callback: (count: number) => void,
) {
  return onValue(ref(database, RTDB.videoLoungeComments(videoId)), (snap) => {
    callback(snap.exists() ? snap.numChildren() : 0);
  });
}

export async function requestGroupJoin(groupId: string, userId: string, userName: string) {
  const newRef = push(ref(database, `${RTDB.group(groupId)}/join_requests`));
  await set(newRef, { userId, userName, status: "pending", createdAt: Date.now() });
}

// ─── Auth sessions (stored under users/{uid}) ────────────────────────────────

export type AuthSession = {
  uid: string;
  role: string;
  email: string;
  phone: string;
  name: string;
  authenticatedAt: number;
  paymentMethod?: string;
};

export async function saveAuthSession(session: AuthSession) {
  await set(ref(database, `${RTDB.users(session.uid)}/auth_session`), session);
  await update(ref(database, RTDB.users(session.uid)), {
    name: session.name,
    email: session.email,
    phone: session.phone,
    role: session.role,
    updatedAt: Date.now(),
  });
}

// ─── Payment OTP (under users/{uid}) ─────────────────────────────────────────

export type PaymentOtpRecord = {
  id: string;
  userId: string;
  method: "jazzcash" | "easypaisa";
  mobile: string;
  otp: string;
  verified: boolean;
  amountPkr: number;
  createdAt: number;
};

export async function sendPaymentOtp(data: Omit<PaymentOtpRecord, "id" | "verified" | "createdAt">) {
  const newRef = push(ref(database, `${RTDB.users(data.userId)}/payment_otp`));
  const record: PaymentOtpRecord = {
    ...data,
    id: newRef.key!,
    verified: false,
    createdAt: Date.now(),
  };
  await set(newRef, record);
  return record;
}

export async function verifyPaymentOtp(userId: string, otpId: string, enteredOtp: string) {
  const snap = await get(ref(database, `${RTDB.users(userId)}/payment_otp/${otpId}`));
  if (!snap.exists()) return { ok: false, error: "OTP session not found" };
  const record = snap.val() as PaymentOtpRecord;
  if (record.verified) return { ok: false, error: "Already verified" };
  if (record.otp !== enteredOtp) return { ok: false, error: "Invalid OTP" };
  await update(ref(database, `${RTDB.users(userId)}/payment_otp/${otpId}`), { verified: true, verifiedAt: Date.now() });
  return { ok: true, record };
}

// ─── Pitched ideas (under entrepreneurs/{uid}/ideas) ─────────────────────────

export async function savePitchedIdeaToBackend(idea: Record<string, unknown> & { id: string; founderId: string }) {
  await set(ref(database, RTDB.entrepreneurIdea(idea.founderId, idea.id)), { ...idea, syncedAt: Date.now() });
}

// ─── AI Salesperson (under wholesalers/{wholesalerId}) ─────────────────────────

export async function saveAiSalesperson(wholesalerId: string, data: Record<string, unknown>) {
  await set(ref(database, `${RTDB.wholesalers(wholesalerId)}/ai_salesperson`), { ...data, updatedAt: Date.now() });
}

// ─── Sticky notes → community_posts ──────────────────────────────────────────

export async function saveStickyNote(note: Record<string, unknown>) {
  const newRef = push(ref(database, RTDB.communityPosts));
  await set(newRef, { ...note, id: newRef.key, createdAt: Date.now(), type: "sticky_note" });
  return newRef.key;
}

// ─── Strategies & packaging → community_posts ──────────────────────────────────

export async function saveStrategyPost(data: Record<string, unknown>) {
  const newRef = push(ref(database, RTDB.communityPosts));
  await set(newRef, { ...data, type: "strategy", createdAt: Date.now() });
  return newRef.key;
}

export async function savePackagingPost(data: Record<string, unknown>) {
  const newRef = push(ref(database, RTDB.communityPosts));
  await set(newRef, { ...data, type: "packaging", createdAt: Date.now() });
  return newRef.key;
}
