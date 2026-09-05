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
wherever you serve this dashboard, and treat the secret as sensitive — it's
stored only in the browser's `localStorage`, never sent anywhere but your
configured controller.

## Feature map

| Area | Clash API endpoints | UI pattern |
|---|---|---|
| Dashboard | `/version`, `/proxies`, `/connections`, `/rules`, `/traffic` (ws) | stat cards + live chart |
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

## Known limitations of this build environment

This project was written in an environment without network/npm registry
access, so `npm install` / `npm run build` have not been executed here.
Run `npm install && npm run build` locally to verify before deploying.
