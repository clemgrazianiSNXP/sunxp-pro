/* js/admin-logs.js — Onglet Logs (SunXP Pro Admin) */
console.log('admin-logs.js chargé');

async function renderAdminLogs(container) {
  container.innerHTML = '<p style="color:var(--text-muted);">Chargement...</p>';
  try {
    const { data: logs } = await sb().from('activity_logs').select('*').order('created_at', { ascending: false }).limit(100);
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
    wrap.innerHTML = `<div style="font-size:14px;font-weight:700;margin-bottom:8px;">📋 Derniers logs (${(logs||[]).length})</div>`;
    if (logs && logs.length) {
      logs.forEach(l => {
        const div = document.createElement('div');
        div.style.cssText = 'padding:8px 10px;background:var(--bg-sidebar);border:1px solid var(--border);border-radius:6px;font-size:11px;display:flex;gap:8px;align-items:center;';
        const date = new Date(l.created_at).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
        div.innerHTML = `<span style="color:var(--text-muted);min-width:90px;">${date}</span><span style="font-weight:700;color:var(--accent);min-width:60px;">${l.action}</span><span style="flex:1;color:var(--text-primary);">${l.email}</span><span style="color:var(--text-muted);font-size:10px;">${l.station_id || ''}</span>`;
        wrap.appendChild(div);
      });
    } else {
      wrap.innerHTML += '<p style="color:var(--text-muted);">Aucun log enregistré.</p>';
    }
    container.innerHTML = '';
    container.appendChild(wrap);
  } catch (e) { container.innerHTML = '<p style="color:#f87171;">Erreur: ' + e.message + '</p>'; }
}
