import { useEffect, useState } from "react";
import { equalTo, onValue, orderByChild, query, ref } from "firebase/database";
import { Fingerprint } from "lucide-react";
import type { User } from "firebase/auth";
import { database } from "@/firebase";
import type { StartupIdea } from "@/data/startupIdeas";
import { AllocationSummary, DossierChat, DossierFrame } from "@/components/investor/PitchDossier";
import { AgreementPreview, ContractSignatureForm } from "@/components/investor/DossierSigning";
import { backendRequest } from "@/lib/backendClient";
import {
  dossierCall, errorMessage, type AgreementDocument, type DossierAgreement, type DossierRoom, type SampleOrder,
} from "@/lib/pitchDossier";

type PitchMetrics = { activeReaders: number; interestedInvestors: number; reservedChunks: number; fundedChunks: number; totalChunks: number };

export function FounderDossierDesk({ user, ideas }: { user: User; ideas: StartupIdea[] }) {
  const [orders, setOrders] = useState<SampleOrder[]>([]);
  const [agreements, setAgreements] = useState<DossierAgreement[]>([]);
  const [rooms, setRooms] = useState<DossierRoom[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, PitchMetrics>>({});
  const [analyticsError, setAnalyticsError] = useState("");
  const [error, setError] = useState("");
  const [contractId, setContractId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [showChat, setShowChat] = useState(true);
  const contract = agreements.find((item) => item.id === contractId);
  const room = rooms.find((item) => item.id === roomId);

  useEffect(() => {
    let active = true;
    let pending = false;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try {
        const result = await dossierCall<Record<string, PitchMetrics>>(user, "/api/founder-workspace/analytics");
        if (active) { setAnalytics(result); setAnalyticsError(""); }
      } catch (problem) {
        if (active) setAnalyticsError(errorMessage(problem));
      } finally { pending = false; }
    };
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 10_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [user]);

  useEffect(() => {
    const uid = user.uid;
    const fail = () => setError("Live dossier updates are unavailable. Check the Firebase Realtime Database rules.");
    const ownerQuery = (path: string) => query(ref(database, path), orderByChild("founderId"), equalTo(uid));
    const unsubscribes = [
      onValue(ownerQuery("sampleOrders"), (snapshot) => setOrders(Object.values(snapshot.val() ?? {}) as SampleOrder[]), fail),
      onValue(ownerQuery("agreements"), (snapshot) => setAgreements(Object.values(snapshot.val() ?? {}) as DossierAgreement[]), fail),
      onValue(ref(database, "dossierFounderChats/" + uid), (snapshot) => setRooms(Object.values(snapshot.val() ?? {}) as DossierRoom[]), fail),
    ];
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [user.uid]);

  return <DossierFrame>
    <h2 className="dossier-stage-title">Investor pitch workspace</h2>
    {error && <p className="dossier-error" role="alert">{error}</p>}
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)]">
      <div className="min-w-0 space-y-4">
        <section className="dossier-card space-y-3">
          <h3 className="text-lg font-semibold">Pitch analytics</h3>
          {analyticsError && <p role="alert" className="dossier-error">{analyticsError}</p>}
          {ideas.length ? ideas.map((idea) => {
            const metrics = analytics[idea.id];
            return <div className="dossier-item space-y-2 p-4" key={idea.id}>
              <p className="font-semibold">{idea.startupTitle}</p>
              {metrics ? <dl className="dossier-metrics">
                <div><dt>Reading now</dt><dd>{metrics.activeReaders}</dd></div>
                <div><dt>Interested investors</dt><dd>{metrics.interestedInvestors}</dd></div>
                <div><dt>Funded chunks</dt><dd>{metrics.fundedChunks} / {metrics.totalChunks}</dd></div>
                <div><dt>Reserved chunks</dt><dd>{metrics.reservedChunks}</dd></div>
              </dl> : <p className="text-sm text-slate-300">Waiting for live analytics.</p>}
              {!!metrics?.totalChunks && <progress className="w-full accent-orange-400" max={metrics.totalChunks} value={Math.min(metrics.fundedChunks, metrics.totalChunks)}
                aria-label={idea.startupTitle + " funded chunks"} />}
            </div>;
          }) : <p>Publish a pitch to see investor activity.</p>}
        </section>
        <section className="dossier-card space-y-3">
          <h3 className="text-lg font-semibold">Sample requests</h3>
          {orders.length ? orders.map((order) => <SampleDelivery key={order.id} order={order} user={user} />) : <p>No sample requests yet.</p>}
        </section>
        <section className="dossier-card space-y-3">
          <h3 className="text-lg font-semibold">Agreement countersignatures</h3>
          {agreements.length ? <label className="block">Select an agreement
            <select className="dossier-input" value={contractId} onChange={(event) => setContractId(event.target.value)}>
              <option value="">Choose an agreement</option>
              {[...agreements].sort((a, b) => Number(a.status === "COUNTERSIGNED") - Number(b.status === "COUNTERSIGNED") || b.signedAt - a.signedAt)
                .map((row) => <option key={row.id} value={row.id}>{row.investorName ?? "Investor"} · {row.pitchTitle} · {row.status === "COUNTERSIGNED" ? "Countersigned" : "Awaiting signature"}</option>)}
            </select>
          </label> : <p>No agreements to countersign yet.</p>}
          {contract && <FounderAgreement key={contract.id} user={user} agreement={contract} />}
        </section>
      </div>
      <aside className="dossier-card min-w-0 space-y-3 lg:sticky lg:top-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">Investor chat</h3>
          <button type="button" className="dossier-secondary lg:hidden" aria-expanded={showChat} onClick={() => setShowChat(!showChat)}>
            {showChat ? "Hide chat" : "Show chat"}
          </button>
        </div>
        <div className={showChat ? "space-y-3" : "hidden lg:block lg:space-y-3"}>
          {rooms.length ? <label className="block">Select a conversation
            <select className="dossier-input" value={roomId} onChange={(event) => setRoomId(event.target.value)}>
              <option value="">Choose a conversation</option>
              {rooms.map((entry) => <option key={entry.id} value={entry.id}>{entry.investorName} · {entry.pitchTitle}</option>)}
            </select>
          </label> : <p>No investor conversations yet.</p>}
          {room && <DossierChat key={room.id} room={room} user={user} contact={room.investorName} />}
        </div>
      </aside>
    </div>
  </DossierFrame>;
}

function SampleDelivery({ order, user }: { order: SampleOrder; user: User }) {
  const [estimate, setEstimate] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = order.status === "APPROVED" || (order.estimatedDeliveryAt ?? Infinity) <= Date.now();
  return <div className="dossier-item space-y-2 p-4">
    <h4 className="font-semibold">{order.productName} · {order.pitchTitle}</h4>
    <p>{order.address} · {order.phone}</p>
    <p>{order.status === "APPROVED" ? "Sample received and approved" : order.estimatedDeliveryAt
      ? "Estimated delivery " + new Date(order.estimatedDeliveryAt).toLocaleString() : "Waiting for delivery estimate"}</p>
    {!locked && <form className="flex flex-wrap items-end gap-2" onSubmit={async (event) => {
      event.preventDefault();
      setBusy(true);
      setError("");
      try {
        await dossierCall(user, "/api/samples/" + order.id + "/delivery", "PUT", { estimatedDeliveryAt: new Date(estimate).getTime() });
        setStatus("Delivery time saved.");
      } catch (problem) { setError(errorMessage(problem)); }
      finally { setBusy(false); }
    }}>
      <label>Estimated delivery time<input className="dossier-input" type="datetime-local" required value={estimate}
        onChange={(event) => setEstimate(event.target.value)} /></label>
      <button type="submit" className="dossier-primary" disabled={busy}>Save delivery time</button>
    </form>}
    {error && <p className="dossier-error" role="alert">{error}</p>}
    {status && <p role="status">{status}</p>}
  </div>;
}

function FounderAgreement({ user, agreement }: { user: User; agreement: DossierAgreement }) {
  const [doc, setDoc] = useState<AgreementDocument>();
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const path = "/api/agreements/" + agreement.id;

  useEffect(() => {
    let active = true;
    void dossierCall<AgreementDocument>(user, path + "/founder-preview").then((value) => {
      if (active) setDoc(value);
    }).catch((problem) => {
      if (active) setError(errorMessage(problem));
    });
    return () => { active = false; };
  }, [path, user]);

  return <div className="space-y-3">
    <p>Investor · <strong>{agreement.investorName || "Investor"}</strong></p>
    {agreement.investorBiometricHash && <p className="dossier-status"><Fingerprint size={17} /> Device-locked agreement</p>}
    <AllocationSummary allocation={agreement.allocation} />
    {agreement.status === "AWAITING_FOUNDER" && !confirmed && agreement.founderReviewShared &&
      <InvestorEvidence user={user} endpoint={path + "/founder-evidence"} />}
    {error && <p role="alert" className="dossier-error">{error}</p>}
    {doc && <AgreementPreview user={user} endpoint={path + "/founder-document"} document={doc} />}
    {agreement.status === "COUNTERSIGNED" || confirmed ? <p role="status">Agreement countersigned. Escrow checkout is available to the investor.</p>
      : doc && <ContractSignatureForm user={user} contractId={agreement.id} onSigned={() => setConfirmed(true)} />}
  </div>;
}
function InvestorEvidence({ user, endpoint }: { user: User; endpoint: string }) {
  const [part, setPart] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    setUrl("");
    setError("");
    if (!part) return;
    const controller = new AbortController();
    let objectUrl = "";
    void backendRequest(user, endpoint + "/" + part, { signal: controller.signal })
      .then((response) => response.blob()).then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }).catch((problem) => { if (!controller.signal.aborted) setError(errorMessage(problem)); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [user, endpoint, part]);

  return <section className="dossier-item space-y-2 p-3">
    <h4 className="font-semibold">Investor identity and signature</h4>
    <div className="flex flex-wrap gap-2">
      {[["cnic-front", "CNIC front"], ["cnic-back", "CNIC back"], ["signature", "Signature"]].map(([name, label]) =>
        <button type="button" className="dossier-secondary" key={name} onClick={() => setPart(part === name ? "" : name)} aria-pressed={part === name}>{label}</button>)}
    </div>
    {url && <img src={url} className="max-h-80 rounded-lg bg-white object-contain" alt={part === "signature" ? "Investor signature" : "Investor " + part.replace("-", " ")} />}
    {part && !url && !error && <p role="status">Loading private evidence…</p>}
    {error && <p className="dossier-error" role="alert">{error}</p>}
  </section>;
}