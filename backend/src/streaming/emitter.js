'use strict';

const { EventEmitter } = require('events');
const logger = require('../utils/logger');

// Event type constants
const EVENT_TYPES = {
  STEP_STARTED: 'step_started',
  TOKEN: 'token',
  STEP_COMPLETED: 'step_completed',
  QUALITY_SCORE: 'quality_score',
  VALIDATION_DECISION: 'validation_decision',
  RETRY: 'retry',
  BUDGET_WARNING: 'budget_warning',
  ERROR: 'error',
  WORKFLOW_COMPLETE: 'workflow_complete',
};

// projectId → EventEmitter
const emitters = new Map();

/**
 * Get or create an EventEmitter for a given project workflow.
 * @param {string} projectId
 * @returns {EventEmitter}
 */
function getWorkflowEmitter(projectId) {
  if (!emitters.has(projectId)) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(20);
    emitters.set(projectId, emitter);
    logger.debug('Created workflow emitter', { projectId });
  }

  return emitters.get(projectId);
}

/**
 * Remove and destroy the emitter for a project (call after workflow completes).
 * @param {string} projectId
 */
function removeWorkflowEmitter(projectId) {
  const emitter = emitters.get(projectId);
  if (emitter) {
    emitter.removeAllListeners();
    emitters.delete(projectId);
    logger.debug('Removed workflow emitter', { projectId });
  }
}

/**
 * Emit a typed SSE event on the project's emitter.
 * @param {string} projectId
 * @param {{ type: string, [key: string]: any }} event
 */
function emitEvent(projectId, event) {
  const emitter = emitters.get(projectId);
  if (!emitter) {
    logger.warn('Attempted to emit event on non-existent emitter', { projectId, event });
    return;
  }

  const payload = { ...event, timestamp: new Date().toISOString() };
  emitter.emit('event', payload);
  logger.debug('Emitted event', { projectId, type: event.type });
}

module.exports = {
  EVENT_TYPES,
  getWorkflowEmitter,
  removeWorkflowEmitter,
  emitEvent,
};
