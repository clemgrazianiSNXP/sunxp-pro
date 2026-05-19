/* js/admin-maintenance.js — Onglet Maintenance (SunXP Pro Admin) */
console.log('admin-maintenance.js chargé');

async function renderAdminMaintenance(container) {
  container.innerHTML = '<p style="color:var(--text-muted);">Chargement...</p>';
  let maintenanceActive = false;
  let maintenanceMsg = '';
  let scheduled = null;
  try {
    const { data } = await sb().from('app_settings').select('value').eq('key', 'maintenance').maybeSingle();
    if (data && data.value) { maintenanceActive = data.value.active || false; maintenanceMsg = data.value.message || ''; }
    const { data: schedData } = await sb().from('app_settings').select('value').eq('key', 'maintenance_scheduled').maybeSingle();
    if (schedData && schedData.value && schedData.value.scheduled) scheduled = schedData.value;
  } catch (_) {}

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:16px;max-width:500px;';

  // Card maintenance manuelle (existante)
  const statusCard = document.createElement('div');
  statusCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:16px;';
  statusCard.innerHTML = `
    <div style="font-size:14px;font-weight:700;margin-bottom:12px;">🔧 Mode Maintenance (manuel)</div>
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

  // Card maintenance planifiée
  const schedCard = document.createElement('div');
  schedCard.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:16px;';

  if (scheduled) {
    // Afficher la planification en cours
    const startStr = scheduled.start ? new Date(scheduled.start).toLocaleString('fr-FR') : '?';
    const endStr = scheduled.end ? new Date(scheduled.end).toLocaleString('fr-FR') : '?';
    const now = new Date();
    const isActive = scheduled.start && scheduled.end && now >= new Date(scheduled.start) && now <= new Date(scheduled.end);
    schedCard.innerHTML = `
      <div style="font-size:14px;font-weight:700;margin-bottom:12px;">📅 Maintenance planifiée</div>
      <div style="padding:10px;background:var(--bg-primary);border-radius:8px;margin-bottom:12px;">
        <div style="font-size:12px;color:var(--text-primary);margin-bottom:4px;">${isActive ? '🔴 EN COURS' : '⏳ Programmée'}</div>
        <div style="font-size:11px;color:var(--text-muted);">Début : <span style="color:var(--text-primary);font-family:monospace;">${startStr}</span></div>
        <div style="font-size:11px;color:var(--text-muted);">Fin : <span style="color:var(--text-primary);font-family:monospace;">${endStr}</span></div>
        <div style="font-size:11px;color:var(--text-muted);">Message : <span style="color:var(--text-primary);">${scheduled.message || '—'}</span></div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:4px;">Par : ${scheduled.scheduled_by || '?'}</div>
      </div>
      <button id="admin-sched-cancel" class="rep-btn rep-btn-delete" style="width:100%;">❌ Annuler la planification</button>
    `;
  } else {
    // Formulaire de planification
    schedCard.innerHTML = `
      <div style="font-size:14px;font-weight:700;margin-bottom:12px;">📅 Planifier une maintenance</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <div>
          <label style="font-size:11px;color:var(--text-muted);">Début de maintenance :</label>
          <input type="datetime-local" id="admin-sched-start" class="rep-input" style="padding:8px;font-size:12px;margin-top:4px;">
        </div>
        <div>
          <label style="font-size:11px;color:var(--text-muted);">Fin de maintenance :</label>
          <input type="datetime-local" id="admin-sched-end" class="rep-input" style="padding:8px;font-size:12px;margin-top:4px;">
        </div>
        <div>
          <label style="font-size:11px;color:var(--text-muted);">Message (optionnel) :</label>
          <input type="text" id="admin-sched-msg" class="rep-input" style="padding:8px;font-size:12px;margin-top:4px;" placeholder="Mise à jour prévue...">
        </div>
        <button id="admin-sched-save" class="rep-btn rep-btn-primary" style="margin-top:4px;">📅 Planifier</button>
      </div>
    `;
  }
  wrap.appendChild(schedCard);

  container.innerHTML = '';
  container.appendChild(wrap);

  setTimeout(() => {
    // Bind maintenance manuelle
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

    // Bind planification
    document.getElementById('admin-sched-save')?.addEventListener('click', async () => {
      const start = document.getElementById('admin-sched-start')?.value;
      const end = document.getElementById('admin-sched-end')?.value;
      const msg = document.getElementById('admin-sched-msg')?.value || '';
      if (!start || !end) { alert('Veuillez remplir les dates de début et fin.'); return; }
      if (new Date(end) <= new Date(start)) { alert('La date de fin doit être après la date de début.'); return; }
      await sb().from('app_settings').upsert({
        key: 'maintenance_scheduled',
        value: { scheduled: true, start, end, message: msg, scheduled_by: currentUser?.email || '' },
        updated_at: new Date().toISOString(),
        updated_by: currentUser?.email || ''
      });
      if (window.logActivity) window.logActivity('admin_schedule_maintenance', { start, end, message: msg });
      openAdminPanel();
    });

    // Bind annulation
    document.getElementById('admin-sched-cancel')?.addEventListener('click', async () => {
      if (!confirm('Annuler la maintenance planifiée ?')) return;
      await sb().from('app_settings').upsert({
        key: 'maintenance_scheduled',
        value: { scheduled: false },
        updated_at: new Date().toISOString(),
        updated_by: currentUser?.email || ''
      });
      if (window.logActivity) window.logActivity('admin_cancel_scheduled_maintenance', {});
      openAdminPanel();
    });
  }, 0);
}
