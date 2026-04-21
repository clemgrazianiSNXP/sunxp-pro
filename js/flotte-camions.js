/* js/flotte-camions.js — Répertoire des camions (SunXP Pro) */
console.log('flotte-camions.js chargé');

function getCamionsKey() { return (window.getActiveStationId ? window.getActiveStationId() : 'default') + '-camions'; }
function loadCamions() { try { return JSON.parse(localStorage.getItem(getCamionsKey())) || []; } catch(_) { return []; } }
function saveCamions(list) { try { localStorage.setItem(getCamionsKey(), JSON.stringify(list)); } catch(_) {} }

function renderCamions() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:12px;';

  // Barre de recherche + bouton ajouter
  const topBar = document.createElement('div');
  topBar.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;';
  const search = document.createElement('input');
  search.type = 'text'; search.placeholder = '🔍 Rechercher...';
  search.className = 'rep-search'; search.style.cssText = 'width:250px;';
  const addBtn = document.createElement('button');
  addBtn.className = 'rep-btn rep-btn-primary'; addBtn.textContent = '+ Ajouter un camion';
  addBtn.onclick = () => showCamionForm(null);
  topBar.appendChild(search); topBar.appendChild(addBtn);
  wrap.appendChild(topBar);

  const grid = document.createElement('div');
  grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:16px;';
  wrap.appendChild(grid);

  function renderGrid(query) {
    grid.innerHTML = '';
    const camions = loadCamions();
    const q = (query||'').toLowerCase();
    const filtered = camions.filter(c => (c.plaque+' '+c.agence+' '+c.vin).toLowerCase().includes(q));
    if (!filtered.length) { grid.innerHTML = '<p style="color:var(--text-muted);font-size:12px;">Aucun camion.</p>'; return; }
    filtered.forEach(c => {
      const card = document.createElement('div');
      card.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:12px;padding:16px;width:220px;display:flex;flex-direction:column;gap:6px;transition:border-color 0.18s;';
      card.onmouseenter = () => card.style.borderColor = 'var(--accent)';
      card.onmouseleave = () => card.style.borderColor = 'var(--border)';

      card.innerHTML = `
        <div style="font-size:16px;font-weight:700;color:var(--accent);letter-spacing:0.05em;">${c.plaque}</div>
        <div style="font-size:12px;color:var(--text-muted);">🏢 ${c.agence || '—'}</div>
        <div style="font-size:10px;font-family:monospace;color:var(--text-muted);word-break:break-all;">VIN: ${c.vin || '—'}</div>
      `;
      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:6px;margin-top:6px;';

      // QR Code VIN
      const qrBtn = document.createElement('button');
      qrBtn.className = 'h-btn'; qrBtn.style.cssText = 'font-size:10px;padding:3px 8px;';
      qrBtn.textContent = '📱 QR VIN';
      qrBtn.onclick = () => showQRCode(c.vin, c.plaque);
      actions.appendChild(qrBtn);

      // Modifier
      const editBtn = document.createElement('button');
      editBtn.className = 'rep-btn rep-btn-edit'; editBtn.textContent = '✏️';
      editBtn.onclick = () => showCamionForm(c);
      actions.appendChild(editBtn);

      // Supprimer
      const delBtn = document.createElement('button');
      delBtn.className = 'rep-btn rep-btn-delete'; delBtn.textContent = '🗑';
      delBtn.onclick = () => { if (confirm('Supprimer ' + c.plaque + ' ?')) { saveCamions(loadCamions().filter(x => x.id !== c.id)); renderFlotte(); } };
      actions.appendChild(delBtn);

      card.appendChild(actions);
      grid.appendChild(card);
    });
  }
  search.oninput = () => renderGrid(search.value);
  renderGrid('');
  return wrap;
}

function showCamionForm(camion) {
  const isEdit = !!camion;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;';
  const box = document.createElement('div');
  box.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:12px;padding:24px;width:90%;max-width:380px;display:flex;flex-direction:column;gap:12px;';
  box.innerHTML = `<h3 style="font-size:14px;color:var(--accent);margin:0;">🚛 ${isEdit ? 'Modifier' : 'Ajouter'} un camion</h3>`;

  const mkField = (label, id, val, placeholder) => {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
    div.innerHTML = `<label style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;">${label}</label>`;
    const inp = document.createElement('input');
    inp.id = id; inp.className = 'h-inp'; inp.style.cssText = 'text-align:left;padding:8px 10px;font-size:13px;';
    inp.value = val || ''; inp.placeholder = placeholder || '';
    div.appendChild(inp);
    return div;
  };

  box.appendChild(mkField('Plaque d\'immatriculation', 'cf-plaque', camion?.plaque, 'AB-123-CD'));
  box.appendChild(mkField('Agence de location', 'cf-agence', camion?.agence, 'Ex: Europcar'));
  box.appendChild(mkField('Numéro VIN', 'cf-vin', camion?.vin, '17 caractères'));

  const btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:8px;margin-top:4px;';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'rep-btn rep-btn-primary'; saveBtn.style.cssText = 'flex:1;';
  saveBtn.textContent = isEdit ? 'Modifier' : 'Ajouter';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'h-btn'; cancelBtn.style.cssText = 'flex:1;';
  cancelBtn.textContent = 'Annuler';
  cancelBtn.onclick = () => overlay.remove();

  saveBtn.onclick = () => {
    const plaque = box.querySelector('#cf-plaque').value.trim();
    if (!plaque) { alert('La plaque est obligatoire.'); return; }
    const agence = box.querySelector('#cf-agence').value.trim();
    const vin = box.querySelector('#cf-vin').value.trim();
    const list = loadCamions();
    if (isEdit) {
      const idx = list.findIndex(c => c.id === camion.id);
      if (idx >= 0) list[idx] = { ...list[idx], plaque, agence, vin };
    } else {
      list.push({ id: 'v_' + Date.now(), plaque, agence, vin });
    }
    saveCamions(list);
    overlay.remove();
    if (typeof renderFlotte === 'function') renderFlotte();
  };

  btns.appendChild(saveBtn); btns.appendChild(cancelBtn);
  box.appendChild(btns);
  overlay.appendChild(box);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
  setTimeout(() => box.querySelector('#cf-plaque')?.focus(), 50);
}

function showQRCode(vin, plaque) {
  if (!vin) { alert('Pas de VIN renseigné.'); return; }
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;';
  const box = document.createElement('div');
  box.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:12px;padding:24px;text-align:center;';
  // Générer QR via API gratuite
  box.innerHTML = `
    <div style="font-size:14px;font-weight:700;margin-bottom:8px;">${plaque}</div>
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(vin)}" alt="QR ${vin}" style="border-radius:8px;margin-bottom:8px;">
    <div style="font-size:10px;color:var(--text-muted);margin-bottom:12px;word-break:break-all;">${vin}</div>
    <button class="h-btn" onclick="this.closest('div[style]').parentElement.remove()">Fermer</button>
  `;
  overlay.appendChild(box);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}
