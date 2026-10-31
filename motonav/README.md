# MotoNav

A multi-stop route planner, motorcycle first. Add stops, pick the vehicle (motorcycle is the default) and shortest time or shortest distance, optimise the order, see it on a map, and open each stop in your navigation app.

No account. Data stays on the device. Turkish and English.

## Run it

Serve this folder from any static host. For a quick try on your computer:

```bash
python3 -m http.server 8080 --directory motonav
```

Open http://localhost:8080 on the phone's browser (same network) or the computer. GitHub Pages, Netlify and Cloudflare Pages work too: publish the `motonav` folder as is.

Settings has the routing server address. It starts as the public Valhalla demo server, which is for testing only. Enter your own server before real use. Without a reachable server the app still plans, using straight-line estimates, and marks the result as an estimate.

## Test it

```bash
node --test motonav/test/*.test.js                       # optimiser, routing requests, file parsing
NODE_PATH=$(npm root -g) node motonav/test/e2e.js        # browser test, needs Playwright and Chromium
```

The browser test answers every network call itself (search, routing server, map files), so it runs offline. It checks how the app builds requests and reads answers. It does not check the real routing engine.

## What is not done

Photos on stops, a message button and template, stop colours and filter, Excel import, sharing a route, background location and notification check-ins (those need a native app). See `replica/features.csv` for the full list and `replica/architecture.md` for the risks.

Map data (c) OpenStreetMap contributors.
