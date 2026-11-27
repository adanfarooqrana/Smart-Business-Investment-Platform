import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AllocationSummary, DossierFrame } from "@/components/investor/PitchDossier";
import { AgreementPreview, ContractSignatureForm } from "@/components/investor/DossierSigning";
import { dossierCall, errorMessage, type VideoSigningPacket } from "@/lib/pitchDossier";

export const Route = createFileRoute("/sign-agreement/$token")({
  component: VideoSigningPage,
});

function VideoSigningPage() {
  const { token } = Route.useParams();
  const { currentUser, loading } = useAuth();
  const [packet, setPacket] = useState<VideoSigningPacket>();
  const [error, setError] = useState("");
  const [signed, setSigned] = useState(false);
  const endpoint = "/api/agreements/video-link/" + encodeURIComponent(token);

  useEffect(() => {
    setPacket(undefined);
    setError("");
    setSigned(false);
    if (!currentUser) return;
    let active = true;
    void dossierCall<VideoSigningPacket>(currentUser, endpoint).then((result) => {
      if (active) setPacket(result);
    }).catch((problem) => {
      if (active) setError(errorMessage(problem));
    });
    return () => { active = false; };
  }, [currentUser, endpoint]);

  return <DossierFrame>
    <Link className="dossier-back" to="/app/investor" referrerPolicy="no-referrer">Ideas Feed</Link>
    <header className="dossier-hero">
      <h1>{packet?.title ?? "Video agreement signing"}</h1>
    </header>
    {loading || (currentUser && !packet && !error) ? <p role="status">Checking signing access…</p> : null}
    {!loading && !currentUser && <p className="dossier-card">
      <Link className="dossier-secondary" to="/app/login" target="_blank" rel="noopener noreferrer">Sign in</Link>
      {" "}using the account that received this link. Return here to continue.
    </p>}
    {error && <p role="alert" className="dossier-error">{error}</p>}
    {currentUser && packet && (signed ?
      <section className="dossier-card space-y-3">
        <p role="status">Signature received. Your agreement is waiting for the founder to countersign.</p>
        <Link className="dossier-primary" to="/app/investor/idea/$ideaId"
          params={{ ideaId: packet.selection.pitchId }} search={{ founderId: packet.selection.founderId, stage: 4 }}>
          View agreement status
        </Link>
      </section> :
      <div className="space-y-4">
        <AllocationSummary allocation={packet.allocation} />
        <AgreementPreview user={currentUser} document={packet.document} endpoint={endpoint + "/document"} />
        <ContractSignatureForm user={currentUser} selection={packet.selection} videoToken={token} onSigned={() => setSigned(true)} />
      </div>)}
  </DossierFrame>;
}