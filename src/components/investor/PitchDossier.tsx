import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Clock3, Fingerprint, LockKeyhole, MessageCircle, PackageCheck, Send, X } from "lucide-react";
import { limitToLast, onValue, orderByChild, push, query, ref, serverTimestamp, set } from "firebase/database";
import type { User } from "firebase/auth";
import { database } from "@/firebase";
import type { StartupIdea } from "@/data/startupIdeas";
import { backendRequest } from "@/lib/backendClient";
import { formatPkr } from "@/lib/investmentCalculator";
import {
  dossierCall, dossierPath, downloadDossierFile, errorMessage, verifyDossierDevice, watchRecord,
  type Allocation, type DossierAgreement, type DossierPacket, type DossierRoom, type DossierTerms,
  type SampleOrder, type Selection, type UnlockedAgreement,
} from "@/lib/pitchDossier";
import { followUser, subscribeToFollowing } from "@/services/founderCommunityService";
import { AgreementPreview, ContractSignatureForm } from "./DossierSigning";
import "./pitch-dossier.css";

export type DossierStage = 1 | 2 | 3 | 4;
const stages = ["Product showcase", "Sample and economics", "Allocation and signing", "Countersignature and escrow"];

export function DossierFrame({ children }: { children: ReactNode }) {
  return <div className="pitch-dossier">
    <div className="dossier-shell">{children}</div>
  </div>;
}

export function DossierMetrics({ entries }: { entries: [string, ReactNode][] }) {
  return <dl className="dossier-metrics">{entries.map(([label, value]) =>
    <div key={label}><dt>{label}</dt><dd>{value ?? "Pending disclosure"}</dd></div>
  )}</dl>;
}

export function AllocationSummary({ allocation }: { allocation: Allocation }) {
  return <div className="space-y-3">
    <DossierMetrics entries={[
      ["Total investment", formatPkr(allocation.amountPkr)], ["Total chunks selected", allocation.chunks],
      ["Estimated profit return", formatPkr(allocation.estimatedProfitPkr)], ["Payout schedule", allocation.payoutSchedule],
    ]} />
    {allocation.lines.length > 0 && <ul className="divide-y divide-white/10 text-sm">
      {allocation.lines.map((line) => <li key={line.itemId} className="flex flex-wrap justify-between gap-2 py-2">
        <span>{line.name} × {line.chunks}</span><strong>{formatPkr(line.amountPkr)}</strong>
      </li>)}
    </ul>}
  </div>;
}

export function PitchDossier({ idea, user, initialStage }: { idea: StartupIdea; user: User; initialStage: DossierStage }) {
  const founderId = idea.founderId || idea.entrepreneurUid || "";
  const endpoint = dossierPath(founderId, idea.id);
  const [packet, setPacket] = useState<DossierPacket>();
  const [stage, setStage] = useState<DossierStage>(initialStage >= 2 ? 2 : 1);
  const [room, setRoom] = useState<DossierRoom>();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [chatError, setChatError] = useState("");
  const [streamError, setStreamError] = useState("");
  const [request, setRequest] = useState(0);
  const [chatRetry, setChatRetry] = useState(0);
  const [mobileChat, setMobileChat] = useState(false);
  const stageHeading = useRef<HTMLHeadingElement>(null);
  const watchAgreementSigned = useRef(false);
  const sample = packet?.sample;
  const agreement = packet?.agreement;
  const terms = packet?.terms;
  const sampleApproved = sample?.status === "APPROVED" || terms?.sampleAvailable === false;
  const maxStage = agreement ? 4 : sampleApproved ? 3 : 2;
  const orderId = packet?.orderId;
  const contractId = packet?.agreementId;
  const watchSample = !!sample;
  const watchAgreement = !!agreement || (!!packet?.document && sampleApproved);
  const chatActive = stage >= 2;

  useEffect(() => {
    let active = true;
    setError("");
    void dossierCall<DossierPacket>(user, endpoint).then((next) => {
      if (!active) return;
      setPacket((previous) => {
        if ((previous?.agreement?.revision ?? 0) > (next.agreement?.revision ?? 0)) return { ...next, agreement: previous!.agreement };
        return next;
      });
      if (!request) setStage((current) => next.agreement ? 4 : Math.max(current, initialStage >= 3 && (next.sample?.status === "APPROVED" || next.terms?.sampleAvailable === false) ? 3 : initialStage >= 2 ? 2 : 1) as DossierStage);
    }).catch((problem) => { if (active) setError(errorMessage(problem)); });
    return () => { active = false; };
  }, [user, endpoint, initialStage, request]);

  useEffect(() => {
    if (!orderId || !watchSample) return;
    return watchRecord<SampleOrder>("sampleOrders/" + orderId, (value) => {
      setPacket((previous) => previous && { ...previous, sample: value });
    }, () => setStreamError("Live sample updates are unavailable. Refresh status to retry."));
  }, [orderId, watchSample, request]);

  useEffect(() => {
    if (!contractId || !watchAgreement) return;
    return watchRecord<DossierAgreement>("agreements/" + contractId, (value) => {
      setPacket((previous) => previous && (previous.agreement?.revision ?? 0) <= value.revision
        ? { ...previous, agreement: value } : previous);
      setStage((current) => current === 3 && !watchAgreementSigned.current ? 4 : current);
      watchAgreementSigned.current = true;
    }, () => setStreamError("Live countersignature updates are unavailable. Refresh status to retry."));
  }, [contractId, watchAgreement, request]);

  useEffect(() => {
    if (!chatActive || !founderId) return;
    let active = true;
    setChatError("");
    void dossierCall<DossierRoom>(user, endpoint + "/chat", "POST").then((result) => {
      if (active) setRoom(result);
    }).catch((problem) => {
      if (active) setChatError(errorMessage(problem));
    });
    return () => { active = false; };
  }, [user, endpoint, chatActive, founderId, chatRetry]);

  useEffect(() => {
    if (!founderId || !packet) return;
    const ping = () => {
      if (document.visibilityState === "visible") void dossierCall(user, endpoint + "/reader", "POST").catch(() => {});
    };
    ping();
    const tick = window.setInterval(ping, 20_000);
    document.addEventListener("visibilitychange", ping);
    return () => { window.clearInterval(tick); document.removeEventListener("visibilitychange", ping); };
  }, [user, endpoint, founderId, !!packet]);

  const select = (value: DossierStage) => {
    setStage(value);
    window.requestAnimationFrame(() => stageHeading.current?.focus());
  };
  const active = Math.min(stage, maxStage) as DossierStage;
  const assets = terms?.assets ?? [];
  const lines = assets.flatMap((item) => {
    const chunks = Math.min(quantities[item.id] || 0, item.availableChunks ?? item.chunks);
    return chunks > 0 ? [{ itemId: item.id, name: item.name, chunks, amountPkr: chunks * (terms?.pricePerChunk ?? 0) }] : [];
  });
  const chunks = lines.reduce((sum, line) => sum + line.chunks, 0);
  const allocation = {
    lines, chunks, amountPkr: chunks * (terms?.pricePerChunk ?? 0),
    estimatedProfitPkr: chunks * (terms?.profitPerChunk ?? 0), payoutSchedule: terms?.payoutSchedule || "Pending disclosure",
  };
  const selection: Selection | undefined = terms && chunks > 0 ? {
    founderId, pitchId: idea.id, revision: terms.revision,
    quantities: Object.fromEntries(lines.map((line) => [line.itemId, line.chunks])),
  } : undefined;

  const updateSample = (value: SampleOrder) => {
    setPacket((previous) => previous && { ...previous, sample: value });
    if (value.status === "APPROVED") setRequest((number) => number + 1);
  };
  const onSigned = (value: DossierAgreement) => {
    setPacket((previous) => previous && { ...previous, agreement: value });
    select(4);
  };

  return <DossierFrame>
    <Link to="/app/investor" className="dossier-back"><ArrowLeft size={17} /> Ideas Feed</Link>
    <header className="dossier-hero">
      <p className="text-sm font-semibold text-orange-300">{idea.industry} · {idea.founderName}</p>
      <h1>{idea.startupTitle}</h1>
      {terms?.tagline && <p className="text-lg text-slate-200">{terms.tagline}</p>}
    </header>
    <nav className="dossier-stages" aria-label="Dossier stages">
      {stages.map((label, index) => {
        const number = (index + 1) as DossierStage;
        return <button type="button" key={label} aria-current={active === number ? "step" : undefined}
          disabled={number > maxStage} onClick={() => select(number)}>
          <span>{number > maxStage ? <LockKeyhole size={14} /> : number}</span>{label}
        </button>;
      })}
    </nav>
    {error && <div className="dossier-error" role="alert">{error} <button type="button" className="underline" onClick={() => setRequest((value) => value + 1)}>Retry</button></div>}
    {streamError && <div className="dossier-error" role="alert">{streamError} <button className="underline" type="button" onClick={() => {
      setStreamError(""); setRequest((value) => value + 1);
    }}>Refresh status</button></div>}
    <h2 ref={stageHeading} tabIndex={-1} className="dossier-stage-title">{stages[active - 1]}</h2>
    <div className={active >= 2 ? "dossier-split" : ""}>
      <main className="min-w-0 space-y-4">
        {active === 1 && <>
          <ProductShowcase idea={idea} terms={terms} endpoint={endpoint} user={user} />
          <button type="button" className="dossier-primary" onClick={() => select(2)}>Continue to Stage 2 <ArrowRight size={17} /></button>
        </>}
        {active === 2 && <>
          <DossierMetrics entries={[
            ["Price per chunk", terms ? formatPkr(terms.pricePerChunk) : null],
            ["Estimated profit per chunk", terms ? formatPkr(terms.profitPerChunk) : null],
            ["Payout cycle", terms?.payoutSchedule],
          ]} />
          {terms?.sampleAvailable === false ? <section className="dossier-card space-y-3">
            <p>This pitch has no product sample.</p>
            <button type="button" className="dossier-primary" onClick={() => select(3)}>Continue to Stage 3 <ArrowRight size={17} /></button>
          </section> : packet ? <SampleTracking user={user} sample={sample} founderId={founderId} pitchId={idea.id}
            product={terms?.sampleName || (idea.stage3?.sampleAssetAvailable ? idea.stage3?.sampleProductName || idea.startupTitle : "")}
            onChange={updateSample} onContinue={() => select(3)} /> : !error && <p role="status">Loading sample status…</p>}
        </>}
        {active === 3 && agreement && <section className="dossier-card space-y-3">
          <AllocationSummary allocation={agreement.allocation} />
          <button type="button" className="dossier-primary" onClick={() => select(4)}>View signing status</button>
        </section>}
        {active === 3 && !agreement && <>
          <section className="dossier-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">Choose the assets you want to back</h3>
              <button type="button" className="dossier-secondary" onClick={() => setRequest((value) => value + 1)}>Refresh availability</button>
            </div>
            <div className="dossier-asset-grid">
              {assets.map((item) => {
                const maximum = item.availableChunks ?? item.chunks;
                return <div className="dossier-item" key={item.id}>
                  {item.image ? <img src={item.image} alt={item.name} loading="lazy" /> : <div className="dossier-media-empty"><PackageCheck size={25} /></div>}
                  <div className="space-y-2 p-4">
                    <h4 className="font-semibold">{item.name}</h4>
                    <p className="text-sm text-slate-300">{item.supplier}</p>
                    <p className="text-sm">{formatPkr(item.costPkr)} · {maximum} chunks available</p>
                    <label className="block text-sm">Chunks to fund
                      <input type="number" min={0} max={maximum} step={1} inputMode="numeric" className="dossier-input" disabled={!maximum}
                        value={Math.min(quantities[item.id] || 0, maximum)} onChange={(event) => {
                          const quantity = Math.min(Math.max(Math.floor(event.target.valueAsNumber || 0), 0), maximum);
                          setQuantities((previous) => ({ ...previous, [item.id]: quantity }));
                        }} />
                    </label>
                  </div>
                </div>;
              })}
            </div>
            {assets.length ? <AllocationSummary allocation={allocation} /> : <p>The founder has yet to publish an itemized allocation.</p>}
          </section>
          {packet?.document ? <>
            <AgreementPreview user={user} document={packet.document} endpoint={endpoint + "/document?revision=" + terms?.revision} />
            <ContractSignatureForm user={user} selection={selection} onSigned={onSigned} />
          </> : <p className="dossier-card">The founder has yet to upload an agreement.</p>}
        </>}
        {active === 4 && agreement && <EscrowStage user={user} agreement={agreement} />}
      </main>
      {active >= 2 && <>
        <button className="dossier-primary dossier-mobile-chat-toggle" type="button" aria-controls="pitch-chat" aria-expanded={mobileChat}
          onClick={() => setMobileChat((value) => !value)}>{mobileChat ? <X size={17} /> : <MessageCircle size={17} />} {mobileChat ? "Close chat" : "Founder chat"}</button>
        <aside id="pitch-chat" className="dossier-chat-column" data-mobile-open={mobileChat} onKeyDown={(event) => { if (event.key === "Escape") setMobileChat(false); }}>
        {room ? <DossierChat room={room} user={user} contact={idea.founderName || "Founder"} /> : <section className="dossier-card">
          {chatError ? <><p role="alert">{chatError}</p><button className="dossier-secondary mt-3" onClick={() => setChatRetry((value) => value + 1)}>Retry chat</button></> : <p role="status">Connecting to the founder…</p>}
        </section>}
        {!!founderId && <CommunityButton user={user} founderId={founderId} />}
        </aside>
      </>}
    </div>
  </DossierFrame>;
}

function ProductShowcase({ idea, user, terms, endpoint }: { idea: StartupIdea; user: User; terms?: DossierTerms | null; endpoint: string }) {
  const [selected, setSelected] = useState(0);
  const photos = terms?.gallery?.length ? terms.gallery : (Array.isArray(idea.stage2?.proofGallery) ? idea.stage2.proofGallery : [])
    .flatMap((item) => item?.url ? [item.url] : []);
  const count = terms?.assets?.reduce((sum, item) => sum + item.chunks, 0);
  return <div className="space-y-4">
    <div className="dossier-showcase">
      <section className="dossier-card space-y-3">
        {photos.length > 0 ? <>
          <img className="dossier-gallery-main" src={photos[selected] || photos[0]} alt={idea.startupTitle + " product view"} />
          <div className="dossier-thumbs">{photos.map((url, index) => <button type="button" key={index} aria-label={"View product image " + (index + 1)}
            aria-pressed={selected === index} onClick={() => setSelected(index)}><img src={url} alt="" loading="lazy" /></button>)}</div>
        </> : <div className="dossier-media-empty"><PackageCheck size={30} /><p>The product gallery is awaiting founder upload.</p></div>}
      </section>
      <section className="dossier-card space-y-4">
        {terms && <span className="dossier-badge">Team size · {terms.teamSize}</span>}
        <p className="text-slate-200">{idea.stage1?.ideaDescription || idea.description}</p>
        {terms?.usp && <><h3 className="font-semibold">Unique selling point</h3><p>{terms.usp}</p></>}
        {terms?.goals && <><h3 className="font-semibold">Future goals</h3><p>{terms.goals}</p></>}
        <DossierMetrics entries={[
          ["Funding goal", (terms?.fundingGoalPkr || idea.stage2?.totalCapitalRequiredPkr) ? formatPkr(terms?.fundingGoalPkr ?? idea.stage2?.totalCapitalRequiredPkr ?? 0) : null],
          ["Total business chunks", count], ["Backing assets", terms?.assets?.length],
        ]} />
        {!!terms?.assets?.length && <ul className="divide-y divide-white/10 text-sm">{terms.assets.map((item) =>
          <li key={item.id} className="flex justify-between gap-3 py-2"><span>{item.name}</span><span>{item.chunks} chunks</span></li>
        )}</ul>}
      </section>
    </div>
    <section className="dossier-card space-y-3"><h3 className="text-lg font-semibold">Shop / factory tour</h3><PitchVideo url={terms?.tourVideo} label="Shop or factory tour" /></section>
    <section className="dossier-card space-y-3">
      <h3 className="text-lg font-semibold">Reference witnesses</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {[0, 1].map((index) => {
          const witness = terms?.witnesses?.[index];
          return <div className="dossier-item space-y-3 p-4" key={index}>
            <p className="font-semibold">{witness?.name || "Witness " + (index + 1)}</p>
            {witness ? <>
              <p className="text-sm text-slate-300">{witness.relation}</p>
              <PitchVideo url={witness.video} label={witness.name + " reference"} />
              {witness.hasCnic ? <PrivateWitnessImage user={user} endpoint={endpoint + "/witnesses/" + index} /> : <p className="text-sm">CNIC preview awaiting upload.</p>}
            </> : <p className="text-sm text-slate-300">Reference details awaiting founder upload.</p>}
          </div>;
        })}
      </div>
    </section>
  </div>;
}

function PitchVideo({ url, label }: { url?: string; label: string }) {
  if (!url) return <p className="text-sm text-slate-300">Video awaiting founder upload.</p>;
  let source: URL;
  try { source = new URL(url); } catch { return <p>Video URL is unavailable.</p>; }
  const videoId = source.hostname === "youtu.be" ? source.pathname.split("/")[1] :
    ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(source.hostname)
      ? source.searchParams.get("v") || source.pathname.split("/").at(-1) : "";
  return videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)
    ? <iframe className="aspect-video w-full rounded-xl" loading="lazy" title={label} allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin" src={"https://www.youtube-nocookie.com/embed/" + videoId} />
    : <video className="w-full rounded-xl bg-black" controls preload="metadata" playsInline src={url} aria-label={label} />;
}

function PrivateWitnessImage({ user, endpoint }: { user: User; endpoint: string }) {
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [requested, setRequested] = useState(false);
  useEffect(() => {
    if (!requested) return;
    const controller = new AbortController();
    let url = "";
    void backendRequest(user, endpoint, { signal: controller.signal }).then((response) => response.blob()).then((blob) => {
      if (controller.signal.aborted) return;
      url = URL.createObjectURL(blob);
      setImage(url);
    }).catch(() => { if (!controller.signal.aborted) setError("The CNIC preview could not be loaded."); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [requested, user, endpoint]);
  return image ? <img className="max-h-52 rounded-xl" src={image} alt="Redacted witness CNIC" /> :
    error ? <p role="alert">{error}</p> :
      <button type="button" className="dossier-secondary" disabled={requested} onClick={() => setRequested(true)}>{requested ? "Loading preview…" : "View witness CNIC"}</button>;
}

function SampleTracking({ user, founderId, pitchId, sample, product, onChange, onContinue }: {
  user: User; founderId: string; pitchId: string; sample?: SampleOrder | null; product: string;
  onChange: (value: SampleOrder) => void; onContinue: () => void;
}) {
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const noticeAttempt = useRef("");
  const deliveryAt = sample?.estimatedDeliveryAt;
  const due = !!deliveryAt && now >= deliveryAt;

  useEffect(() => {
    if (!deliveryAt || sample?.status !== "SCHEDULED" || due) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [deliveryAt, sample?.status, due]);

  useEffect(() => {
    if (!due || !sample || sample.status !== "SCHEDULED" || sample.notifiedAt) return;
    const key = sample.id + ":" + deliveryAt;
    if (noticeAttempt.current === key) return;
    noticeAttempt.current = key;
    void dossierCall(user, "/api/samples/notify-delivered", "POST", { orderId: sample.id })
      .catch((problem) => setError(errorMessage(problem)));
  }, [due, sample?.id, sample?.status, sample?.notifiedAt, deliveryAt, user]);

  const action = async (url: string, data?: object, advance?: boolean) => {
    setBusy(true);
    setError("");
    try {
      onChange(await dossierCall<SampleOrder>(user, url, "POST", data));
      if (advance) onContinue();
    } catch (problem) { setError(errorMessage(problem)); }
    finally { setBusy(false); }
  };
  const seconds = Math.max(0, Math.ceil(((deliveryAt || 0) - now) / 1000));
  const countdown = [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24,
    Math.floor(seconds / 60) % 60, seconds % 60].map((value) => String(value).padStart(2, "0"));

  return <section className="dossier-card space-y-4">
    <h3 className="flex items-center gap-2 text-lg font-semibold"><PackageCheck size={20} /> Product sample</h3>
    {!sample && (product ? <>
      <p>{product}</p>
      {showForm ? <form className="space-y-3" onSubmit={(event) => {
        event.preventDefault();
        void action("/api/samples", { founderId, pitchId, address: address.trim(), phone: phone.trim() });
      }}>
        <label className="block">Delivery address<textarea className="dossier-input" value={address} onChange={(event) => setAddress(event.target.value)} required minLength={5} maxLength={350} /></label>
        <label className="block">Delivery phone<input type="tel" className="dossier-input" value={phone} onChange={(event) => setPhone(event.target.value)} required minLength={7} maxLength={26} /></label>
        <button className="dossier-primary" disabled={busy}>{busy ? "Sending request…" : "Send sample request"}</button>
      </form> : <button type="button" className="dossier-primary" onClick={() => setShowForm(true)}>Order Product Sample</button>}
    </> : <p>Contact the founder about sample availability.</p>)}
    {sample?.status === "REQUESTED" && <p role="status">Request sent. Waiting for the founder to set an estimated delivery time.</p>}
    {sample?.status === "SCHEDULED" && deliveryAt && <>
      <p className="flex items-center gap-2"><Clock3 size={18} /> Estimated delivery · {new Date(deliveryAt).toLocaleString()}</p>
      {!due ? <div className="dossier-countdown" role="timer" aria-label="Estimated delivery countdown">
        {countdown.map((value, index) => <div key={index}><strong>{value}</strong><span>{["days", "hours", "min", "sec"][index]}</span></div>)}
      </div> : <>
        <p>{sample.notifiedAt ? "A confirmation email was sent." : "The estimated delivery time has passed."} Confirm once you have inspected your sample.</p>
        <button type="button" disabled={busy} className="dossier-primary"
          onClick={() => void action("/api/samples/" + sample.id + "/approve", undefined, true)}>Yes, Sample Received &amp; Approved <Check size={17} /></button>
      </>}
    </>}
    {sample?.status === "APPROVED" && <button type="button" className="dossier-primary" onClick={onContinue}>Sample approved · Continue to Stage 3 <ArrowRight size={17} /></button>}
    {error && <p className="dossier-error" role="alert">{error}</p>}
  </section>;
}

type ChatMessage = { senderId: string; text: string; timestamp: number };

export function DossierChat({ user, room, contact }: { user: User; room: DossierRoom; contact: string }) {
  const [messages, setMessages] = useState<[string, ChatMessage][]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const thread = useRef<HTMLDivElement>(null);
  const path = "chats/" + room.id + "/messages";

  useEffect(() => onValue(query(ref(database, path), orderByChild("timestamp"), limitToLast(100)), (snapshot) => {
    const next: [string, ChatMessage][] = [];
    snapshot.forEach((child) => {
      const message = child.val();
      if (child.key && typeof message?.text === "string") next.push([child.key, message as ChatMessage]);
    });
    setMessages(next);
  }, () => setError("The conversation could not be synchronized.")), [path]);

  useEffect(() => { if (thread.current) thread.current.scrollTop = thread.current.scrollHeight; }, [messages]);

  const send = async () => {
    const clean = text.trim();
    if (!clean || busy) return;
    setBusy(true);
    setError("");
    try {
      await set(push(ref(database, path)), { senderId: user.uid, text: clean, timestamp: serverTimestamp() });
      setText("");
    } catch (problem) { setError(errorMessage(problem)); }
    finally { setBusy(false); }
  };

  return <section className="dossier-chat">
    <header><span aria-hidden="true">{contact.slice(0, 1).toUpperCase()}</span><div><h3>{contact}</h3><p>{room.pitchTitle}</p></div></header>
    <div className="dossier-chat-thread" ref={thread} role="log" aria-live="polite" aria-label={"Conversation with " + contact}>
      {!messages.length && <p className="dossier-chat-empty">Start the conversation about this pitch.</p>}
      {messages.map(([id, message]) => <div className={"dossier-bubble " + (message.senderId === user.uid ? "mine" : "")} key={id}>
        {message.text}
        <time>{Number.isFinite(message.timestamp) ? new Date(message.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}</time>
      </div>)}
    </div>
    <form onSubmit={(event) => { event.preventDefault(); void send(); }}>
      <input aria-label="Message" placeholder="Type a message…" value={text} onChange={(event) => setText(event.target.value)} maxLength={4000} disabled={busy} />
      <button type="submit" aria-label="Send message" disabled={busy || !text.trim()}><Send size={17} /></button>
    </form>
    {error && <p className="dossier-error" role="alert">{error}</p>}
  </section>;
}

function CommunityButton({ user, founderId }: { user: User; founderId: string }) {
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => subscribeToFollowing(user.uid, (ids) => setAdded(ids?.includes(founderId) ?? false)), [user.uid, founderId]);
  return <div className="space-y-2">
    <button type="button" className="dossier-secondary w-full" disabled={added || busy || user.uid === founderId}
      onClick={async () => {
        setBusy(true);
        setError("");
        try { await followUser(user.uid, founderId); setAdded(true); } catch (problem) { setError(errorMessage(problem)); }
        finally { setBusy(false); }
      }}>{added ? "Founder added to your community" : "Add Founder to My Community"}</button>
    {error && <p className="dossier-error" role="alert">{error}</p>}
  </div>;
}

function EscrowStage({ user, agreement }: { user: User; agreement: DossierAgreement }) {
  const [unlocked, setUnlocked] = useState<UnlockedAgreement>();
  const [payment, setPayment] = useState<{ id: string; amountPkr: number; chunks: number }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const path = "/api/agreements/" + agreement.id;
  const countersigned = agreement.status === "COUNTERSIGNED";
  useEffect(() => {
    if (!unlocked) return;
    const timer = window.setTimeout(() => setUnlocked(undefined), Math.max(0, unlocked.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [unlocked]);
  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try { await task(); } catch (problem) { setError(errorMessage(problem)); } finally { setBusy(false); }
  };
  return <>
    <section className="dossier-card space-y-4">
      <p className="dossier-status" role="status">{countersigned ? <Check size={20} /> : <Clock3 size={20} />}
        {countersigned ? "Founder countersigned" : "Waiting for Founder Signature & CNIC…"}</p>
      <AllocationSummary allocation={agreement.allocation} />
      <button className="dossier-primary" type="button" disabled={!countersigned || busy || !!payment}
        onClick={() => void run(async () => setPayment(await dossierCall<{ id: string; amountPkr: number; chunks: number }>(user, path + "/escrow", "POST")))}>Proceed to Escrow Payment <ArrowRight size={17} /></button>
      {payment && <div role="status" className="dossier-item space-y-2 p-4">
        <p className="font-semibold">{formatPkr(payment.amountPkr)} for {payment.chunks} chunks</p>
        <p>Escrow checkout reference <code className="break-all">{payment.id}</code></p>
        <p>Live payment is unavailable until a payment provider is connected.</p>
      </div>}
    </section>
    <section className="dossier-card space-y-3">
      <h3 className="text-lg font-semibold">Signed agreement</h3>
      {!unlocked ? <button className="dossier-secondary" type="button" disabled={busy} onClick={() => void run(async () => {
        const proof = await verifyDossierDevice(user, agreement.id);
        const verified = await dossierCall<UnlockedAgreement>(user, path + "/unlock", "POST", proof);
        setUnlocked(verified);
      })}><Fingerprint size={19} /> Unlock with your device</button> :
        <div className="space-y-3">
          <SignedDocument user={user} path={path} unlocked={unlocked} />
          <p>Signature recorded via {unlocked.signatureMethod === "VIDEO" ? "video signing" : "digital signature pad"}.</p>
          <div className="flex flex-wrap gap-2">
          {[
            ["document", "Download signed agreement", "agreement." + unlocked.extension],
            ["investor-signature", "Download investor signature", "investor-signature.png"],
            ...(unlocked.hasFounderSignature ? [["founder-signature", "Download founder signature", "founder-signature.png"]] : []),
          ].map(([part, label, name]) => <button className="dossier-secondary" type="button" key={part} disabled={busy} onClick={() => void run(async () => {
            const form = new FormData();
            form.append("grant", unlocked.grant);
            await downloadDossierFile(user, path + "/signed-files/" + part, name, form);
          })}>{label}</button>)}
          <button type="button" className="dossier-secondary" onClick={() => setUnlocked(undefined)}>Lock agreement</button>
          </div>
        </div>}
    </section>
    {error && <p className="dossier-error" role="alert">{error}</p>}
  </>;
}

function SignedDocument({ user, path, unlocked }: { user: User; path: string; unlocked: UnlockedAgreement }) {
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (unlocked.extension !== "pdf") return;
    const controller = new AbortController();
    const form = new FormData();
    form.append("grant", unlocked.grant);
    let url = "";
    void backendRequest(user, path + "/signed-files/document", { method: "POST", body: form, signal: controller.signal })
      .then((response) => response.blob()).then((blob) => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setPreview(url);
      }).catch((problem) => { if (!controller.signal.aborted) setError(errorMessage(problem)); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [user, path, unlocked]);

  if (error) return <p className="dossier-error" role="alert">{error}</p>;
  if (unlocked.extension === "docx") return <div className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-4 text-sm text-[#0B132B]">
    {unlocked.documentPreview || "Download the signed agreement document to view the terms."}
  </div>;
  if (!preview) return <p role="status">Loading signed agreement…</p>;
  return <object className="h-96 w-full rounded-xl bg-white text-[#0B132B]" data={preview} type="application/pdf" aria-label="Signed agreement PDF">
    <p className="p-4">Use Download signed agreement to open this PDF.</p>
  </object>;
}