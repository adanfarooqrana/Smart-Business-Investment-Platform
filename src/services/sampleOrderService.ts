import { ref, push, set, update, onValue, query, orderByChild, equalTo } from "firebase/database";
import { database } from "@/firebase";
import { RTDB } from "@/lib/rtdbPaths";

export type RtdbSampleOrderStatus = "pending" | "approved" | "shipped" | "rejected";

export type RtdbSampleOrder = {
  id: string;
  investorId: string;
  founderId: string;
  productName: string;
  quantity: number;
  price: number;
  status: RtdbSampleOrderStatus;
  createdAt: number;
  ideaId?: string;
  startupTitle?: string;
  investorName?: string;
  address?: string;
  city?: string;
  phone?: string;
  deliveryService?: string;
  deliveryServiceLabel?: string;
  deliveryCostPkr?: number;
  notes?: string;
  trackingId?: string;
};

export type PlaceSampleOrderInput = {
  investorId: string;
  founderId: string;
  productName: string;
  quantity: number;
  price: number;
  ideaId?: string;
  startupTitle?: string;
  investorName?: string;
  address?: string;
  city?: string;
  phone?: string;
  deliveryService?: string;
  deliveryServiceLabel?: string;
  deliveryCostPkr?: number;
  notes?: string;
};

/** Push a new sample order to `sample_orders/{auto-id}`. */
export async function placeSampleOrder(input: PlaceSampleOrderInput): Promise<RtdbSampleOrder> {
  const newRef = push(ref(database, RTDB.sampleOrders));
  const payload = {
    investorId: input.investorId,
    founderId: input.founderId,
    productName: input.productName,
    quantity: input.quantity,
    price: input.price,
    status: "pending" as const,
    createdAt: Date.now(),
    ideaId: input.ideaId,
    startupTitle: input.startupTitle,
    investorName: input.investorName,
    address: input.address,
    city: input.city,
    phone: input.phone,
    deliveryService: input.deliveryService,
    deliveryServiceLabel: input.deliveryServiceLabel,
    deliveryCostPkr: input.deliveryCostPkr,
    notes: input.notes,
  };
  await set(newRef, payload);
  return { id: newRef.key!, ...payload };
}

/** Live listener for orders where `founderId === uid` (indexed query). */
export function subscribeToFounderSampleOrders(
  founderUid: string,
  callback: (orders: RtdbSampleOrder[]) => void,
): () => void {
  const q = query(
    ref(database, RTDB.sampleOrders),
    orderByChild("founderId"),
    equalTo(founderUid),
  );
  return onValue(
    q,
    (snap) => {
      if (!snap.exists()) {
        callback([]);
        return;
      }
      const list: RtdbSampleOrder[] = [];
      snap.forEach((child) => {
        list.push({ id: child.key!, ...child.val() });
      });
      callback(list.sort((a, b) => b.createdAt - a.createdAt));
    },
    (error) => {
      console.error("subscribeToFounderSampleOrders error:", error);
      callback([]);
    },
  );
}

/** Founder updates order status at `sample_orders/{orderId}`. */
export async function updateSampleOrderStatus(
  orderId: string,
  status: RtdbSampleOrderStatus,
  extra?: Partial<Pick<RtdbSampleOrder, "trackingId">>,
): Promise<void> {
  await update(ref(database, RTDB.sampleOrder(orderId)), { status, ...extra });
}
