/* js/contacts.js — Contacts station (SunXP Pro) */
console.log('contacts.js chargé');

function getContactsSid() { return window.getActiveStationId ? window.getActiveStationId() : 'default'; }
function getContactsKey() { return getContactsSid() + '-contacts'; }
function loadContacts() { try { return JSON.parse(localStorage.getItem(getContactsKey())) || []; } catch (_) { return []; } }
function saveContacts(list) {
  const key = getContactsKey();
  try { localStorage.setItem(key, JSON.stringify(list)); } catch (_) {}
  if (typeof dbSave === 'function') dbSave('contacts', key, { station_id: getContactsSid() }, list);
}
function escC(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/* ══════════════════════════════════════════════════════════════
   ESPACE RESPONSABLE — Gestion des contacts
   ══════════════════════════════════════════════════════════════ */
function renderContactsManager() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:12px;overflow-y:auto;';

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
  header.innerHTML = '<h3 style="font-size:14px;color:var(--accent);margin:0;">📇 Contacts</h3>';
  const addBtn = document.createElement('button');
  addBtn.className = 'rep-btn rep-btn-primary'; addBtn.textContent = '+ Ajouter';
  addBtn.onclick = () => showContactForm();
  header.appendChild(addBtn);
  wrap.appendChild(header);

  const contacts = loadContacts();
  if (!contacts.length) {
    const empty = document.createElement('p');
    empty.style.cssText = 'color:var(--text-muted);text-align:center;margin-top:20px;font-size:13px;';
    empty.textContent = 'Aucun contact ajouté.';
    wrap.appendChild(empty);
  } else {
    contacts.forEach(c => wrap.appendChild(buildContactCard(c, true)));
  }

  return wrap;
}

function buildContactCard(c, withActions) {
  const card = document.createElement('div');
  card.style.cssText = 'border:1px solid var(--border);border-radius:8px;padding:12px;background:var(--bg-sidebar);display:flex;align-items:center;gap:12px;';

  const avatar = document.createElement('div');
  avatar.style.cssText = 'width:40px;height:40px;border-radius:50%;background:var(--accent-dim);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;';
  avatar.textContent = '👤';
  card.appendChild(avatar);

  const info = document.createElement('div');
  info.style.cssText = 'flex:1;min-width:0;';
  info.innerHTML = `
    <div style="font-size:13px;font-weight:700;">${escC(c.prenom)} ${escC(c.nom)}</div>
    <div style="font-size:11px;color:var(--accent);margin-top:2px;">${escC(c.poste)}</div>
    ${c.telephone ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">📞 ${escC(c.telephone)}</div>` : ''}
    ${c.email ? `<div style="font-size:11px;color:var(--text-muted);">✉️ ${escC(c.email)}</div>` : ''}`;
  card.appendChild(info);

  if (withActions) {
    const delBtn = document.createElement('button');
    delBtn.className = 'h-btn'; delBtn.style.cssText = 'font-size:10px;padding:4px 8px;color:#f87171;border-color:#f87171;';
    delBtn.textContent = '🗑';
    delBtn.onclick = () => {
      if (typeof showConfirmModal === 'function') {
        showConfirmModal('Supprimer ce contact ?', () => {
          saveContacts(loadContacts().filter(x => x.id !== c.id));
          if (typeof setMenuTab === 'function') setMenuTab('contacts');
        });
      }
    };
    card.appendChild(delBtn);
  }

  return card;
}

function showContactForm() {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;padding:16px;';
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

  const box = document.createElement('div');
  box.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:12px;padding:24px;width:90%;max-width:400px;display:flex;flex-direction:column;gap:10px;';
  box.innerHTML = '<h3 style="margin:0;font-size:15px;color:var(--accent);">📇 Nouveau contact</h3>';

  const fields = [
    { id: 'nom', placeholder: 'Nom *', required: true },
    { id: 'prenom', placeholder: 'Prénom *', required: true },
    { id: 'poste', placeholder: 'Poste (ex: Responsable, RH, Dispatch...) *', required: true },
    { id: 'telephone', placeholder: 'Téléphone', type: 'tel' },
    { id: 'email', placeholder: 'Email', type: 'email' },
  ];

  const inputs = {};
  fields.forEach(f => {
    const inp = document.createElement('input');
    inp.type = f.type || 'text'; inp.placeholder = f.placeholder;
    inp.className = 'rep-input'; inp.style.cssText = 'padding:8px;font-size:13px;';
    inputs[f.id] = inp;
    box.appendChild(inp);
  });

  const btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:4px;';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'h-btn'; cancelBtn.textContent = 'Annuler';
  cancelBtn.onclick = () => overlay.remove();
  const saveBtn = document.createElement('button');
  saveBtn.className = 'rep-btn rep-btn-primary'; saveBtn.textContent = '✓ Ajouter';
  saveBtn.onclick = () => {
    if (!inputs.nom.value.trim() || !inputs.prenom.value.trim() || !inputs.poste.value.trim()) {
      alert('Remplissez les champs obligatoires (nom, prénom, poste).'); return;
    }
    const contacts = loadContacts();
    contacts.push({
      id: 'ct_' + Date.now(),
      nom: inputs.nom.value.trim(),
      prenom: inputs.prenom.value.trim(),
      poste: inputs.poste.value.trim(),
      telephone: inputs.telephone.value.trim(),
      email: inputs.email.value.trim()
    });
    saveContacts(contacts);
    overlay.remove();
    if (typeof setMenuTab === 'function') setMenuTab('contacts');
  };
  btns.appendChild(cancelBtn); btns.appendChild(saveBtn);
  box.appendChild(btns);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
  inputs.nom.focus();
}

/* ══════════════════════════════════════════════════════════════
   ESPACE CHAUFFEUR — Lecture seule des contacts
   ══════════════════════════════════════════════════════════════ */
function renderContactsChauffeur() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:12px;overflow-y:auto;';
  wrap.innerHTML = '<h3 style="font-size:14px;color:var(--accent);margin:0;">📇 Contacts station</h3>';

  const contacts = loadContacts();
  if (!contacts.length) {
    const empty = document.createElement('p');
    empty.style.cssText = 'color:var(--text-muted);text-align:center;margin-top:20px;font-size:13px;';
    empty.textContent = 'Aucun contact disponible.';
    wrap.appendChild(empty);
  } else {
    contacts.forEach(c => wrap.appendChild(buildContactCard(c, false)));
  }

  return wrap;
}
