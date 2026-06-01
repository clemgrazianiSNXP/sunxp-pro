/* js/game-memoire.js — Mini-jeu Mémoire Tournée 🧠 (SunXP Pro) */

function startGameMemoire() {
  const portal = document.getElementById('chauffeur-portal');
  if (!portal) return;

  let score = 0, level = 1, combo = 0, roundNum = 0, lives = 3;
  let gameActive = false;
  let addresses = [], nextClickIdx = 0, correctCount = 0;

  function getLevelConfig() {
    if (level < 2) return { count: 5, memoTime: 12 };
    if (level < 3) return { count: 7, memoTime: 12 };
    if (level < 4) return { count: 9, memoTime: 12 };
    if (level < 5) return { count: 12, memoTime: 12 };
    if (level < 7) return { count: 14, memoTime: 12 };
    if (level < 10) return { count: 18, memoTime: 12 };
    return { count: 22, memoTime: 12 };
  }

  function generateAddresses(count) {
    const addrs = [];
    const usedPositions = new Set();
    for (let i = 0; i < count; i++) {
      let x, y, key;
      do {
        x = 10 + Math.floor(Math.random() * 80);
        y = 10 + Math.floor(Math.random() * 75);
        key = Math.floor(x/8) + ',' + Math.floor(y/8);
      } while (usedPositions.has(key));
      usedPositions.add(key);
      addrs.push({ id: i, order: i + 1, x, y });
    }
    return addrs;
  }

  function initMemoireStructure() {
    portal.innerHTML = '';
    portal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:var(--bg-primary,#12121a);display:flex;flex-direction:column;overflow:hidden;';
    portal.innerHTML = `
      <div id="memoire-header" style="padding:8px 14px;background:var(--bg-sidebar,#1e1e2e);border-bottom:1px solid var(--border,#333);display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <button onclick="initGamesPage()" style="padding:4px 8px;background:var(--bg-primary,#12121a);color:var(--text-primary,#fff);border:1px solid var(--border,#444);border-radius:4px;cursor:pointer;font-size:11px;">←</button>
        <span style="font-size:12px;font-weight:700;">🧠 Mémoire Tournée</span>
        <span id="memoire-info" style="margin-left:auto;font-size:11px;color:#9ca3af;"></span>
        <span id="memoire-score" style="font-family:monospace;color:var(--accent,#7c6af7);font-size:13px;font-weight:700;">${score}</span>
      </div>
      <div id="memoire-status-bar" style="flex-shrink:0;"></div>
      <div id="memoire-zone" style="flex:1;position:relative;background:#e5e7eb;overflow:hidden;border:2px solid #9ca3af;margin:8px;border-radius:8px;">
        <div style="position:absolute;inset:0;opacity:0.1;background:repeating-linear-gradient(0deg,transparent,transparent 19px,#6b7280 19px,#6b7280 20px),repeating-linear-gradient(90deg,transparent,transparent 19px,#6b7280 19px,#6b7280 20px);"></div>
      </div>
      <div id="memoire-footer" style="padding:6px;text-align:center;font-size:10px;color:#6b7280;flex-shrink:0;"></div>
      <style>
        @keyframes mem-shake { 0%,100%{transform:translate(-50%,-50%)} 25%{transform:translate(-50%,-50%) translateX(-4px)} 75%{transform:translate(-50%,-50%) translateX(4px)} }
      </style>
    `;
  }

  function updateMemoireHeader() {
    const infoEl = document.getElementById('memoire-info');
    const scoreEl = document.getElementById('memoire-score');
    if (infoEl) infoEl.textContent = 'Niv.' + level + ' • Manche ' + roundNum;
    if (scoreEl) scoreEl.textContent = score;
  }

  function startLevel() {
    roundNum++;
    const cfg = getLevelConfig();
    addresses = generateAddresses(cfg.count);
    nextClickIdx = 0;
    correctCount = 0;
    if (!document.getElementById('memoire-header')) initMemoireStructure();
    updateMemoireHeader();
    showMemoPhase(cfg);
  }

  function showMemoPhase(cfg) {
    gameActive = false;
    let timeLeft = cfg.memoTime;

    const addrHtml = addresses.map(a => `
      <div class="mem-addr" data-id="${a.id}" style="position:absolute;left:${a.x}%;top:${a.y}%;transform:translate(-50%,-50%);cursor:default;">
        <div style="position:relative;width:36px;height:36px;background:#fbbf24;border-radius:6px;border:2px solid #92400e;display:flex;align-items:center;justify-content:center;font-size:12px;">🏠</div>
        <div class="mem-order" style="position:absolute;top:-10px;right:-10px;width:20px;height:20px;background:#ef4444;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;">${a.order}</div>
      </div>
    `).join('');

    const statusBar = document.getElementById('memoire-status-bar');
    if (statusBar) statusBar.innerHTML = `
      <div style="padding:6px 14px;background:rgba(239,68,68,0.1);text-align:center;">
        <div style="font-size:12px;color:#fbbf24;font-weight:700;">👀 MÉMORISEZ L'ORDRE ! <span id="mem-timer">${timeLeft}s</span></div>
        <div style="height:4px;background:#333;border-radius:2px;margin-top:4px;overflow:hidden;">
          <div id="mem-timer-bar" style="height:100%;width:100%;background:#ef4444;transition:width 1s linear;"></div>
        </div>
      </div>
    `;

    const zone = document.getElementById('memoire-zone');
    if (zone) zone.innerHTML = '<div style="position:absolute;inset:0;opacity:0.1;background:repeating-linear-gradient(0deg,transparent,transparent 19px,#6b7280 19px,#6b7280 20px),repeating-linear-gradient(90deg,transparent,transparent 19px,#6b7280 19px,#6b7280 20px);"></div>' + addrHtml;

    const footer = document.getElementById('memoire-footer');
    if (footer) footer.textContent = cfg.count + ' adresses • Numéro rouge = ordre de livraison';

    // Timer countdown
    const timerInterval = setInterval(() => {
      timeLeft--;
      const timerEl = document.getElementById('mem-timer');
      const barEl = document.getElementById('mem-timer-bar');
      if (timerEl) timerEl.textContent = timeLeft + 's';
      if (barEl) barEl.style.width = (timeLeft / cfg.memoTime * 100) + '%';
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        showPlayPhase();
      }
    }, 1000);
  }

  function showPlayPhase() {
    gameActive = true;
    updateMemoireHeader();

    // Hide order numbers, make clickable
    const addrHtml = addresses.map(a => `
      <div class="mem-addr-play" data-id="${a.id}" data-order="${a.order}" style="position:absolute;left:${a.x}%;top:${a.y}%;transform:translate(-50%,-50%);cursor:pointer;transition:all 0.2s;">
        <div style="position:relative;width:36px;height:36px;background:#9ca3af;border-radius:6px;border:2px solid #6b7280;display:flex;align-items:center;justify-content:center;font-size:12px;opacity:0.7;">🏠</div>
        <div class="mem-badge" style="position:absolute;top:-10px;right:-10px;width:20px;height:20px;background:#374151;color:#6b7280;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;">?</div>
      </div>
    `).join('');

    const statusBar = document.getElementById('memoire-status-bar');
    if (statusBar) statusBar.innerHTML = `
      <div style="padding:6px 14px;background:rgba(74,222,128,0.1);text-align:center;">
        <div style="font-size:12px;color:#4ade80;font-weight:700;">👆 Cliquez les adresses dans l'ordre ! <span id="mem-next" style="color:#fbbf24;">Prochain: #${nextClickIdx + 1}</span></div>
        <div style="font-size:10px;color:#9ca3af;" id="mem-combo">${combo > 1 ? '🔥 Combo x' + combo : ''}</div>
      </div>
    `;

    const zone = document.getElementById('memoire-zone');
    if (zone) zone.innerHTML = '<div style="position:absolute;inset:0;opacity:0.1;background:repeating-linear-gradient(0deg,transparent,transparent 19px,#6b7280 19px,#6b7280 20px),repeating-linear-gradient(90deg,transparent,transparent 19px,#6b7280 19px,#6b7280 20px);"></div>' + addrHtml;

    const footer = document.getElementById('memoire-footer');
    if (footer) footer.textContent = '';

    // Bind clicks
    document.querySelectorAll('.mem-addr-play').forEach(el => {
      el.onclick = () => handleClick(el);
      el.ontouchstart = (e) => { e.preventDefault(); handleClick(el); };
    });
  }

  function handleClick(el) {
    if (!gameActive) return;
    const order = parseInt(el.dataset.order);
    const expectedOrder = nextClickIdx + 1;
    const badge = el.querySelector('.mem-badge');
    const house = el.querySelector('div');

    if (order === expectedOrder) {
      // Correct!
      combo++;
      correctCount++;
      const pts = 100 * combo;
      score += pts;
      nextClickIdx++;

      if (house) { house.style.background = '#4ade80'; house.style.borderColor = '#22c55e'; house.style.opacity = '1'; }
      if (badge) { badge.style.background = '#4ade80'; badge.style.color = '#fff'; badge.textContent = order; }
      el.style.cursor = 'default';
      el.onclick = null;
      el.ontouchstart = null;

      // Update UI
      const scoreEl = document.getElementById('memoire-score');
      if (scoreEl) scoreEl.textContent = score;
      const nextEl = document.getElementById('mem-next');
      if (nextEl) nextEl.textContent = nextClickIdx < addresses.length ? 'Prochain: #' + (nextClickIdx + 1) : 'Terminé!';
      const comboEl = document.getElementById('mem-combo');
      if (comboEl) comboEl.textContent = combo > 1 ? '🔥 Combo x' + combo + ' (+' + pts + ')' : '+' + pts;

      // Check if all done
      if (nextClickIdx >= addresses.length) {
        // Perfect round bonus
        if (correctCount === addresses.length) {
          score *= 2;
        }
        gameActive = false;
        setTimeout(() => levelComplete(), 800);
      }
    } else {
      // Wrong!
      combo = 0;
      lives--;
      score = Math.max(0, score - 50);

      if (house) { house.style.background = '#ef4444'; house.style.animation = 'mem-shake 0.3s ease'; }
      setTimeout(() => { if (house) { house.style.background = '#9ca3af'; house.style.animation = ''; } }, 400);

      const scoreEl = document.getElementById('memoire-score');
      if (scoreEl) scoreEl.textContent = score;
      const comboEl = document.getElementById('mem-combo');
      if (comboEl) comboEl.textContent = '❌ -50 pts • Vies: ' + '❤️'.repeat(lives) + '🖤'.repeat(3 - lives);

      if (lives <= 0) {
        gameActive = false;
        setTimeout(endGame, 800);
      }
    }
  }

  function levelComplete() {
    level++;
    // Show transition
    portal.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#fff;text-align:center;background:var(--bg-primary,#12121a);">
        <div style="font-size:40px;margin-bottom:12px;">✅</div>
        <div style="font-size:18px;font-weight:700;">Manche terminée!</div>
        <div style="font-size:24px;font-weight:900;color:#fbbf24;margin:8px 0;">${score} pts</div>
        <div style="font-size:12px;color:#9ca3af;">${correctCount === addresses.length ? '🌟 Ordre parfait → Score x2!' : correctCount + '/' + addresses.length + ' correct'}</div>
        <div style="font-size:12px;color:#9ca3af;margin-top:8px;">Niveau suivant dans 3s...</div>
      </div>
    `;

    // Max 8 rounds
    if (roundNum >= 8) {
      setTimeout(endGame, 2500);
    } else {
      setTimeout(startLevel, 3000);
    }
  }

  function endGame() {
    gameActive = false;
    if (score > 0 && typeof saveScore === 'function') saveScore('memoire', score);
    showGameOver();
  }

  async function showGameOver() {
    const scores = await loadStationScores('memoire');
    const top5 = scores.slice(0, 5);

    portal.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;color:#fff;text-align:center;background:var(--bg-primary,#12121a);">
        <div style="font-size:48px;margin-bottom:10px;">🧠🏆</div>
        <h2 style="font-size:22px;margin:0 0 8px;">Tournée mémorisée!</h2>
        <p style="font-size:28px;font-weight:bold;color:#fbbf24;margin:0 0 4px;">${score} pts</p>
        <p style="font-size:13px;color:#9ca3af;margin:0 0 20px;">${roundNum} manches • Niveau max ${level}</p>
        
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
          <button onclick="startGameMemoire()" style="padding:12px 24px;background:#f97316;color:#fff;border:none;border-radius:8px;font-weight:bold;font-size:14px;cursor:pointer;">🔄 Rejouer</button>
          <button onclick="initGamesPage()" style="padding:12px 24px;background:#374151;color:#fff;border:1px solid #6b7280;border-radius:8px;font-size:14px;cursor:pointer;">← Retour aux jeux</button>
        </div>
      </div>
      <style>
        @keyframes mem-shake { 0%,100%{transform:translate(-50%,-50%)} 25%{transform:translate(-50%,-50%) translateX(-4px)} 75%{transform:translate(-50%,-50%) translateX(4px)} }
      </style>
    `;
  }

  // Start
  startLevel();
}

window.startGameMemoire = startGameMemoire;
