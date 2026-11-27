import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  Store,
  Tag,
} from "lucide-react";
import { useAppState, type WholesalerProduct } from "@/hooks/useAppState";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModuleCommunityHub } from "@/components/community/ModuleCommunityHub";
import { ReviewSubmitWidget } from "@/components/ReviewSubmitWidget";
import { KycPendingGate } from "@/components/kyc/KycPendingGate";
import { useKycApprovalGate } from "@/hooks/useKycApprovalGate";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/app/wholesale")({
  component: WholesalePage,
});

/** Demo catalog so business owners always see a working sourcing desk */
const DEMO_SOURCING_CATALOG: WholesalerProduct[] = [
  {
    id: "demo-pack-1",
    name: "Kraft Packaging Boxes (50 pcs)",
    imageUrl: "",
    price: 2500,
    unit: "pack",
    quantity: 200,
    tiers: "10+ packs: 10% off",
  },
  {
    id: "demo-pack-2",
    name: "Bubble Wrap Roll (50m)",
    imageUrl: "",
    price: 1800,
    unit: "roll",
    quantity: 120,
    tiers: "Bulk shipping ready",
  },
  {
    id: "demo-pack-3",
    name: "Branded Stickers Sheet (A4 × 20)",
    imageUrl: "",
    price: 900,
    unit: "sheet-set",
    quantity: 300,
    tiers: "Custom print available",
  },
  {
    id: "demo-pack-4",
    name: "Corrugated Cartons (Medium)",
    imageUrl: "",
    price: 45,
    unit: "piece",
    quantity: 2000,
    tiers: "100+ pieces: PKR 38/pc",
  },
];

function WholesalePage() {
  const { currentUser } = useAuth();
  const {
    consultant,
    business,
    wholesalerProducts,
    wholesaleOrders,
    addWholesalerProduct,
    removeWholesalerProduct,
    addWholesaleOrder,
    verifyWholesaleOrder,
    registerConsultant,
    updateWholesalerProfile,
    isLoggedIn,
    role,
  } = useAppState();

  const [showCommunity, setShowCommunity] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftPrice, setDraftPrice] = useState("");
  const [draftUnit, setDraftUnit] = useState("piece");
  const [orderQty, setOrderQty] = useState<Record<string, string>>({});
  const [seoInput, setSeoInput] = useState("");
  const seoKeywords = consultant.seoKeywords || [];

  const wholesaleUid = String(currentUser?.uid || "").trim();
  const isWholesalerSeller = role === "consultant";
  const isBusinessBuyer = role === "business" || role === "entrepreneur" || role === "guest" || !isLoggedIn;

  const { ready: kycReady, blocked: kycBlocked } = useKycApprovalGate(
    isWholesalerSeller ? wholesaleUid : "",
  );

  // Only wholesaler accounts hydrate a wholesaler profile — never business owners
  useEffect(() => {
    if (!isWholesalerSeller) {
      setLoadingProfile(false);
      return;
    }

    const uid = currentUser?.uid;
    if (!uid || consultant.isRegistered) {
      setLoadingProfile(false);
      return;
    }

    let cancelled = false;
    setLoadingProfile(true);
    const timer = window.setTimeout(() => {
      if (!cancelled) setLoadingProfile(false);
    }, 5000);

    void import("@/services/firebaseService")
      .then(({ getConsultantProfile }) => getConsultantProfile(uid))
      .then((profile) => {
        if (cancelled || !profile) return;
        registerConsultant({
          name: String(profile.name ?? ""),
          shopName: String(profile.shopName ?? profile.businessName ?? ""),
          email: String(profile.email ?? ""),
          phone: String(profile.phone ?? ""),
          specialty: String(profile.specialty ?? "Mobile Accessories"),
          experience: String(profile.experience ?? "National Shipping"),
          location: String(profile.location ?? ""),
          bio: String(profile.bio ?? ""),
          isRegistered: true,
          isApproved: false,
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
  }, [isWholesalerSeller, currentUser?.uid, consultant.isRegistered, registerConsultant]);

  const sourcingCatalog = useMemo(() => {
    if (wholesalerProducts.length > 0) return wholesalerProducts;
    return DEMO_SOURCING_CATALOG;
  }, [wholesalerProducts]);

  const placeBuyerOrder = (product: WholesalerProduct) => {
    const qty = Math.max(1, Number(orderQty[product.id] || 1) || 1);
    const buyerName =
      business?.name ||
      currentUser?.displayName ||
      currentUser?.email ||
      "Business Buyer";
    addWholesaleOrder({
      productName: product.name,
      qty,
      unitPrice: product.price,
      total: product.price * qty,
      customerName: buyerName,
      customerCity: business?.location || "Pakistan",
      shipping: "Standard",
      deliverBy: "3-5 days",
    });
    toast.success(`Order placed: ${qty} × ${product.name}`);
    setOrderQty((prev) => ({ ...prev, [product.id]: "1" }));
  };

  if (showCommunity) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] p-4">
        <ModuleCommunityHub
          onClose={() => setShowCommunity(false)}
          fallbackName={
            isWholesalerSeller
              ? consultant.shopName || consultant.name
              : business?.name || currentUser?.email || "Business Owner"
          }
        />
      </div>
    );
  }

  // ── Business owner / founder / guest: Sourcing Hub (buyer) ──────────────
  if (isBusinessBuyer && !isWholesalerSeller) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] pb-16">
        <Toaster position="top-right" richColors />

        <header className="sticky top-0 z-20 border-b border-amber-200/60 bg-white/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
                  Wholesale Sourcing Hub
                </p>
                <h1 className="font-display text-lg font-bold text-slate-900">
                  Source packaging &amp; supplies
                </h1>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl space-y-6 px-5 py-7">
          <div className="rounded-3xl border border-amber-300/40 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 p-6 text-white shadow-xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
              For business owners
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold">Browse verified wholesale stock</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Order packaging, cartons, and supplies for your storefront. Place a request below —
              wholesalers see it in their orders desk.
            </p>
          </div>

          <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-display font-bold text-slate-900">
              <Package className="mr-1.5 inline h-4 w-4 text-amber-500" />
              Available catalog ({sourcingCatalog.length})
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {sourcingCatalog.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 flex flex-col gap-3"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{p.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      PKR {p.price.toLocaleString()}/{p.unit}
                      {p.tiers ? ` · ${p.tiers}` : ""}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{p.quantity} in stock</p>
                  </div>
                  <div className="mt-auto flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      className="h-9 w-20"
                      value={orderQty[p.id] ?? "1"}
                      onChange={(e) =>
                        setOrderQty((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                    />
                    <Button
                      className="flex-1 bg-amber-500 hover:bg-amber-600"
                      onClick={() => placeBuyerOrder(p)}
                    >
                      <ShoppingCart className="mr-1.5 h-4 w-4" /> Place order
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-display font-bold text-slate-900">
              <ShoppingCart className="mr-1.5 inline h-4 w-4 text-emerald-500" />
              Your recent orders ({wholesaleOrders.length})
            </h3>
            {wholesaleOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No orders yet. Pick a product above to place your first wholesale request.
              </p>
            ) : (
              <div className="space-y-2">
                {wholesaleOrders.map((o) => (
                  <div key={o.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                    <p className="font-semibold">{o.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.qty} units · PKR {o.total.toLocaleString()} · {o.status}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  // ── Wholesaler seller workspace ─────────────────────────────────────────
  if (loadingProfile && !consultant.isRegistered) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        <p className="text-sm text-muted-foreground">Loading wholesaler profile...</p>
      </div>
    );
  }

  if (!kycReady) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        <p className="text-sm text-muted-foreground">Checking admin approval…</p>
      </div>
    );
  }

  if (kycBlocked && wholesaleUid) {
    return (
      <KycPendingGate
        uid={wholesaleUid}
        role="wholesaler"
        email={consultant?.email || currentUser?.email || ""}
        approvedPath="/app/wholesale"
      />
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
                Wholesaler Workspace
              </p>
              <h1 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>{consultant.shopName || consultant.name || "My Wholesale Store"}</span>
                {consultant.shopName && consultant.name && (
                  <span className="text-xs font-normal text-slate-500">({consultant.name})</span>
                )}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-full border-emerald-300 text-emerald-700"
              onClick={() => setShowCommunity(true)}
            >
              <Globe className="mr-1.5 h-4 w-4" /> Community Lounge
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-7">
        <div className="rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Verified Wholesaler Store</p>
            {consultant.name && consultant.shopName && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-amber-200 backdrop-blur-sm">
                Owner: {consultant.name}
              </span>
            )}
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold">
            {consultant.shopName || consultant.name || "Wholesale Store"}
          </h2>
          <p className="mt-1 text-xs font-medium text-cyan-200">
            {consultant.specialty || "Wholesale Supply"}
          </p>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            {consultant.bio || "Products, orders aur community packaging desk — sab ek jagah."}
          </p>
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
              <Input
                placeholder="Product name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
              <Input
                placeholder="Price PKR"
                value={draftPrice}
                onChange={(e) => setDraftPrice(e.target.value)}
              />
              <Button className="bg-amber-500 hover:bg-amber-600" onClick={addProduct}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {wholesalerProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No products yet. Add your catalog above.</p>
              ) : (
                wholesalerProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        PKR {p.price}/{p.unit} &bull; {p.quantity} in stock
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeWholesalerProduct(p.id)}
                      className="text-red-500 hover:text-red-700"
                    >
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
                      {o.customerName} &bull; {o.qty} units &bull; {o.status}
                    </p>
                    {o.status === "done" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 h-7 text-xs"
                        onClick={() => verifyWholesaleOrder(o.id)}
                      >
                        Verify order
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-display font-bold text-slate-900">
            <Tag className="mr-1.5 inline h-4 w-4 text-sky-500" />
            SEO Keywords
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Keywords help customers find you in search (e.g. &quot;screen protector wholesale
            Gujranwala&quot;).
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            <Input
              placeholder="Type keyword + Add"
              value={seoInput}
              onChange={(e) => setSeoInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const kw = seoInput.trim();
                  if (!kw) return;
                  updateWholesalerProfile({
                    seoKeywords: [...seoKeywords, kw],
                  });
                  setSeoInput("");
                }
              }}
              className="max-w-xs"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const kw = seoInput.trim();
                if (!kw) return;
                updateWholesalerProfile({
                  seoKeywords: [...seoKeywords, kw],
                });
                setSeoInput("");
              }}
            >
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {seoKeywords.length === 0 ? (
              <p className="text-sm text-muted-foreground">No SEO keywords yet.</p>
            ) : (
              seoKeywords.map((k, i) => (
                <span
                  key={`${k}-${i}`}
                  className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-medium text-sky-800"
                >
                  {k}
                  <button
                    type="button"
                    className="text-sky-600 hover:text-red-500"
                    onClick={() =>
                      updateWholesalerProfile({
                        seoKeywords: seoKeywords.filter((_, idx) => idx !== i),
                      })
                    }
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
        </section>

        <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-violet-900">
            <Bot className="h-4 w-4" /> Packaging &amp; strategy posts
          </p>
          <p className="mt-1 text-xs text-violet-700">
            Community Lounge mein packaging ideas, prices aur consultant tips share karein — investors
            aur business owners wahan dekhte hain.
          </p>
          <Button
            className="mt-3 rounded-full bg-violet-600 hover:bg-violet-700"
            onClick={() => setShowCommunity(true)}
          >
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
