# Recon map: Routin - Akıllı Rota Planlayıcı (Android)

Scope: the whole product described on the public listing. Route planning and optimisation for many stops, vehicle type, route preference, hand-off to navigation apps, address book, visit logs, import, credits and subscription.
For: the user's own product. Functional clone, rebranded before launch.
Date: 2026-10-19

Evidence level: built from the public Play Store listing text only (Turkish, read verbatim). The 8 listing screenshots and the maker's site (www.routin.com.tr) could not be retrieved in this environment. Every screen, flow, component and field below is INFERRED from the feature list and marked `guess` unless the listing states it. Two features the user reports using, vehicle type (car or motorcycle) and shortest time versus shortest distance, are NOT in the listing and are marked `user-reported`; confirm them with screenshots.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | Play Store listing (tr) | https://play.google.com/store/apps/details?id=tr.com.ussal.smartrouteplanner&hl=tr | description read verbatim; "Reklam içerir", "Uygulama içi satın alma"; rating about 4.8, about 27K reviews |
| 2 | Maker's site | https://www.routin.com.tr | listed on the Play page, blocked here |
| 3 | Screenshots (8) | same Play page | not retrieved, image host blocked |
| 4 | the user's own install | n/a | user reports vehicle type and fastest/shortest options |

## Core loop

Create a route, add stops, tap plan, get the best stop order as a list or on a map, then drive it with the user's navigation app and confirm each delivery.

## Screens (all inferred, confidence: guess)

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Route list / home | app launch | open, create, delete routes | route cards, new route button | empty, filled |
| S02 | Route editor | open a route | stops, start and end, plan button | stop list, map toggle, start/end pickers, plan button | empty, filled, planning, planned |
| S03 | Add stop | editor | add by address search, map long press, voice, postcode | search box, map, mic button | no result, found |
| S04 | Stop detail | tap a stop | phone, email, group, note, photo, message template | form, photo, call and message actions | new, edit |
| S05 | Route options | editor | vehicle type (car, motorcycle) user-reported; preference (fastest time, shortest distance) user-reported; start from current location or any stop; end point auto or chosen | segmented controls, pickers | defaults, changed |
| S06 | Optimised result (list) | after plan | ordered stops, distances | ordered list, drag to reorder guess | ok, failed |
| S07 | Optimised result (map) | after plan | ordered stops on map | map, numbered markers, polyline | ok |
| S08 | Navigation hand-off | start | choose Google Maps, Yandex, Waze, Here WeGo or other | app chooser | app missing |
| S09 | Active route / delivery | during drive | notification to confirm delivery and go to next stop | persistent notification, next stop card | in progress, done |
| S10 | Address book | menu | contacts, customers, delivery addresses | list, search, filter, sort | empty, filled |
| S11 | Import | address book | CSV, KML, GPX, XLS import | file picker, column mapping guess | success, bad file |
| S12 | Visit logs | menu | notes and photos per visit, history, share | list, detail | empty, filled |
| S13 | Reports | menu | route summaries, planned distance by time range | date range picker, summary cards | empty, filled |
| S14 | Credits / subscription | when credit runs out | watch a video ad, buy credits, subscribe | plans, buttons | free, low credit, subscribed |
| S15 | Settings | menu | language, default note and message template, units | list, toggles | default |

## Flows

```
F01 Plan a route
    S01 -> S02 -> S03 (x n) -> S05 -> S06 / S07
    happy path clicks: about 4 per stop plus 3 guess
    edge: no internet, address not found, over 300 stops, no credit, one stop only

F02 Drive and deliver
    S06 -> S08 -> S09 (confirm, next) -> S12
    edge: navigation app not installed, location permission denied, notification blocked, app killed in background

F03 Build from the address book
    S10 -> S02
    edge: duplicate stops, missing coordinates

F04 Import stops
    S11 -> S10 -> S02
    edge: wrong columns, encoding, 300+ rows, bad coordinates

F05 Run out of credit
    S02 -> S14 -> back to S02
    edge: ad fails to load, purchase cancelled, subscription restore

F06 Review visits and reports
    S12 -> S13
    edge: empty range, shared photo privacy
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Button | primary, secondary, text | default, pressed, disabled, loading | all |
| Stop row | numbered, grouped | default, selected, visited, failed | S02, S06 |
| Address search box | text, voice | empty, loading, results, none | S03 |
| Map with markers and route line | stops, current location | loading, ok, offline | S02, S07 |
| Segmented control | vehicle type, route preference | selected, unselected | S05 |
| Notification | delivery confirm, next stop | shown, acted | S09 |
| Form field | text, phone, email, note | empty, valid, error | S04 |
| Photo attach | camera, gallery | none, set | S04, S12 |
| File picker | CSV, KML, GPX, XLS | idle, parsing, error | S11 |
| Plan card | free, credits, subscription | current, locked | S14 |
| Dialog | confirm, error | default | all |

## Inferred data model

```
Route          id, name, vehicle (car | motorcycle) user-reported, preference (fastest | shortest) user-reported,
               start_stop_id, end_stop_id, total_distance, total_duration, created_at
               evidence: S02, S05, listing "başlangıç ve bitiş", "rota mesafeleri"
               confidence: medium
Stop           id, route_id, address_id, position, status (pending | done | failed), visited_at
               evidence: listing "teslimatı onaylayabilir"
               confidence: medium
Address        id, name, address, lat, lng, phone, email, group, note, photo, postcode
               evidence: listing "durak adlarını, telefon numaralarını, fotoğrafları, konumları (enlem, boylam) ve adresleri"
               confidence: high
Visit          id, stop_id, note, photos, created_at
               evidence: listing "ziyaret kayıtları"
               confidence: high
MessageTemplate id, text
               evidence: listing "varsayılan bir not veya mesaj şablonu"
               confidence: high
Credit         balance, last_purchase
Subscription   status, plan, renews_at
               evidence: listing "kredi satın alarak veya abone olarak"
               confidence: medium
```

Relationships: Route 1-n Stop, Address 1-n Stop, Stop 1-n Visit.

## Feature matrix

See `features.csv`. Must: 9, should: 9, could: 8 (3 of the could rows are skip).

## Out of scope (cannot or should not be cloned)

- The app's name, logo, icons, illustrations, colours, wording and screenshots. Rebrand before launch.
- The maker's code, backend, optimisation algorithm and private APIs.
- Map and geocoding data: needs a licensed or open provider with its own terms (not part of the product you can copy).
- Their ad network deals and credit prices: set your own.
- Third-party navigation apps themselves (the clone only hands off to them).

## Size

Screens 15 (inferred), flows 6, entities 7. Hard parts: stop-order optimisation for up to 300 stops in seconds, routing with vehicle profile and fastest/shortest preference, geocoding and address search, background location and delivery notifications on Android, imports (CSV, KML, GPX, XLS), billing with ads, credits and subscription. Size: L (about a quarter) for a full mobile clone. A web or PWA first slice (F01 only) is M.
