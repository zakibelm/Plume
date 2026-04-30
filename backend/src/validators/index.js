'use strict';

const { z } = require('zod');

/**
 * Project creation schema.
 */
const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  content_type: z.string().min(1).max(100),
  mode: z.enum(['fast', 'standard', 'premium']).default('standard'),
  description: z.string().max(1000).optional(),
  brand_voice_id: z.string().uuid().optional(),
});

/**
 * Content brief creation schema.
 */
const createBriefSchema = z.object({
  mission: z.string().min(1).max(2000),
  objective: z.string().min(1).max(1000),
  audience: z.string().min(1).max(1000),
  reader_problem: z.string().min(1).max(1000),
  promise: z.string().min(1).max(1000),
  angle: z.string().min(1).max(1000),
  cta: z.string().min(1).max(500),
  forbidden: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  tone: z.string().max(200).optional(),
  word_count_target: z.number().int().positive().optional(),
  additional_context: z.string().max(5000).optional(),
});

/**
 * Brand voice creation schema.
 */
const createBrandVoiceSchema = z.object({
  name: z.string().min(1).max(200),
  tone: z.string().min(1).max(500),
  rhythm: z.string().max(500).optional(),
  preferred_expressions: z.array(z.string()).default([]),
  forbidden_expressions: z.array(z.string()).default([]),
  vocabulary: z.array(z.string()).default([]),
  formality_level: z
    .enum(['very_casual', 'casual', 'neutral', 'formal', 'very_formal'])
    .default('neutral'),
  example_texts: z.array(z.string()).default([]),
  brand_name: z.string().max(200).optional(),
  industry: z.string().max(200).optional(),
});

/**
 * Agent run schema (for individual agent endpoints).
 */
const runAgentSchema = z.object({
  projectId: z.string().uuid(),
  input: z.union([z.string().min(1), z.record(z.unknown())]),
  options: z
    .object({
      max_tokens: z.number().int().positive().max(32000).optional(),
      temperature: z.number().min(0).max(2).optional(),
    })
    .optional(),
});

/**
 * Workflow run schema.
 */
const runWorkflowSchema = z.object({
  projectId: z.string().uuid(),
  workflow: z.enum(['full', 'draft', 'review', 'custom']).default('full'),
  mode: z.enum(['fast', 'standard', 'premium']).default('standard'),
  steps: z.array(z.string()).optional(),
  brief: z.record(z.unknown()).optional(),
});

/**
 * Budget update schema.
 */
const updateBudgetSchema = z.object({
  max_cost_usd: z.number().positive().optional(),
  max_llm_calls: z.number().int().positive().optional(),
});

/**
 * Export schema.
 */
const exportSchema = z.object({
  content: z.union([z.string(), z.record(z.unknown())]),
  plan: z.record(z.unknown()).optional(),
});

/**
 * Middleware factory: validates req.body against a Zod schema.
 * Returns 400 with formatted errors on failure.
 *
 * @param {z.ZodTypeAny} schema
 * @returns {import('express').RequestHandler}
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: result.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    req.body = result.data;
    return next();
  };
}

module.exports = {
  createProjectSchema,
  createBriefSchema,
  createBrandVoiceSchema,
  runAgentSchema,
  runWorkflowSchema,
  updateBudgetSchema,
  exportSchema,
  validate,
};
