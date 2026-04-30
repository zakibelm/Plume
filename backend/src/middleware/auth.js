'use strict';

const { supabase } = require('../services/supabase');
const logger = require('../utils/logger');

/**
 * Express middleware that validates a Supabase JWT from the Authorization header.
 * Attaches the decoded user to req.user on success.
 * Also supports token via query parameter (for SSE endpoints).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.query.token;

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header. Expected: Bearer <token>',
    });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      logger.warn('JWT validation failed', { error: error?.message });
      return res.status(401).json({
        error: 'Unauthorized',
        message: error?.message || 'Invalid or expired token',
      });
    }

    req.user = data.user;
    return next();
  } catch (err) {
    logger.error('Auth middleware error', { error: err.message });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication service unavailable',
    });
  }
}

module.exports = { authenticate };
