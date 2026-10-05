# Inbox backend (Phase 1)

Zero-dependency Node service: Gmail triage ops, Google Tasks sync, snooze
scheduler, enrichment. Tests: `npm test` (9 tests, mocked fetch).

## Setup (live Gmail)

1. Google Cloud Console → enable **Gmail API** + **Tasks API** → OAuth client
   (Desktop) → note client ID/secret.
2. Get a refresh token via any OAuth playground with scopes:
   `https://www.googleapis.com/auth/gmail.modify`
   `https://www.googleapis.com/auth/tasks`
3. Export env and run:

```sh
export PORT=8787 SNOOZE_DB=/tmp/snooze.json
node src/index.mjs
```

4. Exchange/refresh tokens with `POST oauth2.googleapis.com/token`
   (see `src/google.js`), then call the API with
   `Authorization: Bearer <access_token>`.

## Routes

- `GET /health` — no auth.
- `GET /api/threads` — inbox stream (summary list).
- `POST /api/done {id}` — archive. `POST /api/pin {id, pinned}`.
- `POST /api/snooze {id, fireAt}` — archive + schedule return.
- `POST /api/tick` — return due snoozes (run on a timer).
- `GET|POST /api/reminders` — Google Tasks "Inbox Reminders" list.
- `POST /api/enrich {from, subject, snippet}` — assists + bundle guess.

Without a token every route returns `{local: true}` and the web app runs
fully local. Run `POST /api/tick` every minute (cron/systemd timer) in prod.
