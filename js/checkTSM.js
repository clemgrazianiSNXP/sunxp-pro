/* js/checkTSM.js — Tableau simplifié des heures pour Check TSM (SunXP Pro) */
console.log('checkTSM.js chargé');

let checkTSMDate = new Date();

function renderCheckTSM() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:12px;';

  const stationId = window.getActiveStationId ? window.getActiveStationId() : null;
  if (!stationId) {
    wrap.innerHTML = '<p style="color:var(--text-muted);">Sélectionnez une station.</p>';
    return wrap;
  }

  // Navigation par date
  const nav = document.createElement('div');
  nav.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:12px;';
  const btnPrev = document.createElement('button');
  btnPrev.className = 'h-btn h-nav'; btnPrev.textContent = '◀';
  const lbl = document.createElement('span');
  lbl.style.cssText = 'font-size:13px;font-weight:600;min-width:200px;text-align:center;';
  lbl.textContent = checkTSMDate.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const btnNext = document.createElement('button');
  btnNext.className = 'h-btn h-nav'; btnNext.textContent = '▶';
  const btnToday = document.createElement('button');
  btnToday.className = 'h-btn'; btnToday.textContent = "Aujourd'hui";
  nav.appendChild(btnPrev); nav.appendChild(lbl); nav.appendChild(btnNext); nav.appendChild(btnToday);
  wrap.appendChild(nav);

  // Zone de contenu dynamique
  const contentZone = document.createElement('div');
  contentZone.id = 'checktsm-content';
  wrap.appendChild(contentZone);

  function renderContent() {
    lbl.textContent = checkTSMDate.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    contentZone.innerHTML = '';
    contentZone.appendChild(buildCheckTSMContent(stationId));
  }

  btnPrev.onclick = () => { checkTSMDate.setDate(checkTSMDate.getDate() - 1); renderContent(); };
  btnNext.onclick = () => { checkTSMDate.setDate(checkTSMDate.getDate() + 1); renderContent(); };
  btnToday.onclick = () => { checkTSMDate = new Date(); renderContent(); };

  renderContent();
  return wrap;
}

function buildCheckTSMContent(stationId) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:12px;';

  // Charger les données du jour
  const dk = dateKey(checkTSMDate);
  const key = stationId + '-heures-' + dk;
  let dayData = null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) dayData = JSON.parse(raw);
  } catch (_) {}

  const rows = dayData && dayData.rows ? Object.values(dayData.rows).filter(r => r.nom && r.nom.trim()) : [];

  if (!rows.length) {
    wrap.innerHTML += '<p style="color:var(--text-muted);text-align:center;margin-top:20px;">Aucune donnée pour cette date.</p>';
    return wrap;
  }

  // Clé de validation
  const validKey = stationId + '-checktsm-' + dk;
  let validData = {};
  try { const raw = localStorage.getItem(validKey); if (raw) validData = JSON.parse(raw); } catch (_) {}

  // Barre de recherche
  const searchInp = document.createElement('input');
  searchInp.type = 'text'; searchInp.placeholder = '🔍 Rechercher un chauffeur...';
  searchInp.className = 'rep-search'; searchInp.style.cssText = 'width:300px;margin-bottom:8px;';
  wrap.appendChild(searchInp);

  // Tableau
  const tableWrap = document.createElement('div');
  tableWrap.style.cssText = 'overflow-x:auto;';
  const table = document.createElement('table');
  table.className = 'h-table';
  table.style.cssText = 'font-size:11px;width:100%;';

  const cols = ['Chauffeur','Vague','Début Pause','Pause','Fin Pause','Retour','Travail','Backups','Astreinte','Chime','Safety','Validé'];
  table.innerHTML = '<thead><tr>' + cols.map(c => `<th style="padding:5px 4px;white-space:nowrap;font-size:10px;">${c}</th>`).join('') + '</tr></thead>';

  const tbody = document.createElement('tbody');
  rows.forEach(r => {
    const isSpecial = ['Astreinte','Chime','Safety'].includes(r.statut);
    const isAbsent = r.statut === 'Absent';

    // Calcul temps de travail
    let travail = '';
    if (!isSpecial && !isAbsent && r.heureVague && r.retourDepot) {
      const min = typeof calcTravail === 'function' ? calcTravail(r.heureVague, r.retourDepot, r.pause || 45, r.backups) : null;
      travail = min != null && typeof minToTime === 'function' ? minToTime(min) : '';
    }

    // Fin de pause
    let finPause = '';
    if (!isSpecial && r.heurePause && r.pause && typeof timeToMin === 'function' && typeof minToTime === 'function') {
      const hp = timeToMin(r.heurePause);
      if (hp != null) finPause = minToTime(hp + parseInt(r.pause || 45));
    }

    // Backups
    const bu = (!isSpecial && r.backups) ? r.backups : '';
    // Astreinte / Chime / Safety — seulement la colonne concernée
    const astreinte = r.statut === 'Astreinte' ? (r.specialTravail || '2:00') : '';
    const chime = r.statut === 'Chime' ? (r.specialTravail || '5:00') : '';
    const safety = r.statut === 'Safety' ? (r.specialTravail || '2:00') : '';

    const checked = validData[r.nom] ? 'checked' : '';
    const rowColor = isAbsent ? 'opacity:0.4;' : r.statut === 'Astreinte' ? 'background:#2a2a00;' : r.statut === 'Chime' ? 'background:#0a1a3a;' : r.statut === 'Safety' ? 'background:#0a2a3a;' : '';

    const tr = document.createElement('tr');
    tr.style.cssText = rowColor;
    tr.innerHTML = `
      <td style="padding:3px 4px;text-align:center;white-space:nowrap;">${r.nom}</td>
      <td style="padding:3px 4px;text-align:center;">${(isAbsent || isSpecial) ? '—' : (r.heureVague || '')}</td>
      <td style="padding:3px 4px;text-align:center;">${(isAbsent || isSpecial) ? '—' : (r.heurePause || '')}</td>
      <td style="padding:3px 4px;text-align:center;">${(isAbsent || isSpecial) ? '—' : (r.pause || '')}</td>
      <td style="padding:3px 4px;text-align:center;">${(isAbsent || isSpecial) ? '—' : finPause}</td>
      <td style="padding:3px 4px;text-align:center;">${(isAbsent || isSpecial) ? '—' : (r.retourDepot || '')}</td>
      <td style="padding:3px 4px;text-align:center;font-weight:600;">${isAbsent ? 'ABS' : isSpecial ? '—' : travail}</td>
      <td style="padding:3px 4px;text-align:center;color:#f97316;">${bu}</td>
      <td style="padding:3px 4px;text-align:center;color:#fbbf24;">${astreinte}</td>
      <td style="padding:3px 4px;text-align:center;color:#1e3a8a;">${chime}</td>
      <td style="padding:3px 4px;text-align:center;color:#38bdf8;">${safety}</td>
      <td style="padding:3px 4px;text-align:center;"><input type="checkbox" class="tsm-valid-cb" data-nom="${r.nom}" ${checked}></td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  wrap.appendChild(tableWrap);

  // Résumé
  const total = rows.length;
  const validated = Object.values(validData).filter(Boolean).length;
  const summary = document.createElement('div');
  summary.style.cssText = 'font-size:11px;color:var(--text-muted);text-align:right;';
  summary.textContent = `${validated}/${total} validés`;
  wrap.appendChild(summary);

  // Bind search
  searchInp.oninput = () => {
    const q = searchInp.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    tableWrap.querySelectorAll('tbody tr').forEach(tr => {
      const name = (tr.firstElementChild?.textContent || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      tr.style.display = name.includes(q) ? '' : 'none';
    });
  };

  // Bind checkboxes
  setTimeout(() => {
    wrap.querySelectorAll('.tsm-valid-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        validData[cb.dataset.nom] = cb.checked;
        try { localStorage.setItem(validKey, JSON.stringify(validData)); } catch (_) {}
        // Mettre à jour le résumé
        const v = Object.values(validData).filter(Boolean).length;
        summary.textContent = `${v}/${total} validés`;
      });
    });
  }, 0);

  return wrap;
}

// refreshCheckTSM n'est plus nécessaire — la navigation est gérée en interne
