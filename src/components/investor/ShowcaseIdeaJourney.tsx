import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { IdeaBriefingAgent } from "@/components/investor/IdeaBriefingAgent";
import { available, Funding, Photo, type Founder, type MarketProduct } from "@/components/investor/InvestorMarketplace";
import { Button } from "@/components/ui/button";
import { IDEA_STAGES, showcaseIdeaBrief, type IdeaStage } from "@/lib/ideaBriefing";
import { formatPkr } from "@/lib/investmentCalculator";
import type { DossierStage } from "./PitchDossier";
import { marketplaceRequest } from "@/lib/marketplaceClient";

export function ShowcaseIdeaJourney({ product, founder, initialStage, refresh }: {
  product: MarketProduct; founder?: Founder; initialStage: DossierStage; refresh: () => Promise<void>;
}) {
  const [stage, setStage] = useState<DossierStage>(initialStage > 2 ? 2 : initialStage);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [sample, setSample] = useState<"NONE" | "REQUESTED" | "APPROVED">("NONE");
  const [reviewed, setReviewed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef("");
  const remaining = available(product);
  const price = product.pricePerChunk ?? 0;
  const select = (next: DossierStage) => {
    setStage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buy = async () => {
    if (busy || completed || !reviewed || sample !== "APPROVED" || !Number.isInteger(quantity) || quantity < 1 || quantity > remaining) return;
    requestId.current ||= crypto.randomUUID();
    setBusy(true);
    setError("");
    try {
      await marketplaceRequest("purchases", "POST", { productId: product.id, chunks: quantity, requestId: requestId.current });
      setCompleted(true);
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Checkout failed.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="investor-market mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
    <Link to="/app/investor" className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
      <ArrowLeft size={15} /> Back to Ideas Feed
    </Link>
    <div className="mb-5">
      <p className="mb-2 inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-900">Showcase / {product.category}</p>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900">{product.title}</h1>
      <p className="mt-1 text-sm text-slate-600">{founder?.businessName} / {product.location}</p>
    </div>
    <nav aria-label="Investment stages" className="sticky top-14 z-20 mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-md">
      {[...IDEA_STAGES, { id: 4 as const, label: "Stage 4", title: "Sandbox escrow" }].map((step) => <button key={step.id} type="button"
        disabled={(step.id === 3 && sample !== "APPROVED") || (step.id === 4 && !reviewed)} onClick={() => select(step.id)}
        aria-current={step.id === stage ? "step" : undefined}
        className={"flex min-w-0 flex-col items-center gap-2 rounded-xl p-2 text-center text-xs font-semibold sm:flex-row sm:text-left " +
          (step.id === stage ? "bg-orange-100 text-orange-950 ring-1 ring-orange-300" : "text-slate-700 hover:bg-slate-100")}>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-slate-900">{step.id}</span>
        <span>{step.label}<span className="hidden sm:block">{step.title}</span></span>
      </button>)}
    </nav>
    <IdeaBriefingAgent brief={showcaseIdeaBrief(product, founder)} stage={Math.min(stage, 3) as IdeaStage} />
    <section className="rounded-2xl border border-orange-200 bg-orange-50/45 p-5 shadow-sm sm:p-6">
      <p className="text-xs font-bold uppercase tracking-wider text-orange-700">Stage {stage}</p>
      <h2 className="mb-4 font-display text-xl font-bold">{stage === 4 ? "Sandbox escrow" : IDEA_STAGES[stage - 1].title}</h2>
      {stage === 1 && <div className="market-dossier">
        <Photo url={product.image} label={product.title} className="market-dossier-img" />
        <div className="space-y-3">
          <p>{product.description}</p>
          <p><strong>{formatPkr(price)}</strong> per demo chunk</p>
          <Funding product={product} />
          <p>{remaining} chunks available</p>
          <Button type="button" onClick={() => select(2)}>Continue to Stage 2 <ArrowRight size={16} /></Button>
        </div>
      </div>}
      {stage === 2 && <div className="space-y-4">
        <dl className="market-metrics">
          <div><dt>Funding target</dt><dd>{formatPkr(price * (product.totalProductChunks ?? 0))}</dd></div>
          {product.averageRevenuePkr != null && <div><dt>Illustrative monthly revenue</dt><dd>{formatPkr(product.averageRevenuePkr)}</dd></div>}
          {product.profitPerChunk != null && <div><dt>Illustrative profit per chunk</dt><dd>{formatPkr(product.profitPerChunk)}</dd></div>}
        </dl>
        {product.materials && <p><strong>Materials</strong> {product.materials}</p>}
        {product.risk && <p><strong>Risks</strong> {product.risk}</p>}
        {product.milestones?.length && <div>
          <h3 className="mb-2 font-semibold">Use of funds</h3>
          <ol className="market-details">{product.milestones.map((item) => <li key={item.label}>{item.label} / {item.weight}%</li>)}</ol>
        </div>}
        <p className="text-sm">Try sample approval with a simulated delivery.</p>
        {sample === "NONE" && <Button type="button" onClick={() => setSample("REQUESTED")}>Order demo product sample</Button>}
        {sample === "REQUESTED" && <Button type="button" onClick={() => setSample("APPROVED")}>Confirm demo sample received and approved</Button>}
        {sample === "APPROVED" && <Button type="button" onClick={() => select(3)}>Continue to Stage 3 <ArrowRight size={16} /></Button>}
      </div>}
      {stage === 3 && <div className="space-y-4">
        <form className="market-checkout" onSubmit={(event) => { event.preventDefault(); setReviewed(true); select(4); }}>
          <p className="font-semibold">{product.title} allocation</p>
          <p>{product.location} · {remaining} demo chunks available</p>
          <label>Chunks <input type="number" min={1} max={remaining} required value={quantity || ""}
            disabled={completed || !!requestId.current} onChange={(event) => { setQuantity(Number(event.target.value)); setReviewed(false); }} /></label>
          <p>{formatPkr(price * quantity)} demo total</p>
          <p>Illustrative return {formatPkr((product.profitPerChunk ?? 0) * quantity)}</p>
          <p className="text-sm">Review these sample terms to try the sandbox checkout. Demo funds follow the milestone schedule.</p>
          <div><Button type={completed ? "button" : "submit"} disabled={!remaining && !completed} onClick={completed ? () => select(4) : undefined}>
            {completed ? "View sandbox escrow" : "Accept demo terms and continue"}
          </Button></div>
        </form>
      </div>}
      {stage === 4 && <div className="space-y-4">
        <p className="flex items-center gap-2 font-semibold"><ShieldCheck size={18} /> Sandbox escrow</p>
        <p className="text-sm">This checkout uses demo funds. Milestone releases appear in My Portfolio after purchase.</p>
        {completed && <p role="status" className="market-status">Chunks placed in sandbox escrow. Your holding is available in My Portfolio.</p>}
        {remaining === 0 && <p className="font-semibold text-emerald-800">Fully funded. Find this product in the founder's catalog.</p>}
        {!completed && remaining > 0 && <form className="market-checkout" onSubmit={(event) => { event.preventDefault(); void buy(); }}>
          <p>{quantity} chunks · {formatPkr(price * quantity)} demo total</p>
          <div><Button disabled={busy} type="submit">{busy ? "Saving..." : "Confirm sandbox purchase"}</Button></div>
        </form>}
        {error && <p role="alert" className="market-status">{error}</p>}
        {(remaining === 0 || completed) && <Link to="/app/investor" search={{ view: "founders", founder: product.founderId }}
          className="inline-flex items-center gap-2 font-semibold text-orange-800">View founder catalog <ArrowRight size={15} /></Link>}
      </div>}
    </section>
  </div>;
}
