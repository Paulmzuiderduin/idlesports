import { isCloudEnabled, supabase } from './supabase.js';

const SAVE_TABLE = 'idle_saves';
const LEADERBOARD_TABLE = 'leaderboard_entries';

const requireClient = () => {
  if (!isCloudEnabled || !supabase) {
    throw new Error('Cloud features are disabled in this build.');
  }
  return supabase;
};

export const cloudFeaturesEnabled = isCloudEnabled;

export const loadCloudSave = async (userId) => {
  const client = requireClient();
  const { data, error } = await client
    .from(SAVE_TABLE)
    .select('state, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? { state: data.state, updatedAt: data.updated_at } : null;
};

export const saveCloudSave = async (userId, state) => {
  const client = requireClient();
  const { error } = await client.from(SAVE_TABLE).upsert({
    user_id: userId,
    state,
    updated_at: new Date().toISOString()
  });
  if (error) throw error;
};

export const fetchLeaderboard = async (limit = 10) => {
  const client = requireClient();
  const { data, error } = await client
    .from(LEADERBOARD_TABLE)
    .select('display_name, best_titles, best_wins, rebirths')
    .order('best_titles', { ascending: false })
    .order('best_wins', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
};

export const saveLeaderboardEntry = async (userId, displayName, state) => {
  const client = requireClient();
  const { error } = await client.from(LEADERBOARD_TABLE).upsert({
    user_id: userId,
    display_name: String(displayName || 'Coach').slice(0, 24),
    best_titles: Math.floor(state.stats?.best?.titles || 0),
    best_wins: Math.floor(state.stats?.best?.wins || 0),
    rebirths: Math.floor(state.stats?.lifetime?.rebirths || 0),
    updated_at: new Date().toISOString()
  });
  if (error) throw error;
};
