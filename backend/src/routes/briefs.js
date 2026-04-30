'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../services/supabase');
const { authenticate } = require('../middleware/auth');
const { validate, createBriefSchema } = require('../validators');

const router = express.Router();

router.use(authenticate);

router.post('/projects/:projectId/brief', validate(createBriefSchema), async (req, res) => {
  const { projectId } = req.params;

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', req.user.id)
    .single();

  if (!project) return res.status(404).json({ error: 'Project not found' });

  // Upsert brief (one brief per project)
  const { data: existing } = await supabase
    .from('content_briefs')
    .select('id')
    .eq('project_id', projectId)
    .single();

  const briefData = {
    project_id: projectId,
    ...req.body,
    updated_at: new Date().toISOString(),
  };

  let result;
  if (existing) {
    const { data, error } = await supabase
      .from('content_briefs')
      .update(briefData)
      .eq('id', existing.id)
      .select()
      .single();
    result = { data, error };
  } else {
    const { data, error } = await supabase
      .from('content_briefs')
      .insert({ id: uuidv4(), ...briefData, created_at: new Date().toISOString() })
      .select()
      .single();
    result = { data, error };
  }

  if (result.error) return res.status(500).json({ error: result.error.message });
  res.status(existing ? 200 : 201).json(result.data);
});

router.get('/projects/:projectId/brief', async (req, res) => {
  const { data, error } = await supabase
    .from('content_briefs')
    .select('*')
    .eq('project_id', req.params.projectId)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Brief not found' });
  res.json(data);
});

module.exports = router;
