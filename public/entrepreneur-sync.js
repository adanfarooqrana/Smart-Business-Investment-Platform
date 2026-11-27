export function watchEntrepreneurProfile({uid, listen, readRegistration, publish, events = window}) {
  let profile = null;
  let pitches = null;
  let stats = null;
  let stopped = false;
  let running = false;
  let pending = false;
  let revision = 0;
  let timer;

  async function refresh() {
    pending = true;
    if (running || stopped) return;
    running = true;
    try {
      while (pending && !stopped) {
        pending = false;
        const version = revision;
        const registration = await readRegistration();
        if (stopped) return;
        if (version !== revision) { pending = true; continue; }
        const row = extractEntrepreneurSpotlight(registration, profile, pitches, stats);
        if (row) await publish(row);
      }
    } catch (error) {
      console.warn('Entrepreneur public profile sync:', error.message);
    } finally {
      running = false;
    }
  }

  const changed = () => {
    revision++;
    clearTimeout(timer);
    timer = setTimeout(refresh, 200);
  };
  const stops = [
    listen('founders/' + uid + '/profile', value => { profile = value; changed(); }),
    listen('founders/' + uid + '/pitches', value => { pitches = value; changed(); }),
    listen('founders/' + uid + '/stats', value => { stats = value; changed(); })
  ];
  events.addEventListener('entrepreneur-profile-updated', changed);
  return () => {
    stopped = true;
    clearTimeout(timer);
    stops.forEach(stop => stop());
    events.removeEventListener('entrepreneur-profile-updated', changed);
  };
}

export function extractEntrepreneurSpotlight(registration, account, pitches, stats) {
  const saved = registration?.profile || {};
  const details = saved.roleDetails || {};
  const role = registration?.role || account?.role;
  if (!['entrepreneur', 'founder'].includes(role)) return null;
  const ideas = Object.values(pitches || {}).filter(pitch => pitch && typeof pitch === 'object');
  ideas.sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
  const selected = ideas.find(pitch => (pitch.ideaTitle || pitch.stage1?.ideaTitle) === details.pitchTitle) || ideas[0];
  const stage = selected?.stage1 || {};
  const fullName = String(account?.fullName || saved.fullName || '').trim();
  const startupName = String(details.startupName || account?.startupName || selected?.ideaTitle || stage.ideaTitle || '').trim();
  if (!fullName || !startupName) return null;
  const idea = String(selected?.ideaDescription || stage.ideaDescription || details.pitchSummary || '').trim();
  const photoUrl = String(account?.photoUrl || account?.avatarUrl || saved.photoUrl || saved.avatarUrl || details.photoUrl || '').trim();
  const amount = Number(stats?.totalFundingRaised || 0);
  return {
    fullName: fullName.slice(0, 200),
    startupName: startupName.slice(0, 200),
    photoUrl: /^https?:\/\//i.test(photoUrl) ? photoUrl.slice(0, 2048) : '',
    activity: idea.slice(0, 1000),
    idea: idea.slice(0, 1000),
    amountRaised: Number.isFinite(amount) && amount > 0 ? amount : 0,
    hasPitched: Boolean(selected || details.pitchTitle || details.pitchSummary)
  };
}
