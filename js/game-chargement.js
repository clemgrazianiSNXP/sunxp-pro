/* js/game-chargement.js — Mini-jeu Chargement Parfait 🏗️ (SunXP Pro) */
console.log('game-chargement.js chargé');

function startGameChargement() {
  const portal = document.getElementById('chauffeur-portal');
  if (!portal) return;

  // Game config by level
  const LEVELS = [
    { cols: 10, rows: 6, time: 60, shapes: [[1,1],[2,1],[1,2],[2,2],[3,1]] },
    { cols: 10, rows: 6, time: 60, shapes: [[1,1],[2,1],[1,2],[2,2],[3,1],[1,3]] },
    { cols: 9, rows: 6, time: 55, shapes: [[1,1],[2,1],[1,2],[2,2],[3,1],[3,2],[1,3]] },
    { cols: 8, rows: 6, time: 50, shapes: [[2,1],[1,2],[2,2],[3,1],[3,2],[2,3]] },
    { cols: 8, rows: 5, time: 45, shapes: [[2,1],[1,2],[2,2],[3,1],[3,2],[2,3],[3,3]] }
  ];

  let level = 0, score = 0, totalPlaced = 0, alignBonus = 0;
  let grid, cols, rows, timeLeft, timerInterval;
  let currentPiece = null, nextPiece = null;
  let gameActive = true, hoverCell = null;

  function getLevelConfig() { return LEVELS[Math.min(level, LEVELS.length - 1)]; }

  function initLevel() {
    const cfg = getLevelConfig();
    cols = cfg.cols;
    rows = cfg.rows;
    timeLeft = cfg.time;
    grid = Array(rows).fill(null).map(() => Array(cols).fill(0));
    currentPiece = genPiece();
    nextPiece = genPiece();
    totalPlaced = 0;
    alignBonus = 0;
    render();
    startTimer();
  }

  function genPiece() {
    const cfg = getLevelConfig();
    const shapes = cfg.shapes;
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const colors = ['#92400e','#b45309','#a16207','#854d0e','#78350f','#6b3a10'];
    return { w: shape[0], h: shape[1], color: colors[Math.floor(Math.random() * colors.length)] };
  }

  function canPlace(piece, startRow, startCol) {
    if (startRow + piece.h > rows || startCol + piece.w > cols) return false;
    for (let r = 0; r < piece.h; r++) {
      for (let c = 0; c < piece.w; c++) {
        if (grid[startRow + r][startCol + c] !== 0) return false;
      }
    }
    return true;
  }

  function placePiece(piece, startRow, startCol) {
    totalPlaced++;
    for (let r = 0; r < piece.h; r++) {
      for (let c = 0; c < piece.w; c++) {
        grid[startRow + r][startCol + c] = totalPlaced;
      }
    }
    // Check alignment bonus (3 colis in a row horizontally)
    checkAlignBonus();
    // Next piece
    currentPiece = nextPiece;
    nextPiece = genPiece();
    // Check if current piece can fit anywhere
    if (!canFitAnywhere(currentPiece)) {
      endGame();
      return;
    }
    render();
  }

  function canFitAnywhere(piece) {
    for (let r = 0; r <= rows - piece.h; r++) {
      for (let c = 0; c <= cols - piece.w; c++) {
        if (canPlace(piece, r, c)) return true;
      }
    }
    return false;
  }

  function checkAlignBonus() {
    // Check if 3 different pieces are perfectly aligned in a row
    for (let r = 0; r < rows; r++) {
      let consecutive = 1;
      for (let c = 1; c < cols; c++) {
        if (grid[r][c] !== 0 && grid[r][c] !== grid[r][c-1] && grid[r][c-1] !== 0) {
          consecutive++;
          if (consecutive >= 3) { alignBonus += 100; }
        } else {
          consecutive = 1;
        }
      }
    }
  }

  function getUsedPercent() {
    let used = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (grid[r][c] !== 0) used++;
    return Math.round((used / (rows * cols)) * 100);
  }

  function calcScore() {
    const pct = getUsedPercent();
    let base = 0;
    if (pct >= 100) base = 1000;
    else if (pct >= 90) base = 800;
    else if (pct >= 80) base = 600;
    else base = Math.floor(pct * 5);
    return base + alignBonus;
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimerDisplay();
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        endGame();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const el = document.getElementById('charg-timer');
    if (el) {
      el.textContent = timeLeft + 's';
      el.style.color = timeLeft <= 10 ? '#ef4444' : '#fff';
      el.style.fontWeight = timeLeft <= 10 ? '900' : '700';
    }
    const bar = document.getElementById('charg-timer-bar');
    const cfg = getLevelConfig();
    if (bar) bar.style.width = (timeLeft / cfg.time * 100) + '%';
  }

  function endGame() {
    gameActive = false;
    if (timerInterval) clearInterval(timerInterval);
    score = calcScore();
    if (score > 0 && typeof saveScore === 'function') saveScore('chargement', score);
    showGameOver();
  }

  function render() {
    const pct = getUsedPercent();
    const cfg = getLevelConfig();
    const cellSize = Math.min(Math.floor((portal.clientWidth - 100) / cols), Math.floor((portal.clientHeight - 200) / rows), 40);

    let gridHtml = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const filled = grid[r][c] !== 0;
        const isHover = hoverCell && currentPiece && r >= hoverCell.r && r < hoverCell.r + currentPiece.h && c >= hoverCell.c && c < hoverCell.c + currentPiece.w;
        const canPlaceHere = hoverCell && currentPiece && canPlace(currentPiece, hoverCell.r, hoverCell.c);
        let bg = filled ? '#92400e' : 'rgba(255,255,255,0.03)';
        let border = '1px solid rgba(255,255,255,0.08)';
        if (isHover && !filled) {
          bg = canPlaceHere ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)';
          border = canPlaceHere ? '1px solid #4ade80' : '1px solid #ef4444';
        }
        if (filled) border = '1px solid rgba(255,255,255,0.15)';
        gridHtml += '<div class="charg-cell" data-r="' + r + '" data-c="' + c + '" style="width:' + cellSize + 'px;height:' + cellSize + 'px;background:' + bg + ';border:' + border + ';border-radius:2px;transition:background 0.1s;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:8px;color:rgba(255,255,255,0.2);">' + (filled ? '📦' : '') + '</div>';
      }
    }

    // Next piece preview
    let previewHtml = '';
    if (nextPiece) {
      for (let r = 0; r < nextPiece.h; r++) {
        for (let c = 0; c < nextPiece.w; c++) {
          previewHtml += '<div style="width:18px;height:18px;background:#92400e;border:1px solid rgba(255,255,255,0.2);border-radius:2px;grid-column:' + (c+1) + ';grid-row:' + (r+1) + ';"></div>';
        }
      }
    }

    // Current piece info
    let curHtml = '';
    if (currentPiece) {
      for (let r = 0; r < currentPiece.h; r++) {
        for (let c = 0; c < currentPiece.w; c++) {
          curHtml += '<div style="width:22px;height:22px;background:#f59e0b;border:1px solid rgba(255,255,255,0.3);border-radius:2px;grid-column:' + (c+1) + ';grid-row:' + (r+1) + ';"></div>';
        }
      }
    }

    portal.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;background:var(--bg-primary,#12121a);color:#fff;overflow:hidden;">
        <div style="padding:8px 14px;background:var(--bg-sidebar,#1e1e2e);border-bottom:1px solid var(--border,#333);display:flex;align-items:center;gap:8px;flex-shrink:0;">
          <button onclick="initGamesPage()" style="padding:4px 8px;background:var(--bg-primary);color:var(--text-primary,#fff);border:1px solid var(--border);border-radius:4px;cursor:pointer;font-size:11px;">←</button>
          <span style="font-size:12px;font-weight:700;">🏗️ Chargement Parfait</span>
          <span id="charg-timer" style="margin-left:auto;font-family:monospace;font-size:14px;font-weight:700;">${timeLeft}s</span>
          <span style="font-family:monospace;color:var(--accent,#7c6af7);font-size:13px;font-weight:700;">Niv.${level+1}</span>
        </div>
        <div style="height:4px;background:#333;flex-shrink:0;">
          <div id="charg-timer-bar" style="height:100%;width:${timeLeft/cfg.time*100}%;background:${timeLeft<=10?'#ef4444':'#f97316'};transition:width 1s linear;"></div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:10px;overflow:hidden;">
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:4px;">
            <div style="text-align:center;">
              <div style="font-size:9px;color:#9ca3af;margin-bottom:2px;">ACTUEL</div>
              <div style="display:grid;grid-template-columns:repeat(${currentPiece?currentPiece.w:1},22px);gap:1px;">${curHtml}</div>
              <div style="font-size:9px;color:#9ca3af;margin-top:2px;">${currentPiece?currentPiece.w+'x'+currentPiece.h:''}</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:9px;color:#9ca3af;margin-bottom:2px;">SUIVANT</div>
              <div style="display:grid;grid-template-columns:repeat(${nextPiece?nextPiece.w:1},18px);gap:1px;">${previewHtml}</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:9px;color:#9ca3af;">REMPLI</div>
              <div style="font-size:18px;font-weight:900;color:${pct>=90?'#4ade80':pct>=70?'#fbbf24':'#fff'};">${pct}%</div>
            </div>
          </div>
          <div style="background:#374151;border-radius:8px;padding:8px;border:2px solid #6b7280;position:relative;">
            <div style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);font-size:9px;color:#9ca3af;background:var(--bg-primary,#12121a);padding:0 6px;">🚛 CAMION</div>
            <div id="charg-grid" style="display:grid;grid-template-columns:repeat(${cols},${cellSize}px);gap:1px;">
              ${gridHtml}
            </div>
          </div>
          <div style="width:${cols*cellSize+cols}px;height:6px;background:#4b5563;border-radius:3px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#f97316,#4ade80);transition:width 0.3s;border-radius:3px;"></div>
          </div>
        </div>
      </div>
    `;

    // Bind grid cells
    document.querySelectorAll('.charg-cell').forEach(cell => {
      cell.onmouseenter = () => {
        if (!gameActive || !currentPiece) return;
        hoverCell = { r: parseInt(cell.dataset.r), c: parseInt(cell.dataset.c) };
        render();
      };
      cell.onclick = () => {
        if (!gameActive || !currentPiece) return;
        const r = parseInt(cell.dataset.r);
        const c = parseInt(cell.dataset.c);
        if (canPlace(currentPiece, r, c)) {
          placePiece(currentPiece, r, c);
          hoverCell = null;
        }
      };
    });

    const gridEl = document.getElementById('charg-grid');
    if (gridEl) {
      gridEl.onmouseleave = () => { hoverCell = null; render(); };
    }
  }

  async function showGameOver() {
    const pct = getUsedPercent();
    const scores = await loadStationScores('chargement');
    const top5 = scores.slice(0, 5);

    portal.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;color:#fff;text-align:center;background:var(--bg-primary,#12121a);">
        <div style="font-size:48px;margin-bottom:10px;">🏗️📦</div>
        <h2 style="font-size:22px;margin:0 0 8px;">Chargement terminé!</h2>
        <p style="font-size:28px;font-weight:bold;color:#fbbf24;margin:0 0 4px;">${score} pts</p>
        <p style="font-size:13px;color:#9ca3af;margin:0 0 4px;">Remplissage : ${pct}% • ${totalPlaced} colis placés</p>
        <p style="font-size:11px;color:#9ca3af;margin:0 0 20px;">${alignBonus > 0 ? 'Bonus alignement : +' + alignBonus : ''}</p>
        
        <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;width:100%;max-width:300px;margin-bottom:20px;">
          <h3 style="font-size:14px;margin:0 0 10px;color:#f97316;">🏆 Top 5 Station</h3>
          ${top5.length > 0 ? top5.map((s, i) => `
            <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.1);">
              <span>${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i+1) + '.'} ${s.chauffeur_nom || 'Joueur'}</span>
              <span style="color:#fbbf24;">${s.score} pts</span>
            </div>
          `).join('') : '<p style="font-size:12px;color:#6b7280;">Aucun score enregistré</p>'}
        </div>

        <div style="display:flex;gap:12px;">
          <button onclick="startGameChargement()" style="padding:12px 24px;background:#f97316;color:#fff;border:none;border-radius:8px;font-weight:bold;font-size:14px;cursor:pointer;">🔄 Rejouer</button>
          <button onclick="initGamesPage()" style="padding:12px 24px;background:#374151;color:#fff;border:1px solid #6b7280;border-radius:8px;font-size:14px;cursor:pointer;">← Retour aux jeux</button>
        </div>
      </div>
    `;
  }

  // Start
  initLevel();
}

window.startGameChargement = startGameChargement;
