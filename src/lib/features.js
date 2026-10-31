// Cloud features are intentionally disabled while the game runs fully local.
// Set VITE_CLOUD_ENABLED=true (and configure the Supabase vars) to turn auth,
// cloud saves and the leaderboard back on. The Supabase code stays in place.
export const CLOUD_FEATURES_ENABLED = import.meta.env.VITE_CLOUD_ENABLED === 'true';
