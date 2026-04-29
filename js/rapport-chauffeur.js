/* js/rapport-chauffeur.js — Vue Rapport Chauffeur unifié (SunXP Pro) */
console.log('rapport-chauffeur.js chargé');

(function () {
  const LS_CONC = () => sid() + '-concessions-';
  const LS_RETARD = () => sid() + '-retards-';
  const LS_ABSENCE = () => sid() + '-absences-';

  function sid() { return window.getActiveStationId ? window.getActiveStationId() : 'default'; }
  function getChauffeurs() {
    try { const r = localStorage.getItem(sid() + '-repertoire'); return r ? JSON.parse(r) : []; }
    catch (_) { return []; }
  }
  function cNom(c) { return ((c.prenom || '') + ' ' + (c.nom || '')).trim() || c.id_amazon || '?'; }
  function escH(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmtDate(s) {
    if (!s) return '—';
    try { const d = new Date(s.replace(' ','T')); return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}); }
    catch (_) { return s; }
  }
  function fmtShort(s) {
    if (!s) return '—';
    try { return new Date(s).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'}); }
    catch (_) { return s; }
  }
  function curWeek() {
    const now = new Date(), d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const ys = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return d.getUTCFullYear() + '-S' + String(Math.ceil(((d - ys) / 864e5 + 1) / 7)).padStart(2, '0');
  }

  /* ── Concessions persistence (reuse from rapport-concessions.js) ── */
  function saveConc(sem, data) {
    const key = LS_CONC() + sem;
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
    if (typeof dbSave === 'function') dbSave('concessions', key, { station_id: sid(), semaine: sem }, data);
  }
  function loadConc(sem) { try { const r = localStorage.getItem(LS_CONC() + sem); return r ? JSON.parse(r) : []; } catch (_) { return []; } }
  function concWeeks() {
    const p = LS_CONC(), w = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(p)) w.push(k.replace(p, '')); }
    return w.sort().reverse();
  }
  function delConcWeek(s) { try { localStorage.removeItem(LS_CONC() + s); } catch (_) {} }
  function allConc() {
    const p = LS_CONC(), all = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k.startsWith(p)) continue; const w = k.replace(p, ''); try { (JSON.parse(localStorage.getItem(k)) || []).forEach(c => all.push({ ...c, _week: w })); } catch (_) {} }
    return all;
  }

  /* ── Retards persistence ──────────────────────────────────── */
  function saveRetards(sem, data) {
    const key = LS_RETARD() + sem;
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
    if (typeof dbSave === 'function') dbSave('retards', key, { station_id: sid(), semaine: sem }, data);
  }
  function loadRetards(sem) { try { const r = localStorage.getItem(LS_RETARD() + sem); return r ? JSON.parse(r) : []; } catch (_) { return []; } }
  function retardWeeks() {
    const p = LS_RETARD(), w = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(p)) w.push(k.replace(p, '')); }
    return w.sort().reverse();
  }
  function allRetards() {
    const p = LS_RETARD(), all = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k.startsWith(p)) continue; const w = k.replace(p, ''); try { (JSON.parse(localStorage.getItem(k)) || []).forEach(r => all.push({ ...r, _week: w })); } catch (_) {} }
    return all;
  }

  /* ── Absences injustifiées persistence ─────────────────── */
  function saveAbsences(sem, data) {
    const key = LS_ABSENCE() + sem;
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
    if (typeof dbSave === 'function') dbSave('absences', key, { station_id: sid(), semaine: sem }, data);
  }
  function loadAbsences(sem) { try { const r = localStorage.getItem(LS_ABSENCE() + sem); return r ? JSON.parse(r) : []; } catch (_) { return []; } }
  function absenceWeeks() {
    const p = LS_ABSENCE(), w = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(p)) w.push(k.replace(p, '')); }
    return w.sort().reverse();
  }
  function allAbsences() {
    const p = LS_ABSENCE(), all = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k.startsWith(p)) continue; const w = k.replace(p, ''); try { (JSON.parse(localStorage.getItem(k)) || []).forEach(a => all.push({ ...a, _week: w })); } catch (_) {} }
    return all;
  }

  /* ── Mentor — scan heures data ──────────────────────────── */
  function getMentorBadForWeek(sem) {
    // sem = "2026-S16" → find Monday of that ISO week, scan 7 days
    const m = sem.match(/^(\d{4})-S(\d{2})$/);
    if (!m) return [];
    const year = parseInt(m[1]), week = parseInt(m[2]);
    const jan4 = new Date(year, 0, 4);
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1 + (week - 1) * 7);
    const results = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      const key = sid() + '-heures-' + d.toISOString().slice(0, 10);
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const data = JSON.parse(raw);
        const rows = data.rows || {};
        Object.values(rows).forEach(r => {
          const mentor = parseInt(r.mentor);
          const trajet = parseInt(r.trajet);
          if (!isNaN(mentor) && !isNaN(trajet) && mentor < 810 && trajet !== 5 && r.nom) {
            results.push({ chauffeur: r.nom, date: d.toISOString().slice(0, 10), mentor, trajet, faute: r.faute || '' });
          }
        });
      } catch (_) {}
    }
    return results;
  }
  function getAllMentorBad() {
    const prefix = sid() + '-heures-', results = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k.startsWith(prefix)) continue;
      const dateStr = k.replace(prefix, '');
      try {
        const data = JSON.parse(localStorage.getItem(k));
        const rows = data.rows || {};
        Object.values(rows).forEach(r => {
          const mentor = parseInt(r.mentor);
          const trajet = parseInt(r.trajet);
          if (!isNaN(mentor) && !isNaN(trajet) && mentor < 810 && trajet !== 5 && r.nom) {
            results.push({ chauffeur: r.nom, date: dateStr, mentor, trajet, faute: r.faute || '' });
          }
        });
      } catch (_) {}
    }
    return results;
  }

  /* ── Parse concessions paste ──────────────────────────────── */
  function parseConc(text) {
    const res = [], entries = text.split(/(?=FR\d)/);
    for (const e of entries) {
      const t = e.trim(); if (!t || !t.startsWith('FR')) continue;
      const dr = /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/g, dates = []; let m2;
      while ((m2 = dr.exec(t)) !== null) dates.push(m2[1]);
      if (dates.length < 2) continue;
      const bd = t.substring(0, t.indexOf(dates[0]));
      const tm = bd.match(/^(FR\d+)/);
      res.push({ tracking: tm ? tm[1] : bd.substring(0, 15), stationInfo: bd.substring((tm ? tm[1] : '').length), dateLivraison: dates[0].trim(), dateConcession: dates[1].trim() });
    }
    return res;
  }

  /* ── State ──────────────────────────────────────────────── */
  let rapWeek = '';

  /* ── Main build ─────────────────────────────────────────── */
  window.buildRapportChauffeur = function () {
    const wrap = document.createElement('div');
    const allW = new Set([...concWeeks(), ...retardWeeks(), ...absenceWeeks()]);
    if (!rapWeek) rapWeek = [...allW].sort().reverse()[0] || curWeek();
    allW.add(rapWeek);

    // Toolbar
    const tb = document.createElement('div');
    tb.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;';
    const sel = document.createElement('select'); sel.className = 'rep-input'; sel.style.cssText = 'width:180px;padding:6px;';
    [...allW].sort().reverse().forEach(w => { const o = document.createElement('option'); o.value = w; o.textContent = w; if (w === rapWeek) o.selected = true; sel.appendChild(o); });
    sel.onchange = () => { rapWeek = sel.value; renderStats(); };
    tb.appendChild(sel);
    const nwBtn = document.createElement('button'); nwBtn.className = 'h-btn'; nwBtn.textContent = '+ Nouvelle semaine';
    nwBtn.onclick = () => { const l = prompt('Semaine (ex: 2026-S16)', curWeek()); if (!l || !l.trim()) return; rapWeek = l.trim(); renderStats(); };
    tb.appendChild(nwBtn);
    wrap.appendChild(tb);

    // Data
    const chauffeurs = getChauffeurs();
    const concData = loadConc(rapWeek);
    const retData = loadRetards(rapWeek);
    const absData = loadAbsences(rapWeek);
    const mentorData = getMentorBadForWeek(rapWeek);
    const allConcData = allConc();
    const allRetData = allRetards();
    const allAbsData = allAbsences();
    const allMentorData = getAllMentorBad();

    // Build table
    wrap.appendChild(buildTable(chauffeurs, concData, retData, absData, mentorData, allConcData, allRetData, allAbsData, allMentorData));
    return wrap;
  };

  /* ── Table ────────────────────────────────────────────────── */
  function buildTable(chauffeurs, concData, retData, absData, mentorData, allConcData, allRetData, allAbsData, allMentorData) {
    const container = document.createElement('div');
    const byCh = (arr, nom) => arr.filter(x => x.chauffeur === nom);

    const table = document.createElement('table'); table.className = 'rep-table';
    table.style.cssText = 'width:100%;border-collapse:collapse;';
    table.innerHTML = `<thead><tr>
      <th style="text-align:left;padding:8px;">Chauffeur</th>
      <th style="text-align:center;padding:8px;width:70px;" title="Retards semaine">⏰ Sem.</th>
      <th style="text-align:center;padding:8px;width:70px;" title="Retards année">⏰ An.</th>
      <th style="text-align:center;padding:8px;width:70px;" title="Absences injustifiées semaine">🚫 Sem.</th>
      <th style="text-align:center;padding:8px;width:70px;" title="Absences injustifiées année">🚫 An.</th>
      <th style="text-align:center;padding:8px;width:70px;" title="Mentor semaine">🛞 Sem.</th>
      <th style="text-align:center;padding:8px;width:70px;" title="Mentor année">🛞 An.</th>
      <th style="text-align:center;padding:8px;width:70px;" title="Concessions semaine">📦 Sem.</th>
      <th style="text-align:center;padding:8px;width:70px;" title="Concessions année">📦 An.</th>
      <th style="text-align:center;padding:8px;width:160px;">Actions</th>
    </tr></thead>`;
    const tbody = document.createElement('tbody');

    const names = chauffeurs.map(c => cNom(c));
    // Sort: those with any issues first
    const score = n => byCh(retData, n).length + byCh(absData, n).length + byCh(mentorData, n).length + byCh(concData, n).length;
    const sorted = [...names].sort((a, b) => score(b) - score(a) || a.localeCompare(b));

    let totRetW = 0, totRetY = 0, totAbsW = 0, totAbsY = 0, totMenW = 0, totMenY = 0, totConW = 0, totConY = 0;

    sorted.forEach(nom => {
      const rW = byCh(retData, nom), rY = byCh(allRetData, nom);
      const aW = byCh(absData, nom), aY = byCh(allAbsData, nom);
      const mW = byCh(mentorData, nom), mY = byCh(allMentorData, nom);
      const cW = byCh(concData, nom), cY = byCh(allConcData, nom);
      totRetW += rW.length; totRetY += rY.length;
      totAbsW += aW.length; totAbsY += aY.length;
      totMenW += mW.length; totMenY += mY.length;
      totConW += cW.length; totConY += cY.length;

      const tr = document.createElement('tr'); tr.style.cssText = 'border-bottom:1px solid var(--border);';
      const cs = (n, col) => n > 0 ? `color:${col};font-weight:700;` : 'color:var(--text-muted);';
      tr.innerHTML = `
        <td style="padding:8px;">${escH(nom)}</td>
        <td style="text-align:center;padding:8px;${cs(rW.length,'#f87171')}">${rW.length}</td>
        <td style="text-align:center;padding:8px;${cs(rY.length,'#f59e0b')}">${rY.length}</td>
        <td style="text-align:center;padding:8px;${cs(aW.length,'#f87171')}">${aW.length}</td>
        <td style="text-align:center;padding:8px;${cs(aY.length,'#f59e0b')}">${aY.length}</td>
        <td style="text-align:center;padding:8px;${cs(mW.length,'#f87171')}">${mW.length}</td>
        <td style="text-align:center;padding:8px;${cs(mY.length,'#f59e0b')}">${mY.length}</td>
        <td style="text-align:center;padding:8px;${cs(cW.length,'#f87171')}">${cW.length}</td>
        <td style="text-align:center;padding:8px;${cs(cY.length,'#f59e0b')}">${cY.length}</td>
        <td style="text-align:center;padding:8px;"></td>`;
      const actCell = tr.lastElementChild;
      const bw = document.createElement('div'); bw.style.cssText = 'display:flex;gap:3px;justify-content:center;flex-wrap:wrap;';

      // Retard add
      const retBtn = document.createElement('button'); retBtn.className = 'h-btn'; retBtn.textContent = '⏰+';
      retBtn.style.cssText = 'font-size:11px;padding:2px 6px;'; retBtn.title = 'Ajouter un retard';
      retBtn.onclick = () => showRetardModal(nom);
      bw.appendChild(retBtn);

      // Absence add
      const absBtn = document.createElement('button'); absBtn.className = 'h-btn'; absBtn.textContent = '🚫+';
      absBtn.style.cssText = 'font-size:11px;padding:2px 6px;'; absBtn.title = 'Ajouter une absence injustifiée';
      absBtn.onclick = () => showAbsenceModal(nom);
      bw.appendChild(absBtn);

      // Concession add
      const concBtn = document.createElement('button'); concBtn.className = 'h-btn'; concBtn.textContent = '📦+';
      concBtn.style.cssText = 'font-size:11px;padding:2px 6px;'; concBtn.title = 'Ajouter des concessions';
      concBtn.onclick = () => showConcModal(nom);
      bw.appendChild(concBtn);

      // Detail button
      const hasData = rW.length + aW.length + mW.length + cW.length + rY.length + aY.length + mY.length + cY.length > 0;
      if (hasData) {
        const detBtn = document.createElement('button'); detBtn.className = 'h-btn'; detBtn.textContent = '👁';
        detBtn.style.cssText = 'font-size:11px;padding:2px 6px;'; detBtn.title = 'Voir le détail';
        detBtn.onclick = () => showFullDetail(nom, rW, rY, aW, aY, mW, mY, cW, cY);
        bw.appendChild(detBtn);
      }
      actCell.appendChild(bw);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    const tfoot = document.createElement('tfoot');
    tfoot.innerHTML = `<tr style="border-top:2px solid var(--accent);">
      <td style="padding:8px;font-weight:700;">Total</td>
      <td style="text-align:center;padding:8px;font-weight:700;color:#f87171;">${totRetW}</td>
      <td style="text-align:center;padding:8px;font-weight:700;color:#f59e0b;">${totRetY}</td>
      <td style="text-align:center;padding:8px;font-weight:700;color:#f87171;">${totAbsW}</td>
      <td style="text-align:center;padding:8px;font-weight:700;color:#f59e0b;">${totAbsY}</td>
      <td style="text-align:center;padding:8px;font-weight:700;color:#f87171;">${totMenW}</td>
      <td style="text-align:center;padding:8px;font-weight:700;color:#f59e0b;">${totMenY}</td>
      <td style="text-align:center;padding:8px;font-weight:700;color:#f87171;">${totConW}</td>
      <td style="text-align:center;padding:8px;font-weight:700;color:#f59e0b;">${totConY}</td>
      <td></td></tr>`;
    table.appendChild(tfoot);
    container.appendChild(table);
    return container;
  }

  /* ── Modal Retard ─────────────────────────────────────────── */
  function showRetardModal(nom) {
    rmModal();
    const ov = mkOverlay('rap-modal-overlay');
    const modal = document.createElement('div');
    modal.style.cssText = 'background:var(--bg-card,var(--bg-sidebar));border-radius:10px;padding:20px;max-width:450px;width:90%;max-height:80vh;overflow:auto;box-shadow:0 8px 32px rgba(0,0,0,0.4);';
    modal.innerHTML = `
      <h3 style="margin:0 0 12px;">⏰ Retard — ${escH(nom)}</h3>
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 10px;">Semaine : <strong>${escH(rapWeek)}</strong></p>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <label style="font-size:12px;color:var(--text-muted);">Date du retard</label>
        <input type="date" id="rap-ret-date" class="rep-input" value="${new Date().toISOString().slice(0,10)}">
        <label style="font-size:12px;color:var(--text-muted);">Durée du retard (minutes)</label>
        <input type="number" id="rap-ret-duree" class="rep-input" placeholder="ex: 15" min="1">
        <label style="font-size:12px;color:var(--text-muted);">Commentaire</label>
        <input type="text" id="rap-ret-comment" class="rep-input" placeholder="Optionnel">
      </div>
      <div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end;">
        <button class="h-btn" id="rap-ret-cancel">Annuler</button>
        <button class="h-btn" id="rap-ret-ok" style="background:var(--accent);color:#fff;border-color:var(--accent);">Ajouter</button>
      </div>`;
    ov.appendChild(modal); document.body.appendChild(ov);
    document.getElementById('rap-ret-cancel').onclick = rmModal;
    document.getElementById('rap-ret-ok').onclick = () => {
      const date = document.getElementById('rap-ret-date').value;
      const duree = parseInt(document.getElementById('rap-ret-duree').value);
      const comment = document.getElementById('rap-ret-comment').value.trim();
      if (!date) { alert('Veuillez indiquer la date.'); return; }
      if (!duree || duree < 1) { alert('Veuillez indiquer la durée en minutes.'); return; }
      const existing = loadRetards(rapWeek);
      existing.push({ chauffeur: nom, date, duree, comment });
      saveRetards(rapWeek, existing);
      rmModal(); renderStats();
    };
  }

  /* ── Modal Absence injustifiée ────────────────────────────── */
  function showAbsenceModal(nom) {
    rmModal();
    const ov = mkOverlay('rap-modal-overlay');
    const modal = document.createElement('div');
    modal.style.cssText = 'background:var(--bg-card,var(--bg-sidebar));border-radius:10px;padding:20px;max-width:450px;width:90%;max-height:80vh;overflow:auto;box-shadow:0 8px 32px rgba(0,0,0,0.4);';
    modal.innerHTML = `
      <h3 style="margin:0 0 12px;">🚫 Absence injustifiée — ${escH(nom)}</h3>
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 10px;">Semaine : <strong>${escH(rapWeek)}</strong></p>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <label style="font-size:12px;color:var(--text-muted);">Date de l'absence</label>
        <input type="date" id="rap-abs-date" class="rep-input" value="${new Date().toISOString().slice(0,10)}">
        <label style="font-size:12px;color:var(--text-muted);">Type d'absence</label>
        <select id="rap-abs-type" class="rep-input">
          <option value="No Show">No Show</option>
          <option value="Abandon de poste">Abandon de poste</option>
          <option value="Absence sans prévenir">Absence sans prévenir</option>
          <option value="Autre">Autre</option>
        </select>
        <label style="font-size:12px;color:var(--text-muted);">Commentaire</label>
        <input type="text" id="rap-abs-comment" class="rep-input" placeholder="Optionnel">
      </div>
      <div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end;">
        <button class="h-btn" id="rap-abs-cancel">Annuler</button>
        <button class="h-btn" id="rap-abs-ok" style="background:var(--accent);color:#fff;border-color:var(--accent);">Ajouter</button>
      </div>`;
    ov.appendChild(modal); document.body.appendChild(ov);
    document.getElementById('rap-abs-cancel').onclick = rmModal;
    document.getElementById('rap-abs-ok').onclick = () => {
      const date = document.getElementById('rap-abs-date').value;
      const type = document.getElementById('rap-abs-type').value;
      const comment = document.getElementById('rap-abs-comment').value.trim();
      if (!date) { alert('Veuillez indiquer la date.'); return; }
      const existing = loadAbsences(rapWeek);
      existing.push({ chauffeur: nom, date, type, comment });
      saveAbsences(rapWeek, existing);
      rmModal(); renderStats();
    };
  }

  /* ── Statuts de livraison disponibles ─────────────────────── */
  const STATUTS_LIVRAISON = [
    'Boite aux lettres',
    'Lieu Sûr',
    'Receptionniste',
    'Main propre',
    'Locker',
    'Devant la porte',
    'Jardin'
  ];

  /* ── Modal Concessions paste ────────────────────────────── */
  function showConcModal(nom) {
    rmModal();
    const ov = mkOverlay('rap-modal-overlay');
    const modal = document.createElement('div');
    modal.style.cssText = 'background:var(--bg-card,var(--bg-sidebar));border-radius:10px;padding:20px;max-width:550px;width:90%;max-height:80vh;overflow:auto;box-shadow:0 8px 32px rgba(0,0,0,0.4);';
    modal.innerHTML = `
      <h3 style="margin:0 0 12px;">📦 Concessions — ${escH(nom)}</h3>
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 10px;">Semaine : <strong>${escH(rapWeek)}</strong></p>
      <label style="font-size:12px;color:var(--text-muted);">Collez les données ici</label>
      <textarea id="rap-conc-area" class="rep-input" rows="5" style="width:100%;font-family:monospace;font-size:12px;padding:8px;resize:vertical;" placeholder="FR3049166837DWP2SNXP2026-04-10 14:59:25..."></textarea>
      <div id="rap-conc-preview" style="margin-top:6px;"></div>
      <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end;">
        <button class="h-btn" id="rap-conc-cancel">Annuler</button>
        <button class="h-btn" id="rap-conc-ok" style="background:var(--accent);color:#fff;border-color:var(--accent);">Suivant →</button>
      </div>`;
    ov.appendChild(modal); document.body.appendChild(ov);
    const ta = document.getElementById('rap-conc-area'), pv = document.getElementById('rap-conc-preview');
    ta.oninput = () => { const p = parseConc(ta.value); pv.innerHTML = p.length ? `<span style="color:var(--accent);font-size:13px;">✓ ${p.length} colis</span>` : (ta.value.trim() ? '<span style="color:#f87171;font-size:13px;">⚠ Aucun colis détecté</span>' : ''); };
    document.getElementById('rap-conc-cancel').onclick = rmModal;
    document.getElementById('rap-conc-ok').onclick = () => {
      const parsed = parseConc(ta.value);
      if (!parsed.length) { alert('Aucun colis détecté.'); return; }
      parsed.forEach(c => c.chauffeur = nom);
      // Filtrer les doublons
      const ex = loadConc(rapWeek), set = new Set(ex.map(c => c.tracking));
      const nw = parsed.filter(c => !set.has(c.tracking));
      if (!nw.length) { alert('Tous les colis existent déjà pour cette semaine.'); return; }
      // Ouvrir la fenêtre de sélection des statuts
      rmModal();
      showStatutModal(nom, nw, ex);
    };
  }

  /* ── Modal sélection statut de livraison ────────────────── */
  function showStatutModal(nom, newEntries, existingEntries) {
    const ov = mkOverlay('rap-modal-overlay');
    const modal = document.createElement('div');
    modal.style.cssText = 'background:var(--bg-card,var(--bg-sidebar));border-radius:10px;padding:20px;max-width:650px;width:95%;max-height:85vh;overflow:auto;box-shadow:0 8px 32px rgba(0,0,0,0.4);';

    let html = `<h3 style="margin:0 0 4px;">📋 Statut de livraison — ${escH(nom)}</h3>
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;">${newEntries.length} colis à qualifier</p>
      <table class="rep-table" style="width:100%;font-size:13px;border-collapse:collapse;">
        <thead><tr>
          <th style="padding:6px;text-align:left;">Colis</th>
          <th style="padding:6px;text-align:center;">Livraison</th>
          <th style="padding:6px;text-align:left;">Statut</th>
        </tr></thead><tbody>`;

    newEntries.forEach((c, i) => {
      html += `<tr style="border-bottom:1px solid var(--border);">
        <td style="padding:6px;font-family:monospace;font-size:11px;">${escH(c.tracking)}</td>
        <td style="padding:6px;text-align:center;font-size:12px;">${fmtDate(c.dateLivraison)}</td>
        <td style="padding:6px;">
          <select class="rep-input rap-statut-sel" data-idx="${i}" style="padding:5px;font-size:12px;width:100%;">
            <option value="">— Choisir —</option>
            ${STATUTS_LIVRAISON.map(s => `<option value="${escH(s)}">${escH(s)}</option>`).join('')}
          </select>
        </td></tr>`;
    });

    html += `</tbody></table>
      <div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end;">
        <button class="h-btn" id="rap-stat-cancel">Annuler</button>
        <button class="h-btn" id="rap-stat-ok" style="background:var(--accent);color:#fff;border-color:var(--accent);">Importer</button>
      </div>`;

    modal.innerHTML = html;
    ov.appendChild(modal); document.body.appendChild(ov);

    document.getElementById('rap-stat-cancel').onclick = rmModal;
    document.getElementById('rap-stat-ok').onclick = () => {
      // Lire les statuts sélectionnés
      modal.querySelectorAll('.rap-statut-sel').forEach(sel => {
        const idx = parseInt(sel.dataset.idx);
        if (sel.value) newEntries[idx].statutLivraison = sel.value;
      });
      // Sauvegarder
      saveConc(rapWeek, [...existingEntries, ...newEntries]);
      rmModal(); renderStats();
    };
  }

  /* ── Modal détail complet ─────────────────────────────────── */
  function showFullDetail(nom, rW, rY, aW, aY, mW, mY, cW, cY) {
    rmModal();
    const ov = mkOverlay('rap-modal-overlay');
    const modal = document.createElement('div');
    modal.style.cssText = 'background:var(--bg-card,var(--bg-sidebar));border-radius:10px;padding:20px;max-width:700px;width:95%;max-height:85vh;overflow:auto;box-shadow:0 8px 32px rgba(0,0,0,0.4);';

    let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <h3 style="margin:0;">${escH(nom)}</h3><button class="h-btn" id="rap-det-close">✕</button></div>`;

    // Retards semaine
    html += section('⏰ Retards — ' + rapWeek, rW.length);
    if (rW.length) {
      html += '<table class="rep-table" style="width:100%;font-size:13px;margin-bottom:6px;"><thead><tr><th style="padding:4px 6px;">Date</th><th style="padding:4px 6px;text-align:center;">Durée</th><th style="padding:4px 6px;">Commentaire</th><th style="width:30px;"></th></tr></thead><tbody>';
      rW.forEach(r => { html += `<tr style="border-bottom:1px solid var(--border);"><td style="padding:4px 6px;">${fmtShort(r.date)}</td><td style="padding:4px 6px;text-align:center;font-weight:700;color:#f87171;">${r.duree} min</td><td style="padding:4px 6px;color:var(--text-muted);font-size:12px;">${escH(r.comment || '')}</td><td style="padding:4px 6px;"><button class="h-btn rap-del-ret" data-date="${escH(r.date)}" data-duree="${r.duree}" style="font-size:10px;padding:1px 5px;color:#f87171;border-color:#f87171;">🗑</button></td></tr>`; });
      html += '</tbody></table>';
    }

    // Retards année
    html += section('⏰ Retards — Année', rY.length);
    if (rY.length) {
      html += groupByWeek(rY, items => {
        let t = '<table class="rep-table" style="width:100%;font-size:12px;"><tbody>';
        items.forEach(r => { t += `<tr style="border-bottom:1px solid var(--border);"><td style="padding:3px 6px;">${fmtShort(r.date)}</td><td style="padding:3px 6px;text-align:center;font-weight:700;color:#f59e0b;">${r.duree} min</td><td style="padding:3px 6px;color:var(--text-muted);font-size:11px;">${escH(r.comment || '')}</td></tr>`; });
        return t + '</tbody></table>';
      });
    }

    // Absences injustifiées semaine
    html += section('🚫 Absences injustifiées — ' + rapWeek, aW.length);
    if (aW.length) {
      html += '<table class="rep-table" style="width:100%;font-size:13px;margin-bottom:6px;"><thead><tr><th style="padding:4px 6px;">Date</th><th style="padding:4px 6px;">Type</th><th style="padding:4px 6px;">Commentaire</th><th style="width:30px;"></th></tr></thead><tbody>';
      aW.forEach(a => { html += `<tr style="border-bottom:1px solid var(--border);"><td style="padding:4px 6px;">${fmtShort(a.date)}</td><td style="padding:4px 6px;font-weight:700;color:#f87171;">${escH(a.type || '—')}</td><td style="padding:4px 6px;color:var(--text-muted);font-size:12px;">${escH(a.comment || '')}</td><td style="padding:4px 6px;"><button class="h-btn rap-del-abs" data-date="${escH(a.date)}" data-type="${escH(a.type || '')}" style="font-size:10px;padding:1px 5px;color:#f87171;border-color:#f87171;">🗑</button></td></tr>`; });
      html += '</tbody></table>';
    }

    // Absences injustifiées année
    html += section('🚫 Absences injustifiées — Année', aY.length);
    if (aY.length) {
      html += groupByWeek(aY, items => {
        let t = '<table class="rep-table" style="width:100%;font-size:12px;"><tbody>';
        items.forEach(a => { t += `<tr style="border-bottom:1px solid var(--border);"><td style="padding:3px 6px;">${fmtShort(a.date)}</td><td style="padding:3px 6px;font-weight:700;color:#f59e0b;">${escH(a.type || '—')}</td><td style="padding:3px 6px;color:var(--text-muted);font-size:11px;">${escH(a.comment || '')}</td></tr>`; });
        return t + '</tbody></table>';
      });
    }

    // Mentor semaine
    html += section('🛞 Mentor — ' + rapWeek, mW.length);
    if (mW.length) {
      html += '<table class="rep-table" style="width:100%;font-size:13px;margin-bottom:6px;"><thead><tr><th style="padding:4px 6px;">Date</th><th style="padding:4px 6px;text-align:center;">Score</th><th style="padding:4px 6px;text-align:center;">Trajet</th><th style="padding:4px 6px;">Faute</th></tr></thead><tbody>';
      mW.forEach(m => { html += `<tr style="border-bottom:1px solid var(--border);"><td style="padding:4px 6px;">${fmtShort(m.date)}</td><td style="padding:4px 6px;text-align:center;font-weight:700;color:#f87171;">${m.mentor}</td><td style="padding:4px 6px;text-align:center;">${m.trajet}★</td><td style="padding:4px 6px;font-size:12px;color:#f97316;">${escH(m.faute || '—')}</td></tr>`; });
      html += '</tbody></table>';
    }

    // Mentor année
    html += section('🛞 Mentor — Année', mY.length);
    if (mY.length) {
      html += groupByWeek(mY, items => {
        let t = '<table class="rep-table" style="width:100%;font-size:12px;"><tbody>';
        items.forEach(m => { t += `<tr style="border-bottom:1px solid var(--border);"><td style="padding:3px 6px;">${fmtShort(m.date)}</td><td style="padding:3px 6px;text-align:center;font-weight:700;color:#f59e0b;">${m.mentor}</td><td style="padding:3px 6px;text-align:center;">${m.trajet}★</td><td style="padding:3px 6px;font-size:11px;color:#f97316;">${escH(m.faute || '—')}</td></tr>`; });
        return t + '</tbody></table>';
      });
    }

    // Concessions semaine
    html += section('📦 Concessions — ' + rapWeek, cW.length);
    if (cW.length) {
      html += '<table class="rep-table" style="width:100%;font-size:13px;margin-bottom:6px;"><thead><tr><th style="padding:4px 6px;">Colis</th><th style="padding:4px 6px;text-align:center;">Livraison</th><th style="padding:4px 6px;text-align:center;">Concession</th><th style="padding:4px 6px;text-align:center;">Statut</th><th style="width:30px;"></th></tr></thead><tbody>';
      cW.forEach(c => { html += `<tr style="border-bottom:1px solid var(--border);"><td style="padding:4px 6px;font-family:monospace;font-size:11px;">${escH(c.tracking)}</td><td style="padding:4px 6px;text-align:center;">${fmtDate(c.dateLivraison)}</td><td style="padding:4px 6px;text-align:center;">${fmtDate(c.dateConcession)}</td><td style="padding:4px 6px;text-align:center;font-size:11px;color:var(--text-muted);">${escH(c.statutLivraison || '—')}</td><td style="padding:4px 6px;"><button class="h-btn rap-del-conc" data-tr="${escH(c.tracking)}" style="font-size:10px;padding:1px 5px;color:#f87171;border-color:#f87171;">🗑</button></td></tr>`; });
      html += '</tbody></table>';
    }

    // Concessions année
    html += section('📦 Concessions — Année', cY.length);
    if (cY.length) {
      html += groupByWeek(cY, items => {
        let t = '<table class="rep-table" style="width:100%;font-size:12px;"><tbody>';
        items.forEach(c => { t += `<tr style="border-bottom:1px solid var(--border);"><td style="padding:3px 6px;font-family:monospace;font-size:11px;">${escH(c.tracking)}</td><td style="padding:3px 6px;text-align:center;">${fmtDate(c.dateLivraison)}</td><td style="padding:3px 6px;text-align:center;">${fmtDate(c.dateConcession)}</td><td style="padding:3px 6px;text-align:center;font-size:10px;color:var(--text-muted);">${escH(c.statutLivraison || '—')}</td></tr>`; });
        return t + '</tbody></table>';
      });
    }

    modal.innerHTML = html;
    ov.appendChild(modal); document.body.appendChild(ov);

    // Bind close
    document.getElementById('rap-det-close').onclick = rmModal;

    // Bind delete retard buttons
    modal.querySelectorAll('.rap-del-ret').forEach(btn => {
      btn.onclick = () => {
        const d = btn.dataset.date, du = parseInt(btn.dataset.duree);
        const ex = loadRetards(rapWeek);
        const idx = ex.findIndex(r => r.chauffeur === nom && r.date === d && r.duree === du);
        if (idx >= 0) { ex.splice(idx, 1); saveRetards(rapWeek, ex); }
        rmModal(); renderStats();
      };
    });

    // Bind delete absence buttons
    modal.querySelectorAll('.rap-del-abs').forEach(btn => {
      btn.onclick = () => {
        const d = btn.dataset.date, tp = btn.dataset.type;
        const ex = loadAbsences(rapWeek);
        const idx = ex.findIndex(a => a.chauffeur === nom && a.date === d && a.type === tp);
        if (idx >= 0) { ex.splice(idx, 1); saveAbsences(rapWeek, ex); }
        rmModal(); renderStats();
      };
    });

    // Bind delete concession buttons
    modal.querySelectorAll('.rap-del-conc').forEach(btn => {
      btn.onclick = () => {
        const tr = btn.dataset.tr;
        const ex = loadConc(rapWeek);
        const nw = ex.filter(c => c.tracking !== tr);
        saveConc(rapWeek, nw);
        rmModal(); renderStats();
      };
    });
  }

  function section(title, count) {
    const col = count > 0 ? '#f87171' : 'var(--text-muted)';
    return `<div style="margin-top:10px;margin-bottom:4px;font-size:13px;font-weight:700;color:${col};">${title} (${count})</div>`;
  }

  /* ── Grouper par semaine avec séparateurs ───────────────── */
  function groupByWeek(items, renderFn) {
    const byW = new Map();
    items.forEach(item => {
      const w = item._week || '?';
      if (!byW.has(w)) byW.set(w, []);
      byW.get(w).push(item);
    });
    // Pour le mentor, _week n'existe pas, on utilise la date pour déduire la semaine
    // Regrouper les items sans _week par date ISO week
    if ([...byW.keys()].length === 1 && byW.has('?')) {
      byW.clear();
      items.forEach(item => {
        const d = new Date(item.date || item.dateConcession || '');
        const w = getISOWeekLabel(d);
        if (!byW.has(w)) byW.set(w, []);
        byW.get(w).push(item);
      });
    }
    let html = '<div style="max-height:200px;overflow:auto;margin-bottom:6px;">';
    [...byW.keys()].sort().forEach(week => {
      const wItems = byW.get(week);
      html += `<div style="margin-top:6px;padding:4px 8px;background:var(--accent-dim);border-radius:4px;font-size:12px;font-weight:700;color:var(--accent);display:flex;justify-content:space-between;">`
            + `<span>${escH(week)}</span><span style="color:var(--text-muted);font-weight:400;">${wItems.length} élément(s)</span></div>`;
      html += renderFn(wItems);
    });
    html += '</div>';
    return html;
  }

  function getISOWeekLabel(d) {
    if (isNaN(d.getTime())) return '?';
    const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7));
    const ys = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
    const wn = Math.ceil(((dt - ys) / 864e5 + 1) / 7);
    return dt.getUTCFullYear() + '-S' + String(wn).padStart(2, '0');
  }

  /* ── Overlay helpers ────────────────────────────────────── */
  function mkOverlay(id) {
    const ov = document.createElement('div'); ov.id = id;
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;';
    ov.onclick = e => { if (e.target === ov) rmModal(); };
    return ov;
  }
  function rmModal() {
    ['rap-modal-overlay','conc-modal-overlay','conc-paste-overlay'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
  }

})();
