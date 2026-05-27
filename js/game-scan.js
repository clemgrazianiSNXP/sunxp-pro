/* js/game-scan.js — Mini-jeu Scan Express ⚡ (SunXP Pro) */
console.log('game-scan.js chargé');

function startGameScan() {
  const portal = document.getElementById('chauffeur-portal');
  if (!portal) return;

  let score = 0, lives = 3, combo = 0, multiplier = 1, level = 1, questionNum = 0;
  let timerInterval = null, timeLeft = 5000;
  let gameActive = false, correctCode = '';

  function genCode(len) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    // Format: XXX-NNNN or XXX-NNNN-XX depending on level
    const parts = level < 3 ? 2 : level < 6 ? 3 : 4;
    for (let p = 0; p < parts; p++) {
      if (p > 0) code += '-';
      const partLen = Math.min(4, 2 + Math.floor(level / 2));
      for (let i = 0; i < partLen; i++) code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  function genSimilar(code) {
    // Generate a code that looks similar but differs by 1-2 chars
    const arr = code.split('');
    const changes = Math.random() > 0.5 ? 1 : 2;
    for (let i = 0; i < changes; i++) {
      const idx = Math.floor(Math.random() * arr.length);
      if (arr[idx] === '-') continue;
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      arr[idx] = chars[Math.floor(Math.random() * chars.length)];
    }
    const result = arr.join('');
    return result === code ? genSimilar(code) : result;
  }

  function genBarcodeSVG() {
    let bars = '';
    for (let i = 0; i < 30; i++) {
      const w = Math.random() > 0.5 ? 2 : 1;
      const h = 40 + Math.random() * 10;
      bars += '<rect x="' + (i * 4) + '" y="' + (50 - h/2) + '" width="' + w + '" height="' + h + '" fill="#fff"/>';
    }
    return '<svg width="120" height="50" viewBox="0 0 120 50" style="display:block;margin:0 auto;">' + bars + '</svg>';
  }

  function startGame() {
    score = 0; lives = 3; combo = 0; multiplier = 1; level = 1; questionNum = 0;
    gameActive = true;
    nextQuestion();
  }

  function nextQuestion() {
    if (!gameActive) return;
    questionNum++;
    level = Math.floor(questionNum / 5) + 1;
    timeLeft = 5000;
    correctCode = genCode(level);

    // Generate 3 wrong answers + 1 correct, shuffle
    const options = [correctCode];
    while (options.length < 4) {
      const wrong = genSimilar(correctCode);
      if (!options.includes(wrong)) options.push(wrong);
    }
    // Shuffle
    for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; }

    renderQuestion(options);
    startTimer();
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    const startTime = Date.now();
    timerInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      timeLeft = Math.max(0, 5000 - elapsed);
      const bar = document.getElementById('scan-timer-bar');
      if (bar) bar.style.width = (timeLeft / 5000 * 100) + '%';
      if (timeLeft <= 0) { clearInterval(timerInterval); wrongAnswer(); }
    }, 50);
  }

  function correctAnswer() {
    clearInterval(timerInterval);
    combo++;
    if (combo >= 5 && multiplier === 1) { multiplier = 2; setTimeout(() => { multiplier = 1; }, 10000); }
    const timeBonus = Math.floor(timeLeft / 50);
    const points = (100 + timeBonus) * multiplier;
    score += points;
    showFeedback(true, '+' + points);
    setTimeout(nextQuestion, 800);
  }

  function wrongAnswer() {
    clearInterval(timerInterval);
    combo = 0;
    lives--;
    if (lives <= 0) { endGame(); return; }
    showFeedback(false, '❌ Raté !');
    setTimeout(nextQuestion, 1000);
  }

  function showFeedback(success, text) {
    const fb = document.getElementById('scan-feedback');
    if (!fb) return;
    fb.textContent = text;
    fb.style.color = success ? '#4ade80' : '#f87171';
    fb.style.opacity = '1';
    fb.style.transform = 'scale(1.2)';
    setTimeout(() => { fb.style.opacity = '0'; fb.style.transform = 'scale(1)'; }, 600);
  }

  function endGame() {
    gameActive = false;
    if (timerInterval) clearInterval(timerInterval);
    if (score > 0 && typeof saveScore === 'function') saveScore('scan', score);

    portal.innerHTML = '<div style="display:flex;flex-direction:column;height:100%;background:var(--bg-primary,#12121a);color:var(--text-primary,#fff);align-items:center;justify-content:center;padding:20px;text-align:center;"><div style="font-size:40px;margin-bottom:12px;">⚡</div><h2 style="margin:0 0 8px;font-size:20px;">Game Over !</h2><div style="font-size:12px;color:var(--text-muted);">' + questionNum + ' colis scannés</div><div style="font-size:32px;font-weight:700;color:var(--accent,#7c6af7);margin:16px 0;font-family:monospace;">' + score + ' pts</div><div style="display:flex;gap:10px;margin-top:16px;"><button onclick="startGameScan()" style="padding:10px 20px;background:var(--accent,#7c6af7);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">🔄 Rejouer</button><button onclick="initGamesPage()" style="padding:10px 20px;background:var(--bg-sidebar);color:var(--text-primary);border:1px solid var(--border);border-radius:8px;font-size:13px;cursor:pointer;">← Jeux</button></div></div>';
  }

  function renderQuestion(options) {
    const livesHtml = Array(3).fill(0).map((_, i) => '<span style="font-size:18px;opacity:' + (i < lives ? '1' : '0.2') + ';">📦</span>').join('');
    const comboHtml = combo >= 3 ? '<span style="color:#f97316;font-weight:700;font-size:12px;">🔥 x' + combo + '</span>' : '';
    const multHtml = multiplier > 1 ? '<span style="color:#fbbf24;font-weight:700;font-size:11px;animation:pulse 0.5s infinite;">x2 COMBO!</span>' : '';

    portal.innerHTML = '<div style="display:flex;flex-direction:column;height:100%;background:var(--bg-primary,#12121a);color:var(--text-primary,#fff);">' +
      '<div style="padding:8px 14px;background:var(--bg-sidebar,#1e1e2e);border-bottom:1px solid var(--border,#333);display:flex;align-items:center;gap:8px;flex-shrink:0;">' +
        '<button onclick="initGamesPage()" style="padding:4px 8px;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border);border-radius:4px;cursor:pointer;font-size:11px;">←</button>' +
        '<span style="font-size:12px;font-weight:700;">⚡ Scan Express</span>' +
        '<span style="margin-left:auto;">' + livesHtml + '</span>' +
        '<span style="font-family:monospace;color:var(--accent,#7c6af7);font-size:12px;font-weight:700;">' + score + '</span>' +
      '</div>' +
      '<div id="scan-timer-wrap" style="height:4px;background:#333;flex-shrink:0;"><div id="scan-timer-bar" style="height:100%;width:100%;background:#f87171;transition:width 0.05s linear;"></div></div>' +
      '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:20px;">' +
        '<div id="scan-feedback" style="font-size:18px;font-weight:700;height:24px;transition:all 0.2s;opacity:0;">&nbsp;</div>' +
        '<div style="text-align:center;">' + comboHtml + ' ' + multHtml + '</div>' +
        '<div style="background:var(--bg-sidebar,#1e1e2e);border:1px solid var(--border,#333);border-radius:12px;padding:20px 30px;text-align:center;">' +
          '<div style="font-size:10px;color:var(--text-muted);margin-bottom:6px;">COLIS #' + questionNum + '</div>' +
          genBarcodeSVG() +
          '<div style="font-size:18px;font-weight:700;font-family:monospace;margin-top:10px;letter-spacing:2px;">' + correctCode + '</div>' +
        '</div>' +
        '<div style="font-size:11px;color:var(--text-muted);">Quel est le bon code ?</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;max-width:320px;">' +
          options.map(opt => '<button class="scan-opt" data-code="' + opt + '" style="padding:14px 8px;background:var(--bg-sidebar,#1e1e2e);border:2px solid var(--border,#333);border-radius:10px;color:var(--text-primary,#fff);font-family:monospace;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.1s;letter-spacing:1px;">' + opt + '</button>').join('') +
        '</div>' +
      '</div>' +
    '</div>';

    // Bind buttons
    document.querySelectorAll('.scan-opt').forEach(btn => {
      btn.onclick = () => {
        if (!gameActive) return;
        if (btn.dataset.code === correctCode) { btn.style.background = '#4ade80'; btn.style.color = '#000'; correctAnswer(); }
        else { btn.style.background = '#f87171'; btn.style.color = '#fff'; wrongAnswer(); }
      };
    });
  }

  startGame();
}

window.startGameScan = startGameScan;
