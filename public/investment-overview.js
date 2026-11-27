const periods = [
  // Startup capital, small-business capital (PKR millions), funded startups,
  // funded small businesses, listed businesses, investors, recipients, profit (PKR thousands).
  [1.2, .8, 4, 6, 18, 24, 8, 48],
  [1.8, 1.1, 6, 8, 23, 33, 13, 82],
  [2.5, 1.6, 8, 11, 29, 46, 19, 135],
  [3.1, 2.2, 10, 15, 36, 58, 28, 212],
  [4.4, 2.9, 14, 19, 45, 76, 39, 318],
  [5.6, 3.8, 18, 24, 54, 94, 51, 460]
];
const opportunities = ['Invest in small businesses', 'List your ideas', 'Grow wealth as a student', 'Analyze startups', 'Join small businesses for investment experience'];
const css = `
:host{display:block;width:100%;max-width:490px;margin:auto;font:14px/1.4 Inter,system-ui,sans-serif;color:#F8FAFC}
*{box-sizing:border-box}article{background:radial-gradient(ellipse at 20% 20%,#5A321F,transparent 65%),#0F172A;border:1px solid #E67E2245;border-radius:24px;padding:clamp(16px,3vw,25px);box-shadow:0 14px 40px #E67E2224}
header,footer,.row,.legend div{display:flex;align-items:center;justify-content:space-between;gap:8px}
small{color:#CBD5E1;font-size:11px}h3{font-size:23px;letter-spacing:-.045em;margin:0}button{cursor:pointer;color:#FFF7ED;background:#422B20;border:1px solid #92552B;border-radius:8px;padding:6px 9px;font:inherit;font-size:12px}button:focus-visible{outline:2px solid white}
.visual{display:grid;grid-template-columns:minmax(115px,1fr) 1fr;align-items:center;gap:14px;margin:12px 0}
.dial{position:relative;display:grid;place-items:center}.dial svg{width:100%;height:auto;display:block}.center{position:absolute;text-align:center}.center b{font-size:clamp(22px,3vw,31px);display:block;letter-spacing:-.06em}
circle{fill:none}.arc{stroke:#E67E22;stroke-width:11;transition:stroke-dasharray .9s ease}.orbit{transform-origin:center;animation:spin 14s linear infinite;stroke:#F39C12;stroke-width:1;stroke-dasharray:12 28;opacity:.65}@keyframes spin{to{transform:rotate(360deg)}}
.legend div{display:block;margin:9px 0;padding-left:9px;border-left:3px solid #E67E22}.legend div+div{border-color:#F8C990}.legend b{display:block;font-size:17px}.metrics{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#334155;border-radius:12px;overflow:hidden}.metric{background:#182335;padding:9px 12px}.metric b{font-size:16px;display:block}
.trend{display:flex;height:31px;align-items:end;gap:5px;margin:7px 0}.bar{flex:1;border:0;border-radius:3px;padding:0;background:#4B5563}.bar[aria-pressed=true]{background:#E67E22;box-shadow:0 0 9px #E67E2277}
footer{border-top:1px solid #334155;margin-top:12px;padding-top:12px}footer strong{font-size:13px}footer button{min-width:32px}
@media(prefers-reduced-motion:reduce){.orbit{animation:none}.arc{transition:none}}
`;
class InvestmentOverview extends HTMLElement {
  connectedCallback() {
    if (!this.shadowRoot) this.attachShadow({mode:'open'});
    this.month = 4;
    this.step = 0;
    this.playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.shadowRoot.innerHTML = `<style>${css}</style><article aria-label="Investment overview"><header><div><small>Illustrative data · PKR</small><h3>Investment overview</h3></div><button id="play"></button></header>
    <div class="visual"><div class="dial"><svg viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="73" class="orbit"/><circle cx="80" cy="80" r="61" stroke="#F8C990" stroke-width="11"/><circle cx="80" cy="80" r="61" pathLength="100" transform="rotate(-90 80 80)" class="arc"/></svg><div class="center"><small>Total invested</small><b id="total"></b></div></div><div class="legend"><div><small>Startups</small><b id="startup"></b><small id="sc"></small></div><div><small>Small businesses</small><b id="business"></b><small id="bc"></small></div></div></div>
    <div class="metrics">${['Investors','Businesses listed','Profit distributed','Profit recipients'].map((label,i)=>`<div class="metric"><small>${label}</small><b id="m${i}"></b></div>`).join('')}</div>
    <div style="margin-top:12px" class="row"><strong id="month"></strong><small id="gain"></small></div><div class="trend" aria-label="Invested capital by month">${periods.map((p,i)=>`<button class="bar" style="height:${(p[0]+p[1])/9.4*100}%" aria-label="Select month ${i+1}" title="Month ${i+1} · PKR ${(p[0]+p[1]).toFixed(1)}M"></button>`).join('')}</div><small id="comparison"></small>
    <footer><strong id="opportunity"></strong><button id="next" aria-label="Next opportunity">→</button></footer></article>`;
    this.el = id => this.shadowRoot.getElementById(id);
    this.bars = [...this.shadowRoot.querySelectorAll('.bar')];
    this.bars.forEach((bar,i)=>bar.onclick=()=>{this.month=i;this.playing=false;this.render();});
    this.el('play').onclick=()=>{this.playing=!this.playing;this.render();};
    this.el('next').onclick=()=>{this.step=(this.step+1)%opportunities.length;this.render();};
    this.render();
    this.timer=setInterval(()=>{if(this.playing && !document.hidden){this.month=(this.month+1)%periods.length;this.step=(this.step+1)%opportunities.length;this.render();}},5000);
  }
  disconnectedCallback(){clearInterval(this.timer);}
  render(){
    const p=periods[this.month], prev=periods[this.month-1], total=p[0]+p[1];
    const money=n=>'PKR '+n.toFixed(1)+'M';
    const values={total:total.toFixed(1)+'M',startup:money(p[0]),business:money(p[1]),sc:p[2]+' startups funded',bc:p[3]+' businesses funded',m0:p[5],m1:p[4],m2:'PKR '+p[7]+'K',m3:p[6],month:'Month '+(this.month+1),gain:prev?'+'+Math.round((total/(prev[0]+prev[1])-1)*100)+'% capital growth':'Opening month',comparison:prev?'Previously '+money(prev[0]+prev[1])+' · '+prev[2]+' → '+p[2]+' startups funded':'First recorded period',opportunity:opportunities[this.step],play:this.playing?'Pause':'Play'};
    for(const [key,value] of Object.entries(values)) this.el(key).textContent=value;
    this.shadowRoot.querySelector('.arc').setAttribute('stroke-dasharray', (100*p[0]/total)+' 100');
    this.shadowRoot.querySelector('.orbit').style.animationPlayState=this.playing?'running':'paused';
    this.bars.forEach((bar,i)=>bar.setAttribute('aria-pressed',String(i===this.month)));
  }
}
customElements.define('investment-overview',InvestmentOverview);

