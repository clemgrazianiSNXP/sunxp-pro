/* js/heures-dashboard.js — Dashboard journalier de l'onglet Heures */

/**
 * Génère le HTML du dashboard journalier.
 * @param {object} dash - données dashboard sauvegardées
 * @param {Array}  rows - lignes chauffeurs du jour
 */
function renderDashboard(dash, rows) {
  const d = dash || {};
  return `
    <div class="h-dashboard">
      <div class="h-dash-title">Dashboard journalier</div>

      <div class="h-dash-field">
        <label>DSP</label>
        <input class="h-dash-input" data-dash="dsp" value="${esc(d.dsp || '')}" placeholder="ex: Clément">
      </div>
      <div class="h-dash-field">
        <label>CE</label>
        <input class="h-dash-input" data-dash="ce" value="${esc(d.ce || '')}" placeholder="ex: Julien">
      </div>
      <div class="h-dash-field">
        <label>CES</label>
        <input class="h-dash-input" data-dash="ces" value="${esc(d.ces || '')}" placeholder="optionnel">
      </div>

      <div class="h-dash-sep"></div>

      <div class="h-dash-field">
        <label>Colis livrés</label>
        <input class="h-dash-input" data-dash="colis" type="number" min="0" value="${esc(d.colis || '')}" placeholder="0">
      </div>
      <div class="h-dash-field">
        <label>Retours</label>
        <input class="h-dash-input" data-dash="retours" type="number" min="0" value="${esc(d.retours || '')}" placeholder="0">
      </div>
      <div class="h-dash-field">
        <label>DS%</label>
        <span class="h-dash-ds" id="dash-ds">${calcDS(d.colis, d.retours)}</span>
      </div>

      <div class="h-dash-sep"></div>

      <div class="h-dash-field">
        <label>🔴 Absents</label>
        <span class="h-dash-auto-list">${buildStatusList(rows, 'Absent')}</span>
      </div>
      <div class="h-dash-field">
        <label>🟡 Astreinte</label>
        <span class="h-dash-auto-list">${buildStatusList(rows, 'Astreinte')}</span>
      </div>
      <div class="h-dash-field">
        <label>🔵 Chime</label>
        <span class="h-dash-auto-list">${buildStatusList(rows, 'Chime')}</span>
      </div>
      <div class="h-dash-field">
        <label>🩵 Safety</label>
        <span class="h-dash-auto-list">${buildStatusList(rows, 'Safety')}</span>
      </div>

      <div class="h-dash-sep"></div>

      <div class="h-dash-mentor-title">⚠ Impact Mentor</div>
      <div id="dash-mentor-list">${renderMentorList(rows)}</div>
      <button class="h-dash-wa-btn" id="btn-copy-wa">📋 Copier message WhatsApp</button>
    </div>
  `;
}

/**
 * Calcule et formate le DS%
 */
function calcDS(colis, retours) {
  const c = parseFloat(colis);
  const r = parseFloat(retours);
  if (!c || isNaN(c) || c === 0) return '—';
  const pct = ((c - (r || 0)) / c * 100).toFixed(1);
  return pct + '%';
}

/**
 * Génère la liste des chauffeurs en impact Mentor
 */
function renderMentorList(rows) {
  if (!rows || !rows.length) return '<span class="h-dash-empty">Aucun</span>';
  const impacted = rows.filter(r => r.statut === 'Présent' && hasFaute(r.mentor, r.trajet));
  if (!impacted.length) return '<span class="h-dash-empty">Aucun ✓</span>';
  return impacted.map(r =>
    `<div class="h-dash-mentor-row">
      <span>${esc(r.nom)}</span>
      <span class="h-dash-mentor-score">Mentor: ${esc(r.mentor)} / Trajet: ${r.trajet}★</span>
    </div>`
  ).join('');
}

/**
 * Génère le message WhatsApp pour les chauffeurs en impact Mentor
 */
function buildWAMessage(rows, dateStr, stationId) {
  const impacted = (rows || []).filter(r => r.statut === 'Présent' && hasFaute(r.mentor, r.trajet));
  if (!impacted.length) return 'Aucun chauffeur en impact Mentor aujourd\'hui ✅';
  const lines = impacted.map(r => `• ${r.nom} — Mentor: ${r.mentor} / Trajet: ${r.trajet}★`);
  return `📊 Impact Mentor — ${stationId} — ${dateStr}\n${lines.join('\n')}`;
}

/**
 * Attache les listeners du dashboard (inputs + bouton WA)
 */
function bindDashboard(saveCallback, rows, dateStr, stationId) {
  document.querySelectorAll('.h-dash-input').forEach(input => {
    input.addEventListener('input', () => {
      const dsEl = document.getElementById('dash-ds');
      if (dsEl) {
        const colis   = document.querySelector('[data-dash="colis"]')?.value;
        const retours = document.querySelector('[data-dash="retours"]')?.value;
        dsEl.textContent = calcDS(colis, retours);
      }
      saveCallback();
    });
  });

  const waBtn = document.getElementById('btn-copy-wa');
  if (waBtn) {
    waBtn.addEventListener('click', () => {
      const msg = buildWAMessage(rows, dateStr, stationId);
      navigator.clipboard.writeText(msg).then(() => {
        waBtn.textContent = '✅ Copié !';
        setTimeout(() => { waBtn.textContent = '📋 Copier message WhatsApp'; }, 2000);
      }).catch(() => {
        prompt('Copiez ce message :', msg);
      });
    });
  }
}

/**
 * Lit les valeurs du dashboard depuis le DOM
 */
function readDashboardValues() {
  const out = {};
  document.querySelectorAll('.h-dash-input').forEach(input => {
    out[input.dataset.dash] = input.value;
  });
  return out;
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildStatusList(rows, statut) {
  if (!rows || !rows.length) return '<span style="color:var(--text-muted);font-size:11px;">—</span>';
  const names = rows.filter(r => r.statut === statut && r.nom && r.nom.trim()).map(r => esc(r.nom));
  if (!names.length) return '<span style="color:var(--text-muted);font-size:11px;">—</span>';
  return names.map(n => `<div style="font-size:11px;color:var(--text-primary);padding:1px 0;">${n}</div>`).join('');
}
