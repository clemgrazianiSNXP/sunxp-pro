/* js/demandes-auto.js — Automatisations lors de la validation des demandes (SunXP Pro) */
console.log('demandes-auto.js chargé');

/**
 * Quand une demande de repos est acceptée → ajouter RD au planning.
 * Quand une demande de CP est acceptée → ajouter CP au planning.
 * Ne pas écraser si déjà rempli (sauf RSTD/REP qui sont remplaçables).
 */
function applyDemandeToPlanning(stationId, chauffeurNom, dateStr, code) {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const key = stationId + '-planning-' + year + '-' + String(month + 1).padStart(2, '0');

  let data = {};
  try { const raw = localStorage.getItem(key); if (raw) data = JSON.parse(raw); } catch (_) {}

  const cellKey = chauffeurNom + '_' + day;
  const current = (data[cellKey] || '').toUpperCase();

  // Remplacer si vide, RSTD ou REP (le planning généré peut être écrasé)
  if (!current || current === 'RSTD' || current === 'REP') {
    data[cellKey] = code;
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
    // Sync Supabase
    if (typeof dbSavePlanning === 'function') dbSavePlanning(stationId, year, month, data);
  }
}

/**
 * Calcule le total des acomptes acceptés pour un chauffeur sur un mois donné.
 */
function getAcomptesTotal(stationId, chauffeurId, year, month) {
  let acomptes = [];
  try { acomptes = JSON.parse(localStorage.getItem(stationId + '-acomptes')) || []; } catch (_) {}

  return acomptes
    .filter(a => {
      if (a.statut !== 'acceptee') return false;
      if (a.chauffeurId !== chauffeurId) return false;
      const d = new Date(a.dateDemande || a.date);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((sum, a) => sum + (parseFloat(a.montant) || 0), 0);
}

/* ── Monkey-patch les fonctions de validation pour déclencher l'automatisation ── */

// Sauvegarder les originaux
const _origSaveReposDemandes = typeof saveReposDemandes === 'function' ? saveReposDemandes : null;
const _origSaveConges = typeof saveConges === 'function' ? saveConges : null;
const _origSaveAcomptes = typeof saveAcomptes === 'function' ? saveAcomptes : null;

// Override saveReposDemandes pour détecter les acceptations
if (_origSaveReposDemandes) {
  window._prevReposState = {};
  const origSave = saveReposDemandes;
  window.saveReposDemandes = function(stationId, demandes) {
    // Détecter les demandes qui viennent de passer à 'acceptee'
    demandes.forEach(d => {
      const prevStatut = window._prevReposState[d.id];
      if (d.statut === 'acceptee' && prevStatut !== 'acceptee') {
        // Appliquer RD au planning
        if (d.date1) applyDemandeToPlanning(stationId, d.chauffeurNom, d.date1, 'RD');
        if (d.date2) applyDemandeToPlanning(stationId, d.chauffeurNom, d.date2, 'RD');
        console.log('📅 RD ajouté au planning pour', d.chauffeurNom);
      }
      window._prevReposState[d.id] = d.statut;
    });
    origSave(stationId, demandes);
  };
  // Initialiser l'état précédent
  setTimeout(() => {
    const sid = window.getActiveStationId ? window.getActiveStationId() : null;
    if (sid) {
      const all = loadReposDemandes(sid);
      all.forEach(d => { window._prevReposState[d.id] = d.statut; });
    }
  }, 1500);
}

// Override saveConges pour détecter les acceptations de CP
if (typeof saveConges === 'function') {
  window._prevCongesState = {};
  const origSaveC = saveConges;
  window.saveConges = function(stationId, demandes) {
    demandes.forEach(d => {
      const prevStatut = window._prevCongesState[d.id];
      if (d.statut === 'acceptee' && prevStatut !== 'acceptee') {
        // Appliquer CP pour chaque jour de la période
        const start = new Date(d.dateDebut);
        const end = new Date(d.dateFin);
        for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
          applyDemandeToPlanning(stationId, d.chauffeurNom, dt.toISOString(), 'CP');
        }
        console.log('🏖 CP ajouté au planning pour', d.chauffeurNom);
      }
      window._prevCongesState[d.id] = d.statut;
    });
    origSaveC(stationId, demandes);
  };
  setTimeout(() => {
    const sid = window.getActiveStationId ? window.getActiveStationId() : null;
    if (sid && typeof loadConges === 'function') {
      const all = loadConges(sid);
      all.forEach(d => { window._prevCongesState[d.id] = d.statut; });
    }
  }, 1500);
}
