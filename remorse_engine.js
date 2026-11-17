// Remorse Chess Engine - Version 1.0
// Official Rulebook Implementation

(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    root.RemorseEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // Coordinates & helpers
  const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];

  function fileIndex(f) { return f.charCodeAt(0) - 97; }
  function rankIndex(r) { return parseInt(r, 10) - 1; }
  function coordsToSquare(c, r) {
    if (c < 0 || c > 7 || r < 0 || r > 7) return null;
    return FILES[c] + RANKS[r];
  }
  function squareToCoords(sq) {
    if (!sq || sq.length < 2) return null;
    return { col: fileIndex(sq[0]), row: rankIndex(sq[1]) };
  }

  function isAdjacent(sq1, sq2) {
    const c1 = squareToCoords(sq1);
    const c2 = squareToCoords(sq2);
    if (!c1 || !c2) return false;
    const dc = Math.abs(c1.col - c2.col);
    const dr = Math.abs(c1.row - c2.row);
    return (dc <= 1 && dr <= 1) && (dc + dr > 0);
  }

  class RemorseEngine {
    constructor(options = {}) {
      this.options = Object.assign({
        autoRollDice: false, // If true, automatically generates 1-6; if false, emits pending dice roll
        allowKingCheckExemptForPacifists: true // If piece cannot capture, it cannot deliver check
      }, options);

      this.reset();
    }

    reset() {
      this.turn = 'w';
      this.turnCount = 1; // Full move count
      this.halfMoves = 0;
      this.gameOver = false;
      this.gameResult = null; // { status, winner, reason }
      
      // Piece map: square -> piece
      this.board = {};

      // Piece list: id -> piece
      this.pieces = {};

      // Castling rights: w: { k: true, q: true }, b: { k: true, q: true }
      this.castling = {
        w: { k: true, q: true },
        b: { k: true, q: true }
      };

      // En passant target square (e.g. 'e3' if e4 double-pushed)
      this.enPassant = null;

      // Bonus move state for psychopath
      // { active: true, pieceId: string, capturesMade: number }
      this.bonusMoveState = null;

      // Pending dice roll state
      // { pieceId, capturedPiece, from, to }
      this.pendingDiceRoll = null;

      // Move & Event History
      this.history = [];
      this.undoStack = [];
      this.redoStack = [];

      this.initStandardPieces();
    }

    initStandardPieces() {
      const initialSetup = [
        // White pieces
        { id: 'wR1', type: 'r', color: 'w', square: 'a1' },
        { id: 'wN1', type: 'n', color: 'w', square: 'b1' },
        { id: 'wB1', type: 'b', color: 'w', square: 'c1' },
        { id: 'wQ',  type: 'q', color: 'w', square: 'd1' },
        { id: 'wK',  type: 'k', color: 'w', square: 'e1' },
        { id: 'wB2', type: 'b', color: 'w', square: 'f1' },
        { id: 'wN2', type: 'n', color: 'w', square: 'g1' },
        { id: 'wR2', type: 'r', color: 'w', square: 'h1' },
        { id: 'wP1', type: 'p', color: 'w', square: 'a2' },
        { id: 'wP2', type: 'p', color: 'w', square: 'b2' },
        { id: 'wP3', type: 'p', color: 'w', square: 'c2' },
        { id: 'wP4', type: 'p', color: 'w', square: 'd2' },
        { id: 'wP5', type: 'p', color: 'w', square: 'e2' },
        { id: 'wP6', type: 'p', color: 'w', square: 'f2' },
        { id: 'wP7', type: 'p', color: 'w', square: 'g2' },
        { id: 'wP8', type: 'p', color: 'w', square: 'h2' },

        // Black pieces
        { id: 'bR1', type: 'r', color: 'b', square: 'a8' },
        { id: 'bN1', type: 'n', color: 'b', square: 'b8' },
        { id: 'bB1', type: 'b', color: 'b', square: 'c8' },
        { id: 'bQ',  type: 'q', color: 'b', square: 'd8' },
        { id: 'bK',  type: 'k', color: 'b', square: 'e8' },
        { id: 'bB2', type: 'b', color: 'b', square: 'f8' },
        { id: 'bN2', type: 'n', color: 'b', square: 'g8' },
        { id: 'bR2', type: 'r', color: 'b', square: 'h8' },
        { id: 'bP1', type: 'p', color: 'b', square: 'a7' },
        { id: 'bP2', type: 'p', color: 'b', square: 'b7' },
        { id: 'bP3', type: 'p', color: 'b', square: 'c7' },
        { id: 'bP4', type: 'p', color: 'b', square: 'd7' },
        { id: 'bP5', type: 'p', color: 'b', square: 'e7' },
        { id: 'bP6', type: 'p', color: 'b', square: 'f7' },
        { id: 'bP7', type: 'p', color: 'b', square: 'g7' },
        { id: 'bP8', type: 'p', color: 'b', square: 'h7' }
      ];

      for (const item of initialSetup) {
        const piece = {
          id: item.id,
          type: item.type,
          color: item.color,
          square: item.square,
          hasMoved: false,
          hasRolled: false,
          reaction: null, // 'devastated', 'guilt_ridden', 'unaffected', 'psychopath'
          condition: 'normal', // 'normal', 'devastated', 'guilt_ridden', 'bloodlust'
          kills: 0,
          devastatedTurnsLeft: null, // 3 when devastated
          cleansingTurnsLeft: null, // 1 when bishop is guilt-ridden
          isAbsolved: false,
          promoted: false
        };
        this.pieces[piece.id] = piece;
        this.board[piece.square] = piece;
      }
    }

    getPiece(square) {
      return this.board[square] || null;
    }

    getPieceById(id) {
      return this.pieces[id] || null;
    }

    getAllPieces() {
      return Object.values(this.pieces);
    }

    getLivingPieces(color = null) {
      return Object.values(this.pieces).filter(p => {
        if (!p.square) return false;
        if (color && p.color !== color) return false;
        return true;
      });
    }

    getLivingBishops(color) {
      return this.getLivingPieces(color).filter(p => p.type === 'b');
    }

    canAbsolve(color) {
      // Rule 4: If all of a player's bishops are captured, the player loses the ability to absolve other pieces.
      // Bishop must not be devastated.
      const bishops = this.getLivingBishops(color);
      return bishops.some(b => b.condition !== 'devastated');
    }

    // Roll d6 for reaction assignment
    rollD6() {
      return Math.floor(Math.random() * 6) + 1;
    }

    // Apply psychological reaction from D6 roll
    applyReaction(pieceId, rollValue = null, fromMakeMove = false) {
      const piece = this.pieces[pieceId];
      if (!piece || piece.hasRolled) return null;

      const roll = rollValue || this.rollD6();
      piece.hasRolled = true;

      let reactionName = '';
      if (roll === 1) {
        reactionName = 'devastated';
        piece.reaction = 'devastated';
        piece.condition = 'devastated';
        piece.devastatedTurnsLeft = 3;
      } else if (roll === 2 || roll === 3) {
        reactionName = 'guilt_ridden';
        piece.reaction = 'guilt_ridden';
        piece.condition = 'guilt_ridden';
        // Bishop guilt special case: if a bishop captures, it spends its NEXT turn cleansing conscience
        if (piece.type === 'b') {
          piece.cleansingTurnsLeft = 2;
        }
      } else if (roll === 4 || roll === 5) {
        reactionName = 'unaffected';
        piece.reaction = 'unaffected';
        piece.condition = 'normal';
      } else if (roll === 6) {
        reactionName = 'psychopath';
        piece.reaction = 'psychopath';
        piece.condition = 'normal';
      }

      const event = {
        type: 'reaction_roll',
        pieceId: piece.id,
        pieceType: piece.type,
        color: piece.color,
        square: piece.square,
        roll: roll,
        reaction: reactionName,
        condition: piece.condition,
        extraMoveGranted: false,
        message: this.getReactionLogMessage(piece, roll, reactionName)
      };

      this.history.push(event);

      // If applied after manual roll (outside makeMove)
      if (!fromMakeMove) {
        this.pendingDiceRoll = null;
        if (piece.reaction === 'psychopath') {
          if (piece.kills >= 3 && piece.condition !== 'bloodlust') {
            piece.condition = 'bloodlust';
            this.history.push({
              type: 'bloodlust_awakened',
              pieceId: piece.id,
              color: piece.color,
              message: `🔥 BLOODLUST AWAKENED! ${this.pieceName(piece.type)} on ${piece.square} has claimed 3 victims! Must capture every turn, even friendly units!`
            });
          }
          const isAlreadyInBonus = this.bonusMoveState && this.bonusMoveState.active;
          if (!isAlreadyInBonus) {
            this.bonusMoveState = {
              active: true,
              pieceId: piece.id,
              capturesMade: 1
            };
            event.extraMoveGranted = true;
          }
        } else {
          // Finish turn that was deferred while awaiting dice roll
          this.finishTurn();
        }
      }

      return event;
    }

    getReactionLogMessage(piece, roll, reaction) {
      const name = `${piece.color === 'w' ? 'White' : 'Black'} ${this.pieceName(piece.type)}`;
      if (reaction === 'devastated') {
        return `🎲 ${name} rolled ${roll}: DEVASTATED! Paralyzed by guilt. Must be absolved within 3 turns or will self-capture.`;
      } else if (reaction === 'guilt_ridden') {
        return `🎲 ${name} rolled ${roll}: GUILT-RIDDEN! A guilt token is placed. Piece cannot capture enemy pieces.`;
      } else if (reaction === 'unaffected') {
        return `🎲 ${name} rolled ${roll}: UNAFFECTED! Remains calm and indifferent to violence. Orthodox rules apply.`;
      } else if (reaction === 'psychopath') {
        return `🎲 ${name} rolled ${roll}: PSYCHOPATH! Awakened with bloodlust thrill! Immediate bonus move granted.`;
      }
      return '';
    }

    pieceName(type) {
      switch (type) {
        case 'p': return 'Pawn';
        case 'n': return 'Knight';
        case 'b': return 'Bishop';
        case 'r': return 'Rook';
        case 'q': return 'Queen';
        case 'k': return 'King';
        default: return 'Piece';
      }
    }

    // Bishop Absolution action
    // Bishop on bishopSquare absolves affected piece on targetSquare
    canBishopAbsolveTarget(bishopSquare, targetSquare) {
      const bishop = this.getPiece(bishopSquare);
      const target = this.getPiece(targetSquare);
      if (!bishop || !target) return false;
      if (bishop.type !== 'b' || bishop.color !== this.turn) return false;
      if (bishop.condition === 'devastated') return false; // Devastated bishop cannot act
      if (target.color !== this.turn) return false; // Friendly piece only
      if (!isAdjacent(bishopSquare, targetSquare)) return false; // Must be adjacent

      // Target must be devastated or guilt-ridden
      if (target.condition !== 'devastated' && target.condition !== 'guilt_ridden') return false;

      // Devastated bishop can only be absolved by another bishop (Section 3.1)
      if (target.type === 'b' && target.condition === 'devastated' && bishop.id === target.id) return false;

      return true;
    }

    executeAbsolution(bishopSquare, targetSquare) {
      if (!this.canBishopAbsolveTarget(bishopSquare, targetSquare)) {
        throw new Error(`Illegal absolution: Bishop on ${bishopSquare} cannot absolve piece on ${targetSquare}`);
      }

      // If in check, can bishop absolve? Only if king is NOT in check
      if (this.isCheck(this.turn)) {
        throw new Error('Illegal move: King is in check, bishop cannot absolve without resolving check.');
      }

      this.pushUndoState();

      const bishop = this.getPiece(bishopSquare);
      const target = this.getPiece(targetSquare);
      const prevCondition = target.condition;

      // Absolve target
      target.condition = 'normal';
      target.isAbsolved = true;
      target.devastatedTurnsLeft = null;
      target.cleansingTurnsLeft = null;

      const event = {
        type: 'absolution',
        bishopId: bishop.id,
        bishopSquare: bishopSquare,
        targetId: target.id,
        targetSquare: targetSquare,
        targetType: target.type,
        color: this.turn,
        prevCondition: prevCondition,
        message: `✝️ Bishop at ${bishopSquare} completed absolution for ${this.pieceName(target.type)} at ${targetSquare}! Condition restored.`
      };

      this.history.push(event);

      // Spending turn: turn passes to opponent, turn counters advance
      this.finishTurn();
      return event;
    }

    // Get all legal moves
    getLegalMoves(square = null) {
      if (this.gameOver) return [];

      let candidates = [];
      const activeColor = this.turn;

      // If bonus move active, ONLY the psychopath piece can move
      if (this.bonusMoveState && this.bonusMoveState.active) {
        const psycho = this.pieces[this.bonusMoveState.pieceId];
        if (!psycho || !psycho.square || psycho.color !== activeColor) {
          this.bonusMoveState = null;
        } else {
          if (square && square !== psycho.square) return [];
          const raw = this.generatePseudoLegalMoves(psycho);
          candidates = raw.filter(m => this.isMoveSafeForKing(m));
          return candidates;
        }
      }

      const pieces = square ? [this.getPiece(square)].filter(Boolean) : this.getLivingPieces(activeColor);

      for (const p of pieces) {
        if (p.color !== activeColor) continue;
        const pseudo = this.generatePseudoLegalMoves(p);
        for (const m of pseudo) {
          if (this.isMoveSafeForKing(m)) {
            candidates.push(m);
          }
        }

        // Check for Absolution moves if piece is a Bishop
        if (p.type === 'b' && p.condition !== 'devastated') {
          const adjSquares = this.getAdjacentSquares(p.square);
          for (const sq of adjSquares) {
            const target = this.getPiece(sq);
            if (target && target.color === activeColor && (target.condition === 'devastated' || target.condition === 'guilt_ridden')) {
              // Special case: Devastated bishop can be absolved by another bishop (not itself)
              if (target.id !== p.id) {
                // If king is in check, bishop cannot absolve
                if (!this.isCheck(activeColor)) {
                  candidates.push({
                    from: p.square,
                    to: sq,
                    type: 'absolve',
                    piece: p,
                    target: target,
                    san: `Absolve(${target.type.toUpperCase()}${sq})`
                  });
                }
              }
            }
          }
        }
      }

      return candidates;
    }

    getAdjacentSquares(sq) {
      const c = squareToCoords(sq);
      if (!c) return [];
      const res = [];
      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) {
          if (dc === 0 && dr === 0) continue;
          const s = coordsToSquare(c.col + dc, c.row + dr);
          if (s) res.push(s);
        }
      }
      return res;
    }

    // Pseudo-legal moves obeying psychological conditions
    generatePseudoLegalMoves(piece) {
      // Rule 3.1: Devastated piece is completely immobilized. Cannot move or capture.
      if (piece.condition === 'devastated') {
        return [];
      }

      // Rule 3.4 & 8.10: Bloodlust debuff
      // The piece can only move if it is able to capture another piece.
      // Cannot make ordinary non-capturing moves.
      // Can capture enemy AND friendly pieces! (Except own king).
      if (piece.condition === 'bloodlust') {
        return this.generateBloodlustMoves(piece);
      }

      // Orthodox generator with psychological filters
      const moves = this.generateOrthodoxMoves(piece);

      // Rule 3.2: Guilt-ridden piece cannot capture enemy pieces!
      if (piece.condition === 'guilt_ridden') {
        return moves.filter(m => !m.captured);
      }

      return moves;
    }

    generateBloodlustMoves(piece) {
      const moves = [];
      const c = squareToCoords(piece.square);
      const color = piece.color;
      const ownKingId = color === 'w' ? 'wK' : 'bK';

      const tryAddCapture = (toSq, isPromotion = false) => {
        const target = this.getPiece(toSq);
        if (!target) return; // Bloodlust pieces CANNOT move to empty squares
        if (target.id === ownKingId) return; // Cannot capture own king

        const isFriendly = target.color === color;
        const promotions = isPromotion ? ['q', 'r', 'b', 'n'] : [null];
        for (const prom of promotions) {
          moves.push({
            from: piece.square,
            to: toSq,
            type: 'move',
            piece: piece,
            captured: target,
            isFriendlyFire: isFriendly,
            promotion: prom,
            san: `${piece.type.toUpperCase()}x${toSq}${prom ? '=' + prom.toUpperCase() : ''}${isFriendly ? '(Friendly)' : ''}`
          });
        }
      };

      if (piece.type === 'p') {
        // Pawn in bloodlust can ONLY capture diagonally forward
        const forwardDir = color === 'w' ? 1 : -1;
        const promoRank = color === 'w' ? 7 : 0;
        for (const dc of [-1, 1]) {
          const sq = coordsToSquare(c.col + dc, c.row + forwardDir);
          if (sq) {
            const isPromo = (c.row + forwardDir === promoRank);
            tryAddCapture(sq, isPromo);
          }
        }
        // En passant capture (if enemy pawn)
        if (this.enPassant) {
          const epCoords = squareToCoords(this.enPassant);
          if (epCoords && epCoords.row === c.row + forwardDir && Math.abs(epCoords.col - c.col) === 1) {
            const enemyPawnSq = coordsToSquare(epCoords.col, c.row);
            const enemyPawn = this.getPiece(enemyPawnSq);
            if (enemyPawn && enemyPawn.color !== color) {
              moves.push({
                from: piece.square,
                to: this.enPassant,
                type: 'move',
                piece: piece,
                captured: enemyPawn,
                isEnPassant: true,
                san: `px${this.enPassant} e.p.`
              });
            }
          }
        }
      } else if (piece.type === 'n') {
        const knightSteps = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (const [dc, dr] of knightSteps) {
          const sq = coordsToSquare(c.col + dc, c.row + dr);
          if (sq) tryAddCapture(sq);
        }
      } else if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
        const dirs = [];
        if (piece.type === 'b' || piece.type === 'q') {
          dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
        }
        if (piece.type === 'r' || piece.type === 'q') {
          dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
        }
        for (const [dc, dr] of dirs) {
          let step = 1;
          while (true) {
            const sq = coordsToSquare(c.col + dc * step, c.row + dr * step);
            if (!sq) break;
            const target = this.getPiece(sq);
            if (target) {
              tryAddCapture(sq);
              break; // Ray blocked after first piece
            }
            step++;
          }
        }
      } else if (piece.type === 'k') {
        for (let dc = -1; dc <= 1; dc++) {
          for (let dr = -1; dr <= 1; dr++) {
            if (dc === 0 && dr === 0) continue;
            const sq = coordsToSquare(c.col + dc, c.row + dr);
            if (sq) tryAddCapture(sq);
          }
        }
      }

      return moves;
    }

    generateOrthodoxMoves(piece) {
      const moves = [];
      const c = squareToCoords(piece.square);
      const color = piece.color;
      const enemyColor = color === 'w' ? 'b' : 'w';

      if (piece.type === 'p') {
        const forwardDir = color === 'w' ? 1 : -1;
        const startRank = color === 'w' ? 1 : 6;
        const promoRank = color === 'w' ? 7 : 0;

        // 1 step forward
        const f1 = coordsToSquare(c.col, c.row + forwardDir);
        if (f1 && !this.getPiece(f1)) {
          const isPromo = (c.row + forwardDir === promoRank);
          const promos = isPromo ? ['q', 'r', 'b', 'n'] : [null];
          for (const prom of promos) {
            moves.push({
              from: piece.square,
              to: f1,
              type: 'move',
              piece: piece,
              captured: null,
              promotion: prom,
              san: `${f1}${prom ? '=' + prom.toUpperCase() : ''}`
            });
          }

          // 2 steps forward from starting rank
          if (c.row === startRank) {
            const f2 = coordsToSquare(c.col, c.row + 2 * forwardDir);
            if (f2 && !this.getPiece(f2)) {
              moves.push({
                from: piece.square,
                to: f2,
                type: 'move',
                piece: piece,
                captured: null,
                isDoublePawnPush: true,
                san: `${f2}`
              });
            }
          }
        }

        // Diagonal captures
        for (const dc of [-1, 1]) {
          const capSq = coordsToSquare(c.col + dc, c.row + forwardDir);
          if (!capSq) continue;
          const target = this.getPiece(capSq);
          if (target && target.color === enemyColor) {
            const isPromo = (c.row + forwardDir === promoRank);
            const promos = isPromo ? ['q', 'r', 'b', 'n'] : [null];
            for (const prom of promos) {
              moves.push({
                from: piece.square,
                to: capSq,
                type: 'move',
                piece: piece,
                captured: target,
                promotion: prom,
                san: `${piece.square[0]}x${capSq}${prom ? '=' + prom.toUpperCase() : ''}`
              });
            }
          } else if (capSq === this.enPassant) {
            // En passant capture
            const epPawnSq = coordsToSquare(c.col + dc, c.row);
            const epPawn = this.getPiece(epPawnSq);
            if (epPawn && epPawn.color === enemyColor) {
              moves.push({
                from: piece.square,
                to: capSq,
                type: 'move',
                piece: piece,
                captured: epPawn,
                isEnPassant: true,
                san: `${piece.square[0]}x${capSq} e.p.`
              });
            }
          }
        }
      } else if (piece.type === 'n') {
        const knightSteps = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (const [dc, dr] of knightSteps) {
          const sq = coordsToSquare(c.col + dc, c.row + dr);
          if (!sq) continue;
          const target = this.getPiece(sq);
          if (!target) {
            moves.push({ from: piece.square, to: sq, type: 'move', piece: piece, captured: null, san: `N${sq}` });
          } else if (target.color === enemyColor) {
            moves.push({ from: piece.square, to: sq, type: 'move', piece: piece, captured: target, san: `Nx${sq}` });
          }
        }
      } else if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
        const dirs = [];
        if (piece.type === 'b' || piece.type === 'q') {
          dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
        }
        if (piece.type === 'r' || piece.type === 'q') {
          dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
        }
        const sym = piece.type.toUpperCase();
        for (const [dc, dr] of dirs) {
          let step = 1;
          while (true) {
            const sq = coordsToSquare(c.col + dc * step, c.row + dr * step);
            if (!sq) break;
            const target = this.getPiece(sq);
            if (!target) {
              moves.push({ from: piece.square, to: sq, type: 'move', piece: piece, captured: null, san: `${sym}${sq}` });
            } else {
              if (target.color === enemyColor) {
                moves.push({ from: piece.square, to: sq, type: 'move', piece: piece, captured: target, san: `${sym}x${sq}` });
              }
              break;
            }
            step++;
          }
        }
      } else if (piece.type === 'k') {
        for (let dc = -1; dc <= 1; dc++) {
          for (let dr = -1; dr <= 1; dr++) {
            if (dc === 0 && dr === 0) continue;
            const sq = coordsToSquare(c.col + dc, c.row + dr);
            if (!sq) continue;
            const target = this.getPiece(sq);
            if (!target) {
              moves.push({ from: piece.square, to: sq, type: 'move', piece: piece, captured: null, san: `K${sq}` });
            } else if (target.color === enemyColor) {
              moves.push({ from: piece.square, to: sq, type: 'move', piece: piece, captured: target, san: `Kx${sq}` });
            }
          }
        }

        // Castling
        if (!piece.hasMoved && !this.isCheck(color)) {
          const rank = color === 'w' ? '1' : '8';
          // Kingside: e to g, rook on h
          if (this.castling[color].k) {
            const fSq = 'f' + rank;
            const gSq = 'g' + rank;
            const hSq = 'h' + rank;
            const rook = this.getPiece(hSq);
            if (rook && rook.type === 'r' && !rook.hasMoved && !this.getPiece(fSq) && !this.getPiece(gSq)) {
              if (!this.isSquareAttacked(fSq, enemyColor) && !this.isSquareAttacked(gSq, enemyColor)) {
                moves.push({
                  from: piece.square,
                  to: gSq,
                  type: 'move',
                  piece: piece,
                  captured: null,
                  isCastle: 'k',
                  rookFrom: hSq,
                  rookTo: fSq,
                  san: 'O-O'
                });
              }
            }
          }
          // Queenside: e to c, rook on a
          if (this.castling[color].q) {
            const dSq = 'd' + rank;
            const cSq = 'c' + rank;
            const bSq = 'b' + rank;
            const aSq = 'a' + rank;
            const rook = this.getPiece(aSq);
            if (rook && rook.type === 'r' && !rook.hasMoved && !this.getPiece(dSq) && !this.getPiece(cSq) && !this.getPiece(bSq)) {
              if (!this.isSquareAttacked(dSq, enemyColor) && !this.isSquareAttacked(cSq, enemyColor)) {
                moves.push({
                  from: piece.square,
                  to: cSq,
                  type: 'move',
                  piece: piece,
                  captured: null,
                  isCastle: 'q',
                  rookFrom: aSq,
                  rookTo: dSq,
                  san: 'O-O-O'
                });
              }
            }
          }
        }
      }

      return moves;
    }

    // Check if square is attacked by attackerColor
    // Takes into account psychological condition:
    // If piece cannot capture (Devastated, or Guilt-ridden), it cannot attack squares!
    isSquareAttacked(targetSq, attackerColor) {
      const pieces = this.getLivingPieces(attackerColor);
      const targetCoords = squareToCoords(targetSq);
      if (!targetCoords) return false;

      for (const p of pieces) {
        // Devastated pieces cannot capture or move
        if (p.condition === 'devastated') continue;

        // Guilt-ridden pieces cannot capture enemy pieces
        if (this.options.allowKingCheckExemptForPacifists && p.condition === 'guilt_ridden') continue;

        const pCoords = squareToCoords(p.square);
        if (!pCoords) continue;

        if (p.type === 'p') {
          const forward = attackerColor === 'w' ? 1 : -1;
          if (targetCoords.row === pCoords.row + forward && Math.abs(targetCoords.col - pCoords.col) === 1) {
            return true;
          }
        } else if (p.type === 'n') {
          const dc = Math.abs(targetCoords.col - pCoords.col);
          const dr = Math.abs(targetCoords.row - pCoords.row);
          if ((dc === 1 && dr === 2) || (dc === 2 && dr === 1)) {
            return true;
          }
        } else if (p.type === 'b' || p.type === 'r' || p.type === 'q') {
          const dc = targetCoords.col - pCoords.col;
          const dr = targetCoords.row - pCoords.row;
          const isDiag = Math.abs(dc) === Math.abs(dr) && dc !== 0;
          const isOrth = (dc === 0 && dr !== 0) || (dr === 0 && dc !== 0);

          let validRay = false;
          if ((p.type === 'b' || p.type === 'q') && isDiag) validRay = true;
          if ((p.type === 'r' || p.type === 'q') && isOrth) validRay = true;

          if (validRay) {
            const stepC = Math.sign(dc);
            const stepR = Math.sign(dr);
            let curC = pCoords.col + stepC;
            let curR = pCoords.row + stepR;
            let blocked = false;
            while (curC !== targetCoords.col || curR !== targetCoords.row) {
              const sq = coordsToSquare(curC, curR);
              if (this.getPiece(sq)) {
                blocked = true;
                break;
              }
              curC += stepC;
              curR += stepR;
            }
            if (!blocked) return true;
          }
        } else if (p.type === 'k') {
          const dc = Math.abs(targetCoords.col - pCoords.col);
          const dr = Math.abs(targetCoords.row - pCoords.row);
          if (dc <= 1 && dr <= 1 && (dc + dr > 0)) {
            return true;
          }
        }
      }

      return false;
    }

    // Check if the king of given color is currently in check
    isCheck(color) {
      const kingId = color === 'w' ? 'wK' : 'bK';
      const king = this.pieces[kingId];
      if (!king || !king.square) return false;
      const enemyColor = color === 'w' ? 'b' : 'w';
      return this.isSquareAttacked(king.square, enemyColor);
    }

    // Test whether a candidate move leaves own king safe
    isMoveSafeForKing(move) {
      if (move.type === 'absolve') {
        // Bishop staying in place to absolve
        return !this.isCheck(this.turn);
      }

      // Simulate move
      const origFrom = move.from;
      const origTo = move.to;
      const movingPiece = move.piece;
      const capturedPiece = move.captured;
      const isCastle = move.isCastle;

      // Temporary apply
      delete this.board[origFrom];
      if (capturedPiece && capturedPiece.square) {
        delete this.board[capturedPiece.square];
        capturedPiece._tempSq = capturedPiece.square;
        capturedPiece.square = null;
      }
      this.board[origTo] = movingPiece;
      movingPiece.square = origTo;

      if (isCastle) {
        const rFrom = move.rookFrom;
        const rTo = move.rookTo;
        const rook = this.board[rFrom];
        if (rook) {
          delete this.board[rFrom];
          this.board[rTo] = rook;
          rook.square = rTo;
        }
      }

      const inCheck = this.isCheck(movingPiece.color);

      // Rollback simulation
      this.board[origFrom] = movingPiece;
      movingPiece.square = origFrom;
      delete this.board[origTo];

      if (capturedPiece && capturedPiece._tempSq) {
        capturedPiece.square = capturedPiece._tempSq;
        this.board[capturedPiece.square] = capturedPiece;
        delete capturedPiece._tempSq;
      }

      if (isCastle) {
        const rFrom = move.rookFrom;
        const rTo = move.rookTo;
        const rook = this.board[rTo];
        if (rook) {
          delete this.board[rTo];
          this.board[rFrom] = rook;
          rook.square = rFrom;
        }
      }

      return !inCheck;
    }

    // Execute Move
    makeMove(moveParam) {
      if (this.gameOver) {
        throw new Error('Game is over.');
      }

      let move = moveParam;
      if (typeof moveParam === 'string') {
        // Parse simple string like "e2e4" or "e7e8q"
        const legal = this.getLegalMoves();
        const from = moveParam.slice(0, 2);
        const to = moveParam.slice(2, 4);
        const prom = moveParam.length > 4 ? moveParam[4].toLowerCase() : null;
        move = legal.find(m => m.from === from && m.to === to && (!prom || m.promotion === prom));
        if (!move) {
          throw new Error(`Invalid move string: ${moveParam}`);
        }
      }

      // If this is an Absolution action
      if (move.type === 'absolve') {
        return this.executeAbsolution(move.from, move.to);
      }

      // Resolve candidate move from legal moves
      const legalMoves = this.getLegalMoves(move.from);
      const matchedMove = legalMoves.find(m =>
        m.from === move.from &&
        m.to === move.to &&
        (m.promotion || null) === (move.promotion || null) &&
        (m.type || 'move') === (move.type || 'move')
      );

      if (!matchedMove) {
        throw new Error(`Illegal move: ${move.from} to ${move.to}`);
      }
      move = matchedMove;

      this.pushUndoState();

      const piece = move.piece;
      const targetSq = move.to;
      const fromSq = move.from;
      const captured = move.captured;
      const isCapture = !!captured;

      // Track snapshot for undo
      const moveRecord = {
        type: 'move',
        color: piece.color,
        pieceId: piece.id,
        pieceType: piece.type,
        from: fromSq,
        to: targetSq,
        captured: captured ? { id: captured.id, type: captured.type, color: captured.color, square: captured.square } : null,
        isFriendlyFire: !!move.isFriendlyFire,
        promotion: move.promotion || null,
        isCastle: move.isCastle || null,
        enPassantPrev: this.enPassant,
        castlingPrev: JSON.parse(JSON.stringify(this.castling)),
        bonusMovePrev: this.bonusMoveState ? Object.assign({}, this.bonusMoveState) : null,
        hasMovedPrev: piece.hasMoved,
        san: move.san
      };

      // Handle Castling moves
      if (move.isCastle) {
        const rFrom = move.rookFrom;
        const rTo = move.rookTo;
        const rook = this.board[rFrom];
        delete this.board[rFrom];
        this.board[rTo] = rook;
        rook.square = rTo;
        rook.hasMoved = true;
      }

      // Update castling rights
      if (piece.type === 'k') {
        this.castling[piece.color].k = false;
        this.castling[piece.color].q = false;
      } else if (piece.type === 'r') {
        if (fromSq === 'a1') this.castling.w.q = false;
        if (fromSq === 'h1') this.castling.w.k = false;
        if (fromSq === 'a8') this.castling.b.q = false;
        if (fromSq === 'h8') this.castling.b.k = false;
      }
      if (captured && captured.type === 'r') {
        if (captured.square === 'a1') this.castling.w.q = false;
        if (captured.square === 'h1') this.castling.w.k = false;
        if (captured.square === 'a8') this.castling.b.q = false;
        if (captured.square === 'h8') this.castling.b.k = false;
      }

      // Handle En Passant target
      if (move.isDoublePawnPush) {
        const forward = piece.color === 'w' ? 1 : -1;
        const c = squareToCoords(fromSq);
        this.enPassant = coordsToSquare(c.col, c.row + forward);
      } else {
        this.enPassant = null;
      }

      // Remove captured piece
      if (captured) {
        delete this.board[captured.square];
        captured.square = null;
        piece.kills += 1;
      }

      // Move piece to new square
      delete this.board[fromSq];
      this.board[targetSq] = piece;
      piece.square = targetSq;
      piece.hasMoved = true;

      // Handle Pawn Promotion
      let promotedPiece = null;
      if (move.promotion) {
        const newType = move.promotion.toLowerCase();
        const promoId = `${piece.color}${newType.toUpperCase()}_promoted_${Date.now()}_${Math.floor(Math.random()*1000)}`;
        promotedPiece = {
          id: promoId,
          type: newType,
          color: piece.color,
          square: targetSq,
          hasMoved: true,
          hasRolled: false, // Rule 5: Promoted piece has no previous capture history and receives reaction roll only after its first capture
          reaction: null,
          condition: 'normal',
          kills: 0,
          devastatedTurnsLeft: null,
          cleansingTurnsLeft: null,
          isAbsolved: false,
          promoted: true
        };
        // Replace pawn with promoted piece
        delete this.pieces[piece.id];
        this.pieces[promotedPiece.id] = promotedPiece;
        this.board[targetSq] = promotedPiece;

        // Check if restoring absolution capability
        if (newType === 'b') {
          moveRecord.restoredAbsolution = true;
        }
      }

      const activeMovingPiece = promotedPiece || piece;

      // --- CAPTURE & PSYCHOLOGICAL SYSTEM ---
      let reactionEvent = null;
      let extraMoveGranted = false;

      if (isCapture) {
        // Rule 2: First capture of the game triggers D6 reaction roll
        if (!activeMovingPiece.hasRolled) {
          if (this.options.autoRollDice) {
            reactionEvent = this.applyReaction(activeMovingPiece.id, null, true);
          } else {
            // Set pending dice roll
            this.pendingDiceRoll = {
              pieceId: activeMovingPiece.id,
              capturedPieceId: captured.id,
              from: fromSq,
              to: targetSq
            };
          }
        }

        // Rule 3.4: Psychopath check & Bloodlust check
        // Rule 3.4: Whenever the piece captures an enemy piece, it immediately receives one additional move.
        // Once a psychopath has captured 3 pieces in total, it develops Bloodlust.
        if (activeMovingPiece.reaction === 'psychopath') {
          if (activeMovingPiece.kills >= 3 && activeMovingPiece.condition !== 'bloodlust') {
            activeMovingPiece.condition = 'bloodlust';
            this.history.push({
              type: 'bloodlust_awakened',
              pieceId: activeMovingPiece.id,
              color: activeMovingPiece.color,
              message: `🔥 BLOODLUST AWAKENED! ${this.pieceName(activeMovingPiece.type)} on ${targetSq} has claimed 3 victims! Must capture every turn, even friendly units!`
            });
          }

          // Rule 3.4: If in bonus move and made another capture, no FURTHER bonus move is granted
          const isAlreadyInBonus = this.bonusMoveState && this.bonusMoveState.active;
          if (!isAlreadyInBonus) {
            // Grant 1 bonus move immediately
            this.bonusMoveState = {
              active: true,
              pieceId: activeMovingPiece.id,
              capturesMade: 1
            };
            extraMoveGranted = true;
          }
        }
      }

      this.history.push(moveRecord);

      // If an extra move was granted to psychopath, DO NOT finish turn yet
      if (extraMoveGranted) {
        // Player retains turn to move psychopath
        moveRecord.extraMove = true;
        return {
          move: moveRecord,
          reaction: reactionEvent,
          extraMoveGranted: true,
          pendingDiceRoll: this.pendingDiceRoll
        };
      }

      // If awaiting manual dice roll, DO NOT finish turn yet!
      if (this.pendingDiceRoll) {
        return {
          move: moveRecord,
          reaction: null,
          extraMoveGranted: false,
          pendingDiceRoll: this.pendingDiceRoll
        };
      }

      // If piece was already in a bonus move, this move completes the bonus turn
      if (this.bonusMoveState && this.bonusMoveState.active) {
        this.bonusMoveState = null;
      }

      // Finish regular turn
      this.finishTurn();

      return {
        move: moveRecord,
        reaction: reactionEvent,
        extraMoveGranted: false,
        pendingDiceRoll: this.pendingDiceRoll
      };
    }

    // End bonus move explicitly (if player chooses not to move psychopath again or has no moves)
    endBonusMove() {
      if (this.bonusMoveState && this.bonusMoveState.active) {
        this.bonusMoveState = null;
        this.finishTurn();
      }
    }

    // Advancing turns, ticking deadlines, self-capture check
    finishTurn() {
      const finishedColor = this.turn;
      const nextColor = finishedColor === 'w' ? 'b' : 'w';

      // Rule 3.1: Turn counting: Only the affected player's turns count towards the 3-turn deadline.
      // Tick devastation countdown for pieces belonging to finishedColor
      const finishedPieces = this.getLivingPieces(finishedColor);
      for (const p of finishedPieces) {
        if (p.condition === 'devastated' && p.devastatedTurnsLeft !== null) {
          p.devastatedTurnsLeft -= 1;
          if (p.devastatedTurnsLeft <= 0) {
            // Self-capture tragedy!
            const sq = p.square;
            delete this.board[sq];
            p.square = null;
            p.condition = 'dead_by_remorse';
            this.history.push({
              type: 'self_capture',
              pieceId: p.id,
              pieceType: p.type,
              color: p.color,
              square: sq,
              message: `💔 TRAGEDY: Devastated ${p.color === 'w' ? 'White' : 'Black'} ${this.pieceName(p.type)} on ${sq} could not bear the remorse and self-captured!`
            });
          }
        }

        // Rule 3.2: Bishop's own guilt: spends its next turn cleansing conscience, automatically absolving itself after that turn.
        if (p.type === 'b' && p.condition === 'guilt_ridden' && p.cleansingTurnsLeft !== null) {
          p.cleansingTurnsLeft -= 1;
          if (p.cleansingTurnsLeft <= 0) {
            p.condition = 'normal';
            p.isAbsolved = true;
            p.cleansingTurnsLeft = null;
            this.history.push({
              type: 'bishop_cleansed',
              pieceId: p.id,
              color: p.color,
              square: p.square,
              message: `🕊️ Conscience Cleansed: Bishop on ${p.square} has absolved itself after prayer and meditation.`
            });
          }
        }
      }

      // Switch turn
      this.turn = nextColor;
      if (nextColor === 'w') {
        this.turnCount += 1;
      }
      this.halfMoves += 1;

      // Check for Game Over (Checkmate or Stalemate)
      this.checkGameEnd();
    }

    checkGameEnd() {
      const activeColor = this.turn;
      const legalMoves = this.getLegalMoves();

      if (legalMoves.length === 0) {
        this.gameOver = true;
        const inCheck = this.isCheck(activeColor);
        if (inCheck) {
          const winner = activeColor === 'w' ? 'b' : 'w';
          this.gameResult = {
            status: 'checkmate',
            winner: winner,
            reason: `${winner === 'w' ? 'White' : 'Black'} wins by Checkmate!`
          };
          this.history.push({
            type: 'game_over',
            result: this.gameResult
          });
        } else {
          this.gameResult = {
            status: 'stalemate',
            winner: null,
            reason: 'Draw by Stalemate: No legal moves available.'
          };
          this.history.push({
            type: 'game_over',
            result: this.gameResult
          });
        }
      }
    }

    // Set custom setup (for sandbox / scenario testing)
    loadScenario(scenario) {
      this.reset();
      this.board = {};
      this.pieces = {};
      this.turn = scenario.turn || 'w';
      this.turnCount = scenario.turnCount || 1;

      for (const item of scenario.pieces) {
        const piece = {
          id: item.id || `${item.color}${item.type.toUpperCase()}_${item.square}`,
          type: item.type,
          color: item.color,
          square: item.square,
          hasMoved: !!item.hasMoved,
          hasRolled: !!item.hasRolled,
          reaction: item.reaction || null,
          condition: item.condition || 'normal',
          kills: item.kills || 0,
          devastatedTurnsLeft: item.devastatedTurnsLeft !== undefined ? item.devastatedTurnsLeft : null,
          cleansingTurnsLeft: item.cleansingTurnsLeft !== undefined ? item.cleansingTurnsLeft : null,
          isAbsolved: !!item.isAbsolved,
          promoted: !!item.promoted
        };
        this.pieces[piece.id] = piece;
        this.board[piece.square] = piece;
      }

      if (scenario.castling) {
        this.castling = JSON.parse(JSON.stringify(scenario.castling));
      } else {
        this.castling = { w: { k: false, q: false }, b: { k: false, q: false } };
      }
      this.enPassant = scenario.enPassant || null;
      this.bonusMoveState = scenario.bonusMoveState || null;
      this.undoStack = [];
      this.redoStack = [];
    }

    takeSnapshot() {
      const snap = {
        turn: this.turn,
        turnCount: this.turnCount,
        halfMoves: this.halfMoves,
        gameOver: this.gameOver,
        gameResult: this.gameResult ? Object.assign({}, this.gameResult) : null,
        castling: JSON.parse(JSON.stringify(this.castling)),
        enPassant: this.enPassant,
        bonusMoveState: this.bonusMoveState ? Object.assign({}, this.bonusMoveState) : null,
        pendingDiceRoll: this.pendingDiceRoll ? Object.assign({}, this.pendingDiceRoll) : null,
        pieces: {},
        board: {},
        historyLength: this.history.length
      };

      for (const [id, p] of Object.entries(this.pieces)) {
        snap.pieces[id] = Object.assign({}, p);
      }
      for (const [sq, p] of Object.entries(this.board)) {
        snap.board[sq] = p.id;
      }
      return snap;
    }

    restoreSnapshot(snap) {
      this.turn = snap.turn;
      this.turnCount = snap.turnCount;
      this.halfMoves = snap.halfMoves;
      this.gameOver = snap.gameOver;
      this.gameResult = snap.gameResult ? Object.assign({}, snap.gameResult) : null;
      this.castling = JSON.parse(JSON.stringify(snap.castling));
      this.enPassant = snap.enPassant;
      this.bonusMoveState = snap.bonusMoveState ? Object.assign({}, snap.bonusMoveState) : null;
      this.pendingDiceRoll = snap.pendingDiceRoll ? Object.assign({}, snap.pendingDiceRoll) : null;

      this.pieces = {};
      this.board = {};

      for (const [id, p] of Object.entries(snap.pieces)) {
        this.pieces[id] = Object.assign({}, p);
      }
      for (const [sq, pId] of Object.entries(snap.board)) {
        this.board[sq] = this.pieces[pId];
      }
      this.history = this.history.slice(0, snap.historyLength);
    }

    pushUndoState() {
      if (this.isSimulating) return;
      this.undoStack.push(this.takeSnapshot());
      this.redoStack = [];
    }

    canUndo() {
      return this.undoStack.length > 0;
    }

    canRedo() {
      return this.redoStack.length > 0;
    }

    undo() {
      if (!this.canUndo()) return false;
      const current = this.takeSnapshot();
      this.redoStack.push(current);
      const prev = this.undoStack.pop();
      this.restoreSnapshot(prev);
      return true;
    }

    redo() {
      if (!this.canRedo()) return false;
      const current = this.takeSnapshot();
      this.undoStack.push(current);
      const next = this.redoStack.pop();
      this.restoreSnapshot(next);
      return true;
    }
  }

  return RemorseEngine;
}));
