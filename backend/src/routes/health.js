'use strict';

const express = require('express');
const { checkSupabaseConnection } = require('../services/supabase');
const { checkOpenRouterConnection } = require('../services/openrouter');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/health', async (req, res) => {
  const start = Date.now();

  const [supabaseOk, openrouterOk] = await Promise.allSettled([
    checkSupabaseConnection(),
    checkOpenRouterConnection(),
  ]);

  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    supabase: supabaseOk.status === 'fulfilled',
    openrouter: openrouterOk.status === 'fulfilled',
    latency_ms: Date.now() - start,
  };

  if (supabaseOk.status === 'rejected') {
    logger.warn('Supabase health check failed', { error: supabaseOk.reason?.message });
    checks.supabase_error = supabaseOk.reason?.message;
  }

  if (openrouterOk.status === 'rejected') {
    logger.warn('OpenRouter health check failed', { error: openrouterOk.reason?.message });
    checks.openrouter_error = openrouterOk.reason?.message;
  }

  const allOk = checks.supabase && checks.openrouter;
  if (!allOk) checks.status = 'degraded';

  res.status(allOk ? 200 : 503).json(checks);
});

module.exports = router;
