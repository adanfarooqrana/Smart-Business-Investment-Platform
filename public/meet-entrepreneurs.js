const demoEntrepreneurs = [
  {
    key: 'demo-ayesha',
    fullName: 'Ayesha Khan',
    startupName: 'Saffron Kitchen',
    photoUrl: '/images/entrepreneurs/ayesha.jpg',
    activity: 'Growing a neighbourhood kitchen that delivers fresh, pre-ordered lunches to local offices.',
    amountRaised: 48500,
    hasPitched: true
  },
  {
    key: 'demo-hamza',
    fullName: 'Hamza Ali',
    startupName: 'Orbit Tutors',
    photoUrl: '/images/entrepreneurs/hamza.jpg',
    activity: 'Building a learning app that connects students with tutors and turns revision into daily practice.',
    amountRaised: 42000,
    hasPitched: true
  },
  {
    key: 'demo-sara',
    fullName: 'Sara Ahmed',
    startupName: 'Neem Naturals',
    photoUrl: '/images/entrepreneurs/sara.jpg',
    activity: 'Pitching refillable personal care products for neighbourhood stores, starting with neem soap.',
    amountRaised: 0,
    hasPitched: true
  },
  {
    key: 'demo-bilal',
    fullName: 'Bilal Hassan',
    startupName: 'Thread Studio',
    photoUrl: '/images/entrepreneurs/bilal.jpg',
    activity: 'Growing a clothing trading business that connects local tailors with made-to-order customers.',
    amountRaised: 29000,
    hasPitched: true
  }
];

const moneyFormat = new Intl.NumberFormat('en-PK');

function normalizeEntrepreneurs(data) {
  if (!data || typeof data !== 'object') return [];
  return Object.entries(data)
    .filter(([, value]) => value && typeof value === 'object')
    .map(([key, value]) => {
      const profile = value.profile || {};
      const details = profile.roleDetails || value.roleDetails || {};
      const amount = Number(value.amountRaised ?? value.totalFundingRaised ?? value.stats?.totalFundingRaised ?? 0);
      return {
        key,
        fullName: String(value.fullName ?? profile.fullName ?? '').trim(),
        startupName: String(value.startupName ?? details.startupName ?? '').trim(),
        photoUrl: String(value.photoUrl ?? value.avatarUrl ?? profile.photoUrl ?? profile.avatarUrl ?? profile.photoURL ?? details.photoUrl ?? '').trim(),
        activity: String(value.activity ?? value.idea ?? details.pitchSummary ?? details.pitchTitle ?? '').trim().slice(0, 260),
        amountRaised: Number.isFinite(amount) && amount >= 0 ? amount : 0,
        hasPitched: Boolean(value.hasPitched ?? (details.pitchTitle || details.pitchSummary || value.idea))
      };
    })
    .filter(profile => profile.fullName && profile.startupName);
}

function shuffleProfiles(profiles) {
  const shuffled = [...profiles];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const next = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[next]] = [shuffled[next], shuffled[index]];
  }
  return shuffled;
}

class MeetEntrepreneurs extends HTMLElement {
  connectedCallback() {
    if (!this.shadowRoot) this.attachShadow({mode: 'open'});
    this.playing ??= !matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.typingTimers = new Map();
    this.hovered = false;
    this.inView = false;
    this.render(demoEntrepreneurs, true);
    this.observer = new IntersectionObserver(([entry]) => {
      this.inView = entry.isIntersecting;
    }, {threshold: 0.15});
    this.observer.observe(this);
    this.start();
  }

  set subscribe(reader) {
    this.reader = reader;
    this.start();
  }

  start() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (!this.reader || !this.isConnected || !this.shadowRoot) return;
    this.unsubscribe = this.reader(data => {
      const profiles = normalizeEntrepreneurs(data);
      this.render(profiles.length ? profiles : demoEntrepreneurs, profiles.length === 0);
    });
  }

  disconnectedCallback() {
    clearInterval(this.rotationTimer);
    this.typingTimers?.forEach(timer => clearInterval(timer));
    this.slide?.cancel();
    this.observer?.disconnect();
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  restartRotation() {
    clearInterval(this.rotationTimer);
    const control = this.shadowRoot.querySelector('.toggle');
    control.innerHTML = this.playing ? '&#10074;&#10074;' : '&#9654;';
    const label = this.playing ? 'Pause entrepreneur carousel' : 'Play entrepreneur carousel';
    control.setAttribute('aria-label', label);
    control.title = label;
    if (!this.playing || this.profiles.length < 2) return;
    this.rotationTimer = setInterval(() => {
      if (document.hidden || !this.inView || this.hovered) return;
      if (this.shadowRoot.querySelector('button:focus-visible')) return;
      void this.advance(1);
    }, 6000);
  }

  typeActivity(card, animate) {
    clearInterval(this.typingTimers.get(card));
    const output = card.querySelector('.typed');
    const text = card.profile.activity || 'Preparing the next chapter of this startup.';
    card.querySelector('.accessible-copy').textContent = text;
    if (!animate || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      output.textContent = text;
      return;
    }
    let length = 0;
    output.textContent = '';
    const timer = setInterval(() => {
      length += 3;
      output.textContent = text.slice(0, length);
      if (length >= text.length) {
        clearInterval(timer);
        this.typingTimers.delete(card);
      }
    }, 24);
    this.typingTimers.set(card, timer);
  }

  async advance(direction) {
    if (this.slide || this.profiles.length < 2) return;
    const track = this.shadowRoot.querySelector('.track');
    const first = track.firstElementChild;
    const last = track.lastElementChild;
    const step = first.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap);
    const moving = direction > 0 ? first : last;
    const clone = moving.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.inert = true;
    clone.querySelector('.typed').textContent = moving.profile.activity;
    track.append(clone);
    if (direction < 0) track.prepend(last);

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const slide = track.animate(
      direction > 0
        ? [{transform: 'translateX(0)'}, {transform: 'translateX(-' + step + 'px)'}]
        : [{transform: 'translateX(-' + step + 'px)'}, {transform: 'translateX(0)'}],
      {duration: reduced ? 0 : 650, easing: 'cubic-bezier(.22,.68,.28,1)', fill: 'forwards'}
    );
    this.slide = slide;
    try {
      await slide.finished;
      if (track !== this.shadowRoot.querySelector('.track')) return;
      if (direction > 0) {
        track.append(first);
        this.profiles.push(this.profiles.shift());
      } else {
        this.profiles.unshift(this.profiles.pop());
      }
      clone.remove();
      slide.cancel();
      this.updateFeatured(true);
    } catch {
      // A fresh data snapshot or disconnection can replace an active slide.
    } finally {
      clone.remove();
      if (this.slide === slide) this.slide = null;
    }
  }

  updateFeatured(animate) {
    const cards = [...this.shadowRoot.querySelectorAll('.founder-card')];
    cards.forEach((card, index) => card.classList.toggle('featured', index === 0));
    this.typeActivity(cards[0], animate);
  }

  createCard(profile) {
    const card = document.createElement('article');
    card.className = 'founder-card';
    card.profile = profile;
    card.innerHTML = '<div class="portrait"><span class="initials" aria-hidden="true"></span><img loading="lazy" decoding="async"></div><h3></h3><p class="startup"></p><p class="activity"><span class="accessible-copy"></span><span class="typed" aria-hidden="true"></span></p><div class="funding"><span>Funding raised</span><strong></strong></div><p class="status"></p>';

    card.querySelector('.initials').textContent = profile.fullName.split(/\s+/).slice(0, 2).map(part => part[0]).join('');
    card.querySelector('h3').textContent = profile.fullName;
    card.querySelector('.startup').textContent = profile.startupName;
    card.querySelector('.funding strong').textContent = 'PKR ' + moneyFormat.format(profile.amountRaised);
    card.querySelector('.status').textContent = profile.amountRaised > 0
      ? 'Investment received'
      : profile.hasPitched ? 'Idea pitched' : 'Getting started';

    const image = card.querySelector('img');
    image.alt = profile.fullName;
    try {
      const source = new URL(profile.photoUrl, location.origin);
      if (!profile.photoUrl || !['http:', 'https:'].includes(source.protocol)) throw new Error('Missing profile photo');
      image.onerror = () => { image.hidden = true; };
      image.src = source.href;
    } catch {
      image.hidden = true;
    }
    this.typeActivity(card, false);
    return card;
  }

  render(records, preview) {
    clearInterval(this.rotationTimer);
    this.typingTimers?.forEach(timer => clearInterval(timer));
    this.typingTimers?.clear();
    this.slide?.cancel();
    this.slide = null;
    const incoming = new Map(records.map(profile => [profile.key, profile]));
    const retained = (this.profiles || []).filter(profile => incoming.has(profile.key)).map(profile => incoming.get(profile.key));
    const known = new Set(retained.map(profile => profile.key));
    this.profiles = retained.concat(shuffleProfiles(records.filter(profile => !known.has(profile.key))));

    this.shadowRoot.innerHTML = `<style>
      :host { display:block; width:100%; max-width:80rem; font-family:Inter,system-ui,sans-serif; }
      * { box-sizing:border-box; }
      section { padding:clamp(28px,4vw,50px); border:1px solid #e0e6ea; border-radius:36px; background:radial-gradient(ellipse at 50% 0,#fff6e5,transparent 45%),#fff; color:#18332d; }
      .heading { text-align:center; }
      .sun { position:relative; display:grid; place-items:center; width:62px; height:62px; margin:0 auto 12px; color:#ff9b00; font-size:42px; line-height:1; }
      .sun::before { content:''; position:absolute; inset:2px; border-radius:50%; background:#ffbd4a35; filter:blur(11px); animation:sunlight 3s ease-in-out infinite alternate; }
      .sun span { position:relative; display:block; animation:sunrise 28s linear infinite; text-shadow:0 0 18px #ffb02077; }
      h2 { margin:0; font-family:Outfit,Inter,system-ui,sans-serif; font-size:clamp(30px,4vw,48px); font-weight:650; line-height:1.15; letter-spacing:-.045em; }
      h2 em { font-style:normal; color:#ee8500; animation:titleGlow 3s ease-in-out infinite alternate; }
      .toolbar { display:flex; align-items:center; justify-content:space-between; gap:16px; margin:28px 0 18px; }
      .data-label { color:#7e867b; font-size:11px; }
      .controls { display:flex; gap:7px; }
      button { display:grid; place-items:center; width:34px; height:34px; border:1px solid #e4e6dc; border-radius:50%; background:#fff; color:#28453c; cursor:pointer; font:inherit; }
      button:hover { color:#bd6500; background:#fff3df; border-color:#efc789; }
      button:focus-visible { outline:2px solid #d47b10; outline-offset:3px; }
      button:disabled { opacity:.35; cursor:default; }
      .toggle { font-size:11px; }
      .viewport { overflow:hidden; margin:auto; border-radius:24px; }
      .track { --visible:3; --gap:20px; display:flex; align-items:stretch; gap:var(--gap); }
      .track[data-count="2"] { --visible:2; }
      .track[data-count="1"] { --visible:1; }
      .founder-card { flex:0 0 calc((100% - (var(--visible) - 1)*var(--gap))/var(--visible)); min-width:0; padding:28px 24px 22px; border:1px solid #e7e9df; border-radius:24px; background:linear-gradient(155deg,#fffefb,#f9faf5); text-align:center; transition:border-color .4s,background .4s; }
      .founder-card.featured { border-color:#edbf78; background:linear-gradient(155deg,#fffaf0,#fffefb); }
      .portrait { position:relative; display:grid; place-items:center; width:106px; height:106px; margin:0 auto 19px; padding:5px; border:1px solid #dce7dd; border-radius:50%; background:#edf3e9; }
      .featured .portrait { border-color:#f2bc64; box-shadow:0 0 22px #f5b54430; }
      .initials { color:#5e7a60; font-size:29px; font-family:Outfit,Inter,system-ui,sans-serif; }
      img { position:absolute; inset:5px; display:block; width:94px; height:94px; border-radius:50%; object-fit:cover; }
      img[hidden] { display:none; }
      h3 { margin:0; color:#173d32; font-family:Outfit,Inter,system-ui,sans-serif; font-size:25px; line-height:1.2; font-weight:600; letter-spacing:-.025em; overflow-wrap:anywhere; }
      .startup { margin:7px 0 0; color:#bb6f10; font-size:12px; font-weight:600; overflow-wrap:anywhere; }
      .activity { min-height:105px; margin:19px 0 20px; color:#667267; font-size:13px; line-height:1.75; overflow-wrap:anywhere; }
      .accessible-copy { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
      .funding { display:flex; flex-direction:column; align-items:center; gap:6px; padding-top:19px; border-top:1px solid #e5e8dc; }
      .funding span { color:#7b887b; font-size:11px; }
      .funding strong { color:#173d32; font-family:Outfit,Inter,system-ui,sans-serif; font-size:27px; font-weight:550; letter-spacing:-.035em; }
      .status { display:inline-block; margin:13px 0 0; padding:5px 10px; color:#4c765d; background:#edf4e9; border-radius:6px; font-size:10px; }
      @keyframes sunlight { to { opacity:.65; transform:scale(1.35); } }
      @keyframes sunrise { to { transform:rotate(360deg); } }
      @keyframes titleGlow { to { text-shadow:0 0 22px #ffbe4b55; color:#f59800; } }
      @media(max-width:900px) { .track { --visible:2; } .founder-card { padding:24px 20px; } }
      @media(max-width:600px) { section { padding:28px 18px; border-radius:28px; } .track[data-count] { --visible:1; } .toolbar { margin-top:22px; } .founder-card { padding:26px 22px; } .activity { min-height:92px; } }
      @media(prefers-reduced-motion:reduce) { * { animation:none!important; transition:none!important; } }
    </style>
    <section aria-label="Meet Entrepreneurs">
      <div class="heading">
        <div class="sun" aria-hidden="true"><span>&#x2600;</span></div>
        <h2>Meet <em>Entrepreneurs</em></h2>
      </div>
      <div class="toolbar">
        <span class="data-label"></span>
        <div class="controls">
          <button class="previous" type="button" aria-label="Previous entrepreneur" title="Previous entrepreneur">&#8592;</button>
          <button class="toggle" type="button"></button>
          <button class="next" type="button" aria-label="Next entrepreneur" title="Next entrepreneur">&#8594;</button>
        </div>
      </div>
      <div class="viewport"><div class="track"></div></div>
    </section>`;

    this.shadowRoot.querySelector('.data-label').textContent = preview ? 'Illustrative profiles' : 'From our entrepreneur community';
    const track = this.shadowRoot.querySelector('.track');
    track.dataset.count = this.profiles.length;
    for (const profile of this.profiles) track.append(this.createCard(profile));
    const viewport = this.shadowRoot.querySelector('.viewport');
    viewport.style.maxWidth = this.profiles.length === 1 ? '400px' : this.profiles.length === 2 ? '780px' : '';
    const section = this.shadowRoot.querySelector('section');
    section.onpointerenter = () => { this.hovered = true; };
    section.onpointerleave = () => { this.hovered = false; };
    this.shadowRoot.querySelector('.previous').onclick = () => {
      void this.advance(-1);
      this.restartRotation();
    };
    this.shadowRoot.querySelector('.next').onclick = () => {
      void this.advance(1);
      this.restartRotation();
    };
    this.shadowRoot.querySelector('.toggle').onclick = () => {
      this.playing = !this.playing;
      this.restartRotation();
    };
    for (const button of this.shadowRoot.querySelectorAll('.previous,.next')) button.disabled = this.profiles.length < 2;
    this.updateFeatured(true);
    this.restartRotation();
  }
}

customElements.define('meet-entrepreneurs', MeetEntrepreneurs);
