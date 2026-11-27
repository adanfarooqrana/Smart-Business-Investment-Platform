import React from "react";

const CITIES = [
  { key: "gujranwala", name: "Gujranwala", x: 432, y: 160 },
  { key: "lahore", name: "Lahore", x: 516, y: 244 },
  { key: "islamabad", name: "Islamabad", x: 514, y: 88 },
  { key: "karachi", name: "Karachi", x: 175, y: 330 },
];
const DEMO_SEARCHES = [
  "Mobile Accessories in Gujranwala", "Packaging in Lahore", "Electronics in Islamabad",
  "Garments in Karachi", "Shoes in Lahore",
];
const PRODUCTS = [
  { pattern: /charger|mobile|accessor/i, name: "fast chargers", retail: 450, bulk: 365 },
  { pattern: /shoe|footwear/i, name: "shoes", retail: 1800, bulk: 1440 },
  { pattern: /packag|box|carton/i, name: "packaging boxes", retail: 80, bulk: 64 },
  { pattern: /electronic|adapter/i, name: "electronics", retail: 1200, bulk: 990 },
  { pattern: /garment|cloth|textile/i, name: "garments", retail: 850, bulk: 680 },
];
const SUPPLIERS = [
  { name: "Al-Madina Wholesale Hub", match: 98, markup: 0 },
  { name: "Metro Trade Depot", match: 96, markup: 0.03 },
  { name: "City Bulk Supply", match: 93, markup: 0.06 },
];
const BUILDINGS = [
  [110,88,18],[151,104,27],[191,119,14],[231,133,22],[271,148,18],
  [348,82,18],[389,96,25],[429,111,15],[550,131,20],[591,146,29],
  [99,182,23],[140,197,14],[181,212,32],[222,227,17],[262,242,25],
  [315,180,18],[356,195,29],[397,210,14],[438,225,22],[479,240,16],
  [322,296,25],[363,311,16],[405,327,29],[446,342,18],
  [519,300,21],[560,315,31],[601,330,17],
];
const ROUTES = [
  "M514 88Q455 96 432 160",
  "M432 160Q496 176 516 244",
  "M516 244Q365 352 175 330",
  "M175 330Q218 108 514 88",
];
const ROAD_PATHS = [
  "M-40 100 710 375", "M65 -20 770 240", "M-10 251 590 12",
  "M120 470 770 160", "M-80 410 675 60", "M-100 5 655 292",
];
const format = new Intl.NumberFormat("en-PK");
const money = value => "Rs. " + format.format(value);

function parseSearch(text, id) {
  const query = text.trim().replace(/\s+/g, " ").slice(0, 160);
  const split = query.match(/^(.+?)\s+(?:in|near|at)\s+(.+)$/i);
  const cityText = split?.[2] || "";
  const city = CITIES.find(place => query.toLowerCase().includes(place.name.toLowerCase())) || CITIES[0];
  const product = (split?.[1] || query.replace(new RegExp(city.name, "ig"), "").trim() || "Mobile Accessories").slice(0, 70);
  const cityName = (cityText || city.name).slice(0, 40);
  const knownProduct = PRODUCTS.find(item => item.pattern.test(product));
  const item = knownProduct || { name: product, retail: 450, bulk: 365 };
  return { id, query, product, city, cityName, item };
}

function AgentMark() {
  return <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <path d="m14 3 9 5v12l-9 5-9-5V8Z" stroke="currentColor" strokeWidth="1.2" opacity=".4" />
    <path d="m14 7 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="currentColor" />
  </svg>;
}

function CityMap({ id, city }) {
  return <svg className="wms-vector-map" viewBox="0 0 700 420" width="700" height="420" fill="none" aria-hidden="true">
    <defs>
      <pattern id={id + "-grid"} width="35" height="35" patternUnits="userSpaceOnUse">
        <path d="M35 0H0v35" stroke="#DCE4E8" strokeWidth=".65" opacity=".65" />
      </pattern>
      <filter id={id + "-route"} x="-30%" y="-40%" width="160%" height="180%">
        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#E67E22" floodOpacity=".3" />
      </filter>
    </defs>
    <rect width="700" height="420" fill="#FFFEFA" />
    <rect width="700" height="420" fill={"url(#" + id + "-grid)"} />
    <path d="M-30 334Q148 150 314 205T735 79" stroke="#DCECEF" strokeWidth="27" />
    <path d="M-30 334Q148 150 314 205T735 79" stroke="#EEF8F8" strokeWidth="19" />
    <path d="m51 287 60-24 56 22-60 25Z" fill="#E8F1DF" stroke="#D9E6CE" />
    <path d="m531 47 54-21 61 23-54 23Z" fill="#E8F1DF" stroke="#D9E6CE" />
    {ROAD_PATHS.map(path => <g key={path}><path d={path} stroke="#DCE3E8" strokeWidth="8" /><path d={path} stroke="#FFFFFF" strokeWidth="6" /></g>)}
    {BUILDINGS.map(([x, y, height], index) => <g key={index} transform={"translate(" + x + " " + y + ")"}>
      <ellipse cx="6" cy="19" rx="23" ry="5" fill="#6F8394" opacity=".07" />
      <path d={"M24 " + (8 - height) + " 9 " + (17 - height) + "V17l15-9Z"} fill="#DCE5EB" stroke="#C8D5DF" strokeWidth=".6" />
      <path d={"M-15 " + (9 - height) + " 9 " + (17 - height) + "V17l-24-8Z"} fill="#ECF0F2" stroke="#CCD9E0" strokeWidth=".6" />
      <path d={"M0 " + -height + " 24 " + (8 - height) + " 9 " + (17 - height) + " -15 " + (9 - height) + "Z"} fill={index % 5 === 0 ? "#FFF0D7" : "#FFFFFF"} stroke="#CBD8DF" strokeWidth=".7" />
      <path d={"m-8 " + (17 - height) + " 3 1m4 2 3 1"} stroke="#B5C5CD" strokeWidth="1.2" />
    </g>)}
    {[[81,283],[111,276],[588,46],[608,51],[558,57],[292,339]].map(([x, y]) => <g key={x} transform={"translate(" + x + " " + y + ")"}><ellipse cy="9" rx="6" ry="2" fill="#ABC69B" opacity=".3" /><path d="M0 2v7" stroke="#A2BB90" strokeWidth="1.5" /><circle r="5" fill="#D1E4C1" /><circle cx="-1" cy="-1" r="3" fill="#E0EED6" /></g>)}
    {ROUTES.map(path => <g key={path}><path d={path} stroke="#E67E22" strokeOpacity=".1" strokeWidth="6" /><path className="wms-route-flow" d={path} stroke="#E67E22" strokeWidth="1.6" strokeDasharray="5 7" filter={"url(#" + id + "-route)"} /></g>)}
    {CITIES.map(place => <g key={place.key} transform={"translate(" + place.x + " " + place.y + ")"}>
      <circle r="6" fill="#FFFFFF" stroke="#F0B37D" />
      <circle r="2.5" fill="#E67E22" />
      <text x="13" y="-7" fill={place.key === city.key ? "#B85C19" : "#64748B"} fontFamily="Inter,system-ui,sans-serif" fontSize="8" fontWeight="500" letterSpacing=".6">{place.name.toUpperCase()}</text>
    </g>)}
  </svg>;
}

function SalespersonRobot({ id }) {
  const paint = name => "url(#" + id + "-" + name + ")";
  return <svg className="wms-robo" viewBox="0 0 280 235" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={id + "-white"} x1="92" y1="38" x2="164" y2="192" gradientUnits="userSpaceOnUse"><stop stopColor="#FFFFFF" /><stop offset="1" stopColor="#E2E8F0" /></linearGradient>
      <linearGradient id={id + "-orange"} x1="97" y1="119" x2="161" y2="190" gradientUnits="userSpaceOnUse"><stop stopColor="#FFBB73" /><stop offset=".5" stopColor="#E67E22" /><stop offset="1" stopColor="#C9681C" /></linearGradient>
      <linearGradient id={id + "-box"} x1="169" y1="103" x2="220" y2="164" gradientUnits="userSpaceOnUse"><stop stopColor="#FFE6B9" /><stop offset="1" stopColor="#E9B76D" /></linearGradient>
      <filter id={id + "-shadow"} x="-50%" y="-40%" width="200%" height="190%"><feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#9A5A20" floodOpacity=".14" /></filter>
      <filter id={id + "-boxglow"} x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#E67E22" floodOpacity=".2" /></filter>
    </defs>
    <ellipse cx="142" cy="217" rx="61" ry="6" fill="#E67E22" opacity=".09" />
    <g className="wms-robo-float" strokeLinecap="round" strokeLinejoin="round" filter={paint("shadow")}>
      <path d="M115 181v14m35-14v14" stroke="#D8E1EB" strokeWidth="12" />
      <rect x="100" y="190" width="30" height="13" rx="6" fill={paint("orange")} /><rect x="138" y="190" width="30" height="13" rx="6" fill={paint("orange")} />
      <rect x="101" y="121" width="65" height="66" rx="22" fill={paint("orange")} stroke="#E29A58" />
      <path d="M111 130h42" stroke="#FFE7C8" strokeWidth="2" />
      <circle cx="133" cy="154" r="13" fill="#FFF7EB" /><path d="m133 145 2.5 6.5 6.5 2.5-6.5 2.5-2.5 6.5-2.5-6.5-6.5-2.5 6.5-2.5Z" fill="#E67E22" />
      <path d="M104 139c-16 0-24-7-25-19" stroke="#E9A058" strokeWidth="13" /><path d="M104 136c-14-1-20-6-22-17" stroke="#FFCE98" strokeWidth="5" />
      <ellipse cx="79" cy="114" rx="9" ry="12" fill={paint("white")} stroke="#D9E2EA" />
      <path d="M162 143c13 7 21 6 27-4" stroke="#E99B4E" strokeWidth="13" />
      <rect x="117" y="110" width="33" height="17" rx="6" fill={paint("white")} stroke="#D9E2EA" />
      <g className="wms-robo-head">
        <path d="M132 38V24" stroke="#D8E2EA" strokeWidth="4" /><circle cx="132" cy="19" r="6" fill="#E67E22" />
        <rect x="72" y="61" width="16" height="26" rx="8" fill={paint("orange")} /><rect x="178" y="61" width="16" height="26" rx="8" fill={paint("orange")} />
        <rect x="83" y="36" width="100" height="81" rx="28" fill={paint("white")} stroke="#DCE5EC" />
        <path d="M101 43h63" stroke="#FFFFFF" strokeWidth="3" />
        <rect x="95" y="50" width="76" height="49" rx="18" fill="#FFF5E6" stroke="#F2D7B4" />
        <ellipse cx="117" cy="70" rx="5.5" ry="7" fill="#E67E22" /><ellipse cx="150" cy="70" rx="5.5" ry="7" fill="#E67E22" />
        <path d="M123 88q10 8 20 0" stroke="#D67B2D" strokeWidth="2.6" />
      </g>
      <g className="wms-product-box" filter={paint("boxglow")}>
        <path d="m171 112 29-15 32 14-28 16Z" fill="#FFE6BC" stroke="#D5A66B" />
        <path d="m171 112 33 15v41l-33-16Z" fill={paint("box")} stroke="#C99253" />
        <path d="m204 127 28-16v40l-28 17Z" fill="#DEAA61" stroke="#C99253" />
        <path d="m184 105 33 14v14l-9 5v-15l-33-14" fill="#FFF5DE" opacity=".8" />
        <path d="m182 141 13 6m-13 1 8 4" stroke="#B88145" strokeWidth="1.5" />
      </g>
      <path d="m183 145 7 3m-9 1 8 3" stroke="#F7FAFC" strokeWidth="4" />
    </g>
    <g className="wms-float-tag" transform="translate(222 60)"><rect x="-20" y="-10" width="40" height="21" rx="6" fill="#FFFFFF" stroke="#EFCBA7" /><text textAnchor="middle" y="4" fill="#C56E29" fontSize="8" fontFamily="Inter,system-ui,sans-serif" fontWeight="600">BULK</text></g>
    <path className="wms-sparkle" d="m59 73 2-7 2 7 7 2-7 2-2 7-2-7-7-2Z" fill="#F2B36A" />
    <path className="wms-sparkle second" d="m223 27 1.5-5 1.5 5 5 1.5-5 1.5-1.5 5-1.5-5-5-1.5Z" fill="#E67E22" opacity=".4" />
  </svg>;
}

const styles = `
#wholesale:has(.wms-showcase) { scroll-margin-top:100px; }
.wms-showcase { --wms-orange:#E67E22; width:100%; font-family:Inter,system-ui,sans-serif; color:#0F172A; background:radial-gradient(ellipse at 100% 0,#FFF7ED,transparent 65%),#FFFFFF; }
.wms-showcase *, .wms-showcase *::before, .wms-showcase *::after { box-sizing:border-box; }
.wms-layout { display:grid; grid-template-columns:minmax(0,3fr) minmax(0,2fr); gap:clamp(24px,3vw,42px); align-items:center; }
.wms-left { min-width:0; overflow:hidden; border:1px solid #E2E8F0; border-radius:23px; background:#FFFFFF; box-shadow:0 10px 35px #263e3108; }
.wms-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:17px 18px 12px; }
.wms-eyebrow { margin:0 0 6px; color:#B96321; font-size:9px; font-weight:550; letter-spacing:.14em; }
.wms-map-title { margin:0; color:#0F172A; font-family:Outfit,Inter,system-ui,sans-serif; font-size:20px; font-weight:550; letter-spacing:-.025em; }
.wms-demo-controls { display:flex; align-items:center; gap:7px; }
.wms-demo-label { display:inline-flex; align-items:center; gap:5px; padding:5px 7px; border:1px solid #D1FAE5; border-radius:6px; background:#F0FDF4; color:#047857; font-size:8px; white-space:nowrap; }
.wms-demo-label::before { content:''; width:4px; height:4px; border-radius:50%; background:#10B981; }
.wms-toggle { display:grid; place-items:center; width:26px; height:26px; padding:0; border:1px solid #E2E8F0; border-radius:50%; background:#fff; color:#64748B; font-size:9px; cursor:pointer; }
.wms-search { display:flex; gap:8px; padding:0 16px 13px; }
.wms-search-field { display:flex; align-items:center; gap:8px; flex:1; min-width:0; padding-left:11px; border:1px solid #E2E8F0; border-radius:10px; background:#fff; box-shadow:0 2px 4px #1e293b03; }
.wms-search-field:focus-within { border-color:#E67E2280; box-shadow:0 0 0 3px #E67E220a; }
.wms-search-field svg { width:15px; height:15px; flex-shrink:0; color:#A2AABA; }
.wms-input { display:block; width:100%; min-width:0; height:41px; padding:0 10px 0 0; border:0; outline:none; background:transparent; color:#334155; font:11px Inter,system-ui,sans-serif; }
.wms-input::placeholder { color:#94A3B8; }
.wms-locate { flex-shrink:0; min-width:70px; height:43px; padding:0 12px; border:1px solid #DB7821; border-radius:10px; background:#E67E22; color:#FFFFFF; box-shadow:0 4px 12px #E67E2220; font:500 11px Inter,system-ui,sans-serif; cursor:pointer; }
.wms-locate.is-locating { animation:wms-locate-glow 1s ease-in-out infinite; }
.wms-locate:disabled { opacity:.5; cursor:default; }
.wms-map-stage { position:relative; height:440px; overflow:hidden; isolation:isolate; border-top:1px solid #EAF0F4; border-bottom:1px solid #EAF0F4; background:#FFFEFA; }
.wms-world { position:absolute; z-index:0; left:50%; top:50%; width:700px; height:420px; transform:translate(-50%,-50%) translate(var(--wms-pan-x),var(--wms-pan-y)) scale(var(--wms-zoom)); transform-origin:50% 50%; transition:transform 1.05s cubic-bezier(.2,.65,.3,1),top .75s ease; }
.wms-map-stage.has-deal .wms-world { top:32%; }
.wms-vector-map { display:block; width:700px; height:420px; }
.wms-route-flow { animation:wms-route-flow 2.5s linear infinite; }
.wms-radar { position:absolute; z-index:1; width:34px; height:34px; pointer-events:none; transform:translate(-50%,-50%); }
.wms-radar i { position:absolute; inset:0; border:1px solid #E67E2290; border-radius:50%; background:#E67E2208; animation:wms-radar 4s ease-out infinite; }
.wms-radar i:nth-child(2) { animation-delay:1.3s; }.wms-radar i:nth-child(3) { animation-delay:2.6s; }
.wms-pin { position:absolute; z-index:3; display:block; width:38px; height:46px; padding:0; border:0; outline:none; background:transparent; color:#E67E22; transform:translate(-50%,-100%); cursor:pointer; animation:wms-pin-drop .65s cubic-bezier(.2,1.3,.4,1) both; animation-delay:calc(var(--wms-pin-order)*95ms); }
.wms-pin.is-selected { z-index:5; }
.wms-pin-symbol { position:relative; z-index:2; display:block; width:38px; height:46px; filter:drop-shadow(0 4px 6px #E67E2235); transition:transform .25s; }
.wms-pin:hover .wms-pin-symbol,.wms-pin.is-selected .wms-pin-symbol { transform:translateY(-2px) scale(1.08); }
.wms-pin-ring { position:absolute; z-index:0; bottom:-8px; left:7px; width:24px; height:12px; border:1px solid #E67E2280; border-radius:50%; animation:wms-pin-ring 2.5s ease-out infinite; }
.wms-pin-label { position:absolute; top:48px; left:50%; display:flex; flex-direction:column; gap:4px; width:142px; padding:7px 8px; border:1px solid #E67E2240; border-radius:8px; background:#FFFFFFf5; box-shadow:0 4px 12px #31412f0b; transform:translateX(-50%); backdrop-filter:blur(8px); text-align:left; }
.wms-pin-label strong { overflow:hidden; color:#334155; font-size:9px; font-weight:550; text-overflow:ellipsis; white-space:nowrap; }
.wms-pin-meta { display:flex; align-items:center; gap:4px; color:#A15B25; font-size:8px; white-space:nowrap; }
.wms-pin-meta svg { width:10px; height:10px; color:#16A36C; }
.wms-pin:focus-visible .wms-pin-label { outline:2px solid #E67E22; outline-offset:3px; }
.wms-map-corner { position:absolute; z-index:2; left:12px; top:12px; padding:6px 9px; border:1px solid #E2E8F0; border-radius:6px; background:#ffffffea; color:#64748B; font-size:8px; backdrop-filter:blur(10px); }
.wms-deal { position:absolute; z-index:7; right:12px; bottom:12px; display:flex; flex-direction:column; width:min(344px,calc(100% - 24px)); max-height:calc(100% - 173px); padding:13px; border:1px solid #E67E2245; border-radius:14px; background:#FFFFFFf5; box-shadow:0 12px 30px #783c181c,0 2px 6px #3341550a; backdrop-filter:blur(18px); animation:wms-deal-in .45s cubic-bezier(.2,.7,.3,1) both; }
.wms-deal-header { display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:11px; }
.wms-deal-agent { display:flex; align-items:center; gap:8px; min-width:0; }
.wms-agent-mark { display:grid; place-items:center; flex-shrink:0; width:29px; height:29px; border:1px solid #E67E2225; border-radius:9px; color:#E67E22; background:#FFF7ED; box-shadow:0 0 14px #E67E221b; }
.wms-agent-mark svg { width:23px; height:23px; }
.wms-agent-status { display:flex; align-items:center; gap:4px; color:#B96321; font-size:7px; font-weight:550; letter-spacing:.025em; }
.wms-agent-status::before { content:''; width:4px; height:4px; border-radius:50%; background:#E67E22; box-shadow:0 0 5px #E67E2245; }
.wms-deal-supplier { display:block; max-width:230px; overflow:hidden; margin-top:4px; color:#475569; font-size:9px; text-overflow:ellipsis; white-space:nowrap; }
.wms-close { display:grid; place-items:center; flex-shrink:0; width:23px; height:23px; padding:0; border:1px solid #E2E8F0; border-radius:50%; background:#FFFFFF; color:#64748B; cursor:pointer; font-size:14px; }
.wms-deal-scroll { min-height:0; overflow:auto; overscroll-behavior:contain; scrollbar-width:thin; scrollbar-color:#E7D5C0 transparent; }
.wms-buyer { max-width:90%; margin:0 0 9px auto; padding:8px 10px; border:1px solid #E2E8F0; border-radius:9px 0 9px 9px; background:#F8FAFC; color:#475569; font-size:10px; line-height:1.6; animation:wms-chat-in .3s ease-out both; }
.wms-offer { margin:0; padding:10px; border:1px solid #F1E5D6; border-radius:0 9px 9px 9px; background:#FFFDF9; color:#475569; font-size:11px; line-height:1.7; animation:wms-chat-in .3s ease-out both; }
.wms-offer strong { color:#A9581B; font-weight:600; }
.wms-typing { display:flex; align-items:center; gap:4px; min-height:29px; padding-left:9px; }
.wms-typing i { width:4px; height:4px; border-radius:50%; background:#E67E22; animation:wms-type 1s ease-in-out infinite; }.wms-typing i:nth-child(2) { animation-delay:.15s; }.wms-typing i:nth-child(3) { animation-delay:.3s; }
.wms-closed { display:flex; align-items:flex-start; gap:6px; flex-shrink:0; margin:10px 0 0; padding:8px 9px; border:1px solid #C7EBD5; border-radius:8px; background:#F0FDF4; color:#166534; font-size:9px; font-weight:500; line-height:1.6; animation:wms-closed .65s ease-out both; }
.wms-closed svg { width:13px; height:13px; flex-shrink:0; margin-top:1px; }
.wms-map-footer { padding:13px 16px 14px; }
.wms-result-note { margin:0 0 7px; color:#475569; font-size:10px; line-height:1.6; overflow-wrap:anywhere; }
.wms-network { display:flex; align-items:center; flex-wrap:wrap; gap:5px; color:#8291A0; font-size:8px; line-height:1.5; }
.wms-network i { width:4px; height:4px; border-radius:50%; background:#E8AA70; }
.wms-editorial { min-width:0; padding:8px 0; }
.wms-editorial h2 { margin:0 0 20px; font-family:Outfit,Inter,system-ui,sans-serif; font-size:clamp(31px,3.4vw,43px); font-weight:600; line-height:1.15; letter-spacing:-.045em; }
.wms-editorial h2 span { display:block; background:linear-gradient(110deg,#E67E22,#D35400); background-clip:text; -webkit-text-fill-color:transparent; }
.wms-description { margin:0; color:#526275; font-size:13px; line-height:1.85; }
.wms-robo-wrap { margin:17px 0 14px; }
.wms-robo { display:block; width:236px; max-width:100%; height:auto; margin:auto; overflow:visible; }
.wms-robo-float { animation:wms-robo-float 4.8s ease-in-out infinite; }
.wms-robo-head { transform-origin:133px 84px; animation:wms-robo-head 6s ease-in-out infinite; }
.wms-product-box { transform-origin:200px 136px; animation:wms-box 3s ease-in-out infinite; }
.wms-float-tag { animation:wms-tag 3.5s ease-in-out infinite; }.wms-sparkle { animation:wms-sparkle 2.5s ease-in-out infinite; transform-box:fill-box; transform-origin:center; }.wms-sparkle.second { animation-delay:-1s; }
.wms-cta { position:relative; display:inline-flex; align-items:center; justify-content:center; gap:9px; min-height:43px; overflow:hidden; padding:11px 18px; border:1px solid #1E293B; border-radius:11px; color:#FFFFFF; background:#0F172A; box-shadow:0 4px 12px #0F172A12; font-size:12px; font-weight:500; text-decoration:none; transition:background .25s,border-color .25s,box-shadow .25s,transform .25s; }
.wms-cta svg { width:15px; height:15px; }
.wms-cta:hover { transform:translateY(-2px); border-color:#D87520; background:#E67E22; box-shadow:0 8px 25px #E67E222e,0 3px 8px #0F172A0b; }
.wms-cta::after { content:''; position:absolute; inset:-40%; pointer-events:none; background:linear-gradient(115deg,transparent 40%,#ffffff24 50%,transparent 60%); transform:translateX(-80%); transition:transform .8s; }.wms-cta:hover::after { transform:translateX(80%); }
.wms-showcase button:focus-visible,.wms-cta:focus-visible { outline:2px solid #E67E22; outline-offset:3px; }
.wms-editorial [data-reveal] { animation:wms-editorial-in .6s cubic-bezier(.2,.65,.3,1) both; animation-delay:var(--wms-reveal-delay,0s); }
.wms-showcase[data-visible=false] [data-reveal] { animation-play-state:paused; }
@keyframes wms-route-flow { to { stroke-dashoffset:-48; } } @keyframes wms-radar { from { transform:scale(.7); opacity:.65; } to { transform:scale(5); opacity:0; } }
@keyframes wms-pin-drop { from { transform:translate(-50%,-155%) scale(.65); opacity:0; } to { transform:translate(-50%,-100%) scale(1); opacity:1; } }
@keyframes wms-pin-ring { from { transform:scale(.7); opacity:.7; } to { transform:scale(2.8); opacity:0; } }
@keyframes wms-deal-in { from { transform:translate(18px,8px); opacity:0; } to { transform:translate(0,0); opacity:1; } }
@keyframes wms-chat-in { from { transform:translateY(5px); opacity:0; } to { transform:translateY(0); opacity:1; } }
@keyframes wms-type { 50% { opacity:.35; transform:translateY(-2px); } }
@keyframes wms-closed { 0% { box-shadow:0 0 0 0 #22C55E20; transform:scale(.98); opacity:0; } 60% { box-shadow:0 0 0 4px #22C55E08; } 100% { box-shadow:0 0 0 0 #22C55E00; transform:scale(1); opacity:1; } }
@keyframes wms-locate-glow { 50% { box-shadow:0 0 20px #E67E2240; } }
@keyframes wms-robo-float { 50% { transform:translateY(-6px); } } @keyframes wms-robo-head { 50% { transform:rotate(2deg); } }
@keyframes wms-box { 50% { transform:translateY(-2px) scale(1.015); } } @keyframes wms-tag { 50% { transform:translate(222px,55px); } }
@keyframes wms-sparkle { 50% { opacity:.3; transform:scale(.75); } } @keyframes wms-editorial-in { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
@media(max-width:980px) { .wms-layout { grid-template-columns:minmax(0,1fr); gap:30px; } .wms-editorial { display:grid; grid-template-columns:minmax(0,1fr) 230px; gap:0 25px; } .wms-editorial h2,.wms-description,.wms-cta-wrap { grid-column:1; } .wms-robo-wrap { grid-column:2; grid-row:1 / 4; align-self:center; margin:0; } }
@media(max-width:600px) { .wms-layout { gap:24px; } .wms-toolbar { padding:14px 12px 11px; gap:7px; flex-wrap:wrap; } .wms-toolbar > div:first-child { min-width:150px; flex:1; } .wms-demo-controls { margin-left:auto; } .wms-map-title { font-size:18px; } .wms-search { padding:0 10px 11px; gap:6px; } .wms-search-field { gap:5px; padding-left:8px; } .wms-input { font-size:16px; padding-right:4px; } .wms-locate { min-width:60px; padding-inline:9px; font-size:10px; } .wms-demo-label { font-size:7px; padding:4px; } .wms-map-stage { height:480px; } .wms-map-stage.has-deal .wms-world { top:26%; } .wms-deal { padding:11px; } .wms-pin:not(.is-selected) .wms-pin-label { opacity:0; pointer-events:none; } .wms-pin-0 .wms-pin-label { left:0; transform:translateX(-10%); } .wms-pin-2 .wms-pin-label { left:auto; right:0; transform:translateX(10%); } .wms-editorial { display:block; } .wms-editorial h2 { font-size:34px; } .wms-robo { width:210px; } .wms-robo-wrap { margin:15px 0; } .wms-cta-wrap { text-align:center; } }
@media(prefers-reduced-motion:reduce) { .wms-showcase *, .wms-showcase *::before,.wms-showcase *::after { animation:none!important; transition:none!important; } }
`;



const SMALL_SHOPS = [
 {id:"DEMO-STRAWBERRY",name:"Berry Basket",icon:"🍓",kind:"small",category:"Strawberry shop",product:"fresh strawberry boxes",retail:250,bulk:210,minimum:800,open:true,needs:"Fresh fruit stock, chilled packaging and same-day local delivery.",helper:"Part-time packing and delivery helper"},
 {id:"DEMO-KITCHEN",name:"Ammi’s Home Kitchen",icon:"🍲",kind:"small",category:"Home kitchen",product:"home-cooked lunch boxes",retail:350,bulk:290,minimum:1500,open:true,needs:"Ingredients, hygienic food containers and pre-ordered office lunches.",helper:"Paid kitchen assistant for cooking and food preparation"},
 {id:"DEMO-CANDY",name:"Little Candy House",icon:"🍬",kind:"small",category:"Homemade candies",product:"handmade candy packs",retail:120,bulk:95,minimum:500,open:true,needs:"Sugar, flavouring, food-safe wrapping and small-batch candy production.",helper:"Part-time candy-making and packing assistant"},
];
const SHOP_DEMOS = ["Small businesses in Gujranwala","Home kitchen in Lahore","Homemade candies in Karachi","Strawberry shop in Islamabad","Mobile Accessories in Gujranwala"];
function shopCatalog(search) {
 const text=search.product.toLowerCase();
 const small=SMALL_SHOPS.filter(b => /small|business|all|investment/.test(text) || (b.id.includes("STRAWBERRY") && /straw|fruit|berry/.test(text)) || (b.id.includes("KITCHEN") && /kitchen|food|lunch|cook/.test(text)) || (b.id.includes("CANDY") && /cand|sweet/.test(text)));
 if(small.length) return small;
 return SUPPLIERS.map((b,i)=>({...b,id:"DEMO-WHOLESALE-"+(i+1),icon:"📦",kind:"wholesale",category:search.product,product:search.item.name,retail:search.item.retail,bulk:Math.round(search.item.bulk*(1+b.markup)),minimum:i?10000:800,open:i!==2,needs:"Bulk inventory, packing and intercity dispatch.",helper:"Stock and dispatch assistant"}));
}
function liveCatalog(ideas) {
 return ideas.filter(i=>i?.id && i?.startupTitle).map(i=>({
 id:i.id,name:i.startupTitle,icon:"🏪",kind:"small",category:i.industry||"Registered business",product:i.description||i.stage1?.ideaDescription||"Ask the entrepreneur for product details",
 cityName:i.stage2?.marketInsight?.location||null,minimum:null,open:null,
 fundingAsk:Number(i.stage1?.requiredInvestmentPkr||i.stage2?.totalCapitalRequiredPkr)||null,
 needs:i.stage1?.coreProblemSolution||i.description||"Ask for the registered pitch.",helper:"Confirm hiring requirements with the entrepreneur",live:true
 }));
}
function replyToShop(question,business,budget,city) {
 const q=question.toLowerCase(), b=business, demo=!b.live;
 const prefix=demo?"Demo guide: ":"";
 if(/maid|helper|cook|staff|hire|worker|kaam/.test(q)) return prefix+b.helper+". Ask about paid hours, duties, cooking experience, hygiene, references and an agreed wage. I can help draft the enquiry; no worker has been found or contacted here.";
 if(/\bid\b|module|pitch|registered/.test(q)) return demo?"This listing’s example ID is "+b.id+". It is not a registered investor-module pitch. A real listing must use its existing pitch ID; no separate profile is needed.":"Investor-module pitch ID: "+b.id+". Business: "+b.name+". Use this same ID to review the existing entrepreneur pitch and agreement.";
 const amount=q.match(/(?:rs\.?\s*|pkr\s*|budget\s*|investment\s*)(\d[\d,]*)|\b(800|500|1500|2500)\b/i);
 if(amount||/budget|invest|available|availbel|fund|paisa/.test(q)){
 const n=amount?Number((amount[1]||amount[2]).replace(/,/g,"")):Number(budget)||800;
 if(b.live) return "The registered funding ask"+(b.fundingAsk?" is "+money(b.fundingAsk):" is not supplied")+". A minimum ticket and current investment availability have not been confirmed. Ask the entrepreneur whether "+money(n)+" is accepted, then review the pitch, use of funds and signed profit/loss terms. Pitch ID: "+b.id+".";
 const options=[...SMALL_SHOPS,...(b.kind==="wholesale"?[b]:[])].filter(x=>x.open&&x.minimum<=n).map(x=>x.name+" (from "+money(x.minimum)+")");
 return prefix+(options.length?"For "+money(n)+", matching examples are "+options.join(" and ")+". ":"No example currently fits "+money(n)+"; increase the budget or ask about a smaller ticket. ")+b.name+(b.open?" is shown as open for enquiries":" is not currently shown as open")+"; its example entry is "+money(b.minimum)+". Product purchases and investment are different. Confirm stock, expenses, revenue proof, accepted ticket and written profit/loss terms before committing. No investment is placed here.";
 }
 if(/price|rate|discount|negot|sast|unit|order|best|sample/.test(q)){
 const match=q.match(/(\d[\d,]*)\s*(?:units?|boxes?|packs?|pieces?)/i),qty=match?Math.min(10000,Math.max(1,Number(match[1].replace(/,/g,"")))):20;
 if(!b.bulk) return "Ask the entrepreneur for a current product price, minimum order, sample and delivery quote. Those figures are not supplied in this registered pitch. ID: "+b.id+".";
 return prefix+"For "+qty+" "+b.product+", the example retail rate is "+money(b.retail)+"/unit. A bulk offer is "+money(b.bulk)+"/unit: "+money(qty*b.bulk)+" before delivery. I would ask for a sample, fresh-stock confirmation and a written "+city+" delivery quote. Would you prefer a smaller trial batch? These prices are illustrative; no seller has accepted an order.";
 }
 return prefix+b.name+" works on "+b.needs+" You can ask me about product prices, a small investment budget, availability, its pitch ID, a sample order or hiring a paid helper. What is your budget, quantity and preferred delivery city? This is a simulated conversation, not a live seller negotiation.";
}

const extendedStyles = `
.wms-layout{align-items:start}.wms-editorial{padding-top:80px}.wms-map-stage{height:610px}.wms-map-stage.has-deal .wms-world{top:23%}.wms-deal{width:min(430px,calc(100% - 24px));max-height:370px}.wms-deal-scroll{max-height:170px;min-height:70px}.wms-filters{display:flex;flex-wrap:wrap;gap:8px;padding:0 16px 14px}.wms-filters label{flex:1;min-width:115px;font-size:9px;color:#64748B}.wms-filters select{display:block;width:100%;margin-top:5px;padding:8px 5px;border:1px solid #E2E8F0;border-radius:7px;background:#FFFDFA;color:#334155;font-size:10px}.wms-shop-icon{position:relative;z-index:2;display:grid;place-items:center;width:39px;height:39px;border:2px solid #FFF2DF;border-radius:14px 14px 14px 3px;background:linear-gradient(135deg,#FFF4DC,#FFD09C);font-size:23px;box-shadow:0 5px 16px #E67E2240;transition:transform .25s}.wms-pin:hover .wms-shop-icon,.wms-pin.is-selected .wms-shop-icon{transform:translateY(-3px) scale(1.1);outline:2px solid #E67E22}.wms-pin-label{top:43px;width:136px}.wms-pin-meta{white-space:normal}.wms-shop-list{display:grid;gap:7px;margin:10px 0 12px}.wms-shop-list button{display:flex;align-items:center;gap:9px;width:100%;padding:10px;border:1px solid #E2E8F0;border-radius:10px;background:white;text-align:left;cursor:pointer}.wms-shop-list button:hover,.wms-shop-list button.is-active{border-color:#E67E2270;background:#FFF8EF}.wms-list-icon{font-size:23px}.wms-shop-list strong{display:block;font-size:11px;color:#334155;font-weight:600}.wms-shop-list small{display:block;margin-top:4px;font-size:9px;color:#64748B}.wms-list-price{margin-left:auto;text-align:right;font-size:10px;color:#B96322;flex-shrink:0}.wms-business-facts{display:flex;justify-content:space-between;gap:6px;padding:0 0 9px;font-size:8px;color:#94724D;overflow-wrap:anywhere}.wms-offer{margin-bottom:9px;font-size:11px}.wms-chat-form{display:flex;gap:6px;border-top:1px solid #F1E7DA;margin-top:9px;padding-top:9px}.wms-chat-form input{min-width:0;flex:1;width:100%;border:1px solid #E2E8F0;border-radius:8px;padding:9px 7px;font-size:10px;outline-color:#E67E22;background:white;color:#334155}.wms-chat-form button{width:32px;border:0;border-radius:8px;background:#E67E22;color:white;font-size:19px;cursor:pointer}.wms-chat-form button:disabled,.wms-quick button:disabled{opacity:.5}.wms-quick{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.wms-quick button{border:1px solid #F2DDC6;border-radius:6px;background:#FFFBF5;color:#99551E;padding:5px 6px;font-size:8px;cursor:pointer}.wms-editorial-note{margin-top:22px;padding:17px;border:1px solid #F1DFC8;border-radius:15px;background:#FFFFFFc9}.wms-editorial-note>span{display:block;font-size:25px;letter-spacing:8px;margin-bottom:12px}.wms-editorial-note strong{font-size:13px;color:#9B531E}.wms-editorial-note p{font-size:11px;line-height:1.8;color:#64748B;margin:8px 0 0}.wms-empty{font-size:11px;line-height:1.7;color:#64748B}.wms-demo-cursor{position:absolute;z-index:6;pointer-events:none;display:flex;gap:4px;align-items:end;animation:wms-cursor 3s ease-in-out infinite}.wms-demo-cursor span{white-space:nowrap;border-radius:5px;padding:4px 6px;color:white;background:#0F172A;font-size:7px}.wms-map-title{font-size:19px}@keyframes wms-cursor{50%{transform:translate(7px,5px)}}@media(max-width:980px){.wms-editorial{display:block;padding-top:0}.wms-editorial-note{max-width:500px}.wms-robo{width:210px}}@media(max-width:600px){.wms-map-stage{height:640px}.wms-map-stage.has-deal .wms-world{top:20%}.wms-deal{max-height:385px;padding:11px}.wms-deal-scroll{max-height:180px}.wms-filters{padding:0 10px 12px}.wms-filters label{min-width:100px}.wms-list-price{max-width:105px;font-size:9px}.wms-shop-list strong{font-size:10px}.wms-chat-form input{font-size:16px}.wms-editorial-note>span{font-size:22px}.wms-business-facts{flex-direction:column;gap:4px}.wms-demo-cursor span{display:none}}
`;

export default function WholesaleMapShowcase({ startLink, investorListings = [] }) {
 const [draft,setDraft]=React.useState("");
 const [search,setSearch]=React.useState(null);
 const [phase,setPhase]=React.useState("waiting");
 const [selected,setSelected]=React.useState(null);
 const [visible,setVisible]=React.useState(false);
 const [paused,setPaused]=React.useState(false);
 const [interactive,setInteractive]=React.useState(false);
 const [manualRun,setManualRun]=React.useState(false);
 const [mapWidth,setMapWidth]=React.useState(700);
 const [budget,setBudget]=React.useState("all");
const [unitCap,setUnitCap]=React.useState("all");
 const [kind,setKind]=React.useState("all");
 const [cityChoice,setCityChoice]=React.useState("gujranwala");
 const [question,setQuestion]=React.useState("");
 const [messages,setMessages]=React.useState([]);
 const [pendingReply,setPendingReply]=React.useState(null);
 const sectionRef=React.useRef(null),mapRef=React.useRef(null),chatRef=React.useRef(null),requestId=React.useRef(0),demoIndex=React.useRef(0);
 const instanceId=React.useId().replace(/[^a-zA-Z0-9]/g,"");
 const beginSearch=React.useCallback((text,manual)=>{
  if(!text.trim())return;
  const next=parseSearch(text,++requestId.current);
  setSearch(next);setCityChoice(next.city.key);setDraft(text.trim());setSelected(null);setPhase("locating");
  setManualRun(manual);setInteractive(manual);setPaused(false);setMessages([]);setPendingReply(null);setQuestion("");
 },[]);
 React.useEffect(()=>{
  const visibility=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{threshold:.08});
  visibility.observe(sectionRef.current);
  const resize=new ResizeObserver(([entry])=>setMapWidth(entry.contentRect.width));resize.observe(mapRef.current);
  return()=>{visibility.disconnect();resize.disconnect()};
 },[]);
 const city=search?.city||CITIES[0];
 const live=React.useMemo(()=>liveCatalog(investorListings),[investorListings]);
 const catalog=React.useMemo(()=>{
  if(!search)return [];
  if(live.length)return live.filter(b=>!b.cityName||b.cityName.toLowerCase().includes(search.cityName.toLowerCase())).filter(b=>/small|all|business|investment/i.test(search.product)||(b.name+" "+b.category+" "+b.product).toLowerCase().includes(search.product.toLowerCase()));
  return shopCatalog(search);
 },[search,live]);
 const results=catalog.filter((b)=>unitCap==="all"||(b.bulk!=null&&b.bulk<=Number(unitCap))).filter(b=>(kind==="all"||b.kind===kind)&&(budget==="all"||(b.minimum!=null&&b.minimum<=Number(budget))));
 const supplier=selected===null?null:results.find(b=>b.id===selected)||null;
 React.useEffect(()=>{
  if(!visible||paused||(!manualRun&&interactive)||(phase==="closed"&&(manualRun||interactive)))return;
  const next=()=>{
   if(phase==="waiting"||phase==="closed"){beginSearch(SHOP_DEMOS[demoIndex.current++%SHOP_DEMOS.length],false)}
   else if(phase==="locating")setPhase("results");
   else if(phase==="results"){if(results[0]){setSelected(results[0].id);setPhase("buyer")}else setPhase("closed")}
   else if(phase==="buyer")setPhase("negotiating");
   else if(phase==="negotiating")setPhase("offer");
   else setPhase("closed");
  };
  const timer=setTimeout(next,({waiting:600,locating:900,results:1300,buyer:1100,negotiating:1500,offer:3500,closed:6500})[phase]||1500);
  return()=>clearTimeout(timer);
 },[phase,search?.id,visible,paused,interactive,manualRun,beginSearch,results.map(b=>b.id).join("|")]);
 React.useEffect(()=>{
  if(!pendingReply)return;
  const timer=setTimeout(()=>{setMessages(m=>[...m,{role:"agent",text:pendingReply}]);setPendingReply(null)},1100);
  return()=>clearTimeout(timer);
 },[pendingReply]);
 React.useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight},[messages,pendingReply,phase]);
 const openSupplier=b=>{setSelected(b.id);setPhase("buyer");setManualRun(true);setInteractive(true);setPaused(false);setMessages([]);setPendingReply(null);setQuestion("")};
 const toggleDemo=()=>{
  if(interactive){setUnitCap("all");setBudget("all");setKind("all");beginSearch(SHOP_DEMOS[demoIndex.current++%SHOP_DEMOS.length],false)}
  else setPaused(v=>!v);
 };
 const submitQuestion=text=>{
  if(!supplier||!text.trim()||pendingReply)return;
  setInteractive(true);setManualRun(false);setPhase("closed");
  setMessages(m=>[...m,{role:"buyer",text:text.trim()}]);setQuestion("");
  setPendingReply(replyToShop(text,supplier,budget,search.cityName));
 };
 const filterChange=(setter,value)=>{setter(value);setSelected(null);setMessages([]);setPendingReply(null);setPhase("results");setInteractive(true);setManualRun(false)};
 const changeCity=value=>{
  const place=CITIES.find(c=>c.key===value);
  beginSearch((search?.product||"Small businesses")+" in "+place.name,true);
 };
 const spacing=mapWidth<480?76:145;
 const offsets=[{x:-spacing,y:-8},{x:0,y:-55},{x:spacing,y:-8}];
 const zoom=phase==="locating"?1.085:supplier?1.035:1.015;
 const hasResults=search&&phase!=="locating";
 const initial=supplier?(supplier.kind==="small"?"I have Rs. 800. Is "+supplier.name+" available for investment? What does it make?":"Need 200 units of "+supplier.product+". Can we negotiate a bulk rate?"):"";
 const offer=supplier?(supplier.live?replyToShop("investment available and id",supplier,budget,search.cityName):supplier.kind==="small"?
  supplier.name+" makes "+supplier.product+". "+supplier.needs+" The example product price is "+money(supplier.retail)+"; bulk from "+money(supplier.bulk)+"/unit. "+(supplier.minimum<=800?"A Rs. 800 budget fits the example entry of "+money(supplier.minimum)+".":"Its example investment entry is "+money(supplier.minimum)+"; Rs. 800 does not meet it. You could ask about a smaller ticket.")+" Shall we check stock, a sample, the funding use or a paid kitchen helper?":
  "Let’s work with your quantity. Retail is "+money(supplier.retail)+"/unit; the example bulk offer is "+money(supplier.bulk)+"/unit for 200 units ("+money(supplier.bulk*200)+"). Delivery and stock need confirmation. Investment entry is separate, from "+money(supplier.minimum)+". Would you like a trial order or the business pitch?"):"";
 return <div className="wms-showcase" ref={sectionRef} data-visible={visible} data-phase={phase} data-mode={interactive?"interactive":"demo"}>
 <style>{styles+extendedStyles}</style>
 <div className="wms-layout"><div className="wms-left">
 <div className="wms-toolbar"><div><p className="wms-eyebrow">LOCAL BUSINESS & WHOLESALE RADAR</p><h3 className="wms-map-title">Small shops. Bigger possibilities.</h3></div><div className="wms-demo-controls"><span className="wms-demo-label">{live.length?"Listing preview":"Interactive demo"}</span><button type="button" className="wms-toggle" onClick={toggleDemo} aria-label={paused||interactive?"Resume wholesale demo":"Pause wholesale demo"} title={paused||interactive?"Resume demo":"Pause demo"}>{paused||interactive?"▶":"Ⅱ"}</button></div></div>
 <form className="wms-search" onSubmit={e=>{e.preventDefault();beginSearch(draft,true)}}>
 <label className="wms-search-field"><span aria-hidden="true">⌕</span><input className="wms-input" value={draft} maxLength={160} onChange={e=>{setDraft(e.target.value);setInteractive(true);setManualRun(false)}} onFocus={()=>{setInteractive(true);setManualRun(false)}} placeholder="Strawberries, home kitchen, candies or wholesale…" aria-label="Search product and city"/></label><button className="wms-locate" type="submit" disabled={!draft.trim()}>{phase==="locating"?"Locating…":"Locate"}</button></form>
 <div className="wms-filters"><label>Product price<select aria-label="Maximum product price" value={unitCap} onChange={e=>filterChange(setUnitCap,e.target.value)}><option value="all">Any unit price</option>{[100,250,500,1000].map(n=><option key={n} value={n}>Up to {money(n)}/unit</option>)}</select></label>
 <label>City<select aria-label="Select city" value={cityChoice} onChange={e=>changeCity(e.target.value)}>{CITIES.map(c=><option key={c.key} value={c.key}>{c.name}</option>)}</select></label>
 <label>Investment budget<select aria-label="Maximum investment entry" value={budget} onChange={e=>filterChange(setBudget,e.target.value)}><option value="all">Any entry amount</option>{[500,800,1500,2500,10000].map(n=><option key={n} value={n}>Up to {money(n)}</option>)}</select></label>
 <label>Business type<select aria-label="Business type" value={kind} onChange={e=>{const value=e.target.value;setKind(value);beginSearch((value==="wholesale"?"Mobile Accessories":"Small businesses")+" in "+city.name,true)}}><option value="all">All businesses</option><option value="small">Small & home businesses</option><option value="wholesale">Wholesale</option></select></label>
 </div>
 <div className={"wms-map-stage"+(supplier?" has-deal":"")} ref={mapRef}>
 <div className="wms-world" style={{"--wms-pan-x":(350-city.x)*zoom+"px","--wms-pan-y":(210-city.y)*zoom+"px","--wms-zoom":zoom}}>
 <CityMap id={"wms-map-"+instanceId} city={city}/><span className="wms-radar" style={{left:city.x,top:city.y}} aria-hidden="true"><i/><i/><i/></span>
 {hasResults&&results.map((b,i)=><button type="button" key={search.id+b.id} className={"wms-pin wms-pin-"+i+(selected===b.id?" is-selected":"")} style={{left:city.x+offsets[i%3].x,top:city.y+offsets[i%3].y,"--wms-pin-order":i}} onClick={()=>openSupplier(b)} aria-label={b.name+", "+b.category} aria-pressed={selected===b.id}><span className="wms-pin-ring"/><span className="wms-shop-icon" aria-hidden="true">{b.icon}</span><span className="wms-pin-label"><strong>{b.name}</strong><span className="wms-pin-meta">{b.minimum?money(b.minimum)+" entry":b.live?"Registered pitch":"Ask for terms"}</span></span></button>)}
 </div>
 <div className="wms-map-corner">{phase==="locating"?"Finding local businesses…":(search?.cityName||"Pakistan")+" · "+(interactive?"Your selection":"Auto city tour")}</div>
 {!interactive&&hasResults&&results[0]&&<span className="wms-demo-cursor" aria-hidden="true" style={{left:"calc(50% - "+(spacing*zoom)+"px)",top:supplier?"23%":"46%"}}><svg width="22" height="28" viewBox="0 0 22 28" fill="none"><path d="M2 2v21l6-6 5 9 4-2-5-9h8L2 2Z" fill="#0F172A" stroke="white" strokeWidth="2"/></svg><span>Demo assistant</span></span>}
 {supplier&&<aside className="wms-deal" key={search.id+supplier.id} aria-label={"AI deal preview for "+supplier.name}>
 <div className="wms-deal-header"><div className="wms-deal-agent"><span className="wms-agent-mark"><AgentMark/></span><div><span className="wms-agent-status">AI BUSINESS GUIDE · SIMULATED</span><span className="wms-deal-supplier">{supplier.icon} {supplier.name}</span></div></div><button className="wms-close" type="button" aria-label="Close deal preview" onClick={()=>{setSelected(null);setPhase("results");setManualRun(false);setInteractive(true);setPendingReply(null)}}>×</button></div>
 <div className="wms-business-facts"><span>{supplier.live?"Pitch ID: ":"Demo ID: "}{supplier.id}</span><span>{supplier.open===null?"Availability unconfirmed":supplier.open?"Open for enquiries":"Investment not available"}</span></div>
 <div className="wms-deal-scroll" ref={chatRef}><p className="wms-buyer">{initial}</p>
 {phase==="negotiating"&&<div className="wms-typing" role="status" aria-label="AI guide typing"><i/><i/><i/></div>}
 {(phase==="offer"||phase==="closed")&&<p className="wms-offer">{offer}</p>}
 {messages.map((m,i)=><p key={i} className={m.role==="buyer"?"wms-buyer":"wms-offer"}>{m.text}</p>)}
 {pendingReply&&<div className="wms-typing" role="status" aria-label="AI guide typing"><i/><i/><i/></div>}
 </div>
 {(phase==="offer"||phase==="closed")&&<div className="wms-quick">{["Rs. 800 investment?","Best price for 20 units?","Investor pitch ID?","Find a kitchen helper?"].map(q=><button key={q} type="button" disabled={!!pendingReply} onClick={()=>submitQuestion(q)}>{q}</button>)}</div>}
 <form className="wms-chat-form" onSubmit={e=>{e.preventDefault();submitQuestion(question)}}><input aria-label="Ask business guide" value={question} onFocus={()=>{setInteractive(true);setManualRun(false);setPhase("closed")}} onChange={e=>setQuestion(e.target.value)} placeholder="Ask about price, investment or helpers…" maxLength={500}/><button type="submit" disabled={!question.trim()||!!pendingReply} aria-label="Send question">↑</button></form>
 </aside>}
 </div>
 <div className="wms-map-footer"><p className="wms-result-note" role="status">{phase==="locating"?"Locating businesses…":hasResults?results.length+" "+(live.length?"registered":"illustrative")+" businesses · "+search.cityName:"Explore small shops and wholesale businesses across Pakistan."}</p>
 {hasResults&&results.length===0&&<p className="wms-empty">No matches for these filters. Increase the budget or choose another business type.{live.length?" Minimum tickets must be confirmed with the entrepreneur.":""}</p>}
 <div className="wms-shop-list">{hasResults&&results.map(b=><button className={selected===b.id?"is-active":""} type="button" key={b.id} onClick={()=>openSupplier(b)}><span className="wms-list-icon">{b.icon}</span><span><strong>{b.name}</strong><small>{b.category}</small></span><span className="wms-list-price">{b.bulk?money(b.bulk)+"/unit":"Price on enquiry"}<small>{b.minimum?"Invest from "+money(b.minimum):"Investment terms on enquiry"}</small></span></button>)}</div>
 <div className="wms-network"><i/>Demo prices and availability. No payment, seller contact or hiring is performed.</div></div>
 </div>
 <div className="wms-editorial"><h2><span data-reveal>Source on the map</span><span data-reveal>— message, then deal</span></h2><p className="wms-description">From a strawberry stall to a home kitchen or wholesale hub. Explore products, compare entry budgets and ask your AI guide what to check before an order or investment.</p>
 <div className="wms-editorial-note"><span>🍓 🍲 🍬</span><strong>Local ambition. A place on the map.</strong><p>Ask “Can I start with Rs. 800?” Compare prices, request a pitch ID or plan a paid kitchen-helper enquiry.</p></div>
 <div className="wms-robo-wrap"><SalespersonRobot id={"wms-robo-"+instanceId}/></div><div className="wms-cta-wrap">{startLink}</div></div>
 </div></div>;
}
