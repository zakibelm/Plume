'use strict';

const { v4: uuidv4 } = require('uuid');
const { createCompletion } = require('../services/openrouter');
const { checkBudget, incrementBudget } = require('../services/budget');
const { supabase } = require('../services/supabase');
const { BudgetError } = require('../services/budget');
const logger = require('../utils/logger');

const RETRY_DELAY_MS = parseInt(process.env.LLM_RETRY_DELAY_MS || '1000', 10);

/**
 * Estimate the USD cost of a completion based on token usage.
 * Uses conservative average pricing since exact model prices vary.
 * @param {object} usage - { prompt_tokens, completion_tokens }
 * @param {string} model
 * @returns {number}
 */
function estimateCost(usage, model) {
  if (!usage) return 0;

  // Rough per-token pricing (USD per 1k tokens) by model family
  const pricing = {
    'anthropic/claude-3.5-sonnet': { input: 0.003, output: 0.015 },
    'google/gemini-flash-1.5': { input: 0.000075, output: 0.0003 },
    'meta-llama/llama-3.1-70b': { input: 0.0005, output: 0.0008 },
    'meta-llama/llama-3.1-8b': { input: 0.00006, output: 0.00006 },
    'mistralai/mistral-large': { input: 0.003, output: 0.009 },
    'qwen/qwen-2.5-72b': { input: 0.0004, output: 0.0004 },
  };

  const price = pricing[model] || { input: 0.001, output: 0.002 };

  return (
    ((usage.prompt_tokens || 0) / 1000) * price.input +
    ((usage.completion_tokens || 0) / 1000) * price.output
  );
}

/**
 * Sleep for a given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Try to parse a string as JSON; return the raw string if parsing fails.
 * @param {string} text
 * @returns {object|string}
 */
function parseOutput(text) {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');

  try {
    return JSON.parse(cleaned);
  } catch {
    // not JSON — return as-is
    return text;
  }
}

class BaseAgent {
  /**
   * @param {object} config
   * @param {string} config.name - Human-readable agent name
   * @param {string} config.model - Primary model identifier
   * @param {string} config.fallbackModel - Fallback model identifier
   * @param {string} config.systemPrompt - System prompt text
   */
  constructor({ name, model, fallbackModel, systemPrompt }) {
    this.name = name;
    this.model = model;
    this.fallbackModel = fallbackModel;
    this.systemPrompt = systemPrompt;
  }

  /**
   * Create an agent_run record in the database.
   * @param {string} projectId
   * @param {string} model
   * @returns {Promise<string>} runId
   */
  async createRunRecord(projectId, model) {
    const runId = uuidv4();

    const { error } = await supabase.from('agent_runs').insert({
      id: runId,
      project_id: projectId,
      agent_name: this.name,
      model_used: model,
      status: 'running',
      created_at: new Date().toISOString(),
    });

    if (error) {
      logger.warn('Failed to create agent_run record', {
        projectId,
        agentName: this.name,
        error: error.message,
      });
    }

    return runId;
  }

  /**
   * Update an existing agent_run record with the result.
   * @param {string} runId
   * @param {object} params
   */
  async updateRunRecord(runId, { status, tokensUsed, cost, errorMessage }) {
    const update = {
      status,
      updated_at: new Date().toISOString(),
      ...(tokensUsed !== undefined && { tokens_used: tokensUsed }),
      ...(cost !== undefined && { cost_usd: cost }),
      ...(errorMessage !== undefined && { error_message: errorMessage }),
    };

    const { error } = await supabase
      .from('agent_runs')
      .update(update)
      .eq('id', runId);

    if (error) {
      logger.warn('Failed to update agent_run record', { runId, error: error.message });
    }
  }

  /**
   * Execute a single LLM call with the given model and messages.
   * @param {string} model
   * @param {Array<{role:string,content:string}>} messages
   * @param {object} [options]
   * @returns {Promise<import('openai').OpenAI.ChatCompletion>}
   */
  async callModel(model, messages, options = {}) {
    return createCompletion(model, messages, options);
  }

  /**
   * Run the agent with the given input.
   *
   * Execution flow:
   *   1. checkBudget
   *   2. Create agent_run record (status: running)
   *   3. Call primary model
   *   4. On TimeoutError: retry primary once after delay
   *   5. On non-timeout model error: try fallback model
   *   6. On BudgetError: clean rethrow (no further attempts)
   *   7. Update agent_run record (tokens, cost, status)
   *   8. incrementBudget
   *   9. Parse and return output
   *
   * @param {string|object} input - Content to send as user message
   * @param {string} projectId
   * @param {object} [options]
   * @returns {Promise<string|object>}
   */
  async run(input, projectId, options = {}) {
    await checkBudget(projectId);

    const userContent = typeof input === 'string' ? input : JSON.stringify(input, null, 2);
    const messages = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: userContent },
    ];

    let runId = null;
    let usedModel = this.model;
    let response = null;
    let runError = null;

    runId = await this.createRunRecord(projectId, usedModel);

    try {
      // Attempt 1: primary model
      try {
        response = await this.callModel(usedModel, messages, options);
      } catch (err) {
        if (err.name === 'TimeoutError') {
          logger.warn(`${this.name}: primary model timed out, retrying…`, {
            projectId,
            model: usedModel,
          });

          await sleep(RETRY_DELAY_MS);

          try {
            response = await this.callModel(usedModel, messages, options);
          } catch (retryErr) {
            if (retryErr.name === 'TimeoutError') {
              logger.warn(`${this.name}: retry timed out, falling back to ${this.fallbackModel}`, {
                projectId,
              });
              usedModel = this.fallbackModel;
              response = await this.callModel(usedModel, messages, options);
            } else {
              throw retryErr;
            }
          }
        } else {
          // Non-timeout error → try fallback immediately
          logger.warn(`${this.name}: primary model error, falling back to ${this.fallbackModel}`, {
            projectId,
            error: err.message,
          });
          usedModel = this.fallbackModel;
          response = await this.callModel(usedModel, messages, options);
        }
      }

      const text = response.choices?.[0]?.message?.content || '';
      const usage = response.usage;
      const cost = estimateCost(usage, usedModel);
      const tokensUsed = (usage?.prompt_tokens || 0) + (usage?.completion_tokens || 0);

      await this.updateRunRecord(runId, { status: 'completed', tokensUsed, cost });
      await incrementBudget(projectId, cost, 1);

      logger.info(`${this.name} completed`, {
        projectId,
        model: usedModel,
        tokensUsed,
        costUsd: cost.toFixed(6),
      });

      return parseOutput(text);
    } catch (err) {
      runError = err;

      if (runId) {
        await this.updateRunRecord(runId, {
          status: err instanceof BudgetError ? 'budget_stopped' : 'failed',
          errorMessage: err.message,
        });
      }

      if (err instanceof BudgetError) {
        throw err;
      }

      logger.error(`${this.name} failed`, { projectId, error: err.message });
      throw err;
    }
  }
}

module.exports = BaseAgent;
