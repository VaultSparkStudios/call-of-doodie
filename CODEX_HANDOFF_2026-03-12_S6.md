# CODEX HANDOFF — 2026-03-12 Session 6

Deployment, backend, and repo-configuration changes made this session.

---

## Supabase Integration

**Project:** fjnpzjjyhnpmunfoycrp.supabase.co
**Key type:** Publishable (sb_publishable_...) — safe to embed in client bundle
**RLS:** Enabled. Two policies: public SELECT, public INSERT (score > 0 AND score < 10000000). No UPDATE/DELETE.

**Table schema (`leaderboard`):**
```sql
create table leaderboard (
  id           uuid default gen_random_uuid() primary key,
  name         text not null,
  score        integer not null,
  kills        integer,
  wave         integer,
  "lastWords"  text,
  rank         text,
  "bestStreak" integer,
  "totalDamage" integer,
  level        integer,
  time         text,
  achievements integer,
  difficulty   text,
  "starterLoadout" text,   -- added via ALTER TABLE after initial creation
  ts           bigint,
  created_at   timestamptz default now()
);
```

**SQL run to add starterLoadout:**
```sql
alter table leaderboard add column "starterLoadout" text;
```

---

## Environment Variables

**Local:** `.env.local` in repo root (gitignored via `*.local` in .gitignore)
```
VITE_SUPABASE_URL=https://fjnpzjjyhnpmunfoycrp.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij
```

**GitHub Secrets** (set via `gh secret set`):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## GitHub Actions Workflow Change

`.github/workflows/deploy.yml` — Build step now injects Supabase env vars:
```yaml
- name: Build
  run: npm run build
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

---

## New Files
- `src/supabase.js` — Supabase client (returns null if env vars missing, storage.js falls back to localStorage)

## Modified Files
- `src/storage.js` — loadLeaderboard + saveToLeaderboard now hit Supabase first
- `.github/workflows/deploy.yml` — env injection added
- `package.json` / `package-lock.json` — @supabase/supabase-js@^2 added

---

## Security Notes
- Anon/publishable key is intentionally public — it is embedded in the JS bundle
- RLS is the sole backend protection layer — do not disable it
- Service role key is NOT used and should never be added to the client
- If score abuse becomes an issue, add a Supabase Edge Function for server-side validation
