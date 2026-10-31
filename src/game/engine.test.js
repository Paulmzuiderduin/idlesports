import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BUILDING_MAP,
  LAST_STORY_INDEX,
  REBIRTH_STEPS,
  SCORE_WEIGHTS,
  START_DATA,
  createDefaultState
} from './config.js';
import {
  applyOffline,
  applyTick,
  buyBuilding,
  buyLegacyUpgrade,
  buyUpgrade,
  canClaimTitle,
  claimTitle,
  click,
  formatNumber,
  gameReducer,
  getBuildingCost,
  getBuildingRefund,
  getChampionshipRequirement,
  getEffectiveRates,
  getFanHypeMultiplier,
  getMaxAffordableAmount,
  getRates,
  getRebirthRequirement,
  normalizeState,
  performRebirth,
  runAutomation
} from './engine.js';

const asState = (overrides = {}) => normalizeState({ ...createDefaultState(1000), ...overrides }, 1000);

test('a new game starts with enough data to buy the first Scout', () => {
  const state = createDefaultState(1000);
  assert.equal(state.resources.data, START_DATA);
  assert.equal(getBuildingCost(BUILDING_MAP.scout, 0, 1), 10);
  const next = buyBuilding(state, 'scout', 1);
  assert.equal(next.buildings.scout, 1);
  assert.equal(next.resources.data, 0);
});

test('clicking adds data, score and lifetime clicks', () => {
  const state = createDefaultState(1000);
  const next = click(state);
  assert.equal(next.stats.lifetime.clicks, 1);
  assert.ok(next.resources.data > state.resources.data);
  assert.ok(next.run.score > state.run.score);
});

test('building cost and refund use the geometric cost curve', () => {
  const cost1 = getBuildingCost(BUILDING_MAP.scout, 0, 1);
  const cost2 = getBuildingCost(BUILDING_MAP.scout, 0, 2);
  assert.equal(cost1, 10);
  assert.ok(cost2 > cost1);
  const refund = getBuildingRefund(BUILDING_MAP.scout, 2, 1);
  assert.ok(refund > 0);
  assert.ok(refund < cost1);
});

test('max buying never overspends', () => {
  const state = asState({ resources: { data: 100, insights: 0, wins: 0, fans: 0, titles: 0 } });
  const max = getMaxAffordableAmount(state, BUILDING_MAP.scout);
  assert.ok(max > 1);
  const next = buyBuilding(state, 'scout', 'max');
  assert.equal(next.buildings.scout, max);
  assert.ok(next.resources.data >= 0);
  assert.ok(next.resources.data < getBuildingCost(BUILDING_MAP.scout, max, 1));
});

test('production, conversion and score work over a tick', () => {
  const state = asState({
    buildings: { scout: 10, analyst: 5, strategy: 2, marketing: 0 },
    resources: { data: 100, insights: 100, wins: 0, fans: 0, titles: 0 }
  });
  const rates = getRates(state);
  const effective = getEffectiveRates(state, rates);
  assert.ok(rates.dataPerSec > 0);
  assert.ok(effective.insightsProduced >= 0);
  const result = applyTick(state, 2000, 1);
  assert.ok(result.produced.data > 0);
  assert.ok(result.state.run.score > state.run.score);
  assert.ok(result.state.stats.lifetime.playSeconds >= 1);
});

test('pausing a conversion stops that stage and preserves its input', () => {
  const state = asState({
    buildings: { scout: 10, analyst: 10, strategy: 0, marketing: 0 },
    resources: { data: 0, insights: 0, wins: 0, fans: 0, titles: 0 },
    settings: {
      buyAmount: 1,
      convert: { insights: false, wins: true, fans: true },
      autoBuy: false,
      autoClaimTitles: false,
      autoRebirth: false
    }
  });
  const result = applyTick(state, 2000, 1);
  assert.equal(result.produced.insights, 0);
  assert.ok(result.state.resources.data > 0);
});

test('offline progress uses the offline rate and cap', () => {
  const state = asState({
    buildings: { scout: 10, analyst: 0, strategy: 0, marketing: 0 },
    resources: { data: 0, insights: 0, wins: 0, fans: 0, titles: 0 },
    lastUpdated: 1000
  });
  const next = applyOffline(state, 1000 + 60 * 60 * 1000);
  assert.ok(next.lastOffline);
  assert.equal(next.lastOffline.capped, false);
  assert.ok(next.lastOffline.rate >= 0.4);
  assert.ok(next.resources.data > 0);
  assert.ok(next.stats.lifetime.offlineSeconds >= 3600);

  const capped = applyOffline(state, 1000 + 20 * 60 * 60 * 1000);
  assert.equal(capped.lastOffline.capped, true);
  assert.ok(capped.lastOffline.effectiveSeconds <= capped.lastOffline.capSeconds);

  const empty = asState({ lastUpdated: 1000 });
  const noGains = applyOffline(empty, 1000 + 60 * 60 * 1000);
  assert.equal(noGains.lastOffline, null);
});

test('rebirth resets the run, keeps legacy and starts with seed data', () => {
  let state = asState({
    resources: { data: 25, insights: 0, wins: 0, fans: 0, titles: 3 },
    buildings: { scout: 8, analyst: 2, strategy: 1, marketing: 0 },
    upgrades: ['fast-queries'],
    legacyUpgrades: ['legacy-queries'],
    rebirths: 2,
    legacyPoints: 1
  });
  state = { ...state, run: { ...state.run, score: getRebirthRequirement(2) + 1 } };
  const result = performRebirth(state, 5000, false);
  assert.equal(result.gain, 1);
  assert.equal(result.state.rebirths, 3);
  assert.equal(result.state.buildings.scout, 0);
  assert.equal(result.state.upgrades.length, 0);
  assert.equal(result.state.resources.titles, 0);
  assert.equal(result.state.resources.data, 25);
  assert.deepEqual(result.state.legacyUpgrades, ['legacy-queries']);
  assert.equal(result.state.legacyPoints, 2);
  assert.equal(result.state.stats.lifetime.rebirths, 1);
  assert.ok(result.state.stats.best.runScore >= state.run.score);
});

test('title claims recalculate the next price and cannot undercharge', () => {
  let state = asState({
    resources: { data: 0, insights: 0, wins: 60, fans: 0, titles: 0 }
  });
  assert.equal(getChampionshipRequirement(0), 20);
  assert.ok(canClaimTitle(state));
  state = claimTitle(state);
  assert.equal(state.resources.titles, 1);
  assert.equal(state.resources.wins, 40);
  state = claimTitle(state);
  assert.equal(state.resources.titles, 2);
  assert.equal(state.resources.wins, 14);
  assert.equal(getChampionshipRequirement(2), 34);
});

test('normal upgrades apply their multiplier', () => {
  let state = asState({
    resources: { data: 50, insights: 0, wins: 0, fans: 0, titles: 0 }
  });
  const before = getRates(state).dataPerSec;
  state = buyUpgrade(state, 'fast-queries');
  assert.ok(state.upgrades.includes('fast-queries'));
  assert.ok(state.resources.data < 50);
  const afterClick = getRates(state).dataPerClick;
  assert.ok(afterClick > getRates(asState()).dataPerClick);
  assert.equal(before, getRates(state).dataPerSec);
});

test('legacy upgrades require unlocks and points', () => {
  let state = asState({ rebirths: 0, legacyPoints: 1 });
  const locked = buyLegacyUpgrade(state, 'legacy-warehouse');
  assert.deepEqual(locked.legacyUpgrades, []);
  state = buyLegacyUpgrade(state, 'legacy-queries');
  assert.deepEqual(state.legacyUpgrades, ['legacy-queries']);
  assert.equal(state.legacyPoints, 0);
});

test('old saves migrate to the new shape without losing progress', () => {
  const migrated = normalizeState(
    {
      resources: { data: 500, insights: 20, wins: 5, fans: 0, titles: 1 },
      buildings: { scout: 3, analyst: 1, strategy: 0, marketing: 0 },
      upgrades: ['fast-queries'],
      legacyUpgrades: [],
      totalClicks: 42,
      rebirths: 2,
      lastUpdated: 123456
    },
    999999
  );
  assert.equal(migrated.version, 2);
  assert.equal(migrated.stats.lifetime.clicks, 42);
  assert.equal(migrated.resources.data, 500);
  assert.equal(migrated.buildings.scout, 3);
  assert.ok(migrated.run.score > 0);
  assert.ok(migrated.upgrades.includes('fast-queries'));
});

test('auto-buy respects its cooldown and actually buys', () => {
  const state = asState({
    rebirths: 2,
    settings: {
      buyAmount: 1,
      convert: { insights: true, wins: true, fans: true },
      autoBuy: true,
      autoClaimTitles: false,
      autoRebirth: false
    },
    resources: { data: 500, insights: 0, wins: 0, fans: 0, titles: 0 }
  });
  const first = runAutomation(state, 5000);
  assert.ok(first.buildings.scout >= 1);
  const blocked = runAutomation(first, 5500);
  assert.deepEqual(blocked.buildings, first.buildings);
  const later = runAutomation(first, 8000);
  assert.ok(
    Object.values(later.buildings).reduce((a, b) => a + b, 0) >
      Object.values(first.buildings).reduce((a, b) => a + b, 0)
  );
});

test('auto-claim and auto-rebirth only run when unlocked and enabled', () => {
  const claimState = asState({
    rebirths: 4,
    resources: { data: 0, insights: 0, wins: 100, fans: 0, titles: 0 },
    settings: {
      buyAmount: 1,
      convert: { insights: true, wins: true, fans: true },
      autoBuy: false,
      autoClaimTitles: true,
      autoRebirth: false
    }
  });
  const claimed = runAutomation(claimState, 5000);
  assert.ok(claimed.resources.titles >= 1);
  assert.ok(claimed.resources.wins < 100);

  const lockedState = asState({
    rebirths: 3,
    resources: { data: 0, insights: 0, wins: 100, fans: 0, titles: 0 },
    settings: {
      buyAmount: 1,
      convert: { insights: true, wins: true, fans: true },
      autoBuy: false,
      autoClaimTitles: true,
      autoRebirth: false
    }
  });
  const locked = runAutomation(lockedState, 5000);
  assert.equal(locked.resources.titles, 0);

  const threshold = getRebirthRequirement(6);
  const rebirthState = asState({
    rebirths: 6,
    run: {
      score: threshold * 1.5 + 1,
      scoreRate: 0,
      produced: { data: 0, insights: 0, wins: 0, fans: 0 },
      startedAt: 1000
    },
    settings: {
      buyAmount: 1,
      convert: { insights: true, wins: true, fans: true },
      autoBuy: false,
      autoClaimTitles: false,
      autoRebirth: true
    }
  });
  const reborn = runAutomation(rebirthState, 5000);
  assert.equal(reborn.rebirths, 7);
  assert.equal(reborn.resources.data, 25);
  assert.ok(reborn.legacyPoints >= 2);
});

test('fan hype and formatting stay finite at large numbers', () => {
  assert.ok(getFanHypeMultiplier(1000000) > 1);
  assert.ok(Number.isFinite(getFanHypeMultiplier(1e12)));
  assert.equal(formatNumber(1000), '1K');
  assert.equal(formatNumber(1000000), '1M');
});

test('story thresholds are increasing and post-story requirements grow', () => {
  for (let index = 1; index <= LAST_STORY_INDEX; index += 1) {
    assert.ok(REBIRTH_STEPS[index].threshold > REBIRTH_STEPS[index - 1].threshold);
  }
  assert.ok(getRebirthRequirement(7) > getRebirthRequirement(6));
  assert.ok(getRebirthRequirement(20) > getRebirthRequirement(10));
});

test('the reducer handles the main actions', () => {
  let state = createDefaultState(1000);
  state = gameReducer(state, { type: 'CLICK' });
  assert.equal(state.stats.lifetime.clicks, 1);
  state = gameReducer(state, { type: 'SET_BUY_AMOUNT', amount: 10 });
  assert.equal(state.settings.buyAmount, 10);
  state = gameReducer(state, { type: 'TOGGLE_CONVERSION', stage: 'fans' });
  assert.equal(state.settings.convert.fans, false);
  state = gameReducer(state, { type: 'RESET', now: 2000 });
  assert.equal(state.resources.data, START_DATA);
  assert.equal(state.stats.lifetime.clicks, 0);
});
