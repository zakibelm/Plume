'use strict';

const QualityAgent = require('../agents/quality');
const ValidatorAgent = require('../agents/validator');
const { checkBudget } = require('../services/budget');
const { BudgetError } = require('../services/budget');
const { emitEvent, EVENT_TYPES } = require('../streaming/emitter');
const logger = require('../utils/logger');

const MAX_RETRIES = 2;

const qualityAgent = new QualityAgent();
const validatorAgent = new ValidatorAgent();

/**
 * Run a single EVV (Execute-Verify-Validate) step.
 *
 * @param {object} step - Step descriptor: { name, agent, buildInput }
 * @param {string|object} input - Step input
 * @param {string} projectId
 * @param {number} [attempt=0] - Current retry attempt
 * @returns {Promise<{ status: 'ACCEPTED'|'FAILED_VALIDATION', output: any, quality: object, validation: object }>}
 */
async function runEVVStep(step, input, projectId, attempt = 0) {
  const { name: stepName, agent } = step;

  // 1. Emit step_started
  emitEvent(projectId, {
    type: EVENT_TYPES.STEP_STARTED,
    step: stepName,
    attempt,
  });

  // 2. Check budget before executing
  try {
    await checkBudget(projectId);
  } catch (err) {
    if (err instanceof BudgetError) {
      emitEvent(projectId, {
        type: EVENT_TYPES.ERROR,
        step: stepName,
        error: err.message,
        code: 'BUDGET_EXHAUSTED',
      });
      throw err;
    }
    throw err;
  }

  let output;

  // 3. Execute agent
  try {
    output = await agent.run(input, projectId);
  } catch (err) {
    if (err instanceof BudgetError) {
      emitEvent(projectId, {
        type: EVENT_TYPES.ERROR,
        step: stepName,
        error: err.message,
        code: 'BUDGET_EXHAUSTED',
      });
      throw err;
    }

    emitEvent(projectId, {
      type: EVENT_TYPES.ERROR,
      step: stepName,
      error: err.message,
      code: 'AGENT_ERROR',
    });

    throw err;
  }

  // 4. Quality check
  let qualityResult;
  try {
    const qualityInput = {
      step: stepName,
      content: output,
      original_input: input,
    };

    qualityResult = await qualityAgent.run(qualityInput, projectId);
  } catch (err) {
    if (err instanceof BudgetError) {
      emitEvent(projectId, {
        type: EVENT_TYPES.ERROR,
        step: stepName,
        error: 'Budget exhausted during quality check',
        code: 'BUDGET_EXHAUSTED',
      });
      throw err;
    }

    logger.warn('Quality check failed, using default score', {
      projectId,
      step: stepName,
      error: err.message,
    });

    qualityResult = {
      clarity: 7,
      audience_fit: 7,
      credibility: 7,
      utility: 7,
      human_style: 7,
      brand_voice: 7,
      conversion: 7,
      originality: 7,
      objective_alignment: 7,
      ai_risk: 7,
      global_score: 7,
      feedback: 'Quality check unavailable — default score applied.',
    };
  }

  // 5. Emit quality_score event
  emitEvent(projectId, {
    type: EVENT_TYPES.QUALITY_SCORE,
    step: stepName,
    scores: qualityResult,
    attempt,
  });

  // 6. Validator decision
  let validationResult;
  try {
    const validatorInput = {
      step: stepName,
      content: output,
      quality: qualityResult,
      global_score: qualityResult.global_score,
    };

    validationResult = await validatorAgent.run(validatorInput, projectId);
  } catch (err) {
    if (err instanceof BudgetError) {
      emitEvent(projectId, {
        type: EVENT_TYPES.ERROR,
        step: stepName,
        error: 'Budget exhausted during validation',
        code: 'BUDGET_EXHAUSTED',
      });
      throw err;
    }

    logger.warn('Validator failed, deriving decision from score', {
      projectId,
      step: stepName,
      error: err.message,
    });

    const score = qualityResult.global_score;
    validationResult = {
      decision: score >= 8 ? 'ACCEPTÉ' : score >= 6 ? 'À CORRIGER' : 'BLOQUÉ',
      reason: 'Validation agent unavailable — decision derived from score.',
      next_action: score >= 8 ? 'Continuer' : 'Réviser',
      feedback: qualityResult.feedback,
    };
  }

  // 7. Emit validation_decision event
  emitEvent(projectId, {
    type: EVENT_TYPES.VALIDATION_DECISION,
    step: stepName,
    decision: validationResult.decision,
    reason: validationResult.reason,
    next_action: validationResult.next_action,
    attempt,
  });

  const decision = validationResult.decision;

  // 8. ACCEPTÉ → return output
  if (decision === 'ACCEPTÉ') {
    emitEvent(projectId, {
      type: EVENT_TYPES.STEP_COMPLETED,
      step: stepName,
      decision,
      attempt,
    });

    return {
      status: 'ACCEPTED',
      output,
      quality: qualityResult,
      validation: validationResult,
    };
  }

  // 9. À CORRIGER and retries remain → recurse
  if (decision === 'À CORRIGER' && attempt < MAX_RETRIES) {
    emitEvent(projectId, {
      type: EVENT_TYPES.RETRY,
      step: stepName,
      attempt: attempt + 1,
      max_retries: MAX_RETRIES,
      feedback: validationResult.feedback,
    });

    logger.info(`EVV retry for step "${stepName}"`, {
      projectId,
      attempt: attempt + 1,
      feedback: validationResult.feedback,
    });

    // Build enriched input with quality feedback for the retry
    const retryInput =
      typeof input === 'object' && input !== null
        ? { ...input, quality_feedback: validationResult.feedback, previous_output: output }
        : { original: input, quality_feedback: validationResult.feedback, previous_output: output };

    return runEVVStep(step, retryInput, projectId, attempt + 1);
  }

  // 10. BLOQUÉ or retries exhausted → failed validation
  emitEvent(projectId, {
    type: EVENT_TYPES.STEP_COMPLETED,
    step: stepName,
    decision,
    attempt,
    failed: true,
  });

  return {
    status: 'FAILED_VALIDATION',
    output,
    quality: qualityResult,
    validation: validationResult,
  };
}

module.exports = { runEVVStep, MAX_RETRIES };
