import { useEffect, useMemo, useRef, useState } from 'react';

import { ACHIEVEMENT_MAP, LAST_STORY_INDEX, REBIRTH_STEPS } from './game/config.js';
import {
  canRebirth,
  formatNumber,
  getBottleneck,
  getEffectiveRates,
  getLegacyGain,
  getNextLegacyGain,
  getRates,
  getRebirthProgress,
  getRebirthRequirement,
  normalizeState
} from './game/engine.js';
import { downloadSave } from './game/persistence.js';
import { useGame } from './hooks/useGame.js';
import { AutomationPanel } from './components/AutomationPanel.jsx';
import { BottleneckPanel } from './components/BottleneckPanel.jsx';
import { HelpModal, OfflineModal, RebirthModal, ResetModal, SettingsModal, StoryModal } from './components/Modals.jsx';
import { Icon } from './components/Icon.jsx';
import { LegacyPanel } from './components/LegacyPanel.jsx';
import { MobileNav } from './components/MobileNav.jsx';
import { Pipeline } from './components/Pipeline.jsx';
import { ResourceHud } from './components/ResourceHud.jsx';
import { SeasonPanel } from './components/SeasonPanel.jsx';
import { StatsPanel } from './components/StatsPanel.jsx';
import { Topbar } from './components/Topbar.jsx';
import { UpgradesPanel } from './components/UpgradesPanel.jsx';

const Toast = ({ toast, onClose }) => {
  if (!toast) return null;
  return (
    <div className={`toast ${toast.type || 'info'}`} role="status" aria-live="polite">
      <Icon name={toast.type === 'achievement' ? 'titles' : 'spark'} size={18} />
      <div>
        <strong>{toast.title}</strong>
        <p>{toast.text}</p>
      </div>
      <button className="btn icon ghost" onClick={onClose} aria-label="Dismiss notification">
        <Icon name="close" size={16} />
      </button>
    </div>
  );
};

function App() {
  const { state, dispatch, stateRef, savedAt, saveError, history, resetGame, saveNow } = useGame();
  const [activeTab, setActiveTab] = useState('play');
  const [showAllUpgrades, setShowAllUpgrades] = useState(false);
  const [showAllLegacy, setShowAllLegacy] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rebirthOpen, setRebirthOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [storyPopup, setStoryPopup] = useState(null);
  const [toast, setToast] = useState(null);
  const previousAchievements = useRef(state.achievements);

  const rates = useMemo(() => getRates(state), [state]);
  const effective = useMemo(() => getEffectiveRates(state, rates), [state, rates]);
  const bottleneck = useMemo(() => getBottleneck(state), [state]);
  const rebirthRequirement = getRebirthRequirement(state.rebirths);
  const rebirthProgress = getRebirthProgress(state);
  const canRebirthNow = canRebirth(state);
  const legacyGain = getLegacyGain(state);
  const legacyPreview = legacyGain || getNextLegacyGain(state);

  useEffect(() => {
    const newAchievements = state.achievements.filter((id) => !previousAchievements.current.includes(id));
    previousAchievements.current = state.achievements;
    if (newAchievements.length === 0) return;
    const achievement = ACHIEVEMENT_MAP[newAchievements[newAchievements.length - 1]];
    if (!achievement) return;
    setToast({
      type: 'achievement',
      title: 'Achievement unlocked',
      text: achievement.name
    });
  }, [state.achievements]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleClick = () => dispatch({ type: 'CLICK' });
  const handleBuyFirstScout = () => dispatch({ type: 'BUY_BUILDING', id: 'scout', amount: 1 });
  const handleBuyBuilding = (id) =>
    dispatch({ type: 'BUY_BUILDING', id, amount: state.settings.buyAmount });
  const handleSellBuilding = (id) => dispatch({ type: 'SELL_BUILDING', id, amount: 1 });
  const handleSetBuyAmount = (amount) => dispatch({ type: 'SET_BUY_AMOUNT', amount });
  const handleToggleConversion = (stage) => dispatch({ type: 'TOGGLE_CONVERSION', stage });
  const handleBuyUpgrade = (id) => dispatch({ type: 'BUY_UPGRADE', id });
  const handleClaimTitle = () => dispatch({ type: 'CLAIM_TITLE' });
  const handleBuyLegacy = (id) => dispatch({ type: 'BUY_LEGACY', id });
  const handleToggleAutomation = (key) => dispatch({ type: 'TOGGLE_AUTOMATION', key });

  const handleRebirth = () => {
    const current = stateRef.current;
    const gain = getLegacyGain(current);
    if (gain <= 0) return;
    const nextRebirths = current.rebirths + 1;
    const story = nextRebirths <= LAST_STORY_INDEX ? REBIRTH_STEPS[nextRebirths] : null;
    dispatch({ type: 'REBIRTH', now: Date.now() });
    setRebirthOpen(false);
    if (story) setStoryPopup({ story, gain });
  };

  const handleBottleneckAction = (action) => {
    if (!action) return;
    if (action.type === 'BUY_BUILDING') {
      dispatch({ type: 'BUY_BUILDING', id: action.id, amount: action.amount || 1 });
    } else if (action.type === 'CLAIM_TITLE') {
      dispatch({ type: 'CLAIM_TITLE' });
    } else if (action.type === 'OPEN_REBIRTH') {
      setRebirthOpen(true);
    } else if (action.type === 'CLICK') {
      dispatch({ type: 'CLICK' });
    }
  };

  const handleReset = () => {
    resetGame();
    window.setTimeout(saveNow, 150);
    setResetOpen(false);
    setSettingsOpen(false);
    setStoryPopup(null);
    setToast({ type: 'info', title: 'Progress reset', text: 'A fresh notebook is ready.' });
  };

  const handleExport = () => downloadSave(stateRef.current);

  const handleImport = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        dispatch({ type: 'IMPORT_STATE', state: normalizeState(parsed), now: Date.now() });
        window.setTimeout(saveNow, 150);
        setToast({ type: 'info', title: 'Save imported', text: 'Your local progress was replaced by the imported save.' });
      } catch {
        setToast({ type: 'error', title: 'Import failed', text: 'That file is not a valid Idle Sports save.' });
      }
    };
    reader.onerror = () => {
      setToast({ type: 'error', title: 'Import failed', text: 'The file could not be read.' });
    };
    reader.readAsText(file);
  };

  const dismissOffline = () => dispatch({ type: 'DISMISS_OFFLINE', now: Date.now() });

  return (
    <>
      <a className="skip-link" href="#main">Skip to game</a>
      <div className="app">
        <Topbar
          savedAt={savedAt}
          lastUpdated={state.lastUpdated}
          saveError={saveError}
          onSettings={() => setSettingsOpen(true)}
          onHelp={() => setHelpOpen(true)}
        />

        <ResourceHud
          state={state}
          rates={rates}
          effective={effective}
          canRebirthNow={canRebirthNow}
          rebirthProgress={rebirthProgress}
          rebirthRequirement={rebirthRequirement}
          legacyGain={legacyPreview}
          onClick={handleClick}
          onBuyFirstScout={handleBuyFirstScout}
          onOpenRebirth={() => setRebirthOpen(true)}
        />

        <main id="main">
          <div className="layout">
            <div className="main-column">
              <div className={`tab-panel ${activeTab === 'play' ? 'active' : ''}`.trim()} data-tab="play">
                <Pipeline
                  state={state}
                  rates={rates}
                  buyAmount={state.settings.buyAmount}
                  onSetBuyAmount={handleSetBuyAmount}
                  onBuy={handleBuyBuilding}
                  onSell={handleSellBuilding}
                  onToggleConversion={handleToggleConversion}
                />
              </div>

              <div className={`tab-panel ${activeTab === 'upgrades' ? 'active' : ''}`.trim()} data-tab="upgrades">
                <UpgradesPanel
                  state={state}
                  showAll={showAllUpgrades}
                  onToggleShowAll={() => setShowAllUpgrades((value) => !value)}
                  onBuy={handleBuyUpgrade}
                />
              </div>
            </div>

            <aside className="side-column">
              <div className={`tab-panel ${activeTab === 'play' ? 'active' : ''}`.trim()} data-tab="play">
                <BottleneckPanel bottleneck={bottleneck} state={state} onAction={handleBottleneckAction} />
                <SeasonPanel state={state} onClaim={handleClaimTitle} />
                <AutomationPanel state={state} onToggle={handleToggleAutomation} />
              </div>
            </aside>
          </div>

          <div className="secondary-grid">
            <div className={`tab-panel ${activeTab === 'stats' ? 'active' : ''}`.trim()} data-tab="stats">
              <StatsPanel state={state} rates={rates} effective={effective} history={history} />
            </div>

            <div className={`tab-panel ${activeTab === 'legacy' ? 'active' : ''}`.trim()} data-tab="legacy">
              <LegacyPanel
                state={state}
                showAll={showAllLegacy}
                onToggleShowAll={() => setShowAllLegacy((value) => !value)}
                onBuy={handleBuyLegacy}
              />
            </div>
          </div>
        </main>

        <footer className="footer">
          <span>Idle Sports · Analytics Engine</span>
          <span>
            Local-first build · {formatNumber(state.run.score)} run score · {formatNumber(state.stats.best.runScore)} best
          </span>
        </footer>
      </div>

      <MobileNav activeTab={activeTab} onChange={setActiveTab} />

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        savedAt={savedAt}
        lastUpdated={state.lastUpdated}
        saveError={saveError}
        onExport={handleExport}
        onImport={handleImport}
        onOpenReset={() => {
          setSettingsOpen(false);
          setResetOpen(true);
        }}
      />
      <OfflineModal summary={state.lastOffline} onClose={dismissOffline} />
      <RebirthModal
        open={rebirthOpen}
        state={state}
        onClose={() => setRebirthOpen(false)}
        onConfirm={handleRebirth}
      />
      <StoryModal
        story={storyPopup?.story}
        gain={storyPopup?.gain || 1}
        onClose={() => setStoryPopup(null)}
      />
      <ResetModal
        key={resetOpen ? 'reset-open' : 'reset-closed'}
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={handleReset}
      />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

export default App;
