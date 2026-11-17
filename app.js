// Free Chess Club Application Logic

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playMove() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playCapture() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playCheck() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(520, this.ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playCastle() {
    if (!this.enabled) return;
    this.playMove();
    setTimeout(() => this.playMove(), 80);
  }

  playGameOver() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const chord = [392, 493.88, 587.33, 783.99]; // G major
    chord.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.08);
      osc.stop(this.ctx.currentTime + 0.8);
    });
  }
}

class ChessApp {
  constructor() {
    this.game = new Chess();
    this.engine = new ChessEngine();
    this.sounds = new SoundSystem();

    // Game Settings & State
    this.gameMode = 'vs-bot'; // 'vs-bot', 'vs-computer', 'bot-vs-bot', 'pass-play', 'analysis'
    this.engineLevel = 3; // 1-8
    this.playerColor = 'w'; // 'w', 'b'
    this.isFlipped = false;
    this.selectedSquare = null;
    this.legalMovesFromSquare = [];
    this.lastMove = null;

    // iwantcheckmate Bot Engine & Persona State
    this.selectedBot = (typeof window.CHESS_BOTS !== 'undefined' && window.CHESS_BOTS.length > 0) ? window.CHESS_BOTS[0] : null;
    this.botColorChoice = 'w'; // player's chosen color against bot: 'w', 'b', 'random'
    this.botState = {
      dynamicElo: 3600,
      botCaptures: 0,
      clockElo: 3600,
      playerLastMoveRank: 1,
      zebraTargetLight: true,
      lastEvalTarget: "0.00"
    };
    this.botVsBot = {
      whiteBot: (typeof window.CHESS_BOTS !== 'undefined' && window.CHESS_BOTS.length > 0) ? window.CHESS_BOTS[0] : null,
      blackBot: (typeof window.CHESS_BOTS !== 'undefined' && window.CHESS_BOTS.length > 1) ? window.CHESS_BOTS[1] : null,
      whiteState: { dynamicElo: 3600, botCaptures: 0, clockElo: 3600, zebraTargetLight: true },
      blackState: { dynamicElo: 3600, botCaptures: 0, clockElo: 3600, zebraTargetLight: false },
      isRunning: false,
      speedMs: 800,
      timer: null
    };
    this.enableBotBanter = true;
    this.clockfishInterval = null;
    this.lastDialogueSpeaker = null;
    this.lastDialogueText = '';

    // Move History Preservation & Review Mode
    this.fullGameMoves = []; // preserves all moves played in the match
    this.currentMoveIndex = 0; // points to current move viewed on board
    this.isGameOver = false;
    this.rewatchTimer = null;
    this.isRewatching = false;

    // Saved match records
    try {
      this.savedGames = JSON.parse(localStorage.getItem('fcc_games') || '[]');
    } catch (e) {
      this.savedGames = [];
    }

    // Visual Toggles
    this.showEvalBar = true;
    this.showBestMoveArrow = true;
    this.showHighlights = true;
    this.currentTheme = 'pressroom';

    // Clocks
    this.timeControl = { minutes: 5, increment: 0 };
    this.whiteTimeMs = 5 * 60 * 1000;
    this.blackTimeMs = 5 * 60 * 1000;
    this.clockInterval = null;
    this.isClockRunning = false;

    // Best move coords for SVG arrow
    this.bestMoveArrow = null;

    // Promotion pending
    this.pendingMove = null;

    // DOM Elements
    this.boardEl = document.getElementById('chessboard');
    this.arrowOverlayEl = document.getElementById('arrow-overlay');
    this.evalBarFillEl = document.getElementById('eval-bar-fill');
    this.evalScoreTextEl = document.getElementById('eval-score-text');
    this.movesTableBodyEl = document.getElementById('moves-table-body');
    this.openingNameEl = document.getElementById('opening-name');
    this.openingEcoEl = document.getElementById('opening-eco');
    this.whiteClockEl = document.getElementById('white-clock');
    this.blackClockEl = document.getElementById('black-clock');
    this.consoleFeedEl = document.getElementById('console-feed');
    this.chatInputEl = document.getElementById('chat-input');
    this.evalPvTextEl = document.getElementById('eval-pv-text');
    this.evalScoreBadgeEl = document.getElementById('eval-score-badge');

    this.init();
  }

  init() {
    this.setupTheme();
    this.setupEventListeners();
    this.renderBotCards();
    this.setupBotVsBotUI();
    this.setupGroqSettingsUI();
    this.renderBoard();
    this.updateOpening();
    this.updateClockDisplays();
    this.renderHistoryTab();
    this.logConsole('Free Chess Club initialized (Standalone Edition).', 'system');
    this.logConsole('Engine ready: Stockfish with Alpha-Beta fallback.', 'bot');
    this.logConsole('Type "help" in the console below for commands.', 'admin');

    // Trigger initial eval
    this.triggerEvaluation();
  }

  setupTheme() {
    const savedTheme = localStorage.getItem('fcc_theme') || 'pressroom';
    this.setTheme(savedTheme);
  }

  setTheme(theme) {
    this.currentTheme = theme;
    if (theme === 'pressroom') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('fcc_theme', theme);

    // Update active theme card in settings
    document.querySelectorAll('.theme-card').forEach(card => {
      card.classList.toggle('active', card.dataset.theme === theme);
    });
  }

  setupEventListeners() {
    // Navigation / History toolbar
    document.getElementById('nav-first').addEventListener('click', () => this.navigateMove(0));
    document.getElementById('nav-prev').addEventListener('click', () => this.navigateMove(this.currentMoveIndex - 1));
    document.getElementById('nav-next').addEventListener('click', () => this.navigateMove(this.currentMoveIndex + 1));
    document.getElementById('nav-last').addEventListener('click', () => this.navigateMove(this.fullGameMoves.length));

    // Keyboard navigation (Left / Right Arrow)
    window.addEventListener('keydown', (e) => {
      if (document.activeElement === this.chatInputEl) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.navigateMove(this.currentMoveIndex - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.navigateMove(this.currentMoveIndex + 1);
      }
    });

    // Game Action buttons
    document.getElementById('btn-undo').addEventListener('click', () => this.undoMove());
    document.getElementById('btn-rewatch').addEventListener('click', () => this.toggleAutoRewatch());
    document.getElementById('btn-draw').addEventListener('click', () => this.offerDraw());
    document.getElementById('btn-resign').addEventListener('click', () => this.resignGame());
    document.getElementById('btn-flip').addEventListener('click', () => this.flipBoard());
    document.getElementById('btn-analyze').addEventListener('click', () => this.toggleAnalysisMode());

    // Reviewer Export buttons (Copy & Save Entire Play)
    const copyPlayBtn = document.getElementById('btn-copy-play');
    if (copyPlayBtn) copyPlayBtn.addEventListener('click', () => this.copyEntirePlay());

    const downloadPlayBtn = document.getElementById('btn-download-play');
    if (downloadPlayBtn) downloadPlayBtn.addEventListener('click', () => this.saveEntirePlayFile());

    const saveMatchBtn = document.getElementById('btn-save-match');
    if (saveMatchBtn) saveMatchBtn.addEventListener('click', () => this.saveCurrentGameToHistoryManual());

    const gameOverCopyBtn = document.getElementById('btn-game-over-copy-play');
    if (gameOverCopyBtn) gameOverCopyBtn.addEventListener('click', (e) => this.copyEntirePlay(null, null, e.currentTarget));

    const gameOverSaveBtn = document.getElementById('btn-game-over-save-pgn');
    if (gameOverSaveBtn) gameOverSaveBtn.addEventListener('click', (e) => this.saveEntirePlayFile(null, null, e.currentTarget));

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = e.currentTarget.dataset.tab;
        this.switchTab(targetTab);
      });
    });

    // Time Presets
    document.querySelectorAll('.preset-btn[data-min]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.preset-btn[data-min]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const min = parseInt(btn.dataset.min, 10);
        const inc = parseInt(btn.dataset.inc, 10);
        this.setGameTimeControl(min, inc);
      });
    });

    // Custom time submit
    const customTimeForm = document.getElementById('custom-time-form');
    if (customTimeForm) {
      customTimeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const min = parseInt(document.getElementById('custom-min')?.value, 10) || 5;
        const inc = parseInt(document.getElementById('custom-inc')?.value, 10) || 0;
        this.setGameTimeControl(min, inc);
      });
    }

    // Play computer modal
    document.getElementById('btn-open-play-computer').addEventListener('click', () => {
      this.openModal('play-computer-modal');
    });

    document.getElementById('play-computer-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const level = parseInt(document.getElementById('ai-level-slider').value, 10);
      const colorVal = document.querySelector('input[name="ai-color"]:checked').value;
      const min = parseInt(document.getElementById('ai-time-min').value, 10) || 5;
      const inc = parseInt(document.getElementById('ai-time-inc').value, 10) || 0;

      this.engineLevel = level;
      this.playerColor = colorVal === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorVal;
      this.isFlipped = this.playerColor === 'b';
      this.setGameTimeControl(min, inc);
      this.closeModal('play-computer-modal');
      this.startNewGame('vs-computer');
    });

    // Difficulty slider display
    const aiSlider = document.getElementById('ai-level-slider');
    const aiSliderVal = document.getElementById('ai-level-val');
    const aiDesc = document.getElementById('ai-level-desc');
    const levelDescs = {
      1: "Beginner (~800)",
      2: "Casual (~1100)",
      3: "Intermediate (~1400)",
      4: "Club Player (~1650)",
      5: "Advanced (~1900)",
      6: "Expert (~2100)",
      7: "Master (~2300)",
      8: "Grandmaster (~2500+)"
    };
    aiSlider.addEventListener('input', () => {
      aiSliderVal.textContent = aiSlider.value;
      aiDesc.textContent = levelDescs[aiSlider.value] || "";
    });

    // Quick game button
    document.getElementById('btn-quick-game').addEventListener('click', () => {
      this.startNewGame('vs-computer');
    });

    // Pass and Play button
    document.getElementById('btn-pass-play').addEventListener('click', () => {
      this.startNewGame('pass-play');
    });

    // Settings modal
    document.getElementById('btn-settings').addEventListener('click', () => {
      this.openModal('settings-modal');
    });

    // Theme selector cards
    document.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', () => {
        this.setTheme(card.dataset.theme);
      });
    });

    // Settings checkboxes
    document.getElementById('toggle-sound').addEventListener('change', (e) => {
      this.sounds.enabled = e.target.checked;
    });

    document.getElementById('toggle-eval-bar').addEventListener('change', (e) => {
      this.showEvalBar = e.target.checked;
      document.getElementById('eval-bar-container').style.display = this.showEvalBar ? 'flex' : 'none';
    });

    document.getElementById('toggle-arrow').addEventListener('change', (e) => {
      this.showBestMoveArrow = e.target.checked;
      if (!this.showBestMoveArrow) this.clearArrow();
      else if (this.bestMoveArrow) this.drawArrow(this.bestMoveArrow.from, this.bestMoveArrow.to);
    });

    // Chat / Console input
    this.chatInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleConsoleInput();
      }
    });
    document.getElementById('chat-send-btn').addEventListener('click', () => {
      this.handleConsoleInput();
    });

    // Game Over modal buttons
    document.getElementById('btn-rematch').addEventListener('click', () => {
      this.closeModal('game-over-modal');
      this.startNewGame(this.gameMode);
    });

    document.getElementById('btn-review-game').addEventListener('click', () => {
      this.closeModal('game-over-modal');
      this.switchTab('game');
      this.logConsole('Review mode active: use navigation buttons (|<, <, >, >|), arrow keys, or click Rewatch to replay.', 'system');
    });

    const closeGameOverBtn = document.getElementById('btn-close-game-over');
    if (closeGameOverBtn) {
      closeGameOverBtn.addEventListener('click', () => {
        this.closeModal('game-over-modal');
      });
    }

    // Copy match FEN button
    const copyFenBtn = document.getElementById('btn-copy-match-fen');
    if (copyFenBtn) {
      copyFenBtn.addEventListener('click', async () => {
        const fenInput = document.getElementById('game-over-fen-input');
        const fen = fenInput ? fenInput.value : this.game.fen();
        try {
          await navigator.clipboard.writeText(fen);
          const copyText = document.getElementById('copy-fen-text');
          const copyIcon = document.getElementById('copy-fen-icon');
          if (copyText) copyText.textContent = 'Copied!';
          if (copyIcon) copyIcon.className = 'fa-solid fa-check';
          setTimeout(() => {
            if (copyText) copyText.textContent = 'Copy FEN';
            if (copyIcon) copyIcon.className = 'fa-regular fa-copy';
          }, 2000);
        } catch (e) {
          if (fenInput) { fenInput.select(); document.execCommand('copy'); }
        }
      });
    }

    // Modal close buttons
    document.querySelectorAll('.modal-close-btn, .btn-modal-cancel').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-backdrop');
        if (modal) modal.classList.remove('open');
      });
    });

    // Pawn Promotion dialog choices
    document.querySelectorAll('.promotion-piece-choice').forEach(choice => {
      choice.addEventListener('click', (e) => {
        const pieceType = e.currentTarget.dataset.piece || 'q';
        this.finishPromotion(pieceType);
      });
    });

    const promoDialog = document.getElementById('promotion-dialog');
    if (promoDialog) {
      promoDialog.addEventListener('click', (e) => {
        if (e.target === promoDialog) {
          promoDialog.style.display = 'none';
          this.pendingMove = null;
          this.renderBoard();
        }
      });
    }

    // Start Fight Bot button
    const startBotBtn = document.getElementById('btn-start-bot-game');
    if (startBotBtn) {
      startBotBtn.addEventListener('click', () => {
        this.startNewBotGame(this.selectedBot, this.botColorChoice);
      });
    }

    // Color pick buttons
    document.querySelectorAll('.color-pick-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.color-pick-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.botColorChoice = e.currentTarget.dataset.color || 'w';
      });
    });

    // Toggle Bot Banter checkbox
    const banterToggle = document.getElementById('toggle-bot-banter');
    if (banterToggle) {
      banterToggle.addEventListener('change', (e) => {
        this.enableBotBanter = e.target.checked;
      });
    }
  }

  // ==========================================
  // iwantcheckmate BOTS & BATTLE ARENA METHODS
  // ==========================================

  renderBotCards() {
    const grid = document.getElementById('bot-cards-grid');
    if (!grid || !window.CHESS_BOTS) return;
    grid.innerHTML = '';

    window.CHESS_BOTS.forEach((bot) => {
      const card = document.createElement('div');
      card.className = `bot-card ${this.selectedBot && this.selectedBot.id === bot.id ? 'active' : ''}`;
      card.dataset.botId = bot.id;
      card.innerHTML = `
        <div class="bot-card-avatar-box">${bot.avatarSvg}</div>
        <div class="bot-card-info">
          <div class="bot-card-name">${bot.name}</div>
          <div class="bot-card-rating">Elo: ${bot.rating}</div>
        </div>
      `;

      card.addEventListener('click', () => {
        this.selectBot(bot);
      });

      grid.appendChild(card);
    });

    if (this.selectedBot) {
      this.updateShowcase();
    }
  }

  selectBot(bot) {
    this.selectedBot = bot;
    document.querySelectorAll('.bot-card').forEach(c => {
      c.classList.toggle('active', c.dataset.botId === bot.id);
    });
    this.updateShowcase();
  }

  updateShowcase() {
    const bot = this.selectedBot;
    if (!bot) return;

    const avatarBox = document.getElementById('showcase-bot-avatar');
    const nameEl = document.getElementById('showcase-bot-name');
    const ratingEl = document.getElementById('showcase-bot-rating');
    const titleEl = document.getElementById('showcase-bot-title');
    const descEl = document.getElementById('showcase-bot-desc');

    if (avatarBox) avatarBox.innerHTML = bot.avatarSvg;
    if (nameEl) nameEl.textContent = bot.name;
    if (ratingEl) ratingEl.textContent = bot.rating;
    if (titleEl) titleEl.textContent = bot.title;
    if (descEl) descEl.textContent = bot.description;
  }

  setupBotVsBotUI() {
    const whiteSelect = document.getElementById('battle-white-select');
    const blackSelect = document.getElementById('battle-black-select');
    if (!whiteSelect || !blackSelect || !window.CHESS_BOTS) return;

    whiteSelect.innerHTML = '';
    blackSelect.innerHTML = '';

    window.CHESS_BOTS.forEach((bot) => {
      const optW = document.createElement('option');
      optW.value = bot.id;
      optW.textContent = `${bot.name} (${bot.rating})`;
      whiteSelect.appendChild(optW);

      const optB = document.createElement('option');
      optB.value = bot.id;
      optB.textContent = `${bot.name} (${bot.rating})`;
      blackSelect.appendChild(optB);
    });

    if (window.CHESS_BOTS.length >= 2) {
      whiteSelect.value = window.CHESS_BOTS[15] ? window.CHESS_BOTS[15].id : window.CHESS_BOTS[1].id;
      blackSelect.value = window.CHESS_BOTS[0].id;
    }

    const updateCombatants = () => {
      const wBot = window.getBotById(whiteSelect.value);
      const bBot = window.getBotById(blackSelect.value);
      this.botVsBot.whiteBot = wBot;
      this.botVsBot.blackBot = bBot;

      const wAvatar = document.getElementById('battle-white-avatar');
      const bAvatar = document.getElementById('battle-black-avatar');
      const wRating = document.getElementById('battle-white-rating');
      const bRating = document.getElementById('battle-black-rating');

      if (wAvatar) wAvatar.innerHTML = wBot.avatarSvg;
      if (bAvatar) bAvatar.innerHTML = bBot.avatarSvg;
      if (wRating) wRating.textContent = `Elo: ${wBot.rating}`;
      if (bRating) bRating.textContent = `Elo: ${bBot.rating}`;
    };

    whiteSelect.addEventListener('change', updateCombatants);
    blackSelect.addEventListener('change', updateCombatants);
    updateCombatants();

    const speedSlider = document.getElementById('battle-speed-slider');
    const speedVal = document.getElementById('battle-speed-val');
    if (speedSlider) {
      speedSlider.addEventListener('input', () => {
        const ms = parseInt(speedSlider.value, 10);
        this.botVsBot.speedMs = ms;
        if (speedVal) speedVal.textContent = `${ms} ms`;
      });
    }

    const playPauseBtn = document.getElementById('btn-battle-play-pause');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        if (this.botVsBot.isRunning) {
          this.pauseBotBattle();
        } else {
          this.startBotBattle();
        }
      });
    }

    const stepBtn = document.getElementById('btn-battle-step');
    if (stepBtn) {
      stepBtn.addEventListener('click', () => {
        this.stepBotBattle();
      });
    }

    const resetBtn = document.getElementById('btn-battle-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetBotBattle();
      });
    }
  }

  setupGroqSettingsUI() {
    const input = document.getElementById('groq-api-key-input');
    const modelSelect = document.getElementById('groq-model-select');
    const fetchBtn = document.getElementById('btn-fetch-groq-models');
    const saveBtn = document.getElementById('btn-save-groq-key');
    const clearBtn = document.getElementById('btn-clear-groq-key');
    const statusEl = document.getElementById('groq-status-indicator');
    const banterPill = document.getElementById('battle-banter-mode-pill');

    const updateStatus = () => {
      const hasKey = window.chessGroqService && window.chessGroqService.hasApiKey();
      const currentModel = window.chessGroqService ? window.chessGroqService.getModel() : '';
      if (statusEl) {
        statusEl.textContent = hasKey
          ? `Status: Connected to Groq (${currentModel} Active)`
          : 'Status: Using Built-in Offline Banter';
        statusEl.style.color = hasKey ? '#27ae60' : 'var(--text-muted)';
      }
      if (banterPill) {
        banterPill.textContent = hasKey ? 'Groq AI' : 'Local Banter';
        banterPill.style.background = hasKey ? 'rgba(46, 204, 113, 0.15)' : 'rgba(42, 117, 211, 0.1)';
        banterPill.style.color = hasKey ? '#27ae60' : 'var(--accent-blue)';
      }
    };

    if (input && window.chessGroqService) {
      input.value = window.chessGroqService.getApiKey();
    }
    if (modelSelect && window.chessGroqService) {
      const activeModel = window.chessGroqService.getModel();
      if (!Array.from(modelSelect.options).some(o => o.value === activeModel)) {
        const opt = document.createElement('option');
        opt.value = activeModel;
        opt.textContent = activeModel;
        modelSelect.appendChild(opt);
      }
      modelSelect.value = activeModel;

      modelSelect.addEventListener('change', () => {
        window.chessGroqService.setModel(modelSelect.value);
        updateStatus();
      });
    }
    updateStatus();

    if (fetchBtn) {
      fetchBtn.addEventListener('click', async () => {
        const key = input ? input.value.trim() : '';
        if (!key) {
          alert('Please enter your Groq API key first to fetch your account models.');
          return;
        }
        fetchBtn.disabled = true;
        fetchBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        try {
          const models = await window.chessGroqService.fetchAvailableModels(key);
          if (modelSelect && models.length > 0) {
            const current = window.chessGroqService.getModel();
            modelSelect.innerHTML = '';
            models.forEach(m => {
              const opt = document.createElement('option');
              opt.value = m;
              opt.textContent = m;
              if (m === current) opt.selected = true;
              modelSelect.appendChild(opt);
            });
            if (!models.includes(current)) {
              window.chessGroqService.setModel(models[0]);
              modelSelect.value = models[0];
            }
            updateStatus();
            this.logConsole(`Fetched ${models.length} accessible Groq models!`, 'system');
          }
        } catch (err) {
          alert('Failed to fetch models: ' + err.message);
        } finally {
          fetchBtn.disabled = false;
          fetchBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i>';
        }
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const key = input ? input.value.trim() : '';
        const model = modelSelect ? modelSelect.value : window.chessGroqService.getModel();
        if (!key) return;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Testing...';
        try {
          await window.chessGroqService.testConnection(key, model);
          window.chessGroqService.setApiKey(key);
          window.chessGroqService.setModel(model);
          updateStatus();
          this.logConsole(`Groq API Key verified! Model ${model} active for bot banter.`, 'system');
        } catch (err) {
          alert(`Groq connection failed with ${model}: ${err.message}. Try clicking the refresh icon next to the model selector to pick an available model.`);
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save';
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (input) input.value = '';
        window.chessGroqService.setApiKey('');
        updateStatus();
        this.logConsole('Groq API Key cleared. Reverted to built-in character quotes.', 'system');
      });
    }
  }

  startNewBotGame(bot, colorChoice = 'w') {
    this.selectedBot = bot || (window.CHESS_BOTS ? window.CHESS_BOTS[0] : null);
    if (!this.selectedBot) return;

    this.playerColor = colorChoice === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorChoice;
    this.isFlipped = this.playerColor === 'b';
    this.gameMode = 'vs-bot';

    const initialElo = this.selectedBot.rating === '???' ? 3600 : Number(this.selectedBot.rating);
    this.botState = {
      dynamicElo: initialElo,
      botCaptures: 0,
      clockElo: 0,
      playerLastMoveRank: 1,
      zebraTargetLight: true,
      lastEvalTarget: "0.00"
    };

    this.stopAutoRewatch();
    this.stopClock();
    this.game = new Chess();
    this.isGameOver = false;
    this.fullGameMoves = [];
    this.currentMoveIndex = 0;
    this.lastMove = null;
    this.selectedSquare = null;
    this.legalMovesFromSquare = [];
    this.clearArrow();

    this.whiteTimeMs = this.timeControl.minutes * 60 * 1000;
    this.blackTimeMs = this.timeControl.minutes * 60 * 1000;
    this.updateClockDisplays();

    const isPlayerWhite = this.playerColor === 'w';
    if (isPlayerWhite) {
      this.updateBannerBot('top', this.selectedBot, this.selectedBot.rating);
      this.updateBannerHuman('bottom', 'Guest Player');
      document.getElementById('game-matchup-title').textContent = `Guest vs. ${this.selectedBot.name} (${this.selectedBot.rating})`;
    } else {
      this.updateBannerHuman('top', 'Guest Player');
      this.updateBannerBot('bottom', this.selectedBot, this.selectedBot.rating);
      document.getElementById('game-matchup-title').textContent = `${this.selectedBot.name} (${this.selectedBot.rating}) vs. Guest`;
    }

    this.renderBoard();
    this.updateMovesTable();
    this.updateOpening();
    this.switchTab('game');

    this.logConsole(`--- Match Started vs ${this.selectedBot.name} ---`, 'system');
    this.logConsole(`${this.selectedBot.title}`, 'bot');

    this.dispatchBotDialogue(this.selectedBot, 'start', 'Game starting', 'Guest', isPlayerWhite ? 'black-bot' : 'white-bot');

    if (this.playerColor === 'b') {
      this.startClock();
      this.triggerBotMove();
    } else {
      this.triggerEvaluation();
    }
  }

  updateBannerBot(pos, bot, rating) {
    const avatarEl = document.getElementById(`${pos}-player-avatar`);
    const nameEl = document.getElementById(`${pos}-player-name`);
    const ratingEl = document.getElementById(`${pos}-player-rating`);
    if (avatarEl) avatarEl.innerHTML = bot.avatarSvg;
    if (nameEl) nameEl.textContent = bot.name;
    if (ratingEl) {
      ratingEl.textContent = rating !== undefined ? rating : bot.rating;
      ratingEl.style.color = '#38bdf8';
    }
  }

  updateBannerHuman(pos, name) {
    const avatarEl = document.getElementById(`${pos}-player-avatar`);
    const nameEl = document.getElementById(`${pos}-player-name`);
    const ratingEl = document.getElementById(`${pos}-player-rating`);
    if (avatarEl) avatarEl.innerHTML = '<i class="fa-solid fa-user"></i>';
    if (nameEl) nameEl.textContent = name;
    if (ratingEl) {
      ratingEl.textContent = '(Player)';
      ratingEl.style.color = 'var(--text-muted)';
    }
  }

  updateBannerRating(pos, elo) {
    const ratingEl = document.getElementById(`${pos}-player-rating`);
    if (ratingEl) {
      ratingEl.textContent = elo;
    }
  }

  flashRatingChange(pos, type) {
    const ratingEl = document.getElementById(`${pos}-player-rating`);
    if (!ratingEl) return;
    ratingEl.classList.remove('rating-drop', 'rating-boost');
    void ratingEl.offsetWidth;
    ratingEl.classList.add(type === 'drop' ? 'rating-drop' : 'rating-boost');
  }

  async triggerBotMove() {
    if (!this.selectedBot || this.game.game_over()) return;
    const botPos = this.playerColor === 'w' ? 'top' : 'bottom';
    const isBotWhite = this.game.turn() === 'w';
    const colorClass = isBotWhite ? 'white-bot' : 'black-bot';

    if (this.selectedBot.id === 'clockfish') {
      if (this.clockfishInterval) clearInterval(this.clockfishInterval);
      const startT = performance.now();
      this.botState.clockElo = 0;
      this.updateBannerRating(botPos, 0);
      this.clockfishInterval = setInterval(() => {
        const elapsed = performance.now() - startT;
        const elo = Math.min(3600, Math.floor(elapsed / 5000 * 36) * 100);
        this.botState.clockElo = elo;
        this.updateBannerRating(botPos, elo);
        if (elo >= 3600 || elapsed >= 5000) {
          clearInterval(this.clockfishInterval);
          this.clockfishInterval = null;
        }
      }, 25);
    }

    try {
      const chosenMove = await this.selectedBot.selectMove(this.game, this.engine, this.botState);
      if (this.clockfishInterval) {
        clearInterval(this.clockfishInterval);
        this.clockfishInterval = null;
      }
      if (!chosenMove) return;

      const move = this.game.move(chosenMove);
      if (!move) return;

      if (move.captured) {
        this.botState.botCaptures = (this.botState.botCaptures || 0) + 1;
        if (this.selectedBot.id === 'stockfish-tony') {
          const isTony = this.botState.botCaptures % 2 === 1;
          const nameEl = document.getElementById(`${botPos}-player-name`);
          if (nameEl) nameEl.textContent = isTony ? 'Tony (250)' : 'Stockfish (3600)';
          this.updateBannerRating(botPos, isTony ? 250 : 3600);
        }
      }

      if (this.selectedBot.id === 'tiredfish') {
        this.botState.dynamicElo = Math.max(0, this.botState.dynamicElo - 50);
        this.updateBannerRating(botPos, this.botState.dynamicElo);
      }

      if (this.selectedBot.id === 'zebrafish') {
        this.botState.zebraTargetLight = !this.botState.zebraTargetLight;
      }

      this.handleSuccessfulMove(move);

      const isCheck = this.game.in_check();
      const isMate = this.game.in_checkmate();
      const eventType = isMate ? 'win' : isCheck ? 'check' : move.captured ? 'capture' : 'move';
      this.dispatchBotDialogue(this.selectedBot, eventType, `Played ${move.san}`, 'Guest', colorClass);

    } catch (err) {
      console.error('Bot move failed:', err);
    }
  }

  onPlayerMoveMade(playerMove, fenBeforeMove) {
    if (!this.selectedBot) return;
    const botPos = this.playerColor === 'w' ? 'top' : 'bottom';
    const colorClass = this.playerColor === 'w' ? 'black-bot' : 'white-bot';

    if (this.selectedBot.id === 'panicfish' && this.game.in_check()) {
      this.botState.dynamicElo = Math.max(0, this.botState.dynamicElo - 300);
      this.flashRatingChange(botPos, 'drop');
      this.updateBannerRating(botPos, this.botState.dynamicElo);
      this.dispatchBotDialogue(this.selectedBot, 'checked', 'King is in check! -300 Elo!', 'Guest', colorClass);
    }

    if (this.selectedBot.id === 'tony-gains') {
      this.engine.bestMove(fenBeforeMove, 250).then(best => {
        if (best && (playerMove.from !== best.from || playerMove.to !== best.to)) {
          this.botState.dynamicElo = Math.min(3600, this.botState.dynamicElo + 200);
          this.flashRatingChange(botPos, 'boost');
          this.updateBannerRating(botPos, this.botState.dynamicElo);
          this.dispatchBotDialogue(this.selectedBot, 'blunder', '+200 Elo Gains!', 'Guest', colorClass);
        }
      });
    }

    if (this.selectedBot.id === 'mirrorfish') {
      this.engine.rankedMoves(fenBeforeMove, 5, 300).then(ranked => {
        const idx = ranked.findIndex(r => r.from === playerMove.from && r.to === playerMove.to);
        this.botState.playerLastMoveRank = idx >= 0 ? idx + 1 : 5;
      });
    }
  }

  startBotBattle() {
    this.stopAutoRewatch();
    this.stopClock();
    if (this.game.game_over()) {
      this.resetBotBattle();
    }
    this.gameMode = 'bot-vs-bot';
    this.botVsBot.isRunning = true;

    const playPauseBtn = document.getElementById('btn-battle-play-pause');
    if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause Battle';

    this.updateBannerBot('bottom', this.botVsBot.whiteBot, this.botVsBot.whiteBot.rating);
    this.updateBannerBot('top', this.botVsBot.blackBot, this.botVsBot.blackBot.rating);
    document.getElementById('game-matchup-title').textContent = `${this.botVsBot.whiteBot.name} (White) vs. ${this.botVsBot.blackBot.name} (Black)`;

    this.switchTab('game');
    this.logConsole(`--- Bot Battle: ${this.botVsBot.whiteBot.name} vs ${this.botVsBot.blackBot.name} ---`, 'system');

    this.dispatchBotDialogue(this.botVsBot.whiteBot, 'start', 'Game starting as White', this.botVsBot.blackBot.name, 'white-bot');
    setTimeout(() => {
      this.dispatchBotDialogue(this.botVsBot.blackBot, 'start', 'Ready as Black', this.botVsBot.whiteBot.name, 'black-bot');
    }, 600);

    this.runBotBattleTurn();
  }

  pauseBotBattle() {
    this.botVsBot.isRunning = false;
    if (this.botVsBot.timer) {
      clearTimeout(this.botVsBot.timer);
      this.botVsBot.timer = null;
    }
    const playPauseBtn = document.getElementById('btn-battle-play-pause');
    if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i> Resume Battle';
  }

  resetBotBattle() {
    this.pauseBotBattle();
    this.game = new Chess();
    this.isGameOver = false;
    this.fullGameMoves = [];
    this.currentMoveIndex = 0;
    this.lastMove = null;
    this.botVsBot.whiteState = { dynamicElo: this.botVsBot.whiteBot.rating === '???' ? 3600 : Number(this.botVsBot.whiteBot.rating), botCaptures: 0, zebraTargetLight: true };
    this.botVsBot.blackState = { dynamicElo: this.botVsBot.blackBot.rating === '???' ? 3600 : Number(this.botVsBot.blackBot.rating), botCaptures: 0, zebraTargetLight: false };

    this.updateBannerBot('bottom', this.botVsBot.whiteBot, this.botVsBot.whiteBot.rating);
    this.updateBannerBot('top', this.botVsBot.blackBot, this.botVsBot.blackBot.rating);

    this.renderBoard();
    this.updateMovesTable();
    this.updateOpening();
    this.triggerEvaluation();
    this.logConsole('Bot vs Bot arena reset.', 'system');
  }

  stepBotBattle() {
    this.pauseBotBattle();
    this.executeSingleBotTurn();
  }

  async runBotBattleTurn() {
    if (!this.botVsBot.isRunning || this.game.game_over()) return;
    await this.executeSingleBotTurn();
    if (this.botVsBot.isRunning && !this.game.game_over()) {
      this.botVsBot.timer = setTimeout(() => {
        this.runBotBattleTurn();
      }, this.botVsBot.speedMs);
    }
  }

  async executeSingleBotTurn() {
    if (this.game.game_over()) return;
    const isWhiteTurn = this.game.turn() === 'w';
    const activeBot = isWhiteTurn ? this.botVsBot.whiteBot : this.botVsBot.blackBot;
    const opponentBot = isWhiteTurn ? this.botVsBot.blackBot : this.botVsBot.whiteBot;
    const activeState = isWhiteTurn ? this.botVsBot.whiteState : this.botVsBot.blackState;
    const pos = isWhiteTurn ? 'bottom' : 'top';
    const colorClass = isWhiteTurn ? 'white-bot' : 'black-bot';

    try {
      const chosenMove = await activeBot.selectMove(this.game, this.engine, activeState);
      if (!chosenMove) return;

      const move = this.game.move(chosenMove);
      if (!move) return;

      if (move.captured) {
        activeState.botCaptures = (activeState.botCaptures || 0) + 1;
        if (activeBot.id === 'stockfish-tony') {
          const isTony = activeState.botCaptures % 2 === 1;
          this.updateBannerRating(pos, isTony ? 250 : 3600);
        }
      }
      if (activeBot.id === 'tiredfish') {
        activeState.dynamicElo = Math.max(0, activeState.dynamicElo - 50);
        this.updateBannerRating(pos, activeState.dynamicElo);
      }
      if (activeBot.id === 'zebrafish') {
        activeState.zebraTargetLight = !activeState.zebraTargetLight;
      }

      this.handleSuccessfulMove(move);

      const isMate = this.game.in_checkmate();
      const isCheck = this.game.in_check();
      const eventType = isMate ? 'win' : isCheck ? 'check' : move.captured ? 'capture' : 'move';
      this.dispatchBotDialogue(activeBot, eventType, `Move ${move.san}`, opponentBot.name, colorClass);

      if (isMate) {
        setTimeout(() => {
          this.dispatchBotDialogue(opponentBot, 'loss', 'Lost to checkmate', activeBot.name, isWhiteTurn ? 'black-bot' : 'white-bot');
        }, 700);
      }
    } catch (e) {
      console.error('Error during Bot vs Bot turn:', e);
    }
  }

  async dispatchBotDialogue(bot, eventType, extraNote = '', opponentName = 'Opponent', colorClass = 'bot') {
    if (!this.enableBotBanter || !bot) return;

    try {
      const line = await window.chessGroqService.generateDialogue({
        bot,
        opponentName,
        eventType,
        moveSan: extraNote,
        opponentLine: this.lastDialogueSpeaker !== bot.name ? this.lastDialogueText : ''
      });

      if (line) {
        this.lastDialogueSpeaker = bot.name;
        this.lastDialogueText = line;
        this.logBotSpeech(bot, line, colorClass);
      }
    } catch (err) {
      console.warn('Dialogue dispatch warning:', err);
    }
  }

  logBotSpeech(bot, text, colorClass = 'bot') {
    if (!this.consoleFeedEl) return;
    const item = document.createElement('div');
    item.className = `bot-speech-item ${colorClass}`;
    item.innerHTML = `
      <div class="bot-speech-avatar">${bot.avatarSvg}</div>
      <div class="bot-speech-body">
        <div class="bot-speech-author" style="color: ${bot.accentColor || '#38bdf8'};">
          ${bot.name}
        </div>
        <div class="bot-speech-bubble">${text}</div>
      </div>
    `;
    this.consoleFeedEl.appendChild(item);
    this.consoleFeedEl.scrollTop = this.consoleFeedEl.scrollHeight;
  }

  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('open');
  }

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
  }

  switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.panel-tab-pane').forEach(pane => {
      pane.style.display = pane.id === `tab-${tabName}` ? 'flex' : 'none';
    });
  }

  setGameTimeControl(minutes, increment) {
    this.timeControl = { minutes, increment };
    this.whiteTimeMs = minutes * 60 * 1000;
    this.blackTimeMs = minutes * 60 * 1000;
    this.updateClockDisplays();
    this.logConsole(`Time control set to ${minutes} min + ${increment} sec.`, 'system');
  }

  startNewGame(mode = 'vs-computer') {
    this.stopAutoRewatch();
    this.stopClock();
    this.game = new Chess();
    this.gameMode = mode;
    this.isGameOver = false;
    this.fullGameMoves = [];
    this.currentMoveIndex = 0;
    this.lastMove = null;
    this.selectedSquare = null;
    this.legalMovesFromSquare = [];
    this.clearArrow();

    this.whiteTimeMs = this.timeControl.minutes * 60 * 1000;
    this.blackTimeMs = this.timeControl.minutes * 60 * 1000;
    this.updateClockDisplays();

    // Player name updates
    if (mode === 'vs-computer') {
      const isPlayerWhite = this.playerColor === 'w';
      document.getElementById('top-player-name').textContent = isPlayerWhite ? `Stockfish (Lvl ${this.engineLevel})` : 'Guest Player';
      document.getElementById('bottom-player-name').textContent = isPlayerWhite ? 'Guest Player' : `Stockfish (Lvl ${this.engineLevel})`;
      document.getElementById('game-matchup-title').textContent = `Guest vs. Stockfish (Lvl ${this.engineLevel})`;
    } else {
      document.getElementById('top-player-name').textContent = 'Black';
      document.getElementById('bottom-player-name').textContent = 'White';
      document.getElementById('game-matchup-title').textContent = 'Pass & Play (Local Match)';
    }

    this.renderBoard();
    this.updateMovesTable();
    this.updateOpening();
    this.switchTab('game');
    this.logConsole(`--- New Game Started [${mode}] ---`, 'system');

    // If computer plays white, trigger AI first move
    if (this.gameMode === 'vs-computer' && this.playerColor === 'b') {
      this.startClock();
      this.triggerAIMove();
    } else {
      this.triggerEvaluation();
    }
  }

  flipBoard() {
    this.isFlipped = !this.isFlipped;
    this.renderBoard();
    if (this.bestMoveArrow && this.showBestMoveArrow) {
      this.drawArrow(this.bestMoveArrow.from, this.bestMoveArrow.to);
    }
  }

  renderBoard() {
    this.boardEl.innerHTML = '';
    const boardState = this.game.board();

    // Ranks and files ordering based on flip
    const ranks = this.isFlipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
    const files = this.isFlipped ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    for (let rIdx = 0; rIdx < 8; rIdx++) {
      const rank = ranks[rIdx];
      for (let fIdx = 0; fIdx < 8; fIdx++) {
        const file = files[fIdx];
        const squareKey = `${file}${rank}`;
        const isLight = (rIdx + fIdx) % 2 === 0;

        const squareDiv = document.createElement('div');
        squareDiv.className = `square ${isLight ? 'light' : 'dark'}`;
        squareDiv.dataset.square = squareKey;

        // Last move highlight
        if (this.showHighlights && this.lastMove && (this.lastMove.from === squareKey || this.lastMove.to === squareKey)) {
          squareDiv.classList.add('last-move');
        }

        // Selected square highlight
        if (this.selectedSquare === squareKey) {
          squareDiv.classList.add('selected');
        }

        // Check highlight
        if (this.game.in_check()) {
          const turn = this.game.turn();
          const kingSquare = this.findKingSquare(turn);
          if (kingSquare === squareKey) {
            squareDiv.classList.add('check');
          }
        }

        // Add coordinates on edge squares
        if (fIdx === 0) {
          const rankLabel = document.createElement('span');
          rankLabel.className = 'square-coord rank';
          rankLabel.textContent = rank;
          squareDiv.appendChild(rankLabel);
        }
        if (rIdx === 7) {
          const fileLabel = document.createElement('span');
          fileLabel.className = 'square-coord file';
          fileLabel.textContent = file;
          squareDiv.appendChild(fileLabel);
        }

        // Piece on this square
        const piece = this.game.get(squareKey);
        if (piece) {
          const pieceDiv = document.createElement('div');
          pieceDiv.className = 'chess-piece';
          pieceDiv.dataset.square = squareKey;
          const pieceCode = piece.color + piece.type.toUpperCase();
          pieceDiv.innerHTML = CHESS_PIECES[pieceCode] || '';

          // Snappy Pointer-events drag and drop handlers
          pieceDiv.addEventListener('pointerdown', (e) => this.onPiecePointerDown(e, squareKey));
          pieceDiv.addEventListener('pointermove', (e) => this.onPiecePointerMove(e));
          pieceDiv.addEventListener('pointerup', (e) => this.onPiecePointerUp(e));
          pieceDiv.addEventListener('pointercancel', (e) => this.onPiecePointerUp(e));
          squareDiv.appendChild(pieceDiv);
        }

        // Legal move indicators (rendered if already selected)
        const isLegalDest = this.legalMovesFromSquare.some(m => m.to === squareKey);
        if (isLegalDest) {
          const isCapture = this.legalMovesFromSquare.some(m => m.to === squareKey && m.captured);
          const hint = document.createElement('div');
          hint.className = isCapture ? 'move-hint-capture' : 'move-hint-dot';
          squareDiv.appendChild(hint);
        }

        // Click handler
        squareDiv.addEventListener('click', () => this.onSquareClick(squareKey));

        this.boardEl.appendChild(squareDiv);
      }
    }
  }

  findKingSquare(color) {
    const board = this.game.board();
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === color) {
          return `${files[c]}${8 - r}`;
        }
      }
    }
    return null;
  }

  highlightLegalMoves(squareKey, legalMoves) {
    this.clearHighlights();
    const selSquareEl = this.boardEl.querySelector(`[data-square="${squareKey}"]`);
    if (selSquareEl) selSquareEl.classList.add('selected');

    legalMoves.forEach(m => {
      const destSquareEl = this.boardEl.querySelector(`[data-square="${m.to}"]`);
      if (!destSquareEl) return;
      const isCapture = !!m.captured;
      const hint = document.createElement('div');
      hint.className = isCapture ? 'move-hint-capture' : 'move-hint-dot';
      destSquareEl.appendChild(hint);
    });
  }

  clearHighlights() {
    this.boardEl.querySelectorAll('.square.selected').forEach(s => s.classList.remove('selected'));
    this.boardEl.querySelectorAll('.move-hint-dot, .move-hint-capture').forEach(h => h.remove());
  }

  onSquareClick(squareKey) {
    if (this.isRewatching) this.stopAutoRewatch();

    if (this.isGameOver) {
      if (this.currentMoveIndex < this.fullGameMoves.length) {
        this.navigateMove(this.fullGameMoves.length);
      }
      return;
    }

    if ((this.gameMode === 'vs-computer' || this.gameMode === 'vs-bot') && this.game.turn() !== this.playerColor) {
      return;
    }
    if (this.game.game_over()) return;

    if (this.currentMoveIndex < this.fullGameMoves.length) {
      this.navigateMove(this.fullGameMoves.length);
    }

    if (this.selectedSquare) {
      if (this.selectedSquare === squareKey) {
        this.selectedSquare = null;
        this.legalMovesFromSquare = [];
        this.clearHighlights();
        return;
      }

      const move = this.legalMovesFromSquare.find(m => m.to === squareKey);
      if (move) {
        this.attemptMove(this.selectedSquare, squareKey);
        this.selectedSquare = null;
        this.legalMovesFromSquare = [];
        this.clearHighlights();
        return;
      }
    }

    const piece = this.game.get(squareKey);
    if (piece && piece.color === this.game.turn()) {
      this.selectedSquare = squareKey;
      this.legalMovesFromSquare = this.game.moves({ square: squareKey, verbose: true });
      this.highlightLegalMoves(squareKey, this.legalMovesFromSquare);
    } else {
      this.selectedSquare = null;
      this.legalMovesFromSquare = [];
      this.clearHighlights();
    }
  }

  onPiecePointerDown(e, squareKey) {
    if (e.button !== 0) return;
    if (this.isRewatching) this.stopAutoRewatch();

    if (this.isGameOver) {
      if (this.currentMoveIndex < this.fullGameMoves.length) {
        this.navigateMove(this.fullGameMoves.length);
      }
      return;
    }

    if ((this.gameMode === 'vs-computer' || this.gameMode === 'vs-bot') && this.game.turn() !== this.playerColor) {
      return;
    }
    if (this.game.game_over()) return;

    if (this.currentMoveIndex < this.fullGameMoves.length) {
      this.navigateMove(this.fullGameMoves.length);
    }

    const piece = this.game.get(squareKey);
    if (!piece || piece.color !== this.game.turn()) return;

    e.preventDefault();
    const pieceDiv = e.currentTarget;
    try { pieceDiv.setPointerCapture(e.pointerId); } catch (err) {}

    this.activeDrag = {
      pointerId: e.pointerId,
      pieceDiv: pieceDiv,
      fromSquare: squareKey,
      startX: e.clientX,
      startY: e.clientY,
      hasMoved: false
    };

    this.selectedSquare = squareKey;
    this.legalMovesFromSquare = this.game.moves({ square: squareKey, verbose: true });
    this.highlightLegalMoves(squareKey, this.legalMovesFromSquare);
    pieceDiv.classList.add('is-dragging');
    this.boardEl.classList.add('dragging-active');
  }

  onPiecePointerMove(e) {
    if (!this.activeDrag || this.activeDrag.pointerId !== e.pointerId) return;
    const dx = e.clientX - this.activeDrag.startX;
    const dy = e.clientY - this.activeDrag.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      this.activeDrag.hasMoved = true;
    }
    this.activeDrag.pieceDiv.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  }

  onPiecePointerUp(e) {
    if (!this.activeDrag || this.activeDrag.pointerId !== e.pointerId) return;
    const { pieceDiv, fromSquare, hasMoved } = this.activeDrag;
    try { pieceDiv.releasePointerCapture(e.pointerId); } catch (err) {}
    pieceDiv.classList.remove('is-dragging');
    pieceDiv.style.transform = '';
    this.boardEl.classList.remove('dragging-active');

    const boardRect = this.boardEl.getBoundingClientRect();
    const squareW = boardRect.width / 8;
    const squareH = boardRect.height / 8;
    const relX = e.clientX - boardRect.left;
    const relY = e.clientY - boardRect.top;

    let destSquare = null;
    if (relX >= 0 && relX <= boardRect.width && relY >= 0 && relY <= boardRect.height) {
      const fileIdx = Math.floor(relX / squareW);
      const rankIdx = Math.floor(relY / squareH);
      const ranks = this.isFlipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
      const files = this.isFlipped ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      if (fileIdx >= 0 && fileIdx < 8 && rankIdx >= 0 && rankIdx < 8) {
        destSquare = files[fileIdx] + ranks[rankIdx];
      }
    }

    this.activeDrag = null;

    if (hasMoved && destSquare && destSquare !== fromSquare) {
      const legal = this.legalMovesFromSquare.some(m => m.to === destSquare);
      if (legal) {
        this.attemptMove(fromSquare, destSquare);
        this.selectedSquare = null;
        this.legalMovesFromSquare = [];
        this.clearHighlights();
        return;
      }
    }

    if (!hasMoved) {
      // Simple click - selection remains active
      return;
    }

    this.clearHighlights();
    this.selectedSquare = null;
    this.legalMovesFromSquare = [];
  }

  attemptMove(from, to) {
    // Check if move is pawn promotion
    const piece = this.game.get(from);
    if (piece && piece.type === 'p') {
      const isPromotion = (piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1');
      if (isPromotion) {
        const legal = this.game.moves({ square: from, verbose: true }).some(m => m.to === to);
        if (legal) {
          this.pendingMove = { from, to };
          this.showPromotionDialog(piece.color);
          return;
        }
      }
    }

    const fenBefore = this.game.fen();
    const move = this.game.move({ from, to, promotion: 'q' });
    if (move) {
      if (this.gameMode === 'vs-bot') {
        this.onPlayerMoveMade(move, fenBefore);
      }
      this.handleSuccessfulMove(move);
    } else {
      this.renderBoard();
    }
  }

  showPromotionDialog(color) {
    const dialog = document.getElementById('promotion-dialog');
    const pieceTypes = ['q', 'r', 'b', 'n'];
    pieceTypes.forEach(t => {
      const el = document.getElementById(`promo-${t}`);
      const code = color + t.toUpperCase();
      el.innerHTML = CHESS_PIECES[code] || '';
    });
    dialog.style.display = 'flex';
  }

  finishPromotion(pieceType) {
    document.getElementById('promotion-dialog').style.display = 'none';
    if (!this.pendingMove) return;

    const fenBefore = this.game.fen();
    const move = this.game.move({
      from: this.pendingMove.from,
      to: this.pendingMove.to,
      promotion: pieceType
    });
    this.pendingMove = null;

    if (move) {
      if (this.gameMode === 'vs-bot') {
        this.onPlayerMoveMade(move, fenBefore);
      }
      this.handleSuccessfulMove(move);
    } else {
      this.renderBoard();
    }
  }

  handleSuccessfulMove(move) {
    this.lastMove = move;
    this.fullGameMoves.push(move);
    this.currentMoveIndex = this.fullGameMoves.length;

    // Add increment to player who just moved
    if (this.timeControl.increment > 0 && this.isClockRunning) {
      if (move.color === 'w') {
        this.whiteTimeMs += this.timeControl.increment * 1000;
      } else {
        this.blackTimeMs += this.timeControl.increment * 1000;
      }
      this.updateClockDisplays();
    }

    // Audio feedback
    if (this.game.in_check()) {
      this.sounds.playCheck();
    } else if (move.flags && (move.flags.includes('c') || move.flags.includes('e'))) {
      this.sounds.playCapture();
    } else if (move.flags && (move.flags.includes('k') || move.flags.includes('q'))) {
      this.sounds.playCastle();
    } else {
      this.sounds.playMove();
    }

    // Ensure clock runs
    if (!this.isClockRunning && this.timeControl.minutes > 0) {
      this.startClock();
    }

    this.renderBoard();
    this.updateMovesTable();
    this.updateOpening();
    this.triggerEvaluation();

    // Check game over
    if (this.game.game_over()) {
      this.handleGameOver();
      return;
    }

    // If vs-bot and now bot's turn
    if (this.gameMode === 'vs-bot' && this.game.turn() !== this.playerColor) {
      this.triggerBotMove();
    }

    // If vs-computer and now computer's turn
    if (this.gameMode === 'vs-computer' && this.game.turn() !== this.playerColor) {
      this.triggerAIMove();
    }
  }

  triggerAIMove() {
    this.engine.getAIMove(this.game, this.engineLevel, (bestMove) => {
      if (!bestMove) return;
      const move = this.game.move(bestMove);
      if (move) {
        this.handleSuccessfulMove(move);
      }
    });
  }

  triggerEvaluation() {
    this.engine.evaluatePosition(this.game, (evalResult) => {
      this.updateEvalBar(evalResult.score, evalResult.isMate, evalResult.mateTurns);
      if (evalResult.bestMoveUci && evalResult.bestMoveUci.length >= 4) {
        const from = evalResult.bestMoveUci.substring(0, 2);
        const to = evalResult.bestMoveUci.substring(2, 4);
        this.bestMoveArrow = { from, to };
        if (this.showBestMoveArrow) {
          this.drawArrow(from, to);
        }
      } else {
        this.clearArrow();
      }

      if (this.evalPvTextEl) {
        this.evalPvTextEl.textContent = evalResult.pv || "";
      }
    });
  }

  updateEvalBar(score, isMate, mateTurns) {
    if (!this.evalBarFillEl || !this.evalScoreTextEl) return;

    let percentage = 50;
    let label = score.toFixed(1);

    if (isMate) {
      label = `M${Math.abs(mateTurns)}`;
      percentage = mateTurns > 0 ? 98 : 2;
    } else {
      const mapped = 50 + (50 * (2 / (1 + Math.exp(-0.35 * score)) - 1));
      percentage = Math.max(3, Math.min(97, mapped));
      if (score > 0) label = `+${label}`;
    }

    this.evalBarFillEl.style.height = `${percentage}%`;
    this.evalScoreTextEl.textContent = label;
    if (this.evalScoreBadgeEl) {
      this.evalScoreBadgeEl.textContent = label;
    }

    if (percentage > 85) {
      this.evalScoreTextEl.classList.add('top-score');
    } else {
      this.evalScoreTextEl.classList.remove('top-score');
    }
  }

  drawArrow(fromSquare, toSquare) {
    const layer = document.getElementById('arrow-layer') || this.arrowOverlayEl;
    if (!layer) return;
    this.clearArrow();

    const fromSquareEl = this.boardEl.querySelector(`[data-square="${fromSquare}"]`);
    const toSquareEl = this.boardEl.querySelector(`[data-square="${toSquare}"]`);
    if (!fromSquareEl || !toSquareEl) return;

    const boardRect = this.boardEl.getBoundingClientRect();
    const fromRect = fromSquareEl.getBoundingClientRect();
    const toRect = toSquareEl.getBoundingClientRect();

    const x1 = ((fromRect.left + fromRect.width / 2) - boardRect.left) / boardRect.width * 100;
    const y1 = ((fromRect.top + fromRect.height / 2) - boardRect.top) / boardRect.height * 100;
    const x2 = ((toRect.left + toRect.width / 2) - boardRect.left) / boardRect.width * 100;
    const y2 = ((toRect.top + toRect.height / 2) - boardRect.top) / boardRect.height * 100;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;

    const ux = dx / dist;
    const uy = dy / dist;
    const nx = -uy;
    const ny = ux;

    const headLength = Math.min(4.6, dist * 0.35);
    const headWidth = 2.6;
    const stemWidth = 1.35;

    const baseX = x2 - ux * headLength;
    const baseY = y2 - uy * headLength;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', baseX);
    line.setAttribute('y2', baseY);
    line.setAttribute('stroke', '#f39c12');
    line.setAttribute('stroke-width', stemWidth);
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('stroke-opacity', '0.85');

    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    const pTip = `${x2},${y2}`;
    const pLeft = `${baseX + nx * headWidth},${baseY + ny * headWidth}`;
    const pRight = `${baseX - nx * headWidth},${baseY - ny * headWidth}`;
    poly.setAttribute('points', `${pTip} ${pLeft} ${pRight}`);
    poly.setAttribute('fill', '#f39c12');
    poly.setAttribute('fill-opacity', '0.85');

    layer.appendChild(line);
    layer.appendChild(poly);
  }

  clearArrow() {
    const layer = document.getElementById('arrow-layer');
    if (layer) {
      layer.innerHTML = '';
    } else if (this.arrowOverlayEl) {
      this.arrowOverlayEl.querySelectorAll('line, polygon, path').forEach(l => l.remove());
    }
  }

  updateOpening() {
    const sans = this.fullGameMoves.slice(0, this.currentMoveIndex).map(m => m.san);
    const opening = this.engine.identifyOpening(sans);
    if (this.openingNameEl) this.openingNameEl.textContent = opening.name;
    if (this.openingEcoEl) this.openingEcoEl.textContent = opening.eco;
  }

  updateMovesTable() {
    if (!this.movesTableBodyEl) return;
    this.movesTableBodyEl.innerHTML = '';
    const moves = this.fullGameMoves;

    for (let i = 0; i < moves.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const whiteMove = moves[i];
      const blackMove = moves[i + 1];

      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="color: var(--text-muted); width: 35px;">${moveNum}.</td>
        <td><span class="move-cell ${this.currentMoveIndex === i + 1 ? 'current-move' : ''}" data-index="${i}">${whiteMove.san}</span></td>
        <td>${blackMove ? `<span class="move-cell ${this.currentMoveIndex === i + 2 ? 'current-move' : ''}" data-index="${i + 1}">${blackMove.san}</span>` : ''}</td>
      `;

      row.querySelectorAll('.move-cell').forEach(cell => {
        cell.addEventListener('click', (e) => {
          if (this.isRewatching) this.stopAutoRewatch();
          const idx = parseInt(e.target.dataset.index, 10);
          this.navigateMove(idx + 1);
        });
      });

      this.movesTableBodyEl.appendChild(row);
    }

    const tableContainer = this.movesTableBodyEl.closest('.moves-table-container');
    if (tableContainer && this.currentMoveIndex >= moves.length) {
      tableContainer.scrollTop = tableContainer.scrollHeight;
    }
  }

  navigateMove(targetIndex) {
    if (this.fullGameMoves.length === 0) return;
    if (targetIndex < 0) targetIndex = 0;
    if (targetIndex > this.fullGameMoves.length) targetIndex = this.fullGameMoves.length;

    this.currentMoveIndex = targetIndex;

    // Replay moves from starting position up to targetIndex
    const replayGame = new Chess();
    for (let i = 0; i < targetIndex; i++) {
      replayGame.move(this.fullGameMoves[i]);
    }

    this.game = replayGame;
    this.lastMove = targetIndex > 0 ? this.fullGameMoves[targetIndex - 1] : null;
    this.selectedSquare = null;
    this.legalMovesFromSquare = [];

    this.renderBoard();
    this.triggerEvaluation();
    this.updateOpening();

    // Highlight current move in moves table
    document.querySelectorAll('.move-cell').forEach(cell => {
      const idx = parseInt(cell.dataset.index, 10);
      cell.classList.toggle('current-move', idx === targetIndex - 1);
    });
  }

  toggleAutoRewatch() {
    if (this.isRewatching) {
      this.stopAutoRewatch();
    } else {
      this.startAutoRewatch();
    }
  }

  startAutoRewatch() {
    if (this.fullGameMoves.length === 0) {
      this.logConsole('No moves in this match to rewatch.', 'system');
      return;
    }
    this.isRewatching = true;
    const rewatchBtn = document.getElementById('btn-rewatch');
    if (rewatchBtn) {
      rewatchBtn.classList.add('active-rewatch');
      rewatchBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
    }

    // If already at end of match, rewind to beginning
    if (this.currentMoveIndex >= this.fullGameMoves.length) {
      this.navigateMove(0);
    }

    if (this.rewatchTimer) clearInterval(this.rewatchTimer);
    this.rewatchTimer = setInterval(() => {
      if (this.currentMoveIndex < this.fullGameMoves.length) {
        const nextMove = this.fullGameMoves[this.currentMoveIndex];
        this.navigateMove(this.currentMoveIndex + 1);

        // Sound effect for replayed move
        if (this.game.in_check()) {
          this.sounds.playCheck();
        } else if (nextMove.flags && (nextMove.flags.includes('c') || nextMove.flags.includes('e'))) {
          this.sounds.playCapture();
        } else if (nextMove.flags && (nextMove.flags.includes('k') || nextMove.flags.includes('q'))) {
          this.sounds.playCastle();
        } else {
          this.sounds.playMove();
        }
      } else {
        this.stopAutoRewatch();
        this.logConsole('Match rewatch completed.', 'system');
      }
    }, 900);
  }

  stopAutoRewatch() {
    this.isRewatching = false;
    if (this.rewatchTimer) {
      clearInterval(this.rewatchTimer);
      this.rewatchTimer = null;
    }
    const rewatchBtn = document.getElementById('btn-rewatch');
    if (rewatchBtn) {
      rewatchBtn.classList.remove('active-rewatch');
      rewatchBtn.innerHTML = '<i class="fa-solid fa-play"></i> Rewatch';
    }
  }

  undoMove() {
    if (this.fullGameMoves.length === 0) return;
    if (this.isGameOver) {
      this.logConsole('Game has completed. Use navigation buttons (|<, <, >, >|) to review earlier positions.', 'system');
      return;
    }

    if (this.gameMode === 'vs-computer') {
      this.fullGameMoves.pop();
      if (this.fullGameMoves.length > 0 && this.fullGameMoves[this.fullGameMoves.length - 1].color !== this.playerColor) {
        this.fullGameMoves.pop();
      }
    } else {
      this.fullGameMoves.pop();
    }

    this.currentMoveIndex = this.fullGameMoves.length;
    this.updateMovesTable();
    this.navigateMove(this.currentMoveIndex);
    this.logConsole('Takeback granted.', 'system');
  }

  offerDraw() {
    if (this.isGameOver) return;
    this.handleGameOver({
      title: "Game Drawn",
      message: "Draw agreed by mutual agreement.",
      result: "Draw"
    });
  }

  resignGame() {
    if (this.isGameOver) return;
    const isPlayerWhite = this.playerColor === 'w';
    const winner = this.game.turn() === 'w' ? 'Black' : 'White';
    const result = winner === (isPlayerWhite ? 'White' : 'Black') ? 'Win' : 'Loss';
    this.handleGameOver({
      title: "Resignation",
      message: `${winner} wins by resignation.`,
      result: result
    });
  }

  handleGameOver(customDetails = null) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.stopClock();
    this.sounds.playGameOver();

    let title = "Game Over";
    let message = "";
    let result = "Draw";

    const isPlayerWhite = this.playerColor === 'w';

    if (customDetails) {
      title = customDetails.title;
      message = customDetails.message;
      result = customDetails.result;
    } else if (this.game.in_checkmate()) {
      const winner = this.game.turn() === 'w' ? 'Black' : 'White';
      title = "Checkmate!";
      message = `${winner} wins by checkmate.`;
      result = winner === (isPlayerWhite ? 'White' : 'Black') ? 'Win' : 'Loss';
    } else if (this.game.in_draw()) {
      title = "Draw";
      if (this.game.in_stalemate()) message = "Game drawn by Stalemate.";
      else if (this.game.in_threefold_repetition()) message = "Game drawn by Threefold Repetition.";
      else if (this.game.insufficient_material()) message = "Game drawn by Insufficient Material.";
      else message = "Game drawn by 50-move rule.";
      result = "Draw";
    }

    // Save match to History tab
    this.saveGameToHistory(result, title, message);

    if (this.gameMode === 'vs-bot' && this.selectedBot) {
      if (result === 'Win') {
        this.dispatchBotDialogue(this.selectedBot, 'loss', 'Lost to human player', 'Guest');
      } else if (result === 'Loss') {
        this.dispatchBotDialogue(this.selectedBot, 'win', 'Checkmated human player', 'Guest');
      }
    }

    this.showGameOverModal(title, message);
    this.logConsole(`Game Ended: ${title} - ${message}`, 'system');
    this.logConsole('Tip: Click "Review Match" or "Rewatch" to replay the game without resetting the board.', 'bot');
  }

  showGameOverModal(title, message) {
    document.getElementById('game-over-title').textContent = title;
    document.getElementById('game-over-desc').textContent = message;
    const fenInput = document.getElementById('game-over-fen-input');
    if (fenInput) fenInput.value = this.game.fen();
    this.openModal('game-over-modal');
  }

  saveGameToHistory(result, title, reason) {
    if (this.fullGameMoves.length === 0) return;
    const opponentName = this.gameMode === 'vs-bot'
      ? `${this.selectedBot ? this.selectedBot.name : 'Bot'} (${this.selectedBot ? this.selectedBot.rating : '???'})`
      : this.gameMode === 'bot-vs-bot'
      ? `${this.botVsBot.whiteBot?.name || 'Bot'} vs ${this.botVsBot.blackBot?.name || 'Bot'}`
      : this.gameMode === 'vs-computer'
      ? `Stockfish (Lvl ${this.engineLevel})`
      : 'Local Opponent';

    const gameRecord = {
      id: Date.now(),
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString(),
      opponent: opponentName,
      result: result,
      reason: reason,
      moveCount: this.fullGameMoves.length,
      opening: this.engine.identifyOpening(this.fullGameMoves.map(m => m.san)),
      moves: this.fullGameMoves.map(m => ({
        san: m.san,
        from: m.from,
        to: m.to,
        color: m.color,
        flags: m.flags,
        promotion: m.promotion
      }))
    };

    this.savedGames.unshift(gameRecord);
    if (this.savedGames.length > 30) this.savedGames.pop();
    try {
      localStorage.setItem('fcc_games', JSON.stringify(this.savedGames));
    } catch (e) {
      console.warn('Could not save game history:', e);
    }
    this.renderHistoryTab();
  }

  loadGameFromHistory(gameId) {
    const record = this.savedGames.find(g => g.id === gameId);
    if (!record) return;

    this.stopAutoRewatch();
    this.stopClock();
    this.isGameOver = true;
    this.fullGameMoves = record.moves;
    this.currentMoveIndex = record.moves.length;

    // Set matchup title
    document.getElementById('game-matchup-title').textContent = `Review: Guest vs. ${record.opponent}`;
    document.getElementById('top-player-name').textContent = record.opponent;
    document.getElementById('bottom-player-name').textContent = 'Guest Player';

    this.updateMovesTable();
    this.navigateMove(record.moves.length);
    this.switchTab('game');
    this.logConsole(`Loaded match: ${record.result} vs ${record.opponent} (${record.moveCount} moves). Ready to review or rewatch!`, 'system');
  }

  renderHistoryTab() {
    const container = document.getElementById('history-items-container');
    if (!container) return;

    if (this.savedGames.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No previous games recorded yet.</div>';
      return;
    }

    container.innerHTML = '';
    this.savedGames.forEach(g => {
      const card = document.createElement('div');
      card.className = 'history-item-card';
      const badgeClass = g.result === 'Win' ? 'win' : (g.result === 'Loss' ? 'loss' : 'draw');

      card.innerHTML = `
        <div class="history-header">
          <span class="history-title">${g.opponent}</span>
          <span class="history-badge ${badgeClass}">${g.result}</span>
        </div>
        <div class="history-meta">
          <span>${g.opening ? g.opening.name : 'Chess Match'}</span>
          <span>${g.moveCount} moves &bull; ${g.date}</span>
        </div>
        <div class="history-actions">
          <button type="button" class="btn-history-action btn-load-game" data-id="${g.id}" title="Review or replay match">
            <i class="fa-solid fa-play"></i> Review
          </button>
          <button type="button" class="btn-history-action btn-copy-history" data-id="${g.id}" title="Copy PGN of this match">
            <i class="fa-regular fa-copy"></i> Copy
          </button>
          <button type="button" class="btn-history-action btn-save-history" data-id="${g.id}" title="Download PGN file">
            <i class="fa-solid fa-download"></i> Save
          </button>
        </div>
      `;

      card.querySelector('.btn-load-game').addEventListener('click', () => {
        this.loadGameFromHistory(g.id);
      });

      card.querySelector('.btn-copy-history').addEventListener('click', (e) => {
        this.copyEntirePlay(g.moves, g, e.currentTarget);
      });

      card.querySelector('.btn-save-history').addEventListener('click', (e) => {
        this.saveEntirePlayFile(g.moves, g, e.currentTarget);
      });

      container.appendChild(card);
    });
  }

  // ==========================================
  // Game Reviewer Export & Save Functionality
  // ==========================================

  generateFullPGN(moves = null, customMeta = null) {
    const moveList = moves || this.fullGameMoves;
    if (!moveList || moveList.length === 0) return '';

    const tempGame = new Chess();
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    let whiteName = 'Guest Player';
    let blackName = 'Stockfish';

    const matchupText = document.getElementById('game-matchup-title')?.textContent || '';
    if (customMeta && customMeta.opponent) {
      if (this.playerColor === 'b') {
        whiteName = customMeta.opponent;
        blackName = 'Guest Player';
      } else {
        whiteName = 'Guest Player';
        blackName = customMeta.opponent;
      }
    } else if (matchupText.startsWith('Review: Guest vs. ')) {
      const opp = matchupText.replace('Review: Guest vs. ', '').trim();
      if (this.playerColor === 'b') {
        whiteName = opp;
        blackName = 'Guest Player';
      } else {
        whiteName = 'Guest Player';
        blackName = opp;
      }
    } else if (this.gameMode === 'vs-bot' && this.selectedBot) {
      if (this.playerColor === 'w') {
        whiteName = 'Guest Player';
        blackName = `${this.selectedBot.name} (${this.selectedBot.rating})`;
      } else {
        whiteName = `${this.selectedBot.name} (${this.selectedBot.rating})`;
        blackName = 'Guest Player';
      }
    } else if (this.gameMode === 'bot-vs-bot') {
      whiteName = this.botVsBot.whiteBot?.name || 'White Bot';
      blackName = this.botVsBot.blackBot?.name || 'Black Bot';
    } else if (this.gameMode === 'vs-computer') {
      if (this.playerColor === 'w') {
        whiteName = 'Guest Player';
        blackName = `Stockfish (Lvl ${this.engineLevel})`;
      } else {
        whiteName = `Stockfish (Lvl ${this.engineLevel})`;
        blackName = 'Guest Player';
      }
    } else if (this.gameMode === 'pass-play') {
      whiteName = 'Player 1 (White)';
      blackName = 'Player 2 (Black)';
    }

    let result = '*';
    if (customMeta && customMeta.result) {
      if (customMeta.result === 'Win') result = this.playerColor === 'w' ? '1-0' : '0-1';
      else if (customMeta.result === 'Loss') result = this.playerColor === 'w' ? '0-1' : '1-0';
      else if (customMeta.result === 'Draw') result = '1/2-1/2';
    } else if (this.isGameOver) {
      if (this.game.in_checkmate()) {
        result = this.game.turn() === 'w' ? '0-1' : '1-0';
      } else if (this.game.in_draw()) {
        result = '1/2-1/2';
      }
    }

    const opening = this.engine.identifyOpening(moveList.map(m => m.san));

    tempGame.header(
      'Event', 'Free Chess Club Standalone Match',
      'Site', 'Free Chess Club Local',
      'Date', dateStr,
      'White', whiteName,
      'Black', blackName,
      'Result', result
    );

    if (opening && opening.eco) {
      tempGame.header('ECO', opening.eco, 'Opening', opening.name);
    }

    for (let i = 0; i < moveList.length; i++) {
      const m = moveList[i];
      try {
        tempGame.move({ from: m.from, to: m.to, promotion: m.promotion });
      } catch (e) {
        try { tempGame.move(m.san); } catch (e2) {}
      }
    }

    return tempGame.pgn();
  }

  async copyEntirePlay(moves = null, customMeta = null, triggerBtn = null) {
    const moveList = moves || this.fullGameMoves;
    if (!moveList || moveList.length === 0) {
      this.logConsole('No moves recorded yet in this match to copy.', 'system');
      return;
    }

    const pgn = this.generateFullPGN(moveList, customMeta);
    let copied = false;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(pgn);
        copied = true;
      }
    } catch (err) {
      console.warn('navigator.clipboard failed, attempting fallback:', err);
    }

    if (!copied) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = pgn;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        copied = true;
      } catch (err) {
        console.error('Fallback copy failed:', err);
      }
    }

    if (copied) {
      const targetBtn = triggerBtn || document.getElementById('btn-copy-play');
      this.flashButtonFeedback(targetBtn, 'Copied!', 'fa-solid fa-check');
      const modalBtn = document.getElementById('btn-game-over-copy-play');
      if (modalBtn && modalBtn !== targetBtn) {
        this.flashButtonFeedback(modalBtn, 'Copied!', 'fa-solid fa-check');
      }
      this.logConsole(`Entire play (${moveList.length} moves) copied to clipboard as PGN!`, 'system');
    } else {
      this.logConsole('Failed to copy play to clipboard.', 'system');
    }
  }

  saveEntirePlayFile(moves = null, customMeta = null, triggerBtn = null) {
    const moveList = moves || this.fullGameMoves;
    if (!moveList || moveList.length === 0) {
      this.logConsole('No moves recorded yet in this match to save.', 'system');
      return;
    }

    const pgn = this.generateFullPGN(moveList, customMeta);
    let opponentName = customMeta?.opponent || (this.selectedBot ? this.selectedBot.name : (this.gameMode === 'vs-computer' ? `Stockfish_Lvl${this.engineLevel}` : 'Match'));
    opponentName = opponentName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `ChessMatch_${opponentName}_${dateStamp}.pgn`;

    const blob = new Blob([pgn], { type: 'application/x-chess-pgn;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const targetBtn = triggerBtn || document.getElementById('btn-download-play');
    this.flashButtonFeedback(targetBtn, 'Saved!', 'fa-solid fa-check');
    const modalSaveBtn = document.getElementById('btn-game-over-save-pgn');
    if (modalSaveBtn && modalSaveBtn !== targetBtn) {
      this.flashButtonFeedback(modalSaveBtn, 'Saved!', 'fa-solid fa-check');
    }
    this.logConsole(`Entire play saved as "${filename}"!`, 'system');

    if (!customMeta) {
      this.saveCurrentGameToHistoryManual();
    }
  }

  saveCurrentGameToHistoryManual() {
    if (!this.fullGameMoves || this.fullGameMoves.length === 0) {
      this.logConsole('No moves recorded in this match to save.', 'system');
      return;
    }

    let result = 'In Progress';
    let title = 'Saved Match';
    let reason = 'Manually saved from game reviewer.';

    if (this.isGameOver) {
      if (this.game.in_checkmate()) {
        const winner = this.game.turn() === 'w' ? 'Black' : 'White';
        title = 'Checkmate!';
        reason = `${winner} won by checkmate.`;
        result = winner === (this.playerColor === 'w' ? 'White' : 'Black') ? 'Win' : 'Loss';
      } else if (this.game.in_draw()) {
        title = 'Draw';
        reason = 'Game ended in a draw.';
        result = 'Draw';
      }
    }

    const alreadySaved = this.savedGames.length > 0 &&
      this.savedGames[0].moveCount === this.fullGameMoves.length &&
      this.savedGames[0].moves[this.savedGames[0].moves.length - 1]?.san === this.fullGameMoves[this.fullGameMoves.length - 1]?.san;

    if (!alreadySaved) {
      this.saveGameToHistory(result, title, reason);
    } else {
      this.renderHistoryTab();
    }

    this.flashButtonFeedback(document.getElementById('btn-save-match'), 'Saved!', 'fa-solid fa-check');
    this.logConsole('Match successfully saved to Local Match History!', 'system');
  }

  flashButtonFeedback(btn, text, iconClass) {
    if (!btn) return;
    const originalHtml = btn.innerHTML;
    btn.classList.add('btn-success-feedback');
    btn.innerHTML = `<i class="${iconClass}"></i> <span>${text}</span>`;
    setTimeout(() => {
      btn.classList.remove('btn-success-feedback');
      btn.innerHTML = originalHtml;
    }, 2000);
  }

  // Clocks
  startClock() {
    this.isClockRunning = true;
    if (this.clockInterval) clearInterval(this.clockInterval);

    this.clockInterval = setInterval(() => {
      if (this.game.turn() === 'w') {
        this.whiteTimeMs -= 100;
        if (this.whiteTimeMs <= 0) {
          this.whiteTimeMs = 0;
          this.handleTimeOut('w');
        }
      } else {
        this.blackTimeMs -= 100;
        if (this.blackTimeMs <= 0) {
          this.blackTimeMs = 0;
          this.handleTimeOut('b');
        }
      }
      this.updateClockDisplays();
    }, 100);
  }

  stopClock() {
    this.isClockRunning = false;
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }

  handleTimeOut(flagColor) {
    if (this.isGameOver) return;
    const winner = flagColor === 'w' ? 'Black' : 'White';
    const isPlayerWhite = this.playerColor === 'w';
    const result = winner === (isPlayerWhite ? 'White' : 'Black') ? 'Win' : 'Loss';
    this.handleGameOver({
      title: "Time Out",
      message: `${winner} wins on time.`,
      result: result
    });
  }

  updateClockDisplays() {
    const formatTime = (ms) => {
      const totalSec = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSec / 60);
      const seconds = totalSec % 60;
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    if (this.whiteClockEl) {
      this.whiteClockEl.textContent = formatTime(this.whiteTimeMs);
      this.whiteClockEl.classList.toggle('active', this.isClockRunning && this.game.turn() === 'w');
      this.whiteClockEl.classList.toggle('low-time', this.whiteTimeMs <= 30000 && this.isClockRunning);
    }
    if (this.blackClockEl) {
      this.blackClockEl.textContent = formatTime(this.blackTimeMs);
      this.blackClockEl.classList.toggle('active', this.isClockRunning && this.game.turn() === 'b');
      this.blackClockEl.classList.toggle('low-time', this.blackTimeMs <= 30000 && this.isClockRunning);
    }
  }

  // Console / Terminal
  logConsole(message, type = 'system') {
    if (!this.consoleFeedEl) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `<span class="log-time">[${timeStr}]</span> ${message}`;
    this.consoleFeedEl.appendChild(entry);
    this.consoleFeedEl.scrollTop = this.consoleFeedEl.scrollHeight;
  }

  handleConsoleInput() {
    const text = this.chatInputEl.value.trim();
    if (!text) return;
    this.chatInputEl.value = '';

    this.logConsole(`> ${text}`, 'user');
    const parts = text.split(' ');
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case 'help':
        this.logConsole('Available commands: help, play [1-8], level [1-8], eval, fen, pgn, copy, save, flip, undo, rewatch, draw, resign, new', 'admin');
        break;
      case 'play':
      case 'new':
        const lvl = parts[1] ? parseInt(parts[1], 10) : this.engineLevel;
        this.engineLevel = Math.max(1, Math.min(8, lvl));
        this.startNewGame('vs-computer');
        break;
      case 'level':
        if (parts[1]) {
          this.engineLevel = Math.max(1, Math.min(8, parseInt(parts[1], 10)));
          this.logConsole(`Engine difficulty set to level ${this.engineLevel}.`, 'bot');
        } else {
          this.logConsole(`Current engine difficulty: level ${this.engineLevel}.`, 'bot');
        }
        break;
      case 'eval':
        this.engine.evaluatePosition(this.game, (res) => {
          this.logConsole(`Score: ${res.score.toFixed(2)} | Best line: ${res.pv}`, 'bot');
        });
        break;
      case 'fen':
        this.logConsole(`FEN: ${this.game.fen()}`, 'system');
        break;
      case 'pgn':
        this.logConsole(`PGN:\n${this.generateFullPGN() || "(no moves yet)"}`, 'system');
        break;
      case 'copy':
        this.copyEntirePlay();
        break;
      case 'save':
      case 'download':
        this.saveEntirePlayFile();
        break;
      case 'flip':
        this.flipBoard();
        this.logConsole('Board flipped.', 'system');
        break;
      case 'rewatch':
        this.toggleAutoRewatch();
        break;
      case 'undo':
        this.undoMove();
        break;
      case 'draw':
        this.offerDraw();
        break;
      case 'resign':
        this.resignGame();
        break;
      default:
        setTimeout(() => {
          this.logConsole(`[adminBOT] Message received. Play on!`, 'bot');
        }, 300);
        break;
    }
  }

  toggleAnalysisMode() {
    this.gameMode = 'analysis';
    this.stopClock();
    this.logConsole('Analysis mode active. Make moves freely to inspect evaluations.', 'system');
  }
}

// Instantiate App once DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.chessApp = new ChessApp();
});
