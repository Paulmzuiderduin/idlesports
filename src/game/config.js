export const SAVE_VERSION = 2;

export const TICK_MS = 500;
export const MAX_ACTIVE_GAP_SECONDS = 5;
export const ACTIVE_STEP_SECONDS = 0.5;
export const AUTO_BUY_INTERVAL_MS = 2000;
export const AUTO_CLAIM_INTERVAL_MS = 2000;
export const OFFLINE_MIN_SECONDS = 60;
export const ACTIVE_AWAY_GRACE_SECONDS = 120;
export const OFFLINE_STEP_SECONDS = 5;
export const LOCAL_SAVE_INTERVAL_MS = 5000;

export const OFFLINE_BASE_RATE = 0.4;
export const OFFLINE_BASE_CAP_SECONDS = 8 * 60 * 60;
export const OFFLINE_AUTOMATION_BONUS = 0.1;
export const START_DATA = 10;
export const REBIRTH_START_DATA = 25;

export const BASE = {
  dataPerClick: 1,
  clickProductionShare: 0.05,
  scoutDataPerSec: 0.8,
  analystInsightPerSec: 0.3,
  strategyWinPerSec: 0.1,
  marketingFanPerSec: 0.5,
  dataCostPerInsight: 3,
  insightCostPerWin: 2,
  winCostPerFan: 1,
  fanDataPerSec: 0.03,
  fanHypePerLog: 0.25,
  titleGlobalBonus: 0.06,
  rebirthGlobalBonus: 0.02
};

export const SCORE_WEIGHTS = {
  data: 1,
  insights: 3,
  wins: 6,
  fans: 6,
  titles: 150
};

export const RESOURCE_VALUE = {
  data: 1,
  insights: 3,
  wins: 6,
  fans: 6,
  titles: SCORE_WEIGHTS.titles
};

export const RESOURCES = [
  { id: 'data', label: 'Data', className: 'data' },
  { id: 'insights', label: 'Insights', className: 'insights' },
  { id: 'wins', label: 'Wins', className: 'wins' },
  { id: 'fans', label: 'Fans', className: 'fans' },
  { id: 'titles', label: 'Titles', className: 'titles' }
];

export const BUILDINGS = [
  {
    id: 'scout',
    name: 'Scout Bots',
    description: 'Collect raw match data from feeds.',
    baseCost: 10,
    costCurrency: 'data',
    outputCurrency: 'data',
    outputPerSecond: BASE.scoutDataPerSec,
    inputCurrency: null,
    inputPerOutput: 0,
    costMult: 1.13
  },
  {
    id: 'analyst',
    name: 'Analyst Pods',
    description: 'Convert raw data into usable insights.',
    baseCost: 50,
    costCurrency: 'data',
    outputCurrency: 'insights',
    outputPerSecond: BASE.analystInsightPerSec,
    inputCurrency: 'data',
    inputPerOutput: BASE.dataCostPerInsight,
    costMult: 1.14
  },
  {
    id: 'strategy',
    name: 'Strategy Lab',
    description: 'Turn insights into wins on match day.',
    baseCost: 200,
    costCurrency: 'insights',
    outputCurrency: 'wins',
    outputPerSecond: BASE.strategyWinPerSec,
    inputCurrency: 'insights',
    inputPerOutput: BASE.insightCostPerWin,
    costMult: 1.15
  },
  {
    id: 'marketing',
    name: 'Fan Outreach',
    description: 'Convert wins into fans and global hype.',
    baseCost: 200,
    costCurrency: 'wins',
    outputCurrency: 'fans',
    outputPerSecond: BASE.marketingFanPerSec,
    inputCurrency: 'wins',
    inputPerOutput: BASE.winCostPerFan,
    costMult: 1.16
  }
];

export const BUILDING_MAP = Object.fromEntries(BUILDINGS.map((building) => [building.id, building]));

export const UPGRADES = [
  {
    id: 'fast-queries',
    name: 'Fast Queries',
    description: 'Your manual data pulls hit harder.',
    cost: { data: 50 },
    effect: { type: 'clickBonus', value: 2 },
    tier: 1
  },
  {
    id: 'vector-warehouse',
    name: 'Vector Warehouse',
    description: 'Faster storage and retrieval for raw data.',
    cost: { data: 250 },
    effect: { type: 'dataMult', value: 1.25 },
    tier: 1
  },
  {
    id: 'vision-models',
    name: 'Vision Models',
    description: 'Computer vision extracts more signal per match.',
    cost: { insights: 25 },
    effect: { type: 'insightMult', value: 1.3 },
    tier: 2
  },
  {
    id: 'late-game',
    name: 'Late Game Scripts',
    description: 'Better preparation for decisive moments.',
    cost: { wins: 10 },
    effect: { type: 'winMult', value: 1.35 },
    tier: 2
  },
  {
    id: 'pipeline-accelerator',
    name: 'Pipeline Accelerator',
    description: 'Parallel processing across the data pipeline.',
    cost: { insights: 80 },
    effect: { type: 'dataMult', value: 1.5 },
    tier: 2
  },
  {
    id: 'season-tickets',
    name: 'Season Tickets',
    description: 'A bigger audience amplifies fan growth.',
    cost: { fans: 40 },
    effect: { type: 'fanMult', value: 1.4 },
    tier: 3
  },
  {
    id: 'insight-optimizer',
    name: 'Insight Optimizer',
    description: 'Cleaner models turn more data into insight.',
    cost: { wins: 20 },
    effect: { type: 'insightMult', value: 1.5 },
    tier: 3
  },
  {
    id: 'strategy-protocols',
    name: 'Strategy Protocols',
    description: 'Repeatable playbooks convert more insights into wins.',
    cost: { fans: 100 },
    effect: { type: 'winMult', value: 1.6 },
    tier: 3
  },
  {
    id: 'fan-analytics',
    name: 'Fan Analytics',
    description: 'Understand the audience and grow it faster.',
    cost: { wins: 30 },
    effect: { type: 'fanMult', value: 1.75 },
    tier: 4
  },
  {
    id: 'title-sponsor',
    name: 'Title Sponsor',
    description: 'A front-of-shirt deal lifts the whole operation.',
    cost: { wins: 150 },
    effect: { type: 'globalMult', value: 1.1 },
    tier: 4
  },
  {
    id: 'championship-algorithm',
    name: 'Championship Algorithm',
    description: 'A club-wide model for every department.',
    cost: { wins: 400 },
    effect: { type: 'globalMult', value: 1.15 },
    tier: 5
  },
  {
    id: 'data-monopoly',
    name: 'Data Monopoly',
    description: 'Own the feeds everyone else relies on.',
    cost: { wins: 600 },
    effect: { type: 'globalMult', value: 1.2 },
    tier: 5
  }
];

export const UPGRADE_MAP = Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, upgrade]));

export const LEGACY_UPGRADES = [
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
    cost: 1,
    requiresRebirths: 1,
    effect: { type: 'dataMult', value: 1.25 }
  },
  {
    id: 'legacy-analysts',
    name: 'Legacy Analysts',
    description: 'Insight conversion +35% permanently.',
    cost: 2,
    requiresRebirths: 2,
    effect: { type: 'insightMult', value: 1.35 }
  },
  {
    id: 'legacy-strategy',
    name: 'Legacy Strategy',
    description: 'Win conversion +40% permanently.',
    cost: 2,
    requiresRebirths: 3,
    effect: { type: 'winMult', value: 1.4 }
  },
  {
    id: 'legacy-network',
    name: 'Legacy Fan Network',
    description: 'Fan conversion +45% permanently.',
    cost: 2,
    requiresRebirths: 4,
    effect: { type: 'fanMult', value: 1.45 }
  },
  {
    id: 'legacy-accelerator',
    name: 'Legacy Accelerator',
    description: 'Global production +15% permanently.',
    cost: 3,
    requiresRebirths: 5,
    effect: { type: 'globalMult', value: 1.15 }
  },
  {
    id: 'legacy-queries-2',
    name: 'Legacy Query Nexus',
    description: 'Data per click +3 permanently.',
    cost: 2,
    requiresRebirths: 2,
    effect: { type: 'clickBonus', value: 3 }
  },
  {
    id: 'legacy-warehouse-2',
    name: 'Legacy Data Grid',
    description: 'Data per second +40% permanently.',
    cost: 2,
    requiresRebirths: 3,
    effect: { type: 'dataMult', value: 1.4 }
  },
  {
    id: 'legacy-analysts-2',
    name: 'Legacy Insight Engine',
    description: 'Insight conversion +50% permanently.',
    cost: 2,
    requiresRebirths: 4,
    effect: { type: 'insightMult', value: 1.5 }
  },
  {
    id: 'legacy-strategy-2',
    name: 'Legacy War Room',
    description: 'Win conversion +55% permanently.',
    cost: 3,
    requiresRebirths: 5,
    effect: { type: 'winMult', value: 1.55 }
  },
  {
    id: 'legacy-network-2',
    name: 'Legacy Fan Forum',
    description: 'Fan conversion +60% permanently.',
    cost: 3,
    requiresRebirths: 6,
    effect: { type: 'fanMult', value: 1.6 }
  },
  {
    id: 'legacy-accelerator-2',
    name: 'Legacy Momentum',
    description: 'Global production +25% permanently.',
    cost: 3,
    requiresRebirths: 7,
    effect: { type: 'globalMult', value: 1.25 }
  },
  {
    id: 'legacy-offline-rate',
    name: 'Offline Prep',
    description: 'Offline gains +10% (adds 10 percentage points).',
    cost: 1,
    requiresRebirths: 1,
    effect: { type: 'offlineRate', value: 0.1 }
  },
  {
    id: 'legacy-offline-rate-2',
    name: 'Offline Operations',
    description: 'Offline gains +15% (adds 15 percentage points).',
    cost: 2,
    requiresRebirths: 4,
    effect: { type: 'offlineRate', value: 0.15 }
  },
  {
    id: 'legacy-offline-cap',
    name: 'Extended Logging',
    description: 'Offline cap +8 hours.',
    cost: 1,
    requiresRebirths: 2,
    effect: { type: 'offlineCap', value: 8 * 60 * 60 }
  },
  {
    id: 'legacy-offline-cap-2',
    name: 'Offline Archives',
    description: 'Offline cap +8 hours.',
    cost: 2,
    requiresRebirths: 5,
    effect: { type: 'offlineCap', value: 8 * 60 * 60 }
  }
];

export const LEGACY_UPGRADE_MAP = Object.fromEntries(
  LEGACY_UPGRADES.map((upgrade) => [upgrade.id, upgrade])
);

export const REBIRTH_STEPS = [
  {
    id: 'paper',
    title: 'Pencil & Paper',
    description: 'Manual match tallying, no structure yet.',
    threshold: 0,
    story:
      'You start with a notebook and a pencil. Every stat is hand-tallied, every match a mess of scribbles.',
    unlock: 'The basics: click for data, buy buildings, and build the pipeline.'
  },
  {
    id: 'sheet',
    title: 'Printed Stat Sheet',
    description: 'Structured boxes and quick totals after matches.',
    threshold: 300,
    story:
      'You convince the club to print standardized stat sheets. Suddenly every match looks the same.',
    unlock: 'Tip: pause any conversion in a building card to stockpile that resource.'
  },
  {
    id: 'excel',
    title: 'Excel Tracker',
    description: 'Spreadsheets, formulas, and rolling averages.',
    threshold: 1000,
    story:
      'A spreadsheet becomes your command center. Formulas, averages, and consistency finally show up.',
    unlock: 'Auto-buy unlocks in the Automation panel.'
  },
  {
    id: 'compare',
    title: 'Cross-Match Comparisons',
    description: 'Comparing players, lineups, and match trends.',
    threshold: 2500,
    story:
      'You can now compare players across matches. Patterns emerge, and decisions get sharper.',
    unlock: 'The Stats panel shows pipeline contribution and your run-score chart.'
  },
  {
    id: 'app',
    title: 'Match Scoring App',
    description: 'Live match scoring on a dedicated app.',
    threshold: 6000,
    story:
      'You ship a scoring app for live matches. Data lands instantly, not days later.',
    unlock: 'Auto-claim titles unlocks in the Automation panel.'
  },
  {
    id: 'expand',
    title: 'Expanded App Suite',
    description: 'Reports, exports, and deeper analytics.',
    threshold: 12000,
    story:
      'Reports, exports, and insights turn into a full suite. The front office starts to rely on you.',
    unlock: 'Fan hype is now a major global multiplier — check the fans tile in the HUD.'
  },
  {
    id: 'auto',
    title: 'Automatic Tracking',
    description: 'Sensors and video models track matches automatically.',
    threshold: 24000,
    story:
      'Sensors and models track every movement. You stop logging matches and start shaping seasons.',
    unlock: 'Auto-rebirth unlocks, and offline efficiency gets +10%.'
  }
];

export const LAST_STORY_INDEX = REBIRTH_STEPS.length - 1;
export const POST_STORY_SCALE = 1.22;
export const TITLE_COST_BASE = 20;
export const TITLE_COST_SCALE = 1.3;

export const AUTOMATION_UNLOCKS = {
  autoBuy: {
    requiredRebirths: 2,
    label: 'Auto-buy',
    description: 'Buys the building that fixes your current bottleneck.',
    unlockLabel: 'Excel Tracker (rebirth 2)'
  },
  autoClaimTitles: {
    requiredRebirths: 4,
    label: 'Auto-claim titles',
    description: 'Claims a championship whenever you can afford one.',
    unlockLabel: 'Match Scoring App (rebirth 4)'
  },
  autoRebirth: {
    requiredRebirths: 6,
    label: 'Auto-rebirth',
    description: 'Rebirths automatically at 150% of the next threshold.',
    unlockLabel: 'Automatic Tracking (rebirth 6)'
  }
};

export const ACHIEVEMENTS = [
  {
    id: 'first-click',
    name: 'First Pull',
    description: 'Run your first data pull.',
    check: (state) => state.stats.lifetime.clicks >= 1
  },
  {
    id: 'first-scout',
    name: 'Scouting Network',
    description: 'Own your first Scout Bot.',
    check: (state) => state.buildings.scout >= 1
  },
  {
    id: 'first-analyst',
    name: 'Numbers Person',
    description: 'Own your first Analyst Pod.',
    check: (state) => state.buildings.analyst >= 1
  },
  {
    id: 'first-strategy',
    name: 'Tactical Edge',
    description: 'Own your first Strategy Lab.',
    check: (state) => state.buildings.strategy >= 1
  },
  {
    id: 'first-fan',
    name: 'Fan Culture',
    description: 'Gain your first fan.',
    check: (state) => state.stats.lifetime.fans >= 1
  },
  {
    id: 'first-title',
    name: 'Silverware',
    description: 'Claim your first title.',
    check: (state) => state.stats.lifetime.titles >= 1
  },
  {
    id: 'first-rebirth',
    name: 'Fresh Notebook',
    description: 'Complete your first rebirth.',
    check: (state) => state.stats.lifetime.rebirths >= 1
  },
  {
    id: 'score-1k',
    name: 'Four Digits',
    description: 'Reach 1,000 run score in a single run.',
    check: (state) => state.stats.best.runScore >= 1000
  },
  {
    id: 'score-100k',
    name: 'Data Empire',
    description: 'Reach 100,000 run score in a single run.',
    check: (state) => state.stats.best.runScore >= 100000
  },
  {
    id: 'titles-10',
    name: 'Dynasty',
    description: 'Hold 10 titles at the same time.',
    check: (state) => state.stats.best.titles >= 10
  },
  {
    id: 'clicks-100',
    name: 'Hands-On',
    description: 'Run 100 manual data pulls.',
    check: (state) => state.stats.lifetime.clicks >= 100
  },
  {
    id: 'rebirths-25',
    name: 'Serial Founder',
    description: 'Complete 25 rebirths.',
    check: (state) => state.stats.lifetime.rebirths >= 25
  },
  {
    id: 'rebirths-50',
    name: 'Dynasty Builder',
    description: 'Complete 50 rebirths.',
    check: (state) => state.stats.lifetime.rebirths >= 50
  },
  {
    id: 'score-1m',
    name: 'Million-Data Run',
    description: 'Reach 1,000,000 run score in a single run.',
    check: (state) => state.stats.best.runScore >= 1000000
  },
  {
    id: 'score-1b',
    name: 'Billion-Data Run',
    description: 'Reach 1,000,000,000 run score in a single run.',
    check: (state) => state.stats.best.runScore >= 1000000000
  },
  {
    id: 'titles-25',
    name: 'Trophy Cabinet',
    description: 'Hold 25 titles at the same time.',
    check: (state) => state.stats.best.titles >= 25
  },
  {
    id: 'fans-1k',
    name: 'Sold Out',
    description: 'Reach 1,000 fans in a single run.',
    check: (state) => state.resources.fans >= 1000
  },
  {
    id: 'all-upgrades',
    name: 'Fully Funded',
    description: 'Buy every standard upgrade in a single run.',
    check: (state) => state.upgrades.length >= UPGRADES.length
  },
  {
    id: 'all-legacy',
    name: 'Complete Legacy',
    description: 'Unlock every legacy upgrade.',
    check: (state) => state.legacyUpgrades.length >= LEGACY_UPGRADES.length
  }
];

export const ACHIEVEMENT_MAP = Object.fromEntries(
  ACHIEVEMENTS.map((achievement) => [achievement.id, achievement])
);

export const DEFAULT_SETTINGS = {
  buyAmount: 1,
  convert: {
    insights: true,
    wins: true,
    fans: true
  },
  autoBuy: false,
  autoClaimTitles: false,
  autoRebirth: false
};

export const createDefaultState = (now = Date.now()) => ({
  version: SAVE_VERSION,
  resources: {
    data: START_DATA,
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
  achievements: [],
  rebirths: 0,
  legacyPoints: 0,
  run: {
    score: 0,
    scoreRate: 0,
    produced: {
      data: 0,
      insights: 0,
      wins: 0,
      fans: 0
    },
    startedAt: now
  },
  stats: {
    lifetime: {
      data: 0,
      insights: 0,
      wins: 0,
      fans: 0,
      titles: 0,
      clicks: 0,
      rebirths: 0,
      playSeconds: 0,
      offlineSeconds: 0
    },
    best: {
      runScore: 0,
      titles: 0,
      wins: 0,
      rebirth: 0,
      scoreRate: 0
    },
    lastRun: null
  },
  settings: {
    ...DEFAULT_SETTINGS,
    convert: { ...DEFAULT_SETTINGS.convert }
  },
  profileName: '',
  lastUpdated: now,
  lastOffline: null,
  lastAutoRebirth: null,
  lastAutoBuyAt: 0,
  lastAutoClaimAt: 0
});
