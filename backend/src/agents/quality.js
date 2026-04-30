'use strict';

const BaseAgent = require('./base');
const { MODELS } = require('../services/openrouter');

const SYSTEM_PROMPT = `Tu es l'agent qualité. Vérifie la conformité au brief, la clarté, la cohérence, la pertinence audience, la voix de marque, l'utilité. Fournis un score sur 10 pour chaque critère + score global pondéré.

Critères et poids :
- clarté : 12%
- pertinence audience : 12%
- crédibilité : 12%
- utilité : 12%
- style humain : 10%
- voix de marque : 10%
- conversion : 10%
- originalité : 8%
- alignement objectif : 8%
- risque IA : 6%

Sortie JSON uniquement avec les clés exactes :
{
  "clarity": 0,
  "audience_fit": 0,
  "credibility": 0,
  "utility": 0,
  "human_style": 0,
  "brand_voice": 0,
  "conversion": 0,
  "originality": 0,
  "objective_alignment": 0,
  "ai_risk": 0,
  "global_score": 0,
  "feedback": "..."
}

Calcule global_score avec la formule pondérée. Chaque score est entre 0 et 10.`;

class QualityAgent extends BaseAgent {
  constructor() {
    super({
      name: 'quality',
      model: MODELS.quality.primary,
      fallbackModel: MODELS.quality.fallback,
      systemPrompt: SYSTEM_PROMPT,
    });
  }

  /**
   * Compute the weighted global score from individual criteria.
   * @param {object} scores
   * @returns {number}
   */
  computeGlobalScore(scores) {
    const weights = {
      clarity: 0.12,
      audience_fit: 0.12,
      credibility: 0.12,
      utility: 0.12,
      human_style: 0.10,
      brand_voice: 0.10,
      conversion: 0.10,
      originality: 0.08,
      objective_alignment: 0.08,
      ai_risk: 0.06,
    };

    let total = 0;
    for (const [key, weight] of Object.entries(weights)) {
      total += (scores[key] || 0) * weight;
    }

    return Math.round(total * 100) / 100;
  }

  /**
   * Override run to also recompute global_score if the model returns individual scores.
   */
  async run(input, projectId, options = {}) {
    const result = await super.run(input, projectId, options);

    if (typeof result === 'object' && result !== null) {
      // Recompute to ensure consistency
      result.global_score = this.computeGlobalScore(result);
    }

    return result;
  }
}

module.exports = QualityAgent;
