import { useRef, useState } from 'react';

import { CLOUD_FEATURES_ENABLED } from '../lib/features.js';
import {
  formatDuration,
  formatNumber,
  formatPercent,
  formatWhole,
  getLegacyGain,
  getNextStoryStep,
  getRebirthProgress,
  getRebirthRequirement
} from '../game/engine.js';
import { Icon } from './Icon.jsx';
import { Modal, Pill, ProgressBar } from './ui.jsx';

export const HelpModal = ({ open, onClose }) => (
  <Modal
    open={open}
    onClose={onClose}
    eyebrow="How to play"
    title="From notebook to analytics empire"
    size="large"
    footer={<button className="btn primary" onClick={onClose}>Got it</button>}
  >
    <div className="help-grid">
      <div>
        <h3>1. Pull data</h3>
        <p className="muted">
          Click <strong>Run data pull</strong> for instant data. Scouts add passive data, so the first Scout is the
          best early purchase.
        </p>
      </div>
      <div>
        <h3>2. Build the chain</h3>
        <p className="muted">
          Data → Insights → Wins → Fans. Each stage consumes the previous resource. Pause a conversion in its
          building card when you want to stockpile input for a purchase or a title.
        </p>
      </div>
      <div>
        <h3>3. Claim titles</h3>
        <p className="muted">
          Wins buy titles. Each title gives +6% global output for the rest of the run, and your best title count is
          saved forever.
        </p>
      </div>
      <div>
        <h3>4. Rebirth</h3>
        <p className="muted">
          Rebirth resets resources, buildings, run upgrades and titles. You keep legacy upgrades, legacy points,
          achievements and career bests. The run score is lifetime production in the current run, not what you are
          holding.
        </p>
      </div>
      <div>
        <h3>5. Go offline</h3>
        <p className="muted">
          While away you earn 40% of active production for up to 8 hours. Legacy upgrades improve the rate and cap.
          The game applies offline gains automatically and shows a summary.
        </p>
      </div>
      <div>
        <h3>6. Keep the engine balanced</h3>
        <p className="muted">
          Follow the <strong>Next best action</strong> panel when a stage is starved. Auto-buy and auto-claim unlock
          as you move through the story.
        </p>
      </div>
    </div>
    <div className="notice">
      <strong>Local-first:</strong> this build stores progress in this browser. Export a save from Settings before
      clearing browser data.
    </div>
  </Modal>
);

export const SettingsModal = ({
  open,
  onClose,
  savedAt,
  lastUpdated,
  saveError,
  onExport,
  onImport,
  onOpenReset
}) => {
  const fileInputRef = useRef(null);

  return (
    <Modal open={open} onClose={onClose} eyebrow="Settings" title="Lab settings">
      <div className="settings-block">
        <h3>Local save</h3>
        <p className="muted">
          {saveError
            ? `Saving failed: ${saveError}. Check that browser storage is available.`
            : savedAt
              ? `Saved ${formatDuration(Math.max(0, (lastUpdated - savedAt) / 1000))} ago. Autosaves every 5 seconds and when you leave the tab.`
              : 'Autosaves every 5 seconds and when you leave the tab.'}
        </p>
        <div className="settings-actions">
          <button className="btn ghost" onClick={onExport}>
            <Icon name="download" size={16} />
            Export save
          </button>
          <button className="btn ghost" onClick={() => fileInputRef.current?.click()}>
            <Icon name="upload" size={16} />
            Import save
          </button>
          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept="application/json,.json"
            tabIndex={-1}
            aria-label="Choose a save file to import"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImport(file);
              event.target.value = '';
            }}
          />
        </div>
      </div>

      <div className="settings-block">
        <h3>Cloud sync</h3>
        <p className="muted">
          {CLOUD_FEATURES_ENABLED
            ? 'Cloud features are enabled by the build flag. The Supabase client and helpers are available; this local-first release does not wire the auth, cloud-save or leaderboard panels yet.'
            : 'Cloud sync is disabled in this build. The game is fully local; the Supabase integration and schema are kept in the repo for later.'}
        </p>
      </div>

      <div className="settings-block danger-zone">
        <h3>Danger zone</h3>
        <p className="muted">Reset every run, legacy upgrade, achievement and career stat stored in this browser.</p>
        <button className="btn danger" onClick={onOpenReset}>
          <Icon name="trash" size={16} />
          Reset all progress
        </button>
      </div>
    </Modal>
  );
};

export const OfflineModal = ({ summary, onClose }) => {
  if (!summary) return null;
  const produced = summary.produced || {};
  return (
    <Modal
      open
      onClose={onClose}
      eyebrow="Welcome back"
      title="The lab kept running"
      hideClose
      footer={<button className="btn primary" onClick={onClose}>Continue</button>}
    >
      <p className="muted">
        You were away for <strong>{formatDuration(summary.elapsedSeconds)}</strong>. At{' '}
        {formatPercent(summary.rate)} efficiency you earned {formatDuration(summary.effectiveSeconds)} of production
        {summary.capped ? ` (capped at ${formatDuration(summary.capSeconds)}).` : '.'}
      </p>
      <div className="offline-gains">
        {Object.entries({
          data: 'Data',
          insights: 'Insights',
          wins: 'Wins',
          fans: 'Fans'
        }).map(([key, label]) => (
          <div key={key} className="offline-gain">
            <span className={`resource-dot ${key}`} aria-hidden="true" />
            <span>{label}</span>
            <strong>+{formatNumber(produced[key] || 0)}</strong>
          </div>
        ))}
      </div>
      <div className="offline-score">
        <span>Run score gained</span>
        <strong>+{formatNumber(summary.scoreGained || 0)}</strong>
      </div>
      <p className="muted small">Offline production is already added to your resources.</p>
    </Modal>
  );
};

export const RebirthModal = ({ open, state, onClose, onConfirm }) => {
  const threshold = getRebirthRequirement(state.rebirths);
  const progress = getRebirthProgress(state);
  const gain = getLegacyGain(state);
  const can = gain > 0;
  const remaining = Math.max(0, threshold - state.run.score);
  const nextStory = getNextStoryStep(state.rebirths);
  const nextTitle = nextStory?.title || `Automation Era +${Math.max(1, state.rebirths - 5)}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Prestige"
      title={can ? 'Start a new notebook?' : 'Not ready yet'}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn accent" onClick={onConfirm} disabled={!can}>
            {can ? `Rebirth · +${formatWhole(gain)} legacy` : 'Keep building'}
          </button>
        </>
      }
    >
      <div className="rebirth-current">
        <div className="rebirth-score">
          <span className="muted small">Run score</span>
          <strong>{formatNumber(state.run.score)}</strong>
          <span className="muted small">/ {formatNumber(threshold)}</span>
        </div>
        <Pill tone="accent">{formatWhole(state.legacyPoints)} legacy points</Pill>
      </div>
      <ProgressBar
        value={progress * 100}
        max={100}
        label="Rebirth progress"
        tone="warm"
        showValue
        valueLabel={can ? `+${formatWhole(gain)} legacy ready` : `${formatNumber(remaining)} to go`}
      />
      <p className="muted">
        Next era: <strong>{nextTitle}</strong>. Rebirth resets resources, buildings, run upgrades, titles and run score.
        It keeps legacy upgrades, legacy points, achievements, current bests and your profile name.
      </p>
      {state.rebirths >= 6 && (
        <div className="notice subtle">
          Rebirth gain scales with overshoot: reaching 150% of the threshold earns 2 legacy points. Auto-rebirth waits
          for 150% once it is unlocked.
        </div>
      )}
    </Modal>
  );
};

export const StoryModal = ({ story, gain, onClose }) => {
  if (!story) return null;
  return (
    <Modal
      open
      onClose={onClose}
      eyebrow="Story rebirth"
      title={story.title}
      footer={<button className="btn primary" onClick={onClose}>Continue</button>}
      hideClose
    >
      <p className="muted">{story.story}</p>
      <div className="story-unlock">
        <Icon name="spark" size={18} />
        <div>
          <strong>What changed</strong>
          <p className="muted small">{story.unlock}</p>
        </div>
      </div>
      <p className="muted small">Legacy gained: +{formatWhole(gain)} point(s).</p>
    </Modal>
  );
};

export const ResetModal = ({ open, onClose, onConfirm }) => {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Danger zone"
      title="Reset everything?"
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn danger" onClick={onConfirm} disabled={!confirmed}>
            Reset all progress
          </button>
        </>
      }
    >
      <p className="muted">
        This removes the save from this browser: resources, buildings, upgrades, legacy, achievements and career stats.
        Export a save first if you might want to come back.
      </p>
      <label className="toggle-row confirm-row">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
        <span>I understand this cannot be undone.</span>
      </label>
    </Modal>
  );
};
