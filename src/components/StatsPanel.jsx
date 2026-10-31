import { ACHIEVEMENTS } from '../game/config.js';
import {
  formatDuration,
  formatNumber,
  formatPercent,
  formatRate,
  formatWhole,
  getBuildingContribution,
  getRebirthRequirement,
  getScoreRate,
  getScoreWeightsLabel
} from '../game/engine.js';
import { Icon } from './Icon.jsx';
import { Pill } from './ui.jsx';

const Sparkline = ({ history }) => {
  if (!history || history.length < 2) {
    return (
      <div className="sparkline-empty">
        <Icon name="chart" size={24} />
        <p className="muted small">Collecting run data. The chart samples every 5 seconds.</p>
      </div>
    );
  }

  const width = 400;
  const height = 96;
  const padding = 6;
  const values = history.map((point) => point.score);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const range = max - min || 1;
  const points = history
    .map((point, index) => {
      const x = padding + (index / Math.max(1, history.length - 1)) * (width - padding * 2);
      const y = height - padding - ((point.score - min) / range) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Run score over the last few minutes"
    >
      <polygon className="sparkline-area" points={areaPoints} />
      <polyline className="sparkline-line" points={points} />
    </svg>
  );
};

export const StatsPanel = ({ state, rates, effective, history }) => {
  const contribution = getBuildingContribution(state);
  const scoreRate = getScoreRate(state, rates, effective);
  const bestRun = state.stats.best.runScore;
  const unlocked = new Set(state.achievements);
  const nextThreshold = getRebirthRequirement(state.rebirths);

  return (
    <section className="panel stats-panel">
      <div className="panel-header">
        <div>
          <div className="section-kicker">
            <Icon name="chart" size={16} />
            <span>Career & statistics</span>
          </div>
          <h2>The numbers behind the engine</h2>
          <p className="muted">Lifetime totals, current pipeline balance and the run-score chart.</p>
        </div>
        <Pill tone="accent">
          {formatWhole(state.achievements.length)} / {formatWhole(ACHIEVEMENTS.length)} achievements
        </Pill>
      </div>

      <div className="career-grid">
        <div className="career-stat">
          <span className="muted small">Best run score</span>
          <strong>{formatNumber(bestRun)}</strong>
        </div>
        <div className="career-stat">
          <span className="muted small">Current run score</span>
          <strong>{formatNumber(state.run.score)}</strong>
          <span className="muted small">/ {formatNumber(nextThreshold)}</span>
        </div>
        <div className="career-stat">
          <span className="muted small">Score rate</span>
          <strong>{formatRate(scoreRate)}</strong>
        </div>
        <div className="career-stat">
          <span className="muted small">Rebirths</span>
          <strong>{formatWhole(state.stats.lifetime.rebirths)}</strong>
        </div>
        <div className="career-stat">
          <span className="muted small">Titles earned</span>
          <strong>{formatWhole(state.stats.lifetime.titles)}</strong>
          <span className="muted small">best {formatWhole(state.stats.best.titles)}</span>
        </div>
        <div className="career-stat">
          <span className="muted small">Lifetime data</span>
          <strong>{formatNumber(state.stats.lifetime.data)}</strong>
        </div>
        <div className="career-stat">
          <span className="muted small">Manual clicks</span>
          <strong>{formatWhole(state.stats.lifetime.clicks)}</strong>
        </div>
        <div className="career-stat">
          <span className="muted small">Play time</span>
          <strong>{formatDuration(state.stats.lifetime.playSeconds)}</strong>
        </div>
        <div className="career-stat">
          <span className="muted small">Offline time</span>
          <strong>{formatDuration(state.stats.lifetime.offlineSeconds)}</strong>
        </div>
        <div className="career-stat">
          <span className="muted small">Legacy points</span>
          <strong>{formatWhole(state.legacyPoints)}</strong>
        </div>
      </div>

      <div className="stats-section">
        <div className="stats-section-head">
          <h3>Run score</h3>
          <span className="muted small">last 5 minutes</span>
        </div>
        <Sparkline history={history} />
        <p className="muted small">{getScoreWeightsLabel()}</p>
      </div>

      <div className="stats-section">
        <div className="stats-section-head">
          <h3>Pipeline contribution</h3>
          <span className="muted small">gross stage output</span>
        </div>
        <div className="contribution-list">
          {contribution.map((row) => (
            <div key={row.id} className="contribution-row">
              <div className="contribution-label">
                <span>{row.name}</span>
                <span className="muted small">
                  {formatRate(row.outputRate)} {row.outputCurrency}
                </span>
              </div>
              <div className="contribution-track" aria-hidden="true">
                <div className={`contribution-fill ${row.id}`} style={{ width: `${row.share * 100}%` }} />
              </div>
              <span className="contribution-share">{formatPercent(row.share)}</span>
            </div>
          ))}
        </div>
        <p className="muted small">
          Contribution counts gross output at each stage. Conversions consume part of that value further down the pipeline.
        </p>
      </div>

      <div className="stats-section">
        <div className="stats-section-head">
          <h3>Achievements</h3>
          <span className="muted small">{formatWhole(state.achievements.length)} unlocked</span>
        </div>
        <div className="achievement-grid">
          {ACHIEVEMENTS.map((achievement) => {
            const isUnlocked = unlocked.has(achievement.id);
            return (
              <div
                key={achievement.id}
                className={`achievement ${isUnlocked ? 'unlocked' : ''}`.trim()}
                title={achievement.description}
                aria-label={`${achievement.name}: ${isUnlocked ? 'unlocked' : 'locked'} — ${achievement.description}`}
              >
                <span className="achievement-icon">
                  <Icon name={isUnlocked ? 'check' : 'lock'} size={14} />
                </span>
                <span>{achievement.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
