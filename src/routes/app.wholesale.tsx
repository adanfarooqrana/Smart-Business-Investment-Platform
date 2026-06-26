import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Boxes,
  Globe,
  Package,
  Plus,
  Trash2,
  MapPin,
  ShoppingCart,
  Bot,
  Loader2,
} from "lucide-react";
import { useAppState } from "@/hooks/useAppState";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModuleCommunityHub } from "@/components/community/ModuleCommunityHub";
import { ReviewSubmitWidget } from "@/components/ReviewSubmitWidget";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/app/wholesale")({
  component: WholesalePage,
});

function WholesalePage() {
  const { currentUser } = useAuth();
  const {
    consultant,
    wholesalerProducts,
    wholesaleOrders,
    addWholesalerProduct,
    removeWholesalerProduct,
    verifyWholesaleOrder,
    registerConsultant,
    isLoggedIn,
    role,
  } = useAppState();

  const [showCommunity, setShowCommunity] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftPrice, setDraftPrice] = useState("");
  const [draftUnit, setDraftUnit] = useState("piece");

  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid || consultant.isRegistered) return;

    let cancelled = false;
    setLoadingProfile(true);
    const timer = window.setTimeout(() => {
      if (!cancelled) setLoadingProfile(false);
    }, 8000);

    void import("@/services/firebaseService")
      .then(({ getConsultantProfile }) => getConsultantProfile(uid))
      .then((profile) => {
        if (cancelled || !profile) return;
        registerConsultant({
          name: String(profile.name ?? ""),
          email: String(profile.email ?? ""),
          phone: String(profile.phone ?? ""),
          specialty: String(profile.specialty ?? "Mobile Accessories"),
          experience: String(profile.experience ?? "National Shipping"),
          location: String(profile.location ?? ""),
          bio: String(profile.bio ?? ""),
          isRegistered: true,
          isApproved: true,
        });
      })
      .catch((err) => console.warn("Wholesaler profile hydrate skipped:", err))
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [currentUser?.uid, consultant.isRegistered, registerConsultant]);

  if (showCommunity) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] p-4">
        <ModuleCommunityHub onClose={() => setShowCommunity(false)} fallbackName={consultant.name} />
      </div>
    );
  }

  if (loadingProfile && !consultant.isRegistered) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        <p className="text-sm text-muted-foreground">Loading wholesaler profile...</p>
      </div>
    );
  }

  const addProduct = () => {
    if (!draftName.trim() || !draftPrice.trim()) {
      toast.error("Product name aur price likhein.");
      return;
    }
    addWholesalerProduct({
      name: draftName.trim(),
      price: Number(draftPrice) || 0,
      unit: draftUnit,
      quantity: 100,
      tiers: "Bulk discount available",
      imageUrl: "",
    });
    setDraftName("");
    setDraftPrice("");
    toast.success("Product added — packaging ideas community mein share kar sakte hain.");
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-16">
      <Toaster position="top-right" richColors />

      <header className="sticky top-0 z-20 border-b border-amber-200/60 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Wholesaler Workspace</p>
              <h1 className="font-display text-lg font-bold text-slate-900">{consultant.name || "My Wholesale"}</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-full border-emerald-300 text-emerald-700" onClick={() => setShowCommunity(true)}>
              <Globe className="mr-1.5 h-4 w-4" /> Community Lounge
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-7">
        <div className="rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl">
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Verified Wholesaler</p>
          <h2 className="mt-1 font-display text-2xl font-bold">{consultant.specialty || "Wholesale Supply"}</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">{consultant.bio || "Products, orders aur community packaging desk — sab ek jagah."}</p>
          {consultant.location && (
            <p className="mt-2 flex items-center gap-1 text-xs text-amber-200">
              <MapPin className="h-3.5 w-3.5" /> {consultant.location}
            </p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display font-bold text-slate-900">
                <Package className="mr-1.5 inline h-4 w-4 text-amber-500" />
                Products ({wholesalerProducts.length})
              </h3>
            </div>
            <div className="mb-4 grid gap-2 sm:grid-cols-3">
              <Input placeholder="Product name" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
              <Input placeholder="Price PKR" value={draftPrice} onChange={(e) => setDraftPrice(e.target.value)} />
              <Button className="bg-amber-500 hover:bg-amber-600" onClick={addProduct}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {wholesalerProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No products yet. Add your catalog above.</p>
              ) : (
                wholesalerProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                    <div>
                      <p className="font-semibold text-slate-900">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        PKR {p.price}/{p.unit} &bull; {p.quantity} in stock
                      </p>
                    </div>
                    <button type="button" onClick={() => removeWholesalerProduct(p.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-display font-bold text-slate-900">
              <ShoppingCart className="mr-1.5 inline h-4 w-4 text-emerald-500" />
              Orders ({wholesaleOrders.length})
            </h3>
            <div className="space-y-2">
              {wholesaleOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders yet.</p>
              ) : (
                wholesaleOrders.map((o) => (
                  <div key={o.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                    <p className="font-semibold">{o.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.customerName} &bull; {o.quantity} units &bull; {o.status}
                    </p>
                    {o.status === "pending" && (
                      <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => verifyWholesaleOrder(o.id)}>
                        Verify order
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-violet-900">
            <Bot className="h-4 w-4" /> Packaging &amp; strategy posts
          </p>
          <p className="mt-1 text-xs text-violet-700">
            Community Lounge mein packaging ideas, prices aur consultant tips share karein — investors aur business owners wahan dekhte hain.
          </p>
          <Button className="mt-3 rounded-full bg-violet-600 hover:bg-violet-700" onClick={() => setShowCommunity(true)}>
            Open Community → Packaging tab
          </Button>
        </div>

        {(isLoggedIn && role === "consultant") || consultant.isRegistered ? (
          <ReviewSubmitWidget roleLabel="Wholesaler" />
        ) : null}
      </div>
    </div>
  );
}
