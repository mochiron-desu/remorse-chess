// RemorseBot - Dedicated AI Engine for Remorse Chess
// Evaluates tactical threats, psychological crises, and bishop absolution rituals

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

  class RemorseAI {
    constructor(engine, options = {}) {
      this.engine = engine;
      this.depth = options.depth || 2;
    }

    // Evaluate board state from perspective of color
    evaluate(color) {
      if (this.engine.gameOver) {
        if (this.engine.gameResult && this.engine.gameResult.winner === color) {
          return 99999;
        } else if (this.engine.gameResult && this.engine.gameResult.winner) {
          return -99999;
        }
        return 0; // Draw / stalemate
      }

      const activeColor = color;
      const opponentColor = color === 'w' ? 'b' : 'w';

      let score = 0;

      const pieces = this.engine.getAllPieces();
      for (const p of pieces) {
        if (!p.square) continue;

        let val = PIECE_VALUES[p.type] || 100;

        // Psychological modifiers
        if (p.condition === 'devastated') {
          // Devastated piece is paralyzed and at risk of suicide
          const urgency = p.devastatedTurnsLeft !== null ? (4 - p.devastatedTurnsLeft) * 70 : 100;
          val = val * 0.15 - urgency;
        } else if (p.condition === 'guilt_ridden') {
          // Cannot capture enemy pieces
          val = val * 0.6;
        } else if (p.condition === 'bloodlust') {
          val = val * 1.25 + 50;
        } else if (p.reaction === 'psychopath') {
          val = val * 1.15 + 30;
        }

        // Center control & development bonus
        const sq = p.square;
        const col = sq.charCodeAt(0) - 97;
        const row = parseInt(sq[1], 10) - 1;
        const centerDist = Math.abs(col - 3.5) + Math.abs(row - 3.5);
        val += (7 - centerDist) * 3;

        if (p.color === activeColor) {
          score += val;
        } else {
          score -= val;
        }
      }

      // Bishop availability bonus (loss of bishops loses absolution capability)
      if (this.engine.canAbsolve(activeColor)) {
        score += 80;
      }
      if (this.engine.canAbsolve(opponentColor)) {
        score -= 80;
      }

      // Check pressure
      if (this.engine.isCheck(opponentColor)) score += 50;
      if (this.engine.isCheck(activeColor)) score -= 50;

      return score;
    }

    // Minimax search with alpha-beta pruning
    findBestMove(depth = this.depth) {
      const activeColor = this.engine.turn;
      const legalMoves = this.engine.getLegalMoves();

      if (legalMoves.length === 0) return null;
      if (legalMoves.length === 1) return legalMoves[0];

      // Shuffle moves slightly for non-deterministic variety among equal moves
      const shuffledMoves = legalMoves.slice().sort(() => Math.random() - 0.5);

      // Prioritize:
      // 1. Absolving a devastated piece near death
      // 2. Capturing high-value pieces
      // 3. Other moves
      shuffledMoves.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        if (a.type === 'absolve') {
          scoreA += 500;
          if (a.target && a.target.devastatedTurnsLeft <= 1) scoreA += 1000;
        }
        if (b.type === 'absolve') {
          scoreB += 500;
          if (b.target && b.target.devastatedTurnsLeft <= 1) scoreB += 1000;
        }
        if (a.captured) scoreA += (PIECE_VALUES[a.captured.type] || 100);
        if (b.captured) scoreB += (PIECE_VALUES[b.captured.type] || 100);
        return scoreB - scoreA;
      });

      let bestMoveData = { from: shuffledMoves[0].from, to: shuffledMoves[0].to, promotion: shuffledMoves[0].promotion, type: shuffledMoves[0].type };
      let bestScore = -Infinity;
      const alpha = -Infinity;
      const beta = Infinity;

      for (const move of shuffledMoves) {
        const snap = this.engine.takeSnapshot();
        try {
          this.engine.isSimulating = true;
          const prevAuto = this.engine.options.autoRollDice;
          this.engine.options.autoRollDice = true;

          const res = this.engine.makeMove(move);

          let evalScore = 0;
          // If bonus move granted, AI continues searching its own bonus move
          if (res && res.extraMoveGranted) {
            evalScore = this.search(depth, alpha, beta, true, activeColor);
          } else {
            evalScore = -this.search(depth - 1, -beta, -alpha, false, activeColor === 'w' ? 'b' : 'w');
          }

          this.engine.options.autoRollDice = prevAuto;

          if (evalScore > bestScore) {
            bestScore = evalScore;
            bestMoveData = { from: move.from, to: move.to, promotion: move.promotion, type: move.type };
          }
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
      if (depth <= 0 || this.engine.gameOver) {
        return this.evaluate(currentSearchColor);
      }

      const legalMoves = this.engine.getLegalMoves();
      if (legalMoves.length === 0) {
        return this.evaluate(currentSearchColor);
      }

      let maxEval = -Infinity;
      for (const move of legalMoves) {
        const snap = this.engine.takeSnapshot();
        try {
          this.engine.isSimulating = true;
          const prevAuto = this.engine.options.autoRollDice;
          this.engine.options.autoRollDice = true;

          const res = this.engine.makeMove(move);
          let evalScore = 0;

          if (res && res.extraMoveGranted) {
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
