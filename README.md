# sing-box Control Panel

A control panel for [sing-box](https://sing-box.sagernet.org)'s **Clash API**
(`experimental.clash_api`) and **V2Ray-compatible stats gRPC API**
(`experimental.v2ray_api`), built with Vite + React + Material UI.

## Stack

- **Vite** + React 18
- **MUI v6** (`@mui/material`, `@mui/x-charts`, `@mui/icons-material`)
- **react-router-dom** for client-side routing
- No i18n — UI copy is English-only, single locale
- Targets the latest Chrome only (no legacy transpilation, no polyfills)
- Light/dark theme follows the OS/browser color-scheme automatically via
  MUI's `CssVarsProvider` (`defaultMode="system"`) — there is no manual
  toggle by design, per the "adaptive to system" requirement

## Getting started

```bash
npm install
npm run dev
```

Then open the app and go to **Settings** to point it at your sing-box
instance's `external_controller` address (default `http://127.0.0.1:9090`)
and its `secret`, if configured. Example sing-box config:

```json
{
  "experimental": {
    "clash_api": {
      "external_controller": "127.0.0.1:9090",
      "secret": "changeme"
    },
    "v2ray_api": {
      "listen": "127.0.0.1:9091",
      "stats": { "enabled": true }
    }
  }
}
```

Because this is a browser app talking directly to `external_controller`,
make sure sing-box's CORS settings (or a reverse proxy) allow requests from
wherever you serve this dashboard. The secret never leaves your browser
except to your configured controller, and at rest it's encrypted
(AES-GCM via the Web Crypto API) before being written to `localStorage` —
see [Storage, performance & efficiency notes](#storage-performance--efficiency-notes) below.

## Feature map

| Area | Clash API endpoints | UI pattern |
|---|---|---|
| Activity | `/version`, `/proxies`, `/connections`, `/rules`, `/traffic` (ws) | stat cards + live chart |
| Proxies | `GET/PUT /proxies`, `/proxies/:name/delay`, `/group/:name/delay` | grouped tables with single-select radios (selector groups) + latency test actions |
| Connections | `GET/DELETE /connections`, `DELETE /connections/:id` | live table with per-row and bulk close actions |
| Rules | `GET /rules` | searchable table |
| Providers | `GET /providers/proxies`, `GET /providers/rules`, update + health-check | tabbed tables with action buttons |
| Logs | `GET /logs` (ws) | live streaming list with level filter |
| Traffic | `GET /traffic` (ws) | real-time line chart |
| Memory | `GET /memory` (ws) | real-time area chart |
| DNS query | `GET /dns/query` | form → results table |
| Cache | `POST /cache/fakeip/flush` | action button |
| Configs | `GET/PATCH/PUT /configs` | switches (booleans), selects (mode/log-level), form (reload) |
| gRPC API | `v2ray.core.app.stats.command.StatsService` (`GetStats`, `QueryStats`, `GetSysStats`) | standalone documentation + `grpcurl` command builder + optional JSON-gateway tester |

### Why gRPC gets its own module

Browsers cannot open raw gRPC (HTTP/2 + trailers) connections, so the stats
service can't be called directly the way the HTTP Clash API is. The **gRPC
API** page instead: documents the service's methods and message shapes,
generates a ready-to-run `grpcurl` command from form input, and — if you run
a grpc-gateway-style JSON/REST transcoding proxy in front of the service —
can POST test requests to it (its URL is set on the Settings page).

## Notes on API coverage

This targets the Clash Meta-compatible surface sing-box documents at
`/configuration/experimental/clash-api/`. A few endpoints (e.g. exact
`/configs` field names, or the exact fake-IP flush path) have shifted across
sing-box releases; if your version's controller responds differently, the
relevant page will surface the raw error from the controller rather than
fail silently — check the sing-box version you're running against if a
request 404s.

## Storage, performance & efficiency notes

The app targets the latest Chrome only (see Stack, above), so it leans on a
few Chrome-native APIs rather than shipping extra JS to get the same effect:

- **Secret encryption at rest** — the Clash API `secret` is encrypted
  (AES-GCM) before it's written to `localStorage`. The key itself is
  generated as `extractable: false` and stored as a `CryptoKey` object in
  IndexedDB, so the raw key material never exists as bytes you could copy
  out of devtools or a storage export — only the ciphertext sits in
  `localStorage`, and the key can only ever be *used* via `SubtleCrypto`,
  not read. (`src/utils/secretStore.js`) Older saved settings with a
  plain-text `secret` are migrated to the encrypted form automatically on
  first load.
- **Page Visibility–aware polling** — all `setInterval`-based polling
  (Activity stats, Connections, the periodic connection-status probe) pauses
  while the tab is hidden and immediately refetches the moment it becomes
  visible again, instead of burning CPU/battery/network in the background
  and then showing stale numbers for up to a full interval after you tab
  back in. (`src/hooks/usePageVisibility.js`)
- **WebSocket auto-reconnect** — the `/logs`, `/traffic`, and `/memory`
  subscriptions now reconnect with exponential backoff + jitter if the
  connection drops (e.g. sing-box restarts), instead of sitting in a dead
  `closed`/`error` state until you navigate away and back.
  (`src/hooks/useClashWebSocket.js`) The small traffic ticker embedded in
  the Activity page also closes its socket while the tab is hidden
  (`pauseWhenHidden`), since nobody's watching it in the background; the
  dedicated Logs/Traffic/Memory pages stay connected regardless, since
  those are meant to be watched continuously.
- **Request cancellation** — polling requests are wrapped in an
  `AbortController` so a slow response can't resolve after a newer one and
  overwrite it with stale data, and in-flight requests are cancelled on
  unmount/settings change instead of finishing pointlessly.
- **Responsive filtering** — the Connections and Rules filter inputs use
  `useDeferredValue` so typing stays snappy even while a large table
  re-filters behind it, and table rows use CSS `content-visibility: auto`
  so off-screen rows skip layout/paint work without needing a virtualization
  library.

## Development notes

`npm install && npm run build && npm run lint` all run clean as of this
revision (Vite 8 / React 18 / MUI 6). If you hit the opposite of that —
`npm run lint` failing only *after* you've run a build — check that
`.eslintignore` exists and excludes `dist/`; the legacy ESLint config used
here does not respect `.gitignore`.
