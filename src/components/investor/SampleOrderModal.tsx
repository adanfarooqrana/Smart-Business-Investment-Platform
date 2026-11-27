import { useMemo, useState } from "react";
import { Sun, Package, Truck, MapPin, Phone, CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPkr } from "@/lib/investmentCalculator";
import type { SampleOrder } from "@/hooks/useAppState";
import { useAuth } from "@/contexts/AuthContext";
import { placeSampleOrder } from "@/services/sampleOrderService";
import { toast } from "sonner";

const DELIVERY_SERVICES = [
  { id: "rider" as const, label: "InvestBiz Rider", sub: "Fastest · Most affordable", base: 120, perKm: 8, api: "SB-RIDER-API (demo)" },
  { id: "postex" as const, label: "PostEx", sub: "Nationwide parcel", base: 150, perKm: 10, api: "PostEx REST v2 (hook ready)" },
  { id: "leopard" as const, label: "Leopard Courier", sub: "Express 24–48h", base: 200, perKm: 12, api: "Leopard Track API (hook ready)" },
  { id: "tcs" as const, label: "TCS", sub: "Premium insured", base: 250, perKm: 15, api: "TCS Shipment API (hook ready)" },
];

const CITY_KM: Record<string, number> = {
  Karachi: 12,
  Lahore: 18,
  Islamabad: 22,
  Rawalpindi: 20,
  Faisalabad: 25,
  Multan: 30,
  Peshawar: 35,
  Other: 28,
};

type SampleOrderModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startupTitle: string;
  ideaId: string;
  founderId: string;
  productName: string;
  productPricePkr: number;
  investorName: string;
  onOrderPlaced: (order: Omit<SampleOrder, "id" | "createdAt" | "stage" | "trackingId">) => void;
};

export function SampleOrderModal({
  open,
  onOpenChange,
  startupTitle,
  ideaId,
  founderId,
  productName,
  productPricePkr,
  investorName,
  onOrderPlaced,
}: SampleOrderModalProps) {
  const { currentUser } = useAuth();
  const [step, setStep] = useState<"form" | "confirm" | "done">("form");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Karachi");
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [service, setService] = useState<(typeof DELIVERY_SERVICES)[0]["id"]>("rider");
  const [submitting, setSubmitting] = useState(false);

  const deliveryCost = useMemo(() => {
    const svc = DELIVERY_SERVICES.find((s) => s.id === service)!;
    const km = CITY_KM[city] ?? 28;
    return svc.base + km * svc.perKm;
  }, [service, city]);

  const total = productPricePkr + deliveryCost;
  const selectedSvc = DELIVERY_SERVICES.find((s) => s.id === service)!;

  const reset = () => {
    setStep("form");
    setSubmitting(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const submitOrder = async () => {
    if (!currentUser?.uid) {
      toast.error("Firebase login required to place a sample order.");
      return;
    }
    if (!founderId) {
      toast.error("Could not resolve founder account for this idea.");
      return;
    }

    setSubmitting(true);
    try {
      await placeSampleOrder({
        investorId: currentUser.uid,
        founderId,
        productName,
        quantity: Math.max(1, quantity),
        price: productPricePkr,
        ideaId,
        startupTitle,
        investorName,
        address,
        city,
        phone,
        deliveryService: service,
        deliveryServiceLabel: selectedSvc.label,
        deliveryCostPkr: deliveryCost,
        notes,
      });

      onOrderPlaced({
        ideaId,
        startupTitle,
        productName,
        investorName,
        address,
        city,
        phone,
        deliveryService: service,
        deliveryServiceLabel: selectedSvc.label,
        deliveryCostPkr: deliveryCost,
        productPricePkr,
        notes,
      });
      setStep("done");
    } catch (err) {
      console.error(err);
      toast.error("Failed to place sample order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-hidden rounded-2xl border-orange-200 p-0 gap-0">
        <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 px-6 py-5 text-white">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/20 blur-xl" />
          <DialogHeader className="relative text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/25 backdrop-blur-sm">
                <Sun className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-white">Order Sample Product</DialogTitle>
                <DialogDescription className="text-orange-50 text-xs">
                  {productName} · {startupTitle}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-6">
          {step === "form" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> Delivery Address</Label>
                <Textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House/flat, street, area…"
                  rows={2}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">City</Label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    {Object.keys(CITY_KM).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03XX…" className="mt-1 rounded-xl" />
                </div>
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1"><Truck className="h-3 w-3" /> Delivery Service</Label>
                <div className="mt-2 grid gap-2">
                  {DELIVERY_SERVICES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setService(s.id)}
                      className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                        service === s.id
                          ? "border-orange-400 bg-orange-50 ring-2 ring-orange-200"
                          : "border-slate-200 hover:border-orange-200"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900">{s.label}</p>
                        <p className="text-[10px] text-slate-500">{s.sub}</p>
                        <p className="text-[9px] text-orange-600 mt-0.5">API: {s.api}</p>
                      </div>
                      <p className="text-xs font-black text-orange-700">
                        {formatPkr(s.base + (CITY_KM[city] ?? 28) * s.perKm)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs">Special delivery notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gate code, timing…" className="mt-1 rounded-xl" />
              </div>
              <div className="rounded-xl border border-orange-200 bg-orange-50/80 p-4">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Product</span><span className="font-bold">{formatPkr(productPricePkr)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>Delivery ({selectedSvc.label})</span><span className="font-bold">{formatPkr(deliveryCost)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-orange-200 pt-2">
                  <span className="text-sm font-bold text-orange-900">Total (affordable)</span>
                  <span className="font-display text-lg font-black text-orange-700">{formatPkr(total)}</span>
                </div>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="py-6 text-center animate-in zoom-in duration-300">
              <CheckCircle2 className="mx-auto h-14 w-14 text-orange-500 mb-3" />
              <p className="font-display text-lg font-bold text-slate-900">Sample Order Placed!</p>
              <p className="text-xs text-slate-500 mt-2">Track in Payment Desk → Sample Orders (Approved → Packed → Sent)</p>
            </div>
          )}
        </div>

        {step === "form" && (
          <div className="border-t border-orange-100 bg-white px-6 py-4 flex gap-2">
            <Button variant="outline" onClick={() => handleClose(false)} className="rounded-xl flex-1">Cancel</Button>
            <Button
              onClick={() => setStep("confirm")}
              disabled={!address.trim() || phone.replace(/\D/g, "").length < 10}
              className="rounded-xl flex-1 bg-orange-500 hover:bg-orange-600"
            >
              Review Order
            </Button>
          </div>
        )}

        {step === "confirm" && (
          <div className="border-t border-orange-100 bg-white px-6 py-4 space-y-3">
            <p className="text-xs text-slate-600">Confirm delivery to <strong>{address}, {city}</strong> via {selectedSvc.label}?</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("form")} className="rounded-xl flex-1">Back</Button>
              <Button onClick={submitOrder} disabled={submitting} className="rounded-xl flex-1 bg-orange-500 hover:bg-orange-600">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Package className="mr-1.5 h-4 w-4" /> Place Order</>}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="border-t px-6 py-4">
            <Button onClick={() => handleClose(false)} className="w-full rounded-xl bg-orange-500">Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
