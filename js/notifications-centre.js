/* js/notifications-centre.js — Système de notifications admin (SunXP Pro) */
console.log('notifications-centre.js chargé');

const NOTIF_TYPES = {
  update: { icon: '🔧', label: 'Mise à jour', color: '#3b82f6' },
  game: { icon: '🎮', label: 'Nouveau jeu', color: '#8b5cf6' },
  annonce: { icon: '📢', label: 'Annonce', color: '#f97316' },
  alerte: { icon: '⚠️', label: 'Alerte', color: '#eab308' },
  felicitations: { icon: '🎉', label: 'Félicitations', color: '#4ade80' },
  rappel: { icon: '📅', label: 'Rappel', color: '#06b6d4' },
  urgence: { icon: '🔴', label: 'Urgence', color: '#ef4444' }
};

let _notifCache = [];
let _notifReadIds = new Set();

function getNotifUserId() {
  if (typeof currentUser !== 'undefined' && currentUser && currentUser.email) return currentUser.email;
  if (typeof portalChauffeur !== 'undefined' && portalChauffeur) return portalChauffeur.id_amazon || portalChauffeur.id || '';
  return '';
}

function getNotifUserRole() {
  if (typeof portalChauffeur !== 'undefined' && portalChauffeur) return 'chauffeur';
  return 'responsable';
}

function getNotifStationId() {
  if (typeof portalStationId !== 'undefined' && portalStationId) return portalStationId;
  if (typeof getActiveStationId === 'function') return getActiveStationId();
  return '';
}

async function initNotificationsCentre() {
  const userId = getNotifUserId();
  if (!userId) return;
  try {
    if (typeof sb === 'function' && sb()) {
      // Load notifications
      const { data } = await sb().from('admin_notifications').select('*').order('created_at', { ascending: false }).limit(50);
      if (data) _notifCache = data;
      // Load read status
      const { data: readData } = await sb().from('admin_notifications_lues').select('notification_id').eq('user_id', userId);
      if (readData) _notifReadIds = new Set(readData.map(r => r.notification_id));
    }
  } catch (_) {}
  // Cache in localStorage
  const sid = getNotifStationId();
  localStorage.setItem(userId + '-admin-notifs', JSON.stringify(_notifCache));
  localStorage.setItem(userId + '-admin-notifs-read', JSON.stringify([..._notifReadIds]));
  renderNotificationsBadge();
}

function getMyNotifications() {
  const role = getNotifUserRole();
  const sid = getNotifStationId();
  return _notifCache.filter(n => {
    if (n.cible === 'tous') return true;
    if (n.cible === 'chauffeurs' && role === 'chauffeur') return true;
    if (n.cible === 'responsables' && role === 'responsable') return true;
    if (n.cible === sid || n.station_id === sid) return true;
    return false;
  });
}

function getUnreadCount() {
  return getMyNotifications().filter(n => !_notifReadIds.has(n.id)).length;
}

function renderNotificationsBadge() {
  const count = getUnreadCount();
  // Remove existing badge
  const existing = document.getElementById('notif-badge-btn');
  if (existing) existing.remove();

  // Only show if there are unread notifications
  const portal = document.getElementById('chauffeur-portal');
  if (portal && portal.offsetParent !== null) {
    // Chauffeur mode - add to portal header if visible
    const header = portal.querySelector('div');
    if (header && count > 0) {
      const badge = document.createElement('button');
      badge.id = 'notif-badge-btn';
      badge.style.cssText = 'position:fixed;top:12px;right:12px;z-index:10000;background:var(--accent,#7c6af7);color:#fff;border:none;border-radius:50%;width:36px;height:36px;font-size:14px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;';
      badge.innerHTML = '📢<span style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:50%;width:18px;height:18px;font-size:10px;display:flex;align-items:center;justify-content:center;font-weight:900;">' + count + '</span>';
      badge.onclick = () => renderNotificationsPanel();
      document.body.appendChild(badge);
    }
  }
}

function renderNotificationsPanel() {
  const notifs = getMyNotifications();
  let panel = document.getElementById('notif-panel');
  if (panel) { panel.remove(); return; }

  panel = document.createElement('div');
  panel.id = 'notif-panel';
  panel.style.cssText = 'position:fixed;top:0;right:0;bottom:0;width:320px;max-width:90vw;z-index:99999;background:var(--bg-primary,#12121a);border-left:1px solid var(--border,#333);box-shadow:-4px 0 20px rgba(0,0,0,0.5);display:flex;flex-direction:column;overflow:hidden;';

  let html = '<div style="padding:12px 16px;background:var(--bg-sidebar);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;">'
    + '<span style="font-size:14px;font-weight:700;">📢 Notifications</span>'
    + '<button onclick="markAllAsRead()" style="margin-left:auto;padding:4px 8px;background:var(--accent);color:#fff;border:none;border-radius:4px;font-size:9px;cursor:pointer;">Tout lu</button>'
    + '<button onclick="document.getElementById(\'notif-panel\').remove()" style="padding:4px 8px;background:#374151;color:#fff;border:none;border-radius:4px;font-size:9px;cursor:pointer;">✕</button>'
    + '</div>';

  html += '<div style="flex:1;overflow-y:auto;padding:8px;">';
  if (notifs.length === 0) {
    html += '<p style="text-align:center;color:var(--text-muted);margin-top:40px;font-size:12px;">Aucune notification</p>';
  } else {
    notifs.forEach(n => {
      const t = NOTIF_TYPES[n.type] || NOTIF_TYPES.annonce;
      const isRead = _notifReadIds.has(n.id);
      const date = new Date(n.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
      html += '<div onclick="markAsRead(' + n.id + ')" style="padding:10px;margin-bottom:6px;background:' + (isRead ? 'var(--bg-sidebar)' : 'rgba(' + (t.color === '#ef4444' ? '239,68,68' : t.color === '#f97316' ? '249,115,22' : '124,106,247') + ',0.1)') + ';border:1px solid ' + (isRead ? 'var(--border)' : t.color) + ';border-radius:8px;cursor:pointer;transition:all 0.2s;">'
        + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">'
        + '<span style="font-size:16px;">' + t.icon + '</span>'
        + '<span style="font-size:12px;font-weight:700;color:var(--text-primary);">' + (n.titre || '') + '</span>'
        + (!isRead ? '<span style="width:8px;height:8px;background:#ef4444;border-radius:50%;margin-left:auto;"></span>' : '')
        + '</div>'
        + '<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">' + (n.message || '') + '</div>'
        + '<div style="font-size:9px;color:var(--text-muted);opacity:0.6;">' + date + '</div>'
        + '</div>';
    });
  }
  html += '</div>';
  panel.innerHTML = html;
  document.body.appendChild(panel);
}

async function markAsRead(notificationId) {
  const userId = getNotifUserId();
  if (!userId) return;
  _notifReadIds.add(notificationId);
  localStorage.setItem(userId + '-admin-notifs-read', JSON.stringify([..._notifReadIds]));
  renderNotificationsBadge();
  // Update panel if open
  const panel = document.getElementById('notif-panel');
  if (panel) renderNotificationsPanel();
  // Save to Supabase
  try {
    if (typeof sb === 'function' && sb()) {
      await sb().from('admin_notifications_lues').upsert({
        notification_id: notificationId,
        user_id: userId,
        lu_at: new Date().toISOString()
      }, { onConflict: 'notification_id,user_id' });
    }
  } catch (_) {}
}

async function markAllAsRead() {
  const notifs = getMyNotifications();
  notifs.forEach(n => _notifReadIds.add(n.id));
  const userId = getNotifUserId();
  localStorage.setItem(userId + '-admin-notifs-read', JSON.stringify([..._notifReadIds]));
  renderNotificationsBadge();
  const panel = document.getElementById('notif-panel');
  if (panel) renderNotificationsPanel();
  // Batch save
  try {
    if (typeof sb === 'function' && sb()) {
      const rows = notifs.map(n => ({ notification_id: n.id, user_id: userId, lu_at: new Date().toISOString() }));
      await sb().from('admin_notifications_lues').upsert(rows, { onConflict: 'notification_id,user_id' });
    }
  } catch (_) {}
}

// === ADMIN: Send notifications ===
async function renderAdminNotifications(container) {
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:16px;max-width:600px;';

  // Send form
  const formCard = document.createElement('div');
  formCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:16px;';
  formCard.innerHTML = `
    <div style="font-size:14px;font-weight:700;margin-bottom:12px;">📢 Envoyer une notification</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div>
        <label style="font-size:11px;color:var(--text-muted);">Type</label>
        <select id="notif-type" class="rep-input" style="padding:8px;font-size:12px;margin-top:4px;">
          <option value="update">🔧 Mise à jour</option>
          <option value="game">🎮 Nouveau jeu</option>
          <option value="annonce">📢 Annonce</option>
          <option value="alerte">⚠️ Alerte</option>
          <option value="felicitations">🎉 Félicitations</option>
          <option value="rappel">📅 Rappel</option>
          <option value="urgence">🔴 Urgence</option>
        </select>
      </div>
      <div>
        <label style="font-size:11px;color:var(--text-muted);">Titre</label>
        <input type="text" id="notif-titre" class="rep-input" style="padding:8px;font-size:12px;margin-top:4px;" placeholder="Titre court...">
      </div>
      <div>
        <label style="font-size:11px;color:var(--text-muted);">Message</label>
        <textarea id="notif-message" class="rep-input" style="padding:8px;font-size:12px;margin-top:4px;min-height:60px;resize:vertical;" placeholder="Contenu du message..."></textarea>
      </div>
      <div>
        <label style="font-size:11px;color:var(--text-muted);">Destinataires</label>
        <select id="notif-cible" class="rep-input" style="padding:8px;font-size:12px;margin-top:4px;" onchange="toggleStationSelect()">
          <option value="tous">Tous</option>
          <option value="chauffeurs">Chauffeurs uniquement</option>
          <option value="responsables">Responsables uniquement</option>
          <option value="station">Station spécifique...</option>
        </select>
        <select id="notif-station" class="rep-input" style="padding:8px;font-size:12px;margin-top:4px;display:none;"></select>
      </div>
      <button id="notif-send-btn" class="rep-btn rep-btn-primary" style="padding:10px;">📤 Envoyer</button>
    </div>
  `;
  wrap.appendChild(formCard);

  // History
  const histCard = document.createElement('div');
  histCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:16px;';
  histCard.innerHTML = '<div style="font-size:14px;font-weight:700;margin-bottom:12px;">📋 Historique</div><div id="notif-history"><p style="color:var(--text-muted);font-size:11px;">Chargement...</p></div>';
  wrap.appendChild(histCard);

  container.appendChild(wrap);

  // Populate stations
  const stationSelect = wrap.querySelector('#notif-station');
  if (stationSelect && typeof window._chauffeurs === 'object') {
    Object.keys(window._chauffeurs).forEach(sid => {
      stationSelect.innerHTML += '<option value="' + sid + '">' + sid + '</option>';
    });
  }

  // Send handler
  wrap.querySelector('#notif-send-btn').onclick = async () => {
    const type = wrap.querySelector('#notif-type').value;
    const titre = wrap.querySelector('#notif-titre').value.trim();
    const message = wrap.querySelector('#notif-message').value.trim();
    let cible = wrap.querySelector('#notif-cible').value;
    let station_id = null;
    if (cible === 'station') {
      station_id = wrap.querySelector('#notif-station').value;
      cible = station_id;
    }
    if (!titre) { alert('Titre requis'); return; }

    try {
      const { error } = await sb().from('admin_notifications').insert({
        titre, message, type, cible, station_id,
        created_at: new Date().toISOString(),
        created_by: currentUser.email
      });
      if (error) throw error;
      wrap.querySelector('#notif-titre').value = '';
      wrap.querySelector('#notif-message').value = '';
      alert('✅ Notification envoyée !');
      loadNotifHistory();
    } catch (e) { alert('Erreur: ' + (e.message || JSON.stringify(e))); }
  };

  loadNotifHistory();
}

window.toggleStationSelect = function() {
  const cible = document.querySelector('#notif-cible');
  const station = document.querySelector('#notif-station');
  if (cible && station) station.style.display = cible.value === 'station' ? 'block' : 'none';
};

async function loadNotifHistory() {
  const histEl = document.getElementById('notif-history');
  if (!histEl) return;
  try {
    const { data } = await sb().from('admin_notifications').select('*').order('created_at', { ascending: false }).limit(20);
    if (!data || data.length === 0) { histEl.innerHTML = '<p style="font-size:11px;color:var(--text-muted);">Aucune notification envoyée</p>'; return; }
    histEl.innerHTML = data.map(n => {
      const t = NOTIF_TYPES[n.type] || NOTIF_TYPES.annonce;
      const date = new Date(n.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
      return '<div style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid var(--border);font-size:11px;">'
        + '<span>' + t.icon + '</span>'
        + '<div style="flex:1;"><div style="font-weight:700;">' + (n.titre||'') + '</div><div style="color:var(--text-muted);font-size:9px;">' + date + ' • ' + (n.cible||'tous') + '</div></div>'
        + '<button onclick="deleteNotif(' + n.id + ')" style="padding:2px 6px;background:#ef4444;color:#fff;border:none;border-radius:4px;font-size:9px;cursor:pointer;">🗑️</button>'
        + '</div>';
    }).join('');
  } catch (_) { histEl.innerHTML = '<p style="font-size:11px;color:#ef4444;">Erreur chargement</p>'; }
}

window.deleteNotif = async function(id) {
  try {
    await sb().from('admin_notifications').delete().eq('id', id);
    loadNotifHistory();
  } catch (_) {}
};

window.initNotificationsCentre = initNotificationsCentre;
window.renderNotificationsBadge = renderNotificationsBadge;
window.renderNotificationsPanel = renderNotificationsPanel;
window.markAsRead = markAsRead;
window.markAllAsRead = markAllAsRead;
window.renderAdminNotifications = renderAdminNotifications;
