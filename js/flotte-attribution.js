/* js/flotte-attribution.js — Attribution camions style spreadsheet (SunXP Pro) */
console.log('flotte-attribution.js chargé');

let attrDate = new Date();
const ATTR_COLS = ['CM','UTA','Tél','St','Chauffeur','PDA','Trs','Lic','Clef','VIGIK','rU','rP','rT','rL','rC','rV','✓','Com'];
const ATTR_W = [34, 44, 44, 40, 130, 44, 44, 44, 44, 70, 28, 28, 28, 28, 28, 28, 28, 160];
const ATTR_PALETTE = ['#f87171','#fb923c','#fbbf24','#4ade80','#60a5fa','#a78bfa','#f472b6','#94a3b8'];

/* ── Persistance ──────────────────────────────────────────── */
function attrKey(sid, d) { return sid + '-attribution-' + d.toISOString().slice(0,10); }
function loadAttr(sid, d) { try { return JSON.parse(localStorage.getItem(attrKey(sid, d))); } catch(_) { return null; } }
function saveAttr(sid, d, data) {
  localStorage.setItem(attrKey(sid, d), JSON.stringify(data));
  if (typeof dbSave === 'function') dbSave('attribution', attrKey(sid, d), { station_id: sid, date_jour: d.toISOString().slice(0,10) }, data);
}

/* ── Rendu principal ──────────────────────────────────────── */
function renderAttribution() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;height:100%;overflow:hidden;';
  const sid = window.getActiveStationId ? window.getActiveStationId() : null;
  if (!sid) { wrap.innerHTML = '<p style="color:var(--text-muted);padding:20px;">Sélectionnez une station.</p>'; return wrap; }

  const camions = loadCamions();
  const chauffeurs = []; try { chauffeurs.push(...JSON.parse(localStorage.getItem(sid+'-repertoire'))||[]); } catch(_){}
  let rows = loadAttr(sid, attrDate);

  // Toolbar
  wrap.appendChild(buildAttrBar(sid, rows));

  // Bloquer si pas de données et veille existe
  if (!rows) {
    const yest = new Date(attrDate); yest.setDate(yest.getDate()-1);
    if (loadAttr(sid, yest)) {
      const msg = document.createElement('div');
      msg.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px;';
      msg.textContent = 'Dupliquez depuis le jour précédent pour créer cette page.';
      wrap.appendChild(msg); return wrap;
    }
    rows = camions.map(c => ({ plaque:c.plaque, modele:(c.marque||'')+' '+(c.modele||''), agence:c.agence||'SNXP', bva:c.bva||false, cm:false, uta:'', tel:'', statut:'OK', chauffeur:'', pda:'', trs:'', lic:'', clef:'', vigik:'', rU:false, rP:false, rT:false, rL:false, rC:false, rV:false, com:'', fusionTitle:'', fusionColor:'' }));
    saveAttr(sid, attrDate, rows);
  }

  // Corps : fixe gauche + scroll droite
  const body = document.createElement('div');
  body.style.cssText = 'display:flex;flex:1;overflow:hidden;';

  // Partie fixe gauche
  const left = document.createElement('div');
  left.style.cssText = 'width:180px;min-width:180px;border-right:2px solid var(--border);overflow-y:auto;flex-shrink:0;';
  const lt = document.createElement('table');
  lt.style.cssText = 'width:100%;border-collapse:collapse;font-size:10px;';
  lt.innerHTML = '<thead><tr><th style="height:26px;padding:4px;text-align:left;border-bottom:1px solid var(--border);background:var(--bg-sidebar);">Plaque</th><th style="padding:4px;text-align:left;border-bottom:1px solid var(--border);background:var(--bg-sidebar);">Modèle</th><th style="padding:4px;text-align:left;border-bottom:1px solid var(--border);background:var(--bg-sidebar);">Agence</th></tr></thead>';
  const ltb = document.createElement('tbody');
  rows.forEach((r,i) => {
    const tr = document.createElement('tr');
    tr.style.cssText = `height:26px;border-bottom:1px solid var(--border);${r.statut==='X'?'background:'+(r.fusionColor||'rgba(248,113,113,0.1)')+';':''}`;
    tr.innerHTML = `<td style="padding:2px 4px;font-weight:700;color:var(--accent);white-space:nowrap;">${r.plaque}</td><td style="padding:2px 4px;font-size:9px;white-space:nowrap;overflow:hidden;max-width:60px;">${r.modele}</td><td style="padding:2px 4px;font-size:9px;">${r.agence}${r.bva?' BVA':''}</td>`;
    ltb.appendChild(tr);
  });
  lt.appendChild(ltb); left.appendChild(lt);

  // Partie scrollable droite
  const right = document.createElement('div');
  right.style.cssText = 'flex:1;overflow:auto;';
  const rt = document.createElement('table');
  rt.style.cssText = 'border-collapse:collapse;font-size:10px;';

  // Header droite
  const rth = document.createElement('thead');
  let hdr = '<tr>';
  ATTR_COLS.forEach((c,i) => { hdr += `<th style="height:26px;min-width:${ATTR_W[i]}px;width:${ATTR_W[i]}px;padding:3px;text-align:center;border:1px solid var(--border);background:var(--bg-sidebar);font-size:9px;font-weight:600;${i>=10&&i<=15?'background:rgba(74,222,128,0.08);':''}">${c}</th>`; });
  hdr += '</tr>';
  rth.innerHTML = hdr;
  rt.appendChild(rth);

  // Body droite
  const rtb = document.createElement('tbody');
  rows.forEach((r,idx) => {
    const tr = document.createElement('tr');
    tr.style.cssText = `height:26px;${r.statut==='X'?'background:'+(r.fusionColor||'rgba(248,113,113,0.1)')+';':''}`;

    if (r.statut === 'X') {
      // Fusionné : CM, UTA, Tél restent, fusion à partir de Chauffeur
      const paletteBtns = ATTR_PALETTE.map(c => `<span class="attr-pal" data-i="${idx}" data-c="${c}" style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${c};cursor:pointer;border:${r.fusionColor===c?'2px solid #fff':'1px solid transparent'};"></span>`).join('');
      tr.innerHTML = `<td style="border:1px solid var(--border);text-align:center;min-width:${ATTR_W[0]}px;"><input type="checkbox" class="attr-cb" data-i="${idx}" data-f="cm" ${r.cm?'checked':''} style="width:14px;height:14px;"></td><td style="border:1px solid var(--border);text-align:center;min-width:${ATTR_W[1]}px;"><input class="attr-inp" data-i="${idx}" data-f="uta" value="${r.uta||''}" style="width:100%;border:none;background:transparent;color:var(--text-primary);font-size:10px;outline:none;text-align:center;"></td><td style="border:1px solid var(--border);text-align:center;min-width:${ATTR_W[2]}px;"><input class="attr-inp" data-i="${idx}" data-f="tel" value="${r.tel||''}" style="width:100%;border:none;background:transparent;color:var(--text-primary);font-size:10px;outline:none;text-align:center;"></td><td style="border:1px solid var(--border);text-align:center;min-width:${ATTR_W[3]}px;"><select class="attr-sel" data-i="${idx}" data-f="statut" style="width:100%;border:none;background:var(--bg-tab-active);color:var(--text-primary);font-size:9px;text-align:center;outline:none;border-radius:3px;padding:2px;"><option value="OK">OK</option><option value="BU">BU</option><option value="X" selected>✕</option></select></td><td colspan="14" style="border:1px solid var(--border);padding:2px 6px;display:flex;align-items:center;gap:6px;"><input class="attr-inp" data-i="${idx}" data-f="fusionTitle" value="${r.fusionTitle||''}" placeholder="Raison..." style="flex:1;border:none;background:transparent;color:${r.fusionColor||'#f87171'};font-size:10px;font-weight:600;outline:none;">${paletteBtns}</td>`;
    } else {
      const cell = (val, f, w, type) => {
        const s = `min-width:${w}px;width:${w}px;border:1px solid var(--border);padding:1px;text-align:center;`;
        if (type === 'check') return `<td style="${s}${f.startsWith('r')?'background:rgba(74,222,128,0.04);':''}"><input type="checkbox" class="attr-cb" data-i="${idx}" data-f="${f}" ${val?'checked':''} style="width:13px;height:13px;"></td>`;
        if (type === 'select-st') return `<td style="${s}"><select class="attr-sel" data-i="${idx}" data-f="statut" style="width:100%;border:none;background:var(--bg-tab-active);color:var(--text-primary);font-size:10px;text-align:center;outline:none;border-radius:3px;padding:2px;"><option value="OK" ${r.statut==='OK'?'selected':''}>OK</option><option value="BU" ${r.statut==='BU'?'selected':''}>BU</option><option value="X">✕</option></select></td>`;
        if (type === 'select-clef') return `<td style="${s}"><select class="attr-sel" data-i="${idx}" data-f="clef" style="width:100%;border:none;background:transparent;color:var(--text-primary);font-size:9px;text-align:center;outline:none;"><option value="">—</option><option value="PERSO" ${val==='PERSO'?'selected':''}>P</option><option value="C21" ${val==='C21'?'selected':''}>C21</option></select></td>`;
        if (type === 'btn') return `<td style="${s}background:rgba(74,222,128,0.04);"><button class="attr-allok" data-i="${idx}" style="font-size:8px;background:none;border:none;color:var(--accent);cursor:pointer;font-weight:700;">✓</button></td>`;
        if (f === 'chauffeur') return `<td style="${s}"><input class="attr-inp attr-ch" data-i="${idx}" data-f="${f}" value="${val||''}" style="width:100%;border:none;background:transparent;color:var(--text-primary);font-size:9px;outline:none;text-align:left;padding:0 3px;" placeholder="—"></td>`;
        return `<td style="${s}"><input class="attr-inp" data-i="${idx}" data-f="${f}" value="${val||''}" style="width:100%;border:none;background:transparent;color:var(--text-primary);font-size:9px;outline:none;text-align:center;" placeholder=""></td>`;
      };
      tr.innerHTML = cell(r.cm,'cm',ATTR_W[0],'check') + cell(r.uta,'uta',ATTR_W[1]) + cell(r.tel,'tel',ATTR_W[2]) + cell(null,'statut',ATTR_W[3],'select-st') + cell(r.chauffeur,'chauffeur',ATTR_W[4]) + cell(r.pda,'pda',ATTR_W[5]) + cell(r.trs,'trs',ATTR_W[6]) + cell(r.lic,'lic',ATTR_W[7]) + cell(r.clef,'clef',ATTR_W[8],'select-clef') + cell(r.vigik,'vigik',ATTR_W[9]) + cell(r.rU,'rU',ATTR_W[10],'check') + cell(r.rP,'rP',ATTR_W[11],'check') + cell(r.rT,'rT',ATTR_W[12],'check') + cell(r.rL,'rL',ATTR_W[13],'check') + cell(r.rC,'rC',ATTR_W[14],'check') + cell(r.rV,'rV',ATTR_W[15],'check') + cell(null,null,ATTR_W[16],'btn') + cell(r.com,'com',ATTR_W[17]);
    }
    rtb.appendChild(tr);
  });
  rt.appendChild(rtb); right.appendChild(rt);

  body.appendChild(left); body.appendChild(right);
  wrap.appendChild(body);

  // Sync scroll vertical
  left.addEventListener('scroll', () => { right.scrollTop = left.scrollTop; });
  right.addEventListener('scroll', () => { left.scrollTop = right.scrollTop; });

  // Bind events
  setTimeout(() => bindAttr(right, rows, sid, chauffeurs), 0);
  return wrap;
}

/* ── Toolbar ──────────────────────────────────────────────── */
function buildAttrBar(sid, rows) {
  const bar = document.createElement('div');
  bar.className = 'h-toolbar';
  const dl = attrDate.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  bar.innerHTML = `<div class="h-toolbar-left"></div><div class="h-toolbar-center"><button class="h-btn h-nav" id="ab-prev">◀</button><span class="h-date-label">${dl}</span><button class="h-btn h-nav" id="ab-next">▶</button><button class="h-btn" id="ab-today">Aujourd'hui</button><button class="h-btn" id="ab-dup" style="background:rgba(96,165,250,0.15);border-color:#60a5fa;color:#60a5fa;font-weight:700;">📋 Dupliquer → J+1</button><button class="h-btn" id="ab-del" style="color:#f87171;border-color:#f87171;">🗑</button></div><div class="h-toolbar-right"></div>`;
  bar.querySelector('#ab-prev').onclick = () => { attrDate.setDate(attrDate.getDate()-1); renderFlotte(); };
  bar.querySelector('#ab-next').onclick = () => { const n=new Date(attrDate);n.setDate(n.getDate()+1); if(loadAttr(sid,n)){attrDate=n;renderFlotte();} };
  bar.querySelector('#ab-today').onclick = () => { attrDate=new Date(); renderFlotte(); };
  bar.querySelector('#ab-dup').onclick = () => { if(!rows)return; const n=new Date(attrDate);n.setDate(n.getDate()+1); saveAttr(sid,n,JSON.parse(JSON.stringify(rows))); attrDate=n; renderFlotte(); };
  bar.querySelector('#ab-del').onclick = () => { showConfirmModal('Supprimer cette attribution ?',()=>{localStorage.removeItem(attrKey(sid,attrDate));renderFlotte();}); };
  return bar;
}

/* ── Bind events ──────────────────────────────────────────── */
function bindAttr(container, rows, sid, chauffeurs) {
  container.querySelectorAll('.attr-inp:not(.attr-ch)').forEach(el => {
    el.addEventListener('change', () => { rows[+el.dataset.i][el.dataset.f]=el.value; saveAttr(sid,attrDate,rows); });
  });
  container.querySelectorAll('.attr-sel').forEach(el => {
    el.addEventListener('change', () => { rows[+el.dataset.i][el.dataset.f]=el.value; saveAttr(sid,attrDate,rows); if(el.dataset.f==='statut')renderFlotte(); });
  });
  container.querySelectorAll('.attr-cb').forEach(el => {
    el.addEventListener('change', () => { rows[+el.dataset.i][el.dataset.f]=el.checked; saveAttr(sid,attrDate,rows); });
  });
  container.querySelectorAll('.attr-pal').forEach(el => {
    el.onclick = () => { rows[+el.dataset.i].fusionColor=el.dataset.c; saveAttr(sid,attrDate,rows); renderFlotte(); };
  });
  container.querySelectorAll('.attr-allok').forEach(btn => {
    btn.onclick = () => { const r=rows[+btn.dataset.i]; r.rU=r.rP=r.rT=r.rL=r.rC=r.rV=true; saveAttr(sid,attrDate,rows); renderFlotte(); };
  });
  // Autocomplete chauffeur
  container.querySelectorAll('.attr-ch').forEach(inp => {
    const drop = document.createElement('div');
    drop.style.cssText = 'position:fixed;z-index:9999;background:var(--bg-sidebar);border:1px solid var(--accent);border-radius:4px;max-height:140px;overflow-y:auto;display:none;box-shadow:0 4px 12px rgba(0,0,0,0.4);';
    document.body.appendChild(drop);
    const show = q => {
      const names = chauffeurs.map(c=>(c.prenom+' '+c.nom).trim()).filter(n=>n.toLowerCase().includes(q.toLowerCase()));
      drop.innerHTML=''; if(!names.length||!q){drop.style.display='none';return;}
      names.slice(0,6).forEach(n=>{const d=document.createElement('div');d.textContent=n;d.style.cssText='padding:4px 8px;cursor:pointer;font-size:10px;color:var(--text-primary);';d.onmouseenter=()=>d.style.background='var(--bg-tab-hover)';d.onmouseleave=()=>d.style.background='';d.onmousedown=e=>{e.preventDefault();inp.value=n;rows[+inp.dataset.i].chauffeur=n;saveAttr(sid,attrDate,rows);drop.style.display='none';};drop.appendChild(d);});
      const rect=inp.getBoundingClientRect();drop.style.top=(rect.bottom+2)+'px';drop.style.left=rect.left+'px';drop.style.minWidth=rect.width+'px';drop.style.display='block';
    };
    inp.addEventListener('input',()=>show(inp.value));
    inp.addEventListener('focus',()=>{if(inp.value)show(inp.value);});
    inp.addEventListener('blur',()=>setTimeout(()=>{drop.style.display='none';},150));
    inp.addEventListener('change',()=>{rows[+inp.dataset.i].chauffeur=inp.value;saveAttr(sid,attrDate,rows);});
    const obs=new MutationObserver(()=>{if(!document.body.contains(inp)){drop.remove();obs.disconnect();}});
    obs.observe(document.body,{childList:true,subtree:true});
  });
}
