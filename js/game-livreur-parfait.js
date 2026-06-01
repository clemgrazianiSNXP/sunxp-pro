/* js/game-livreur-parfait.js - Mini-jeu Livreur Parfait 🎯 (SunXP Pro) */

function startGameLivreurParfait() {
  const portal = document.getElementById('chauffeur-portal');
  if (!portal) return;

  let totalScore = 0, stageScores = [0,0,0,0,0], currentStage = 0;
  let stageTimer = null, stageTimeLeft = 30;
  let finishedEarly = [false,false,false,false,false];
  const STAGES = ['Memoire','Chargement','Scan Express','Bonne Boite','GPS Casse'];
  const STAGE_ICONS = ['🧠','🏗️','⚡','🚪','🗺️'];

  function getRank(s) {
    if (s >= 8001) return '👑 Livreur Parfait';
    if (s >= 6001) return '⭐ Expert Livraison';
    if (s >= 4001) return '🚛 Chauffeur Confirme';
    if (s >= 2001) return '🚗 Livreur';
    return '📦 Stagiaire';
  }

  function showIntro() {
    portal.innerHTML = '';
    portal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0a0a1a;display:flex;flex-direction:column;overflow:hidden;';
    portal.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;color:#fff;text-align:center;">'
      + '<div style="font-size:48px;margin-bottom:8px;animation:lp-pulse 1.5s infinite;">🎯</div>'
      + '<h1 style="font-size:22px;margin:0 0 6px;background:linear-gradient(90deg,#f97316,#fbbf24);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">LIVREUR PARFAIT</h1>'
      + '<p style="font-size:12px;color:#9ca3af;margin:0 0 16px;">Le defi ultime — 5 etapes enchainees</p>'
      + '<div style="text-align:left;font-size:11px;color:#d1d5db;max-width:280px;margin-bottom:20px;">'
      + '<div style="padding:4px 0;">1. 🧠 Memoire — retenir l\'ordre</div>'
      + '<div style="padding:4px 0;">2. 🏗️ Chargement — remplir le camion</div>'
      + '<div style="padding:4px 0;">3. ⚡ Scan Express — scanner vite</div>'
      + '<div style="padding:4px 0;">4. 🚪 Bonne Boite — trouver la boite</div>'
      + '<div style="padding:4px 0;">5. 🗺️ GPS Casse — suivre le chemin</div>'
      + '</div>'
      + '<button onclick="runStage(0)" style="padding:14px 32px;background:linear-gradient(135deg,#f97316,#ef4444);color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:900;cursor:pointer;">▶ COMMENCER</button>'
      + '<button onclick="initGamesPage()" style="margin-top:12px;padding:8px 16px;background:transparent;color:#6b7280;border:1px solid #374151;border-radius:6px;font-size:11px;cursor:pointer;">← Retour</button>'
      + '</div><style>@keyframes lp-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}</style>';
  }

  window.runStage = function(idx) {
    currentStage = idx;
    if (idx >= 5) { endGame(); return; }
    showTransition(idx);
  };

  function showTransition(idx) {
    portal.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#fff;text-align:center;background:#0a0a1a;">'
      + '<div style="font-size:40px;margin-bottom:8px;">' + STAGE_ICONS[idx] + '</div>'
      + '<div style="font-size:16px;font-weight:700;">ETAPE ' + (idx+1) + '/5</div>'
      + '<div style="font-size:13px;color:#9ca3af;margin-top:4px;">' + STAGES[idx] + '</div>'
      + '<div style="font-size:11px;color:#fbbf24;margin-top:8px;">30 secondes max</div>'
      + '<div style="display:flex;gap:4px;margin-top:16px;">' + [0,1,2,3,4].map(function(i){return '<div style="width:30px;height:4px;border-radius:2px;background:' + (i < idx ? '#4ade80' : i === idx ? '#f97316' : '#374151') + ';"></div>';}).join('') + '</div>'
      + '</div>';
    setTimeout(function(){ if (window._gameActive) startStage(idx); }, 2000);
  }

  function startStageTimer(onEnd) {
    stageTimeLeft = 30;
    if (stageTimer) clearInterval(stageTimer);
    stageTimer = setInterval(function(){
      if (!window._gameActive) { clearInterval(stageTimer); stageTimer = null; return; }
      stageTimeLeft--;
      var el = document.getElementById('lp-timer');
      if (el) { el.textContent = stageTimeLeft + 's'; el.style.color = stageTimeLeft <= 10 ? '#ef4444' : '#fff'; }
      var bar = document.getElementById('lp-timer-bar');
      if (bar) bar.style.width = (stageTimeLeft / 30 * 100) + '%';
      if (stageTimeLeft <= 0) { clearInterval(stageTimer); stageTimer = null; onEnd(); }
    }, 1000);
  }

  function stageHeader(idx) {
    return '<div style="padding:6px 12px;background:#1e1e2e;border-bottom:1px solid #333;display:flex;align-items:center;gap:6px;flex-shrink:0;">'
      + '<span style="font-size:11px;font-weight:700;">' + STAGE_ICONS[idx] + ' Etape ' + (idx+1) + '/5</span>'
      + '<span id="lp-timer" style="margin-left:auto;font-family:monospace;font-size:13px;font-weight:700;">30s</span>'
      + '<span style="font-family:monospace;color:#7c6af7;font-size:12px;">' + totalScore + 'pts</span>'
      + '</div><div style="height:3px;background:#333;flex-shrink:0;"><div id="lp-timer-bar" style="height:100%;width:100%;background:#f97316;transition:width 1s linear;"></div></div>';
  }

  function completeStage(pts) {
    if (stageTimer) { clearInterval(stageTimer); stageTimer = null; }
    if (!window._gameActive) return;
    if (stageTimeLeft > 0) finishedEarly[currentStage] = true;
    stageScores[currentStage] = pts;
    totalScore += pts;
    setTimeout(function(){ if (window._gameActive) runStage(currentStage + 1); }, 300);
  }

  function startStage(idx) {
    if (idx === 0) stage1Memo();
    else if (idx === 1) stage2Chargement();
    else if (idx === 2) stage3Scan();
    else if (idx === 3) stage4Boite();
    else if (idx === 4) stage5GPS();
  }

  // === STAGE 1: MEMOIRE ===
  function stage1Memo() {
    var addrs = [];
    var used = new Set();
    for (var i = 0; i < 10; i++) {
      var x, y, k;
      do { x = 10+Math.floor(Math.random()*80); y = 10+Math.floor(Math.random()*70); k = Math.floor(x/10)+','+Math.floor(y/10); } while(used.has(k));
      used.add(k);
      addrs.push({id:i, order:i+1, x:x, y:y});
    }
    var html = addrs.map(function(a){return '<div style="position:absolute;left:'+a.x+'%;top:'+a.y+'%;transform:translate(-50%,-50%);"><div style="width:30px;height:30px;background:#fbbf24;border-radius:6px;border:2px solid #92400e;display:flex;align-items:center;justify-content:center;font-size:10px;">🏠</div><div style="position:absolute;top:-8px;right:-8px;width:16px;height:16px;background:#ef4444;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:900;">'+a.order+'</div></div>';}).join('');
    portal.innerHTML = '<div style="display:flex;flex-direction:column;height:100%;background:#0a0a1a;color:#fff;">' + stageHeader(0) + '<div style="padding:4px;text-align:center;font-size:11px;color:#fbbf24;">Memorisez l\'ordre! <span id="lp-memo-t">10</span>s</div><div style="flex:1;position:relative;background:#e5e7eb;margin:6px;border-radius:6px;overflow:hidden;">' + html + '</div></div>';
    var mt = 10;
    var mi = setInterval(function(){mt--;var e=document.getElementById('lp-memo-t');if(e)e.textContent=mt;if(mt<=0){clearInterval(mi);stage1Play(addrs);}},1000);
  }

  function stage1Play(addrs) {
    var nextIdx = 0, pts = 0, errors = 0;
    var html = addrs.map(function(a){return '<div class="lp1-addr" data-order="'+a.order+'" style="position:absolute;left:'+a.x+'%;top:'+a.y+'%;transform:translate(-50%,-50%);cursor:pointer;"><div style="width:30px;height:30px;background:#9ca3af;border-radius:6px;border:2px solid #6b7280;display:flex;align-items:center;justify-content:center;font-size:10px;">🏠</div><div class="lp1-badge" style="position:absolute;top:-8px;right:-8px;width:16px;height:16px;background:#374151;color:#6b7280;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:900;">?</div></div>';}).join('');
    portal.innerHTML = '<div style="display:flex;flex-direction:column;height:100%;background:#0a0a1a;color:#fff;">' + stageHeader(0) + '<div style="padding:4px;text-align:center;font-size:11px;color:#4ade80;">Cliquez dans l\'ordre! #<span id="lp1-next">1</span> | Vies: <span id="lp1-lives">❤️❤️❤️</span></div><div style="flex:1;position:relative;background:#e5e7eb;margin:6px;border-radius:6px;overflow:hidden;">' + html + '</div></div>';
    startStageTimer(function(){ completeStage(pts); });
    document.querySelectorAll('.lp1-addr').forEach(function(el){
      el.onclick = function(){
        var o = parseInt(el.dataset.order);
        if (o === nextIdx+1) {
          pts += 200; nextIdx++;
          el.querySelector('div').style.background='#4ade80';
          el.querySelector('.lp1-badge').textContent=o;
          el.querySelector('.lp1-badge').style.background='#4ade80';
          el.querySelector('.lp1-badge').style.color='#fff';
          el.style.cursor='default'; el.onclick=null;
          var ne=document.getElementById('lp1-next'); if(ne)ne.textContent=nextIdx+1;
          if(nextIdx>=10)completeStage(pts);
        } else {
          errors++;
          el.querySelector('div').style.background='#ef4444';
          setTimeout(function(){el.querySelector('div').style.background='#9ca3af';},400);
          var livesEl=document.getElementById('lp1-lives');
          if(livesEl) livesEl.textContent='❤️'.repeat(Math.max(0,3-errors))+'🖤'.repeat(Math.min(3,errors));
          if(errors>=3) completeStage(pts);
        }
      };
    });
  }

  // === STAGE 2: CHARGEMENT ===
  function stage2Chargement() {
    var cols=8, rows=5, grid=[];
    for(var r=0;r<rows;r++){grid[r]=[];for(var c=0;c<cols;c++)grid[r][c]=0;}
    var shapes=[[1,1],[2,1],[1,2],[2,2],[3,1],[1,3]];
    var curPiece = shapes[Math.floor(Math.random()*shapes.length)];
    var placed = 0;
    function canPlace(p,sr,sc){if(sr+p[1]>rows||sc+p[0]>cols||sr<0||sc<0)return false;for(var r=0;r<p[1];r++)for(var c=0;c<p[0];c++)if(grid[sr+r][sc+c]!==0)return false;return true;}
    function doPlace(p,sr,sc){placed++;for(var r=0;r<p[1];r++)for(var c=0;c<p[0];c++)grid[sr+r][sc+c]=placed;}
    function canFit(p){for(var r=0;r<=rows-p[1];r++)for(var c=0;c<=cols-p[0];c++)if(canPlace(p,r,c))return true;return false;}
    function getPct(){var u=0;for(var r=0;r<rows;r++)for(var c=0;c<cols;c++)if(grid[r][c]!==0)u++;return Math.round(u/(rows*cols)*100);}
    function render2(){
      var cs=Math.min(32,Math.floor((portal.clientWidth-60)/cols));
      var gh='';for(var r=0;r<rows;r++)for(var c=0;c<cols;c++){var f=grid[r][c]!==0;gh+='<div class="lp2-cell" data-r="'+r+'" data-c="'+c+'" style="width:'+cs+'px;height:'+cs+'px;background:'+(f?'#92400e':'rgba(255,255,255,0.05)')+';border:1px solid rgba(255,255,255,0.1);border-radius:2px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:8px;">'+(f?'📦':'')+'</div>';}
      // Build piece preview
      var piecePreview='';for(var pr=0;pr<curPiece[1];pr++)for(var pc=0;pc<curPiece[0];pc++)piecePreview+='<div style="width:14px;height:14px;background:#f59e0b;border:1px solid rgba(255,255,255,0.3);border-radius:2px;"></div>';
      portal.innerHTML='<div style="display:flex;flex-direction:column;height:100%;background:#0a0a1a;color:#fff;">'+stageHeader(1)+'<div style="padding:6px;display:flex;align-items:center;justify-content:center;gap:12px;"><span style="font-size:10px;color:#9ca3af;">Colis:</span><div style="display:grid;grid-template-columns:repeat('+curPiece[0]+',14px);gap:1px;">'+piecePreview+'</div><span style="font-size:11px;color:#fbbf24;font-weight:700;">'+curPiece[0]+'x'+curPiece[1]+'</span><span style="font-size:11px;color:#4ade80;margin-left:8px;">'+getPct()+'%</span></div><div style="flex:1;display:flex;align-items:center;justify-content:center;"><div style="display:grid;grid-template-columns:repeat('+cols+','+cs+'px);gap:1px;background:#374151;padding:6px;border-radius:6px;">'+gh+'</div></div></div>';
      document.querySelectorAll('.lp2-cell').forEach(function(cell){
        cell.onclick=function(){
          var r=parseInt(cell.dataset.r),c=parseInt(cell.dataset.c);
          if(canPlace(curPiece,r,c)){doPlace(curPiece,r,c);curPiece=shapes[Math.floor(Math.random()*shapes.length)];if(!canFit(curPiece)){completeStage(getPct()*10);return;}render2();}
        };
      });
    }
    render2();
    startStageTimer(function(){ completeStage(getPct()*10); });
  }

  // === STAGE 3: SCAN EXPRESS ===
  function stage3Scan() {
    var pts=0, q=0, maxQ=10;
    function genCode(){var c='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',r='';for(var i=0;i<6;i++)r+=c[Math.floor(Math.random()*c.length)];return r;}
    function genSimilar(code){var a=code.split('');var i=Math.floor(Math.random()*a.length);var c='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';a[i]=c[Math.floor(Math.random()*c.length)];var r=a.join('');return r===code?genSimilar(code):r;}
    function nextQ(){
      q++;if(q>maxQ){completeStage(pts);return;}
      var correct=genCode();
      var opts=[correct];while(opts.length<4){var w=genSimilar(correct);if(!opts.includes(w))opts.push(w);}
      for(var i=opts.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=opts[i];opts[i]=opts[j];opts[j]=t;}
      portal.innerHTML='<div style="display:flex;flex-direction:column;height:100%;background:#0a0a1a;color:#fff;">'+stageHeader(2)+'<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:16px;"><div style="font-size:10px;color:#9ca3af;">Colis '+q+'/'+maxQ+'</div><div style="font-size:20px;font-weight:900;font-family:monospace;background:#1e1e2e;padding:12px 20px;border-radius:8px;border:1px solid #444;">'+correct+'</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;width:100%;max-width:280px;">'+opts.map(function(o){return '<button class="lp3-opt" data-code="'+o+'" style="padding:12px;background:#1e1e2e;border:2px solid #444;border-radius:8px;color:#fff;font-family:monospace;font-size:12px;font-weight:700;cursor:pointer;">'+o+'</button>';}).join('')+'</div></div></div>';
      document.querySelectorAll('.lp3-opt').forEach(function(btn){
        btn.onclick=function(){if(btn.dataset.code===correct){pts+=150;btn.style.background='#4ade80';}else{btn.style.background='#ef4444';}setTimeout(nextQ,400);};
      });
    }
    startStageTimer(function(){ completeStage(pts); });
    nextQ();
  }

  // === STAGE 4: BONNE BOITE ===
  function stage4Boite() {
    var pts=0, q=0, maxQ=10;
    function genLabels(){
      var all=[];var d=[1,2,3,4];for(var a of d)for(var b of d)all.push(''+a+b);
      for(var i=all.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=all[i];all[i]=all[j];all[j]=t;}
      return all.slice(0,8);
    }
    function nextQ(){
      q++;if(q>maxQ){completeStage(pts);return;}
      var labels=genLabels();
      var correct=labels[Math.floor(Math.random()*labels.length)];
      portal.innerHTML='<div style="display:flex;flex-direction:column;height:100%;background:#0a0a1a;color:#fff;">'+stageHeader(3)+'<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:16px;"><div style="font-size:10px;color:#9ca3af;">Colis '+q+'/'+maxQ+'</div><div style="font-size:22px;font-weight:900;font-family:monospace;color:#fbbf24;">📦 → '+correct+'</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:100%;max-width:300px;">'+labels.map(function(l){return '<div class="lp4-box" data-label="'+l+'" style="padding:10px 4px;background:#1e1e2e;border:2px solid #444;border-radius:6px;text-align:center;cursor:pointer;font-family:monospace;font-size:13px;font-weight:700;">'+l+'</div>';}).join('')+'</div></div></div>';
      document.querySelectorAll('.lp4-box').forEach(function(box){
        box.onclick=function(){if(box.dataset.label===correct){pts+=150;box.style.background='#4ade80';}else{box.style.background='#ef4444';document.querySelectorAll('.lp4-box').forEach(function(b){if(b.dataset.label===correct)b.style.background='#4ade80';});}setTimeout(nextQ,500);};
      });
    }
    startStageTimer(function(){ completeStage(pts); });
    nextQ();
  }

  // === STAGE 5: GPS ===
  function stage5GPS() {
    var gridSize=8;
    var stage5Done = false;
    var dirs=[{n:'haut',icon:'⬆️',dx:0,dy:-1},{n:'droite',icon:'➡️',dx:1,dy:0},{n:'bas',icon:'⬇️',dx:0,dy:1},{n:'gauche',icon:'⬅️',dx:-1,dy:0}];
    var x=Math.floor(gridSize/2),y=Math.floor(gridSize/2);
    var startX=x,startY=y;
    var instructions=[];
    for(var i=0;i<8;i++){
      var d,nx,ny,att=0;
      do{d=dirs[Math.floor(Math.random()*4)];nx=x+d.dx;ny=y+d.dy;att++;}while((nx<0||nx>=gridSize||ny<0||ny>=gridSize)&&att<20);
      if(nx>=0&&nx<gridSize&&ny>=0&&ny<gridSize){x=nx;y=ny;}
      instructions.push(d);
    }
    var endX=x,endY=y;
    var idx=0;
    portal.innerHTML='<div style="display:flex;flex-direction:column;height:100%;background:#0a0a1a;color:#fff;">'+stageHeader(4)+'<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px;"><div style="font-size:28px;">📡</div><div style="font-size:11px;color:#9ca3af;">Memorisez les directions...</div><div id="lp5-instr" style="font-size:18px;font-weight:700;padding:12px 20px;background:#1e1e2e;border-radius:10px;border:1px solid #444;min-width:200px;text-align:center;"></div><div id="lp5-prog" style="font-size:11px;color:#6b7280;"></div></div></div>';
    startStageTimer(function(){ if(!stage5Done){stage5Done=true;completeStage(0);} });
    function showI(){
      if(stage5Done || !window._gameActive) return;
      if(idx>=instructions.length){setTimeout(function(){if(!stage5Done && window._gameActive) showGPSGuess(startX,startY,endX,endY,gridSize,function(pts){if(!stage5Done){stage5Done=true;completeStage(pts);}});},500);return;}
      var el=document.getElementById('lp5-instr');
      if(el) el.textContent=instructions[idx].icon+' 1 case vers le '+instructions[idx].n;
      var p=document.getElementById('lp5-prog');if(p)p.textContent=(idx+1)+'/'+instructions.length;
      idx++;setTimeout(showI,1800);
    }
    showI();
  }

  function showGPSGuess(startX,startY,endX,endY,gridSize,onComplete) {
    var cs=Math.min(28,Math.floor((portal.clientWidth-50)/gridSize));
    var gh='';for(var r=0;r<gridSize;r++)for(var c=0;c<gridSize;c++){
      var isS=(c===startX&&r===startY);
      gh+='<div class="lp5-cell" data-r="'+r+'" data-c="'+c+'" style="width:'+cs+'px;height:'+cs+'px;background:'+(isS?'rgba(74,222,128,0.3)':'rgba(255,255,255,0.03)')+';border:1px solid rgba(255,255,255,0.08);border-radius:2px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:9px;">'+(isS?'🏭':'')+'</div>';
    }
    portal.innerHTML='<div style="display:flex;flex-direction:column;height:100%;background:#0a0a1a;color:#fff;">'+stageHeader(4)+'<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:12px;"><div style="font-size:13px;color:#fbbf24;">Cliquez votre case d\'arrivee</div><div style="display:grid;grid-template-columns:repeat('+gridSize+','+cs+'px);gap:1px;background:#1f2937;padding:4px;border-radius:6px;">'+gh+'</div></div></div>';
    document.querySelectorAll('.lp5-cell').forEach(function(cell){
      cell.onclick=function(){
        var gr=parseInt(cell.dataset.r),gc=parseInt(cell.dataset.c);
        var dist=Math.abs(gc-endX)+Math.abs(gr-endY);
        var pts=dist===0?500:dist===1?300:0;
        document.querySelectorAll('.lp5-cell').forEach(function(c2){var r2=parseInt(c2.dataset.r),c2c=parseInt(c2.dataset.c);if(c2c===endX&&r2===endY){c2.style.background='#4ade80';c2.textContent='🎯';}});
        if(gc!==endX||gr!==endY){cell.style.background='#ef4444';cell.textContent='❌';}
        setTimeout(function(){if(onComplete)onComplete(pts);},1000);
      };
    });
  }

  // === END GAME ===
  function endGame() {
    if(stageTimer){clearInterval(stageTimer);stageTimer=null;}
    var bonus=1000;
    var speedBonus=finishedEarly.every(function(v){return v;})?500:0;
    totalScore+=bonus+speedBonus;
    if(typeof saveScore==='function')saveScore('livreur-parfait',totalScore);
    showFinal(speedBonus);
  }

  async function showFinal(speedBonus) {
    var rank=getRank(totalScore);
    var scores=await loadStationScores('livreur-parfait');
    var top5=scores.slice(0,5);
    var isPerfect=totalScore>=8001;
    portal.innerHTML='<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;color:#fff;text-align:center;background:#0a0a1a;">'
      + '<div style="font-size:48px;margin-bottom:8px;'+(isPerfect?'animation:lp-pulse 1s infinite;':'')+'">🎯</div>'
      + '<h2 style="font-size:20px;margin:0 0 4px;">'+rank+'</h2>'
      + '<p style="font-size:30px;font-weight:900;color:#fbbf24;margin:4px 0;">'+totalScore+' pts</p>'
      + '<div style="font-size:11px;color:#9ca3af;margin-bottom:12px;">'+stageScores.map(function(s,i){return STAGE_ICONS[i]+' '+s;}).join(' • ')+'</div>'
      + '<div style="font-size:11px;color:#4ade80;">Bonus completion: +1000'+(speedBonus>0?' | Bonus vitesse: +500':'')+'</div>'
      + '<div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:12px;width:100%;max-width:280px;margin:16px 0;">'
      + '<h3 style="font-size:12px;margin:0 0 8px;color:#f97316;">🏆 Top 5</h3>'
      + (top5.length>0?top5.map(function(s,i){return '<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:11px;border-bottom:1px solid rgba(255,255,255,0.1);"><span>'+(i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.')+' '+(s.chauffeur_nom||'Joueur')+'</span><span style="color:#fbbf24;">'+s.score+'</span></div>';}).join(''):'<p style="font-size:11px;color:#6b7280;">Aucun score</p>')
      + '</div>'
      + '<div style="display:flex;gap:10px;">'
      + '<button onclick="startGameLivreurParfait()" style="padding:10px 20px;background:#f97316;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;">🔄 Rejouer</button>'
      + '<button onclick="initGamesPage()" style="padding:10px 20px;background:#374151;color:#fff;border:1px solid #6b7280;border-radius:8px;font-size:13px;cursor:pointer;">← Jeux</button>'
      + '</div></div><style>@keyframes lp-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}</style>';
  }

  showIntro();
}

window.startGameLivreurParfait = startGameLivreurParfait;
