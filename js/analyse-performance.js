/* js/analyse-performance.js — Onglet Analyse & Performance (SunXP Pro) */
console.log('analyse-performance.js chargé');

function renderAnalysePerformance() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:16px;overflow-y:auto;';

  wrap.innerHTML = '<h3 style="font-size:14px;margin-bottom:4px;color:var(--accent);">📊 Analyse Chauffeurs</h3>';

  const stationId = window.getActiveStationId ? window.getActiveStationId() : null;
  if (!stationId) {
    wrap.innerHTML += '<p style="color:var(--text-muted);font-size:13px;">Sélectionnez une station pour voir les analyses.</p>';
    return wrap;
  }

  let chauffeurs = [];
  try {
    const raw = localStorage.getItem(stationId + '-repertoire');
    if (raw) chauffeurs = JSON.parse(raw);
  } catch (_) {}

  if (!chauffeurs.length) {
    wrap.innerHTML += '<p style="color:var(--text-muted);font-size:13px;">Aucun chauffeur dans le répertoire.</p>';
    return wrap;
  }

  // Sous-onglets : Chauffeurs / Récurrences
  const tabBar = document.createElement('div');
  tabBar.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;';
  const tabChauffeurs = document.createElement('button');
  tabChauffeurs.className = 'h-btn rh-tab-active';
  tabChauffeurs.textContent = '👤 Chauffeurs';
  const tabRecurrences = document.createElement('button');
  tabRecurrences.className = 'h-btn';
  tabRecurrences.textContent = '🔁 Récurrences impacts';
  tabBar.appendChild(tabChauffeurs);
  tabBar.appendChild(tabRecurrences);
  wrap.appendChild(tabBar);

  const contentArea = document.createElement('div');
  wrap.appendChild(contentArea);

  function showTab(tab) {
    contentArea.innerHTML = '';
    tabChauffeurs.className = 'h-btn' + (tab === 'chauffeurs' ? ' rh-tab-active' : '');
    tabRecurrences.className = 'h-btn' + (tab === 'recurrences' ? ' rh-tab-active' : '');
    if (tab === 'chauffeurs') {
      renderChauffeurTab(contentArea, stationId, chauffeurs);
    } else {
      renderRecurrencesTab(contentArea, stationId);
    }
  }

  tabChauffeurs.onclick = () => showTab('chauffeurs');
  tabRecurrences.onclick = () => showTab('recurrences');
  showTab('chauffeurs');

  return wrap;
}

function renderChauffeurTab(wrap, stationId, chauffeurs) {
  // Barre de recherche chauffeur
  const searchWrap = document.createElement('div');
  searchWrap.style.cssText = 'position:relative;margin-bottom:8px;';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = '🔍 Rechercher un chauffeur...';
  searchInput.className = 'analyse-search';
  searchWrap.appendChild(searchInput);
  wrap.appendChild(searchWrap);

  // Grille de mini-cards — 3 par ligne, petits carrés
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:6px;';

  // Zone détail (courbes) — affichée au clic sur une card
  const detailArea = document.createElement('div');
  detailArea.id = 'analyse-detail-area';

  chauffeurs.forEach(c => {
    const nom = (c.prenom + ' ' + c.nom).trim();
    const card = document.createElement('div');
    card.className = 'analyse-mini-card';
    card.dataset.nom = nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const initials = (c.prenom ? c.prenom[0] : '') + (c.nom ? c.nom[0] : '');
    card.innerHTML = `
      <span class="analyse-mini-initials">${initials.toUpperCase()}</span>
      <span class="analyse-mini-nom">${c.prenom}</span>
    `;
    card.onclick = () => {
      grid.querySelectorAll('.analyse-mini-card').forEach(el => el.classList.remove('active'));
      card.classList.add('active');
      detailArea.innerHTML = '';
      renderChauffeurCurves(detailArea, stationId, nom, c);
    };
    grid.appendChild(card);
  });

  wrap.appendChild(grid);

  // Filtrage par recherche
  searchInput.oninput = () => {
    const q = searchInput.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    grid.querySelectorAll('.analyse-mini-card').forEach(card => {
      const nom = card.dataset.nom || '';
      card.style.display = nom.includes(q) ? '' : 'none';
    });
  };

  wrap.appendChild(detailArea);
}

/** Collecte les données stats d'un chauffeur sur toutes les semaines disponibles */
function collectChauffeurStats(stationId, chauffeur) {
  let chauffeurId = '';
  try {
    chauffeurId = (chauffeur.id_amazon || '').replace(/\s/g, '').toUpperCase();
  } catch (_) {}

  let allWeeks = [];
  try {
    const weekSet = new Set();
    ['dsdpmo', 'pod', 'dwc'].forEach(type => {
      if (typeof getWeeksList === 'function') getWeeksList(type).forEach(w => weekSet.add(w));
    });
    allWeeks = [...weekSet].sort();
  } catch (_) {}

  return allWeeks.map(week => {
    const entry = { week, dcr: null, dpmo: null, pod: null, dwc: null };
    try {
      if (typeof loadStatsData !== 'function') return entry;
      const dsdpmo = loadStatsData('dsdpmo', week);
      const row = dsdpmo.find(r => r.idAmazon && r.idAmazon.replace(/\s/g, '').toUpperCase() === chauffeurId);
      if (row) { entry.dcr = parseFloat(row.dcrPct) || 0; entry.dpmo = parseFloat(row.dnrDpmo) || 0; }
      const pod = loadStatsData('pod', week);
      const podRow = pod.find(r => r.idAmazon && r.idAmazon.replace(/\s/g, '').toUpperCase() === chauffeurId);
      if (podRow) entry.pod = parseFloat(podRow.podPct) || 0;
      const dwc = loadStatsData('dwc', week);
      const dwcRow = dwc.find(r => r.idAmazon && r.idAmazon.replace(/\s/g, '').toUpperCase() === chauffeurId);
      if (dwcRow) entry.dwc = parseFloat(dwcRow.dwcPct) || 0;
    } catch (_) {}
    return entry;
  }).slice(-12); // 12 dernières semaines
}

/** Affiche les courbes SVG pour un chauffeur */
function renderChauffeurCurves(container, stationId, nom, chauffeur) {
  const data = collectChauffeurStats(stationId, chauffeur);

  if (!data.length || data.every(d => d.dcr === null && d.pod === null && d.dwc === null)) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:8px;">Aucune donnée pour ce chauffeur.</p>';
    return;
  }

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:14px;margin-top:12px;';
  wrap.innerHTML = `<h4 style="font-size:13px;color:var(--text-primary);margin:0;">📈 ${nom}</h4>`;

  // Une courbe par stat
  const curves = [
    { key: 'dcr', label: 'DCR %', color: '#4ade80', max: 100 },
    { key: 'pod', label: 'POD %', color: '#60a5fa', max: 100 },
    { key: 'dwc', label: 'DWC %', color: '#f97316', max: 100 },
    { key: 'dpmo', label: 'DPMO', color: '#f87171', max: null }
  ];

  curves.forEach(curve => {
    const values = data.map(d => d[curve.key]);
    if (values.every(v => v === null)) return;
    const card = document.createElement('div');
    card.className = 'analyse-curve-card';
    card.innerHTML = `<span class="analyse-curve-label">${curve.label}</span>`;
    card.appendChild(buildSvgCurve(values, data.map(d => d.week), curve.color, curve.max));
    wrap.appendChild(card);
  });

  // Courbe heures supp par mois
  const hsData = collectMonthlyOvertime(stationId, nom);
  if (hsData.values.length && !hsData.values.every(v => v === 0)) {
    const hsCard = document.createElement('div');
    hsCard.className = 'analyse-curve-card';
    hsCard.innerHTML = '<span class="analyse-curve-label">⏱ Heures Supp / Mois</span>';
    hsCard.appendChild(buildSvgCurve(hsData.values, hsData.labels, '#fbbf24', null));
    wrap.appendChild(hsCard);
  }

  container.appendChild(wrap);
}

/** Construit une courbe SVG à partir d'un tableau de valeurs */
function buildSvgCurve(values, labels, color, fixedMax) {
  const W = 320, H = 160, PAD_L = 32, PAD_R = 12, PAD_T = 20, PAD_B = 22;
  const plotW = W - PAD_L - PAD_R, plotH = H - PAD_T - PAD_B;

  const validVals = values.filter(v => v !== null);
  const maxVal = fixedMax || Math.max(...validVals, 1);
  const minVal = fixedMax ? 0 : Math.min(...validVals, 0);
  const range = maxVal - minVal || 1;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', H);
  svg.style.cssText = 'display:block;';

  // Grille horizontale + labels axe Y
  for (let i = 0; i <= 4; i++) {
    const y = PAD_T + (plotH / 4) * i;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', PAD_L); line.setAttribute('x2', W - PAD_R);
    line.setAttribute('y1', y); line.setAttribute('y2', y);
    line.setAttribute('stroke', 'rgba(255,255,255,0.06)'); line.setAttribute('stroke-width', '1');
    svg.appendChild(line);
    const val = maxVal - (range / 4) * i;
    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', PAD_L - 4); txt.setAttribute('y', y + 3);
    txt.setAttribute('text-anchor', 'end'); txt.setAttribute('font-size', '8');
    txt.setAttribute('fill', '#9090b0');
    txt.textContent = Math.round(val * 10) / 10;
    svg.appendChild(txt);
  }

  // Points et courbe
  const points = [];
  const step = values.length > 1 ? plotW / (values.length - 1) : 0;

  values.forEach((v, i) => {
    if (v === null) return;
    const x = PAD_L + step * i;
    const y = PAD_T + plotH - ((v - minVal) / range) * plotH;
    points.push({ x, y, val: v, label: labels[i] });
  });

  if (points.length > 1) {
    // Aire sous la courbe
    const areaPath = `M${points[0].x},${PAD_T + plotH} ` +
      points.map(p => `L${p.x},${p.y}`).join(' ') +
      ` L${points[points.length - 1].x},${PAD_T + plotH} Z`;
    const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    area.setAttribute('d', areaPath);
    area.setAttribute('fill', color); area.setAttribute('opacity', '0.12');
    svg.appendChild(area);

    // Ligne de la courbe
    const linePath = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ',' + p.y).join(' ');
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('d', linePath);
    line.setAttribute('fill', 'none'); line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '2'); line.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(line);
  }

  // Points + valeurs affichées au-dessus
  points.forEach(p => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', p.x); circle.setAttribute('cy', p.y);
    circle.setAttribute('r', '3.5'); circle.setAttribute('fill', color);
    circle.setAttribute('stroke', '#12121a'); circle.setAttribute('stroke-width', '1.5');
    svg.appendChild(circle);

    // Valeur affichée directement au-dessus du point
    const valTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    valTxt.setAttribute('x', p.x); valTxt.setAttribute('y', p.y - 7);
    valTxt.setAttribute('text-anchor', 'middle'); valTxt.setAttribute('font-size', '8');
    valTxt.setAttribute('font-weight', '600'); valTxt.setAttribute('fill', color);
    valTxt.textContent = Math.round(p.val * 10) / 10;
    svg.appendChild(valTxt);

    // Tooltip
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = p.label + ' : ' + p.val;
    circle.appendChild(title);
  });

  // Labels axe X
  if (points.length <= 12) {
    points.forEach((p, i) => {
      if (i % 2 !== 0 && points.length > 8) return;
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', p.x); txt.setAttribute('y', H - 4);
      txt.setAttribute('text-anchor', 'middle'); txt.setAttribute('font-size', '7');
      txt.setAttribute('fill', '#9090b0');
      txt.textContent = p.label.replace(/^\d{4}-/, '');
      svg.appendChild(txt);
    });
  }

  return svg;
}

/** Collecte les heures supp par mois (12 derniers mois) pour un chauffeur */
function collectMonthlyOvertime(stationId, chauffeurNom) {
  const frMonths = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'];
  const now = new Date();
  const labels = [];
  const values = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear(), m = d.getMonth();
    labels.push(frMonths[m] + ' ' + String(y).slice(2));

    // Calculer les heures totales du mois via calcMonthTotal si disponible
    let supMin = 0;
    if (typeof calcMonthTotal === 'function') {
      const mt = calcMonthTotal(stationId, chauffeurNom, y, m);
      // Nombre de semaines dans le mois (approximatif)
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const weeksInMonth = Math.ceil(daysInMonth / 7);
      supMin = Math.max(0, mt.totalMin - weeksInMonth * 35 * 60);
    }
    // Convertir en heures décimales pour la courbe
    values.push(Math.round(supMin / 60 * 10) / 10);
  }

  return { labels, values };
}

/** Onglet Récurrences — chauffeurs avec impacts consécutifs (POD/DWC/DNR) */
function renderRecurrencesTab(container, stationId) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:16px;';

  // Collecter toutes les semaines triées chronologiquement
  const weekSet = new Set();
  ['pod', 'dwc', 'dsdpmo'].forEach(type => {
    if (typeof getWeeksList === 'function') getWeeksList(type).forEach(w => weekSet.add(w));
  });
  const allWeeks = [...weekSet].sort();

  if (!allWeeks.length) {
    wrap.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">Aucune donnée de statistiques disponible.</p>';
    container.appendChild(wrap); return;
  }

  // Pour chaque chauffeur, construire un tableau semaine par semaine : impacté ou non
  // Puis calculer le streak consécutif actuel et le max streak historique
  function buildStreaks(weeklyImpacts) {
    // weeklyImpacts = { nom: { week: score } }
    const results = []; // { nom, currentStreak, maxStreak, impactWeeks: [{week, score}], totalImpacts }
    Object.entries(weeklyImpacts).forEach(([nom, weekMap]) => {
      let currentStreak = 0, maxStreak = 0, streakWeeks = [];
      const impactWeeks = [];
      allWeeks.forEach(week => {
        if (weekMap[week] !== undefined) {
          currentStreak++;
          streakWeeks.push({ week, score: weekMap[week] });
          impactWeeks.push({ week, score: weekMap[week] });
          if (currentStreak > maxStreak) maxStreak = currentStreak;
        } else {
          currentStreak = 0;
          streakWeeks = [];
        }
      });
      if (currentStreak >= 2) {
        results.push({ nom, currentStreak, maxStreak, streakWeeks, impactWeeks, totalImpacts: impactWeeks.length });
      }
    });
    return results.sort((a, b) => b.currentStreak - a.currentStreak);
  }

  // POD < 98%
  const podImpacts = {};
  allWeeks.forEach(week => {
    const data = typeof loadStatsData === 'function' ? loadStatsData('pod', week) : [];
    data.forEach(r => {
      if (parseFloat(r.podPct) < 98) {
        const nom = typeof resolveDriver === 'function' ? (resolveDriver(r.idAmazon)?.nom || r.idAmazon) : r.idAmazon;
        if (!podImpacts[nom]) podImpacts[nom] = {};
        podImpacts[nom][week] = r.podPct + '%';
      }
    });
  });

  // DWC < 85%
  const dwcImpacts = {};
  allWeeks.forEach(week => {
    const data = typeof loadStatsData === 'function' ? loadStatsData('dwc', week) : [];
    data.forEach(r => {
      if (parseFloat(r.dwcPct) < 85) {
        const nom = typeof resolveDriver === 'function' ? (resolveDriver(r.idAmazon)?.nom || r.idAmazon) : r.idAmazon;
        if (!dwcImpacts[nom]) dwcImpacts[nom] = {};
        dwcImpacts[nom][week] = r.dwcPct + '%';
      }
    });
  });

  // DNR >= 3 (concessions/impacts depuis DS DPMO)
  const dnrImpacts = {};
  allWeeks.forEach(week => {
    const data = typeof loadStatsData === 'function' ? loadStatsData('dsdpmo', week) : [];
    data.forEach(r => {
      const dnr = parseInt(r.nombreDnr) || 0;
      if (dnr >= 3) {
        const nom = typeof resolveDriver === 'function' ? (resolveDriver(r.idAmazon)?.nom || r.idAmazon) : r.idAmazon;
        if (!dnrImpacts[nom]) dnrImpacts[nom] = {};
        dnrImpacts[nom][week] = dnr + ' DNR';
      }
    });
  });

  const podStreaks = buildStreaks(podImpacts);
  const dwcStreaks = buildStreaks(dwcImpacts);
  const dnrStreaks = buildStreaks(dnrImpacts);

  // Titre
  wrap.innerHTML = `<div style="text-align:center;margin-bottom:4px;">
    <div style="font-size:14px;font-weight:700;color:var(--text-primary);">🔁 Récurrences d'impacts</div>
    <div style="font-size:11px;color:var(--text-muted);">Chauffeurs avec 2+ semaines consécutives en impact · ${allWeeks.length} semaines analysées</div>
  </div>`;

  function renderSection(title, color, icon, streaks, type) {
    const section = document.createElement('div');
    section.innerHTML = `<div style="font-size:13px;font-weight:700;color:${color};margin-bottom:8px;">${icon} ${title}</div>`;
    if (!streaks.length) {
      section.innerHTML += '<p style="color:var(--text-muted);font-size:12px;font-style:italic;">Aucune récurrence en cours ✓</p>';
    } else {
      streaks.forEach(s => {
        const card = document.createElement('div');
        card.style.cssText = `padding:10px 12px;background:var(--bg-sidebar);border:1px solid var(--border);border-left:3px solid ${color};border-radius:8px;margin-bottom:8px;cursor:pointer;transition:border-color 0.2s,box-shadow 0.2s;`;
        card.onmouseenter = () => { card.style.borderColor = color; card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'; };
        card.onmouseleave = () => { card.style.borderColor = 'var(--border)'; card.style.borderLeftColor = color; card.style.boxShadow = ''; };
        card.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-weight:600;font-size:13px;">${s.nom}</span>
            <span style="font-size:12px;font-weight:700;color:${color};">⚠️ ${s.currentStreak} sem. d'affilée</span>
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Total impacts : ${s.totalImpacts} · Pire série : ${s.maxStreak} sem.</div>`;
        card.onclick = () => showRecurrenceDetail(s, type, color, icon);
        section.appendChild(card);
      });
    }
    wrap.appendChild(section);
  }

  renderSection('POD < 98%', '#60a5fa', '📸', podStreaks, 'POD');
  renderSection('DWC < 85%', '#f97316', '📞', dwcStreaks, 'DWC');
  renderSection('DNR ≥ 3 (Concessions)', '#f87171', '📦', dnrStreaks, 'DNR');

  container.appendChild(wrap);
}

function showRecurrenceDetail(s, type, color, icon) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;';
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card,var(--bg-sidebar));border-radius:12px;padding:20px;max-width:500px;width:90%;max-height:80vh;overflow:auto;box-shadow:0 8px 32px rgba(0,0,0,0.4);';

  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
    <h3 style="margin:0;font-size:16px;">${icon} ${s.nom}</h3>
    <button class="h-btn" onclick="this.closest('div[style*=fixed]').remove()">✕</button>
  </div>`;

  html += `<div style="display:flex;gap:12px;margin-bottom:14px;">
    <div style="text-align:center;padding:8px 14px;background:var(--bg-tab-active);border-radius:8px;">
      <div style="font-size:10px;color:var(--text-muted);">Série actuelle</div>
      <div style="font-size:20px;font-weight:700;color:${color};">⚠️ ${s.currentStreak}</div>
    </div>
    <div style="text-align:center;padding:8px 14px;background:var(--bg-tab-active);border-radius:8px;">
      <div style="font-size:10px;color:var(--text-muted);">Pire série</div>
      <div style="font-size:20px;font-weight:700;">${s.maxStreak}</div>
    </div>
    <div style="text-align:center;padding:8px 14px;background:var(--bg-tab-active);border-radius:8px;">
      <div style="font-size:10px;color:var(--text-muted);">Total impacts</div>
      <div style="font-size:20px;font-weight:700;">${s.totalImpacts}</div>
    </div>
  </div>`;

  // Streak actuel
  html += `<div style="font-size:12px;font-weight:700;color:${color};margin-bottom:6px;">Série en cours (${s.currentStreak} sem.)</div>`;
  html += '<div style="margin-bottom:12px;">';
  s.streakWeeks.forEach(w => {
    html += `<div style="padding:4px 8px;border-left:2px solid ${color};margin-bottom:3px;font-size:12px;background:var(--bg-tab-hover);border-radius:4px;">
      <b>S${w.week}</b> — ${w.score}</div>`;
  });
  html += '</div>';

  // Historique complet
  html += '<div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:6px;">Historique complet</div>';
  html += '<div style="max-height:150px;overflow:auto;">';
  s.impactWeeks.forEach(w => {
    const isInStreak = s.streakWeeks.some(sw => sw.week === w.week);
    html += `<div style="padding:3px 8px;font-size:11px;color:${isInStreak ? color : 'var(--text-muted)'};border-bottom:1px solid var(--border);">
      S${w.week} — ${w.score} ${isInStreak ? '⚠️' : ''}</div>`;
  });
  html += '</div>';

  modal.innerHTML = html;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
