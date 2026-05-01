/* js/realtime.js — Supabase Realtime pour heures et notifications (SunXP Pro) */
console.log('realtime.js chargé');

let realtimeChannel = null;

/**
 * Initialise les abonnements Realtime Supabase.
 * À appeler après que Supabase soit connecté et qu'une station soit sélectionnée.
 */
function initRealtime() {
  if (typeof sb !== 'function' || !sb()) {
    console.warn('⚠ Realtime: Supabase non disponible');
    return;
  }

  const stationId = window.getActiveStationId ? window.getActiveStationId() : null;
  if (!stationId) return;

  // Nettoyer l'ancien channel si existant
  if (realtimeChannel) {
    sb().removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  realtimeChannel = sb().channel('station-' + stationId);

  // ── Écouter les changements sur la table heures ──
  realtimeChannel.on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'heures',
    filter: 'station_id=eq.' + stationId
  }, payload => {
    console.log('🔄 Realtime heures:', payload.eventType);
    const row = payload.new || payload.old;
    if (row && row.date_jour && row.data) {
      const key = stationId + '-heures-' + row.date_jour;
      localStorage.setItem(key, JSON.stringify(row.data));
      // Rafraîchir la vue heures si elle est active
      if (typeof renderHeures === 'function' && document.getElementById('module-heures')) {
        renderHeures();
      }
    }
  });

  // ── Écouter les demandes de repos ──
  realtimeChannel.on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'repos_demandes'
  }, payload => {
    console.log('🔔 Realtime repos_demandes:', payload.eventType, payload.new);
    if (payload.new && payload.new.station_id === stationId) {
      handleDemandeNotification(payload, 'repos');
    }
  });

  // ── Écouter les demandes d'acompte ──
  realtimeChannel.on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'acomptes'
  }, payload => {
    console.log('🔔 Realtime acomptes:', payload.eventType, payload.new);
    if (payload.new && payload.new.station_id === stationId) {
      handleDemandeNotification(payload, 'acompte');
    }
  });

  // ── Écouter les demandes de congés ──
  realtimeChannel.on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'conges_payes'
  }, payload => {
    console.log('🔔 Realtime conges_payes:', payload.eventType, payload.new);
    if (payload.new && payload.new.station_id === stationId) {
      handleDemandeNotification(payload, 'congés');
    }
  });

  realtimeChannel.subscribe(status => {
    if (status === 'SUBSCRIBED') {
      console.log('✅ Realtime connecté pour station', stationId);
    }
  });
}

/**
 * Gère une notification de demande (repos, acompte, congés).
 * Affiche un toast et met à jour les données locales.
 */
function handleDemandeNotification(payload, type) {
  const row = payload.new;
  if (!row || !row.data) return;

  const stationId = window.getActiveStationId ? window.getActiveStationId() : null;
  if (!stationId) return;

  let lsKey = '';
  if (type === 'repos') lsKey = stationId + '-repos-demandes';
  else if (type === 'acompte') lsKey = stationId + '-acomptes';
  else if (type === 'congés') lsKey = stationId + '-conges-payes';

  if (lsKey) {
    localStorage.setItem(lsKey, JSON.stringify(row.data));
  }

  // Côté responsable : toast seulement pour les nouvelles demandes (statut en_attente)
  if (!isDriverMode()) {
    const demandes = Array.isArray(row.data) ? row.data : [];
    const nouvelle = demandes.find(d => d.statut === 'en_attente');
    if (nouvelle) {
      const nom = nouvelle.chauffeurNom || nouvelle.chauffeur || nouvelle.nom || '';
      if (nom) showRealtimeToast('📬 Nouvelle demande de ' + nom);
    }
  }

  // Côté chauffeur
  if (isDriverMode()) {
    showRealtimeToast('📬 Ta demande sera traitée');
  }
}

/**
 * Affiche un toast centré en haut qui tombe.
 */
function showRealtimeToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:999999;background:var(--bg-sidebar);border:1px solid var(--accent);border-radius:12px;padding:14px 24px;box-shadow:0 8px 32px rgba(0,0,0,0.4);max-width:400px;text-align:center;animation:toastDropIn 0.4s ease;';
  toast.innerHTML = `<div style="font-size:13px;font-weight:700;color:var(--accent);">${message}</div>`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-20px)';
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Déconnecte le Realtime (à appeler quand on change de station).
 */
function stopRealtime() {
  if (realtimeChannel && typeof sb === 'function' && sb()) {
    sb().removeChannel(realtimeChannel);
    realtimeChannel = null;
    console.log('🔌 Realtime déconnecté');
  }
}

/* ── Auto-init après chargement ───────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Attendre que Supabase soit prêt (initSupabase a un setTimeout de 500ms)
  setTimeout(() => {
    initRealtime();
  }, 1500);
});

/* ── Réinit quand on change de station ────────────────────── */
const _origSetActiveStation = window.setActiveStation;
if (typeof _origSetActiveStation === 'function') {
  window.setActiveStation = function () {
    _origSetActiveStation.apply(this, arguments);
    stopRealtime();
    setTimeout(initRealtime, 500);
  };
}
