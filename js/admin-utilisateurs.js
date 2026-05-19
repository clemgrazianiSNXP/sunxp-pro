/* js/admin-utilisateurs.js — Onglet Utilisateurs (SunXP Pro Admin) */
console.log('admin-utilisateurs.js chargé');

async function renderAdminUtilisateurs(container) {
  container.innerHTML = '<p style="color:var(--text-muted);">Chargement...</p>';
  try {
    const { data: profiles } = await sb().from('user_profiles').select('*');
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
    wrap.innerHTML = `<div style="font-size:14px;font-weight:700;margin-bottom:8px;">👥 Comptes utilisateurs (${(profiles||[]).length})</div>`;
    if (profiles && profiles.length) {
      profiles.forEach(p => {
        const div = document.createElement('div');
        div.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg-sidebar);border:1px solid var(--border);border-radius:8px;font-size:12px;';
        div.innerHTML = `
          <span style="font-weight:700;flex:1;">${p.prenom || ''} ${p.nom || ''}</span>
          <span style="color:var(--accent);">${p.role}</span>
          <span style="color:var(--text-muted);font-size:10px;">${p.station_id || '—'}</span>
          <span style="color:var(--text-muted);font-size:10px;">${p.chauffeur_id || ''}</span>
          <button class="h-btn admin-reset-pwd" data-uid="${p.id}" data-name="${(p.prenom || '') + ' ' + (p.nom || '')}" style="font-size:10px;padding:4px 8px;color:#fbbf24;border-color:#fbbf24;">🔑 Reset MDP</button>
          <button class="h-btn admin-delete-user" data-uid="${p.id}" data-name="${(p.prenom || '') + ' ' + (p.nom || '')}" style="font-size:10px;padding:4px 8px;color:#f87171;border-color:#f87171;">🗑 Supprimer</button>
        `;
        wrap.appendChild(div);
      });
    } else {
      wrap.innerHTML += '<p style="color:var(--text-muted);">Aucun profil trouvé.</p>';
    }
    container.innerHTML = '';
    container.appendChild(wrap);

    container.querySelectorAll('.admin-reset-pwd').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid; const name = btn.dataset.name;
        const newPwd = prompt(`Nouveau mot de passe pour ${name.trim()} :`);
        if (!newPwd || newPwd.length < 6) { alert('Mot de passe trop court (min 6 caractères)'); return; }
        btn.textContent = '⏳...'; btn.disabled = true;
        try {
          const { data, error } = await sb().functions.invoke('admin-reset-password', { body: { user_id: uid, new_password: newPwd } });
          if (error) { alert('Erreur: ' + error.message); btn.textContent = '🔑 Reset MDP'; }
          else { alert('✅ Mot de passe réinitialisé pour ' + name.trim()); btn.textContent = '✅ OK'; if (window.logActivity) window.logActivity('admin_reset_password', { user_id: uid, nom: name.trim() }); }
        } catch (e) { alert('Erreur: ' + e.message); btn.textContent = '🔑 Reset MDP'; }
        btn.disabled = false;
      });
    });

    container.querySelectorAll('.admin-delete-user').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid; const name = btn.dataset.name;
        if (!confirm(`⚠️ Supprimer définitivement le compte de ${name.trim()} ?\n\nCette action est irréversible.`)) return;
        btn.textContent = '⏳...'; btn.disabled = true;
        try {
          const { error: profileErr } = await sb().from('user_profiles').delete().eq('id', uid);
          if (profileErr) { alert('Erreur suppression profil: ' + profileErr.message); btn.textContent = '🗑 Supprimer'; btn.disabled = false; return; }
          const { error } = await sb().functions.invoke('admin-delete-user', { body: { user_id: uid } });
          if (error) { alert('Profil supprimé mais erreur auth: ' + error.message); }
          else { alert('✅ Compte supprimé: ' + name.trim()); if (window.logActivity) window.logActivity('admin_delete_user', { user_id: uid, nom: name.trim() }); }
          renderAdminUtilisateurs(container);
        } catch (e) { alert('Erreur: ' + e.message); btn.textContent = '🗑 Supprimer'; btn.disabled = false; }
      });
    });
  } catch (e) { container.innerHTML = '<p style="color:#f87171;">Erreur: ' + e.message + '</p>'; }
}
