/* js/primes-calculs.js — Calculs des primes */

const _heuresMoisCache = {};

function getHeuresMois(stationId, year, month) {
  const cacheKey = stationId + '-' + year + '-' + month;
  if (_heuresMoisCache[cacheKey]) return _heuresMoisCache[cacheKey];

  const mPad = String(month + 1).padStart(2, '0');
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const data = {};

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = year + '-' + mPad + '-' + String(d).padStart(2, '0');
    const key = stationId + '-heures-' + dateStr;
    try {
      const raw = localStorage.getItem(key);
      if (raw) data[dateStr] = JSON.parse(raw);
    } catch (_) {}
  }

  _heuresMoisCache[cacheKey] = data;
  return data;
}

const PRIME_BAREME = { 0:0,1:0,2:0,3:0,4:0,5:0,6:0,7:55,8:63,9:71,10:78,11:89,12:94,13:102,14:110,15:117 };
const PRIME_MAX = 140;

const IMPACTS = [
  { key:'casseCamion',  label:'Casse Camion',   tarif:1,   montantDirect:true },
  { key:'fico',         label:'Fico',            tarif:10  },
  { key:'mentorVideo',  label:'Mentor/Vidéo',    tarif:20  },
  { key:'ecr',          label:'ECR',             tarif:100 },
  { key:'concessions',  label:'Concessions',     tarif:50  },
  { key:'cle',          label:'Clé',             tarif:5   },
  { key:'trousseau',    label:'Trousseau',        tarif:100 },
  { key:'vigik',        label:'Vigik',            tarif:20  },
  { key:'pdaCasse',     label:'PDA Cassé',        tarif:250 },
  { key:'absences',     label:'Absences',         tarif:50  },
  { key:'prod',         label:'Prod',             tarif:15  },
  { key:'autre',        label:'Autre',            tarif:1,   montantDirect:true },
];

function getPrimeBase(jours) {
  const j = parseInt(jours) || 0;
  if (j >= 16) return PRIME_MAX;
  return PRIME_BAREME[j] || 0;
}

function calcTotalPrime(row, reportPrecedent) {
  const base = getPrimeBase(row.jours);
  let deductions = 0;
  IMPACTS.forEach(imp => {
    const val = parseFloat(row[imp.key]) || 0;
    deductions += imp.montantDirect ? val : val * imp.tarif;
  });
  return base - deductions + (reportPrecedent || 0);
}

function getImpactsList(row) {
  return IMPACTS.filter(imp => {
    const val = parseFloat(row[imp.key]) || 0;
    return val > 0;
  }).map(imp => {
    const val = parseFloat(row[imp.key]) || 0;
    const montant = imp.montantDirect ? val : val * imp.tarif;
    const result = { label: imp.label, montant };
    if (imp.key === 'autre' && row.comment_autre) result.comment = row.comment_autre;
    return result;
  });
}

function primesStorageKey(stationId, year, month) {
  return stationId + '-primes-' + year + '-' + String(month+1).padStart(2,'0');
}

function loadPrimesData(stationId, year, month) {
  try {
    const raw = localStorage.getItem(primesStorageKey(stationId, year, month));
    return raw ? JSON.parse(raw) : {};
  } catch(_) { return {}; }
}

function savePrimesData(stationId, year, month, data) {
  const key = primesStorageKey(stationId, year, month);
  try { localStorage.setItem(key, JSON.stringify(data)); } catch(_) {}
  if (typeof dbSave === 'function') dbSave('primes', key, { station_id: stationId, annee: year, mois: month + 1 }, data);
}

function getReportPrecedent(stationId, year, month) {
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear  = month === 0 ? year - 1 : year;
  const prevData  = loadPrimesData(stationId, prevYear, prevMonth);
  const chauffeurs = loadChauffeurs(stationId);
  // Passer depth=1 pour que la protection fonctionne correctement
  const prevReports = getReportPrecedentRec(stationId, prevYear, prevMonth, 1);
  const reports = {};
  chauffeurs.forEach(c => {
    const key = c.id_amazon || c.id;
    const row = prevData[key] || {};
    const nom = ((c.prenom || '') + ' ' + (c.nom || '')).trim();
    row.jours = countJoursTravailles(stationId, c, prevYear, prevMonth);
    if (typeof window.countFicoForMonth === 'function' && nom) row.fico = window.countFicoForMonth(stationId, nom, prevYear, prevMonth);
    if (typeof window.countAbsencesForMonth === 'function' && nom) row.absences = window.countAbsencesForMonth(stationId, nom, prevYear, prevMonth);
    const prevReport = prevReports[key] || 0;
    const total = calcTotalPrime(row, prevReport);
    reports[key] = total < 0 ? total : 0;
  });
  return reports;
}

// Version récursive limitée à 12 mois pour éviter boucle infinie
function getReportPrecedentRec(stationId, year, month, depth) {
  // Protection : maximum 12 niveaux de récursion
  if (depth >= 12) return {};
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear  = month === 0 ? year - 1 : year;
  const prevData  = loadPrimesData(stationId, prevYear, prevMonth);
  const chauffeurs = loadChauffeurs(stationId);
  // Toujours incrémenter depth correctement
  const prevReports = getReportPrecedentRec(stationId, prevYear, prevMonth, depth + 1);
  const reports = {};
  chauffeurs.forEach(c => {
    const key = c.id_amazon || c.id;
    const row = prevData[key] || {};
    const nom = ((c.prenom || '') + ' ' + (c.nom || '')).trim();
    row.jours = typeof countJoursTravailles === 'function' ? countJoursTravailles(stationId, c, prevYear, prevMonth) : 0;
    if (typeof window.countFicoForMonth === 'function' && nom) row.fico = window.countFicoForMonth(stationId, nom, prevYear, prevMonth);
    if (typeof window.countAbsencesForMonth === 'function' && nom) row.absences = window.countAbsencesForMonth(stationId, nom, prevYear, prevMonth);
    const prevReport = prevReports[key] || 0;
    const total = calcTotalPrime(row, prevReport);
    reports[key] = total < 0 ? total : 0;
  });
  return reports;
}

/**
 * Compte le nombre de jours travaillés dans le mois pour un chauffeur.
 * Utilise le cache getHeuresMois pour éviter un localStorage.getItem par jour.
 */
function countJoursTravailles(stationId, chauffeur, year, month) {
  const nom = ((chauffeur.prenom || '') + ' ' + (chauffeur.nom || '')).trim();
  if (!nom) return 0;

  const heuresMois = getHeuresMois(stationId, year, month);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let jours = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const dayData = heuresMois[dateStr];
    if (!dayData || !dayData.rows) continue;
    const found = Object.values(dayData.rows).find(r =>
      r.nom && r.nom.trim() === nom && r.statut === 'Présent' && r.heureVague
    );
    if (found) jours++;
  }
  return jours;
}

window.clearHeuresMoisCache = function() {
  Object.keys(_heuresMoisCache).forEach(k => delete _heuresMoisCache[k]);
};
