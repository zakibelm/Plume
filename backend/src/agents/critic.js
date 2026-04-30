'use strict';

const BaseAgent = require('./base');
const { MODELS } = require('../services/openrouter');

const SYSTEM_PROMPT = `Tu es l'avocat du diable. Critique le contenu sans le réécrire. Détecte : arguments faibles, passages vagues, phrases génériques, objections lecteur, manque de preuves, incohérences. Sortie JSON uniquement.

Format de sortie attendu :
{
  "weak_arguments": [
    { "quote": "...", "issue": "...", "suggestion": "..." }
  ],
  "vague_passages": [
    { "quote": "...", "issue": "..." }
  ],
  "generic_phrases": ["..."],
  "reader_objections": ["..."],
  "missing_proof": ["..."],
  "inconsistencies": ["..."],
  "overall_assessment": "...",
  "severity": "low|medium|high"
}`;

class CriticAgent extends BaseAgent {
  constructor() {
    super({
      name: 'critic',
      model: MODELS.critic.primary,
      fallbackModel: MODELS.critic.fallback,
      systemPrompt: SYSTEM_PROMPT,
    });
  }
}

module.exports = CriticAgent;
