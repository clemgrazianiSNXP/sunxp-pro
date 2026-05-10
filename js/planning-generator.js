/* js/planning-generator.js — Générateur automatique de planning (SunXP Pro) */
console.log('planning-generator.js chargé');

/**
 * Génère le planning RSTD pour les chauffeurs et formateurs.
 * 
 * Règles :
 * - Objectif RSTD par jour = CAPAMAX * 1.07 à 1.10 (arrondi sup)
 * - Max 5 jours travaillés par semaine classique (lun-dim)
 * - Max 5 jours travaillés par semaine Amazon (dim-sam)
 * - Éviter 5 jours consécutifs (soft constraint)
 * - Ne pas écraser les cellules déjà remplies
 * - Uniquement pour rôles Chauffeur et Formateur
 */
function generatePlanning(stationId, year, month) {
  const nbDays = getDaysInMonth(year, month);
  const data = loadPlanning(stationId, year, month);
  const meta = loadPlanningMeta(stationId, year, month);
  const allPersons = getPlanningChauffeurs(stationId);

  // Filtrer : uniquement Chauffeur et Formateur
  const eligible = allPersons.filter(c => ['Chauffeur', 'Formateur'].includes(c.role));
  if (!eligible.length) return { success: false, message: 'Aucun chauffeur/formateur dans le répertoire.' };

  // Calculer l'objectif RSTD par jour (CAPAMAX * 1.07 arrondi sup)
  const targets = [];
  for (let d = 1; d <= nbDays; d++) {
    const capamax = parseInt(meta['capamax_' + d]) || 0;
    const target = capamax > 0 ? Math.ceil(capamax * 1.07) : 0;
    targets.push(target);
  }

  // Construire l'état actuel de chaque chauffeur (jours déjà assignés)
  const driverState = eligible.map(c => {
    const nom = (c.prenom + ' ' + c.nom).trim();
    const assigned = []; // jours déjà RSTD (1-indexed)
    const blocked = [];  // jours avec un autre code (ne pas toucher)
    for (let d = 1; d <= nbDays; d++) {
      const val = (data[nom + '_' + d] || '').toUpperCase();
      if (val === 'RSTD') assigned.push(d);
      else if (val) blocked.push(d);
    }
    return { nom, assigned: new Set(assigned), blocked: new Set(blocked) };
  });

  // Pour chaque jour, calculer combien de RSTD sont déjà placés
  const currentRSTD = [];
  for (let d = 1; d <= nbDays; d++) {
    let count = 0;
    driverState.forEach(ds => { if (ds.assigned.has(d)) count++; });
    currentRSTD.push(count);
  }

  // Calculer combien il manque par jour
  const needed = targets.map((t, i) => Math.max(0, t - currentRSTD[i]));

  // Trier les jours par besoin décroissant (remplir les jours les plus demandés d'abord)
  const dayOrder = Array.from({ length: nbDays }, (_, i) => i + 1)
    .filter(d => needed[d - 1] > 0)
    .sort((a, b) => needed[b - 1] - needed[a - 1]);

  // Pour chaque jour qui a besoin de RSTD, assigner des chauffeurs
  for (const day of dayOrder) {
    const shortage = needed[day - 1];
    if (shortage <= 0) continue;

    // Candidats : chauffeurs qui ne sont ni RSTD ni bloqués ce jour
    const candidates = driverState.filter(ds => !ds.assigned.has(day) && !ds.blocked.has(day));

    // Scorer chaque candidat (plus le score est bas, plus il est prioritaire)
    const scored = candidates.map(ds => {
      let score = 0;
      // Pénaliser si déjà beaucoup de RSTD ce mois
      score += ds.assigned.size * 2;
      // Pénaliser si ça viole la contrainte semaine classique (max 5)
      if (wouldViolateWeekClassic(ds, day, year, month)) score += 1000;
      // Pénaliser si ça viole la contrainte semaine Amazon (max 5)
      if (wouldViolateWeekAmazon(ds, day, year, month)) score += 1000;
      // Pénaliser si ça crée 5 jours consécutifs (soft)
      if (wouldCreate5Consecutive(ds, day, nbDays)) score += 50;
      return { ds, score };
    });

    // Trier par score croissant
    scored.sort((a, b) => a.score - b.score);

    // Assigner les N premiers (ceux avec score < 1000 = pas de violation dure)
    let assigned = 0;
    for (const { ds, score } of scored) {
      if (assigned >= shortage) break;
      if (score >= 1000) continue; // violation dure → skip
      ds.assigned.add(day);
      data[ds.nom + '_' + day] = 'RSTD';
      assigned++;
    }

    // Si on n'a pas pu remplir, essayer avec les violations douces (5 consécutifs)
    if (assigned < shortage) {
      for (const { ds, score } of scored) {
        if (assigned >= shortage) break;
        if (ds.assigned.has(day)) continue; // déjà assigné
        if (score >= 1000) continue; // violation dure → toujours skip
        ds.assigned.add(day);
        data[ds.nom + '_' + day] = 'RSTD';
        assigned++;
      }
    }
  }

  // Sauvegarder
  savePlanning(stationId, year, month, data);
  return { success: true, data };
}

/* ── Contrainte : max 5 RSTD par semaine classique (lun-dim) ── */
function wouldViolateWeekClassic(ds, day, year, month) {
  // Trouver le lundi de la semaine contenant ce jour
  const date = new Date(year, month, day);
  const dow = date.getDay(); // 0=dim, 1=lun...
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = day + mondayOffset;

  let count = 0;
  for (let d = monday; d < monday + 7; d++) {
    if (d < 1 || d > getDaysInMonth(year, month)) continue;
    if (ds.assigned.has(d)) count++;
  }
  return count >= 5; // si déjà 5, en ajouter un = 6 → violation
}

/* ── Contrainte : max 5 RSTD par semaine Amazon (dim-sam) ── */
function wouldViolateWeekAmazon(ds, day, year, month) {
  // Semaine Amazon = dimanche au samedi
  const date = new Date(year, month, day);
  const dow = date.getDay(); // 0=dim
  const sundayOffset = -dow; // reculer jusqu'au dimanche
  const sunday = day + sundayOffset;

  let count = 0;
  for (let d = sunday; d < sunday + 7; d++) {
    if (d < 1 || d > getDaysInMonth(year, month)) continue;
    if (ds.assigned.has(d)) count++;
  }
  return count >= 5;
}

/* ── Contrainte souple : éviter 5 jours consécutifs ── */
function wouldCreate5Consecutive(ds, day, nbDays) {
  // Simuler l'ajout et vérifier s'il y a 5 consécutifs
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

/* ── UI : Bouton Générer dans la toolbar ── */
function addGenerateButton(toolbar, stationId, year, month) {
  const btn = document.createElement('button');
  btn.className = 'h-btn';
  btn.style.cssText = 'background:rgba(74,222,128,0.15);border-color:#4ade80;color:#4ade80;font-size:11px;font-weight:700;';
  btn.textContent = '⚡ Générer';
  btn.title = 'Générer automatiquement les RSTD selon CAPAMAX + 7%';

  btn.onclick = () => {
    const meta = loadPlanningMeta(stationId, year, month);
    // Vérifier qu'il y a au moins un CAPAMAX renseigné
    let hasCapamax = false;
    for (let d = 1; d <= getDaysInMonth(year, month); d++) {
      if (parseInt(meta['capamax_' + d]) > 0) { hasCapamax = true; break; }
    }
    if (!hasCapamax) {
      alert('Remplissez d\'abord la ligne CAPA MAX avant de générer.');
      return;
    }

    if (!confirm('Générer les RSTD pour les chauffeurs et formateurs ?\n\nLes cellules déjà remplies ne seront pas modifiées.')) return;

    const result = generatePlanning(stationId, year, month);
    if (result.success) {
      renderPlanning();
    } else {
      alert(result.message);
    }
  };

  toolbar.querySelector('.h-toolbar-right').appendChild(btn);
}
