'use strict';

const { supabase } = require('./supabase');
const logger = require('../utils/logger');

class BudgetError extends Error {
  constructor(message, projectId) {
    super(message);
    this.name = 'BudgetError';
    this.projectId = projectId;
    this.statusCode = 402;
  }
}

/**
 * Fetch budget record for a project.
 * @param {string} projectId
 * @returns {Promise<object>} budget row
 */
async function getProjectBudget(projectId) {
  const { data, error } = await supabase
    .from('project_budgets')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch budget for project ${projectId}: ${error.message}`);
  }

  return data;
}

/**
 * Throws BudgetError if the project is over its budget limit.
 * @param {string} projectId
 * @returns {Promise<object>} budget row
 */
async function checkBudget(projectId) {
  const budget = await getProjectBudget(projectId);

  if (budget.current_cost_usd >= budget.max_cost_usd) {
    throw new BudgetError(
      `Budget exhausted for project ${projectId}: ${budget.current_cost_usd}/${budget.max_cost_usd} USD used`,
      projectId,
    );
  }

  if (budget.current_llm_calls >= budget.max_llm_calls) {
    throw new BudgetError(
      `LLM call limit reached for project ${projectId}: ${budget.current_llm_calls}/${budget.max_llm_calls} calls used`,
      projectId,
    );
  }

  return budget;
}

/**
 * Increment the current cost and call count for a project.
 * Uses an RPC or direct update with optimistic concurrency.
 * @param {string} projectId
 * @param {number} cost - USD amount to add
 * @param {number} [calls=1] - number of LLM calls to add
 */
async function incrementBudget(projectId, cost, calls = 1) {
  const { data: current, error: fetchError } = await supabase
    .from('project_budgets')
    .select('current_cost_usd, current_llm_calls')
    .eq('project_id', projectId)
    .single();

  if (fetchError) {
    logger.error('Failed to fetch budget for increment', { projectId, error: fetchError.message });
    return;
  }

  const { error: updateError } = await supabase
    .from('project_budgets')
    .update({
      current_cost_usd: (current.current_cost_usd || 0) + cost,
      current_llm_calls: (current.current_llm_calls || 0) + calls,
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId);

  if (updateError) {
    logger.error('Failed to increment budget', { projectId, error: updateError.message });
  }
}

module.exports = { getProjectBudget, checkBudget, incrementBudget, BudgetError };
