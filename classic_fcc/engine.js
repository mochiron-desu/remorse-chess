// Chess Engine with Opening Book, Evaluation, Minimax Search, and Stockfish Worker Integration

class ChessEngine {
  constructor() {
    this.stockfishWorker = null;
    this.isStockfishReady = false;
    this.currentEvalCallback = null;
    this.currentMoveCallback = null;
    this.currentMultiPvCallback = null;
    this.multiPvCandidateMap = new Map();
    this.initStockfish();

    // Piece-Square Tables
    this.pst = {
      p: [
        0,  0,  0,  0,  0,  0,  0,  0,
        50, 50, 50, 50, 50, 50, 50, 50,
        10, 10, 20, 30, 30, 20, 10, 10,
         5,  5, 10, 25, 25, 10,  5,  5,
         0,  0,  0, 20, 20,  0,  0,  0,
         5, -5,-10,  0,  0,-10, -5,  5,
         5, 10, 10,-20,-20, 10, 10,  5,
         0,  0,  0,  0,  0,  0,  0,  0
      ],
      n: [
        -50,-40,-30,-30,-30,-30,-40,-50,
        -40,-20,  0,  0,  0,  0,-20,-40,
        -30,  0, 10, 15, 15, 10,  0,-30,
        -30,  5, 15, 20, 20, 15,  5,-30,
        -30,  0, 15, 20, 20, 15,  0,-30,
        -30,  5, 10, 15, 15, 10,  5,-30,
        -40,-20,  0,  5,  5,  0,-20,-40,
        -50,-40,-30,-30,-30,-30,-40,-50
      ],
      b: [
        -20,-10,-10,-10,-10,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5, 10, 10,  5,  0,-10,
        -10,  5,  5, 10, 10,  5,  5,-10,
        -10,  0, 10, 10, 10, 10,  0,-10,
        -10, 10, 10, 10, 10, 10, 10,-10,
        -10,  5,  0,  0,  0,  0,  5,-10,
        -20,-10,-10,-10,-10,-10,-10,-20
      ],
      r: [
          0,  0,  0,  0,  0,  0,  0,  0,
          5, 10, 10, 10, 10, 10, 10,  5,
         -5,  0,  0,  0,  0,  0,  0, -5,
         -5,  0,  0,  0,  0,  0,  0, -5,
         -5,  0,  0,  0,  0,  0,  0, -5,
         -5,  0,  0,  0,  0,  0,  0, -5,
         -5,  0,  0,  0,  0,  0,  0, -5,
          0,  0,  0,  5,  5,  0,  0,  0
      ],
      q: [
        -20,-10,-10, -5, -5,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5,  5,  5,  5,  0,-10,
         -5,  0,  5,  5,  5,  5,  0, -5,
          0,  0,  5,  5,  5,  5,  0, -5,
        -10,  5,  5,  5,  5,  5,  0,-10,
        -10,  0,  5,  0,  0,  0,  0,-10,
        -20,-10,-10, -5, -5,-10,-10,-20
      ],
      k: [
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -20,-30,-30,-40,-40,-30,-30,-20,
        -10,-20,-20,-20,-20,-20,-20,-10,
         20, 20,  0,  0,  0,  0, 20, 20,
         20, 30, 10,  0,  0, 10, 30, 20
      ]
    };

    this.pieceValues = {
      p: 100,
      n: 320,
      b: 330,
      r: 500,
      q: 900,
      k: 20000
    };

    // Common Opening Book
    this.openingBook = [
      { moves: ["e4"], name: "King's Pawn Opening", eco: "B00" },
      { moves: ["d4"], name: "Queen's Pawn Opening", eco: "A40" },
      { moves: ["c4"], name: "English Opening", eco: "A10" },
      { moves: ["Nf3"], name: "Réti Opening", eco: "A04" },
      { moves: ["e4", "e5"], name: "Open Game", eco: "C20" },
      { moves: ["e4", "c5"], name: "Sicilian Defense", eco: "B20" },
      { moves: ["e4", "e6"], name: "French Defense", eco: "C00" },
      { moves: ["e4", "c6"], name: "Caro-Kann Defense", eco: "B10" },
      { moves: ["e4", "d5"], name: "Scandinavian Defense", eco: "B01" },
      { moves: ["e4", "Nf6"], name: "Alekhine's Defense", eco: "B02" },
      { moves: ["e4", "g6"], name: "Modern Defense", eco: "B06" },
      { moves: ["d4", "d5"], name: "Closed Game", eco: "D00" },
      { moves: ["d4", "Nf6"], name: "Indian Defense", eco: "A45" },
      { moves: ["d4", "e6"], name: "Horwitz Defense", eco: "A40" },
      { moves: ["d4", "f5"], name: "Dutch Defense", eco: "A80" },
      { moves: ["e4", "e5", "Nf3"], name: "King's Knight Opening", eco: "C40" },
      { moves: ["e4", "e5", "Nf3", "Nc6"], name: "Open Game: Main Line", eco: "C44" },
      { moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"], name: "Ruy Lopez", eco: "C60" },
      { moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"], name: "Italian Game", eco: "C50" },
      { moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"], name: "Giuoco Piano", eco: "C50" },
      { moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6"], name: "Two Knights Defense", eco: "C55" },
      { moves: ["e4", "e5", "Nf3", "Nc6", "d4"], name: "Scotch Game", eco: "C45" },
      { moves: ["e4", "e5", "Nf3", "Nf6"], name: "Petrov's Defense", eco: "C42" },
      { moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"], name: "Sicilian Defense: Najdorf Variation", eco: "B90" },
      { moves: ["e4", "c5", "Nf3", "Nc6", "d4", "cxd4", "Nxd4"], name: "Sicilian Defense: Open", eco: "B32" },
      { moves: ["d4", "d5", "c4"], name: "Queen's Gambit", eco: "D06" },
      { moves: ["d4", "d5", "c4", "e6"], name: "Queen's Gambit Declined", eco: "D30" },
      { moves: ["d4", "d5", "c4", "c6"], name: "Slav Defense", eco: "D10" },
      { moves: ["d4", "d5", "c4", "dxc4"], name: "Queen's Gambit Accepted", eco: "D20" },
      { moves: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4"], name: "Nimzo-Indian Defense", eco: "E20" },
      { moves: ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7"], name: "King's Indian Defense", eco: "E60" },
      { moves: ["d4", "Nf6", "c4", "g6", "Nc3", "d5"], name: "Grünfeld Defense", eco: "D80" },
      { moves: ["e4", "c6", "d4", "d5"], name: "Caro-Kann: Classical Variation", eco: "B12" }
    ];
  }

  initStockfish() {
    try {
      // Attempt to load stockfish via Web Worker from reliable CDN
      const sfWorkerScript = `
        importScripts('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');
      `;
      const blob = new Blob([sfWorkerScript], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);

      worker.onmessage = (event) => {
        const line = typeof event.data === 'string' ? event.data : '';
        if (line === 'uciok' || line.includes('readyok')) {
          this.isStockfishReady = true;
          console.log('[Stockfish] Engine ready.');
        }

        // Parse MultiPV candidates
        if (this.currentMultiPvCallback) {
          if (line.includes(' multipv ') && (line.includes(' score cp ') || line.includes(' score mate '))) {
            const mpvMatch = line.match(/\bmultipv\s+(\d+)/);
            const pvMatch = line.match(/\bpv\s+([a-h][1-8][a-h][1-8][qrbn]?)/);
            const cpMatch = line.match(/\bscore\s+cp\s+(-?\d+)/);
            const mateMatch = line.match(/\bscore\s+mate\s+(-?\d+)/);

            if (mpvMatch && pvMatch && (cpMatch || mateMatch)) {
              const rank = parseInt(mpvMatch[1], 10);
              const moveStr = pvMatch[1];
              let scoreCp = 0;
              if (mateMatch) {
                const mate = parseInt(mateMatch[1], 10);
                scoreCp = (mate >= 0 ? 1 : -1) * (100000 - Math.min(9999, Math.abs(mate)));
              } else if (cpMatch) {
                scoreCp = parseInt(cpMatch[1], 10);
              }

              this.multiPvCandidateMap.set(rank, {
                from: moveStr.substring(0, 2),
                to: moveStr.substring(2, 4),
                ...(moveStr.length >= 5 ? { promotion: moveStr[4] } : {}),
                scoreCp,
                rank
              });
            }
            return;
          }
        }

        // Parse best move
        if (line.startsWith('bestmove')) {
          if (this.currentMultiPvCallback) {
            const cb = this.currentMultiPvCallback;
            this.currentMultiPvCallback = null;
            if (this.stockfishWorker) {
              this.stockfishWorker.postMessage('setoption name MultiPV value 1');
            }
            const sorted = [...this.multiPvCandidateMap.entries()]
              .sort(([a], [b]) => a - b)
              .map(([, val]) => val);
            this.multiPvCandidateMap.clear();
            cb(sorted);
            return;
          }

          const parts = line.split(' ');
          const moveUci = parts[1];
          if (this.currentMoveCallback) {
            const cb = this.currentMoveCallback;
            this.currentMoveCallback = null;
            cb(moveUci);
          }
        }

        // Parse evaluation & PV
        if (line.includes('score cp') || line.includes('score mate')) {
          const cpMatch = line.match(/score cp (-?\d+)/);
          const mateMatch = line.match(/score mate (-?\d+)/);
          const pvMatch = line.match(/ pv (.*)/);

          let score = 0;
          let isMate = false;
          let mateTurns = 0;

          if (cpMatch) {
            score = parseInt(cpMatch[1], 10) / 100;
          } else if (mateMatch) {
            isMate = true;
            mateTurns = parseInt(mateMatch[1], 10);
            score = mateTurns > 0 ? 100 : -100;
          }

          const pv = pvMatch ? pvMatch[1] : '';
          if (this.currentEvalCallback) {
            this.currentEvalCallback({
              score,
              isMate,
              mateTurns,
              pv,
              raw: line
            });
          }
        }
      };

      worker.onerror = () => {
        console.warn('[Stockfish] Worker load failed. Using built-in high performance engine.');
        this.stockfishWorker = null;
        this.isStockfishReady = false;
      };

      worker.postMessage('uci');
      worker.postMessage('isready');
      this.stockfishWorker = worker;
    } catch (e) {
      console.warn('[Stockfish] Cannot initialize worker:', e);
      this.stockfishWorker = null;
    }
  }

  identifyOpening(historySAN) {
    if (!historySAN || historySAN.length === 0) return { name: "Starting Position", eco: "A00" };
    let bestMatch = null;
    let maxMatchLen = 0;

    for (const op of this.openingBook) {
      if (op.moves.length <= historySAN.length) {
        let match = true;
        for (let i = 0; i < op.moves.length; i++) {
          if (op.moves[i] !== historySAN[i]) {
            match = false;
            break;
          }
        }
        if (match && op.moves.length > maxMatchLen) {
          maxMatchLen = op.moves.length;
          bestMatch = op;
        }
      }
    }

    return bestMatch || { name: "Custom Opening / Variation", eco: "A00" };
  }

  // Built-in Static Evaluator (centipawns from White's perspective)
  evaluateBoard(game) {
    if (game.in_checkmate()) {
      return game.turn() === 'w' ? -20000 : 20000;
    }
    if (game.in_draw() || game.in_threefold_repetition() || game.in_stalemate()) {
      return 0;
    }

    const board = game.board();
    let score = 0;
    let whiteKnights = 0, blackKnights = 0;
    let whiteBishops = 0, blackBishops = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        const val = this.pieceValues[piece.type];
        const squareIdx = r * 8 + c;
        // Flip square for white pieces in PST
        const pstIdx = piece.color === 'w' ? (7 - r) * 8 + c : squareIdx;
        const pstBonus = this.pst[piece.type] ? this.pst[piece.type][pstIdx] : 0;

        if (piece.color === 'w') {
          score += val + pstBonus;
          if (piece.type === 'b') whiteBishops++;
          if (piece.type === 'n') whiteKnights++;
        } else {
          score -= val + pstBonus;
          if (piece.type === 'b') blackBishops++;
          if (piece.type === 'n') blackKnights++;
        }
      }
    }

    // Bishop pair bonus
    if (whiteBishops >= 2) score += 30;
    if (blackBishops >= 2) score -= 30;

    return score;
  }

  // Quiescence search for captures to avoid horizon effect
  quiescence(game, alpha, beta, depth = 0, maxQDepth = 3) {
    const standPat = this.evaluateBoard(game);
    const isWhite = game.turn() === 'w';

    if (depth >= maxQDepth) return standPat;

    if (isWhite) {
      if (standPat >= beta) return beta;
      if (standPat > alpha) alpha = standPat;
    } else {
      if (standPat <= alpha) return alpha;
      if (standPat < beta) beta = standPat;
    }

    // Generate only capture moves
    const captureMoves = game.moves({ verbose: true }).filter(m => m.captured);
    // Sort captures by MVV-LVA
    captureMoves.sort((a, b) => {
      const valA = (this.pieceValues[a.captured] || 0) - (this.pieceValues[a.piece] || 0);
      const valB = (this.pieceValues[b.captured] || 0) - (this.pieceValues[b.piece] || 0);
      return valB - valA;
    });

    for (const move of captureMoves) {
      game.move(move);
      const score = this.quiescence(game, alpha, beta, depth + 1, maxQDepth);
      game.undo();

      if (isWhite) {
        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
      } else {
        if (score <= alpha) return alpha;
        if (score < beta) beta = score;
      }
    }

    return isWhite ? alpha : beta;
  }

  // Minimax with Alpha-Beta Pruning
  minimax(game, depth, alpha, beta, isMaximizing) {
    if (depth === 0 || game.game_over()) {
      return { score: this.quiescence(game, alpha, beta), move: null };
    }

    const legalMoves = game.moves({ verbose: true });
    if (legalMoves.length === 0) {
      return { score: this.evaluateBoard(game), move: null };
    }

    // Move ordering: prioritize captures and promotions
    legalMoves.sort((a, b) => {
      let scoreA = 0, scoreB = 0;
      if (a.captured) scoreA += 1000 + (this.pieceValues[a.captured] || 0) - (this.pieceValues[a.piece] || 0);
      if (b.captured) scoreB += 1000 + (this.pieceValues[b.captured] || 0) - (this.pieceValues[b.piece] || 0);
      if (a.promotion) scoreA += 800;
      if (b.promotion) scoreB += 800;
      return scoreB - scoreA;
    });

    let bestMove = null;

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of legalMoves) {
        game.move(move);
        const evaluation = this.minimax(game, depth - 1, alpha, beta, false).score;
        game.undo();

        if (evaluation > maxEval) {
          maxEval = evaluation;
          bestMove = move;
        }
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      return { score: maxEval, move: bestMove };
    } else {
      let minEval = Infinity;
      for (const move of legalMoves) {
        game.move(move);
        const evaluation = this.minimax(game, depth - 1, alpha, beta, true).score;
        game.undo();

        if (evaluation < minEval) {
          minEval = evaluation;
          bestMove = move;
        }
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      return { score: minEval, move: bestMove };
    }
  }

  // Get AI Move according to Difficulty Level (1 to 8)
  getAIMove(game, level = 3, callback) {
    const legalMoves = game.moves({ verbose: true });
    if (legalMoves.length === 0) {
      if (callback) callback(null);
      return;
    }

    // Opening book fast check
    const history = game.history();
    for (const op of this.openingBook) {
      if (op.moves.length > history.length) {
        let matches = true;
        for (let i = 0; i < history.length; i++) {
          if (history[i] !== op.moves[i]) {
            matches = false;
            break;
          }
        }
        if (matches) {
          const nextSAN = op.moves[history.length];
          const matchedMove = legalMoves.find(m => m.san === nextSAN);
          if (matchedMove && Math.random() < 0.85) {
            setTimeout(() => callback(matchedMove), 200 + Math.random() * 300);
            return;
          }
        }
      }
    }

    // Stockfish worker if level >= 5 and worker is ready
    if (level >= 5 && this.isStockfishReady && this.stockfishWorker) {
      const fen = game.fen();
      const moveTime = Math.min(2500, level * 300);
      this.currentMoveCallback = (uciMove) => {
        if (!uciMove) {
          this.computeFallbackMove(game, level, callback);
          return;
        }
        const from = uciMove.substring(0, 2);
        const to = uciMove.substring(2, 4);
        const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
        const matchingMove = legalMoves.find(m => m.from === from && m.to === to && (!promotion || m.promotion === promotion));
        if (matchingMove) {
          callback(matchingMove);
        } else {
          this.computeFallbackMove(game, level, callback);
        }
      };
      this.stockfishWorker.postMessage('position fen ' + fen);
      this.stockfishWorker.postMessage('go movetime ' + moveTime);
      return;
    }

    this.computeFallbackMove(game, level, callback);
  }

  computeFallbackMove(game, level, callback) {
    const legalMoves = game.moves({ verbose: true });
    const isWhite = game.turn() === 'w';

    // Difficulty scaling:
    // Level 1: Random or blunder moves (Beginner ~800)
    // Level 2: Depth 1 with 40% noise (~1000)
    // Level 3: Depth 2 with 20% noise (~1300)
    // Level 4: Depth 3 (~1600)
    // Level 5: Depth 3-4 (~1800)
    // Level 6: Depth 4 (~2000)
    // Level 7: Depth 4-5 (~2200)
    // Level 8: Depth 5+ (~2400+)
    let depth = 2;
    let blunderChance = 0;

    switch (level) {
      case 1: depth = 1; blunderChance = 0.50; break;
      case 2: depth = 1; blunderChance = 0.25; break;
      case 3: depth = 2; blunderChance = 0.10; break;
      case 4: depth = 3; blunderChance = 0.03; break;
      case 5: depth = 3; blunderChance = 0.00; break;
      case 6: depth = 4; blunderChance = 0.00; break;
      case 7: depth = 4; blunderChance = 0.00; break;
      case 8: depth = 5; blunderChance = 0.00; break;
      default: depth = 2;
    }

    setTimeout(() => {
      if (Math.random() < blunderChance) {
        // Pick a random move
        const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        callback(randomMove);
        return;
      }

      const result = this.minimax(game, depth, -Infinity, Infinity, isWhite);
      callback(result.move || legalMoves[0]);
    }, 150 + Math.random() * 250);
  }

  // Get Live Position Evaluation (centipawns & best move)
  evaluatePosition(game, callback) {
    if (this.isStockfishReady && this.stockfishWorker) {
      this.currentEvalCallback = (evalData) => {
        // Stockfish returns score from White's perspective
        const fen = game.fen();
        callback({
          score: evalData.score,
          isMate: evalData.isMate,
          mateTurns: evalData.mateTurns,
          pv: evalData.pv,
          bestMoveUci: evalData.pv ? evalData.pv.split(' ')[0] : null
        });
      };
      this.stockfishWorker.postMessage('stop');
      this.stockfishWorker.postMessage('position fen ' + game.fen());
      this.stockfishWorker.postMessage('go depth 12');
      return;
    }

    // High performance JS evaluation
    const isWhite = game.turn() === 'w';
    const evalCentipawns = this.evaluateBoard(game);
    const scorePawns = evalCentipawns / 100;
    const minimaxResult = this.minimax(game, 3, -Infinity, Infinity, isWhite);

    let bestMoveUci = null;
    let pvString = "";
    if (minimaxResult.move) {
      bestMoveUci = minimaxResult.move.from + minimaxResult.move.to + (minimaxResult.move.promotion || '');
      pvString = minimaxResult.move.san;
    }

    callback({
      score: scorePawns,
      isMate: Math.abs(evalCentipawns) >= 19000,
      mateTurns: Math.abs(evalCentipawns) >= 19000 ? (evalCentipawns > 0 ? 1 : -1) : 0,
      pv: pvString,
      bestMoveUci: bestMoveUci
    });
  }

  // Stockfish / Minimax Best Move Promise
  async bestMove(fen, moveTime = 350) {
    if (this.isStockfishReady && this.stockfishWorker) {
      return new Promise((resolve) => {
        let timer = setTimeout(() => {
          this.currentMoveCallback = null;
          resolve(this.fallbackBestMove(fen));
        }, moveTime + 1200);

        this.currentMoveCallback = (moveUci) => {
          clearTimeout(timer);
          if (!moveUci || moveUci === '(none)') {
            resolve(this.fallbackBestMove(fen));
            return;
          }
          const from = moveUci.substring(0, 2);
          const to = moveUci.substring(2, 4);
          const promotion = moveUci.length >= 5 ? moveUci[4] : undefined;
          resolve({ from, to, ...(promotion ? { promotion } : {}) });
        };

        this.stockfishWorker.postMessage('stop');
        this.stockfishWorker.postMessage('position fen ' + fen);
        this.stockfishWorker.postMessage('go movetime ' + moveTime);
      });
    }
    return this.fallbackBestMove(fen);
  }

  // Scored candidates using Stockfish MultiPV or fallback minimax
  async scoredMoves(fen, count = 10, moveTime = 400) {
    if (this.isStockfishReady && this.stockfishWorker) {
      return new Promise((resolve) => {
        const candidateCount = Math.max(1, Math.min(20, count));
        let timer = setTimeout(() => {
          this.currentMultiPvCallback = null;
          if (this.stockfishWorker) {
            this.stockfishWorker.postMessage('stop');
            this.stockfishWorker.postMessage('setoption name MultiPV value 1');
          }
          resolve(this.fallbackScoredMoves(fen, count));
        }, moveTime + 1500);

        this.currentMultiPvCallback = (candidates) => {
          clearTimeout(timer);
          if (!candidates || candidates.length === 0) {
            resolve(this.fallbackScoredMoves(fen, count));
          } else {
            resolve(candidates.slice(0, candidateCount));
          }
        };

        this.stockfishWorker.postMessage('stop');
        this.stockfishWorker.postMessage('setoption name MultiPV value ' + candidateCount);
        this.stockfishWorker.postMessage('position fen ' + fen);
        this.stockfishWorker.postMessage('go movetime ' + moveTime);
      });
    }
    return this.fallbackScoredMoves(fen, count);
  }

  // Ranked candidates (from best to nth)
  async rankedMoves(fen, count = 6, moveTime = 350) {
    const scored = await this.scoredMoves(fen, count, moveTime);
    return scored.map(s => ({ from: s.from, to: s.to, ...(s.promotion ? { promotion: s.promotion } : {}) }));
  }

  // Robust JS fallback evaluator for scored root moves
  fallbackScoredMoves(fen, count = 10) {
    if (typeof Chess === 'undefined') return [];
    const game = new Chess(fen);
    const legalMoves = game.moves({ verbose: true });
    if (legalMoves.length === 0) return [];
    const isWhite = game.turn() === 'w';

    const scored = legalMoves.map((m) => {
      game.move({ from: m.from, to: m.to, promotion: m.promotion });
      let scoreCp = 0;
      if (game.in_checkmate()) {
        scoreCp = 20000;
      } else if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
        scoreCp = 0;
      } else {
        const mini = this.minimax(game, 2, -Infinity, Infinity, !isWhite);
        scoreCp = isWhite ? mini.score : -mini.score;
      }
      game.undo();
      return {
        from: m.from,
        to: m.to,
        ...(m.promotion ? { promotion: m.promotion } : {}),
        scoreCp: Math.round(scoreCp),
      };
    });

    scored.sort((a, b) => b.scoreCp - a.scoreCp);
    return scored.slice(0, Math.max(1, count)).map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));
  }

  fallbackBestMove(fen) {
    const list = this.fallbackScoredMoves(fen, 1);
    return list.length > 0 ? list[0] : null;
  }
}

window.ChessEngine = ChessEngine;
