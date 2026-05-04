/* js/cles-codes.js — Clés & Codes partagés entre chauffeurs (SunXP Pro) */
console.log('cles-codes.js chargé');

function getClesSid() { return window.getActiveStationId ? window.getActiveStationId() : 'default'; }
function getClesKey() { return getClesSid() + '-cles-codes'; }
function loadClesCodes() { try { return JSON.parse(localStorage.getItem(getClesKey())) || { cles: [], codes: [] }; } catch(_) { return { cles: [], codes: [] }; } }
function saveClesCodes(data) {
  const key = getClesKey();
  try { localStorage.setItem(key, JSON.stringify(data)); } catch(_) {}
  if (typeof dbSave === 'function') dbSave('cles_codes', key, { station_id: getClesSid() }, data);
}

/** Charge les données depuis Supabase et met à jour le localStorage */
async function refreshClesCodesFromSupabase() {
  if (typeof sb !== 'function' || !sb()) return null;
  try {
    const { data, error } = await sb().from('cles_codes').select('data').eq('station_id', getClesSid()).maybeSingle();
    if (error) throw error;
    if (data && data.data) {
      localStorage.setItem(getClesKey(), JSON.stringify(data.data));
      return data.data;
    }
  } catch (e) { console.warn('refreshClesCodesFromSupabase:', e.message); }
  return null;
}

/* ══════════════════════════════════════════════════════════════
   RENDU — Utilisé côté chauffeur ET responsable
   ══════════════════════════════════════════════════════════════ */
function renderClesCodes(canDelete) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;';
  wrap.innerHTML = '<h3 style="font-size:14px;color:var(--accent);margin:0;">🔑 Clés & Codes</h3><p style="color:var(--text-muted);font-size:11px;margin:0;">Chargement...</p>';

  let data = loadClesCodes();
  let subTab = 'cles'; // 'cles' | 'codes'

  function buildUI() {
    wrap.innerHTML = '<h3 style="font-size:14px;color:var(--accent);margin:0;">🔑 Clés & Codes</h3>';

    // Sous-onglets
    const nav = document.createElement('div');
    nav.style.cssText = 'display:flex;gap:6px;';

    function renderNav() {
      nav.innerHTML = '';
      [['cles','🔑 Clés par secteur'],['codes','🏠 Codes résidences']].forEach(([id,label]) => {
        const btn = document.createElement('button');
        btn.className = 'h-btn';
        btn.style.cssText = subTab === id ? 'background:var(--accent);color:#fff;border-color:var(--accent);' : '';
        btn.textContent = label;
        btn.onclick = () => { subTab = id; renderNav(); renderContent(); };
        nav.appendChild(btn);
      });
    }
    wrap.appendChild(nav);

    const content = document.createElement('div');
    wrap.appendChild(content);

    function renderContent() {
      content.innerHTML = '';
      if (subTab === 'cles') content.appendChild(renderClesSection(data, canDelete));
      else content.appendChild(renderCodesSection(data, canDelete));
    }

    renderNav();
    renderContent();
  }

  // Refresh depuis Supabase puis afficher
  refreshClesCodesFromSupabase().then(fresh => {
    if (fresh) data = fresh;
    buildUI();
  }).catch(() => {
    buildUI();
  });

  return wrap;
}

/* ── Section Clés par secteur ─────────────────────────────── */
function renderClesSection(data, canDelete) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

  // Bouton ajouter secteur
  const addBar = document.createElement('div');
  addBar.style.cssText = 'display:flex;gap:6px;align-items:center;';
  const addBtn = document.createElement('button');
  addBtn.className = 'rep-btn rep-btn-primary'; addBtn.style.cssText = 'font-size:11px;padding:5px 10px;';
  addBtn.textContent = '+ Ajouter un secteur';
  addBtn.onclick = () => {
    if (typeof showPromptModal === 'function') {
      showPromptModal('Nom du secteur', 'ex: Secteur 5', '', (nom) => {
        data.cles.push({ secteur: nom, note: '' });
        saveClesCodes(data);
        renderClesContent();
      });
    }
  };
  addBar.appendChild(addBtn);
  wrap.appendChild(addBar);

  const listWrap = document.createElement('div');
  wrap.appendChild(listWrap);

  function renderClesContent() {
    listWrap.innerHTML = '';
    if (!data.cles.length) {
      listWrap.innerHTML = '<p style="color:var(--text-muted);font-size:12px;">Aucun secteur ajouté.</p>';
      return;
    }
    data.cles.forEach((item, idx) => {
      const card = document.createElement('div');
      card.style.cssText = 'border:1px solid var(--border);border-radius:8px;background:var(--bg-sidebar);overflow:hidden;';

      const header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 12px;cursor:pointer;';
      header.innerHTML = `<span style="font-weight:700;font-size:13px;">🔑 ${esc(item.secteur)}</span><span style="font-size:10px;color:var(--text-muted);">▼</span>`;

      const body = document.createElement('div');
      body.style.cssText = 'display:none;padding:0 12px 12px;';

      const ta = document.createElement('textarea');
      ta.value = item.note || '';
      ta.placeholder = 'Quelle clé utiliser dans ce secteur...';
      ta.style.cssText = 'width:100%;min-height:100px;resize:vertical;background:var(--bg-primary);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);font-size:12px;padding:8px;font-family:var(--font-family);';
      ta.addEventListener('change', () => { item.note = ta.value; saveClesCodes(data); });
      body.appendChild(ta);

      if (canDelete) {
        const delBtn = document.createElement('button');
        delBtn.className = 'h-btn'; delBtn.style.cssText = 'font-size:10px;padding:3px 8px;color:#f87171;border-color:#f87171;margin-top:6px;';
        delBtn.textContent = '🗑 Supprimer ce secteur';
        delBtn.onclick = () => { if (typeof showConfirmModal === 'function') showConfirmModal('Supprimer ce secteur ?', () => { data.cles.splice(idx, 1); saveClesCodes(data); renderClesContent(); }); };
        body.appendChild(delBtn);
      }

      header.onclick = () => {
        const open = body.style.display !== 'none';
        body.style.display = open ? 'none' : 'block';
        header.querySelector('span:last-child').textContent = open ? '▼' : '▲';
      };

      card.appendChild(header);
      card.appendChild(body);
      listWrap.appendChild(card);
    });
  }
  renderClesContent();
  return wrap;
}

/* ── Section Codes résidences ─────────────────────────────── */
function renderCodesSection(data, canDelete) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

  // Bouton ajouter secteur
  const addBar = document.createElement('div');
  addBar.style.cssText = 'display:flex;gap:6px;align-items:center;';
  const addSectBtn = document.createElement('button');
  addSectBtn.className = 'rep-btn rep-btn-primary'; addSectBtn.style.cssText = 'font-size:11px;padding:5px 10px;';
  addSectBtn.textContent = '+ Ajouter un secteur';
  addSectBtn.onclick = () => {
    if (typeof showPromptModal === 'function') {
      showPromptModal('Nom du secteur', 'ex: Secteur 3', '', (nom) => {
        data.codes.push({ secteur: nom, residences: [] });
        saveClesCodes(data);
        renderCodesContent();
      });
    }
  };
  addBar.appendChild(addSectBtn);
  wrap.appendChild(addBar);

  const listWrap = document.createElement('div');
  wrap.appendChild(listWrap);

  function renderCodesContent() {
    listWrap.innerHTML = '';
    if (!data.codes.length) {
      listWrap.innerHTML = '<p style="color:var(--text-muted);font-size:12px;">Aucun secteur ajouté.</p>';
      return;
    }
    data.codes.forEach((sect, sIdx) => {
      const card = document.createElement('div');
      card.style.cssText = 'border:1px solid var(--border);border-radius:8px;background:var(--bg-sidebar);overflow:hidden;';

      const header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 12px;cursor:pointer;';
      header.innerHTML = `<span style="font-weight:700;font-size:13px;">📍 ${esc(sect.secteur)} <span style="font-size:10px;color:var(--text-muted);">(${sect.residences.length})</span></span><span style="font-size:10px;color:var(--text-muted);">▼</span>`;

      const body = document.createElement('div');
      body.style.cssText = 'display:none;padding:0 12px 12px;';

      function renderResidences() {
        body.innerHTML = '';
        sect.residences.forEach((res, rIdx) => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 0;border-bottom:1px solid var(--border);';
          row.innerHTML = `<span style="font-size:12px;font-weight:600;flex:1;">${esc(res.nom)}</span>`;
          const codeInp = document.createElement('input');
          codeInp.className = 'rep-input'; codeInp.value = res.code || '';
          codeInp.placeholder = 'Code(s)...'; codeInp.style.cssText = 'width:140px;padding:4px 8px;font-size:12px;';
          codeInp.addEventListener('change', () => { res.code = codeInp.value; saveClesCodes(data); });
          row.appendChild(codeInp);
          if (canDelete) {
            const del = document.createElement('button');
            del.className = 'h-btn'; del.style.cssText = 'font-size:9px;padding:2px 5px;color:#f87171;border-color:#f87171;';
            del.textContent = '✕';
            del.onclick = () => { sect.residences.splice(rIdx, 1); saveClesCodes(data); renderResidences(); };
            row.appendChild(del);
          }
          body.appendChild(row);
        });

        // Bouton ajouter résidence
        const addResBtn = document.createElement('button');
        addResBtn.className = 'h-btn'; addResBtn.style.cssText = 'font-size:10px;margin-top:6px;';
        addResBtn.textContent = '+ Ajouter une résidence';
        addResBtn.onclick = () => {
          if (typeof showPromptModal === 'function') {
            showPromptModal('Nom de la résidence', 'ex: Résidence Les Oliviers', '', (nom) => {
              sect.residences.push({ nom, code: '' });
              saveClesCodes(data);
              renderResidences();
            });
          }
        };
        body.appendChild(addResBtn);

        if (canDelete) {
          const delSect = document.createElement('button');
          delSect.className = 'h-btn'; delSect.style.cssText = 'font-size:10px;padding:3px 8px;color:#f87171;border-color:#f87171;margin-top:8px;';
          delSect.textContent = '🗑 Supprimer ce secteur';
          delSect.onclick = () => { if (typeof showConfirmModal === 'function') showConfirmModal('Supprimer ce secteur et ses résidences ?', () => { data.codes.splice(sIdx, 1); saveClesCodes(data); renderCodesContent(); }); };
          body.appendChild(delSect);
        }
      }
      renderResidences();

      header.onclick = () => {
        const open = body.style.display !== 'none';
        body.style.display = open ? 'none' : 'block';
        header.querySelector('span:last-child').textContent = open ? '▼' : '▲';
      };

      card.appendChild(header);
      card.appendChild(body);
      listWrap.appendChild(card);
    });
  }
  renderCodesContent();
  return wrap;
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* ── Fonctions exposées pour le hamburger ─────────────────── */
function renderClesCodesResponsable() { return renderClesCodes(true); }
function renderClesCodesChauffeur() { return renderClesCodes(false); }
