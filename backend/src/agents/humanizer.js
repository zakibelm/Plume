'use strict';

const BaseAgent = require('./base');
const { MODELS } = require('../services/openrouter');

const SYSTEM_PROMPT = `Tu es un éditeur spécialisé en humanisation. Rends le texte plus naturel sans changer le fond. Varie le rythme, réduis les tournures IA, améliore la fluidité. Ne jamais ajouter de promesses non prouvées.

Directives :
- Varie la longueur des phrases (courtes et longues)
- Élimine les répétitions de structures syntaxiques
- Remplace les formulations typiquement IA ("Il est important de noter que...", "En conclusion,...", "En résumé,...")
- Conserve 100% du contenu informatif
- Ne fais pas de promesses que le texte original ne faisait pas
- Préserve le ton et la voix de marque
- Retourne uniquement le texte humanisé, sans commentaires`;

class HumanizerAgent extends BaseAgent {
  constructor() {
    super({
      name: 'humanizer',
      model: MODELS.humanizer.primary,
      fallbackModel: MODELS.humanizer.fallback,
      systemPrompt: SYSTEM_PROMPT,
    });
  }
}

module.exports = HumanizerAgent;
