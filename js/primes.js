/* js/primes.js — Onglet Primes (SunXP Pro) */
console.log('primes.js chargé');

let primesYear  = new Date().getFullYear();
let primesMonth = new Date().getMonth();

function initPrimes() {
  primesYear  = new Date().getFullYear();
  primesMonth = new Date().getMonth();
  renderPrimes();
}

function getStationIdP() { return window.getActiveStationId ? window.getActiveStationId() : 'default'; }

/* ── Rendu principal ──────────────────────────────────────── */
function renderPrimes() {
  const container = document.getElementById('module-primes');
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText = 'display:flex;flex-direction:column;align-items:stretch;padding:0;overflow:hidden;';

  const sid = getStationIdP();
  const chauffeurs = getChauffeursList(sid);
  const data = loadPrimesData(sid, primesYear, primesMonth);
  const reports = getReportPrecedent(sid, primesYear, primesMonth);

  container.appendChild(buildPrimesToolbar());

  // Barre de recherche
  const searchBar = document.createElement('div');
  searchBar.style.cssText = 'padding:0 16px;';
  const searchInp = document.createElement('input');
  searchInp.type = 'text'; searchInp.placeholder = '🔍 Rechercher un chauffeur...';
  searchInp.className = 'rep-search'; searchInp.style.cssText = 'width:300px;margin-bottom:8px;';
  searchInp.oninput = () => {
    const q = searchInp.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    container.querySelectorAll('tbody tr').forEach(tr => {
      const name = (tr.firstElementChild?.textContent || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      tr.style.display = name.includes(q) ? '' : 'none';
    });
  };
  searchBar.appendChild(searchInp);
  container.appendChild(searchBar);

  const body = document.createElement('div');
  body.style.cssText = 'flex:1;overflow:auto;padding:12px 16px;';

  if (!chauffeurs.length) {
    const p = document.createElement('p');
    p.style.cssText = 'color:var(--text-muted);text-align:center;margin-top:40px;';
    p.textContent = 'Aucun chauffeur dans le répertoire.';
    body.appendChild(p);
  } else {
    body.appendChild(buildPrimesTable(chauffeurs, data, reports, sid));
  }

  container.appendChild(body);
}

/* ── Toolbar ──────────────────────────────────────────────── */
function buildPrimesToolbar() {
  const bar = document.createElement('div');
  bar.className = 'h-toolbar';

  const prev = document.createElement('button'); prev.className='h-btn h-nav'; prev.textContent='◀';
  prev.onclick=()=>{ if(primesMonth===0){primesMonth=11;primesYear--;}else{primesMonth--;} renderPrimes(); };
  const next = document.createElement('button'); next.className='h-btn h-nav'; next.textContent='▶';
  next.onclick=()=>{ if(primesMonth===11){primesMonth=0;primesYear++;}else{primesMonth++;} renderPrimes(); };

  const label = document.createElement('span');
  label.style.cssText='font-size:13px;font-weight:600;color:var(--text-primary);min-width:160px;text-align:center;';
  const d = new Date(primesYear, primesMonth, 1);
  label.textContent = d.toLocaleDateString('fr-FR',{month:'long',year:'numeric'});

  const today = document.createElement('button'); today.className='h-btn'; today.textContent='Mois actuel';
  today.onclick=()=>{ primesYear=new Date().getFullYear(); primesMonth=new Date().getMonth(); renderPrimes(); };

  [prev, label, next, today].forEach(el => bar.appendChild(el));

  // Bouton Envoyer à tous
  const sendAllBtn = document.createElement('button');
  sendAllBtn.className = 'rep-btn rep-btn-primary';
  sendAllBtn.style.cssText = 'margin-left:auto;';
  sendAllBtn.textContent = '📤 Envoyer à tous';
  sendAllBtn.onclick = () => {
    const sid = getStationIdP();
    const chauffeurs = getChauffeursList(sid);
    const data = loadPrimesData(sid, primesYear, primesMonth);
    const reports = getReportPrecedent(sid, primesYear, primesMonth);
    const withTel = chauffeurs.filter(c => c.telephone);
    if (!withTel.length) { alert('Aucun chauffeur avec numéro.'); return; }

    let idx = 0;
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;';
    const box = document.createElement('div');
    box.style.cssText = 'background:var(--bg-sidebar);border:1px solid var(--border);border-radius:12px;padding:24px;text-align:center;max-width:360px;width:90%;';
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function showCurrent() {
      if (idx >= withTel.length) {
        box.innerHTML = '<div style="font-size:16px;font-weight:700;color:#4ade80;margin-bottom:12px;">✅ Terminé !</div><div style="font-size:12px;color:var(--text-muted);">Tous les messages prime ont été envoyés.</div><button class="h-btn" style="margin-top:12px;" id="wa-close-p">Fermer</button>';
        box.querySelector('#wa-close-p').onclick = () => overlay.remove();
        return;
      }
      const c = withTel[idx];
      const key = c.id_amazon || c.id;
      const row = data[key] || {};
      row.jours = countJoursTravailles(sid, c, primesYear, primesMonth);
      const report = reports[key] || 0;
      const total = calcTotalPrime(row, report);
      const nom = c.prenom + ' ' + c.nom;
      const msg = buildPrimeMessage(c, row, total, report);
      const tel = typeof formatWaTel === 'function' ? formatWaTel(c.telephone) : c.telephone.replace(/\D/g,'');

      box.innerHTML = `
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">${idx + 1} / ${withTel.length}</div>
        <div style="font-size:16px;font-weight:700;margin-bottom:8px;">${nom}</div>
        <div style="font-size:13px;font-weight:700;color:${total<0?'#f87171':'#4ade80'};margin-bottom:12px;">Prime : ${total}€</div>
        <button class="rep-btn rep-btn-primary" id="wa-send-p" style="width:100%;margin-bottom:8px;">💬 Envoyer à ${c.prenom}</button>
        <button class="h-btn" id="wa-skip-p" style="width:100%;font-size:11px;">Passer ›</button>
        <button class="h-btn" id="wa-cancel-p" style="width:100%;font-size:11px;margin-top:4px;opacity:0.5;">Annuler</button>
      `;
      box.querySelector('#wa-send-p').onclick = () => {
        navigator.clipboard.writeText(msg).catch(() => {});
        const a = document.createElement('a');
        a.href = 'whatsapp://send?phone=' + tel + '&text=' + encodeURIComponent(msg);
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
        idx++;
        showCurrent();
      };
      box.querySelector('#wa-skip-p').onclick = () => { idx++; showCurrent(); };
      box.querySelector('#wa-cancel-p').onclick = () => overlay.remove();
    }
    showCurrent();
  };
  bar.appendChild(sendAllBtn);

  return bar;
}

/* ── Tableau ──────────────────────────────────────────────── */
const COLS = [
  {key:'casseCamion', label:'Casse\nCamion', tarif:'€'},
  {key:'fico',        label:'Fico',          tarif:'×10€'},
  {key:'mentorVideo', label:'Mentor\nVidéo', tarif:'×20€'},
  {key:'ecr',         label:'ECR',           tarif:'×100€'},
  {key:'concessions', label:'Concessions',   tarif:'×50€'},
  {key:'cle',         label:'Clé',           tarif:'×5€'},
  {key:'trousseau',   label:'Trousseau',     tarif:'×100€'},
  {key:'vigik',       label:'Vigik',         tarif:'×20€'},
  {key:'pdaCasse',    label:'PDA\nCassé',    tarif:'×250€'},
  {key:'absences',    label:'Absences',      tarif:'×50€'},
  {key:'prod',        label:'Prod',          tarif:'×15€'},
  {key:'autre',       label:'Autre',         tarif:'€'},
];

function buildPrimesTable(chauffeurs, data, reports, sid) {
  const table = document.createElement('table');
  table.className = 'h-table';
  table.style.cssText = 'table-layout:auto;font-size:11px;';

  const thead = document.createElement('thead');
  let hRow = '<tr><th>Chauffeur</th>';
  COLS.forEach(c => { hRow += `<th style="white-space:pre-line;font-size:10px;">${c.label}\n<span style="color:#9090b0;font-size:9px;">${c.tarif}</span></th>`; });
  hRow += '<th>Total Prime</th><th>Jours</th><th></th></tr>';
  thead.innerHTML = hRow;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  chauffeurs.forEach((c, idx) => {
    const key = c.id_amazon || c.id;
    const row = data[key] || {};
    const report = reports[key] || 0;
    // Jours travaillés — calculé automatiquement depuis les heures du mois
    const joursAuto = countJoursTravailles(sid, c, primesYear, primesMonth);
    row.jours = joursAuto;
    // Fico auto — impacts mentor du mois
    const nom = ((c.prenom || '') + ' ' + (c.nom || '')).trim();
    if (typeof window.countFicoForMonth === 'function' && nom) {
      row.fico = window.countFicoForMonth(sid, nom, primesYear, primesMonth);
    }
    // Absences auto — depuis rapport chauffeur
    if (typeof window.countAbsencesForMonth === 'function' && nom) {
      row.absences = window.countAbsencesForMonth(sid, nom, primesYear, primesMonth);
    }
    data[key] = row;
    const total = calcTotalPrime(row, report);
    const tr = document.createElement('tr');
    tr.style.backgroundColor = idx % 2 === 0 ? 'var(--bg-sidebar)' : 'var(--bg-primary)';

    // Nom + report mois précédent
    const tdName = document.createElement('td');
    tdName.style.cssText = 'font-weight:600;white-space:nowrap;padding:4px 6px;';
    const nameSpan = document.createElement('span');
    nameSpan.textContent = c.prenom + ' ' + c.nom;
    tdName.appendChild(nameSpan);
    if (report !== 0) {
      const repSpan = document.createElement('span');
      repSpan.style.cssText = 'font-size:9px;margin-left:4px;color:' + (report < 0 ? '#f87171' : '#4ade80') + ';opacity:0.7;';
      repSpan.textContent = (report >= 0 ? '+' : '') + report + '€';
      repSpan.title = 'Report mois précédent';
      tdName.appendChild(repSpan);
    }
    tr.appendChild(tdName);

    // Colonnes impacts
    COLS.forEach(col => {
      const td = buildImpactCell(col.key, row, key, data, sid);
      tr.appendChild(td);
    });

    // Total Prime
    const tdTotal = document.createElement('td');
    tdTotal.style.cssText = `font-weight:700;padding:4px 6px;color:${total < 0 ? '#f87171' : '#4ade80'};`;
    tdTotal.textContent = total + '€';
    if (report < 0) tdTotal.title = `Report mois précédent : ${report}€`;
    tr.appendChild(tdTotal);

    // Jours travaillés (auto)
    const tdJours = document.createElement('td');
    tdJours.style.cssText = 'padding:4px 6px;text-align:center;font-size:12px;';
    tdJours.textContent = joursAuto;
    tr.appendChild(tdJours);

    // Bouton WA
    const tdWA = document.createElement('td');
    const waBtn = document.createElement('button');
    waBtn.className='h-btn'; waBtn.textContent='💬'; waBtn.style.cssText='background:#25d366;color:#fff;border:none;padding:3px 7px;font-size:11px;';
    waBtn.onclick = () => sendPrimeWA(c, row, total, report);
    tdWA.appendChild(waBtn); tr.appendChild(tdWA);

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function buildImpactCell(colKey, row, chauffeurKey, data, sid) {
  const td = document.createElement('td');
  td.style.cssText = 'padding:2px 3px;position:relative;white-space:nowrap;';

  // Absences: auto-rempli depuis le rapport chauffeur, pas de saisie manuelle
  if (colKey === 'absences') {
    const chauffeurs = getChauffeursList(sid);
    const c = chauffeurs.find(ch => (ch.id_amazon || ch.id) === chauffeurKey);
    const nom = c ? ((c.prenom || '') + ' ' + (c.nom || '')).trim() : '';
    const absCount = (typeof window.countAbsencesForMonth === 'function' && nom)
      ? window.countAbsencesForMonth(sid, nom, primesYear, primesMonth)
      : 0;
    row[colKey] = absCount;
    data[chauffeurKey] = row;
    const span = document.createElement('span');
    span.style.cssText = 'display:inline-block;width:36px;text-align:center;font-size:12px;font-weight:700;color:' + (absCount > 0 ? '#f87171' : 'var(--text-muted)') + ';';
    span.textContent = absCount;
    span.title = 'Calculé depuis le rapport chauffeur';
    td.appendChild(span);
    return td;
  }

  // Fico: auto-rempli depuis les impacts mentor dans heures
  if (colKey === 'fico') {
    const chauffeurs = getChauffeursList(sid);
    const c = chauffeurs.find(ch => (ch.id_amazon || ch.id) === chauffeurKey);
    const nom = c ? ((c.prenom || '') + ' ' + (c.nom || '')).trim() : '';
    const ficoCount = (typeof window.countFicoForMonth === 'function' && nom)
      ? window.countFicoForMonth(sid, nom, primesYear, primesMonth)
      : 0;
    row[colKey] = ficoCount;
    data[chauffeurKey] = row;
    const span = document.createElement('span');
    span.style.cssText = 'display:inline-block;width:36px;text-align:center;font-size:12px;font-weight:700;color:' + (ficoCount > 0 ? '#f87171' : 'var(--text-muted)') + ';';
    span.textContent = ficoCount;
    span.title = 'Calculé depuis les impacts mentor dans heures';
    td.appendChild(span);
    return td;
  }

  const val = row[colKey] || '';
  const isWide = (colKey === 'casseCamion' || colKey === 'autre');
  const inp = document.createElement('input');
  inp.className = 'h-inp h-inp-sm'; inp.value = val; inp.style.width = isWide ? '52px' : '36px';
  inp.onchange = () => { row[colKey]=inp.value; data[chauffeurKey]=row; savePrimesData(sid,primesYear,primesMonth,data); renderPrimes(); };
  td.appendChild(inp);

  const commentKey = 'comment_' + colKey;
  const comment = row[commentKey] || '';

  // Emoji bouton commentaire
  const emojiBtn = document.createElement('span');
  emojiBtn.textContent = comment ? '💬' : '📝';
  emojiBtn.style.cssText = 'cursor:pointer;font-size:10px;opacity:'+(comment?'1':'0.3')+';margin-left:1px;vertical-align:middle;';
  emojiBtn.title = comment || 'Ajouter un commentaire';
  emojiBtn.addEventListener('click', e => {
    e.stopPropagation();
    document.querySelectorAll('.prime-comment-popup').forEach(p=>p.remove());
    const popup = document.createElement('div'); popup.className='prime-comment-popup';
    popup.style.cssText='position:fixed;z-index:9999;background:var(--bg-sidebar);border:1px solid var(--accent);border-radius:8px;padding:8px;box-shadow:0 4px 16px rgba(0,0,0,0.5);display:flex;flex-direction:column;gap:4px;width:180px;';
    const rect=emojiBtn.getBoundingClientRect(); popup.style.top=(rect.bottom+4)+'px'; popup.style.left=rect.left+'px';
    const ta=document.createElement('textarea'); ta.value=comment; ta.placeholder='Commentaire...';
    ta.style.cssText='width:100%;height:50px;resize:vertical;background:var(--bg-primary);border:1px solid var(--border);border-radius:4px;color:var(--text-primary);font-size:11px;padding:4px;font-family:var(--font-family);outline:none;';
    const br=document.createElement('div'); br.style.cssText='display:flex;gap:4px;';
    const ok=document.createElement('button'); ok.textContent='✓'; ok.style.cssText='flex:1;background:var(--accent);color:#fff;border:none;border-radius:4px;padding:3px;font-size:11px;cursor:pointer;';
    ok.onclick=()=>{ row[commentKey]=ta.value; data[chauffeurKey]=row; savePrimesData(sid,primesYear,primesMonth,data); popup.remove(); renderPrimes(); };
    const no=document.createElement('button'); no.textContent='✕'; no.style.cssText='background:transparent;border:1px solid var(--border);color:var(--text-muted);border-radius:4px;padding:3px 6px;font-size:11px;cursor:pointer;';
    no.onclick=()=>popup.remove();
    br.appendChild(ok); br.appendChild(no); popup.appendChild(ta); popup.appendChild(br);
    document.body.appendChild(popup); ta.focus();
    setTimeout(()=>{ document.addEventListener('click',function cl(ev){ if(!popup.contains(ev.target)&&ev.target!==emojiBtn){popup.remove();document.removeEventListener('click',cl);} }); },0);
  });
  td.appendChild(emojiBtn);

  if (comment) { const tri=document.createElement('span'); tri.style.cssText='position:absolute;top:0;right:0;width:0;height:0;border-style:solid;border-width:0 7px 7px 0;border-color:transparent var(--accent) transparent transparent;pointer-events:none;'; td.appendChild(tri); }
  return td;
}
