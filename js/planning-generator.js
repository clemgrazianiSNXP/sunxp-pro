/* js/planning-generator.js — Générateur automatique de planning (SunXP Pro) */
console.log('planning-generator.js chargé');

/**
 * Génère le planning RSTD pour les chauffeurs et formateurs.
 * 
 * Règles :
 * - Objectif RSTD par jour = CAPAMAX * 1.07 (arrondi sup)
 * - Max 5 jours travaillés par semaine classique (lun-dim)
 * - Max 5 jours travaillés par semaine Amazon (dim-sam)
 * - Éviter 5 jours consécutifs (soft constraint)
 * - Ne pas écraser les cellules déjà remplies
 * - Uniquement pour rôles Chauffeur et Formateur
 * - Ne génère que si CAPAMAX est renseigné pour le jour
 * 
 * @param {string} stationId
 * @param {number} year
 * @param {number} month (0-indexed)
 * @param {number[]} daysToGenerate - liste des jours (1-indexed) à générer
 */
function generatePlanning(stationId, year, month, daysToGenerate) {
  const nbDays = getDaysInMonth(year, month);
  const data = loadPlanning(stationId, year, month);
  const meta = loadPlanningMeta(stationId, year, month);
  const allPersons = getPlanningChauffeurs(stationId);

  // Filtrer : uniquement Chauffeur et Formateur
  const eligible = allPersons.filter(c => ['Chauffeur', 'Formateur'].includes(c.role));
  if (!eligible.length) return { success: false, message: 'Aucun chauffeur/formateur dans le répertoire.' };

  // Filtrer les jours : uniquement ceux avec CAPAMAX renseigné
  const days = daysToGenerate.filter(d => {
    const capamax = parseInt(meta['capamax_' + d]) || 0;
    return capamax > 0 && d >= 1 && d <= nbDays;
  });

  if (!days.length) return { success: false, message: 'Aucun jour avec CAPA MAX renseigné dans la sélection.' };

  // Calculer l'objectif RSTD par jour
  const targets = {};
  days.forEach(d => {
    const capamax = parseInt(meta['capamax_' + d]) || 0;
    targets[d] = Math.ceil(capamax * 1.07);
  });

  // Construire l'état actuel de chaque chauffeur (tous les jours du mois, pas seulement ceux à générer)
  const driverState = eligible.map(c => {
    const nom = (c.prenom + ' ' + c.nom).trim();
    const assigned = new Set();
    const blocked = new Set();
    for (let d = 1; d <= nbDays; d++) {
      const val = (data[nom + '_' + d] || '').toUpperCase();
      if (val === 'RSTD') assigned.add(d);
      else if (val) blocked.add(d);
    }
    return { nom, assigned, blocked };
  });

  // Pour chaque jour à générer, calculer combien de RSTD sont déjà placés
  const needed = {};
  days.forEach(d => {
    let current = 0;
    driverState.forEach(ds => { if (ds.assigned.has(d)) current++; });
    needed[d] = Math.max(0, targets[d] - current);
  });

  // Trier les jours par besoin décroissant
  const dayOrder = [...days].sort((a, b) => needed[b] - needed[a]);

  // Pour chaque jour, assigner des chauffeurs
  for (const day of dayOrder) {
    const shortage = needed[day];
    if (shortage <= 0) continue;

    const candidates = driverState.filter(ds => !ds.assigned.has(day) && !ds.blocked.has(day));

    const scored = candidates.map(ds => {
      let score = 0;
      score += ds.assigned.size * 2;
      if (wouldViolateWeekClassic(ds, day, year, month)) score += 1000;
      if (wouldViolateWeekAmazon(ds, day, year, month)) score += 1000;
      if (wouldCreate5Consecutive(ds, day, nbDays)) score += 50;
      return { ds, score };
    });

    scored.sort((a, b) => a.score - b.score);

    let assigned = 0;
    for (const { ds, score } of scored) {
      if (assigned >= shortage) break;
      if (score >= 1000) continue;
      ds.assigned.add(day);
      data[ds.nom + '_' + day] = 'RSTD';
      assigned++;
    }
  }

  savePlanning(stationId, year, month, data);
  return { success: true, data, generated: days.length };
}

/* ── Contrainte : max 5 RSTD par semaine classique (lun-dim) ── */
function wouldViolateWeekClassic(ds, day, year, month) {
  const date = new Date(year, month, day);
  const dow = date.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = day + mondayOffset;
  const nbDays = getDaysInMonth(year, month);

  let count = 0;
  for (let d = monday; d < monday + 7; d++) {
    if (d < 1 || d > nbDays) continue;
    if (ds.assigned.has(d)) count++;
  }
  return count >= 5;
}

/* ── Contrainte : max 5 RSTD par semaine Amazon (dim-sam) ── */
function wouldViolateWeekAmazon(ds, day, year, month) {
  const date = new Date(year, month, day);
  const dow = date.getDay();
  const sundayOffset = -dow;
  const sunday = day + sundayOffset;
  const nbDays = getDaysInMonth(year, month);

  let count = 0;
  for (let d = sunday; d < sunday + 7; d++) {
    if (d < 1 || d > nbDays) continue;
    if (ds.assigned.has(d)) count++;
  }
  return count >= 5;
}

/* ── Contrainte souple : éviter 5 jours consécutifs ── */
function wouldCreate5Consecutive(ds, day, nbDays) {
  const tempSet = new Set(ds.assigned);
  tempSet.add(day);

  let consecutive = 0;
  for (let d = Math.max(1, day - 4); d <= Math.min(nbDays, day + 4); d++) {
    if (tempSet.has(d)) {
      consecutive++;
      if (consecutive >= 5) return true;
    } else {
      consecutive = 0;
    }
  }
  return false;
}

/* ══════════════════════════════════════════════════════════════
   UI : Modale de génération
   ══════════════════════════════════════════════════════════════ */

function addGenerateButton(toolbar, stationId, year, month) {
  const btn = document.createElement('button');
  btn.className = 'h-btn';
  btn.style.cssText = 'background:rgba(74,222,128,0.15);border-color:#4ade80;color:#4ade80;font-size:11px;font-weight:700;';
  btn.textContent = '⚡ Générer';
  btn.title = 'Générer automatiquement les RSTD';

  btn.onclick = () => showGenerateModal(stationId, year, month);
  toolbar.querySelector('.h-toolbar-right').appendChild(btn);
}

function showGenerateModal(stationId, year, month) {
  const nbDays = getDaysInMonth(year, month);
  const meta = loadPlanningMeta(stationId, year, month);

  // Calculer les semaines du mois
  const weeks = getWeeksOfMonth(year, month);

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;';

  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card,var(--bg-sidebar));border-radius:14px;padding:24px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.5);';

  modal.innerHTML = `
    <h3 style="margin:0 0 16px;font-size:15px;color:var(--text-primary);font-weight:700;">⚡ Générer le planning</h3>
    <p style="font-size:11px;color:var(--text-muted);margin:0 0 14px;">Les cellules déjà remplies ne seront pas modifiées.<br>Seuls les jours avec CAPA MAX renseigné seront générés.</p>
    
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--text-primary);">
        <input type="radio" name="gen-scope" value="mois" checked style="accent-color:var(--accent);">
        <span>📅 Mois entier</span>
      </label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--text-primary);">
        <input type="radio" name="gen-scope" value="semaine" style="accent-color:var(--accent);">
        <span>📆 Semaine</span>
      </label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--text-primary);">
        <input type="radio" name="gen-scope" value="jour" style="accent-color:var(--accent);">
        <span>1️⃣ Jour précis</span>
      </label>
    </div>

    <div id="gen-week-select" style="display:none;margin-bottom:14px;">
      <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px;">Choisir la semaine :</label>
      <select id="gen-week-dropdown" class="rep-input" style="width:100%;padding:8px;font-size:12px;">
        ${weeks.map((w, i) => `<option value="${i}">S${w.num} — ${w.label}</option>`).join('')}
      </select>
    </div>

    <div id="gen-day-select" style="display:none;margin-bottom:14px;">
      <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px;">Choisir le jour :</label>
      <select id="gen-day-dropdown" class="rep-input" style="width:100%;padding:8px;font-size:12px;">
        ${Array.from({length: nbDays}, (_, i) => {
          const d = i + 1;
          const dayName = getDayName(year, month, d);
          const hasCapa = parseInt(meta['capamax_' + d]) > 0;
          return `<option value="${d}" ${!hasCapa ? 'disabled' : ''}>${d} ${dayName}${hasCapa ? '' : ' (pas de CAPA MAX)'}</option>`;
        }).join('')}
      </select>
    </div>

    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px;">
      <button class="h-btn" id="gen-cancel" style="padding:8px 16px;">Annuler</button>
      <button class="h-btn" id="gen-confirm" style="padding:8px 16px;background:#4ade80;color:#000;border-color:#4ade80;font-weight:700;">Générer</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Toggle visibility
  const radios = modal.querySelectorAll('input[name="gen-scope"]');
  const weekDiv = modal.querySelector('#gen-week-select');
  const dayDiv = modal.querySelector('#gen-day-select');

  radios.forEach(r => r.addEventListener('change', () => {
    weekDiv.style.display = r.value === 'semaine' && r.checked ? 'block' : weekDiv.style.display;
    dayDiv.style.display = r.value === 'jour' && r.checked ? 'block' : dayDiv.style.display;
    if (r.checked) {
      weekDiv.style.display = r.value === 'semaine' ? 'block' : 'none';
      dayDiv.style.display = r.value === 'jour' ? 'block' : 'none';
    }
  }));

  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  modal.querySelector('#gen-cancel').onclick = () => overlay.remove();

  modal.querySelector('#gen-confirm').onclick = () => {
    const scope = modal.querySelector('input[name="gen-scope"]:checked').value;
    let daysToGenerate = [];

    if (scope === 'mois') {
      daysToGenerate = Array.from({ length: nbDays }, (_, i) => i + 1);
    } else if (scope === 'semaine') {
      const weekIdx = parseInt(modal.querySelector('#gen-week-dropdown').value);
      const week = weeks[weekIdx];
      daysToGenerate = week.days; // peut contenir des jours hors mois (à cheval)
    } else if (scope === 'jour') {
      const day = parseInt(modal.querySelector('#gen-day-dropdown').value);
      daysToGenerate = [day];
    }

    overlay.remove();

    // Si semaine à cheval, on doit aussi générer dans le mois précédent/suivant
    const daysThisMonth = daysToGenerate.filter(d => d >= 1 && d <= nbDays);
    const daysOverflow = daysToGenerate.filter(d => d < 1 || d > nbDays);

    // Générer pour ce mois
    const result = generatePlanning(stationId, year, month, daysThisMonth);

    // Gérer les jours à cheval (mois précédent ou suivant)
    if (daysOverflow.length > 0 && scope === 'semaine') {
      daysOverflow.forEach(d => {
        if (d < 1) {
          // Jour du mois précédent
          const prevMonth = month === 0 ? 11 : month - 1;
          const prevYear = month === 0 ? year - 1 : year;
          const prevNbDays = getDaysInMonth(prevYear, prevMonth);
          const actualDay = prevNbDays + d; // d est négatif ou 0
          generatePlanning(stationId, prevYear, prevMonth, [actualDay]);
        } else if (d > nbDays) {
          // Jour du mois suivant
          const nextMonth = month === 11 ? 0 : month + 1;
          const nextYear = month === 11 ? year + 1 : year;
          const actualDay = d - nbDays;
          generatePlanning(stationId, nextYear, nextMonth, [actualDay]);
        }
      });
    }

    if (result.success) {
      renderPlanning();
    } else {
      alert(result.message);
    }
  };
}

/* ── Calculer les semaines du mois (lun-dim, avec jours à cheval) ── */
function getWeeksOfMonth(year, month) {
  const nbDays = getDaysInMonth(year, month);
  const weeks = [];
  let d = 1;

  while (d <= nbDays) {
    const date = new Date(year, month, d);
    const dow = date.getDay(); // 0=dim
    // Trouver le lundi de cette semaine
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const mondayDay = d + mondayOffset;

    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(mondayDay + i);
    }

    const wn = getWeekNumber(date);
    const startLabel = formatDayLabel(year, month, days[0]);
    const endLabel = formatDayLabel(year, month, days[6]);

    weeks.push({ num: wn, days, label: startLabel + ' → ' + endLabel });

    // Avancer au lundi suivant
    d = mondayDay + 7;
    // Si on a déjà dépassé le mois, stop
    if (mondayDay + 7 > nbDays && d > nbDays) break;
  }

  return weeks;
}

function formatDayLabel(year, month, day) {
  const nbDays = getDaysInMonth(year, month);
  if (day >= 1 && day <= nbDays) {
    return day + '/' + String(month + 1).padStart(2, '0');
  } else if (day < 1) {
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const prevNbDays = getDaysInMonth(prevYear, prevMonth);
    return (prevNbDays + day) + '/' + String(prevMonth + 1).padStart(2, '0');
  } else {
    const nextMonth = month === 11 ? 0 : month + 1;
    return (day - nbDays) + '/' + String(nextMonth + 1).padStart(2, '0');
  }
}
