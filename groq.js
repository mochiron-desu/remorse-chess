// Groq API Service for Real-Time Chess Bot Personality Banter & Dialogue
// Powered by Groq's high-speed Llama 3 models with instant local fallback

(function () {
  'use strict';

  class GroqPersonalityService {
    constructor() {
      this.storageKey = 'chess_groq_api_key';
      this.modelKey = 'chess_groq_model';
      this.model = this.loadModel();
      this.apiKey = this.loadApiKey();
      this.isGenerating = false;
      this.recentLines = [];
    }

    loadApiKey() {
      try {
        return localStorage.getItem(this.storageKey) || '';
      } catch (e) {
        return '';
      }
    }

    loadModel() {
      try {
        return localStorage.getItem(this.modelKey) || 'llama-3.3-70b-versatile';
      } catch (e) {
        return 'llama-3.3-70b-versatile';
      }
    }

    setModel(model) {
      this.model = (model || 'llama-3.3-70b-versatile').trim();
      try {
        localStorage.setItem(this.modelKey, this.model);
      } catch (e) {
        console.warn('Failed to save Groq model to localStorage:', e);
      }
    }

    getModel() {
      return this.model;
    }

    setApiKey(key) {
      this.apiKey = (key || '').trim();
      try {
        if (this.apiKey) {
          localStorage.setItem(this.storageKey, this.apiKey);
        } else {
          localStorage.removeItem(this.storageKey);
        }
      } catch (e) {
        console.warn('Failed to save Groq API key to localStorage:', e);
      }
    }

    getApiKey() {
      return this.apiKey;
    }

    hasApiKey() {
      return !!this.apiKey && this.apiKey.startsWith('gsk_');
    }

    async fetchAvailableModels(keyToUse) {
      const key = keyToUse || this.apiKey;
      if (!key) throw new Error('API key is required');
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${response.status}`);
      }
      const data = await response.json();
      const models = (data.data || [])
        .map(m => m.id)
        .filter(id => !id.includes('whisper') && !id.includes('tts') && !id.includes('guard'));
      return models.sort();
    }

    async testConnection(keyToTest, modelToTest) {
      const key = keyToTest || this.apiKey;
      const model = modelToTest || this.model;
      if (!key) throw new Error('API key is empty');

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: 'You are a test ping. Respond with only: OK' },
            { role: 'user', content: 'Ping' }
          ],
          max_tokens: 5,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status} from Groq`);
      }

      return true;
    }

    // Generate dialogue line for a bot
    async generateDialogue({ bot, opponentName, eventType, moveSan, boardDesc, opponentLine }) {
      // If no valid Groq key, immediately return offline quote
      if (!this.hasApiKey()) {
        return this.getFallbackQuote(bot, eventType);
      }

      const systemPrompt = `You are roleplaying as "${bot.name}", a distinctive chess bot with the following persona and gimmick:
${bot.title}.
${bot.description}
${bot.systemPrompt || ''}

RULES FOR YOUR OUTPUT:
- Speak directly to your opponent ("${opponentName || 'Opponent'}").
- Respond with EXACTLY ONE punchy, entertaining dialogue sentence (MAXIMUM 15 words).
- Embody your gimmick completely (e.g. if ScaredFish, scream in panic about pawns being queens; if PanicFish, shout about losing 300 Elo on check; if Tony Gains, talk like a gym bro; if DrawFish, demand 0.00 peace).
- NEVER give chess advice, explanations, or quotes. Output ONLY the in-character dialogue line.`;

      let userPrompt = `Game Event: ${eventType}`;
      if (moveSan) userPrompt += ` | Move played: ${moveSan}`;
      if (boardDesc) userPrompt += ` | Board note: ${boardDesc}`;
      if (opponentLine) userPrompt += ` | Opponent just said: "${opponentLine}"`;
      userPrompt += ` | Deliver your 1-sentence reaction now:`;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2800); // 2.8s strict timeout

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            max_tokens: 35,
            temperature: 0.85
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn('Groq API error:', response.status);
          return this.getFallbackQuote(bot, eventType);
        }

        const data = await response.json();
        const rawLine = data.choices?.[0]?.message?.content?.trim();
        if (rawLine) {
          // Clean quotes / formatting
          const cleanLine = rawLine.replace(/^["']|["']$/g, '').trim();
          this.recentLines.push(cleanLine);
          if (this.recentLines.length > 20) this.recentLines.shift();
          return cleanLine;
        }
      } catch (err) {
        console.warn('Groq generation fallback:', err.message);
      }

      return this.getFallbackQuote(bot, eventType);
    }

    getFallbackQuote(bot, eventType) {
      if (!bot || !bot.quotes) return '...';
      const pool = bot.quotes[eventType] || bot.quotes['move'] || ['...'];
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }

  window.GroqPersonalityService = GroqPersonalityService;
  window.chessGroqService = new GroqPersonalityService();

})();
