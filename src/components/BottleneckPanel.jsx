import { BUILDING_MAP } from '../game/config.js';
import { formatNumber, getBuildingCost } from '../game/engine.js';
import { Icon } from './Icon.jsx';

export const BottleneckPanel = ({ bottleneck, state, onAction }) => {
  const action = bottleneck.action;
  const building = action?.type === 'BUY_BUILDING' ? BUILDING_MAP[action.id] : null;
  const cost = building
    ? getBuildingCost(building, state.buildings[building.id] || 0, action.amount || 1)
    : 0;
  const missing = building
    ? Math.max(0, cost - (state.resources[building.costCurrency] || 0))
    : 0;
  const canAct = Boolean(action) && missing <= 0;

  return (
    <section className={`panel bottleneck-panel ${bottleneck.key}`}>
      <div className="section-kicker">
        <Icon name="spark" size={16} />
        <span>Next best action</span>
      </div>
      <h2>{bottleneck.title}</h2>
      <p className="muted">{bottleneck.detail}</p>
      {action && (
        <button className={`btn ${canAct ? 'primary' : 'ghost'}`} onClick={() => onAction(action)} disabled={!canAct}>
          {canAct
            ? bottleneck.cta
            : `Need ${formatNumber(missing)} more ${building?.costCurrency || 'resources'}`}
          {canAct && <Icon name="arrow" size={16} />}
        </button>
      )}
    </section>
  );
};
