import { useRef, useState } from "react";
import { Sparkles, Mic, MicOff, Wand2, FileText, CheckCircle2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type AiProfileBuilderProps = {
  onGenerate: (bio: string) => void;
  accent?: "amber" | "emerald" | "violet";
  className?: string;
};

const ACCENTS = {
  amber: { text: "text-amber-600", bg: "from-amber-500 to-orange-500", chip: "bg-amber-50 border-amber-200 text-amber-700" },
  emerald: { text: "text-emerald-600", bg: "from-emerald-500 to-teal-500", chip: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  violet: { text: "text-violet-600", bg: "from-violet-500 to-purple-500", chip: "bg-violet-50 border-violet-200 text-violet-700" },
};

const TEMPLATES = [
  {
    label: "Wholesaler — Mobile Accessories",
    text: "Main Gujranwala se mobile accessories ka wholesaler hoon. Screen protectors, covers, chargers bulk mein supply karta hoon. Quality high, rate market se kam, fast delivery poore Pakistan mein.",
  },
  {
    label: "Wholesaler — Food / Grocery",
    text: "Hum premium rice, daalein aur grocery items ka bulk supply karte hain. Apni factory se direct packaging, hygienic process, aur shops ke liye monthly credit terms available hain.",
  },
  {
    label: "Wholesaler — Garments",
    text: "Readymade garments aur fabric ka wholesale. Latest designs, bulk stitching capacity, aur retailers ke liye flexible MOQ. Sample order facility bhi maujood hai.",
  },
  {
    label: "Small seller — simple",
    text: "Main ek chhota wholesaler hoon. Apne products acche rate par bechta hoon aur customers ko time par delivery deta hoon. Quality aur trust meri pehchaan hai.",
  },
];

export function AiProfileBuilder({ onGenerate, accent = "amber", className = "" }: AiProfileBuilderProps) {
  const a = ACCENTS[accent];
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const recogRef = useRef<any>(null);

  const toggleVoice = () => {
    setVoiceError("");
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setVoiceError("Voice input is browser mein supported nahi. Type karke likhein.");
      return;
    }
    if (listening) {
      recogRef.current?.stop();
      setListening(false);
      return;
    }
    const recog = new SR();
    recog.lang = "ur-PK";
    recog.interimResults = true;
    recog.continuous = true;
    recog.onresult = (e: any) => {
      let transcript = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      setText((prev) => (prev ? prev + " " : "") + transcript);
    };
    recog.onerror = () => {
      setVoiceError("Voice capture fail hui. Mic permission allow karein.");
      setListening(false);
    };
    recog.onend = () => setListening(false);
    recogRef.current = recog;
    recog.start();
    setListening(true);
  };

  const generate = () => {
    const base = text.trim();
    if (!base) return;
    // lightweight "AI" formatting of the raw input/voice into a polished bio
    const polished =
      base.charAt(0).toUpperCase() +
      base.slice(1) +
      (base.endsWith(".") ? "" : ".") +
      " Verified supplier on SmartBiz · bulk-ready · quality guaranteed.";
    onGenerate(polished);
    setGenerated(true);
    setTimeout(() => setGenerated(false), 3000);
  };

  return (
    <div className={`rounded-2xl border border-dashed p-4 ${a.chip} ${className}`}>
      <div className="mb-3 flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${a.bg} text-white`}>
          <Wand2 className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">AI Profile Builder</p>
          <p className="text-[11px] text-slate-500">Likhein ya bolein — AI aapki profile bana dega. Parhe-likhe na hon to bhi easy.</p>
        </div>
      </div>

      <div className="relative">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Apne business ke baare mein batayein... (ya mic dabakar bolein)"
          className="resize-none bg-white pr-12"
        />
        <button
          type="button"
          onClick={toggleVoice}
          className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg text-white transition-all ${
            listening ? "animate-pulse bg-red-500" : `bg-gradient-to-br ${a.bg}`
          }`}
          aria-label="Voice input"
        >
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
      </div>
      {listening && <p className="mt-1 text-[11px] font-medium text-red-500">● Sun raha hoon... boliye</p>}
      {voiceError && <p className="mt-1 text-[11px] font-medium text-red-500">{voiceError}</p>}

      {/* Templates */}
      <div className="mt-3">
        <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
          <FileText className="h-3 w-3" /> Examples (tap to use)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setText(t.text)}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-600 transition-colors hover:border-slate-400"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={generate} disabled={!text.trim()} className={`mt-3 w-full gap-2 bg-gradient-to-r ${a.bg} text-white disabled:opacity-50`}>
        <Sparkles className="h-4 w-4" /> Generate My Profile
      </Button>
      {generated && (
        <p className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> Profile generate ho gayi!
        </p>
      )}
    </div>
  );
}
