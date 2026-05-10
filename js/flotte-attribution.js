/* js/flotte-attribution.js — Attribution des camions (SunXP Pro) */
console.log('flotte-attribution.js chargé');

let attrDate = new Date();

/* ── Persistance ──────────────────────────────────────────── */
function attrKey(stationId, date) {
  return stationId + '-attribution-' + date.toISOString().slice(0, 10);
}
function loadAttribution(stationId, date) {
  try { return JSON.parse(localStorage.getItem(attrKey(stationId, date))) || null; }
  catch (_) { return null; }
}
function saveAttribution(stationId, date, data) {
  const key = attrKey(stationId, date);
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
  if (typeof dbSave === 'function') dbSave('attribution', key, { station_id: stationId, date_jour: date.toISOString().slice(0, 10) }, data);
}

/* ── Rendu principal ──────────────────────────────────────── */
function renderAttribution() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:0;height:100%;';

  const stationId = window.getActiveStationId ? window.getActiveStationId() : null;
  if (!stationId) { wrap.innerHTML = '<p style="color:var(--text-muted);padding:20px;">Sélectionnez une station.</p>'; return wrap; }

  const camions = loadCamions();
  const chauffeurs = [];
  try { const r = localStorage.getItem(stationId + '-repertoire'); if (r) chauffeurs.push(...JSON.parse(r)); } catch (_) {}

  // Charger ou initialiser les données du jour
  let rows = loadAttribution(stationId, attrDate);
  if (!rows) {
    // Initialiser depuis le répertoire camions (ordre d'ajout)
    rows = camions.map(c => ({
      plaque: c.plaque,
      modele: (c.marque || '') + ' ' + (c.modele || ''),
      agence: c.agence || 'SNXP',
      bva: c.bva || false,
      checkMensuel: false,
      uta: '', telepeages: '', statut: 'OK',
      chauffeur: '', pda: '', trousseau: '', licence: '', clefBal: '', vigik: '',
      retourUta: false, retourPda: false, retourTrousseau: false, retourLicence: false, retourClefBal: false, retourVigik: false,
      commentaire: '',
      // Pour les vans non-OK
      fusionTitle: '', fusionColor: ''
    }));
  }

  // Toolbar : date + boutons
  const toolbar = document.createElement('div');
  toolbar.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--border);background:var(--bg-sidebar);flex-shrink:0;flex-wrap:wrap;';
  const dateLabel = attrDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  toolbar.innerHTML = `
    <button class="h-btn h-nav" id="attr-prev">◀</button>
    <span style="font-size:13px;font-weight:600;min-width:200px;text-align:center;">${dateLabel}</span>
    <button class="h-btn h-nav" id="attr-next">▶</button>
    <button class="h-btn" id="attr-today">Aujourd'hui</button>
    <button class="h-btn" id="attr-dup" style="background:rgba(96,165,250,0.15);border-color:#60a5fa;color:#60a5fa;font-weight:700;">📋 Dupliquer → J+1</button>
  `;
  toolbar.querySelector('#attr-prev').onclick = () => { attrDate.setDate(attrDate.getDate() - 1); renderFlotte(); };
  toolbar.querySelector('#attr-next').onclick = () => { attrDate.setDate(attrDate.getDate() + 1); renderFlotte(); };
  toolbar.querySelector('#attr-today').onclick = () => { attrDate = new Date(); renderFlotte(); };
  toolbar.querySelector('#attr-dup').onclick = () => {
    const nextDate = new Date(attrDate); nextDate.setDate(nextDate.getDate() + 1);
    saveAttribution(stationId, nextDate, JSON.parse(JSON.stringify(rows)));
    attrDate = nextDate;
    renderFlotte();
  };
  wrap.appendChild(toolbar);

  // Tableau scrollable
  const tableWrap = document.createElement('div');
  tableWrap.style.cssText = 'flex:1;overflow:auto;';

  const table = document.createElement('table');
  table.className = 'h-table';
  table.style.cssText = 'font-size:11px;width:100%;border-collapse:collapse;';

  // En-tête
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr>
    <th style="width:20px;"></th>
    <th>Modèle</th>
    <th>Agence</th>
    <th style="width:30px;">CM</th>
    <th>UTA</th>
    <th>Télép.</th>
    <th style="width:35px;">Statut</th>
    <th>Plaque</th>
    <th>Chauffeur</th>
    <th>PDA</th>
    <th>Trouss.</th>
    <th>Licence</th>
    <th>Clef</th>
    <th>VIGIK</th>
    <th colspan="6" style="background:var(--accent-dim);color:var(--accent);">RETOUR</th>
    <th>Comment.</th>
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  rows.forEach((row, idx) => {
    const tr = document.createElement('tr');
    tr.style.cssText = 'height:28px;';

    // Si statut != OK et fusionTitle → ligne fusionnée
    if (row.statut !== 'OK' && row.statut !== 'BU' && row.fusionTitle) {
      tr.style.background = row.fusionColor || 'rgba(248,113,113,0.1)';
      tr.innerHTML = `
        <td>${moveButtons(idx, rows.length)}</td>
        <td style="font-size:10px;">${row.modele}</td>
        <td style="font-size:10px;">${row.agence}${row.bva ? ' BVA' : ''}</td>
        <td></td><td></td><td></td><td></td>
        <td style="font-weight:700;color:var(--accent);">${row.plaque}</td>
        <td colspan="6" style="font-weight:700;color:${row.fusionColor || '#f87171'};">${row.fusionTitle}</td>
        <td colspan="6"></td>
        <td><input class="h-inp" value="${row.commentaire}" data-idx="${idx}" data-f="commentaire" style="width:80px;font-size:10px;"></td>
      `;
    } else {
      const chauffeurOpts = chauffeurs.map(c => {
        const nom = (c.prenom + ' ' + c.nom).trim();
        return `<option value="${nom}" ${row.chauffeur === nom ? 'selected' : ''}>${nom}</option>`;
      }).join('');

      tr.innerHTML = `
        <td>${moveButtons(idx, rows.length)}</td>
        <td style="font-size:10px;">${row.modele}</td>
        <td style="font-size:10px;">${row.agence}${row.bva ? ' BVA' : ''}</td>
        <td><input type="checkbox" ${row.checkMensuel ? 'checked' : ''} data-idx="${idx}" data-f="checkMensuel"></td>
        <td><input class="h-inp" value="${row.uta}" data-idx="${idx}" data-f="uta" style="width:30px;font-size:10px;"></td>
        <td><input class="h-inp" value="${row.telepeages}" data-idx="${idx}" data-f="telepeages" style="width:30px;font-size:10px;"></td>
        <td><select class="h-inp" data-idx="${idx}" data-f="statut" style="width:35px;font-size:9px;padding:1px;"><option value="OK" ${row.statut==='OK'?'selected':''}>OK</option><option value="BU" ${row.statut==='BU'?'selected':''}>BU</option><option value="" ${!row.statut?'selected':''}></option></select></td>
        <td style="font-weight:700;color:var(--accent);font-size:10px;">${row.plaque}</td>
        <td><select class="h-inp" data-idx="${idx}" data-f="chauffeur" style="width:70px;font-size:9px;"><option value="">—</option>${chauffeurOpts}<option value="__custom">Autre...</option></select></td>
        <td><input class="h-inp" value="${row.pda}" data-idx="${idx}" data-f="pda" style="width:28px;font-size:10px;"></td>
        <td><input class="h-inp" value="${row.trousseau}" data-idx="${idx}" data-f="trousseau" style="width:35px;font-size:10px;"></td>
        <td><input class="h-inp" value="${row.licence}" data-idx="${idx}" data-f="licence" style="width:28px;font-size:10px;"></td>
        <td><select class="h-inp" data-idx="${idx}" data-f="clefBal" style="width:42px;font-size:9px;padding:1px;"><option value="">—</option><option value="PERSO" ${row.clefBal==='PERSO'?'selected':''}>PERSO</option><option value="C21" ${row.clefBal==='C21'?'selected':''}>C21</option></select></td>
        <td><input class="h-inp" value="${row.vigik}" data-idx="${idx}" data-f="vigik" style="width:55px;font-size:9px;"></td>
        <td><input type="checkbox" ${row.retourUta?'checked':''} data-idx="${idx}" data-f="retourUta"></td>
        <td><input type="checkbox" ${row.retourPda?'checked':''} data-idx="${idx}" data-f="retourPda"></td>
        <td><input type="checkbox" ${row.retourTrousseau?'checked':''} data-idx="${idx}" data-f="retourTrousseau"></td>
        <td><input type="checkbox" ${row.retourLicence?'checked':''} data-idx="${idx}" data-f="retourLicence"></td>
        <td><input type="checkbox" ${row.retourClefBal?'checked':''} data-idx="${idx}" data-f="retourClefBal"></td>
        <td><input type="checkbox" ${row.retourVigik?'checked':''} data-idx="${idx}" data-f="retourVigik"><button class="h-btn" style="font-size:8px;padding:0 3px;margin-left:2px;" title="Tout OK" data-idx="${idx}" data-action="allok">✓</button></td>
        <td><input class="h-inp" value="${row.commentaire}" data-idx="${idx}" data-f="commentaire" style="width:80px;font-size:10px;"></td>
      `;
    }
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);

  // Compteurs
  const tfoot = document.createElement('tfoot');
  const nbOk = rows.filter(r => r.statut === 'OK').length;
  const nbBu = rows.filter(r => r.statut === 'BU').length;
  const nbAttr = rows.filter(r => r.chauffeur && r.statut === 'OK').length;
  tfoot.innerHTML = `<tr style="border-top:2px solid var(--accent);">
    <td colspan="7" style="padding:6px;font-size:11px;font-weight:700;">OK: ${nbOk} | BU: ${nbBu} | Attribués: ${nbAttr}</td>
    <td colspan="14"></td>
  </tr>`;
  table.appendChild(tfoot);

  tableWrap.appendChild(table);
  wrap.appendChild(tableWrap);

  // Bind events
  setTimeout(() => {
    tableWrap.querySelectorAll('input.h-inp, select.h-inp').forEach(el => {
      el.addEventListener('change', () => {
        const i = parseInt(el.dataset.idx), f = el.dataset.f;
        if (f === 'chauffeur' && el.value === '__custom') {
          const custom = prompt('Nom ou commentaire :');
          if (custom) { rows[i].chauffeur = custom; } else { el.value = rows[i].chauffeur || ''; return; }
        } else { rows[i][f] = el.value; }
        saveAttribution(stationId, attrDate, rows);
      });
    });
    tableWrap.querySelectorAll('input[type="checkbox"]').forEach(el => {
      el.addEventListener('change', () => {
        const i = parseInt(el.dataset.idx), f = el.dataset.f;
        rows[i][f] = el.checked;
        saveAttribution(stationId, attrDate, rows);
      });
    });
    tableWrap.querySelectorAll('[data-action="allok"]').forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.idx);
        rows[i].retourUta = true; rows[i].retourPda = true; rows[i].retourTrousseau = true;
        rows[i].retourLicence = true; rows[i].retourClefBal = true; rows[i].retourVigik = true;
        saveAttribution(stationId, attrDate, rows);
        renderFlotte();
      };
    });
    tableWrap.querySelectorAll('[data-move]').forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.idx), dir = btn.dataset.move;
        const j = dir === 'up' ? i - 1 : i + 1;
        if (j < 0 || j >= rows.length) return;
        [rows[i], rows[j]] = [rows[j], rows[i]];
        saveAttribution(stationId, attrDate, rows);
        renderFlotte();
      };
    });
  }, 0);

  return wrap;
}

function moveButtons(idx, total) {
  return `<div style="display:flex;flex-direction:column;gap:0;">
    <button class="h-btn" data-idx="${idx}" data-move="up" style="font-size:8px;padding:0 2px;line-height:1;${idx===0?'opacity:0.2;':''}">▲</button>
    <button class="h-btn" data-idx="${idx}" data-move="down" style="font-size:8px;padding:0 2px;line-height:1;${idx===total-1?'opacity:0.2;':''}">▼</button>
  </div>`;
}
