import { formatDuration } from '../game/engine.js';
import { Icon } from './Icon.jsx';
import { Pill } from './ui.jsx';

export const Topbar = ({ savedAt, lastUpdated, saveError, onSettings, onHelp }) => {
  const savedAgo = savedAt ? Math.max(0, (lastUpdated - savedAt) / 1000) : null;
  return (
    <header className="topbar">
      <div className="brand">
        <p className="eyebrow">Idle Sports</p>
        <h1>Analytics Engine</h1>
        <p className="subtitle">
          Turn raw match data into insights, wins and silverware. Built local-first; your progress stays in this browser.
        </p>
      </div>

      <div className="topbar-actions">
        <div className="local-status" role="status">
          <span className={`status-dot ${saveError ? 'danger' : ''}`} aria-hidden="true" />
          <div>
            <Pill tone={saveError ? 'warn' : 'accent'}>Local save</Pill>
            <p className="muted small">
              {saveError
                ? 'Save failed — check browser storage.'
                : savedAgo != null
                  ? `Saved ${formatDuration(savedAgo)} ago`
                  : 'Autosaves every few seconds'}
            </p>
          </div>
        </div>
        <div className="topbar-buttons">
          <button className="btn icon ghost" onClick={onHelp} aria-label="How to play">
            <Icon name="help" size={19} />
          </button>
          <button className="btn icon ghost" onClick={onSettings} aria-label="Settings">
            <Icon name="settings" size={19} />
          </button>
        </div>
      </div>
    </header>
  );
};
