/* js/suivi-papiers.js — Suivi Papiers RH (SunXP Pro) */
console.log('suivi-papiers.js chargé');

const PAPIERS_TYPES = [
  { code: 'AM', label: 'Arrêt Maladie' },
  { code: 'AT', label: 'Accident de Travail' },
  { code: 'MAT', label: 'Congé Maternité' },
  { code: 'PAT', label: 'Congé Paternité' },
  { code: 'VM', label: 'Visite Médicale' }
];

const STORAGE_BUCKET = 'papiers-rh';

/* ── Persistance ──────────────────────────────────────────── */
function papiersKey(stationId) { return stationId + '-suivi-papiers'; }

function loadPapiers(stationId) {
  try { return JSON.parse(localStorage.getItem(papiersKey(stationId))) || []; }
  catch (_) { return []; }
}

function savePapiers(stationId, list) {
  try { localStorage.setItem(papiersKey(stationId), JSON.stringify(list)); } catch (_) {}
  if (typeof dbSave === 'function') dbSave('suivi_papiers', papiersKey(stationId), { station_id: stationId }, list);
}

/* ── Appliquer au planning ────────────────────────────────── */
function applyPapierToPlanning(stationId, chauffeurNom, dateDebut, dateFin, code) {
  const start = new Date(dateDebut);
  const end = new Date(dateFin);
  for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    if (typeof applyDemandeToPlanning === 'function') {
      applyDemandeToPlanning(stationId, chauffeurNom, dt.toISOString(), code);
    }
  }
}

/* ── Upload fichier vers Supabase Storage ─────────────────── */
async function uploadPapierFile(file, stationId, papierId) {
  if (!sb()) return null;
  const ext = file.name.split('.').pop();
  const path = `${stationId}/${papierId}.${ext}`;
  try {
    const { data, error } = await sb().storage.from(STORAGE_BUCKET).upload(path, file, { upsert: true });
    if (error) { console.error('Upload error:', error.message); return null; }
    const { data: urlData } = sb().storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return urlData?.publicUrl || null;
  } catch (e) { console.warn('Upload catch:', e.message); return null; }
}

async function deletePapierFile(stationId, papierId, fileName) {
  if (!sb()) return;
  const ext = fileName.split('.').pop();
  const path = `${stationId}/${papierId}.${ext}`;
  try { await sb().storage.from(STORAGE_BUCKET).remove([path]); } catch (_) {}
}

/* ── Rendu principal ──────────────────────────────────────── */
function renderSuiviPapiers() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:14px;';

  const stationId = window.getActiveStationId ? window.getActiveStationId() : null;
  if (!stationId) { wrap.innerHTML = '<p style="color:var(--text-muted);">Sélectionnez une station.</p>'; return wrap; }

  let chauffeurs = [];
  try { chauffeurs = JSON.parse(localStorage.getItem(stationId + '-repertoire')) || []; } catch (_) {}
  let responsables = [];
  try { responsables = JSON.parse(localStorage.getItem(stationId + '-responsables')) || []; } catch (_) {}
  const allPersons = [...responsables, ...chauffeurs];

  const papiers = loadPapiers(stationId);

  // Barre de recherche + bouton ajouter
  const searchBar = document.createElement('div');
  searchBar.style.cssText = 'display:flex;gap:8px;align-items:center;';
  const searchInp = document.createElement('input');
  searchInp.type = 'text';
  searchInp.placeholder = '🔍 Rechercher un employé...';
  searchInp.className = 'rep-search';
  searchInp.style.cssText = 'flex:1;max-width:280px;';
  searchBar.appendChild(searchInp);

  const addBtn = document.createElement('button');
  addBtn.className = 'rep-btn rep-btn-primary';
  addBtn.style.cssText = 'font-size:12px;padding:8px 14px;white-space:nowrap;';
  addBtn.textContent = '+ Ajouter un document';
  addBtn.onclick = () => showPapierForm(null, stationId, allPersons);
  searchBar.appendChild(addBtn);
  wrap.appendChild(searchBar);

  // Container pour les sections
  const listContainer = document.createElement('div');
  listContainer.style.cssText = 'display:flex;flex-direction:column;gap:10px;';

  function renderPapiersList(query) {
    listContainer.innerHTML = '';
    const q = (query || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    if (!papiers.length) {
      listContainer.innerHTML = '<p style="color:var(--text-muted);text-align:center;margin-top:20px;">Aucun document enregistré.</p>';
      return;
    }

    // Grouper par chauffeur
    const byPerson = {};
    papiers.forEach(p => {
      if (!byPerson[p.chauffeurNom]) byPerson[p.chauffeurNom] = [];
      byPerson[p.chauffeurNom].push(p);
    });

    // Trier : chauffeurs avec VM expirante en haut
    const now = new Date();
    const personKeys = Object.keys(byPerson).sort((a, b) => {
      const aVM = byPerson[a].filter(p => p.type === 'VM' && p.dateFin);
      const bVM = byPerson[b].filter(p => p.type === 'VM' && p.dateFin);
      const aMinDays = aVM.length ? Math.min(...aVM.map(p => Math.ceil((new Date(p.dateFin) - now) / 86400000))) : 9999;
      const bMinDays = bVM.length ? Math.min(...bVM.map(p => Math.ceil((new Date(p.dateFin) - now) / 86400000))) : 9999;
      return aMinDays - bMinDays;
    });

    const filteredKeys = personKeys.filter(nom => !q || nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(q));
    if (!filteredKeys.length) { listContainer.innerHTML = '<p style="color:var(--text-muted);text-align:center;">Aucun résultat.</p>'; return; }
    filteredKeys.forEach(nom => {
      const section = document.createElement('div');
      section.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:12px;';

      const header = document.createElement('div');
      header.style.cssText = 'font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:8px;';
      header.textContent = nom;
      section.appendChild(header);

      byPerson[nom].forEach(p => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px;';

        const typeLabel = PAPIERS_TYPES.find(t => t.code === p.type)?.label || p.type;
        const color = p.type === 'AM' ? '#f472b6' : p.type === 'AT' ? '#9ca3af' : p.type === 'VM' ? '#38bdf8' : '#a78bfa';

        // Vérifier si VM expirée
        let vmExpired = false;
        if (p.type === 'VM' && p.dateFin) {
          vmExpired = new Date(p.dateFin) < new Date();
        }

        const dateLabel = p.type === 'VM'
          ? `Fait le ${new Date(p.dateDebut).toLocaleDateString('fr-FR')} · Expire le <span style="color:#f87171;font-weight:600;">${new Date(p.dateFin).toLocaleDateString('fr-FR')}</span>`
          : `${new Date(p.dateDebut).toLocaleDateString('fr-FR')} → ${new Date(p.dateFin).toLocaleDateString('fr-FR')}`;

        // Alerte VM
        let vmAlertHtml = '';
        if (p.type === 'VM' && p.dateFin) {
          const daysLeft = Math.ceil((new Date(p.dateFin) - new Date()) / 86400000);
          if (p.rdvPris) {
            vmAlertHtml = ' <span style="color:#38bdf8;font-weight:700;font-size:10px;">📅 RDV pris</span>';
          } else if (daysLeft <= 0) {
            vmAlertHtml = ' <span style="color:#f87171;font-weight:700;font-size:10px;">⚠️ EXPIRÉE</span>';
          } else if (daysLeft <= 30) {
            vmAlertHtml = ' <span style="color:#f87171;font-weight:700;font-size:10px;">⚠️ ' + daysLeft + 'j</span>';
          }
        }

        row.innerHTML = `
          <span style="background:${color};color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">${p.type}</span>
          <span style="flex:1;color:var(--text-primary);">${typeLabel}</span>
          <span style="color:var(--text-muted);font-size:11px;">${dateLabel}${vmAlertHtml}</span>
        `;

        // Bouton RDV pris / Annuler RDV pour VM en alerte
        if (p.type === 'VM' && p.dateFin) {
          const daysLeft = Math.ceil((new Date(p.dateFin) - new Date()) / 86400000);
          if (daysLeft <= 30) {
            const rdvBtn = document.createElement('button');
            rdvBtn.className = 'h-btn';
            if (p.rdvPris) {
              rdvBtn.style.cssText = 'font-size:9px;padding:2px 6px;color:#38bdf8;border-color:#38bdf8;';
              rdvBtn.textContent = '↩ Annuler';
              rdvBtn.onclick = () => {
                const all = loadPapiers(stationId);
                const item = all.find(x => x.id === p.id);
                if (item) { delete item.rdvPris; savePapiers(stationId, all); }
                renderRH();
                if (typeof updateNavBadges === 'function') updateNavBadges();
              };
            } else {
              rdvBtn.style.cssText = 'font-size:9px;padding:2px 6px;background:#38bdf8;color:#000;border:none;font-weight:700;';
              rdvBtn.textContent = '📅 RDV pris';
              rdvBtn.onclick = () => {
                const all = loadPapiers(stationId);
                const item = all.find(x => x.id === p.id);
                if (item) { item.rdvPris = true; savePapiers(stationId, all); }
                renderRH();
                if (typeof updateNavBadges === 'function') updateNavBadges();
              };
            }
            row.appendChild(rdvBtn);
          }
        }

        // Lien fichier
        if (p.fileUrl) {
          const link = document.createElement('a');
          link.href = p.fileUrl;
          link.target = '_blank';
          link.style.cssText = 'font-size:11px;color:var(--accent);';
          link.textContent = '📎';
          link.title = 'Voir le document';
          row.appendChild(link);
        }

        // Bouton modifier
        const editBtn = document.createElement('button');
        editBtn.className = 'h-btn';
        editBtn.style.cssText = 'font-size:10px;padding:2px 6px;';
        editBtn.textContent = '✏️';
        editBtn.onclick = () => showPapierForm(p, stationId, allPersons);
        row.appendChild(editBtn);

        // Bouton supprimer
        const delBtn = document.createElement('button');
        delBtn.className = 'h-btn';
        delBtn.style.cssText = 'font-size:10px;padding:2px 6px;color:#f87171;border-color:#f87171;';
        delBtn.textContent = '🗑';
        delBtn.onclick = () => {
          if (typeof showConfirmModal === 'function') {
            showConfirmModal('Supprimer ce document ?', () => {
              const all = loadPapiers(stationId).filter(x => x.id !== p.id);
              if (p.fileName) deletePapierFile(stationId, p.id, p.fileName);
              savePapiers(stationId, all);
              renderRH();
            });
          }
        };
        row.appendChild(delBtn);

        section.appendChild(row);
      });

      listContainer.appendChild(section);
    });
  }

  searchInp.oninput = () => renderPapiersList(searchInp.value);
  renderPapiersList('');
  wrap.appendChild(listContainer);

  return wrap;
}

/* ── Formulaire ajout/modification ────────────────────────── */
function showPapierForm(papier, stationId, allPersons) {
  const isEdit = !!papier;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;';

  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card,var(--bg-sidebar));border-radius:14px;padding:24px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.5);';

  const personOptions = allPersons.map(c => {
    const nom = (c.prenom + ' ' + c.nom).trim();
    return `<option value="${nom}" ${papier?.chauffeurNom === nom ? 'selected' : ''}>${nom}</option>`;
  }).join('');

  const typeOptions = PAPIERS_TYPES.map(t => `<option value="${t.code}" ${papier?.type === t.code ? 'selected' : ''}>${t.label} (${t.code})</option>`).join('');

  modal.innerHTML = `
    <h3 style="margin:0 0 14px;font-size:15px;color:var(--text-primary);">${isEdit ? 'Modifier' : 'Ajouter'} un document</h3>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <label style="font-size:11px;color:var(--text-muted);">Employé</label>
      <select id="sp-person" class="rep-input" style="padding:8px;">${personOptions}</select>
      <label style="font-size:11px;color:var(--text-muted);">Type de document</label>
      <select id="sp-type" class="rep-input" style="padding:8px;">${typeOptions}</select>
      <label style="font-size:11px;color:var(--text-muted);" id="sp-label-debut">Date début</label>
      <input type="date" id="sp-debut" class="rep-input" style="padding:8px;" value="${papier?.dateDebut || ''}">
      <label style="font-size:11px;color:var(--text-muted);" id="sp-label-fin">Date fin</label>
      <input type="date" id="sp-fin" class="rep-input" style="padding:8px;" value="${papier?.dateFin || ''}">
      <label style="font-size:11px;color:var(--text-muted);">Fichier (PDF, image...)</label>
      <input type="file" id="sp-file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style="font-size:12px;">
      ${papier?.fileUrl ? `<a href="${papier.fileUrl}" target="_blank" style="font-size:11px;color:var(--accent);">📎 Document actuel</a>` : ''}
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
      <button class="h-btn" id="sp-cancel" style="padding:8px 16px;">Annuler</button>
      <button class="h-btn" id="sp-save" style="padding:8px 16px;background:var(--accent);color:#fff;border-color:var(--accent);font-weight:700;">Enregistrer</button>
    </div>
  `;

  // Adapter les labels selon le type sélectionné
  function updateLabels() {
    const type = modal.querySelector('#sp-type').value;
    const lblDebut = modal.querySelector('#sp-label-debut');
    const lblFin = modal.querySelector('#sp-label-fin');
    if (type === 'VM') {
      lblDebut.textContent = 'Date de réalisation';
      lblFin.textContent = "Date d'expiration";
    } else {
      lblDebut.textContent = 'Date début';
      lblFin.textContent = 'Date fin';
    }
  }
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  modal.querySelector('#sp-type').addEventListener('change', updateLabels);
  updateLabels();
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  modal.querySelector('#sp-cancel').onclick = () => overlay.remove();

  modal.querySelector('#sp-save').onclick = async () => {
    const chauffeurNom = modal.querySelector('#sp-person').value;
    const type = modal.querySelector('#sp-type').value;
    const dateDebut = modal.querySelector('#sp-debut').value;
    const dateFin = modal.querySelector('#sp-fin').value;
    const fileInput = modal.querySelector('#sp-file');

    if (!chauffeurNom || !type || !dateDebut || !dateFin) { alert('Remplissez tous les champs.'); return; }

    const id = papier?.id || ('sp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
    let fileUrl = papier?.fileUrl || '';
    let fileName = papier?.fileName || '';

    // Upload fichier si sélectionné
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      fileName = file.name;
      const url = await uploadPapierFile(file, stationId, id);
      if (url) fileUrl = url;
    }

    const entry = { id, chauffeurNom, type, dateDebut, dateFin, fileUrl, fileName, createdAt: papier?.createdAt || new Date().toISOString() };

    const all = loadPapiers(stationId);
    const idx = all.findIndex(x => x.id === id);
    if (idx >= 0) all[idx] = entry; else all.push(entry);
    savePapiers(stationId, all);

    // Appliquer au planning (tous sauf VM)
    if (type !== 'VM') {
      applyPapierToPlanning(stationId, chauffeurNom, dateDebut, dateFin, type);
    }

    overlay.remove();
    renderRH();
  };
}
