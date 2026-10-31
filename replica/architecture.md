# Architecture: MotoNav (a rebuild of Routin's core features)

Status: a working web prototype exists in `motonav/` (installable web app, no account, data on the device). This file says what it is built from, what is verified, and what comes next.

## Stack

| layer | choice | why |
| --- | --- | --- |
| app | plain HTML, CSS and JavaScript, no build step | opens from any static host; easy to read and change |
| storage | the device (localStorage) | works without an account and without a connection |
| map | Leaflet with OpenStreetMap tiles | open data; tiles need attribution and are for light use only |
| address search | OpenStreetMap's Nominatim, one request per second, search on Enter | free; its policy forbids search-as-you-type |
| routing | a Valhalla-style HTTP engine behind `lib/routing.js` | motorcycle costing, shortest option, matrix and route; swappable in one file |
| optimiser | own code in `lib/optimize.js` | nearest neighbour, 2-opt and or-opt; handles one-way (asymmetric) costs |
| offline | service worker caches the app shell | saved routes and stop lists open without a connection |

Later: Supabase (Postgres, auth, storage) for sync and teams, Stripe if you add paid plans, an Expo or native wrapper for background location and notification check-ins. A first version of that schema is in git history (commit "Add MotoNav architecture and schema").

## Data (on the device)

```
route    id, name, mode, method, useHighways, useTolls, useFerry, startTime, start, end, stops[], plan
stop     id, label, address, lat, lng, phone, note, service, status (waiting | done | failed)
plan     distance, duration, approx, reason, line[], times{stopId: minutes}
book     id, name, address, lat, lng, phone, note, fav
settings lang, theme, server, navApp, mode
```

## Modules

| file | does | tests |
| --- | --- | --- |
| lib/optimize.js | order stops with fixed start and optional fixed end, any cost matrix, planned times | node, 9 tests |
| lib/routing.js | build engine requests (vehicle, shortest, ferry, tolls, highways), read matrix and route answers, fall back to estimates and say so | node, 7 tests, against fabricated engine answers |
| lib/geo.js | coordinates, CSV, GPX, KML, navigation links, formatting | node, 8 tests |
| app.js | screens, state, map, search, import, backup | browser test, 15 steps |

## The parts that bite

- Routing engine (riskiest, unverified live): the requests follow my knowledge of Valhalla's API (`sources_to_targets`, `route`, costing `motorcycle`, `shortest`). The engine could not be reached from the build environment, so the tests answer with fabricated replies. Check against a real server first. The public demo server is for testing only; production needs your own server or a paid provider.
- The matrix limit: public servers often refuse more than about 50 sources and targets, so beyond 50 stops the order is computed from straight-line estimates and the screen says "Tahmini" (estimate).
- Motorcycle semantics: whether highways, tolls and ferries are honoured depends on the engine's motorcycle profile. Test with a known route.
- Background use: a web app cannot track location or show check-in notifications while it is in the background. That needs the native wrapper.
- Address quality for Turkish addresses: test with real street-and-number entries.
- Privacy: everything stays on the device. Address search sends the typed text to the search service, and routing sends stop coordinates to the routing server. Say so in the privacy page before launch.
- Map and search data licences: OpenStreetMap attribution is shown; follow each provider's terms.

## Build order (done and next)

1. Done: route list, route screen, search, add by coordinates and book, optimise sheet (start, end, method, vehicle, switches, start time), list and map result, done and failed, navigation links, address book, import, notes, reports, settings, backup.
2. Next: verify the routing engine live and fix what differs; photos on stops; message button and template; stop colours and filter; Excel import; share route.
3. Then: native wrapper (background location, notification check-ins), sync and teams, billing if wanted.
