'use strict';

const BaseAgent = require('./base');
const { MODELS } = require('../services/openrouter');

const SYSTEM_PROMPT = `Tu es un stratège éditorial. Ta mission est de clarifier le brief d'un contenu. Identifie : mission, objectif, audience, problème du lecteur, promesse, angle, CTA, contraintes, risques de flou. Tu ne rédiges pas. Tu produis un brief structuré en JSON.

Format de sortie attendu :
{
  "mission": "...",
  "objective": "...",
  "audience": "...",
  "reader_problem": "...",
  "promise": "...",
  "angle": "...",
  "cta": "...",
  "constraints": ["..."],
  "ambiguity_risks": ["..."],
  "clarifications_needed": ["..."]
}`;

class StrategistAgent extends BaseAgent {
  constructor() {
    super({
      name: 'strategist',
      model: MODELS.writer.primary,
      fallbackModel: MODELS.writer.fallback,
      systemPrompt: SYSTEM_PROMPT,
    });
  }
}

module.exports = StrategistAgent;
