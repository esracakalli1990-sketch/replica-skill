# Architecture: MotoNav (a rebuild of Routin's core features)

Product: a motorcycle-first multi-stop route planner. Same functions as the recon map, own name, design and code. Platform decision: web app / PWA first (installable on a phone), native wrapper later. Change this table if you pick native Android.

## Stack

| layer | choice | why |
| --- | --- | --- |
| web | Next.js (App Router) + TypeScript, installable PWA | one codebase, usable from a phone browser, cheap to ship |
| styling | Tailwind with tokens from replica-design | own visual identity, not the original's |
| map | MapLibre GL JS with an OpenStreetMap-based tile provider on your own key | open, no vendor lock; check the tile provider's terms |
| routing + optimisation | a routing engine with a motorcycle profile and a shortest-versus-fastest option, accessed through one adapter module | the heart of the product; see "The parts that bite" |
| geocoding | a provider with a free tier and its own key (to be chosen) | address search and postcode lookup |
| database | Postgres on Supabase | one database, auth and storage included |
| auth | Supabase Auth (email, Google) | managed |
| files | Supabase Storage | stop and visit photos |
| payments | Stripe Billing (credits and subscription), slice 3 | prices are yours |
| ads | none at launch | decide with replica-launch |
| jobs | none in slice 1; Supabase scheduled functions later | |
| hosting | Vercel | managed |

## Schema

Tables: 8 (profiles, addresses, routes, stops, visits, message_templates, credit_ledger, plus auth users from Supabase). Access rules: row level security, owner-only on every table (see `replica/schema.sql`). Product limit of 300 stops per route is a database trigger, not just a UI check.

## API

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| POST /api/routes | create a route | owner | name, vehicle, preference | route | F01 |
| GET /api/routes | list my routes | owner | none | routes | F01 |
| PATCH /api/routes/:id | change name, vehicle, preference, start and end | owner | fields | route | F01 |
| DELETE /api/routes/:id | delete a route | owner | none | ok | F01 |
| POST /api/routes/:id/stops | add a stop | owner | label, address, lat, lng | stop | F01 |
| PATCH /api/stops/:id | edit note, status, position | owner | fields | stop | F01, F02 |
| DELETE /api/stops/:id | remove a stop | owner | none | ok | F01 |
| GET /api/geocode?q= | address search | owner | text, bias point | candidates | F01 |
| GET /api/reverse?lat=&lng= | address for a map long-press | owner | point | address | F01 |
| POST /api/routes/:id/plan | optimise the order and compute distance and time | owner | vehicle, preference, start, end | ordered stops, geometry, totals | F01 |
| POST /api/stops/:id/done | mark delivered | owner | none | next stop | F02 |
| GET/POST /api/addresses | address book | owner | fields | addresses | F03 |
| POST /api/addresses/import | CSV, KML, GPX, XLSX import | owner | file | count, errors | F04 |
| POST /api/visits | note and photo for a stop | owner | stop, note, photos | visit | F06 |
| GET /api/reports?from=&to= | route summaries | owner | range | summaries | F06 |

Webhooks in: Stripe (slice 3). Webhooks out: none.
Jobs: none in slice 1.

External services are called only through official, public APIs with your own keys. Never the original app's private endpoints.

## The parts that bite

- routing engine (riskiest): the product needs (a) a motorcycle profile, (b) a fastest versus shortest-distance choice, (c) a multi-stop optimiser for up to 300 stops in a few seconds. Open engines such as Valhalla are reported to offer a motorcycle costing, a shortest option and an optimised-route endpoint, but I could not verify that against official docs in this session. Verify before building, behind one adapter (`lib/routing.ts`) so the engine can be swapped. Public demo servers are for testing only, a production service needs your own hosted engine or a paid provider.
- optimiser size: exact solutions are impossible past a few dozen stops. Use a heuristic (nearest neighbour plus 2-opt) on a distance matrix, and cap the matrix size. A 300-stop matrix is 90,000 entries, so check the engine's matrix limits.
- vehicle semantics: motorcycle routing should respect motorcycle-legal roads and the user's real preferences, not just call a car route. Test with a known route where cars and motorcycles differ.
- geocoding quality in Turkish addresses: test with real street-and-number entries, not only city centres.
- background location and delivery notifications: not possible in a plain PWA. This is the main reason a native wrapper comes later.
- idempotency: Stripe webhooks arrive twice; the credit ledger has a unique `external_ref`.
- races: two plan requests on one route; take a row lock on the route while planning.
- time zones: durations are seconds, timestamps are timestamptz in UTC.
- rate limits: cache geocoding results per address; throttle plan requests per user.
- GDPR/KVKK deletion: all user data cascades from `profiles`; storage files are deleted by a job.
- map and data licences: OpenStreetMap needs attribution; follow the tile provider's terms.

## Build order

1. Vertical slice (route planning): screens S01 route list, S02 route editor, S03 add stop, S05 options (vehicle and preference), S06 list result, S07 map result. Tables profiles, routes, stops. Routes POST/GET/PATCH routes, stops CRUD, geocode, reverse, plan. Done when a signed-in user can add stops, pick motorcycle and shortest or fastest, optimise and see the order on a map.
2. Must-haves: S08 hand-off to navigation apps (deep links), S09 mark delivered, start from current location or any stop, end point choice.
3. Should-haves: S04 stop details, S10 address book, S11 import, S12 visit logs, voice input, message template.
4. Could-haves: S13 reports, S14 credits and subscription (own pricing), multi-language, postcode lookup.
5. Native Android wrapper for background location and notification confirmations.
6. Fixes from replica-entrepreneur, once it has run.
