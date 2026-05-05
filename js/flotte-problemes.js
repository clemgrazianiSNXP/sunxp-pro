/* js/flotte-problemes.js — Signalement de problèmes camions (SunXP Pro) */
console.log('flotte-problemes.js chargé');

function getProbSid() { return window.getActiveStationId ? window.getActiveStationId() : 'default'; }
function getProbKey() { return getProbSid() + '-problemes-camions'; }
function loadProblemes() { try { return JSON.parse(localStorage.getItem(getProbKey())) || []; } catch(_) { return []; } }
function saveProblemes(data) {
  const key = getProbKey();
  try { localStorage.setItem(key, JSON.stringify(data)); } catch(_) {}
  if (typeof dbSave === 'function') dbSave('problemes_camions', key, { station_id: getProbSid() }, data);
}

/** Refresh depuis Supabase */
async function refreshProblemesFromSupabase() {
  if (typeof sb !== 'function' || !sb()) return null;
  try {
    const { data, error } = await sb().from('problemes_camions').select('data').eq('station_id', getProbSid()).maybeSingle();
    if (error) throw error;
    if (data && data.data) {
      localStorage.setItem(getProbKey(), JSON.stringify(data.data));
      return data.data;
    }
  } catch (e) { console.warn('refreshProblemesFromSupabase:', e.message); }
  return null;
}

function getCamionsList() {
  try { return JSON.parse(localStorage.getItem(getProbSid() + '-camions')) || []; } catch(_) { return []; }
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* ══════════════════════════════════════════════════════════════
   RENDU — canDelete = true pour responsable, false pour chauffeur
   ══════════════════════════════════════════════════════════════ */
function renderProblemes(canDelete) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;';
  wrap.innerHTML = '<h3 style="font-size:14px;color:var(--accent);margin:0;">🚛 Problèmes Camions</h3><p style="color:var(--text-muted);font-size:11px;margin:0;">Chargement...</p>';

  let problemes = loadProblemes();

  function buildUI() {
    wrap.innerHTML = '<h3 style="font-size:14px;color:var(--accent);margin:0;">🚛 Problèmes Camions</h3>';

    // Bouton ajouter
    const addBtn = document.createElement('button');
    addBtn.className = 'rep-btn rep-btn-primary';
    addBtn.style.cssText = 'font-size:12px;padding:6px 12px;align-self:flex-start;';
    addBtn.textContent = '+ Signaler un problème';
    addBtn.onclick = () => showAddProblemeModal(problemes, () => { saveProblemes(problemes); buildUI(); });
    wrap.appendChild(addBtn);

    // Liste des camions avec problèmes
    const camions = getCamionsList();
    const camionsAvecProblemes = new Map();
    problemes.forEach(p => {
      if (!camionsAvecProblemes.has(p.plaque)) camionsAvecProblemes.set(p.plaque, []);
      camionsAvecProblemes.get(p.plaque).push(p);
    });

    if (!camionsAvecProblemes.size) {
      const empty = document.createElement('p');
      empty.style.cssText = 'color:var(--text-muted);font-size:12px;text-align:center;margin-top:20px;';
      empty.textContent = 'Aucun problème signalé. Tout roule ! 🎉';
      wrap.appendChild(empty);
      return;
    }

    // Cards par camion
    camionsAvecProblemes.forEach((probs, plaque) => {
      const card = document.createElement('div');
      card.style.cssText = 'border:1px solid var(--border);border-radius:10px;background:var(--bg-sidebar);overflow:hidden;';

      // Header
      const header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px 14px;cursor:pointer;';
      const camion = camions.find(c => c.plaque === plaque);
      const camionLabel = camion ? `${camion.plaque}` : plaque;
      header.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:18px;">🚛</span>
          <span style="font-weight:700;font-size:13px;">${esc(camionLabel)}</span>
          <span style="background:rgba(248,113,113,0.15);color:#f87171;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;">${probs.length} problème${probs.length > 1 ? 's' : ''}</span>
        </div>
        <span style="font-size:10px;color:var(--text-muted);">▼</span>`;

      // Body
      const body = document.createElement('div');
      body.style.cssText = 'display:none;padding:0 14px 14px;';

      probs.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((p, idx) => {
        const row = document.createElement('div');
        row.style.cssText = 'padding:10px 0;border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:4px;';

        const meta = document.createElement('div');
        meta.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
        const dateStr = p.date ? new Date(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
        meta.innerHTML = `<span style="font-size:11px;color:var(--text-muted);">${dateStr} — <strong style="color:var(--text-primary);">${esc(p.auteur || 'Anonyme')}</strong></span>`;

        if (canDelete) {
          const delBtn = document.createElement('button');
          delBtn.className = 'h-btn';
          delBtn.style.cssText = 'font-size:9px;padding:2px 6px;color:#f87171;border-color:#f87171;';
          delBtn.textContent = '🗑';
          delBtn.onclick = () => {
            if (typeof showConfirmModal === 'function') {
              showConfirmModal('Supprimer ce signalement ?', () => {
                const globalIdx = problemes.indexOf(p);
                if (globalIdx >= 0) problemes.splice(globalIdx, 1);
                saveProblemes(problemes);
                buildUI();
              });
            }
          };
          meta.appendChild(delBtn);
        }
        row.appendChild(meta);

        const note = document.createElement('div');
        note.style.cssText = 'font-size:12px;color:var(--text-primary);white-space:pre-wrap;line-height:1.5;';
        note.textContent = p.note || '';
        row.appendChild(note);

        // Bouton modifier
        const editBtn = document.createElement('button');
        editBtn.className = 'h-btn';
        editBtn.style.cssText = 'font-size:10px;padding:2px 8px;align-self:flex-start;margin-top:4px;';
        editBtn.textContent = '✏️ Modifier';
        editBtn.onclick = () => {
          if (typeof showPromptModal === 'function') {
            showPromptModal('Modifier le signalement', 'Décrivez le problème...', p.note, (val) => {
              p.note = val;
              p.date = new Date().toISOString();
              saveProblemes(problemes);
              buildUI();
            });
          }
        };
        row.appendChild(editBtn);

        body.appendChild(row);
      });

      header.onclick = () => {
        const open = body.style.display !== 'none';
        body.style.display = open ? 'none' : 'block';
        header.querySelector('span:last-child').textContent = open ? '▼' : '▲';
      };

      card.appendChild(header);
      card.appendChild(body);
      wrap.appendChild(card);
    });
  }

  // Refresh depuis Supabase puis afficher
  refreshProblemesFromSupabase().then(fresh => {
    if (fresh) problemes = fresh;
    buildUI();
  }).catch(() => { buildUI(); });

  return wrap;
}

/* ── Modal ajout problème ─────────────────────────────────── */
function showAddProblemeModal(problemes, onDone) {
  const camions = getCamionsList();
  if (!camions.length) { alert('Aucun camion dans le répertoire.'); return; }

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;';
  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card,var(--bg-sidebar));border-radius:12px;padding:24px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.4);';
  modal.innerHTML = `
    <div style="font-size:15px;font-weight:700;margin-bottom:14px;color:var(--text-primary);">🚛 Signaler un problème</div>
    <label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:4px;">Camion</label>
    <select id="prob-camion" class="rep-input" style="width:100%;padding:8px;font-size:13px;margin-bottom:12px;">
      ${camions.map(c => `<option value="${esc(c.plaque)}">${esc(c.plaque)}</option>`).join('')}
    </select>
    <label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:4px;">Description du problème</label>
    <textarea id="prob-note" class="rep-input" rows="4" style="width:100%;padding:8px;font-size:13px;resize:vertical;font-family:var(--font-family);" placeholder="Ex: Feu arrière gauche cassé, bruit moteur au démarrage..."></textarea>
    <div style="display:flex;gap:10px;margin-top:14px;justify-content:flex-end;">
      <button class="h-btn" id="prob-cancel" style="padding:8px 16px;">Annuler</button>
      <button class="h-btn" id="prob-ok" style="padding:8px 16px;background:var(--accent);color:#fff;border-color:var(--accent);">Signaler</button>
    </div>`;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  modal.querySelector('#prob-cancel').onclick = () => overlay.remove();
  modal.querySelector('#prob-ok').onclick = () => {
    const plaque = modal.querySelector('#prob-camion').value;
    const note = modal.querySelector('#prob-note').value.trim();
    if (!note) { alert('Veuillez décrire le problème.'); return; }
    // Auteur : chauffeur connecté ou "Responsable"
    let auteur = 'Responsable';
    if (typeof portalChauffeur !== 'undefined' && portalChauffeur) {
      auteur = ((portalChauffeur.prenom || '') + ' ' + (portalChauffeur.nom || '')).trim();
    }
    problemes.push({ plaque, note, auteur, date: new Date().toISOString() });
    overlay.remove();
    onDone();
  };
}

/* ── Fonctions exposées ───────────────────────────────────── */
function renderProblemesResponsable() { return renderProblemes(true); }
function renderProblemesChauffeur() { return renderProblemes(false); }
