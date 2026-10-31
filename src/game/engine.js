import {
  ACHIEVEMENTS,
  ACHIEVEMENT_MAP,
  ACTIVE_STEP_SECONDS,
  AUTO_BUY_INTERVAL_MS,
  AUTO_CLAIM_INTERVAL_MS,
  AUTOMATION_UNLOCKS,
  BASE,
  BUILDINGS,
  BUILDING_MAP,
  DEFAULT_SETTINGS,
  LAST_STORY_INDEX,
  LEGACY_UPGRADES,
  LEGACY_UPGRADE_MAP,
  OFFLINE_AUTOMATION_BONUS,
  OFFLINE_BASE_CAP_SECONDS,
  OFFLINE_BASE_RATE,
  OFFLINE_MIN_SECONDS,
  OFFLINE_STEP_SECONDS,
  POST_STORY_SCALE,
  REBIRTH_START_DATA,
  REBIRTH_STEPS,
  RESOURCE_VALUE,
  SAVE_VERSION,
  SCORE_WEIGHTS,
  TITLE_COST_BASE,
  TITLE_COST_SCALE,
  UPGRADES,
  UPGRADE_MAP,
  createDefaultState
} from './config.js';

const EPSILON = 1e-9;

export const clampNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const nonNegative = (value) => Math.max(0, clampNumber(value));

export const nonNegativeInt = (value) => Math.max(0, Math.floor(nonNegative(value)));

const MAX_RESOURCE = Number.MAX_SAFE_INTEGER;
const MAX_COUNT = 1_000_000;
const safeResource = (value) => Math.min(MAX_RESOURCE, nonNegative(value));
const safeCount = (value) => Math.min(MAX_COUNT, nonNegativeInt(value));

export const formatNumber = (value) => {
  const number = clampNumber(value);
  if (number === 0) return '0';
  const absolute = Math.abs(number);
  if (absolute < 10) return number.toFixed(2).replace(/\.?0+$/, '');
  if (absolute < 100) return number.toFixed(1).replace(/\.0$/, '');
  if (absolute < 1000) return Math.round(number).toString();
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2
  }).format(number);
};

export const formatWhole = (value) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.floor(nonNegative(value)));

export const formatRate = (value) => `${formatNumber(value)}/s`;

export const formatSignedRate = (value) => {
  const number = clampNumber(value);
  if (number === 0) return '0/s';
  return `${number > 0 ? '+' : ''}${formatNumber(number)}/s`;
};

export const formatPercent = (value) => `${Math.round(clampNumber(value) * 100)}%`;

export const formatDuration = (seconds) => {
  const safe = Math.max(0, Math.floor(clampNumber(seconds)));
  if (safe < 60) return `${safe}s`;
  const minutes = Math.floor(safe / 60);
  if (minutes < 60) return `${minutes}m ${safe % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
};

export const formatCost = (cost) =>
  Object.entries(cost)
    .map(([key, value]) => `${formatNumber(value)} ${key}`)
    .join(' + ');

export const getFanHypeMultiplier = (fans) =>
  1 + Math.log10(1 + nonNegative(fans)) * BASE.fanHypePerLog;

export const getTitleMultiplier = (titles) =>
  1 + nonNegative(titles) * BASE.titleGlobalBonus;

export const getRebirthMultiplier = (rebirths) =>
  1 + nonNegative(rebirths) * BASE.rebirthGlobalBonus;

export const getChampionshipRequirement = (titles) =>
  Math.ceil(TITLE_COST_BASE * Math.pow(TITLE_COST_SCALE, Math.max(0, titles)));

export const getRebirthRequirement = (rebirths) => {
  const safeRebirths = Math.max(0, Math.floor(clampNumber(rebirths)));
  if (safeRebirths < LAST_STORY_INDEX) {
    return REBIRTH_STEPS[safeRebirths + 1].threshold;
  }
  return Math.round(REBIRTH_STEPS[LAST_STORY_INDEX].threshold * Math.pow(POST_STORY_SCALE, safeRebirths - (LAST_STORY_INDEX - 1)));
};

export const getStoryStep = (rebirths) =>
  REBIRTH_STEPS[Math.min(Math.max(0, Math.floor(clampNumber(rebirths))), LAST_STORY_INDEX)];

export const getNextStoryStep = (rebirths) =>
  rebirths < LAST_STORY_INDEX ? REBIRTH_STEPS[rebirths + 1] : null;

export const isAutomationUnlocked = (state, key) => {
  const unlock = AUTOMATION_UNLOCKS[key];
  if (!unlock) return false;
  return state.rebirths >= unlock.requiredRebirths;
};

export const getModifiers = (state) => {
  const modifiers = {
    clickBonus: 0,
    dataMult: 1,
    insightMult: 1,
    winMult: 1,
    fanMult: 1,
    globalMult: 1,
    offlineRateBonus: 0,
    offlineCapBonus: 0
  };

  const upgradeIds = [...(state.upgrades || []), ...(state.legacyUpgrades || [])];
  upgradeIds.forEach((upgradeId) => {
    const upgrade = UPGRADE_MAP[upgradeId] || LEGACY_UPGRADE_MAP[upgradeId];
    if (!upgrade?.effect) return;
    const { type, value } = upgrade.effect;
    if (type === 'clickBonus') modifiers.clickBonus += value;
    if (type === 'dataMult') modifiers.dataMult *= value;
    if (type === 'insightMult') modifiers.insightMult *= value;
    if (type === 'winMult') modifiers.winMult *= value;
    if (type === 'fanMult') modifiers.fanMult *= value;
    if (type === 'globalMult') modifiers.globalMult *= value;
    if (type === 'offlineRate') modifiers.offlineRateBonus += value;
    if (type === 'offlineCap') modifiers.offlineCapBonus += value;
  });

  modifiers.globalMult *= getRebirthMultiplier(state.rebirths);
  modifiers.globalMult *= getTitleMultiplier(state.resources.titles);
  modifiers.globalMult *= getFanHypeMultiplier(state.resources.fans);
  return modifiers;
};

export const getRates = (state) => {
  const modifiers = getModifiers(state);
  const dataPerSec =
    (state.buildings.scout * BASE.scoutDataPerSec + state.resources.fans * BASE.fanDataPerSec) *
    modifiers.dataMult *
    modifiers.globalMult;
  const insightPerSec =
    state.buildings.analyst * BASE.analystInsightPerSec * modifiers.insightMult * modifiers.globalMult;
  const winPerSec = state.buildings.strategy * BASE.strategyWinPerSec * modifiers.winMult * modifiers.globalMult;
  const fanPerSec = state.buildings.marketing * BASE.marketingFanPerSec * modifiers.fanMult * modifiers.globalMult;
  const dataPerClick =
    (BASE.dataPerClick + modifiers.clickBonus) * modifiers.globalMult +
    dataPerSec * BASE.clickProductionShare;

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

export const getBuildingPerUnitRate = (building, modifiers) => {
  if (!building) return 0;
  switch (building.id) {
    case 'scout':
      return BASE.scoutDataPerSec * modifiers.dataMult * modifiers.globalMult;
    case 'analyst':
      return BASE.analystInsightPerSec * modifiers.insightMult * modifiers.globalMult;
    case 'strategy':
      return BASE.strategyWinPerSec * modifiers.winMult * modifiers.globalMult;
    case 'marketing':
      return BASE.marketingFanPerSec * modifiers.fanMult * modifiers.globalMult;
    default:
      return 0;
  }
};

export const getBuildingInputPerUnit = (building, outputRate) => {
  if (!building?.inputCurrency) return 0;
  return outputRate * building.inputPerOutput;
};

export const getEffectiveRates = (state, rates = getRates(state)) => {
  const dataSupply = Math.max(0, state.resources.data + rates.dataPerSec);
  const possibleInsights = state.settings.convert.insights ? Math.max(0, rates.insightPerSec) : 0;
  const maxInsightsByData = dataSupply / rates.dataCostPerInsight;
  const actualInsights = Math.max(0, Math.min(possibleInsights, maxInsightsByData));
  const dataAfter = dataSupply - actualInsights * rates.dataCostPerInsight;

  const insightSupply = Math.max(0, state.resources.insights + actualInsights);
  const possibleWins = state.settings.convert.wins ? Math.max(0, rates.winPerSec) : 0;
  const maxWinsByInsights = insightSupply / rates.insightCostPerWin;
  const actualWins = Math.max(0, Math.min(possibleWins, maxWinsByInsights));
  const insightsAfter = insightSupply - actualWins * rates.insightCostPerWin;

  const winSupply = Math.max(0, state.resources.wins + actualWins);
  const possibleFans = state.settings.convert.fans ? Math.max(0, rates.fanPerSec) : 0;
  const maxFansByWins = winSupply / rates.winCostPerFan;
  const actualFans = Math.max(0, Math.min(possibleFans, maxFansByWins));
  const winsAfter = winSupply - actualFans * rates.winCostPerFan;

  return {
    dataNet: dataAfter - state.resources.data,
    insightsNet: insightsAfter - state.resources.insights,
    winsNet: winsAfter - state.resources.wins,
    fansNet: actualFans,
    insightsProduced: actualInsights,
    winsProduced: actualWins,
    fansProduced: actualFans,
    dataUsed: actualInsights * rates.dataCostPerInsight,
    insightsUsed: actualWins * rates.insightCostPerWin,
    winsUsed: actualFans * rates.winCostPerFan
  };
};

export const getScoreRate = (state, rates = getRates(state), effective = getEffectiveRates(state, rates)) =>
  Math.max(0, rates.dataPerSec) * SCORE_WEIGHTS.data +
  effective.insightsProduced * SCORE_WEIGHTS.insights +
  effective.winsProduced * SCORE_WEIGHTS.wins +
  effective.fansProduced * SCORE_WEIGHTS.fans;

export const getOfflineSettings = (state) => {
  const modifiers = getModifiers(state);
  const rate = Math.min(
    0.95,
    OFFLINE_BASE_RATE +
      (state.rebirths >= LAST_STORY_INDEX ? OFFLINE_AUTOMATION_BONUS : 0) +
      modifiers.offlineRateBonus
  );
  return {
    rate,
    capSeconds: OFFLINE_BASE_CAP_SECONDS + modifiers.offlineCapBonus
  };
};

export const getBuildingCost = (building, owned, amount) => {
  if (!building) return 0;
  const safeOwned = Math.max(0, nonNegativeInt(owned));
  const safeAmount = Math.max(1, Math.floor(clampNumber(amount)));
  const base = building.baseCost;
  const mult = building.costMult;
  if (safeAmount <= 1) return base * Math.pow(mult, safeOwned);
  return (base * Math.pow(mult, safeOwned) * (Math.pow(mult, safeAmount) - 1)) / (mult - 1);
};

export const getBuildingRefund = (building, owned, amount, refundRate = 0.5) => {
  if (!building) return 0;
  const safeOwned = Math.max(0, nonNegativeInt(owned));
  const sellAmount = Math.min(Math.max(0, Math.floor(clampNumber(amount))), safeOwned);
  if (sellAmount <= 0) return 0;
  const startIndex = safeOwned - sellAmount;
  const base = building.baseCost;
  const mult = building.costMult;
  const totalCost = (base * Math.pow(mult, startIndex) * (Math.pow(mult, sellAmount) - 1)) / (mult - 1);
  return totalCost * refundRate;
};

export const getMaxAffordableAmount = (state, building) => {
  if (!building) return 0;
  const owned = state.buildings[building.id] || 0;
  const currency = building.costCurrency;
  const available = Math.max(0, state.resources[currency] || 0);
  const base = building.baseCost * Math.pow(building.costMult, owned);
  if (available + EPSILON < base) return 0;
  const mult = building.costMult;
  const raw = Math.floor(Math.log((available * (mult - 1)) / base + 1) / Math.log(mult));
  let amount = Math.max(0, Math.min(raw, 100000));
  while (amount > 0 && getBuildingCost(building, owned, amount) > available + EPSILON) amount -= 1;
  while (amount < 100000 && getBuildingCost(building, owned, amount + 1) <= available + EPSILON) amount += 1;
  return amount;
};

export const getBuildingCostForAmount = (state, building, amount) => {
  const owned = state.buildings[building.id] || 0;
  if (amount === 'max') {
    const max = getMaxAffordableAmount(state, building);
    return { amount: max, cost: getBuildingCost(building, owned, Math.max(1, max)) };
  }
  const safeAmount = Math.max(1, Math.floor(clampNumber(amount)));
  return { amount: safeAmount, cost: getBuildingCost(building, owned, safeAmount) };
};

export const canAfford = (resources, cost) =>
  Object.entries(cost).every(([key, value]) => (resources[key] || 0) + EPSILON >= value);

export const spendResources = (resources, cost) => {
  const next = { ...resources };
  Object.entries(cost).forEach(([key, value]) => {
    next[key] = Math.max(0, (next[key] || 0) - value);
  });
  return next;
};

export const getProgressScore = (state) =>
  Object.entries(SCORE_WEIGHTS).reduce((total, [key, weight]) => {
    if (key === 'titles') return total + (state.resources?.titles || 0) * weight;
    return total + (state.resources?.[key] || 0) * weight;
  }, 0);

export const getLegacyGain = (state) => {
  const threshold = getRebirthRequirement(state.rebirths);
  if (state.run.score + EPSILON < threshold) return 0;
  if (state.rebirths < LAST_STORY_INDEX) return 1;
  const overshoot = Math.max(0, state.run.score - threshold);
  return 1 + Math.floor(overshoot / (threshold * 0.5));
};

export const getNextLegacyGain = (state) => {
  const gain = getLegacyGain(state);
  if (gain > 0) return gain;
  if (state.rebirths < LAST_STORY_INDEX) return 1;
  return 1;
};

export const getRebirthProgress = (state) => {
  const threshold = getRebirthRequirement(state.rebirths);
  return threshold > 0 ? Math.min(1, Math.max(0, state.run.score / threshold)) : 0;
};

export const canRebirth = (state) => state.run.score + EPSILON >= getRebirthRequirement(state.rebirths);

export const canClaimTitle = (state) =>
  state.resources.wins + EPSILON >= getChampionshipRequirement(state.resources.titles);

export const getScoreWeightsLabel = () =>
  `Run score = data + insights × 3 + wins × 6 + fans × 6 + titles × 150.`;

const cloneState = (state) => ({
  ...state,
  resources: { ...state.resources },
  buildings: { ...state.buildings },
  upgrades: [...state.upgrades],
  legacyUpgrades: [...state.legacyUpgrades],
  achievements: [...state.achievements],
  run: {
    ...state.run,
    produced: { ...state.run.produced }
  },
  stats: {
    ...state.stats,
    lifetime: { ...state.stats.lifetime },
    best: { ...state.stats.best },
    lastRun: state.stats.lastRun
  },
  settings: {
    ...state.settings,
    convert: { ...state.settings.convert }
  },
  lastOffline: state.lastOffline,
  lastAutoRebirth: state.lastAutoRebirth
});

const unlockAchievements = (state) => {
  const unlocked = new Set(state.achievements);
  let changed = false;
  ACHIEVEMENTS.forEach((achievement) => {
    if (unlocked.has(achievement.id)) return;
    if (achievement.check(state)) {
      unlocked.add(achievement.id);
      changed = true;
    }
  });
  if (!changed) return state;
  return { ...state, achievements: [...unlocked] };
};

export const finalizeState = (state) => {
  const best = {
    ...state.stats.best,
    runScore: Math.max(state.stats.best.runScore, state.run.score),
    titles: Math.max(state.stats.best.titles, state.resources.titles),
    wins: Math.max(state.stats.best.wins, state.run.produced.wins),
    rebirth: Math.max(state.stats.best.rebirth, state.rebirths),
    scoreRate: Math.max(state.stats.best.scoreRate, state.run.scoreRate || 0)
  };
  return unlockAchievements({ ...state, stats: { ...state.stats, best } });
};

export const applyDelta = (state, seconds, options = {}) => {
  const safeSeconds = Math.max(0, Math.min(clampNumber(seconds), 366 * 24 * 60 * 60));
  const mode = options.mode || 'active';
  const step = mode === 'offline' ? OFFLINE_STEP_SECONDS : ACTIVE_STEP_SECONDS;
  const draft = cloneState(state);
  const produced = { data: 0, insights: 0, wins: 0, fans: 0 };
  let remaining = safeSeconds;

  while (remaining > EPSILON) {
    const dt = Math.min(step, remaining);
    const rates = getRates(draft);

    const dataProduced = Math.max(0, rates.dataPerSec) * dt;
    draft.resources.data += dataProduced;
    produced.data += dataProduced;

    if (draft.settings.convert.insights) {
      const possibleInsights = Math.max(0, rates.insightPerSec) * dt;
      const actualInsights = Math.min(
        possibleInsights,
        Math.max(0, draft.resources.data / rates.dataCostPerInsight)
      );
      draft.resources.data = Math.max(0, draft.resources.data - actualInsights * rates.dataCostPerInsight);
      draft.resources.insights += actualInsights;
      produced.insights += actualInsights;
    }

    if (draft.settings.convert.wins) {
      const possibleWins = Math.max(0, rates.winPerSec) * dt;
      const actualWins = Math.min(
        possibleWins,
        Math.max(0, draft.resources.insights / rates.insightCostPerWin)
      );
      draft.resources.insights = Math.max(0, draft.resources.insights - actualWins * rates.insightCostPerWin);
      draft.resources.wins += actualWins;
      produced.wins += actualWins;
    }

    if (draft.settings.convert.fans) {
      const possibleFans = Math.max(0, rates.fanPerSec) * dt;
      const actualFans = Math.min(
        possibleFans,
        Math.max(0, draft.resources.wins / rates.winCostPerFan)
      );
      draft.resources.wins = Math.max(0, draft.resources.wins - actualFans * rates.winCostPerFan);
      draft.resources.fans += actualFans;
      produced.fans += actualFans;
    }

    remaining -= dt;
  }

  draft.run.produced.data += produced.data;
  draft.run.produced.insights += produced.insights;
  draft.run.produced.wins += produced.wins;
  draft.run.produced.fans += produced.fans;

  const scoreGained =
    produced.data * SCORE_WEIGHTS.data +
    produced.insights * SCORE_WEIGHTS.insights +
    produced.wins * SCORE_WEIGHTS.wins +
    produced.fans * SCORE_WEIGHTS.fans;

  draft.run.score += scoreGained;
  draft.run.scoreRate = safeSeconds > 0 ? scoreGained / safeSeconds : 0;

  const lifetime = draft.stats.lifetime;
  lifetime.data += produced.data;
  lifetime.insights += produced.insights;
  lifetime.wins += produced.wins;
  lifetime.fans += produced.fans;
  if (mode !== 'offline') lifetime.playSeconds += safeSeconds;

  return {
    state: finalizeState(draft),
    produced,
    scoreGained
  };
};

export const applyTick = (state, now, seconds) => {
  const result = applyDelta(state, seconds, { mode: 'active' });
  let next = runAutomation(result.state, now);
  next = { ...next, lastUpdated: now };
  return { ...result, state: finalizeState(next) };
};

export const applyOffline = (state, now) => {
  const elapsedSeconds = Math.max(0, (now - state.lastUpdated) / 1000);
  if (elapsedSeconds < OFFLINE_MIN_SECONDS) {
    return { ...state, lastUpdated: now, lastOffline: null };
  }

  const settings = getOfflineSettings(state);
  const capped = elapsedSeconds > settings.capSeconds;
  const effectiveSeconds = Math.min(elapsedSeconds, settings.capSeconds) * settings.rate;
  const result = applyDelta(state, effectiveSeconds, { mode: 'offline' });
  const hasGains = Object.values(result.produced).some((value) => value > 0.0001);
  const next = {
    ...result.state,
    stats: {
      ...result.state.stats,
      lifetime: {
        ...result.state.stats.lifetime,
        offlineSeconds: result.state.stats.lifetime.offlineSeconds + elapsedSeconds
      }
    },
    lastUpdated: now,
    lastOffline: hasGains
      ? {
          elapsedSeconds,
          effectiveSeconds,
          capped,
          rate: settings.rate,
          capSeconds: settings.capSeconds,
          produced: result.produced,
          scoreGained: result.scoreGained,
          at: now
        }
      : null
  };
  return finalizeState(next);
};

const getAutoBuyTarget = (state) => {
  const affordable = BUILDINGS.filter((building) => getMaxAffordableAmount(state, building) > 0);
  if (affordable.length === 0) return null;
  const has = (id) => affordable.some((building) => building.id === id);
  const cost = (id) => getBuildingCost(BUILDING_MAP[id], state.buildings[id] || 0, 1);

  if ((state.buildings.scout || 0) === 0) return has('scout') ? 'scout' : null;
  if ((state.buildings.analyst || 0) === 0 && has('analyst')) return 'analyst';
  if ((state.buildings.strategy || 0) === 0 && has('strategy')) return 'strategy';
  if ((state.buildings.marketing || 0) === 0 && has('marketing')) return 'marketing';

  const rates = getRates(state);
  const effective = getEffectiveRates(state, rates);

  if (state.settings.convert.insights && effective.dataNet <= EPSILON && has('scout')) return 'scout';
  if (state.settings.convert.wins && effective.insightsNet <= EPSILON && has('analyst')) return 'analyst';
  if (state.settings.convert.fans && effective.winsNet <= EPSILON && has('strategy')) return 'strategy';
  if ((state.buildings.marketing || 0) > 0 && (state.buildings.strategy || 0) / Math.max(1, state.buildings.marketing) < 2) {
    if (has('strategy') && cost('strategy') < cost('marketing')) return 'strategy';
    if (has('marketing')) return 'marketing';
  }

  const modifiers = rates.modifiers;
  const scored = affordable
    .map((building) => {
      const outputRate = getBuildingPerUnitRate(building, modifiers);
      const value = outputRate * (RESOURCE_VALUE[building.outputCurrency] || 1);
      return {
        id: building.id,
        ratio: value / Math.max(1, getBuildingCost(building, state.buildings[building.id] || 0, 1))
      };
    })
    .sort((left, right) => right.ratio - left.ratio);

  return scored[0]?.id || null;
};

export const runAutomation = (state, now = Date.now()) => {
  let next = state;

  if (
    isAutomationUnlocked(next, 'autoClaimTitles') &&
    next.settings.autoClaimTitles &&
    canClaimTitle(next) &&
    now - (next.lastAutoClaimAt || 0) >= AUTO_CLAIM_INTERVAL_MS
  ) {
    next = claimTitle(next);
    next = { ...next, lastAutoClaimAt: now };
  }

  if (
    isAutomationUnlocked(next, 'autoBuy') &&
    next.settings.autoBuy &&
    now - (next.lastAutoBuyAt || 0) >= AUTO_BUY_INTERVAL_MS
  ) {
    const target = getAutoBuyTarget(next);
    if (target) {
      next = buyBuilding(next, target, 1);
      next = { ...next, lastAutoBuyAt: now };
    }
  }

  if (isAutomationUnlocked(next, 'autoRebirth') && next.settings.autoRebirth && canRebirth(next)) {
    const threshold = getRebirthRequirement(next.rebirths);
    if (next.run.score + EPSILON >= threshold * 1.5) {
      const result = performRebirth(next, now, true);
      next = result.state;
    }
  }

  return finalizeState(next);
};

export const click = (state) => {
  const rates = getRates(state);
  const amount = Math.max(0, rates.dataPerClick);
  const draft = cloneState(state);
  draft.resources.data += amount;
  draft.run.produced.data += amount;
  draft.run.score += amount * SCORE_WEIGHTS.data;
  draft.stats.lifetime.data += amount;
  draft.stats.lifetime.clicks += 1;
  return finalizeState(draft);
};

export const buyBuilding = (state, buildingId, amount = 1) => {
  const building = BUILDING_MAP[buildingId];
  if (!building) return state;
  const owned = state.buildings[buildingId] || 0;
  const resolved = amount === 'max' ? getMaxAffordableAmount(state, building) : Math.max(1, Math.floor(nonNegative(amount)));
  if (resolved <= 0) return state;
  const cost = getBuildingCost(building, owned, resolved);
  if ((state.resources[building.costCurrency] || 0) + EPSILON < cost) return state;
  const draft = cloneState(state);
  draft.resources[building.costCurrency] = Math.max(0, draft.resources[building.costCurrency] - cost);
  draft.buildings[buildingId] = owned + resolved;
  return finalizeState(draft);
};

export const sellBuilding = (state, buildingId, amount = 1) => {
  const building = BUILDING_MAP[buildingId];
  if (!building) return state;
  const owned = state.buildings[buildingId] || 0;
  if (owned <= 0) return state;
  const sellAmount = Math.min(owned, Math.max(1, Math.floor(nonNegative(amount))));
  const refund = getBuildingRefund(building, owned, sellAmount);
  const draft = cloneState(state);
  draft.buildings[buildingId] = owned - sellAmount;
  draft.resources[building.costCurrency] += refund;
  return finalizeState(draft);
};

export const buyUpgrade = (state, upgradeId) => {
  const upgrade = UPGRADE_MAP[upgradeId];
  if (!upgrade) return state;
  if (state.upgrades.includes(upgradeId)) return state;
  if (!canAfford(state.resources, upgrade.cost)) return state;
  const draft = cloneState(state);
  draft.resources = spendResources(draft.resources, upgrade.cost);
  draft.upgrades.push(upgradeId);
  return finalizeState(draft);
};

export const claimTitle = (state) => {
  const cost = getChampionshipRequirement(state.resources.titles);
  if (state.resources.wins + EPSILON < cost) return state;
  const draft = cloneState(state);
  draft.resources.wins = Math.max(0, draft.resources.wins - cost);
  draft.resources.titles += 1;
  draft.run.score += SCORE_WEIGHTS.titles;
  draft.stats.lifetime.titles += 1;
  return finalizeState(draft);
};

export const buyLegacyUpgrade = (state, upgradeId) => {
  const upgrade = LEGACY_UPGRADE_MAP[upgradeId];
  if (!upgrade) return state;
  if (state.legacyUpgrades.includes(upgradeId)) return state;
  if (state.rebirths < upgrade.requiresRebirths) return state;
  if (state.legacyPoints + EPSILON < upgrade.cost) return state;
  const draft = cloneState(state);
  draft.legacyPoints -= upgrade.cost;
  draft.legacyUpgrades.push(upgradeId);
  return finalizeState(draft);
};

export const performRebirth = (state, now = Date.now(), auto = false) => {
  if (!canRebirth(state)) return { state, gain: 0, storyStep: null };
  const gain = getLegacyGain(state);
  const nextRebirths = state.rebirths + 1;
  const storyStep =
    nextRebirths <= LAST_STORY_INDEX ? REBIRTH_STEPS[nextRebirths] : null;

  const best = {
    ...state.stats.best,
    runScore: Math.max(state.stats.best.runScore, state.run.score),
    titles: Math.max(state.stats.best.titles, state.resources.titles),
    wins: Math.max(state.stats.best.wins, state.run.produced.wins),
    rebirth: Math.max(state.stats.best.rebirth, state.rebirths),
    scoreRate: Math.max(state.stats.best.scoreRate, state.run.scoreRate || 0)
  };

  const base = createDefaultState(now);
  const next = {
    ...base,
    resources: { ...base.resources, data: REBIRTH_START_DATA },
    legacyUpgrades: [...state.legacyUpgrades],
    achievements: [...state.achievements],
    rebirths: nextRebirths,
    legacyPoints: state.legacyPoints + gain,
    profileName: state.profileName,
    settings: {
      ...state.settings,
      convert: { ...state.settings.convert }
    },
    stats: {
      ...state.stats,
      lifetime: { ...state.stats.lifetime, rebirths: state.stats.lifetime.rebirths + 1 },
      best,
      lastRun: {
        runScore: state.run.score,
        titles: state.resources.titles,
        wins: state.run.produced.wins,
        rebirths: state.rebirths,
        at: now
      }
    },
    lastAutoRebirth: auto ? { gain, at: now, rebirths: nextRebirths } : null
  };

  return { state: finalizeState(next), gain, storyStep };
};

export const setBuyAmount = (state, amount) => ({
  ...state,
  settings: {
    ...state.settings,
    buyAmount: amount === 'max' ? 'max' : Number(amount) === 10 ? 10 : 1
  }
});

export const toggleConversion = (state, stage) => {
  if (!['insights', 'wins', 'fans'].includes(stage)) return state;
  return {
    ...state,
    settings: {
      ...state.settings,
      convert: {
        ...state.settings.convert,
        [stage]: !state.settings.convert[stage]
      }
    }
  };
};

export const toggleAutomation = (state, key) => {
  if (!AUTOMATION_UNLOCKS[key]) return state;
  if (!isAutomationUnlocked(state, key)) return state;
  return {
    ...state,
    settings: {
      ...state.settings,
      [key]: !state.settings[key]
    }
  };
};

export const setProfileName = (state, name) => ({
  ...state,
  profileName: String(name || '').slice(0, 24)
});

export const getBottleneck = (state) => {
  const rates = getRates(state);
  const effective = getEffectiveRates(state, rates);
  const titleCost = getChampionshipRequirement(state.resources.titles);

  if (state.buildings.scout <= 0) {
    return {
      key: 'scout',
      title: 'Start with a Scout Bot',
      detail: 'Scouts generate the raw data everything else depends on.',
      action: { type: 'BUY_BUILDING', id: 'scout', amount: 1 },
      cta: `Buy Scout (${formatNumber(getBuildingCost(BUILDING_MAP.scout, 0, 1))} data)`
    };
  }

  if (state.resources.wins + EPSILON >= titleCost) {
    return {
      key: 'title',
      title: 'Silverware is within reach',
      detail: `Claim a title for +${formatPercent(BASE.titleGlobalBonus)} global output this run.`,
      action: { type: 'CLAIM_TITLE' },
      cta: 'Claim championship'
    };
  }

  if (state.buildings.analyst > 0 && state.settings.convert.insights && effective.dataNet <= EPSILON) {
    return {
      key: 'data',
      title: 'Data is the bottleneck',
      detail: 'Your analysts are waiting for raw data. Add Scouts to feed the pipeline.',
      action: { type: 'BUY_BUILDING', id: 'scout', amount: 1 },
      cta: `Buy Scout (${formatNumber(getBuildingCost(BUILDING_MAP.scout, state.buildings.scout, 1))} data)`
    };
  }

  if (state.buildings.strategy > 0 && state.settings.convert.wins && effective.insightsNet <= EPSILON) {
    return {
      key: 'insights',
      title: 'Insights are the bottleneck',
      detail: 'Your strategy labs are waiting on insights. Add Analyst Pods.',
      action: { type: 'BUY_BUILDING', id: 'analyst', amount: 1 },
      cta: `Buy Analyst (${formatNumber(getBuildingCost(BUILDING_MAP.analyst, state.buildings.analyst, 1))} data)`
    };
  }

  if (state.buildings.marketing > 0 && state.settings.convert.fans && effective.winsNet <= EPSILON) {
    return {
      key: 'wins',
      title: 'Wins are the bottleneck',
      detail: 'Fan Outreach is eating every win. Add Strategy Labs or pause fan conversion.',
      action: { type: 'BUY_BUILDING', id: 'strategy', amount: 1 },
      cta: `Buy Strategy (${formatNumber(getBuildingCost(BUILDING_MAP.strategy, state.buildings.strategy, 1))} insights)`
    };
  }

  if (canRebirth(state)) {
    return {
      key: 'rebirth',
      title: 'Ready for a new notebook',
      detail: `Rebirth now for ${formatWhole(getLegacyGain(state))} legacy point(s) and keep your permanent upgrades.`,
      action: { type: 'OPEN_REBIRTH' },
      cta: 'Open rebirth'
    };
  }

  if (state.buildings.analyst <= 0 && state.resources.data >= getBuildingCost(BUILDING_MAP.analyst, 0, 1)) {
    return {
      key: 'analyst',
      title: 'Turn data into insights',
      detail: 'Analyst Pods unlock the next stage of the pipeline.',
      action: { type: 'BUY_BUILDING', id: 'analyst', amount: 1 },
      cta: 'Buy Analyst Pod'
    };
  }

  if (state.buildings.strategy <= 0 && state.resources.insights >= getBuildingCost(BUILDING_MAP.strategy, 0, 1)) {
    return {
      key: 'strategy',
      title: 'Convert insights into wins',
      detail: 'Strategy Labs unlock championships and fan growth.',
      action: { type: 'BUY_BUILDING', id: 'strategy', amount: 1 },
      cta: 'Buy Strategy Lab'
    };
  }

  if (state.buildings.marketing <= 0 && state.resources.wins >= getBuildingCost(BUILDING_MAP.marketing, 0, 1)) {
    return {
      key: 'marketing',
      title: 'Build the fanbase',
      detail: 'Fans add data and a global hype multiplier. Fan Outreach is the final stage.',
      action: { type: 'BUY_BUILDING', id: 'marketing', amount: 1 },
      cta: 'Buy Fan Outreach'
    };
  }

  const affordable = BUILDINGS.filter((building) => getMaxAffordableAmount(state, building) > 0);
  if (affordable.length > 0) {
    const nextBuilding = affordable.sort((left, right) => {
      const leftCost = getBuildingCost(left, state.buildings[left.id] || 0, 1);
      const rightCost = getBuildingCost(right, state.buildings[right.id] || 0, 1);
      return leftCost - rightCost;
    })[0];
    return {
      key: 'scale',
      title: 'Keep the pipeline moving',
      detail: 'You can afford another building. Add capacity before the next bottleneck arrives.',
      action: { type: 'BUY_BUILDING', id: nextBuilding.id, amount: 1 },
      cta: `Buy ${nextBuilding.name}`
    };
  }

  return {
    key: 'save',
    title: 'Save for the next step',
    detail: 'Run a few data pulls or wait for production, then invest in the next building.',
    action: { type: 'CLICK' },
    cta: 'Run data pull'
  };
};

export const getBuildingContribution = (state) => {
  const modifiers = getModifiers(state);
  const rows = BUILDINGS.map((building) => {
    const perUnit = getBuildingPerUnitRate(building, modifiers);
    const owned = state.buildings[building.id] || 0;
    const outputRate = perUnit * owned;
    const value = outputRate * (RESOURCE_VALUE[building.outputCurrency] || 1);
    return {
      id: building.id,
      name: building.name,
      owned,
      outputRate,
      outputCurrency: building.outputCurrency,
      value
    };
  });
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return rows.map((row) => ({ ...row, share: total > 0 ? row.value / total : 0 }));
};

export const getGrossOutputValue = (state) => {
  const rates = getRates(state);
  const effective = getEffectiveRates(state, rates);
  return (
    rates.dataPerSec * SCORE_WEIGHTS.data +
    effective.insightsProduced * SCORE_WEIGHTS.insights +
    effective.winsProduced * SCORE_WEIGHTS.wins +
    effective.fansProduced * SCORE_WEIGHTS.fans
  );
};

export const getUpgradeImpact = (state, upgrade) => {
  if (!upgrade?.effect) return '';
  const rates = getRates(state);
  const effective = getEffectiveRates(state, rates);
  const { type, value } = upgrade.effect;

  switch (type) {
    case 'clickBonus':
      return `+${formatNumber(value)} per click`;
    case 'dataMult':
      return `+${formatPercent(value - 1)} data/s ≈ +${formatNumber(rates.dataPerSec * (value - 1))}/s`;
    case 'insightMult':
      return `+${formatPercent(value - 1)} insights/s ≈ +${formatNumber(
        effective.insightsProduced * (value - 1)
      )} insights/s`;
    case 'winMult':
      return `+${formatPercent(value - 1)} wins/s ≈ +${formatNumber(effective.winsProduced * (value - 1))} wins/s`;
    case 'fanMult':
      return `+${formatPercent(value - 1)} fans/s ≈ +${formatNumber(effective.fansProduced * (value - 1))} fans/s`;
    case 'globalMult':
      return `+${formatPercent(value - 1)} all output ≈ +${formatNumber(getGrossOutputValue(state) * (value - 1))} data-equiv/s`;
    case 'offlineRate':
      return `+${formatPercent(value)} offline rate`;
    case 'offlineCap':
      return `+${formatNumber(value / 3600)}h offline cap`;
    default:
      return '';
  }
};

export const getUpgradeEffectLabel = (upgrade) => {
  if (!upgrade?.effect) return '';
  const { type, value } = upgrade.effect;
  switch (type) {
    case 'clickBonus':
      return `+${formatNumber(value)} data/click`;
    case 'dataMult':
      return `+${formatPercent(value - 1)} data/s`;
    case 'insightMult':
      return `+${formatPercent(value - 1)} insights/s`;
    case 'winMult':
      return `+${formatPercent(value - 1)} wins/s`;
    case 'fanMult':
      return `+${formatPercent(value - 1)} fans/s`;
    case 'globalMult':
      return `+${formatPercent(value - 1)} all output`;
    case 'offlineRate':
      return `+${formatPercent(value)} offline rate`;
    case 'offlineCap':
      return `+${formatNumber(value / 3600)}h offline cap`;
    default:
      return '';
  }
};

export const getAvailableUpgrades = (state) =>
  UPGRADES.filter((upgrade) => !state.upgrades.includes(upgrade.id)).sort((left, right) => {
    if (left.tier !== right.tier) return left.tier - right.tier;
    const leftCost = Object.values(left.cost)[0] || 0;
    const rightCost = Object.values(right.cost)[0] || 0;
    return leftCost - rightCost;
  });

export const getPurchasedUpgrades = (state) =>
  UPGRADES.filter((upgrade) => state.upgrades.includes(upgrade.id));

export const getAvailableLegacyUpgrades = (state) =>
  LEGACY_UPGRADES.filter(
    (upgrade) =>
      !state.legacyUpgrades.includes(upgrade.id) && state.rebirths >= upgrade.requiresRebirths
  );

export const getLockedLegacyUpgrades = (state) =>
  LEGACY_UPGRADES.filter(
    (upgrade) =>
      !state.legacyUpgrades.includes(upgrade.id) && state.rebirths < upgrade.requiresRebirths
  );

export const getPurchasedLegacyUpgrades = (state) =>
  LEGACY_UPGRADES.filter((upgrade) => state.legacyUpgrades.includes(upgrade.id));

export const getAutomationRows = (state) =>
  Object.entries(AUTOMATION_UNLOCKS).map(([key, unlock]) => ({
    key,
    ...unlock,
    unlocked: state.rebirths >= unlock.requiredRebirths,
    enabled: Boolean(state.settings[key])
  }));

const isValidUpgradeId = (id) => Boolean(UPGRADE_MAP[id]);
const isValidLegacyId = (id) => Boolean(LEGACY_UPGRADE_MAP[id]);
const isValidAchievementId = (id) => Boolean(ACHIEVEMENT_MAP[id]);

const migrateLegacyState = (raw, now) => {
  const resources = { ...createDefaultState(now).resources, ...(raw.resources || {}) };
  const runScore =
    nonNegative(resources.data) * SCORE_WEIGHTS.data +
    nonNegative(resources.insights) * SCORE_WEIGHTS.insights +
    nonNegative(resources.wins) * SCORE_WEIGHTS.wins +
    nonNegative(resources.fans) * SCORE_WEIGHTS.fans +
    nonNegative(resources.titles) * SCORE_WEIGHTS.titles;

  return {
    ...raw,
    version: SAVE_VERSION,
    run: {
      score: runScore,
      scoreRate: 0,
      produced: {
        data: nonNegative(resources.data),
        insights: nonNegative(resources.insights),
        wins: nonNegative(resources.wins),
        fans: nonNegative(resources.fans)
      },
      startedAt: clampNumber(raw.lastUpdated) || now
    },
    stats: {
      lifetime: {
        data: nonNegative(resources.data),
        insights: nonNegative(resources.insights),
        wins: nonNegative(resources.wins),
        fans: nonNegative(resources.fans),
        titles: nonNegative(resources.titles),
        clicks: nonNegativeInt(raw.totalClicks),
        rebirths: nonNegativeInt(raw.rebirths),
        playSeconds: 0,
        offlineSeconds: 0
      },
      best: {
        runScore,
        titles: nonNegativeInt(resources.titles),
        wins: nonNegative(resources.wins),
        rebirth: nonNegativeInt(raw.rebirths),
        scoreRate: 0
      },
      lastRun: null
    },
    settings: {
      ...DEFAULT_SETTINGS,
      convert: { ...DEFAULT_SETTINGS.convert }
    },
    achievements: []
  };
};

export const normalizeState = (raw, now = Date.now()) => {
  if (!raw || typeof raw !== 'object') return createDefaultState(now);
  const migrated =
    Number(raw.version) >= SAVE_VERSION ? raw : migrateLegacyState(raw, now);
  const defaults = createDefaultState(now);

  const state = {
    ...defaults,
    ...migrated,
    resources: { ...defaults.resources, ...(migrated.resources || {}) },
    buildings: { ...defaults.buildings, ...(migrated.buildings || {}) },
    run: {
      ...defaults.run,
      ...(migrated.run || {}),
      produced: { ...defaults.run.produced, ...(migrated.run?.produced || {}) }
    },
    stats: {
      ...defaults.stats,
      ...(migrated.stats || {}),
      lifetime: { ...defaults.stats.lifetime, ...(migrated.stats?.lifetime || {}) },
      best: { ...defaults.stats.best, ...(migrated.stats?.best || {}) }
    },
    settings: {
      ...defaults.settings,
      ...(migrated.settings || {}),
      convert: { ...defaults.settings.convert, ...(migrated.settings?.convert || {}) }
    },
    upgrades: Array.isArray(migrated.upgrades) ? [...new Set(migrated.upgrades.filter(isValidUpgradeId))] : [],
    legacyUpgrades: Array.isArray(migrated.legacyUpgrades)
      ? [...new Set(migrated.legacyUpgrades.filter(isValidLegacyId))]
      : [],
    achievements: Array.isArray(migrated.achievements)
      ? [...new Set(migrated.achievements.filter(isValidAchievementId))]
      : [],
    lastOffline: null,
    lastAutoRebirth: null
  };

  state.resources.data = safeResource(state.resources.data);
  state.resources.insights = safeResource(state.resources.insights);
  state.resources.wins = safeResource(state.resources.wins);
  state.resources.fans = safeResource(state.resources.fans);
  state.resources.titles = safeCount(state.resources.titles);

  BUILDINGS.forEach((building) => {
    state.buildings[building.id] = safeCount(state.buildings[building.id]);
  });

  state.rebirths = safeCount(state.rebirths);
  state.legacyPoints = safeCount(state.legacyPoints);
  state.profileName = typeof state.profileName === 'string' ? state.profileName.slice(0, 24) : '';
  state.run.score = safeResource(state.run.score);
  state.run.scoreRate = safeResource(state.run.scoreRate);
  state.run.startedAt = clampNumber(state.run.startedAt) || now;
  Object.keys(state.run.produced).forEach((key) => {
    state.run.produced[key] = safeResource(state.run.produced[key]);
  });

  Object.keys(state.stats.lifetime).forEach((key) => {
    state.stats.lifetime[key] = safeResource(state.stats.lifetime[key]);
  });
  state.stats.lifetime.titles = safeCount(state.stats.lifetime.titles);
  state.stats.lifetime.clicks = safeCount(state.stats.lifetime.clicks);
  state.stats.lifetime.rebirths = safeCount(state.stats.lifetime.rebirths);
  state.stats.best.runScore = safeResource(state.stats.best.runScore);
  state.stats.best.titles = safeCount(state.stats.best.titles);
  state.stats.best.wins = safeResource(state.stats.best.wins);
  state.stats.best.rebirth = safeCount(state.stats.best.rebirth);
  state.stats.best.scoreRate = safeResource(state.stats.best.scoreRate);

  state.settings.buyAmount =
    state.settings.buyAmount === 'max' ? 'max' : Number(state.settings.buyAmount) === 10 ? 10 : 1;
  state.settings.convert.insights = Boolean(state.settings.convert.insights);
  state.settings.convert.wins = Boolean(state.settings.convert.wins);
  state.settings.convert.fans = Boolean(state.settings.convert.fans);
  state.settings.autoBuy = Boolean(state.settings.autoBuy) && isAutomationUnlocked(state, 'autoBuy');
  state.settings.autoClaimTitles =
    Boolean(state.settings.autoClaimTitles) && isAutomationUnlocked(state, 'autoClaimTitles');
  state.settings.autoRebirth =
    Boolean(state.settings.autoRebirth) && isAutomationUnlocked(state, 'autoRebirth');

  state.lastUpdated = clampNumber(state.lastUpdated) || now;
  state.lastAutoBuyAt = Math.min(clampNumber(state.lastAutoBuyAt), now);
  state.lastAutoClaimAt = Math.min(clampNumber(state.lastAutoClaimAt), now);
  state.version = SAVE_VERSION;

  return finalizeState(state);
};

export const gameReducer = (state, action) => {
  switch (action.type) {
    case 'TICK':
      return applyTick(state, action.now, action.seconds).state;
    case 'SYNC_OFFLINE':
      return applyOffline(state, action.now);
    case 'CLICK':
      return click(state);
    case 'BUY_BUILDING':
      return buyBuilding(state, action.id, action.amount);
    case 'SELL_BUILDING':
      return sellBuilding(state, action.id, action.amount);
    case 'BUY_UPGRADE':
      return buyUpgrade(state, action.id);
    case 'CLAIM_TITLE':
      return claimTitle(state);
    case 'BUY_LEGACY':
      return buyLegacyUpgrade(state, action.id);
    case 'REBIRTH':
      return performRebirth(state, action.now, Boolean(action.auto)).state;
    case 'SET_BUY_AMOUNT':
      return setBuyAmount(state, action.amount);
    case 'TOGGLE_CONVERSION':
      return toggleConversion(state, action.stage);
    case 'TOGGLE_AUTOMATION':
      return toggleAutomation(state, action.key);
    case 'SET_PROFILE_NAME':
      return setProfileName(state, action.name);
    case 'DISMISS_OFFLINE':
      return { ...state, lastOffline: null, lastUpdated: action.now || state.lastUpdated };
    case 'DISMISS_AUTO_REBIRTH':
      return { ...state, lastAutoRebirth: null };
    case 'IMPORT_STATE':
      return normalizeState(action.state, action.now || Date.now());
    case 'RESET':
      return createDefaultState(action.now || Date.now());
    default:
      return state;
  }
};
