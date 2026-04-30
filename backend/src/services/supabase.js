'use strict';

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const activeKey = supabaseServiceRoleKey && !supabaseServiceRoleKey.startsWith('REMPLACER')
  ? supabaseServiceRoleKey
  : supabaseAnonKey;

if (!supabaseUrl || !activeKey) {
  logger.warn('SUPABASE_URL ou clé Supabase non configurées — le client Supabase ne fonctionnera pas');
}

if (!supabaseServiceRoleKey || supabaseServiceRoleKey.startsWith('REMPLACER')) {
  logger.warn('SUPABASE_SERVICE_ROLE_KEY non configurée — utilisation de la clé anon (RLS actif, fonctionnalités backend limitées)');
}

const supabase = createClient(supabaseUrl || '', activeKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Check that Supabase is reachable by performing a lightweight query.
 * @returns {Promise<void>}
 * @throws {Error} if the connection or query fails
 */
async function checkSupabaseConnection() {
  const { error } = await supabase
    .from('projects')
    .select('id')
    .limit(1);

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = "relation does not exist" — acceptable during early setup
    throw new Error(`Supabase connection check failed: ${error.message}`);
  }
}

module.exports = { supabase, checkSupabaseConnection };
