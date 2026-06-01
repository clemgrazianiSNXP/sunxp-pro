/* js/game-boite.js — Mini-jeu Bonne Boîte aux Lettres 🚪 (SunXP Pro) */

function startGameBoite() {
  const portal = document.getElementById('chauffeur-portal');
  if (!portal) return;

  let score = 0, lives = 3, level = 1, questionNum = 0, combo = 0;
  let timerInterval = null, timeLeft = 4000, bonusTime = 0;
  let gameActive = true, correctLabel = '';

  function getLevel() { return Math.floor(questionNum / 3) + 1; }

  function getTimeForLevel(lvl) {
    // Chrono diminue avec le niveau: 4s -> 3.5s -> 3s -> 2.5s -> 2s min
    return Math.max(2000, 4000 - (lvl - 1) * 200) + bonusTime;
  }

  function generateLabels(lvl) {
    let labels = [];
    if (lvl < 3) {
      // Simple numbers - 4 boxes
      const count = 4;
      const base = Math.floor(Math.random() * 8) + 1;
      for (let i = 0; i < count; i++) labels.push(String(base + i));
    } else if (lvl < 5) {
      // Similar 2-digit numbers - 8 boxes
      const count = 8;
      const allPossible = [];
      const digits = [1, 2, 3, 4];
      for (let a of digits) for (let b of digits) allPossible.push('' + a + b);
      // Shuffle and pick
      for (let i = allPossible.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allPossible[i], allPossible[j]] = [allPossible[j], allPossible[i]];
      }
      labels = allPossible.slice(0, count);
    } else if (lvl < 7) {
      // Very similar 3-digit numbers - 12 boxes
      const count = 12;
      const allPossible = [];
      const digits = [1, 2, 3];
      for (let a of digits) for (let b of digits) for (let c of digits) allPossible.push('' + a + b + c);
      for (let i = allPossible.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allPossible[i], allPossible[j]] = [allPossible[j], allPossible[i]];
      }
      labels = allPossible.slice(0, count);
    } else if (lvl < 10) {
      // Names + numbers - 12 boxes
      const count = 12;
      const allPossible = [];
      const letters = ['A', 'B', 'C', 'D'];
      const nums = [12, 21, 13, 31, 22, 23, 32, 11];
      for (let n of nums) for (let l of letters) allPossible.push('Apt ' + n + l);
      for (let i = allPossible.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allPossible[i], allPossible[j]] = [allPossible[j], allPossible[i]];
      }
      labels = allPossible.slice(0, count);
    } else {
      // Level 10+ : complex codes - 16 boxes with very similar codes
      const count = Math.min(16, 12 + Math.floor((lvl - 10) / 2));
      const allPossible = [];
      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
      const nums = [112, 121, 211, 122, 212, 221, 113, 131, 311, 123, 132, 213, 231, 312, 321, 111];
      for (let n of nums) for (let l of letters) allPossible.push(n + l);
      for (let i = allPossible.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allPossible[i], allPossible[j]] = [allPossible[j], allPossible[i]];
      }
      labels = allPossible.slice(0, count);
    }
    return labels;
  }

  function nextQuestion() {
    if (!gameActive) return;
    questionNum++;
    level = getLevel();
    timeLeft = getTimeForLevel(level);

    const labels = generateLabels(level);
    // Shuffle for level 10+
    if (level >= 10) {
      for (let i = labels.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [labels[i], labels[j]] = [labels[j], labels[i]];
      }
    }
    correctLabel = labels[Math.floor(Math.random() * labels.length)];
    renderQuestion(labels);
    startTimer();
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    const startTime = Date.now();
    const totalTime = timeLeft;
    timerInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      timeLeft = Math.max(0, totalTime - elapsed);
      const bar = document.getElementById('boite-timer-bar');
      if (bar) bar.style.width = (timeLeft / totalTime * 100) + '%';
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        wrongAnswer(null);
      }
    }, 50);
  }

  function correctAnswer(el) {
    clearInterval(timerInterval);
    combo++;
    if (combo >= 5 && combo % 5 === 0) {
      bonusTime += 1000; // +1s per question
    }
    const timeBonus = Math.floor(timeLeft / 40);
    const pts = 100 + timeBonus;
    score += pts;

    // Green glow
    if (el) {
      el.style.background = '#4ade80';
      el.style.color = '#000';
      el.style.transform = 'scale(1.1)';
      el.style.boxShadow = '0 0 20px #4ade80';
    }

    // Feedback
    showFeedback(true, '+' + pts);
    setTimeout(nextQuestion, 700);
  }

  function wrongAnswer(el) {
    clearInterval(timerInterval);
    combo = 0;
    lives--;

    // Red shake
    if (el) {
      el.style.background = '#ef4444';
      el.style.animation = 'boite-shake 0.3s ease';
    }

    // Highlight correct
    const boxes = document.querySelectorAll('.boite-box');
    boxes.forEach(b => {
      if (b.dataset.label === correctLabel) {
        b.style.background = '#4ade80';
        b.style.color = '#000';
      }
    });

    showFeedback(false, '❌ Raté !');

    if (lives <= 0) {
      setTimeout(endGame, 800);
    } else {
      setTimeout(nextQuestion, 1000);
    }
  }

  function showFeedback(success, text) {
    const fb = document.getElementById('boite-feedback');
    if (!fb) return;
    fb.textContent = text;
    fb.style.color = success ? '#4ade80' : '#f87171';
    fb.style.opacity = '1';
    fb.style.transform = 'translateY(0) scale(1.2)';
    setTimeout(() => { fb.style.opacity = '0'; fb.style.transform = 'translateY(-10px) scale(1)'; }, 500);
  }

  function initGameStructure() {
    portal.innerHTML = '';
    portal.style.cssText = '';
    portal.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;background:var(--bg-primary,#12121a);color:var(--text-primary,#fff);">
        <div id="boite-header" style="padding:8px 14px;background:var(--bg-sidebar,#1e1e2e);border-bottom:1px solid var(--border,#333);display:flex;align-items:center;gap:8px;flex-shrink:0;">
          <button onclick="initGamesPage()" style="padding:4px 8px;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border);border-radius:4px;cursor:pointer;font-size:11px;">←</button>
          <span style="font-size:12px;font-weight:700;">🚪 Bonne Boîte</span>
          <span id="boite-lives" style="margin-left:auto;"></span>
          <span id="boite-score" style="font-family:monospace;color:var(--accent,#7c6af7);font-size:13px;font-weight:700;">0</span>
        </div>
        <div id="boite-timer-wrap" style="height:4px;background:#333;flex-shrink:0;">
          <div id="boite-timer-bar" style="height:100%;width:100%;background:#f97316;transition:width 0.05s linear;"></div>
        </div>
        <div id="boite-question-zone" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:16px;overflow-y:auto;"></div>
      </div>
      <style>
        @keyframes boite-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
        @keyframes boite-slidein { from{transform:translateY(-20px);opacity:0} to{transform:translateY(0);opacity:1} }
        .boite-box:hover { border-color:var(--accent,#7c6af7) !important; transform:scale(1.05); }
        .boite-box:active { transform:scale(0.95); }
      </style>
    `;
  }

  function updateGameUI() {
    const livesEl = document.getElementById('boite-lives');
    const scoreEl = document.getElementById('boite-score');
    if (livesEl) livesEl.innerHTML = Array(3).fill(0).map((_, i) => '<span style="font-size:16px;opacity:' + (i < lives ? '1' : '0.2') + ';">📦</span>').join('');
    if (scoreEl) scoreEl.textContent = score;
  }

  function renderQuestion(labels) {
    updateGameUI();

    const comboHtml = combo >= 3 ? '<span style="color:#f97316;font-size:11px;font-weight:700;">🔥 x' + combo + '</span>' : '';
    const bonusHtml = bonusTime > 0 ? '<span style="color:#8b5cf6;font-size:10px;">+' + (bonusTime/1000) + 's</span>' : '';

    const boxesHtml = labels.map(lbl => `
      <div class="boite-box" data-label="${lbl}" style="
        background:var(--bg-sidebar,#1e1e2e);
        border:2px solid var(--border,#444);
        border-radius:8px;
        padding:10px 6px;
        text-align:center;
        cursor:pointer;
        transition:all 0.15s;
        position:relative;
        min-width:60px;
      ">
        <div style="width:100%;height:4px;background:#666;border-radius:2px;margin-bottom:6px;"></div>
        <div style="font-size:13px;font-weight:700;font-family:monospace;color:var(--text-primary,#fff);">${lbl}</div>
        <div style="position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);width:60%;height:3px;background:#92400e;border-radius:0 0 4px 4px;"></div>
      </div>
    `).join('');

    const zone = document.getElementById('boite-question-zone');
    if (zone) zone.innerHTML = `
      <div id="boite-feedback" style="font-size:16px;font-weight:700;height:20px;transition:all 0.2s;opacity:0;">&nbsp;</div>
      <div style="display:flex;gap:6px;align-items:center;">${comboHtml} ${bonusHtml}</div>
      <div style="background:var(--bg-sidebar,#1e1e2e);border:1px solid var(--border,#333);border-radius:12px;padding:16px 24px;text-align:center;animation:boite-slidein 0.3s ease;">
        <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;">📦 COLIS POUR :</div>
        <div style="font-size:24px;font-weight:900;font-family:monospace;color:#fbbf24;letter-spacing:2px;">${correctLabel}</div>
      </div>
      <div style="font-size:11px;color:var(--text-muted);">Niv. ${level} • Question ${questionNum}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:8px;width:100%;max-width:400px;">
        ${boxesHtml}
      </div>
    `;

    // Bind click
    document.querySelectorAll('.boite-box').forEach(box => {
      box.onclick = () => {
        if (!gameActive) return;
        if (box.dataset.label === correctLabel) {
          correctAnswer(box);
        } else {
          wrongAnswer(box);
        }
      };
    });
  }

  function endGame() {
    gameActive = false;
    if (timerInterval) clearInterval(timerInterval);
    if (score > 0 && typeof saveScore === 'function') saveScore('boite', score);
    showGameOver();
  }

  async function showGameOver() {
    const scores = await loadStationScores('boite');
    const top5 = scores.slice(0, 5);

    portal.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;color:#fff;text-align:center;background:var(--bg-primary,#12121a);">
        <div style="font-size:48px;margin-bottom:10px;">🚪💥</div>
        <h2 style="font-size:22px;margin:0 0 8px;">Game Over!</h2>
        <p style="font-size:28px;font-weight:bold;color:#fbbf24;margin:0 0 4px;">${score} pts</p>
        <p style="font-size:13px;color:#9ca3af;margin:0 0 20px;">Niveau ${level} • ${questionNum} colis livrés</p>
        
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
          <button onclick="startGameBoite()" style="padding:12px 24px;background:#f97316;color:#fff;border:none;border-radius:8px;font-weight:bold;font-size:14px;cursor:pointer;">🔄 Rejouer</button>
          <button onclick="initGamesPage()" style="padding:12px 24px;background:#374151;color:#fff;border:1px solid #6b7280;border-radius:8px;font-size:14px;cursor:pointer;">← Retour aux jeux</button>
        </div>
      </div>
    `;
  }

  // Start
  initGameStructure();
  nextQuestion();
}

window.startGameBoite = startGameBoite;
