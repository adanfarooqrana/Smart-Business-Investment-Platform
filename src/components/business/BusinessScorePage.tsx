import { PayoutAccountDialog } from "@/components/marketplace/PayoutAccountDialog";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Gauge,
  Globe,
  Sparkles,
  ExternalLink,
  Trash2,
  Plus,
  Loader2,
} from "lucide-react";
import { useAppState } from "@/hooks/useAppState";
import { useBusinessSession } from "@/hooks/useBusinessSession";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { CloudinaryImageField } from "@/components/ui/CloudinaryImageField";
import { ProductImageSlots } from "@/components/business/ProductImageSlots";
import { updateBusinessScore } from "@/services/firebaseService";
import { GeminiService } from "@/services/geminiService";
import {
  BusinessOwnerService,
  type CanonicalProduct,
  type WebsiteSettings,
} from "@/services/businessOwnerService";
import { db } from "@/firebase";
import { onValue, ref } from "firebase/database";
import { toast } from "sonner";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/firebase";
import { KycPendingGate } from "@/components/kyc/KycPendingGate";
import { useKycApprovalGate } from "@/hooks/useKycApprovalGate";
import { extractIndustryCategory } from "@/lib/industryAssets";

function landingTemplateForIndustry(category: string): string {
  switch (category) {
    case "bakery":
      return "bakery-sweet";
    case "cafe":
      return "cafe-modern";
    case "fast_food":
      return "bistro-gourmet";
    case "clothing":
    case "footwear":
    case "jewelry":
      return "retail-boutique";
    case "grocery":
      return "retail-green";
    case "electronics":
    case "manufacturing":
      return "saas-minimal";
    case "beauty":
      return "agency-creative";
    default:
      return "cafe-modern";
  }
}

type ProductForm = {
  id: string;
  name: string;
  description: string;
  sale_price: number;
  real_price: number;
  /** MRP / list price before discount (storefront strikethrough) */
  original_price: number;
  quantity: number;
  /** Up to 3 Cloudinary URLs (slot-indexed; empty string = vacant slot) */
  imageUrls: string[];
  /** Alias kept in sync with imageUrls for RTDB consumers */
  images: string[];
};

/** Pad/trim to exactly 3 slot strings for the upload UI. */
function toImageSlots(
  imageUrls?: string[] | null,
  images?: string[] | null,
  productImageUrl?: string | null,
  image_url?: string | null,
): string[] {
  const fromArrays = [
    ...(Array.isArray(imageUrls) ? imageUrls : []),
    ...(Array.isArray(images) ? images : []),
  ]
    .map((u) => String(u || "").trim())
    .filter(Boolean);
  const legacy = String(productImageUrl || image_url || "").trim();
  const merged =
    legacy && !fromArrays.includes(legacy) ? [legacy, ...fromArrays] : fromArrays;
  const unique = [...new Set(merged)].slice(0, 3);
  return [unique[0] || "", unique[1] || "", unique[2] || ""];
}

const emptyNewProduct = (): Omit<ProductForm, "id"> => ({
  name: "",
  description: "",
  sale_price: 0,
  real_price: 0,
  original_price: 0,
  quantity: 50,
  imageUrls: ["", "", ""],
  images: ["", "", ""],
});

function normalizeProduct(key: string, raw: any): ProductForm {
  const sale = Number(raw?.sale_price ?? raw?.price ?? 0) || 0;
  const real = Number(raw?.real_price ?? raw?.product_cost ?? Math.round(sale * 0.4)) || 0;
  const original = Number(raw?.original_price ?? sale) || sale;
  const imageUrls = toImageSlots(
    raw?.imageUrls,
    raw?.images,
    raw?.productImageUrl,
    raw?.image_url,
  );
  return {
    id: raw?.id || key,
    name: String(raw?.name || ""),
    description: String(raw?.description || ""),
    sale_price: sale,
    real_price: real,
    original_price: original,
    quantity: Number(raw?.quantity ?? 50) || 50,
    imageUrls,
    images: imageUrls,
  };
}

function compactImageUrls(slots: string[]): string[] {
  return slots.map((u) => String(u || "").trim()).filter(Boolean).slice(0, 3);
}

export function BusinessScorePage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { sessionReady, isBusinessRegistered } = useBusinessSession();
  const {
    business,
    createLandingPage,
    updateBusinessProfile,
  } = useAppState();

  const [saving, setSaving] = useState(false);
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerDescription, setBannerDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [products, setProducts] = useState<ProductForm[]>([]);
  const [savingBanner, setSavingBanner] = useState(false);
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState(emptyNewProduct());

  const uid = currentUser?.uid ?? business.uid;
  const { ready: kycReady, blocked: kycBlocked } = useKycApprovalGate(uid);
  const [isLoading, setIsLoading] = useState(true);
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings | null>(null);
  const [promptInput, setPromptInput] = useState(
    business.landingPageAbout || business.about || "",
  );
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setPromptInput(business.landingPageAbout || business.about || "");
  }, [business.landingPageAbout, business.about]);

  // Real-time bind: website_settings + products (loading guard prevents flicker)
  useEffect(() => {
    if (!uid) {
      setIsLoading(false);
      setWebsiteSettings(null);
      return;
    }

    setIsLoading(true);
    const settingsRef = ref(db, `business_owners/${uid}/website_settings`);
    const productsRef = ref(db, `business_owners/${uid}/products`);

    const unsubSettings = onValue(
      settingsRef,
      (snap) => {
        if (!snap.exists()) {
          setWebsiteSettings(null);
          setBannerTitle("");
          setBannerDescription("");
          setLogoUrl("");
          setBannerImageUrl("");
        } else {
          const val = snap.val() as WebsiteSettings;
          setWebsiteSettings(val);
          setBannerTitle(String(val.banner_title || ""));
          setBannerDescription(String(val.banner_description || ""));
          setLogoUrl(String(val.logo_url || ""));
          setBannerImageUrl(String(val.banner_image_url || ""));
        }
        setIsLoading(false);
      },
      (err) => {
        console.error("website_settings listener error:", err);
        setIsLoading(false);
      },
    );

    const unsubProducts = onValue(productsRef, (snap) => {
      if (!snap.exists()) {
        setProducts([]);
        return;
      }
      const val = snap.val();
      const list = Object.keys(val)
        .sort((a, b) => {
          const na = Number(/^prod_(\d+)$/i.exec(a)?.[1] || 0);
          const nb = Number(/^prod_(\d+)$/i.exec(b)?.[1] || 0);
          return na - nb;
        })
        .map((key) => normalizeProduct(key, val[key]));
      setProducts(list);
    });

    return () => {
      unsubSettings();
      unsubProducts();
    };
  }, [uid]);

  const isWebsiteCreated = Boolean(
    websiteSettings?.isWebsiteCreated === true ||
      // Legacy accounts finalized before the explicit flag existed
      (websiteSettings?.isWebsiteCreated !== false &&
        Boolean(
          websiteSettings?.subdomain ||
            business.subdomain ||
            business.landingPageCreated,
        )),
  );

  const landingSlug = useMemo(
    () =>
      (business.name || "my-business")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "my-business",
    [business.name],
  );

  const syncToFirebase = async (score: number) => {
    if (!uid) return;
    try {
      await updateBusinessScore(uid, score);
    } catch (err) {
      console.warn("Score sync skipped:", err);
    }
  };

  const handleGenerateGrokWebsite = async () => {
    const businessName = business.name || "My Business";
    if (!uid) {
      alert("User not logged in.");
      return;
    }
    if (!promptInput.trim()) {
      alert("Please describe your business before generating.");
      return;
    }

    setIsGenerating(true);
    setSaving(true);
    try {
      const res = await GeminiService.generateWebsiteFromPrompt(
        uid,
        businessName,
        promptInput.trim(),
      );
      if (res.success && res.subdomain) {
        const industry = extractIndustryCategory(promptInput.trim(), businessName);
        const landingTemplate = landingTemplateForIndustry(industry);
        createLandingPage(landingTemplate, promptInput.trim());
        updateBusinessProfile({
          landingPageCreated: true,
          landingPageTemplate: landingTemplate,
          landingPageAbout: promptInput.trim(),
          subdomain: res.subdomain,
          website: `https://${res.subdomain}.smartbiz.com`,
        } as any);

        await syncToFirebase(business.score);
        alert("Website generated successfully!");
      }
    } catch (err: any) {
      alert(err.message || "Failed to generate website.");
    } finally {
      setIsGenerating(false);
      setSaving(false);
    }
  };

  const handleSaveBanner = async () => {
    if (!uid) return;
    if (!logoUrl.trim() && !bannerImageUrl.trim()) {
      toast.error("Upload a logo or banner image first.");
      return;
    }
    setSavingBanner(true);
    try {
      const settings: Partial<WebsiteSettings> = {
        banner_title: bannerTitle,
        banner_description: bannerDescription,
        logo_url: logoUrl.trim(),
        banner_image_url: bannerImageUrl.trim(),
      };
      await BusinessOwnerService.updateWebsiteSettings(uid, settings);

      // Mirror Cloudinary URLs onto Firestore business profile
      await setDoc(
        doc(firestore, "business_owners", uid),
        {
          bannerUrl: bannerImageUrl.trim() || null,
          logoUrl: logoUrl.trim() || null,
          banner_title: bannerTitle,
          banner_description: bannerDescription,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      toast.success("Website settings saved with Cloudinary images.");
    } catch (err: any) {
      alert(err.message || "Failed to save banner settings.");
    } finally {
      setSavingBanner(false);
    }
  };

  const updateLocalProduct = (id: string, field: keyof ProductForm, value: string | number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  const updateLocalProductImageSlot = (id: string, slotIndex: number, imageUrl: string) => {
    setProducts((prev) =>
      prev.map((product) => {
        if (product.id !== id) return product;
        const next = [...(product.imageUrls?.length ? product.imageUrls : product.images)];
        while (next.length < 3) next.push("");
        next[slotIndex] = imageUrl;
        const slots = next.slice(0, 3);
        return { ...product, imageUrls: slots, images: slots };
      }),
    );
  };

  const handleSaveProduct = async (product: ProductForm) => {
    if (!uid) return;
    setSavingProductId(product.id);
    try {
      const imageUrls = compactImageUrls(product.imageUrls?.length ? product.imageUrls : product.images);
      const productImageUrl = imageUrls[0] || "";
      const payload: Partial<CanonicalProduct> = {
        name: product.name,
        description: product.description,
        sale_price: Number(product.sale_price) || 0,
        real_price: Number(product.real_price) || 0,
        original_price: Number(product.original_price) || Number(product.sale_price) || 0,
        quantity: Number(product.quantity) || 0,
        images: imageUrls,
        imageUrls,
        productImageUrl,
      };
      await BusinessOwnerService.updateProduct(uid, product.id, payload);

      await setDoc(
        doc(firestore, "business_owners", uid, "products", product.id),
        {
          ...payload,
          imageUrls,
          productImageUrl: productImageUrl || null,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      toast.success("Product saved.");
    } catch (err: any) {
      alert(err.message || "Failed to save product.");
    } finally {
      setSavingProductId(null);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!uid) return;
    if (!confirm("Delete this product from your catalog?")) return;
    try {
      await BusinessOwnerService.deleteProduct(uid, productId);
    } catch (err: any) {
      alert(err.message || "Failed to delete product.");
    }
  };

  const handleAddProduct = async () => {
    if (!uid) return;
    if (!newProduct.name.trim()) {
      alert("Enter a product name.");
      return;
    }
    setAddingProduct(true);
    try {
      const imageUrls = compactImageUrls(
        newProduct.imageUrls?.length ? newProduct.imageUrls : newProduct.images,
      );
      const productId = await BusinessOwnerService.addProduct(uid, {
        name: newProduct.name,
        description: newProduct.description,
        sale_price: Number(newProduct.sale_price) || 0,
        real_price: Number(newProduct.real_price) || 0,
        original_price: Number(newProduct.original_price) || Number(newProduct.sale_price) || 0,
        quantity: Number(newProduct.quantity) || 50,
        images: imageUrls,
        imageUrls,
        productImageUrl: imageUrls[0] || "",
      });

      await setDoc(
        doc(firestore, "business_owners", uid, "products", productId),
        {
          id: productId,
          name: newProduct.name.trim(),
          description: newProduct.description.trim(),
          sale_price: Number(newProduct.sale_price) || 0,
          real_price: Number(newProduct.real_price) || 0,
          original_price: Number(newProduct.original_price) || Number(newProduct.sale_price) || 0,
          quantity: Number(newProduct.quantity) || 50,
          images: imageUrls,
          imageUrls,
          productImageUrl: imageUrls[0] || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setNewProduct(emptyNewProduct());
      toast.success("Product added to catalog.");
    } catch (err: any) {
      alert(err.message || "Failed to add product.");
    } finally {
      setAddingProduct(false);
    }
  };

  if (!sessionReady) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-amber-600 animate-pulse font-semibold">Loading Business Dashboard...</p>
      </div>
    );
  }

  if (!isBusinessRegistered) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <Gauge className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-900">Business workspace required</h2>
        <p className="text-sm text-slate-500 max-w-md">
          Register as a business owner to unlock reputation score, AI website, and growth tools.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate({ to: "/app/register" })}>
            Sign Up
          </Button>
          <Button onClick={() => navigate({ to: "/app/login" })}>Sign In</Button>
        </div>
      </div>
    );
  }

  if (!kycReady) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        <p className="text-sm text-muted-foreground">Checking admin approval…</p>
      </div>
    );
  }

  if (kycBlocked && uid) {
    return (
      <KycPendingGate
        uid={uid}
        role="business_owner"
        email={business?.email || currentUser?.email || ""}
        approvedPath="/app/score"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8 text-center">
        <p className="text-sm text-slate-500 animate-pulse font-semibold">Loading your workspace...</p>
      </div>
    );
  }

  const subdomainName =
    websiteSettings?.subdomain || business.subdomain || landingSlug;
  const liveUrl = websiteSettings?.publishedUrl
    ? websiteSettings.publishedUrl.startsWith("http")
      ? websiteSettings.publishedUrl
      : `${window.location.origin}${websiteSettings.publishedUrl}`
    : `${window.location.origin}/site/${subdomainName}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/40 via-white to-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-6">
        {/* Header — Visit Website only when storefront already created */}
        <div className="rounded-3xl border border-slate-200 bg-slate-900 px-6 py-5 md:px-8 md:py-6 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-700/80 border border-slate-600">
              <Globe className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <h2 className="font-display text-lg font-extrabold text-white">
                Manage Your Website Workspace
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Customize your micro-landing page storefront and manage products.
              </p>
            </div>
          </div>
          {isWebsiteCreated && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 transition-colors shadow-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Visit Website
            </a>
          )}
        </div>

        <div className="flex justify-end"><PayoutAccountDialog /></div>

        {!isWebsiteCreated ? (
          /* NEW USER — Grok AI prompt only */
          <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-5">
            <div>
              <h3 className="font-display text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-orange-500" />
                Build Your Storefront with Grok AI
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Describe your business and design (background, theme color, text color, font). AI builds the storefront from your prompt.
              </p>
            </div>
            <textarea
              className="flex min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:border-orange-400 transition-all resize-y"
              rows={4}
              placeholder='e.g., Organic coffee shop in Lahore. Black background, white text, orange theme color, modern font.'
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
            />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-xs text-orange-600 leading-relaxed max-w-lg">
                Tip: mention background color, text color, theme/accent color, and font (modern / elegant / bold / classic / tech / friendly).
              </p>
              <Button
                onClick={() => void handleGenerateGrokWebsite()}
                disabled={isGenerating || saving || !promptInput.trim()}
                className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl px-6 py-2.5 shadow-md disabled:opacity-50"
              >
                {isGenerating || saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-75" />
                    </svg>
                    Generating Website...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Generate Website with Grok AI
                  </span>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* RETURNING USER — cover form + product catalog */
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-6 md:px-8 md:py-8 space-y-6 bg-slate-50/50">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white text-sm font-extrabold">
                    C
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-extrabold text-slate-900">
                      Website Top Cover Page
                    </h3>
                    <p className="text-xs text-slate-500">
                      Edit logo, banner text, and cover photo synced from website_settings.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Banner Title
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
                      value={bannerTitle}
                      onChange={(e) => setBannerTitle(e.target.value)}
                      placeholder="Welcome to Our Store"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Banner Description
                    </label>
                    <textarea
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 resize-none"
                      rows={2}
                      value={bannerDescription}
                      onChange={(e) => setBannerDescription(e.target.value)}
                      placeholder="Short storefront intro..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <CloudinaryImageField
                      label="Business Logo"
                      folder="business_logos"
                      value={logoUrl}
                      onUploaded={setLogoUrl}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <CloudinaryImageField
                      label="Banner / Cover Photo"
                      folder="business_banners"
                      value={bannerImageUrl}
                      onUploaded={setBannerImageUrl}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveBanner}
                    disabled={savingBanner}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-full px-5"
                  >
                    {savingBanner ? "Saving..." : "Save Website Settings"}
                  </Button>
                </div>
              </div>

              {/* Product Catalog Section */}
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white text-sm font-extrabold">
                      B
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-extrabold text-slate-900">
                        Product Catalog & Assets
                      </h3>
                    </div>
                  </div>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-bold text-amber-700">
                    Active Slots: {products.length} / 20 Max
                  </span>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((slot) => (
                    <div
                      key={slot.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 transition-all hover:shadow-md hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Product Name
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                            {slot.id}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(slot.id)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                            title="Delete product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all"
                        placeholder="e.g. Chocolate Fudge Cake"
                        value={slot.name}
                        onChange={(e) => updateLocalProduct(slot.id, "name", e.target.value)}
                      />

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1.5 block">
                          Short Description
                        </label>
                        <textarea
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all resize-none"
                          rows={2}
                          placeholder="Brief product description..."
                          value={slot.description}
                          onChange={(e) =>
                            updateLocalProduct(slot.id, "description", e.target.value)
                          }
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                            Original
                          </label>
                          <input
                            type="number"
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                            value={slot.original_price}
                            onChange={(e) =>
                              updateLocalProduct(slot.id, "original_price", Number(e.target.value))
                            }
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                            Sale
                          </label>
                          <input
                            type="number"
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                            value={slot.sale_price}
                            onChange={(e) =>
                              updateLocalProduct(slot.id, "sale_price", Number(e.target.value))
                            }
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                            Cost
                          </label>
                          <input
                            type="number"
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                            value={slot.real_price}
                            onChange={(e) =>
                              updateLocalProduct(slot.id, "real_price", Number(e.target.value))
                            }
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                            Qty
                          </label>
                          <input
                            type="number"
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                            value={slot.quantity}
                            onChange={(e) =>
                              updateLocalProduct(slot.id, "quantity", Number(e.target.value))
                            }
                          />
                        </div>
                      </div>

                      <ProductImageSlots
                        images={slot.imageUrls?.length ? slot.imageUrls : slot.images}
                        onSlotUploaded={(index, url) =>
                          updateLocalProductImageSlot(slot.id, index, url)
                        }
                        disabled={savingProductId === slot.id}
                      />

                      <Button
                        onClick={() => handleSaveProduct(slot)}
                        disabled={savingProductId === slot.id}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl"
                      >
                        {savingProductId === slot.id ? "Saving..." : "Save Product"}
                      </Button>
                    </div>
                  ))}

                  {products.length < 20 && (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 p-5 space-y-3 min-h-[200px]">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Plus className="h-5 w-5" />
                        <span className="text-xs font-bold uppercase tracking-wider">Add Product</span>
                      </div>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Product name"
                        value={newProduct.name}
                        onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
                      />
                      <textarea
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none"
                        rows={2}
                        placeholder="Description"
                        value={newProduct.description}
                        onChange={(e) =>
                          setNewProduct((p) => ({ ...p, description: e.target.value }))
                        }
                      />
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <input
                          type="number"
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                          placeholder="Original"
                          value={newProduct.original_price || ""}
                          onChange={(e) =>
                            setNewProduct((p) => ({
                              ...p,
                              original_price: Number(e.target.value) || 0,
                            }))
                          }
                        />
                        <input
                          type="number"
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                          placeholder="Sale"
                          value={newProduct.sale_price || ""}
                          onChange={(e) =>
                            setNewProduct((p) => ({
                              ...p,
                              sale_price: Number(e.target.value) || 0,
                            }))
                          }
                        />
                        <input
                          type="number"
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                          placeholder="Cost"
                          value={newProduct.real_price || ""}
                          onChange={(e) =>
                            setNewProduct((p) => ({
                              ...p,
                              real_price: Number(e.target.value) || 0,
                            }))
                          }
                        />
                        <input
                          type="number"
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                          placeholder="Qty"
                          value={newProduct.quantity}
                          onChange={(e) =>
                            setNewProduct((p) => ({
                              ...p,
                              quantity: Number(e.target.value) || 50,
                            }))
                          }
                        />
                      </div>
                      <ProductImageSlots
                        images={newProduct.imageUrls}
                        onSlotUploaded={(index, url) =>
                          setNewProduct((product) => {
                            const next = [...product.imageUrls];
                            while (next.length < 3) next.push("");
                            next[index] = url;
                            const slots = next.slice(0, 3);
                            return { ...product, imageUrls: slots, images: slots };
                          })
                        }
                        disabled={addingProduct}
                      />
                      <Button
                        onClick={handleAddProduct}
                        disabled={addingProduct}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl"
                      >
                        {addingProduct ? "Adding..." : "Add to Catalog"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
