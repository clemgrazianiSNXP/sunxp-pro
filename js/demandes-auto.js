/* js/demandes-auto.js — Fonctions d'automatisation planning lors validation demandes (SunXP Pro) */

/**
 * Ajoute un code (RD, CP) au planning pour un chauffeur à une date donnée.
 * Écrase RSTD/REP (planning généré) mais pas les autres codes manuels.
 */
function applyDemandeToPlanning(stationId, chauffeurNom, dateStr, code) {
  const date = new Date(dateStr + 'T12:00:00');
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const key = stationId + '-planning-' + year + '-' + String(month + 1).padStart(2, '0');

  let data = {};
  try { const raw = localStorage.getItem(key); if (raw) data = JSON.parse(raw); } catch (_) {}

  const cellKey = chauffeurNom + '_' + day;
  const current = (data[cellKey] || '').toUpperCase();

  // Remplacer si vide, RSTD ou REP
  if (!current || current === 'RSTD' || current === 'REP') {
    data[cellKey] = code;
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
    if (typeof dbSavePlanning === 'function') dbSavePlanning(stationId, year, month, data);
    console.log('📅 ' + code + ' ajouté au planning pour ' + chauffeurNom + ' le ' + day + '/' + (month + 1));
  }
}

/**
 * Applique CP pour chaque jour d'un congé accepté.
 */
function applyCongeToPlanning(stationId, demande) {
  const start = new Date((demande.dateDebut || '').slice(0, 10) + 'T12:00:00');
  const end = new Date((demande.dateFin || '').slice(0, 10) + 'T12:00:00');
  const nom = demande.chauffeurNom;
  for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    dt.setHours(12, 0, 0, 0); // Maintenir midi pour éviter les problèmes de fuseau
    applyDemandeToPlanning(stationId, nom, dt.toISOString(), 'CP');
  }
}

/**
 * Calcule le total des acomptes acceptés pour un chauffeur sur un mois donné.
 * Cherche par chauffeurId OU par chauffeurNom pour couvrir tous les cas.
 */
function getAcomptesTotal(stationId, chauffeurId, year, month, chauffeurNom) {
  let acomptes = [];
  try { acomptes = JSON.parse(localStorage.getItem(stationId + '-acomptes')) || []; } catch (_) {}

  return acomptes
    .filter(a => {
      if (a.statut !== 'acceptee') return false;
      const matchId = a.chauffeurId === chauffeurId;
      const matchNom = chauffeurNom && a.chauffeurNom && a.chauffeurNom.trim() === chauffeurNom.trim();
      if (!matchId && !matchNom) return false;
      const d = new Date(a.dateDemande || a.date);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((sum, a) => sum + (parseFloat(a.montant) || 0), 0);
}
