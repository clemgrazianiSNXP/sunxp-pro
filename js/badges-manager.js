/* js/badges-manager.js — Vue responsable des badges chauffeurs (SunXP Pro) */
console.log('badges-manager.js chargé');

function renderBadgesManager() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;';

  const sid = window.getActiveStationId ? window.getActiveStationId() : 'default';
  let chauffeurs = [];
  try { const raw = localStorage.getItem(sid + '-repertoire'); if (raw) chauffeurs = JSON.parse(raw); } catch (_) {}

  wrap.innerHTML = '<h3 style="font-size:14px;color:var(--accent);margin:0;">🏆 Badges chauffeurs</h3>';

  if (!chauffeurs.length) {
    wrap.innerHTML += '<p style="color:var(--text-muted);font-size:13px;">Aucun chauffeur dans le répertoire.</p>';
    return wrap;
  }

  // Calculer les badges de chaque chauffeur
  const results = [];
  chauffeurs.forEach(c => {
    const nom = ((c.prenom || '') + ' ' + (c.nom || '')).trim();
    const cId = (c.id_amazon || '').replace(/\s/g, '').toUpperCase();
    const badgeKey = sid + '-badges-' + cId;
    let saved = {};
    try { const raw = localStorage.getItem(badgeKey); if (raw) saved = JSON.parse(raw); } catch (_) {}
    const unlocked = BADGE_DEFS.filter(d => saved[d.id]?.unlocked);
    results.push({ nom, prenom: c.prenom || '', unlocked, total: BADGE_DEFS.length });
  });

  // Trier par nombre de badges débloqués (desc)
  results.sort((a, b) => b.unlocked.length - a.unlocked.length);

  // Résumé global
  const totalBadges = results.reduce((s, r) => s + r.unlocked.length, 0);
  const summary = document.createElement('div');
  summary.style.cssText = 'background:var(--accent-dim);border:1px solid var(--accent);border-radius:8px;padding:12px;text-align:center;';
  summary.innerHTML = `<div style="font-size:12px;color:var(--text-muted);">Total badges débloqués dans l'équipe</div><div style="font-size:24px;font-weight:700;color:var(--accent);">${totalBadges}</div>`;
  wrap.appendChild(summary);

  // Liste des chauffeurs
  results.forEach(r => {
    const card = document.createElement('div');
    card.style.cssText = 'border:1px solid var(--border);border-radius:8px;padding:12px;background:var(--bg-sidebar);';

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
    header.innerHTML = `
      <span style="font-size:13px;font-weight:700;">${escBM(r.nom)}</span>
      <span style="font-size:11px;color:var(--text-muted);">${r.unlocked.length}/${r.total}</span>`;
    card.appendChild(header);

    if (r.unlocked.length) {
      const badgesWrap = document.createElement('div');
      badgesWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
      r.unlocked.forEach(b => {
        const chip = document.createElement('span');
        chip.style.cssText = 'font-size:11px;background:var(--bg-primary);border:1px solid var(--border);border-radius:12px;padding:2px 8px;white-space:nowrap;';
        chip.textContent = b.icon + ' ' + b.name;
        chip.title = b.desc;
        badgesWrap.appendChild(chip);
      });
      card.appendChild(badgesWrap);
    } else {
      const empty = document.createElement('div');
      empty.style.cssText = 'font-size:11px;color:var(--text-muted);font-style:italic;';
      empty.textContent = 'Aucun badge débloqué';
      card.appendChild(empty);
    }

    wrap.appendChild(card);
  });

  return wrap;
}

function escBM(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
