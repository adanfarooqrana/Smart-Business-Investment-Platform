import { useEffect, useState } from "react";
import { Store, Building2, ChevronLeft, ChevronRight } from "lucide-react";

type Ad = {
  id: string;
  title: string;
  subtitle: string;
  type: "wholesaler" | "business";
  price?: string;
};

const ADS: Ad[] = [
  { id: "1", title: "Premium Basmati Rice", subtitle: "Gujranwala Wholesale · MOQ 50 bags", type: "wholesaler", price: "Rs. 4,500/bag" },
  { id: "2", title: "Luna Bistro Setup", subtitle: "Fine dining cafe · Karachi", type: "business", price: "Franchise available" },
  { id: "3", title: "Eco Packaging Boxes", subtitle: "Biodegradable · National shipping", type: "wholesaler", price: "Rs. 12/unit" },
  { id: "4", title: "Mobile Accessories Bulk", subtitle: "Verified wholesaler · Lahore", type: "wholesaler", price: "Rs. 250/unit" },
  { id: "5", title: "Tech SaaS Startup", subtitle: "B2B invoicing tool · Islamabad", type: "business", price: "Seeking investors" },
];

export function FounderAdCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % ADS.length), 5000);
    return () => clearInterval(id);
  }, []);

  const ad = ADS[index];

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-[#FFD700]/30 founder-ad-glow"
      style={{ background: "linear-gradient(90deg, rgba(255,215,0,0.06), rgba(255,165,0,0.04))" }}
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#FFD700]/15">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#FFD700]/70">Featured Ads</p>
        <div className="flex gap-1">
          <button type="button" onClick={() => setIndex((i) => (i - 1 + ADS.length) % ADS.length)}
            className="rounded-full p-1 text-[#FFD700] hover:bg-white/10"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="px-2 text-[10px] text-slate-500">{index + 1}/{ADS.length}</span>
          <button type="button" onClick={() => setIndex((i) => (i + 1) % ADS.length)}
            className="rounded-full p-1 text-[#FFD700] hover:bg-white/10"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 p-5 cursor-pointer transition hover:bg-white/5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: "linear-gradient(135deg, #FFD70033, #FFA50022)" }}
        >
          {ad.type === "wholesaler"
            ? <Store className="h-7 w-7 text-[#FFD700]" />
            : <Building2 className="h-7 w-7 text-[#FFA500]" />
          }
        </div>
        <div className="flex-1">
          <p className="font-bold text-white">{ad.title}</p>
          <p className="text-xs text-slate-400">{ad.subtitle}</p>
        </div>
        {ad.price && (
          <span className="rounded-full bg-[#FFD700]/20 px-3 py-1 text-xs font-bold text-[#FFD700]">
            {ad.price}
          </span>
        )}
      </div>
    </section>
  );
}
