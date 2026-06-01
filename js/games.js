/* js/games.js — Système de mini-jeux chauffeur (SunXP Pro) */

const GAMES_LIST = [
  { id: 'enveloppe', icon: '📬', name: "L'Enveloppe" },
  { id: 'scan', icon: '⚡', name: 'Scan Express' },
  { id: 'dernier', icon: '🏃', name: 'Dernier Colis' },
  { id: 'boite', icon: '📬', name: 'Bonne Boîte' },
  { id: 'chargement', icon: '🏗️', name: 'Chargement Parfait' },
  { id: 'gps', icon: '🗺️', name: 'GPS Cassé' },
  { id: 'memoire', icon: '🧠', name: 'Mémoire Tournée' },
  { id: 'livreur-parfait', icon: '🎯', name: 'Livreur Parfait' }
];

/* ── Scores ───────────────────────────────────────────────── */
function getGameScoresKey(stationId, gameId) { return stationId + '-game-scores-' + gameId; }

function loadLocalScores(stationId, gameId) {
  try { return JSON.parse(localStorage.getItem(getGameScoresKey(stationId, gameId))) || []; } catch (_) { return []; }
}

async function loadStationScores(gameId) {
  const sid = portalStationId || (window.getActiveStationId ? window.getActiveStationId() : null);
  if (!sid) return [];
  // Try Supabase
  if (typeof sb === 'function' && sb()) {
    try {
      const { data } = await sb().from('game_scores').select('*').eq('station_id', sid).eq('game_id', gameId).order('score', { ascending: false });
      if (data && data.length > 0) { localStorage.setItem(getGameScoresKey(sid, gameId), JSON.stringify(data)); return data; }
    } catch (_) {}
  }
  return loadLocalScores(sid, gameId);
}

async function saveScore(gameId, score) {
  const sid = portalStationId || (window.getActiveStationId ? window.getActiveStationId() : null);
  if (!sid || !portalChauffeur) return;
  const nom = ((portalChauffeur.prenom || '') + ' ' + (portalChauffeur.nom || '')).trim();
  const chauffeurId = portalChauffeur.id_amazon || portalChauffeur.id || '';

  // Check if better than existing
  const existing = loadLocalScores(sid, gameId);
  const prev = existing.find(s => s.chauffeur_id === chauffeurId);
  if (prev && prev.score >= score) return; // Not a new high score

  // Update local cache FIRST (synchronous - always works)
  if (prev) { prev.score = score; prev.created_at = new Date().toISOString(); }
  else { existing.push({ chauffeur_nom: nom, chauffeur_id: chauffeurId, station_id: sid, game_id: gameId, score, created_at: new Date().toISOString() }); }
  existing.sort((a, b) => b.score - a.score);
  localStorage.setItem(getGameScoresKey(sid, gameId), JSON.stringify(existing));

  // Then save to Supabase (async, can fail silently)
  if (typeof sb === 'function' && sb()) {
    try {
      await sb().from('game_scores').upsert({
        chauffeur_nom: nom,
        chauffeur_id: chauffeurId,
        station_id: sid,
        game_id: gameId,
        score: score,
        created_at: new Date().toISOString()
      }, { onConflict: 'chauffeur_id,station_id,game_id' });
    } catch (_) {}
  }
}

function getPlayerRank(gameId) {
  const sid = portalStationId || (window.getActiveStationId ? window.getActiveStationId() : null);
  if (!sid || !portalChauffeur) return null;
  const chauffeurId = portalChauffeur.id_amazon || portalChauffeur.id || '';
  const scores = loadLocalScores(sid, gameId);
  const idx = scores.findIndex(s => s.chauffeur_id === chauffeurId);
  return idx >= 0 ? idx + 1 : null;
}

function getPlayerScore(gameId) {
  const sid = portalStationId || (window.getActiveStationId ? window.getActiveStationId() : null);
  if (!sid || !portalChauffeur) return 0;
  const chauffeurId = portalChauffeur.id_amazon || portalChauffeur.id || '';
  const scores = loadLocalScores(sid, gameId);
  const entry = scores.find(s => s.chauffeur_id === chauffeurId);
  return entry ? entry.score : 0;
}

function getGlobalRank() {
  const sid = portalStationId || (window.getActiveStationId ? window.getActiveStationId() : null);
  if (!sid || !portalChauffeur) return null;
  // Sum all game scores per player
  const totals = {};
  GAMES_LIST.forEach(g => {
    const scores = loadLocalScores(sid, g.id);
    scores.forEach(s => {
      if (!totals[s.chauffeur_id]) totals[s.chauffeur_id] = { nom: s.chauffeur_nom, total: 0 };
      totals[s.chauffeur_id].total += s.score;
    });
  });
  const sorted = Object.entries(totals).sort((a, b) => b[1].total - a[1].total);
  const chauffeurId = portalChauffeur.id_amazon || portalChauffeur.id || '';
  const idx = sorted.findIndex(([id]) => id === chauffeurId);
  return idx >= 0 ? { rank: idx + 1, total: sorted.length } : null;
}

/* ── Page principale des jeux ─────────────────────────────── */
function initGamesPage() {
  console.log('initGamesPage appelé');
  window._gameActive = false; // Reset game flag - stops all running game logic
  // Kill any lingering game screen (enveloppe uses a separate div)
  const envScreen = document.getElementById('game-enveloppe-screen');
  if (envScreen) envScreen.remove();
  // Hide hamburger menu during games
  const hamburger = document.getElementById('hamburger-btn');
  if (hamburger) hamburger.style.display = 'none';
  
  // Approche directe : injecter dans le portail chauffeur existant
  const portal = document.getElementById('chauffeur-portal');
  if (portal) {
    portal.innerHTML = '';
    portal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#12121a;display:flex;flex-direction:column;overflow-y:auto;';
    buildGamesContent(portal);
    return;
  }
  
  // Fallback : créer un nouveau div
  let gamesScreen = document.getElementById('games-screen');
  if (gamesScreen) gamesScreen.remove();
  gamesScreen = document.createElement('div');
  gamesScreen.id = 'games-screen';
  gamesScreen.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#12121a;display:flex;flex-direction:column;overflow-y:auto;';
  document.body.appendChild(gamesScreen);
  buildGamesContent(gamesScreen);
}

function buildGamesContent(container) {
  const GAME_RULES = {
    enveloppe: "Lancez l'enveloppe dans la boîte aux lettres ! Maintenez pour charger la puissance, relâchez pour lancer. La boîte s'éloigne à chaque réussite. Score = distance atteinte.",
    scan: "Identifiez le bon code-barres parmi 4 choix ! 5 secondes par colis, 3 vies. Combo x2 après 5 bonnes réponses d'affilée.",
    dernier: "Attrapez les colis qui tombent ! ⭐Golden=+50, 💙Bleu=+1vie, 💜Violet=ralentit, ❌Rouge=fragile(-2vies si raté). Combo x2 après 10 d'affilée.",
    boite: "Trouvez la bonne boîte aux lettres ! Les numéros se ressemblent pour piéger. Le chrono diminue avec les niveaux. 3 vies.",
    chargement: "Remplissez le camion avec les colis ! Cliquez sur la grille pour placer. 100%=niveau suivant. Score basé sur le % de remplissage.",
    gps: "Mémorisez les directions (⬆️⬇️⬅️➡️) puis cliquez votre case d'arrivée. Case exacte=1000pts, 1 case d'écart=700pts. 10 manches.",
    memoire: "Mémorisez l'ordre des adresses en 12s puis cliquez-les dans le bon ordre. 3 vies, combo x points. Ordre parfait = score x2 !",
    'livreur-parfait': "Le défi ultime ! 5 étapes de 30s : Mémoire → Chargement → Scan → Boîte → GPS. Bonus +1000 si tout est fini, +500 si rapide."
  };

  const games = [
    {id:'enveloppe',icon:'📬',name:"L'Enveloppe"},
    {id:'scan',icon:'⚡',name:'Scan Express'},
    {id:'dernier',icon:'🏃',name:'Dernier Colis'},
    {id:'boite',icon:'📬',name:'Bonne Boîte'},
    {id:'chargement',icon:'🏗️',name:'Chargement Parfait'},
    {id:'gps',icon:'🗺️',name:'GPS Cassé'},
    {id:'memoire',icon:'🧠',name:'Mémoire Tournée'}
  ];

  // Map game card ids to Supabase game_ids
  const cardToGameId = {enveloppe:'enveloppe',scan:'scan',dernier:'colis',boite:'boite',chargement:'chargement',gps:'gps',memoire:'memoire'};

  let cardsHtml = games.map(function(g) {
    const gid = cardToGameId[g.id] || g.id;
    const myScore = typeof getPlayerScore === 'function' ? getPlayerScore(gid) : 0;
    return '<div style="background:var(--bg-sidebar);border:1px solid var(--border);border-radius:14px;padding:14px;text-align:center;position:relative;">'
      + '<button onclick="event.stopPropagation();toggleGameInfo(\'' + g.id + '\')" style="position:absolute;top:6px;right:6px;width:20px;height:20px;background:rgba(255,255,255,0.1);border:1px solid var(--border);border-radius:50%;color:var(--text-muted);font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;">ℹ</button>'
      + '<div id="info-' + g.id + '" style="display:none;position:absolute;inset:0;background:var(--bg-sidebar);border-radius:14px;padding:12px;font-size:10px;color:var(--text-muted);text-align:left;z-index:2;overflow:auto;">'
      + '<div style="font-weight:700;color:var(--text-primary);margin-bottom:4px;">' + g.icon + ' ' + g.name + '</div>'
      + '<p style="margin:0 0 8px;">' + GAME_RULES[g.id] + '</p>'
      + '<button onclick="event.stopPropagation();toggleGameInfo(\'' + g.id + '\')" style="padding:3px 8px;background:var(--accent);color:#fff;border:none;border-radius:4px;font-size:9px;cursor:pointer;">Fermer</button>'
      + '</div>'
      + '<div onclick="openGame(\'' + g.id + '\')" style="cursor:pointer;">'
      + '<div style="font-size:28px;">' + g.icon + '</div>'
      + '<div style="font-size:11px;font-weight:700;margin-top:4px;">' + g.name + '</div>'
      + '<div class="game-my-score" data-gid="' + gid + '" style="font-size:9px;color:#fbbf24;margin-top:2px;min-height:14px;">' + (myScore > 0 ? '🏆 ' + myScore : '') + '</div>'
      + '<button style="margin-top:6px;padding:3px 10px;background:var(--accent);color:#fff;border:none;border-radius:6px;font-size:9px;cursor:pointer;">▶ Jouer</button>'
      + '</div>'
      + '</div>';
  }).join('');

  container.innerHTML = `
    <div style="padding:16px;color:var(--text-primary,#fff);">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <button onclick="renderPortal()" style="padding:8px 14px;background:var(--bg-sidebar);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;cursor:pointer;">← Retour</button>
        <span style="font-size:18px;font-weight:700;">🎮 Mes Jeux</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;">
        ${cardsHtml}
      </div>
      <div onclick="openGame('livreur-parfait')" style="margin-top:16px;background:linear-gradient(135deg,rgba(249,115,22,0.15),rgba(239,68,68,0.15));border:2px solid #f97316;border-radius:16px;padding:20px;text-align:center;cursor:pointer;position:relative;">
        <button onclick="event.stopPropagation();toggleGameInfo('livreur-parfait')" style="position:absolute;top:8px;right:8px;width:22px;height:22px;background:rgba(255,255,255,0.1);border:1px solid #f97316;border-radius:50%;color:#f97316;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;">ℹ</button>
        <div id="info-livreur-parfait" style="display:none;position:absolute;inset:0;background:rgba(10,10,26,0.95);border-radius:16px;padding:16px;font-size:11px;color:#d1d5db;text-align:left;z-index:2;overflow:auto;">
          <div style="font-weight:700;color:#f97316;margin-bottom:6px;">🎯 Livreur Parfait</div>
          <p style="margin:0 0 8px;">${GAME_RULES['livreur-parfait']}</p>
          <button onclick="event.stopPropagation();toggleGameInfo('livreur-parfait')" style="padding:4px 10px;background:#f97316;color:#fff;border:none;border-radius:4px;font-size:10px;cursor:pointer;">Fermer</button>
        </div>
        <div style="font-size:40px;">🎯</div>
        <div style="font-size:16px;font-weight:900;margin-top:6px;background:linear-gradient(90deg,#f97316,#fbbf24);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">LIVREUR PARFAIT</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Le défi ultime — 5 étapes enchaînées</div>
        <button style="margin-top:10px;padding:8px 20px;background:linear-gradient(135deg,#f97316,#ef4444);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;">⚡ RELEVER LE DÉFI</button>
      </div>
      <div style="margin-top:20px;">
        <div style="font-size:16px;font-weight:700;margin-bottom:12px;">🏆 Classements Station</div>
        <div id="games-leaderboards" style="display:flex;flex-direction:column;gap:8px;">
          <p style="font-size:11px;color:var(--text-muted);">Chargement...</p>
        </div>
      </div>
    </div>
  `;
  // Load leaderboards from Supabase
  var leaderboardGames = [
    {id:'enveloppe',icon:'📬',name:"L'Enveloppe"},
    {id:'scan',icon:'⚡',name:'Scan Express'},
    {id:'colis',icon:'🏃',name:'Dernier Colis'},
    {id:'boite',icon:'📬',name:'Bonne Boîte'},
    {id:'chargement',icon:'🏗️',name:'Chargement Parfait'},
    {id:'gps',icon:'🗺️',name:'GPS Cassé'},
    {id:'memoire',icon:'🧠',name:'Mémoire Tournée'},
    {id:'livreur-parfait',icon:'🎯',name:'Livreur Parfait'}
  ];
  loadAllLeaderboards(leaderboardGames);
}

async function loadAllLeaderboards(games) {
  const container = document.getElementById('games-leaderboards');
  if (!container) return;
  const sid = (typeof portalStationId !== 'undefined' && portalStationId) ? portalStationId : '';
  if (!sid) { container.innerHTML = '<p style="font-size:11px;color:#6b7280;">Station non définie</p>'; return; }

  let allScores = [];
  if (typeof sb === 'function' && sb()) {
    try {
      const { data } = await sb().from('game_scores').select('*').eq('station_id', sid).order('score', { ascending: false });
      if (data) allScores = data;
    } catch(_) {}
  }

  // Update personal scores on game cards
  const chauffeurId = (typeof portalChauffeur !== 'undefined' && portalChauffeur) ? (portalChauffeur.id_amazon||portalChauffeur.id||'') : '';
  document.querySelectorAll('.game-my-score').forEach(function(el) {
    const gid = el.dataset.gid;
    const myEntry = allScores.find(function(s){return s.game_id === gid && s.chauffeur_id === chauffeurId;});
    if (myEntry) el.textContent = '🏆 ' + myEntry.score;
  });

  let html = '';
  games.forEach(function(g) {
    const gameScores = allScores.filter(function(s){return s.game_id === g.id;}).slice(0, 5);
    html += '<details style="background:var(--bg-sidebar);border:1px solid var(--border);border-radius:10px;padding:10px 12px;">'
      + '<summary style="font-size:12px;font-weight:700;cursor:pointer;color:var(--text-primary);">' + g.icon + ' ' + g.name + ' <span style="font-size:10px;color:var(--text-muted);font-weight:400;">(' + gameScores.length + ' joueurs)</span></summary>'
      + '<div style="margin-top:8px;">';
    if (gameScores.length > 0) {
      gameScores.forEach(function(s, i) {
        html += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:11px;border-bottom:1px solid rgba(255,255,255,0.05);">'
          + '<span>' + (i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.') + ' ' + (s.chauffeur_nom||'Joueur') + '</span>'
          + '<span style="color:#fbbf24;font-weight:700;">' + s.score + '</span></div>';
      });
    } else {
      html += '<div style="font-size:10px;color:#6b7280;padding:4px 0;">Aucun score</div>';
    }
    html += '</div></details>';
  });
  container.innerHTML = html;
}

window.toggleGameInfo = function(gameId) {
  var el = document.getElementById('info-' + gameId);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

/* ── Ouvrir un jeu ────────────────────────────────────────── */
function openGame(gameId) {
  window._gameActive = true;
  const fnMap = {
    enveloppe: 'startGameEnveloppe',
    tetris: 'startGameTetris',
    slalom: 'startGameSlalom',
    scan: 'startGameScan',
    tournee: 'startGameTournee',
    dernier: 'startGameDernier',
    boite: 'startGameBoite',
    chargement: 'startGameChargement',
    gps: 'startGameGPS',
    memoire: 'startGameMemoire',
    'livreur-parfait': 'startGameLivreurParfait'
  };
  const fn = fnMap[gameId];
  if (fn && typeof window[fn] === 'function') {
    window[fn]();
  } else {
    alert('🎮 Ce jeu arrive bientôt !');
  }
}

// Exports globaux
window.initGamesPage = initGamesPage;
window.openGame = openGame;
window.saveScore = saveScore;
window.loadStationScores = loadStationScores;
window.getPlayerRank = getPlayerRank;
window.getPlayerScore = getPlayerScore;
