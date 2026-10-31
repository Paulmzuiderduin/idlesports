# Balance reference

This file is the single reference for the current economy. All values live in `src/game/config.js`; the pure rules live in `src/game/engine.js`.

## Resources and conversions

| Resource | Produced by | Cost / conversion |
|---|---|---|
| Data | Scouts, fans, clicks | Base currency |
| Insights | Analyst Pods | 3 data → 1 insight |
| Wins | Strategy Labs | 2 insights → 1 win |
| Fans | Fan Outreach | 1 win → 1 fan |
| Titles | Season Push | 20 wins × 1.3 per owned title |

Data-equivalent values used for contribution stats: data 1, insights 3, wins 6, fans 6.

## Run score and rebirth

Run score is **lifetime production in the current run**, not current holdings. Spending resources therefore never lowers the rebirth meter.

```
run score = data produced × 1
          + insights produced × 3
          + wins produced × 6
          + fans produced × 6
          + titles claimed × 150
```

Rebirth thresholds:

| Story era | Threshold |
|---|---:|
| Printed Stat Sheet | 300 |
| Excel Tracker | 1,000 |
| Cross-Match Comparisons | 2,500 |
| Match Scoring App | 6,000 |
| Expanded App Suite | 12,000 |
| Automatic Tracking | 24,000 |

After the story, the next threshold is `24,000 × 1.22^(rebirths − 5)`.

Legacy points:

- Story rebirths: 1 point.
- Post-story: `1 + floor((run score − threshold) / (0.5 × threshold))`, so 1 point at the threshold and 2 points at 150%.
- Auto-rebirth waits for 150% of the threshold.

## Buildings

| Building | Base cost | Cost multiplier | Output | Input |
|---|---:|---:|---|---|
| Scout Bots | 10 data | 1.13 | 0.8 data/s | — |
| Analyst Pods | 50 data | 1.14 | 0.30 insights/s | 0.9 data/s |
| Strategy Lab | 200 insights | 1.15 | 0.10 wins/s | 0.20 insights/s |
| Fan Outreach | 200 wins | 1.16 | 0.50 fans/s | 0.50 wins/s |

Cost for `n` units at `owned` follows the geometric series. Selling refunds 50% and always sells one building at a time.

## Clicks and fans

```
data per click = (1 + click upgrades) × global multiplier + data/s × 0.05
fan data/s     = 0.03 × fans × data multiplier × global multiplier
fan hype       = 1 + log10(1 + fans) × 0.25
```

The logarithmic fan hype prevents a runaway feedback loop while keeping the fan stage relevant. Fans are a global multiplier and a data source; Marketing is no longer a score trap.

## Titles

- Cost: `ceil(20 × 1.3^titles)` wins.
- Bonus: +6% global output per title.
- Titles reset on rebirth; `stats.best.titles` and lifetime titles are saved.
- The first title costs 20 wins; the tenth costs 276 wins.

## Standard upgrades

| Upgrade | Cost | Effect |
|---|---|---|
| Fast Queries | 50 data | +2 data/click |
| Vector Warehouse | 250 data | +25% data/s |
| Vision Models | 25 insights | +30% insights/s |
| Late Game Scripts | 10 wins | +35% wins/s |
| Pipeline Accelerator | 80 insights | +50% data/s |
| Season Tickets | 40 fans | +40% fans/s |
| Insight Optimizer | 20 wins | +50% insights/s |
| Strategy Protocols | 100 fans | +60% wins/s |
| Fan Analytics | 30 wins | +75% fans/s |
| Title Sponsor | 150 wins | +10% all output |
| Championship Algorithm | 400 wins | +15% all output |
| Data Monopoly | 600 wins | +20% all output |

All standard upgrades reset on rebirth. The UI shows their absolute impact at current rates, not only the percentage.

## Legacy upgrades

The complete tree costs **32 legacy points** across 16 upgrades. It covers data/insight/win/fan multipliers, click power, two global multipliers, offline rate and offline cap. All effects are permanent.

Offline:

- Base rate: 40%.
- Base cap: 8 hours.
- +10 percentage points at Automatic Tracking (rebirth 6).
- Legacy Offline Prep: +10 percentage points.
- Legacy Offline Operations: +15 percentage points.
- Two cap upgrades: +8 hours each.

## Automation

| Unlock | Rebirth | Behaviour |
|---|---:|---|
| Auto-buy | 2 | Buys one building every 2 seconds, prioritising the current bottleneck. |
| Auto-claim titles | 4 | Claims one title every 2 seconds when affordable. |
| Auto-rebirth | 6 | Rebirths at 150% of the next threshold. |

Automation is stored in the save and can be toggled individually.

## Starting data

- New game: 10 data (enough for the first Scout).
- After rebirth: 25 data (avoids a dead restart before auto-buy is unlocked).

## Design rationale

- **Lifetime run score** removes the old “stop spending before rebirth” problem.
- **Consistent score weights** (1/3/6/6/150) align the meter with the actual conversion chain.
- **Fans as a logarithmic global multiplier** make the final stage worth building without letting it explode.
- **Title and fan upgrades cost wins/fans**, not titles, so they cannot become net-zero traps.
- **Legacy curve** uses 1.22× post-story thresholds and 1–3 points per run instead of 1.35× and one point, so the tree is completable in a reasonable number of runs.
- **Automation and a starting-data grant** reduce the manual rebuy grind after every reset.
- **Progressive disclosure** keeps only the next four upgrades/locked legacy items visible until the player asks for more.

## Pacing check

`npm run simulate -- 12` runs a deterministic active-player approximation (one building every 2 seconds, one upgrade every 5 seconds, titles claimed when affordable, rebirths at the threshold). On the current numbers:

- First rebirth: ~1m 10s.
- Sixth story rebirth (Automatic Tracking): ~20 minutes.
- All 16 legacy upgrades: ~4h 30m.
- 12-hour result: ~56 rebirths, ~500M best run score.

This is an active-play upper bound, not an idle or offline baseline. Re-run the script after changing any economy constant.
