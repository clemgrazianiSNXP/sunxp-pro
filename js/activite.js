/* js/activite.js — Onglet Activité Journalière (SunXP Pro) */
console.log('activite.js chargé');

let activiteDate = new Date();
let activiteRoutes = [];
let activiteBU = [], activiteAST = [];
let activiteGolden = {};
let activiteTab = 'routes'; // 'routes' | 'productivite'

function initActivite() { activiteDate = new Date(); loadActivite(); renderActivite(); }

function actSid() { return window.getActiveStationId ? window.getActiveStationId() : 'default'; }
function actKey(d) { return actSid() + '-activite-' + (d||activiteDate).toISOString().slice(0,10); }

function saveActivite() {
  const key = actKey();
  const data = { routes: activiteRoutes, bu: activiteBU, ast: activiteAST, golden: activiteGolden };
  try { localStorage.setItem(key, JSON.stringify(data)); } catch(_) {}
  if (typeof dbSave === 'function') {
    const dateStr = (activiteDate || new Date()).toISOString().slice(0, 10);
    dbSave('activite', key, { station_id: actSid(), date_jour: dateStr }, data);
  }
}
function loadActivite() {
  try {
    const raw = localStorage.getItem(actKey());
    if (!raw) { activiteRoutes=[]; activiteBU=[]; activiteAST=[]; activiteGolden={}; return; }
    const d = JSON.parse(raw);
    activiteRoutes=d.routes||[]; activiteBU=d.bu||[]; activiteAST=d.ast||[]; activiteGolden=d.golden||{};
  } catch(_) { activiteRoutes=[]; activiteBU=[]; activiteAST=[]; activiteGolden={}; }
}

/* ── Rendu principal ──────────────────────────────────────── */
function renderActivite() {
  const c = document.getElementById('module-activite');
  if (!c) return;
  c.innerHTML = '';
  c.style.cssText = 'display:flex;flex-direction:column;align-items:stretch;padding:0;overflow:hidden;';
  c.appendChild(buildActNav());
  c.appendChild(buildActDateBar());
  const body = document.createElement('div');
  body.style.cssText = 'flex:1;overflow:auto;padding:12px 16px;display:flex;flex-direction:column;align-items:center;';
  if (activiteTab === 'routes') { body.appendChild(buildActTable()); body.appendChild(buildBUAST()); }
  else body.appendChild(buildProductivite());
  c.appendChild(body);
}

/* ── Sous-onglets ─────────────────────────────────────────── */
function buildActNav() {
  const nav = document.createElement('div');
  nav.style.cssText = 'display:flex;gap:4px;padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg-sidebar);flex-shrink:0;';
  [['routes','Tableau des routes'],['productivite','Info Productivité']].forEach(([id,label]) => {
    const btn = document.createElement('button'); btn.className='h-btn'; btn.textContent=label;
    if (activiteTab===id) btn.style.cssText='background:var(--accent);color:#fff;border-color:var(--accent);';
    btn.onclick=()=>{ activiteTab=id; renderActivite(); };
    nav.appendChild(btn);
  });
  return nav;
}

/* ── Barre date + boutons ─────────────────────────────────── */
function buildActDateBar() {
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 16px;border-bottom:1px solid var(--border);background:var(--bg-sidebar);flex-shrink:0;flex-wrap:wrap;';
  if (activiteTab === 'routes') {
    const csvBtn = document.createElement('button'); csvBtn.className='h-btn'; csvBtn.textContent='📂 Importer Excel';
    csvBtn.onclick=()=>{ if(!window.XLSX){alert('SheetJS non chargé.');return;} const i=document.createElement('input');i.type='file';i.accept='.xlsx,.xls';
      i.onchange=()=>{const f=i.files[0];if(!f)return;const r=new FileReader();r.onload=e=>{try{const wb=XLSX.read(e.target.result,{type:'array'});parseRoutesExcel(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:''}));}catch(err){alert('Erreur: '+err.message);}};r.readAsArrayBuffer(f);};i.click();};
    bar.appendChild(csvBtn);
    // Golden = champ texte
    const goldenInp = document.createElement('textarea');
    goldenInp.placeholder='Coller texte Golden ici...'; goldenInp.style.cssText='width:200px;height:28px;font-size:11px;resize:vertical;border-radius:4px;border:1px solid var(--border);background:var(--bg-primary);color:var(--text-primary);padding:4px;font-family:var(--font-family);';
    goldenInp.value='';
    const goldenBtn = document.createElement('button'); goldenBtn.className='h-btn'; goldenBtn.textContent='⭐ Appliquer Golden';
    goldenBtn.onclick=()=>{ parseGolden(goldenInp.value); goldenInp.value=''; };
    bar.appendChild(goldenInp); bar.appendChild(goldenBtn);
    const delBtn = document.createElement('button'); delBtn.className='h-btn'; delBtn.textContent='🗑'; delBtn.style.cssText='color:#f87171;border-color:#f87171;';
    delBtn.onclick=()=>{ showConfirmModal('Supprimer ce jour ?', () => { const key=actKey(); localStorage.removeItem(key); if(typeof dbDelete==='function'){const dateStr=(activiteDate||new Date()).toISOString().slice(0,10);dbDelete('activite',key,{station_id:actSid(),date_jour:dateStr});} activiteRoutes=[];activiteBU=[];activiteAST=[];activiteGolden={}; renderActivite(); }); };
    bar.appendChild(delBtn);
  }
  const prev=document.createElement('button');prev.className='h-btn h-nav';prev.textContent='◀';
  const next=document.createElement('button');next.className='h-btn h-nav';next.textContent='▶';
  if (activiteTab === 'productivite') {
    prev.onclick=()=>{activiteDate.setMonth(activiteDate.getMonth()-1);loadActivite();renderActivite();};
    next.onclick=()=>{activiteDate.setMonth(activiteDate.getMonth()+1);loadActivite();renderActivite();};
  } else {
    prev.onclick=()=>{activiteDate.setDate(activiteDate.getDate()-1);loadActivite();renderActivite();};
    next.onclick=()=>{activiteDate.setDate(activiteDate.getDate()+1);loadActivite();renderActivite();};
  }
  const label=document.createElement('span');label.style.cssText='font-size:13px;font-weight:600;color:var(--text-primary);min-width:180px;text-align:center;';
  if (activiteTab === 'productivite') {
    label.textContent=activiteDate.toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
  } else {
    label.textContent=activiteDate.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  }
  [prev,label,next].forEach(el=>bar.appendChild(el));
  if (activiteTab === 'routes') {
    const today=document.createElement('button');today.className='h-btn';today.textContent="Aujourd'hui";today.onclick=()=>{activiteDate=new Date();loadActivite();renderActivite();};
    bar.appendChild(today);
  }
  return bar;
}

/* ── Parse Excel Routes ───────────────────────────────────── */
function getRepertoireMap() {
  const map={}; try { const raw=localStorage.getItem(actSid()+'-repertoire'); if(!raw)return map;
  JSON.parse(raw).forEach(c=>{const id=String(c.id_amazon||'').replace(/\s/g,'').toUpperCase();if(id)map[id]={prenom:c.prenom||'',nom:c.nom||''};}); } catch(_){} return map;
}
function parseRoutesExcel(rows) {
  const startIdx=rows.length>0&&!String(rows[0][0]).startsWith('CA_')?1:0;
  const repMap=getRepertoireMap();
  const raw=rows.slice(startIdx).map(cols=>{
    const route=String(cols[0]||'').replace(/^CA_/,'').trim(); if(!route)return null;
    const idRaw=String(cols[2]||'').replace(/\s/g,'').toUpperCase(); const arrets=parseInt(cols[7])||0;
    return{route,idRaw,arrets};
  }).filter(Boolean);

  // Détecter les routes avec IDs multiples (séparés par |)
  const conflicts=[];
  const resolved=[];
  raw.forEach(r=>{
    const ids=r.idRaw.split('|').filter(Boolean);
    if(ids.length>1){
      const options=ids.map(id=>{
        const found=repMap[id];
        return{id,label:found?(found.prenom+' '+found.nom).trim():id};
      });
      conflicts.push({route:r.route,arrets:r.arrets,options});
    } else {
      const id=ids[0]||'';
      let prenom,nom;
      if(id&&repMap[id]){prenom=repMap[id].prenom;nom=repMap[id].nom;}
      else{prenom=id||String(r.idRaw||'');nom='';}
      resolved.push({route:r.route,prenom,nom,arrets:r.arrets});
    }
  });

  if(conflicts.length){
    showIdConflictModal(conflicts,repMap,resolved);
  } else {
    finalizeRoutes(resolved);
  }
}

function showIdConflictModal(conflicts,repMap,resolved){
  // Supprimer un éventuel modal existant
  const old=document.getElementById('act-conflict-overlay');
  if(old)old.remove();

  const overlay=document.createElement('div');
  overlay.id='act-conflict-overlay';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;';

  const modal=document.createElement('div');
  modal.style.cssText='background:var(--bg-card,var(--bg-sidebar));border-radius:10px;padding:20px;max-width:500px;width:90%;max-height:80vh;overflow:auto;box-shadow:0 8px 32px rgba(0,0,0,0.4);';

  let html='<h3 style="margin:0 0 12px;">👥 Plusieurs chauffeurs détectés</h3>';
  html+='<p style="font-size:12px;color:var(--text-muted);margin:0 0 14px;">Certaines routes ont 2 IDs. Choisissez le chauffeur pour chaque route.</p>';

  conflicts.forEach((c,i)=>{
    html+=`<div style="padding:8px 0;border-bottom:1px solid var(--border);">`;
    html+=`<div style="font-weight:700;font-size:13px;margin-bottom:6px;">Route ${c.route}</div>`;
    html+=`<div style="display:flex;gap:8px;flex-wrap:wrap;">`;
    c.options.forEach((opt,j)=>{
      html+=`<button class="h-btn act-conflict-btn" data-conflict="${i}" data-option="${j}" style="font-size:12px;padding:6px 12px;">${opt.label}</button>`;
    });
    html+=`</div></div>`;
  });

  html+=`<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end;">
    <button class="h-btn" id="act-conflict-ok" style="background:var(--accent);color:#fff;border-color:var(--accent);opacity:0.4;" disabled>Valider</button>
  </div>`;

  modal.innerHTML=html;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Track selections
  const selections=new Array(conflicts.length).fill(-1);

  modal.querySelectorAll('.act-conflict-btn').forEach(btn=>{
    btn.onclick=()=>{
      const ci=parseInt(btn.dataset.conflict);
      const oi=parseInt(btn.dataset.option);
      selections[ci]=oi;
      // Highlight selected
      modal.querySelectorAll(`.act-conflict-btn[data-conflict="${ci}"]`).forEach(b=>{
        b.style.background=b.dataset.option==oi?'var(--accent)':'';
        b.style.color=b.dataset.option==oi?'#fff':'';
        b.style.borderColor=b.dataset.option==oi?'var(--accent)':'';
      });
      // Enable validate if all selected
      const okBtn=document.getElementById('act-conflict-ok');
      if(selections.every(s=>s>=0)){okBtn.disabled=false;okBtn.style.opacity='1';}
    };
  });

  document.getElementById('act-conflict-ok').onclick=()=>{
    conflicts.forEach((c,i)=>{
      const chosen=c.options[selections[i]];
      const id=chosen.id;
      let prenom,nom;
      if(repMap[id]){prenom=repMap[id].prenom;nom=repMap[id].nom;}
      else{prenom=id;nom='';}
      resolved.push({route:c.route,prenom,nom,arrets:c.arrets});
    });
    overlay.remove();
    finalizeRoutes(resolved);
  };
}

function finalizeRoutes(resolved){
  const prenomCount={};
  resolved.forEach(r=>{prenomCount[r.prenom]=(prenomCount[r.prenom]||0)+1;});
  activiteRoutes=resolved.map(r=>({route:r.route,chauffeur:prenomCount[r.prenom]>1?r.prenom+' '+(r.nom[0]||'')+'.':r.prenom,arrets:r.arrets,colis:'',golden:activiteGolden[r.route]||0}));
  activiteRoutes.sort((a,b)=>a.route.localeCompare(b.route,undefined,{numeric:true}));
  saveActivite();renderActivite();
}
function parseGolden(text) {
  activiteGolden={};
  text.split(/\r?\n/).forEach(line=>{const m=line.match(/CA_([A-Z0-9]+)/i);if(!m)return;activiteGolden[m[1]]=(activiteGolden[m[1]]||0)+1;});
  activiteRoutes.forEach(r=>{r.golden=activiteGolden[r.route]||0;});
  saveActivite();renderActivite();
}

/* ── Tableau des routes ───────────────────────────────────── */
function buildActTable() {
  const wrap=document.createElement('div');wrap.style.cssText='display:inline-block;min-width:0;';
  const table=document.createElement('table');table.style.cssText='border-collapse:collapse;font-size:12px;font-weight:600;width:auto;';
  const thead=document.createElement('thead');
  thead.innerHTML=`<tr style="background:#222;color:#fff;"><th style="${thS()}">CHAUFFEUR</th><th style="${thS()}">ROUTE</th><th style="${thS()}">ARRÊTS/H</th><th style="${thS()}">ARRÊTS</th><th style="${thS()}">COLIS</th><th style="${thS()}">GOLDEN</th></tr>`;
  table.appendChild(thead);
  const tbody=document.createElement('tbody');
  if(!activiteRoutes.length){const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=6;td.style.cssText='padding:20px;text-align:center;color:#888;background:#fff;';td.textContent='Aucune donnée.';tr.appendChild(td);tbody.appendChild(tr);}
  activiteRoutes.forEach((r,idx)=>{
    const tr=document.createElement('tr');const arH=Math.round(r.arrets/7.25);const isRed=r.arrets>120;
    const rowBg=isRed?'#f4a0a0':(idx%2===0?'#ffffff':'#f0f0f0');const rowColor=isRed?'#8b0000':'#111';
    const tdN=document.createElement('td');tdN.style.cssText=tdS(rowBg,rowColor)+'min-width:75px;';
    const nI=document.createElement('input');nI.value=r.chauffeur;nI.style.cssText='border:none;background:transparent;font-weight:700;font-size:11px;color:'+rowColor+';width:72px;outline:none;text-align:center;';nI.onchange=()=>{r.chauffeur=nI.value;saveActivite();};tdN.appendChild(nI);
    const tdR=document.createElement('td');tdR.style.cssText=tdS(rowBg,rowColor);tdR.textContent=r.route;
    const tdAH=document.createElement('td');tdAH.style.cssText=tdS(isRed?'#f4a0a0':'#c8e6c9',isRed?'#8b0000':'#1b5e20');tdAH.textContent=arH;
    const tdA=document.createElement('td');tdA.style.cssText=tdS(rowBg,rowColor);tdA.textContent=r.arrets;
    const tdC=document.createElement('td');tdC.style.cssText=tdS(rowBg,rowColor)+'min-width:60px;';
    const cI=document.createElement('input');cI.value=r.colis;cI.style.cssText='border:none;background:transparent;font-weight:700;font-size:11px;color:'+rowColor+';width:44px;outline:none;text-align:center;';
    cI.onchange=()=>{r.colis=cI.value;saveActivite();};cI.dataset.colis='true';
    cI.onkeydown=e=>{if(e.key!=='Enter')return;e.preventDefault();r.colis=cI.value;saveActivite();const all=document.querySelectorAll('#module-activite input[data-colis]');const i2=Array.from(all).indexOf(cI);if(i2>=0&&all[i2+1])all[i2+1].focus();};
    tdC.appendChild(cI);
    const tdG=document.createElement('td');const gBg=r.golden>0?'#ffe000':rowBg;const gC=r.golden>0?'#7a5c00':rowColor;tdG.style.cssText=tdS(gBg,gC);tdG.textContent=r.golden>0?r.golden:'';
    [tdN,tdR,tdAH,tdA,tdC,tdG].forEach(td=>tr.appendChild(td));tbody.appendChild(tr);
  });
  activiteBU.forEach((item,idx)=>tbody.appendChild(buildSpecialRow(item.nom,'BU','#5b9bd5','#fff',idx,activiteBU)));
  activiteAST.forEach((item,idx)=>tbody.appendChild(buildSpecialRow(item.nom,'AST','#ffe000','#7a5c00',idx,activiteAST)));
  table.appendChild(tbody);wrap.appendChild(table);return wrap;
}
function buildSpecialRow(nom,label,bg,color,idx,list){
  const tr=document.createElement('tr');
  const tdN=document.createElement('td');tdN.style.cssText=tdS(bg,color)+'min-width:75px;';const nI=document.createElement('input');nI.value=nom;nI.style.cssText='border:none;background:transparent;font-weight:700;font-size:11px;color:'+color+';width:72px;outline:none;text-align:center;';nI.onchange=()=>{list[idx].nom=nI.value;saveActivite();};tdN.appendChild(nI);
  const tdL=document.createElement('td');tdL.colSpan=4;tdL.style.cssText=tdS(bg,color)+'text-align:center;font-weight:700;font-size:13px;';tdL.textContent=label;
  const tdD=document.createElement('td');tdD.style.cssText=tdS(bg,color)+'text-align:center;';const d=document.createElement('button');d.textContent='×';d.style.cssText='background:none;border:none;color:'+color+';cursor:pointer;font-size:16px;font-weight:700;';d.onclick=()=>{list.splice(idx,1);saveActivite();renderActivite();};tdD.appendChild(d);
  [tdN,tdL,tdD].forEach(td=>tr.appendChild(td));return tr;
}
function thS(){return'padding:3px 6px;border:1px solid #555;text-align:center;font-size:11px;white-space:nowrap;';}
function tdS(bg,c){return`padding:1px 5px;border:1px solid #ccc;text-align:center;background:${bg};color:${c};white-space:nowrap;`;}

function buildBUAST(){
  const w=document.createElement('div');w.style.cssText='margin-top:10px;display:flex;gap:12px;flex-wrap:wrap;';
  const add=(label,list,color)=>{const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:6px;';
    const lbl=document.createElement('span');lbl.style.cssText=`font-size:12px;font-weight:700;color:${color};min-width:30px;`;lbl.textContent=label+' :';
    const inp=document.createElement('input');inp.className='h-inp';inp.placeholder='Prénom';inp.style.cssText='width:110px;font-size:12px;';
    const btn=document.createElement('button');btn.className='h-btn';btn.textContent='+';btn.style.cssText='padding:4px 8px;font-size:12px;';
    btn.onclick=()=>{if(!inp.value.trim())return;list.push({nom:inp.value.trim()});inp.value='';saveActivite();renderActivite();};
    inp.onkeydown=e=>{if(e.key==='Enter')btn.click();};
    [lbl,inp,btn].forEach(el=>row.appendChild(el));w.appendChild(row);};
  add('BU',activiteBU,'#5b9bd5');add('AST',activiteAST,'#c8a000');return w;
}

/* ── Info Productivité ────────────────────────────────────── */
function buildProductivite() {
  const wrap=document.createElement('div');wrap.style.cssText='width:100%;max-width:600px;';
  const sid=actSid();const y=activiteDate.getFullYear();const m=activiteDate.getMonth();
  const daysInMonth=new Date(y,m+1,0).getDate();
  // Collecte toutes les données du mois par chauffeur
  const stats={}; // { chauffeur: { totalArrets, totalArH, jours } }
  for(let d=1;d<=daysInMonth;d++){
    const date=new Date(y,m,d);const key=sid+'-activite-'+date.toISOString().slice(0,10);
    try{const raw=localStorage.getItem(key);if(!raw)continue;const data=JSON.parse(raw);
      (data.routes||[]).forEach(r=>{if(!r.chauffeur)return;if(!stats[r.chauffeur])stats[r.chauffeur]={totalArrets:0,totalArH:0,jours:0};
        stats[r.chauffeur].totalArrets+=r.arrets||0;stats[r.chauffeur].totalArH+=Math.round((r.arrets||0)/7.25);stats[r.chauffeur].jours++;});
    }catch(_){}
  }
  const monthName=activiteDate.toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
  let html=`<h3 style="color:var(--text-primary);margin-bottom:12px;">Productivité — ${monthName}</h3>`;
  const entries=Object.entries(stats);
  if(!entries.length){html+='<p style="color:var(--text-muted);">Aucune donnée pour ce mois.</p>';wrap.innerHTML=html;return wrap;}
  html+='<table class="rep-table"><thead><tr><th>Chauffeur</th><th>Moy. Arrêts/H</th><th>Total Arrêts</th></tr></thead><tbody>';
  entries.sort((a,b)=>{const ma=a[1].jours>0?a[1].totalArH/a[1].jours:0;const mb=b[1].jours>0?b[1].totalArH/b[1].jours:0;return mb-ma;}).forEach(([nom,s])=>{
    const moyArH=s.jours>0?Math.round(s.totalArH/s.jours):0;
    html+=`<tr><td>${nom}</td><td>${moyArH}</td><td>${s.totalArrets}</td></tr>`;
  });
  html+='</tbody></table>';wrap.innerHTML=html;return wrap;
}
