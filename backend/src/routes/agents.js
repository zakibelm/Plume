'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { validate, runAgentSchema } = require('../validators');
const { supabase } = require('../services/supabase');
const logger = require('../utils/logger');

const StrategistAgent = require('../agents/strategist');
const ArchitectAgent = require('../agents/architect');
const WriterAgent = require('../agents/writer');
const HumanizerAgent = require('../agents/humanizer');
const BrandVoiceAgent = require('../agents/brand-voice');
const EnhancerAgent = require('../agents/enhancer');
const CriticAgent = require('../agents/critic');
const QualityAgent = require('../agents/quality');
const ValidatorAgent = require('../agents/validator');

const agents = {
  strategist:    new StrategistAgent(),
  architect:     new ArchitectAgent(),
  writer:        new WriterAgent(),
  humanizer:     new HumanizerAgent(),
  'brand-voice': new BrandVoiceAgent(),
  enhancer:      new EnhancerAgent(),
  critic:        new CriticAgent(),
  quality:       new QualityAgent(),
  validator:     new ValidatorAgent(),
};

const router = express.Router();

router.use(authenticate);

router.post('/agents/:agentName/run', validate(runAgentSchema), async (req, res) => {
  const { agentName } = req.params;
  const { projectId, input, options } = req.body;

  const agent = agents[agentName];
  if (!agent) {
    return res.status(404).json({ error: `Unknown agent: ${agentName}` });
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', req.user.id)
    .single();

  if (!project) return res.status(404).json({ error: 'Project not found' });

  try {
    const output = await agent.run(input, projectId, options);
    res.json({ output, agentName });
  } catch (err) {
    logger.error('Agent run failed', { agentName, projectId, error: err.message });
    const status = err.name === 'BudgetError' ? 402 : 500;
    res.status(status).json({ error: err.message, code: err.name });
  }
});

module.exports = router;
