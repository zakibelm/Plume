'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../services/supabase');
const { authenticate } = require('../middleware/auth');
const { validate, createBrandVoiceSchema } = require('../validators');

const router = express.Router();

router.use(authenticate);

router.post('/brand-voices', validate(createBrandVoiceSchema), async (req, res) => {
  const { data, error } = await supabase
    .from('brand_voices')
    .insert({
      id: uuidv4(),
      user_id: req.user.id,
      ...req.body,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.get('/brand-voices', async (req, res) => {
  const { data, error } = await supabase
    .from('brand_voices')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/brand-voices/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('brand_voices')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Brand voice not found' });
  res.json(data);
});

router.put('/brand-voices/:id', validate(createBrandVoiceSchema), async (req, res) => {
  const { data, error } = await supabase
    .from('brand_voices')
    .update(req.body)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error || !data) return res.status(404).json({ error: 'Brand voice not found or update failed' });
  res.json(data);
});

router.delete('/brand-voices/:id', async (req, res) => {
  const { error } = await supabase
    .from('brand_voices')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

module.exports = router;
