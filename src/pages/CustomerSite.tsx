import React, { useState, useEffect, useMemo } from "react";
import { db } from "../firebase";
import { ref, get, onValue } from "firebase/database";
import { BusinessOwnerService } from "../services/businessOwnerService";
import {
  Loader2,
  ShoppingBag,
  X,
  User,
  Mail,
  MapPin,
  CheckCircle,
  Minus,
  Plus,
  Star,
  MessageSquare,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  sale_price: number;
  real_price: number;
  quantity: number;
  images: string[];
  reviews: Record<string, ProductReview>;
  /** legacy fallbacks */
  price?: number;
  image_url?: string;
  product_cost?: number;
}

interface ProductReview {
  customer_name: string;
  rating: number;
  review_text: string;
  timestamp: number;
}

interface CustomerSiteProps {
  subdomain?: string;
}

function normalizeProduct(key: string, raw: any): Product {
  const sale = Number(raw?.sale_price ?? raw?.price ?? 0) || 0;
  const real = Number(raw?.real_price ?? raw?.product_cost ?? Math.round(sale * 0.4)) || 0;
  const images: string[] = Array.isArray(raw?.images) && raw.images.length
    ? raw.images.filter(Boolean)
    : raw?.image_url
      ? [raw.image_url]
      : [];
  return {
    id: raw?.id || key,
    name: String(raw?.name || "Product"),
    description: String(raw?.description || ""),
    sale_price: sale,
    real_price: real,
    quantity: Number(raw?.quantity ?? 50) || 50,
    images,
    reviews: raw?.reviews && typeof raw.reviews === "object" ? raw.reviews : {},
    price: raw?.price,
    image_url: raw?.image_url,
    product_cost: raw?.product_cost,
  };
}

export default function CustomerSite({ subdomain: propSubdomain }: CustomerSiteProps) {
  const [loading, setLoading] = useState(true);
  const [ownerUid, setOwnerUid] = useState<string | null>(null);
  const [websiteSettings, setWebsiteSettings] = useState<any>({
    theme_color: "#d97706",
    banner_title: "Welcome to Our Store",
    banner_description: "Premium products curated just for you.",
    banner_image_url: "",
    logo_url: "",
  });
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [businessName, setBusinessName] = useState("");

  // Detail / checkout modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedQty, setSelectedQty] = useState(1);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [checkoutAddress, setCheckoutAddress] = useState("");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Product-specific review form
  const [reviewOrderId, setReviewOrderId] = useState("");
  const [reviewName, setReviewName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const subdomain = propSubdomain || (() => {
    if (typeof window === "undefined") return undefined;
    const parts = window.location.pathname.split("/site/");
    if (parts.length > 1) return parts[1].split("/")[0].split("?")[0];
    return undefined;
  })();

  useEffect(() => {
    if (!subdomain) {
      console.warn("CustomerSite: No subdomain provided.");
      setLoading(false);
      return;
    }

    let unsubSettings: (() => void) | undefined;
    let unsubProducts: (() => void) | undefined;
    let unsubProfile: (() => void) | undefined;

    const loadSiteData = async () => {
      setLoading(true);
      try {
        const subdomainRef = ref(db, `subdomains/${subdomain}`);
        const subSnap = await get(subdomainRef);

        if (!subSnap.exists()) {
          setLoading(false);
          return;
        }

        const uid = subSnap.val().owner_uid;
        setOwnerUid(uid);

        unsubSettings = onValue(ref(db, `business_owners/${uid}/website_settings`), (snap) => {
          if (snap.exists()) setWebsiteSettings(snap.val());
        });

        unsubProducts = onValue(ref(db, `business_owners/${uid}/products`), (snap) => {
          if (!snap.exists()) {
            setProducts({});
            return;
          }
          const val = snap.val();
          const mapped: Record<string, Product> = {};
          Object.keys(val).forEach((key) => {
            mapped[key] = normalizeProduct(key, val[key]);
          });
          setProducts(mapped);
        });

        unsubProfile = onValue(ref(db, `business_owners/${uid}/profile`), (snap) => {
          if (snap.exists()) {
            setBusinessName(snap.val().businessName || "Our Shop");
          }
        });

        await BusinessOwnerService.recordStorefrontVisit(uid);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load customer site data:", err);
        setLoading(false);
      }
    };

    loadSiteData();

    return () => {
      unsubSettings?.();
      unsubProducts?.();
      unsubProfile?.();
    };
  }, [subdomain]);

  const lineTotal = useMemo(() => {
    if (!selectedProduct) return 0;
    return selectedProduct.sale_price * selectedQty;
  }, [selectedProduct, selectedQty]);

  const openProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setSelectedQty(1);
    setActiveImageIdx(0);
    setOrderPlaced(false);
    setPlacedOrderId(null);
    setReviewSuccess(false);
  };

  useEffect(() => {
    if (!selectedProduct) return;
    const refreshedProduct = products[selectedProduct.id];
    if (refreshedProduct) setSelectedProduct(refreshedProduct);
  }, [products, selectedProduct]);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerUid || !selectedProduct) return;

    if (!checkoutName || !checkoutEmail || !checkoutAddress || !checkoutPhone) {
      alert("Please fill in all details.");
      return;
    }

    if (selectedQty < 1 || selectedQty > selectedProduct.quantity) {
      alert(`Quantity must be between 1 and ${selectedProduct.quantity}.`);
      return;
    }

    setSubmittingOrder(true);
    try {
      const unitPrice = selectedProduct.sale_price;
      const unitCost = selectedProduct.real_price;
      const orderData = {
        customer_name: checkoutName,
        customer_email: checkoutEmail,
        customer_phone: checkoutPhone,
        address: checkoutAddress,
        total_amount: unitPrice * selectedQty,
        items: {
          item_1: {
            product_id: selectedProduct.id,
            name: selectedProduct.name,
            price: unitPrice,
            real_price: unitCost,
            quantity: selectedQty,
          }
        }
      };

      const orderId = await BusinessOwnerService.createCustomerOrder(ownerUid, orderData);
      setPlacedOrderId(orderId);
      setOrderPlaced(true);
    } catch (err: any) {
      alert(err.message || "Failed to place order. Please try again.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  const closeCheckout = () => {
    setSelectedProduct(null);
    setOrderPlaced(false);
    setPlacedOrderId(null);
    setSelectedQty(1);
    setCheckoutName("");
    setCheckoutEmail("");
    setCheckoutAddress("");
    setCheckoutPhone("");
    setReviewOrderId("");
    setReviewName("");
    setReviewText("");
    setReviewSuccess(false);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerUid || !selectedProduct) return;
    if (!reviewOrderId.trim() || !reviewText.trim()) {
      alert("Enter the delivered Order ID and review text.");
      return;
    }
    setSubmittingReview(true);
    setReviewSuccess(false);
    try {
      await BusinessOwnerService.submitDeliveredProductReview(
        ownerUid,
        selectedProduct.id,
        reviewOrderId,
        { name: reviewName || checkoutName || "Customer", rating: reviewRating, text: reviewText }
      );
      setReviewSuccess(true);
      setReviewText("");
      setReviewOrderId("");
    } catch (err: any) {
      alert(err.message || "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#d97706] mx-auto" />
          <p className="text-sm text-slate-500 font-semibold">Loading live storefront...</p>
        </div>
      </div>
    );
  }

  if (!ownerUid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-4xl font-extrabold text-slate-900">404 - Storefront Not Found</h1>
          <p className="text-sm text-slate-500">The subdomain "{subdomain}" is not linked to any registered business in our ecosystem.</p>
          <a
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow hover:opacity-90 transition"
          >
            Back to Ecosystem Home
          </a>
        </div>
      </div>
    );
  }

  const themeColor = websiteSettings.theme_color || "#d97706";

  return (
    <div className="min-h-screen bg-slate-50/30 text-slate-800 flex flex-col pb-20">
      <style>{`
        .btn-theme {
          background-color: ${themeColor};
          color: #ffffff;
        }
        .btn-theme:hover {
          opacity: 0.9;
        }
        .text-theme {
          color: ${themeColor};
        }
        .border-theme {
          border-color: ${themeColor};
        }
        .focus-theme:focus {
          border-color: ${themeColor};
          outline: none;
          box-shadow: 0 0 0 2px ${themeColor}20;
        }
      `}</style>

      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="#home" className="flex items-center gap-2">
            {websiteSettings.logo_url ? (
              <img
                src={websiteSettings.logo_url}
                alt={`${businessName} logo`}
                className="h-9 w-9 rounded-xl object-cover border border-slate-200 shadow-sm"
              />
            ) : (
              <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: themeColor }}>
                {businessName.charAt(0)}
              </div>
            )}
            <span className="text-lg font-black text-slate-900">{businessName}</span>
          </a>
          <div className="flex items-center gap-1 sm:gap-2">
            {[
              { label: "Home", href: "#home" },
              { label: "Shop", href: "#shop" },
              { label: "Products", href: "#products" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-full px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 sm:px-4"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <header id="home" className="w-full bg-slate-900 text-white relative py-20 overflow-hidden scroll-mt-20">
        {websiteSettings.banner_image_url && (
          <div
            className="absolute inset-0 opacity-20 bg-cover bg-center"
            style={{ backgroundImage: `url(${websiteSettings.banner_image_url})` }}
          />
        )}
        <div className="max-w-4xl mx-auto px-6 relative text-center space-y-5">
          <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight text-white drop-shadow-md">
            {websiteSettings.banner_title}
          </h1>
          <p className="text-sm md:text-base text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
            {websiteSettings.banner_description}
          </p>
          <div className="h-1.5 w-24 mx-auto rounded-full" style={{ backgroundColor: themeColor }} />
        </div>
      </header>

      <main id="shop" className="max-w-6xl mx-auto px-6 mt-16 flex-1 w-full space-y-8 scroll-mt-24">
        <div id="products" className="text-center scroll-mt-24">
          <h2 className="text-2xl font-black text-slate-900">Featured Catalog</h2>
          <p className="text-xs text-slate-500 mt-1">Explore our exclusive, premium products.</p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {Object.keys(products).map((key) => {
            const prod = products[key];
            const cover = prod.images[0] || prod.image_url;
            const sortedReviews = Object.entries(prod.reviews).sort(
              ([, a], [, b]) => Number(b.timestamp || 0) - Number(a.timestamp || 0),
            );
            const latestReview = sortedReviews[0]?.[1];
            return (
              <div
                key={key}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between transition hover:shadow-md hover:-translate-y-0.5 duration-200 cursor-pointer"
                onClick={() => openProduct(prod)}
              >
                <div className="h-48 w-full bg-slate-100 overflow-hidden relative">
                  {cover ? (
                    <img src={cover} alt={prod.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-300">
                      <ShoppingBag className="h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3.5 py-1.5 rounded-full text-xs font-black text-slate-900 shadow-sm">
                    Rs. {Number(prod.sale_price).toLocaleString()}
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-black text-slate-900 leading-tight">{prod.name}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 font-medium">
                      {prod.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openProduct(prod);
                    }}
                    className="btn-theme w-full h-10 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-slate-200"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" /> View & Buy
                  </button>

                  {latestReview && (
                    <div
                      className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[10px] font-black text-slate-700">
                          {latestReview.customer_name || "Customer"}
                        </span>
                        <span className="shrink-0 text-[10px] font-bold text-amber-500">
                          {"★".repeat(Number(latestReview.rating) || 0)}
                          {"☆".repeat(Math.max(0, 5 - (Number(latestReview.rating) || 0)))}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-500">
                        {latestReview.review_text}
                      </p>
                      {sortedReviews.length > 1 && (
                        <button
                          type="button"
                          onClick={() => openProduct(prod)}
                          className="mt-2 text-[10px] font-extrabold text-amber-600 hover:underline"
                        >
                          See all reviews
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </main>

      <footer className="mt-16 border-t border-slate-200 bg-slate-950 px-6 py-6 text-center">
        <p className="text-xs font-medium text-slate-400">
          © 2026 {businessName}. All rights reserved.
        </p>
      </footer>

      {/* Product detail, checkout, and inline reviews modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 sticky top-0 bg-white z-10">
              <span className="text-sm font-black text-slate-900">
                {orderPlaced ? "Order Confirmed" : "Product Details"}
              </span>
              <button type="button" onClick={closeCheckout} className="text-slate-400 hover:text-slate-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {orderPlaced ? (
              <div className="p-8 text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Order Placed Successfully!</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Your order for <span className="font-semibold text-slate-800">"{selectedProduct.name}"</span> × {selectedQty} has been sent to the business owner.
                </p>
                {placedOrderId && (
                  <p className="text-xs font-mono font-bold text-slate-800 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                    Order ID: {placedOrderId}
                  </p>
                )}
                <p className="text-[10px] text-slate-400">Save this Order ID to leave a review once delivered.</p>
                <button type="button" onClick={closeCheckout} className="btn-theme px-6 h-10 rounded-xl text-xs font-bold cursor-pointer">
                  Close & Continue
                </button>
              </div>
            ) : (
              <div className="p-6 space-y-7">
                <form onSubmit={handlePlaceOrder} className="space-y-4">
                  {/* Image gallery */}
                  {selectedProduct.images.length > 0 && (
                    <div className="space-y-2">
                      <div className="h-48 w-full rounded-2xl overflow-hidden bg-slate-100">
                        <img
                          src={selectedProduct.images[activeImageIdx] || selectedProduct.images[0]}
                          alt={selectedProduct.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      {selectedProduct.images.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto">
                          {selectedProduct.images.map((img, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveImageIdx(idx)}
                              className={`h-14 w-14 shrink-0 rounded-xl overflow-hidden border-2 ${
                                idx === activeImageIdx ? "border-amber-500" : "border-slate-200"
                              }`}
                            >
                              <img src={img} alt="" className="h-full w-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{selectedProduct.name}</h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{selectedProduct.description}</p>
                      </div>
                      <span className="text-sm font-black text-slate-900 whitespace-nowrap">
                        Rs. {Number(selectedProduct.sale_price).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pieces</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedQty((q) => Math.max(1, q - 1))}
                          className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-sm font-black w-6 text-center">{selectedQty}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedQty((q) => Math.min(selectedProduct.quantity, q + 1))}
                          className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">In stock: {selectedProduct.quantity}</p>
                    <div className="flex justify-between text-xs font-black text-slate-900 pt-2 border-t border-slate-200">
                      <span>Total</span>
                      <span>Rs. {lineTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <User className="h-3 w-3" /> Full Name
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus-theme"
                        placeholder="e.g. Bilal Ahmed"
                        value={checkoutName}
                        onChange={(e) => setCheckoutName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Email Address
                      </label>
                      <input
                        type="email"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus-theme"
                        placeholder="bilal@gmail.com"
                        value={checkoutEmail}
                        onChange={(e) => setCheckoutEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Phone Number
                      </label>
                      <input
                        type="tel"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus-theme"
                        placeholder="+92 300 1234567"
                        value={checkoutPhone}
                        onChange={(e) => setCheckoutPhone(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Shipping Address
                      </label>
                      <textarea
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus-theme resize-none"
                        rows={2}
                        placeholder="House #45, Sector F-10/2, Islamabad"
                        value={checkoutAddress}
                        onChange={(e) => setCheckoutAddress(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingOrder}
                    className="btn-theme w-full h-11 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    {submittingOrder ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing checkout...
                      </>
                    ) : (
                      `Confirm Order · Rs. ${lineTotal.toLocaleString()}`
                    )}
                  </button>
                </form>

                {/* Product-specific reviews rendered inline below checkout */}
                <section className="border-t border-slate-100 pt-6 space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-amber-500" />
                      <h3 className="text-sm font-black text-slate-900">
                        Reviews for {selectedProduct.name}
                      </h3>
                    </div>

                    {Object.keys(selectedProduct.reviews).length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs font-semibold text-slate-400">
                        No reviews yet for this product.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(selectedProduct.reviews)
                          .sort(([, a], [, b]) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
                          .map(([reviewId, review]) => (
                            <div key={reviewId} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-xs font-black text-slate-900">{review.customer_name || "Customer"}</p>
                                  <p className="mt-0.5 text-[10px] text-slate-400">
                                    {review.timestamp ? new Date(review.timestamp).toLocaleDateString() : ""}
                                  </p>
                                </div>
                                <span className="text-xs font-bold text-amber-500">
                                  {"★".repeat(Number(review.rating) || 0)}
                                  {"☆".repeat(Math.max(0, 5 - (Number(review.rating) || 0)))}
                                </span>
                              </div>
                              <p className="mt-2 text-xs leading-relaxed text-slate-600">{review.review_text}</p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <h4 className="text-xs font-black text-slate-900">Review your delivered order</h4>
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                      Enter the Order ID containing this product. Firebase accepts the review only after that order is delivered.
                    </p>

                    {reviewSuccess ? (
                      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs font-semibold text-emerald-700">
                        <CheckCircle className="h-4 w-4" /> Thank you! Your product review was submitted.
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitReview} className="mt-4 space-y-3">
                        <input
                          type="text"
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium focus-theme"
                          placeholder="Delivered Order ID"
                          value={reviewOrderId}
                          onChange={(e) => setReviewOrderId(e.target.value)}
                          required
                        />
                        <input
                          type="text"
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium focus-theme"
                          placeholder="Your name"
                          value={reviewName}
                          onChange={(e) => setReviewName(e.target.value)}
                          required
                        />
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              type="button"
                              onClick={() => setReviewRating(rating)}
                              className="p-0.5"
                              aria-label={`${rating} star rating`}
                            >
                              <Star className={`h-5 w-5 ${rating <= reviewRating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                            </button>
                          ))}
                        </div>
                        <textarea
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium focus-theme resize-none"
                          rows={3}
                          placeholder="Write your product review..."
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                          required
                        />
                        <button
                          type="submit"
                          disabled={submittingReview}
                          className="btn-theme h-10 rounded-xl px-5 text-xs font-bold"
                        >
                          {submittingReview ? "Submitting..." : "Submit Product Review"}
                        </button>
                      </form>
                    )}
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
