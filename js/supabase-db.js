/* js/supabase-db.js — Couche d'abstraction Supabase + fallback localStorage (SunXP Pro) */
console.log('supabase-db.js chargé');

const SUPABASE_URL = 'https://uqgwmrvtjulpbblucrht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxZ3dtcnZ0anVscGJibHVjcmh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3ODA0MDcsImV4cCI6MjA5MjM1NjQwN30.h1NkKsNuqFubREY0Zzt2VIJYqjJHKn14BUALocVwk5s';

let _supabase = null;
let _supabaseReady = false;

/* ── Init Supabase ────────────────────────────────────────── */
function initSupabase() {
  try {
    if (window.supabase && window.supabase.createClient) {
      _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          detectSessionInUrl: false,
          persistSession: true,
          autoRefreshToken: true
        }
      });
      _supabaseReady = true;
      console.log('✅ Supabase connecté');
    } else {
      console.warn('⚠ SDK Supabase non chargé, fallback localStorage');
    }
  } catch (e) {
    console.error('❌ Erreur init Supabase:', e);
  }
}

function sb() { return _supabaseReady ? _supabase : null; }
window.sb = sb; // Rendre accessible globalement

/* ── Envoi push notification via Edge Function ────────────── */
window.sendPushToStation = async function(stationId, title, body, chauffeurId) {
  if (!sb()) { console.warn('sendPush: sb non dispo'); return; }
  try {
    console.log('📤 Envoi push à la station', stationId, ':', title, chauffeurId ? '(chauffeur: ' + chauffeurId + ')' : '(tous)');
    const payload = { station_id: stationId, title: title, body: body };
    if (chauffeurId) payload.chauffeur_id = chauffeurId;
    const { data, error } = await sb().functions.invoke('send-push', { body: payload });
    if (error) { console.error('❌ Push error:', error.message); return; }
    console.log('✅ Push envoyé:', data);
  } catch (e) { console.error('❌ Push catch:', e.message); }
};

/* ── Helper : écriture double (Supabase + localStorage) ──── */
/* On écrit toujours en localStorage ET en Supabase.
   On lit depuis Supabase si dispo, sinon localStorage. */

/* ══════════════════════════════════════════════════════════════
   STATIONS
   ══════════════════════════════════════════════════════════════ */
window.dbLoadStations = async function () {
  // Toujours lire localStorage d'abord (rapide)
  let local = [];
  try { const r = localStorage.getItem('stations'); if (r) local = JSON.parse(r); } catch (_) {}

  if (!sb()) return local;

  try {
    const { data, error } = await sb().from('stations').select('*');
    if (error) throw error;
    if (data && data.length) {
      const stations = data.map(s => ({ id: s.id, nom: s.nom, ville: s.ville }));
      localStorage.setItem('stations', JSON.stringify(stations));
      return stations;
    }
    // Si Supabase est vide mais localStorage a des données, sync vers Supabase
    if (local.length) {
      for (const s of local) {
        await sb().from('stations').upsert({ id: s.id, nom: s.nom, ville: s.ville });
      }
    }
    return local;
  } catch (e) {
    console.warn('dbLoadStations fallback localStorage:', e.message);
    return local;
  }
};

window.dbSaveStation = async function (station) {
  if (!sb()) return;
  try {
    await sb().from('stations').upsert({ id: station.id, nom: station.nom, ville: station.ville });
  } catch (e) { console.warn('dbSaveStation error:', e.message); }
};

window.dbDeleteStation = async function (stationId) {
  if (!sb()) return;
  try {
    await sb().from('stations').delete().eq('id', stationId);
  } catch (e) { console.warn('dbDeleteStation error:', e.message); }
};

/* ══════════════════════════════════════════════════════════════
   CHAUFFEURS (Répertoire)
   ══════════════════════════════════════════════════════════════ */
window.dbLoadChauffeurs = async function (stationId) {
  let local = [];
  try { const r = localStorage.getItem(stationId + '-repertoire'); if (r) local = JSON.parse(r); } catch (_) {}

  if (!sb()) return local;

  try {
    const { data, error } = await sb().from('chauffeurs').select('*').eq('station_id', stationId);
    if (error) throw error;
    if (data && data.length) {
      const chauffeurs = data.map(c => ({ id: c.local_id || ('c_' + Date.now() + '_' + Math.random().toString(36).slice(2,5)), nom: c.nom, prenom: c.prenom, telephone: c.telephone, id_amazon: c.id_amazon, soldeInitialPrime: c.solde_initial_prime != null ? c.solde_initial_prime : null, matricule_tsm: c.matricule_tsm || '', email: c.email || '', role: c.role || 'Chauffeur', matricule: c.matricule || '' }));
      localStorage.setItem(stationId + '-repertoire', JSON.stringify(chauffeurs));
      return chauffeurs;
    }
    // Sync localStorage → Supabase si vide
    if (local.length) {
      const rows = local.map(c => ({ station_id: stationId, nom: c.nom || '', prenom: c.prenom || '', telephone: c.telephone || '', id_amazon: c.id_amazon || '', email: c.email || '', role: c.role || 'Chauffeur', matricule: c.matricule || '' }));
      await sb().from('chauffeurs').upsert(rows, { onConflict: 'id' });
    }
    return local;
  } catch (e) {
    console.warn('dbLoadChauffeurs fallback:', e.message);
    return local;
  }
};

window.dbSaveChauffeurs = async function (stationId, chauffeurs) {
  if (!sb()) return;
  try {
    // Supprimer les anciens et réinsérer
    await sb().from('chauffeurs').delete().eq('station_id', stationId);
    if (chauffeurs.length) {
      const rows = chauffeurs.map(c => ({ station_id: stationId, nom: c.nom || '', prenom: c.prenom || '', telephone: c.telephone || '', id_amazon: c.id_amazon || '', local_id: c.id || '', solde_initial_prime: c.soldeInitialPrime != null ? c.soldeInitialPrime : null, matricule_tsm: c.matricule_tsm || '', email: c.email || '', role: c.role || 'Chauffeur', matricule: c.matricule || '' }));
      await sb().from('chauffeurs').insert(rows);
    }
  } catch (e) { console.warn('dbSaveChauffeurs error:', e.message); }
};

/* ══════════════════════════════════════════════════════════════
   RESPONSABLES (Répertoire)
   ══════════════════════════════════════════════════════════════ */
window.dbSaveResponsables = async function (stationId, responsables) {
  if (!sb()) return;
  try {
    await sb().from('responsables').delete().eq('station_id', stationId);
    if (responsables.length) {
      const rows = responsables.map(r => ({ station_id: stationId, local_id: r.id || '', nom: r.nom || '', prenom: r.prenom || '', role: r.role || '', matricule: r.matricule || '', id_amazon: r.id_amazon || '' }));
      await sb().from('responsables').insert(rows);
    }
  } catch (e) { console.warn('dbSaveResponsables error:', e.message); }
};

/* ══════════════════════════════════════════════════════════════
   PLANNING (mensuel)
   ══════════════════════════════════════════════════════════════ */
let _planSaveTimeout = null;
let _planSavePending = null;

window.dbSavePlanning = async function (stationId, year, month, data) {
  if (!sb()) return;
  // Debounce : attendre 500ms avant de sauver (évite les conflits si plusieurs cellules changent vite)
  _planSavePending = { stationId, year, month, data };
  if (_planSaveTimeout) clearTimeout(_planSaveTimeout);
  _planSaveTimeout = setTimeout(async () => {
    const p = _planSavePending;
    if (!p) return;
    _planSavePending = null;
    try {
      await sb().from('planning').delete().eq('station_id', p.stationId).eq('year', p.year).eq('month', p.month + 1);
      const { error } = await sb().from('planning').insert({ station_id: p.stationId, year: p.year, month: p.month + 1, data: p.data });
      if (error) console.error('dbSavePlanning error:', error.message);
      else console.log('✅ Planning sauvé Supabase:', p.year + '-' + (p.month + 1));
    } catch (e) { console.warn('dbSavePlanning catch:', e.message); }
  }, 500);
};

/* Version directe sans debounce (pour sync) */
window.dbSavePlanningDirect = async function (stationId, year, month, data) {
  if (!sb()) return;
  try {
    await sb().from('planning').delete().eq('station_id', stationId).eq('year', year).eq('month', month + 1);
    const { error } = await sb().from('planning').insert({ station_id: stationId, year: year, month: month + 1, data: data });
    if (error) console.error('dbSavePlanningDirect error:', error.message);
    else console.log('✅ Planning sauvé (direct):', year + '-' + (month + 1));
  } catch (e) { console.warn('dbSavePlanningDirect catch:', e.message); }
};

window.dbSavePlanningMeta = async function (stationId, year, month, meta) {
  if (!sb()) return;
  try {
    const key = year + '-' + String(month + 1).padStart(2, '0');
    await sb().from('planning_meta').delete().eq('station_id', stationId).eq('mois_key', key);
    const { error } = await sb().from('planning_meta').insert({ station_id: stationId, mois_key: key, annee: year, mois: month + 1, data: meta });
    if (error) console.error('dbSavePlanningMeta error:', error.message, error.details);
    else console.log('✅ Planning meta sauvé Supabase:', key);
  } catch (e) { console.warn('dbSavePlanningMeta catch:', e.message); }
};

/* ══════════════════════════════════════════════════════════════
   GENERIC JSONB TABLES (heures, activite, stats, primes, etc.)
   Toutes ces tables ont la même structure : station_id + clé + data JSONB
   ══════════════════════════════════════════════════════════════ */

/**
 * Lecture générique : table avec station_id + une clé unique
 * @param {string} table - nom de la table Supabase
 * @param {string} lsKey - clé localStorage
 * @param {object} filters - { station_id, date_jour?, semaine?, type?, annee?, mois? }
 */
window.dbLoad = async function (table, lsKey, filters) {
  let local = null;
  try { const r = localStorage.getItem(lsKey); if (r) local = JSON.parse(r); } catch (_) {}

  if (!sb()) return local;

  try {
    let query = sb().from(table).select('data');
    Object.entries(filters).forEach(([k, v]) => { query = query.eq(k, v); });
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (data) {
      localStorage.setItem(lsKey, JSON.stringify(data.data));
      return data.data;
    }
    // Sync localStorage → Supabase
    if (local !== null) {
      await sb().from(table).upsert({ ...filters, data: local });
    }
    return local;
  } catch (e) {
    console.warn(`dbLoad(${table}) fallback:`, e.message);
    return local;
  }
};

/**
 * Écriture générique : sauvegarde en localStorage + Supabase
 */
window.dbSave = async function (table, lsKey, filters, data) {
  localStorage.setItem(lsKey, JSON.stringify(data));
  if (!sb()) return;
  try {
    // Nettoyer le station_id pour éviter le bug DWP2:1
    if (filters && filters.station_id) {
      filters.station_id = String(filters.station_id).split(':')[0].trim();
    }

    const payload = { ...filters, data };
    let onConflict;
    switch (table) {
      case 'primes':   onConflict = 'station_id,annee,mois'; break;
      case 'stats':    onConflict = 'station_id,type,semaine'; break;
      case 'heures':   onConflict = 'station_id,date_jour'; break;
      case 'planning': onConflict = 'station_id,year,month'; break;
      default:         onConflict = Object.keys(filters).join(','); break;
    }
    const { error } = await sb().from(table).upsert(payload, { onConflict });
    if (error) throw new Error(error.message);
  } catch (e) {
    console.warn(`dbSave(${table}) error:`, e.message);
    _logSyncError(table, lsKey, e.message);
  }
};

/* ── Gestion erreurs de sync ──────────────────────────────── */
function _logSyncError(table, lsKey, message) {
  try {
    // Ajouter au log (max 20 entrées)
    const log = JSON.parse(localStorage.getItem('sync-errors-log') || '[]');
    log.unshift({ table, key: lsKey, date: new Date().toISOString(), message });
    if (log.length > 20) log.length = 20;
    localStorage.setItem('sync-errors-log', JSON.stringify(log));

    // Incrémenter le compteur
    const count = (parseInt(localStorage.getItem('sync-errors-count') || '0')) + 1;
    localStorage.setItem('sync-errors-count', String(count));

    // Vérifier si > 3 erreurs en < 10 minutes → alerte push admin
    const recent = log.filter(e => (Date.now() - new Date(e.date).getTime()) < 10 * 60 * 1000);
    if (recent.length > 3 && typeof sendPushToStation === 'function') {
      // Envoyer une alerte à toutes les stations (l'admin la recevra)
      const sid = (typeof getActiveStationId === 'function' && getActiveStationId()) || null;
      if (sid) sendPushToStation(sid, '⚠️ Sync Supabase en échec', recent.length + ' erreurs détectées en moins de 10 min');
    }
  } catch (_) {}
}

/**
 * Suppression générique
 */
window.dbDelete = async function (table, lsKey, filters) {
  localStorage.removeItem(lsKey);
  if (!sb()) return;
  try {
    let query = sb().from(table).delete();
    Object.entries(filters).forEach(([k, v]) => { query = query.eq(k, v); });
    await query;
  } catch (e) { console.warn(`dbDelete(${table}) error:`, e.message); }
};

/* ══════════════════════════════════════════════════════════════
   DÉGÂTS (structure différente — liste d'items individuels)
   ══════════════════════════════════════════════════════════════ */
window.dbLoadDegats = async function (stationId) {
  let local = [];
  try { const r = localStorage.getItem(stationId + '-degats'); if (r) local = JSON.parse(r); } catch (_) {}

  if (!sb()) return local;

  try {
    const { data, error } = await sb().from('degats').select('*').eq('station_id', stationId);
    if (error) throw error;
    if (data && data.length) {
      const degats = data.map(d => ({ id: d.degat_id, plaque: d.plaque, chauffeur: d.chauffeur, date: d.date_incident, description: d.description, photos: d.photos || [] }));
      localStorage.setItem(stationId + '-degats', JSON.stringify(degats));
      return degats;
    }
    if (local.length) {
      const rows = local.map(d => ({ station_id: stationId, degat_id: d.id, plaque: d.plaque, chauffeur: d.chauffeur, date_incident: d.date, description: d.description || '', photos: d.photos || [] }));
      await sb().from('degats').insert(rows);
    }
    return local;
  } catch (e) {
    console.warn('dbLoadDegats fallback:', e.message);
    return local;
  }
};

window.dbSaveDegat = async function (stationId, degat) {
  if (!sb()) return;
  try {
    await sb().from('degats').insert({ station_id: stationId, degat_id: degat.id, plaque: degat.plaque, chauffeur: degat.chauffeur, date_incident: degat.date, description: degat.description || '', photos: degat.photos || [] });
  } catch (e) { console.warn('dbSaveDegat error:', e.message); }
};

window.dbDeleteDegat = async function (stationId, degatId) {
  if (!sb()) return;
  try {
    await sb().from('degats').delete().eq('station_id', stationId).eq('degat_id', degatId);
  } catch (e) { console.warn('dbDeleteDegat error:', e.message); }
};

/* ══════════════════════════════════════════════════════════════
   SYNC INITIAL — Pousse les données localStorage vers Supabase
   À appeler une seule fois pour migrer les données existantes
   ══════════════════════════════════════════════════════════════ */
window.dbSyncAll = async function () {
  if (!sb()) { alert('Supabase non connecté.'); return; }
  console.log('🔄 Sync localStorage → Supabase...');

  // 1. Stations
  const stations = await dbLoadStations();
  console.log(`  Stations: ${stations.length}`);

  // 2. Pour chaque station, sync les données
  for (const station of stations) {
    const sid = station.id;
    console.log(`  Station ${sid}...`);

    // Chauffeurs
    await dbLoadChauffeurs(sid);

    // Heures (scanner toutes les clés {sid}-heures-{date})
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(sid + '-heures-')) {
        const dateStr = k.replace(sid + '-heures-', '');
        const data = JSON.parse(localStorage.getItem(k));
        await dbSave('heures', k, { station_id: sid, date_jour: dateStr }, data);
      }
    }

    // Stats
    for (const type of ['dsdpmo', 'pod', 'dwc']) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        const prefix = sid + '-stats-' + type + '-';
        if (k && k.startsWith(prefix)) {
          const semaine = k.replace(prefix, '');
          const data = JSON.parse(localStorage.getItem(k));
          await dbSave('stats', k, { station_id: sid, type, semaine }, data);
        }
      }
    }

    // Activité
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(sid + '-activite-')) {
        const dateStr = k.replace(sid + '-activite-', '');
        const data = JSON.parse(localStorage.getItem(k));
        await dbSave('activite', k, { station_id: sid, date_jour: dateStr }, data);
      }
    }

    // Concessions
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(sid + '-concessions-')) {
        const semaine = k.replace(sid + '-concessions-', '');
        const data = JSON.parse(localStorage.getItem(k));
        await dbSave('concessions', k, { station_id: sid, semaine }, data);
      }
    }

    // Retards
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(sid + '-retards-')) {
        const semaine = k.replace(sid + '-retards-', '');
        const data = JSON.parse(localStorage.getItem(k));
        await dbSave('retards', k, { station_id: sid, semaine }, data);
      }
    }

    // Absences injustifiées
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(sid + '-absences-')) {
        const semaine = k.replace(sid + '-absences-', '');
        const data = JSON.parse(localStorage.getItem(k));
        await dbSave('absences', k, { station_id: sid, semaine }, data);
      }
    }

    // Primes
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(sid + '-primes-')) {
        const parts = k.replace(sid + '-primes-', '').split('-');
        if (parts.length === 2) {
          const data = JSON.parse(localStorage.getItem(k));
          await dbSave('primes', k, { station_id: sid, annee: parseInt(parts[0]), mois: parseInt(parts[1]) }, data);
        }
      }
    }

    // Dégâts
    await dbLoadDegats(sid);

    // Camions
    const camionsRaw = localStorage.getItem(sid + '-camions');
    if (camionsRaw) {
      const camionsList = JSON.parse(camionsRaw);
      if (camionsList.length) await dbSave('camions', sid + '-camions', { station_id: sid }, camionsList);
    }

    // Documents chauffeurs
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(sid + '-docs-chauffeur-')) {
        const chauffeur = k.replace(sid + '-docs-chauffeur-', '');
        const data = JSON.parse(localStorage.getItem(k));
        await dbSave('docs_chauffeurs', k, { station_id: sid, chauffeur }, data);
      }
    }

    // Clés & Codes
    const clesRaw = localStorage.getItem(sid + '-cles-codes');
    if (clesRaw) {
      const clesData = JSON.parse(clesRaw);
      await dbSave('cles_codes', sid + '-cles-codes', { station_id: sid }, clesData);
    }

    // Responsables
    const respRaw = localStorage.getItem(sid + '-responsables');
    if (respRaw) {
      const respList = JSON.parse(respRaw);
      if (respList.length) await dbSaveResponsables(sid, respList);
    }

    // Planning
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(sid + '-planning-') && !k.includes('-meta-')) {
        const moisKey = k.replace(sid + '-planning-', '');
        const parts = moisKey.split('-');
        if (parts.length === 2) {
          const data = JSON.parse(localStorage.getItem(k));
          await dbSavePlanningDirect(sid, parseInt(parts[0]), parseInt(parts[1]) - 1, data);
        }
      }
      if (k && k.startsWith(sid + '-planning-meta-')) {
        const moisKey = k.replace(sid + '-planning-meta-', '');
        const parts = moisKey.split('-');
        if (parts.length === 2) {
          const meta = JSON.parse(localStorage.getItem(k));
          await dbSavePlanningMeta(sid, parseInt(parts[0]), parseInt(parts[1]) - 1, meta);
        }
      }
    }

    console.log(`  ✅ ${sid} synced`);
  }

  console.log('✅ Sync terminée !');
  alert('Synchronisation terminée ! Vos données sont maintenant sur Supabase.');
};

/* ── Init au chargement ───────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Attendre que le SDK Supabase soit chargé
  setTimeout(initSupabase, 500);
});

/* ══════════════════════════════════════════════════════════════
   PRELOAD — Charge toutes les données d'une station depuis Supabase
   vers localStorage (pour le portail chauffeur sur un autre appareil)
   ══════════════════════════════════════════════════════════════ */
window.preloadStationData = async function (stationId) {
  if (!sb()) return;
  console.log('📥 Préchargement données station', stationId, '...');

  // Créer l'écran de chargement
  const loadingScreen = document.createElement('div');
  loadingScreen.id = 'preload-loading-screen';
  loadingScreen.style.cssText = 'position:fixed;inset:0;z-index:99999;background:var(--bg-primary);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:24px;';
  loadingScreen.innerHTML = `
    <img src="img/matting_2026-4-21_fa553fc4-3d99-11f1-9b2d-16737e16766a.png" style="height:50px;width:auto;opacity:0.9;">
    <div style="font-size:16px;font-weight:700;color:var(--text-primary);">Chargement de la station...</div>
    <div style="width:100%;max-width:320px;background:var(--bg-sidebar);border-radius:20px;height:12px;overflow:hidden;border:1px solid var(--border);">
      <div id="preload-progress-bar" style="height:100%;background:var(--accent);border-radius:20px;width:0%;transition:width 0.3s ease;"></div>
    </div>
    <div id="preload-progress-text" style="font-size:12px;color:var(--text-muted);">Initialisation...</div>
    <div id="preload-progress-pct" style="font-size:11px;color:var(--accent);font-family:monospace;font-weight:700;">0%</div>
  `;
  document.body.appendChild(loadingScreen);

  const updateProgress = (pct, label) => {
    const bar = document.getElementById('preload-progress-bar');
    const text = document.getElementById('preload-progress-text');
    const pctEl = document.getElementById('preload-progress-pct');
    if (bar) bar.style.width = pct + '%';
    if (text) text.textContent = label;
    if (pctEl) pctEl.textContent = pct + '%';
  };

  try {
    updateProgress(5, 'Connexion à Supabase...');

    // Heures
    const { data: heuresData } = await sb().from('heures').select('date_jour, data').eq('station_id', stationId);
    if (heuresData) {
      // Only ADD/UPDATE from Supabase, never delete local data
      heuresData.forEach(h => {
        const key = stationId + '-heures-' + h.date_jour;
        localStorage.setItem(key, JSON.stringify(h.data));
      });
      console.log(`  Heures: ${heuresData.length} jours`);
    }
    updateProgress(32, '⏰ Chargement des heures...');

    // Stats
    const { data: statsData } = await sb().from('stats').select('type, semaine, data').eq('station_id', stationId);
    if (statsData) {
      // Nettoyer les anciennes stats locales qui n'existent plus dans Supabase
      const supabaseKeys = new Set(statsData.map(s => stationId + '-stats-' + s.type + '-' + s.semaine));
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(stationId + '-stats-') && !supabaseKeys.has(k)) {
          localStorage.removeItem(k);
        }
      }
      statsData.forEach(s => {
        const key = stationId + '-stats-' + s.type + '-' + s.semaine;
        localStorage.setItem(key, JSON.stringify(s.data));
      });
      console.log(`  Stats: ${statsData.length} entrées`);
    }
    updateProgress(42, '📊 Chargement des statistiques...');

    // Primes — ne charger que si pas déjà en localStorage
    const { data: primesData } = await sb().from('primes').select('annee, mois, data').eq('station_id', stationId);
    if (primesData) {
      let loaded = 0;
      primesData.forEach(p => {
        const key = stationId + '-primes-' + p.annee + '-' + String(p.mois).padStart(2, '0');
        if (!localStorage.getItem(key) && p.data && Object.keys(p.data).length > 0) {
          localStorage.setItem(key, JSON.stringify(p.data));
          loaded++;
        }
      });
      if (loaded) console.log(`  Primes: ${loaded} mois chargés depuis Supabase`);
    }
    updateProgress(60, '💰 Chargement des primes...');

    // Activité
    const { data: actData } = await sb().from('activite').select('date_jour, data').eq('station_id', stationId);
    if (actData) {
      const supabaseKeys = new Set(actData.map(a => stationId + '-activite-' + a.date_jour));
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(stationId + '-activite-') && !supabaseKeys.has(k)) localStorage.removeItem(k);
      }
      actData.forEach(a => {
        const key = stationId + '-activite-' + a.date_jour;
        localStorage.setItem(key, JSON.stringify(a.data));
      });
      console.log(`  Activité: ${actData.length} jours`);
    }
    updateProgress(67, '🚛 Chargement de l\'activité...');

    // Concessions
    const { data: concData } = await sb().from('concessions').select('semaine, data').eq('station_id', stationId);
    if (concData) {
      const supabaseKeys = new Set(concData.map(c => stationId + '-concessions-' + c.semaine));
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(stationId + '-concessions-') && !supabaseKeys.has(k)) localStorage.removeItem(k);
      }
      concData.forEach(c => {
        const key = stationId + '-concessions-' + c.semaine;
        localStorage.setItem(key, JSON.stringify(c.data));
      });
    }

    // Retards
    const { data: retData } = await sb().from('retards').select('semaine, data').eq('station_id', stationId);
    if (retData) {
      const supabaseKeys = new Set(retData.map(r => stationId + '-retards-' + r.semaine));
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(stationId + '-retards-') && !supabaseKeys.has(k)) localStorage.removeItem(k);
      }
      retData.forEach(r => {
        const key = stationId + '-retards-' + r.semaine;
        localStorage.setItem(key, JSON.stringify(r.data));
      });
    }

    // Absences injustifiées
    const { data: absData } = await sb().from('absences').select('semaine, data').eq('station_id', stationId);
    if (absData) {
      const supabaseKeys = new Set(absData.map(a => stationId + '-absences-' + a.semaine));
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(stationId + '-absences-') && !supabaseKeys.has(k)) localStorage.removeItem(k);
      }
      absData.forEach(a => {
        const key = stationId + '-absences-' + a.semaine;
        localStorage.setItem(key, JSON.stringify(a.data));
      });
    }

    // Dégâts
    const { data: degData } = await sb().from('degats').select('*').eq('station_id', stationId);
    if (degData) {
      const degats = degData.map(d => ({ id: d.degat_id, plaque: d.plaque, chauffeur: d.chauffeur, date: d.date_incident, description: d.description, photos: d.photos || [] }));
      localStorage.setItem(stationId + '-degats', JSON.stringify(degats));
    }

    // EOS
    const { data: eosData } = await sb().from('eos').select('date_jour, data').eq('station_id', stationId);
    if (eosData) {
      const supabaseKeys = new Set(eosData.map(e => stationId + '-eos-' + e.date_jour));
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(stationId + '-eos-') && !supabaseKeys.has(k)) localStorage.removeItem(k);
      }
      eosData.forEach(e => {
        localStorage.setItem(stationId + '-eos-' + e.date_jour, JSON.stringify(e.data));
      });
      console.log(`  EOS: ${eosData.length} jours`);
    }
    updateProgress(77, '📋 Chargement des EOS...');

    // Chauffeurs
    const { data: chData } = await sb().from('chauffeurs').select('*').eq('station_id', stationId);
    if (chData && chData.length) {
      const chauffeurs = chData.map(c => ({ id: c.local_id || ('c_' + Date.now() + '_' + Math.random().toString(36).slice(2,5)), nom: c.nom, prenom: c.prenom, telephone: c.telephone, id_amazon: c.id_amazon, soldeInitialPrime: c.solde_initial_prime != null ? c.solde_initial_prime : null, matricule_tsm: c.matricule_tsm || '', email: c.email || '', role: c.role || 'Chauffeur', matricule: c.matricule || '' }));
      localStorage.setItem(stationId + '-repertoire', JSON.stringify(chauffeurs));
    }
    updateProgress(15, '👥 Chargement des chauffeurs...');

    // Repos demandes
    const { data: reposData } = await sb().from('repos_demandes').select('data').eq('station_id', stationId).maybeSingle();
    if (reposData && reposData.data) {
      localStorage.setItem(stationId + '-repos-demandes', JSON.stringify(reposData.data));
      console.log('  Repos: chargés');
    }

    // Camions
    const { data: camionsData } = await sb().from('camions').select('data').eq('station_id', stationId).maybeSingle();
    if (camionsData && camionsData.data) {
      localStorage.setItem(stationId + '-camions', JSON.stringify(camionsData.data));
      console.log('  Camions: chargés');
    } else {
      localStorage.setItem(stationId + '-camions', '[]');
    }
    updateProgress(72, '🚛 Chargement de la flotte...');

    // Acomptes
    const { data: acomptesData } = await sb().from('acomptes').select('data').eq('station_id', stationId).maybeSingle();
    if (acomptesData && acomptesData.data) {
      localStorage.setItem(stationId + '-acomptes', JSON.stringify(acomptesData.data));
    } else {
      localStorage.setItem(stationId + '-acomptes', '[]');
    }

    // Congés payés
    const { data: congesData } = await sb().from('conges_payes').select('data').eq('station_id', stationId).maybeSingle();
    if (congesData && congesData.data) {
      localStorage.setItem(stationId + '-conges-payes', JSON.stringify(congesData.data));
    } else {
      localStorage.setItem(stationId + '-conges-payes', '[]');
    }

    // Contacts
    const { data: contactsData } = await sb().from('contacts').select('data').eq('station_id', stationId).maybeSingle();
    if (contactsData && contactsData.data) {
      localStorage.setItem(stationId + '-contacts', JSON.stringify(contactsData.data));
    }
    updateProgress(82, '📇 Chargement des contacts...');

    // Suivi papiers
    const { data: papiersData } = await sb().from('suivi_papiers').select('data').eq('station_id', stationId).maybeSingle();
    if (papiersData && papiersData.data) {
      localStorage.setItem(stationId + '-suivi-papiers', JSON.stringify(papiersData.data));
    }
    updateProgress(85, '📄 Chargement des documents...');

    // Suivi entretien
    const { data: entretienData } = await sb().from('suivi_entretien').select('data').eq('station_id', stationId).maybeSingle();
    if (entretienData && entretienData.data) {
      localStorage.setItem(stationId + '-suivi-entretien', JSON.stringify(entretienData.data));
    }
    updateProgress(88, '🔧 Chargement de l\'entretien...');

    // Documents bureau
    const { data: documentsData } = await sb().from('documents').select('data').eq('station_id', stationId).maybeSingle();
    if (documentsData && documentsData.data) {
      localStorage.setItem(stationId + '-documents', JSON.stringify(documentsData.data));
    }

    // Docs employés
    const { data: docsEmpData } = await sb().from('docs_employes').select('chauffeur_nom, data').eq('station_id', stationId);
    if (docsEmpData && docsEmpData.length) {
      docsEmpData.forEach(d => {
        localStorage.setItem(stationId + '-docs-employes-' + d.chauffeur_nom, JSON.stringify(d.data));
      });
    }
    updateProgress(91, '👤 Chargement des dossiers employés...');

    // Clés & Codes
    const { data: clesData } = await sb().from('cles_codes').select('data').eq('station_id', stationId).maybeSingle();
    if (clesData && clesData.data) {
      localStorage.setItem(stationId + '-cles-codes', JSON.stringify(clesData.data));
      console.log('  Clés & Codes: chargés');
    }

    // Problèmes Camions
    const { data: probData } = await sb().from('problemes_camions').select('data').eq('station_id', stationId).maybeSingle();
    if (probData && probData.data) {
      localStorage.setItem(stationId + '-problemes-camions', JSON.stringify(probData.data));
      console.log('  Problèmes Camions: chargés');
    }

    // Responsables
    const { data: respData } = await sb().from('responsables').select('*').eq('station_id', stationId);
    if (respData && respData.length) {
      const responsables = respData.map(r => ({ id: r.local_id || ('p_' + Date.now()), nom: r.nom, prenom: r.prenom, role: r.role, matricule: r.matricule || '', id_amazon: r.id_amazon || '' }));
      localStorage.setItem(stationId + '-responsables', JSON.stringify(responsables));
      console.log(`  Responsables: ${responsables.length}`);
    }
    updateProgress(22, '👔 Chargement des responsables...');

    // Planning
    const { data: planData } = await sb().from('planning').select('year, month, data').eq('station_id', stationId);
    if (planData && planData.length) {
      planData.forEach(p => {
        const key = stationId + '-planning-' + p.year + '-' + String(p.month).padStart(2, '0');
        localStorage.setItem(key, JSON.stringify(p.data));
      });
      console.log(`  Planning: ${planData.length} mois`);
    }
    updateProgress(52, '📅 Chargement du planning...');

    // Planning Meta
    const { data: planMetaData } = await sb().from('planning_meta').select('mois_key, data').eq('station_id', stationId);
    if (planMetaData && planMetaData.length) {
      planMetaData.forEach(p => {
        const key = stationId + '-planning-meta-' + p.mois_key;
        localStorage.setItem(key, JSON.stringify(p.data));
      });
    }

    // Planning Published (semaines publiées aux chauffeurs)
    const { data: pubData } = await sb().from('planning_published').select('data').eq('station_id', stationId).maybeSingle();
    if (pubData && pubData.data) {
      localStorage.setItem(stationId + '-planning-published', JSON.stringify(pubData.data));
      console.log('  Planning published: chargé');
    }

    // Attribution (aujourd'hui seulement)
    if (typeof sb === 'function' && sb() && sb().supabaseKey) {
      const today = new Date();
      const todayDateStr = today.toISOString().slice(0, 10);
      const attrKey = stationId + '-attribution-' + todayDateStr;
      try {
        const { data: attrData } = await sb().from('attribution')
          .select('data')
          .eq('station_id', stationId)
          .eq('date_jour', todayDateStr)
          .maybeSingle();
        if (attrData && attrData.data) {
          localStorage.setItem(attrKey, JSON.stringify(attrData.data));
        }
      } catch(e) {
        console.warn('Attribution preload error:', e.message);
      }
    }

    updateProgress(95, '🗓 Chargement de l\'attribution...');
    updateProgress(100, '✅ Chargement terminé !');
    setTimeout(() => {
      const screen = document.getElementById('preload-loading-screen');
      if (screen) {
        screen.style.transition = 'opacity 0.4s ease';
        screen.style.opacity = '0';
        setTimeout(() => screen.remove(), 400);
      }
    }, 500);
    console.log('✅ Préchargement terminé');
  } catch (e) {
    console.warn('Préchargement partiel:', e.message);
  }
};
