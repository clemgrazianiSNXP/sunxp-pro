/* js/rapport-concessions.js — Onglet Rapport Concessions dans Statistiques (SunXP Pro) */
console.log('rapport-concessions.js chargé');

(function () {
  const LS_PREFIX = () => (window.getActiveStationId ? window.getActiveStationId() : 'default') + '-concessions-';

  /* ── Persistance ────────────────────────────────────────── */
  function saveConcessions(semaine, data) {
    try { localStorage.setItem(LS_PREFIX() + semaine, JSON.stringify(data)); } catch (_) {}
  }
  function loadConcessions(semaine) {
    try { const r = localStorage.getItem(LS_PREFIX() + semaine); return r ? JSON.parse(r) : []; } catch (_) { return []; }
  }
  function getWeeksList() {
    const prefix = LS_PREFIX();
    const weeks = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(prefix)) weeks.push(k.replace(prefix, ''));
    }
    return weeks.sort().reverse();
  }
  function deleteWeek(semaine) {
    try { localStorage.removeItem(LS_PREFIX() + semaine); } catch (_) {}
  }

  /* ── Parse du texte collé ───────────────────────────────── */
  function parseConcessionsPaste(text) {
    const results = [];
    const entries = text.split(/(?=FR\d)/);
    for (const entry of entries) {
      const trimmed = entry.trim();
      if (!trimmed || !trimmed.startsWith('FR')) continue;
      const dateRegex = /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/g;
      const dates = [];
      let m;
      while ((m = dateRegex.exec(trimmed)) !== null) dates.push(m[1]);
      if (dates.length < 2) continue;
      const dateLivraison = dates[0].trim();
      const dateConcession = dates[1].trim();
      const beforeDates = trimmed.substring(0, trimmed.indexOf(dates[0]));
      const trackMatch = beforeDates.match(/^(FR\d+)/);
      const tracking = trackMatch ? trackMatch[1] : beforeDates.substring(0, 15);
      const stationEntreprise = beforeDates.substring(tracking.length);
      results.push({ tracking, stationInfo: stationEntreprise, dateLivraison, dateConcession });
    }
    return results;
  }

  /* ── Helpers ──────────────────────────────────────────────── */
  function sid() { return window.getActiveStationId ? window.getActiveStationId() : 'default'; }
  function getChauffeurs() {
    try { const raw = localStorage.getItem(sid() + '-repertoire'); return raw ? JSON.parse(raw) : []; }
    catch (_) { return []; }
  }
  function chauffeurNom(c) { return ((c.prenom || '') + ' ' + (c.nom || '')).trim() || c.id_amazon || '?'; }
  function currentWeekLabel() {
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return d.getUTCFullYear() + '-S' + String(weekNo).padStart(2, '0');
  }
  function formatDate(str) {
    if (!str) return '—';
    try {
      const d = new Date(str.replace(' ', 'T'));
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' +
             d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch (_) { return str; }
  }
  function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  /* ── Rendu principal ────────────────────────────────────── */
  let concWeek = '';

  window.buildConcessions = function () {
    const wrap = document.createElement('div');
    const weeks = getWeeksList();
    if (!concWeek) concWeek = weeks[0] || currentWeekLabel();

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;';

    // Sélecteur de semaine
    const sel = document.createElement('select');
    sel.className = 'rep-input';
    sel.style.cssText = 'width:180px;padding:6px;';
    // Ajouter la semaine courante si pas encore dans la liste
    const allWeeks = new Set(weeks);
    allWeeks.add(concWeek);
    [...allWeeks].sort().reverse().forEach(w => {
      const opt = document.createElement('option');
      opt.value = w; opt.textContent = w;
      if (w === concWeek) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.onchange = () => { concWeek = sel.value; renderStats(); };
    toolbar.appendChild(sel);

    // Bouton nouvelle semaine
    const newWeekBtn = document.createElement('button');
    newWeekBtn.className = 'h-btn'; newWeekBtn.textContent = '+ Nouvelle semaine';
    newWeekBtn.onclick = () => {
      const label = prompt('Nom de la semaine (ex: 2026-S16)', currentWeekLabel());
      if (!label || !label.trim()) return;
      concWeek = label.trim();
      saveConcessions(concWeek, loadConcessions(concWeek)); // crée la clé si vide
      renderStats();
    };
    toolbar.appendChild(newWeekBtn);

    // Bouton supprimer semaine
    if (weeks.includes(concWeek)) {
      const delBtn = document.createElement('button');
      delBtn.className = 'h-btn';
      delBtn.style.cssText = 'color:#f87171;border-color:#f87171;';
      delBtn.textContent = '🗑 Supprimer semaine';
      delBtn.onclick = () => {
        if (!confirm('Supprimer toutes les concessions de ' + concWeek + ' ?')) return;
        deleteWeek(concWeek); concWeek = ''; renderStats();
      };
      toolbar.appendChild(delBtn);
    }
    wrap.appendChild(toolbar);

    // Tableau avec tous les chauffeurs
    const data = loadConcessions(concWeek);
    const chauffeurs = getChauffeurs();
    wrap.appendChild(buildRecapTable(data, chauffeurs));
    return wrap;
  };

  /* ── Charger toutes les concessions de toutes les semaines ── */
  function loadAllConcessions() {
    const prefix = LS_PREFIX();
    const all = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k.startsWith(prefix)) continue;
      const week = k.replace(prefix, '');
      try {
        const items = JSON.parse(localStorage.getItem(k)) || [];
        items.forEach(c => all.push({ ...c, _week: week }));
      } catch (_) {}
    }
    return all;
  }

  /* ── Tableau récapitulatif — tous les chauffeurs listés ──── */
  function buildRecapTable(data, chauffeurs) {
    const container = document.createElement('div');

    // Map nom → concessions semaine
    const byChauffeur = new Map();
    chauffeurs.forEach(c => byChauffeur.set(chauffeurNom(c), []));
    data.forEach(conc => {
      if (conc.chauffeur && byChauffeur.has(conc.chauffeur)) {
        byChauffeur.get(conc.chauffeur).push(conc);
      } else if (conc.chauffeur) {
        if (!byChauffeur.has(conc.chauffeur)) byChauffeur.set(conc.chauffeur, []);
        byChauffeur.get(conc.chauffeur).push(conc);
      }
    });

    // Map nom → concessions année (toutes semaines)
    const allData = loadAllConcessions();
    const byYear = new Map();
    chauffeurs.forEach(c => byYear.set(chauffeurNom(c), []));
    allData.forEach(conc => {
      if (conc.chauffeur && byYear.has(conc.chauffeur)) {
        byYear.get(conc.chauffeur).push(conc);
      } else if (conc.chauffeur) {
        if (!byYear.has(conc.chauffeur)) byYear.set(conc.chauffeur, []);
        byYear.get(conc.chauffeur).push(conc);
      }
    });
    const totalYear = allData.length;

    const table = document.createElement('table');
    table.className = 'rep-table';
    table.style.cssText = 'width:100%;border-collapse:collapse;';
    table.innerHTML = `<thead><tr>
      <th style="text-align:left;padding:8px;">Chauffeur</th>
      <th style="text-align:center;padding:8px;width:90px;">Semaine</th>
      <th style="text-align:center;padding:8px;width:90px;">Année</th>
      <th style="text-align:center;padding:8px;width:210px;">Actions</th>
    </tr></thead>`;
    const tbody = document.createElement('tbody');

    const withConc = [...byChauffeur.entries()].filter(([, l]) => l.length > 0).sort((a, b) => b[1].length - a[1].length);
    const withoutConc = [...byChauffeur.entries()].filter(([, l]) => l.length === 0).sort((a, b) => a[0].localeCompare(b[0]));

    [...withConc, ...withoutConc].forEach(([nom, list]) => {
      const yearList = byYear.get(nom) || [];
      const tr = document.createElement('tr');
      tr.style.cssText = 'border-bottom:1px solid var(--border);';
      const weekStyle = list.length > 0 ? 'color:#f87171;font-weight:700;font-size:15px;' : 'color:var(--text-muted);';
      const yearStyle = yearList.length > 0 ? 'color:#f59e0b;font-weight:700;font-size:15px;' : 'color:var(--text-muted);';
      tr.innerHTML = `
        <td style="padding:8px;">${escHtml(nom)}</td>
        <td style="text-align:center;padding:8px;${weekStyle}">${list.length}</td>
        <td style="text-align:center;padding:8px;${yearStyle}">${yearList.length}</td>
        <td style="text-align:center;padding:8px;"></td>`;
      const actionsCell = tr.lastElementChild;
      const btnWrap = document.createElement('div');
      btnWrap.style.cssText = 'display:flex;gap:4px;justify-content:center;flex-wrap:wrap;';

      const addBtn = document.createElement('button');
      addBtn.className = 'h-btn'; addBtn.textContent = '📋 Ajouter';
      addBtn.style.cssText = 'font-size:12px;padding:3px 8px;';
      addBtn.onclick = () => showPasteForChauffeur(nom);
      btnWrap.appendChild(addBtn);

      if (list.length > 0) {
        const detailBtn = document.createElement('button');
        detailBtn.className = 'h-btn'; detailBtn.textContent = '👁 Semaine';
        detailBtn.style.cssText = 'font-size:12px;padding:3px 8px;';
        detailBtn.onclick = () => showDetailModal(nom, list, concWeek);
        btnWrap.appendChild(detailBtn);
      }

      if (yearList.length > 0) {
        const yearBtn = document.createElement('button');
        yearBtn.className = 'h-btn'; yearBtn.textContent = '📅 Année';
        yearBtn.style.cssText = 'font-size:12px;padding:3px 8px;';
        yearBtn.onclick = () => showYearModal(nom, yearList);
        btnWrap.appendChild(yearBtn);
      }

      actionsCell.appendChild(btnWrap);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);

    const tfoot = document.createElement('tfoot');
    tfoot.innerHTML = `<tr style="border-top:2px solid var(--accent);">
      <td style="padding:8px;font-weight:700;">Total</td>
      <td style="text-align:center;padding:8px;font-weight:700;color:#f87171;">${data.length}</td>
      <td style="text-align:center;padding:8px;font-weight:700;color:#f59e0b;">${totalYear}</td>
      <td></td></tr>`;
    table.appendChild(tfoot);
    container.appendChild(table);
    return container;
  }

  /* ── Modal coller pour un chauffeur précis ────────────────── */
  function showPasteForChauffeur(nom) {
    removeModal();
    const overlay = document.createElement('div');
    overlay.id = 'conc-paste-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.onclick = e => { if (e.target === overlay) removeModal(); };

    const modal = document.createElement('div');
    modal.style.cssText = 'background:var(--bg-card);border-radius:10px;padding:20px;max-width:550px;width:90%;max-height:80vh;overflow:auto;box-shadow:0 8px 32px rgba(0,0,0,0.4);';
    modal.innerHTML = `
      <h3 style="margin:0 0 12px;">📋 Concessions — ${escHtml(nom)}</h3>
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 10px;">Semaine : <strong>${escHtml(concWeek)}</strong></p>
      <label style="font-size:13px;color:var(--text-muted);display:block;margin-bottom:4px;">Collez les données ici</label>
      <textarea id="conc-paste-area" class="rep-input" rows="6"
        style="width:100%;font-family:monospace;font-size:12px;padding:8px;resize:vertical;"
        placeholder="FR3049166837DWP2SNXP2026-04-10 14:59:25..."></textarea>
      <div id="conc-paste-preview" style="margin-top:8px;"></div>
      <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end;">
        <button class="h-btn" id="conc-paste-cancel">Annuler</button>
        <button class="h-btn" id="conc-paste-confirm" style="background:var(--accent);color:#fff;border-color:var(--accent);">Importer</button>
      </div>`;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const textarea = document.getElementById('conc-paste-area');
    const preview = document.getElementById('conc-paste-preview');
    textarea.oninput = () => {
      const parsed = parseConcessionsPaste(textarea.value);
      if (parsed.length) preview.innerHTML = `<span style="color:var(--accent);font-size:13px;">✓ ${parsed.length} colis détecté(s)</span>`;
      else if (textarea.value.trim()) preview.innerHTML = `<span style="color:#f87171;font-size:13px;">⚠ Aucun colis détecté</span>`;
      else preview.innerHTML = '';
    };
    document.getElementById('conc-paste-cancel').onclick = removeModal;
    document.getElementById('conc-paste-confirm').onclick = () => {
      const parsed = parseConcessionsPaste(textarea.value);
      if (!parsed.length) { alert('Aucun colis détecté dans le texte collé.'); return; }
      parsed.forEach(c => c.chauffeur = nom);
      const existing = loadConcessions(concWeek);
      const existingTrackings = new Set(existing.map(c => c.tracking));
      const newEntries = parsed.filter(c => !existingTrackings.has(c.tracking));
      const merged = [...existing, ...newEntries];
      saveConcessions(concWeek, merged);
      removeModal();
      renderStats();
    };
  }

  /* ── Modal détail par chauffeur (semaine) ─────────────────── */
  function showDetailModal(nom, list, weekLabel) {
    removeModal();
    const overlay = document.createElement('div');
    overlay.id = 'conc-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.onclick = e => { if (e.target === overlay) removeModal(); };

    const modal = document.createElement('div');
    modal.style.cssText = 'background:var(--bg-card);border-radius:10px;padding:20px;max-width:600px;width:90%;max-height:80vh;overflow:auto;box-shadow:0 8px 32px rgba(0,0,0,0.4);';

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;';
    header.innerHTML = `<h3 style="margin:0;">${escHtml(nom)} — ${weekLabel || ''} — ${list.length} concession(s)</h3>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'h-btn'; closeBtn.textContent = '✕';
    closeBtn.onclick = removeModal;
    header.appendChild(closeBtn);
    modal.appendChild(header);

    const table = document.createElement('table');
    table.className = 'rep-table';
    table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';
    table.innerHTML = `<thead><tr>
      <th style="padding:6px;text-align:left;">Colis</th>
      <th style="padding:6px;text-align:center;">Livraison</th>
      <th style="padding:6px;text-align:center;">Concession</th>
      <th style="padding:6px;width:40px;"></th>
    </tr></thead>`;
    const tbody = document.createElement('tbody');
    list.forEach(conc => {
      const tr = document.createElement('tr');
      tr.style.cssText = 'border-bottom:1px solid var(--border);';
      tr.innerHTML = `
        <td style="padding:6px;font-family:monospace;font-size:12px;">${escHtml(conc.tracking)}</td>
        <td style="padding:6px;text-align:center;">${formatDate(conc.dateLivraison)}</td>
        <td style="padding:6px;text-align:center;">${formatDate(conc.dateConcession)}</td>
        <td style="padding:6px;text-align:center;"></td>`;
      const delBtn = document.createElement('button');
      delBtn.className = 'h-btn'; delBtn.textContent = '🗑';
      delBtn.style.cssText = 'font-size:11px;padding:1px 6px;color:#f87171;border-color:#f87171;';
      delBtn.onclick = () => {
        const allData = loadConcessions(concWeek);
        const newData = allData.filter(c => c.tracking !== conc.tracking);
        saveConcessions(concWeek, newData);
        tr.remove();
        const remaining = newData.filter(c => c.chauffeur === nom);
        header.querySelector('h3').textContent = `${nom} — ${remaining.length} concession(s)`;
        if (!remaining.length) { removeModal(); renderStats(); }
      };
      tr.lastElementChild.appendChild(delBtn);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    modal.appendChild(table);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  /* ── Modal détail année (groupé par semaine) ─────────────── */
  function showYearModal(nom, yearList) {
    removeModal();
    const overlay = document.createElement('div');
    overlay.id = 'conc-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.onclick = e => { if (e.target === overlay) removeModal(); };

    const modal = document.createElement('div');
    modal.style.cssText = 'background:var(--bg-card);border-radius:10px;padding:20px;max-width:650px;width:90%;max-height:80vh;overflow:auto;box-shadow:0 8px 32px rgba(0,0,0,0.4);';

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;';
    header.innerHTML = `<h3 style="margin:0;">📅 ${escHtml(nom)} — Année — ${yearList.length} concession(s)</h3>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'h-btn'; closeBtn.textContent = '✕';
    closeBtn.onclick = removeModal;
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // Grouper par semaine
    const byWeek = new Map();
    yearList.forEach(c => {
      const w = c._week || '?';
      if (!byWeek.has(w)) byWeek.set(w, []);
      byWeek.get(w).push(c);
    });

    // Trier semaines chronologiquement
    const sortedWeeks = [...byWeek.keys()].sort();

    sortedWeeks.forEach(week => {
      const items = byWeek.get(week);
      const section = document.createElement('div');
      section.style.cssText = 'margin-bottom:14px;';

      const weekHeader = document.createElement('div');
      weekHeader.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer;';
      weekHeader.innerHTML = `<span style="font-weight:700;color:var(--accent);">${escHtml(week)}</span>
        <span style="color:#f87171;font-weight:600;">${items.length} colis</span>
        <span class="conc-year-toggle" style="font-size:11px;color:var(--text-muted);">▶ détail</span>`;

      const detailDiv = document.createElement('div');
      detailDiv.hidden = true;

      const table = document.createElement('table');
      table.className = 'rep-table';
      table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';
      table.innerHTML = `<thead><tr>
        <th style="padding:4px 6px;text-align:left;">Colis</th>
        <th style="padding:4px 6px;text-align:center;">Livraison</th>
        <th style="padding:4px 6px;text-align:center;">Concession</th>
      </tr></thead>`;
      const tbody = document.createElement('tbody');
      items.forEach(conc => {
        const tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom:1px solid var(--border);';
        tr.innerHTML = `
          <td style="padding:4px 6px;font-family:monospace;font-size:12px;">${escHtml(conc.tracking)}</td>
          <td style="padding:4px 6px;text-align:center;">${formatDate(conc.dateLivraison)}</td>
          <td style="padding:4px 6px;text-align:center;">${formatDate(conc.dateConcession)}</td>`;
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      detailDiv.appendChild(table);

      weekHeader.onclick = () => {
        detailDiv.hidden = !detailDiv.hidden;
        weekHeader.querySelector('.conc-year-toggle').textContent = detailDiv.hidden ? '▶ détail' : '▼ masquer';
      };

      section.appendChild(weekHeader);
      section.appendChild(detailDiv);
      modal.appendChild(section);
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function removeModal() {
    const m = document.getElementById('conc-modal-overlay');
    if (m) m.remove();
    const p = document.getElementById('conc-paste-overlay');
    if (p) p.remove();
  }

})();
