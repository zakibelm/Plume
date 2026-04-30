'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../services/supabase');
const { authenticate } = require('../middleware/auth');
const { validate, createProjectSchema } = require('../validators');
const logger = require('../utils/logger');

const BUDGET_DEFAULTS = {
  fast:     { max_cost_usd: 0.50, max_llm_calls: 15 },
  standard: { max_cost_usd: 1.00, max_llm_calls: 35 },
  premium:  { max_cost_usd: 2.00, max_llm_calls: 60 },
};

const router = express.Router();

router.use(authenticate);

router.post('/projects', validate(createProjectSchema), async (req, res) => {
  const { name, description, content_type, mode = 'standard' } = req.body;
  const userId = req.user.id;

  const projectId = uuidv4();

  const { error: projectError } = await supabase.from('projects').insert({
    id: projectId,
    user_id: userId,
    name,
    description,
    content_type,
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (projectError) {
    logger.error('Failed to create project', { error: projectError.message });
    return res.status(500).json({ error: 'Failed to create project' });
  }

  const defaults = BUDGET_DEFAULTS[mode];
  const { error: budgetError } = await supabase.from('project_budgets').insert({
    id: uuidv4(),
    project_id: projectId,
    mode,
    max_cost_usd: defaults.max_cost_usd,
    max_llm_calls: defaults.max_llm_calls,
    current_cost_usd: 0,
    current_llm_calls: 0,
    status: 'active',
    created_at: new Date().toISOString(),
  });

  if (budgetError) {
    logger.warn('Failed to create budget for project', { projectId, error: budgetError.message });
  }

  const { data: project } = await supabase
    .from('projects')
    .select('*, project_budgets(*)')
    .eq('id', projectId)
    .single();

  res.status(201).json(project);
});

router.get('/projects', async (req, res) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*, project_budgets(mode, current_cost_usd, max_cost_usd)')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/projects/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*, project_budgets(*), content_briefs(*)')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Project not found' });
  res.json(data);
});

module.exports = router;
