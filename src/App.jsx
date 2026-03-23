import { useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const STORAGE_KEY = 'idlesports_state';
const STORAGE_BACKUP_KEY = 'idlesports_state_backup';
const STORAGE_META_KEY = 'idlesports_state_meta';
const RIGHT_PANEL_KEY = 'idlesports_right_panel_order';
const TICK_MS = 250;
const OFFLINE_BASE_RATE = 0.1;
const OFFLINE_BASE_CAP_SECONDS = 6 * 60 * 60;

const BASE = {
  dataPerClick: 1,
  scoutDataPerSec: 0.6,
  analystInsightPerSec: 0.25,
  strategyWinPerSec: 0.08,
  marketingFanPerSec: 0.4,
  dataCostPerInsight: 3,
  insightCostPerWin: 2,
  winCostPerFan: 1,
  fanDataPerSec: 0.02
};

const BUILDINGS = [
  {
    id: 'scout',
    name: 'Scout Bots',
    description: 'Collect raw match data from feeds.',
    baseCost: 10,
    costCurrency: 'data',
    outputCurrency: 'data',
    costMult: 1.15
  },
  {
    id: 'analyst',
    name: 'Analyst Pods',
    description: 'Convert data into usable insights.',
    baseCost: 60,
    costCurrency: 'data',
    outputCurrency: 'insights',
    costMult: 1.16
  },
  {
    id: 'strategy',
    name: 'Strategy Lab',
    description: 'Turn insights into wins.',
    baseCost: 240,
    costCurrency: 'insights',
    outputCurrency: 'wins',
    costMult: 1.17
  },
  {
    id: 'marketing',
    name: 'Fan Outreach',
    description: 'Convert wins into long term fan growth.',
    baseCost: 600,
    costCurrency: 'wins',
    outputCurrency: 'fans',
    costMult: 1.18
  }
];

const UPGRADES = [
  {
    id: 'fast-queries',
    name: 'Fast Queries',
    description: 'Data per click +1.',
    cost: { data: 150 },
    effect: { type: 'clickBonus', value: 1 }
  },
  {
    id: 'vector-warehouse',
    name: 'Vector Warehouse',
    description: 'Data per second +20%.',
    cost: { data: 400 },
    effect: { type: 'dataPerSecMult', value: 1.2 }
  },
  {
    id: 'vision-models',
    name: 'Vision Models',
    description: 'Insight conversion +25%.',
    cost: { insights: 40 },
    effect: { type: 'insightPerSecMult', value: 1.25 }
  },
  {
    id: 'late-game',
    name: 'Late Game Script',
    description: 'Win conversion +30%.',
    cost: { wins: 15 },
    effect: { type: 'winPerSecMult', value: 1.3 }
  },
  {
    id: 'season-tickets',
    name: 'Season Tickets',
    description: 'Fan conversion +35%.',
    cost: { fans: 120 },
    effect: { type: 'fanPerSecMult', value: 1.35 }
  },
  {
    id: 'title-sponsor',
    name: 'Title Sponsor',
    description: 'Global production +10%.',
    cost: { titles: 1 },
    effect: { type: 'globalMult', value: 1.1 }
  }
];

const REBIRTH_STEPS = [
  {
    id: 'paper',
    title: 'Pencil & Paper',
    description: 'Manual match tallying, no structure yet.',
    threshold: 0
  },
  {
    id: 'sheet',
    title: 'Printed Stat Sheet',
    description: 'Structured boxes and quick totals after matches.',
    threshold: 50
  },
  {
    id: 'excel',
    title: 'Excel Tracker',
    description: 'Spreadsheets, formulas, and rolling averages.',
    threshold: 200
  },
  {
    id: 'compare',
    title: 'Cross-Match Comparisons',
    description: 'Comparing players, lineups, and match trends.',
    threshold: 600
  },
  {
    id: 'app',
    title: 'Match Scoring App',
    description: 'Live match scoring on a dedicated app.',
    threshold: 1500
  },
  {
    id: 'expand',
    title: 'Expanded App Suite',
    description: 'Reports, exports, and deeper analytics.',
    threshold: 3000
  },
  {
    id: 'auto',
    title: 'Automatic Tracking',
    description: 'Sensors and video models track matches automatically.',
    threshold: 6000
  }
];

const REBIRTH_POST_SCALE = 1.35;
const RIGHT_PANEL_IDS = ['season', 'legacy', 'rebirths', 'leaderboard', 'nextsteps'];

const getRebirthRequirement = (rebirths) => {
  const lastIndex = REBIRTH_STEPS.length - 1;
  if (rebirths < lastIndex) {
    const nextStep = REBIRTH_STEPS[rebirths + 1];
    return { threshold: nextStep.threshold, title: nextStep.title, isPost: false };
  }
  const extra = rebirths - lastIndex + 1;
  const base = REBIRTH_STEPS[lastIndex].threshold;
  return {
    threshold: Math.round(base * Math.pow(REBIRTH_POST_SCALE, extra)),
    title: `Automation Era +${extra}`,
    isPost: true
  };
};

const getRebirthPreviousThreshold = (rebirths) => {
  const lastIndex = REBIRTH_STEPS.length - 1;
  if (rebirths <= lastIndex) {
    return REBIRTH_STEPS[rebirths].threshold;
  }
  const extra = rebirths - lastIndex;
  const base = REBIRTH_STEPS[lastIndex].threshold;
  return Math.round(base * Math.pow(REBIRTH_POST_SCALE, extra));
};

const LEGACY_UPGRADES = [
  {
    id: 'legacy-queries',
    name: 'Legacy Query Engine',
    description: 'Data per click +2 permanently.',
    cost: 1,
    requiresRebirths: 0,
    effect: { type: 'clickBonus', value: 2 }
  },
  {
    id: 'legacy-warehouse',
    name: 'Legacy Warehouse',
    description: 'Data per second +25% permanently.',
    cost: 2,
    requiresRebirths: 1,
    effect: { type: 'dataPerSecMult', value: 1.25 }
  },
  {
    id: 'legacy-analysts',
    name: 'Legacy Analysts',
    description: 'Insight conversion +35% permanently.',
    cost: 2,
    requiresRebirths: 2,
    effect: { type: 'insightPerSecMult', value: 1.35 }
  },
  {
    id: 'legacy-strategy',
    name: 'Legacy Strategy',
    description: 'Win conversion +40% permanently.',
    cost: 3,
    requiresRebirths: 3,
    effect: { type: 'winPerSecMult', value: 1.4 }
  },
  {
    id: 'legacy-network',
    name: 'Legacy Fan Network',
    description: 'Fan conversion +45% permanently.',
    cost: 3,
    requiresRebirths: 4,
    effect: { type: 'fanPerSecMult', value: 1.45 }
  },
  {
    id: 'legacy-accelerator',
    name: 'Legacy Accelerator',
    description: 'Global production +15% permanently.',
    cost: 5,
    requiresRebirths: 5,
    effect: { type: 'globalMult', value: 1.15 }
  },
  {
    id: 'legacy-offline-rate',
    name: 'Offline Prep',
    description: 'Offline gains +10% (stacking).',
    cost: 2,
    requiresRebirths: 1,
    effect: { type: 'offlineRate', value: 0.1 }
  },
  {
    id: 'legacy-offline-cap',
    name: 'Extended Logging',
    description: 'Offline cap +4 hours.',
    cost: 2,
    requiresRebirths: 2,
    effect: { type: 'offlineCap', value: 4 * 60 * 60 }
  }
];

const DEFAULT_STATE = {
  resources: {
    data: 0,
    insights: 0,
    wins: 0,
    fans: 0,
    titles: 0
  },
  buildings: {
    scout: 0,
    analyst: 0,
    strategy: 0,
    marketing: 0
  },
  upgrades: [],
  legacyUpgrades: [],
  totalClicks: 0,
  profileName: '',
  rebirths: 0,
  legacyPoints: 0,
  saveId: 0,
  lastUpdated: Date.now()
};

const clampNumber = (value) => (Number.isFinite(value) ? value : 0);

const Icon = ({ name }) => {
  switch (name) {
    case 'data':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6c0-1.66 3.58-3 8-3s8 1.34 8 3-3.58 3-8 3-8-1.34-8-3Z" />
          <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
          <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
        </svg>
      );
    case 'insights':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3a7 7 0 0 1 4 12c-1 .8-1.5 1.7-1.6 3H9.6c-.1-1.3-.6-2.2-1.6-3A7 7 0 0 1 12 3Z" />
          <path d="M9 21h6" />
        </svg>
      );
    case 'wins':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 4h14l-2 7a5 5 0 0 1-5 4H12a5 5 0 0 1-5-4L5 4Z" />
          <path d="M9 21h6" />
          <path d="M8 15h8" />
        </svg>
      );
    case 'fans':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 13a4 4 0 1 1 4-4 4 4 0 0 1-4 4Z" />
          <path d="M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Z" />
          <path d="M2 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          <path d="M14 20c0-2.2 1.8-4 4-4s4 1.8 4 4" />
        </svg>
      );
    case 'titles':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 4h12l-1.5 6a5 5 0 0 1-5 4h-1a5 5 0 0 1-5-4L6 4Z" />
          <path d="M9 21h6" />
        </svg>
      );
    case 'legacy':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2 4 6v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-4Z" />
          <path d="M12 8v8" />
          <path d="M8.5 12H15.5" />
        </svg>
      );
    default:
      return null;
  }
};

const normalizeState = (raw) => {
  const safe = {
    ...DEFAULT_STATE,
    ...(raw || {}),
    resources: {
      ...DEFAULT_STATE.resources,
      ...(raw?.resources || {})
    },
    buildings: {
      ...DEFAULT_STATE.buildings,
      ...(raw?.buildings || {})
    },
    upgrades: Array.isArray(raw?.upgrades) ? raw.upgrades : [],
    legacyUpgrades: Array.isArray(raw?.legacyUpgrades) ? raw.legacyUpgrades : [],
    totalClicks: clampNumber(raw?.totalClicks),
    profileName: typeof raw?.profileName === 'string' ? raw.profileName : '',
    rebirths: clampNumber(raw?.rebirths),
    legacyPoints: clampNumber(raw?.legacyPoints),
    saveId: clampNumber(raw?.saveId),
    lastUpdated: clampNumber(raw?.lastUpdated) || Date.now()
  };

  safe.resources.data = clampNumber(safe.resources.data);
  safe.resources.insights = clampNumber(safe.resources.insights);
  safe.resources.wins = clampNumber(safe.resources.wins);
  safe.resources.fans = clampNumber(safe.resources.fans);
  safe.resources.titles = clampNumber(safe.resources.titles);

  return safe;
};

const isEmptyState = (state) => {
  if (!state) return true;
  const total =
    state.resources?.data +
    state.resources?.insights +
    state.resources?.wins +
    state.resources?.fans +
    state.resources?.titles;
  return (
    !total &&
    !state.totalClicks &&
    !state.rebirths &&
    !state.legacyPoints &&
    (!state.upgrades || state.upgrades.length === 0) &&
    (!state.legacyUpgrades || state.legacyUpgrades.length === 0)
  );
};

const loadLocalState = () => {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE };
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const backup = window.localStorage.getItem(STORAGE_BACKUP_KEY);
    if (!stored && !backup) return { ...DEFAULT_STATE };
    const primaryState = stored ? normalizeState(JSON.parse(stored)) : null;
    const backupState = backup ? normalizeState(JSON.parse(backup)) : null;
    if (!primaryState && backupState) return backupState;
    if (primaryState && backupState && isEmptyState(primaryState) && !isEmptyState(backupState)) {
      return backupState;
    }
    return primaryState || backupState || { ...DEFAULT_STATE };
  } catch (error) {
    try {
      const backup = window.localStorage.getItem(STORAGE_BACKUP_KEY);
      if (backup) return normalizeState(JSON.parse(backup));
    } catch {
      return { ...DEFAULT_STATE };
    }
    return { ...DEFAULT_STATE };
  }
};

const loadLocalMeta = () => {
  if (typeof window === 'undefined') return { savedAt: 0 };
  try {
    const raw = window.localStorage.getItem(STORAGE_META_KEY);
    if (!raw) return { savedAt: 0 };
    const parsed = JSON.parse(raw);
    return { savedAt: clampNumber(parsed?.savedAt) };
  } catch {
    return { savedAt: 0 };
  }
};

const loadRightPanelOrder = () => {
  if (typeof window === 'undefined') return [...RIGHT_PANEL_IDS];
  try {
    const raw = window.localStorage.getItem(RIGHT_PANEL_KEY);
    if (!raw) return [...RIGHT_PANEL_IDS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...RIGHT_PANEL_IDS];
    const filtered = parsed.filter((id) => RIGHT_PANEL_IDS.includes(id));
    const missing = RIGHT_PANEL_IDS.filter((id) => !filtered.includes(id));
    return [...filtered, ...missing];
  } catch {
    return [...RIGHT_PANEL_IDS];
  }
};

const persistLocal = (state, metaRef) => {
  if (typeof window === 'undefined') return;
  const snapshot = normalizeState(state);
  const savedAt = Date.now();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  window.localStorage.setItem(STORAGE_BACKUP_KEY, JSON.stringify(snapshot));
  window.localStorage.setItem(STORAGE_META_KEY, JSON.stringify({ savedAt }));
  if (metaRef) metaRef.current = { savedAt };
};

const getProgressScore = (state) => {
  if (!state) return 0;
  const resources = state.resources || {};
  return (
    clampNumber(resources.data) +
    clampNumber(resources.insights) * 5 +
    clampNumber(resources.wins) * 20 +
    clampNumber(resources.fans) * 2 +
    clampNumber(resources.titles) * 500
  );
};

const preferState = (localState, cloudState, localMeta, cloudUpdatedAt) => {
  if (!cloudState) return localState;
  if (!localState) return cloudState;
  const cloudEmpty = isEmptyState(cloudState);
  const localEmpty = isEmptyState(localState);
  if (cloudEmpty && !localEmpty) return localState;
  if (!cloudEmpty && localEmpty) return cloudState;

  const localRebirths = clampNumber(localState.rebirths);
  const cloudRebirths = clampNumber(cloudState.rebirths);
  if (localRebirths !== cloudRebirths) return localRebirths > cloudRebirths ? localState : cloudState;

  const localLegacy = clampNumber(localState.legacyPoints);
  const cloudLegacy = clampNumber(cloudState.legacyPoints);
  if (localLegacy !== cloudLegacy) return localLegacy > cloudLegacy ? localState : cloudState;

  const localScore = getProgressScore(localState);
  const cloudScore = getProgressScore(cloudState);
  if (localScore !== cloudScore) return localScore > cloudScore ? localState : cloudState;

  const localSavedAt = clampNumber(localMeta?.savedAt);
  const cloudSavedAt = clampNumber(cloudUpdatedAt ? Date.parse(cloudUpdatedAt) : 0);
  if (localSavedAt || cloudSavedAt) {
    if (cloudSavedAt >= localSavedAt) return cloudState;
    return localState;
  }

  const localUpdated = clampNumber(localState.lastUpdated);
  const cloudUpdated = clampNumber(cloudState.lastUpdated);
  return cloudUpdated >= localUpdated ? cloudState : localState;
};

const formatNumber = (value) => {
  const safe = clampNumber(value);
  if (safe < 100) return safe.toFixed(2);
  if (safe < 1000) return safe.toFixed(1);
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.floor(safe));
};

const formatWhole = (value) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.floor(clampNumber(value)));

const formatRate = (value) => `${formatNumber(value)}/s`;
const formatSignedRate = (value) => {
  const safe = clampNumber(value);
  if (safe === 0) return `${formatNumber(0)}/s`;
  const prefix = safe > 0 ? '+' : '';
  return `${prefix}${formatNumber(safe)}/s`;
};

const formatPercent = (value) => `${Math.round(clampNumber(value) * 100)}%`;

const formatDuration = (seconds) => {
  const safe = Math.max(0, Math.floor(clampNumber(seconds)));
  if (safe < 60) return `${safe}s`;
  const minutes = Math.floor(safe / 60);
  if (minutes < 60) return `${minutes}m ${safe % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
};

const formatCostLabel = (cost) =>
  Object.entries(cost)
    .map(([key, value]) => `${formatNumber(value)} ${key}`)
    .join(' + ');

const getChampionshipRequirement = (titles) => Math.round(25 * Math.pow(1.4, titles));

const getModifiers = (upgrades, legacyUpgrades, titles) => {
  const modifiers = {
    clickBonus: 0,
    clickMult: 1,
    dataPerSecMult: 1,
    insightPerSecMult: 1,
    winPerSecMult: 1,
    fanPerSecMult: 1,
    globalMult: 1
  };

  const combinedUpgrades = [...upgrades, ...legacyUpgrades];
  combinedUpgrades.forEach((upgradeId) => {
    const upgrade = UPGRADES.find((item) => item.id === upgradeId) || LEGACY_UPGRADES.find((item) => item.id === upgradeId);
    if (!upgrade) return;
    const { type, value } = upgrade.effect;
    if (type === 'clickBonus') modifiers.clickBonus += value;
    if (type === 'clickMult') modifiers.clickMult *= value;
    if (type === 'dataPerSecMult') modifiers.dataPerSecMult *= value;
    if (type === 'insightPerSecMult') modifiers.insightPerSecMult *= value;
    if (type === 'winPerSecMult') modifiers.winPerSecMult *= value;
    if (type === 'fanPerSecMult') modifiers.fanPerSecMult *= value;
    if (type === 'globalMult') modifiers.globalMult *= value;
  });

  modifiers.globalMult *= 1 + titles * 0.05;
  return modifiers;
};

const getOfflineSettings = (legacyUpgrades) => {
  let rate = OFFLINE_BASE_RATE;
  let capSeconds = OFFLINE_BASE_CAP_SECONDS;
  legacyUpgrades.forEach((upgradeId) => {
    const upgrade = LEGACY_UPGRADES.find((item) => item.id === upgradeId);
    if (!upgrade) return;
    if (upgrade.effect.type === 'offlineRate') rate += upgrade.effect.value;
    if (upgrade.effect.type === 'offlineCap') capSeconds += upgrade.effect.value;
  });
  return { rate, capSeconds };
};

const getRates = (state) => {
  const modifiers = getModifiers(state.upgrades, state.legacyUpgrades, state.resources.titles);
  const dataPerClick = (BASE.dataPerClick + modifiers.clickBonus) * modifiers.clickMult * modifiers.globalMult;
  const dataPerSec =
    (state.buildings.scout * BASE.scoutDataPerSec + state.resources.fans * BASE.fanDataPerSec) *
    modifiers.dataPerSecMult *
    modifiers.globalMult;
  const insightPerSec = state.buildings.analyst * BASE.analystInsightPerSec * modifiers.insightPerSecMult * modifiers.globalMult;
  const winPerSec = state.buildings.strategy * BASE.strategyWinPerSec * modifiers.winPerSecMult * modifiers.globalMult;
  const fanPerSec = state.buildings.marketing * BASE.marketingFanPerSec * modifiers.fanPerSecMult * modifiers.globalMult;

  return {
    dataPerClick,
    dataPerSec,
    insightPerSec,
    winPerSec,
    fanPerSec,
    dataCostPerInsight: BASE.dataCostPerInsight,
    insightCostPerWin: BASE.insightCostPerWin,
    winCostPerFan: BASE.winCostPerFan,
    modifiers
  };
};

const getBuildingPerUnitRate = (building, modifiers) => {
  if (!building) return 0;
  switch (building.id) {
    case 'scout':
      return BASE.scoutDataPerSec * modifiers.dataPerSecMult * modifiers.globalMult;
    case 'analyst':
      return BASE.analystInsightPerSec * modifiers.insightPerSecMult * modifiers.globalMult;
    case 'strategy':
      return BASE.strategyWinPerSec * modifiers.winPerSecMult * modifiers.globalMult;
    case 'marketing':
      return BASE.marketingFanPerSec * modifiers.fanPerSecMult * modifiers.globalMult;
    default:
      return 0;
  }
};

const getBuildingInputCurrency = (building) => {
  switch (building?.id) {
    case 'analyst':
      return 'data';
    case 'strategy':
      return 'insights';
    case 'marketing':
      return 'wins';
    default:
      return null;
  }
};

const getBuildingInputRate = (building, outputRate, rates) => {
  if (!building) return 0;
  switch (building.id) {
    case 'analyst':
      return outputRate * rates.dataCostPerInsight;
    case 'strategy':
      return outputRate * rates.insightCostPerWin;
    case 'marketing':
      return outputRate * rates.winCostPerFan;
    default:
      return 0;
  }
};

const getEffectiveRates = (state, rates) => {
  const dataSupply = Math.max(0, clampNumber(state.resources.data) + rates.dataPerSec);
  const possibleInsights = Math.max(0, rates.insightPerSec);
  const maxInsightsByData = rates.dataCostPerInsight > 0 ? dataSupply / rates.dataCostPerInsight : possibleInsights;
  const actualInsights = Math.max(0, Math.min(possibleInsights, maxInsightsByData));
  const dataAfter = dataSupply - actualInsights * rates.dataCostPerInsight;

  const insightSupply = Math.max(0, clampNumber(state.resources.insights) + actualInsights);
  const possibleWins = Math.max(0, rates.winPerSec);
  const maxWinsByInsights = rates.insightCostPerWin > 0 ? insightSupply / rates.insightCostPerWin : possibleWins;
  const actualWins = Math.max(0, Math.min(possibleWins, maxWinsByInsights));
  const insightsAfter = insightSupply - actualWins * rates.insightCostPerWin;

  const winSupply = Math.max(0, clampNumber(state.resources.wins) + actualWins);
  const possibleFans = Math.max(0, rates.fanPerSec);
  const maxFansByWins = rates.winCostPerFan > 0 ? winSupply / rates.winCostPerFan : possibleFans;
  const actualFans = Math.max(0, Math.min(possibleFans, maxFansByWins));
  const winsAfter = winSupply - actualFans * rates.winCostPerFan;

  return {
    dataNet: dataAfter - clampNumber(state.resources.data),
    insightsNet: insightsAfter - clampNumber(state.resources.insights),
    winsNet: winsAfter - clampNumber(state.resources.wins),
    fansNet: actualFans,
    insightsProduced: actualInsights,
    winsProduced: actualWins,
    fansProduced: actualFans
  };
};

const applyDelta = (state, deltaSeconds) => {
  const nextState = {
    ...state,
    resources: { ...state.resources },
    buildings: { ...state.buildings }
  };
  let remaining = deltaSeconds;
  const step = deltaSeconds > 1 ? 0.25 : deltaSeconds;

  while (remaining > 0) {
    const dt = Math.min(step, remaining);
    const rates = getRates(nextState);

    nextState.resources.data += rates.dataPerSec * dt;

    const possibleInsights = rates.insightPerSec * dt;
    const maxByData = nextState.resources.data / rates.dataCostPerInsight;
    const actualInsights = Math.min(possibleInsights, Math.max(0, maxByData));
    nextState.resources.data -= actualInsights * rates.dataCostPerInsight;
    nextState.resources.insights += actualInsights;

    const possibleWins = rates.winPerSec * dt;
    const maxByInsights = nextState.resources.insights / rates.insightCostPerWin;
    const actualWins = Math.min(possibleWins, Math.max(0, maxByInsights));
    nextState.resources.insights -= actualWins * rates.insightCostPerWin;
    nextState.resources.wins += actualWins;

    const possibleFans = rates.fanPerSec * dt;
    const maxByWins = nextState.resources.wins / rates.winCostPerFan;
    const actualFans = Math.min(possibleFans, Math.max(0, maxByWins));
    nextState.resources.wins -= actualFans * rates.winCostPerFan;
    nextState.resources.fans += actualFans;

    remaining -= dt;
  }

  nextState.resources.data = Math.max(0, nextState.resources.data);
  nextState.resources.insights = Math.max(0, nextState.resources.insights);
  nextState.resources.wins = Math.max(0, nextState.resources.wins);
  nextState.resources.fans = Math.max(0, nextState.resources.fans);
  nextState.resources.titles = Math.max(0, nextState.resources.titles);

  return nextState;
};

const applyOfflineProgress = (state, now) => {
  const offlineSettings = getOfflineSettings(state.legacyUpgrades || []);
  const elapsedSeconds = Math.max(0, (now - state.lastUpdated) / 1000);
  if (elapsedSeconds <= 0.1) {
    return {
      nextState: { ...state, lastUpdated: now },
      elapsedSeconds: 0,
      capped: false,
      rate: offlineSettings.rate,
      capSeconds: offlineSettings.capSeconds
    };
  }

  const capped = elapsedSeconds > offlineSettings.capSeconds;
  const effectiveSeconds = capped ? offlineSettings.capSeconds : elapsedSeconds;
  const progressed = applyDelta(state, effectiveSeconds * offlineSettings.rate);
  return {
    nextState: {
      ...progressed,
      lastUpdated: now
    },
    elapsedSeconds: effectiveSeconds,
    capped,
    rate: offlineSettings.rate,
    capSeconds: offlineSettings.capSeconds
  };
};

const getBuildingCost = (building, owned, amount) => {
  const base = building.baseCost;
  const mult = building.costMult;
  if (amount <= 1) return base * Math.pow(mult, owned);
  return base * (Math.pow(mult, owned) * (Math.pow(mult, amount) - 1)) / (mult - 1);
};

const getBuildingRefund = (building, owned, amount, refundRate = 0.5) => {
  if (amount <= 0 || owned <= 0) return 0;
  const base = building.baseCost;
  const mult = building.costMult;
  const sellAmount = Math.min(amount, owned);
  const startIndex = owned - sellAmount;
  const totalCost = base * (Math.pow(mult, startIndex) * (Math.pow(mult, sellAmount) - 1)) / (mult - 1);
  return totalCost * refundRate;
};

const canAffordUpgrade = (resources, cost) => {
  return Object.entries(cost).every(([key, value]) => resources[key] >= value);
};

const spendResources = (resources, cost) => {
  const next = { ...resources };
  Object.entries(cost).forEach(([key, value]) => {
    next[key] = Math.max(0, next[key] - value);
  });
  return next;
};

const getDisplayName = (state, session) => {
  if (state.profileName?.trim()) return state.profileName.trim();
  return 'Coach';
};

function App() {
  const [gameState, setGameState] = useState(() => loadLocalState());
  const [buyAmount, setBuyAmount] = useState(1);
  const [offlineSummary, setOfflineSummary] = useState(null);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [cloudStatus, setCloudStatus] = useState('idle');
  const [rightPanelOrder, setRightPanelOrder] = useState(() => loadRightPanelOrder());
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardMessage, setLeaderboardMessage] = useState('');
  const [cloudSaveAt, setCloudSaveAt] = useState(null);
  const [cloudSaveCountdown, setCloudSaveCountdown] = useState(null);

  const hasHydrated = useRef(false);
  const saveTimer = useRef(null);
  const stateRef = useRef(gameState);
  const localMetaRef = useRef(loadLocalMeta());
  const lastCloudSave = useRef(0);
  const pendingCloudSave = useRef(null);

  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (!leaderboardMessage) return undefined;
    const timer = window.setTimeout(() => setLeaderboardMessage(''), 2000);
    return () => window.clearTimeout(timer);
  }, [leaderboardMessage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(RIGHT_PANEL_KEY, JSON.stringify(rightPanelOrder));
  }, [rightPanelOrder]);

  useEffect(() => {
    if (!cloudSaveAt) return undefined;
    const interval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - cloudSaveAt) / 1000);
      const remaining = Math.max(0, 15 - elapsed);
      setCloudSaveCountdown(remaining);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [cloudSaveAt]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session ?? null);
      setAuthLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (hasHydrated.current) return;
    hasHydrated.current = true;
    const now = Date.now();
    const { nextState, elapsedSeconds, capped, rate, capSeconds } = applyOfflineProgress(gameState, now);
    if (elapsedSeconds >= 5) {
      setOfflineSummary({ elapsedSeconds, capped, rate, capSeconds });
    }
    setGameState(nextState);
    persistLocal(nextState, localMetaRef);
  }, [gameState]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setGameState((prev) => {
        const now = Date.now();
        const elapsedSeconds = Math.max(0, (now - prev.lastUpdated) / 1000);
        if (elapsedSeconds <= 0) return prev;
        const progressed = applyDelta(prev, elapsedSeconds);
        return { ...progressed, lastUpdated: now };
      });
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      persistLocal(gameState, localMetaRef);
    }, 500);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [gameState]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handlePersist = () => {
      persistLocal(stateRef.current, localMetaRef);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        handlePersist();
      }
    };
    window.addEventListener('beforeunload', handlePersist);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('beforeunload', handlePersist);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !session?.user) {
      setCloudStatus('idle');
      return;
    }

    let isMounted = true;
    const loadCloudState = async () => {
      setCloudStatus('loading');
      const { data, error } = await supabase
        .from('idle_saves')
        .select('state, updated_at')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        if (isMounted) setCloudStatus('error');
        return;
      }

      const localState = stateRef.current;
      const localMeta = localMetaRef.current;
      if (data?.state) {
        const cloudState = normalizeState(data.state);
        const preferred = preferState(localState, cloudState, localMeta, data.updated_at);
        if (preferred === cloudState) {
          persistLocal(cloudState, localMetaRef);
          if (isMounted) setGameState(cloudState);
          if (data.updated_at) {
            const stamp = Date.parse(data.updated_at);
            if (Number.isFinite(stamp)) {
              lastCloudSave.current = stamp;
              setCloudSaveAt(stamp);
              const elapsed = Math.floor((Date.now() - stamp) / 1000);
              setCloudSaveCountdown(Math.max(0, 15 - elapsed));
            }
          }
        } else {
          await saveCloudState(localState);
        }
      } else {
        await saveCloudState(localState);
      }

      if (isMounted) setCloudStatus('ready');
    };

    loadCloudState();

    return () => {
      isMounted = false;
    };
  }, [session?.user, session?.user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !session?.user || cloudStatus !== 'ready') return;
    const now = Date.now();
    if (now - lastCloudSave.current < 15000) return;

    let cancelled = false;
    const saveCloud = async () => {
      const state = stateRef.current;
      const displayName = getDisplayName(state, session);

      const payload = {
        user_id: session.user.id,
        state,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('idle_saves').upsert(payload);
      if (error || cancelled) {
        if (error) setCloudStatus('error');
        return;
      }

      await supabase.from('leaderboard_entries').upsert({
        user_id: session.user.id,
        display_name: displayName,
        titles: Math.floor(state.resources.titles),
        wins: Math.floor(state.resources.wins),
        updated_at: new Date().toISOString()
      });

      const stamp = Date.now();
      lastCloudSave.current = stamp;
      setCloudSaveAt(stamp);
      setCloudSaveCountdown(15);
    };

    saveCloud();

    return () => {
      cancelled = true;
    };
  }, [gameState, session, cloudStatus]);

  useEffect(() => {
    if (!session?.user || cloudStatus !== 'ready' || !pendingCloudSave.current) return;
    const pending = pendingCloudSave.current;
    pendingCloudSave.current = null;
    saveCloudState(pending.state, pending.message);
  }, [session?.user, cloudStatus]);

  const saveCloudState = async (stateToSave, message) => {
    if (!isSupabaseConfigured || !supabase) return false;
    if (!session?.user) {
      pendingCloudSave.current = { state: stateToSave, message };
      return false;
    }
    const displayName = getDisplayName(stateToSave, session);
    const payload = {
      user_id: session.user.id,
      state: stateToSave,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('idle_saves').upsert(payload);
    if (error) {
      setCloudStatus('error');
      return false;
    }
    await supabase.from('leaderboard_entries').upsert({
      user_id: session.user.id,
      display_name: displayName,
      titles: Math.floor(stateToSave.resources.titles),
      wins: Math.floor(stateToSave.resources.wins),
      updated_at: new Date().toISOString()
    });
    const stamp = Date.now();
    lastCloudSave.current = stamp;
    setCloudSaveAt(stamp);
    setCloudSaveCountdown(15);
    setCloudStatus('ready');
    if (message) setLeaderboardMessage(message);
    return true;
  };

  const handleSaveNow = async () => {
    await saveCloudState(stateRef.current, 'Saved now.');
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let isMounted = true;

    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from('leaderboard_entries')
        .select('display_name, titles, wins')
        .order('titles', { ascending: false })
        .order('wins', { ascending: false })
        .limit(10);
      if (isMounted) setLeaderboard(data || []);
    };

    fetchLeaderboard();
    const interval = window.setInterval(fetchLeaderboard, 60000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const handleLeaderboardUpdate = async () => {
    if (!isSupabaseConfigured || !supabase || !session?.user) return;
    const state = stateRef.current;
    const displayName = getDisplayName(state, session);
    const { error } = await supabase.from('leaderboard_entries').upsert({
      user_id: session.user.id,
      display_name: displayName,
      titles: Math.floor(state.resources.titles),
      wins: Math.floor(state.resources.wins),
      updated_at: new Date().toISOString()
    });
    if (!error) setLeaderboardMessage('Leaderboard updated.');
  };

  const moveRightPanel = (panelId, delta) => {
    setRightPanelOrder((prev) => {
      const index = prev.indexOf(panelId);
      if (index === -1) return prev;
      const nextIndex = index + delta;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const rates = useMemo(() => getRates(gameState), [gameState]);
  const offlineSettings = useMemo(() => getOfflineSettings(gameState.legacyUpgrades || []), [gameState.legacyUpgrades]);
  const effectiveRates = useMemo(() => getEffectiveRates(gameState, rates), [gameState, rates]);
  const conversionDemand = useMemo(
    () => ({
      dataUsePerSec: rates.insightPerSec * rates.dataCostPerInsight,
      insightUsePerSec: rates.winPerSec * rates.insightCostPerWin,
      winUsePerSec: rates.fanPerSec * rates.winCostPerFan
    }),
    [rates]
  );
  const championshipRequirement = useMemo(
    () => getChampionshipRequirement(gameState.resources.titles),
    [gameState.resources.titles]
  );
  const progressScore = useMemo(
    () =>
      gameState.resources.data +
      gameState.resources.insights * 5 +
      gameState.resources.wins * 20 +
      gameState.resources.fans * 2 +
      gameState.resources.titles * 500,
    [gameState.resources]
  );
  const currentStepIndex = Math.min(gameState.rebirths, REBIRTH_STEPS.length - 1);
  const nextRequirement = getRebirthRequirement(gameState.rebirths);
  const prevThreshold = getRebirthPreviousThreshold(gameState.rebirths);
  const nextStep = nextRequirement?.isPost ? null : REBIRTH_STEPS[currentStepIndex + 1];
  const nextThreshold = nextRequirement?.threshold ?? null;
  const scoreToNext = nextThreshold ? Math.max(0, nextThreshold - progressScore) : 0;
  const scoreRate = useMemo(
    () => effectiveRates.dataNet + effectiveRates.insightsNet * 5 + effectiveRates.winsNet * 20 + effectiveRates.fansNet * 2,
    [effectiveRates]
  );
  const timeToNext = scoreRate > 0 && scoreToNext > 0 ? scoreToNext / scoreRate : null;
  const progressToNext =
    nextThreshold && nextThreshold > prevThreshold
      ? (progressScore - prevThreshold) / (nextThreshold - prevThreshold)
      : 1;
  const canRebirth = nextThreshold ? progressScore >= nextThreshold : false;
  const nextLegacyGain = Math.max(1, Math.floor(Math.sqrt(progressScore / 800)));

  const handleClick = () => {
    setGameState((prev) => ({
      ...prev,
      resources: {
        ...prev.resources,
        data: prev.resources.data + rates.dataPerClick
      },
      totalClicks: prev.totalClicks + 1
    }));
  };

  const handleBuyBuilding = (buildingId) => {
    const building = BUILDINGS.find((item) => item.id === buildingId);
    if (!building) return;
    setGameState((prev) => {
      const owned = prev.buildings[buildingId] || 0;
      const cost = getBuildingCost(building, owned, buyAmount);
      const currency = building.costCurrency || 'data';
      if ((prev.resources[currency] || 0) < cost) return prev;
      return {
        ...prev,
        resources: {
          ...prev.resources,
          [currency]: (prev.resources[currency] || 0) - cost
        },
        buildings: {
          ...prev.buildings,
          [buildingId]: owned + buyAmount
        }
      };
    });
  };

  const handleSellBuilding = (buildingId) => {
    const building = BUILDINGS.find((item) => item.id === buildingId);
    if (!building) return;
    setGameState((prev) => {
      const owned = prev.buildings[buildingId] || 0;
      if (owned <= 0) return prev;
      const sellAmount = Math.min(buyAmount, owned);
      const refund = getBuildingRefund(building, owned, sellAmount);
      const currency = building.costCurrency || 'data';
      return {
        ...prev,
        resources: {
          ...prev.resources,
          [currency]: (prev.resources[currency] || 0) + refund
        },
        buildings: {
          ...prev.buildings,
          [buildingId]: owned - sellAmount
        }
      };
    });
  };

  const handleBuyUpgrade = (upgradeId) => {
    const upgrade = UPGRADES.find((item) => item.id === upgradeId);
    if (!upgrade) return;
    setGameState((prev) => {
      if (prev.upgrades.includes(upgradeId)) return prev;
      if (!canAffordUpgrade(prev.resources, upgrade.cost)) return prev;
      return {
        ...prev,
        resources: spendResources(prev.resources, upgrade.cost),
        upgrades: [...prev.upgrades, upgradeId]
      };
    });
  };

  const handleClaimChampionship = () => {
    setGameState((prev) => {
      if (prev.resources.wins < championshipRequirement) return prev;
      return {
        ...prev,
        resources: {
          ...prev.resources,
          wins: prev.resources.wins - championshipRequirement,
          titles: prev.resources.titles + 1
        }
      };
    });
  };

  const handleReset = () => {
    if (typeof window !== 'undefined' && !window.confirm('Reset the idle lab? This clears local progress.')) {
      return;
    }
    setOfflineSummary(null);
    setGameState({ ...DEFAULT_STATE, lastUpdated: Date.now() });
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(STORAGE_BACKUP_KEY);
      window.localStorage.removeItem(STORAGE_META_KEY);
    }
  };

  const handleRebirth = () => {
    if (!canRebirth) return;
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Rebirth now to gain ${nextLegacyGain} legacy point(s)? This resets current resources.`)
    ) {
      return;
    }
    setOfflineSummary(null);
    const nextState = (prev) => ({
      ...DEFAULT_STATE,
      legacyUpgrades: prev.legacyUpgrades,
      rebirths: prev.rebirths + 1,
      legacyPoints: prev.legacyPoints + nextLegacyGain,
      lastUpdated: Date.now(),
      profileName: prev.profileName
    });
    setGameState((prev) => {
      const built = nextState(prev);
      persistLocal(built, localMetaRef);
      saveCloudState(built, 'Rebirth saved.');
      return built;
    });
  };

  const handleMagicLink = async () => {
    if (!authEmail || !supabase) return;
    setAuthMessage('Sending magic link...');
    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail,
      options: {
        emailRedirectTo: window.location.origin
      }
    });
    if (error) {
      setAuthMessage(`Failed to send link: ${error.message}`);
      return;
    }
    setAuthMessage('Check your inbox for the magic link.');
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const availableUpgrades = UPGRADES.filter((upgrade) => !gameState.upgrades.includes(upgrade.id));
  const purchasedUpgrades = UPGRADES.filter((upgrade) => gameState.upgrades.includes(upgrade.id));
  const availableLegacy = LEGACY_UPGRADES.filter(
    (upgrade) => !gameState.legacyUpgrades.includes(upgrade.id) && gameState.rebirths >= upgrade.requiresRebirths
  );
  const lockedLegacy = LEGACY_UPGRADES.filter(
    (upgrade) => !gameState.legacyUpgrades.includes(upgrade.id) && gameState.rebirths < upgrade.requiresRebirths
  );
  const purchasedLegacy = LEGACY_UPGRADES.filter((upgrade) => gameState.legacyUpgrades.includes(upgrade.id));

  const handleBuyLegacyUpgrade = (upgradeId) => {
    const upgrade = LEGACY_UPGRADES.find((item) => item.id === upgradeId);
    if (!upgrade) return;
    setGameState((prev) => {
      if (prev.legacyUpgrades.includes(upgradeId)) return prev;
      if (prev.rebirths < upgrade.requiresRebirths) return prev;
      if (prev.legacyPoints < upgrade.cost) return prev;
      return {
        ...prev,
        legacyPoints: prev.legacyPoints - upgrade.cost,
        legacyUpgrades: [...prev.legacyUpgrades, upgradeId]
      };
    });
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <p className="eyebrow">Idle Sports</p>
          <h1>Analytics Engine</h1>
          <p className="subtitle">
            Turn data into insights, insights into wins, and wins into titles. Build the smartest front office in sports.
          </p>
        </div>
        <div className="panel auth">
          {!isSupabaseConfigured && (
            <div className="notice warn">
              <strong>Supabase not configured.</strong>
              <p>Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable auth and cloud saves.</p>
            </div>
          )}

          {isSupabaseConfigured && authLoading && <p className="muted">Checking session...</p>}

          {isSupabaseConfigured && !authLoading && session?.user && (
            <div className="auth-row">
              <div>
                <p className="muted">Signed in</p>
                <p className="strong">{session.user.email}</p>
                <p className="muted">Cloud save: {cloudStatus}</p>
                <p className="muted">Autosaves every 15s while active.</p>
                <p className="muted">
                  Last save: {cloudSaveAt ? `${Math.floor((Date.now() - cloudSaveAt) / 1000)}s ago` : 'not yet'}
                </p>
                <p className="muted">
                  Next save: {cloudSaveAt && cloudSaveCountdown != null ? `${cloudSaveCountdown}s` : 'waiting'}
                </p>
                {leaderboardMessage && <p className="muted">{leaderboardMessage}</p>}
              </div>
              <div className="auth-actions">
                <button className="btn ghost" onClick={handleSaveNow}>
                  Save now
                </button>
                <button className="btn ghost" onClick={handleSignOut}>
                  Sign out
                </button>
              </div>
            </div>
          )}

          {isSupabaseConfigured && !authLoading && !session?.user && (
            <div className="auth-form">
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  placeholder="coach@club.com"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                />
              </label>
              <div className="auth-actions">
                <button className="btn" onClick={handleMagicLink}>
                  Send magic link
                </button>
              </div>
              {authMessage && <p className="muted">{authMessage}</p>}
            </div>
          )}
        </div>
      </header>

      <section className="panel hero">
        <div>
          <p className="eyebrow">Idle Lab</p>
          <h2>Sports Analytics Idle Game</h2>
          <p className="muted">
            Run data pulls, build analyst pods, and tune strategy labs. Fans accelerate data intake, titles boost every
            output.
          </p>
        </div>
        <div className="hero-actions">
          <button className="btn ghost" onClick={handleReset}>
            Reset lab
          </button>
          <button className="btn primary" onClick={handleClick}>
            Run data pull (+{formatNumber(rates.dataPerClick)})
          </button>
          <button className={`btn ${canRebirth ? 'accent' : 'disabled'}`} onClick={handleRebirth} disabled={!canRebirth}>
            Rebirth +{nextLegacyGain} legacy
          </button>
        </div>
        {offlineSummary && (
          <div className="notice">
            Offline progress applied: {Math.floor(offlineSummary.elapsedSeconds)} seconds at{' '}
            {Math.round(offlineSummary.rate * 100)}% efficiency
            {offlineSummary.capped
              ? ` (capped at ${Math.round(offlineSummary.capSeconds / 3600)} hours).`
              : '.'}
          </div>
        )}
        <p className="muted">
          Offline gains run at {Math.round(offlineSettings.rate * 100)}% efficiency, capped at{' '}
          {Math.round(offlineSettings.capSeconds / 3600)} hours.
        </p>
        <div className="rebirth-strip">
          <div>
            <p className="muted">Rebirths</p>
            <p className="strong">{formatWhole(gameState.rebirths)}</p>
          </div>
          <div>
            <p className="muted">Legacy points</p>
            <p className="strong">{formatWhole(gameState.legacyPoints)}</p>
          </div>
          <div>
            <p className="muted">Next rebirth unlock</p>
            <p className="strong">{nextRequirement ? nextRequirement.title : 'Max tier reached'}</p>
          </div>
          <div>
            <p className="muted">Score to next</p>
            <p className="strong">{nextStep ? formatWhole(scoreToNext) : '0'}</p>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card data">
          <div className="stat-head">
            <Icon name="data" />
            <p className="stat-label">Data</p>
          </div>
          <p className="stat-value">{formatNumber(gameState.resources.data)}</p>
          <p className="stat-meta">Gross: {formatRate(rates.dataPerSec)}</p>
          <p className="stat-meta">Used for insights: {formatRate(conversionDemand.dataUsePerSec)}</p>
          <p className="stat-meta">
            Net now:{' '}
            <span className={`strong ${effectiveRates.dataNet < 0 ? 'negative' : ''}`}>
              {formatSignedRate(effectiveRates.dataNet)}
            </span>
          </p>
        </div>
        <div className="stat-card insights">
          <div className="stat-head">
            <Icon name="insights" />
            <p className="stat-label">Insights</p>
          </div>
          <p className="stat-value">{formatNumber(gameState.resources.insights)}</p>
          <p className="stat-meta">Gross: {formatRate(rates.insightPerSec)}</p>
          <p className="stat-meta">Used for wins: {formatRate(conversionDemand.insightUsePerSec)}</p>
          <p className="stat-meta">
            Net now:{' '}
            <span className={`strong ${effectiveRates.insightsNet < 0 ? 'negative' : ''}`}>
              {formatSignedRate(effectiveRates.insightsNet)}
            </span>
          </p>
        </div>
        <div className="stat-card wins">
          <div className="stat-head">
            <Icon name="wins" />
            <p className="stat-label">Wins</p>
          </div>
          <p className="stat-value">{formatNumber(gameState.resources.wins)}</p>
          <p className="stat-meta">Gross: {formatRate(rates.winPerSec)}</p>
          <p className="stat-meta">Used for fans: {formatRate(conversionDemand.winUsePerSec)}</p>
          <p className="stat-meta">
            Net now:{' '}
            <span className={`strong ${effectiveRates.winsNet < 0 ? 'negative' : ''}`}>
              {formatSignedRate(effectiveRates.winsNet)}
            </span>
          </p>
        </div>
        <div className="stat-card fans">
          <div className="stat-head">
            <Icon name="fans" />
            <p className="stat-label">Fans</p>
          </div>
          <p className="stat-value">{formatNumber(gameState.resources.fans)}</p>
          <p className="stat-meta">{formatRate(rates.fanPerSec)}</p>
        </div>
        <div className="stat-card titles">
          <div className="stat-head">
            <Icon name="titles" />
            <p className="stat-label">Titles</p>
          </div>
          <p className="stat-value">{formatWhole(gameState.resources.titles)}</p>
          <p className="stat-meta">+{formatWhole(gameState.resources.titles * 5)}% global</p>
        </div>
      </section>

      <section className="main-grid">
        <div className="stack">
          <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Operations</h3>
              <p className="muted">Spend data, insights, and wins to scale your analytics pipeline.</p>
              <p className="muted small">
                Auto-convert: {rates.dataCostPerInsight} data → 1 insight, {rates.insightCostPerWin} insights → 1 win,
                {rates.winCostPerFan} win → 1 fan.
              </p>
            </div>
            <div className="chip-row">
              {[1, 10, 25].map((amount) => (
                  <button
                    key={amount}
                    className={`chip ${buyAmount === amount ? 'active' : ''}`}
                    onClick={() => setBuyAmount(amount)}
                  >
                    Buy {amount}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid two">
              {BUILDINGS.map((building) => {
                const owned = gameState.buildings[building.id] || 0;
                const cost = getBuildingCost(building, owned, buyAmount);
                const currency = building.costCurrency || 'data';
                const outputCurrency = building.outputCurrency || currency;
                const affordable = (gameState.resources[currency] || 0) >= cost;
                const perUnitRate = getBuildingPerUnitRate(building, rates.modifiers);
                const perUnitInput = getBuildingInputRate(building, perUnitRate, rates);
                const inputCurrency = getBuildingInputCurrency(building);
                const totalOutput = perUnitRate * owned;
                const totalInput = perUnitInput * owned;
                const refund = getBuildingRefund(building, owned, buyAmount);
                return (
                  <div key={building.id} className={`card ${outputCurrency}`}>
                    <div>
                      <div className="card-title-row">
                        <Icon name={outputCurrency} />
                        <p className="card-title">{building.name}</p>
                      </div>
                      <p className="muted">{building.description}</p>
                      <p className="muted">Owned: {owned}</p>
                      <p className="muted">
                        Each: +{formatNumber(perUnitRate)} {outputCurrency}/s
                      </p>
                      {perUnitInput > 0 && inputCurrency && (
                        <p className="muted">
                          Each uses {formatNumber(perUnitInput)} {inputCurrency}/s
                        </p>
                      )}
                      <p className="muted">
                        Total: +{formatNumber(totalOutput)} {outputCurrency}/s
                      </p>
                      {totalInput > 0 && inputCurrency && (
                        <p className="muted">
                          Total uses {formatNumber(totalInput)} {inputCurrency}/s
                        </p>
                      )}
                    </div>
                    <button
                      className={`btn ${affordable ? 'primary' : 'disabled'}`}
                      onClick={() => handleBuyBuilding(building.id)}
                      disabled={!affordable}
                    >
                      Buy ({formatNumber(cost)} {currency})
                    </button>
                    <button
                      className={`btn ghost ${owned > 0 ? '' : 'disabled'}`}
                      onClick={() => handleSellBuilding(building.id)}
                      disabled={owned <= 0}
                    >
                      Sell (+{formatNumber(refund)} {currency})
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Upgrades</h3>
                <p className="muted">Permanent boosts to your pipeline.</p>
              </div>
            </div>
            {availableUpgrades.length === 0 ? (
              <p className="muted">All upgrades unlocked for now.</p>
            ) : (
              <div className="grid two">
                {availableUpgrades.map((upgrade) => {
                  const affordable = canAffordUpgrade(gameState.resources, upgrade.cost);
                  const costLabel = Object.entries(upgrade.cost)
                    .map(([key, value]) => `${formatNumber(value)} ${key}`)
                    .join(' + ');
                  return (
                    <div key={upgrade.id} className="card">
                      <div>
                        <p className="card-title">{upgrade.name}</p>
                        <p className="muted">{upgrade.description}</p>
                      </div>
                      <button
                        className={`btn ${affordable ? 'accent' : 'disabled'}`}
                        onClick={() => handleBuyUpgrade(upgrade.id)}
                        disabled={!affordable}
                      >
                        Buy ({costLabel})
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {purchasedUpgrades.length > 0 && (
              <div className="purchased">
                <p className="muted">Purchased</p>
                <div className="pill-row">
                  {purchasedUpgrades.map((upgrade) => (
                    <span key={upgrade.id} className="pill">
                      {upgrade.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="stack">
          {rightPanelOrder.map((panelId, index) => {
            const actions = (
              <div className="panel-actions">
                <button
                  className={`icon-btn ${index === 0 ? 'disabled' : ''}`}
                  onClick={() => moveRightPanel(panelId, -1)}
                  disabled={index === 0}
                  aria-label="Move panel up"
                >
                  ↑
                </button>
                <button
                  className={`icon-btn ${index === rightPanelOrder.length - 1 ? 'disabled' : ''}`}
                  onClick={() => moveRightPanel(panelId, 1)}
                  disabled={index === rightPanelOrder.length - 1}
                  aria-label="Move panel down"
                >
                  ↓
                </button>
              </div>
            );

            if (panelId === 'season') {
              return (
                <div key={panelId} className="panel">
                  <div className="panel-header">
                    <h3>Season Push</h3>
                    {actions}
                  </div>
                  <p className="muted">Claim titles for permanent growth.</p>
                  <div className="progress-card">
                    <div className="progress-header">
                      <span>Wins toward title</span>
                      <span>
                        {formatNumber(gameState.resources.wins)} / {formatWhole(championshipRequirement)}
                      </span>
                    </div>
                    <div className="progress">
                      <div
                        className="progress-bar"
                        style={{
                          width: `${Math.min(100, (gameState.resources.wins / championshipRequirement) * 100)}%`
                        }}
                      />
                    </div>
                    <button
                      className={`btn ${gameState.resources.wins >= championshipRequirement ? 'accent' : 'disabled'}`}
                      onClick={handleClaimChampionship}
                      disabled={gameState.resources.wins < championshipRequirement}
                    >
                      Claim championship (+1 title)
                    </button>
                  </div>
                </div>
              );
            }

            if (panelId === 'legacy') {
              return (
                <div key={panelId} className="panel">
                  <div className="panel-header">
                    <div>
                      <h3>Legacy Skill Tree</h3>
                      <p className="muted">Unlock permanent boosts with rebirth currency.</p>
                    </div>
                    {actions}
                  </div>
                  <div className="progress-card">
                    <div className="progress-header">
                      <span>Legacy points</span>
                      <span>{formatWhole(gameState.legacyPoints)} available</span>
                    </div>
                    <div className="snapshot">
                      <span>Combined score: {formatWhole(progressScore)}</span>
                      <span className={scoreRate < 0 ? 'negative' : ''}>
                        Score rate: {formatSignedRate(scoreRate)}
                      </span>
                      <span>
                        ETA to next rebirth:{' '}
                        {nextThreshold
                          ? scoreRate > 0
                            ? formatDuration(timeToNext || 0)
                            : 'stalled'
                          : 'max tier'}
                      </span>
                    </div>
                    <div className="progress">
                      <div
                        className="progress-bar"
                        style={{ width: `${Math.min(100, Math.max(0, progressToNext * 100))}%` }}
                      />
                    </div>
                    <p className="muted">
                      {nextThreshold
                        ? `Next rebirth: ${nextRequirement.title} at ${formatWhole(nextThreshold)} combined score. ${formatWhole(
                            scoreToNext
                          )} remaining.`
                        : 'Automatic tracking unlocked. Rebirths now speed everything up.'}
                    </p>
                  </div>
                  <p className="muted small">
                    Combined score = data + (insights × 5) + (wins × 20) + (fans × 2) + (titles × 500).
                  </p>
                  <div className="grid two">
                    {availableLegacy.map((upgrade) => {
                      const affordable = gameState.legacyPoints >= upgrade.cost;
                      return (
                        <div key={upgrade.id} className="card legacy">
                          <div>
                            <div className="card-title-row">
                              <Icon name="legacy" />
                              <p className="card-title">{upgrade.name}</p>
                            </div>
                            <p className="muted">{upgrade.description}</p>
                            <p className="muted">Requires rebirth {upgrade.requiresRebirths + 1}</p>
                          </div>
                          <button
                            className={`btn ${affordable ? 'accent' : 'disabled'}`}
                            onClick={() => handleBuyLegacyUpgrade(upgrade.id)}
                            disabled={!affordable}
                          >
                            Unlock ({upgrade.cost} legacy)
                          </button>
                        </div>
                      );
                    })}
                    {lockedLegacy.map((upgrade) => (
                      <div key={upgrade.id} className="card legacy locked">
                        <div>
                          <div className="card-title-row">
                            <Icon name="legacy" />
                            <p className="card-title">{upgrade.name}</p>
                          </div>
                          <p className="muted">{upgrade.description}</p>
                          <p className="muted">Unlocks at rebirth {upgrade.requiresRebirths + 1}</p>
                        </div>
                        <button className="btn disabled" disabled>
                          Locked
                        </button>
                      </div>
                    ))}
                  </div>
                  {purchasedLegacy.length > 0 && (
                    <div className="purchased">
                      <p className="muted">Unlocked legacy upgrades</p>
                      <div className="pill-row">
                        {purchasedLegacy.map((upgrade) => (
                          <span key={upgrade.id} className="pill accent">
                            {upgrade.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            if (panelId === 'rebirths') {
              return (
                <div key={panelId} className="panel">
                  <div className="panel-header">
                    <div>
                      <h3>Analyst Rebirths</h3>
                      <p className="muted">Your realistic build-up path, now tied to rebirths.</p>
                    </div>
                    {actions}
                  </div>
                  <div className="milestones">
                    {REBIRTH_STEPS.map((step, index) => {
                      const unlocked = gameState.rebirths >= index;
                      const isCurrent = index === currentStepIndex;
                      return (
                        <div key={step.id} className={`milestone ${unlocked ? 'unlocked' : ''}`}>
                          <div className={`milestone-dot ${isCurrent ? 'active' : ''}`}>{index + 1}</div>
                          <div>
                            <p className="card-title">{step.title}</p>
                            <p className="muted">{step.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="muted small">
                    After Automatic Tracking, rebirths continue as Automation Era +N with increasing score requirements.
                  </p>
                </div>
              );
            }

            if (panelId === 'leaderboard') {
              return (
                <div key={panelId} className="panel">
                  <div className="panel-header">
                    <div>
                      <h3>Leaderboard</h3>
                      <p className="muted">Top 10 titles across players.</p>
                    </div>
                    {actions}
                  </div>
                  <label className="field compact">
                    <span>Display name</span>
                    <input
                      type="text"
                      placeholder="Club name"
                      value={gameState.profileName}
                      onChange={(event) =>
                        setGameState((prev) => ({
                          ...prev,
                          profileName: event.target.value
                        }))
                      }
                      onBlur={handleLeaderboardUpdate}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleLeaderboardUpdate();
                        }
                      }}
                    />
                    <span className="helper">Press Enter to update the leaderboard.</span>
                  </label>
                  {!isSupabaseConfigured && <p className="muted">Supabase not configured yet.</p>}
                  {isSupabaseConfigured && leaderboard.length === 0 && <p className="muted">No entries yet.</p>}
                  {leaderboard.length > 0 && (
                    <div className="leaderboard">
                      {leaderboard.map((entry, index) => (
                        <div key={`${entry.display_name}-${index}`} className="leaderboard-row">
                          <span className="rank">#{index + 1}</span>
                          <span className="name">{entry.display_name || 'Coach'}</span>
                          <span className="score">{formatWhole(entry.titles)} titles</span>
                          <span className="score muted">{formatWhole(entry.wins)} wins</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={panelId} className="panel dark">
                <div className="panel-header">
                  <h3>Next Steps</h3>
                  {actions}
                </div>
                <p>
                  Add Scout Bots early, then balance Analyst Pods and Strategy Labs so your data does not bottleneck. Fans add
                  passive data, so pushing wins keeps everything accelerating.
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default App;
