import {
  formatNumber,
  formatWhole,
  getAvailableLegacyUpgrades,
  getLegacyGain,
  getLockedLegacyUpgrades,
  getNextLegacyGain,
  getNextStoryStep,
  getPurchasedLegacyUpgrades,
  getRebirthProgress,
  getRebirthRequirement,
  getStoryStep,
  getUpgradeEffectLabel,
  getUpgradeImpact
} from '../game/engine.js';
import { Icon } from './Icon.jsx';
import { Pill, ProgressBar } from './ui.jsx';

export const LegacyPanel = ({ state, showAll, onToggleShowAll, onBuy }) => {
  const available = getAvailableLegacyUpgrades(state);
  const locked = getLockedLegacyUpgrades(state);
  const purchased = getPurchasedLegacyUpgrades(state);
  const lockedVisible = showAll ? locked : locked.slice(0, 4);
  const threshold = getRebirthRequirement(state.rebirths);
  const progress = getRebirthProgress(state);
  const gainNow = getLegacyGain(state);
  const nextGain = getNextLegacyGain(state);
  const currentStory = getStoryStep(state.rebirths);
  const currentEra =
    state.rebirths > 6 ? `Automation Era +${state.rebirths - 6}` : currentStory.title;
  const nextStory = getNextStoryStep(state.rebirths);
  const nextTitle =
    nextStory?.title ||
    (state.rebirths >= 6 ? `Automation Era +${state.rebirths - 5}` : 'Next era');
  const postStoryGain = state.rebirths >= 6;
  const requirementLabel = (upgrade) =>
    upgrade.requiresRebirths === 0
      ? 'Available now'
      : `After ${upgrade.requiresRebirths} rebirth${upgrade.requiresRebirths === 1 ? '' : 's'}`;

  return (
    <section className="panel legacy-panel">
      <div className="panel-header">
        <div>
          <div className="section-kicker">
            <Icon name="legacy" size={16} />
            <span>Legacy</span>
          </div>
          <h2>Permanent upgrades</h2>
          <p className="muted">
            Rebirth resets the run but keeps legacy upgrades. Spend points to make every future run faster.
          </p>
        </div>
        <Pill tone="accent">{formatWhole(state.legacyPoints)} points</Pill>
      </div>

      <div className="legacy-progress">
        <div className="legacy-progress-head">
          <div>
            <span className="muted small">Current era</span>
            <strong>{currentEra}</strong>
          </div>
          <div className="align-right">
            <span className="muted small">Next rebirth</span>
            <strong>{nextTitle}</strong>
          </div>
        </div>
        <ProgressBar
          value={progress * 100}
          max={100}
          label={`Run score toward ${nextTitle}`}
          tone="warm"
          showValue
          valueLabel={`${formatNumber(state.run.score)} / ${formatNumber(threshold)}`}
        />
        <div className="legacy-gain-row">
          <span>
            If you rebirth now: <strong>{formatWhole(gainNow)} legacy</strong>
          </span>
          <span>
            Gain at threshold: <strong>{formatWhole(nextGain)} legacy</strong>
          </span>
          {postStoryGain && <span>At 150% of the threshold: <strong>2+ legacy</strong></span>}
        </div>
      </div>

      <div className="legacy-grid">
        {available.map((upgrade) => {
          const affordable = state.legacyPoints >= upgrade.cost;
          return (
            <article key={upgrade.id} className={`legacy-card ${affordable ? 'affordable' : ''}`.trim()}>
              <div className="legacy-card-head">
                <div>
                  <h3>{upgrade.name}</h3>
                  <p className="muted small">{upgrade.description}</p>
                </div>
                <Pill tone="subtle">Available</Pill>
              </div>
              <p className="legacy-effect">{getUpgradeEffectLabel(upgrade)}</p>
              <p className="muted small">{getUpgradeImpact(state, upgrade)}</p>
              <button
                className={`btn ${affordable ? 'accent' : 'disabled'}`}
                onClick={() => onBuy(upgrade.id)}
                disabled={!affordable}
              >
                Unlock · {formatWhole(upgrade.cost)} legacy
              </button>
            </article>
          );
        })}
      </div>

      {locked.length > 4 && (
        <button className="btn ghost show-more" onClick={onToggleShowAll}>
          {showAll ? 'Show fewer locked upgrades' : `Show ${locked.length - 4} locked upgrades`}
        </button>
      )}

      {lockedVisible.length > 0 && (
        <div className="legacy-locked">
          <p className="section-label">Next unlocks</p>
          <div className="legacy-locked-list">
            {lockedVisible.map((upgrade) => (
              <div key={upgrade.id} className="legacy-locked-row">
                <div>
                  <span className="strong">{upgrade.name}</span>
                  <span className="muted small"> · {getUpgradeEffectLabel(upgrade)}</span>
                </div>
                <Pill tone="subtle">{requirementLabel(upgrade)}</Pill>
              </div>
            ))}
          </div>
        </div>
      )}

      {purchased.length > 0 && (
        <div className="purchased-block">
          <p className="section-label">Unlocked ({purchased.length})</p>
          <div className="purchased-list">
            {purchased.map((upgrade) => (
              <div key={upgrade.id} className="purchased-row">
                <span className="purchased-name">{upgrade.name}</span>
                <span className="purchased-effect">{getUpgradeEffectLabel(upgrade)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
