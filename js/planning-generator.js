/* js/planning-generator.js — Générateur automatique de planning (SunXP Pro) */

/**
 * Génère le planning RSTD pour les chauffeurs et formateurs.
 * Retourne un rapport détaillé des objectifs atteints/non atteints.
 */
function generatePlanning(stationId, year, month, daysToGenerate) {
  const nbDays = getDaysInMonth(year, month);
  const data = loadPlanning(stationId, year, month);
  const meta = loadPlanningMeta(stationId, year, month);
  const allPersons = getPlanningChauffeurs(stationId);

  const eligible = allPersons.filter(c => ['Chauffeur', 'Formateur'].includes(c.role));
  if (!eligible.length) return { success: false, message: 'Aucun chauffeur/formateur dans le répertoire.' };

  const days = daysToGenerate.filter(d => {
    const capamax = parseInt(meta['capamax_' + d]) || 0;
    return capamax > 0 && d >= 1 && d <= nbDays;
  });

  if (!days.length) return { success: false, message: 'Aucun jour avec CAPA MAX renseigné dans la sélection.' };

  // Objectifs par jour
  const targets = {};
  days.forEach(d => {
    const capamax = parseInt(meta['capamax_' + d]) || 0;
    targets[d] = Math.ceil(capamax * 1.07);
  });

  // État chauffeurs
  const driverState = eligible.map(c => {
    const nom = (c.prenom + ' ' + c.nom).trim();
    const assigned = new Set();
    const blocked = new Set();
    for (let d = 1; d <= nbDays; d++) {
      const val = (data[nom + '_' + d] || '').toUpperCase();
      if (val === 'RSTD' || val === 'RLV1' || val === 'RLV2' || val === 'RLV3') assigned.add(d);
      else if (val) blocked.add(d);
    }
    return { nom, assigned, blocked };
  });

  // Besoin par jour
  const needed = {};
  days.forEach(d => {
    let current = 0;
    driverState.forEach(ds => { if (ds.assigned.has(d)) current++; });
    needed[d] = Math.max(0, targets[d] - current);
  });

  const dayOrder = [...days].sort((a, b) => needed[b] - needed[a]);

  // Assigner
  const assignedPerDay = {};
  for (const day of dayOrder) {
    const shortage = needed[day];
    if (shortage <= 0) { assignedPerDay[day] = 0; continue; }

    const candidates = driverState.filter(ds => !ds.assigned.has(day) && !ds.blocked.has(day));
    const scored = candidates.map(ds => {
      let score = 0;
      score += ds.assigned.size * 2;
      if (wouldViolateWeekClassic(ds, day, year, month)) score += 1000;
      if (wouldViolateWeekAmazon(ds, day, year, month)) score += 1000;
      if (wouldCreate6Consecutive(ds, day, nbDays)) score += 1000; // HARD: pas 6 jours d'affilé
      if (wouldExceed2Sundays(ds, day, year, month, nbDays)) score += 1000; // HARD: max 2 dimanches
      if (wouldCreate5Consecutive(ds, day, nbDays)) score += 50;
      return { ds, score };
    });
    scored.sort((a, b) => a.score - b.score);

    let count = 0;
    for (const { ds, score } of scored) {
      if (count >= shortage) break;
      if (score >= 1000) continue;
      ds.assigned.add(day);
      data[ds.nom + '_' + day] = 'RSTD';
      count++;
    }
    assignedPerDay[day] = count;
  }

  // Garantir au moins 1 week-end entier off (sam+dim consécutifs sans RSTD)
  // Si un chauffeur n'a aucun week-end complet off, retirer le RSTD du samedi
  // du week-end où il a le moins de contraintes
  eligible.forEach(c => {
    const nom = (c.prenom + ' ' + c.nom).trim();
    const weekends = []; // [{sat, sun}]
    for (let d = 1; d <= nbDays; d++) {
      const date = new Date(year, month, d);
      if (date.getDay() === 6) { // samedi
        const sun = d + 1;
        if (sun <= nbDays) weekends.push({ sat: d, sun });
      }
    }
    // Vérifier s'il a déjà un week-end complet off
    const hasFullWeekendOff = weekends.some(we => {
      const satVal = (data[nom + '_' + we.sat] || '').toUpperCase();
      const sunVal = (data[nom + '_' + we.sun] || '').toUpperCase();
      return satVal !== 'RSTD' && sunVal !== 'RSTD';
    });
    if (!hasFullWeekendOff && weekends.length > 0) {
      // Trouver le week-end le plus facile à libérer (celui généré, pas pré-existant)
      for (const we of weekends) {
        const satKey = nom + '_' + we.sat;
        const sunKey = nom + '_' + we.sun;
        const satVal = (data[satKey] || '').toUpperCase();
        const sunVal = (data[sunKey] || '').toUpperCase();
        // Ne libérer que les RSTD qu'on a nous-mêmes générés (pas les bloqués)
        const satWasBlocked = driverState.find(ds => ds.nom === nom)?.blocked.has(we.sat);
        const sunWasBlocked = driverState.find(ds => ds.nom === nom)?.blocked.has(we.sun);
        if (!satWasBlocked && !sunWasBlocked) {
          if (satVal === 'RSTD') data[satKey] = '';
          if (sunVal === 'RSTD') data[sunKey] = '';
          break;
        }
      }
    }
  });

  // Remplir les cases vides restantes avec REP (pour les jours générés uniquement)
  days.forEach(d => {
    eligible.forEach(c => {
      const nom = (c.prenom + ' ' + c.nom).trim();
      const val = (data[nom + '_' + d] || '').toUpperCase();
      if (!val) {
        data[nom + '_' + d] = 'REP';
      }
    });
  });

  savePlanning(stationId, year, month, data);

  // Rapport : jours où l'objectif n'est pas atteint
  const shortfalls = [];
  days.forEach(d => {
    const finalCount = countRSTDForDay(data, eligible, d);
    const target = targets[d];
    if (finalCount < target) {
      const dayName = getDayName(year, month, d);
      shortfalls.push({ day: d, dayName, target, actual: finalCount, missing: target - finalCount });
    }
  });

  // Rapport : chauffeurs qui ont atteint leur limite (saturés)
  const saturatedDrivers = [];
  driverState.forEach(ds => {
    // Vérifier si le chauffeur a été bloqué par les contraintes
    const totalRSTD = ds.assigned.size;
    // Un chauffeur est "saturé" s'il a >= 22 RSTD dans le mois (environ 5j/sem * 4.3 sem)
    if (totalRSTD >= 22) {
      saturatedDrivers.push({ nom: ds.nom, rstd: totalRSTD });
    }
  });

  return {
    success: true,
    data,
    generated: days.length,
    shortfalls,
    saturatedDrivers,
    allMet: shortfalls.length === 0
  };
}

function countRSTDForDay(data, eligible, day) {
  let count = 0;
  eligible.forEach(c => {
    const nom = (c.prenom + ' ' + c.nom).trim();
    if ((data[nom + '_' + day] || '').toUpperCase() === 'RSTD') count++;
  });
  return count;
}

/* ── Contraintes ──────────────────────────────────────────── */
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

function wouldViolateWeekAmazon(ds, day, year, month) {
  const date = new Date(year, month, day);
  const dow = date.getDay();
  const sunday = day - dow;
  const nbDays = getDaysInMonth(year, month);
  let count = 0;
  for (let d = sunday; d < sunday + 7; d++) {
    if (d < 1 || d > nbDays) continue;
    if (ds.assigned.has(d)) count++;
  }
  return count >= 5;
}

/* ── Contrainte HARD : pas 6 jours consécutifs (même entre 2 semaines) ── */
function wouldCreate6Consecutive(ds, day, nbDays) {
  const tempSet = new Set(ds.assigned);
  tempSet.add(day);
  let consecutive = 0;
  for (let d = Math.max(1, day - 5); d <= Math.min(nbDays, day + 5); d++) {
    if (tempSet.has(d)) { consecutive++; if (consecutive >= 6) return true; }
    else consecutive = 0;
  }
  return false;
}

/* ── Contrainte HARD : max 2 dimanches travaillés dans le mois ── */
function wouldExceed2Sundays(ds, day, year, month, nbDays) {
  const date = new Date(year, month, day);
  if (date.getDay() !== 0) return false; // pas un dimanche
  let sundayCount = 0;
  for (let d = 1; d <= nbDays; d++) {
    if (new Date(year, month, d).getDay() === 0 && ds.assigned.has(d)) sundayCount++;
  }
  return sundayCount >= 2;
}

/* ── Contrainte souple : éviter 5 jours consécutifs ── */
function wouldCreate5Consecutive(ds, day, nbDays) {
  const tempSet = new Set(ds.assigned);
  tempSet.add(day);
  let consecutive = 0;
  for (let d = Math.max(1, day - 4); d <= Math.min(nbDays, day + 4); d++) {
    if (tempSet.has(d)) { consecutive++; if (consecutive >= 5) return true; }
    else consecutive = 0;
  }
  return false;
}

/* ══════════════════════════════════════════════════════════════
   UI : Bouton + Modale de génération + Modale résultat
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
  const weeks = getGeneratorWeeksOfMonth(year, month);

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;';

  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card,var(--bg-sidebar));border-radius:14px;padding:24px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.5);';

  modal.innerHTML = `
    <h3 style="margin:0 0 16px;font-size:15px;color:var(--text-primary);font-weight:700;">⚡ Générer le planning</h3>
    <p style="font-size:11px;color:var(--text-muted);margin:0 0 14px;">Cellules existantes conservées. Seuls les jours avec CAPA MAX seront générés.</p>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--text-primary);">
        <input type="radio" name="gen-scope" value="mois" checked style="accent-color:var(--accent);"> <span>📅 Mois entier</span>
      </label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--text-primary);">
        <input type="radio" name="gen-scope" value="semaine" style="accent-color:var(--accent);"> <span>📆 Semaine</span>
      </label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--text-primary);">
        <input type="radio" name="gen-scope" value="jour" style="accent-color:var(--accent);"> <span>1️⃣ Jour précis</span>
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

  const radios = modal.querySelectorAll('input[name="gen-scope"]');
  const weekDiv = modal.querySelector('#gen-week-select');
  const dayDiv = modal.querySelector('#gen-day-select');
  radios.forEach(r => r.addEventListener('change', () => {
    weekDiv.style.display = modal.querySelector('input[name="gen-scope"]:checked').value === 'semaine' ? 'block' : 'none';
    dayDiv.style.display = modal.querySelector('input[name="gen-scope"]:checked').value === 'jour' ? 'block' : 'none';
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
      daysToGenerate = weeks[weekIdx].days;
    } else if (scope === 'jour') {
      daysToGenerate = [parseInt(modal.querySelector('#gen-day-dropdown').value)];
    }

    overlay.remove();

    const daysThisMonth = daysToGenerate.filter(d => d >= 1 && d <= nbDays);
    const daysOverflow = daysToGenerate.filter(d => d < 1 || d > nbDays);

    const result = generatePlanning(stationId, year, month, daysThisMonth);

    // Semaines à cheval
    if (daysOverflow.length > 0 && scope === 'semaine') {
      daysOverflow.forEach(d => {
        if (d < 1) {
          const prevMonth = month === 0 ? 11 : month - 1;
          const prevYear = month === 0 ? year - 1 : year;
          const prevNbDays = getDaysInMonth(prevYear, prevMonth);
          generatePlanning(stationId, prevYear, prevMonth, [prevNbDays + d]);
        } else if (d > nbDays) {
          const nextMonth = month === 11 ? 0 : month + 1;
          const nextYear = month === 11 ? year + 1 : year;
          generatePlanning(stationId, nextYear, nextMonth, [d - nbDays]);
        }
      });
    }

    if (result.success) {
      renderPlanning();
      showGenerateResult(result, year, month);
    } else {
      alert(result.message);
    }
  };
}

/* ── Modale résultat après génération ─────────────────────── */
function showGenerateResult(result, year, month) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';

  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card,var(--bg-sidebar));border-radius:14px;padding:24px;max-width:460px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.5);max-height:80vh;overflow-y:auto;';

  if (result.allMet) {
    // Tout est bon
    modal.innerHTML = `
      <div style="text-align:center;padding:20px 0;">
        <div style="font-size:48px;margin-bottom:12px;">✅</div>
        <h3 style="margin:0 0 8px;font-size:16px;color:var(--text-primary);font-weight:700;">Tous les objectifs sont remplis</h3>
        <p style="font-size:12px;color:var(--text-muted);margin:0;">${result.generated} jour${result.generated > 1 ? 's' : ''} généré${result.generated > 1 ? 's' : ''} avec succès.</p>
      </div>
      <div style="text-align:center;margin-top:16px;">
        <button class="h-btn" id="genresult-close" style="padding:8px 24px;">Fermer</button>
      </div>
    `;
  } else {
    // Objectifs non atteints
    let shortfallsHtml = '';
    result.shortfalls.forEach(s => {
      shortfallsHtml += `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);">
          <span style="font-size:12px;color:var(--text-primary);">${s.day} ${s.dayName}</span>
          <span style="font-size:11px;">
            <span style="color:#f87171;font-weight:700;">${s.actual}</span>
            <span style="color:var(--text-muted);">/ ${s.target}</span>
            <span style="color:#f87171;font-size:10px;margin-left:4px;">(-${s.missing})</span>
          </span>
        </div>`;
    });

    let saturatedHtml = '';
    if (result.saturatedDrivers.length) {
      saturatedHtml = `
        <div style="margin-top:14px;padding-top:10px;border-top:1px solid var(--border);">
          <div style="font-size:11px;font-weight:700;color:#fbbf24;margin-bottom:6px;">⚠ Chauffeurs saturés (≥22 RSTD/mois) :</div>
          ${result.saturatedDrivers.map(d => `<div style="font-size:11px;color:var(--text-muted);padding:2px 0;">${d.nom} — <span style="font-weight:700;color:#fbbf24;">${d.rstd} RSTD</span></div>`).join('')}
        </div>`;
    }

    modal.innerHTML = `
      <div style="text-align:center;margin-bottom:16px;">
        <div style="font-size:36px;margin-bottom:8px;">⚠️</div>
        <h3 style="margin:0 0 4px;font-size:15px;color:var(--text-primary);font-weight:700;">Objectifs partiellement atteints</h3>
        <p style="font-size:11px;color:var(--text-muted);margin:0;">${result.shortfalls.length} jour${result.shortfalls.length > 1 ? 's' : ''} en dessous de l'objectif (CAPAMAX × 1.07)</p>
      </div>
      <div style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.3);border-radius:8px;padding:12px;margin-bottom:8px;">
        <div style="font-size:10px;font-weight:700;color:#f87171;text-transform:uppercase;margin-bottom:6px;">Jours en déficit</div>
        ${shortfallsHtml}
      </div>
      ${saturatedHtml}
      <div style="text-align:center;margin-top:16px;">
        <button class="h-btn" id="genresult-close" style="padding:8px 24px;">Compris</button>
      </div>
    `;
  }

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  modal.querySelector('#genresult-close').onclick = () => overlay.remove();
}

/* ── Semaines du mois (pour le générateur) ────────────────── */
function getGeneratorWeeksOfMonth(year, month) {
  const nbDays = getDaysInMonth(year, month);
  const weeks = [];
  let d = 1;
  while (d <= nbDays) {
    const date = new Date(year, month, d);
    const dow = date.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const mondayDay = d + mondayOffset;
    const days = [];
    for (let i = 0; i < 7; i++) days.push(mondayDay + i);
    const wn = getWeekNumber(date);
    const startLabel = formatDayLabel(year, month, days[0]);
    const endLabel = formatDayLabel(year, month, days[6]);
    weeks.push({ num: wn, days, label: startLabel + ' → ' + endLabel });
    d = mondayDay + 7;
    if (mondayDay + 7 > nbDays && d > nbDays) break;
  }
  return weeks;
}

function formatDayLabel(year, month, day) {
  const nbDays = getDaysInMonth(year, month);
  if (day >= 1 && day <= nbDays) return day + '/' + String(month + 1).padStart(2, '0');
  if (day < 1) {
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    return (getDaysInMonth(prevYear, prevMonth) + day) + '/' + String(prevMonth + 1).padStart(2, '0');
  }
  const nextMonth = month === 11 ? 0 : month + 1;
  return (day - nbDays) + '/' + String(nextMonth + 1).padStart(2, '0');
}
