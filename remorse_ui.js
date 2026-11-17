// Remorse Chess - Client Application Logic
// Interactive board, 3D reaction die, psychological state presentation and engine integration.
// Presentation only: all rules live in remorse_engine.js, all search in remorse_ai.js.

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Core Systems
  const engine = new RemorseEngine({ autoRollDice: false });
  const ai = new RemorseAI(engine, { depth: 2 });
  const audio = new RemorseAudio();

  // State
  let gameMode = 'vs_ai'; // 'vs_ai' | 'pass_play' | 'sandbox'
  let aiColor = 'b';
  let isAiThinking = false;
  let boardFlipped = false;
  let selectedSquare = null;
  let autoRoll = false;
  let soundEnabled = true;
  let pendingPromotionMove = null;

  // Presentation-only state
  let suppressAnimation = true;   // skip piece slides on first paint, restarts and scenario loads
  let lastRenderedFlip = boardFlipped;
  let flashCursor = 0;            // history index already turned into square flashes
  const activeFlashes = {};       // square -> { cls, start, duration }
  const reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  // DOM Elements
  const boardEl = document.getElementById('remorse-board');
  const turnIndicatorEl = document.getElementById('turn-indicator');
  const moveCounterEl = document.getElementById('move-counter');
  const bonusBannerEl = document.getElementById('bonus-move-banner');
  const passBonusBtn = document.getElementById('btn-pass-bonus');
  const absolveBtn = document.getElementById('btn-absolve-action');
  const selectionNoteEl = document.getElementById('selection-note');
  const selectionTextEl = document.getElementById('selection-text');
  const selectionGlyphEl = document.getElementById('selection-glyph');
  const chronicleFeedEl = document.getElementById('chronicle-feed');
  const pieceWardEl = document.getElementById('piece-ward-container');
  const diceModalEl = document.getElementById('dice-roll-modal');
  const diceCubeEl = document.getElementById('dice-cube');
  const diceRollBtn = document.getElementById('btn-roll-dice');
  const diceOutcomeCardEl = document.getElementById('dice-outcome-card');
  const diceAcceptBtn = document.getElementById('btn-accept-dice');
  const promoModalEl = document.getElementById('promotion-modal');
  const gameOverModalEl = document.getElementById('game-over-modal');
  const gameOverTitleEl = document.getElementById('game-over-title');
  const gameOverDescEl = document.getElementById('game-over-desc');
  const undoBtn = document.getElementById('btn-undo');
  const redoBtn = document.getElementById('btn-redo');

  // Audio enable check
  audio.enabled = soundEnabled;

  // ------------------------------------------------------------------------
  // Shared vocabulary: one glyph, label and class per psychological state
  // ------------------------------------------------------------------------
  const svg = (body, extra = '') =>
    `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`;

  const ICONS = {
    devastated: svg('<circle cx="8" cy="8" r="6.25"/><path d="M8.6 1.8 6.7 6.1l2.6 1.7-2.3 3.3.8 3.1"/>'),
    pacifist: svg('<ellipse cx="8" cy="10.5" rx="6" ry="2.6"/><path d="M8 2.5v5.5"/><path d="M5.5 5.2 8 2.5l2.5 2.7"/>'),
    unaffected: svg('<path d="M2.5 8h11"/><path d="M2.5 5h11" opacity=".35"/><path d="M2.5 11h11" opacity=".35"/>'),
    psychopath: svg('<path d="M8 2.5v11M2.5 8h11"/>'),
    bloodlust: svg('<path d="M2.5 3h4.5L4.8 13.2z M9 3h4.5l-2.2 10.2z" fill="currentColor" stroke="none"/>'),
    absolve: svg('<path d="M8 1.75v12.5M4.25 5.5h7.5"/>'),
    selfcapture: svg('<circle cx="8" cy="8" r="6.25"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5"/>'),
    untested: svg('<circle cx="8" cy="8" r="2" fill="currentColor" stroke="none"/>')
  };

  const STATE_LABEL = {
    devastated: 'Devastated',
    pacifist: 'Pacifist',
    unaffected: 'Unaffected',
    psychopath: 'Psychopath',
    bloodlust: 'Bloodlust',
    meditating: 'Meditating'
  };

  // Engine reaction names -> presentation keys
  const REACTION_KEY = {
    devastated: 'devastated',
    guilt_ridden: 'pacifist',
    unaffected: 'unaffected',
    psychopath: 'psychopath'
  };

  function stateOf(p) {
    if (p.condition === 'devastated') return 'devastated';
    if (p.condition === 'guilt_ridden') return (p.type === 'b' && p.cleansingTurnsLeft !== null && p.cleansingTurnsLeft !== undefined) ? 'meditating' : 'pacifist';
    if (p.condition === 'bloodlust') return 'bloodlust';
    if (p.reaction === 'psychopath') return 'psychopath';
    if (p.reaction === 'unaffected' || p.reaction) return 'unaffected';
    return 'untested';
  }

  function stateTag(key, extra = '') {
    const glyphKey = key === 'meditating' ? 'pacifist' : key;
    const cls = key === 'meditating' ? 's-meditating' : `s-${key}`;
    return `<span class="state-tag ${cls}"><span class="glyph">${ICONS[glyphKey] || ''}</span>${STATE_LABEL[key] || key}${extra}</span>`;
  }

  const colorName = (c) => (c === 'w' ? 'White' : 'Black');
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const stripEmoji = (s) => String(s || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').replace(/\s{2,}/g, ' ').trim();

  // Fill static glyph placeholders in the markup
  document.querySelectorAll('[data-glyph]').forEach(el => {
    const key = el.dataset.glyph;
    if (ICONS[key]) el.innerHTML = ICONS[key];
  });

  // ------------------------------------------------------------------------
  // Turn indicator
  // ------------------------------------------------------------------------
  function setTurnIndicator(classes, html) {
    if (!turnIndicatorEl) return;
    turnIndicatorEl.className = `turn ${classes}`;
    turnIndicatorEl.innerHTML = `<span class="turn-swatch" aria-hidden="true"></span><span class="turn-text">${html}</span>`;
  }

  function updateTurnIndicator() {
    const activeColor = engine.turn;
    const side = activeColor === 'w' ? 'white' : 'black';
    const isBonus = engine.bonusMoveState && engine.bonusMoveState.active;

    if (engine.gameOver) {
      const status = engine.gameResult && engine.gameResult.status;
      setTurnIndicator('game-over', status === 'checkmate' ? 'Checkmate' : status === 'stalemate' ? 'Stalemate' : 'Game over');
    } else if (isAiThinking) {
      setTurnIndicator(`${side} thinking`, 'The machine is thinking');
    } else if (isBonus) {
      setTurnIndicator(`bonus ${side}`, `${colorName(activeColor)}: <em>bonus move</em>`);
    } else if (engine.isCheck(activeColor)) {
      setTurnIndicator(side, `${colorName(activeColor)} to move, in check`);
    } else {
      setTurnIndicator(side, `${colorName(activeColor)} to move`);
    }

    if (moveCounterEl) {
      const blackMoves = engine.history.filter(h => h.type === 'move' && h.color === 'b').length;
      moveCounterEl.textContent = `Move ${blackMoves + 1}`;
    }
  }

  // ------------------------------------------------------------------------
  // Render Board
  // ------------------------------------------------------------------------
  function renderBoard() {
    // Measure where pieces currently appear so moves can slide (FLIP)
    const oldRects = {};
    const flipChanged = boardFlipped !== lastRenderedFlip;
    const animate = !suppressAnimation && !flipChanged && !reduceMotion.matches;
    if (animate) {
      boardEl.querySelectorAll('.piece-wrapper').forEach(el => {
        oldRects[el.dataset.pieceId] = el.getBoundingClientRect();
      });
    }
    suppressAnimation = false;
    lastRenderedFlip = boardFlipped;

    collectFlashes();

    boardEl.innerHTML = '';

    const activeColor = engine.turn;
    const isBonus = engine.bonusMoveState && engine.bonusMoveState.active;

    updateTurnIndicator();

    // Bonus banner visibility
    if (bonusBannerEl) {
      if (isBonus && !engine.gameOver) {
        bonusBannerEl.classList.remove('hidden');
      } else {
        bonusBannerEl.classList.add('hidden');
      }
    }

    // Absolve action button visibility + selection explanation
    updateAbsolveButton();
    updateSelectionNote(isBonus);

    // Undo / redo availability
    if (undoBtn) undoBtn.disabled = isAiThinking || !engine.canUndo();
    if (redoBtn) redoBtn.disabled = isAiThinking || !engine.canRedo();

    // Ranks and Files
    const ranks = boardFlipped ? ['1', '2', '3', '4', '5', '6', '7', '8'] : ['8', '7', '6', '5', '4', '3', '2', '1'];
    const files = boardFlipped ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    // Collect targeted squares for selected piece
    const selectedMoves = selectedSquare ? engine.getLegalMoves(selectedSquare) : [];
    const lastMove = engine.history.filter(h => h.type === 'move').slice(-1)[0];

    // Bishops are marked as absolvers only while a friendly piece actually needs them
    const needsAbsolution = { w: false, b: false };
    engine.getLivingPieces().forEach(p => {
      if (p.condition === 'devastated' || (p.condition === 'guilt_ridden' && !(p.type === 'b' && p.cleansingTurnsLeft != null))) {
        needsAbsolution[p.color] = true;
      }
    });

    const now = performance.now();

    ranks.forEach((rank, ri) => {
      files.forEach((file, fi) => {
        const square = file + rank;
        const colIdx = file.charCodeAt(0) - 97;
        const rowIdx = parseInt(rank, 10) - 1;
        const isDark = (colIdx + rowIdx) % 2 === 0;

        const sqEl = document.createElement('div');
        sqEl.className = `board-square ${isDark ? 'dark' : 'light'}`;
        sqEl.dataset.square = square;
        sqEl.setAttribute('role', 'gridcell');

        // Coordinates on the edge squares
        if (fi === 0) {
          const c = document.createElement('span');
          c.className = 'coord coord-rank';
          c.textContent = rank;
          sqEl.appendChild(c);
        }
        if (ri === 7) {
          const c = document.createElement('span');
          c.className = 'coord coord-file';
          c.textContent = file;
          sqEl.appendChild(c);
        }

        // Last move highlight
        if (lastMove && (lastMove.from === square || lastMove.to === square)) {
          sqEl.classList.add('last-move');
        }

        // Selected square highlight
        if (selectedSquare === square) {
          sqEl.classList.add('selected');
        }

        // Event flashes (capture, absolution, self-capture)
        const flash = activeFlashes[square];
        if (flash) {
          const elapsed = now - flash.start;
          if (elapsed < flash.duration) {
            sqEl.classList.add(flash.cls);
            sqEl.style.setProperty('--flash-delay', `-${Math.round(elapsed)}ms`);
          } else {
            delete activeFlashes[square];
          }
        }

        // Piece on square
        const piece = engine.getPiece(square);
        let label = square;
        if (piece) {
          const pieceWrapper = document.createElement('div');
          pieceWrapper.className = `piece-wrapper piece-${piece.color}`;
          pieceWrapper.dataset.pieceId = piece.id;

          // Piece SVG
          const pieceKey = piece.color + piece.type.toUpperCase();
          if (window.CHESS_PIECES && window.CHESS_PIECES[pieceKey]) {
            pieceWrapper.innerHTML = window.CHESS_PIECES[pieceKey];
            if (pieceWrapper.firstElementChild) pieceWrapper.firstElementChild.classList.add('piece-svg');
          } else {
            pieceWrapper.textContent = pieceKey;
          }

          const state = stateOf(piece);
          label = `${colorName(piece.color)} ${engine.pieceName(piece.type)}, ${square}${state !== 'untested' && state !== 'unaffected' ? ', ' + STATE_LABEL[state] : ''}`;

          // Psychological State Overlays
          // 1. Pacifist: guilt token under the base
          if (piece.condition === 'guilt_ridden') {
            const guiltToken = document.createElement('div');
            guiltToken.className = 'token-guilt';
            guiltToken.title = state === 'meditating'
              ? 'Meditating bishop: cannot capture, absolves itself after its turn of meditation.'
              : 'Pacifist: moves normally, cannot capture until absolved by a bishop.';
            pieceWrapper.appendChild(guiltToken);
            pieceWrapper.classList.add('state-guilt-ridden');
          }

          // 2. Devastated: fracture + countdown
          if (piece.condition === 'devastated') {
            const crack = document.createElement('div');
            crack.innerHTML = `<svg class="crack" viewBox="0 0 30 40" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 2 13 12l5 4-6 9 3 6-2 7"/><path d="M18 16l5 3"/><path d="M12 25l-4 1"/></svg>`;
            pieceWrapper.appendChild(crack.firstElementChild);

            const devOverlay = document.createElement('div');
            const left = piece.devastatedTurnsLeft;
            devOverlay.className = `mark token-devastated ${left <= 1 ? 'critical' : ''}`;
            devOverlay.title = `Devastated: cannot move. Must be absolved within ${plural(left, 'turn')} or it removes itself.`;
            devOverlay.innerHTML = `${ICONS.devastated}<span>${left}</span>`;
            pieceWrapper.appendChild(devOverlay);
            pieceWrapper.classList.add('state-devastated');
            if (piece.color === activeColor) sqEl.classList.add('is-paralysed');
          }

          // 3. Psychopath & Bloodlust
          if (piece.condition === 'bloodlust') {
            const blOverlay = document.createElement('div');
            blOverlay.className = 'mark token-bloodlust';
            blOverlay.title = `Bloodlust: may only move by capturing, friendly pieces included (never its own king). Kills: ${piece.kills}`;
            blOverlay.innerHTML = `${ICONS.bloodlust}<span>${piece.kills}</span>`;
            pieceWrapper.appendChild(blOverlay);
            pieceWrapper.classList.add('state-bloodlust');
          } else if (piece.reaction === 'psychopath') {
            const psychoMarker = document.createElement('div');
            psychoMarker.className = 'mark token-psychopath';
            psychoMarker.title = `Psychopath: extra move after each capture. ${piece.kills} of 3 kills toward Bloodlust.`;
            const pips = [0, 1, 2].map(i => `<i class="${i < piece.kills ? 'on' : ''}"></i>`).join('');
            psychoMarker.innerHTML = `<span>+1</span><span class="pips">${pips}</span>`;
            pieceWrapper.appendChild(psychoMarker);
            pieceWrapper.classList.add('state-psychopath');
          }

          // 4. Bishop able to absolve, shown only when a friendly piece needs it
          if (piece.type === 'b' && piece.condition !== 'devastated' && piece.condition !== 'guilt_ridden' && needsAbsolution[piece.color]) {
            const halo = document.createElement('div');
            halo.className = 'mark token-absolver-bishop';
            halo.title = 'Absolver: this bishop can lift Devastation or Pacifism from an adjacent friendly piece.';
            halo.textContent = '†';
            pieceWrapper.appendChild(halo);
          }

          // In check king warning
          if (piece.type === 'k' && engine.isCheck(piece.color)) {
            pieceWrapper.classList.add('in-check');
            sqEl.classList.add('check');
          }

          if (piece.color === activeColor && !engine.gameOver) sqEl.classList.add('has-own-piece');

          sqEl.appendChild(pieceWrapper);
        }

        // Render Move Hints if selected piece can move here
        const moveCandidate = selectedMoves.find(m => m.to === square);
        if (moveCandidate) {
          sqEl.classList.add('is-target');
          const hintEl = document.createElement('div');
          if (moveCandidate.type === 'absolve') {
            hintEl.className = 'hint-absolve';
            hintEl.title = 'Absolve this piece (spends the turn)';
            hintEl.textContent = '†';
            label += ', absolve';
          } else if (moveCandidate.isFriendlyFire) {
            hintEl.className = 'hint-friendly-capture';
            hintEl.title = 'Bloodlust: capture your own piece';
            label += ', capture friendly piece';
          } else if (moveCandidate.captured) {
            hintEl.className = 'hint-capture';
            hintEl.title = 'Capture';
            label += ', capture';
          } else {
            hintEl.className = 'hint-dot';
            label += ', legal move';
          }
          sqEl.appendChild(hintEl);
        }

        sqEl.setAttribute('aria-label', label);

        // Click Handler
        sqEl.addEventListener('click', () => handleSquareClick(square));

        boardEl.appendChild(sqEl);
      });
    });

    // Slide moved pieces from their previous visual position
    if (animate) {
      const sqSize = boardEl.clientWidth / 8 || 60;
      boardEl.querySelectorAll('.piece-wrapper').forEach(el => {
        const prev = oldRects[el.dataset.pieceId];
        if (!prev) return;
        const next = el.getBoundingClientRect();
        const dx = prev.left - next.left;
        const dy = prev.top - next.top;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) return;
        const duration = Math.min(260, 110 + (dist / sqSize) * 45);
        el.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
          { duration, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' }
        );
      });
    }

    renderPieceWard();
    renderChronicle();
  }

  // Turn new history entries into short-lived square flashes
  function collectFlashes() {
    const hist = engine.history;
    if (flashCursor > hist.length) flashCursor = hist.length;
    const start = performance.now();
    for (let i = flashCursor; i < hist.length; i++) {
      const item = hist[i];
      if (item.type === 'move' && item.captured) {
        activeFlashes[item.to] = { cls: 'flash-capture', start, duration: 650 };
      } else if (item.type === 'absolution' && item.targetSquare) {
        activeFlashes[item.targetSquare] = { cls: 'flash-absolve', start, duration: 650 };
      } else if (item.type === 'bishop_cleansed' && item.square) {
        activeFlashes[item.square] = { cls: 'flash-absolve', start, duration: 650 };
      } else if (item.type === 'self_capture' && item.square) {
        activeFlashes[item.square] = { cls: 'flash-self', start, duration: 1100 };
      }
    }
    flashCursor = hist.length;
  }

  function updateAbsolveButton() {
    if (!absolveBtn) return;
    if (!selectedSquare) {
      absolveBtn.classList.add('hidden');
      return;
    }
    const moves = engine.getLegalMoves(selectedSquare);
    const absolveMoves = moves.filter(m => m.type === 'absolve');
    if (absolveMoves.length > 0) {
      absolveBtn.classList.remove('hidden');
      absolveBtn.textContent = absolveMoves.length === 1
        ? `Absolve ${absolveMoves[0].to}`
        : `Absolve (${absolveMoves.length})`;
      absolveBtn.title = absolveMoves.length === 1
        ? 'Spend this turn absolving the adjacent piece'
        : 'Several pieces can be absolved: choose one on the board';
      absolveBtn.onclick = () => {
        if (absolveMoves.length === 1) {
          selectedSquare = null;
          executeMove(absolveMoves[0]);
        } else {
          // If multiple adjacent affected pieces, highlight them
          renderBoard();
        }
      };
    } else {
      absolveBtn.classList.add('hidden');
    }
  }

  // Explain what the selected piece can and cannot do, and why
  function updateSelectionNote(isBonus) {
    if (!selectionNoteEl) return;
    const piece = selectedSquare ? engine.getPiece(selectedSquare) : null;
    if (!piece || isBonus || engine.gameOver) {
      selectionNoteEl.classList.add('hidden');
      return;
    }

    const moves = engine.getLegalMoves(selectedSquare);
    const absolveCount = moves.filter(m => m.type === 'absolve').length;
    const moveCount = moves.length - absolveCount;
    const name = engine.pieceName(piece.type);
    const state = stateOf(piece);
    const head = (prefix) => `<strong>${prefix ? prefix + ' ' + name.toLowerCase() : name}</strong> <span class="mono">${piece.square}</span>.`;

    let cls = '';
    let glyph = '';
    let text = '';

    if (state === 'devastated') {
      const left = piece.devastatedTurnsLeft;
      cls = 's-devastated' + (left <= 1 ? ' is-critical' : '');
      glyph = ICONS.devastated;
      text = `${head('Devastated')} Cannot move. `;
      text += engine.canAbsolve(piece.color)
        ? `A bishop must absolve it within ${plural(left, 'turn')}.`
        : 'No bishop is left to absolve it.';
    } else if (state === 'meditating') {
      cls = 's-pacifist';
      glyph = ICONS.pacifist;
      text = `${head('Meditating')} Cannot capture; it absolves itself after its turn of meditation.`;
    } else if (state === 'pacifist') {
      cls = 's-pacifist';
      glyph = ICONS.pacifist;
      text = `${head('Pacifist')} Moves normally but cannot capture until a bishop absolves it.`;
    } else if (state === 'bloodlust') {
      cls = 's-bloodlust';
      glyph = ICONS.bloodlust;
      text = `${head('Bloodlust')} May only move by capturing, its own pieces included. Never its king.`;
    } else if (state === 'psychopath') {
      cls = 's-psychopath';
      glyph = ICONS.psychopath;
      text = `${head('Psychopath')} Takes an extra move after each capture. ${piece.kills} of 3 kills toward Bloodlust.`;
    } else if (absolveCount > 0) {
      cls = 's-absolver';
      glyph = ICONS.absolve;
      text = `${head('')} Can absolve an adjacent piece. Absolving spends the turn.`;
    } else if (state === 'unaffected') {
      glyph = ICONS.unaffected;
      text = `${head('Unaffected')} Standard rules.`;
    } else {
      text = `${head('')} Untested. Its first capture triggers the reaction roll.`;
    }

    if (state !== 'devastated' && moveCount === 0 && absolveCount === 0) {
      text += engine.isCheck(piece.color) ? ' No legal moves while your king is in check.' : ' No legal moves.';
    }

    selectionNoteEl.className = `notice notice-selection ${cls}`;
    if (selectionGlyphEl) selectionGlyphEl.innerHTML = glyph;
    if (selectionTextEl) selectionTextEl.innerHTML = text;
  }

  // Handle Square Click
  function handleSquareClick(square) {
    if (engine.gameOver || isAiThinking) return;

    // If pending dice roll is active, block board clicks until rolled
    if (engine.pendingDiceRoll) {
      showDiceModal(engine.pendingDiceRoll);
      return;
    }

    const clickedPiece = engine.getPiece(square);
    const activeColor = engine.turn;

    // If a square is already selected
    if (selectedSquare) {
      // Check if clicking a destination square of a legal move
      const moves = engine.getLegalMoves(selectedSquare);
      const chosenMove = moves.find(m => m.to === square);

      if (chosenMove) {
        // Check if pawn promotion requires choice
        const movingPiece = chosenMove.piece;
        const isPromoRank = (movingPiece.color === 'w' && square[1] === '8') || (movingPiece.color === 'b' && square[1] === '1');
        if (movingPiece.type === 'p' && isPromoRank) {
          pendingPromotionMove = { from: selectedSquare, to: square };
          showPromotionModal(movingPiece.color);
          return;
        }

        selectedSquare = null;
        executeMove(chosenMove); // renders
        return;
      }

      // If clicking own piece again, switch selection (or toggle off)
      if (clickedPiece && clickedPiece.color === activeColor) {
        selectedSquare = square === selectedSquare ? null : square;
        renderBoard();
        return;
      }

      // Deselect
      selectedSquare = null;
      renderBoard();
      return;
    }

    // Select piece if it belongs to current player
    if (clickedPiece && clickedPiece.color === activeColor) {
      selectedSquare = square;
      renderBoard();
    }
  }

  // Execute Move
  function executeMove(moveParam) {
    try {
      const res = engine.makeMove(moveParam);

      // Audio feedback
      if (moveParam.type === 'absolve') {
        audio.playAbsolution();
      } else if (res.move.isFriendlyFire) {
        audio.playBloodlust();
      } else if (res.move.captured) {
        audio.playCapture();
      } else {
        audio.playMove();
      }

      // Check audio
      if (engine.isCheck(engine.turn)) {
        setTimeout(() => audio.playCheck(), 150);
      }

      // Append chronicle
      appendChronicleEvents();

      // Check if D6 reaction roll is pending
      if (res.pendingDiceRoll) {
        showDiceModal(res.pendingDiceRoll);
      } else if (res.reaction) {
        playReactionAudio(res.reaction.reaction);
      }

      // Check game over
      if (engine.gameOver) {
        handleGameOver();
      } else if (gameMode === 'vs_ai' && engine.turn === aiColor && !engine.pendingDiceRoll) {
        // Trigger AI Move
        triggerAiTurn();
      }
    } catch (err) {
      console.error('Error executing move:', err);
    }

    renderBoard();
  }

  function playReactionAudio(reaction) {
    if (reaction === 'devastated') audio.playDevastated();
    else if (reaction === 'guilt_ridden') audio.playGuilt();
    else if (reaction === 'psychopath') audio.playPsychopath();
  }

  // AI Turn Execution
  function triggerAiTurn() {
    if (engine.gameOver || isAiThinking) return;
    if (engine.turn !== aiColor) return;
    isAiThinking = true;

    // Show AI thinking status
    updateTurnIndicator();
    if (undoBtn) undoBtn.disabled = true;
    if (redoBtn) redoBtn.disabled = true;

    // Small delay for natural pacing
    setTimeout(() => {
      let continueBonus = false;
      try {
        const prevAuto = engine.options.autoRollDice;
        engine.options.autoRollDice = true;

        const bestMove = ai.findBestMove();
        engine.options.autoRollDice = prevAuto;

        if (bestMove) {
          // Execute AI move with auto-roll active
          engine.options.autoRollDice = true;
          const res = engine.makeMove(bestMove);
          engine.options.autoRollDice = prevAuto;

          if (bestMove.type === 'absolve') {
            audio.playAbsolution();
          } else if (res.move.captured) {
            audio.playCapture();
          } else {
            audio.playMove();
          }

          if (res.reaction) {
            playReactionAudio(res.reaction.reaction);
          }

          appendChronicleEvents();

          // If AI got a bonus move (Psychopath roll 6)
          if (res.extraMoveGranted) {
            continueBonus = true;
          }
        }
      } catch (err) {
        console.error('AI error:', err);
      } finally {
        if (continueBonus) {
          renderBoard();
          setTimeout(() => {
            isAiThinking = false;
            triggerAiTurn(); // Take bonus move!
          }, 600);
        } else {
          isAiThinking = false;
          renderBoard();
          if (engine.gameOver) {
            handleGameOver();
          }
        }
      }
    }, 450);
  }

  // Pass bonus move
  if (passBonusBtn) {
    passBonusBtn.addEventListener('click', () => {
      if (engine.bonusMoveState && engine.bonusMoveState.active) {
        engine.endBonusMove();
        selectedSquare = null;
        renderBoard();
        appendChronicleEvents();
        if (gameMode === 'vs_ai' && engine.turn === aiColor) {
          triggerAiTurn();
        }
      }
    });
  }

  // ------------------------------------------------------------------------
  // 3D Dice Rolling System
  // ------------------------------------------------------------------------
  let isRollingDice = false;
  let currentPendingRoll = null;

  function showDiceModal(pending) {
    if (!pending) return;
    currentPendingRoll = pending;
    isRollingDice = false;

    const piece = engine.getPieceById(pending.pieceId);
    if (!piece) return;

    const descEl = document.getElementById('dice-modal-desc');
    if (descEl) {
      descEl.innerHTML = `
        <strong>${colorName(piece.color)} ${engine.pieceName(piece.type).toLowerCase()}</strong>
        has made its first capture${piece.square ? `, on <span class="mono">${piece.square}</span>` : ''}.
        Roll to decide how it lives with it.
      `;
    }

    if (diceOutcomeCardEl) diceOutcomeCardEl.classList.add('hidden');
    if (diceCubeEl) {
      diceCubeEl.classList.remove('rolling');
      diceCubeEl.className = 'dice-object show-1';
    }
    if (diceRollBtn) diceRollBtn.classList.remove('hidden');
    if (diceModalEl) diceModalEl.classList.remove('hidden');
    if (diceRollBtn) setTimeout(() => diceRollBtn.focus({ preventScroll: true }), 50);

    if (autoRoll) {
      setTimeout(() => performDiceRoll(pending.pieceId), 400);
    }
  }

  function triggerPendingRoll() {
    if (isRollingDice) return;
    const pieceId = (engine.pendingDiceRoll && engine.pendingDiceRoll.pieceId) ||
                    (currentPendingRoll && currentPendingRoll.pieceId);
    if (pieceId) {
      performDiceRoll(pieceId);
    }
  }

  function performDiceRoll(pieceId) {
    if (isRollingDice) return;
    // Outcome already shown for this roll: ignore extra taps on the die
    if (diceOutcomeCardEl && !diceOutcomeCardEl.classList.contains('hidden')) return;
    isRollingDice = true;

    audio.playDiceRoll();
    if (diceRollBtn) diceRollBtn.classList.add('hidden');

    // Rolling animation
    if (diceCubeEl) {
      diceCubeEl.classList.add('rolling');
    }

    setTimeout(() => {
      const rollVal = engine.rollD6();
      if (diceCubeEl) {
        diceCubeEl.classList.remove('rolling');
        diceCubeEl.className = `dice-object show-${rollVal}`;
      }

      // Apply reaction to engine
      const event = engine.applyReaction(pieceId, rollVal);
      if (event) {
        playReactionAudio(event.reaction);
        renderDiceOutcome(event);
        appendChronicleEvents();
      }
      renderBoard();
      isRollingDice = false;
    }, 850);
  }

  function renderDiceOutcome(event) {
    const titleEl = document.getElementById('dice-outcome-title');
    const textEl = document.getElementById('dice-outcome-text');
    const badgeEl = document.getElementById('dice-outcome-badge');
    const key = REACTION_KEY[event.reaction] || 'unaffected';
    const piece = engine.getPieceById(event.pieceId);

    // Probability scale with the result marked
    const scale = [
      { k: 'devastated', r: '1' },
      { k: 'pacifist', r: '2–3' },
      { k: 'unaffected', r: '4–5' },
      { k: 'psychopath', r: '6' }
    ];
    badgeEl.className = 'dice-scale';
    badgeEl.setAttribute('aria-label', `Rolled ${event.roll}: ${STATE_LABEL[key]}`);
    badgeEl.innerHTML = scale.map(s =>
      `<div class="scale-cell s-${s.k} ${s.k === key ? 'on' : ''}"><span class="mono">${s.r}</span><span>${STATE_LABEL[s.k]}</span></div>`
    ).join('');

    titleEl.className = `dice-result-title s-${key}`;
    titleEl.innerHTML = `<span class="glyph">${ICONS[key]}</span>${STATE_LABEL[key]}`;

    if (key === 'devastated') {
      textEl.innerHTML = `
        Paralysed by grief. The piece <strong>cannot move or capture</strong>.
        <span class="rule-line">A bishop must stand beside it and spend a turn absolving it within <strong>3 of your turns</strong>, or the piece removes itself from the board.</span>
      `;
    } else if (key === 'pacifist') {
      const isBishop = piece && piece.type === 'b';
      textEl.innerHTML = `
        A guilt token is placed under the piece. It still moves normally.
        <span class="rule-line">${isBishop
          ? 'It <strong>cannot capture</strong>. As a bishop, it meditates for a turn and then absolves itself.'
          : 'It <strong>cannot capture</strong> until a bishop absolves it.'}</span>
      `;
    } else if (key === 'unaffected') {
      textEl.innerHTML = `
        The capture leaves no mark.
        <span class="rule-line">Standard rules continue for this piece.</span>
      `;
    } else if (key === 'psychopath') {
      textEl.innerHTML = `
        The capture agreed with it.
        <span class="rule-line"><strong>Take another move now.</strong> It gains an extra move after every capture, and falls into Bloodlust at three kills.</span>
      `;
    }

    if (diceAcceptBtn) diceAcceptBtn.textContent = key === 'psychopath' && event.extraMoveGranted ? 'Take the extra move' : 'Continue';
    if (diceOutcomeCardEl) diceOutcomeCardEl.classList.remove('hidden');
    if (diceAcceptBtn) diceAcceptBtn.focus({ preventScroll: true });
  }

  // Trigger roll from button click
  if (diceRollBtn) {
    diceRollBtn.addEventListener('click', triggerPendingRoll);
  }

  // Trigger roll directly by tapping or clicking the 3D dice or viewport
  const diceViewportEl = document.querySelector('.dice-viewport');
  if (diceViewportEl) {
    diceViewportEl.addEventListener('click', triggerPendingRoll);
  } else if (diceCubeEl) {
    diceCubeEl.addEventListener('click', triggerPendingRoll);
  }

  if (diceAcceptBtn) {
    diceAcceptBtn.addEventListener('click', () => {
      currentPendingRoll = null;
      if (diceModalEl) diceModalEl.classList.add('hidden');
      renderBoard();

      // If playing vs AI and it is AI turn
      if (gameMode === 'vs_ai' && engine.turn === aiColor) {
        triggerAiTurn();
      }
    });
  }

  // Keyboard: Space/Enter casts the die or acknowledges; Escape closes passive dialogs
  document.addEventListener('keydown', (e) => {
    if (diceModalEl && !diceModalEl.classList.contains('hidden')) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (diceOutcomeCardEl && !diceOutcomeCardEl.classList.contains('hidden')) {
          diceAcceptBtn.click();
        } else {
          triggerPendingRoll();
        }
      }
      return;
    }
    if (e.key === 'Escape') {
      if (rulebookModalEl && !rulebookModalEl.classList.contains('hidden')) {
        rulebookModalEl.classList.add('hidden');
      } else if (gameOverModalEl && !gameOverModalEl.classList.contains('hidden')) {
        gameOverModalEl.classList.add('hidden');
      } else if (selectedSquare) {
        selectedSquare = null;
        renderBoard();
      }
    }
  });

  // Pawn Promotion Dialog
  function showPromotionModal(color) {
    promoModalEl.classList.remove('hidden');
    const optionsEl = document.getElementById('promo-options-row');
    optionsEl.innerHTML = '';

    const choices = ['q', 'r', 'b', 'n'];
    choices.forEach(type => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'promo-piece-btn';
      const key = color + type.toUpperCase();
      btn.innerHTML = window.CHESS_PIECES[key] || type.toUpperCase();
      btn.title = `Promote to ${engine.pieceName(type)}`;
      btn.setAttribute('aria-label', btn.title);
      btn.addEventListener('click', () => {
        promoModalEl.classList.add('hidden');
        if (pendingPromotionMove) {
          const promo = pendingPromotionMove;
          pendingPromotionMove = null;
          selectedSquare = null;
          executeMove({
            from: promo.from,
            to: promo.to,
            promotion: type
          });
        }
      });
      optionsEl.appendChild(btn);
    });
  }

  // ------------------------------------------------------------------------
  // The score sheet (chronicle). Rebuilt from engine.history, so undo/redo
  // always shows the true record. Audio for new events fires only once.
  // ------------------------------------------------------------------------
  let lastHistoryIndex = 0;      // audio cursor
  let renderedSignature = null;

  function appendChronicleEvents() {
    const hist = engine.history;
    if (lastHistoryIndex > hist.length) lastHistoryIndex = hist.length;
    for (let i = lastHistoryIndex; i < hist.length; i++) {
      const item = hist[i];
      if (item.type === 'self_capture') {
        audio.playSelfCapture();
      } else if (item.type === 'bloodlust_awakened') {
        audio.playBloodlust();
      }
    }
    lastHistoryIndex = hist.length;
    renderChronicle();
  }

  function renderChronicle() {
    if (!chronicleFeedEl) return;
    const hist = engine.history;
    if (lastHistoryIndex > hist.length) lastHistoryIndex = hist.length;

    // Rebuild only when the record actually changed (length or last entry)
    const lastItem = hist[hist.length - 1] || null;
    if (renderedSignature && renderedSignature.len === hist.length && renderedSignature.last === lastItem) return;
    renderedSignature = { len: hist.length, last: lastItem };

    if (hist.length === 0) {
      chronicleFeedEl.innerHTML = `<li class="sheet-empty">No moves yet. The record starts with ${colorName(engine.turn)}'s first move.</li>`;
      return;
    }

    let blackMoves = 0;
    let prevMoveColor = null;
    let lastMoveIdx = -1;
    hist.forEach((h, i) => { if (h.type === 'move') lastMoveIdx = i; });

    const rows = hist.map((item, i) => {
      if (item.type === 'move') {
        const isBonus = prevMoveColor === item.color;
        const num = isBonus ? '+' : (item.color === 'w' ? `${blackMoves + 1}.` : `${blackMoves + 1}…`);
        if (item.color === 'b') blackMoves += 1;
        prevMoveColor = item.color;

        let desc = engine.pieceName(item.pieceType);
        if (item.captured) {
          const capName = engine.pieceName(item.captured.type).toLowerCase();
          desc += item.isFriendlyFire ? ` devours its own <b>${capName}</b>` : ` takes <b>${capName}</b>`;
        }
        if (item.promotion) desc += `, promotes to ${engine.pieceName(item.promotion).toLowerCase()}`;
        if (isBonus) desc += ' <span class="mono-label">bonus</span>';

        const cls = ['sheet-row', item.captured ? 'is-capture' : '', isBonus ? 'is-bonus' : '', i === lastMoveIdx ? 'is-last' : ''].join(' ');
        return `<li class="${cls}">
          <span class="sheet-num">${num}</span>
          <span class="sheet-body">
            <span class="sheet-side ${item.color}" title="${colorName(item.color)}"></span>
            <span class="sheet-san">${item.san || item.from + '-' + item.to}</span>
            <span class="sheet-desc">${desc}</span>
          </span>
        </li>`;
      }

      // Annotations
      let tag = '';
      let note = '';
      let cls = '';
      if (item.type === 'reaction_roll') {
        const key = REACTION_KEY[item.reaction] || 'unaffected';
        tag = stateTag(key, ` <span class="mono">d6·${item.roll}</span>`);
        note = `${colorName(item.color)} ${engine.pieceName(item.pieceType).toLowerCase()}${item.square ? ' on <span class="mono">' + item.square + '</span>' : ''}`;
        cls = `s-${key}`;
      } else if (item.type === 'absolution') {
        tag = `<span class="state-tag s-absolved"><span class="glyph">${ICONS.absolve}</span>Absolved</span>`;
        const prev = item.prevCondition === 'devastated' ? 'Devastated' : 'Pacifist';
        note = `Bishop <span class="mono">${item.bishopSquare}</span> absolves ${engine.pieceName(item.targetType).toLowerCase()} <span class="mono">${item.targetSquare}</span> (was ${prev})`;
        cls = 's-absolved';
      } else if (item.type === 'self_capture') {
        tag = `<span class="state-tag s-selfcapture"><span class="glyph">${ICONS.selfcapture}</span>Self-capture</span>`;
        note = `${colorName(item.color)} ${engine.pieceName(item.pieceType).toLowerCase()} <span class="mono">${item.square}</span> was not absolved in time`;
        cls = 's-selfcapture';
      } else if (item.type === 'bloodlust_awakened') {
        const p = engine.getPieceById(item.pieceId);
        tag = stateTag('bloodlust');
        note = `${p ? engine.pieceName(p.type) : 'Piece'} reaches three kills. Captures only, own pieces included`;
        cls = 's-bloodlust';
      } else if (item.type === 'bishop_cleansed') {
        tag = `<span class="state-tag s-absolved"><span class="glyph">${ICONS.absolve}</span>Cleansed</span>`;
        note = `Bishop <span class="mono">${item.square}</span> absolves itself after meditation`;
        cls = 's-absolved';
      } else if (item.type === 'game_over') {
        note = stripEmoji(item.result && item.result.reason);
        cls = 's-result';
        return `<li class="sheet-row event ${cls}"><span class="sheet-num">${item.result && item.result.status === 'checkmate' ? '#' : '½'}</span><span class="sheet-body"><span class="sheet-note">${note}</span></span></li>`;
      } else {
        note = stripEmoji(item.message || item.type);
      }

      return `<li class="sheet-row event ${cls}">
        <span class="sheet-num"></span>
        <span class="sheet-body">${tag}<span class="sheet-note">${note}</span></span>
      </li>`;
    });

    chronicleFeedEl.innerHTML = rows.join('');
    const scroller = chronicleFeedEl.closest('.tab-panels');
    if (scroller && scroller.scrollHeight > scroller.clientHeight && chronicleFeedEl.closest('.tab-view.active')) {
      scroller.scrollTop = scroller.scrollHeight;
    }
  }

  // ------------------------------------------------------------------------
  // Roster (piece manifest)
  // ------------------------------------------------------------------------
  const TYPE_ORDER = { k: 0, q: 1, r: 2, b: 3, n: 4, p: 5 };
  const STATE_ORDER = { devastated: 0, bloodlust: 1, psychopath: 2, pacifist: 3, meditating: 3, unaffected: 4 };

  function renderPieceWard() {
    if (!pieceWardEl) return;

    let urgentCount = 0;

    const html = ['w', 'b'].map(color => {
      const living = engine.getLivingPieces(color);
      const canAbsolve = engine.canAbsolve(color);
      const affected = [];
      const untested = [];

      living.forEach(p => {
        const st = stateOf(p);
        if (st === 'untested') untested.push(p);
        else affected.push({ p, st });
      });

      affected.sort((a, b) => (STATE_ORDER[a.st] - STATE_ORDER[b.st]) || (TYPE_ORDER[a.p.type] - TYPE_ORDER[b.p.type]));
      untested.sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type]);

      const rows = affected.map(({ p, st }) => {
        let detail = '';
        let urgent = false;
        if (st === 'devastated') {
          const left = p.devastatedTurnsLeft;
          if (!canAbsolve) { detail = 'Cannot move. No bishop left to absolve it.'; urgent = true; }
          else { detail = `Cannot move. Absolve within ${plural(left, 'turn')}.`; urgent = left <= 1; }
          urgentCount += 1;
        } else if (st === 'meditating') {
          detail = 'Cannot capture. Absolves itself after meditating.';
        } else if (st === 'pacifist') {
          detail = canAbsolve ? 'Cannot capture until absolved.' : 'Cannot capture. No bishop left to absolve it.';
        } else if (st === 'bloodlust') {
          detail = 'Captures only, own pieces included.';
        } else if (st === 'psychopath') {
          const toGo = Math.max(0, 3 - p.kills);
          detail = `Extra move after captures. ${toGo} more to Bloodlust.`;
        } else {
          detail = 'Standard rules.';
        }

        const key = p.color + p.type.toUpperCase();
        const icon = window.CHESS_PIECES ? window.CHESS_PIECES[key] : p.type;
        const killText = p.kills ? plural(p.kills, 'kill') : '';
        return `
          <button type="button" class="ward-row s-${st} ${urgent ? 'is-urgent' : ''} ${p.square === selectedSquare ? 'is-selected' : ''}" data-square="${p.square}" data-color="${p.color}">
            <span class="ward-icon piece-${p.color}">${icon}</span>
            <span class="ward-main">
              <span class="ward-name">${engine.pieceName(p.type)}<span class="mono">${p.square}</span></span>
              <span class="ward-detail ${urgent ? 'urgent' : ''}">${stateTag(st)} ${detail}</span>
            </span>
            <span class="ward-kills">${killText}</span>
          </button>`;
      }).join('');

      const strip = untested.length ? `
        <div class="untested">
          <span class="untested-label">${affected.length ? 'No captures yet' : 'No captures yet. Every piece is untested.'}</span>
          ${untested.map(p => {
            const key = p.color + p.type.toUpperCase();
            return `<button type="button" class="untested-piece ward-icon piece-${p.color}" data-square="${p.square}" data-color="${p.color}" title="${engine.pieceName(p.type)} ${p.square}" aria-label="${engine.pieceName(p.type)} ${p.square}, untested">${window.CHESS_PIECES ? window.CHESS_PIECES[key] : p.type}</button>`;
          }).join('')}
        </div>` : '';

      return `
        <section class="roster ${engine.turn === color && !engine.gameOver ? 'is-turn' : ''}">
          <div class="roster-head">
            <h2 class="roster-title">${colorName(color)} <span class="mono-label">${plural(living.length, 'piece')}</span></h2>
            <span class="absolution-flag ${canAbsolve ? 'active' : 'inactive'}">
              <span class="glyph">${ICONS.absolve}</span>${canAbsolve ? 'Can absolve' : 'Absolution lost'}
            </span>
          </div>
          <div class="roster-list">${rows}</div>
          ${strip}
        </section>`;
    }).join('');

    pieceWardEl.innerHTML = html;

    // Roster rows select the piece on the board (never make a move from here)
    pieceWardEl.querySelectorAll('[data-square]').forEach(cell => {
      cell.addEventListener('click', () => {
        const sq = cell.dataset.square;
        if (!sq || engine.gameOver || isAiThinking || engine.pendingDiceRoll) return;
        if (cell.dataset.color !== engine.turn) return;
        selectedSquare = selectedSquare === sq ? null : sq;
        renderBoard();
      });
    });

    // Flag devastated pieces on the Roster tab
    const rosterTab = document.querySelector('.tab-btn[data-target="tab-ward"]');
    if (rosterTab) {
      rosterTab.innerHTML = `Roster${urgentCount ? `<span class="tab-count" title="${plural(urgentCount, 'devastated piece')}">${urgentCount}</span>` : ''}`;
    }
  }

  // ------------------------------------------------------------------------
  // Game Over Handling
  // ------------------------------------------------------------------------
  function handleGameOver() {
    audio.playCheckmate();
    if (gameOverModalEl) {
      gameOverTitleEl.textContent = engine.gameResult.status === 'checkmate' ? 'Checkmate' : 'Stalemate';
      gameOverDescEl.textContent = stripEmoji(engine.gameResult.reason);
      gameOverModalEl.classList.remove('hidden');
    }
  }

  const gameOverNewBtn = document.getElementById('btn-gameover-new');
  const gameOverViewBtn = document.getElementById('btn-gameover-view');
  if (gameOverNewBtn) {
    gameOverNewBtn.addEventListener('click', () => {
      gameOverModalEl.classList.add('hidden');
      document.getElementById('btn-restart').click();
    });
  }
  if (gameOverViewBtn) {
    gameOverViewBtn.addEventListener('click', () => gameOverModalEl.classList.add('hidden'));
  }

  // Sandbox Scenarios Pre-loader
  const SCENARIOS = {
    standard: {
      name: 'Standard Orthodox Remorse',
      desc: 'Standard initial starting board. Roll D6 upon each piece\'s first capture.',
      load: () => engine.reset()
    },
    devastation: {
      name: 'The Devastated Knight',
      desc: 'White Knight killed on d4 and became Devastated! Bishop on c2 is 2 squares away and must rush to absolve it before the 3-turn deadline.',
      load: () => engine.loadScenario({
        turn: 'w',
        pieces: [
          { id: 'wK', type: 'k', color: 'w', square: 'e1' },
          { id: 'bK', type: 'k', color: 'b', square: 'e8' },
          { id: 'wB', type: 'b', color: 'w', square: 'c2' },
          { id: 'wN', type: 'n', color: 'w', square: 'd4', condition: 'devastated', reaction: 'devastated', devastatedTurnsLeft: 2, hasRolled: true },
          { id: 'bP1', type: 'p', color: 'b', square: 'a7' },
          { id: 'bP2', type: 'p', color: 'b', square: 'h7' }
        ]
      })
    },
    guilt: {
      name: 'The Pacifist\'s Guilt',
      desc: 'White Rook on d4 has a Guilt Token. It can move freely, but cannot capture enemy pieces. Adjacent Bishop on c3 can absolve it.',
      load: () => engine.loadScenario({
        turn: 'w',
        pieces: [
          { id: 'wK', type: 'k', color: 'w', square: 'e1' },
          { id: 'bK', type: 'k', color: 'b', square: 'e8' },
          { id: 'wB', type: 'b', color: 'w', square: 'c3' },
          { id: 'wR', type: 'r', color: 'w', square: 'd4', condition: 'guilt_ridden', reaction: 'guilt_ridden', hasRolled: true },
          { id: 'bP1', type: 'p', color: 'b', square: 'd7' },
          { id: 'bP2', type: 'p', color: 'b', square: 'g4' }
        ]
      })
    },
    psychopath: {
      name: 'Psychopath Rampage',
      desc: 'White Queen on d1 is a Psychopath. Capturing Black pawn on d5 immediately grants a bonus move to capture again on g5!',
      load: () => engine.loadScenario({
        turn: 'w',
        pieces: [
          { id: 'wK', type: 'k', color: 'w', square: 'e1' },
          { id: 'bK', type: 'k', color: 'b', square: 'e8' },
          { id: 'wQ', type: 'q', color: 'w', square: 'd1', reaction: 'psychopath', condition: 'normal', hasRolled: true },
          { id: 'bP1', type: 'p', color: 'b', square: 'd5' },
          { id: 'bP2', type: 'p', color: 'b', square: 'g5' },
          { id: 'bB', type: 'b', color: 'b', square: 'c8' }
        ]
      })
    },
    bloodlust: {
      name: 'Bloodlust Cannibalism',
      desc: 'White Rook on d4 has 3 kills and awakened Bloodlust! It CANNOT make quiet moves. It can feast on enemy pawn on d7 OR devour friendly pawn on g4!',
      load: () => engine.loadScenario({
        turn: 'w',
        pieces: [
          { id: 'wK', type: 'k', color: 'w', square: 'e1' },
          { id: 'bK', type: 'k', color: 'b', square: 'e8' },
          { id: 'wR', type: 'r', color: 'w', square: 'd4', reaction: 'psychopath', condition: 'bloodlust', kills: 3, hasRolled: true },
          { id: 'wP', type: 'p', color: 'w', square: 'g4' }, // Friendly meal
          { id: 'bP', type: 'p', color: 'b', square: 'd7' }  // Enemy meal
        ]
      })
    }
  };

  function markLoadedScenario(key) {
    document.querySelectorAll('.scenario-card-btn').forEach(b => {
      b.classList.toggle('is-loaded', !!key && b.dataset.scenario === key);
    });
  }

  function resetPresentation() {
    selectedSquare = null;
    suppressAnimation = true;
    lastHistoryIndex = 0;
    flashCursor = 0;
    Object.keys(activeFlashes).forEach(k => delete activeFlashes[k]);
    renderedSignature = null;
  }

  // Top Actions & Toolbar
  document.getElementById('btn-restart').addEventListener('click', () => {
    engine.reset();
    resetPresentation();
    markLoadedScenario(null);
    renderBoard();
    if (gameMode === 'vs_ai' && engine.turn === aiColor) {
      triggerAiTurn();
    }
  });

  document.getElementById('btn-flip').addEventListener('click', () => {
    boardFlipped = !boardFlipped;
    renderBoard();
  });

  undoBtn.addEventListener('click', () => {
    if (isAiThinking) return;
    if (engine.undo()) {
      selectedSquare = null;
      renderBoard();
    }
  });

  redoBtn.addEventListener('click', () => {
    if (isAiThinking) return;
    if (engine.redo()) {
      selectedSquare = null;
      lastHistoryIndex = engine.history.length; // do not replay event audio
      renderBoard();
    }
  });

  // Toggles
  const toggleSoundEl = document.getElementById('toggle-sound');
  if (toggleSoundEl) {
    toggleSoundEl.addEventListener('change', (e) => {
      soundEnabled = e.target.checked;
      audio.enabled = soundEnabled;
    });
  }

  const toggleAutoRollEl = document.getElementById('toggle-autoroll');
  if (toggleAutoRollEl) {
    toggleAutoRollEl.addEventListener('change', (e) => {
      autoRoll = e.target.checked;
      engine.options.autoRollDice = autoRoll;
    });
  }

  // Mode Selection
  document.querySelectorAll('.mode-select-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.mode-select-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      gameMode = btn.dataset.mode;

      const aiOptions = document.getElementById('ai-config-panel');
      if (aiOptions) {
        if (gameMode === 'vs_ai') {
          aiOptions.classList.remove('hidden');
          if (engine.turn === aiColor) {
            triggerAiTurn();
          }
        } else {
          aiOptions.classList.add('hidden');
        }
      }

      const sandboxOptions = document.getElementById('sandbox-config-panel');
      if (sandboxOptions) {
        if (gameMode === 'sandbox') {
          sandboxOptions.classList.remove('hidden');
        } else {
          sandboxOptions.classList.add('hidden');
        }
      }
    });
  });

  // AI Color Pick
  document.querySelectorAll('.ai-color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ai-color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      aiColor = btn.dataset.color;
      if (aiColor === 'w') {
        boardFlipped = true;
        if (engine.turn === 'w') triggerAiTurn();
      } else {
        boardFlipped = false;
        if (engine.turn === 'b') triggerAiTurn();
      }
      renderBoard();
    });
  });

  // Scenario buttons
  document.querySelectorAll('.scenario-card-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.scenario;
      if (SCENARIOS[key]) {
        SCENARIOS[key].load();
        resetPresentation();
        markLoadedScenario(key === 'standard' ? null : key);
        appendChronicleEvents();
        renderBoard();
        if (gameMode === 'vs_ai' && engine.turn === aiColor) {
          triggerAiTurn();
        }
        // On stacked layouts, bring the board back into view
        if (window.matchMedia && window.matchMedia('(max-width: 860px)').matches) {
          boardEl.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
        }
      }
    });
  });

  // Tabs Header
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.setAttribute('aria-selected', btn.classList.contains('active') ? 'true' : 'false');
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      document.querySelectorAll('.tab-view').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const pane = document.getElementById(btn.dataset.target);
      if (pane) pane.classList.add('active');
      const scroller = document.querySelector('.tab-panels');
      if (scroller) {
        scroller.scrollTop = btn.dataset.target === 'tab-chronicle' ? scroller.scrollHeight : 0;
      }
    });
  });

  // Rulebook Modal toggle
  const rulebookModalEl = document.getElementById('rulebook-modal');
  const openRulebookBtn = document.getElementById('btn-open-rulebook');
  const closeRulebookBtn = document.getElementById('btn-close-rulebook');

  if (openRulebookBtn && rulebookModalEl) {
    openRulebookBtn.addEventListener('click', () => rulebookModalEl.classList.remove('hidden'));
  }
  if (closeRulebookBtn && rulebookModalEl) {
    closeRulebookBtn.addEventListener('click', () => rulebookModalEl.classList.add('hidden'));
  }
  // Click outside a passive dialog closes it
  [rulebookModalEl, gameOverModalEl].forEach(scrim => {
    if (!scrim) return;
    scrim.addEventListener('click', (e) => {
      if (e.target === scrim) scrim.classList.add('hidden');
    });
  });

  // Initial Boot
  renderBoard();
  if (gameMode === 'vs_ai' && engine.turn === aiColor) {
    triggerAiTurn();
  }
});
