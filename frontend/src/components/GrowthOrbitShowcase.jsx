import React from "react";

const FRAME_SIZE = 380;
const ORBIT_RADIUS = 155;
const MICRO_METRICS = [
  "Unified business profile \u2022 One workspace",
  "Category-aware guidance \u2022 Weekly growth insights",
  "Verified investors \u2022 Protected escrow workflows",
  "Verified Bulk Suppliers \u2022 AI Price Negotiation",
  "Peer strategies \u2022 Community visibility",
];

export function CircularOrbit({ steps, activeIndex, onSelectStep, totalMembers }) {
  const fitRef = React.useRef(null);

  React.useLayoutEffect(() => {
    const fit = fitRef.current;
    const resize = () => {
      fit.style.setProperty("--pgo-scale", String(Math.min(1, fit.getBoundingClientRect().width / FRAME_SIZE)));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(fit);
    return () => observer.disconnect();
  }, []);

  return <div
    className="pgo-orbit-fit"
    ref={fitRef}
    style={{ "--pgo-frame": FRAME_SIZE + "px", "--pgo-radius": ORBIT_RADIUS + "px" }}
  >
    <div className="pgo-orbit">
      <div className="pgo-solar-aura" aria-hidden="true" />
      <div className="pgo-solar-rays" aria-hidden="true" />
      <svg className="pgo-rings" width={FRAME_SIZE} height={FRAME_SIZE} viewBox="0 0 380 380" fill="none" aria-hidden="true">
        <circle cx="190" cy="190" r={ORBIT_RADIUS} stroke="rgba(230, 126, 34, 0.25)" strokeWidth="1.3" />
        <circle cx="190" cy="190" r="168" stroke="rgba(230, 126, 34, 0.16)" strokeWidth=".85" strokeDasharray="2 6" />
      </svg>
      <div className="pgo-rotor">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const angle = index * (360 / steps.length);
          return <span
            key={step.title}
            className="pgo-anchor"
            style={{ "--pgo-angle": angle + "deg" }}
            data-angle={angle}
          >
            <span className="pgo-upright">
              <button
                type="button"
                className={"pgo-node" + (index === activeIndex ? " is-active" : "")}
                onClick={() => onSelectStep(index)}
                aria-label={(index + 1) + ". " + step.title.split(" ")[0]}
                title={step.title}
                aria-pressed={index === activeIndex}
              >
                <span className="pgo-face"><Icon className="pgo-node-icon" strokeWidth={1.7} /></span>
              </button>
            </span>
          </span>;
        })}
      </div>
      <div className="pgo-hub" role="status" aria-label="Live platform members">
        <span className="pgo-member-count">{totalMembers}</span>
        <span className="pgo-member-label">LIVE MEMBERS</span>
        <span className="pgo-member-sync">Syncing live</span>
      </div>
    </div>
  </div>;
}

const styles = `
#how:has(.pgo-showcase) { scroll-margin-top:100px; }
.pgo-showcase { --pgo-orange:#E67E22; width:100%; color:#0F172A; font-family:Inter,system-ui,sans-serif; }
.pgo-showcase *, .pgo-showcase *::before, .pgo-showcase *::after { box-sizing:border-box; }
.pgo-heading { max-width:790px; margin:2px auto 30px; text-align:center; }
.pgo-heading h2 { margin:0; color:#0F172A; font-family:Outfit,Inter,system-ui,sans-serif; font-size:clamp(28px,3.25vw,40px); font-weight:600; letter-spacing:-.045em; line-height:1.15; text-wrap:balance; }
.pgo-heading p { max-width:650px; margin:14px auto 0; color:#64748B; font-size:13px; line-height:1.8; }
.pgo-content { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); align-items:center; gap:clamp(24px,4vw,60px); }
.pgo-left { min-width:0; }
.pgo-card { position:relative; overflow:hidden; min-height:326px; border:1px solid #E2E8F0; border-radius:23px; background:linear-gradient(135deg,rgba(255,255,255,.96),rgba(255,251,245,.78)); box-shadow:0 12px 36px #273b3010,0 2px 7px #273b3004; backdrop-filter:blur(16px); }
.pgo-stage-progress { position:absolute; top:0; right:0; left:0; height:3px; background:#fff4e8; }
.pgo-stage-progress span { display:block; width:100%; height:100%; transform:scaleX(var(--pgo-progress)); transform-origin:left center; background:linear-gradient(90deg,#F2B56F,#E67E22); box-shadow:0 0 12px #E67E222b; transition:transform 650ms cubic-bezier(.2,.65,.3,1); }
.pgo-stage-body { padding:27px 28px 29px; }
.pgo-topline { display:flex; align-items:center; justify-content:space-between; gap:15px; margin-bottom:20px; }
.pgo-stage-icon { display:grid; place-items:center; width:45px; height:45px; border:1px solid #E67E2226; border-radius:13px; color:#E67E22; background:linear-gradient(135deg,#fff,#FFF3E4); box-shadow:0 5px 15px #E67E220c; }
.pgo-stage-icon svg { width:24px; height:24px; }
.pgo-step-pill { display:inline-flex; align-items:center; min-height:25px; padding:5px 9px; border:1px solid #E67E2225; border-radius:6px; color:#B06222; background:#FFF8EF; font-size:9px; font-weight:550; letter-spacing:.1em; line-height:1.4; font-variant-numeric:tabular-nums; }
.pgo-card h3 { margin:0 0 12px; color:#0F172A; font-family:Outfit,Inter,system-ui,sans-serif; font-size:27px; font-weight:600; letter-spacing:-.035em; line-height:1.2; }
.pgo-description { min-height:47px; margin:0 0 16px; color:#526275; font-size:13px; line-height:1.85; }
.pgo-metric { display:inline-flex; align-items:flex-start; gap:7px; max-width:100%; margin:0 0 22px; padding:7px 10px; border:1px solid #E67E221f; border-radius:8px; color:#9B622E; background:#FFF8EF; font-size:10px; line-height:1.7; }
.pgo-metric svg { flex-shrink:0; width:13px; height:13px; margin-top:2px; }
.pgo-action-shell { display:flex; width:fit-content; max-width:100%; }
.pgo-cta { position:relative; display:inline-flex; align-items:center; justify-content:center; gap:9px; min-height:41px; overflow:hidden; padding:10px 18px; border:1px solid #142132; border-radius:11px; color:#FFFFFF; background:#0F172A; box-shadow:0 4px 10px #0f172a12; font-size:12px; font-weight:500; text-decoration:none; transform:translate3d(var(--pgo-magnet-x,0px),var(--pgo-magnet-y,0px),0); transition:transform 200ms ease-out,box-shadow .25s; }
.pgo-cta svg { width:15px; height:15px; }
.pgo-cta::after { content:''; position:absolute; inset:-60% -50%; pointer-events:none; background:linear-gradient(110deg,transparent 36%,#fff2 50%,transparent 64%); transform:translateX(-80%); transition:transform .8s cubic-bezier(.2,.6,.3,1); }
.pgo-cta:hover { box-shadow:0 7px 18px #E67E2220; }
.pgo-cta:hover::after, .pgo-cta:focus-visible::after { transform:translateX(80%); }
.pgo-stage-icon, .pgo-step-pill, .pgo-card h3, .pgo-description, .pgo-metric, .pgo-action-shell { animation:pgo-text-in .46s cubic-bezier(.2,.65,.3,1) both; }
.pgo-stage-icon { animation-delay:30ms; }
.pgo-step-pill { animation-delay:85ms; }
.pgo-card h3 { animation-delay:140ms; }
.pgo-description { animation-delay:205ms; }
.pgo-metric { animation-delay:275ms; }
.pgo-action-shell { animation-delay:345ms; }
.pgo-selector { display:flex; flex-wrap:wrap; gap:7px; margin-top:17px; }
.pgo-selector button { min-height:32px; padding:6px 10px; border:1px solid #E2E8F0; border-radius:999px; color:#64748B; background:#fff; font:500 10px/1.4 Inter,system-ui,sans-serif; cursor:pointer; transition:background .2s,color .2s,border-color .2s,box-shadow .2s; }
.pgo-selector button:hover { color:#AA5F22; border-color:#E6BD96; }
.pgo-selector button[aria-pressed=true] { color:#fff; border-color:#E67E22; background:#E67E22; box-shadow:0 3px 10px #E67E2223; }
.pgo-cta:focus-visible, .pgo-selector button:focus-visible { outline:2px solid #E67E22; outline-offset:3px; }
.pgo-right { display:flex; align-items:center; justify-content:center; min-width:0; padding:24px 12px; overflow:clip; }
.pgo-orbit-fit { position:relative; width:var(--pgo-frame); max-width:100%; aspect-ratio:1; }
.pgo-orbit { --pgo-period:40s; position:absolute; top:0; left:0; width:var(--pgo-frame); height:var(--pgo-frame); overflow:clip; overflow-clip-margin:35px; transform:scale(var(--pgo-scale,1)); transform-origin:0 0; isolation:isolate; }
.pgo-rings { position:absolute; z-index:1; inset:0; pointer-events:none; }
.pgo-solar-aura { position:absolute; z-index:0; top:50%; left:50%; width:310px; height:310px; pointer-events:none; border-radius:50%; background:radial-gradient(circle,rgba(245,158,11,.35),rgba(230,126,34,.15) 42%,transparent 73%); filter:blur(15px); animation:pgo-solar-pulse 4s ease-in-out infinite alternate; }
.pgo-solar-rays { position:absolute; z-index:0; inset:60px; border-radius:50%; pointer-events:none; opacity:.48; background:repeating-conic-gradient(from 0deg,rgba(245,158,11,.2) 0deg 1deg,transparent 1deg 18deg); mask-image:radial-gradient(circle,transparent 32%,#000 44%,transparent 67%); animation:pgo-spin 90s linear infinite; }
.pgo-rotor { position:absolute; z-index:3; top:50%; left:50%; width:0; height:0; transform-origin:0 0; animation:pgo-spin var(--pgo-period) linear infinite; will-change:transform; }
.pgo-anchor { position:absolute; top:0; left:0; width:0; height:0; transform:rotate(var(--pgo-angle)) translateX(var(--pgo-radius)) rotate(calc(-1 * var(--pgo-angle))); }
.pgo-upright { position:absolute; top:0; left:0; width:0; height:0; transform-origin:0 0; animation:pgo-counterspin var(--pgo-period) linear infinite; will-change:transform; }
.pgo-node { position:absolute; top:-29px; left:-29px; display:block; width:58px; height:58px; margin:0; padding:0; border:0; border-radius:50%; background:transparent; cursor:pointer; }
.pgo-face { display:grid; place-items:center; width:58px; height:58px; border:1px solid #E2E8F0; border-radius:50%; color:#64748B; background:#fff; box-shadow:0 4px 16px #33415509; transform:scale(1); transition:transform .4s cubic-bezier(.2,.65,.3,1),border-color .3s,color .3s,box-shadow .3s; }
.pgo-node-icon { width:25px; height:25px; }
.pgo-node:hover .pgo-face { border-color:#E7BB92; color:#BC6A28; }
.pgo-node.is-active .pgo-face { border:2px solid #E67E22; color:#E67E22; background:#FFFFFF; transform:scale(1.18); box-shadow:0 10px 28px rgba(230,126,34,.16),0 0 0 5px rgba(230,126,34,.05); }
.pgo-node:focus-visible { outline:2px solid #E67E22; outline-offset:8px; }
.pgo-hub { position:absolute; z-index:2; top:50%; left:50%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7px; width:130px; height:130px; transform:translate(-50%,-50%); border:1px solid #F0E7DA; border-radius:50%; background:#FFFFFF; box-shadow:0 12px 32px #C7862E16,0 2px 5px #D59B3520; }
.pgo-member-count { color:#0F172A; font-family:Outfit,Inter,system-ui,sans-serif; font-size:32px; font-weight:550; font-variant-numeric:tabular-nums; line-height:1; letter-spacing:-.035em; }
.pgo-member-label { color:#64748B; font-size:calc(9.5px / var(--pgo-scale,1)); font-weight:500; letter-spacing:.12em; }
.pgo-member-sync { display:flex; align-items:center; gap:4px; color:#C27D29; font-size:calc(9px / var(--pgo-scale,1)); }
.pgo-member-sync::before { content:''; width:3px; height:3px; border-radius:50%; background:#E9A349; }
@keyframes pgo-spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
@keyframes pgo-counterspin { from { transform:rotate(0deg); } to { transform:rotate(-360deg); } }
@keyframes pgo-solar-pulse { from { transform:translate(-50%,-50%) scale(.97); opacity:.8; } to { transform:translate(-50%,-50%) scale(1.06); opacity:1; } }
@keyframes pgo-text-in { from { opacity:0; filter:blur(4px); transform:translateY(14px); } to { opacity:1; filter:blur(0); transform:translateY(0); } }
@media(max-width:900px) { .pgo-content { grid-template-columns:minmax(0,1fr); gap:22px; } .pgo-heading { margin-bottom:25px; } .pgo-left { max-width:600px; width:100%; margin:auto; } .pgo-right { padding:4px 0; } }
@media(max-width:480px) { .pgo-card { border-radius:18px; } .pgo-stage-body { padding:23px 20px; } .pgo-card h3 { font-size:25px; } .pgo-description { font-size:12px; } .pgo-heading p { font-size:12px; } .pgo-selector { gap:6px; } .pgo-selector button { font-size:9px; padding:6px 9px; } }
@media(prefers-reduced-motion:reduce) { .pgo-showcase *, .pgo-showcase *::before, .pgo-showcase *::after { animation:none!important; transition:none!important; } .pgo-cta { transform:none!important; } }
`;

export default function GrowthOrbitShowcase({ steps, activeIndex, onSelectStep, orbit, startLink }) {
  const actionRef = React.useRef(null);
  const active = steps[activeIndex];
  const Icon = active.icon;

  const moveAction = event => {
    if (event.pointerType === "touch") return;
    const rect = actionRef.current.getBoundingClientRect();
    const x = Math.max(-5, Math.min(5, (event.clientX - rect.left - rect.width / 2) * 0.1));
    const y = Math.max(-4, Math.min(4, (event.clientY - rect.top - rect.height / 2) * 0.12));
    actionRef.current.style.setProperty("--pgo-magnet-x", x + "px");
    actionRef.current.style.setProperty("--pgo-magnet-y", y + "px");
  };

  const resetAction = () => {
    actionRef.current.style.setProperty("--pgo-magnet-x", "0px");
    actionRef.current.style.setProperty("--pgo-magnet-y", "0px");
  };

  return <div className="pgo-showcase" data-active-step={activeIndex}>
    <style>{styles}</style>
    <div className="pgo-heading">
      <h2>Rank, Match, and Scale Your Business in One Continuous Orbit</h2>
      <p>Every system feeds the next automatically. Complete our interactive steps to compile reputation scores, trigger industry advisory, and connect directly to capital.</p>
    </div>
    <div className="pgo-content">
      <div className="pgo-left">
        <div className="pgo-card" style={{ "--pgo-progress": (activeIndex + 1) / steps.length }}>
          <div className="pgo-stage-progress" aria-hidden="true"><span /></div>
          <div className="pgo-stage-body" key={activeIndex}>
            <div className="pgo-topline">
              <span className="pgo-stage-icon" aria-hidden="true"><Icon strokeWidth={1.8} /></span>
              <span className="pgo-step-pill">STEP {String(activeIndex + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}</span>
            </div>
            <h3>{active.title}</h3>
            <p className="pgo-description">{active.body}</p>
            <div className="pgo-metric">
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3 8 3 3 7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span>{MICRO_METRICS[activeIndex]}</span>
            </div>
            <div className="pgo-action-shell" ref={actionRef} onPointerMove={moveAction} onPointerLeave={resetAction}>{startLink}</div>
          </div>
        </div>
        <div className="pgo-selector" role="group" aria-label="Explore the business growth steps">
          {steps.map((step, index) => <button
            type="button"
            key={step.title}
            onClick={() => onSelectStep(index)}
            aria-pressed={index === activeIndex}
          >{index + 1}. {step.title.split(" ")[0]}</button>)}
        </div>
      </div>
      <div className="pgo-right">{orbit}</div>
    </div>
  </div>;
}
