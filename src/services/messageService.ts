import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { ref, push, set, update, onValue, get } from "firebase/database";
import { firestore as db, database } from "../firebase";
import { RTDB } from "@/lib/rtdbPaths";

export type MessageSender = "investor" | "entrepreneur" | "system";

export type FirebaseMessage = {
  id: string;
  threadId: string;
  entrepreneurUid: string;
  investorName: string;
  investorId: string;
  ideaId?: string;
  startupTitle?: string;
  sender: MessageSender;
  text: string;
  read: boolean;
  type: "text" | "sample_request" | "system";
  createdAt: Timestamp | ReturnType<typeof serverTimestamp> | number;
};

export type SampleTrackingEntry = {
  status: "pending" | "Picked" | "packed" | "sent";
  trackingId?: string;
  address: string;
  city: string;
  phone: string;
  deliveryService: string;
  deliveryServiceLabel: string;
  deliveryCostPkr?: number;
  productName?: string;
  productPricePkr?: number;
  notes?: string;
  requestedAt: number;
  approvedAt?: number;
  investorName: string;
};

export type InvestorThread = {
  threadId: string;
  investorName: string;
  investorId: string;
  ideaId?: string;
  startupTitle?: string;
  lastMessage: string;
  lastMessageAt: number;
  unreadCount: number;
  hasSampleRequest: boolean;
  samplePending: boolean;
  sampleRequest?: SampleTrackingEntry;
  messages: FirebaseMessage[];
};

export function investorIdFromName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function threadIdFor(entrepreneurUid: string, investorId: string, ideaId?: string): string {
  return `${entrepreneurUid}_${investorId}${ideaId ? `_${ideaId}` : ""}`;
}

export async function sendFirebaseMessage(
  msg: Omit<FirebaseMessage, "id" | "createdAt" | "read"> & { read?: boolean },
): Promise<string> {
  const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await setDoc(doc(db, "messages", id), {
    ...msg,
    id,
    read: msg.read ?? false,
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function markMessagesRead(threadId: string): Promise<void> {
  const q = query(collection(db, "messages"), where("threadId", "==", threadId));
  const snap = await getDocs(q);
  await Promise.all(
    snap.docs
      .filter((d) => !d.data().read && d.data().sender === "investor")
      .map((d) => updateDoc(doc(db, "messages", d.id), { read: true })),
  );
}

export async function fetchMessagesForEntrepreneur(
  entrepreneurUid: string,
): Promise<FirebaseMessage[]> {
  const q = query(
    collection(db, "messages"),
    where("entrepreneurUid", "==", entrepreneurUid),
    orderBy("createdAt", "asc"),
  );
  try {
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      const createdAt =
        data.createdAt?.toMillis?.() ?? data.createdAt ?? Date.now();
      return { ...data, id: d.id, createdAt } as FirebaseMessage;
    });
  } catch {
    const qFallback = query(
      collection(db, "messages"),
      where("entrepreneurUid", "==", entrepreneurUid),
    );
    const snap = await getDocs(qFallback);
    return snap.docs
      .map((d) => {
        const data = d.data();
        const createdAt =
          data.createdAt?.toMillis?.() ?? data.createdAt ?? Date.now();
        return { ...data, id: d.id, createdAt } as FirebaseMessage;
      })
      .sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
  }
}

export async function fetchSampleTrackingForIdea(
  ideaId: string,
): Promise<Record<string, SampleTrackingEntry>> {
  const snap = await getDocSafe(ideaId);
  if (!snap) return {};
  return (snap.sampleTracking as Record<string, SampleTrackingEntry>) ?? {};
}

async function getDocSafe(ideaId: string) {
  const ref = doc(db, "stage3_data", ideaId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function saveSampleRequestToStage3(
  ideaId: string,
  investorName: string,
  entry: Omit<SampleTrackingEntry, "status" | "requestedAt" | "investorName"> & {
    status?: SampleTrackingEntry["status"];
  },
): Promise<void> {
  const ref = doc(db, "stage3_data", ideaId);
  const existing = await getDocSafe(ideaId);
  const key = investorIdFromName(investorName);
  const sampleTracking: Record<string, SampleTrackingEntry> = {
    ...(existing?.sampleTracking ?? {}),
    [key]: {
      ...entry,
      investorName,
      status: entry.status ?? "pending",
      requestedAt: Date.now(),
    },
  };
  await updateDoc(ref, { sampleTracking }).catch(() =>
    setDoc(ref, { ...(existing ?? {}), ideaId, sampleTracking }, { merge: true }),
  );
}

export async function approveSampleInStage3(
  ideaId: string,
  investorName: string,
  trackingId: string,
): Promise<void> {
  const ref = doc(db, "stage3_data", ideaId);
  const existing = await getDocSafe(ideaId);
  const key = investorIdFromName(investorName);
  const prev: SampleTrackingEntry = existing?.sampleTracking?.[key] ?? {
    status: "pending",
    address: "",
    city: "",
    phone: "",
    deliveryService: "",
    deliveryServiceLabel: "",
    requestedAt: Date.now(),
    investorName,
  };
  const sampleTracking = {
    ...(existing?.sampleTracking ?? {}),
    [key]: {
      ...prev,
      status: "Picked" as const,
      trackingId,
      approvedAt: Date.now(),
    },
  };
  await updateDoc(ref, { sampleTracking }).catch(() =>
    setDoc(ref, { ...(existing ?? {}), ideaId, sampleTracking }, { merge: true }),
  );
}

export function buildThreadsFromMessages(
  messages: FirebaseMessage[],
  sampleByIdea: Record<string, Record<string, SampleTrackingEntry>>,
): InvestorThread[] {
  const map = new Map<string, InvestorThread>();

  for (const msg of messages) {
    const tid = msg.threadId;
    if (!map.has(tid)) {
      const invId = msg.investorId || investorIdFromName(msg.investorName);
      const sample =
        msg.ideaId && sampleByIdea[msg.ideaId]
          ? sampleByIdea[msg.ideaId][invId]
          : undefined;
      map.set(tid, {
        threadId: tid,
        investorName: msg.investorName,
        investorId: invId,
        ideaId: msg.ideaId,
        startupTitle: msg.startupTitle,
        lastMessage: msg.text,
        lastMessageAt: Number(msg.createdAt),
        unreadCount: 0,
        hasSampleRequest: !!sample || msg.type === "sample_request",
        samplePending: sample?.status === "pending",
        sampleRequest: sample,
        messages: [],
      });
    }
    const thread = map.get(tid)!;
    thread.messages.push(msg);
    if (Number(msg.createdAt) >= thread.lastMessageAt) {
      thread.lastMessage = msg.text;
      thread.lastMessageAt = Number(msg.createdAt);
    }
    if (!msg.read && msg.sender === "investor") thread.unreadCount += 1;
    if (msg.type === "sample_request") thread.hasSampleRequest = true;
  }

  for (const thread of map.values()) {
    thread.messages.sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
    if (thread.ideaId && sampleByIdea[thread.ideaId]) {
      const s = sampleByIdea[thread.ideaId][thread.investorId];
      if (s) {
        thread.sampleRequest = s;
        thread.hasSampleRequest = true;
        thread.samplePending = s.status === "pending";
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.lastMessageAt - a.lastMessageAt);
}

export function subscribeToEntrepreneurMessages(
  entrepreneurUid: string,
  onUpdate: (messages: FirebaseMessage[]) => void,
): () => void {
  const q = query(
    collection(db, "messages"),
    where("entrepreneurUid", "==", entrepreneurUid),
  );
  return onSnapshot(q, (snap) => {
    const messages = snap.docs
      .map((d) => {
        const data = d.data();
        const createdAt =
          data.createdAt?.toMillis?.() ?? data.createdAt ?? Date.now();
        return { ...data, id: d.id, createdAt } as FirebaseMessage;
      })
      .sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
    onUpdate(messages);
  });
}

// ─── RTDB direct messages (messages/{auto-id}) ───────────────────────────────

export type RtdbDirectMessage = {
  id: string;
  fromId: string;
  toId: string;
  fromName: string;
  text: string;
  timestamp: number;
  read: boolean;
};

/** Push a message to RTDB `messages/{auto-id}`. */
export async function sendDirectMessage(
  data: Omit<RtdbDirectMessage, "id" | "timestamp" | "read">,
): Promise<string> {
  const newRef = push(ref(database, RTDB.messages));
  const payload = {
    fromId: data.fromId,
    toId: data.toId,
    fromName: data.fromName,
    text: data.text,
    timestamp: Date.now(),
    read: false,
  };
  await set(newRef, payload);
  return newRef.key!;
}

/** Live listener on `messages/` — filters to messages involving `uid`. */
export function subscribeToDirectMessages(
  uid: string,
  callback: (messages: RtdbDirectMessage[]) => void,
): () => void {
  return onValue(
    ref(database, RTDB.messages),
    (snap) => {
      if (!snap.exists()) {
        callback([]);
        return;
      }
      const list: RtdbDirectMessage[] = [];
      snap.forEach((child) => {
        const val = child.val() as Omit<RtdbDirectMessage, "id">;
        if (val.fromId === uid || val.toId === uid) {
          list.push({ id: child.key!, ...val });
        }
      });
      callback(list.sort((a, b) => a.timestamp - b.timestamp));
    },
    (error) => {
      console.error("subscribeToDirectMessages error:", error);
      callback([]);
    },
  );
}

/** Mark a single RTDB message as read. */
export async function markDirectMessageRead(messageId: string): Promise<void> {
  await update(ref(database, RTDB.message(messageId)), { read: true });
}

/** Mark all unread inbound messages in a thread as read. */
export async function markInboundDirectMessagesRead(
  currentUid: string,
  otherUid: string,
): Promise<void> {
  const snap = await get(ref(database, RTDB.messages));
  if (!snap.exists()) return;
  const updates: Record<string, unknown> = {};
  snap.forEach((child) => {
    const val = child.val() as Omit<RtdbDirectMessage, "id">;
    if (val.toId === currentUid && val.fromId === otherUid && !val.read) {
      updates[`${RTDB.message(child.key!)}/read`] = true;
    }
  });
  if (Object.keys(updates).length > 0) {
    await update(ref(database), updates);
  }
}

export async function resolveEntrepreneurUidForIdea(ideaId: string): Promise<string | null> {
  const snap = await get(ref(database, RTDB.investorFeedIdea(ideaId)));
  if (!snap.exists()) return null;
  const data = snap.val() as { entrepreneurUid?: string };
  return data.entrepreneurUid ?? null;
}
