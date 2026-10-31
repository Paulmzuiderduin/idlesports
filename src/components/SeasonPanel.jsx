import { BASE } from '../game/config.js';
import {
  canClaimTitle,
  formatNumber,
  formatPercent,
  formatWhole,
  getChampionshipRequirement
} from '../game/engine.js';
import { Icon } from './Icon.jsx';
import { Pill, ProgressBar } from './ui.jsx';

export const SeasonPanel = ({ state, onClaim }) => {
  const cost = getChampionshipRequirement(state.resources.titles);
  const canClaim = canClaimTitle(state);
  const progress = cost > 0 ? Math.min(1, state.resources.wins / cost) : 0;

  return (
    <section className="panel season-panel">
      <div className="panel-header">
        <div>
          <div className="section-kicker">
            <Icon name="titles" size={16} />
            <span>Season push</span>
          </div>
          <h2>Titles</h2>
          <p className="muted">
            Spend wins on a title for +{formatPercent(BASE.titleGlobalBonus)} global output this run.{' '}
            Titles reset on rebirth; your best count is saved.
          </p>
        </div>
        <Pill tone="accent">{formatWhole(state.resources.titles)} this run</Pill>
      </div>

      <div className="season-numbers">
        <div>
          <span className="muted small">Best titles</span>
          <strong>{formatWhole(state.stats.best.titles)}</strong>
        </div>
        <div>
          <span className="muted small">Next title</span>
          <strong>{formatNumber(cost)} wins</strong>
        </div>
        <div>
          <span className="muted small">Current bonus</span>
          <strong>+{formatPercent(state.resources.titles * BASE.titleGlobalBonus)}</strong>
        </div>
      </div>

      <ProgressBar
        value={progress * 100}
        max={100}
        label="Wins toward the next title"
        tone="warm"
        showValue
        valueLabel={`${formatNumber(state.resources.wins)} / ${formatNumber(cost)}`}
      />

      <button className={`btn ${canClaim ? 'accent' : 'disabled'}`} onClick={onClaim} disabled={!canClaim}>
        {canClaim ? 'Claim championship (+1 title)' : `Need ${formatNumber(cost - state.resources.wins)} more wins`}
      </button>
    </section>
  );
};
