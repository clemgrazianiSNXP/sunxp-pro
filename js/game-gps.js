/* js/game-gps.js — Mini-jeu GPS Cassé 🗺️ (SunXP Pro) */
console.log('game-gps.js chargé');

function startGameGPS() {
  const portal = document.getElementById('chauffeur-portal');
  if (!portal) return;

  let score = 0, round = 0, level = 1, consecutiveExact = 0;
  let gameActive = true;

  // Directions: 0=nord(up), 1=est(right), 2=sud(down), 3=ouest(left)
  const DIR_NAMES = ['Nord', 'Est', 'Sud', 'Ouest'];
  const DIR_ARROWS = ['⬆️', '➡️', '⬇️', '⬅️'];
  const DX = [0, 1, 0, -1];
  const DY = [-1, 0, 1, 0];

  function getGridSize() {
    if (level < 3) return 5;
    if (level < 5) return 8;
    if (level < 7) return 10;
    return 12;
  }

  function getInstructionCount() {
    if (level < 3) return 5;
    if (level < 5) return 8;
    if (level < 7) return 12;
    return 15;
  }

  function generateInstructions() {
    const gridSize = getGridSize();
    const count = getInstructionCount();
    const instructions = [];
    let x = Math.floor(gridSize / 2);
    let y = Math.floor(gridSize / 2);
    let dir = 0; // facing north

    for (let i = 0; i < count; i++) {
      const actions = [];
      // Turn
      const turnRoll = Math.random();
      if (turnRoll < 0.35) {
        dir = (dir + 1) % 4; // turn right
        actions.push({ type: 'turn', text: '↱ Tournez à droite', dir });
      } else if (turnRoll < 0.7) {
        dir = (dir + 3) % 4; // turn left
        actions.push({ type: 'turn', text: '↰ Tournez à gauche', dir });
      } else {
        actions.push({ type: 'straight', text: '⬆️ Continuez tout droit', dir });
      }

      // Move forward 1-3 steps
      const steps = level < 5 ? 1 : (Math.random() < 0.5 ? 1 : 2);
      let moved = 0;
      for (let s = 0; s < steps; s++) {
        const nx = x + DX[dir];
        const ny = y + DY[dir];
        if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
          x = nx; y = ny; moved++;
        }
      }

      let text = actions[0].text;
      if (moved > 1) text += ' (' + (moved * 100) + 'm)';
      
      // Level 10+: some instructions are hidden
      let hidden = false;
      if (level >= 10 && Math.random() < 0.25) hidden = true;

      instructions.push({ text, hidden, finalX: x, finalY: y });
    }

    return { instructions, startX: Math.floor(gridSize / 2), startY: Math.floor(gridSize / 2), endX: x, endY: y };
  }

  function startRound() {
    round++;
    level = Math.floor((round - 1) / 3) + 1;
    const data = generateInstructions();
    showInstructions(data);
  }

  function showInstructions(data) {
    const { instructions, startX, startY, endX, endY } = data;
    let currentIdx = 0;

    function showNext() {
      if (currentIdx >= instructions.length) {
        // All instructions shown — let player guess
        showGuessPhase(data);
        return;
      }

      const instr = instructions[currentIdx];
      const instrEl = document.getElementById('gps-instruction');
      const progressEl = document.getElementById('gps-progress');
      const timerBarEl = document.getElementById('gps-instr-timer');

      if (instrEl) {
        if (instr.hidden) {
          instrEl.textContent = '📡 ~~~ signal perdu ~~~';
          instrEl.style.color = '#ef4444';
          instrEl.style.fontStyle = 'italic';
        } else {
          instrEl.textContent = instr.text;
          instrEl.style.color = '#fff';
          instrEl.style.fontStyle = 'normal';
        }
        instrEl.style.animation = 'none';
        instrEl.offsetHeight; // reflow
        instrEl.style.animation = 'gps-fadein 0.3s ease';
      }
      if (progressEl) progressEl.textContent = (currentIdx + 1) + ' / ' + instructions.length;

      // Timer bar animation
      if (timerBarEl) {
        timerBarEl.style.transition = 'none';
        timerBarEl.style.width = '100%';
        timerBarEl.offsetHeight;
        timerBarEl.style.transition = 'width 3s linear';
        timerBarEl.style.width = '0%';
      }

      currentIdx++;
      setTimeout(showNext, 3000);
    }

    // Render instruction phase UI
    const gridSize = getGridSize();
    portal.innerHTML = '';
    portal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:var(--bg-primary,#12121a);display:flex;flex-direction:column;overflow:hidden;';
    portal.innerHTML = `
      <div style="padding:8px 14px;background:var(--bg-sidebar,#1e1e2e);border-bottom:1px solid var(--border,#333);display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <button onclick="initGamesPage()" style="padding:4px 8px;background:var(--bg-primary,#12121a);color:var(--text-primary,#fff);border:1px solid var(--border,#444);border-radius:4px;cursor:pointer;font-size:11px;">←</button>
        <span style="font-size:12px;font-weight:700;">📡 GPS Cassé</span>
        <span style="margin-left:auto;font-size:11px;color:#9ca3af;">Niv.${level} • Manche ${round}</span>
        <span style="font-family:monospace;color:var(--accent,#7c6af7);font-size:13px;font-weight:700;">${score}</span>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:20px;color:#fff;">
        <div style="font-size:36px;animation:gps-glitch 2s infinite;">📡</div>
        <div style="font-size:11px;color:#9ca3af;">Mémorisez les instructions...</div>
        <div id="gps-instruction" style="font-size:18px;font-weight:700;min-height:30px;text-align:center;padding:12px 20px;background:var(--bg-sidebar,#1e1e2e);border:1px solid var(--border,#444);border-radius:10px;min-width:250px;"></div>
        <div id="gps-progress" style="font-size:12px;color:#6b7280;"></div>
        <div style="width:200px;height:4px;background:#333;border-radius:2px;overflow:hidden;">
          <div id="gps-instr-timer" style="height:100%;width:100%;background:#f97316;border-radius:2px;"></div>
        </div>
        <div style="font-size:10px;color:#6b7280;margin-top:10px;">Départ : centre de la grille (${gridSize}x${gridSize})</div>
      </div>
      <style>
        @keyframes gps-glitch { 0%,90%{transform:translate(0)} 92%{transform:translate(-2px,1px)} 94%{transform:translate(2px,-1px)} 96%{transform:translate(-1px,-1px)} 98%{transform:translate(1px,1px)} 100%{transform:translate(0)} }
        @keyframes gps-fadein { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
      </style>
    `;

    setTimeout(showNext, 500);
  }

  function showGuessPhase(data) {
    const { startX, startY, endX, endY } = data;
    const gridSize = getGridSize();
    const cellSize = Math.min(Math.floor((portal.clientWidth - 60) / gridSize), Math.floor((portal.clientHeight - 200) / gridSize), 32);

    let gridHtml = '';
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const isStart = (c === startX && r === startY);
        let bg = 'rgba(255,255,255,0.03)';
        let content = '';
        if (isStart) { bg = '#4ade80'; content = '🏭'; }
        gridHtml += '<div class="gps-cell" data-r="' + r + '" data-c="' + c + '" style="width:' + cellSize + 'px;height:' + cellSize + 'px;background:' + bg + ';border:1px solid rgba(255,255,255,0.1);border-radius:2px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:' + Math.max(8, cellSize - 18) + 'px;transition:all 0.15s;">' + content + '</div>';
      }
    }

    portal.innerHTML = `
      <div style="padding:8px 14px;background:var(--bg-sidebar,#1e1e2e);border-bottom:1px solid var(--border,#333);display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <span style="font-size:12px;font-weight:700;">📡 Où êtes-vous arrivé ?</span>
        <span style="margin-left:auto;font-family:monospace;color:var(--accent,#7c6af7);font-size:13px;font-weight:700;">${score}</span>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:16px;color:#fff;">
        <div style="font-size:13px;color:#fbbf24;">👆 Cliquez sur la case d'arrivée</div>
        <div style="background:#1f2937;border-radius:8px;padding:6px;border:1px solid #4b5563;">
          <div id="gps-grid" style="display:grid;grid-template-columns:repeat(${gridSize},${cellSize}px);gap:1px;">
            ${gridHtml}
          </div>
        </div>
        <div style="font-size:10px;color:#6b7280;">🏭 = Départ (centre)</div>
      </div>
    `;

    // Bind clicks
    document.querySelectorAll('.gps-cell').forEach(cell => {
      cell.onclick = () => {
        if (!gameActive) return;
        const guessR = parseInt(cell.dataset.r);
        const guessC = parseInt(cell.dataset.c);
        evaluateGuess(guessC, guessR, endX, endY, startX, startY, gridSize, cellSize);
      };
    });
  }

  function evaluateGuess(guessX, guessY, correctX, correctY, startX, startY, gridSize, cellSize) {
    const dist = Math.abs(guessX - correctX) + Math.abs(guessY - correctY);
    let pts = 0;
    if (dist === 0) { pts = 1000; consecutiveExact++; }
    else if (dist === 1) { pts = 700; consecutiveExact = 0; }
    else if (dist === 2) { pts = 400; consecutiveExact = 0; }
    else { pts = 0; consecutiveExact = 0; }

    // Bonus for 3 exact in a row
    if (consecutiveExact >= 3 && consecutiveExact % 3 === 0) pts += 500;

    score += pts;

    // Show result
    const cells = document.querySelectorAll('.gps-cell');
    cells.forEach(cell => {
      const r = parseInt(cell.dataset.r);
      const c = parseInt(cell.dataset.c);
      cell.style.cursor = 'default';
      if (c === correctX && r === correctY) {
        cell.style.background = '#4ade80';
        cell.style.border = '2px solid #22c55e';
        cell.textContent = '🎯';
      }
      if (c === guessX && r === guessY && !(c === correctX && r === correctY)) {
        cell.style.background = '#ef4444';
        cell.style.border = '2px solid #dc2626';
        cell.textContent = '❌';
      }
    });

    // Show feedback
    const feedbackDiv = document.createElement('div');
    feedbackDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.9);padding:20px 30px;border-radius:12px;text-align:center;z-index:99999;color:#fff;';
    feedbackDiv.innerHTML = `
      <div style="font-size:24px;margin-bottom:8px;">${dist === 0 ? '🎯 Parfait!' : dist <= 2 ? '👍 Proche!' : '😅 Raté!'}</div>
      <div style="font-size:18px;font-weight:700;color:${pts > 0 ? '#4ade80' : '#ef4444'};">+${pts} pts</div>
      <div style="font-size:11px;color:#9ca3af;margin-top:4px;">${dist === 0 ? 'Case exacte!' : dist + ' case(s) d\'écart'}</div>
      ${consecutiveExact >= 3 && consecutiveExact % 3 === 0 ? '<div style="font-size:12px;color:#fbbf24;margin-top:4px;">🔥 Bonus précision +500!</div>' : ''}
    `;
    portal.appendChild(feedbackDiv);

    setTimeout(() => {
      feedbackDiv.remove();
      // Next round or game over (play 5 rounds)
      if (round >= 5) {
        endGame();
      } else {
        startRound();
      }
    }, 2000);
  }

  function endGame() {
    gameActive = false;
    if (score > 0 && typeof saveScore === 'function') saveScore('gps', score);
    showGameOver();
  }

  async function showGameOver() {
    const scores = await loadStationScores('gps');
    const top5 = scores.slice(0, 5);

    portal.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;color:#fff;text-align:center;background:var(--bg-primary,#12121a);">
        <div style="font-size:48px;margin-bottom:10px;">📡🗺️</div>
        <h2 style="font-size:22px;margin:0 0 8px;">GPS réparé!</h2>
        <p style="font-size:28px;font-weight:bold;color:#fbbf24;margin:0 0 4px;">${score} pts</p>
        <p style="font-size:13px;color:#9ca3af;margin:0 0 20px;">${round} manches • Niveau max ${level}</p>
        
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
          <button onclick="startGameGPS()" style="padding:12px 24px;background:#f97316;color:#fff;border:none;border-radius:8px;font-weight:bold;font-size:14px;cursor:pointer;">🔄 Rejouer</button>
          <button onclick="initGamesPage()" style="padding:12px 24px;background:#374151;color:#fff;border:1px solid #6b7280;border-radius:8px;font-size:14px;cursor:pointer;">← Retour aux jeux</button>
        </div>
      </div>
    `;
  }

  // Start
  startRound();
}

window.startGameGPS = startGameGPS;
