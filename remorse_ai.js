// RemorseBot - Dedicated AI Engine for Remorse Chess
// Evaluates tactical threats, psychological crises, bishop absolution rituals, and bloodlust opportunities

(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    root.RemorseAI = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const PIECE_VALUES = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 950,
    k: 20000
  };

  // Piece-Square Tables (White perspective, rank 8 at top, rank 1 at bottom)
  const PST_PAWN = [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0
  ];

  const PST_KNIGHT = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
  ];

  const PST_BISHOP = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
  ];

  const PST_ROOK = [
     0,  0,  0,  5,  5,  0,  0,  0,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     5, 10, 10, 10, 10, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0
  ];

  const PST_QUEEN = [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -10,  5,  5,  5,  5,  5,  0,-10,
      0,  0,  5,  5,  5,  5,  0, -5,
     -5,  0,  5,  5,  5,  5,  0, -5,
    -10,  0,  5,  5,  5,  5,  0,-10,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
  ];

  const PST_KING_MID = [
     20, 30, 10,  0,  0, 10, 30, 20,
     20, 20,  0,  0,  0,  0, 20, 20,
    -10,-20,-20,-20,-20,-20,-20,-10,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30
  ];

  function getPstScore(type, color, col, row) {
    let table = null;
    switch (type) {
      case 'p': table = PST_PAWN; break;
      case 'n': table = PST_KNIGHT; break;
      case 'b': table = PST_BISHOP; break;
      case 'r': table = PST_ROOK; break;
      case 'q': table = PST_QUEEN; break;
      case 'k': table = PST_KING_MID; break;
      default: return 0;
    }
    const idx = color === 'w' ? (7 - row) * 8 + col : row * 8 + col;
    return table[idx] || 0;
  }

  function getChebyshevDist(col1, row1, col2, row2) {
    return Math.max(Math.abs(col1 - col2), Math.abs(row1 - row2));
  }

  class RemorseAI {
    constructor(engine, options = {}) {
      this.engine = engine;
      this.depth = options.depth || 3;
    }

    // Evaluate board state from perspective of color
    evaluate(color) {
      if (this.engine.gameOver) {
        if (this.engine.gameResult && this.engine.gameResult.winner === color) {
          return 99999;
        } else if (this.engine.gameResult && this.engine.gameResult.winner) {
          return -99999;
        }
        return 0; // Draw (stalemate, 50-move rule, threefold repetition, insufficient material)
      }

      const activeColor = color;
      const opponentColor = color === 'w' ? 'b' : 'w';

      let score = 0;

      const livingPieces = this.engine.getLivingPieces();
      const friendlyBishops = livingPieces.filter(p => p.color === activeColor && p.type === 'b' && p.condition !== 'devastated');
      const enemyBishops = livingPieces.filter(p => p.color === opponentColor && p.type === 'b' && p.condition !== 'devastated');

      for (const p of livingPieces) {
        if (!p.square) continue;

        const col = p.square.charCodeAt(0) - 97;
        const row = parseInt(p.square[1], 10) - 1;
        const isFriendly = p.color === activeColor;

        let val = PIECE_VALUES[p.type] || 100;
        val += getPstScore(p.type, p.color, col, row);

        // Remorse Psychological Evaluations
        if (p.condition === 'devastated') {
          // Devastated piece is paralyzed and counting down to self-capture
          const urgency = p.devastatedTurnsLeft !== null ? (4 - p.devastatedTurnsLeft) * 80 : 120;
          val = val * 0.2 - urgency;

          // Bishop rescue mission pull
          const relevantBishops = isFriendly ? friendlyBishops : enemyBishops;
          if (relevantBishops.length > 0) {
            let minDist = 99;
            for (const b of relevantBishops) {
              const bCol = b.square.charCodeAt(0) - 97;
              const bRow = parseInt(b.square[1], 10) - 1;
              const d = getChebyshevDist(col, row, bCol, bRow);
              if (d < minDist) minDist = d;
            }
            const rescueFactor = (p.devastatedTurnsLeft <= 1 ? 90 : 45);
            val += (7 - minDist) * rescueFactor;
          }
        } else if (p.condition === 'guilt_ridden') {
          // Cannot capture enemy pieces
          if (p.type === 'q' || p.type === 'r') {
            val = val * 0.5; // Crippling for major attacking pieces
          } else if (p.type === 'p') {
            val = val * 0.9; // Pawns can still push, block, and promote (promotion clears guilt)
          } else {
            val = val * 0.65;
          }

          // Meditating bishop bonus for imminent self-cleansing
          if (p.type === 'b' && p.cleansingTurnsLeft !== null && p.cleansingTurnsLeft <= 1) {
            val += 60;
          }
        } else if (p.condition === 'bloodlust') {
          // Bloodlust piece must capture every turn
          val = val * 1.35 + 80;
        } else if (p.reaction === 'psychopath') {
          val = val * 1.15 + 40;
        }

        if (isFriendly) {
          score += val;
        } else {
          score -= val;
        }
      }

      // Solitary Bishop Conservation (Rule 4: losing all bishops loses absolution ability permanently)
      if (friendlyBishops.length === 1) score += 120;
      else if (friendlyBishops.length === 0) score -= 80;

      if (enemyBishops.length === 1) score -= 120;
      else if (enemyBishops.length === 0) score += 80;

      // King castling safety bonus
      const friendlyKing = this.engine.pieces[activeColor === 'w' ? 'wK' : 'bK'];
      if (friendlyKing && friendlyKing.hasMoved && !this.engine.isCheck(activeColor)) {
        if (friendlyKing.square === 'g1' || friendlyKing.square === 'c1' || friendlyKing.square === 'g8' || friendlyKing.square === 'c8') {
          score += 45;
        }
      }

      // Check pressure
      if (this.engine.isCheck(opponentColor)) score += 40;
      if (this.engine.isCheck(activeColor)) score -= 50;

      return score;
    }

    // Move Ordering for Alpha-Beta optimization
    orderMoves(moves, activeColor) {
      const friendlyBishops = this.engine.getLivingBishops(activeColor).filter(b => b.condition !== 'devastated');
      const devastatedFriends = this.engine.getLivingPieces(activeColor).filter(p => p.condition === 'devastated');

      moves.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;

        // 1. King Regicide Capture (instant win)
        if (a.captured && a.captured.type === 'k') scoreA += 100000;
        if (b.captured && b.captured.type === 'k') scoreB += 100000;

        // 2. Absolution moves
        if (a.type === 'absolve') {
          scoreA += 2500;
          if (a.target && a.target.devastatedTurnsLeft <= 1) scoreA += 5000;
        }
        if (b.type === 'absolve') {
          scoreB += 2500;
          if (b.target && b.target.devastatedTurnsLeft <= 1) scoreB += 5000;
        }

        // 3. Captures via MVV-LVA
        if (a.captured) {
          const victimVal = PIECE_VALUES[a.captured.type] || 100;
          const attackerVal = PIECE_VALUES[a.piece ? a.piece.type : 'p'] || 100;
          scoreA += victimVal * 10 - attackerVal + (a.isFriendlyFire ? -400 : 0);
        }
        if (b.captured) {
          const victimVal = PIECE_VALUES[b.captured.type] || 100;
          const attackerVal = PIECE_VALUES[b.piece ? b.piece.type : 'p'] || 100;
          scoreB += victimVal * 10 - attackerVal + (b.isFriendlyFire ? -400 : 0);
        }

        // 4. Pawn promotions
        if (a.promotion) {
          scoreA += (a.promotion === 'q' ? 900 : a.promotion === 'b' ? 400 : 300);
        }
        if (b.promotion) {
          scoreB += (b.promotion === 'q' ? 900 : b.promotion === 'b' ? 400 : 300);
        }

        // 5. Bishop rescue closing distance to devastated pieces
        if (a.piece && a.piece.type === 'b' && devastatedFriends.length > 0) {
          const toC = a.to.charCodeAt(0) - 97;
          const toR = parseInt(a.to[1], 10) - 1;
          for (const df of devastatedFriends) {
            const dfC = df.square.charCodeAt(0) - 97;
            const dfR = parseInt(df.square[1], 10) - 1;
            const dist = getChebyshevDist(toC, toR, dfC, dfR);
            if (dist <= 1) scoreA += 800;
            else scoreA += (7 - dist) * 40;
          }
        }
        if (b.piece && b.piece.type === 'b' && devastatedFriends.length > 0) {
          const toC = b.to.charCodeAt(0) - 97;
          const toR = parseInt(b.to[1], 10) - 1;
          for (const df of devastatedFriends) {
            const dfC = df.square.charCodeAt(0) - 97;
            const dfR = parseInt(df.square[1], 10) - 1;
            const dist = getChebyshevDist(toC, toR, dfC, dfR);
            if (dist <= 1) scoreB += 800;
            else scoreB += (7 - dist) * 40;
          }
        }

        return scoreB - scoreA;
      });
    }

    // Quiescence Search for tactical stabilization (avoids horizon blunders)
    quiescence(alpha, beta, qdepth, color) {
      const standPat = this.evaluate(color);
      if (qdepth <= 0) return standPat;

      if (standPat >= beta) return beta;
      if (alpha < standPat) alpha = standPat;

      // Only evaluate captures and absolutions
      const legalMoves = this.engine.getLegalMoves();
      const tacticalMoves = legalMoves.filter(m => m.captured || m.type === 'absolve');
      if (tacticalMoves.length === 0) return standPat;

      this.orderMoves(tacticalMoves, color);

      for (const move of tacticalMoves) {
        const snap = this.engine.takeSnapshot();
        try {
          this.engine.isSimulating = true;
          const prevAuto = this.engine.options.autoRollDice;
          this.engine.options.autoRollDice = true;

          const res = this.engine.makeMove(move);
          let evalScore = 0;

          if (this.engine.gameOver) {
            evalScore = this.evaluate(color);
          } else if (res && res.extraMoveGranted) {
            evalScore = this.quiescence(alpha, beta, qdepth - 1, color);
          } else {
            evalScore = -this.quiescence(-beta, -alpha, qdepth - 1, color === 'w' ? 'b' : 'w');
          }

          this.engine.options.autoRollDice = prevAuto;

          if (evalScore >= beta) return beta;
          if (evalScore > alpha) alpha = evalScore;
        } finally {
          this.engine.isSimulating = false;
          this.engine.restoreSnapshot(snap);
        }
      }

      return alpha;
    }

    // Minimax search with alpha-beta pruning
    findBestMove(depth = this.depth) {
      const activeColor = this.engine.turn;
      const legalMoves = this.engine.getLegalMoves();

      if (legalMoves.length === 0) return null;
      if (legalMoves.length === 1) return legalMoves[0];

      // Instant win shortcut: if any move captures the enemy King, take it immediately!
      const regicideMove = legalMoves.find(m => m.captured && m.captured.type === 'k');
      if (regicideMove) return regicideMove;

      const candidates = legalMoves.slice();
      this.orderMoves(candidates, activeColor);

      let bestMoveData = {
        from: candidates[0].from,
        to: candidates[0].to,
        promotion: candidates[0].promotion,
        type: candidates[0].type
      };
      let bestScore = -Infinity;
      let alpha = -Infinity;
      const beta = Infinity;

      for (const move of candidates) {
        const snap = this.engine.takeSnapshot();
        try {
          this.engine.isSimulating = true;
          const prevAuto = this.engine.options.autoRollDice;
          this.engine.options.autoRollDice = true;

          const res = this.engine.makeMove(move);

          let evalScore = 0;
          if (this.engine.gameOver) {
            evalScore = this.evaluate(activeColor);
          } else if (res && res.extraMoveGranted) {
            evalScore = this.search(depth, alpha, beta, true, activeColor);
          } else {
            evalScore = -this.search(depth - 1, -beta, -alpha, false, activeColor === 'w' ? 'b' : 'w');
          }

          this.engine.options.autoRollDice = prevAuto;

          if (evalScore > bestScore) {
            bestScore = evalScore;
            bestMoveData = {
              from: move.from,
              to: move.to,
              promotion: move.promotion,
              type: move.type
            };
          }
          alpha = Math.max(alpha, evalScore);
        } finally {
          this.engine.isSimulating = false;
          this.engine.restoreSnapshot(snap);
        }
      }

      const freshLegal = this.engine.getLegalMoves();
      return freshLegal.find(m =>
        m.from === bestMoveData.from &&
        m.to === bestMoveData.to &&
        (m.promotion || null) === (bestMoveData.promotion || null) &&
        (m.type || 'move') === (bestMoveData.type || 'move')
      ) || freshLegal[0];
    }

    search(depth, alpha, beta, isSamePlayerBonus, currentSearchColor) {
      if (this.engine.gameOver) {
        return this.evaluate(currentSearchColor);
      }

      if (depth <= 0) {
        return this.quiescence(alpha, beta, 2, currentSearchColor);
      }

      const legalMoves = this.engine.getLegalMoves();
      if (legalMoves.length === 0) {
        return this.evaluate(currentSearchColor);
      }

      // Regicide check in tree
      const kingCap = legalMoves.find(m => m.captured && m.captured.type === 'k');
      if (kingCap) return 99999;

      this.orderMoves(legalMoves, currentSearchColor);

      let maxEval = -Infinity;
      for (const move of legalMoves) {
        const snap = this.engine.takeSnapshot();
        try {
          this.engine.isSimulating = true;
          const prevAuto = this.engine.options.autoRollDice;
          this.engine.options.autoRollDice = true;

          const res = this.engine.makeMove(move);
          let evalScore = 0;

          if (this.engine.gameOver) {
            evalScore = this.evaluate(currentSearchColor);
          } else if (res && res.extraMoveGranted) {
            evalScore = this.search(depth, alpha, beta, true, currentSearchColor);
          } else {
            evalScore = -this.search(depth - 1, -beta, -alpha, false, currentSearchColor === 'w' ? 'b' : 'w');
          }

          this.engine.options.autoRollDice = prevAuto;

          maxEval = Math.max(maxEval, evalScore);
          alpha = Math.max(alpha, evalScore);
          if (beta <= alpha) {
            break; // Beta cutoff
          }
        } finally {
          this.engine.isSimulating = false;
          this.engine.restoreSnapshot(snap);
        }
      }

      return maxEval;
    }
  }

  return RemorseAI;
}));
