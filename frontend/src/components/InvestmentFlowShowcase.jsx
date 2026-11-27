import React from "react";

const STEPS = [
  { title: "Register Your Startup Idea", description: "Give your idea a clear pitch, a purpose, and a place to begin.", graphic: "idea" },
  { title: "Join Investors", description: "Connect with investors who understand your vision and ambitions.", graphic: "network" },
  { title: "Get Investment", description: "Bring committed capital into your business and put your plan in motion.", graphic: "capital" },
  { title: "Share Business Insights", description: "Share progress, performance, and the insights behind your next move.", graphic: "insights" },
  { title: "Agreement Signing", description: "Set clear terms and make your partnership official.", graphic: "agreement" },
  { title: "Expand Business & Distribute Profit", description: "Grow your business and share the returns with your investors.", graphic: "growth" },
];

function FlowGraphic({ kind, id }) {
  const fill = name => "url(#" + id + "-" + name + ")";
  let artwork;
  switch (kind) {
    case "idea":
      artwork = <>
        <rect x="21" y="24" width="117" height="93" rx="10" fill="#F4F8F5" stroke="#C7D8CF" />
        <rect x="26" y="29" width="107" height="83" rx="6" fill={fill("grid")} />
        <path d="M31 103h27M31 97h17M115 34v14m-7-7h14" stroke="#A5BFB0" />
        <path d="M39 82C23 58 42 36 66 42M104 99c24 1 35-13 29-30" stroke="#DDA564" strokeDasharray="3 5" />
        <g transform="rotate(21 80 70)" filter={fill("shadow")}>
          <path d="M67 83 52 100l3-28 12-13M91 83l15 17-3-28-12-13" fill={fill("gold")} stroke="#BC771E" />
          <path d="M65 82C61 58 67 33 79 20c13 13 20 38 15 62l-14 13Z" fill={fill("paper")} stroke="#668B7A" />
          <path d="M79 20c7 8 11 16 14 27H66c2-11 6-19 13-27Z" fill={fill("gold")} stroke="#BC771E" />
          <circle cx="79.5" cy="59" r="10" fill="#274F46" stroke="#D4E7DD" strokeWidth="4" />
          <path d="m75 56 6-3" stroke="#A9D8CD" strokeWidth="2" />
          <path d="M71 90c-3 9 2 20 9 27 8-8 11-20 7-27" fill={fill("gold")} />
          <path d="M78 95c-2 7 0 11 2 15 3-5 4-9 2-15" fill="#FFF4CA" />
        </g>
        <g transform="translate(121 29)">
          <circle r="13" fill="#FFF0C9" stroke="#F0BA66" />
          <path d="M-5-2a5 5 0 1 1 10 0c0 3-3 3-3 6h-4c0-3-3-3-3-6Zm3 9h4m-4 3h4" stroke="#CA852B" fill="none" />
          <path d="M0-19v-3m15 8 3-2m-32 2-3-2" stroke="#E7A846" />
        </g>
      </>;
      break;
    case "network":
      artwork = <>
        <path d="M35 40 80 26l46 17M35 40l15 43m76-40-16 40M80 26v42" stroke="#C5D8CD" strokeWidth="2" strokeDasharray="4 5" />
        {[[35, 38], [80, 24], [126, 40]].map(([x, y], index) => <g key={x} transform={"translate(" + x + " " + y + ")"}>
          <circle r="17" fill={index === 1 ? "#FFF0CF" : "#EAF3ED"} stroke={index === 1 ? "#E8AE5A" : "#B5CFC0"} />
          <circle cy="-4" r="5" fill={index === 1 ? "#CA8C36" : "#6B9681"} />
          <path d="M-9 9c1-10 17-10 18 0" fill={index === 1 ? "#E9BA77" : "#A9C9B6"} />
        </g>)}
        <g filter={fill("shadow")}>
          <path d="M24 78 43 62l18 11-21 29Z" fill="#2D5A4C" stroke="#244C41" />
          <path d="m136 78-19-16-18 11 21 29Z" fill={fill("gold")} stroke="#C28838" />
          <path d="m43 73 15-7 23 2 23 15-19 23c-4 4-9 4-13 1L43 86Z" fill="#FFF0D4" stroke="#BC9971" />
          <path d="M102 72 88 65 76 67 65 79c-3 4 3 8 7 5l9-6 13 8" fill={fill("paper")} stroke="#729786" />
          <path d="m65 91 12 10m-5-17 13 11m-7-17 13 11" stroke="#C89C6D" />
          <circle cx="35" cy="84" r="2" fill="#B4D2BF" /><circle cx="125" cy="84" r="2" fill="#FFE8AA" />
        </g>
        <path d="m116 98 15 5v12c-2 8-8 13-15 16-7-3-13-8-15-16v-12Z" fill="#EBF6EE" stroke="#81A68E" />
        <path d="m108 114 5 5 10-12" stroke="#487D5E" strokeWidth="3" fill="none" />
      </>;
      break;
    case "capital":
      artwork = <>
        <path d="M120 26C80 8 42 25 45 54" fill="none" stroke="#E8AA4B" strokeDasharray="3 5" strokeWidth="2" />
        <path d="m39 47 6 8 7-7" fill="none" stroke="#D98D29" strokeWidth="2" />
        <circle cx="116" cy="25" r="10" fill={fill("gold")} stroke="#C8892C" />
        <path d="M116 19v12m4-10h-6c-5 0-4 4 0 4h3c4 0 4 4 0 4h-6" stroke="#A66B1D" fill="none" />
        <g filter={fill("shadow")}>
          <path d="m30 49 9-7h82l8 8v63l-8 7H39l-9-8Z" fill="#AEC8B6" stroke="#709580" />
          <rect x="30" y="49" width="91" height="71" rx="7" fill={fill("ink")} stroke="#4D7966" />
          <rect x="41" y="59" width="68" height="49" rx="6" fill="#193E35" stroke="#729786" />
          <circle cx="75" cy="83" r="16" fill="#355F4E" stroke="#91B29C" />
          <circle cx="75" cy="83" r="8" fill="#D7B977" stroke="#F8DFA6" />
          <path d="M75 65v9m0 18v9m-18-18h9m18 0h9m-27-9 6 6m12 12 5 5" stroke="#CFD8BB" strokeWidth="2" />
          <rect x="103" y="67" width="5" height="9" rx="2" fill="#C1D3B9" />
        </g>
        {[0, 1, 2].map(index => <g key={index} transform={"translate(119 " + (110 - index * 8) + ")"}>
          <path d="M-15-3v7c0 8 30 8 30 0v-7" fill="#E9AA48" stroke="#C08730" />
          <ellipse rx="15" ry="5" cy="-3" fill={fill("gold")} stroke="#C08730" />
        </g>)}
        <circle cx="34" cy="112" r="13" fill={fill("gold")} stroke="#BC7C25" />
        <path d="M30 106h5a4 4 0 0 1 0 8h-5m1-10v15m-3-6h8" fill="none" stroke="#AD7220" />
      </>;
      break;
    case "insights":
      artwork = <>
        <g filter={fill("shadow")}>
          <rect x="19" y="28" width="122" height="87" rx="9" fill={fill("paper")} stroke="#9EBBAB" />
          <path d="M19 48h122" stroke="#C1D5C8" />
          <circle cx="30" cy="38" r="2" fill="#E6AA53" /><circle cx="38" cy="38" r="2" fill="#A7C6B3" /><circle cx="46" cy="38" r="2" fill="#A7C6B3" />
          <path d="M104 37h25" stroke="#B9CDC0" strokeWidth="3" />
          <rect x="28" y="57" width="28" height="43" rx="4" fill="#E8F0E9" />
          <path d="M34 65h15m-15 8h11m-11 8h15m-15 8h8" stroke="#8CAC98" />
          <path d="M65 98V58m0 40h60m-60-13h60m-60-13h60" stroke="#D5E1D6" />
          <path d="m68 92 14-8 11 2 13-18 17-8v38H68Z" fill={fill("chart")} />
          <path d="m68 92 14-8 11 2 13-18 17-8" fill="none" stroke="#E39432" strokeWidth="2.5" />
          <circle cx="106" cy="68" r="3" fill="#FFE7AD" stroke="#D99537" />
          <path d="M64 124h34m-24-9-2 9m17-9 2 9" stroke="#87A994" strokeWidth="3" />
        </g>
        <path d="m122 83 18 6v16c-3 10-10 17-18 21-8-4-15-11-18-21V89Z" fill={fill("ink")} stroke="#6F9B7E" />
        <path d="m113 103 6 6 12-15" stroke="#F4D59B" strokeWidth="3" fill="none" />
        <path d="m123 78 2-5m16 10 5-2" stroke="#E8B96B" />
      </>;
      break;
    case "agreement":
      artwork = <>
        <g filter={fill("shadow")}>
          <path d="M38 17h60l21 22v80a7 7 0 0 1-7 7H38a7 7 0 0 1-7-7V24a7 7 0 0 1 7-7Z" fill={fill("paper")} stroke="#A1B8A5" />
          <path d="M98 17v17a5 5 0 0 0 5 5h16" fill="#DEE9DB" stroke="#A1B8A5" />
          <rect x="43" y="32" width="30" height="5" rx="2" fill="#4A6B56" />
          <path d="M44 49h57M44 57h47M44 65h54M44 73h30" stroke="#C4D4C3" strokeWidth="2" />
          <path d="M72 101c8-13 2 8 9-1s3 10 11 0 8-2 10-5" stroke="#698B74" strokeWidth="2" fill="none" />
          <path d="M73 111h29" stroke="#D2DFCA" />
          <circle cx="48" cy="100" r="14" fill={fill("gold")} stroke="#D8A451" />
          <circle cx="48" cy="100" r="10" fill="#FFF1CA" stroke="#E7BC73" strokeDasharray="2 2" />
          <path d="m42 100 4 4 8-9" fill="none" stroke="#8A6E35" strokeWidth="2" />
        </g>
        <g transform="rotate(35 113 83)" filter={fill("shadow")}>
          <rect x="108" y="48" width="10" height="54" rx="4" fill={fill("ink")} stroke="#668A73" />
          <rect x="108" y="51" width="10" height="12" rx="3" fill={fill("gold")} stroke="#D19542" />
          <path d="m108 102 5 13 5-13Z" fill="#DDAA61" stroke="#AD8449" />
          <path d="M113 109v6" stroke="#24493A" />
          <path d="M111 67v25" stroke="#ADC3AC" />
        </g>
        <path d="m133 47 4-6m-8-3 1-6m10 20 7-1" stroke="#E8B653" />
      </>;
      break;
    default:
      artwork = <>
        <path d="M31 53V35h18v18m65 0V23h17v40" stroke="#C5D7C9" fill="#E5EFE6" />
        <path d="m29 28 8-10h17m60-2 8-9h12" stroke="#DCA453" fill="none" />
        <g filter={fill("shadow")}>
          <rect x="35" y="52" width="91" height="53" rx="5" fill={fill("paper")} stroke="#A1B9A5" />
          <path d="m33 51 9-22h78l9 22Z" fill="#E9B86D" stroke="#C78B3C" />
          <path d="m45 29-5 22h14l3-22m15 0-1 22h14l-1-22m14 0 3 22h14l-6-22" fill="#FFF2D1" />
          <path d="M33 51c0 11 15 11 15 0 0 11 16 11 16 0 0 11 17 11 17 0 0 11 16 11 16 0 0 11 16 11 16 0 0 11 16 11 16 0" fill="#EDC789" stroke="#C99850" />
          <rect x="45" y="66" width="24" height="23" rx="2" fill="#B6D4C5" stroke="#7C9E88" />
          <path d="M57 66v23m-12-12h24" stroke="#ECF5E9" />
          <rect x="89" y="65" width="23" height="40" rx="3" fill={fill("ink")} />
          <circle cx="106" cy="86" r="1.5" fill="#F9D69C" />
          <path d="M32 105h97" stroke="#8DAB90" strokeWidth="3" />
        </g>
        <path d="M80 106v13m0-3H29v8m51-8h51v8" stroke="#D99B3F" strokeWidth="1.7" fill="none" />
        <path d="m25 120 4 5 4-5m94 0 4 5 4-5" stroke="#D99B3F" fill="none" />
        {[29, 80, 131].map(x => <g key={x} transform={"translate(" + x + " 128)"}>
          <circle r="9" fill="#EEF5E9" stroke="#98B597" /><circle cy="-2" r="2.5" fill="#759A76" /><path d="M-5 5c0-6 10-6 10 0" fill="#B1CEAA" />
        </g>)}
      </>;
  }

  return <svg viewBox="0 0 160 145" aria-hidden="true" focusable="false" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <defs>
      <linearGradient id={id + "-gold"} x1="0" y1="0" x2=".75" y2="1" gradientUnits="objectBoundingBox">
        <stop stopColor="#FFF2C2" /><stop offset=".5" stopColor="#F3C571" /><stop offset="1" stopColor="#E3A13E" />
      </linearGradient>
      <linearGradient id={id + "-paper"} x2=".7" y2="1">
        <stop stopColor="#FFFFFF" /><stop offset="1" stopColor="#EDF2E5" />
      </linearGradient>
      <linearGradient id={id + "-ink"} x2="1" y2="1">
        <stop stopColor="#537E66" /><stop offset="1" stopColor="#254E40" />
      </linearGradient>
      <linearGradient id={id + "-chart"} x2="0" y2="1">
        <stop stopColor="#E8AE58" stopOpacity=".55" /><stop offset="1" stopColor="#E8AE58" stopOpacity=".03" />
      </linearGradient>
      <pattern id={id + "-grid"} width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M10 0H0v10" stroke="#CFDED1" strokeWidth=".6" />
      </pattern>
      <filter id={id + "-shadow"} x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#35513D" floodOpacity=".14" />
      </filter>
    </defs>
    <ellipse cx="80" cy="129" rx="54" ry="6" fill="#7B9478" opacity=".09" />
    {artwork}
  </svg>;
}

const styles = `
.ifs { --ifs-orange:#E67E22; --ifs-gap:12px; width:100%; max-width:80rem; margin:24px auto 0; scroll-margin-top:100px; padding:clamp(25px,3.2vw,44px); overflow:hidden; border:1px solid #e0e6e3; border-radius:34px; background:radial-gradient(ellipse at 50% 0,#fff7ec80,transparent 65%),#fff; color:#203c32; font-family:Inter,system-ui,sans-serif; }
.ifs *, .ifs *::before, .ifs *::after { box-sizing:border-box; }
.ifs-header { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-bottom:30px; }
.ifs-heading { display:flex; flex-direction:column; align-items:flex-start; gap:12px; }
.ifs-badge { display:inline-flex; align-items:center; gap:7px; padding:5px 10px; border:1px solid #E67E2226; border-radius:6px; background:#E67E220a; color:#a55c1e; font-size:10px; font-weight:550; letter-spacing:.04em; }
.ifs-badge::before { content:''; width:5px; height:5px; border-radius:50%; background:var(--ifs-orange); box-shadow:0 0 6px #E67E2230; }
.ifs h2 { margin:0; color:#203c32; font-family:Outfit,Inter,system-ui,sans-serif; font-size:clamp(28px,3.2vw,42px); line-height:1.15; font-weight:600; letter-spacing:-.045em; }
.ifs-controls { display:flex; flex-direction:column; align-items:flex-end; gap:8px; flex-shrink:0; }
.ifs-toggle { display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:35px; padding:7px 12px; border:1px solid #dde5dc; border-radius:8px; color:#4c6357; background:#fff; font:500 11px/1.4 Inter,system-ui,sans-serif; cursor:pointer; }
.ifs-toggle:hover { background:#fff7ed; border-color:#e8c6a6; }
.ifs-status { color:#829083; font-size:10px; font-variant-numeric:tabular-nums; }
.ifs-viewport { overflow-x:auto; overflow-y:hidden; padding:8px 4px 25px; scrollbar-width:none; overscroll-behavior-x:contain; }
.ifs-viewport::-webkit-scrollbar { display:none; }
.ifs-grid { position:relative; display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); align-items:stretch; gap:var(--ifs-gap); isolation:isolate; }
.ifs-rail { position:absolute; z-index:-1; top:20px; left:calc((100% - 5 * var(--ifs-gap)) / 12); right:calc((100% - 5 * var(--ifs-gap)) / 12); height:2px; background:#e5e9df; }
.ifs-beam { position:absolute; inset:0; transform:scaleX(var(--ifs-progress)); transform-origin:left center; background:linear-gradient(90deg,#efb67e,var(--ifs-orange)); box-shadow:0 0 8px #E67E2260; transition:transform 950ms cubic-bezier(.2,.6,.3,1); }
.ifs-beam::after { content:''; position:absolute; inset:-1px 0; background:linear-gradient(90deg,transparent 25%,#fff3cf 50%,transparent 75%); background-size:90px 100%; animation:ifs-travel 2.2s linear infinite; }
.ifs-beam-head { position:absolute; left:calc(var(--ifs-progress) * 100%); top:50%; width:7px; height:7px; border-radius:50%; background:#f5a855; box-shadow:0 0 11px #E67E22; transform:translate(-50%,-50%); transition:left 950ms cubic-bezier(.2,.6,.3,1); }
.ifs[data-step="0"] .ifs-beam, .ifs[data-step="0"] .ifs-beam-head { transition:none; }
.ifs-card { position:relative; display:flex; flex-direction:column; align-items:stretch; min-width:0; padding:0; border:0; background:transparent; color:inherit; text-align:center; font:inherit; cursor:pointer; -webkit-tap-highlight-color:transparent; }
.ifs-node { position:relative; display:grid; place-items:center; align-self:center; width:42px; height:42px; margin:0 0 20px; border:1px solid #dce5d9; border-radius:50%; background:#fff; color:#849784; font-family:Outfit,Inter,system-ui,sans-serif; font-size:13px; font-weight:550; transition:color .4s,border-color .4s,box-shadow .4s; }
.ifs-card.is-complete .ifs-node { color:#bd742d; border-color:#edcfaf; background:#fffbf6; }
.ifs-card.is-active .ifs-node { color:#fff; border-color:var(--ifs-orange); background:var(--ifs-orange); box-shadow:0 0 0 5px #E67E220c,0 0 18px #E67E2233; }
.ifs-glass { position:relative; display:flex; flex:1; flex-direction:column; align-items:center; min-height:312px; padding:20px 12px 22px; border:1px solid #e4e9e0; border-radius:17px; background:linear-gradient(145deg,#ffffffd9,#f8faf5b3); backdrop-filter:blur(14px); transition:border-color .4s,box-shadow .4s,background .4s; }
.ifs-glass::before { content:''; position:absolute; z-index:-1; inset:-13px -7px; border-radius:50%; background:radial-gradient(ellipse,#E67E222c 0%,#F39C1212 45%,transparent 73%); filter:blur(13px); opacity:0; transition:opacity .4s; pointer-events:none; }
.ifs-card.is-active .ifs-glass { border-color:#E67E2266; background:linear-gradient(145deg,#fffdf8e8,#fff4e6b3); box-shadow:0 8px 24px #E67E2214,0 0 15px #F39C120b; }
.ifs-card.is-active .ifs-glass::before { opacity:1; animation:ifs-aura 3s ease-in-out infinite alternate; }
.ifs-graphic-slot { display:grid; place-items:center; width:100%; height:124px; flex-shrink:0; margin:0 0 15px; }
.ifs-art { width:132px; max-width:100%; transform:scale(.85); opacity:.65; transition:transform .4s,opacity .4s; }
.ifs-art svg { display:block; width:100%; height:auto; overflow:visible; }
.ifs-card.is-active .ifs-art { animation:ifs-arrive 650ms cubic-bezier(.34,1.56,.64,1) both; }
.ifs-copy { position:relative; width:100%; opacity:1; }
.ifs-card.is-active .ifs-copy { animation:ifs-reveal 400ms ease-out 900ms both; }
.ifs-title { display:block; min-height:58px; margin:0 0 10px; color:#284a3a; font-family:Outfit,Inter,system-ui,sans-serif; font-size:15px; font-weight:550; line-height:1.3; letter-spacing:-.015em; }
.ifs-description { display:block; margin:0; color:#63735f; font-size:11px; font-weight:400; line-height:1.7; }
.ifs-card.is-active .ifs-description { color:#576a50; }
.ifs-card:hover .ifs-glass { border-color:#e1bd95; }
.ifs-card:focus-visible { outline:none; }
.ifs-card:focus-visible .ifs-glass, .ifs-toggle:focus-visible { outline:2px solid var(--ifs-orange); outline-offset:4px; }
.ifs[data-visible="false"] .ifs-art, .ifs[data-visible="false"] .ifs-copy, .ifs[data-visible="false"] .ifs-glass::before, .ifs[data-visible="false"] .ifs-beam::after { animation-play-state:paused; }
@keyframes ifs-arrive { from { transform:scale(.45); opacity:.12; } to { transform:scale(1.18); opacity:1; } }
@keyframes ifs-reveal { from { transform:translateY(12px); opacity:0; } to { transform:translateY(0); opacity:1; } }
@keyframes ifs-aura { to { opacity:.65; transform:scale(1.12); } }
@keyframes ifs-travel { to { background-position:180px 0; } }
@media(max-width:1000px) {
  .ifs { --ifs-card-width:240px; }
  .ifs-viewport { padding-inline:max(4px,calc((100% - var(--ifs-card-width)) / 2)); }
  .ifs-grid { width:max-content; grid-template-columns:repeat(6,var(--ifs-card-width)); }
  .ifs-glass { min-height:305px; padding-inline:22px; }
  .ifs-title { min-height:40px; font-size:17px; }
  .ifs-description { font-size:12px; }
}
@media(max-width:600px) {
  .ifs { --ifs-card-width:clamp(220px,76vw,280px); padding:26px 16px 12px; border-radius:28px; }
  .ifs-header { gap:12px; margin-bottom:24px; align-items:flex-end; }
  .ifs-heading { gap:10px; }
  .ifs h2 { max-width:200px; font-size:30px; }
  .ifs-toggle { padding:7px 9px; font-size:10px; }
  .ifs-status { font-size:9px; }
}
@media(prefers-reduced-motion:reduce) {
  .ifs *, .ifs *::before, .ifs *::after { animation:none!important; transition:none!important; }
  .ifs-card.is-active .ifs-art { transform:scale(1.18); opacity:1; }
  .ifs-card.is-active .ifs-copy { opacity:1; transform:none; }
}
`;

export default function InvestmentFlowShowcase() {
  const [active, setActive] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const sectionRef = React.useRef(null);
  const viewportRef = React.useRef(null);
  const cardsRef = React.useRef([]);
  const instanceId = React.useId().replace(/[^a-zA-Z0-9]/g, "");

  React.useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  React.useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (paused || hovered || reducedMotion || !visible) return;
    const timeout = window.setTimeout(() => setActive((active + 1) % STEPS.length), 3500);
    return () => window.clearTimeout(timeout);
  }, [active, paused, hovered, reducedMotion, visible]);

  React.useEffect(() => {
    const viewport = viewportRef.current;
    const centerActiveCard = () => {
      if (viewport.scrollWidth <= viewport.clientWidth + 1) return;
      const card = cardsRef.current[active];
      const target = card.getBoundingClientRect().left - viewport.getBoundingClientRect().left
        + viewport.scrollLeft - (viewport.clientWidth - card.offsetWidth) / 2;
      viewport.scrollTo({ left: target, behavior: reducedMotion ? "auto" : "smooth" });
    };
    centerActiveCard();
    const observer = new ResizeObserver(centerActiveCard);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [active, reducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="investment-flow"
      className="ifs"
      aria-labelledby={"ifs-title-" + instanceId}
      data-step={active}
      data-visible={visible}
      style={{ "--ifs-progress": active / (STEPS.length - 1) }}
      onPointerEnter={event => { if (event.pointerType !== "touch") setHovered(true); }}
      onPointerLeave={() => setHovered(false)}
    >
      <style>{styles}</style>
      <header className="ifs-header">
        <div className="ifs-heading">
          <span className="ifs-badge">Investment journey</span>
          <h2 id={"ifs-title-" + instanceId}>Our Investment Flow</h2>
        </div>
        <div className="ifs-controls">
          <button type="button" className="ifs-toggle" onClick={() => setPaused(value => !value)} aria-pressed={paused}>
            <span aria-hidden="true">{paused ? "\u25b6" : "\u275a\u275a"}</span>
            {paused ? "Resume flow" : "Pause flow"}
          </button>
          <span className="ifs-status">Step {active + 1} of {STEPS.length}</span>
        </div>
      </header>
      <div className="ifs-viewport" ref={viewportRef}>
        <div className="ifs-grid" role="group" aria-label="Investment flow steps">
          <div className="ifs-rail" aria-hidden="true"><span className="ifs-beam" /><span className="ifs-beam-head" /></div>
          {STEPS.map((step, index) => (
            <button
              key={step.graphic}
              type="button"
              ref={element => { cardsRef.current[index] = element; }}
              className={"ifs-card" + (active === index ? " is-active" : "") + (index < active ? " is-complete" : "")}
              aria-label={"Step " + (index + 1) + ". " + step.title + ". " + step.description}
              aria-pressed={active === index}
              onClick={() => setActive(index)}
            >
              <span className="ifs-node" aria-hidden="true">{index + 1}</span>
              <span className="ifs-glass">
                <span className="ifs-graphic-slot"><span className="ifs-art"><FlowGraphic kind={step.graphic} id={"ifs-" + instanceId + "-" + index} /></span></span>
                <span className="ifs-copy">
                  <span className="ifs-title">{step.title}</span>
                  <span className="ifs-description">{step.description}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
