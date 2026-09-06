# Notes

## Session & token management

### Token storage: `localStorage`

The backend returns the access token in the login response body and serves `Access-Control-Allow-Origin: *`. Since credentialed cross-origin requests are not supported with a wildcard origin, an httpOnly cookie flow is not available with the current backend setup.

That leaves `localStorage` and `sessionStorage` as the practical options:

- `localStorage` survives refreshes and new tabs, but is accessible to JavaScript if there is an XSS issue.
- `sessionStorage` has the same XSS exposure, but is cleared when the tab closes and would require logging in again in every new tab.

I chose `localStorage` because the assignment explicitly expects the session to survive a refresh, and keeping the session across tabs is useful here. The app does not render untrusted user HTML, which keeps the XSS surface limited. For a production system handling real credentials, I would prefer a backend supported httpOnly cookie flow.

### Authorization header

A single axios instance in [`src/api/client.ts`](src/api/client.ts) handles authenticated requests. A request interceptor reads the current token and adds `Authorization: Bearer <token>`, so the header logic is not repeated across API calls.

The token is also kept in a module level variable after being read from storage, which avoids reading `localStorage` on every request.

### Session restore on refresh

`AuthProvider` starts with `hasToken = Boolean(getToken())`. If a token exists, it validates the session using `GET /auth/me` through React Query.

`ProtectedRoute` shows a loader while that check is in progress, so a valid session is not briefly redirected to `/login` during refresh.

After login, the provider fetches `/auth/me` before marking the session as authenticated. If verification fails, the token is cleared instead of keeping an unverified session.

### Session expiry

Any 401 from an authenticated request clears the token and redirects the user to `/login`.

`client.ts` lives outside React, so it exposes `setUnauthorizedHandler(fn)`. `AuthProvider` registers that handler and uses it to clear cached authenticated data and navigate to `/login`. This keeps routing inside the SPA without forcing a full page reload.

A 401 from `/auth/login` is excluded from this flow because it means invalid credentials, not an expired session.

### Logout

Logout always clears the local session, even if `POST /auth/logout` fails.

I also checked the live backend and found that calling `/auth/logout` does not currently revoke the token — the same token still returns `200` from `/auth/me` afterwards. Because of that, local cleanup is required regardless of the server response.

A network or backend failure during logout should not leave the user signed in locally.

## Keeping the chart fast

### Two canvases, no thinning

The chart uses two canvas layers.

The main canvas renders the segment bands, produce markers, axes and cumulative production line. It is redrawn only when the data, zoom range or chart size changes.

A transparent overlay canvas handles the hover ring and drag-selection rectangle. Pointer movement only redraws this overlay, so mouse movement does not trigger a redraw of thousands of markers.

### No downsampling

The assignment allows thinning, but requires that FAIL markers are never dropped. At the expected data size, Canvas can render all markers comfortably, so I kept the full dataset instead of adding a lossy sampling path.

- Marker geometry is prepared once per data change as `{ time, y, result, produceType }` values. Date parsing and colour selection do not happen inside the draw loop.
- Markers are rendered in three batched passes: WIP triangles, PASS circles, then FAIL crosses. FAIL markers are drawn last so they stay visible even in dense areas.
- Each pass uses a single `beginPath()` followed by one `fill()` or `stroke()`.
- Only markers inside the current zoom range are drawn. The visible range is found with binary search on the time-sorted marker array.
- Hover lookup uses the same sorted data, so hit-testing is `O(log n)` instead of scanning every marker.

### Performance check

I ran the real `buildProduceMarkers` logic against a live payload. Preparing 5,091 markers took 3.1 ms and only happens when the data changes.

A 15-minute zoom reduced the visible set to 8 markers, so redraw cost drops as the user zooms in. I also verified that the markers stay time-sorted and that all 9 FAIL markers remain in the render set.

### About the 10k–20k requirement

The assignment mentions 10,000–20,000 individual produce rows, but the live API I tested did not reach that range.

Across the available asset levels and dates I checked, the largest response was around 5,400 rows. Individual machines returned around 480 rows or no data, while higher asset levels aggregated to the same line-level dataset.

I did not add a synthetic 20k benchmark just to report a larger number. The rendering approach is designed to scale to that range: markers are batched, hover does not redraw the main layer, and zoom only draws the markers currently in view.

## Time handling

### UTC API, IST UI

The API uses UTC and the UI uses IST (`+05:30`, no DST).

The selected date and shift start/end times are first combined in IST, then converted to UTC for `time_range`. All timestamps returned by the API are converted back to IST before display.

`shift_timings` contains shift start times, not `[start, end]` pairs. Each start time runs until the next one, and the last wraps back to the first. Each derived window is shown as its own Shift option.

### Hourly bucketing

The hourly columns follow the backend bucket boundaries.

Both `produce_counts.bucket_start` and cycle-time `bucket_start` are aligned to UTC hour marks. In IST, those boundaries fall at `:30`, which matches the reference screenshots such as `08:30–09:30` rather than `08:00–09:00`.

The column edges are therefore:

> `[window start, every UTC hour boundary inside the window, window end]`

For an `08:30–19:00` shift, this creates 11 columns, with the final column covering `18:30–19:00`.

Produce and cycle-time buckets are matched directly to these boundaries. The chart axis uses the same grid so the chart and table stay aligned.

Segments are split at each column boundary and the overlap duration is added to the correct category. A segment spanning multiple columns contributes to each one separately.

I verified this against live data: every column adds up to its full duration — 60 minutes for the full-hour columns and 30 minutes for the final half-hour column.

## Findings from the live API

These are a few backend behaviours that affected the implementation.

### 1. `produce_counts` only counts `produce_type: "FIRST"`

The payload contained 5,091 produce rows, but only 467 were `FIRST`. The rest were repeated `WIP` observations across 559 unique parts.

I compared the values bucket by bucket and the `FIRST` counts matched `produce_counts` exactly. Because of that, the cumulative production line advances only for `FIRST` produces. Its final value therefore matches the table's Total value: 467.

Counting every produce row would have pushed the chart to 5,091 while the table still showed 467, so the two views would disagree.

### 2. `result` contains three values

The live data contains `PASS | FAIL | WIP`, while `produce_type` contains `FIRST | WIP`.

This also matches the screenshot legend:

- circles = FIRST (PASS)
- crosses = FIRST (FAIL)
- triangles = WIP

All three marker types are rendered.

### 3. Added a Planned Downtime row

The written assignment lists nine table rows, but the live `downtimes` response also contains `type: "planned"` entries such as `TEA BREAK` and `LUNCH BREAK`.

Without a Planned Downtime row, those durations have nowhere to go and some hourly columns no longer add up to their full span. In my test data, two columns added up to 47.8 and 30.0 minutes instead of 60.

I added a Planned Downtime row. After that, every column adds up correctly, and the row also matches what is shown in the reference screenshot.

### 4. The Fail row can show 0 while FAIL markers exist

In the payload I tested, all 9 FAIL markers were WIP-stage failures.

The table's Fail row uses `ng_count`, which only counts FIRST-stage failures, so it correctly remains 0. The chart still renders every FAIL marker because hiding them would violate the assignment requirement.

The chart and table are measuring different things in this case, so both values are kept as-is.

### 5. `/auth/logout` does not revoke the token

Covered in the logout section above.

## Assumptions

- **Default date:** 23 June 2026, so the dashboard opens with data immediately. I did not clamp the picker to 22–25 June because the assignment also asks for an empty state. The backend returns generated data for many out-of-range dates, so a clearly empty date such as 31 Dec 2027 is needed to test it.
- **Asset picker:** implemented as cascading Asset Level → Asset selectors to stay close to the screenshot. Any selectable node uses its `id` and `assetlevel_id` as the `entity_scope`. Asset levels are labelled as `Level {id}` because the API does not provide level names.
- **`stoppages` shape:** kept defensive because the array was empty in both the sample payloads and every live response I checked.
- **Empty values:** elapsed periods with no production show `0`. Future columns in an in-progress shift stay blank. Null cycle-time values also stay blank rather than showing `0`.
