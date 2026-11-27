import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Box, Coins, MapPin } from "lucide-react";
import { FounderShowcase, type FounderCertificate } from "@/components/founder/FounderWorkspaceProfile";
import { marketplaceRequest } from "@/lib/marketplaceClient";
import { formatPkr } from "@/lib/investmentCalculator";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import "./investor-marketplace.css";

export type Founder = {
  id: string; founderName: string; businessName: string; category: string; location: string;
  education?: string; mobile?: string; image?: string; verified?: boolean; demo: boolean; reviews?: number;
  about?: string; certificates?: FounderCertificate[];
};
export type MarketProduct = {
  id: string; founderId: string; title: string; category: string; location: string; demo: boolean;
  description: string; image?: string; images?: string[]; baselineSold?: number; pricePerChunk?: number; soldChunks?: number; totalProductChunks?: number;
  averageRevenuePkr?: number; profitPerChunk?: number; founderNetPkr?: number; investorCount?: number;
  investorReview?: number; targetAgeGroup?: string; materials?: string; risk?: string;
  milestones?: { label: string; weight: number }[];
};
type Holding = {
  id: string; title: string; investedPkr: number; chunks: number; profitPerChunk: number; resaleEnabled: boolean;
};
type Milestone = { label: string; amountPkr: number; status: "PENDING" | "COMPLETED" | "APPROVED" | "RELEASED" };
type Deal = { id: string; title: string; status: string; milestones: Milestone[] };
export type Catalog = { founders: Founder[]; products: MarketProduct[] };
const categories = ["All", "Food & Bakery", "Rice / Agriculture", "SaaS / Tech", "Dairy & Cold-Chain", "Organic FMCG"];
const emptyCatalog: Catalog = { founders: [], products: [] };

export function useMarketCatalog(uid: string) {
  const [catalog, setCatalog] = useState<Catalog>(emptyCatalog);
  const [error, setError] = useState("");
  const version = useRef(0);
  const refresh = async () => {
    const request = ++version.current;
    try {
      const data = await marketplaceRequest<Partial<Catalog> | null>("catalog");
      const founders = Array.isArray(data?.founders) ? data.founders.filter((entry) =>
        typeof entry?.id === "string" && typeof entry.founderName === "string" && typeof entry.businessName === "string") : [];
      const products = Array.isArray(data?.products) ? data.products.filter((entry) =>
        typeof entry?.id === "string" && typeof entry.founderId === "string" && typeof entry.title === "string") : [];
      if (request === version.current) {
        setCatalog({ founders, products });
        setError("");
      }
    } catch (error) {
      if (request === version.current) setError(error instanceof Error ? error.message : "Catalog could not load.");
    }
  };
  useEffect(() => {
    if (!uid) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 20_000);
    return () => { version.current++; window.clearInterval(timer); };
  }, [uid]);
  return { catalog, error, refresh };
}

export function productKey(product: MarketProduct) {
  return product.founderId + "/" + product.id;
}
export function available(product: MarketProduct) {
  return Math.max(0, (product.totalProductChunks ?? 0) - (product.soldChunks ?? 0));
}
export function Photo({ url, label, className = "" }: { url?: string; label: string; className?: string }) {
  return <img src={url || "/marketplace/saas-1.webp"} alt={label} className={className} loading="lazy"
    onError={(event) => {
      if (!event.currentTarget.src.endsWith("/marketplace/saas-1.webp")) event.currentTarget.src = "/marketplace/saas-1.webp";
    }} />;
}
export function Funding({ product }: { product: MarketProduct }) {
  const total = product.totalProductChunks ?? 0;
  if (!total) return null;
  const sold = Math.min(total, product.soldChunks ?? 0);
  return <div className="market-funding">
    <div><span><Coins size={15} /> Chunk Coins</span><strong>{sold} / {total}</strong></div>
    <progress max={total} value={sold} aria-label="Chunks funded" />
  </div>;
}

export function OpenChunkIdeas({ items }: { items: MarketProduct[] }) {
  return <section className="investor-market space-y-3" aria-label="Open showcase ideas">
    <h2 className="font-display text-lg font-bold text-slate-900">Open showcase ideas</h2>
    <div className="market-grid">
      {items.map((item) => <Link key={productKey(item)} to="/app/investor/idea/$ideaId"
        params={{ ideaId: item.id }} search={{ founderId: item.founderId, stage: 1, showcase: true }} className="market-card">
        <Photo url={item.image} label={item.title} />
        <div className="market-card-body">
          <p className="market-small">Showcase / {item.category}</p>
          <h3>{item.title}</h3>
          <p><strong>{formatPkr(item.pricePerChunk ?? 0)}</strong> per demo chunk</p>
          <Funding product={item} />
          <p className="mt-2 text-sm font-semibold text-orange-800">Open demo dossier <ArrowRight size={15} /></p>
        </div>
      </Link>)}
    </div>
  </section>;
}

export function InvestorMarketplace({ catalog, error, refresh, initialFounder }: {
  catalog: Catalog; error: string; refresh: () => Promise<void>; initialFounder?: string;
}) {
  const navigate = useNavigate();
  const [category, setCategory] = useState("All");
  const [founderId, setFounderId] = useState(initialFounder ?? "");
  const [selection, setSelection] = useState("");
  const [photoIndex, setPhotoIndex] = useState(0);
  const selected = catalog.products.find((item) => productKey(item) === selection);
  const founder = catalog.founders.find((item) => item.id === founderId);
  const gallery = [...new Set([selected?.image, ...(selected?.images ?? [])].filter((value): value is string => !!value))];
  const productFounder = catalog.founders.find((item) => item.id === selected?.founderId);
  const products = catalog.products.filter((item) => item.founderId === founderId);

  const open = (product: MarketProduct) => {
    setSelection(productKey(product));
    setPhotoIndex(0);
  };

  const productCards = (items: MarketProduct[]) => <div className="market-grid">
    {items.map((item) => <button key={productKey(item)} type="button" className="market-card" onClick={() => open(item)}>
      <Photo url={item.image} label={item.title} />
      <div className="market-card-body">
        <p className="market-small">{item.demo ? "Showcase / " : ""}{item.category}</p>
        <h3>{item.title}</h3>
        <p className="market-small"><MapPin size={13} />{item.location}</p>
        {item.pricePerChunk && <p><strong>{formatPkr(item.pricePerChunk)}</strong> per chunk</p>}
        {item.investorCount != null && <p className="market-small">{item.investorCount} demo investors / {formatPkr((item.soldChunks ?? 0) * (item.pricePerChunk ?? 0))} allocated</p>}
        <Funding product={item} />
      </div>
    </button>)}
  </div>;

  return <section className="investor-market space-y-5">
    {error && <p role="alert" className="market-status">{error} <button type="button" onClick={() => void refresh()}>Retry catalog</button></p>}
      <div className="market-hero">
        <div><p><BadgeCheck size={17} /> Founder directory</p><h2>Explore Founders</h2>
          <p>Discover founder profiles and browse their product catalogs.</p></div>
      </div>
      <div className="market-filters" aria-label="Founder categories">
        {categories.map((item) => <button key={item} type="button" aria-pressed={category === item}
          onClick={() => setCategory(item)}>{item}</button>)}
      </div>
      <div className="market-grid">
        {catalog.founders.filter((item) => category === "All" || item.category === category).map((item) =>
          <button type="button" key={item.id} className="market-card market-founder" onClick={() => setFounderId(item.id)}>
            <Photo url={item.image} label={item.demo ? "Illustrative founder portrait" : item.founderName} />
            <div className="market-card-body"><p className="market-small">{item.demo ? "Showcase / " : ""}{item.category}</p>
              <h3>{item.businessName}</h3><p>{item.founderName} {item.verified && <BadgeCheck size={16} aria-label={item.demo ? "Demo verification" : "Verified founder"} />}</p>
              <p className="market-small"><MapPin size={13} /> {item.location}<ArrowRight size={16} className="ml-auto" /></p>
            </div>
          </button>)}
      </div>
    <Dialog open={!!founder} onOpenChange={(value) => { if (!value) setFounderId(""); }}>
      {founder && <DialogContent className="market-modal">
        <DialogTitle className="sr-only">{founder.businessName}</DialogTitle>
        <DialogDescription>{founder.category}{founder.mobile && " · " + founder.mobile}</DialogDescription>
        <FounderShowcase founder={founder} products={products} showProducts={false} />
        <div className="market-metrics">
          <div><span>Products</span><strong>{products.length}</strong></div>
          <div><span>Chunk Coins allocated</span><strong>{products.reduce((count, item) => count + (item.soldChunks ?? 0), 0)}</strong></div>
          {founder.reviews != null && <div><span>Showcase reviews</span><strong>{founder.reviews}%</strong></div>}
        </div>
        <h3 className="text-xl font-semibold">Product catalog</h3>{productCards(products)}
      </DialogContent>}
    </Dialog>
    <Dialog open={!!selected} onOpenChange={(value) => { if (!value) setSelection(""); }}>
      {selected && <DialogContent className="market-modal">
        <DialogTitle>{selected.title}</DialogTitle>
        <DialogDescription>{productFounder?.businessName} / {selected.demo ? "Showcase product" : "Live founder listing"}</DialogDescription>
        <div className="market-dossier">
          <div>
            <div className="overflow-hidden rounded-2xl">
              <Photo url={gallery[photoIndex] || gallery[0]} label={selected.title}
                className={"market-dossier-img" + (selected.demo && photoIndex === 1 && gallery.length === 1 ? " scale-150" : "")} />
            </div>
            {gallery.length > 1 ? <div className="market-gallery">
              {gallery.map((url, index) => <button type="button" key={url} aria-label={"Photo " + (index + 1)}
                aria-pressed={photoIndex === index} onClick={() => setPhotoIndex(index)}><Photo url={url} label="" /></button>)}
            </div> : selected.demo && <div className="market-filters mt-2">
              <button type="button" aria-pressed={photoIndex === 0} onClick={() => setPhotoIndex(0)}>Product photo</button>
              <button type="button" aria-pressed={photoIndex === 1} onClick={() => setPhotoIndex(1)}>Detail crop</button>
            </div>}
            <Funding product={selected} />
            {!!selected.pricePerChunk && <p className="mt-3"><strong>{formatPkr(selected.pricePerChunk)}</strong> per chunk</p>}
            <p className="mt-2 text-sm">{selected.description}</p>
          </div>
          <div className="space-y-4">
            <dl className="market-metrics">
              {([
                ["Monthly revenue", selected.averageRevenuePkr, true], ["Profit per chunk", selected.profitPerChunk, true],
                ["Founder net earnings", selected.founderNetPkr, true], ["Investors", selected.investorCount, false],
              ] as const).filter(([, value]) => value != null).map(([label, value, money]) => <div key={label}>
                <dt>{label}</dt><dd>{money ? formatPkr(value!) : value}</dd></div>)}
            </dl>
            <dl className="market-details">
              <div><dt>Operating area</dt><dd>{selected.location}</dd></div>
              {selected.materials && <div><dt>Ingredients / materials</dt><dd>{selected.materials}</dd></div>}
              {selected.targetAgeGroup && <div><dt>Target age</dt><dd>{selected.targetAgeGroup}</dd></div>}
              {selected.risk && <div><dt>Risk analysis</dt><dd>{selected.risk}</dd></div>}
              {selected.investorReview != null && <div><dt>Investor reviews</dt><dd>{selected.investorReview}% / showcase</dd></div>}
              {selected.demo && <div><dt>Illustrative cap table</dt><dd>
                {selected.baselineSold ?? 0} showcase allocation / {Math.max(0, (selected.soldChunks ?? 0) - (selected.baselineSold ?? 0))} sandbox purchases /
                {" "}{available(selected)} available
              </dd></div>}
            </dl>
            {selected.milestones && <div><h3 className="font-semibold">Use of funds</h3>
              <ol className="market-details">{selected.milestones.map((step) => <li key={step.label}>{step.label} / {step.weight}%</li>)}</ol>
            </div>}
            {selected.demo && <p className="market-small"><Box size={15} /> Secondary resale interest can be set in My Portfolio</p>}
            {selected.demo && available(selected) === 0 && <p className="font-semibold text-emerald-800">Fully funded</p>}
            <Button onClick={() => {
              setSelection(""); setFounderId("");
              void navigate({ to: "/app/investor/idea/$ideaId", params: { ideaId: selected.id },
                search: { founderId: selected.founderId, stage: 1, showcase: selected.demo || undefined } });
            }}>Open demo dossier</Button>
          </div>
        </div>
      </DialogContent>}
    </Dialog>
  </section>;
}

export function MarketplacePortfolio() {
  const [portfolio, setPortfolio] = useState<{ holdings: Holding[]; deals: Deal[] }>({ holdings: [], deals: [] });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    try { setPortfolio(await marketplaceRequest("portfolio")); setError(""); }
    catch (error) { setError(error instanceof Error ? error.message : "Sandbox portfolio unavailable."); }
  };
  useEffect(() => { void refresh(); }, []);
  const mutate = async (url: string, method: string, body: object) => {
    setBusy(true);
    try { await marketplaceRequest(url, method, body); await refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not update your portfolio."); }
    finally { setBusy(false); }
  };
  return <section className="investor-market market-portfolio">
    <h3>Sandbox holdings</h3>
    {error && <p role="alert" className="market-status">{error}</p>}
    {!portfolio.holdings.length && <p>Sandbox chunk purchases will appear here.</p>}
    {portfolio.holdings.map((item) => <div className="market-holding" key={item.id}>
      <div><strong>{item.title}</strong><p>{item.chunks} chunks / {formatPkr(item.investedPkr)} invested</p>
        <p>{formatPkr(item.profitPerChunk)} illustrative profit per chunk</p></div>
      <label><input type="checkbox" checked={item.resaleEnabled} disabled={busy}
        onChange={(event) => void mutate("portfolio/" + item.id + "/resale", "PATCH", { enabled: event.target.checked })} /> Resale interest</label>
    </div>)}
    {portfolio.deals.map((deal) => <details key={deal.id}>
      <summary>{deal.title} / {deal.status.replaceAll("_", " ")}</summary>
      <ol className="market-details">{deal.milestones.map((step, index) => {
        const action = { PENDING: "complete", COMPLETED: "approve", APPROVED: "release", RELEASED: null }[step.status];
        return <li className="market-holding" key={step.label}><div>{step.label}<p>{formatPkr(step.amountPkr)} / {step.status}</p></div>
          {action && (index === 0 || deal.milestones[index - 1].status === "RELEASED") &&
            <Button variant="outline" disabled={busy} onClick={() => void mutate("deals/" + deal.id + "/milestones/" + index, "POST", { action })}>{action} (demo)</Button>}
        </li>;
      })}</ol>
    </details>)}
  </section>;
}
