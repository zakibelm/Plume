'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../services/supabase');
const { exportMarkdown, exportHtml } = require('../agents/export');
const router = express.Router();

router.use(authenticate);

async function getLatestVersion(projectId) {
  const { data } = await supabase
    .from('content_versions')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data;
}

router.get('/projects/:projectId/export/markdown', async (req, res) => {
  const { projectId } = req.params;

  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .eq('user_id', req.user.id)
    .single();

  if (!project) return res.status(404).json({ error: 'Project not found' });

  const version = await getLatestVersion(projectId);
  if (!version) return res.status(404).json({ error: 'No content to export' });

  const markdown = exportMarkdown(version.content, { title: project.name });

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${project.name.replace(/[^a-z0-9]/gi, '_')}.md"`);
  res.send(markdown);
});

router.get('/projects/:projectId/export/html', async (req, res) => {
  const { projectId } = req.params;

  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .eq('user_id', req.user.id)
    .single();

  if (!project) return res.status(404).json({ error: 'Project not found' });

  const version = await getLatestVersion(projectId);
  if (!version) return res.status(404).json({ error: 'No content to export' });

  const html = exportHtml(version.content, { title: project.name });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${project.name.replace(/[^a-z0-9]/gi, '_')}.html"`);
  res.send(html);
});

module.exports = router;
