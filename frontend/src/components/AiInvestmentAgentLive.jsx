import React from "react";

const CONVERSATION = [
  { role: "agent", title: "Pitch review complete", text: "Hello Adan! I just scanned all 3 stages submitted by the entrepreneur (Idea Overview, Shop Proofs & Financials, and Digital Agreement). Everything is verified and ready for your review." },
  { role: "investor", text: "Is startup mein kitna invest karoon aur is ke assets kitne ke hain?" },
  { role: "agent", title: "Assets & investment", text: "Verified physical assets (machinery, stall setup & inventory) are valued at **Rs. 3.2 Lakh**. I recommend starting with a safe micro-investment of **Rs. 25,000 \u2013 Rs. 40,000** (10% equity chunk) rather than going all-in at once." },
  { role: "investor", text: "Is mein kitna nuqsan (risk) ho sakta hai?" },
  { role: "agent", title: "Financial risk review", text: "Financial Risk Score: **Low-to-Moderate (22%)**. Because hard assets back this business and 20% capital stays locked in escrow protection, your downside is strictly capped\u2014and you share real operational profit/loss transparently." },
  { role: "investor", text: "Abhi agreement sign kar doon ya nahi? Abhi kya karoon?" },
  { role: "agent", title: "Agreement & next action", text: "Hold on signing just yet! In Stage 3, profit payout starts too late. I have already sent an automated message to the entrepreneur to update the clause to **3-month profit distribution**. Meanwhile, **order a product sample first** and submit your review." },
  { role: "agent", title: "Ongoing tracking", text: "I will continuously monitor profit dates and weekly entrepreneur updates. You will get instant alerts on WhatsApp & SMS:" },
];

function getSimulatedReply(question) {
  const replies = [
    [/risk|nuqsan|loss|escrow/i, "This example pitch has a **22% modelled risk score** and a **20% escrow allocation**. Actual losses would depend on the business, asset recovery and contract terms. Those illustrative figures are part of this simulation."],
    [/sample|product/i, "I suggest **ordering a product sample first**. Compare its quality with the entrepreneur's pricing, then submit a review before deciding about full funding."],
    [/agreement|clause|contract|sign|terms/i, "The demo agreement update proposes **3-month profit distribution**. Review the revised payout dates and the Week-1 video proof, and check the product sample before signing."],
    [/roi|profit|payout|return|munafa/i, "For this example, I proposed **profit distribution after 3 months**. The agreement should also specify payout frequency, responsibilities and the evidence required for each milestone."],
    [/update|whatsapp|sms|monitor|track/i, "The notification preview demonstrates a founder updating the **3-month profit clause** and uploading **Week-1 video proof**. WhatsApp & SMS delivery is represented by the alert card in this simulation."],
    [/worth|valuation|lakh|pricing|price|asset|invest|amount|kitna/i, "The example pitch lists **Rs. 3.2 Lakh in physical assets** and an illustrative **Rs. 25,000 \u2013 Rs. 40,000** starting investment. Examine the asset evidence, equity terms and payout schedule together before deciding."],
  ];
  return replies.find(([pattern]) => pattern.test(question))?.[1]
    || "I can help you explore this example pitch's **assets, investment amount, risk, agreement or product sample**. Which detail would you like to examine?";
}

function FormattedReply({ text }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : <React.Fragment key={index}>{part}</React.Fragment>
  );
}

function RoboAgent({ id }) {
  const paint = name => "url(#" + id + "-" + name + ")";
  return <div className="ail-robo-area">
    <div className="ail-speech">&#10024; Always here for you &mdash; Join us</div>
    <svg className="ail-robo" viewBox="0 0 260 235" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={id + "-white"} x1="80" y1="45" x2="178" y2="188" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" /><stop offset=".65" stopColor="#FBFCFE" /><stop offset="1" stopColor="#DDE5EE" />
        </linearGradient>
        <linearGradient id={id + "-orange"} x1="107" y1="118" x2="158" y2="185" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFBF76" /><stop offset=".5" stopColor="#E67E22" /><stop offset="1" stopColor="#C86417" />
        </linearGradient>
        <linearGradient id={id + "-visor"} x1="92" y1="50" x2="170" y2="102" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFEFA" /><stop offset="1" stopColor="#FFEACF" />
        </linearGradient>
        <filter id={id + "-shadow"} x="-40%" y="-40%" width="190%" height="190%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#B66C24" floodOpacity=".13" />
        </filter>
      </defs>
      <ellipse className="ail-robo-shadow" cx="131" cy="216" rx="51" ry="6" fill="#E67E22" opacity=".12" />
      <g className="ail-robo-float" strokeLinecap="round" strokeLinejoin="round" filter={paint("shadow")}>
        <path d="M110 180v15m42-15v15" stroke="#D9E2EC" strokeWidth="13" />
        <rect x="96" y="190" width="29" height="13" rx="6.5" fill={paint("orange")} stroke="#DB8B43" />
        <rect x="138" y="190" width="29" height="13" rx="6.5" fill={paint("orange")} stroke="#DB8B43" />
        <path d="M101 132c-13 3-22 13-24 26" stroke="#DDE5ED" strokeWidth="14" />
        <path d="M100 132c-12 2-20 12-23 23" stroke="#FFFFFF" strokeWidth="8" />
        <ellipse cx="76" cy="165" rx="10" ry="13" transform="rotate(19 76 165)" fill={paint("orange")} stroke="#DF934E" />
        <path d="M161 133c13-1 21-9 22-20" stroke="#E3E9F0" strokeWidth="14" />
        <path d="M161 132c12 0 18-8 20-19" stroke="#FFFFFF" strokeWidth="8" />
        <g transform="rotate(15 184 103)">
          <rect x="174" y="91" width="18" height="27" rx="9" fill={paint("white")} stroke="#DFE6ED" />
          <path d="M177 99v-9m5 7V86m5 11V88m4 14v-8" stroke="#E99B53" strokeWidth="4" />
          <path d="m175 108-5-7" stroke="#E99B53" strokeWidth="5" />
        </g>
        <path d="M105 120h52l10 21-6 38c-2 9-52 9-56 0l-9-38Z" fill={paint("white")} stroke="#D8E1EA" />
        <path d="M108 124h46" stroke="#FFFFFF" strokeWidth="4" />
        <rect x="115" y="111" width="33" height="15" rx="6" fill={paint("orange")} stroke="#DD8E46" />
        <circle cx="132" cy="152" r="18" fill={paint("orange")} stroke="#E8A665" />
        <circle cx="132" cy="152" r="13" stroke="#FFD9AF" strokeOpacity=".7" />
        <path d="m132 141 2.8 8.2 8.2 2.8-8.2 2.8-2.8 8.2-2.8-8.2-8.2-2.8 8.2-2.8Z" fill="#FFFFFF" />
        <path d="M116 178h9m5 0h4m5 0h8" stroke="#C9D6E2" strokeWidth="2" />
        <g className="ail-robo-head">
          <path d="M131 40V25" stroke="#D7E0EA" strokeWidth="4" />
          <circle cx="131" cy="20" r="6" fill={paint("orange")} stroke="#F5B771" />
          <rect x="65" y="62" width="16" height="27" rx="8" fill={paint("orange")} stroke="#DB8B43" />
          <rect x="182" y="62" width="16" height="27" rx="8" fill={paint("orange")} stroke="#DB8B43" />
          <rect x="76" y="36" width="109" height="82" rx="29" fill={paint("white")} stroke="#D6E0EA" />
          <path d="M95 43c21-6 52-6 71 0" stroke="#FFFFFF" strokeWidth="3" />
          <rect x="89" y="50" width="83" height="50" rx="19" fill={paint("visor")} stroke="#EBCFAB" />
          <ellipse cx="113" cy="71" rx="6" ry="8" fill="#E67E22" />
          <ellipse cx="148" cy="71" rx="6" ry="8" fill="#E67E22" />
          <circle cx="115" cy="68" r="1.8" fill="#FFEACC" /><circle cx="150" cy="68" r="1.8" fill="#FFEACC" />
          <path d="M121 88q10 10 20 0" stroke="#DC7A25" strokeWidth="2.8" />
          <circle cx="101" cy="85" r="4" fill="#F4BD87" opacity=".4" /><circle cx="160" cy="85" r="4" fill="#F4BD87" opacity=".4" />
        </g>
      </g>
      <path d="m211 66 2-6 2 6 6 2-6 2-2 6-2-6-6-2Z" fill="#F3AD61" opacity=".55" />
      <path d="m44 129 1.5-4 1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5Z" fill="#E67E22" opacity=".3" />
    </svg>
  </div>;
}

function AgentAvatar({ header = false }) {
  return <span className={"ail-avatar" + (header ? " ail-avatar-header" : "")} aria-hidden="true">
    <svg viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 3 10 6v13l-10 7-10-7V9Z" stroke="currentColor" strokeWidth="1.3" opacity=".4" />
      <path d="m16 8 2.2 5.8L24 16l-5.8 2.2L16 24l-2.2-5.8L8 16l5.8-2.2Z" fill="currentColor" />
      <circle cx="6" cy="9" r="2" fill="currentColor" /><circle cx="26" cy="22" r="2" fill="currentColor" />
      <path d="M24 7v4m-2-2h4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
    {header && <span className="ail-online-dot" />}
  </span>;
}

function TypingDots() {
  return <div className="ail-message ail-agent" role="status" aria-label="InvestBiz AI Investment Agent is typing">
    <AgentAvatar />
    <div className="ail-typing" aria-hidden="true"><i /><i /><i /></div>
  </div>;
}

const styles = `
.ail-shell { width:100%; margin:12px 0; padding:0 16px; background:#f5f5f5; scroll-margin-top:100px; }
.ail-shell *, .ail-shell *::before, .ail-shell *::after { box-sizing:border-box; }
.ail { --ail-orange:#E67E22; max-width:80rem; margin:0 auto; padding:clamp(25px,3.2vw,42px); border:1px solid #E2E8F0; border-radius:36px; background:radial-gradient(ellipse at 85% 0,rgba(230,126,34,.12),transparent 60%),linear-gradient(135deg,#FFFDF9,#FFF7ED); color:#0F172A; box-shadow:0 2px 3px #1f352b05; font-family:Inter,system-ui,sans-serif; }
.ail-layout { display:grid; grid-template-columns:minmax(0,.86fr) minmax(0,1.14fr); gap:clamp(28px,3.5vw,52px); align-items:center; }
.ail-editorial { padding-block:16px; }
.ail h2 { max-width:420px; margin:0 0 22px; font-family:Outfit,Inter,system-ui,sans-serif; font-size:clamp(32px,3.6vw,46px); font-weight:550; letter-spacing:-.045em; line-height:1.13; }
.ail h2 em { font-style:normal; color:var(--ail-orange); }
.ail-intro { max-width:390px; margin:0; color:#475569; font-size:14px; line-height:1.85; }
.ail-chat { position:relative; display:grid; grid-template-rows:auto auto minmax(0,1fr) auto; min-width:0; height:660px; overflow:hidden; border:1px solid #E2E8F0; border-radius:23px; background:#FFFFFF; box-shadow:0 16px 42px #233d2b0c,0 3px 8px #233d2b04; backdrop-filter:blur(16px); }
.ail-chat-header { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:17px 18px; background:#FFFFFF; border-bottom:1px solid #E2E8F0; }
.ail-identity { display:flex; align-items:center; gap:12px; min-width:0; }
.ail-agent-name { margin:0 0 6px; color:#0F172A; font-family:Outfit,Inter,system-ui,sans-serif; font-size:16px; font-weight:550; line-height:1.2; }
.ail-online-label { display:inline-flex; align-items:center; gap:5px; max-width:100%; margin:0; padding:4px 7px; border:1px solid #D1FAE5; border-radius:999px; color:#047857; background:#ECFDF5; font-size:8px; font-weight:550; line-height:1.4; letter-spacing:.035em; }
.ail-online-label::before { content:''; flex-shrink:0; width:5px; height:5px; border-radius:50%; background:#10B981; animation:ail-online 2.4s ease-in-out infinite; }
.ail-avatar { position:relative; display:inline-grid; place-items:center; flex:0 0 27px; width:27px; height:27px; border:1px solid #E67E2226; border-radius:9px; color:var(--ail-orange); background:#fff6ea; box-shadow:0 0 12px #E67E2210; }
.ail-avatar svg { width:21px; height:21px; }
.ail-avatar-header { flex-basis:43px; width:43px; height:43px; border-radius:14px; box-shadow:0 0 20px #E67E221a; }
.ail-avatar-header svg { width:31px; height:31px; }
.ail-online-dot { position:absolute; top:-2px; right:-2px; width:9px; height:9px; border:2px solid #fff; border-radius:50%; background:#29ad7a; animation:ail-online 2.4s ease-in-out infinite; }
.ail-header-controls { display:flex; align-items:center; gap:7px; }
.ail-simulation { color:#64748B; background:#FFFDF9; border:1px solid #E2E8F0; border-radius:5px; padding:4px 6px; font-size:9px; white-space:nowrap; }
.ail-pause { display:grid; place-items:center; width:27px; height:27px; padding:0; border:1px solid #E2E8F0; border-radius:50%; color:#64748B; background:#fff; font-size:9px; cursor:pointer; }
.ail-trigger { display:flex; align-items:flex-start; gap:8px; margin:13px 16px 0; padding:9px 10px; border:1px solid #E67E2226; border-radius:10px; color:#9e652d; background:#fff7ec; font-size:9px; line-height:1.65; }
.ail-trigger svg { width:13px; height:13px; margin-top:1px; flex-shrink:0; }
.ail-transcript { background:linear-gradient(180deg,#FFFDF9,#FFFFFF); min-height:0; overflow-y:auto; overscroll-behavior:contain; padding:20px 16px; scrollbar-width:thin; scrollbar-color:#c9d5c6 transparent; transition:opacity .45s; }
.ail-transcript.has-toast { padding-bottom:170px; }
.ail-transcript.is-resetting { opacity:0; }
.ail-message { display:flex; align-items:flex-start; gap:8px; margin:0 0 16px; animation:ail-message-in .38s cubic-bezier(.2,.7,.3,1) both; }
.ail-message:last-child { margin-bottom:0; }
.ail-bubble { min-width:0; max-width:calc(100% - 35px); padding:12px 14px; border:1px solid #E2E8F0; border-radius:0 13px 13px 13px; background:#FFFFFF; box-shadow:0 2px 5px #223c2d04; }
.ail-sender { display:block; margin-bottom:6px; color:#b56623; font-size:10px; font-weight:550; }
.ail-message-text { margin:0; color:#334155; font-size:13px; line-height:1.75; overflow-wrap:anywhere; white-space:pre-wrap; }
.ail-investor { justify-content:flex-end; }
.ail-investor .ail-bubble { max-width:85%; border-color:#FED7AA; border-radius:13px 0 13px 13px; background:#FFF7ED; box-shadow:none; }
.ail-investor .ail-sender { color:#9A4B13; }
.ail-typing { display:flex; align-items:center; gap:4px; min-height:36px; padding:11px 14px; border:1px solid #E2E8F0; border-radius:0 12px 12px 12px; background:#fff; }
.ail-typing i { width:4px; height:4px; border-radius:50%; background:var(--ail-orange); animation:ail-dot 1.1s ease-in-out infinite; }
.ail-typing i:nth-child(2) { animation-delay:.16s; }
.ail-typing i:nth-child(3) { animation-delay:.32s; }
.ail-form { display:flex; align-items:center; gap:8px; padding:12px; border-top:1px solid #E2E8F0; background:#FFFFFF; }
.ail-input { display:block; width:100%; min-width:0; height:43px; padding:0 12px; border:1px solid #E2E8F0; border-radius:11px; color:#0F172A; background:#fff; font:12px Inter,system-ui,sans-serif; outline:none; }
.ail-input::placeholder { color:#94A3B8; }
.ail-input:focus { border-color:#E67E2280; box-shadow:0 0 0 3px #E67E220b; }
.ail-send { display:grid; place-items:center; flex-shrink:0; width:40px; height:40px; padding:0; border:1px solid #da7822; border-radius:11px; color:#fff; background:var(--ail-orange); cursor:pointer; transition:background .2s; }
.ail-send:hover { background:#cc6f1d; }
.ail-send:disabled { cursor:default; opacity:.5; }
.ail-send svg { width:18px; height:18px; }
.ail-pause:focus-visible, .ail-send:focus-visible { outline:2px solid #E67E22; outline-offset:3px; }
.ail-toast { position:absolute; z-index:2; right:14px; bottom:82px; left:49px; display:flex; align-items:flex-start; gap:10px; padding:13px 14px; border:1px solid #D1FAE5; border-radius:12px; background:#fffffff5; box-shadow:0 10px 24px #26433418; backdrop-filter:blur(15px); animation:ail-toast-in .45s cubic-bezier(.2,.7,.3,1) both; }
.ail-toast-icon { display:grid; place-items:center; flex-shrink:0; width:29px; height:29px; border:1px solid #d6e8d8; border-radius:9px; color:#379965; background:#edf7ee; font-size:16px; }
.ail-toast p { margin:0; color:#475569; font-size:10px; line-height:1.7; }
.ail-toast strong { color:#2f704c; font-weight:550; }
@keyframes ail-message-in { from { opacity:0; transform:translateY(9px); } to { opacity:1; transform:translateY(0); } }
@keyframes ail-toast-in { from { opacity:0; transform:translateY(12px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }
@keyframes ail-dot { 0%,70%,100% { opacity:.35; transform:translateY(0); } 35% { opacity:1; transform:translateY(-3px); } }
@keyframes ail-online { 50% { box-shadow:0 0 0 4px #29ad7a16; } }

.ail-robo-area { display:flex; flex-direction:column; align-items:center; width:100%; max-width:330px; margin:30px auto 0; }
.ail-speech { position:relative; z-index:1; padding:11px 17px; border:1px solid rgba(230,126,34,.25); border-radius:99px; background:rgba(255,255,255,.82); color:#9A4B13; box-shadow:0 8px 25px rgba(230,126,34,.08); backdrop-filter:blur(14px); font-size:12px; font-weight:500; text-align:center; animation:ail-speech-float 4s ease-in-out infinite; }
.ail-speech::after { content:''; position:absolute; left:calc(50% - 5px); bottom:-6px; width:10px; height:10px; background:#fffdfb; border-right:1px solid #E67E2240; border-bottom:1px solid #E67E2240; transform:rotate(45deg); }
.ail-robo { display:block; width:240px; max-width:100%; height:auto; margin-top:7px; overflow:visible; }
.ail-robo-float { animation:ail-robo-bob 5s ease-in-out infinite; }
.ail-robo-head { transform-origin:131px 90px; animation:ail-robo-tilt 6s ease-in-out infinite; }
.ail-robo-shadow { transform-origin:131px 216px; animation:ail-shadow-breathe 5s ease-in-out infinite; }
.ail-reply-title { display:block; margin:0 0 7px; color:#334155; font-size:12px; font-weight:600; line-height:1.4; }
.ail-message-text strong { color:#0F172A; font-weight:600; }
.ail-input.is-auto-typing { color:#334155; border-color:#E67E2255; background:#FFFDFA; }
.ail-send.is-demo-sending { opacity:1; animation:ail-send-flash .55s ease-out both; }
.ail-review { display:inline-flex; align-items:center; gap:7px; min-height:27px; margin-top:8px; padding:5px 9px; border:1px solid #BBF7D0; border-radius:6px; background:#F0FDF4; color:#166534; font:500 10px/1.3 Inter,system-ui,sans-serif; cursor:pointer; }
.ail-review:hover { background:#DCFCE7; }
.ail-review:focus-visible { outline:2px solid #E67E22; outline-offset:2px; }
@keyframes ail-robo-bob { 0%,100% { transform:translateY(2px); } 50% { transform:translateY(-7px); } }
@keyframes ail-robo-tilt { 0%,100% { transform:rotate(-2deg); } 50% { transform:rotate(2.5deg); } }
@keyframes ail-speech-float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-3px); } }
@keyframes ail-shadow-breathe { 50% { transform:scaleX(.85); opacity:.08; } }
@keyframes ail-send-flash { 0%,100% { box-shadow:0 0 0 0 #E67E2200; transform:scale(1); } 45% { box-shadow:0 0 0 5px #E67E221c,0 0 22px #E67E2228; transform:scale(1.06); } }

@media(max-width:900px) { .ail-layout { grid-template-columns:1fr; gap:28px; } .ail h2 { max-width:620px; font-size:38px; } .ail-intro { max-width:600px; } .ail-robo-area { margin-top:24px; } .ail-robo { width:205px; } .ail-chat { max-width:650px; width:100%; margin:auto; } }
@media(max-width:480px) { .ail { padding:24px 14px 14px; border-radius:28px; } .ail-editorial { padding:0 4px; } .ail h2 { font-size:31px; } .ail-intro { font-size:13px; } .ail-chat { height:660px; border-radius:17px; } .ail-chat-header { gap:8px; padding:14px 11px; } .ail-identity { gap:8px; } .ail-agent-name { font-size:13px; } .ail-simulation { font-size:8px; padding:4px; } .ail-header-controls { gap:4px; } .ail-avatar-header { width:35px; height:35px; flex-basis:35px; border-radius:11px; } .ail-avatar-header svg { width:26px; height:26px; } .ail-transcript { padding-inline:10px; } .ail-message { gap:6px; } .ail-bubble { max-width:calc(100% - 33px); padding:10px 11px; } .ail-trigger { margin:10px 10px 0; font-size:8px; } .ail-message-text { font-size:12px; } .ail-input { font-size:16px; padding-inline:9px; } .ail-form { gap:6px; padding:10px 8px; } .ail-toast { left:16px; right:12px; } }
@media(prefers-reduced-motion:reduce) { .ail-shell *, .ail-shell *::before, .ail-shell *::after { animation:none!important; transition:none!important; } }
`;

export default function AiInvestmentAgentLive() {
  const [messages, setMessages] = React.useState([]);
  const [scene, setScene] = React.useState({ index: 0, phase: "waiting", characters: 0 });
  const [draft, setDraft] = React.useState("");
  const [hovered, setHovered] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const [interactive, setInteractive] = React.useState(false);
  const [pendingReplies, setPendingReplies] = React.useState(0);
  const [toast, setToast] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const sectionRef = React.useRef(null);
  const transcriptRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const replyTimers = React.useRef(new Set());
  const nextId = React.useRef(0);
  const instanceId = React.useId().replace(/[^a-zA-Z0-9]/g, "");

  const autoInput = scene.phase === "input-typing" || scene.phase === "input-send"
    ? CONVERSATION[scene.index].text.slice(0, scene.characters) : "";
  const demoSending = scene.phase === "input-send" && !interactive;
  const showTyping = pendingReplies > 0 || (scene.phase === "agent-typing" && !interactive);

  React.useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.12 });
    observer.observe(sectionRef.current);
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", update);
      replyTimers.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  React.useEffect(() => {
    if (!visible || hovered || paused || interactive || pendingReplies > 0) return;
    let duration;
    let advance;
    const current = CONVERSATION[scene.index];
    if (scene.phase === "waiting") {
      duration = scene.index === 0 ? 650 : current?.role === "agent" && CONVERSATION[scene.index - 1]?.role === "investor" ? 350 : 1800;
      advance = () => setScene(value => ({ ...value, phase: current.role === "investor" ? "input-typing" : "agent-typing", characters: 0 }));
    } else if (scene.phase === "input-typing") {
      duration = reducedMotion ? 250 : current.text[scene.characters] === " " ? 60 : 38;
      advance = () => {
        const characters = reducedMotion ? current.text.length : scene.characters + 1;
        setScene(value => ({ ...value, characters, phase: characters >= current.text.length ? "input-send" : "input-typing" }));
      };
    } else if (scene.phase === "input-send") {
      duration = 550;
      advance = () => {
        setMessages(value => [...value, { ...current, id: ++nextId.current, kind: "scenario" }]);
        setScene({ index: scene.index + 1, phase: "waiting", characters: 0 });
      };
    } else if (scene.phase === "agent-typing") {
      duration = Math.min(2400, 900 + current.text.length * 3);
      advance = () => {
        setMessages(value => [...value, { ...current, id: ++nextId.current, kind: "scenario" }]);
        setScene({ index: scene.index + 1, phase: scene.index === CONVERSATION.length - 1 ? "notify" : "waiting", characters: 0 });
      };
    } else if (scene.phase === "notify") {
      duration = 1200;
      advance = () => { setToast(true); setScene(value => ({ ...value, phase: "holding" })); };
    } else if (scene.phase === "holding") {
      duration = 8500;
      advance = () => setScene(value => ({ ...value, phase: "resetting" }));
    } else {
      duration = reducedMotion ? 0 : 450;
      advance = () => {
        setMessages(value => value.filter(message => message.kind !== "scenario").slice(-8));
        setToast(false);
        setScene({ index: 0, phase: "waiting", characters: 0 });
      };
    }
    const timeout = window.setTimeout(advance, duration);
    return () => window.clearTimeout(timeout);
  }, [scene, visible, hovered, paused, interactive, pendingReplies, reducedMotion]);

  React.useEffect(() => {
    const transcript = transcriptRef.current;
    transcript.scrollTo({ top: transcript.scrollHeight, behavior: reducedMotion ? "auto" : "smooth" });
  }, [messages, scene.phase, pendingReplies, toast, reducedMotion]);

  React.useEffect(() => {
    if (!interactive) inputRef.current.scrollLeft = inputRef.current.scrollWidth;
  }, [autoInput, interactive]);

  const appendVisitorQuestion = question => {
    const text = question.trim();
    if (!text) return;
    setInteractive(true);
    setDraft("");
    setMessages(value => [...value, { id: ++nextId.current, role: "investor", text, kind: "visitor" }]);
    setPendingReplies(value => value + 1);
    const timer = window.setTimeout(() => {
      setMessages(value => [...value, { id: ++nextId.current, role: "agent", title: "Your question, reviewed", text: getSimulatedReply(text), kind: "reply" }]);
      setPendingReplies(value => value - 1);
      replyTimers.current.delete(timer);
    }, 650);
    replyTimers.current.add(timer);
  };

  const sendQuestion = event => {
    event.preventDefault();
    if (interactive) appendVisitorQuestion(draft);
  };

  const toggleDemo = () => {
    if (interactive) {
      setInteractive(false);
      setPaused(false);
      setDraft("");
      if (scene.phase === "input-typing" || scene.phase === "input-send") {
        setScene(value => ({ ...value, phase: "waiting", characters: 0 }));
      }
    } else setPaused(value => !value);
  };

  return (
    <section
      id="ai-investment-agent"
      className="ail-shell"
      ref={sectionRef}
      aria-labelledby={"ail-heading-" + instanceId}
      data-mode={interactive ? "interactive" : "demo"}
      data-phase={scene.phase}
      data-conversation-index={scene.index}
      onPointerEnter={event => { if (event.pointerType !== "touch") setHovered(true); }}
      onPointerLeave={() => setHovered(false)}
    >
      <style>{styles}</style>
      <div className="ail">
        <div className="ail-layout">
          <div className="ail-editorial"><span className="ib-salesperson-badge"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m10 2 2.2 5.8L18 10l-5.8 2.2L10 18l-2.2-5.8L2 10l5.8-2.2L10 2Z" stroke="currentColor" strokeWidth="1.5"/></svg>AI Salesperson</span>
            <h2 id={"ail-heading-" + instanceId}>Your On-Demand <em>AI Investment Agent</em></h2>
            <p className="ail-intro">Whenever an investor opens an entrepreneur's three-stage pitch, the agent activates. It reviews the idea, shop proofs and financials, and agreement together, then stays in the conversation.</p>
            <RoboAgent id={"ail-robo-" + instanceId} />
          </div>
          <div className="ail-chat" aria-label="Simulated live AI investment conversation">
            <header className="ail-chat-header">
              <div className="ail-identity">
                <AgentAvatar header />
                <div>
                  <p className="ail-agent-name">InvestBiz AI Investment Agent</p>
                  <p className="ail-online-label">ACTIVE ON 3-STAGE PITCH</p>
                </div>
              </div>
              <div className="ail-header-controls">
                <span className="ail-simulation" title="Illustrative figures and simulated responses">Simulation</span>
                <button type="button" className="ail-pause" onClick={toggleDemo} aria-label={paused || interactive ? "Resume chat demo" : "Pause chat demo"} title={paused || interactive ? "Resume demo" : "Pause demo"} aria-pressed={paused || interactive}>{paused || interactive ? "\u25b6" : "\u275a\u275a"}</button>
              </div>
            </header>
            <div className="ail-trigger">
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m9 1-6 8h4l-1 6 7-9H9Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
              <span>Investor opened Entrepreneur Pitch (3 Stages Attached) &mdash; AI Agent Activated</span>
            </div>
            <div
              ref={transcriptRef}
              className={"ail-transcript" + (toast ? " has-toast" : "") + (scene.phase === "resetting" ? " is-resetting" : "")}
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              aria-label="Investment conversation"
            >
              {messages.map(message => <article key={message.id} className={"ail-message " + (message.role === "agent" ? "ail-agent" : "ail-investor")} data-kind={message.kind}>
                {message.role === "agent" && <AgentAvatar />}
                <div className="ail-bubble">
                  <span className="ail-sender">{message.role === "agent" ? "InvestBiz AI Investment Agent" : message.kind === "visitor" ? "You" : "Adan"}</span>
                  {message.title && <span className="ail-reply-title">{message.title}</span>}
                  <p className="ail-message-text">{message.role === "agent" ? <FormattedReply text={message.text} /> : message.text}</p>
                </div>
              </article>)}
              {showTyping && <TypingDots />}
            </div>
            {toast && <div className="ail-toast" role="status">
              <span className="ail-toast-icon" aria-hidden="true">{"\ud83d\udcf1"}</span>
              <div>
                <p><strong>WhatsApp &amp; SMS Sync</strong><br />Founder updated 3-month profit clause &amp; uploaded Week-1 video proof!</p>
                <button type="button" className="ail-review" onClick={() => appendVisitorQuestion("Show the updated agreement for review and signing.")}>Review &amp; Sign <span aria-hidden="true">&#8599;</span></button>
              </div>
            </div>}
            <form className="ail-form" onSubmit={sendQuestion}>
              <input
                ref={inputRef}
                className={"ail-input" + (!interactive && autoInput ? " is-auto-typing" : "")}
                type="text"
                value={interactive ? draft : autoInput}
                maxLength={500}
                onChange={event => { setInteractive(true); setDraft(event.target.value); }}
                onFocus={() => setInteractive(true)}
                placeholder="Ask your AI Investment Agent..."
                aria-label="Ask your AI Investment Agent"
                autoComplete="off"
              />
              <button type="submit" className={"ail-send" + (demoSending ? " is-demo-sending" : "")} aria-label="Send question" disabled={interactive ? !draft.trim() : !demoSending}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m21 3-6 18-4-8-8-4 18-6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="m11 13 10-10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
