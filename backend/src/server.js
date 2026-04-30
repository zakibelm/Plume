'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./utils/logger');

const healthRouter    = require('./routes/health');
const projectsRouter  = require('./routes/projects');
const briefsRouter    = require('./routes/briefs');
const brandVoicesRouter = require('./routes/brand-voices');
const agentsRouter    = require('./routes/agents');
const workflowsRouter = require('./routes/workflows');
const budgetsRouter   = require('./routes/budgets');
const exportRouter    = require('./routes/export');

const app = express();

// Security
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

// CORS — allow frontend origin + SSE
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Logging
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// Body parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));

// Routes
app.use(healthRouter);
app.use('/api', projectsRouter);
app.use('/api', briefsRouter);
app.use('/api', brandVoicesRouter);
app.use('/api', agentsRouter);
app.use('/api', workflowsRouter);
app.use('/api', budgetsRouter);
app.use('/api', exportRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Global error handler
app.use((err, req, res, _next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error',
  });
});

const PORT = parseInt(process.env.PORT || '3000', 10);

app.listen(PORT, () => {
  logger.info(`Plume backend running on port ${PORT}`, {
    env: process.env.NODE_ENV,
    port: PORT,
  });
});

module.exports = app;
