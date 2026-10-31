import { normalizeState } from './engine.js';

export const STORAGE_KEY = 'idlesports_state';
export const STORAGE_BACKUP_KEY = 'idlesports_state_backup';
export const STORAGE_META_KEY = 'idlesports_state_meta';
const OLD_RIGHT_PANEL_KEY = 'idlesports_right_panel_order';

const safeParse = (value, now) => {
  if (!value) return null;
  try {
    return normalizeState(JSON.parse(value), now);
  } catch {
    return null;
  }
};

const isMeaningful = (state) => {
  if (!state) return false;
  const resources = state.resources || {};
  const buildings = state.buildings || {};
  return Boolean(
    (resources.data || 0) > 0 ||
      (resources.insights || 0) > 0 ||
      (resources.wins || 0) > 0 ||
      (resources.fans || 0) > 0 ||
      (resources.titles || 0) > 0 ||
      (state.run?.score || 0) > 0 ||
      (state.rebirths || 0) > 0 ||
      (state.legacyPoints || 0) > 0 ||
      (state.stats?.lifetime?.clicks || 0) > 0 ||
      Object.values(buildings).some((count) => count > 0) ||
      (state.upgrades?.length || 0) > 0 ||
      (state.legacyUpgrades?.length || 0) > 0
  );
};

export const loadLocalState = (now = Date.now()) => {
  if (typeof window === 'undefined') return normalizeState(null, now);
  let primaryRaw = null;
  let backupRaw = null;
  try {
    primaryRaw = window.localStorage.getItem(STORAGE_KEY);
    backupRaw = window.localStorage.getItem(STORAGE_BACKUP_KEY);
  } catch {
    return normalizeState(null, now);
  }

  const primary = safeParse(primaryRaw, now);
  const backup = safeParse(backupRaw, now);

  if (primary && backup) {
    if (!isMeaningful(primary) && isMeaningful(backup)) return backup;
    return primary;
  }
  return primary || backup || normalizeState(null, now);
};

export const persistLocal = (state, now = Date.now()) => {
  if (typeof window === 'undefined') return { savedAt: now, error: null };
  try {
    const serialized = JSON.stringify(state);
    const previous = window.localStorage.getItem(STORAGE_KEY);
    if (previous) {
      window.localStorage.setItem(STORAGE_BACKUP_KEY, previous);
    }
    window.localStorage.setItem(STORAGE_KEY, serialized);
    window.localStorage.setItem(STORAGE_META_KEY, JSON.stringify({ savedAt: now }));
    return { savedAt: now, error: null };
  } catch (error) {
    return { savedAt: null, error: error instanceof Error ? error.message : String(error) };
  }
};

export const loadLocalMeta = () => {
  if (typeof window === 'undefined') return { savedAt: 0 };
  try {
    const raw = window.localStorage.getItem(STORAGE_META_KEY);
    if (!raw) return { savedAt: 0 };
    const parsed = JSON.parse(raw);
    return { savedAt: Number.isFinite(parsed?.savedAt) ? parsed.savedAt : 0 };
  } catch {
    return { savedAt: 0 };
  }
};

export const clearLocalState = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(STORAGE_BACKUP_KEY);
    window.localStorage.removeItem(STORAGE_META_KEY);
    window.localStorage.removeItem(OLD_RIGHT_PANEL_KEY);
  } catch {
    // Storage can be unavailable in private browsing; the in-memory reset still works.
  }
};

export const downloadSave = (state) => {
  if (typeof window === 'undefined') return;
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  link.href = url;
  link.download = `idlesports-save-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
