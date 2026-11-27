
import React, { useEffect, useId, useRef, useState } from "react";

const BRANCHES = [
  { path: "M500 365 Q455 337 405 333", coin: [405,333], leaf: [425,328], label: "Get Instant Investments", x: 180, y: 320 },
  { path: "M500 325 Q552 292 606 291", coin: [606,291], leaf: [580,285], label: "Find Wholesale Products", x: 640, y: 278 },
  { path: "M500 275 Q447 242 400 235", coin: [400,235], leaf: [426,232], label: "No Need to Worry to Find Trusted Businesses", x: 175, y: 217 },
  { path: "M500 230 Q548 196 600 187", coin: [600,187], leaf: [573,186], label: "No Need to Ask for Loans", x: 635, y: 175 },
  { path: "M500 195 Q495 154 500 116", coin: [500,110], leaf: [482,140], label: "Adopt Hazrat Usman (R.A) Way to Grow Business", x: 530, y: 85 },
];
const STEP_MS = 1100;
function Person({ side, happy, id }) {
  const left = side === "investor";
  return <g transform={left ? "translate(60 245)" : "translate(870 245)"}>
    <ellipse cx="35" cy="119" rx="63" ry="11" fill="#D69B5830" />
    {happy && <g className="igt-sparkles" fill="#EAA73A"><path d="m-15 4 3-8 3 8 8 3-8 3-3 8-3-8-8-3z"/><path d="m79-4 2-6 2 6 6 2-6 2-2 6-2-6-6-2z"/></g>}
    <circle cx="35" cy="10" r="29" fill="#E8B38C" />
    <path d="M7 7q-3-36 29-36 30 0 28 34Q52-12 22-10Z" fill="#26384A" />
    {!left && <path d="m5-19 31-13 31 13-31 13z" fill="#0F172A"/ >}
    <circle cx="25" cy="10" r="2" fill="#26384A"/><circle cx="45" cy="10" r="2" fill="#26384A"/>
    {left && <g fill="none" stroke="#26384A" strokeWidth="2"><circle cx="25" cy="10" r="8"/><circle cx="45" cy="10" r="8"/><path d="M33 10h4"/></g>}
    <path d={happy ? "M23 20 Q35 34 48 20" : "M26 20 Q35 27 45 20"} stroke="#A4553C" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <path d="M-5 104 Q-3 48 17 41 L54 41 Q74 49 76 104Z" fill={left ? "#253C52" : "#E1944A"}/>
    <path d={happy ? "M4 65 Q-20 42 -18 18 M65 65 Q88 42 90 18" : "M-2 64 Q-17 82 12 91 M70 64 Q85 82 58 91"} fill="none" stroke="#E8B38C" strokeWidth="12" strokeLinecap="round"/>
    <path d="M6 67 L63 67 L70 108 L0 108Z" fill="#10233A" stroke="#D98B3B" strokeWidth="2"/>
    <path d="M6 67 L63 67 L57 52 L12 52Z" fill="#F4A74C" stroke="#D98B3B" strokeWidth="2"/><circle cx="24" cy="58" r="7" fill="#FFDA70" stroke="#D18925"/><circle cx="43" cy="57" r="7" fill="#FFDA70" stroke="#D18925"/>
    <rect x="40" y="81" width="28" height="14" rx="5" fill="#E67E22"/><circle cx="49" cy="88" r="2" fill="#FFE7BC"/>
    <foreignObject x="-44" y="128" width="160" height="65"><div xmlns="http://www.w3.org/1999/xhtml" style={{textAlign:"center"}}><span className="igt-wallet-name">{left ? "Employee Wallet" : "Student Wallet"}</span>{happy && <span className="igt-received">Profit Received! </span>}</div></foreignObject>
  </g>;
}
function Coin({ x, y, id }) {
  return <g transform={`translate(${x} ${y})`} className="igt-coin"><circle r="14" fill={`url(#${id}-gold)`} stroke="#FFF4CA" strokeWidth="2"/><circle r="9" fill="none" stroke="#B9791E" strokeWidth="1"/><path d="M0-7v14m-4-9c1-4 8-4 8 0s-8 3-8 7 8 4 8 0" stroke="#9E601C" strokeWidth="1.3" fill="none"/></g>;
}
function MovingCoin({ pathId, path, duration, delay = 0, id, profit = false }) {
  const motionRef = useRef(null);
  useEffect(() => {
    const motion = motionRef.current;
    if (motion) motion.beginElementAt(delay);
  }, [delay]);
  return <g className="igt-moving-coin"><circle r={profit ? 18 : 7} fill={`url(#${id}-gold)`} stroke={profit ? "#19885A" : "#FFF1C0"} strokeWidth={profit ? 3 : 1.5}/><circle r={profit ? 11 : 4} fill="none" stroke={profit ? "#168050" : "#BC802F"} strokeWidth="1"/><animateMotion ref={motionRef} path={path} dur={duration + "s"} begin="indefinite" fill="freeze">{pathId && <mpath href={pathId}/>}</animateMotion></g>;
}
export default function InvestmentGrowthTree() {
  const [timelineStep, setTimelineStep] = useState(1);
  const [paused, setPaused] = useState(false);
  const [profitReceived, setProfitReceived] = useState(false);
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(false);
  const [replay, setReplay] = useState(0);
  const ref = useRef(null);
  const svgRef = useRef(null);
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.12 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible || paused || hover || timelineStep === 16) return;
    const timer = window.setInterval(() => setTimelineStep(step => Math.min(16, step + 1)), STEP_MS);
    return () => window.clearInterval(timer);
  }, [paused, hover, visible, timelineStep === 16, replay]);
  useEffect(() => {
    if (!visible || paused || hover || timelineStep !== 16) return;
    const timer = window.setTimeout(() => setTimelineStep(1), 4000);
    return () => window.clearTimeout(timer);
  }, [timelineStep, paused, hover, visible]);
  useEffect(() => {
    setProfitReceived(false);
    if (timelineStep !== 16 || paused || hover || !visible) return;
    const timer = window.setTimeout(() => setProfitReceived(true), 2500);
    return () => window.clearTimeout(timer);
  }, [timelineStep, replay, paused, hover, visible]);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    if (paused || hover || !visible) svg.pauseAnimations();
    else svg.unpauseAnimations();
  }, [paused, hover, visible]);
  const incoming = [1,4,7,10,13].includes(timelineStep);
  const leftStream = [1,7,13].includes(timelineStep);
  const finale = timelineStep === 16;
  const stage = timelineStep === 0 ? 0 : Math.min(6, Math.ceil(timelineStep / 3));
  return <section ref={ref} className="igt-growth mx-auto mt-6 w-full max-w-7xl overflow-hidden rounded-3xl border border-amber-200/70 bg-gradient-to-b from-[#FFFDF9] via-[#FFF9F0] to-[#FFF3E0] p-6 shadow-sm md:p-10" aria-labelledby="igt-growth-title" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} data-timeline-step={timelineStep}>
    <style>{styles}</style>
    <div className="igt-header"><div><span className="igt-pill">✦ &nbsp; ETHICAL ECOSYSTEM GROWTH</span><h2 id="igt-growth-title">How Investments Grow Your Business</h2><p>Follow the journey from the first contribution to shared growth.</p></div><button type="button" className="igt-toggle" onClick={() => setPaused(value => !value)} aria-label={paused ? "Play animation" : "Pause animation"}>{paused ? "▶ Play" : "Ⅱ Pause"}</button></div>
    <div className="igt-visual" data-paused={paused || hover}>
      <svg ref={svgRef} viewBox="0 0 1000 560" role="img" aria-label="An investor and a student share capital and receive profits from a growing tree">
        <defs>
          <linearGradient id={id+"-bark"} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#D1A063"/><stop offset=".5" stopColor="#956237"/><stop offset="1" stopColor="#5C3B2B"/></linearGradient>
          <linearGradient id={id+"-leaf"} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#9ED8A0"/><stop offset="1" stopColor="#287551"/></linearGradient>
          <radialGradient id={id+"-gold"}><stop stopColor="#FFF4AB"/><stop offset=".55" stopColor="#F5C453"/><stop offset="1" stopColor="#D48522"/></radialGradient>
          <radialGradient id={id+"-sun"}><stop stopColor="#FFD887" stopOpacity=".55"/><stop offset="1" stopColor="#FFD887" stopOpacity="0"/></radialGradient>
          <path id={id+"-in-left"} d="M122 324 C215 284 345 390 500 425"/>
          <path id={id+"-in-right"} d="M878 324 C785 284 655 390 500 425"/>
          <path id={id+"-out-left"} d="M500 110 C325 55 155 140 122 324"/>
          <path id={id+"-out-right"} d="M606 291 C715 205 835 175 878 324"/>
        </defs>
        <circle cx="500" cy="238" r="220" fill={`url(#${id}-sun)`}/>
        <ellipse cx="500" cy="430" rx="275" ry="22" fill="#E2C39A" opacity=".32"/>
        <path d="M235 425 Q500 412 765 425 Q666 508 500 531 Q333 508 235 425Z" fill="#D9BD9B" opacity=".24"/>
        <path d="M235 425 Q500 412 765 425" fill="none" stroke="#BB9B70" strokeWidth="2"/>
        <g className={incoming ? "igt-root igt-root-active" : "igt-root"} fill="none" stroke="#E68C24" strokeLinecap="round"><path d="M500 423q-5 35-61 62m61-62q10 36 67 62m-67-62q-30 23-105 25m105-25q33 22 107 25m-138 23-28 17m130-17 29 17" strokeWidth="3"/><circle cx="500" cy="425" r="23" fill="#F59E0B" stroke="none" opacity=".35"/></g>
        <path d="M500 425 Q505 324 500 116" stroke={`url(#${id}-bark)`} strokeWidth={timelineStep >= 14 ? 19 : 13} fill="none" strokeLinecap="round" strokeDasharray="320" strokeDashoffset={timelineStep < 2 ? 320 : timelineStep < 5 ? 220 : timelineStep < 8 ? 150 : timelineStep < 11 ? 100 : timelineStep < 14 ? 55 : 0} style={{transition:"stroke-dashoffset 1.2s ease, stroke-width 1.2s ease"}}/>
        {BRANCHES.map((branch, i) => {
          const drawStep = 2 + i * 3, labelStep = drawStep + 1;
          return <g key={branch.label}>
            <path d={branch.path} fill="none" stroke={`url(#${id}-bark)`} strokeWidth={i===0 ? 7 : 9} strokeLinecap="round" strokeDasharray="160" strokeDashoffset={timelineStep >= drawStep ? 0 : 160} style={{transition:"stroke-dashoffset .9s cubic-bezier(.22,1,.36,1)"}}/>
            {timelineStep >= drawStep && <g className="igt-bloom"><ellipse cx={branch.leaf[0]} cy={branch.leaf[1]} rx="19" ry="10" fill={`url(#${id}-leaf)`} transform={`rotate(-28 ${branch.leaf[0]} ${branch.leaf[1]})`}/><ellipse cx={branch.leaf[0]+13} cy={branch.leaf[1]-12} rx="15" ry="8" fill={`url(#${id}-leaf)`} transform={`rotate(30 ${branch.leaf[0]+13} ${branch.leaf[1]-12})`}/><Coin x={branch.coin[0]} y={branch.coin[1]} id={id}/></g>}
            {timelineStep >= labelStep && <foreignObject x={branch.x} y={branch.y} width="190" height="70"><div xmlns="http://www.w3.org/1999/xhtml" className="igt-label"><small>BRANCH {String(i+1).padStart(2,"0")}</small><strong>{branch.label}</strong></div></foreignObject>}
          </g>;
        })}
        {incoming && <g key={"in"+timelineStep}><path d={leftStream ? "M122 324 C215 284 345 390 500 425" : "M878 324 C785 284 655 390 500 425"} fill="none" stroke="#E8A351" strokeWidth="2" strokeDasharray="5 8"/>{[0,1,2].map(n=><MovingCoin key={n} pathId={`#${id}-in-${leftStream ? "left" : "right"}`} duration={.78} delay={n*.08} id={id}/>)}</g>}
        {[2,5,8,11,14].includes(timelineStep) && <MovingCoin key={"branch"+timelineStep} path={BRANCHES[(timelineStep-2)/3].path} duration={.85} id={id}/>}
        {finale && <g key="finale"><path d="M500 110 C325 55 155 140 122 324 M606 291 C715 205 835 175 878 324" fill="none" stroke="#65B88A" strokeWidth="2" strokeDasharray="5 8"/>{["left","right"].map(side=><MovingCoin key={side} pathId={`#${id}-out-${side}`} duration={2.3} delay={.2} id={id} profit/>)}</g>}
        <Person side="investor" happy={profitReceived} id={id}/><Person side="student" happy={profitReceived} id={id}/>
      </svg>
    </div>
    <div className="igt-footer"><div><strong>THE GROWTH JOURNEY</strong><p>Capital in. Opportunity grows. Prosperity shared.</p></div><div className="igt-steps" role="group" aria-label="Replay growth stage">{[1,2,3,4,5,6].map(n=><button type="button" key={n} aria-label={`Replay stage ${n}`} aria-pressed={stage===n} onClick={() => { setTimelineStep(n===6 ? 16 : (n-1)*3+1); setReplay(value => value+1); }}><span>{String(n).padStart(2,"0")}</span><i/></button>)}</div><small>STAGE {String(stage).padStart(2,"0")} / 06</small></div>
  </section>;
}
const styles = `
.igt-growth{font-family:Inter,system-ui,sans-serif;color:#0f172a;background:radial-gradient(ellipse at 50% 35%,#fff0d4 0%,transparent 50%),linear-gradient(180deg,#fffdf9,#fff3e0);border:1px solid #f2dcc0;border-radius:32px;padding:32px;overflow:hidden;box-sizing:border-box}.igt-growth *{box-sizing:border-box}.igt-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.igt-pill{display:inline-block;padding:7px 11px;background:#fff;border:1px solid #f1dfc9;border-radius:99px;color:#b55e1f;font-size:9px;letter-spacing:.14em;font-weight:700}.igt-header h2{font:600 clamp(25px,3vw,39px)/1.15 Outfit,Inter,sans-serif;letter-spacing:-.04em;margin:15px 0 8px}.igt-header h2 em{font-style:normal;color:#d46c1d}.igt-header p,.igt-footer p{color:#64748b;font-size:12px;line-height:1.6;margin:0}.igt-toggle{flex:none;padding:9px 12px;border:1px solid #ead9c5;border-radius:10px;background:#ffffffcf;color:#945522;font-size:11px;cursor:pointer}.igt-visual{height:530px;position:relative}.igt-visual svg{width:100%;height:100%;overflow:visible}.igt-wallet-name,.igt-received{display:inline-block;padding:7px 10px;border:1px solid #eddac3;border-radius:9px;background:#ffffffed;color:#334155;font:600 10px Inter,sans-serif;white-space:nowrap}.igt-received{display:block;width:max-content;margin:5px auto;color:#148454;background:#effcf4;border-color:#bfe9cb;animation:igt-celebrate 1s infinite alternate}.igt-label{display:flex;flex-direction:column;gap:5px;padding:9px 11px;border:1px solid #edddc6;border-radius:10px;background:#fffffff2;box-shadow:0 6px 18px #8e5d1e18;font-family:Inter,sans-serif;animation:igt-fade .35s ease}.igt-label small{font-size:8px;letter-spacing:.1em;color:#bd792f}.igt-label strong{font-size:10px;line-height:1.3;color:#254839}.igt-root{opacity:.4;transition:opacity .3s}.igt-root-active{opacity:1;filter:drop-shadow(0 0 9px #ef9b2e);animation:igt-root 1.5s ease-in-out}.igt-bloom{animation:igt-fade .6s ease}.igt-coin{filter:drop-shadow(0 0 5px #edb149)}.igt-footer{display:flex;justify-content:space-between;align-items:center;gap:16px;border-top:1px solid #e9ddce;padding-top:20px}.igt-footer strong,.igt-footer>small{font-size:9px;letter-spacing:.1em;color:#a76b36}.igt-footer p{margin-top:6px;font-size:10px}.igt-steps{display:flex;gap:7px}.igt-steps button{width:34px;border:0;padding:5px 0;background:none;color:#9ca3af;font-size:10px;cursor:pointer}.igt-steps button i{display:block;height:3px;margin-top:6px;border-radius:5px;background:#e1d9ce}.igt-steps button[aria-pressed=true]{color:#c96a23}.igt-steps button[aria-pressed=true] i{background:#e67e22}.igt-toggle:focus-visible,.igt-steps button:focus-visible{outline:2px solid #e67e22;outline-offset:3px}.igt-visual[data-paused=true] *{animation-play-state:paused}@keyframes igt-reveal{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes igt-fade{from{opacity:0}to{opacity:1}}@keyframes igt-root{50%{filter:drop-shadow(0 0 18px #ef9b2e)}}@keyframes igt-celebrate{to{box-shadow:0 0 15px #7cca98}}@media(max-width:700px){.igt-growth{padding:22px 14px}.igt-header h2{font-size:25px}.igt-visual{height:auto;min-height:0;overflow:visible;margin:18px -8px}.igt-visual svg{width:100%;height:auto;max-width:none;margin:0}.igt-footer{flex-wrap:wrap}.igt-footer>div:first-child{width:100%}.igt-steps{flex:1;gap:3px}.igt-steps button{width:30px}.igt-label strong{font-size:11px}}@media(prefers-reduced-motion:reduce){.igt-growth *{animation:none!important;transition:none!important}}
`;
