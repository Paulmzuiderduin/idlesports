import { BUILDING_MAP, RESOURCES } from '../game/config.js';
import {
  formatNumber,
  formatPercent,
  formatSignedRate,
  formatWhole,
  getBuildingCost,
  getFanHypeMultiplier,
  getTitleMultiplier
} from '../game/engine.js';
import { Icon } from './Icon.jsx';
import { ProgressBar } from './ui.jsx';

const resourceDetails = (state, rates, effective) => ({
  data: {
    value: formatNumber(state.resources.data),
    meta: `Net ${formatSignedRate(effective.dataNet)}`,
    metaClass: effective.dataNet < 0 ? 'negative' : ''
  },
  insights: {
    value: formatNumber(state.resources.insights),
    meta: `Net ${formatSignedRate(effective.insightsNet)}`,
    metaClass: effective.insightsNet < 0 ? 'negative' : ''
  },
  wins: {
    value: formatNumber(state.resources.wins),
    meta: `Net ${formatSignedRate(effective.winsNet)}`,
    metaClass: effective.winsNet < 0 ? 'negative' : ''
  },
  fans: {
    value: formatNumber(state.resources.fans),
    meta: `+${formatPercent(getFanHypeMultiplier(state.resources.fans) - 1)} hype`,
    metaClass: ''
  },
  titles: {
    value: formatWhole(state.resources.titles),
    meta: `+${formatPercent(getTitleMultiplier(state.resources.titles) - 1)} global`,
    metaClass: ''
  }
});

export const ResourceHud = ({
  state,
  rates,
  effective,
  canRebirthNow,
  rebirthProgress,
  rebirthRequirement,
  legacyGain,
  onClick,
  onBuyFirstScout,
  onOpenRebirth
}) => {
  const details = resourceDetails(state, rates, effective);
  const firstScoutCost = getBuildingCost(BUILDING_MAP.scout, 0, 1);
  const buyFirstScout = state.buildings.scout === 0 && state.resources.data >= firstScoutCost;
  return (
    <section className="hud" aria-label="Resources and main actions">
      <div className="hud-resources">
        {RESOURCES.map((resource) => {
          const detail = details[resource.id];
          return (
            <div key={resource.id} className={`resource-tile ${resource.className}`}>
              <div className="resource-label">
                <Icon name={resource.id} size={17} />
                <span>{resource.label}</span>
              </div>
              <p className="resource-value">{detail.value}</p>
              <p className={`resource-meta ${detail.metaClass}`.trim()}>{detail.meta}</p>
            </div>
          );
        })}
      </div>

      <div className="hud-actions">
        <button
          className="btn primary click-button"
          onClick={buyFirstScout ? onBuyFirstScout : onClick}
        >
          <span className="click-button-label">
            <Icon name={buyFirstScout ? 'spark' : 'bolt'} size={18} />
            {buyFirstScout ? 'Buy first Scout' : 'Run data pull'}
          </span>
          <span className="click-button-value">
            {buyFirstScout ? `${formatNumber(firstScoutCost)} data` : `+${formatNumber(rates.dataPerClick)}`}
          </span>
        </button>

        <div className="hud-rebirth">
          <div className="hud-rebirth-head">
            <span>Run score</span>
            <span>
              {formatNumber(state.run.score)} / {formatNumber(rebirthRequirement)}
            </span>
          </div>
          <ProgressBar value={rebirthProgress * 100} max={100} tone="warm" label="Rebirth progress" />
          <button
            className={`btn ${canRebirthNow ? 'accent' : 'ghost'} rebirth-button`}
            onClick={onOpenRebirth}
          >
            {canRebirthNow ? `Rebirth +${formatWhole(legacyGain)} legacy` : 'Rebirth details'}
          </button>
        </div>
      </div>
    </section>
  );
};
