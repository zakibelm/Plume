'use strict';

const { v4: uuidv4 } = require('uuid');
const { runEVVStep } = require('./evv');
const { getProjectBudget } = require('../services/budget');
const { BudgetError } = require('../services/budget');
const { saveContextSnapshot } = require('../services/context');
const { supabase } = require('../services/supabase');
const { emitEvent, EVENT_TYPES, removeWorkflowEmitter } = require('../streaming/emitter');
const logger = require('../utils/logger');

const BUDGET_WARNING_THRESHOLD = 0.20; // warn when < 20% budget remaining

/**
 * Save a content version after a completed step.
 * @param {string} projectId
 * @param {string} stepName
 * @param {any} content
 * @param {string} workflowRunId
 */
async function saveContentVersion(projectId, stepName, content, workflowRunId) {
  const { error } = await supabase.from('content_versions').insert({
    id: uuidv4(),
    project_id: projectId,
    workflow_run_id: workflowRunId,
    step: stepName,
    content: typeof content === 'string' ? content : JSON.stringify(content),
    created_at: new Date().toISOString(),
  });

  if (error) {
    logger.warn('Failed to save content version', {
      projectId,
      step: stepName,
      error: error.message,
    });
  }
}

/**
 * Check if the budget is below the warning threshold and emit an event if so.
 * @param {string} projectId
 */
async function checkBudgetWarning(projectId) {
  try {
    const budget = await getProjectBudget(projectId);
    const remaining = budget.max_cost_usd - budget.current_cost_usd;
    const percentRemaining = remaining / budget.max_cost_usd;

    if (percentRemaining < BUDGET_WARNING_THRESHOLD) {
      emitEvent(projectId, {
        type: EVENT_TYPES.BUDGET_WARNING,
        remaining_usd: remaining,
        percent_remaining: Math.round(percentRemaining * 100),
        max_usd: budget.max_cost_usd,
        current_usd: budget.current_cost_usd,
      });
    }
  } catch (err) {
    logger.warn('Failed to check budget warning', { projectId, error: err.message });
  }
}

/**
 * Run a full editorial workflow.
 *
 * @param {string} projectId
 * @param {object} workflowConfig - { steps: [{ name, agent, buildInput }] }
 * @param {string} workflowRunId - UUID for this run
 * @returns {Promise<object>} result summary
 */
async function runWorkflow(projectId, workflowConfig, workflowRunId) {
  const { steps } = workflowConfig;

  logger.info('Starting workflow', {
    projectId,
    workflowRunId,
    stepCount: steps.length,
  });

  const results = {};
  let lastOutput = null;
  let workflowStatus = 'completed';

  try {
    for (const step of steps) {
      const { name: stepName, buildInput } = step;

      // Build input for this step using previous outputs
      const stepInput = buildInput ? buildInput(lastOutput, results) : lastOutput;

      let stepResult;

      try {
        stepResult = await runEVVStep(step, stepInput, projectId);
      } catch (err) {
        if (err instanceof BudgetError) {
          workflowStatus = 'budget_stopped';
          emitEvent(projectId, {
            type: EVENT_TYPES.ERROR,
            step: stepName,
            error: err.message,
            code: 'BUDGET_EXHAUSTED',
          });
          break;
        }

        workflowStatus = 'error';
        emitEvent(projectId, {
          type: EVENT_TYPES.ERROR,
          step: stepName,
          error: err.message,
          code: 'STEP_ERROR',
        });
        logger.error('Workflow step failed', { projectId, step: stepName, error: err.message });
        break;
      }

      results[stepName] = stepResult;
      lastOutput = stepResult.output;

      // Persist content version after successful step
      await saveContentVersion(projectId, stepName, stepResult.output, workflowRunId);

      // Save context snapshot between steps
      try {
        await saveContextSnapshot(
          projectId,
          stepName,
          `Step "${stepName}" completed with decision: ${stepResult.validation?.decision || 'N/A'}. Quality score: ${stepResult.quality?.global_score || 'N/A'}`,
          [
            `Decision: ${stepResult.validation?.decision}`,
            `Global score: ${stepResult.quality?.global_score}`,
          ],
          [],
        );
      } catch (contextErr) {
        logger.warn('Failed to save context snapshot', {
          projectId,
          step: stepName,
          error: contextErr.message,
        });
      }

      // Check if we should warn about budget
      await checkBudgetWarning(projectId);

      if (stepResult.status === 'FAILED_VALIDATION') {
        workflowStatus = 'validation_failed';
        logger.warn('Step failed validation, halting workflow', {
          projectId,
          step: stepName,
          decision: stepResult.validation?.decision,
        });
        break;
      }
    }
  } finally {
    // Update workflow_runs record in database
    await supabase
      .from('workflow_runs')
      .update({
        status: workflowStatus,
        completed_at: new Date().toISOString(),
        result_summary: JSON.stringify({
          steps_completed: Object.keys(results).length,
          total_steps: steps.length,
          last_step: Object.keys(results).at(-1) || null,
        }),
      })
      .eq('id', workflowRunId);

    // Emit workflow_complete
    emitEvent(projectId, {
      type: EVENT_TYPES.WORKFLOW_COMPLETE,
      workflowRunId,
      status: workflowStatus,
      steps_completed: Object.keys(results).length,
      total_steps: steps.length,
    });

    // Cleanup emitter after a short delay to allow final events to be consumed
    setTimeout(() => removeWorkflowEmitter(projectId), 5000);
  }

  return {
    workflowRunId,
    status: workflowStatus,
    results,
  };
}

module.exports = { runWorkflow };
