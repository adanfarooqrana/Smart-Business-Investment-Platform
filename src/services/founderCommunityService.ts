import {
  ref,
  push,
  set,
  get,
  update,
  remove,
  onValue,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";
import { database } from "@/firebase";
import { RTDB } from "@/lib/rtdbPaths";

// ─── Types ───────────────────────────────────────────────────────────────────

export type FounderGroup = {
  id: string;
  name: string;
  description: string;
  category: string;
  members: string[];
  createdBy: string;
  isPrivate: boolean;
  createdAt: number;
};

export type GroupMessage = {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: number;
};

export type FounderNotification = {
  id: string;
  userId: string;
  message: string;
  type: "info" | "investor" | "sample" | "problem" | "community";
  read: boolean;
  createdAt: number;
};

export type ExpertSolution = {
  id: string;
  problemId: string;
  expertId: string;
  expertName: string;
  solution: string;
  upvotes: number;
  isAccepted: boolean;
  points: number;
  createdAt: number;
};

export type FollowerRecord = {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: number;
};

export type StickyNote = {
  id: string;
  category: string;
  color: string;
  content: string;
  author: string;
  authorId: string;
  businessId?: string;
  likes: number;
  views: number;
  proofUrl?: string;
  createdAt: number;
};

// ─── User directory (search by ID / name) ─────────────────────────────────────

export type DirectoryUser = {
  uid: string;
  name: string;
  role: string;
  email?: string;
  createdAt?: number;
  lastSeen?: number;
};

export function subscribeToUserDirectory(
  callback: (users: DirectoryUser[]) => void,
): () => void {
  return onValue(ref(database, RTDB.userDirectory), (snap) => {
    const list: DirectoryUser[] = [];
    if (snap.exists()) {
      snap.forEach((child) => {
        const val = child.val();
        if (val) list.push({ uid: child.key!, ...val });
      });
    }
    callback(list);
  });
}

export async function fetchUserDirectory(): Promise<DirectoryUser[]> {
  const snap = await get(ref(database, RTDB.userDirectory));
  if (!snap.exists()) return [];
  const list: DirectoryUser[] = [];
  snap.forEach((child) => {
    const val = child.val();
    if (val) list.push({ uid: child.key!, ...val });
  });
  return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

export function filterDirectoryUsers(
  users: DirectoryUser[],
  query: string,
  excludeUid?: string,
): DirectoryUser[] {
  const q = query.trim().toLowerCase();
  const pool = users.filter((u) => u.uid !== excludeUid);
  if (!q) return pool.slice(0, 6);
  return pool
    .filter(
      (u) =>
        u.uid.toLowerCase().includes(q) ||
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.role || "").toLowerCase().includes(q),
    )
    .slice(0, 8);
}

export async function upsertUserDirectoryEntry(entry: DirectoryUser): Promise<void> {
  await set(ref(database, RTDB.userDirectoryEntry(entry.uid)), {
    ...entry,
    updatedAt: Date.now(),
  });
}

// ─── Groups ──────────────────────────────────────────────────────────────────

export async function createGroup(data: Omit<FounderGroup, "id" | "createdAt">) {
  const newRef = push(ref(database, RTDB.groups));
  const createdAt = Date.now();
  const payload = {
    name: data.name,
    description: data.description,
    category: data.category,
    members: data.members,
    createdBy: data.createdBy,
    isPrivate: data.isPrivate,
    createdAt,
  };
  await set(newRef, payload);
  return { id: newRef.key!, ...payload } satisfies FounderGroup;
}

export function subscribeToGroups(callback: (groups: FounderGroup[]) => void) {
  return onValue(
    ref(database, RTDB.groups),
    (snap) => {
      if (!snap.exists()) {
        callback([]);
        return;
      }
      const list: FounderGroup[] = [];
      snap.forEach((child) => list.push({ ...child.val(), id: child.key! }));
      callback(list.sort((a, b) => b.createdAt - a.createdAt));
    },
    (error) => {
      console.error("subscribeToGroups error:", error);
      callback([]);
    },
  );
}

export async function addGroupMember(groupId: string, userId: string) {
  const snap = await get(ref(database, RTDB.group(groupId)));
  if (!snap.exists()) throw new Error("Group not found");
  const group = snap.val() as FounderGroup;
  if (group.members.includes(userId)) return;
  await update(ref(database, RTDB.group(groupId)), {
    members: [...group.members, userId],
  });
}

// ─── Group Messages ──────────────────────────────────────────────────────────

export async function sendGroupMessage(data: Omit<GroupMessage, "id" | "createdAt">) {
  const newRef = push(ref(database, RTDB.groupMessages(data.groupId)));
  const createdAt = Date.now();
  const payload = {
    userId: data.userId,
    userName: data.userName,
    message: data.message,
    createdAt,
  };
  await set(newRef, payload);
  return {
    id: newRef.key!,
    groupId: data.groupId,
    ...payload,
  } satisfies GroupMessage;
}

export function subscribeToGroupMessages(groupId: string, callback: (msgs: GroupMessage[]) => void) {
  return onValue(
    ref(database, RTDB.groupMessages(groupId)),
    (snap) => {
      if (!snap.exists()) {
        callback([]);
        return;
      }
      const list: GroupMessage[] = [];
      snap.forEach((child) =>
        list.push({ ...child.val(), id: child.key!, groupId }),
      );
      callback(list.sort((a, b) => a.createdAt - b.createdAt));
    },
    (error) => {
      console.error("subscribeToGroupMessages error:", error);
      callback([]);
    },
  );
}

// ─── Notifications ───────────────────────────────────────────────────────────

export async function pushNotification(data: Omit<FounderNotification, "id" | "createdAt" | "read">) {
  const newRef = push(ref(database, RTDB.notifications(data.userId)));
  await set(newRef, { ...data, id: newRef.key, read: false, createdAt: Date.now() });
  return newRef.key;
}

export function subscribeToNotifications(userId: string, callback: (n: FounderNotification[]) => void) {
  return onValue(ref(database, RTDB.notifications(userId)), (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const list: FounderNotification[] = [];
    snap.forEach((child) => list.push({ id: child.key!, ...child.val() }));
    callback(list.sort((a, b) => b.createdAt - a.createdAt));
  });
}

export async function markNotificationRead(userId: string, notifId: string) {
  await update(ref(database, `${RTDB.notifications(userId)}/${notifId}`), { read: true });
}

// ─── Solutions ───────────────────────────────────────────────────────────────

export async function submitSolution(data: Omit<ExpertSolution, "id" | "createdAt" | "upvotes" | "isAccepted" | "points">) {
  const newRef = push(ref(database, `${RTDB.communityPosts}/${data.problemId}/solutions`));
  const sol: ExpertSolution = {
    ...data,
    id: newRef.key!,
    upvotes: 0,
    isAccepted: false,
    points: 0,
    createdAt: Date.now(),
  };
  await set(newRef, sol);
  return sol;
}

export function subscribeToSolutions(problemId: string, callback: (sols: ExpertSolution[]) => void) {
  return onValue(ref(database, `${RTDB.communityPosts}/${problemId}/solutions`), (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const list: ExpertSolution[] = [];
    snap.forEach((child) => list.push({ id: child.key!, ...child.val() }));
    callback(list.sort((a, b) => b.createdAt - a.createdAt));
  });
}

export async function acceptSolution(problemId: string, solutionId: string, expertId: string) {
  await update(ref(database, `${RTDB.communityPosts}/${problemId}/solutions/${solutionId}`), { isAccepted: true, points: 1 });
  const pointsRef = ref(database, `${RTDB.points(expertId)}/history`);
  await push(pointsRef, {
    userId: expertId,
    points: 1,
    reason: "Solution accepted by founder",
    createdAt: Date.now(),
  });
}

// ─── Followers ─────────────────────────────────────────────────────────────────

export async function followUser(followerId: string, followingId: string) {
  await set(ref(database, `${RTDB.followers(followerId)}/${followingId}`), {
    followerId,
    followingId,
    createdAt: Date.now(),
  });
}

export async function unfollowUser(followerId: string, followingId: string) {
  await remove(ref(database, `${RTDB.followers(followerId)}/${followingId}`));
}

export function subscribeToFollowing(userId: string, callback: (ids: string[]) => void) {
  return onValue(ref(database, RTDB.followers(userId)), (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const ids: string[] = [];
    snap.forEach((child) => {
      const id = child.val()?.followingId ?? child.key;
      if (typeof id === "string") ids.push(id);
    });
    callback(ids);
  });
}

// ─── Sticky Notes (Community Posts tab) ──────────────────────────────────────

export const FALLBACK_STICKY_NOTES: StickyNote[] = [];

export function subscribeToStickyNotes(callback: (notes: StickyNote[]) => void) {
  try {
    return onValue(
      ref(database, RTDB.communityPosts),
      (snap) => {
        if (!snap.exists()) {
          callback([]);
          return;
        }
        const list: StickyNote[] = [];
        snap.forEach((child) => {
          const val = child.val();
          if (val?.type === "sticky_note") list.push({ id: child.key!, ...val });
        });
        callback(list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)));
      },
      (error) => {
        console.warn("sticky notes subscribe error:", error);
        callback([]);
      },
    );
  } catch (err) {
    console.warn("sticky notes init error:", err);
    callback([]);
    return () => {};
  }
}

export async function likeStickyNote(noteId: string, userId: string) {
  const likeRef = ref(database, `${RTDB.communityPost(noteId)}/likes/${userId}`);
  const likeSnap = await get(likeRef);
  const noteLikesRef = ref(database, `${RTDB.communityPost(noteId)}/likesCount`);
  const noteLikesSnap = await get(noteLikesRef);
  const currentLikes = noteLikesSnap.exists() ? noteLikesSnap.val() : 0;

  if (likeSnap.exists()) {
    await remove(likeRef);
    await set(noteLikesRef, Math.max(0, currentLikes - 1));
    return false;
  }
  await set(likeRef, true);
  await set(noteLikesRef, currentLikes + 1);
  return true;
}

// ─── Community post delete ─────────────────────────────────────────────────────

export async function deleteCommunityPostFromDb(postId: string) {
  await remove(ref(database, RTDB.communityPost(postId)));
}

// ─── Founder profile post (only from profile) ────────────────────────────────

export async function postFromProfile(data: {
  userId: string;
  author: string;
  role: string;
  title: string;
  content: string;
  category: string;
  proofUrl?: string;
  type: "post" | "strategy" | "packaging";
}) {
  const newRef = push(ref(database, RTDB.communityPosts));
  await set(newRef, {
    ...data,
    userId: data.userId,
    likes: 0,
    comments: [],
    isPinned: false,
    createdAt: Date.now(),
  });
  return newRef.key;
}
