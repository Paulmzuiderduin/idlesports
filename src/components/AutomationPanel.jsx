import { getAutomationRows, formatWhole } from '../game/engine.js';
import { Icon } from './Icon.jsx';
import { Pill } from './ui.jsx';

export const AutomationPanel = ({ state, onToggle }) => {
  const rows = getAutomationRows(state);
  const lastAuto = state.lastAutoRebirth;

  return (
    <section className="panel automation-panel">
      <div className="panel-header">
        <div>
          <div className="section-kicker">
            <Icon name="automation" size={16} />
            <span>Automation</span>
          </div>
          <h2>Let the lab run</h2>
          <p className="muted">Unlocked by the story. Toggle each helper on when you want less manual work.</p>
        </div>
      </div>

      <div className="automation-list">
        {rows.map((row) => (
          <label key={row.key} className={`automation-row ${row.unlocked ? '' : 'locked'}`.trim()}>
            <input
              type="checkbox"
              checked={row.enabled}
              onChange={() => onToggle(row.key)}
              disabled={!row.unlocked}
            />
            <span className="automation-copy">
              <span className="automation-title">
                {row.label}
                {!row.unlocked && <Pill tone="subtle"><Icon name="lock" size={11} /> {row.unlockLabel}</Pill>}
              </span>
              <span className="muted small">{row.description}</span>
            </span>
            <Pill tone={row.enabled ? 'accent' : 'subtle'}>{row.enabled ? 'On' : row.unlocked ? 'Off' : 'Locked'}</Pill>
          </label>
        ))}
      </div>

      {lastAuto && (
        <p className="muted small automation-last">
          Last auto-rebirth: +{formatWhole(lastAuto.gain)} legacy at rebirth {formatWhole(lastAuto.rebirths)}.
        </p>
      )}
    </section>
  );
};
