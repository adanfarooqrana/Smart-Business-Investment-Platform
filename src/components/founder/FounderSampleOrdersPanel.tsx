import { useEffect, useState } from "react";
import { Package, MapPin, Truck, CheckCircle2, X, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToFounderSampleOrders,
  updateSampleOrderStatus,
  type RtdbSampleOrder,
  type RtdbSampleOrderStatus,
} from "@/services/sampleOrderService";
import { sendNotification } from "@/services/firebaseService";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "#FFA500" },
  approved: { label: "Approved", color: "#FFD700" },
  shipped: { label: "Shipped", color: "#4ade80" },
  rejected: { label: "Rejected", color: "#f87171" },
};

type Props = {
  founderUid: string;
  onAdvanceLocal?: (orderId: string) => void;
};

export function FounderSampleOrdersPanel({ founderUid, onAdvanceLocal }: Props) {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<RtdbSampleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const uid = currentUser?.uid ?? founderUid;

  useEffect(() => {
    if (!uid) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeToFounderSampleOrders(uid, (list) => {
      setOrders(list);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return "Just now";
    if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
    return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) > 1 ? "s" : ""} ago`;
  };

  const setStatus = async (order: RtdbSampleOrder, newStatus: RtdbSampleOrderStatus) => {
    if (!currentUser?.uid) {
      toast.error("Firebase login required to update orders.");
      return;
    }
    setUpdatingId(order.id);
    try {
      const trackingId =
        newStatus === "shipped"
          ? order.trackingId ?? `SB-TRK-${order.id.slice(-6).toUpperCase()}`
          : undefined;
      await updateSampleOrderStatus(order.id, newStatus, trackingId ? { trackingId } : undefined);
      await sendNotification(order.investorId, {
        type: "sample_update",
        message: `Your order for ${order.productName} is now ${newStatus}`,
        relatedId: order.id,
      }).catch((err) => console.warn("Sample order notification failed:", err));
      if (newStatus === "approved" || newStatus === "shipped") {
        onAdvanceLocal?.(order.id);
      }
      toast.success(
        newStatus === "approved"
          ? "Sample approved!"
          : newStatus === "shipped"
            ? "Marked as shipped!"
            : newStatus === "rejected"
              ? "Sample request rejected."
              : "Order updated.",
      );
    } catch {
      toast.error("Could not update order status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAction = (order: RtdbSampleOrder, action: "approve" | "reject" | "ship") => {
    if (action === "reject") {
      void setStatus(order, "rejected");
      return;
    }
    if (action === "approve") void setStatus(order, "approved");
    if (action === "ship") void setStatus(order, "shipped");
  };

  const displayName = (order: RtdbSampleOrder) => order.investorName ?? `Investor ${order.investorId.slice(0, 6)}`;

  return (
    <div
      className="rounded-2xl border border-[#FFD700]/20 p-5"
      style={{ background: "rgba(255,255,255,0.03)" }}
    >
      <h3 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-white">
        <Package className="h-5 w-5 text-[#FFA500]" /> Sample Orders
        {orders.length > 0 && (
          <span className="ml-auto rounded-full bg-[#FFA500] px-2 py-0.5 text-[10px] font-bold text-white">
            {orders.length}
          </span>
        )}
      </h3>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading orders...
        </div>
      ) : orders.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500">
          {!currentUser?.uid
            ? "Sign in with Firebase to view sample orders."
            : "No sample orders yet."}
        </p>
      ) : (
        <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
          {orders.map((order) => {
            const status = STATUS_MAP[order.status] ?? STATUS_MAP.pending;
            const isExpanded = expanded === order.id;
            const busy = updatingId === order.id;
            return (
              <div
                key={order.id}
                className="rounded-xl border border-white/10 p-3 transition hover:border-[#FFD700]/30"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
                  >
                    {displayName(order).charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">{displayName(order)}</p>
                    <p className="text-xs text-slate-400">
                      {order.productName} · Qty {order.quantity} · Rs. {order.price.toLocaleString()}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                      <Clock className="h-3 w-3" />
                      {timeAgo(order.createdAt)}
                    </div>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ background: `${status.color}22`, color: status.color }}
                  >
                    {status.label}
                  </span>
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-2 border-t border-white/5 pt-3 text-xs text-slate-400">
                    {order.address && order.city && (
                      <p className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {order.address}, {order.city}
                      </p>
                    )}
                    {order.deliveryServiceLabel && (
                      <p className="flex items-center gap-1">
                        <Truck className="h-3 w-3" /> {order.deliveryServiceLabel}
                        {order.deliveryCostPkr != null && ` · Rs. ${order.deliveryCostPkr}`}
                      </p>
                    )}
                    {order.trackingId && (
                      <p>
                        Tracking: <span className="font-mono text-[#FFD700]">{order.trackingId}</span>
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : order.id)}
                    className="text-[10px] text-[#FFD700] hover:underline"
                  >
                    {isExpanded ? "Collapse" : "Expand"}
                  </button>
                  {order.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        disabled={busy}
                        className="ml-auto h-6 bg-emerald-600 px-2 text-[10px] text-white"
                        onClick={() => handleAction(order, "approve")}
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        className="h-6 px-2 text-[10px] text-red-400"
                        onClick={() => handleAction(order, "reject")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  {order.status === "approved" && (
                    <Button
                      size="sm"
                      disabled={busy}
                      className="ml-auto h-6 bg-[#FFA500] px-2 text-[10px] text-white"
                      onClick={() => handleAction(order, "ship")}
                    >
                      <Truck className="mr-1 h-3 w-3" /> Mark Shipped
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
