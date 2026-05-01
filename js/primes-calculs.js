/* js/primes-calculs.js — Calculs des primes */

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
  const chauffeurs = getChauffeursList(stationId);
  const reports = {};
  chauffeurs.forEach(c => {
    const key = c.id_amazon || c.id;
    const row = prevData[key] || {};
    const hasPrevData = Object.keys(row).some(k => k !== 'jours' && row[k]);
    if (!hasPrevData) {
      reports[key] = 0;
    } else {
      // Recalculer les champs auto pour le mois précédent
      const nom = ((c.prenom || '') + ' ' + (c.nom || '')).trim();
      row.jours = countJoursTravailles(stationId, c, prevYear, prevMonth);
      if (typeof window.countFicoForMonth === 'function' && nom) row.fico = window.countFicoForMonth(stationId, nom, prevYear, prevMonth);
      if (typeof window.countAbsencesForMonth === 'function' && nom) row.absences = window.countAbsencesForMonth(stationId, nom, prevYear, prevMonth);
      const total = calcTotalPrime(row, 0);
      reports[key] = total < 0 ? total : 0;
    }
  });
  return reports;
}

function getChauffeursList(stationId) {
  try {
    const raw = localStorage.getItem(stationId + '-repertoire');
    return raw ? JSON.parse(raw) : [];
  } catch(_) { return []; }
}

/**
 * Compte le nombre de jours travaillés dans le mois pour un chauffeur.
 * Cherche par nom (prenom + nom) dans les données heures de chaque jour.
 */
function countJoursTravailles(stationId, chauffeur, year, month) {
  const nom = ((chauffeur.prenom || '') + ' ' + (chauffeur.nom || '')).trim();
  if (!nom) return 0;
  let jours = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const key = stationId + '-heures-' + dateStr;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw);
      if (!data.rows) continue;
      const found = Object.values(data.rows).find(r =>
        r.nom && r.nom.trim() === nom && r.statut === 'Présent' && r.heureVague
      );
      if (found) jours++;
    } catch (_) {}
  }
  return jours;
}
