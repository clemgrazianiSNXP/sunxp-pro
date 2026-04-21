/* js/badges.js — UI des badges chauffeur (SunXP Pro) */
console.log('badges.js chargé');

function renderBadgesTab() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:16px;overflow-y:auto;';

  if (!portalChauffeur || !portalStationId) {
    wrap.innerHTML = '<p style="color:var(--text-muted);">Connectez-vous pour voir vos badges.</p>';
    return wrap;
  }

  const sid = portalStationId;
  const cId = portalChauffeur.id_amazon.replace(/\s/g, '').toUpperCase();
  const badgeKey = sid + '-badges-' + cId;

  // Charger les badges sauvegardés
  let saved = {};
  try { const raw = localStorage.getItem(badgeKey); if (raw) saved = JSON.parse(raw); } catch (_) {}

  // Calculer les badges actuels
  const computed = typeof calculateBadges === 'function' ? calculateBadges(sid, portalChauffeur) : {};

  // Fusionner : synchroniser avec le calcul actuel (badges retirés si stats supprimées)
  const newBadges = [];
  const now = new Date().toISOString().slice(0, 10);
  Object.keys(computed).forEach(id => {
    if (computed[id].unlocked) {
      if (!saved[id] || !saved[id].unlocked) {
        saved[id] = { unlocked: true, date: now };
        newBadges.push(id);
      }
    } else {
      // Badge perdu si stats supprimées
      if (saved[id] && saved[id].unlocked) saved[id] = { unlocked: false };
    }
    if (!saved[id]) saved[id] = { unlocked: false };
    saved[id].progress = computed[id].progress;
    saved[id].target = computed[id].target;
  });

  // Sauvegarder
  try { localStorage.setItem(badgeKey, JSON.stringify(saved)); } catch (_) {}

  // Notification nouveau badge
  if (newBadges.length) {
    const def = BADGE_DEFS.find(d => d.id === newBadges[0]);
    if (def) showBadgeNotification(def);
  }

  // Titre
  const totalUnlocked = BADGE_DEFS.filter(d => saved[d.id]?.unlocked).length;
  wrap.innerHTML = `<div style="text-align:center;">
    <div style="font-size:20px;font-weight:700;">🏆 Mes Badges</div>
    <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">${totalUnlocked}/${BADGE_DEFS.length} débloqués</div>
  </div>`;

  // Grouper par section
  const sections = {};
  BADGE_DEFS.forEach(def => {
    if (!sections[def.section]) sections[def.section] = [];
    sections[def.section].push(def);
  });

  Object.entries(sections).forEach(([sectionName, defs]) => {
    const sectionEl = document.createElement('div');
    const unlocked = defs.filter(d => saved[d.id]?.unlocked).length;
    sectionEl.innerHTML = `<div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:8px;">${sectionName} — <span style="color:var(--text-muted);font-weight:400;">${unlocked}/${defs.length}</span></div>`;

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:8px;';

    defs.forEach(def => {
      const state = saved[def.id] || {};
      const card = document.createElement('div');
      card.className = 'badge-card' + (state.unlocked ? ' badge-unlocked' : '') + (def.animated && state.unlocked ? ' badge-animated' : '');
      const icon = state.unlocked ? def.icon : '🔒';
      const progress = !state.unlocked ? `<div class="badge-progress-bar"><div class="badge-progress-fill" style="width:${Math.round((state.progress||0)/(state.target||1)*100)}%"></div></div><span class="badge-progress-text">${state.progress||0}/${state.target||1}</span>` : '';
      const date = state.unlocked && state.date ? `<span class="badge-date">${state.date}</span>` : '';
      card.innerHTML = `<div class="badge-icon">${icon}</div><div class="badge-name">${def.name}</div>${date}${progress}`;
      card.title = def.desc;
      grid.appendChild(card);
    });

    sectionEl.appendChild(grid);
    wrap.appendChild(sectionEl);
  });

  return wrap;
}

function showBadgeNotification(def) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:var(--bg-sidebar);border:2px solid var(--accent);border-radius:16px;padding:32px;text-align:center;max-width:300px;animation:badgePop 0.5s ease;">
      <div style="font-size:48px;margin-bottom:12px;">${def.icon}</div>
      <div style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:8px;">🎉 Félicitations !</div>
      <div style="font-size:13px;color:var(--text-muted);">Tu as débloqué le badge</div>
      <div style="font-size:18px;font-weight:700;color:var(--accent);margin:8px 0;">${def.name}</div>
      <div style="font-size:11px;color:var(--text-muted);">${def.desc}</div>
      <div class="confetti-container"></div>
      <button onclick="this.closest('div[style]').parentElement.remove()" style="margin-top:16px;background:var(--accent);color:#fff;border:none;border-radius:8px;padding:8px 24px;font-size:13px;cursor:pointer;">Super !</button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  // Auto-close after 5s
  setTimeout(() => { if (document.body.contains(overlay)) overlay.remove(); }, 5000);
}
