import { useEffect, useRef, useState } from "react";
import { Bot, ScanLine, Sparkles, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IDEA_STAGE_URDU, IDEA_TERM_URDU, type IdeaBrief, type IdeaStage } from "@/lib/ideaBriefing";
import { backendRequest } from "@/lib/backendClient";
import { auth } from "@/firebase";
import "./idea-briefing-agent.css";

export function IdeaBriefingAgent({ brief, stage, question }: {
  brief: IdeaBrief; stage: IdeaStage; question?: string;
}) {
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [manualAudio, setManualAudio] = useState("");
  const initialText = useRef(brief.intro + " " + brief.steps[stage]);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const controller = useRef<AbortController | null>(null);
  const localAudio = useRef<{ element: HTMLAudioElement; url: string } | null>(null);
  const note = (question && brief.terms?.[question]) || brief.steps[stage];
  const heading = (question && IDEA_TERM_URDU[question]) || IDEA_STAGE_URDU[stage];

  const stop = () => {
    controller.current?.abort();
    controller.current = null;
    if (utterance.current) {
      utterance.current = null;
      window.speechSynthesis.cancel();
    }
    if (localAudio.current) {
      localAudio.current.element.pause();
      URL.revokeObjectURL(localAudio.current.url);
      localAudio.current = null;
    }
  };

  const speak = async (text: string) => {
    stop();
    setAudioError(false);
    setManualAudio("");
    setSpeaking(false);
    const synthesis = window.speechSynthesis;
    const voices = synthesis?.getVoices() ?? [];
    const voice = voices.find((entry) => entry.lang.toLowerCase() === "ur-pk") ??
      voices.find((entry) => /^ur(?:-|_|$)/i.test(entry.lang));
    if (voice && "SpeechSynthesisUtterance" in window) {
      const current = new SpeechSynthesisUtterance(text);
      current.voice = voice;
      current.lang = voice.lang;
      current.rate = 0.94;
      utterance.current = current;
      current.onstart = () => { if (utterance.current === current) setSpeaking(true); };
      current.onend = () => { if (utterance.current === current) { utterance.current = null; setSpeaking(false); } };
      current.onerror = (event) => {
        if (utterance.current !== current) return;
        utterance.current = null;
        setSpeaking(false);
        if (event.error !== "canceled" && event.error !== "interrupted") void speakLocally(text);
      };
      synthesis.speak(current);
      return;
    }
    await speakLocally(text);
  };

  const speakLocally = async (text: string) => {
    const user = auth.currentUser;
    if (!user) { setAudioError(true); return; }
    const request = new AbortController();
    controller.current = request;
    setLoading(true);
    try {
      const reply = await backendRequest(user, "/api/marketplace/briefing-audio", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 1200) }), signal: request.signal,
      });
      const clip = await reply.blob();
      if (request.signal.aborted) return;
      const url = URL.createObjectURL(clip);
      const element = new Audio(url);
      localAudio.current = { element, url };
      element.onended = () => {
        if (localAudio.current?.element === element) {
          URL.revokeObjectURL(url);
          localAudio.current = null;
          setSpeaking(false);
        }
      };
      try {
        await element.play();
        if (!request.signal.aborted) setSpeaking(true);
      } catch (error) {
        if (request.signal.aborted) return;
        if (error instanceof DOMException && error.name === "NotAllowedError") {
          setManualAudio(url);
        } else {
          URL.revokeObjectURL(url);
          localAudio.current = null;
          setAudioError(true);
        }
      }
    } catch {
      if (!request.signal.aborted) setAudioError(true);
    } finally {
      if (controller.current === request) {
        controller.current = null;
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (navigator.userActivation?.hasBeenActive) void speak(initialText.current);
    return stop;
  }, []);

  return <aside id="idea-briefing-agent" aria-label="پچ کی اردو بریفنگ" lang="ur-PK" tabIndex={-1} className="idea-agent mb-6">
    <div className="idea-agent-visual" aria-hidden="true">
      <div className="idea-agent-orbit" />
      <div className="idea-agent-avatar"><Bot size={44} strokeWidth={1.4} /></div>
      <Sparkles className="idea-agent-spark" size={22} />
      <span className="idea-agent-signal"><i /><i /><i /><i /></span>
    </div>
    <div className="idea-agent-content" dir="rtl">
      <p className="idea-agent-label"><ScanLine size={14} /> پچ کی اردو بریفنگ</p>
      <h2>{brief.intro}</h2>
      <div className="idea-agent-note" aria-live="polite">
        <strong>{heading}</strong>
        <p>{note}</p>
      </div>
      <Button type="button" size="sm" variant="outline" className="idea-agent-play" disabled={loading}
        onClick={() => { if (speaking) { stop(); setSpeaking(false); } else void speak(brief.intro + " " + note); }}>
        {speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
        {loading ? "آواز تیار ہو رہی ہے" : speaking ? "آواز بند کریں" : "اردو میں سنیں"}
      </Button>
      {manualAudio && <audio className="mt-2 max-w-full" aria-label="اردو بریفنگ" controls src={manualAudio} />}
      {audioError && <p role="status" className="mt-2 text-sm">اردو آواز چل نہیں سکی۔ بریفنگ اوپر پڑھ سکتے ہیں۔</p>}
    </div>
  </aside>;
}
