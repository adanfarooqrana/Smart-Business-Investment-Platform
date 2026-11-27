const examples = [
  {
    key: 'demo-saffron',
    name: 'Saffron Kitchen',
    amount: 48500,
    idea: 'Neighbourhood kitchens cook pre-ordered lunches for nearby offices.',
    product: 'Weekly lunch boxes with a rotating seasonal menu.'
  },
  {
    key: 'demo-orbit',
    name: 'Orbit Tutors',
    amount: 42000,
    idea: 'Match students with tutors who teach their board syllabus.',
    product: 'Small-group online lessons and timed practice quizzes.'
  },
  {
    key: 'demo-neem',
    name: 'Neem Naturals',
    amount: 36500,
    idea: 'Make refillable personal care affordable for neighbourhood shops.',
    product: 'Neem soap bars and returnable refill packs.'
  },
  {
    key: 'demo-thread',
    name: 'Thread Studio',
    amount: 29000,
    idea: 'Help local tailors sell small collections without holding excess stock.',
    product: 'Made-to-order clothing with digital size cards.'
  },
  {
    key: 'demo-solar',
    name: 'Solar Cart',
    amount: 21500,
    idea: 'Give street vendors portable power for evening trade.',
    product: 'A solar canopy with lighting and a rechargeable battery.'
  }
];

const format = new Intl.NumberFormat('en-PK');

function extractStartupRows(data) {
  if (!data || typeof data !== 'object') return [];

  return Object.entries(data)
    .filter(([, record]) => record && typeof record === 'object')
    .map(([key, record]) => {
      const profile = record.profile?.roleDetails || record.profile || {};
      return {
        key,
        name: String(record.name ?? record.startupName ?? profile.startupName ?? '').trim(),
        amount: Number(record.amount ?? record.totalFundingRaised ?? record.stats?.totalFundingRaised),
        idea: String(record.idea ?? record.ideaDescription ?? profile.pitchSummary ?? '').trim(),
        product: String(record.product ?? record.productDescription ?? record.productType ?? '').trim()
      };
    })
    .filter(row => row.name && Number.isFinite(row.amount) && row.amount > 0 && row.amount <= 50000)
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name) || a.key.localeCompare(b.key))
    .slice(0, 5);
}

class StartupFundingChart extends HTMLElement {
  connectedCallback() {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.playing ??= !matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.inView = false;
    this.hovered = false;
    this.draw([], true);
    this.observer = new IntersectionObserver(([entry]) => {
      this.inView = entry.isIntersecting;
    }, { threshold: 0.15 });
    this.observer.observe(this);
    this.start();
  }

  set subscribe(reader) {
    this.reader = reader;
    this.start();
  }

  start() {
    this.stop?.();
    this.stop = null;
    if (!this.reader || !this.isConnected || !this.shadowRoot) return;
    this.stop = this.reader(data => {
      const rows = extractStartupRows(data);
      this.draw(rows, rows.length === 0);
    });
  }

  disconnectedCallback() {
    clearTimeout(this.headingTimer);
    clearInterval(this.typing);
    clearInterval(this.cycleTimer);
    this.glowAnimations?.forEach(animation => animation.cancel());
    this.observer?.disconnect();
    this.stop?.();
    this.stop = null;
  }

  startAutoScroll() {
    clearInterval(this.cycleTimer);
    const control = this.shadowRoot.querySelector('.play-toggle');
    control.innerHTML = this.playing ? '&#10074;&#10074;' : '&#9654;';
    const label = this.playing ? 'Pause automatic startup scrolling' : 'Play automatic startup scrolling';
    control.setAttribute('aria-label', label);
    control.title = label;
    if (!this.playing || this.rows.length < 2) return;

    this.cycleTimer = setInterval(() => {
      if (document.hidden || !this.inView || this.hovered) return;
      if (this.shadowRoot.querySelector('.line:focus-visible')) return;
      const currentIndex = this.rows.findIndex(row => row.key === this.selected);
      this.select(this.rows[(currentIndex + 1) % this.rows.length], true);
    }, 5000);
  }

  select(row, animate) {
    this.selected = row.key;
    const root = this.shadowRoot;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let selectedButton;
    for (const button of root.querySelectorAll('.line')) {
      const selected = button.dataset.key === row.key;
      button.setAttribute('aria-pressed', String(selected));
      if (selected) selectedButton = button;
    }

    const list = root.querySelector('.startup-list');
    const top = selectedButton.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
    list.scrollTo({
      top: Math.max(0, top - (list.clientHeight - selectedButton.offsetHeight) / 2),
      behavior: animate && !reduceMotion ? 'smooth' : 'instant'
    });

    root.querySelector('h3').textContent = row.name;
    const values = [
      row.idea || 'Idea details have not been published yet.',
      row.product || 'Product details have not been published yet.'
    ];
    const outputs = [...root.querySelectorAll('.detailGrid p')];
    clearInterval(this.typing);
    let count = animate && !reduceMotion ? 0 : Infinity;
    const paint = () => outputs.forEach((element, index) => {
      element.textContent = values[index].slice(0, count);
    });
    paint();
    if (Number.isFinite(count)) {
      const lettersPerTick = Math.max(3, Math.ceil(Math.max(values[0].length, values[1].length) / 65));
      this.typing = setInterval(() => {
        count += lettersPerTick;
        paint();
        if (values.every(text => text.length <= count)) clearInterval(this.typing);
      }, 24);
    }

    this.glowAnimations?.forEach(animation => animation.cancel());
    if (animate && !reduceMotion) {
      const timing = { duration: 1300, easing: 'ease-out' };
      this.glowAnimations = [
        root.querySelector('.funding-glow').animate([
          { opacity: 0 },
          { opacity: 0.9, offset: 0.3 },
          { opacity: 0 }
        ], timing),
        root.querySelector('section').animate([
          { backgroundColor: '#ffffff', boxShadow: '0 0 0 0 #ff981f00' },
          { backgroundColor: '#fff0d9', boxShadow: '0 0 28px 2px #ff981f30', offset: 0.3 },
          { backgroundColor: '#ffffff', boxShadow: '0 0 0 0 #ff981f00' }
        ], timing),
        root.querySelector('.story').animate([
          { backgroundColor: '#ffffff' },
          { backgroundColor: '#fff1dd', offset: 0.3 },
          { backgroundColor: '#ffffff' }
        ], timing)
      ];
    }
  }

  animateHeading() {
    clearTimeout(this.headingTimer);
    const heading = this.shadowRoot.querySelector('.heading-typed');
    const title = 'Our Successful Startups';
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      heading.textContent = title;
      return;
    }
    let length = 0;
    let erasing = false;
    const tick = () => {
      if (document.hidden) {
        this.headingTimer = setTimeout(tick, 300);
        return;
      }
      length += erasing ? -1 : 1;
      heading.textContent = title.slice(0, length);
      let delay = erasing ? 35 : 75;
      if (length === title.length) {
        erasing = true;
        delay = 2200;
      } else if (length === 0) {
        erasing = false;
        delay = 450;
      }
      this.headingTimer = setTimeout(tick, delay);
    };
    heading.textContent = '';
    this.headingTimer = setTimeout(tick, 250);
  }

  draw(rows, preview) {
    this.rows = preview ? examples : rows;
    this.shadowRoot.innerHTML = `<style>

    :host {
      display: block;
      width: 100%;
      max-width: 80rem;
      font-family: Inter, system-ui, sans-serif;
    }
    * { box-sizing: border-box; }
    section {
      padding: clamp(24px, 4vw, 50px);
      color: #172139;
      background: #fff;
      border: 1px solid #e0e6ea;
      border-radius: 32px;
    }
    h2 {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: clamp(10px, 1.6vw, 24px);
      margin: 0 0 30px;
      padding: 0 8px;
      color: #f07800;
      background: transparent;
      font-family: Outfit, Inter, system-ui, sans-serif;
      font-size: clamp(26px, 3.7vw, 50px);
      font-weight: 750;
      letter-spacing: -.045em;
      line-height: 1.18;
      text-align: center;
    }
    .heading-copy {
      position: relative;
      display: grid;
      min-width: 0;
      background: transparent;
      text-shadow: 0 2px 20px #ff9b3433;
    }
    .heading-measure, .heading-typed { grid-area: 1 / 1; }
    .heading-measure { visibility: hidden; }
    .heading-typed { text-align: left; }
    .heading-typed::after {
      content: '';
      display: inline-block;
      height: .82em;
      margin-left: 3px;
      border-right: 2px solid #f07800;
      animation: caret 900ms step-end infinite;
    }
    h2 ::selection { color: #f07800; background: transparent; }
    h2::target-text, .heading-copy::target-text {
      color: #f07800;
      background: transparent;
    }
    h2 i {
      display: inline-block;
      flex-shrink: 0;
      font: normal clamp(22px, 2.6vw, 34px) / 1 system-ui;
      filter: drop-shadow(0 4px 8px #ee9f3333);
      will-change: transform;
    }
    .coin { animation: coinFloat 2.4s ease-in-out infinite; }
    @keyframes caret { 50% { opacity: 0; } }
    @keyframes coinFloat {
      0%, 100% { transform: translate(-3px, 5px) rotate(-14deg); }
      50% { transform: translate(4px, -12px) rotate(18deg) scale(1.08); }
    }

    .plot {
      max-width: 900px;
      margin: auto;
      padding: clamp(16px, 3vw, 32px);
      color: #ecf9f3;
      background: radial-gradient(ellipse at 90% 0, #204945, transparent 65%), #102728;
      border-radius: 22px;
      box-shadow: 0 16px 36px #183b3115;
    }
    header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    header strong { font-size: 17px; }
    small { color: #bbcec9; font-size: 12px; }
    ol { list-style: none; padding: 0; margin: 16px 0; }
    .line, .axis {
      display: grid;
      grid-template-columns: minmax(80px, 1fr) minmax(75px, 2fr) minmax(74px, auto);
      align-items: center;
      gap: 12px;
    }
    .line {
      width: 100%;
      min-height: 45px;
      padding: 9px;
      color: inherit;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 10px;
      font: inherit;
      font-size: 14px;
      text-align: left;
      cursor: pointer;
      transition: background .2s, box-shadow .2s;
    }
    .line:hover, .line:focus-visible { background: #ffffff12; }
    .line:focus-visible { outline: 2px solid #ffbf77; outline-offset: 2px; }
    .line[aria-pressed=true] {
      background: #ffab4820;
      border-color: #ffb45a85;
      box-shadow: 0 0 15px #ffa93a27;
    }
    .name { overflow-wrap: anywhere; font-weight: 600; }
    .amount {
      color: #ffcc8c;
      font-variant-numeric: tabular-nums;
      text-align: right;
    }
    .track {
      position: relative;
      height: 14px;
      background: radial-gradient(circle, #52736e 1px, transparent 1.8px) left center / 7px 5px repeat-x;
    }
    .fill {
      position: absolute;
      inset: 0 auto 0 0;
      width: var(--share);
      background: radial-gradient(circle, #ffac54 1.6px, transparent 2.3px) left center / 7px 6px repeat-x;
      animation: grow 1s ease-out;
      transform-origin: left;
    }
    .fill::after {
      content: '';
      position: absolute;
      right: -4px;
      top: 3px;
      width: 8px;
      height: 8px;
      background: #ffd293;
      border-radius: 50%;
      box-shadow: 0 0 5px #ffc270, 0 0 13px #ff8527;
    }
    @keyframes grow { from { transform: scaleX(0); } }
    .axis { padding: 0 9px; color: #b7ccc6; font-size: 11px; }
    .axis div { display: flex; justify-content: space-between; }
    .story {
      max-width: 900px;
      margin: 14px auto 0;
      padding: clamp(18px, 3vw, 30px);
      background: #fff;
      border: 1px solid #f0d9b9;
      border-radius: 20px;
      box-shadow: 0 8px 22px #9660220b;
    }
    .story h3 {
      margin: 0;
      color: #24352e;
      font: 700 clamp(21px, 3vw, 31px) / 1.2 Georgia, serif;
    }
    .detailGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px; }
    .detailGrid b { color: #a9520c; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; }
    .detailGrid p { margin: 5px 0 0; color: #394840; font-size: 15px; line-height: 1.55; overflow-wrap: anywhere; }

    .plot { position: relative; overflow: hidden; }
    .funding-glow {
      position: absolute;
      inset: 0;
      opacity: 0;
      pointer-events: none;
      background: radial-gradient(ellipse at 50% 50%, #ff9d2770, #ff7b0030);
    }
    .plot header, .startup-list, .axis { position: relative; }
    .chart-actions { display: flex; align-items: center; gap: 12px; }
    .play-toggle {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      color: #ffcc8c;
      background: #ffffff0a;
      border: 1px solid #ffffff2b;
      border-radius: 50%;
      font-size: 11px;
      cursor: pointer;
    }
    .play-toggle:focus-visible { outline: 2px solid #ffbf77; outline-offset: 2px; }
    .startup-list {
      max-height: 184px;
      overflow-y: auto;
      overflow-x: hidden;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      scrollbar-color: #ba864a #ffffff0a;
      padding-right: 6px;
    }
    .startup-list .line { min-height: 58px; }
    .rolling-coin { animation: coinRoll 3s ease-in-out infinite; }
    @keyframes coinRoll {
      0% { transform: translateY(-6px) rotateY(0deg) rotate(-12deg); }
      50% { transform: translateY(10px) rotateY(180deg) rotate(12deg); }
      100% { transform: translateY(-6px) rotateY(360deg) rotate(-12deg); }
    }

    @media (max-width: 560px) {
      section { padding: 24px 14px; border-radius: 26px; }
      h2 { margin-bottom: 24px; }
      .detailGrid { grid-template-columns: 1fr; gap: 10px; }
      .line, .axis { gap: 6px; grid-template-columns: minmax(0, 1fr) minmax(36px, 1.2fr) 68px; }
      .plot { padding: 18px 9px; }
      .line { font-size: 12px; }
      .story { padding: 18px; }
    }
    @media (prefers-reduced-motion: reduce) {
      * { animation: none !important; }
      .heading-typed::after { display: none; }
    }
</style>
<section aria-label="Our Successful Startups">
  <h2 aria-label="Our Successful Startups">
    <i class="coin" aria-hidden="true">&#x1FA99;</i>
    <span class="heading-copy" aria-hidden="true">
      <span class="heading-measure">Our Successful Startups</span>
      <span class="heading-typed"></span>
    </span>
    <i class="rolling-coin" aria-hidden="true">&#x1FA99;</i>
  </h2>
  <div class="plot">
    <div class="funding-glow" aria-hidden="true"></div>
    <header>
      <strong>Top 5 by funding received</strong>
      <div class="chart-actions"><small></small><button class="play-toggle" type="button"></button></div>
    </header>
    <ol class="startup-list" aria-label="Startups ranked by received funding"></ol>
    <div class="axis" aria-hidden="true">
      <span></span><div><span>0</span><span>25k</span><span>50k</span></div><span>PKR</span>
    </div>
  </div>
  <aside class="story" aria-label="Selected startup details">
    <h3></h3>
    <div class="detailGrid">
      <div><b>The idea</b><p></p></div>
      <div><b>The product</b><p></p></div>
    </div>
  </aside>
</section>`;
    this.animateHeading();
    this.shadowRoot.querySelector('small').textContent = preview
      ? 'Illustrative examples \u00b7 PKR'
      : 'Registered startups \u00b7 PKR';

    const section = this.shadowRoot.querySelector('section');
    section.onpointerenter = () => { this.hovered = true; };
    section.onpointerleave = () => { this.hovered = false; };
    this.shadowRoot.querySelector('.play-toggle').onclick = () => {
      this.playing = !this.playing;
      this.startAutoScroll();
    };

    for (const row of this.rows) {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'line';
      button.dataset.key = row.key;
      button.onclick = () => {
        this.select(row, true);
        this.startAutoScroll();
      };
      button.innerHTML = '<span class="name"></span><span class="track" aria-hidden="true"><span class="fill"></span></span><strong class="amount"></strong>';
      button.querySelector('.name').textContent = row.name;
      button.querySelector('.amount').textContent = '\u20a8 ' + format.format(row.amount);
      button.style.setProperty('--share', row.amount / 500 + '%');
      item.append(button);
      this.shadowRoot.querySelector('.startup-list').append(item);
    }

    this.select(this.rows.find(row => row.key === this.selected) || this.rows[0], false);
    this.startAutoScroll();
  }
}

customElements.define('startup-funding-chart', StartupFundingChart);
