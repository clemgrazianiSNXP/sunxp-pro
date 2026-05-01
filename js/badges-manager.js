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

  // Liste des chauffeurs
  results.forEach(r => {
    const card = document.createElement('div');
    card.style.cssText = 'border:1px solid var(--border);border-radius:8px;background:var(--bg-sidebar);overflow:hidden;';

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px;cursor:pointer;transition:background 0.15s;';
    header.innerHTML = `
      <span style="font-size:13px;font-weight:700;">${escBM(r.nom)}</span>
      <span style="font-size:11px;color:var(--text-muted);">${r.unlocked.length}/${r.total} ▼</span>`;
    header.onmouseenter = () => { header.style.background = 'var(--bg-tab-hover)'; };
    header.onmouseleave = () => { header.style.background = ''; };
    card.appendChild(header);

    // Contenu dépliable (fermé par défaut)
    const body = document.createElement('div');
    body.style.cssText = 'display:none;padding:0 12px 12px;';

    if (r.unlocked.length) {
      // Grouper par section
      const bySection = {};
      r.unlocked.forEach(b => {
        if (!bySection[b.section]) bySection[b.section] = [];
        bySection[b.section].push(b);
      });
      Object.entries(bySection).forEach(([section, badges]) => {
        const secDiv = document.createElement('div');
        secDiv.style.cssText = 'margin-top:8px;';
        secDiv.innerHTML = `<div style="font-size:11px;font-weight:600;color:var(--accent);margin-bottom:4px;">${section}</div>`;
        const badgesWrap = document.createElement('div');
        badgesWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
        badges.forEach(b => {
          const chip = document.createElement('span');
          chip.style.cssText = 'font-size:11px;background:var(--bg-primary);border:1px solid var(--border);border-radius:12px;padding:2px 8px;white-space:nowrap;cursor:pointer;transition:border-color 0.15s;';
          chip.textContent = b.icon + ' ' + b.name;
          chip.addEventListener('click', e => { e.stopPropagation(); showBadgeDetailPopup(b); });
          chip.onmouseenter = () => { chip.style.borderColor = 'var(--accent)'; };
          chip.onmouseleave = () => { chip.style.borderColor = 'var(--border)'; };
          badgesWrap.appendChild(chip);
        });
        secDiv.appendChild(badgesWrap);
        body.appendChild(secDiv);
      });
    } else {
      const empty = document.createElement('div');
      empty.style.cssText = 'font-size:11px;color:var(--text-muted);font-style:italic;padding:8px 0;';
      empty.textContent = 'Aucun badge débloqué';
      body.appendChild(empty);
    }

    card.appendChild(body);

    // Toggle ouverture/fermeture
    header.addEventListener('click', () => {
      const isOpen = body.style.display !== 'none';
      body.style.display = isOpen ? 'none' : 'block';
      header.querySelector('span:last-child').textContent = `${r.unlocked.length}/${r.total} ${isOpen ? '▼' : '▲'}`;
    });

    wrap.appendChild(card);
  });

  return wrap;
}

function showBadgeDetailPopup(badge) {
  const existing = document.getElementById('badge-detail-popup');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'badge-detail-popup';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:16px;';
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  const box = document.createElement('div');
  box.style.cssText = 'background:var(--bg-sidebar);border:2px solid var(--accent);border-radius:14px;padding:24px;text-align:center;max-width:300px;width:100%;animation:badgePop 0.3s ease;';
  box.innerHTML = `
    <div style="font-size:40px;margin-bottom:8px;">${badge.icon}</div>
    <div style="font-size:16px;font-weight:700;color:var(--accent);margin-bottom:4px;">${badge.name}</div>
    <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:12px;">${badge.section}</div>
    <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:14px;">
      <div style="font-size:12px;font-weight:600;color:#4ade80;margin-bottom:4px;">✅ Objectif atteint</div>
      <div style="font-size:13px;color:var(--text-primary);">${badge.desc}</div>
    </div>
    <button style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:8px 24px;font-size:13px;cursor:pointer;">OK</button>`;
  box.querySelector('button').onclick = () => overlay.remove();
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function escBM(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
