# Recon map: Routin - Smart Route Planner (Android) -> MotoNav

Scope: the whole visible product (route planning, stops, optimisation options, results, navigation hand-off, address book, import, visit notes, reports, credits).
For: the user's own product, MotoNav: motorcycle riders first (couriers, delivery, field work), own name, own design, rebuilt fresh.
Date: 2026-10-31

Evidence marks: `seen` = in a store screenshot I opened (replica/screens/store-NN), `read` = stated in a page I read (URL given), `user` = reported by the user from their own use, `guess` = inferred.

## Sources

| # | source | URL | what it gave |
| --- | --- | --- | --- |
| 1 | Play Store listing | https://play.google.com/store/apps/details?id=tr.com.ussal.smartrouteplanner | full description verbatim, what's new, data safety, developer, similar apps, 3 reviews, trailer link (see replica/sources/listing.md) |
| 2 | 11 store screenshots | same page, saved in replica/screens/ | every screen below marked seen |
| 3 | Web search: Routin credit complaints | AppFollow and AppTail pages | credit and ad-limit complaints (second hand, thin) |
| 4 | Web search: motorcycle routing | Calimoto, Kurviger, HERE docs, Garmin and MyRoute forums | what motorcycle routing needs, known failures |
| 5 | Web search: Spoke (Circuit) | Capterra, App Store, competitor blogs | free-tier cap of 10 stops, voice and camera entry praised |
| 6 | Maker's site | https://www.routin.com.tr | blocked in this environment |

## Core loop

Create a route, add stops, set start, end, vehicle and "by distance or by duration", tap optimise, see the stop order on a map with times, drive it via a navigation app, tick each stop done or failed.

## Screens

| ID | screen | how you get there | purpose | key components | evidence |
| --- | --- | --- | --- | --- | --- |
| S01 | Home | app launch | one-tap menu | 10 full-width cards: Add (current location as) stop, Create a new route, Favorite stops, Credits (Subscriptions and Credits), Reports, Import stops, Send feedback, Backup and Restore, Settings, Help, Share this app. Bottom tabs: Home, Routes, Address Book. Light and dark themes | seen 01, 09 |
| S02 | Route map | open a route | the working screen | title "N / Route name" (stop count / name), back arrow, overflow menu, address search with mic, map with numbered markers and teal route line, orange banner with vehicle icon plus "40.33 mi / 3 hours 23 minutes", locate-me button, map-layer button, stops bar "STOPS (18)" with prev/next arrows, filter icon, list icon, bottom bar: speedometer (optimise) button, list/check/map segmented toggle, navigate button (blue), add button (green +) | seen 03, 10 |
| S03 | Route stop list | list toggle | follow the order | cards: coloured numbered marker, address, planned time (08:00, 08:17...), optional note chip ("Customer Notes"), service time (stopwatch + minutes), ID chip, phone and message buttons if the stop has them, row of actions: attachment, fail (red X), done (green check), navigate (yellow arrow), overflow | seen 04 |
| S04 | Add to route (sheet) | green + | pick how to add | list: add from address book (list view), add from address book (map view), add current location as stop, paste coordinates (latitude,longitude), create a new stop, cancel | seen 02, 11 |
| S05 | Address search | search box | find an address | text field with clear button and mic, suggestions list (with an address-book icon for saved ones), Google voice dialog for dictation | seen 05 |
| S06 | Optimize | speedometer button | set the options | Start dropdown (My Location, or any stop). End dropdown (Auto Select, or any stop) plus checkbox "Back to the starting stop". Optimization parameters (collapsible): Optimization method radio By distance / By duration. Mode (Auto) with 4 icons: car, bicycle, motorcycle, walking, marked "Requires subscription". Checkboxes: Use ferry, Use tolls, Use highways, Allow U-turn. Route start time (08:00). More fields below the fold | seen 06 |
| S07 | Stop detail / visit | overflow or tap | note and photos | title "Visit Notes / address", share button, status row ("Waiting" with hourglass, calendar button), Notes field with Clear note and mic, "Add note from template" link, Photos with camera and gallery buttons, thumbnails with red X, SAVE | seen 07 |
| S08 | Report | Reports card | route summaries | date range Start - End with FILTER, share button, table: Route Name, Date, Stops, Distance | seen 08 |
| S09 | Import stops | Import card | bulk add | file import for CSV, KML, GPX, XLS (headline in a store image: "Add hundreds of address at once") | seen 01 (headline), read 1 |
| S10 | Address book | bottom tab | saved places | name, phone, photos, coordinates, address; filter and sort; Google Maps starred places import | read 1 |
| S11 | Favorite stops | Home card | quick re-use | list of favourites | seen 01 (card only), screen guess |
| S12 | Credits / subscription | Home card | buy credits, subscribe | plans, credit packs, video ads | seen 01 (card), read 3 (App Store has a Monthly Starter plan) |
| S13 | Backup and restore | Home card | save and recover data | local backup | seen 01 (card), screen guess |
| S14 | Settings, Help | Home cards | preferences, help | | seen 01 (cards), contents guess |
| S15 | Routes list | bottom tab | open, create, delete routes | route rows | seen tab label, contents guess |

## Flows

```
F01 Plan a route (the core loop)
    S01 -> S15 -> S02 -> S04/S05 (x n) -> S06 -> S02 (numbered markers, banner) / S03 (times)
    happy path clicks: about 4 per stop (green +, method, pick, confirm), then speedometer, options, optimise
    edge: no location permission, address not found, over 300 stops, not enough credit, one stop only

F02 Drive and tick off
    S03 -> navigate (hands over to a chosen nav app) -> back via notification -> done or fail -> next stop
    edge: navigation app not installed, app killed in the background, notification blocked

F03 Add from voice
    S05 mic -> Google voice dialog -> suggestions -> pick -> stop added

F04 Bulk import
    S09 -> pick CSV/KML/GPX/XLS -> stops added or saved to address book
    edge: wrong columns, no coordinates, more than 300 rows

F05 Visit note
    S03 overflow -> S07 -> note, template, photos -> SAVE
    edge: no camera permission, big photos

F06 Reports
    Home -> S08 -> filter by date
    edge: empty range

F07 Out of credit
    S06 optimise -> credit prompt -> watch ad, buy credits or subscribe
```

## Components

| component | variants | states | where |
| --- | --- | --- | --- |
| Home card | icon + label, full width | default, pressed | S01 |
| Bottom tab bar | Home, Routes, Address Book | selected | S01 |
| Numbered marker | blue default, other colours chosen per stop, black start, yellow highlighted | normal, selected, done | S02, S03 |
| Route line | teal polyline | planned | S02 |
| Info banner | vehicle icon + distance / time | car, other vehicles | S02 |
| Stops bar | prev, count, next, filter, list | | S02 |
| Segmented control | list / check / map | one selected | S02 |
| Stop card | with or without phone and message | pending, done, failed | S03 |
| Action row | attach, fail, done, navigate, more | | S03 |
| Bottom sheet menu | 5 options + cancel | | S04 |
| Search field | text, mic, clear | idle, typing, suggestions | S05 |
| Dropdown | start, end | | S06 |
| Radio group | by distance / by duration | | S06 |
| Mode picker | car, bicycle, motorcycle, walking | selected, locked (subscription) | S06 |
| Checkbox | ferry, tolls, highways, U-turn, back to start | | S06 |
| Time field | route start time | | S06 |
| Note field | text + mic + template link | | S07 |
| Photo grid | camera, gallery, remove | | S07 |
| Table | 4 columns | empty, filled | S08 |

## Inferred data model

```
Route          id, name, vehicle (car|bicycle|motorcycle|walking), method (distance|duration),
               start (my location | stop), end (auto | stop | back to start),
               use_ferry, use_tolls, use_highways, allow_uturn, start_time,
               total_distance, total_duration, created_at
               evidence: S06 seen, S02 banner seen          confidence: high
Stop           id, route_id, address_id, order, color, planned_time, service_minutes,
               external_id (the "ID" chip), status (waiting|done|failed), note, photos[]
               evidence: S03, S07 seen                      confidence: high
Address        id, name, address, lat, lng, phone, email, group, note, photo, favorite
               evidence: read 1, S04 "address book", S01 "Favorite stops"   confidence: high
NoteTemplate   id, text            evidence: S07 "Add note from template"   confidence: high
MessageTemplate id, text           evidence: read 1                         confidence: high
Credit         balance, history    evidence: S01 card, read 1, read 3       confidence: medium
Subscription   plan, status        evidence: S06 "Requires subscription", read 3  confidence: medium
```

Relationships: Route 1-n Stop, Address 1-n Stop, Stop 1-n Visit note.

## Feature matrix

See `features.csv`.

## Where the clone can beat the original

1. **Motorcycle mode costs money in the original.** The mode picker (car, bicycle, motorcycle, walking) is locked behind a subscription (seen 06). MotoNav makes the motorcycle the default and free.
2. **Credits frustrate users.** Reviewers report a daily cap on rewarded ads, needing credits to re-optimise, and credits taken per added stop (read 3, second hand, thin). Competitor Spoke caps the free tier at 10 stops (read 5). MotoNav: no credit meter for planning; limits are on stops per route only.
3. **Start stop sometimes ignored.** A review says the app randomly chose a beginning stop instead of the one selected (read 3, one source). MotoNav: the chosen start is a hard constraint with a test.
4. **Motorcycle routing basics are missing everywhere.** Highway avoidance for motorcycles often fails or is all-or-nothing (Garmin and MyRoute forum reports, read 4). MotoNav exposes highway and toll choices per route and shows the effect on distance and time.
5. **Needs cell service.** A competitor review says the stop list will not show without a connection (read 4). MotoNav keeps routes and stop lists on the device.
6. **Account wall.** A Routin reviewer complains the app forces an account before testing (read 1). MotoNav works with no account.

## Out of scope (cannot or should not be cloned)

- Name, logo, icons, colours, screen artwork, store images and copy: MotoNav has its own.
- The maker's code, server, optimiser and private APIs.
- Google Maps tiles and data: MotoNav uses open map data with its own provider and terms.
- Credit prices, ad deals, subscription plans: MotoNav sets its own.

## Size

Screens 15, flows 7, entities 7. Hard parts: routing with vehicle profile and distance/duration choice, optimisation of up to 300 stops in seconds, address search, background delivery confirmation on Android (not possible in a web app), billing if you add any. Size: L for the full mobile clone; M for the working web prototype in this repo.
