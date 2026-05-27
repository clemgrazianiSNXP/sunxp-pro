/* js/game-tetris.js — Mini-jeu Tetris Colis 📦 (SunXP Pro) */
console.log('game-tetris.js chargé');

function startGameTetris() {
  const portal = document.getElementById('chauffeur-portal');
  if (!portal) return;

  portal.innerHTML = '<div id="tetris-wrap" style="display:flex;flex-direction:column;height:100%;background:#2a2a3a;"></div>';
  const wrap = document.getElementById('tetris-wrap');

  // Header
  const hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 14px;background:var(--bg-sidebar,#1e1e2e);border-bottom:1px solid var(--border,#333);flex-shrink:0;';
  hdr.innerHTML = '<button onclick="initGamesPage()" style="padding:5px 10px;background:var(--bg-primary,#12121a);color:var(--text-primary,#fff);border:1px solid var(--border,#444);border-radius:6px;cursor:pointer;font-size:12px;">← Jeux</button><span style="font-size:14px;font-weight:700;color:var(--text-primary,#fff);">📦 Tetris Colis</span><span id="t-info" style="margin-left:auto;font-size:11px;color:var(--accent,#7c6af7);font-family:monospace;">Score: 0 | Niv: 1</span>';
  wrap.appendChild(hdr);

  // Canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'tetris-cv';
  canvas.style.cssText = 'flex:1;display:block;touch-action:none;';
  wrap.appendChild(canvas);

  // Controls
  const ctrl = document.createElement('div');
  ctrl.style.cssText = 'display:flex;flex-shrink:0;';
  ctrl.innerHTML = '<button id="t-left" style="flex:1;padding:16px;font-size:22px;background:var(--bg-sidebar,#1e1e2e);border:1px solid var(--border,#333);color:var(--text-primary,#fff);cursor:pointer;">◀</button><button id="t-rot" style="flex:1;padding:16px;font-size:22px;background:var(--bg-sidebar,#1e1e2e);border:1px solid var(--border,#333);color:var(--text-primary,#fff);cursor:pointer;">↻</button><button id="t-right" style="flex:1;padding:16px;font-size:22px;background:var(--bg-sidebar,#1e1e2e);border:1px solid var(--border,#333);color:var(--text-primary,#fff);cursor:pointer;">▶</button><button id="t-down" style="flex:1;padding:16px;font-size:22px;background:var(--accent,#7c6af7);border:none;color:#fff;cursor:pointer;font-weight:700;">⬇</button>';
  wrap.appendChild(ctrl);

  const ctx = canvas.getContext('2d');
  const COLS = 10, ROWS = 20;
  let cellW, cellH, offX = 0;

  function resize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    cellW = Math.floor(canvas.width / COLS);
    cellH = Math.floor(canvas.height / ROWS);
    const usedW = cellW * COLS;
    offX = Math.floor((canvas.width - usedW) / 2);
  }
  resize();
  window.addEventListener('resize', resize);

  // Pieces (standard Tetris shapes)
  const SHAPES = [
    [[1,1,1,1]],           // I
    [[1,1],[1,1]],         // O
    [[0,1,0],[1,1,1]],    // T
    [[0,1,1],[1,1,0]],    // S
    [[1,1,0],[0,1,1]],    // Z
    [[1,0],[1,0],[1,1]],  // L
    [[0,1],[0,1],[1,1]]   // J
  ];
  const COLORS = ['#c2956b','#a0522d','#d2691e','#8b4513','#cd853f','#deb887','#f4a460'];

  let board = Array.from({length:ROWS}, () => Array(COLS).fill(0));
  let score = 0, level = 1, lines = 0, gameOver = false;
  let dropInterval = 500, lastDrop = 0;
  let cur = null, curX = 0, curY = 0, curColor = 0;
  let next = null, nextColor = 0;

  function newPiece() {
    if (next === null) { next = SHAPES[Math.floor(Math.random()*SHAPES.length)]; nextColor = Math.floor(Math.random()*COLORS.length); }
    cur = next; curColor = nextColor;
    next = SHAPES[Math.floor(Math.random()*SHAPES.length)];
    nextColor = Math.floor(Math.random()*COLORS.length);
    curX = Math.floor((COLS - cur[0].length) / 2);
    curY = 0;
    if (collides(cur, curX, curY)) { gameOver = true; if (score > 0 && typeof saveScore === 'function') saveScore('tetris', score); }
  }

  function collides(shape, sx, sy) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = sx + c, ny = sy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function merge() {
    for (let r = 0; r < cur.length; r++) {
      for (let c = 0; c < cur[r].length; c++) {
        if (!cur[r][c]) continue;
        const ny = curY + r;
        if (ny >= 0) board[ny][curX + c] = curColor + 1;
      }
    }
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every(c => c > 0)) {
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(0));
        cleared++; r++;
      }
    }
    if (cleared) {
      lines += cleared;
      score += cleared * 100 * level;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(80, 500 - (level - 1) * 40);
    }
  }

  function rotate(shape) {
    const rows = shape.length, cols = shape[0].length;
    const rotated = Array.from({length:cols}, () => Array(rows).fill(0));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) rotated[c][rows - 1 - r] = shape[r][c];
    return rotated;
  }

  function moveLeft() { if (!collides(cur, curX - 1, curY)) curX--; }
  function moveRight() { if (!collides(cur, curX + 1, curY)) curX++; }
  function moveDown() { if (!collides(cur, curX, curY + 1)) { curY++; } else { merge(); clearLines(); newPiece(); } }
  function rotatePiece() { const r = rotate(cur); if (!collides(r, curX, curY)) cur = r; }
  function hardDrop() { while (!collides(cur, curX, curY + 1)) curY++; merge(); clearLines(); newPiece(); }

  // Draw
  function drawCell(x, y, colorIdx) {
    const px = offX + x * cellW, py = y * cellH;
    ctx.fillStyle = COLORS[colorIdx];
    ctx.fillRect(px + 1, py + 1, cellW - 2, cellH - 2);
    // Tape
    ctx.fillStyle = 'rgba(255,255,200,0.4)';
    ctx.fillRect(px + cellW/2 - 1, py + 1, 2, cellH - 2);
    ctx.fillRect(px + 1, py + cellH/2 - 1, cellW - 2, 2);
    // Border
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.strokeRect(px + 1, py + 1, cellW - 2, cellH - 2);
  }

  function draw() {
    // Background (van interior)
    ctx.fillStyle = '#3a3a4a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Grid area
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(offX, 0, cellW * COLS, cellH * ROWS);
    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(offX, r*cellH); ctx.lineTo(offX+cellW*COLS, r*cellH); ctx.stroke(); }
    for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(offX+c*cellW, 0); ctx.lineTo(offX+c*cellW, cellH*ROWS); ctx.stroke(); }

    // Board
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { if (board[r][c]) drawCell(c, r, board[r][c] - 1); }

    // Current piece
    if (cur && !gameOver) {
      for (let r = 0; r < cur.length; r++) for (let c = 0; c < cur[r].length; c++) { if (cur[r][c]) drawCell(curX + c, curY + r, curColor); }
    }

    // Info
    document.getElementById('t-info').textContent = 'Score: ' + score + ' | Niv: ' + level + ' | Lignes: ' + lines;

    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = 'center';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = '#f87171';
      ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 20);
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText('Score: ' + score, canvas.width/2, canvas.height/2 + 15);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#aaa';
      ctx.fillText('Touchez pour rejouer', canvas.width/2, canvas.height/2 + 45);
    }
  }

  function gameLoop(ts) {
    if (gameOver) { draw(); return; }
    if (ts - lastDrop > dropInterval) { moveDown(); lastDrop = ts; }
    draw();
    requestAnimationFrame(gameLoop);
  }

  // Controls
  document.getElementById('t-left').onclick = moveLeft;
  document.getElementById('t-right').onclick = moveRight;
  document.getElementById('t-down').onclick = moveDown;
  document.getElementById('t-rot').onclick = rotatePiece;

  const keyHandler = (e) => {
    if (gameOver) return;
    if (e.key === 'ArrowLeft') moveLeft();
    else if (e.key === 'ArrowRight') moveRight();
    else if (e.key === 'ArrowDown') moveDown();
    else if (e.key === 'ArrowUp') rotatePiece();
    else if (e.key === ' ') hardDrop();
  };
  document.addEventListener('keydown', keyHandler);

  // Touch swipe
  let touchX = 0;
  canvas.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, {passive:true});
  canvas.addEventListener('touchend', e => {
    if (gameOver) { restart(); return; }
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) < 20) rotatePiece();
    else if (dx > 20) moveRight();
    else if (dx < -20) moveLeft();
  }, {passive:true});

  // Restart
  canvas.onclick = () => { if (gameOver) restart(); };
  function restart() {
    board = Array.from({length:ROWS}, () => Array(COLS).fill(0));
    score = 0; level = 1; lines = 0; gameOver = false; dropInterval = 500;
    next = null;
    newPiece();
    requestAnimationFrame(gameLoop);
  }

  // Start
  newPiece();
  requestAnimationFrame(gameLoop);
}

window.startGameTetris = startGameTetris;
