/* js/repos-demandes.js — Demandes de repos chauffeurs (SunXP Pro) */
console.log('repos-demandes.js chargé');

/**
 * Stockage : localStorage key = {stationId}-repos-demandes
 * Format : [{ id, chauffeurId, chauffeurNom, date1, date2, dateDemande, statut, reponse }]
 * statut : 'en_attente' | 'acceptee' | 'refusee'
 */

function getReposKey(stationId) { return stationId + '-repos-demandes'; }

function loadReposDemandes(stationId) {
  try { const raw = localStorage.getItem(getReposKey(stationId)); return raw ? JSON.parse(raw) : []; }
  catch (_) { return []; }
}

function saveReposDemandes(stationId, demandes) {
  const key = getReposKey(stationId);
  try { localStorage.setItem(key, JSON.stringify(demandes)); } catch (_) {}
  if (typeof dbSave === 'function') dbSave('repos_demandes', key, { station_id: stationId }, demandes);
}

/**
 * Calcule la date limite de demande pour des jours de repos donnés.
 * Règle : le mercredi 12h00 de la semaine qui est 2 semaines avant la semaine du repos.
 * Ex: repos le 16 avril → semaine du 14 avril → 2 semaines avant = semaine du 31 mars → mercredi 2 avril 12h
 * Simplifié : on prend le lundi de la semaine du premier jour de repos, on recule de 14 jours, 
 * puis on avance au mercredi de cette semaine à 12h.
 */
function getDateLimite(dateRepos) {
  const d = new Date(dateRepos);
  // Lundi de la semaine du repos
  const dow = d.getDay() || 7;
  const mondayRepos = new Date(d);
  mondayRepos.setDate(d.getDate() - dow + 1);
  // 2 semaines avant
  const monday2Before = new Date(mondayRepos);
  monday2Before.setDate(mondayRepos.getDate() - 14);
  // Mercredi de cette semaine à 12h
  const mercredi = new Date(monday2Before);
  mercredi.setDate(monday2Before.getDate() + 2); // lundi + 2 = mercredi
  mercredi.setHours(12, 0, 0, 0);
  return mercredi;
}

function isDemandeValide(date1) {
  const limite = getDateLimite(date1);
  return new Date() <= limite;
}

function countPendingDemandes(stationId) {
  return loadReposDemandes(stationId).filter(d => d.statut === 'en_attente').length;
}

/* ── Vue chauffeur : formulaire de demande ── */
function renderReposChauffeur() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:14px;';

  if (!portalChauffeur || !portalStationId) {
    wrap.innerHTML = '<p style="color:var(--text-muted);">Non connecté.</p>';
    return wrap;
  }

  const sid = portalStationId;
  const cId = portalChauffeur.id_amazon;
  const nom = (portalChauffeur.prenom + ' ' + portalChauffeur.nom).trim();

  wrap.innerHTML = '<h3 style="font-size:14px;color:var(--accent);">📅 Demande de repos</h3><p style="font-size:11px;color:var(--text-muted);">Tu peux demander 2 jours de repos par mois. La demande doit être faite avant le mercredi 12h, 2 semaines avant.</p>';

  // Formulaire
  const form = document.createElement('div');
  form.style.cssText = 'display:flex;flex-direction:column;gap:8px;background:var(--bg-sidebar);padding:12px;border-radius:8px;border:1px solid var(--border);';
  form.innerHTML = `
    <label style="font-size:12px;color:var(--text-muted);">Jour 1</label>
    <input type="date" id="repos-date1" class="h-inp" style="width:100%;text-align:left;">
    <label style="font-size:12px;color:var(--text-muted);">Jour 2</label>
    <input type="date" id="repos-date2" class="h-inp" style="width:100%;text-align:left;">
    <p id="repos-error" style="color:#f87171;font-size:11px;display:none;"></p>
    <p id="repos-limite" style="color:var(--text-muted);font-size:10px;"></p>
    <button class="rep-btn rep-btn-primary" id="repos-submit" style="margin-top:4px;">Envoyer la demande</button>
  `;
  wrap.appendChild(form);

  // Afficher la date limite en temps réel
  setTimeout(() => {
    const d1 = form.querySelector('#repos-date1');
    const limiteEl = form.querySelector('#repos-limite');
    d1.addEventListener('change', () => {
      if (d1.value) {
        const lim = getDateLimite(d1.value);
        limiteEl.textContent = '⏰ Date limite de demande : ' + lim.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' }) + ' à 12h';
      }
    });

    form.querySelector('#repos-submit').onclick = () => {
      const date1 = d1.value;
      const date2 = form.querySelector('#repos-date2').value;
      const errEl = form.querySelector('#repos-error');
      errEl.style.display = 'none';

      if (!date1 || !date2) { errEl.textContent = 'Renseigne les 2 dates.'; errEl.style.display = 'block'; return; }
      if (!isDemandeValide(date1)) {
        const lim = getDateLimite(date1);
        errEl.textContent = '❌ Date limite dépassée ! Tu devais faire la demande avant le ' + lim.toLocaleDateString('fr-FR') + ' à 12h.';
        errEl.style.display = 'block';
        return;
      }

      // Vérifier max 2 jours par mois
      const demandes = loadReposDemandes(sid);
      const mois = new Date(date1).getMonth();
      const annee = new Date(date1).getFullYear();
      const dejaEnMois = demandes.filter(d => d.chauffeurId === cId && d.statut !== 'refusee' && new Date(d.date1).getMonth() === mois && new Date(d.date1).getFullYear() === annee).length;
      if (dejaEnMois >= 1) { errEl.textContent = '❌ Tu as déjà une demande ce mois-ci (max 2 jours/mois).'; errEl.style.display = 'block'; return; }

      demandes.push({
        id: 'r_' + Date.now(),
        chauffeurId: cId,
        chauffeurNom: nom,
        date1, date2,
        dateDemande: new Date().toISOString(),
        statut: 'en_attente',
        reponse: ''
      });
      saveReposDemandes(sid, demandes);
      if (typeof showSuccessToast === 'function') showSuccessToast('Demande de repos envoyée !');
      if (typeof setMenuTab === 'function') setMenuTab('repos');
    };
  }, 0);

  // Historique des demandes
  const demandes = loadReposDemandes(sid).filter(d => d.chauffeurId === cId).reverse();
  if (demandes.length) {
    const hist = document.createElement('div');
    hist.innerHTML = '<h4 style="font-size:13px;color:var(--text-muted);margin-bottom:6px;">Mes demandes</h4>';
    demandes.forEach(d => {
      const card = document.createElement('div');
      const color = d.statut === 'acceptee' ? '#4ade80' : d.statut === 'refusee' ? '#f87171' : '#fbbf24';
      const icon = d.statut === 'acceptee' ? '✅' : d.statut === 'refusee' ? '❌' : '⏳';
      card.style.cssText = `padding:8px 10px;background:var(--bg-sidebar);border:1px solid var(--border);border-left:3px solid ${color};border-radius:6px;margin-bottom:6px;font-size:12px;`;
      card.innerHTML = `${icon} <b>${new Date(d.date1).toLocaleDateString('fr-FR')} & ${new Date(d.date2).toLocaleDateString('fr-FR')}</b> — <span style="color:${color};">${d.statut.replace('_',' ')}</span>${d.reponse ? '<br><span style="font-size:10px;color:var(--text-muted);">'+d.reponse+'</span>' : ''}`;
      hist.appendChild(card);
    });
    wrap.appendChild(hist);
  }

  return wrap;
}

/* ── Vue responsable : gestion des demandes ── */
function renderReposResponsable() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:12px;';

  const stationId = window.getActiveStationId ? window.getActiveStationId() : null;
  if (!stationId) { wrap.innerHTML = '<p style="color:var(--text-muted);">Sélectionnez une station.</p>'; return wrap; }

  const demandes = loadReposDemandes(stationId);
  const enAttente = demandes.filter(d => d.statut === 'en_attente');
  const traitees = demandes.filter(d => d.statut !== 'en_attente');

  wrap.innerHTML = `<h3 style="font-size:14px;color:var(--accent);margin-bottom:4px;">📅 Repos demandés</h3>`;

  if (enAttente.length) {
    const section = document.createElement('div');
    section.innerHTML = `<h4 style="font-size:12px;color:#fbbf24;margin-bottom:6px;">⏳ En attente (${enAttente.length})</h4>`;
    enAttente.forEach(d => {
      const card = document.createElement('div');
      card.style.cssText = 'padding:10px;background:var(--bg-sidebar);border:1px solid #fbbf24;border-radius:8px;margin-bottom:8px;font-size:12px;';
      card.innerHTML = `
        <div style="font-weight:700;margin-bottom:4px;">${d.chauffeurNom}</div>
        <div>📅 ${new Date(d.date1).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})} & ${new Date(d.date2).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})}</div>
        <div style="font-size:10px;color:var(--text-muted);margin:4px 0;">Demandé le ${new Date(d.dateDemande).toLocaleDateString('fr-FR')} à ${new Date(d.dateDemande).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
        <div style="display:flex;gap:6px;margin-top:6px;">
          <button class="rep-btn rep-btn-primary repos-accept" data-id="${d.id}" style="flex:1;font-size:11px;">✅ Accepter</button>
          <button class="rep-btn rep-btn-delete repos-refuse" data-id="${d.id}" style="flex:1;font-size:11px;">❌ Refuser</button>
        </div>
      `;
      section.appendChild(card);
    });
    wrap.appendChild(section);
  } else {
    wrap.innerHTML += '<p style="color:var(--text-muted);font-size:12px;">Aucune demande en attente.</p>';
  }

  // Historique traité
  if (traitees.length) {
    const hist = document.createElement('div');
    hist.innerHTML = '<h4 style="font-size:12px;color:var(--text-muted);margin:12px 0 6px;">Historique</h4>';
    traitees.reverse().forEach(d => {
      const color = d.statut === 'acceptee' ? '#4ade80' : '#f87171';
      const icon = d.statut === 'acceptee' ? '✅' : '❌';
      const div = document.createElement('div');
      div.style.cssText = `display:flex;align-items:center;gap:8px;padding:6px 10px;border-left:3px solid ${color};margin-bottom:4px;font-size:11px;color:var(--text-muted);`;
      div.innerHTML = `<span style="flex:1;">${icon} <b>${d.chauffeurNom}</b> — ${new Date(d.date1).toLocaleDateString('fr-FR')} & ${new Date(d.date2).toLocaleDateString('fr-FR')}</span>`;
      // Bouton modifier (changer le statut)
      const modBtn = document.createElement('button');
      modBtn.className = 'h-btn';
      modBtn.style.cssText = 'font-size:9px;padding:2px 6px;';
      modBtn.textContent = d.statut === 'refusee' ? '✅ Valider' : '❌ Refuser';
      modBtn.onclick = () => {
        const all = loadReposDemandes(stationId);
        const found = all.find(x => x.id === d.id);
        if (found) {
          if (found.statut === 'refusee') { found.statut = 'acceptee'; found.reponse = 'Demande finalement acceptée.'; }
          else { found.statut = 'refusee'; found.reponse = 'Demande annulée.'; }
          saveReposDemandes(stationId, all);
          if (typeof setMenuTab === 'function') setMenuTab('repos-mgr');
        }
      };
      div.appendChild(modBtn);
      hist.appendChild(div);
    });

    // Bouton supprimer l'historique
    const clearBtn = document.createElement('button');
    clearBtn.className = 'rep-btn rep-btn-delete';
    clearBtn.style.cssText = 'font-size:11px;margin-top:8px;';
    clearBtn.textContent = '🗑 Supprimer l\'historique';
    clearBtn.onclick = () => {
      showConfirmModal('Supprimer tout l\'historique des demandes traitées ?', () => {
        const all = loadReposDemandes(stationId).filter(d => d.statut === 'en_attente');
        saveReposDemandes(stationId, all);
        if (typeof setMenuTab === 'function') setMenuTab('repos-mgr');
      });
    };
    hist.appendChild(clearBtn);

    wrap.appendChild(hist);
  }

  // Bind boutons
  setTimeout(() => {
    wrap.querySelectorAll('.repos-accept').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const d = demandes.find(x => x.id === id);
        if (d) { d.statut = 'acceptee'; d.reponse = 'Demande acceptée.'; saveReposDemandes(stationId, demandes); renderReposModule(); }
      };
    });
    wrap.querySelectorAll('.repos-refuse').forEach(btn => {
      btn.onclick = () => {
        const motif = prompt('Motif du refus (optionnel) :') || '';
        const id = btn.dataset.id;
        const d = demandes.find(x => x.id === id);
        if (d) { d.statut = 'refusee'; d.reponse = motif ? 'Refusée : ' + motif : 'Demande refusée.'; saveReposDemandes(stationId, demandes); renderReposModule(); }
      };
    });
  }, 0);

  return wrap;
}

function renderReposModule() {
  const container = document.getElementById('module-repos');
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText = 'display:flex;flex-direction:column;align-items:stretch;padding:16px;overflow:auto;';
  container.appendChild(renderReposResponsable());
}

function initRepos() { renderReposModule(); }

/* ── Notification cloche dans la sidebar + topbar ── */
function updateReposBell() {
  const stationId = window.getActiveStationId ? window.getActiveStationId() : null;
  if (!stationId) return;
  let count = countPendingDemandes(stationId);
  // Ajouter les acomptes et congés en attente
  if (typeof loadAcomptes === 'function') {
    count += loadAcomptes(stationId).filter(d => d.statut === 'en_attente').length;
  }
  if (typeof loadConges === 'function') {
    count += loadConges(stationId).filter(d => d.statut === 'en_attente').length;
  }

  // Sidebar bell
  const tab = document.querySelector('.nav-tab[data-module="repos"]');
  if (tab) {
    const old = tab.querySelector('.repos-bell');
    if (old) old.remove();
    if (count > 0) {
      const bell = document.createElement('span');
      bell.className = 'repos-bell';
      bell.style.cssText = 'background:#fbbf24;color:#000;font-size:9px;font-weight:700;border-radius:50%;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;margin-left:auto;';
      bell.textContent = count;
      tab.appendChild(bell);
    }
  }

  // Topbar bell — uniquement visible pour le responsable connecté à une station
  const topBell = document.getElementById('topbar-bell');
  if (topBell) {
    const isDriver = typeof portalChauffeur !== 'undefined' && portalChauffeur !== null;
    const appVisible = document.querySelector('.app-layout') && !document.querySelector('.app-layout').hidden;
    if (isDriver || !stationId || !appVisible) { topBell.style.display = 'none'; return; }
    topBell.style.display = '';
    // Badge count
    let badge = topBell.querySelector('.topbar-bell-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'topbar-bell-badge';
      badge.style.cssText = 'position:absolute;top:-4px;right:-4px;background:#f87171;color:#fff;font-size:8px;font-weight:700;border-radius:50%;width:14px;height:14px;display:flex;align-items:center;justify-content:center;';
      topBell.appendChild(badge);
    }
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'flex';
      topBell.style.borderColor = '#fbbf24';
      topBell.style.color = '#fbbf24';
    } else {
      badge.style.display = 'none';
      topBell.style.borderColor = '';
      topBell.style.color = 'var(--text-muted)';
    }
  }
}

function toggleBellPopup() {
  // Fermer si déjà ouvert
  const existing = document.querySelector('.bell-popup');
  if (existing) { existing.remove(); return; }

  const stationId = window.getActiveStationId ? window.getActiveStationId() : null;
  if (!stationId) return;
  const reposDemandes = loadReposDemandes(stationId).filter(d => d.statut === 'en_attente');
  const acomptesDemandes = typeof loadAcomptes === 'function' ? loadAcomptes(stationId).filter(d => d.statut === 'en_attente') : [];
  const congesDemandes = typeof loadConges === 'function' ? loadConges(stationId).filter(d => d.statut === 'en_attente') : [];
  const totalPending = reposDemandes.length + acomptesDemandes.length + congesDemandes.length;

  const popup = document.createElement('div');
  popup.className = 'bell-popup';
  popup.style.cssText = 'position:fixed;top:40px;right:50px;z-index:9999;background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;min-width:280px;max-height:400px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,0.5);padding:8px 0;';

  if (!totalPending) {
    popup.innerHTML = '<div style="padding:16px;text-align:center;font-size:12px;color:var(--text-muted);">Aucune demande en attente.</div>';
  } else {
    let html = '';
    if (reposDemandes.length) {
      html += '<div style="padding:6px 12px;font-size:11px;font-weight:700;color:var(--text-muted);border-bottom:1px solid var(--border);">📅 REPOS (' + reposDemandes.length + ')</div>';
      reposDemandes.forEach(d => {
        html += `<div style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.03);font-size:12px;">
          <div style="font-weight:600;">${d.chauffeurNom}</div>
          <div style="font-size:11px;color:var(--text-muted);">${new Date(d.date1).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})} & ${new Date(d.date2).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})}</div>
          <div style="display:flex;gap:6px;margin-top:4px;">
            <button class="h-btn bell-accept-repos" data-id="${d.id}" style="font-size:10px;padding:2px 8px;background:rgba(74,222,128,0.2);color:#4ade80;border-color:#4ade80;">✅</button>
            <button class="h-btn bell-refuse-repos" data-id="${d.id}" style="font-size:10px;padding:2px 8px;background:rgba(248,113,113,0.2);color:#f87171;border-color:#f87171;">❌</button>
          </div></div>`;
      });
    }
    if (acomptesDemandes.length) {
      html += '<div style="padding:6px 12px;font-size:11px;font-weight:700;color:var(--text-muted);border-bottom:1px solid var(--border);">💶 ACOMPTES (' + acomptesDemandes.length + ')</div>';
      acomptesDemandes.forEach(d => {
        html += `<div style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.03);font-size:12px;">
          <div style="font-weight:600;">${d.chauffeurNom} — ${d.montant}€</div>
          ${d.motif ? `<div style="font-size:11px;color:var(--text-muted);">${d.motif}</div>` : ''}
          <div style="display:flex;gap:6px;margin-top:4px;">
            <button class="h-btn bell-accept-acompte" data-id="${d.id}" style="font-size:10px;padding:2px 8px;background:rgba(74,222,128,0.2);color:#4ade80;border-color:#4ade80;">✅</button>
            <button class="h-btn bell-refuse-acompte" data-id="${d.id}" style="font-size:10px;padding:2px 8px;background:rgba(248,113,113,0.2);color:#f87171;border-color:#f87171;">❌</button>
          </div></div>`;
      });
    }
    if (congesDemandes.length) {
      html += '<div style="padding:6px 12px;font-size:11px;font-weight:700;color:var(--text-muted);border-bottom:1px solid var(--border);">🏖 CONGÉS (' + congesDemandes.length + ')</div>';
      congesDemandes.forEach(d => {
        html += `<div style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.03);font-size:12px;">
          <div style="font-weight:600;">${d.chauffeurNom}</div>
          <div style="font-size:11px;color:var(--text-muted);">${new Date(d.dateDebut).toLocaleDateString('fr-FR')} → ${new Date(d.dateFin).toLocaleDateString('fr-FR')}</div>
          <div style="display:flex;gap:6px;margin-top:4px;">
            <button class="h-btn bell-accept-conge" data-id="${d.id}" style="font-size:10px;padding:2px 8px;background:rgba(74,222,128,0.2);color:#4ade80;border-color:#4ade80;">✅</button>
            <button class="h-btn bell-refuse-conge" data-id="${d.id}" style="font-size:10px;padding:2px 8px;background:rgba(248,113,113,0.2);color:#f87171;border-color:#f87171;">❌</button>
          </div></div>`;
      });
    }
    popup.innerHTML = html;
  }

  document.body.appendChild(popup);

  // Bind
  setTimeout(() => {
    popup.querySelectorAll('.bell-accept-repos').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); const all = loadReposDemandes(stationId); const d = all.find(x => x.id === btn.dataset.id); if (d) { d.statut = 'acceptee'; saveReposDemandes(stationId, all); } popup.remove(); toggleBellPopup(); updateReposBell(); };
    });
    popup.querySelectorAll('.bell-refuse-repos').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); const all = loadReposDemandes(stationId); const d = all.find(x => x.id === btn.dataset.id); if (d) { d.statut = 'refusee'; saveReposDemandes(stationId, all); } popup.remove(); toggleBellPopup(); updateReposBell(); };
    });
    popup.querySelectorAll('.bell-accept-acompte').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); const all = loadAcomptes(stationId); const d = all.find(x => x.id === btn.dataset.id); if (d) { d.statut = 'acceptee'; saveAcomptes(stationId, all); } popup.remove(); toggleBellPopup(); updateReposBell(); };
    });
    popup.querySelectorAll('.bell-refuse-acompte').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); const all = loadAcomptes(stationId); const d = all.find(x => x.id === btn.dataset.id); if (d) { d.statut = 'refusee'; saveAcomptes(stationId, all); } popup.remove(); toggleBellPopup(); updateReposBell(); };
    });
    popup.querySelectorAll('.bell-accept-conge').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); const all = loadConges(stationId); const d = all.find(x => x.id === btn.dataset.id); if (d) { d.statut = 'acceptee'; saveConges(stationId, all); } popup.remove(); toggleBellPopup(); updateReposBell(); };
    });
    popup.querySelectorAll('.bell-refuse-conge').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); const all = loadConges(stationId); const d = all.find(x => x.id === btn.dataset.id); if (d) { d.statut = 'refusee'; saveConges(stationId, all); } popup.remove(); toggleBellPopup(); updateReposBell(); };
    });
    document.addEventListener('click', function cl(e) {
      if (!popup.contains(e.target) && e.target.id !== 'topbar-bell') { popup.remove(); document.removeEventListener('click', cl); }
    });
  }, 0);
}

// Mettre à jour la cloche régulièrement
setInterval(updateReposBell, 2000);
document.addEventListener('DOMContentLoaded', () => setTimeout(updateReposBell, 1000));
