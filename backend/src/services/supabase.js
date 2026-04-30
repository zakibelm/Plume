'use strict';

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  logger.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — Supabase client will not work');
}

const supabase = createClient(supabaseUrl || '', supabaseServiceRoleKey || '', {
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
