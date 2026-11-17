// Unit tests for Remorse Chess Rulebook v1.0
const RemorseEngine = require('./remorse_engine.js');
const assert = require('assert');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log('=== RUNNING REMORSE CHESS RULEBOOK TESTS ===\n');

// 1. First Capture & D6 Roll (Section 2)
test('Rule 2: Piece rolls d6 on first capture and reaction is permanent', () => {
  const engine = new RemorseEngine();
  // Setup: White Pawn at e4, Black Pawn at d5
  engine.loadScenario({
    turn: 'w',
    pieces: [
      { id: 'wK', type: 'k', color: 'w', square: 'e1' },
      { id: 'bK', type: 'k', color: 'b', square: 'e8' },
      { id: 'wP', type: 'p', color: 'w', square: 'e4' },
      { id: 'bP', type: 'p', color: 'b', square: 'd5' }
    ]
  });

  const res = engine.makeMove({ from: 'e4', to: 'd5', type: 'move', piece: engine.getPiece('e4'), captured: engine.getPiece('d5') });
  assert(engine.pendingDiceRoll !== null, 'Should have pending dice roll on first capture');
  
  // Roll d6 = 2 (Guilt-ridden)
  const rollRes = engine.applyReaction('wP', 2);
  const p = engine.getPiece('d5');
  assert.strictEqual(p.hasRolled, true);
  assert.strictEqual(p.reaction, 'guilt_ridden');
  assert.strictEqual(p.condition, 'guilt_ridden');

  // Verify reaction remains permanent even if subsequently changed
  p.condition = 'normal';
  assert.strictEqual(p.reaction, 'guilt_ridden', 'Permanent assignment must remain guilt_ridden');
});

// 2. Devastated Condition (Section 3.1)
test('Rule 3.1: Devastated piece is completely immobilized (cannot move or capture)', () => {
  const engine = new RemorseEngine();
  engine.loadScenario({
    turn: 'w',
    pieces: [
      { id: 'wK', type: 'k', color: 'w', square: 'e1' },
      { id: 'bK', type: 'k', color: 'b', square: 'e8' },
      { id: 'wN', type: 'n', color: 'w', square: 'd4', condition: 'devastated', reaction: 'devastated', hasRolled: true },
      { id: 'bP', type: 'p', color: 'b', square: 'e6' }
    ]
  });

  const legal = engine.getLegalMoves('d4');
  assert.strictEqual(legal.length, 0, 'Devastated piece must have 0 legal moves');
});

// 3. Devastation 3-turn deadline self-capture (Section 3.1)
test('Rule 3.1: Devastated piece self-captures if not absolved within 3 owner turns', () => {
  const engine = new RemorseEngine();
  engine.loadScenario({
    turn: 'w',
    turnCount: 1,
    pieces: [
      { id: 'wK', type: 'k', color: 'w', square: 'e1' },
      { id: 'bK', type: 'k', color: 'b', square: 'e8' },
      { id: 'wN', type: 'n', color: 'w', square: 'a1', condition: 'devastated', reaction: 'devastated', devastatedTurnsLeft: 3 },
      { id: 'wP', type: 'p', color: 'w', square: 'h2' },
      { id: 'bP', type: 'p', color: 'b', square: 'h7' }
    ]
  });

  const knight = engine.getPiece('a1');
  assert.strictEqual(knight.devastatedTurnsLeft, 3);

  // White Turn 1: White moves pawn h2-h3
  engine.makeMove({ from: 'h2', to: 'h3', piece: engine.getPiece('h2') });
  assert.strictEqual(knight.devastatedTurnsLeft, 2, 'White turn 1 finished, turns left should be 2');

  // Black moves h7-h6 (Opponent turns do not count)
  engine.makeMove({ from: 'h7', to: 'h6', piece: engine.getPiece('h7') });
  assert.strictEqual(knight.devastatedTurnsLeft, 2, 'Opponent turns do not advance devastation timer');

  // White Turn 2: White moves King e1-e2
  engine.makeMove({ from: 'e1', to: 'e2', piece: engine.getPiece('e1') });
  assert.strictEqual(knight.devastatedTurnsLeft, 1, 'White turn 2 finished, turns left should be 1');

  // Black moves King e8-e7
  engine.makeMove({ from: 'e8', to: 'e7', piece: engine.getPiece('e8') });
  assert.strictEqual(knight.devastatedTurnsLeft, 1);

  // White Turn 3: White moves King e2-e1 (3rd turn ends without absolution)
  engine.makeMove({ from: 'e2', to: 'e1', piece: engine.getPiece('e2') });
  
  // Knight should now have self-captured and be removed from the board!
  assert.strictEqual(engine.getPiece('a1'), null, 'Devastated piece must be removed from board');
  assert.strictEqual(knight.square, null, 'Square must be null');
  assert.strictEqual(knight.condition, 'dead_by_remorse');
});

// 4. Bishop Absolution of Devastated Piece (Section 3.1 & 4)
test('Rule 4: Bishop moves adjacent and spends turn absolving devastated piece', () => {
  const engine = new RemorseEngine();
  engine.loadScenario({
    turn: 'w',
    pieces: [
      { id: 'wK', type: 'k', color: 'w', square: 'e1' },
      { id: 'bK', type: 'k', color: 'b', square: 'e8' },
      { id: 'wB', type: 'b', color: 'w', square: 'c3' },
      { id: 'wN', type: 'n', color: 'w', square: 'd4', condition: 'devastated', reaction: 'devastated', devastatedTurnsLeft: 2 }
    ]
  });

  const legal = engine.getLegalMoves('c3');
  const absolveMove = legal.find(m => m.type === 'absolve');
  assert(absolveMove, 'Bishop adjacent to devastated piece must have Absolve action');

  engine.makeMove(absolveMove);
  const knight = engine.getPiece('d4');
  assert.strictEqual(knight.condition, 'normal', 'Devastation must be cured');
  assert.strictEqual(knight.isAbsolved, true);
  assert.strictEqual(knight.reaction, 'devastated', 'Original reaction assignment is preserved');
  assert.strictEqual(engine.turn, 'b', 'Absolution spends turn, now Black turn');
});

// 5. Guilt-Ridden Condition (Section 3.2)
test('Rule 3.2: Guilt-ridden piece can move but cannot capture enemy pieces', () => {
  const engine = new RemorseEngine();
  engine.loadScenario({
    turn: 'w',
    pieces: [
      { id: 'wK', type: 'k', color: 'w', square: 'e1' },
      { id: 'bK', type: 'k', color: 'b', square: 'e8' },
      { id: 'wR', type: 'r', color: 'w', square: 'd4', condition: 'guilt_ridden', reaction: 'guilt_ridden' },
      { id: 'bP', type: 'p', color: 'b', square: 'd7' },
      { id: 'bP2', type: 'p', color: 'b', square: 'g4' }
    ]
  });

  const moves = engine.getLegalMoves('d4');
  const captureMoves = moves.filter(m => m.captured);
  assert.strictEqual(captureMoves.length, 0, 'Guilt-ridden piece cannot capture any enemy pieces');
  
  // Can move to quiet squares like d5, d6
  const quietMove = moves.find(m => m.to === 'd5');
  assert(quietMove, 'Guilt-ridden piece must be able to make quiet orthodox moves');
});

// 6. Bishop Cleansing Its Own Conscience (Section 3.2 & 4)
test('Rule 3.2: Bishop capturing becomes guilt-ridden and automatically cleanses conscience after 1 turn', () => {
  const engine = new RemorseEngine({ autoRollDice: false });
  engine.loadScenario({
    turn: 'w',
    pieces: [
      { id: 'wK', type: 'k', color: 'w', square: 'e1' },
      { id: 'bK', type: 'k', color: 'b', square: 'e8' },
      { id: 'wB', type: 'b', color: 'w', square: 'c4' },
      { id: 'bP', type: 'p', color: 'b', square: 'd5' },
      { id: 'bP2', type: 'p', color: 'b', square: 'h7' }
    ]
  });

  // White Bishop captures on d5, force roll = 2 (Guilt-ridden)
  const b = engine.getPiece('c4');
  const target = engine.getPiece('d5');
  engine.makeMove({ from: 'c4', to: 'd5', piece: b, captured: target });
  engine.applyReaction('wB', 2);

  assert.strictEqual(b.condition, 'guilt_ridden');
  assert.strictEqual(b.cleansingTurnsLeft, 1);

  // Black moves h7-h6
  engine.makeMove({ from: 'h7', to: 'h6', piece: engine.getPiece('h7') });

  // White turn: Bishop spends this turn in guilt state (cannot capture)
  assert.strictEqual(b.condition, 'guilt_ridden');
  // White moves King e1-e2
  engine.makeMove({ from: 'e1', to: 'e2', piece: engine.getPiece('e1') });

  // At the end of White's turn, bishop automatically cleansed itself!
  assert.strictEqual(b.condition, 'normal', 'Bishop must automatically cleanse itself after spending 1 turn');
  assert.strictEqual(b.isAbsolved, true);
});

// 7. Psychopath Bonus Move (Section 3.4)
test('Rule 3.4: Psychopath gets an immediate additional move upon capturing', () => {
  const engine = new RemorseEngine();
  engine.loadScenario({
    turn: 'w',
    pieces: [
      { id: 'wK', type: 'k', color: 'w', square: 'e1' },
      { id: 'bK', type: 'k', color: 'b', square: 'e8' },
      { id: 'wQ', type: 'q', color: 'w', square: 'd1', reaction: 'psychopath', condition: 'normal', hasRolled: true },
      { id: 'bP1', type: 'p', color: 'b', square: 'd5' },
      { id: 'bP2', type: 'p', color: 'b', square: 'g5' }
    ]
  });

  // White Queen captures on d5
  const q = engine.getPiece('d1');
  const p1 = engine.getPiece('d5');
  const res = engine.makeMove({ from: 'd1', to: 'd5', piece: q, captured: p1 });

  assert.strictEqual(res.extraMoveGranted, true, 'Psychopath must receive bonus move');
  assert.strictEqual(engine.turn, 'w', 'Turn must remain White during bonus move');
  assert(engine.bonusMoveState && engine.bonusMoveState.active, 'Bonus move state active');

  // Only the psychopath can move during bonus move
  const kingMoves = engine.getLegalMoves('e1');
  assert.strictEqual(kingMoves.length, 0, 'Other pieces cannot move during psychopath bonus move');

  const queenBonusMoves = engine.getLegalMoves('d5');
  assert(queenBonusMoves.length > 0, 'Queen can make bonus move');

  // Bonus move captures another piece at g5
  const p2 = engine.getPiece('g5');
  const res2 = engine.makeMove({ from: 'd5', to: 'g5', piece: q, captured: p2 });

  // Section 3.4: "If another capture occurs during the additional move, no further bonus move is granted during that same turn."
  assert.strictEqual(res2.extraMoveGranted, false, 'No second bonus move granted in same turn');
  assert.strictEqual(engine.turn, 'b', 'Turn now passes to Black');
});

// 8. Bloodlust Progression & Cannibalism (Section 3.4)
test('Rule 3.4: Bloodlust unlocks at 3 captures, can ONLY move if capturing, can capture friendly pieces except King', () => {
  const engine = new RemorseEngine();
  engine.loadScenario({
    turn: 'w',
    pieces: [
      { id: 'wK', type: 'k', color: 'w', square: 'e1' },
      { id: 'bK', type: 'k', color: 'b', square: 'e8' },
      { id: 'wQ', type: 'q', color: 'w', square: 'd4', reaction: 'psychopath', condition: 'bloodlust', kills: 3, hasRolled: true },
      { id: 'wP', type: 'p', color: 'w', square: 'd5' }, // Friendly pawn!
      { id: 'bP', type: 'p', color: 'b', square: 'f6' }  // Enemy pawn!
    ]
  });

  const legal = engine.getLegalMoves('d4');
  
  // Rule 3.4: "The piece can only move if it is able to capture another piece. It cannot make ordinary non-capturing moves."
  for (const m of legal) {
    assert(m.captured, 'All bloodlust moves MUST be captures');
  }

  // Friendly capture is allowed
  const friendlyCapture = legal.find(m => m.to === 'd5');
  assert(friendlyCapture, 'Bloodlust piece must be able to capture friendly piece');
  assert.strictEqual(friendlyCapture.isFriendlyFire, true);

  // Enemy capture is allowed
  const enemyCapture = legal.find(m => m.to === 'f6');
  assert(enemyCapture, 'Bloodlust piece must be able to capture enemy piece');

  // Rule 3.4: "It cannot capture its own king."
  // Put friendly king adjacent to Queen to verify Queen CANNOT capture own King
  engine.loadScenario({
    turn: 'w',
    pieces: [
      { id: 'wK', type: 'k', color: 'w', square: 'd5' }, // King at d5
      { id: 'bK', type: 'k', color: 'b', square: 'h8' },
      { id: 'wQ', type: 'q', color: 'w', square: 'd4', reaction: 'psychopath', condition: 'bloodlust', kills: 3, hasRolled: true }
    ]
  });

  const legalWithKing = engine.getLegalMoves('d4');
  const kingCapture = legalWithKing.find(m => m.to === 'd5');
  assert.strictEqual(kingCapture, undefined, 'Bloodlust piece CANNOT capture its own king!');
});

// 9. Bishop Devastation Absolution by Another Bishop (Section 3.1 & 4)
test('Rule 3.1 & 4: Devastated bishop can be absolved by another bishop', () => {
  const engine = new RemorseEngine();
  engine.loadScenario({
    turn: 'w',
    pieces: [
      { id: 'wK', type: 'k', color: 'w', square: 'e1' },
      { id: 'bK', type: 'k', color: 'b', square: 'e8' },
      { id: 'wB1', type: 'b', color: 'w', square: 'c3' }, // Savior bishop
      { id: 'wB2', type: 'b', color: 'w', square: 'c4', condition: 'devastated', reaction: 'devastated', devastatedTurnsLeft: 2 } // Devastated bishop
    ]
  });

  const legal = engine.getLegalMoves('c3');
  const absolveB2 = legal.find(m => m.type === 'absolve' && m.to === 'c4');
  assert(absolveB2, 'Bishop 1 must be able to absolve devastated Bishop 2');

  engine.makeMove(absolveB2);
  const b2 = engine.getPiece('c4');
  assert.strictEqual(b2.condition, 'normal');
});

// 10. Loss of All Bishops (Section 3.2 & 4) & Restoration via Pawn Promotion (Section 5)
test('Rule 4 & 5: Loss of all bishops removes absolution; Pawn promotion to Bishop restores it', () => {
  const engine = new RemorseEngine();
  engine.loadScenario({
    turn: 'w',
    pieces: [
      { id: 'wK', type: 'k', color: 'w', square: 'e1' },
      { id: 'bK', type: 'k', color: 'b', square: 'e8' },
      { id: 'wP', type: 'p', color: 'w', square: 'c7' },
      { id: 'wN', type: 'n', color: 'w', square: 'a1', condition: 'devastated' }
    ]
  });

  assert.strictEqual(engine.canAbsolve('w'), false, 'White has no bishops, cannot absolve');

  // Promote pawn to Bishop at c8
  const promoMove = engine.getLegalMoves('c7').find(m => m.to === 'c8' && m.promotion === 'b');
  assert(promoMove, 'Promotion to Bishop should be available');

  engine.makeMove(promoMove);
  assert.strictEqual(engine.canAbsolve('w'), true, 'Promoting to Bishop restores absolution capability!');
  
  // The newly promoted piece has clean psychological history
  const newBishop = engine.getPiece('c8');
  assert.strictEqual(newBishop.hasRolled, false);
  assert.strictEqual(newBishop.condition, 'normal');
});

// 11. Checkmate Detection
test('Rule 6: Checkmate ends the game', () => {
  const engine = new RemorseEngine();
  // Scholar's Mate position with an Unaffected Queen
  engine.loadScenario({
    turn: 'w',
    pieces: [
      { id: 'wK', type: 'k', color: 'w', square: 'e1' },
      { id: 'bK', type: 'k', color: 'b', square: 'e8' },
      { id: 'bQ', type: 'q', color: 'b', square: 'd8' },
      { id: 'wQ', type: 'q', color: 'w', square: 'h5', hasRolled: true, reaction: 'unaffected', condition: 'normal' },
      { id: 'wB', type: 'b', color: 'w', square: 'c4' },
      { id: 'bP', type: 'p', color: 'b', square: 'f7' },
      { id: 'bP2', type: 'p', color: 'b', square: 'e7' },
      { id: 'bP3', type: 'p', color: 'b', square: 'd7' }
    ]
  });

  // White Queen takes f7 checkmate
  const q = engine.getPiece('h5');
  const p = engine.getPiece('f7');
  engine.makeMove({ from: 'h5', to: 'f7', piece: q, captured: p });

  // Black is in checkmate
  assert.strictEqual(engine.gameOver, true);
  assert.strictEqual(engine.gameResult.status, 'checkmate');
  assert.strictEqual(engine.gameResult.winner, 'w');
});

// 12. Undo & Redo System
test('Engine: Undo and Redo accurately preserves psychological states', () => {
  const engine = new RemorseEngine();
  engine.loadScenario({
    turn: 'w',
    pieces: [
      { id: 'wK', type: 'k', color: 'w', square: 'e1' },
      { id: 'bK', type: 'k', color: 'b', square: 'e8' },
      { id: 'wB', type: 'b', color: 'w', square: 'c3' },
      { id: 'wN', type: 'n', color: 'w', square: 'd4', condition: 'devastated', reaction: 'devastated', devastatedTurnsLeft: 2 }
    ]
  });

  // Bishop absolves knight
  engine.makeMove({ from: 'c3', to: 'd4', type: 'absolve' });
  assert.strictEqual(engine.getPiece('d4').condition, 'normal');
  assert.strictEqual(engine.turn, 'b');

  // Undo absolution
  const undone = engine.undo();
  assert.strictEqual(undone, true);
  assert.strictEqual(engine.turn, 'w');
  assert.strictEqual(engine.getPiece('d4').condition, 'devastated');
  assert.strictEqual(engine.getPiece('d4').devastatedTurnsLeft, 2);

  // Redo absolution
  const redone = engine.redo();
  assert.strictEqual(redone, true);
  assert.strictEqual(engine.turn, 'b');
  assert.strictEqual(engine.getPiece('d4').condition, 'normal');
});

// 13. Remorse AI Search
test('Remorse AI: Evaluates psychological conditions and finds legal moves', () => {
  const RemorseAI = require('./remorse_ai.js');
  const engine = new RemorseEngine();
  const ai = new RemorseAI(engine, { depth: 2 });

  // In starting position, AI finds a legal move
  const bestMove = ai.findBestMove();
  assert(bestMove, 'AI must find a legal move');
  assert(bestMove.from && bestMove.to, 'Move must have from and to');
});

// 14. Bloodlust Extra Move
test('Rule 3.4: Bloodlust piece retains psychopath bonus move after capturing friendly or enemy piece', () => {
  const engine = new RemorseEngine();
  engine.loadScenario({
    turn: 'w',
    pieces: [
      { id: 'wK', type: 'k', color: 'w', square: 'e1' },
      { id: 'bK', type: 'k', color: 'b', square: 'e8' },
      { id: 'wQ', type: 'q', color: 'w', square: 'd4', reaction: 'psychopath', condition: 'bloodlust', kills: 3, hasRolled: true },
      { id: 'wP', type: 'p', color: 'w', square: 'd5' }, // Friendly pawn
      { id: 'bP', type: 'p', color: 'b', square: 'd7' }  // Enemy pawn
    ]
  });

  // Bloodlust Queen eats friendly pawn at d5
  const res = engine.makeMove({ from: 'd4', to: 'd5' });
  assert.strictEqual(res.extraMoveGranted, true, 'Bloodlust piece must get bonus move after friendly capture');
  assert.strictEqual(engine.turn, 'w');

  // During bonus move, Queen eats enemy pawn at d7
  const res2 = engine.makeMove({ from: 'd5', to: 'd7' });
  assert.strictEqual(res2.extraMoveGranted, false, 'No second bonus move');
  assert.strictEqual(engine.turn, 'b');
});

console.log(`\n========================================`);
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
