import { useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const STORAGE_KEY = 'idlesports_state';
const TICK_MS = 250;
const OFFLINE_CAP_SECONDS = 6 * 60 * 60;

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
    costMult: 1.15
  },
  {
    id: 'analyst',
    name: 'Analyst Pods',
    description: 'Convert data into usable insights.',
    baseCost: 60,
    costMult: 1.16
  },
  {
    id: 'strategy',
    name: 'Strategy Lab',
    description: 'Turn insights into wins.',
    baseCost: 240,
    costMult: 1.17
  },
  {
    id: 'marketing',
    name: 'Fan Outreach',
    description: 'Convert wins into long term fan growth.',
    baseCost: 600,
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

const MILESTONES = [
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
  totalClicks: 0,
  profileName: '',
  lastUpdated: Date.now()
};

const clampNumber = (value) => (Number.isFinite(value) ? value : 0);

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
    totalClicks: clampNumber(raw?.totalClicks),
    profileName: typeof raw?.profileName === 'string' ? raw.profileName : '',
    lastUpdated: clampNumber(raw?.lastUpdated) || Date.now()
  };

  safe.resources.data = clampNumber(safe.resources.data);
  safe.resources.insights = clampNumber(safe.resources.insights);
  safe.resources.wins = clampNumber(safe.resources.wins);
  safe.resources.fans = clampNumber(safe.resources.fans);
  safe.resources.titles = clampNumber(safe.resources.titles);

  return safe;
};

const loadLocalState = () => {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE };
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_STATE };
    return normalizeState(JSON.parse(stored));
  } catch (error) {
    return { ...DEFAULT_STATE };
  }
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

const getChampionshipRequirement = (titles) => Math.round(25 * Math.pow(1.4, titles));

const getModifiers = (upgrades, titles) => {
  const modifiers = {
    clickBonus: 0,
    clickMult: 1,
    dataPerSecMult: 1,
    insightPerSecMult: 1,
    winPerSecMult: 1,
    fanPerSecMult: 1,
    globalMult: 1
  };

  upgrades.forEach((upgradeId) => {
    const upgrade = UPGRADES.find((item) => item.id === upgradeId);
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

const getRates = (state) => {
  const modifiers = getModifiers(state.upgrades, state.resources.titles);
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
    const actualInsights = Math.min(possibleInsights, maxByData);
    nextState.resources.data -= actualInsights * rates.dataCostPerInsight;
    nextState.resources.insights += actualInsights;

    const possibleWins = rates.winPerSec * dt;
    const maxByInsights = nextState.resources.insights / rates.insightCostPerWin;
    const actualWins = Math.min(possibleWins, maxByInsights);
    nextState.resources.insights -= actualWins * rates.insightCostPerWin;
    nextState.resources.wins += actualWins;

    const possibleFans = rates.fanPerSec * dt;
    const maxByWins = nextState.resources.wins / rates.winCostPerFan;
    const actualFans = Math.min(possibleFans, maxByWins);
    nextState.resources.wins -= actualFans * rates.winCostPerFan;
    nextState.resources.fans += actualFans;

    remaining -= dt;
  }

  nextState.resources.data = Math.max(0, nextState.resources.data);
  nextState.resources.insights = Math.max(0, nextState.resources.insights);
  nextState.resources.wins = Math.max(0, nextState.resources.wins);
  nextState.resources.fans = Math.max(0, nextState.resources.fans);

  return nextState;
};

const applyOfflineProgress = (state, now) => {
  const elapsedSeconds = Math.max(0, (now - state.lastUpdated) / 1000);
  if (elapsedSeconds <= 0.1) return { nextState: { ...state, lastUpdated: now }, elapsedSeconds: 0, capped: false };

  const capped = elapsedSeconds > OFFLINE_CAP_SECONDS;
  const effectiveSeconds = capped ? OFFLINE_CAP_SECONDS : elapsedSeconds;
  const progressed = applyDelta(state, effectiveSeconds);
  return {
    nextState: {
      ...progressed,
      lastUpdated: now
    },
    elapsedSeconds: effectiveSeconds,
    capped
  };
};

const getBuildingCost = (building, owned, amount) => {
  const base = building.baseCost;
  const mult = building.costMult;
  if (amount <= 1) return base * Math.pow(mult, owned);
  return base * (Math.pow(mult, owned) * (Math.pow(mult, amount) - 1)) / (mult - 1);
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
  if (!session?.user) return 'Coach';
  return (
    session.user.user_metadata?.full_name ||
    session.user.user_metadata?.name ||
    session.user.email?.split('@')[0] ||
    'Coach'
  );
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
  const [leaderboard, setLeaderboard] = useState([]);

  const hasHydrated = useRef(false);
  const saveTimer = useRef(null);
  const stateRef = useRef(gameState);
  const lastCloudSave = useRef(0);

  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

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
    const { nextState, elapsedSeconds, capped } = applyOfflineProgress(gameState, now);
    if (elapsedSeconds >= 5) {
      setOfflineSummary({ elapsedSeconds, capped });
    }
    setGameState(nextState);
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    }, 500);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [gameState]);

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
      if (data?.state) {
        const cloudState = normalizeState(data.state);
        if ((cloudState.lastUpdated || 0) >= (localState.lastUpdated || 0)) {
          if (isMounted) setGameState(cloudState);
        } else {
          await supabase.from('idle_saves').upsert({
            user_id: session.user.id,
            state: localState,
            updated_at: new Date().toISOString()
          });
        }
      } else {
        await supabase.from('idle_saves').upsert({
          user_id: session.user.id,
          state: localState,
          updated_at: new Date().toISOString()
        });
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
    lastCloudSave.current = now;

    const state = stateRef.current;
    const displayName = getDisplayName(state, session);

    const payload = {
      user_id: session.user.id,
      state,
      updated_at: new Date().toISOString()
    };

    supabase.from('idle_saves').upsert(payload);
    supabase.from('leaderboard_entries').upsert({
      user_id: session.user.id,
      display_name: displayName,
      titles: Math.floor(state.resources.titles),
      wins: Math.floor(state.resources.wins),
      updated_at: new Date().toISOString()
    });
  }, [gameState, session, cloudStatus]);

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

  const rates = useMemo(() => getRates(gameState), [gameState]);
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
  const currentStepIndex = useMemo(() => {
    let index = 0;
    MILESTONES.forEach((step, stepIndex) => {
      if (progressScore >= step.threshold) index = stepIndex;
    });
    return index;
  }, [progressScore]);
  const nextStep = MILESTONES[currentStepIndex + 1];
  const progressToNext = nextStep
    ? (progressScore - MILESTONES[currentStepIndex].threshold) /
      (nextStep.threshold - MILESTONES[currentStepIndex].threshold)
    : 1;

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
      if (prev.resources.data < cost) return prev;
      return {
        ...prev,
        resources: {
          ...prev.resources,
          data: prev.resources.data - cost
        },
        buildings: {
          ...prev.buildings,
          [buildingId]: owned + buyAmount
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
    }
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

  const handleGitHubSignIn = async () => {
    if (!supabase) return;
    setAuthMessage('Opening GitHub sign-in...');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) setAuthMessage(`GitHub sign-in failed: ${error.message}`);
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const availableUpgrades = UPGRADES.filter((upgrade) => !gameState.upgrades.includes(upgrade.id));

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
              </div>
              <button className="btn ghost" onClick={handleSignOut}>
                Sign out
              </button>
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
                <button className="btn ghost" onClick={handleGitHubSignIn}>
                  Sign in with GitHub
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
        </div>
        {offlineSummary && (
          <div className="notice">
            Offline progress applied: {Math.floor(offlineSummary.elapsedSeconds)} seconds
            {offlineSummary.capped ? ' (capped at 6 hours).' : '.'}
          </div>
        )}
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Data</p>
          <p className="stat-value">{formatNumber(gameState.resources.data)}</p>
          <p className="stat-meta">{formatRate(rates.dataPerSec)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Insights</p>
          <p className="stat-value">{formatNumber(gameState.resources.insights)}</p>
          <p className="stat-meta">{formatRate(rates.insightPerSec)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Wins</p>
          <p className="stat-value">{formatNumber(gameState.resources.wins)}</p>
          <p className="stat-meta">{formatRate(rates.winPerSec)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Fans</p>
          <p className="stat-value">{formatNumber(gameState.resources.fans)}</p>
          <p className="stat-meta">{formatRate(rates.fanPerSec)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Titles</p>
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
                <p className="muted">Spend data to scale your analytics pipeline.</p>
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
                const affordable = gameState.resources.data >= cost;
                return (
                  <div key={building.id} className="card">
                    <div>
                      <p className="card-title">{building.name}</p>
                      <p className="muted">{building.description}</p>
                      <p className="muted">Owned: {owned}</p>
                    </div>
                    <button
                      className={`btn ${affordable ? 'primary' : 'disabled'}`}
                      onClick={() => handleBuyBuilding(building.id)}
                      disabled={!affordable}
                    >
                      Buy ({formatNumber(cost)} data)
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
          </div>
        </div>

        <div className="stack">
          <div className="panel">
            <h3>Season Push</h3>
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

          <div className="panel">
            <h3>Pipeline Snapshot</h3>
            <div className="snapshot">
              <p>Data per click: {formatNumber(rates.dataPerClick)}</p>
              <p>Data per second: {formatRate(rates.dataPerSec)}</p>
              <p>Insight conversion: {formatRate(rates.insightPerSec)}</p>
              <p>Win conversion: {formatRate(rates.winPerSec)}</p>
              <p>Fan conversion: {formatRate(rates.fanPerSec)}</p>
              <p>Global multiplier: x{formatNumber(rates.modifiers.globalMult)}</p>
            </div>
          </div>

          <div className="panel">
            <h3>Analyst Progression</h3>
            <p className="muted">Your realistic build-up path.</p>
            <div className="progress-card">
              <div className="progress-header">
                <span>Current stage</span>
                <span>{MILESTONES[currentStepIndex].title}</span>
              </div>
              <div className="progress">
                <div
                  className="progress-bar"
                  style={{ width: `${Math.min(100, Math.max(0, progressToNext * 100))}%` }}
                />
              </div>
              <p className="muted">
                {nextStep
                  ? `Next: ${nextStep.title} at ${formatWhole(nextStep.threshold)} progression.`
                  : 'You unlocked automatic tracking.'}
              </p>
            </div>
            <div className="milestones">
              {MILESTONES.map((step, index) => {
                const unlocked = progressScore >= step.threshold;
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
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Leaderboard</h3>
                <p className="muted">Top 10 titles across players.</p>
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
                />
              </label>
            </div>
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

          <div className="panel dark">
            <h3>Next Steps</h3>
            <p>
              Add Scout Bots early, then balance Analyst Pods and Strategy Labs so your data does not bottleneck. Fans add
              passive data, so pushing wins keeps everything accelerating.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
