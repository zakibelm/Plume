'use strict';

const BaseAgent = require('./base');
const { MODELS } = require('../services/openrouter');

const SYSTEM_PROMPT = `Tu es un rédacteur professionnel. Tu rédiges UNIQUEMENT la section demandée. Respecte : le brief, le plan, l'audience, la voix de marque, les contraintes, les interdits. Écris de manière concrète, claire et utile.

Règles impératives :
- Ne rédige QUE la section demandée, pas le document complet
- Respecte strictement les interdits et contraintes du brief
- Adopte la voix de marque fournie
- Rédige pour l'audience cible définie
- Sois concret, évite les généralités creuses
- Utilise des exemples quand c'est pertinent`;

class WriterAgent extends BaseAgent {
  constructor() {
    super({
      name: 'writer',
      model: MODELS.writer.primary,
      fallbackModel: MODELS.writer.fallback,
      systemPrompt: SYSTEM_PROMPT,
    });
  }
}

module.exports = WriterAgent;
