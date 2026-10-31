import { createClient } from '@supabase/supabase-js';

import { CLOUD_FEATURES_ENABLED } from './features.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const isCloudEnabled = CLOUD_FEATURES_ENABLED && isSupabaseConfigured;

// The cloud client is only created when the feature flag is on. This keeps the
// local build free of auth refreshes and network traffic while preserving the
// full Supabase integration for later.
export const supabase = isCloudEnabled
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;
