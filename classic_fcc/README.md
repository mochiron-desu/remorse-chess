# Free Chess Club (Standalone Engine Edition)

A high-fidelity recreation of the Free Chess Club web interface ([freechess.org/play/](https://freechess.org/play/)) built entirely for single-player offline chess, local pass-and-play, analysis, and engine study with no external multiplayer server dependencies.

## Features

- **Exact UI & Aesthetics**: Recreates the 3-column layout, header navigation, player status pill (`GuestWKNG`), time control pickers, settings dropdowns, and modals.
- **Stockfish AI Engine**:
  - Play vs Computer with adjustable difficulty (Levels 1–8: Beginner ~800 to Grandmaster ~2500+).
  - Built-in Minimax search with Alpha-Beta pruning, Quiescence search, and Piece-Square Tables (PST) alongside Stockfish Web Worker.
- **Real-Time Evaluation**:
  - Smooth animated Evaluation Bar on the left of the board.
  - Live Best Move Arrow drawn dynamically on the board with SVG overlays.
  - Principal variation (PV) line output.
- **Comprehensive Chess Rules**: Powered by `chess.js` (Castling, En Passant, Pawn Promotion dialog, Checkmate, Stalemate, 3-fold repetition, 50-move rule).
- **Time Controls & Clocks**:
  - Lightning (1m, 2m), Blitz (3m, 5m, 10m, 2+12), Standard (15m, 20m), and Custom (minutes + Fischer increment).
  - Active digital clocks with low-time warning alerts (< 30s).
- **Game Modes**:
  - **Play Computer**: Play as White, Black, or Random.
  - **Pass & Play**: 2 players on the same device.
  - **Analysis Mode**: Free moves on board with live evaluation.
- **Opening Explorer**: Detects chess openings and ECO codes dynamically (e.g., *Caro-Kann Defense*, *Sicilian Defense*, *Ruy Lopez*, *Queen's Gambit*).
- **Audio Effects**: Synthesized acoustic wood sounds via Web Audio API (Move, Capture, Check, Castle, Game Over) with zero external audio assets.
- **Board Themes & Customization**:
  - Themes: *Pressroom* (Slate Blue), *Brownie* (Wood Tan), *Emerald* (Classic Green), *Wood* (Oak), *Dark* (Midnight).
  - Toggle sound, evaluation bar, and best move arrows.
- **Console & Terminal Feed**:
  - Interactive FICS/FreeChess command shell (`help`, `eval`, `fen`, `pgn`, `level [1-8]`, `play`, `flip`, `undo`, `draw`, `resign`).

## Running the Application

To run locally using any static web server:

```bash
# Python 3
python3 -m http.server 8089

# Or Node.js
npx serve -l 8089 .
```

Open [http://localhost:8089](http://localhost:8089) in any modern web browser.
