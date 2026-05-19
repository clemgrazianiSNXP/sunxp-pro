/* js/admin-maintenance.js — Onglet Maintenance (SunXP Pro Admin) */
console.log('admin-maintenance.js chargé');

async function renderAdminMaintenance(container) {
  container.innerHTML = '<p style="color:var(--text-muted);">Chargement...</p>';
  let maintenanceActive = false;
  let maintenanceMsg = '';
  try {
    const { data } = await sb().from('app_settings').select('value').eq('key', 'maintenance').maybeSingle();
    if (data && data.value) { maintenanceActive = data.value.active || false; maintenanceMsg = data.value.message || ''; }
  } catch (_) {}

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:16px;max-width:500px;';

  const statusCard = document.createElement('div');
  statusCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:16px;';
  statusCard.innerHTML = `
    <div style="font-size:14px;font-weight:700;margin-bottom:12px;">🔧 Mode Maintenance</div>
    <div style="font-size:18px;margin-bottom:12px;">${maintenanceActive ? '🔴 ACTIF' : '🟢 Inactif'}</div>
    <div style="margin-bottom:12px;">
      <label style="font-size:11px;color:var(--text-muted);">Message affiché aux utilisateurs :</label>
      <input type="text" id="admin-maint-msg" class="rep-input" style="padding:8px;font-size:12px;margin-top:4px;" value="${maintenanceMsg}" placeholder="Maintenance en cours, retour prévu à 14h...">
    </div>
    <div style="display:flex;gap:8px;">
      <button id="admin-maint-on" class="rep-btn rep-btn-delete" style="flex:1;">${maintenanceActive ? '🔄 Mettre à jour' : '🔴 Activer la maintenance'}</button>
      ${maintenanceActive ? '<button id="admin-maint-off" class="rep-btn rep-btn-primary" style="flex:1;">🟢 Désactiver</button>' : ''}
    </div>
  `;
  wrap.appendChild(statusCard);
  container.innerHTML = '';
  container.appendChild(wrap);

  setTimeout(() => {
    document.getElementById('admin-maint-on')?.addEventListener('click', async () => {
      const msg = document.getElementById('admin-maint-msg')?.value || 'Maintenance en cours';
      await sb().from('app_settings').upsert({ key: 'maintenance', value: { active: true, message: msg, activated_at: new Date().toISOString(), activated_by: currentUser?.email || '' }, updated_at: new Date().toISOString(), updated_by: currentUser?.email || '' });
      if (typeof sendPushToStation === 'function') {
        const { data: stations } = await sb().from('stations').select('id');
        if (stations) for (const s of stations) { sendPushToStation(s.id, '🔧 Maintenance', msg); }
      }
      openAdminPanel();
    });
    document.getElementById('admin-maint-off')?.addEventListener('click', async () => {
      await sb().from('app_settings').upsert({ key: 'maintenance', value: { active: false, message: '' }, updated_at: new Date().toISOString(), updated_by: currentUser?.email || '' });
      openAdminPanel();
    });
  }, 0);
}
