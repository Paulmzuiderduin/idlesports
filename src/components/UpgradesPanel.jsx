import {
  canAfford,
  formatCost,
  getAvailableUpgrades,
  getPurchasedUpgrades,
  getUpgradeEffectLabel,
  getUpgradeImpact
} from '../game/engine.js';
import { Icon } from './Icon.jsx';
import { EmptyState, Pill } from './ui.jsx';

export const UpgradesPanel = ({ state, showAll, onToggleShowAll, onBuy }) => {
  const available = getAvailableUpgrades(state);
  const purchased = getPurchasedUpgrades(state);
  const visible = showAll ? available : available.slice(0, 4);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <div className="section-kicker">
            <Icon name="spark" size={16} />
            <span>Run upgrades</span>
          </div>
          <h2>Sharpen the engine</h2>
          <p className="muted">
            One-time boosts for this run. They reset on rebirth, so buy the ones that accelerate your next milestone.
          </p>
        </div>
        {available.length > 4 && (
          <button className="btn ghost" onClick={onToggleShowAll}>
            {showAll ? 'Show fewer' : `Show ${available.length - 4} more`}
          </button>
        )}
      </div>

      {available.length === 0 ? (
        <EmptyState title="Every upgrade is purchased">
          Your run is fully upgraded. Push the next title or rebirth.
        </EmptyState>
      ) : (
        <div className="upgrade-grid">
          {visible.map((upgrade) => {
            const affordable = canAfford(state.resources, upgrade.cost);
            const effectLabel = getUpgradeEffectLabel(upgrade);
            const impact = getUpgradeImpact(state, upgrade);
            return (
              <article key={upgrade.id} className={`upgrade-card ${affordable ? 'affordable' : ''}`.trim()}>
                <div className="upgrade-head">
                  <div>
                    <h3>{upgrade.name}</h3>
                    <p className="muted small">{upgrade.description}</p>
                  </div>
                  <Pill tone={affordable ? 'accent' : 'subtle'}>Tier {upgrade.tier}</Pill>
                </div>
                <dl className="upgrade-facts">
                  <div>
                    <dt>Effect</dt>
                    <dd>{effectLabel}</dd>
                  </div>
                  <div>
                    <dt>At current rates</dt>
                    <dd>{impact || '—'}</dd>
                  </div>
                </dl>
                <button
                  className={`btn ${affordable ? 'accent' : 'disabled'}`}
                  onClick={() => onBuy(upgrade.id)}
                  disabled={!affordable}
                >
                  Buy · {formatCost(upgrade.cost)}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {purchased.length > 0 && (
        <div className="purchased-block">
          <p className="section-label">Purchased this run</p>
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
