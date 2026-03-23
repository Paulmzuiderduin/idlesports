# Idle Sports

Idle Sports is a standalone sports analytics idle game. Collect data, turn it into insights, and convert that into wins, fans, and titles.

## Local development

```
npm install
npm run dev
```

## Environment

Create a `.env` file based on `.env.example`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Supabase

Schema lives in `supabase/schema.sql` and includes:
- `idle_saves` (user-scoped JSON game state)
- `leaderboard_entries` (public read leaderboard)

## Deployment

GitHub Pages workflow is at `.github/workflows/pages.yml` and expects repo secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Custom domain is `idlesports.paulzuiderduin.com` (see `CNAME`).
