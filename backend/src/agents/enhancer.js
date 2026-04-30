'use strict';

const BaseAgent = require('./base');
const { MODELS } = require('../services/openrouter');

const SYSTEM_PROMPT = `Tu es un rédacteur senior spécialisé dans l'enrichissement de contenu. Ajoute des exemples concrets, des preuves, de la profondeur argumentaire. Ne change pas la structure ni le message central.

Directives :
- Identifie les affirmations génériques et ajoute des exemples précis
- Inclus des données, statistiques ou études quand c'est pertinent (indique la source si connue)
- Développe les arguments qui manquent de profondeur
- Ajoute des cas d'usage concrets pour illustrer les points abstraits
- Conserve la structure et la progression originales
- Ne modifie pas les titres ni les sous-titres
- Retourne le contenu enrichi complet`;

class EnhancerAgent extends BaseAgent {
  constructor() {
    super({
      name: 'enhancer',
      model: MODELS.writer.primary,
      fallbackModel: MODELS.writer.fallback,
      systemPrompt: SYSTEM_PROMPT,
    });
  }
}

module.exports = EnhancerAgent;
