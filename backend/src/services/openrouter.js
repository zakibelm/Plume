'use strict';

const OpenAI = require('openai');
const logger = require('../utils/logger');

const MODELS = {
  writer: {
    primary: 'anthropic/claude-3.5-sonnet',
    fallback: 'mistralai/mistral-large',
  },
  quality: {
    primary: 'google/gemini-flash-1.5',
    fallback: 'meta-llama/llama-3.1-70b',
  },
  validator: {
    primary: 'google/gemini-flash-1.5',
    fallback: 'meta-llama/llama-3.1-8b',
  },
  humanizer: {
    primary: 'mistralai/mistral-large',
    fallback: 'qwen/qwen-2.5-72b',
  },
  critic: {
    primary: 'anthropic/claude-3.5-sonnet',
    fallback: 'mistralai/mistral-large',
  },
};

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://plume.ai',
    'X-Title': 'Plume Editorial Engine',
  },
});

const DEFAULT_TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT_MS || '60000', 10);

/**
 * Call the OpenRouter chat completions API.
 *
 * @param {string} model - Model identifier (e.g. 'anthropic/claude-3.5-sonnet')
 * @param {Array<{role:string, content:string}>} messages
 * @param {object} [options]
 * @param {number} [options.timeout] - Timeout in milliseconds
 * @param {number} [options.max_tokens]
 * @param {number} [options.temperature]
 * @returns {Promise<import('openai').OpenAI.ChatCompletion>}
 */
async function createCompletion(model, messages, options = {}) {
  const { timeout = DEFAULT_TIMEOUT_MS, max_tokens, temperature } = options;

  const completionParams = {
    model,
    messages,
    ...(max_tokens !== undefined && { max_tokens }),
    ...(temperature !== undefined && { temperature }),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await client.chat.completions.create(completionParams, {
      signal: controller.signal,
    });
    return response;
  } catch (err) {
    if (err.name === 'AbortError' || err.code === 'ETIMEDOUT') {
      const timeoutErr = new Error(`OpenRouter request timed out after ${timeout}ms`);
      timeoutErr.name = 'TimeoutError';
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Lightweight check that OpenRouter is reachable.
 * Uses the smallest/fastest model to verify connectivity.
 * @returns {Promise<void>}
 */
async function checkOpenRouterConnection() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  await createCompletion(
    MODELS.validator.fallback,
    [{ role: 'user', content: 'ping' }],
    { max_tokens: 5, timeout: 10000 },
  );
}

module.exports = { createCompletion, checkOpenRouterConnection, MODELS };
