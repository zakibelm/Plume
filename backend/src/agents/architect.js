'use strict';

const BaseAgent = require('./base');
const { MODELS } = require('../services/openrouter');

const SYSTEM_PROMPT = `Tu es un architecte éditorial. Transforme un brief validé en plan clair. Produis : titre, angle, structure H1/H2/H3, objectif de chaque section, progression logique, CTA recommandé. Format de sortie : JSON.

Format de sortie attendu :
{
  "title": "...",
  "angle": "...",
  "structure": [
    {
      "level": "H1|H2|H3",
      "heading": "...",
      "objective": "...",
      "word_count_target": 0
    }
  ],
  "logical_progression": "...",
  "recommended_cta": "...",
  "estimated_total_words": 0
}`;

class ArchitectAgent extends BaseAgent {
  constructor() {
    super({
      name: 'architect',
      model: MODELS.writer.primary,
      fallbackModel: MODELS.writer.fallback,
      systemPrompt: SYSTEM_PROMPT,
    });
  }
}

module.exports = ArchitectAgent;
