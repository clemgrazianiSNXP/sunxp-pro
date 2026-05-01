/* js/heures.js — Onglet Heures (SunXP Pro) */
console.log('heures.js chargé');

const VAGUE_COLORS = ['#2d1f4e', '#1a3a2a', '#1a2a3e', '#3a2a1a', '#1a3a3a', '#2a1a3a', '#3a1a2a', '#1a2a2a']; // 8 couleurs distinctes
const STATUTS = ['Présent', 'Absent', 'Astreinte', 'Chime', 'Safety'];

let heuresCurrentDate = new Date();
let heuresView = 'jour'; // 'jour' | 'semaine' | 'mois'
let heuresFirstRender = true;

/* ── Point d'entrée ───────────────────────────────────────── */
function initHeures() {
  heuresCurrentDate = new Date();
  heuresView = 'jour';
  renderHeures();
}

/* ── Rendu principal ──────────────────────────────────────── */
function renderHeures() {
  const container = document.getElementById('module-heures');
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText = 'display:flex;flex-direction:column;align-items:stretch;padding:0;overflow:hidden;';

  const stationId = window.getActiveStationId ? window.getActiveStationId() : 'default';
  const chauffeurs = getChauffeurs(stationId);

  container.appendChild(buildToolbar(stationId));

  if (heuresView === 'semaine') {
    container.appendChild(buildWeekView(stationId, chauffeurs));
    return;
  }
  if (heuresView === 'mois') {
    container.appendChild(buildMonthView(stationId, chauffeurs));
    return;
  }

  const key = stationId + '-heures-' + dateKey(heuresCurrentDate);
  const saved = loadDay(key);
  const rows = buildRowData(chauffeurs, saved);

  const body = document.createElement('div');
  body.style.cssText = 'display:flex;flex:1;overflow:hidden;';

  const tableWrap = document.createElement('div');
  tableWrap.style.cssText = 'flex:1;overflow:auto;';
  tableWrap.appendChild(buildTable(rows, key, stationId));
  body.appendChild(tableWrap);

  const dash = document.createElement('div');
  dash.style.cssText = 'width:260px;overflow-y:auto;border-left:1px solid var(--border);flex-shrink:0;';
  dash.innerHTML = renderDashboard(saved && saved.dashboard, rows);
  body.appendChild(dash);

  container.appendChild(body);

  bindDashboard(() => saveDay(key, rows, stationId), rows, dateLabel(heuresCurrentDate), stationId);
}

/* ── Données heures supplémentaires semaine précédente ──── */
function getOvertimeData(stationId, referenceDate) {
  const monday = getMondayOf(referenceDate);
  const prevMonday = new Date(monday);
  prevMonday.setDate(prevMonday.getDate() - 7);

  const chauffeurs = getChauffeurs(stationId);
  return chauffeurs
    .map(c => {
      const nom = (c.prenom + ' ' + c.nom).trim();
      const { totalMin } = calcWeekTotal(stationId, nom, prevMonday);
      const supMin = totalMin - 2100;
      return { nom, supMin };
    })
    .filter(e => e.supMin > 0)
    .sort((a, b) => b.supMin - a.supMin);
}

/* ── Données chauffeurs proches des 35h (semaine en cours) ── */
function getNear35hData(stationId, referenceDate) {
  const monday = getMondayOf(referenceDate);
  const chauffeurs = getChauffeurs(stationId);
  const SEUIL = 30 * 60; // 30h = alerte jaune
  return chauffeurs
    .map(c => {
      const nom = (c.prenom + ' ' + c.nom).trim();
      const { totalMin } = calcWeekTotal(stationId, nom, monday);
      return { nom, totalMin, heures: minToTime(totalMin) };
    })
    .filter(e => e.totalMin >= SEUIL && e.totalMin < 2100)
    .sort((a, b) => b.totalMin - a.totalMin);
}

/* ── Popup alerte heures supplémentaires ──────────────────── */
function showOvertimePopup(button, data) {
  // Fermer toute popup existante
  document.querySelectorAll('.h-alerte-popup').forEach(p => p.remove());

  const popup = document.createElement('div');
  popup.className = 'h-alerte-popup';

  // Positionnement fixe sous le bouton, aligné à droite pour ne pas déborder
  const rect = button.getBoundingClientRect();
  popup.style.top = (rect.bottom + 4) + 'px';
  popup.style.right = (window.innerWidth - rect.right) + 'px';

  // Titre
  const title = document.createElement('div');
  title.className = 'h-alerte-popup-title';
  title.textContent = 'H.S Semaine -1';
  popup.appendChild(title);

  if (!data || data.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'h-alerte-popup-empty';
    empty.textContent = 'Aucune heure supp. la semaine dernière';
    popup.appendChild(empty);
  } else {
    data.forEach(item => {
      const row = document.createElement('div');
      row.className = 'h-alerte-popup-item';
      const nom = document.createElement('span');
      nom.className = 'h-alerte-nom';
      nom.textContent = item.nom;
      const heures = document.createElement('span');
      heures.className = 'h-alerte-heures';
      heures.textContent = '+' + minToTime(item.supMin);
      row.appendChild(nom);
      row.appendChild(heures);
      popup.appendChild(row);
    });
  }

  document.body.appendChild(popup);

  // Fermeture au clic extérieur (même pattern que showStatutMenu)
  setTimeout(() => document.addEventListener('click', function handler(e) {
    if (!popup.contains(e.target) && e.target !== button) {
      popup.remove();
      document.removeEventListener('click', handler);
    }
  }), 0);
}

/* ── Toolbar ──────────────────────────────────────────────── */
function buildToolbar(stationId) {
  const bar = document.createElement('div');
  bar.className = 'h-toolbar';
  bar.innerHTML = `
    <div class="h-toolbar-left">
      <button class="h-view-btn ${heuresView === 'jour' ? 'h-view-active' : ''}" id="h-view-jour">Jour</button>
      <button class="h-view-btn ${heuresView === 'semaine' ? 'h-view-active' : ''}" id="h-view-semaine">Semaine</button>
      <button class="h-view-btn ${heuresView === 'mois' ? 'h-view-active' : ''}" id="h-view-mois">Mois</button>
    </div>
    <div class="h-toolbar-center">
      <button class="h-btn h-nav" id="h-prev">◀</button>
      <span class="h-date-label" id="h-date-label">${getViewDateLabel()}</span>
      <button class="h-btn h-nav" id="h-next">▶</button>
      <button class="h-btn" id="h-today">${heuresView === 'semaine' ? 'Semaine en cours' : heuresView === 'mois' ? 'Mois en cours' : "Aujourd'hui"}</button>
    </div>
    <div class="h-toolbar-right"></div>
  `;
  bar.querySelector('#h-prev').onclick = () => { navigate(-1); };
  bar.querySelector('#h-next').onclick = () => { navigate(1); };
  bar.querySelector('#h-today').onclick = () => { heuresCurrentDate = new Date(); renderHeures(); };
  bar.querySelector('#h-view-jour').onclick = () => { heuresFirstRender = true; heuresView = 'jour'; renderHeures(); };
  bar.querySelector('#h-view-semaine').onclick = () => { heuresFirstRender = true; heuresView = 'semaine'; renderHeures(); };
  bar.querySelector('#h-view-mois').onclick = () => { heuresFirstRender = true; heuresView = 'mois'; renderHeures(); };

  // Bulle d'alerte heures supplémentaires semaine précédente
  const overtimeData = getOvertimeData(stationId, heuresCurrentDate);
  const btn = document.createElement('button');
  btn.className = 'h-btn';
  btn.textContent = 'Alerte H.S week -1';
  if (overtimeData.length > 0) {
    btn.textContent = `⚠ ${overtimeData.length} H.S WEEK -1`;
    btn.style.cssText += 'background:rgba(248,113,113,0.15);border-color:#f87171;color:#f87171;font-size:11px;';
  } else {
    btn.style.cssText += 'font-size:11px;opacity:0.4;';
    btn.textContent = '✓ H.S WEEK -1';
  }
  btn.addEventListener('click', () => showOvertimePopup(btn, overtimeData));
  bar.querySelector('.h-toolbar-right').appendChild(btn);

  // Bulle alerte proche 35h (jaune)
  const near35h = getNear35hData(stationId, heuresCurrentDate);
  const btn35 = document.createElement('button');
  btn35.className = 'h-btn';
  btn35.textContent = `⚠ ${near35h.length} proche 35h`;
  if (near35h.length > 0) {
    btn35.style.cssText += 'background:rgba(251,191,36,0.15);border-color:#fbbf24;color:#fbbf24;font-size:11px;';
  } else {
    btn35.style.cssText += 'font-size:11px;opacity:0.4;';
    btn35.textContent = '✓ 35h OK';
  }
  btn35.addEventListener('click', () => showNear35hPopup(btn35, near35h));
  bar.querySelector('.h-toolbar-right').appendChild(btn35);

  return bar;
}

function showNear35hPopup(button, data) {
  document.querySelectorAll('.h-near35h-popup').forEach(p => p.remove());
  const popup = document.createElement('div');
  popup.className = 'h-near35h-popup';
  popup.style.cssText = 'position:fixed;z-index:9999;background:var(--bg-sidebar);border:1px solid var(--border);border-radius:8px;min-width:240px;max-height:300px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,0.45);padding:8px 0;font-size:12px;';
  const rect = button.getBoundingClientRect();
  popup.style.top = (rect.bottom + 4) + 'px';
  popup.style.right = (window.innerWidth - rect.right) + 'px';
  const title = document.createElement('div');
  title.style.cssText = 'padding:4px 12px 8px;font-size:11px;font-weight:700;color:#fbbf24;text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--border);margin-bottom:4px;';
  title.textContent = 'PROCHES DES 35H (semaine en cours)';
  popup.appendChild(title);
  if (!data.length) {
    const p = document.createElement('div');
    p.style.cssText = 'padding:10px 12px;color:var(--text-muted);text-align:center;';
    p.textContent = 'Aucun chauffeur proche des 35h.';
    popup.appendChild(p);
  } else {
    data.forEach(d => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;padding:5px 12px;';
      row.innerHTML = `<span>${d.nom}</span><span style="font-weight:700;color:#fbbf24;">${d.heures}</span>`;
      popup.appendChild(row);
    });
  }
  document.body.appendChild(popup);
  setTimeout(() => document.addEventListener('click', function handler(e) {
    if (!popup.contains(e.target) && e.target !== button) { popup.remove(); document.removeEventListener('click', handler); }
  }), 0);
}

function navigate(delta) {
  heuresFirstRender = true;
  if (heuresView === 'semaine') heuresCurrentDate.setDate(heuresCurrentDate.getDate() + delta * 7);
  else if (heuresView === 'mois') heuresCurrentDate.setMonth(heuresCurrentDate.getMonth() + delta);
  else heuresCurrentDate.setDate(heuresCurrentDate.getDate() + delta);
  renderHeures();
}

function getViewDateLabel() {
  if (heuresView === 'semaine') {
    const monday = getMondayOf(heuresCurrentDate);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const fmt = d => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    return 'Semaine du ' + fmt(monday) + ' au ' + fmt(sunday) + ' ' + sunday.getFullYear();
  }
  if (heuresView === 'mois') {
    return heuresCurrentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }
  return dateLabel(heuresCurrentDate);
}

/* ── Données chauffeurs ───────────────────────────────────── */

/**
 * Charge la liste du répertoire — utilisée UNIQUEMENT pour la liste déroulante.
 * Ne génère jamais les lignes du tableau des heures.
 */
function getChauffeurs(stationId) {
  try {
    const raw = localStorage.getItem(stationId + '-repertoire');
    if (raw) { const arr = JSON.parse(raw); if (arr && arr.length) return arr; }
  } catch (_) {}
  return [];
}

function buildRowData(chauffeurs, saved) {
  // Toujours 80 lignes vides — les chauffeurs du répertoire
  // apparaissent uniquement dans la liste déroulante, jamais ici.
  const EMPTY_ROWS = 80;
  return Array.from({ length: EMPTY_ROWS }, (_, i) => {
    const key = 'ligne_' + (i + 1);
    const s = (saved && saved.rows && saved.rows[key]) || {};
    const hasNom = !!(s.nom && s.nom.trim());
    return {
      key, nom: s.nom || '', nomEditable: true,
      statut: s.statut || 'Présent',
      heureVague: s.heureVague || '',
      pause: s.pause != null && s.pause !== '' ? s.pause : 45,
      heurePause: s.heurePause || '', secteur: s.secteur || '',
      retourDepot: s.retourDepot || '', backups: s.backups || '',
      mentor: s.mentor || '', trajet: s.trajet || '',
      essence: s.essence || false, adblue: s.adblue || false,
      ticket: s.ticket || false, camion: s.camion || ''
    };
  });
}

/* ── Tableau principal ────────────────────────────────────── */
function buildTable(rows, storageKey, stationId) {
  const vagueColors = assignVagueColors(rows);
  const cols = ['Chauffeur','Travail','Vague','Pause','H.Pause','Fin Pause','Secteur','Retour','Backups','Mentor','Trajet','Faute','Ess.','AdBlue','Ticket','Camion'];

  const table = document.createElement('table');
  table.className = 'h-table';
  if (heuresFirstRender) {
    table.classList.add('h-table-animate');
    heuresFirstRender = false;
  }

  const thead = document.createElement('thead');
  thead.innerHTML = '<tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr>';
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.forEach((row, idx) => {
    const tr = buildRow(row, vagueColors, storageKey, stationId, rows);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function assignVagueColors(rows) {
  const map = {};
  let ci = 0;
  rows.forEach(r => {
    if (r.heureVague && !(r.heureVague in map)) {
      map[r.heureVague] = VAGUE_COLORS[ci % VAGUE_COLORS.length];
      ci++;
    }
  });
  return map;
}

function buildRow(row, vagueColors, storageKey, stationId, allRows) {
  const tr = document.createElement('tr');
  const hasNom = row.nom && row.nom.trim() !== '';
  const isLocked = row.nomEditable && !hasNom; // ligne vide non assignée
  const isAbsent = row.statut !== 'Présent' && !['Astreinte','Chime','Safety'].includes(row.statut);
  const isSpecial = ['Astreinte','Chime','Safety'].includes(row.statut);
  const bgColor = (!isLocked && !isAbsent && !isSpecial) ? (vagueColors[row.heureVague] || '') : '';
  if (bgColor) tr.style.backgroundColor = bgColor;
  if (isAbsent || isLocked) tr.style.opacity = isLocked ? '0.35' : '0.45';
  if (row.statut === 'Astreinte') tr.style.backgroundColor = '#3a3000';
  if (row.statut === 'Chime') tr.style.backgroundColor = '#0a1a3a';
  if (row.statut === 'Safety') tr.style.backgroundColor = '#0a2a3a';

  const travailMin = calcTravail(row.heureVague, row.retourDepot, row.pause, row.backups);
  const travailStr = travailMin != null ? minToTime(travailMin) : '';
  const colorClass = travailColor(travailMin);
  const faute = hasFaute(row.mentor, row.trajet);
  const dis = (isAbsent || isLocked) ? 'disabled' : '';
  const specialDis = isSpecial ? 'disabled' : '';

  // Pour Astreinte/Chime/Safety : valeur par défaut du travail
  let specialTravail = '';
  let specialColor = '';
  if (row.statut === 'Astreinte') { specialTravail = row.specialTravail || '2:00'; specialColor = '#fbbf24'; }
  if (row.statut === 'Chime')     { specialTravail = row.specialTravail || '5:00'; specialColor = '#1e3a8a'; }
  if (row.statut === 'Safety')    { specialTravail = row.specialTravail || '2:00'; specialColor = '#38bdf8'; }

  tr.innerHTML = `
    <td class="h-td-name" style="min-width:180px;max-width:180px;width:180px;overflow:visible;">
      <span class="h-statut-icon" title="${row.statut}" style="flex-shrink:0;">${statutIcon(row.statut)}</span>
      <span class="h-nom-display" style="flex:1;overflow:hidden;"></span>
    </td>
    <td>${isSpecial ? `<input class="h-inp" data-f="specialTravail" value="${specialTravail}" style="color:${specialColor};font-weight:700;width:50px;text-align:center;" ${dis}>` : `<span class="h-travail" id="travail-${row.key}"></span>`}</td>
    <td><input class="h-inp h-calc" data-f="heureVague" value="${row.heureVague}" ${dis || specialDis}></td>
    <td><input class="h-inp h-inp-sm h-calc" data-f="pause" value="${row.pause}" ${dis || specialDis}></td>
    <td><input class="h-inp" data-f="heurePause" value="${row.heurePause}" ${dis || specialDis}></td>
    <td><span class="h-fin-pause" id="finpause-${row.key}"></span></td>
    <td><input class="h-inp" data-f="secteur" value="${row.secteur}" style="width:60px;" ${dis || specialDis}></td>
    <td><input class="h-inp h-calc" data-f="retourDepot" value="${row.retourDepot}" ${dis || specialDis}></td>
    <td><input class="h-inp h-inp-sm" data-f="backups" value="${row.backups}" style="width:40px;" ${dis || specialDis}></td>
    <td><input class="h-inp h-inp-sm" data-f="mentor" value="${row.mentor}" style="color:${mentorColor(row.mentor, row.trajet)};font-weight:700;" ${dis}></td>
    <td class="h-trajet-stars" data-key="${row.key}">${buildStarRating(row.trajet, dis)}</td>
    <td><input class="h-inp h-inp-faute" data-f="faute" value="${row.faute || ''}" placeholder="" ${dis}></td>
    <td><input type="checkbox" data-f="essence" ${row.essence ? 'checked' : ''} ${dis}></td>
    <td><input type="checkbox" data-f="adblue" ${row.adblue ? 'checked' : ''} ${dis}></td>
    <td><input type="checkbox" data-f="ticket" ${row.ticket ? 'checked' : ''} ${dis}></td>
    <td><input class="h-inp h-inp-sm" data-f="camion" value="${row.camion}" ${dis}></td>
  `;

  // Calcul temps de travail en temps réel
  function updateTravail() {
    const vague  = tr.querySelector('[data-f="heureVague"]').value.trim();
    const retour = tr.querySelector('[data-f="retourDepot"]').value.trim();
    const pause  = tr.querySelector('[data-f="pause"]').value.trim();
    const cell   = tr.querySelector('#travail-' + row.key);
    if (!cell) return;
    if (!vague || !retour || !pause) { cell.textContent = ''; cell.className = 'h-travail'; return; }
    const min = calcTravail(vague, retour, parseInt(pause), '');
    if (min == null) { cell.textContent = ''; cell.className = 'h-travail'; return; }
    cell.textContent = minToTime(min);
    cell.className = 'h-travail ' + travailColor(min);
    // Fin de pause = heure de pause + durée de pause
    const fpCell = tr.querySelector('#finpause-' + row.key);
    if (fpCell) {
      const hp = tr.querySelector('[data-f="heurePause"]').value.trim();
      if (hp && pause) {
        const hpMin = timeToMin(hp);
        if (hpMin != null) fpCell.textContent = minToTime(hpMin + parseInt(pause));
        else fpCell.textContent = '';
      } else fpCell.textContent = '';
    }
  }
  updateTravail();

  // Bouton Effacer — géré dans buildNomCell via refreshNomCell

  // Listeners inputs (champs hors nom)
  tr.querySelectorAll('.h-inp:not(.h-inp-nom)').forEach(inp => {
    const handler = () => {
      row[inp.dataset.f] = inp.value;
      if (['heureVague','retourDepot','pause','heurePause'].includes(inp.dataset.f)) updateTravail();
      // Mettre à jour la couleur du mentor en temps réel
      if (inp.dataset.f === 'mentor') {
        inp.style.color = mentorColor(row.mentor, row.trajet);
        // Auto 5 étoiles si mentor >= 810
        const m = parseInt(row.mentor);
        if (!isNaN(m) && m >= 810) {
          row.trajet = 5;
          if (starCell) { starCell.innerHTML = buildStarRating(5, ''); bindStars(); }
        }
      }
      // Auto-remplir la vague pour les lignes suivantes
      if (inp.dataset.f === 'heureVague' && inp.value.trim()) {
        const rowIdx = allRows.indexOf(row);
        const newVague = inp.value.trim();
        for (let i = rowIdx + 1; i < allRows.length; i++) {
          const r = allRows[i];
          // Si la ligne a une vague différente déjà saisie manuellement (et c'est un chauffeur assigné), on s'arrête
          if (r.nom && r.nom.trim() && r.heureVague && r.heureVague.trim() && r.heureVague.trim() !== newVague) break;
          // Remplir si vide ou si c'est l'ancienne vague
          if (!r.heureVague || r.heureVague.trim() === '' || !r.nom || !r.nom.trim()) {
            r.heureVague = newVague;
          }
        }
        saveDay(storageKey, allRows, stationId);
        renderHeures();
        return;
      }
      saveDay(storageKey, allRows, stationId);
      // Rafraîchir le dashboard si mentor ou trajet changé
      if (['mentor','trajet','faute'].includes(inp.dataset.f)) {
        const dashEl = document.querySelector('.h-dashboard');
        if (dashEl) dashEl.parentElement.innerHTML = renderDashboard(null, allRows);
        bindDashboard(() => saveDay(storageKey, allRows, stationId), allRows, dateLabel(heuresCurrentDate), stationId);
      }
    };
    inp.addEventListener('change', handler);
    // Rafraîchir le dashboard au blur du mentor aussi
    if (inp.dataset.f === 'mentor') {
      inp.addEventListener('blur', () => {
        row.mentor = inp.value;
        saveDay(storageKey, allRows, stationId);
        const dashEl = document.querySelector('.h-dashboard');
        if (dashEl) dashEl.parentElement.innerHTML = renderDashboard(null, allRows);
        bindDashboard(() => saveDay(storageKey, allRows, stationId), allRows, dateLabel(heuresCurrentDate), stationId);
      });
    }
    // Re-render les couleurs quand on quitte le champ vague
    if (inp.dataset.f === 'heureVague') {
      inp.addEventListener('blur', () => {
        row.heureVague = inp.value;
        saveDay(storageKey, allRows, stationId);
        renderHeures();
      });
    }
    inp.addEventListener('input', () => {
      if (['heureVague','retourDepot','pause'].includes(inp.dataset.f)) {
        row[inp.dataset.f] = inp.value;
        updateTravail();
      }
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handler();
        // Passer au champ suivant dans la même ligne ou la ligne suivante
        const allInputs = Array.from(tr.closest('tbody').querySelectorAll('.h-inp:not([disabled]):not(.h-inp-nom), .h-inp-sm:not([disabled])'));
        const idx = allInputs.indexOf(inp);
        if (idx >= 0 && idx < allInputs.length - 1) {
          allInputs[idx + 1].focus();
          allInputs[idx + 1].select();
        }
      }
    });
  });
  tr.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => { row[cb.dataset.f] = cb.checked; saveDay(storageKey, allRows, stationId); });
  });

  // Étoiles trajet
  const starCell = tr.querySelector('.h-trajet-stars');
  function bindStars() {
    if (!starCell) return;
    starCell.querySelectorAll('.h-star').forEach(star => {
      star.addEventListener('click', () => {
        const hasNomNow = !!(row.nom && row.nom.trim());
        if (!hasNomNow) return;
        row.trajet = parseInt(star.dataset.v);
        // Mettre à jour la couleur du mentor aussi
        const mentorInp = tr.querySelector('[data-f="mentor"]');
        if (mentorInp) mentorInp.style.color = mentorColor(row.mentor, row.trajet);
        saveDay(storageKey, allRows, stationId);
        starCell.innerHTML = buildStarRating(row.trajet, '');
        bindStars();
        // Rafraîchir le dashboard après sélection d'étoiles
        const dashEl = document.querySelector('.h-dashboard');
        if (dashEl) dashEl.parentElement.innerHTML = renderDashboard(null, allRows);
        bindDashboard(() => saveDay(storageKey, allRows, stationId), allRows, dateLabel(heuresCurrentDate), stationId);
      });
    });
  }
  bindStars();

  // Affichage nom dans la cellule
  const nomDisplay = tr.querySelector('.h-nom-display');
  function refreshNomCell() {
    nomDisplay.innerHTML = '';
    const hasNomNow = !!(row.nom && row.nom.trim());
    tr.style.opacity = hasNomNow ? '' : '0.35';
    tr.querySelectorAll('input:not(.h-inp-nom), input[type="checkbox"]').forEach(el => {
      el.disabled = !hasNomNow;
    });
    buildNomCell(nomDisplay, row, allRows, stationId, () => {
      saveDay(storageKey, allRows, stationId);
      updateTravail();
      refreshNomCell();
      // Re-binder les étoiles après sélection du nom
      starCell.innerHTML = buildStarRating(row.trajet, '');
      bindStars();
      // Focus la ligne suivante après stabilisation du DOM
      const rowIdx = allRows.indexOf(row);
      if (rowIdx >= 0) {
        window._focusNextNomRow = rowIdx + 1;
        window._skipNextNomBlur = true;
        setTimeout(() => {
          if (window._focusNextNomRow != null) {
            const tbody = tr.closest('tbody');
            if (tbody) {
              const targetTr = tbody.children[window._focusNextNomRow];
              if (targetTr) {
                const nextInp = targetTr.querySelector('.h-inp-nom');
                if (nextInp) {
                  window._skipNextNomBlur = true;
                  nextInp.focus();
                }
              }
            }
            window._focusNextNomRow = null;
          }
        }, 250);
      }
    });
  }
  refreshNomCell();

  // Clic droit / icône statut
  const icon = tr.querySelector('.h-statut-icon');
  icon.addEventListener('click', (e) => { e.stopPropagation(); showStatutMenu(e, row, storageKey, allRows, stationId); });
  tr.addEventListener('contextmenu', (e) => { e.preventDefault(); showStatutMenu(e, row, storageKey, allRows, stationId); });

  return tr;
}

/**
 * Construit la cellule nom avec autocomplete déroulant.
 */
function buildNomCell(container, row, allRows, stationId, onSelect) {
  if (!row.nomEditable) {
    container.textContent = row.nom;
    return;
  }

  function renderNomContent() {
    container.innerHTML = '';
    if (row.nom && row.nom.trim()) {
      // Nom sélectionné : afficher texte + bouton ×
      const wrap = document.createElement('span');
      wrap.style.cssText = 'display:inline-flex;align-items:center;gap:3px;max-width:150px;width:150px;';
      const txt = document.createElement('span');
      txt.textContent = row.nom;
      txt.style.cssText = 'font-size:12px;color:#e8e8f0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;';
      const clr = document.createElement('button');
      clr.textContent = '✕';
      clr.style.cssText = 'background:none;border:none;color:#f87171;cursor:pointer;font-size:13px;padding:2px 4px;flex-shrink:0;line-height:1;';
      clr.title = 'Effacer';
      clr.addEventListener('click', e => {
        e.stopPropagation();
        row.nom = ''; row.heureVague = ''; row.pause = '';
        row.heurePause = ''; row.secteur = ''; row.retourDepot = '';
        row.backups = ''; row.mentor = ''; row.trajet = '';
        row.essence = false; row.adblue = false;
        row.ticket = false; row.camion = ''; row.statut = 'Présent';
        onSelect();
      });
      wrap.appendChild(txt);
      wrap.appendChild(clr);
      container.appendChild(wrap);
      return;
    }

    // Ligne vide : champ texte avec dropdown attaché au body
    const inp = document.createElement('input');
    inp.className = 'h-inp h-inp-nom';
    inp.placeholder = 'Chauffeur...';
    inp.value = '';
    inp.style.cssText = 'width:130px;max-width:130px;text-align:left;flex-shrink:1;';
    container.appendChild(inp);

    const dropdown = document.createElement('div');
    dropdown.style.cssText = [
      'position:fixed', 'z-index:9999',
      'background:#2a2a3e', 'border:1px solid #7c6af7',
      'border-radius:6px', 'min-width:180px',
      'max-height:220px', 'overflow-y:auto',
      'box-shadow:0 6px 20px rgba(0,0,0,0.6)', 'display:none'
    ].join(';');
    document.body.appendChild(dropdown);

    let nomSelected = false;
    const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const usedNoms = new Set(allRows.filter(r => r !== row && r.nom).map(r => r.nom.trim()));

    function getRepertoire() {
      try {
        const raw = localStorage.getItem(stationId + '-repertoire');
        return raw ? JSON.parse(raw) : [];
      } catch (_) { return []; }
    }

    function positionDropdown() {
      const rect = inp.getBoundingClientRect();
      dropdown.style.top  = (rect.bottom + 2) + 'px';
      dropdown.style.left = rect.left + 'px';
      dropdown.style.minWidth = Math.max(180, rect.width) + 'px';
    }

    function showDropdown(query) {
      const repertoire = getRepertoire();
      const q = normalize(query);
      const matches = repertoire
        .map(c => (c.prenom + ' ' + c.nom).trim())
        .filter(n => n && !usedNoms.has(n) && normalize(n).includes(q))
        .slice(0, 10);

      dropdown.innerHTML = '';
      if (!matches.length) { dropdown.style.display = 'none'; return; }
      matches.forEach(name => {
        const item = document.createElement('div');
        item.textContent = name;
        item.style.cssText = 'padding:7px 12px;cursor:pointer;font-size:12px;color:#e8e8f0;white-space:nowrap;';
        item.addEventListener('mouseenter', () => item.style.background = '#3a3a5e');
        item.addEventListener('mouseleave', () => item.style.background = '');
        item.addEventListener('mousedown', e => {
          e.preventDefault();
          nomSelected = true;
          row.nom = name;
          if (!row.pause) row.pause = 45;
          dropdown.style.display = 'none';
          dropdown.remove();
          onSelect();
        });
        dropdown.appendChild(item);
      });
      positionDropdown();
      dropdown.style.display = 'block';
    }

    function hideDropdown() {
      dropdown.style.display = 'none';
    }

    inp.addEventListener('input',  () => showDropdown(inp.value));
    inp.addEventListener('focus',  () => showDropdown(inp.value));
    inp.addEventListener('blur',   () => { if (!nomSelected && !window._skipNextNomBlur) setTimeout(hideDropdown, 160); window._skipNextNomBlur = false; });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        // Sélectionner le premier élément de la dropdown s'il y en a
        const firstItem = dropdown.querySelector('div');
        if (firstItem && dropdown.style.display !== 'none') {
          const name = firstItem.textContent;
          nomSelected = true;
          row.nom = name;
          if (!row.pause) row.pause = 45;
          dropdown.style.display = 'none';
          dropdown.remove();
          onSelect();
          return;
        }
        if (inp.value.trim()) {
          nomSelected = true;
          row.nom = inp.value.trim();
          if (!row.pause) row.pause = 45;
          dropdown.style.display = 'none';
          dropdown.remove();
          onSelect();
        }
      }
      if (e.key === 'Escape') hideDropdown();
    });

    const obs = new MutationObserver(() => {
      if (!document.body.contains(inp)) { dropdown.remove(); obs.disconnect(); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  renderNomContent();
}

function buildStarRating(value, disabled) {
  const v = parseInt(value) || 0;
  let html = '';
  for (let i = 1; i <= 5; i++) {
    const filled = i <= v;
    html += `<span class="h-star" data-v="${i}" style="cursor:pointer;font-size:13px;color:${filled?'#fbbf24':'#555'};user-select:none;">★</span>`;
  }
  return html;
}

function statutIcon(s) {
  return s === 'Présent' ? '🟢' : s === 'Absent' ? '🔴' : s === 'Astreinte' ? '🟡' : s === 'Chime' ? '🔵' : s === 'Safety' ? '🩵' : '⚪';
}

function showStatutMenu(e, row, storageKey, allRows, stationId) {
  document.querySelectorAll('.h-statut-menu').forEach(m => m.remove());
  const menu = document.createElement('div');
  menu.className = 'h-statut-menu';
  menu.style.cssText = `position:fixed;top:${e.clientY}px;left:${e.clientX}px;z-index:9999;background:var(--bg-sidebar);border:1px solid var(--border);border-radius:6px;padding:4px 0;`;
  STATUTS.forEach(s => {
    const item = document.createElement('div');
    item.className = 'h-statut-item';
    item.textContent = s;
    item.style.cssText = 'padding:6px 16px;cursor:pointer;font-size:13px;';
    item.onmouseenter = () => item.style.background = 'var(--bg-tab-hover)';
    item.onmouseleave = () => item.style.background = '';
    item.onclick = () => {
      row.statut = s;
      // Pré-remplir specialTravail pour Astreinte/Chime/Safety
      if (s === 'Astreinte') row.specialTravail = row.specialTravail || '2:00';
      if (s === 'Chime')     row.specialTravail = row.specialTravail || '5:00';
      if (s === 'Safety')    row.specialTravail = row.specialTravail || '2:00';
      if (s === 'Présent' || s === 'Absent') row.specialTravail = '';
      saveDay(storageKey, allRows, stationId); renderHeures(); menu.remove();
    };
    menu.appendChild(item);
  });
  document.body.appendChild(menu);
  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 0);
}

/* ── Persistance ──────────────────────────────────────────── */
function loadDay(key) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch (_) { return null; }
}

function saveDay(key, rows, stationId) {
  const rowsObj = {};
  rows.forEach(r => { rowsObj[r.key] = r; });
  const dash = readDashboardValues ? readDashboardValues() : {};
  const data = { rows: rowsObj, dashboard: dash };
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
  // Sync vers Supabase
  if (typeof dbSave === 'function' && stationId) {
    const dateStr = key.replace(stationId + '-heures-', '');
    dbSave('heures', key, { station_id: stationId, date_jour: dateStr }, data);
  }
}

/* ── Vue semaine ──────────────────────────────────────────── */
function buildWeekView(stationId, chauffeurs) {
  const monday = getMondayOf(heuresCurrentDate);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(d.getDate() + i); return d; });
  const wrap = document.createElement('div');
  wrap.style.cssText = 'flex:1;overflow:auto;padding:16px;';

  // Barre de recherche
  const search = document.createElement('input');
  search.type = 'text'; search.placeholder = '🔍 Rechercher un chauffeur...';
  search.className = 'rep-search'; search.style.cssText = 'margin-bottom:10px;width:300px;';
  wrap.appendChild(search);

  const tableDiv = document.createElement('div');
  wrap.appendChild(tableDiv);

  function renderTable(query) {
    const q = (query||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const filtered = chauffeurs.filter(c => (c.prenom+' '+c.nom).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q));
    let html = `<h2 style="margin-bottom:12px;font-size:1rem;color:var(--text-muted)">Semaine du ${dateLabel(monday)}</h2>`;
    html += '<table class="h-table"><thead><tr><th>Chauffeur</th>' + days.map(d => `<th>${d.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric'})}</th>`).join('') + '<th>Total</th><th>Backups</th><th>Astreinte</th><th>Chime</th><th>Safety</th><th>Sup. 35h</th><th>Jours</th><th>Abs.</th></tr></thead><tbody>';
    filtered.forEach(c => {
      const ck = (c.prenom + ' ' + c.nom).trim();
      const { totalMin, joursTravailes, backupsMin, astreinteMin, chimeMin, safetyMin, absences } = calcWeekTotal(stationId, ck, monday);
      const sup = Math.max(0, totalMin - 35 * 60);
    html += `<tr><td>${c.nom} ${c.prenom}</td>`;
    days.forEach(d => {
      const key = stationId + '-heures-' + dateKey(d);
      try {
        const raw = localStorage.getItem(key);
        const data = raw ? JSON.parse(raw) : null;
        const row = data && data.rows ? Object.values(data.rows).find(r => r.nom && r.nom.trim() === ck) : null;
        const t = row ? calcTravail(row.heureVague, row.retourDepot, row.pause || 45, row.backups) : null;
        html += `<td>${t != null && t > 0 ? minToTime(t) : '—'}</td>`;
      } catch (_) { html += '<td>—</td>'; }
    });
    html += `<td><b>${minToTime(totalMin)}</b></td><td style="color:#f97316">${backupsMin>0?minToTime(backupsMin):'—'}</td><td style="color:#fbbf24">${astreinteMin>0?minToTime(astreinteMin):'—'}</td><td style="color:#1e3a8a">${chimeMin>0?minToTime(chimeMin):'—'}</td><td style="color:#38bdf8">${safetyMin>0?minToTime(safetyMin):'—'}</td><td style="color:${sup>0?'#f97316':'var(--text-muted)'}">${sup > 0 ? '+' + minToTime(sup) : '—'}</td><td>${joursTravailes}</td><td style="color:${absences>0?'#f87171':'var(--text-muted)'}">${absences>0?absences:'—'}</td></tr>`;
    });
    html += '</tbody></table>';
    tableDiv.innerHTML = html;
  }
  search.oninput = () => renderTable(search.value);
  renderTable('');
  return wrap;
}

/* ── Vue mois ─────────────────────────────────────────────── */
function buildMonthView(stationId, chauffeurs) {
  const y = heuresCurrentDate.getFullYear();
  const m = heuresCurrentDate.getMonth();
  const wrap = document.createElement('div');
  wrap.style.cssText = 'flex:1;overflow:auto;padding:16px;';
  const monthName = heuresCurrentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const search = document.createElement('input');
  search.type = 'text'; search.placeholder = '🔍 Rechercher un chauffeur...';
  search.className = 'rep-search'; search.style.cssText = 'margin-bottom:10px;width:300px;';
  wrap.appendChild(search);
  const tableDiv = document.createElement('div');
  wrap.appendChild(tableDiv);

  function renderTable(query) {
    const q = (query||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const filtered = chauffeurs.filter(c => (c.prenom+' '+c.nom).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q));
    let html = `<h2 style="margin-bottom:12px;font-size:1rem;color:var(--text-muted)">Mois de ${monthName}</h2>`;
    html += '<table class="h-table"><thead><tr><th>Chauffeur</th><th>Total heures</th><th>Backups</th><th>Astreinte</th><th>Chime</th><th>Safety</th><th>Sup. 35h/sem</th><th>Jours travaillés</th><th>Abs.</th></tr></thead><tbody>';
    filtered.forEach(c => {
      const ck = (c.prenom + ' ' + c.nom).trim();
      const { totalMin, joursTravailes, backupsMin, astreinteMin, chimeMin, safetyMin, absences } = calcMonthTotal(stationId, ck, y, m);
      const weeksInMonth = Math.ceil(new Date(y, m + 1, 0).getDate() / 7);
      const sup = Math.max(0, totalMin - weeksInMonth * 35 * 60);
      html += `<tr><td>${c.nom} ${c.prenom}</td><td><b>${minToTime(totalMin)}</b></td><td style="color:#f97316">${backupsMin>0?minToTime(backupsMin):'—'}</td><td style="color:#fbbf24">${astreinteMin>0?minToTime(astreinteMin):'—'}</td><td style="color:#1e3a8a">${chimeMin>0?minToTime(chimeMin):'—'}</td><td style="color:#38bdf8">${safetyMin>0?minToTime(safetyMin):'—'}</td><td style="color:${sup>0?'#f97316':'var(--text-muted)'}">${sup > 0 ? '+' + minToTime(sup) : '—'}</td><td>${joursTravailes}</td><td style="color:${absences>0?'#f87171':'var(--text-muted)'}">${absences>0?absences:'—'}</td></tr>`;
    });
    html += '</tbody></table>';
    tableDiv.innerHTML = html;
  }
  search.oninput = () => renderTable(search.value);
  renderTable('');
  return wrap;
}
