'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../services/supabase');
const { authenticate } = require('../middleware/auth');
const { validate, runWorkflowSchema } = require('../validators');
const { runWorkflow } = require('../workflows/runner');
const { getWorkflowEmitter } = require('../streaming/emitter');
const logger = require('../utils/logger');

// Agent imports for building workflow steps
const StrategistAgent = require('../agents/strategist');
const ArchitectAgent = require('../agents/architect');
const WriterAgent = require('../agents/writer');
const HumanizerAgent = require('../agents/humanizer');
const EnhancerAgent = require('../agents/enhancer');
const CriticAgent = require('../agents/critic');

const router = express.Router();

/**
 * Build the list of workflow steps based on mode.
 * Each step has: { name, agent, buildInput }
 *
 * @param {string} mode - 'fast' | 'standard' | 'premium'
 * @param {object} [brief] - optional override brief
 * @returns {Array}
 */
function buildWorkflowSteps(mode, brief) {
  const strategist = new StrategistAgent();
  const architect = new ArchitectAgent();
  const writer = new WriterAgent();
  const humanizer = new HumanizerAgent();
  const enhancer = new EnhancerAgent();
  const critic = new CriticAgent();

  const baseSteps = [
    {
      name: 'strategy',
      agent: strategist,
      buildInput: (_, __) => brief || {},
    },
    {
      name: 'architecture',
      agent: architect,
      buildInput: (lastOutput, results) => ({
        brief: results.strategy?.output || brief || {},
        strategy: lastOutput,
      }),
    },
    {
      name: 'writing',
      agent: writer,
      buildInput: (lastOutput, results) => ({
        brief: results.strategy?.output || brief || {},
        plan: results.architecture?.output || lastOutput,
        instruction: 'Rédige le contenu complet selon le plan fourni.',
      }),
    },
  ];

  if (mode === 'fast') {
    return baseSteps;
  }

  const standardSteps = [
    ...baseSteps,
    {
      name: 'humanization',
      agent: humanizer,
      buildInput: (lastOutput, results) => ({
        content: results.writing?.output || lastOutput,
        brief: results.strategy?.output || brief || {},
      }),
    },
  ];

  if (mode === 'standard') {
    return standardSteps;
  }

  // premium — full pipeline
  return [
    ...standardSteps,
    {
      name: 'enhancement',
      agent: enhancer,
      buildInput: (lastOutput, results) => ({
        content: results.humanization?.output || results.writing?.output || lastOutput,
        brief: results.strategy?.output || brief || {},
      }),
    },
    {
      name: 'critique',
      agent: critic,
      buildInput: (lastOutput, results) => ({
        content: results.enhancement?.output || lastOutput,
        brief: results.strategy?.output || brief || {},
      }),
    },
  ];
}

/**
 * POST /api/workflows/run
 * Start a workflow asynchronously. Returns workflow_id immediately.
 */
router.post('/run', authenticate, validate(runWorkflowSchema), async (req, res) => {
  const { projectId, workflow, mode, brief } = req.body;

  // Verify project ownership
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, mode')
    .eq('id', projectId)
    .eq('user_id', req.user.id)
    .single();

  if (projectError || !project) {
    return res.status(404).json({ error: 'Project not found or access denied' });
  }

  const effectiveMode = mode || project.mode || 'standard';
  const workflowRunId = uuidv4();

  // Create workflow_runs record
  const { error: runError } = await supabase.from('workflow_runs').insert({
    id: workflowRunId,
    project_id: projectId,
    user_id: req.user.id,
    workflow_type: workflow,
    mode: effectiveMode,
    status: 'running',
    created_at: new Date().toISOString(),
  });

  if (runError) {
    logger.error('Failed to create workflow_runs record', { error: runError.message });
    return res.status(500).json({ error: 'Failed to start workflow' });
  }

  // Run workflow asynchronously
  const steps = buildWorkflowSteps(effectiveMode, brief);
  const workflowConfig = { steps };

  setImmediate(async () => {
    try {
      await runWorkflow(projectId, workflowConfig, workflowRunId);
    } catch (err) {
      logger.error('Workflow runner error', { projectId, workflowRunId, error: err.message });

      await supabase
        .from('workflow_runs')
        .update({ status: 'error', completed_at: new Date().toISOString() })
        .eq('id', workflowRunId);
    }
  });

  return res.status(202).json({
    workflow_id: workflowRunId,
    project_id: projectId,
    status: 'running',
    mode: effectiveMode,
    stream_url: `/api/workflows/${projectId}/stream`,
  });
});

/**
 * GET /api/workflows/:projectId/status
 * Get the current workflow status for a project.
 */
router.get('/:projectId/status', authenticate, async (req, res) => {
  const { projectId } = req.params;

  const { data, error } = await supabase
    .from('workflow_runs')
    .select('id, status, workflow_type, mode, created_at, completed_at, result_summary')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code === 'PGRST116') {
    return res.status(404).json({ error: 'No workflow found for this project' });
  }

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(data);
});

/**
 * GET /api/workflows/:projectId/stream
 * SSE endpoint — streams live workflow events to the client.
 * Supports auth via Authorization header or ?token= query param.
 */
router.get('/:projectId/stream', authenticate, (req, res) => {
  const { projectId } = req.params;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({ type: 'connected', projectId })}\n\n`);

  const emitter = getWorkflowEmitter(projectId);

  function onEvent(event) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);

    if (event.type === 'workflow_complete' || event.type === 'error') {
      cleanup();
    }
  }

  function cleanup() {
    emitter.removeListener('event', onEvent);
    res.end();
  }

  emitter.on('event', onEvent);

  // Handle client disconnect
  req.on('close', cleanup);
  req.on('error', cleanup);

  // Keep-alive ping every 25 seconds
  const pingInterval = setInterval(() => {
    if (res.writable) {
      res.write(': ping\n\n');
    } else {
      clearInterval(pingInterval);
    }
  }, 25000);

  req.on('close', () => clearInterval(pingInterval));
});

module.exports = router;
