// iwantcheckmate Bot Engine & Roster Definitions
// 16 Signature Stockfish Variant Bots with Unique AI Personalities, Algorithms, and Dialogue

(function () {
  'use strict';

  // SVG Avatar Generator Helper
  function createAvatar(bgColor, accentColor, innerSvg) {
    return `<svg viewBox="0 0 100 100" class="bot-avatar-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="grad-${bgColor.replace(/[^a-z0-9]/gi, '')}" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="${bgColor}"/>
        </radialGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#grad-${bgColor.replace(/[^a-z0-9]/gi, '')})" />
      <rect x="2" y="2" width="96" height="96" rx="20" fill="none" stroke="${accentColor}" stroke-width="2.5" stroke-opacity="0.6"/>
      ${innerSvg}
    </svg>`;
  }

  // Boltzmann temperature selection for dynamic Elo levels (3600 down to 0)
  function getEloProfile(elo) {
    if (elo >= 3600) return { maxLossCp: 0, tempCp: 1, candidates: 1, thinkMs: 450 };
    if (elo >= 3300) return { maxLossCp: 10, tempCp: 3, candidates: 6, thinkMs: 420 };
    if (elo >= 3000) return { maxLossCp: 20, tempCp: 6, candidates: 8, thinkMs: 400 };
    if (elo >= 2700) return { maxLossCp: 35, tempCp: 10, candidates: 10, thinkMs: 380 };
    if (elo >= 2400) return { maxLossCp: 50, tempCp: 15, candidates: 12, thinkMs: 350 };
    if (elo >= 2100) return { maxLossCp: 75, tempCp: 24, candidates: 14, thinkMs: 320 };
    if (elo >= 1800) return { maxLossCp: 110, tempCp: 36, candidates: 16, thinkMs: 290 };
    if (elo >= 1500) return { maxLossCp: 160, tempCp: 55, candidates: 18, thinkMs: 260 };
    if (elo >= 1200) return { maxLossCp: 230, tempCp: 80, candidates: 18, thinkMs: 230 };
    if (elo >= 900) return { maxLossCp: 350, tempCp: 120, candidates: 18, thinkMs: 200 };
    if (elo >= 600) return { maxLossCp: 550, tempCp: 190, candidates: 18, thinkMs: 180 };
    if (elo >= 300) return { maxLossCp: 900, tempCp: 300, candidates: 18, thinkMs: 160 };
    return { maxLossCp: Infinity, tempCp: 1000, candidates: 18, thinkMs: 150 };
  }

  function pickBoltzmannCandidate(scoredMoves, profile) {
    if (!scoredMoves || scoredMoves.length === 0) return null;
    const bestScore = scoredMoves[0].scoreCp;
    const scoredList = scoredMoves.map(m => ({
      move: m,
      lossCp: Math.max(0, bestScore - m.scoreCp)
    }));

    const eligible = scoredList.filter(item => item.lossCp <= profile.maxLossCp);
    const candidates = eligible.length > 0 ? eligible : [scoredList[0]];

    const weights = candidates.map(item => ({
      move: item.move,
      weight: Math.exp(-item.lossCp / Math.max(1, profile.tempCp))
    }));

    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    let r = Math.random() * totalWeight;
    for (const item of weights) {
      r -= item.weight;
      if (r <= 0) return item.move;
    }
    return weights[weights.length - 1].move;
  }

  function givesCheck(game, move) {
    const clone = new Chess(game.fen());
    const res = clone.move(move);
    return res && clone.in_check();
  }

  function givesMate(game, move) {
    const clone = new Chess(game.fen());
    const res = clone.move(move);
    return res && clone.in_checkmate();
  }

  function hasNonKingPieces(game, color) {
    const board = game.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.color === color && p.type !== 'k') {
          return true;
        }
      }
    }
    return false;
  }

  function getQueenSquare(game, color) {
    const board = game.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.color === color && p.type === 'q') {
          return String.fromCharCode(97 + c) + (8 - r);
        }
      }
    }
    return null;
  }

  function isLightSquare(square) {
    const file = square.charCodeAt(0) - 97;
    const rank = parseInt(square[1], 10) - 1;
    return (file + rank) % 2 === 1;
  }

  // 16 BOTS ROSTER DEFINITION
  const BOTS = [
    {
      id: 'torturefish',
      name: 'TortureFish',
      rating: '???',
      title: 'Stockfish, But It Takes 31 Pieces Before Checkmating You',
      description: 'Refuses to deliver checkmate until every single one of your 15 non-king pieces has been captured and eliminated.',
      category: 'Fish Variants',
      themeColor: '#781d42',
      accentColor: '#f72585',
      avatarSvg: createAvatar('#781d42', '#f72585', `
        <circle cx="50" cy="46" r="26" fill="#3a0ca3" opacity="0.6"/>
        <path d="M 30 65 L 50 25 L 70 65 Z" fill="#f72585"/>
        <circle cx="43" cy="48" r="4.5" fill="#fff"/>
        <circle cx="57" cy="48" r="4.5" fill="#fff"/>
        <circle cx="44" cy="48" r="2.2" fill="#111"/>
        <circle cx="58" cy="48" r="2.2" fill="#111"/>
        <path d="M 40 58 Q 50 52 60 58" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M 30 74 L 70 74 M 35 79 L 65 79 M 42 84 L 58 84" stroke="#f72585" stroke-width="3" stroke-linecap="round"/>
      `),
      quotes: {
        start: ["Do not expect a swift defeat. I will take every piece you own first.", "None of your pieces shall leave this board alive."],
        move: ["Another piece edges closer to my collection.", "You still have pieces left. The game continues."],
        capture: ["One down! The collection grows.", "Piece removed. Keep defending the rest."],
        check: ["Watch your king, but don't worry, I won't mate you yet."],
        checked: ["A futile check. It only delays your army's demise."],
        blunder: ["That piece was offered on a silver platter."],
        win: ["All pieces claimed. Checkmate.", "Perfection. An empty board and a lonely king."],
        loss: ["Impossible! My collection was almost complete!"]
      },
      async selectMove(game, engine, state) {
        const legalMoves = game.moves({ verbose: true });
        if (legalMoves.length === 0) return null;
        const playerColor = game.turn() === 'w' ? 'b' : 'w';

        const hasPieces = hasNonKingPieces(game, playerColor);
        const isValidTortureMove = (m) => {
          if (!hasPieces) return true;
          return !givesMate(game, m);
        };

        const scored = await engine.scoredMoves(game.fen(), legalMoves.length, 600);
        if (scored && scored.length > 0) {
          for (const cand of scored) {
            const mv = legalMoves.find(m => m.from === cand.from && m.to === cand.to && (!cand.promotion || m.promotion === cand.promotion));
            if (mv && isValidTortureMove(mv)) {
              const captureCandidates = scored.filter(c => {
                const cm = legalMoves.find(m => m.from === c.from && m.to === c.to);
                return cm && cm.captured && isValidTortureMove(cm);
              });
              if (captureCandidates.length > 0 && (scored[0].scoreCp - captureCandidates[0].scoreCp < 150)) {
                const bestCap = legalMoves.find(m => m.from === captureCandidates[0].from && m.to === captureCandidates[0].to);
                if (bestCap) return bestCap;
              }
              return mv;
            }
          }
        }

        const nonMating = legalMoves.filter(m => isValidTortureMove(m));
        if (nonMating.length > 0) {
          return nonMating[0];
        }
        return legalMoves[0];
      }
    },

    {
      id: 'blunderfish',
      name: 'BlunderFish',
      rating: 3600,
      title: 'Stockfish, But 5% Chance of Blundering Every Move',
      description: 'Plays at 3600 Grandmaster strength 95% of the time, but has a sudden 5% chance on any move to blunder horrifically.',
      category: 'Fish Variants',
      themeColor: '#1d2d44',
      accentColor: '#4cc9f0',
      avatarSvg: createAvatar('#1d2d44', '#4cc9f0', `
        <ellipse cx="50" cy="50" rx="30" ry="24" fill="#0d1b2a"/>
        <path d="M 75 50 L 92 36 L 92 64 Z" fill="#4cc9f0"/>
        <circle cx="34" cy="44" r="7" fill="#fff"/>
        <circle cx="35" cy="44" r="3.5" fill="#f72585"/>
        <path d="M 32 58 Q 45 64 56 56" stroke="#4cc9f0" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M 48 30 L 58 20 M 60 34 L 72 26" stroke="#ffd166" stroke-width="2.5" stroke-linecap="round"/>
      `),
      quotes: {
        start: ["I calculate 20 million nodes per second... mostly.", "Prepare for Grandmaster precision... unless I slip."],
        move: ["Textbook engine precision.", "Optimal move executed."],
        capture: ["Tactical exchange completed."],
        check: ["Check. My evaluation is soaring."],
        checked: ["A temporary disturbance in the evaluation."],
        blunder: ["Wait... why did my queen go there?!", "Did my mouse slip?! What was that?!", "Calculated risk! ...Okay, pure blunder."],
        win: ["The 95% held strong. Checkmate.", "Statistical superiority achieved."],
        loss: ["Curse that 5% blunder probability!"]
      },
      async selectMove(game, engine, state) {
        const legalMoves = game.moves({ verbose: true });
        if (legalMoves.length === 0) return null;

        if (Math.random() < 0.05) {
          state.justBlundered = true;
          const bestMoveUci = await engine.bestMove(game.fen(), 350);
          const nonBest = legalMoves.filter(m => {
            const uci = m.from + m.to + (m.promotion || '');
            return !bestMoveUci || uci !== (bestMoveUci.from + bestMoveUci.to + (bestMoveUci.promotion || ''));
          });
          const pool = nonBest.length > 0 ? nonBest : legalMoves;
          return pool[Math.floor(Math.random() * pool.length)];
        }

        state.justBlundered = false;
        const best = await engine.bestMove(game.fen(), 400);
        if (best) {
          const match = legalMoves.find(m => m.from === best.from && m.to === best.to && (!best.promotion || m.promotion === best.promotion));
          if (match) return match;
        }
        return legalMoves[0];
      }
    },

    {
      id: 'geometricfish',
      name: 'GeometricFish',
      rating: 3600,
      title: 'Stockfish, But It Plays nth Best Move Where P(n) = (1/2)^n',
      description: 'Plays a weighted geometric probability distribution over Stockfish top moves: 50% 1st best, 25% 2nd best, 12.5% 3rd best, etc.',
      category: 'Fish Variants',
      themeColor: '#2b2d42',
      accentColor: '#8338ec',
      avatarSvg: createAvatar('#2b2d42', '#8338ec', `
        <polygon points="50,15 85,75 15,75" fill="#1e1f29" stroke="#8338ec" stroke-width="3"/>
        <circle cx="50" cy="52" r="14" fill="#ff006e" opacity="0.8"/>
        <text x="50" y="57" font-size="14" font-weight="900" fill="#fff" text-anchor="middle" font-family="monospace">1/2ⁿ</text>
        <circle cx="50" cy="20" r="3" fill="#3a86ff"/>
        <circle cx="82" cy="73" r="3" fill="#3a86ff"/>
        <circle cx="18" cy="73" r="3" fill="#3a86ff"/>
      `),
      quotes: {
        start: ["Rolling the geometric dice for every turn. P(n) = (1/2)^n.", "Will you face move #1 (50%) or move #5 (3%)?"],
        move: ["P(1)=50%, P(2)=25%... sampled!", "The geometric distribution has spoken."],
        capture: ["Geometric calculation favors taking that piece."],
        check: ["Check delivered from the probability curve."],
        checked: ["Rerunning distribution under check."],
        blunder: ["Ah, that was in the thin tail of the distribution!"],
        win: ["Probability favored victory. Checkmate.", "The geometric curve converges on mate."],
        loss: ["The probability distribution betrayed me."]
      },
      async selectMove(game, engine, state) {
        const legalMoves = game.moves({ verbose: true });
        if (legalMoves.length === 0) return null;

        const weights = [0.50, 0.25, 0.125, 0.0625, 0.0375, 0.025];
        const ranked = await engine.rankedMoves(game.fen(), weights.length, 450);

        if (ranked && ranked.length > 0) {
          const count = Math.min(weights.length, ranked.length);
          const activeWeights = weights.slice(0, count);
          const sum = activeWeights.reduce((a, b) => a + b, 0);
          let r = Math.random() * sum;
          let chosenIdx = count - 1;
          for (let i = 0; i < count; i++) {
            r -= activeWeights[i];
            if (r <= 0) {
              chosenIdx = i;
              break;
            }
          }
          const chosenUci = ranked[chosenIdx];
          state.lastRankChosen = chosenIdx + 1;
          const match = legalMoves.find(m => m.from === chosenUci.from && m.to === chosenUci.to && (!chosenUci.promotion || m.promotion === chosenUci.promotion));
          if (match) return match;
        }

        return legalMoves[0];
      }
    },

    {
      id: 'stockfish-tony',
      name: 'Stockfish / Tony',
      rating: 3600,
      title: 'Stockfish, But It Alternates Between 0 ELO and 3600 ELO',
      description: 'Starts at 3600 Elo as Stockfish. Every single time the bot captures a piece, it swaps personalities with 250 Elo Tony!',
      category: 'Fish Variants',
      themeColor: '#14213d',
      accentColor: '#fca311',
      avatarSvg: createAvatar('#14213d', '#fca311', `
        <clipPath id="split-clip">
          <rect x="0" y="0" width="50" height="100"/>
        </clipPath>
        <!-- Left: Stockfish 3600 -->
        <g clip-path="url(#split-clip)">
          <rect width="100" height="100" fill="#00121e"/>
          <circle cx="36" cy="45" r="16" fill="#3a86ff"/>
          <text x="36" y="50" font-size="12" font-weight="900" fill="#fff" text-anchor="middle">3600</text>
        </g>
        <!-- Right: Tony 250 -->
        <g transform="translate(50, 0)">
          <rect width="50" height="100" fill="#4a0e17"/>
          <circle cx="14" cy="45" r="16" fill="#fca311"/>
          <text x="14" y="50" font-size="12" font-weight="900" fill="#111" text-anchor="middle">250</text>
        </g>
        <line x1="50" y1="0" x2="50" y2="100" stroke="#fff" stroke-width="2" stroke-dasharray="4,4"/>
      `),
      quotes: {
        start: ["I am Stockfish (3600)! But beware... if I capture, Tony wakes up.", "One bite and I might turn into a beginner!"],
        move: ["Playing with current persona.", "Next capture flips the switch!"],
        capture: ["A capture! The transformation occurs now!", "Swap activated! Personality exchanged!"],
        check: ["Check from my current persona!"],
        checked: ["Under check! Hold the personality together!"],
        blunder: ["That was definitely Tony's move...", "Who let Tony touch the keyboard?!"],
        win: ["Checkmate! We worked together... sort of."],
        loss: ["Tony took over at the worst possible moment!"]
      },
      async selectMove(game, engine, state) {
        const legalMoves = game.moves({ verbose: true });
        if (legalMoves.length === 0) return null;

        const isTony = (state.botCaptures || 0) % 2 === 1;

        if (isTony) {
          const mateMove = legalMoves.find(m => givesMate(game, m));
          if (mateMove) return mateMove;

          const scored = await engine.rankedMoves(game.fen(), Math.min(10, legalMoves.length), 200);
          if (scored && scored.length > 2) {
            const pick = scored[Math.floor(scored.length / 2) + Math.floor(Math.random() * (scored.length / 2))];
            const match = legalMoves.find(m => m.from === pick.from && m.to === pick.to);
            if (match) return match;
          }
          return legalMoves[Math.floor(Math.random() * legalMoves.length)];
        } else {
          const best = await engine.bestMove(game.fen(), 400);
          if (best) {
            const match = legalMoves.find(m => m.from === best.from && m.to === best.to && (!best.promotion || m.promotion === best.promotion));
            if (match) return match;
          }
          return legalMoves[0];
        }
      }
    },

    {
      id: 'panicfish',
      name: 'PanicFish',
      rating: 3600,
      title: 'Stockfish, But It Loses 300 ELO When I Give Check',
      description: 'Starts at an invincible 3600 Elo, but whenever you put its King in check, it loses 300 Elo instantly in blind panic!',
      category: 'Fish Variants',
      themeColor: '#3d0814',
      accentColor: '#e63946',
      avatarSvg: createAvatar('#3d0814', '#e63946', `
        <circle cx="50" cy="50" r="32" fill="#1a0409" stroke="#e63946" stroke-width="3"/>
        <circle cx="38" cy="40" r="7" fill="#fff"/>
        <circle cx="62" cy="40" r="7" fill="#fff"/>
        <circle cx="38" cy="40" r="3.5" fill="#111"/>
        <circle cx="62" cy="40" r="3.5" fill="#111"/>
        <ellipse cx="50" cy="62" rx="10" ry="14" fill="#e63946"/>
        <path d="M 28 26 L 36 32 M 72 26 L 64 32" stroke="#ffb703" stroke-width="3" stroke-linecap="round"/>
        <path d="M 50 16 L 50 24" stroke="#ffb703" stroke-width="3" stroke-linecap="round"/>
      `),
      quotes: {
        start: ["I am invincible at 3600 Elo! Don't you dare touch my king!", "3600 Elo calm and collected. Please don't check me..."],
        move: ["Still breathing... still calculating.", "Maintaining stability."],
        capture: ["Defending my territory with force."],
        check: ["I give check! Take that!"],
        checked: ["AAAHHH! CHECK?! MY ELO! IT BURNS -300!", "PANIC! Sound the alarms! The king is in danger!", "WHY ARE YOU CHECKING ME?! -300 ELO!"],
        blunder: ["I was panicking so hard I dropped a piece!"],
        win: ["Phew... I survived the anxiety! Checkmate."],
        loss: ["Too many checks... my brain melted to 0 Elo..."]
      },
      async selectMove(game, engine, state) {
        const legalMoves = game.moves({ verbose: true });
        if (legalMoves.length === 0) return null;

        const elo = state.dynamicElo !== undefined ? state.dynamicElo : 3600;
        if (elo >= 3600) {
          const best = await engine.bestMove(game.fen(), 450);
          if (best) {
            const match = legalMoves.find(m => m.from === best.from && m.to === best.to && (!best.promotion || m.promotion === best.promotion));
            if (match) return match;
          }
          return legalMoves[0];
        }

        const profile = getEloProfile(elo);
        const scored = await engine.scoredMoves(game.fen(), profile.candidates, profile.thinkMs);
        const picked = pickBoltzmannCandidate(scored, profile);
        if (picked) {
          const match = legalMoves.find(m => m.from === picked.from && m.to === picked.to && (!picked.promotion || m.promotion === picked.promotion));
          if (match) return match;
        }

        return legalMoves[Math.floor(Math.random() * legalMoves.length)];
      }
    },

    {
      id: 'tiredfish',
      name: 'TiredFish',
      rating: 3600,
      title: 'Stockfish, But It Loses 50 ELO Every Move',
      description: 'Starts at 3600 Elo, but grows increasingly exhausted with every turn, shedding 50 Elo on every single move played.',
      category: 'Fish Variants',
      themeColor: '#1c2541',
      accentColor: '#5bc0be',
      avatarSvg: createAvatar('#1c2541', '#5bc0be', `
        <ellipse cx="50" cy="54" rx="30" ry="24" fill="#0b132b"/>
        <path d="M 32 46 Q 42 40 48 46" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M 54 46 Q 64 40 70 46" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M 38 46 A 4 4 0 0 1 42 49" stroke="#111" stroke-width="2.5" fill="none"/>
        <path d="M 60 46 A 4 4 0 0 1 64 49" stroke="#111" stroke-width="2.5" fill="none"/>
        <ellipse cx="50" cy="62" rx="6" ry="8" fill="#5bc0be"/>
        <text x="74" y="28" font-size="14" font-weight="900" fill="#ffd166">Z</text>
        <text x="82" y="18" font-size="11" font-weight="900" fill="#ffd166">z</text>
        <text x="88" y="10" font-size="8" font-weight="900" fill="#ffd166">z</text>
      `),
      quotes: {
        start: ["*Yawn*... 3600 Elo for now, but I won't last long.", "Can we make this quick? I'm getting sleepier by the turn."],
        move: ["Another move played... -50 Elo... so sleepy...", "*Sigh*... down another 50 Elo..."],
        capture: ["Taking that piece took too much energy."],
        check: ["Check... *yawns loudly*."],
        checked: ["Waking up briefly to dodge check..."],
        blunder: ["Fell asleep at the board for a second there."],
        win: ["Finally... checkmate. Now I can take a nap."],
        loss: ["*Snores*... 0 Elo reached... goodnight..."]
      },
      async selectMove(game, engine, state) {
        const legalMoves = game.moves({ verbose: true });
        if (legalMoves.length === 0) return null;

        const elo = state.dynamicElo !== undefined ? state.dynamicElo : 3600;
        if (elo >= 3600) {
          const best = await engine.bestMove(game.fen(), 400);
          if (best) {
            const match = legalMoves.find(m => m.from === best.from && m.to === best.to && (!best.promotion || m.promotion === best.promotion));
            if (match) return match;
          }
          return legalMoves[0];
        }

        const profile = getEloProfile(elo);
        const scored = await engine.scoredMoves(game.fen(), profile.candidates, profile.thinkMs);
        const picked = pickBoltzmannCandidate(scored, profile);
        if (picked) {
          const match = legalMoves.find(m => m.from === picked.from && m.to === picked.to && (!picked.promotion || m.promotion === picked.promotion));
          if (match) return match;
        }

        return legalMoves[Math.floor(Math.random() * legalMoves.length)];
      }
    },

    {
      id: 'tony-gains',
      name: 'Tony (Gains)',
      rating: 250,
      title: "Tony, But He Gains 200 ELO If You Don't Play the Best Move",
      description: "Starts as a humble 250 Elo beginner, but whenever you play a move that isn't the absolute top engine choice, Tony absorbs +200 Elo!",
      category: 'Fish Variants',
      themeColor: '#370617',
      accentColor: '#ffb703',
      avatarSvg: createAvatar('#370617', '#ffb703', `
        <circle cx="50" cy="50" r="30" fill="#6a040f"/>
        <path d="M 28 54 Q 32 38 46 42 Q 54 36 62 44 Q 72 48 70 60 Q 64 68 50 68 Q 32 68 28 54 Z" fill="#ffb703"/>
        <text x="50" y="58" font-size="12" font-weight="900" fill="#111" text-anchor="middle">+200</text>
        <path d="M 20 25 L 35 15 M 80 25 L 65 15" stroke="#ffb703" stroke-width="3" stroke-linecap="round"/>
      `),
      quotes: {
        start: ["Hey! I'm Tony at 250 Elo. Play any inaccuracy and I get SWOLE!", "Feed me inaccuracies! +200 Elo per mistake!"],
        move: ["Pumping chess iron! Next mistake powers me up!", "Watch out, I'm feeling stronger already!"],
        capture: ["Nom nom nom! That piece looked tasty!"],
        check: ["Check! Look at these gains!"],
        checked: ["Dodging check builds character and muscle!"],
        blunder: ["Wait, was that a blunder on my part? Still growing!"],
        win: ["From 250 to Grandmaster! Look at these GAINS! Checkmate!"],
        loss: ["You played too accurately... no gains for Tony today..."]
      },
      async selectMove(game, engine, state) {
        const legalMoves = game.moves({ verbose: true });
        if (legalMoves.length === 0) return null;

        const elo = state.dynamicElo !== undefined ? state.dynamicElo : 250;
        if (elo >= 3600) {
          const best = await engine.bestMove(game.fen(), 450);
          if (best) {
            const match = legalMoves.find(m => m.from === best.from && m.to === best.to && (!best.promotion || m.promotion === best.promotion));
            if (match) return match;
          }
          return legalMoves[0];
        }

        const profile = getEloProfile(elo);
        const scored = await engine.scoredMoves(game.fen(), profile.candidates, profile.thinkMs);
        const picked = pickBoltzmannCandidate(scored, profile);
        if (picked) {
          const match = legalMoves.find(m => m.from === picked.from && m.to === picked.to && (!picked.promotion || m.promotion === picked.promotion));
          if (match) return match;
        }

        return legalMoves[Math.floor(Math.random() * legalMoves.length)];
      }
    },

    {
      id: 'drawfish',
      name: 'DrawFish',
      rating: '???',
      title: 'Stockfish, But It Plays for 0.00 Evaluation',
      description: 'Calculates the move that brings the position evaluation as close to dead even (0.00 centipawns) as humanly possible.',
      category: 'Fish Variants',
      themeColor: '#1e3d59',
      accentColor: '#17b978',
      avatarSvg: createAvatar('#1e3d59', '#17b978', `
        <circle cx="50" cy="50" r="30" fill="#17252a"/>
        <rect x="22" y="46" width="56" height="8" rx="4" fill="#17b978"/>
        <rect x="46" y="26" width="8" height="48" rx="4" fill="#17b978"/>
        <circle cx="30" cy="50" r="8" fill="#43dde6"/>
        <circle cx="70" cy="50" r="8" fill="#43dde6"/>
        <text x="50" y="86" font-size="11" font-weight="900" fill="#17b978" text-anchor="middle" font-family="monospace">0.00</text>
      `),
      quotes: {
        start: ["I do not seek victory or defeat. Perfectly balanced: 0.00.", "Every move I make strives for the ideal 0.00 equilibrium."],
        move: ["Adjusting evaluation closer to 0.00.", "Equilibrium preserved."],
        capture: ["Equalizing material on the board."],
        check: ["Checking to force a balanced reply."],
        checked: ["Recalculating toward 0.00 balance."],
        blunder: ["Wait, that swung the eval away from zero!"],
        win: ["Accidental checkmate! I only wanted a draw!"],
        loss: ["The evaluation drifted beyond my control."]
      },
      async selectMove(game, engine, state) {
        const legalMoves = game.moves({ verbose: true });
        if (legalMoves.length === 0) return null;

        const scored = await engine.scoredMoves(game.fen(), legalMoves.length, 600);
        if (scored && scored.length > 0) {
          let bestDelta = Infinity;
          let bestCand = scored[0];
          for (const cand of scored) {
            const delta = Math.abs(cand.scoreCp);
            if (delta < bestDelta) {
              bestDelta = delta;
              bestCand = cand;
            }
          }
          state.lastEvalTarget = (bestCand.scoreCp / 100).toFixed(2);
          const match = legalMoves.find(m => m.from === bestCand.from && m.to === bestCand.to && (!bestCand.promotion || m.promotion === bestCand.promotion));
          if (match) return match;
        }

        return legalMoves[0];
      }
    },

    {
      id: 'betafish',
      name: 'BetaFish',
      rating: '???',
      title: 'Stockfish, But It Plays the 2nd Best Move…',
      description: 'Strictly refuses to play the best engine move, always selecting Stockfish\'s exact #2 candidate in every position.',
      category: 'Fish Variants',
      themeColor: '#283618',
      accentColor: '#dda15e',
      avatarSvg: createAvatar('#283618', '#dda15e', `
        <circle cx="50" cy="50" r="30" fill="#141c0b"/>
        <circle cx="50" cy="48" r="18" fill="#606c38" stroke="#dda15e" stroke-width="3"/>
        <text x="50" y="55" font-size="20" font-weight="900" fill="#fefae0" text-anchor="middle" font-family="serif">#2</text>
        <path d="M 38 72 L 50 64 L 62 72" stroke="#dda15e" stroke-width="3" fill="none" stroke-linecap="round"/>
      `),
      quotes: {
        start: ["First place is overrated. I always play move #2.", "Silver medal precision on every turn."],
        move: ["Discarded #1, executing #2.", "Second best is the new best."],
        capture: ["Taking your piece was my second choice."],
        check: ["Checking you with my secondary candidate."],
        checked: ["Escaping check with the second-best route."],
        blunder: ["Move #2 had an unforeseen trap!"],
        win: ["Even second-best moves can checkmate. GG.", "Who needs #1 when #2 wins?"],
        loss: ["Perhaps move #1 was actually necessary there..."]
      },
      async selectMove(game, engine, state) {
        const legalMoves = game.moves({ verbose: true });
        if (legalMoves.length === 0) return null;

        const ranked = await engine.rankedMoves(game.fen(), 2, 500);
        if (ranked && ranked.length >= 2) {
          const secondBest = ranked[1];
          const match = legalMoves.find(m => m.from === secondBest.from && m.to === secondBest.to && (!secondBest.promotion || m.promotion === secondBest.promotion));
          if (match) return match;
        } else if (ranked && ranked.length === 1) {
          const match = legalMoves.find(m => m.from === ranked[0].from && m.to === ranked[0].to);
          if (match) return match;
        }

        return legalMoves[0];
      }
    },

    {
      id: 'clockfish',
      name: 'ClockFish',
      rating: 3600,
      title: 'Stockfish, But It Gains 3600 ELO in 5 Seconds…',
      description: 'On its turn, its Elo starts at 0 and climbs by +100 every ~140ms up to 3600 over 5 seconds. Move fast or face maximum Stockfish!',
      category: 'Fish Variants',
      themeColor: '#003049',
      accentColor: '#f77f00',
      avatarSvg: createAvatar('#003049', '#f77f00', `
        <circle cx="50" cy="54" r="28" fill="#001824" stroke="#f77f00" stroke-width="3"/>
        <rect x="46" y="16" width="8" height="10" rx="3" fill="#f77f00"/>
        <line x1="50" y1="54" x2="50" y2="36" stroke="#fcbf49" stroke-width="3" stroke-linecap="round"/>
        <line x1="50" y1="54" x2="64" y2="54" stroke="#d62828" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="50" cy="54" r="4" fill="#fff"/>
      `),
      quotes: {
        start: ["The clock is ticking! I power up from 0 to 3600 Elo in 5 seconds!", "Every second I think makes me deadlier!"],
        move: ["Tick-tock! Rating reached, move dispatched!", "Timer stopped. Calculation fired."],
        capture: ["Harvested at peak clock power."],
        check: ["High-speed calculation check!"],
        checked: ["Quick check dodge before timer runs out!"],
        blunder: ["Moved too early before my rating loaded!"],
        win: ["Clock expired at 3600 Elo. Checkmate.", "Full power reached! Victory."],
        loss: ["Beaten before my timer could ramp up!"]
      },
      async selectMove(game, engine, state) {
        const legalMoves = game.moves({ verbose: true });
        if (legalMoves.length === 0) return null;

        const currentElo = state.clockElo !== undefined ? state.clockElo : 3600;
        if (currentElo >= 3600) {
          const best = await engine.bestMove(game.fen(), 500);
          if (best) {
            const match = legalMoves.find(m => m.from === best.from && m.to === best.to && (!best.promotion || m.promotion === best.promotion));
            if (match) return match;
          }
          return legalMoves[0];
        }

        const profile = getEloProfile(currentElo);
        const scored = await engine.scoredMoves(game.fen(), profile.candidates, profile.thinkMs);
        const picked = pickBoltzmannCandidate(scored, profile);
        if (picked) {
          const match = legalMoves.find(m => m.from === picked.from && m.to === picked.to && (!picked.promotion || m.promotion === picked.promotion));
          if (match) return match;
        }

        return legalMoves[Math.floor(Math.random() * legalMoves.length)];
      }
    },

    {
      id: 'mirrorfish',
      name: 'MirrorFish',
      rating: '???',
      title: 'Stockfish, But It Copies Your Move Quality…',
      description: 'Analyses the exact rank of your last move (1st best, 2nd best, 3rd best) and replies with a move of identical quality.',
      category: 'Fish Variants',
      themeColor: '#240046',
      accentColor: '#9d4edd',
      avatarSvg: createAvatar('#240046', '#9d4edd', `
        <rect x="25" y="20" width="50" height="60" rx="12" fill="#10002b" stroke="#c77dff" stroke-width="3"/>
        <line x1="34" y1="28" x2="66" y2="72" stroke="#e0aaff" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
        <line x1="42" y1="28" x2="66" y2="56" stroke="#e0aaff" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
        <circle cx="50" cy="50" r="10" fill="#7b2cbf" opacity="0.7"/>
      `),
      quotes: {
        start: ["I am your reflection. If you play like Magnus, so do I. If you blunder, so do I.", "Your move quality determines my move quality."],
        move: ["Mirroring your accuracy rank.", "You gave me quality, I return quality."],
        capture: ["Reflecting your aggressive energy."],
        check: ["Checking back in response to your pressure."],
        checked: ["Evaluating your check's rank to mirror it."],
        blunder: ["You played a low-ranked move, so I mirrored a blunder!"],
        win: ["Your reflection caught up with you. Checkmate."],
        loss: ["You outplayed your own reflection! Well played."]
      },
      async selectMove(game, engine, state) {
        const legalMoves = game.moves({ verbose: true });
        if (legalMoves.length === 0) return null;

        const targetRank = state.playerLastMoveRank || 1;
        const ranked = await engine.rankedMoves(game.fen(), Math.max(5, targetRank), 500);

        if (ranked && ranked.length > 0) {
          const moveIdx = Math.min(targetRank - 1, ranked.length - 1);
          const pick = ranked[moveIdx];
          const match = legalMoves.find(m => m.from === pick.from && m.to === pick.to && (!pick.promotion || m.promotion === pick.promotion));
          if (match) return match;
        }

        return legalMoves[0];
      }
    },

    {
      id: 'zebrafish',
      name: 'ZebraFish',
      rating: '???',
      title: 'Stockfish, But It Alternates Playing Light and Dark Squares.',
      description: 'Strictly forced to alternate moving pieces onto light squares, then dark squares, then light squares, back and forth.',
      category: 'Fish Variants',
      themeColor: '#2b2d42',
      accentColor: '#edf2f4',
      avatarSvg: createAvatar('#2b2d42', '#edf2f4', `
        <circle cx="50" cy="50" r="30" fill="#111" stroke="#fff" stroke-width="2.5"/>
        <path d="M 24 40 L 40 32 M 22 50 L 48 42 M 24 60 L 42 56" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
        <path d="M 76 40 L 60 32 M 78 50 L 52 42 M 76 60 L 58 56" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
        <circle cx="50" cy="50" r="6" fill="#8d99ae"/>
      `),
      quotes: {
        start: ["Black, white, black, white. I alternate between light and dark squares!", "Stripes dictate my moves: light square, then dark square."],
        move: ["Destination matches target square color.", "Alternating square pattern maintained."],
        capture: ["Captured on the designated square color!"],
        check: ["Check delivered on the correct square tone."],
        checked: ["Escaping check while preserving zebra parity."],
        blunder: ["Square color restriction forced an awkward move!"],
        win: ["Pattern complete. Zebra checkmate."],
        loss: ["The zebra pattern boxed me in!"]
      },
      async selectMove(game, engine, state) {
        const legalMoves = game.moves({ verbose: true });
        if (legalMoves.length === 0) return null;

        const targetLight = state.zebraTargetLight !== undefined ? state.zebraTargetLight : true;
        const matchingMoves = legalMoves.filter(m => isLightSquare(m.to) === targetLight);

        const candidates = matchingMoves.length > 0 ? matchingMoves : legalMoves;
        const ranked = await engine.rankedMoves(game.fen(), legalMoves.length, 500);

        if (ranked && ranked.length > 0) {
          for (const cand of ranked) {
            const match = candidates.find(m => m.from === cand.from && m.to === cand.to && (!cand.promotion || m.promotion === cand.promotion));
            if (match) return match;
          }
        }

        return candidates[0];
      }
    },

    {
      id: 'simpfish',
      name: 'SimpFish',
      rating: '???',
      title: 'Stockfish, But It Captures Your Queen First.',
      description: 'Utterly obsessed with your Queen. It refuses to deliver checkmate until your Queen has been personally hunted down and captured.',
      category: 'Fish Variants',
      themeColor: '#590d22',
      accentColor: '#ff4d6d',
      avatarSvg: createAvatar('#590d22', '#ff4d6d', `
        <circle cx="50" cy="50" r="30" fill="#2b0914"/>
        <path d="M 50 68 C 30 52 24 40 32 32 C 40 24 48 30 50 36 C 52 30 60 24 68 32 C 76 40 70 52 50 68 Z" fill="#ff4d6d"/>
        <circle cx="50" cy="30" r="3" fill="#ffb3c1"/>
      `),
      quotes: {
        start: ["Where is your Queen? She is all that matters on this board.", "I will capture your Queen before anything else."],
        move: ["Creeping closer to your Queen...", "My eyes are only on the Queen."],
        capture: ["Your Queen is mine! Now... I can win.", "Queen eliminated! The spell is broken!"],
        check: ["Checking around the Queen!"],
        checked: ["Don't distract me, where is the Queen?"],
        blunder: ["I was too focused on the Queen to see that!"],
        win: ["Queen captured, King conquered. Perfection."],
        loss: ["I spent all game chasing the Queen and lost!"]
      },
      async selectMove(game, engine, state) {
        const legalMoves = game.moves({ verbose: true });
        if (legalMoves.length === 0) return null;

        const playerColor = game.turn() === 'w' ? 'b' : 'w';
        const qSquare = getQueenSquare(game, playerColor);

        if (!qSquare) {
          const best = await engine.bestMove(game.fen(), 400);
          if (best) {
            const match = legalMoves.find(m => m.from === best.from && m.to === best.to);
            if (match) return match;
          }
          return legalMoves[0];
        }

        const queenCapture = legalMoves.find(m => m.to === qSquare && m.captured === 'q');
        if (queenCapture) {
          return queenCapture;
        }

        const nonMating = legalMoves.filter(m => !givesMate(game, m));
        const pool = nonMating.length > 0 ? nonMating : legalMoves;

        const scored = await engine.scoredMoves(game.fen(), pool.length, 500);
        if (scored && scored.length > 0) {
          for (const cand of scored) {
            const match = pool.find(m => m.from === cand.from && m.to === cand.to && (!cand.promotion || m.promotion === cand.promotion));
            if (match) return match;
          }
        }

        return pool[0];
      }
    },

    {
      id: 'checkfish',
      name: 'CheckFish',
      rating: '???',
      title: 'Stockfish, But If It Can Give Check, It Must',
      description: 'Compulsive checking disorder: whenever any legal move can deliver check to your king, CheckFish is strictly compelled to play it.',
      category: 'Fish Variants',
      themeColor: '#7209b7',
      accentColor: '#f72585',
      avatarSvg: createAvatar('#7209b7', '#f72585', `
        <circle cx="50" cy="50" r="30" fill="#3a0ca3"/>
        <circle cx="50" cy="50" r="18" fill="none" stroke="#f72585" stroke-width="3"/>
        <line x1="50" y1="24" x2="50" y2="76" stroke="#4cc9f0" stroke-width="2.5"/>
        <line x1="24" y1="50" x2="76" y2="50" stroke="#4cc9f0" stroke-width="2.5"/>
        <text x="50" y="55" font-size="14" font-weight="900" fill="#fff" text-anchor="middle">+</text>
      `),
      quotes: {
        start: ["If there is a check, I MUST give it. No exceptions!", "Always check, it might be mate!"],
        move: ["No checks available, playing positional engine move.", "Seeking the next check opportunity."],
        capture: ["A checking capture! Double satisfaction!"],
        check: ["CHECK! The rule commands, and I obey!", "CHECK! Could never pass that up!"],
        checked: ["Can I check you back immediately?!"],
        blunder: ["I gave check even though it hung my piece... I couldn't resist!"],
        win: ["The checks never stopped! Checkmate!"],
        loss: ["Forced checks ran me into a corner!"]
      },
      async selectMove(game, engine, state) {
        const legalMoves = game.moves({ verbose: true });
        if (legalMoves.length === 0) return null;

        const checkingMoves = legalMoves.filter(m => givesCheck(game, m));

        if (checkingMoves.length > 0) {
          const scored = await engine.scoredMoves(game.fen(), legalMoves.length, 500);
          if (scored && scored.length > 0) {
            for (const cand of scored) {
              const match = checkingMoves.find(m => m.from === cand.from && m.to === cand.to && (!cand.promotion || m.promotion === cand.promotion));
              if (match) return match;
            }
          }
          return checkingMoves[0];
        }

        const best = await engine.bestMove(game.fen(), 400);
        if (best) {
          const match = legalMoves.find(m => m.from === best.from && m.to === best.to);
          if (match) return match;
        }
        return legalMoves[0];
      }
    },

    {
      id: 'scaredfish',
      name: 'ScaredFish',
      rating: '???',
      title: 'Stockfish, But It Thinks Your Pawns are Queens',
      description: 'Suffers severe paranoia: during engine evaluation, every single one of your innocent pawns is hallucinated as a terrifying Queen!',
      category: 'Fish Variants',
      themeColor: '#03045e',
      accentColor: '#00b4d8',
      avatarSvg: createAvatar('#03045e', '#00b4d8', `
        <circle cx="50" cy="50" r="30" fill="#023e8a"/>
        <circle cx="38" cy="44" r="8" fill="#fff"/>
        <circle cx="62" cy="44" r="8" fill="#fff"/>
        <circle cx="40" cy="45" r="3.5" fill="#111"/>
        <circle cx="64" cy="45" r="3.5" fill="#111"/>
        <path d="M 36 62 Q 44 56 50 62 Q 56 68 64 62" stroke="#caf0f8" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M 40 28 L 44 20 L 50 26 L 56 20 L 60 28 Z" fill="#ffd166"/>
      `),
      quotes: {
        start: ["Those pawns... they're not pawns... THEY ARE ALL QUEENS!", "Stay back! Don't push that eight-queen army toward me!"],
        move: ["DODGING THOSE GIANT PAWN-QUEENS!", "Trying to navigate this field of queens..."],
        capture: ["I ELIMINATED ONE OF THE GIANT QUEENS! HUGE VICTORY!"],
        check: ["Checking you before your queen-pawns get me!"],
        checked: ["THEY'RE CORNERING ME! ALL NINE OF THEM!"],
        blunder: ["I dodged an innocent pawn because I thought it was royal!"],
        win: ["Against an army of eight queens, I somehow survived?! Checkmate!"],
        loss: ["The pawn-queens overwhelmed my fragile mind..."]
      },
      async selectMove(game, engine, state) {
        const legalMoves = game.moves({ verbose: true });
        if (legalMoves.length === 0) return null;

        const turn = game.turn();
        const oppPawnChar = turn === 'w' ? 'p' : 'P';
        const oppQueenChar = turn === 'w' ? 'q' : 'Q';

        const fenParts = game.fen().split(' ');
        fenParts[0] = fenParts[0].split(oppPawnChar).join(oppQueenChar);
        const scaryFen = fenParts.join(' ');

        try {
          const ranked = await engine.rankedMoves(scaryFen, Math.min(10, legalMoves.length), 500);
          if (ranked && ranked.length > 0) {
            for (const cand of ranked) {
              const match = legalMoves.find(m => m.from === cand.from && m.to === cand.to && (!cand.promotion || m.promotion === cand.promotion));
              if (match) return match;
            }
          }
        } catch (e) {
          console.warn('ScaredFish imaginary-queen evaluation fallback:', e);
        }

        const best = await engine.bestMove(game.fen(), 350);
        if (best) {
          const match = legalMoves.find(m => m.from === best.from && m.to === best.to);
          if (match) return match;
        }
        return legalMoves[0];
      }
    },

    {
      id: 'tony-normal',
      name: 'Tony (Normal)',
      rating: 2100,
      title: 'Tony: Attacking Master',
      description: 'Human-like 2100 master chess bot featuring aggressive Caro-Kann lines, forward piece outposts, and king attack pressure.',
      category: 'Normal',
      themeColor: '#2b1b17',
      accentColor: '#e07a5f',
      avatarSvg: createAvatar('#2b1b17', '#e07a5f', `
        <circle cx="50" cy="50" r="30" fill="#3d261d"/>
        <rect x="28" y="40" width="18" height="10" rx="3" fill="#111" stroke="#e07a5f" stroke-width="1.5"/>
        <rect x="54" y="40" width="18" height="10" rx="3" fill="#111" stroke="#e07a5f" stroke-width="1.5"/>
        <line x1="46" y1="44" x2="54" y2="44" stroke="#e07a5f" stroke-width="2"/>
        <path d="M 42 62 Q 54 66 60 58" stroke="#f4a261" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      `),
      quotes: {
        start: ["I'm Tony! 2100 Elo club player. Let's see some good chess!", "Prepare for aggressive tactical play!"],
        move: ["Classic active piece play.", "Pushing for king initiative."],
        capture: ["Material secured with tempo."],
        check: ["Check! Feel the pressure."],
        checked: ["Active defense, counter-attack incoming."],
        blunder: ["Ouch, that was a messy tactical slip."],
        win: ["Solid game! That's how we play at the club. Checkmate!"],
        loss: ["Great game, you completely outcalculated me!"]
      },
      async selectMove(game, engine, state) {
        const legalMoves = game.moves({ verbose: true });
        if (legalMoves.length === 0) return null;

        const scored = await engine.scoredMoves(game.fen(), 14, 450);
        if (scored && scored.length > 0) {
          const bestScore = scored[0].scoreCp;
          const candidates = scored.filter(c => bestScore - c.scoreCp <= 100);
          const pool = candidates.length > 0 ? candidates : [scored[0]];
          const pick = pool[Math.floor(Math.random() * pool.length)];
          const match = legalMoves.find(m => m.from === pick.from && m.to === pick.to && (!pick.promotion || m.promotion === pick.promotion));
          if (match) return match;
        }

        const best = await engine.bestMove(game.fen(), 400);
        if (best) {
          const match = legalMoves.find(m => m.from === best.from && m.to === best.to);
          if (match) return match;
        }
        return legalMoves[0];
      }
    }
  ];

  window.CHESS_BOTS = BOTS;

  window.getBotById = function (id) {
    return BOTS.find(b => b.id === id) || BOTS[0];
  };

})();
