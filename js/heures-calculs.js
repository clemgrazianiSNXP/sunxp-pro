/* js/heures-calculs.js — Fonctions de calcul pour l'onglet Heures */

/**
 * Convertit "HH:MM" en minutes depuis minuit. Retourne null si invalide.
 */
function timeToMin(str) {
  if (!str || typeof str !== 'string') return null;
  const m = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}

/**
 * Convertit des minutes en "H:MM".
 */
function minToTime(min) {
  if (min == null || isNaN(min)) return '';
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.abs(min) % 60;
  return (min < 0 ? '-' : '') + h + ':' + String(m).padStart(2, '0');
}

/**
 * Calcule le temps de travail en minutes.
 * = (retourDepot - heureVague) - pause + backups
 */
function calcTravail(heureVague, retourDepot, pauseMin, backupsStr) {
  const v = timeToMin(heureVague);
  const r = timeToMin(retourDepot);
  if (v == null || r == null) return null;
  let total = r - v - (pauseMin || 45);
  const bu = timeToMin(backupsStr);
  if (bu != null) total += bu;
  return total;
}

/**
 * Retourne la classe CSS de couleur selon le temps de travail.
 * ≤ 8h45 → vert, 8h46–9h15 → orange, > 9h15 → rouge
 */
function travailColor(minutes) {
  if (minutes == null) return '';
  if (minutes <= 525) return 'travail-vert';
  if (minutes <= 555) return 'travail-orange';
  return 'travail-rouge';
}

/**
 * Calcule l'heure de pause = heureVague + moitié du temps prévu avant pause
 * Ne retourne une valeur que si heureVague ET pauseMin sont renseignés
 */
function calcHeurePause(heureVague, pauseMin) {
  const v = timeToMin(heureVague);
  const p = parseInt(pauseMin);
  if (v == null || isNaN(p) || p <= 0) return '';
  // Heure de pause = vague + 4h (milieu d'une journée type)
  return minToTime(v + 240);
}

/**
 * Retourne true si le chauffeur a une faute (Mentor < 810 ET Trajet ≠ 5)
 */
function hasFaute(mentor, trajet) {
  const m = parseInt(mentor);
  const t = parseInt(trajet);
  return !isNaN(m) && !isNaN(t) && m < 810 && t !== 5;
}

/**
 * Retourne la couleur du score Mentor :
 * Rouge = < 810 ET pas 5 étoiles
 * Jaune = < 810 mais 5 étoiles
 * Vert = >= 810
 */
function mentorColor(mentor, trajet) {
  const m = parseInt(mentor);
  const t = parseInt(trajet);
  if (isNaN(m)) return '';
  if (m >= 810) return '#4ade80';
  if (t === 5) return '#fbbf24';
  return '#f87171';
}

/**
 * Formate une date JS en YYYY-MM-DD
 */
function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Formate une date JS en "Lundi 12 janvier 2026"
 */
function dateLabel(d) {
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Retourne le lundi de la semaine contenant la date d
 */
function getMondayOf(d) {
  const day = new Date(d);
  const dow = day.getDay() || 7;
  day.setDate(day.getDate() - dow + 1);
  return day;
}

/**
 * Calcule le total heures d'une semaine pour un chauffeur depuis localStorage
 * Cherche par nom du chauffeur dans les lignes sauvegardées
 */
function calcWeekTotal(stationId, chauffeurNom, mondayDate) {
  let totalMin = 0, joursTravailes = 0, backupsMin = 0, astreinteMin = 0, chimeMin = 0, safetyMin = 0, absences = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayDate); d.setDate(d.getDate() + i);
    const key = stationId + '-heures-' + dateKey(d);
    try {
      const raw = localStorage.getItem(key); if (!raw) continue;
      const data = JSON.parse(raw); if (!data.rows) continue;
      const row = Object.values(data.rows).find(r => r.nom && r.nom.trim() === chauffeurNom.trim());
      if (!row) continue;
      if (['Astreinte','Chime','Safety'].includes(row.statut)) {
        const defaultSp = row.statut==='Chime' ? '5:00' : '2:00';
        const sp = timeToMin(row.specialTravail || defaultSp) || 0;
        if (row.statut === 'Astreinte') { astreinteMin += sp; totalMin += sp; continue; }
        if (row.statut === 'Chime') { chimeMin += sp; totalMin += sp; joursTravailes++; continue; }
        if (row.statut === 'Safety') { safetyMin += sp; totalMin += sp; joursTravailes++; continue; }
      }
      if (row.statut === 'Absent') { absences++; continue; }
      if (row.statut !== 'Présent') continue;
      const t = calcTravail(row.heureVague, row.retourDepot, row.pause || 45, row.backups);
      if (t != null && t > 0) { totalMin += t; joursTravailes++; }
      const bu = timeToMin(row.backups); if (bu != null && bu > 0) backupsMin += bu;
    } catch (_) {}
  }
  return { totalMin, joursTravailes, backupsMin, astreinteMin, chimeMin, safetyMin, absences };
}

/**
 * Calcule le total heures d'un mois pour un chauffeur
 * Cherche par nom du chauffeur dans les lignes sauvegardées
 */
function calcMonthTotal(stationId, chauffeurNom, year, month) {
  let totalMin = 0, joursTravailes = 0, backupsMin = 0, astreinteMin = 0, chimeMin = 0, safetyMin = 0, absences = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const key = stationId + '-heures-' + dateKey(date);
    try {
      const raw = localStorage.getItem(key); if (!raw) continue;
      const data = JSON.parse(raw); if (!data.rows) continue;
      const row = Object.values(data.rows).find(r => r.nom && r.nom.trim() === chauffeurNom.trim());
      if (!row) continue;
      if (['Astreinte','Chime','Safety'].includes(row.statut)) {
        const defaultSp = row.statut==='Chime' ? '5:00' : '2:00';
        const sp = timeToMin(row.specialTravail || defaultSp) || 0;
        if (row.statut === 'Astreinte') { astreinteMin += sp; totalMin += sp; continue; }
        if (row.statut === 'Chime') { chimeMin += sp; totalMin += sp; joursTravailes++; continue; }
        if (row.statut === 'Safety') { safetyMin += sp; totalMin += sp; joursTravailes++; continue; }
      }
      if (row.statut === 'Absent') { absences++; continue; }
      if (row.statut !== 'Présent') continue;
      const t = calcTravail(row.heureVague, row.retourDepot, row.pause || 45, row.backups);
      if (t != null && t > 0) { totalMin += t; joursTravailes++; }
      const bu = timeToMin(row.backups); if (bu != null && bu > 0) backupsMin += bu;
    } catch (_) {}
  }
  return { totalMin, joursTravailes, backupsMin, astreinteMin, chimeMin, safetyMin, absences };
}
