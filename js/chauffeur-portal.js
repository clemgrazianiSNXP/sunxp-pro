/* js/chauffeur-portal.js — Portail chauffeur mobile (SunXP Pro) */
console.log('chauffeur-portal.js chargé');

let portalChauffeur = null;
let portalStationId = null;
let portalTab = 'heures';
let portalMonth = new Date();
let portalStatsWeekIndex = 0;

/* ── Init ─────────────────────────────────────────────────── */
function initChauffeurPortal(chauffeur, stationId) {
  portalChauffeur = chauffeur;
  portalStationId = stationId;
  portalTab = 'heures';
  portalMonth = new Date();
  portalStatsWeekIndex = 0;
  // Initialiser le Realtime pour recevoir les notifications
  if (typeof initRealtime === 'function') setTimeout(initRealtime, 500);
  renderPortal();
}

/* ── Rendu principal ──────────────────────────────────────── */
function renderPortal() {
  const c = document.getElementById('chauffeur-portal');
  if (!c) return;
  c.innerHTML = '';
  c.style.cssText = 'display:flex;flex-direction:column;min-height:100vh;background:var(--bg-primary);color:var(--text-primary);';

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'padding:20px 16px 16px;background:linear-gradient(135deg, var(--bg-sidebar), var(--bg-tab-active));border-bottom:2px solid var(--accent);text-align:center;';
  const prenom = portalChauffeur.prenom || '';
  const nomComplet = (prenom + ' ' + (portalChauffeur.nom || '')).trim();
  header.innerHTML = `
    <div style="font-size:28px;margin-bottom:4px;">👋</div>
    <div style="font-size:20px;font-weight:700;margin-bottom:2px;">Bonjour ${escP(prenom)} !</div>
    <div style="font-size:13px;color:var(--text-muted);margin-bottom:2px;">${escP(nomComplet)}</div>
    <div style="font-size:11px;color:var(--text-muted);opacity:0.7;">Station ${escP(portalStationId)} · ${escP(portalChauffeur.id_amazon)}</div>
    <button id="portal-logout" style="margin-top:10px;background:transparent;border:1px solid var(--border);color:var(--text-muted);border-radius:6px;padding:6px 16px;font-size:12px;cursor:pointer;transition:all 0.18s;">← Déconnexion</button>`;
  c.appendChild(header);

  // Onglets
  const tabs = document.createElement('div');
  tabs.style.cssText = 'display:flex;background:var(--bg-sidebar);border-bottom:1px solid var(--border);overflow-x:auto;';
  const tabDefs = [
    ['heures','⏱','Mes Heures'],
    ['stats','📊','Mes Stats'],
    ['prime','💰','Ma Prime'],
    ['prod','📋','Ma Prod'],
    ['degats','🔧','Mes Dégâts'],
    ['rapport','📋','Mon Rapport'],
    ['badges','🏆','Mes Badges']
  ];
  tabDefs.forEach(([id, icon, label]) => {
    const btn = document.createElement('button');
    const isActive = portalTab === id;
    btn.style.cssText = `flex:1;padding:12px 6px 10px;border:none;border-bottom:3px solid ${isActive?'var(--accent)':'transparent'};background:${isActive?'var(--accent-dim)':'transparent'};color:${isActive?'var(--accent)':'var(--text-muted)'};font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;display:flex;flex-direction:column;align-items:center;gap:2px;transition:all 0.18s;`;
    btn.innerHTML = `<span style="font-size:18px;">${icon}</span><span>${label}</span>`;
    btn.onclick = () => { portalTab = id; renderPortal(); };
    tabs.appendChild(btn);
  });
  c.appendChild(tabs);

  // Contenu
  const body = document.createElement('div');
  body.style.cssText = 'flex:1;overflow:auto;padding:16px;';
  if (portalTab === 'heures') body.appendChild(portalHeures());
  else if (portalTab === 'stats') body.appendChild(portalStats());
  else if (portalTab === 'prime') body.appendChild(portalPrime());
  else if (portalTab === 'degats' && typeof portalDegats === 'function') body.appendChild(portalDegats());
  else if (portalTab === 'rapport' && typeof portalRapport === 'function') body.appendChild(portalRapport());
  else if (portalTab === 'badges' && typeof renderBadgesTab === 'function') body.appendChild(renderBadgesTab());
  else body.appendChild(portalProd());
  c.appendChild(body);

  // Logout
  c.querySelector('#portal-logout')?.addEventListener('click', () => {
    portalChauffeur = null;
    c.hidden = true;
    if (typeof showToolbar === 'function') showToolbar(false);
    if (typeof closeMenuPanel === 'function') closeMenuPanel();
    document.getElementById('role-screen').hidden = false;
  });
}

/* ── Helpers ───────────────────────────────────────────────── */
function escP(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function portalCard(icon, label, value, extra, borderColor) {
  const card = document.createElement('div');
  card.className = 'portal-card';
  if (borderColor) card.style.borderColor = borderColor;
  card.style.cssText += 'display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px;';
  let html = '';
  if (icon) html += `<div style="font-size:24px;">${icon}</div>`;
  html += `<div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;font-weight:600;">${label}</div>`;
  html += `<div style="font-size:22px;font-weight:700;">${value}</div>`;
  if (extra) html += `<div style="font-size:11px;color:var(--text-muted);text-align:center;">${extra}</div>`;
  card.innerHTML = html;
  return card;
}

/* ── Semaines d'un mois ───────────────────────────────────── */
function getWeeksOfMonth(year, month) {
  const weeks = [];
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  let monday = getMondayOf(firstDay);
  while (monday <= lastDay) {
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    weeks.push({ monday: new Date(monday), sunday: new Date(sunday), weekNum: isoWeekNumber(monday) });
    monday.setDate(monday.getDate() + 7);
  }
  return weeks;
}

function isoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

/* ── Navigation mensuelle ─────────────────────────────────── */
function buildMonthNav(label, onPrev, onNext) {
  const nav = document.createElement('div');
  nav.className = 'portal-month-nav';
  const btnPrev = document.createElement('button');
  btnPrev.className = 'portal-nav-btn'; btnPrev.textContent = '◀'; btnPrev.addEventListener('click', onPrev);
  const span = document.createElement('span');
  span.className = 'portal-nav-label'; span.textContent = label;
  const btnNext = document.createElement('button');
  btnNext.className = 'portal-nav-btn'; btnNext.textContent = '▶'; btnNext.addEventListener('click', onNext);
  nav.appendChild(btnPrev); nav.appendChild(span); nav.appendChild(btnNext);
  return nav;
}

/* ── Heures du mois ───────────────────────────────────────── */
function portalHeures() {
  const wrap = document.createElement('div');
  const nom = (portalChauffeur.prenom + ' ' + portalChauffeur.nom).trim();
  const year = portalMonth.getFullYear();
  const month = portalMonth.getMonth();
  const frMonths = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const monthLabel = frMonths[month] + ' ' + year;

  wrap.appendChild(buildMonthNav(monthLabel, () => { portalMonth.setMonth(portalMonth.getMonth() - 1); renderPortal(); }, () => { portalMonth.setMonth(portalMonth.getMonth() + 1); renderPortal(); }));

  // Titre explicite
  const title = document.createElement('div');
  title.style.cssText = 'text-align:center;margin-bottom:14px;';
  title.innerHTML = `<div style="font-size:15px;font-weight:700;">⏱ Mes heures de travail</div><div style="font-size:12px;color:var(--text-muted);">Détail semaine par semaine</div>`;
  wrap.appendChild(title);

  const weeks = getWeeksOfMonth(year, month);
  weeks.forEach(w => {
    const wt = calcWeekTotal(portalStationId, nom, w.monday);
    const card = document.createElement('div');
    card.className = 'portal-card';
    card.style.cssText += 'text-align:left;align-items:stretch;gap:8px;';
    const monStr = String(w.monday.getDate()).padStart(2,'0') + '/' + String(w.monday.getMonth()+1).padStart(2,'0');
    const sunStr = String(w.sunday.getDate()).padStart(2,'0') + '/' + String(w.sunday.getMonth()+1).padStart(2,'0');
    const heuresColor = wt.totalMin > 0 ? 'var(--accent)' : 'var(--text-muted)';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-weight:700;font-size:14px;">📅 Semaine ${w.weekNum}</span>
        <span style="font-size:11px;color:var(--text-muted);">${monStr} → ${sunStr}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <span style="font-size:13px;">Heures travaillées</span>
        <span style="font-size:18px;font-weight:700;color:${heuresColor};">${minToTime(wt.totalMin) || '0:00'}</span>
      </div>
      <div style="font-size:12px;color:var(--text-muted);">${wt.joursTravailes} jour${wt.joursTravailes !== 1 ? 's' : ''} travaillé${wt.joursTravailes !== 1 ? 's' : ''}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--text-muted);margin-top:2px;">
        <span>🔄 Backups : ${wt.backupsMin > 0 ? minToTime(wt.backupsMin) : '—'}</span>
        <span>📞 Astreinte : ${wt.astreinteMin > 0 ? minToTime(wt.astreinteMin) : '—'}</span>
      </div>`;
    wrap.appendChild(card);
  });

  // Total mensuel
  const mt = calcMonthTotal(portalStationId, nom, year, month);
  const totalCard = document.createElement('div');
  totalCard.className = 'portal-card';
  totalCard.style.cssText += 'border-color:var(--accent);border-width:2px;background:var(--accent-dim);';
  totalCard.innerHTML = `
    <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:var(--accent);">📊 Total du mois</div>
    <div style="font-size:28px;font-weight:700;color:var(--accent);">${minToTime(mt.totalMin) || '0:00'}</div>
    <div style="font-size:13px;">${mt.joursTravailes} jour${mt.joursTravailes !== 1 ? 's' : ''} travaillé${mt.joursTravailes !== 1 ? 's' : ''}</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:11px;color:var(--text-muted);margin-top:4px;">
      <span>🔄 Backups : ${mt.backupsMin > 0 ? minToTime(mt.backupsMin) : '—'}</span>
      <span>📞 Astreinte : ${mt.astreinteMin > 0 ? minToTime(mt.astreinteMin) : '—'}</span>
    </div>`;
  wrap.appendChild(totalCard);
  return wrap;
}

/* ── Stats ────────────────────────────────────────────────── */
function portalStats() {
  const wrap = document.createElement('div');
  const id = portalChauffeur.id_amazon.replace(/\s/g,'').toUpperCase();

  const allWeeks = [...new Set([
    ...getWeeksList('dsdpmo'), ...getWeeksList('pod'), ...getWeeksList('dwc')
  ])].sort().reverse();

  const title = document.createElement('div');
  title.style.cssText = 'text-align:center;margin-bottom:14px;';
  title.innerHTML = `<div style="font-size:15px;font-weight:700;">📊 Mes statistiques qualité</div><div style="font-size:12px;color:var(--text-muted);">Vos scores DS, POD et DWC par semaine</div>`;
  wrap.appendChild(title);

  if (!allWeeks.length) {
    wrap.appendChild(portalCard('📭', 'Statistiques', 'Aucune donnée', 'Les stats apparaîtront quand votre responsable les importera.'));
    return wrap;
  }

  if (portalStatsWeekIndex < 0) portalStatsWeekIndex = 0;
  if (portalStatsWeekIndex >= allWeeks.length) portalStatsWeekIndex = allWeeks.length - 1;
  const selectedWeek = allWeeks[portalStatsWeekIndex];

  wrap.appendChild(buildMonthNav('Semaine ' + selectedWeek, () => {
    if (portalStatsWeekIndex < allWeeks.length - 1) { portalStatsWeekIndex++; renderPortal(); }
  }, () => {
    if (portalStatsWeekIndex > 0) { portalStatsWeekIndex--; renderPortal(); }
  }));

  const dsdpmoData = loadStatsData('dsdpmo', selectedWeek);
  const podData    = loadStatsData('pod', selectedWeek);
  const dwcData    = loadStatsData('dwc', selectedWeek);
  const dsdpmoRow = dsdpmoData.find(r => r.idAmazon.replace(/\s/g,'').toUpperCase() === id);
  const podRow    = podData.find(r => r.idAmazon.replace(/\s/g,'').toUpperCase() === id);
  const dwcRow    = dwcData.find(r => r.idAmazon.replace(/\s/g,'').toUpperCase() === id);

  if (!dsdpmoRow && !podRow && !dwcRow) {
    wrap.appendChild(portalCard('🔍', 'Aucune donnée', '—', 'Pas de stats vous concernant pour cette semaine.'));
    return wrap;
  }

  if (dsdpmoRow) {
    const dcrColor = parseFloat(dsdpmoRow.dcrPct) >= 98 ? '#4ade80' : parseFloat(dsdpmoRow.dcrPct) >= 95 ? '#f59e0b' : '#f87171';
    const card = document.createElement('div'); card.className = 'portal-card';
    card.style.cssText += 'text-align:left;align-items:stretch;gap:6px;';
    card.innerHTML = `
      <div style="font-weight:700;font-size:14px;">📦 Delivery Success (DS/DPMO)</div>
      <div style="font-size:12px;color:var(--text-muted);">Taux de livraison réussie et colis non livrés</div>
      <div style="display:flex;justify-content:space-around;margin-top:4px;">
        <div style="text-align:center;"><div style="font-size:10px;color:var(--text-muted);">DCR</div><div style="font-size:20px;font-weight:700;color:${dcrColor};">${dsdpmoRow.dcrPct}%</div></div>
        <div style="text-align:center;"><div style="font-size:10px;color:var(--text-muted);">DPMO</div><div style="font-size:20px;font-weight:700;">${dsdpmoRow.dnrDpmo}</div></div>
        <div style="text-align:center;"><div style="font-size:10px;color:var(--text-muted);">DNR</div><div style="font-size:20px;font-weight:700;color:#f87171;">${dsdpmoRow.nombreDnr}</div></div>
      </div>`;
    wrap.appendChild(card);
  }

  if (podRow) {
    const podColor = parseFloat(podRow.podPct) >= 98 ? '#4ade80' : parseFloat(podRow.podPct) >= 95 ? '#f59e0b' : '#f87171';
    const card = document.createElement('div'); card.className = 'portal-card';
    card.style.cssText += 'text-align:left;align-items:stretch;gap:6px;';
    card.innerHTML = `
      <div style="font-weight:700;font-size:14px;">📸 Photo de livraison (POD)</div>
      <div style="font-size:12px;color:var(--text-muted);">Qualité des photos prises à la livraison</div>
      <div style="display:flex;justify-content:space-around;margin-top:4px;">
        <div style="text-align:center;"><div style="font-size:10px;color:var(--text-muted);">Score POD</div><div style="font-size:20px;font-weight:700;color:${podColor};">${podRow.podPct}%</div></div>
        <div style="text-align:center;"><div style="font-size:10px;color:var(--text-muted);">Opportunités</div><div style="font-size:20px;font-weight:700;">${podRow.opportunities}</div></div>
        <div style="text-align:center;"><div style="font-size:10px;color:var(--text-muted);">Rejetées</div><div style="font-size:20px;font-weight:700;color:#f87171;">${podRow.rejects}</div></div>
      </div>`;
    wrap.appendChild(card);
  }

  if (dwcRow) {
    const dwcColor = parseFloat(dwcRow.dwcPct) >= 98 ? '#4ade80' : parseFloat(dwcRow.dwcPct) >= 95 ? '#f59e0b' : '#f87171';
    const card = document.createElement('div'); card.className = 'portal-card';
    card.style.cssText += 'text-align:left;align-items:stretch;gap:6px;';
    card.innerHTML = `
      <div style="font-weight:700;font-size:14px;">📞 Contact client (DWC)</div>
      <div style="font-size:12px;color:var(--text-muted);">Tentatives de contact quand le client est absent</div>
      <div style="display:flex;justify-content:space-around;margin-top:4px;">
        <div style="text-align:center;"><div style="font-size:10px;color:var(--text-muted);">Score DWC</div><div style="font-size:20px;font-weight:700;color:${dwcColor};">${dwcRow.dwcPct}%</div></div>
        <div style="text-align:center;"><div style="font-size:10px;color:var(--text-muted);">Contacts manqués</div><div style="font-size:20px;font-weight:700;color:#f87171;">${dwcRow.contactMiss}</div></div>
      </div>`;
    wrap.appendChild(card);
  }

  return wrap;
}

/* ── Prime ────────────────────────────────────────────────── */
function portalPrime() {
  const wrap = document.createElement('div');
  const year = portalMonth.getFullYear();
  const month = portalMonth.getMonth();
  const key = portalChauffeur.id || portalChauffeur.id_amazon;
  const frMonths = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const monthLabel = frMonths[month] + ' ' + year;

  wrap.appendChild(buildMonthNav(monthLabel, () => { portalMonth.setMonth(portalMonth.getMonth() - 1); renderPortal(); }, () => { portalMonth.setMonth(portalMonth.getMonth() + 1); renderPortal(); }));

  const title = document.createElement('div');
  title.style.cssText = 'text-align:center;margin-bottom:14px;';
  title.innerHTML = `<div style="font-size:15px;font-weight:700;">💰 Ma prime du mois</div><div style="font-size:12px;color:var(--text-muted);">Détail de votre prime et des éventuels impacts</div>`;
  wrap.appendChild(title);

  const data = loadPrimesData(portalStationId, year, month);
  const row = data[key] || {};
  if (typeof countJoursTravailles === 'function') row.jours = countJoursTravailles(portalStationId, portalChauffeur, year, month);
  const reports = getReportPrecedent(portalStationId, year, month);
  const report = reports[key] || 0;
  const total = calcTotalPrime(row, report);
  const base = getPrimeBase(row.jours || 0);
  const impacts = getImpactsList(row);

  // Prime de base
  wrap.appendChild(portalCard('💵', 'Prime de base', base + '€', `Calculée sur ${row.jours || 0} jour${(row.jours||0) !== 1 ? 's' : ''} travaillé${(row.jours||0) !== 1 ? 's' : ''}`));

  // Jours travaillés
  wrap.appendChild(portalCard('📅', 'Jours travaillés', String(row.jours || 0), 'Nombre de jours où vous avez travaillé ce mois'));

  // Report
  if (report < 0) {
    wrap.appendChild(portalCard('⚠️', 'Report mois précédent', report + '€', 'Montant reporté du mois dernier', '#f87171'));
  }

  // Impacts
  if (impacts.length) {
    const impCard = document.createElement('div'); impCard.className = 'portal-card';
    impCard.style.cssText += 'text-align:left;align-items:stretch;gap:6px;border-color:#f87171;';
    let impHtml = '<div style="font-weight:700;font-size:14px;color:#f87171;">⚠️ Impacts sur votre prime</div>';
    impHtml += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Ces éléments réduisent votre prime ce mois-ci</div>';
    impacts.forEach(i => {
      const commentHtml = i.comment ? `<div style="font-size:11px;color:var(--text-muted);padding-left:4px;">→ ${escP(i.comment)}</div>` : '';
      impHtml += `<div style="padding:4px 0;border-bottom:1px solid var(--border);">
        <div style="display:flex;justify-content:space-between;font-size:13px;">
          <span>${escP(i.label)}</span><span style="font-weight:700;color:#f87171;">-${i.montant}€</span></div>${commentHtml}</div>`;
    });
    impCard.innerHTML = impHtml;
    wrap.appendChild(impCard);
  } else {
    wrap.appendChild(portalCard('✅', 'Impacts', 'Aucun', 'Bravo ! Aucun impact sur votre prime ce mois-ci', '#4ade80'));
  }

  // Total
  const totalColor = total < 0 ? '#f87171' : '#4ade80';
  const totalCard = document.createElement('div'); totalCard.className = 'portal-card';
  totalCard.style.cssText += `border-color:${totalColor};border-width:2px;background:${total >= 0 ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)'};`;
  totalCard.innerHTML = `
    <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">💰 Total de votre prime</div>
    <div style="font-size:32px;font-weight:700;color:${totalColor};">${total}€</div>
    <div style="font-size:11px;color:var(--text-muted);">Montant estimé pour ${frMonths[month]} ${year}</div>`;
  wrap.appendChild(totalCard);

  return wrap;
}

/* ── Productivité ─────────────────────────────────────────── */
function portalProd() {
  const wrap = document.createElement('div');
  const year = portalMonth.getFullYear();
  const month = portalMonth.getMonth();
  const sid = portalStationId;
  const frMonths = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const monthLabel = frMonths[month] + ' ' + year;

  wrap.appendChild(buildMonthNav(monthLabel, () => { portalMonth.setMonth(portalMonth.getMonth() - 1); renderPortal(); }, () => { portalMonth.setMonth(portalMonth.getMonth() + 1); renderPortal(); }));

  const title = document.createElement('div');
  title.style.cssText = 'text-align:center;margin-bottom:14px;';
  title.innerHTML = `<div style="font-size:15px;font-weight:700;">📋 Ma productivité</div><div style="font-size:12px;color:var(--text-muted);">Vos arrêts et performance de livraison</div>`;
  wrap.appendChild(title);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let totalArrets = 0, totalArH = 0, jours = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const key = sid + '-activite-' + date.toISOString().slice(0, 10);
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw);
      const route = (data.routes || []).find(r => r.chauffeur && r.chauffeur.toLowerCase().includes(portalChauffeur.prenom.toLowerCase()));
      if (!route) continue;
      totalArrets += route.arrets || 0;
      totalArH += Math.round((route.arrets || 0) / 7.25);
      jours++;
    } catch (_) {}
  }
  const moyArH = jours > 0 ? Math.round(totalArH / jours) : 0;

  // Couleur selon performance
  const moyColor = moyArH >= 20 ? '#4ade80' : moyArH >= 15 ? '#f59e0b' : moyArH > 0 ? '#f87171' : 'var(--text-muted)';

  wrap.appendChild(portalCard('⚡', 'Moyenne arrêts par heure', String(moyArH), jours > 0 ? `Votre moyenne sur ${jours} jour${jours !== 1 ? 's' : ''} ce mois` : 'Pas encore de données ce mois'));

  wrap.appendChild(portalCard('📦', 'Total arrêts du mois', String(totalArrets), `Nombre total d'arrêts effectués en ${frMonths[month]}`));

  wrap.appendChild(portalCard('📅', "Jours d'activité", String(jours), `Nombre de jours où vous avez eu une route en ${frMonths[month]}`));

  return wrap;
}
