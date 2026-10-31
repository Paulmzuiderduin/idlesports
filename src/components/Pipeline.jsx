import { BUILDINGS, BUILDING_MAP, RESOURCE_VALUE } from '../game/config.js';
import {
  formatNumber,
  formatPercent,
  formatRate,
  getBuildingCostForAmount,
  getBuildingInputPerUnit,
  getBuildingPerUnitRate,
  getBuildingRefund,
  getFanHypeMultiplier
} from '../game/engine.js';
import { Icon } from './Icon.jsx';
import { Pill } from './ui.jsx';

const conversionForBuilding = (buildingId) => {
  if (buildingId === 'analyst') {
    return {
      stage: 'insights',
      input: 'data',
      output: 'insights',
      label: 'Auto-convert data → insights'
    };
  }
  if (buildingId === 'strategy') {
    return {
      stage: 'wins',
      input: 'insights',
      output: 'wins',
      label: 'Auto-convert insights → wins'
    };
  }
  if (buildingId === 'marketing') {
    return {
      stage: 'fans',
      input: 'wins',
      output: 'fans',
      label: 'Auto-convert wins → fans'
    };
  }
  return null;
};

const BuildingCard = ({ building, state, rates, buyAmount, onBuy, onSell, onToggleConversion }) => {
  const owned = state.buildings[building.id] || 0;
  const modifiers = rates.modifiers;
  const perUnitRate = getBuildingPerUnitRate(building, modifiers);
  const perUnitInput = getBuildingInputPerUnit(building, perUnitRate);
  const conversion = conversionForBuilding(building.id);
  const active = !conversion || state.settings.convert[conversion.stage];
  const actualOutput = active ? perUnitRate * owned : 0;
  const actualInput = active ? perUnitInput * owned : 0;
  const purchase = getBuildingCostForAmount(state, building, buyAmount);
  const cost = purchase.cost;
  const amount = purchase.amount;
  const affordable = (state.resources[building.costCurrency] || 0) >= cost && amount > 0;
  const refund = getBuildingRefund(building, owned, 1);
  const buyLabel =
    amount <= 0
      ? `Need ${formatNumber(cost)} ${building.costCurrency}`
      : `Buy ${buyAmount === 'max' ? `max (${amount})` : amount} · ${formatNumber(cost)} ${building.costCurrency}`;
  const outputValue = perUnitRate * RESOURCE_VALUE[building.outputCurrency];

  return (
    <article className={`building-card ${building.outputCurrency} ${active ? '' : 'paused'}`.trim()}>
      <div className="building-head">
        <div className="building-icon">
          <Icon name={building.outputCurrency} size={20} />
        </div>
        <div className="building-title">
          <h3>{building.name}</h3>
          <p className="muted small">{building.description}</p>
        </div>
        <Pill tone={owned > 0 ? 'accent' : 'subtle'}>{owned} owned</Pill>
      </div>

      <div className="building-stats">
        <div>
          <span className="stat-line-label">Output</span>
          <strong>
            {formatRate(active ? perUnitRate : 0)} {building.outputCurrency}
          </strong>
          <span className="stat-line-sub">per unit</span>
        </div>
        {building.inputCurrency && (
          <div>
            <span className="stat-line-label">Uses</span>
            <strong>
              {formatRate(active ? perUnitInput : 0)} {building.inputCurrency}
            </strong>
            <span className="stat-line-sub">per unit</span>
          </div>
        )}
        <div>
          <span className="stat-line-label">Total</span>
          <strong>
            {formatRate(actualOutput)} {building.outputCurrency}
          </strong>
          <span className="stat-line-sub">
            {building.inputCurrency && active
              ? `uses ${formatRate(actualInput)} ${building.inputCurrency}`
              : active
                ? 'always on'
                : 'conversion paused'}
          </span>
        </div>
      </div>

      <p className="building-value muted small">
        ≈ {formatNumber(outputValue)} data-equivalent per unit/s
      </p>

      {conversion && (
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={state.settings.convert[conversion.stage]}
            onChange={() => onToggleConversion(conversion.stage)}
          />
          <span>{conversion.label}</span>
          <Pill tone={active ? 'subtle' : 'warn'}>{active ? 'On' : 'Paused'}</Pill>
        </label>
      )}

      <div className="building-actions">
        <button
          className={`btn ${affordable ? 'primary' : 'disabled'} buy-button`}
          onClick={() => onBuy(building.id)}
          disabled={!affordable}
        >
          {buyLabel}
        </button>
        <button
          className="btn ghost sell-button"
          onClick={() => onSell(building.id)}
          disabled={owned <= 0}
          title="Sell one building for 50% of its cost"
        >
          {owned > 0 ? `Sell 1 · +${formatNumber(refund)}` : 'Sell 1'}
        </button>
      </div>
    </article>
  );
};

export const Pipeline = ({
  state,
  rates,
  buyAmount,
  onSetBuyAmount,
  onBuy,
  onSell,
  onToggleConversion
}) => {
  const fanHype =
    state.resources.fans > 0
      ? ` Fans currently give +${formatPercent(getFanHypeMultiplier(state.resources.fans) - 1)} global output.`
      : '';
  return (
    <section className="panel operations-panel">
      <div className="panel-header">
        <div>
          <div className="section-kicker">
            <Icon name="arrow" size={16} />
            <span>Operations</span>
          </div>
          <h2>Build the pipeline</h2>
          <p className="muted">
            3 data → 1 insight → 2 insights → 1 win → 1 win → 1 fan. Pause a stage to stockpile its input.
            <span className="muted small">{fanHype}</span>
          </p>
        </div>
        <div className="buy-amount">
          <span className="muted small">Buy amount</span>
          <div className="chip-row" role="group" aria-label="Buy amount">
            {[1, 10, 'max'].map((amount) => (
              <button
                key={amount}
                className={`chip ${buyAmount === amount ? 'active' : ''}`}
                onClick={() => onSetBuyAmount(amount)}
                aria-pressed={buyAmount === amount}
              >
                {amount === 'max' ? 'Max' : amount}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pipeline">
        {BUILDINGS.map((building) => (
          <BuildingCard
            key={building.id}
            building={building}
            state={state}
            rates={rates}
            buyAmount={buyAmount}
            onBuy={onBuy}
            onSell={onSell}
            onToggleConversion={onToggleConversion}
          />
        ))}
      </div>

      <div className="pipeline-footnote">
        <span>
          <strong>{formatNumber(getBuildingInputPerUnit(BUILDING_MAP.analyst, 1))}</strong> data per insight
        </span>
        <span>
          <strong>{formatNumber(getBuildingInputPerUnit(BUILDING_MAP.strategy, 1))}</strong> insights per win
        </span>
        <span>
          <strong>{formatNumber(getBuildingInputPerUnit(BUILDING_MAP.marketing, 1))}</strong> win per fan
        </span>
      </div>
    </section>
  );
};
