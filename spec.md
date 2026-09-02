# Timeline Dashboard — Working Spec

Implementation spec for the "Senior Frontend Assignment — Timeline Dashboard (with Auth)".
This is the source of truth for decisions we've agreed and for rules reverse-engineered from
the target screenshots. `NOTES.md` (written in phase 6) is the submission-facing summary.

Backend: `https://fractaldmsdev.centralindia.cloudapp.azure.com` (no `/api` prefix).
Credentials: `analytics_user` / `dashboard123`. **Data exists only for 22–25 June 2026.**

---

## 1. Verified backend facts

- `GET /auth/me` unauthenticated returns `401` inside the MES envelope:
  `{"trace_id":…,"status_code":401,"message":"Missing or invalid Authorization header","data":null}`
- **CORS is wide open**: `Access-Control-Allow-Origin: *`, all methods, `Authorization` allowed.
  So no Vite dev proxy is needed, and direct browser calls work in dev and on Vercel.
  It also means credentialed cookie auth is impossible (`*` forbids credentials) — which
  independently justifies storing the token in JS-readable storage.
- `GET /` returns `502`. That's an unrouted root, not an outage.

---

## 2. Decisions

| Area | Decision | Rationale |
| --- | --- | --- |
| Framework | React 18 + MUI v6 | The brief names both; MUI v6's supported peer range is React 17/18 |
| Server state | TanStack Query v5 | Free loading/error/retry/refetch — all explicitly graded |
| Auth state | Small `AuthContext` | Token + user only; not server state |
| Filter state | Local React state | Fed into the query key so any change refetches |
| Chart | Hand-rolled Canvas 2D | The perf requirement is the graded core; no library gives us this control |
| Downsampling | **None — draw every point** | Nothing is dropped, so no FAIL can ever be hidden |
| Token storage | `localStorage` | Survives refresh (a red flag if missing); XSS tradeoff documented |
| Routing | react-router-dom v6 | The brief names real `/login` and `/dashboard` routes |
| Dates | dayjs + `utc` + `timezone` | One dep serves both conversion and `AdapterDayjs` |
| Hour buckets | UTC hour grid, labelled IST | See §4 — this is what the screenshots actually show |
| Table rows | The brief's 9 rows, its order | The brief deliberately trimmed the real screen |
| Chart Y axis | Cumulative production | Matches both screenshots |
| Asset picker | Cascading Asset Level → Asset | Mirrors the screenshot filter bar |
| Zoom | Shift+drag to brush, dbl-click reset | Matches the screenshot hint chip; render that chip |
| Theming | Default MUI + `SEGMENT_COLORS` | Only the band colours carry meaning |
| Fixtures / mocks | None — live backend only | See §8 risk 1 |
| Tests | None — manual verification | See §8 risk 2 |
| Deploy | Vercel, `VITE_API_BASE_URL` | CORS is open, so no rewrites needed |

---

## 3. Code constraints (from tsconfig)

- `strict: true` — added in phase 1; it was missing from the scaffold.
- `verbatimModuleSyntax: true` — type-only imports **must** use `import type { … }`.
- `erasableSyntaxOnly: true` — **no TS `enum`s**. Use `as const` objects + derived unions
  (see `src/utils/constants.ts`).
- `noUnusedLocals` / `noUnusedParameters` — keep signatures clean.

---

## 4. Time handling — the part that's easy to get wrong

The API speaks **UTC**; the UI speaks **IST (Asia/Kolkata, +05:30, no DST)**.
Every timestamp sent goes out as UTC; every timestamp displayed converts back to IST.

### Shift window

`shift_timings` is a list of shift **start** times, not a `[start, end]` pair.
Shift `i` runs `timings[i]` → `timings[(i+1) % n]`; if end ≤ start it crosses midnight into the
next day. Present one selector option per index, e.g. `main (00:30 – 12:30)`.
Build the window in IST from the picked date, then convert both ends to UTC `Z`.

### Hour columns — the key insight

The backend's `produce_counts.bucket_start` and the cycle-time `bucket_start` sit on **UTC hour
marks**. A UTC hour mark rendered in IST lands on `:30` — which is exactly why the screenshot
columns read `08:30–09:30`, not `08:00–09:00`.

> **column edges = `[from_ts, …every UTC hour mark strictly inside the window…, to_ts]`**

For `03:00Z–13:30Z` (= 08:30–19:00 IST) that gives 11 columns, the last a 30-minute
`18:30–19:00` — matching the screenshot exactly. Bucket keys then match by identity, with no
remapping. This backend's real shift (`["00:30","12:30"]` = `19:00Z` / `07:00Z`) is also
UTC-hour-aligned, so the grid stays clean there too.

### Segment → column minutes

For each segment clipped to the window, and each column:
`overlapMs = max(0, min(segEnd, colEnd) − max(segStart, colStart))`, added to that column's row
for the segment's kind. A segment spanning three hours contributes to three columns.

### In-progress shift

If `to_ts > now`, columns starting after now (IST) stay **blank, not zero-filled**.

### Sanity invariant

Per fully-elapsed column: `runtime + unplanned-production + stoppage + unknown ≈ 60` min.

---

## 5. Kind mapping

Drives both the chart bands and the table rows, so they cannot disagree.

| Source | Kind | Table row | Colour |
| --- | --- | --- | --- |
| `runtimes[].type === "planned"` | `runtime` | Runtime | teal `#1AA098` |
| `runtimes[].type === "unknown unplanned production"` | `unplanned-production` | Unplanned Production | olive `#A9C520` |
| `stoppages[]` | `stoppage` | Stoppage | purple `#5B4BD1` |
| `downtimes[].type === "unknown"` | `unknown-downtime` | Unknown Downtime | salmon `#F47B60` |
| `downtimes[]` with any other type / a `downtime_name` | `planned-downtime` | *see §8 risk 3* | dark green `#4E9A1E` |

### Produce & cycle-time rows

`produce_counts` → group by `bucket_start`, **summing across `part_model_id`**.
Total = `ok + ng`, Pass = `ok`, Fail = `ng`.
Cycle-time buckets match into the same column by `bucket_start`; `null` renders as a **blank
cell, never `0`**.

---

## 6. Chart

Both toggle states share a **cumulative-production Y axis**.

- **Toggle off:** one labelled point per hourly bucket, running sum of `ok + ng`, joined by a line.
- **Toggle on:** flatten `produces` across buckets, **sort by `first_seen_ts` once** (the brief
  warns it is unsorted), and the sorted index *is* the Y value.
  Circle = PASS, cross = FAIL.
- Segment bands are drawn full-height **behind** the series, with a rotated label when the band
  is wider than ~14px.

### Performance approach

No thinning — every point is drawn, so no FAIL can ever be hidden. Speed comes from:

1. **Precomputed typed arrays** — `Float64Array` times, `Float32Array` y, `Uint8Array` isFail,
   built once per data change. No date parsing or colour lookups in the render path.
2. **Layer separation** — a static canvas redrawn only on data/zoom/resize, and an overlay
   canvas for hover + brush rectangle, so pointer moves never touch the 20k points.
3. **Binary-search hit-testing** — points are already sorted by time, so hover is O(log n).

Zoom: shift+drag to brush a range, double-click to reset, minimum span 60s (`MIN_ZOOM_SPAN_MS`).
Pan is not required.

---

## 7. API client contract

One `request()` helper in `src/api/client.ts` owns base URL, `Authorization: Bearer <token>`,
envelope unwrapping (`data` on success, `message` when `status_code >= 400`), and error mapping.
The header is wired **only** here — wiring it per-call is a listed red flag.

| Status | Behaviour |
| --- | --- |
| 401 | Clear token, redirect `/login` — **except** on `/auth/login`, where it's just a bad-credentials message |
| 403 | Show "access denied" |
| 422 | Surface the body's field messages |
| 500 | Retryable — 2 retries with backoff, via a React Query `retry` predicate so 4xx never retries |

---

## 8. Risks & open items

1. **No fallback if the backend goes down.** Live-only, no fixtures. If `/analytics-query`
   becomes unavailable mid-week, development stalls; we'd reconsider committing the sample
   payloads.
2. **No tests.** The two arithmetic red flags (5½-hour shift, per-hour minutes that don't add
   up) look fine on screen. Mitigation: the hourly table ships **before** the chart, so the
   numbers are verifiable by hand first.
3. **Named downtimes have no row.** The brief's 9-row set has no home for a downtime with a
   `downtime_name` (LUNCH BREAK / TEA BREAK in the screenshots) and a non-`unknown` type. If
   live data contains them, those minutes vanish and the ≈60 invariant breaks.
   **Verify against real data in phase 4**; if present, add a Planned Downtime row and note the
   deviation in `NOTES.md`.
4. **`stoppages[]` shape is unconfirmed** — empty in every sample payload. `StoppageInterval`
   in `src/types/api.ts` is a best guess; confirm against live data.
5. **Dependency hoisting.** `@mui/x-date-pickers@7` initially hoisted `@mui/system@7` above
   MUI v6's `@mui/system@6`, which would have given the pickers a separate theme context.
   Fixed by pinning `@mui/system@^6` as a direct dependency — **do not remove it**.

### Explicitly out of scope

From the brief, plus screenshot features we are deliberately not building: segment
classification / create-downtime dialogs, auto-refresh & polling, CSV/PDF export, i18n,
multi-theme, settings, browsable asset-hierarchy drill-down, part-model chips, the point-labels
toggle, the NOW marker, "last observed produce", and the unknown-segments warning bar.

---

## 9. Phases

| # | Phase | Contents |
| --- | --- | --- |
| 1 | **Setup** — done | React 18 downgrade, deps, scaffold strip, strict mode, env, folders, providers |
| 2 | Auth & session | `api/client.ts`, `AuthContext`, `LoginPage`, `ProtectedRoute`, `AppHeader` |
| 3 | Filters & data | Asset tree, shifts, cascading selects, date picker, toggle, refresh, both analytics calls |
| 4 | Hourly table | `utils/time.ts`, `utils/segments.ts`, `HourlyTable` — verifies the bucketing on screen |
| 5 | Timeline chart | Typed-array geometry, layered canvases, zoom, hover |
| 6 | Polish & submit | States, 403/422, `NOTES.md`, README, Vercel deploy |

Phase 4 lands before phase 5 on purpose: it puts the UTC→IST bucketing on screen as numbers we
can check by hand, so the chart is built on already-verified data.

---

## 10. Verification checklist

1. Log in as `analytics_user` / `dashboard123` → lands on `/dashboard`.
2. Hard-refresh → still logged in (restore-on-load).
3. `/dashboard` in a private window → redirected to `/login`.
4. Corrupt the token in localStorage, refresh → cleared, redirected to `/login`.
5. Logout → `/login`, token gone.
6. Pick a date in 22–25 June 2026 and the `main` shift → data renders.
7. **Timezone:** the axis starts at the shift's IST start time, not 5½ hours off. Cross-check one
   tooltip against the raw UTC value in DevTools.
8. **Agreement:** a band on the chart shows the same minutes in the table column beneath it.
9. **Arithmetic:** for a fully-elapsed column,
   `runtime + unplanned-production + stoppage + unknown ≈ 60`.
10. **Perf:** toggle individual produces on, confirm 10k–20k rows in DevTools, then shift+drag
    zoom repeatedly and sweep the pointer — no multi-second freeze. Record a Performance profile
    for the `NOTES.md` claim.
11. **Empty state:** a date outside 22–25 June → empty state, not a crash.
12. Kill the network mid-request → error state with a working retry.
