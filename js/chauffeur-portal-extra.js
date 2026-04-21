/* js/chauffeur-portal-extra.js — Onglets Dégâts et Rapport pour le portail chauffeur */
console.log('chauffeur-portal-extra.js chargé');

/* ── Onglet Dégâts ────────────────────────────────────────── */
function portalDegats() {
  const wrap = document.createElement('div');
  const nom = ((portalChauffeur.prenom || '') + ' ' + (portalChauffeur.nom || '')).trim();
  const sid = portalStationId;

  const title = document.createElement('div');
  title.style.cssText = 'text-align:center;margin-bottom:14px;';
  title.innerHTML = '<div style="font-size:15px;font-weight:700;">🔧 Mes dégâts signalés</div><div style="font-size:12px;color:var(--text-muted);">Historique des incidents sur vos véhicules</div>';
  wrap.appendChild(title);

  // Charger les dégâts
  let degats = [];
  try {
    const key = sid + '-degats';
    const raw = localStorage.getItem(key);
    if (raw) degats = JSON.parse(raw);
  } catch (_) {}

  // Filtrer pour ce chauffeur
  const mine = degats.filter(d => d.chauffeur === nom).sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!mine.length) {
    wrap.appendChild(portalCard('✅', 'Dégâts', 'Aucun', 'Aucun dégât signalé vous concernant', '#4ade80'));
    return wrap;
  }

  // Résumé
  const summary = document.createElement('div');
  summary.className = 'portal-card';
  summary.style.cssText += 'border-color:#f59e0b;';
  summary.innerHTML = `
    <div style="font-size:13px;font-weight:700;color:#f59e0b;">⚠️ ${mine.length} dégât${mine.length > 1 ? 's' : ''} signalé${mine.length > 1 ? 's' : ''}</div>
    <div style="font-size:11px;color:var(--text-muted);">Consultez le détail de chaque incident ci-dessous</div>`;
  wrap.appendChild(summary);

  // Liste des dégâts
  mine.forEach(d => {
    const card = document.createElement('div');
    card.className = 'portal-card';
    card.style.cssText += 'text-align:left;align-items:stretch;gap:8px;border-left:3px solid #f87171;';

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-weight:700;font-size:14px;color:var(--accent);">🚛 ${esc(d.plaque)}</span>
        <span style="font-size:11px;color:var(--text-muted);">📅 ${fmtD(d.date)}</span>
      </div>
      <div style="font-size:13px;font-weight:600;">Description du dégât :</div>
      <div style="font-size:13px;color:var(--text-primary);padding:8px;background:var(--bg-tab-hover);border-radius:6px;">${esc(d.description || 'Pas de description fournie')}</div>`;

    card.innerHTML = html;

    // Photos
    if (d.photos && d.photos.length) {
      const photoTitle = document.createElement('div');
      photoTitle.style.cssText = 'font-size:13px;font-weight:600;margin-top:4px;';
      photoTitle.textContent = '📷 Photos (' + d.photos.length + ') :';
      card.appendChild(photoTitle);

      const photoWrap = document.createElement('div');
      photoWrap.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;';
      d.photos.forEach(p => {
        const img = document.createElement('img');
        img.src = p;
        img.style.cssText = 'width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid var(--border);cursor:pointer;';
        img.onclick = () => {
          const ov = document.createElement('div');
          ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;cursor:pointer;';
          const bigImg = document.createElement('img');
          bigImg.src = p;
          bigImg.style.cssText = 'max-width:90%;max-height:90%;border-radius:8px;';
          ov.appendChild(bigImg);
          ov.onclick = () => ov.remove();
          document.body.appendChild(ov);
        };
        photoWrap.appendChild(img);
      });
      card.appendChild(photoWrap);
    } else {
      const noPhoto = document.createElement('div');
      noPhoto.style.cssText = 'font-size:11px;color:var(--text-muted);font-style:italic;';
      noPhoto.textContent = 'Aucune photo jointe';
      card.appendChild(noPhoto);
    }

    wrap.appendChild(card);
  });

  return wrap;
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtD(s) {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' }); }
  catch (_) { return s; }
}

/* ── Onglet Rapport Chauffeur ──────────────────────────────── */
function portalRapport() {
  const wrap = document.createElement('div');
  const nom = ((portalChauffeur.prenom || '') + ' ' + (portalChauffeur.nom || '')).trim();
  const sid = portalStationId;

  const title = document.createElement('div');
  title.style.cssText = 'text-align:center;margin-bottom:14px;';
  title.innerHTML = '<div style="font-size:15px;font-weight:700;">📋 Mon rapport</div><div style="font-size:12px;color:var(--text-muted);">Retards, scores Mentor et concessions</div>';
  wrap.appendChild(title);

  // Helpers
  const prefix_conc = sid + '-concessions-';
  const prefix_ret = sid + '-retards-';

  function loadAll(prefix) {
    const all = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k.startsWith(prefix)) continue;
      const w = k.replace(prefix, '');
      try { (JSON.parse(localStorage.getItem(k)) || []).forEach(item => all.push({ ...item, _week: w })); } catch (_) {}
    }
    return all;
  }

  function getWeeksList(prefix) {
    const w = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(prefix)) w.push(k.replace(prefix, '')); }
    return w.sort().reverse();
  }

  function curWeek() {
    const now = new Date(), d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const ys = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return d.getUTCFullYear() + '-S' + String(Math.ceil(((d - ys) / 864e5 + 1) / 7)).padStart(2, '0');
  }

  function fmtShort(s) {
    if (!s) return '—';
    try { return new Date(s).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'2-digit' }); } catch (_) { return s; }
  }
  function fmtDateTime(s) {
    if (!s) return '—';
    try { const d = new Date(s.replace(' ','T')); return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}); } catch (_) { return s; }
  }

  // Mentor scan
  function getMentorBad() {
    const prefix = sid + '-heures-', results = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k.startsWith(prefix)) continue;
      const dateStr = k.replace(prefix, '');
      try {
        const data = JSON.parse(localStorage.getItem(k));
        const rows = data.rows || {};
        Object.values(rows).forEach(r => {
          const mentor = parseInt(r.mentor), trajet = parseInt(r.trajet);
          if (!isNaN(mentor) && !isNaN(trajet) && mentor < 810 && trajet !== 5 && r.nom === nom) {
            results.push({ date: dateStr, mentor, trajet, faute: r.faute || '' });
          }
        });
      } catch (_) {}
    }
    return results;
  }

  // Data
  const allConc = loadAll(prefix_conc).filter(c => c.chauffeur === nom);
  const allRet = loadAll(prefix_ret).filter(r => r.chauffeur === nom);
  const allMentor = getMentorBad();
  const weeks = [...new Set([...getWeeksList(prefix_conc), ...getWeeksList(prefix_ret)])].sort().reverse();
  const currentW = curWeek();

  // ── Résumé année ──
  const yearCard = document.createElement('div');
  yearCard.className = 'portal-card';
  yearCard.style.cssText += 'border-color:var(--accent);border-width:2px;background:var(--accent-dim);text-align:left;align-items:stretch;gap:8px;';
  yearCard.innerHTML = `
    <div style="font-size:14px;font-weight:700;color:var(--accent);text-align:center;">📊 Bilan de l'année</div>
    <div style="display:flex;justify-content:space-around;margin-top:6px;">
      <div style="text-align:center;">
        <div style="font-size:11px;color:var(--text-muted);">⏰ Retards</div>
        <div style="font-size:22px;font-weight:700;color:${allRet.length > 0 ? '#f87171' : 'var(--text-muted)'};">${allRet.length}</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:11px;color:var(--text-muted);">🛞 Mentor</div>
        <div style="font-size:22px;font-weight:700;color:${allMentor.length > 0 ? '#f87171' : 'var(--text-muted)'};">${allMentor.length}</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:11px;color:var(--text-muted);">📦 Concessions</div>
        <div style="font-size:22px;font-weight:700;color:${allConc.length > 0 ? '#f87171' : 'var(--text-muted)'};">${allConc.length}</div>
      </div>
    </div>`;
  wrap.appendChild(yearCard);

  // ── Détail par semaine ──
  const weeksTitle = document.createElement('div');
  weeksTitle.style.cssText = 'font-size:14px;font-weight:700;margin:16px 0 8px;';
  weeksTitle.textContent = '📅 Détail par semaine';
  wrap.appendChild(weeksTitle);

  if (!weeks.length && !allMentor.length) {
    wrap.appendChild(portalCard('✅', 'Rapport', 'Rien à signaler', 'Aucun retard, impact mentor ou concession enregistré'));
    return wrap;
  }

  // Collect all weeks including mentor weeks
  const mentorWeeks = new Set();
  allMentor.forEach(m => {
    const d = new Date(m.date);
    const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7));
    const ys = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
    const wn = Math.ceil(((dt - ys) / 864e5 + 1) / 7);
    mentorWeeks.add(dt.getUTCFullYear() + '-S' + String(wn).padStart(2, '0'));
  });
  const allWeeksSorted = [...new Set([...weeks, ...mentorWeeks])].sort().reverse();

  allWeeksSorted.forEach(week => {
    const wRet = allRet.filter(r => r._week === week);
    const wConc = allConc.filter(c => c._week === week);
    const wMentor = allMentor.filter(m => {
      const d = new Date(m.date);
      const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7));
      const ys = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
      const wn = Math.ceil(((dt - ys) / 864e5 + 1) / 7);
      return (dt.getUTCFullYear() + '-S' + String(wn).padStart(2, '0')) === week;
    });

    if (!wRet.length && !wConc.length && !wMentor.length) return;

    const card = document.createElement('div');
    card.className = 'portal-card';
    card.style.cssText += 'text-align:left;align-items:stretch;gap:6px;';

    let html = `<div style="font-weight:700;font-size:14px;color:var(--accent);">📅 ${esc(week)}</div>`;

    // Retards
    if (wRet.length) {
      html += `<div style="font-size:12px;font-weight:700;color:#f87171;margin-top:4px;">⏰ Retards (${wRet.length})</div>`;
      wRet.forEach(r => {
        html += `<div style="font-size:12px;padding:3px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;">
          <span>${fmtShort(r.date)} — <strong>${r.duree} min</strong></span>
          <span style="color:var(--text-muted);font-size:11px;">${esc(r.comment || '')}</span></div>`;
      });
    }

    // Mentor
    if (wMentor.length) {
      html += `<div style="font-size:12px;font-weight:700;color:#f87171;margin-top:4px;">🛞 Mentor (${wMentor.length})</div>`;
      html += `<div style="font-size:11px;color:var(--text-muted);margin-bottom:2px;">Score inférieur à 810 sans 5 étoiles trajet</div>`;
      wMentor.forEach(m => {
        html += `<div style="font-size:12px;padding:3px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;">
          <span>${fmtShort(m.date)} — Score : <strong>${m.mentor}</strong> · Trajet : ${m.trajet}★</span>
          ${m.faute ? `<span style="color:#f97316;font-size:11px;">${esc(m.faute)}</span>` : ''}</div>`;
      });
    }

    // Concessions
    if (wConc.length) {
      html += `<div style="font-size:12px;font-weight:700;color:#f87171;margin-top:4px;">📦 Concessions (${wConc.length})</div>`;
      wConc.forEach(c => {
        html += `<div style="font-size:12px;padding:3px 0;border-bottom:1px solid var(--border);">
          <span style="font-family:monospace;font-size:11px;">${esc(c.tracking)}</span>
          ${c.statutLivraison ? ` <span style="color:var(--text-muted);font-size:10px;">· ${esc(c.statutLivraison)}</span>` : ''}</div>`;
      });
    }

    card.innerHTML = html;
    wrap.appendChild(card);
  });

  return wrap;
}
