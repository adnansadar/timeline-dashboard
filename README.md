# Timeline Dashboard

React 18 + TypeScript + MUI v6 dashboard showing an interactive timeline chart and an hourly
production & downtime summary for one machine on one shift, backed by a live MES API.

- [NOTES.md](NOTES.md) — session/token handling, chart performance, time handling, assumptions.
- [spec.md](spec.md) — the working spec and the decisions behind it.

## Running

```bash
npm install
cp .env.example .env    # then edit if you need a different backend
npm run dev
```
