import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAppState, type WholesalerProduct } from "@/hooks/useAppState";
import { useAuth } from "@/contexts/AuthContext";
import {
  Boxes,
  Undo2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  MapPin,
  Search as SearchIcon,
  Tag,
  Factory,
  Layers,
  ShieldCheck,
  Package,
  CheckCircle2,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LocationMapPicker, type PickedLocation } from "@/components/verification/LocationMapPicker";
import { AiProfileBuilder } from "@/components/verification/AiProfileBuilder";
import { CnicFaceVerify, type CnicFaceResult } from "@/components/verification/CnicFaceVerify";

const STEPS = ["Credentials", "Location", "Products", "SEO & Factory", "Materials", "AI Profile", "Verify"];

type Draft = Omit<WholesalerProduct, "id">;

export function WholesalerOnboarding({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const { signupUser, login } = useAuth();
  const { registerConsultant, setWholesalerProducts, updateWholesalerProfile } = useAppState();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", specialty: "Mobile Accessories", experience: "National Shipping", bio: "" });
  // Step 2
  const [loc, setLoc] = useState<PickedLocation | null>(null);
  // Step 3
  const [products, setProducts] = useState<Draft[]>([]);
  const [draft, setDraft] = useState<Draft>({ name: "", imageUrl: "", price: 0, unit: "piece", quantity: 0, tiers: "" });
  const draftImgRef = useRef<HTMLInputElement>(null);
  // Step 4
  const [keywords, setKeywords] = useState<string[]>([]);
  const [kwInput, setKwInput] = useState("");
  const [factoryImages, setFactoryImages] = useState<string[]>([]);
  const factoryRef = useRef<HTMLInputElement>(null);
  // Step 5
  const [materials, setMaterials] = useState<string[]>([]);
  const [matInput, setMatInput] = useState("");
  // Step 6 - bio handled in form.bio
  // Step 7
  const [verify, setVerify] = useState<CnicFaceResult | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const readImg = (file: File | undefined, cb: (v: string) => void) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => cb(r.result as string);
    r.readAsDataURL(file);
  };

  const addProduct = () => {
    if (!draft.name.trim() || !draft.price) return;
    setProducts((p) => [{ ...draft }, ...p]);
    setDraft({ name: "", imageUrl: "", price: 0, unit: "piece", quantity: 0, tiers: "" });
    if (draftImgRef.current) draftImgRef.current.value = "";
  };

  const canNext = () => {
    if (step === 0) return form.fullName && form.email && form.phone && form.password;
    if (step === 1) return !!loc;
    if (step === 2) return products.length > 0;
    if (step === 6) return !!verify;
    return true;
  };

  const finish = async () => {
    setError("");
    setSubmitting(true);

    const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string) =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(
            () => reject(new Error(`${label} — timeout (${Math.round(ms / 1000)}s). Internet ya Firebase check karein.`)),
            ms,
          ),
        ),
      ]);

    const completeLocalSession = () => {
      const seededProducts = products.map((p, i) => ({
        ...p,
        id: `wp-seed-${Date.now()}-${i}`,
      }));
      setWholesalerProducts(seededProducts);
      registerConsultant({
        name: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        specialty: form.specialty,
        experience: form.experience,
        location: loc?.address || "",
        bio: form.bio,
        cnicFront: verify?.cnicFront,
        cnicBack: verify?.cnicBack,
        liveSelfie: verify?.liveSelfie,
        faceMatchScore: verify?.faceMatchScore,
      });
      updateWholesalerProfile({
        lat: loc?.lat,
        lng: loc?.lng,
        mapAddress: loc?.address,
        seoKeywords: keywords,
        factoryImages,
        materials,
        profilePrompt: form.bio,
      });
      navigate({ to: "/app/wholesale" });
    };

    try {
      let user;
      try {
        user = await withTimeout(
          signupUser({
            email: form.email,
            password: form.password,
            name: form.fullName,
            role: "wholesaler",
            profile: {
              specialty: form.specialty,
              experience: form.experience,
              location: loc?.address || "",
              bio: form.bio,
              phone: form.phone,
            },
          }),
          45000,
          "Account signup",
        );
      } catch (signupErr: unknown) {
        const code =
          signupErr && typeof signupErr === "object" && "code" in signupErr
            ? String((signupErr as { code: string }).code)
            : "";
        if (code === "auth/email-already-in-use") {
          user = await withTimeout(login(form.email, form.password), 20000, "Login");
        } else {
          throw signupErr;
        }
      }

      const uid = user.uid;

      // Local profile turant — Firebase sync background mein (upload hang nahi karega)
      completeLocalSession();

      void (async () => {
        try {
          const { saveConsultantProfile, uploadBase64Image } = await import(
            "@/services/firebaseService"
          );

          const uploadIfDataUrl = async (fileName: string, data: string) => {
            if (!data?.startsWith("data:")) return data || "";
            try {
              return await withTimeout(uploadBase64Image(uid, fileName, data), 15000, `Upload ${fileName}`);
            } catch (uploadErr) {
              console.warn(`Wholesaler CNIC upload skipped (${fileName}):`, uploadErr);
              return "";
            }
          };

          let cnicFront = verify?.cnicFront ?? "";
          let cnicBack = verify?.cnicBack ?? "";
          let liveSelfie = verify?.liveSelfie ?? "";
          if (verify) {
            [cnicFront, cnicBack, liveSelfie] = await Promise.all([
              uploadIfDataUrl("cnic-front.jpg", verify.cnicFront),
              uploadIfDataUrl("cnic-back.jpg", verify.cnicBack),
              uploadIfDataUrl("live-selfie.jpg", verify.liveSelfie),
            ]);
          }

          const slimProducts = products.map((p) => ({
            ...p,
            imageUrl: p.imageUrl?.startsWith("data:") ? "" : p.imageUrl || "",
          }));

          await withTimeout(
            saveConsultantProfile(uid, {
              uid,
              name: form.fullName,
              email: form.email,
              phone: form.phone,
              specialty: form.specialty,
              experience: form.experience,
              location: loc?.address || "",
              bio: form.bio,
              cnicFront,
              cnicBack,
              liveSelfie,
              isRegistered: true,
              isApproved: (verify?.faceMatchScore ?? 0) >= 90,
              lat: loc?.lat,
              lng: loc?.lng,
              seoKeywords: keywords,
              factoryImageCount: factoryImages.length,
              materials,
              products: slimProducts,
            } as Parameters<typeof saveConsultantProfile>[1]),
            20000,
            "Profile save",
          );
        } catch (syncErr) {
          console.warn("Wholesaler Firebase profile sync failed — local session active:", syncErr);
        }
      })();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Registration failed. Please try again.";
      if (message.includes("timeout") || message.toLowerCase().includes("network")) {
        completeLocalSession();
        return;
      }
      const code =
        err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
      if (code === "auth/email-already-in-use") {
        setError("Yeh email pehle se registered hai. Sahi password se login karein ya nayi email use karein.");
      } else if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Email pehle se hai lekin password galat hai. Login page se try karein.");
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (submitting) return;
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else void finish();
  };
  const back = () => (step === 0 ? onBack() : setStep((s) => s - 1));

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between border-b border-amber-200/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Wholesaler Registration</p>
            <h2 className="font-display text-lg font-bold">{STEPS[step]}</h2>
          </div>
        </div>
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground" aria-label="Back to journey">
          <Undo2 className="h-4 w-4" />
        </button>
      </div>

      {/* Step dots */}
      <div className="mb-6 flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all ${i === step ? "w-8 bg-amber-500" : i < step ? "w-2 bg-amber-400/60" : "w-2 bg-slate-200"}`}
          />
        ))}
      </div>

      <div className="rounded-3xl border border-amber-200/60 bg-white p-6 shadow-lg shadow-amber-500/5 md:p-8">
        {/* STEP 1 — Credentials */}
        {step === 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <p className="text-xs text-muted-foreground">Yeh aapki wholesaler profile aur login ke liye use hoga.</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Company / Wholesaler Name</Label>
                <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Sterling Wholesale" />
              </div>
              <div className="space-y-1.5">
                <Label>Work Email</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="contact@brand.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+92 3xx xxxxxxxx" />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="••••••••" />
              </div>
              <div className="space-y-1.5">
                <Label>Product Category</Label>
                <select value={form.specialty} onChange={(e) => set("specialty", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option>Mobile Accessories</option>
                  <option>Food &amp; Grocery</option>
                  <option>Garments &amp; Fabric</option>
                  <option>Packaging</option>
                  <option>Electronics</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Delivery Coverage</Label>
                <select value={form.experience} onChange={(e) => set("experience", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option>National Shipping</option>
                  <option>City Only</option>
                  <option>Province Wide</option>
                  <option>International</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — Location */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-600">
              <MapPin className="h-4 w-4" /> Apni business location set karein
            </p>
            <p className="text-xs text-muted-foreground">Yeh location map par mark hogi taake customers aapko search par dhoond saken.</p>
            <LocationMapPicker value={loc} onChange={setLoc} accent="amber" height={260} />
          </div>
        )}

        {/* STEP 3 — Products */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-600">
              <Package className="h-4 w-4" /> Apne products add karein (image, price, quantity)
            </p>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-start gap-3">
                <input ref={draftImgRef} type="file" accept="image/*" className="hidden" onChange={(e) => readImg(e.target.files?.[0], (v) => setDraft((d) => ({ ...d, imageUrl: v })))} />
                <button type="button" onClick={() => draftImgRef.current?.click()} className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-white">
                  {draft.imageUrl ? <img src={draft.imageUrl} alt="" className="h-full w-full object-cover" /> : <Upload className="h-5 w-5 text-slate-400" />}
                </button>
                <div className="grid flex-1 grid-cols-2 gap-2">
                  <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Product name" className="col-span-2" />
                  <Input type="number" value={draft.price || ""} onChange={(e) => setDraft((d) => ({ ...d, price: +e.target.value }))} placeholder="Price (PKR)" />
                  <Input value={draft.unit} onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))} placeholder="Unit (piece/kg)" />
                  <Input type="number" value={draft.quantity || ""} onChange={(e) => setDraft((d) => ({ ...d, quantity: +e.target.value }))} placeholder="Stock quantity" />
                  <Input value={draft.tiers} onChange={(e) => setDraft((d) => ({ ...d, tiers: e.target.value }))} placeholder="Bulk tiers (e.g. 500pcs 5% off)" />
                </div>
              </div>
              <Button type="button" onClick={addProduct} disabled={!draft.name.trim() || !draft.price} className="mt-3 w-full gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white disabled:opacity-50">
                <Plus className="h-4 w-4" /> Add Product
              </Button>
            </div>

            <div className="space-y-2">
              {products.length === 0 && <p className="py-3 text-center text-xs text-slate-400">Abhi koi product add nahi. Kam se kam 1 add karein.</p>}
              {products.map((p, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                    {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-slate-300" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{p.name}</p>
                    <p className="text-[11px] text-slate-500">PKR {p.price}/{p.unit} · stock {p.quantity}{p.tiers ? ` · ${p.tiers}` : ""}</p>
                  </div>
                  <button onClick={() => setProducts((arr) => arr.filter((_, idx) => idx !== i))} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4 — SEO & Factory */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-600">
                <Tag className="h-4 w-4" /> SEO Keywords
              </p>
              <p className="mb-2 text-xs text-muted-foreground">Keywords likhein taake search par aap map pe samne aayein (e.g. "screen protector wholesale gujranwala").</p>
              <div className="flex gap-2">
                <Input value={kwInput} onChange={(e) => setKwInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (kwInput.trim()) { setKeywords((k) => [...k, kwInput.trim()]); setKwInput(""); } } }} placeholder="Type keyword + Enter" />
                <Button type="button" variant="outline" onClick={() => { if (kwInput.trim()) { setKeywords((k) => [...k, kwInput.trim()]); setKwInput(""); } }} className="gap-1"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {keywords.map((k, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                    <SearchIcon className="h-2.5 w-2.5" /> {k}
                    <button onClick={() => setKeywords((arr) => arr.filter((_, idx) => idx !== i))} className="ml-0.5 text-amber-500 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-600">
                <Factory className="h-4 w-4" /> Factory / Workshop Images
              </p>
              <p className="mb-2 text-xs text-muted-foreground">Jahan aap product banate hain uski images — customer aapki profile par dekhega.</p>
              <input ref={factoryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { Array.from(e.target.files || []).forEach((f) => readImg(f, (v) => setFactoryImages((a) => [...a, v]))); }} />
              <div className="grid grid-cols-3 gap-2">
                {factoryImages.map((img, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-xl">
                    <img src={img} alt="" className="h-full w-full object-cover" />
                    <button onClick={() => setFactoryImages((a) => a.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => factoryRef.current?.click()} className="flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-slate-400">
                  <Upload className="h-5 w-5" />
                  <span className="text-[10px]">Add</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5 — Materials */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-600">
              <Layers className="h-4 w-4" /> Raw Materials (Business Calculator ke liye)
            </p>
            <p className="text-xs text-muted-foreground">Aap kon kon se materials use karte hain? Yeh info aapke dashboard ke advanced calculator mein use hogi.</p>
            <div className="flex gap-2">
              <Input value={matInput} onChange={(e) => setMatInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (matInput.trim()) { setMaterials((m) => [...m, matInput.trim()]); setMatInput(""); } } }} placeholder="e.g. Plastic, Glass film, Box — Enter" />
              <Button type="button" variant="outline" onClick={() => { if (matInput.trim()) { setMaterials((m) => [...m, matInput.trim()]); setMatInput(""); } }}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {materials.map((m, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-medium text-orange-700">
                  {m}
                  <button onClick={() => setMaterials((arr) => arr.filter((_, idx) => idx !== i))} className="ml-0.5 text-orange-500 hover:text-red-500">×</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* STEP 6 — AI Profile */}
        {step === 5 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <p className="text-sm font-semibold text-amber-600">Apni profile likhein/bolein — ya skip karke baad mein karein.</p>
            <AiProfileBuilder accent="amber" onGenerate={(bio) => set("bio", bio)} />
            {form.bio && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Generated Profile</p>
                <p className="mt-1 text-sm text-slate-700">{form.bio}</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 7 — Verify */}
        {step === 6 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-600">
              <ShieldCheck className="h-4 w-4" /> Identity Verification
            </p>
            <CnicFaceVerify accent="amber" onComplete={setVerify} />
            {verify && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Verified! Ab aap register kar sakte hain.
              </div>
            )}
          </div>
        )}

        {/* Nav buttons */}
        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="mt-6 flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={back} disabled={submitting} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> {step === 0 ? "Journey" : "Back"}
          </Button>
          <Button
            type="button"
            onClick={next}
            disabled={!canNext() || submitting}
            className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Registering...
              </>
            ) : (
              <>
                {step === STEPS.length - 1 ? "Register & Open Dashboard" : "Continue"}{" "}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
