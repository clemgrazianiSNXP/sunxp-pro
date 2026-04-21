/* js/badges-calculs.js — Logique de calcul des badges chauffeur (SunXP Pro) */
console.log('badges-calculs.js chargé');

const BADGE_DEFS = [
  // DNR 🎯
  { id:'dnr_bronze', section:'DNR 🎯', name:'Bronze', icon:'🥉', desc:'1 semaine sans DNR', type:'dnr_streak', target:1 },
  { id:'dnr_argent', section:'DNR 🎯', name:'Argent', icon:'🥈', desc:'2 semaines consécutives sans DNR', type:'dnr_streak', target:2 },
  { id:'dnr_or', section:'DNR 🎯', name:'Or', icon:'🥇', desc:'3 semaines consécutives sans DNR', type:'dnr_streak', target:3 },
  { id:'dnr_platine', section:'DNR 🎯', name:'Platine', icon:'💎', desc:'4 semaines consécutives sans DNR', type:'dnr_streak', target:4 },
  { id:'dnr_diamant', section:'DNR 🎯', name:'Diamant', icon:'💠', desc:'6 semaines consécutives sans DNR', type:'dnr_streak', target:6 },
  { id:'dnr_ultime', section:'DNR 🎯', name:'DNR Zéro Absolu', icon:'🌟', desc:'8 semaines consécutives sans DNR', type:'dnr_streak', target:8, animated:true },
  // POD 📸
  { id:'pod_photo', section:'POD 📸', name:'Photographe', icon:'📷', desc:'1 semaine à 100% POD', type:'pod_perfect', target:1 },
  { id:'pod_lynx', section:'POD 📸', name:'Œil de lynx', icon:'🦅', desc:'2 semaines consécutives à 100% POD', type:'pod_perfect', target:2 },
  { id:'pod_perfect', section:'POD 📸', name:'Perfectionniste', icon:'✨', desc:'4 semaines consécutives à 100% POD', type:'pod_perfect', target:4 },
  { id:'pod_legend', section:'POD 📸', name:'Légende POD', icon:'👑', desc:'8 semaines consécutives à 100% POD', type:'pod_perfect', target:8, animated:true },
  { id:'pod_regular', section:'POD 📸', name:'Régularité', icon:'📈', desc:'POD > 99% pendant 4 semaines', type:'pod_high', target:4 },
  // DS 📦
  { id:'ds_fiable', section:'DS 📦', name:'Fiable', icon:'📦', desc:'DS > 98.5% pendant 1 semaine', type:'ds_high', target:1 },
  { id:'ds_solide', section:'DS 📦', name:'Solide', icon:'🏗️', desc:'DS > 98.5% pendant 4 semaines', type:'ds_high', target:4 },
  { id:'ds_indestructible', section:'DS 📦', name:'Indestructible', icon:'🛡️', desc:'DS > 98.5% pendant 8 semaines', type:'ds_high', target:8 },
  { id:'ds_zero', section:'DS 📦', name:'Zéro retour', icon:'🎯', desc:'0 colis retournés sur une semaine', type:'ds_zero_return', target:1 },
  // DWC 🚗
  { id:'dwc_comm', section:'DWC 🚗', name:'Communicant', icon:'📞', desc:'DWC > 90% pendant 1 semaine', type:'dwc_high', target:1 },
  { id:'dwc_pro', section:'DWC 🚗', name:'Pro du contact', icon:'🤝', desc:'DWC > 90% pendant 4 semaines', type:'dwc_high', target:4 },
  { id:'dwc_master', section:'DWC 🚗', name:'Contact Master', icon:'🏆', desc:'DWC > 95% pendant 4 semaines', type:'dwc_master', target:4 },
  { id:'dwc_zero', section:'DWC 🚗', name:'Aucun raté', icon:'💯', desc:'0 Contact Miss sur une semaine', type:'dwc_zero_miss', target:1 },
  // ASSIDUITÉ 📅
  { id:'assi_present', section:'ASSIDUITÉ 📅', name:'Présent', icon:'✅', desc:'0 absence sur un mois', type:'no_absence', target:1 },
  { id:'assi_regulier', section:'ASSIDUITÉ 📅', name:'Régulier', icon:'📅', desc:'0 absence sur 2 mois', type:'no_absence', target:2 },
  { id:'assi_pilier', section:'ASSIDUITÉ 📅', name:'Pilier de l\'équipe', icon:'🏛️', desc:'0 absence sur 3 mois', type:'no_absence', target:3 },
  { id:'assi_toujours', section:'ASSIDUITÉ 📅', name:'Toujours là', icon:'🌟', desc:'0 absence sur 6 mois', type:'no_absence', target:6 },
  // SPÉCIALE 🏆
  { id:'sp_semaine', section:'SPÉCIALE 🏆', name:'Semaine parfaite', icon:'⭐', desc:'DS>98.5 + POD 100 + DWC>90 + 0 DNR', type:'perfect_week', target:1 },
  { id:'sp_mois', section:'SPÉCIALE 🏆', name:'Mois parfait', icon:'🌟', desc:'Semaine parfaite 4 semaines d\'affilée', type:'perfect_week', target:4 },
  { id:'sp_legende', section:'SPÉCIALE 🏆', name:'Légende', icon:'👑', desc:'Mois parfait 2 mois consécutifs', type:'perfect_week', target:8, animated:true },
];

/** Calcule tous les badges pour un chauffeur. Retourne { badgeId: { unlocked, date, progress, current } } */
function calculateBadges(stationId, chauffeur) {
  const id = (chauffeur.id_amazon || '').replace(/\s/g, '').toUpperCase();
  const nom = ((chauffeur.prenom || '') + ' ' + (chauffeur.nom || '')).trim();
  const allWeeks = getAllStatWeeks();
  const results = {};

  // Pré-calculer les données par semaine
  const weekStats = allWeeks.map(week => {
    const ds = getStatRow('dsdpmo', week, id);
    const pod = getStatRow('pod', week, id);
    const dwc = getStatRow('dwc', week, id);
    return {
      week,
      dnr: ds ? (parseInt(ds.nombreDnr) || 0) : null,
      dcrPct: ds ? parseFloat(ds.dcrPct) || 0 : null,
      podPct: pod ? parseFloat(pod.podPct) || 0 : null,
      dwcPct: dwc ? parseFloat(dwc.dwcPct) || 0 : null,
      contactMiss: dwc ? (parseInt(dwc.contactMiss) || 0) : null,
      rejects: pod ? (parseInt(pod.rejects) || 0) : null,
    };
  });

  // DNR streaks
  const dnrStreak = calcStreak(weekStats, w => w.dnr !== null && w.dnr === 0);
  // POD perfect streaks
  const podPerfectStreak = calcStreak(weekStats, w => w.podPct !== null && w.podPct >= 100);
  // POD high streaks (>99%)
  const podHighStreak = calcStreak(weekStats, w => w.podPct !== null && w.podPct > 99);
  // DS high streaks (>98.5%)
  const dsHighStreak = calcStreak(weekStats, w => w.dcrPct !== null && w.dcrPct > 98.5);
  // DWC high streaks (>90%)
  const dwcHighStreak = calcStreak(weekStats, w => w.dwcPct !== null && w.dwcPct > 90);
  // DWC master streaks (>95%)
  const dwcMasterStreak = calcStreak(weekStats, w => w.dwcPct !== null && w.dwcPct > 95);
  // Perfect week streaks
  const perfectStreak = calcStreak(weekStats, w =>
    w.dcrPct !== null && w.dcrPct > 98.5 &&
    w.podPct !== null && w.podPct >= 100 &&
    w.dwcPct !== null && w.dwcPct > 90 &&
    w.dnr !== null && w.dnr === 0
  );

  // One-shot badges
  const hasZeroReturn = weekStats.some(w => w.rejects !== null && w.rejects === 0 && w.podPct !== null);
  const hasZeroMiss = weekStats.some(w => w.contactMiss !== null && w.contactMiss === 0 && w.dwcPct !== null);

  // Assiduité — mois sans absence
  const absenceStreak = calcMonthAbsenceStreak(stationId, nom);

  BADGE_DEFS.forEach(def => {
    let streak = 0, current = 0;
    switch (def.type) {
      case 'dnr_streak': streak = dnrStreak.max; current = dnrStreak.current; break;
      case 'pod_perfect': streak = podPerfectStreak.max; current = podPerfectStreak.current; break;
      case 'pod_high': streak = podHighStreak.max; current = podHighStreak.current; break;
      case 'ds_high': streak = dsHighStreak.max; current = dsHighStreak.current; break;
      case 'ds_zero_return': streak = hasZeroReturn ? 1 : 0; current = streak; break;
      case 'dwc_high': streak = dwcHighStreak.max; current = dwcHighStreak.current; break;
      case 'dwc_master': streak = dwcMasterStreak.max; current = dwcMasterStreak.current; break;
      case 'dwc_zero_miss': streak = hasZeroMiss ? 1 : 0; current = streak; break;
      case 'no_absence': streak = absenceStreak.max; current = absenceStreak.current; break;
      case 'perfect_week': streak = perfectStreak.max; current = perfectStreak.current; break;
    }
    results[def.id] = { unlocked: streak >= def.target, progress: Math.min(current, def.target), target: def.target };
  });

  return results;
}

function getAllStatWeeks() {
  const weekSet = new Set();
  ['dsdpmo','pod','dwc'].forEach(type => {
    if (typeof getWeeksList === 'function') getWeeksList(type).forEach(w => weekSet.add(w));
  });
  return [...weekSet].sort();
}

function getStatRow(type, week, chauffeurId) {
  if (typeof loadStatsData !== 'function') return null;
  const data = loadStatsData(type, week);
  return data.find(r => r.idAmazon && r.idAmazon.replace(/\s/g, '').toUpperCase() === chauffeurId) || null;
}

/** Calcule le streak max et courant pour une condition */
function calcStreak(weekStats, condition) {
  let max = 0, current = 0;
  for (let i = 0; i < weekStats.length; i++) {
    if (condition(weekStats[i])) { current++; max = Math.max(max, current); }
    else current = 0;
  }
  return { max, current };
}

/** Calcule les mois consécutifs sans absence (mois terminés uniquement) */
function calcMonthAbsenceStreak(stationId, chauffeurNom) {
  const now = new Date();
  // Ne compter que les mois terminés (exclure le mois en cours)
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  let max = 0, current = 0;
  for (let i = 11; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    // Exclure le mois en cours
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) continue;
    if (typeof calcMonthTotal === 'function') {
      const mt = calcMonthTotal(stationId, chauffeurNom, d.getFullYear(), d.getMonth());
      if (mt.absences === 0 && mt.joursTravailes > 0) { current++; max = Math.max(max, current); }
      else current = 0;
    }
  }
  return { max, current };
}
