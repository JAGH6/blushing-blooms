# Tetris Family Competition

Daily Tetris with one game per person per day, leaderboard, and optional daily SMS to the family.

## Quick start (local)

1. **Database (Supabase)**  
   - Create a project at [supabase.com](https://supabase.com).  
   - Run the SQL in [supabase/schema.sql](supabase/schema.sql) in the SQL editor.

2. **Environment**  
   Create `.env.local` (or set in Vercel):

   - `SUPABASE_URL` — project URL  
   - `SUPABASE_SERVICE_ROLE_KEY` — service role key (Settings → API)  
   - `JWT_SECRET` — any long random string (for session tokens)  
   - **Auth (codes):**  
     - Email: `RESEND_API_KEY`, `RESEND_FROM` (e.g. `Tetris <onboarding@resend.dev>`)  
     - SMS: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`  
   - **Daily SMS cron:**  
     - `CRON_SECRET` — secret to protect `/api/cron/daily-sms`  
     - `FAMILY_PHONES` — comma-separated numbers, e.g. `+15551234567,+15559876543`  
     - Or add rows to the `family_phones` table in Supabase.  
   - Optional: `CORS_ORIGIN` (default `*`)

3. **Run locally**  
   - `npm install`  
   - `npx vercel dev` (serves static files and API under one origin)

4. **Open**  
   - Go to the URL shown (e.g. `http://localhost:3000`).  
   - Play runs at `/tetris.html`; leaderboard/stats at `/stats.html`.

## Deploy (Vercel)

1. Push to GitHub and import the repo in Vercel.  
2. Add the same env vars in Vercel (Project → Settings → Environment Variables).  
3. Deploy. The cron runs daily at **20:00 UTC** (configure in [vercel.json](vercel.json)).

## Deploy checklist (free shareable URL)

Use this to get a link like `https://your-app.vercel.app` at no cost.

- [ ] **Supabase** — Sign up at [supabase.com](https://supabase.com), create a project, run [supabase/schema.sql](supabase/schema.sql) in the SQL editor. Copy **Project URL** and **service_role** key from Settings → API.
- [ ] **GitHub** — Create a repo, push your code (`git remote add origin <url>`, `git push -u origin main`).
- [ ] **Vercel** — Sign up at [vercel.com](https://vercel.com) with GitHub. New Project → Import your repo.
- [ ] **Env vars** — In Vercel (Project → Settings → Environment Variables) add:
  - `SUPABASE_URL` — Supabase project URL
  - `SUPABASE_SERVICE_ROLE_KEY` — Supabase service_role key
  - `JWT_SECRET` — long random string (e.g. 32+ chars from [randomkeygen.com](https://randomkeygen.com))
  - Optional (email sign-in): `RESEND_API_KEY`, `RESEND_FROM`
  - Optional (SMS / daily text): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `CRON_SECRET`, `FAMILY_PHONES`
- [ ] **Deploy** — Trigger deploy (or push again). Copy your project URL — that’s your **landing page** link to share. Users click “Play Tetris” to open the game.

## Game rules (v1)

- **One game per person per calendar day.**  
- **Sign-in:** email only (free code via Resend).  
- **10 levels;** each level speeds up; level 10 is hard but beatable. 10 lines per level.  
- **Scoring:** line clears (100/300/500/800), level-completion bonus (1000 × level), beat-game bonus + speed bonus. No points for soft drop.  
- **Daily trivia:** after your run, answer one multiple-choice question (6 options). Correct answer = +100 bonus points.  
- **Tiebreaker:** same score → faster completion time wins.

## v1 features

- Daily leaderboard and **personal stats** (high score, average, current/longest streak, achievements).  
- **Daily notes** (family journal): leave a short reflection after playing; view everyone’s notes on the stats page.  
- **Weekly themes:** optional themed challenges (e.g. Speed Week) via `weekly_themes` table; game applies `gravityMultiplier` when set.  
- **Family milestones:** unlock milestones (table `milestones`); show on stats page.  
- **Player customization:** avatar URL and theme (PATCH `/api/me`).  
- **Live scoreboard:** open [live.html](live.html) on a shared screen; auto-refreshes every 10 seconds.  
- **AI feedback:** optional; set `OPENAI_API_KEY` and POST to `/api/feedback/generate` after a run for a short AI summary (stored in `game_feedback`).

## Replacing music

Place your own files in `assets/`:

- `music.mp3` — background loop  
- `levelup.mp3` — level-up sound (optional)

See [assets/README.md](assets/README.md).
