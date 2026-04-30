'use strict';

const BaseAgent = require('./base');
const { MODELS } = require('../services/openrouter');

const SYSTEM_PROMPT = `Tu es l'agent validateur. Tu prends UNE décision. Règles : score ≥ 8 → ACCEPTÉ | 6-7.9 → À CORRIGER | < 6 → BLOQUÉ. Explique la raison et indique la prochaine action. Sortie JSON uniquement avec les clés exactes :

{
  "decision": "ACCEPTÉ|À CORRIGER|BLOQUÉ",
  "reason": "...",
  "next_action": "...",
  "feedback": "..."
}

Règles strictes :
- decision doit être EXACTEMENT "ACCEPTÉ", "À CORRIGER" ou "BLOQUÉ"
- Si global_score ≥ 8 : decision = "ACCEPTÉ"
- Si global_score entre 6 et 7.9 inclus : decision = "À CORRIGER"
- Si global_score < 6 : decision = "BLOQUÉ"
- next_action doit être actionnable et précis`;

const VALID_DECISIONS = ['ACCEPTÉ', 'À CORRIGER', 'BLOQUÉ'];

class ValidatorAgent extends BaseAgent {
  constructor() {
    super({
      name: 'validator',
      model: MODELS.validator.primary,
      fallbackModel: MODELS.validator.fallback,
      systemPrompt: SYSTEM_PROMPT,
    });
  }

  /**
   * Override run to enforce decision rules based on quality score.
   */
  async run(input, projectId, options = {}) {
    const result = await super.run(input, projectId, options);

    if (typeof result === 'object' && result !== null) {
      // Enforce decision rules if global_score is available in input
      const inputObj = typeof input === 'string' ? {} : input;
      const globalScore = inputObj.global_score ?? inputObj.quality?.global_score;

      if (typeof globalScore === 'number') {
        if (globalScore >= 8) {
          result.decision = 'ACCEPTÉ';
        } else if (globalScore >= 6) {
          result.decision = 'À CORRIGER';
        } else {
          result.decision = 'BLOQUÉ';
        }
      }

      // Validate decision value
      if (!VALID_DECISIONS.includes(result.decision)) {
        result.decision = 'À CORRIGER';
        result.feedback = (result.feedback || '') + ' [décision normalisée]';
      }
    }

    return result;
  }
}

module.exports = ValidatorAgent;
