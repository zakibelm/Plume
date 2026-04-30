'use strict';

const { supabase } = require('./supabase');
const logger = require('../utils/logger');

/**
 * Retrieve a context snapshot for a given project and workflow step.
 * @param {string} projectId
 * @param {string} step
 * @returns {Promise<object|null>}
 */
async function getContextSnapshot(projectId, step) {
  const { data, error } = await supabase
    .from('context_snapshots')
    .select('*')
    .eq('project_id', projectId)
    .eq('step', step)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    logger.warn('Failed to retrieve context snapshot', { projectId, step, error: error.message });
  }

  return data || null;
}

/**
 * Persist a context snapshot after a workflow step.
 * @param {string} projectId
 * @param {string} step
 * @param {string} summary
 * @param {string[]} keyDecisions
 * @param {string[]} activeConstraints
 * @returns {Promise<object>}
 */
async function saveContextSnapshot(projectId, step, summary, keyDecisions, activeConstraints) {
  const { data, error } = await supabase
    .from('context_snapshots')
    .insert({
      project_id: projectId,
      step,
      summary,
      key_decisions: keyDecisions,
      active_constraints: activeConstraints,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save context snapshot: ${error.message}`);
  }

  return data;
}

/**
 * Build a compact agent context string (target < 2000 tokens) from saved snapshots.
 * @param {string} projectId
 * @param {string} currentSection - label for the section currently being processed
 * @returns {Promise<string>}
 */
async function buildAgentContext(projectId, currentSection) {
  const { data: snapshots, error } = await supabase
    .from('context_snapshots')
    .select('step, summary, key_decisions, active_constraints, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
    .limit(10);

  if (error) {
    logger.warn('Failed to retrieve snapshots for context building', {
      projectId,
      error: error.message,
    });
    return `Contexte courant : section "${currentSection}"`;
  }

  if (!snapshots || snapshots.length === 0) {
    return `Contexte courant : section "${currentSection}"`;
  }

  const lines = [`=== Contexte projet (section courante: "${currentSection}") ===`, ''];

  for (const snap of snapshots) {
    lines.push(`[${snap.step}] ${snap.summary}`);

    if (snap.key_decisions && snap.key_decisions.length > 0) {
      lines.push(`  Décisions: ${snap.key_decisions.slice(0, 3).join('; ')}`);
    }

    if (snap.active_constraints && snap.active_constraints.length > 0) {
      lines.push(`  Contraintes: ${snap.active_constraints.slice(0, 3).join('; ')}`);
    }

    lines.push('');
  }

  const context = lines.join('\n');

  // Hard trim to keep under ~2000 tokens (rough estimate: 1 token ≈ 4 chars)
  const MAX_CHARS = 8000;
  if (context.length > MAX_CHARS) {
    return context.slice(context.length - MAX_CHARS);
  }

  return context;
}

module.exports = { getContextSnapshot, saveContextSnapshot, buildAgentContext };
