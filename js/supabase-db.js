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
      _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
      const chauffeurs = data.map(c => ({ nom: c.nom, prenom: c.prenom, telephone: c.telephone, id_amazon: c.id_amazon }));
      localStorage.setItem(stationId + '-repertoire', JSON.stringify(chauffeurs));
      return chauffeurs;
    }
    // Sync localStorage → Supabase si vide
    if (local.length) {
      const rows = local.map(c => ({ station_id: stationId, nom: c.nom || '', prenom: c.prenom || '', telephone: c.telephone || '', id_amazon: c.id_amazon || '' }));
      await sb().from('chauffeurs').upsert(rows, { onConflict: 'id' });
    }
    return local;
  } catch (e) {
    console.warn('dbLoadChauffeurs fallback:', e.message);
    return local;
  }
};

window.dbSaveChauffeurs = async function (stationId, chauffeurs) {
  localStorage.setItem(stationId + '-repertoire', JSON.stringify(chauffeurs));
  if (!sb()) return;
  try {
    // Supprimer les anciens et réinsérer
    await sb().from('chauffeurs').delete().eq('station_id', stationId);
    if (chauffeurs.length) {
      const rows = chauffeurs.map(c => ({ station_id: stationId, nom: c.nom || '', prenom: c.prenom || '', telephone: c.telephone || '', id_amazon: c.id_amazon || '' }));
      await sb().from('chauffeurs').insert(rows);
    }
  } catch (e) { console.warn('dbSaveChauffeurs error:', e.message); }
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
    // D'abord essayer update
    let query = sb().from(table).update({ data });
    Object.entries(filters).forEach(([k, v]) => { query = query.eq(k, v); });
    const { data: updated, error: updateErr } = await query.select();
    
    // Si rien n'a été mis à jour (pas de ligne existante), insert
    if (!updateErr && (!updated || updated.length === 0)) {
      await sb().from(table).insert({ ...filters, data });
    }
  } catch (e) { console.warn(`dbSave(${table}) error:`, e.message); }
};

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

  try {
    // Heures
    const { data: heuresData } = await sb().from('heures').select('date_jour, data').eq('station_id', stationId);
    if (heuresData) {
      const supabaseKeys = new Set(heuresData.map(h => stationId + '-heures-' + h.date_jour));
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(stationId + '-heures-') && !supabaseKeys.has(k)) localStorage.removeItem(k);
      }
      heuresData.forEach(h => {
        const key = stationId + '-heures-' + h.date_jour;
        localStorage.setItem(key, JSON.stringify(h.data));
      });
      console.log(`  Heures: ${heuresData.length} jours`);
    }

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

    // Primes
    const { data: primesData } = await sb().from('primes').select('annee, mois, data').eq('station_id', stationId);
    if (primesData) {
      primesData.forEach(p => {
        const key = stationId + '-primes-' + p.annee + '-' + String(p.mois).padStart(2, '0');
        localStorage.setItem(key, JSON.stringify(p.data));
      });
      console.log(`  Primes: ${primesData.length} mois`);
    }

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

    // Dégâts
    const { data: degData } = await sb().from('degats').select('*').eq('station_id', stationId);
    if (degData) {
      const degats = degData.map(d => ({ id: d.degat_id, plaque: d.plaque, chauffeur: d.chauffeur, date: d.date_incident, description: d.description, photos: d.photos || [] }));
      localStorage.setItem(stationId + '-degats', JSON.stringify(degats));
    }

    // Chauffeurs
    const { data: chData } = await sb().from('chauffeurs').select('*').eq('station_id', stationId);
    if (chData && chData.length) {
      const chauffeurs = chData.map(c => ({ nom: c.nom, prenom: c.prenom, telephone: c.telephone, id_amazon: c.id_amazon }));
      localStorage.setItem(stationId + '-repertoire', JSON.stringify(chauffeurs));
    }

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

    console.log('✅ Préchargement terminé');
  } catch (e) {
    console.warn('Préchargement partiel:', e.message);
  }
};
