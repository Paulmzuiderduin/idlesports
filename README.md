# Idle Sports

Idle Sports is a local-first sports analytics idle game. Collect data, turn it into insights, convert insights into wins, grow a fanbase, claim titles and rebirth for permanent legacy upgrades.

## Local-first by default

The game is fully playable without an account or backend:

- Progress is stored in `localStorage` and autosaves every 5 seconds, when the tab is hidden and before unload.
- Offline production is applied automatically at 40% efficiency for up to 8 hours (upgradeable).
- Settings includes **Export save** / **Import save**, so you can back up or move progress manually.
- Supabase auth, cloud saves and the leaderboard are intentionally disabled in the default build. The integration and database schema stay in the repo for later.

## Development

```bash
npm install
npm run dev
npm run lint
npm test
npm run simulate -- 12
npm run build
```

- `npm run dev` starts Vite.
- `npm run lint` runs ESLint.
- `npm test` runs the pure game-engine tests with `node:test`.
- `npm run simulate -- 12` runs a 12-hour active-player pacing simulation.
- `npm run build` creates the production bundle in `dist/`.

## Project structure

```
src/
  App.jsx                  composition and player actions
  game/
    config.js              economy, buildings, upgrades, story, achievements
    engine.js               pure game logic and reducer
    engine.test.js          engine tests
    persistence.js          localStorage save/load/import/export
  hooks/
    useGame.js              game loop, offline sync and local autosave
  components/              UI panels, HUD, pipeline, modals and navigation
  lib/
    features.js             VITE_CLOUD_ENABLED feature flag
    supabase.js             Supabase client (only created when cloud is enabled)
    cloud.js                cloud save + leaderboard helpers (infrastructure for later)
scripts/simulate.mjs       deterministic pacing simulation
supabase/schema.sql        Postgres tables, new leaderboard columns and RLS
```

## Enabling Supabase later

1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
2. Add `https://idlesports.paulzuiderduin.com` (and `http://localhost:5173`) to **Authentication → URL Configuration**.
3. Set the following locally in `.env`:

```env
VITE_CLOUD_ENABLED=true
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

4. For GitHub Pages, add the repository variable `VITE_CLOUD_ENABLED=true` and the two secrets `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
5. Wire `src/lib/cloud.js` back into the UI (auth panel, cloud sync and leaderboard). The cloud module is kept separate so the local-first build has no Supabase traffic.

The anon key is public in the browser by design. RLS protects user-scoped writes. Leaderboard values are still client-reported, so treat the leaderboard as casual unless you validate entries server-side.

When cloud is re-enabled, also namespace the local save by user (or prompt on account switch). The current local-first build has no account context, so the localStorage save is intentionally shared by the browser.

## Known limitations

- Cloud auth/sync/leaderboard UI is not wired into the current local-first build. `src/lib/cloud.js` and the schema are ready, but the panels and hooks still need to be added.
- The leaderboard uses best-run titles and wins; it is not server-authoritative.
- The game is a static site; a service worker for full offline installation is not included.

## Deployment

The GitHub Pages workflow is `.github/workflows/pages.yml`. It runs lint, tests and the production build, then deploys `dist`. The custom domain is `idlesports.paulzuiderduin.com` (see `CNAME`).

## Balance

See [`BALANCE.md`](./BALANCE.md) for the current formulas, score weights, rebirth curve and upgrade costs.
