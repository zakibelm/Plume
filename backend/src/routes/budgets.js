'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../services/supabase');
const { getProjectBudget } = require('../services/budget');

const router = express.Router();

router.use(authenticate);

async function assertProjectOwner(projectId, userId, res) {
  const { data } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();
  if (!data) {
    res.status(404).json({ error: 'Project not found' });
    return false;
  }
  return true;
}

router.get('/projects/:projectId/budget', async (req, res) => {
  if (!(await assertProjectOwner(req.params.projectId, req.user.id, res))) return;
  try {
    const budget = await getProjectBudget(req.params.projectId);
    res.json(budget);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.patch('/projects/:projectId/budget', async (req, res) => {
  const { projectId } = req.params;
  if (!(await assertProjectOwner(projectId, req.user.id, res))) return;

  const allowed = ['max_cost_usd', 'max_llm_calls', 'mode', 'status'];
  const update = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  );

  if (!Object.keys(update).length) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const { data, error } = await supabase
    .from('project_budgets')
    .update(update)
    .eq('project_id', projectId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
