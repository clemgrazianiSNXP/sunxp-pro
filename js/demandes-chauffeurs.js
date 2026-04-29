/* js/demandes-chauffeurs.js — Gestion des demandes chauffeurs (Repos, Acompte, Congés Payés) */
console.log('demandes-chauffeurs.js chargé');

let demandesSubTab = 'repos';

/* ── Persistance Acomptes ─────────────────────────────────── */
function getAcomptesKey(sid) { return sid + '-acomptes'; }
function loadAcomptes(sid) { try { return JSON.parse(localStorage.getItem(getAcomptesKey(sid))) || []; } catch(_) { return []; } }
function saveAcomptes(sid, data) {
  const key = getAcomptesKey(sid);
  try { localStorage.setItem(key, JSON.stringify(data)); } catch(_) {}
  if (typeof dbSave === 'function') dbSave('acomptes', key, { station_id: sid }, data);
}

/* ── Persistance Congés Payés ─────────────────────────────── */
function getCongesKey(sid) { return sid + '-conges-payes'; }
function loadConges(sid) { try { return JSON.parse(localStorage.getItem(getCongesKey(sid))) || []; } catch(_) { return []; } }
function saveConges(sid, data) {
  const key = getCongesKey(sid);
  try { localStorage.setItem(key, JSON.stringify(data)); } catch(_) {}
  if (typeof dbSave === 'function') dbSave('conges_payes', key, { station_id: sid }, data);
}

/* ── Rendu principal (responsable) ────────────────────────── */
function renderDemandesManager() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:0;';

  // Sous-onglets
  const nav = document.createElement('div');
  nav.style.cssText = 'display:flex;gap:4px;padding:12px 12px 0;';
  const sid = window.getActiveStationId ? window.getActiveStationId() : null;
  const reposCount = sid ? loadReposDemandes(sid).filter(d => d.statut === 'en_attente').length : 0;
  const acompteCount = sid && typeof loadAcomptes === 'function' ? loadAcomptes(sid).filter(d => d.statut === 'en_attente').length : 0;
  const congesCount = sid && typeof loadConges === 'function' ? loadConges(sid).filter(d => d.statut === 'en_attente').length : 0;
  [['repos','📅 Repos', reposCount],['acompte','💶 Acompte', acompteCount],['conges','🏖 Congés', congesCount]].forEach(([id,label,count]) => {
    const btn = document.createElement('button');
    btn.className = 'h-btn';
    btn.style.cssText = demandesSubTab === id ? 'background:var(--accent);color:#fff;border-color:var(--accent);position:relative;' : 'position:relative;';
    btn.textContent = label;
    if (count > 0) {
      const badge = document.createElement('span');
      badge.style.cssText = 'position:absolute;top:-6px;right:-6px;background:#f87171;color:#fff;font-size:9px;font-weight:700;border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;';
      badge.textContent = count;
      btn.appendChild(badge);
    }
    btn.onclick = () => { demandesSubTab = id; setMenuTab('demandes-mgr'); };
    nav.appendChild(btn);
  });
  wrap.appendChild(nav);

  const body = document.createElement('div');
  body.style.cssText = 'padding:12px;';
  if (demandesSubTab === 'repos') body.appendChild(renderReposResponsable());
  else if (demandesSubTab === 'acompte') body.appendChild(renderAcomptesManager());
  else body.appendChild(renderCongesManager());
  wrap.appendChild(body);
  return wrap;
}

/* ── Acomptes Manager ──────────────────────────────────────── */
function renderAcomptesManager() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
  const sid = window.getActiveStationId ? window.getActiveStationId() : null;
  if (!sid) { wrap.innerHTML = '<p style="color:var(--text-muted);">Sélectionnez une station.</p>'; return wrap; }

  const demandes = loadAcomptes(sid);
  const pending = demandes.filter(d => d.statut === 'en_attente');
  const history = demandes.filter(d => d.statut !== 'en_attente');

  wrap.innerHTML = `<h3 style="font-size:14px;color:var(--accent);margin:0;">💶 Demandes d'acompte</h3>`;

  if (!pending.length && !history.length) {
    wrap.innerHTML += '<p style="color:var(--text-muted);font-size:12px;">Aucune demande.</p>';
    return wrap;
  }

  // Pending
  pending.forEach(d => {
    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-tab-active);border:1px solid var(--border);border-left:3px solid #fbbf24;border-radius:6px;padding:10px;font-size:12px;';
    card.innerHTML = `
      <div style="font-weight:600;">${d.chauffeurNom}</div>
      <div>Montant : <b>${d.montant}€</b></div>
      <div style="font-size:10px;color:var(--text-muted);">Demandé le ${new Date(d.dateDemande).toLocaleDateString('fr-FR')}</div>
      ${d.motif ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Motif : ${d.motif}</div>` : ''}
      <div style="display:flex;gap:6px;margin-top:6px;">
        <button class="rep-btn rep-btn-primary acompte-accept" data-id="${d.id}" style="flex:1;font-size:11px;">✅ Accepter</button>
        <button class="rep-btn rep-btn-delete acompte-refuse" data-id="${d.id}" style="flex:1;font-size:11px;">❌ Refuser</button>
        <button class="h-btn acompte-del" data-id="${d.id}" style="font-size:10px;padding:2px 6px;color:#f87171;border-color:#f87171;">🗑</button>
      </div>`;
    wrap.appendChild(card);
  });

  // History
  history.forEach(d => {
    const color = d.statut === 'acceptee' ? '#4ade80' : '#f87171';
    const icon = d.statut === 'acceptee' ? '✅' : '❌';
    const div = document.createElement('div');
    div.style.cssText = `display:flex;align-items:center;gap:8px;padding:6px 10px;border-left:3px solid ${color};margin-bottom:4px;font-size:11px;color:var(--text-muted);`;
    div.innerHTML = `<span style="flex:1;">${icon} <b>${d.chauffeurNom}</b> — ${d.montant}€</span>
      <button class="h-btn acompte-del" data-id="${d.id}" style="font-size:9px;padding:1px 5px;color:#f87171;border-color:#f87171;">🗑</button>`;
    wrap.appendChild(div);
  });

  // Bind buttons
  setTimeout(() => {
    wrap.querySelectorAll('.acompte-accept').forEach(btn => {
      btn.onclick = () => { const d = demandes.find(x => x.id === btn.dataset.id); if (d) { d.statut = 'acceptee'; saveAcomptes(sid, demandes); setMenuTab('demandes-mgr'); } };
    });
    wrap.querySelectorAll('.acompte-refuse').forEach(btn => {
      btn.onclick = () => { const d = demandes.find(x => x.id === btn.dataset.id); if (d) { d.statut = 'refusee'; saveAcomptes(sid, demandes); setMenuTab('demandes-mgr'); } };
    });
    wrap.querySelectorAll('.acompte-del').forEach(btn => {
      btn.onclick = () => { const newList = demandes.filter(x => x.id !== btn.dataset.id); saveAcomptes(sid, newList); setMenuTab('demandes-mgr'); };
    });
  }, 0);

  return wrap;
}

/* ── Congés Payés Manager ──────────────────────────────────── */
function renderCongesManager() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
  const sid = window.getActiveStationId ? window.getActiveStationId() : null;
  if (!sid) { wrap.innerHTML = '<p style="color:var(--text-muted);">Sélectionnez une station.</p>'; return wrap; }

  const demandes = loadConges(sid);
  const pending = demandes.filter(d => d.statut === 'en_attente');
  const history = demandes.filter(d => d.statut !== 'en_attente');

  wrap.innerHTML = `<h3 style="font-size:14px;color:var(--accent);margin:0;">🏖 Demandes de congés payés</h3>`;

  if (!pending.length && !history.length) {
    wrap.innerHTML += '<p style="color:var(--text-muted);font-size:12px;">Aucune demande.</p>';
    return wrap;
  }

  pending.forEach(d => {
    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-tab-active);border:1px solid var(--border);border-left:3px solid #fbbf24;border-radius:6px;padding:10px;font-size:12px;';
    card.innerHTML = `
      <div style="font-weight:600;">${d.chauffeurNom}</div>
      <div>📅 Du ${new Date(d.dateDebut).toLocaleDateString('fr-FR')} au ${new Date(d.dateFin).toLocaleDateString('fr-FR')}</div>
      <div style="font-size:10px;color:var(--text-muted);">Demandé le ${new Date(d.dateDemande).toLocaleDateString('fr-FR')}</div>
      ${d.motif ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Motif : ${d.motif}</div>` : ''}
      <div style="display:flex;gap:6px;margin-top:6px;">
        <button class="rep-btn rep-btn-primary conge-accept" data-id="${d.id}" style="flex:1;font-size:11px;">✅ Accepter</button>
        <button class="rep-btn rep-btn-delete conge-refuse" data-id="${d.id}" style="flex:1;font-size:11px;">❌ Refuser</button>
        <button class="h-btn conge-del" data-id="${d.id}" style="font-size:10px;padding:2px 6px;color:#f87171;border-color:#f87171;">🗑</button>
      </div>`;
    wrap.appendChild(card);
  });

  history.forEach(d => {
    const color = d.statut === 'acceptee' ? '#4ade80' : '#f87171';
    const icon = d.statut === 'acceptee' ? '✅' : '❌';
    const div = document.createElement('div');
    div.style.cssText = `display:flex;align-items:center;gap:8px;padding:6px 10px;border-left:3px solid ${color};margin-bottom:4px;font-size:11px;color:var(--text-muted);`;
    div.innerHTML = `<span style="flex:1;">${icon} <b>${d.chauffeurNom}</b> — ${new Date(d.dateDebut).toLocaleDateString('fr-FR')} → ${new Date(d.dateFin).toLocaleDateString('fr-FR')}</span>
      <button class="h-btn conge-del" data-id="${d.id}" style="font-size:9px;padding:1px 5px;color:#f87171;border-color:#f87171;">🗑</button>`;
    wrap.appendChild(div);
  });

  setTimeout(() => {
    wrap.querySelectorAll('.conge-accept').forEach(btn => {
      btn.onclick = () => { const d = demandes.find(x => x.id === btn.dataset.id); if (d) { d.statut = 'acceptee'; saveConges(sid, demandes); setMenuTab('demandes-mgr'); } };
    });
    wrap.querySelectorAll('.conge-refuse').forEach(btn => {
      btn.onclick = () => { const d = demandes.find(x => x.id === btn.dataset.id); if (d) { d.statut = 'refusee'; saveConges(sid, demandes); setMenuTab('demandes-mgr'); } };
    });
    wrap.querySelectorAll('.conge-del').forEach(btn => {
      btn.onclick = () => { const newList = demandes.filter(x => x.id !== btn.dataset.id); saveConges(sid, newList); setMenuTab('demandes-mgr'); };
    });
  }, 0);

  return wrap;
}

/* ── Chauffeur : formulaire acompte ───────────────────────── */
function renderAcompteChauffeur() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
  if (!portalChauffeur || !portalStationId) { wrap.innerHTML = '<p style="color:var(--text-muted);">Non connecté.</p>'; return wrap; }

  const sid = portalStationId;
  const nom = ((portalChauffeur.prenom || '') + ' ' + (portalChauffeur.nom || '')).trim();

  wrap.innerHTML = '<h3 style="font-size:14px;color:var(--accent);margin:0;">💶 Demander un acompte</h3>';

  const form = document.createElement('div');
  form.style.cssText = 'display:flex;flex-direction:column;gap:8px;background:var(--bg-sidebar);padding:12px;border-radius:8px;border:1px solid var(--border);';
  form.innerHTML = `
    <label style="font-size:12px;color:var(--text-muted);">Montant (€)</label>
    <input type="number" id="acompte-montant" class="h-inp" style="width:100%;text-align:left;padding:8px;" placeholder="ex: 200" min="1">
    <label style="font-size:12px;color:var(--text-muted);">Motif (optionnel)</label>
    <input type="text" id="acompte-motif" class="h-inp" style="width:100%;text-align:left;padding:8px;" placeholder="Raison de la demande">
    <p id="acompte-error" style="color:#f87171;font-size:11px;display:none;"></p>
    <button class="rep-btn rep-btn-primary" id="acompte-submit">Envoyer la demande</button>`;
  wrap.appendChild(form);

  setTimeout(() => {
    document.getElementById('acompte-submit').onclick = () => {
      const montant = parseInt(document.getElementById('acompte-montant').value);
      const motif = document.getElementById('acompte-motif').value.trim();
      const err = document.getElementById('acompte-error');
      if (!montant || montant < 1) { err.textContent = 'Montant invalide.'; err.style.display = ''; return; }
      const demandes = loadAcomptes(sid);
      demandes.push({ id: 'ac_' + Date.now(), chauffeurNom: nom, chauffeurId: portalChauffeur.id_amazon, montant, motif, dateDemande: new Date().toISOString(), statut: 'en_attente' });
      saveAcomptes(sid, demandes);
      err.style.display = 'none';
      alert('Demande envoyée !');
      document.getElementById('acompte-montant').value = '';
      document.getElementById('acompte-motif').value = '';
    };
  }, 0);

  // Historique perso
  const demandes = loadAcomptes(sid).filter(d => d.chauffeurId === portalChauffeur.id_amazon);
  if (demandes.length) {
    const hist = document.createElement('div');
    hist.innerHTML = '<div style="font-size:12px;font-weight:600;margin-top:10px;">Mes demandes</div>';
    demandes.sort((a,b) => new Date(b.dateDemande) - new Date(a.dateDemande)).forEach(d => {
      const icon = d.statut === 'en_attente' ? '⏳' : d.statut === 'acceptee' ? '✅' : '❌';
      const div = document.createElement('div');
      div.style.cssText = 'font-size:11px;padding:4px 0;border-bottom:1px solid var(--border);';
      div.textContent = `${icon} ${d.montant}€ — ${new Date(d.dateDemande).toLocaleDateString('fr-FR')}`;
      hist.appendChild(div);
    });
    wrap.appendChild(hist);
  }

  return wrap;
}

/* ── Chauffeur : formulaire congés payés ──────────────────── */
function renderCongesChauffeur() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
  if (!portalChauffeur || !portalStationId) { wrap.innerHTML = '<p style="color:var(--text-muted);">Non connecté.</p>'; return wrap; }

  const sid = portalStationId;
  const nom = ((portalChauffeur.prenom || '') + ' ' + (portalChauffeur.nom || '')).trim();

  wrap.innerHTML = '<h3 style="font-size:14px;color:var(--accent);margin:0;">🏖 Demander des congés payés</h3>';

  const form = document.createElement('div');
  form.style.cssText = 'display:flex;flex-direction:column;gap:8px;background:var(--bg-sidebar);padding:12px;border-radius:8px;border:1px solid var(--border);';
  form.innerHTML = `
    <label style="font-size:12px;color:var(--text-muted);">Date de début</label>
    <input type="date" id="conge-debut" class="h-inp" style="width:100%;text-align:left;padding:8px;">
    <label style="font-size:12px;color:var(--text-muted);">Date de fin</label>
    <input type="date" id="conge-fin" class="h-inp" style="width:100%;text-align:left;padding:8px;">
    <label style="font-size:12px;color:var(--text-muted);">Motif (optionnel)</label>
    <input type="text" id="conge-motif" class="h-inp" style="width:100%;text-align:left;padding:8px;" placeholder="Raison">
    <p id="conge-error" style="color:#f87171;font-size:11px;display:none;"></p>
    <button class="rep-btn rep-btn-primary" id="conge-submit">Envoyer la demande</button>`;
  wrap.appendChild(form);

  setTimeout(() => {
    document.getElementById('conge-submit').onclick = () => {
      const debut = document.getElementById('conge-debut').value;
      const fin = document.getElementById('conge-fin').value;
      const motif = document.getElementById('conge-motif').value.trim();
      const err = document.getElementById('conge-error');
      if (!debut || !fin) { err.textContent = 'Dates obligatoires.'; err.style.display = ''; return; }
      if (new Date(fin) < new Date(debut)) { err.textContent = 'La date de fin doit être après le début.'; err.style.display = ''; return; }
      // Vérifier 30 jours avant
      const now = new Date();
      const debutDate = new Date(debut);
      const diffDays = Math.ceil((debutDate - now) / (1000 * 60 * 60 * 24));
      if (diffDays < 30) { err.textContent = '❌ La demande doit être faite au moins 30 jours avant la date de début.'; err.style.display = ''; return; }
      const demandes = loadConges(sid);
      demandes.push({ id: 'cp_' + Date.now(), chauffeurNom: nom, chauffeurId: portalChauffeur.id_amazon, dateDebut: debut, dateFin: fin, motif, dateDemande: new Date().toISOString(), statut: 'en_attente' });
      saveConges(sid, demandes);
      err.style.display = 'none';
      alert('Demande envoyée !');
      document.getElementById('conge-debut').value = '';
      document.getElementById('conge-fin').value = '';
      document.getElementById('conge-motif').value = '';
    };
  }, 0);

  // Historique perso
  const demandes = loadConges(sid).filter(d => d.chauffeurId === portalChauffeur.id_amazon);
  if (demandes.length) {
    const hist = document.createElement('div');
    hist.innerHTML = '<div style="font-size:12px;font-weight:600;margin-top:10px;">Mes demandes</div>';
    demandes.sort((a,b) => new Date(b.dateDemande) - new Date(a.dateDemande)).forEach(d => {
      const icon = d.statut === 'en_attente' ? '⏳' : d.statut === 'acceptee' ? '✅' : '❌';
      const div = document.createElement('div');
      div.style.cssText = 'font-size:11px;padding:4px 0;border-bottom:1px solid var(--border);';
      div.textContent = `${icon} ${new Date(d.dateDebut).toLocaleDateString('fr-FR')} → ${new Date(d.dateFin).toLocaleDateString('fr-FR')}`;
      hist.appendChild(div);
    });
    wrap.appendChild(hist);
  }

  return wrap;
}
