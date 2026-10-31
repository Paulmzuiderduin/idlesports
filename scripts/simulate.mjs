import { BUILDING_MAP, createDefaultState } from '../src/game/config.js';
import {
  applyTick,
  buyBuilding,
  buyLegacyUpgrade,
  buyUpgrade,
  canClaimTitle,
  claimTitle,
  formatDuration,
  formatNumber,
  getAvailableLegacyUpgrades,
  getAvailableUpgrades,
  getLegacyGain,
  getRates,
  getRebirthRequirement,
  getScoreRate,
  performRebirth
} from '../src/game/engine.js';

const HOURS = Number(process.argv[2] || 12);
const TARGETS = { scout: 10, analyst: 5, strategy: 2, marketing: 1 };

const buyMostUsefulBuilding = (state) => {
  const order = ['scout', 'analyst', 'strategy', 'marketing'];
  for (const id of order) {
    const building = BUILDING_MAP[id];
    const cost = building.baseCost * Math.pow(building.costMult, state.buildings[id] || 0);
    if ((state.buildings[id] || 0) === 0 && state.resources[building.costCurrency] >= cost) {
      return buyBuilding(state, id, 1);
    }
  }

  let best = null;
  for (const id of order) {
    const building = BUILDING_MAP[id];
    const cost = building.baseCost * Math.pow(building.costMult, state.buildings[id] || 0);
    if (state.resources[building.costCurrency] >= cost) {
      const deficit = TARGETS[id] / (1 + (state.buildings[id] || 0));
      if (!best || deficit > best.deficit) best = { id, deficit };
    }
  }
  return best ? buyBuilding(state, best.id, 1) : state;
};

let state = createDefaultState(0);
const events = [];
const storyDone = { at: null };
const treeDone = { at: null };
let lastBuy = -99;
let lastUpgrade = -99;
let lastLegacy = -99;

for (let second = 1; second <= HOURS * 3600; second += 1) {
  state = applyTick(state, second * 1000, 1).state;

  if (second - lastBuy >= 2) {
    const before = JSON.stringify(state.buildings);
    state = buyMostUsefulBuilding(state);
    if (JSON.stringify(state.buildings) !== before) lastBuy = second;
  }

  if (second - lastUpgrade >= 5) {
    const available = getAvailableUpgrades(state);
    const affordable = available.find((upgrade) =>
      Object.entries(upgrade.cost).every(([key, value]) => (state.resources[key] || 0) >= value)
    );
    if (affordable) {
      state = buyUpgrade(state, affordable.id);
      lastUpgrade = second;
    }
  }

  if (canClaimTitle(state)) state = claimTitle(state);

  if (state.run.score >= getRebirthRequirement(state.rebirths)) {
    const previousRebirths = state.rebirths;
    const gain = getLegacyGain(state);
    const result = performRebirth(state, second * 1000, false);
    state = result.state;
    events.push({
      second,
      rebirths: state.rebirths,
      gain,
      titles: result.state.stats.lastRun?.titles || 0,
      threshold: getRebirthRequirement(previousRebirths)
    });
    if (state.rebirths >= 6 && storyDone.at === null) storyDone.at = second;
  }

  if (second - lastLegacy >= 2) {
    const legacy = getAvailableLegacyUpgrades(state).find((upgrade) => state.legacyPoints >= upgrade.cost);
    if (legacy) {
      state = buyLegacyUpgrade(state, legacy.id);
      lastLegacy = second;
    }
  }

  if (state.legacyUpgrades.length >= 16 && treeDone.at === null) treeDone.at = second;

  if (second % 3600 === 0) {
    const rates = getRates(state);
    console.log(
      `hour ${second / 3600}: rebirths=${state.rebirths} legacyUp=${state.legacyUpgrades.length} ` +
        `runScore=${formatNumber(state.run.score)} rate=${formatNumber(getScoreRate(state, rates))}/s ` +
        `buildings=${JSON.stringify(state.buildings)} titles=${state.resources.titles}`
    );
  }
}

console.log('\nFirst rebirths:');
events.slice(0, 8).forEach((event) => {
  console.log(
    `${String(event.rebirths).padStart(2)}: ${formatDuration(event.second).padStart(8)} · +${event.gain} legacy · ` +
      `threshold ${formatNumber(event.threshold)} · titles ${event.titles}`
  );
});
console.log(`\nStory complete (6 rebirths): ${storyDone.at ? formatDuration(storyDone.at) : 'not reached'}`);
console.log(`Legacy tree complete: ${treeDone.at ? formatDuration(treeDone.at) : 'not reached'}`);
console.log(`Final: ${state.rebirths} rebirths, ${state.legacyUpgrades.length} legacy upgrades, best run ${formatNumber(state.stats.best.runScore)}`);
