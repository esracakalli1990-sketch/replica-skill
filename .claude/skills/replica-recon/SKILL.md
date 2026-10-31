---
name: replica-recon
description: >-
  Reverse-engineers any app into a recon map: screen inventory, user flows,
  component list, inferred data model and a feature matrix, from public pages,
  screenshots, app store listings, help docs and the user's own account. The
  first step of the Replica pack. Use when the user says "clone this app",
  "reverse engineer X", "how does X work", "map out X", "what screens does X
  have", "I want to build my own version of X", "copy this app", or pastes an
  app's URL or App Store link and wants to rebuild it. Given a link or a name
  it works on its own: reads the store page, saves and studies the
  screenshots, researches the web, reads user reviews, and proposes how the
  clone can beat the original, without asking the user for pictures first.
---

# replica-recon

Everything else in the pack builds from what this skill writes. A bad recon
map means a bad clone, so take the time here.

Output goes in the user's project:

```
replica/recon.md        the recon map (template: recon-map.md in this folder)
replica/features.csv    the feature matrix (template: features.csv in this folder)
replica/screens/        reference screenshots of the original. Never shipped.
replica/sources/        listing.md, listing.json, reviews.csv from storepage.py
```

## The rules, before anything else

This skill rebuilds **functionality and UX patterns**, clean-room style. It
studies what the app does and how a user moves through it. It does not take
anything the app owns.

- **Public sources and the user's own account only.** Never log into an
  account that is not the user's, never ask for a password, never get past a
  paywall or a login by any trick.
- **Reading, not scraping.** No crawlers, no bulk downloads, no loops. If a
  browser tool is connected to the user's own browser, read pages at human
  speed with the user present.
- **No source code, no private APIs.** Do not read or save the app's
  JavaScript bundles, decompile its binary, or log its network calls to copy
  endpoints. Public API docs are fine to read.
- **Check the terms.** Some products' terms forbid using an account to build a
  competing product. If the user's account is under terms like that, say so
  and work from public sources only.
- **Screenshots are reference.** They live in `replica/screens/`, are used to
  compare layouts, and never go into the clone.

## Autopilot: start here when the user gives a link or a name

Do not ask the user for screenshots, videos or a description first. Go and
get them. Ask only when you are truly blocked, and then ask for the one thing
that unblocks you. Work in this order and tell the user in one short line
what you are doing at each step.

1. **Read the store page.** Stay in the user's project folder and run the tool
   from this skill's folder by its full path (the skill header gives it):

   ```bash
   python3 <this skill folder>/storepage.py "<link or Android package name>" --out replica
   ```

   It writes `replica/sources/listing.md` (name, developer, rating, downloads,
   the full description verbatim, what's new, data safety, developer contact,
   the store's own list of similar apps, the trailer link), `listing.json`,
   `reviews.csv` and, when the image host is reachable, up to 12 screenshots in
   `replica/screens/`. Read `listing.md` completely before anything else.
2. **Look at the screenshots.** Open every file in `replica/screens/` with the
   Read tool, one by one. For each, record the screen, its layout, every
   component, every label, and which state it shows (empty, filled, error,
   mobile). This is where the screen inventory (S01...) comes from. Write what
   the screen does and how it is built, never its artwork or exact wording.
   If the tool says the image host is blocked, name the host to the user once
   (it is in the tool's note), continue with everything else, and offer
   hand-sent screenshots as an upgrade at the end, not as a blocker.
3. **Research the rest of the internet.** With WebSearch and WebFetch, find
   and read: the maker's site and help centre, the pricing page, the
   changelog or release notes, public walkthroughs and tutorials, forum and
   Reddit threads, and the similar apps the store lists. Every page you use
   goes in the sources table with its URL. A host that is blocked is written
   down as blocked, never silently skipped.
4. **Video.** The trailer link is in `listing.md`. Do not download videos from
   a streaming site. Look for a public transcript or a written walkthrough of
   the same flow. If the user has their own screen recording of the app, take
   frames with `ffmpeg -i recording.mp4 -vf fps=1 replica/screens/rec-%03d.png`
   and read them like screenshots.
5. **Read what users say.** Run
   `python3 <skills folder>/replica-entrepreneur/reviews.py replica/sources/reviews.csv`
   when you have enough rows, and add reviews from other sources you found.
   The store page shows only a handful, so say how many you have.
6. **Write the recon map** with the evidence level on every row: `seen` (in a
   screenshot you opened), `read` (stated in a page you read, with the URL),
   or `guess` (inferred). Never write a guess as a fact.
7. **Improve, do not just copy.** End the map with a short section,
   "Where the clone can beat the original": complaints from reviews, gaps
   against the similar apps, and things the description promises but users say
   fail. Each item links to its source. If the user told you who the clone is
   for (a niche, a vehicle type, a market), design the improvements for them.
8. **Propose scope, do not interrogate.** Pick the core loop as the default
   scope and the user's stated audience, state both in one sentence, and go.
   The user can redirect at the end.

What no public source can give you, and you must say so plainly: the app's
inside. The code, the ranking and routing algorithms, the server logic, the
exact numbers behind a limit. "Clone" here means the same features, flows and
rules as far as they are visible from outside, rebuilt fresh. Behaviour you
cannot see is written as `guess` and tested later by replica-diff against the
user's own use of the original.

## Step 1: scope

Under Autopilot, propose the answers and continue. Otherwise ask three things,
or propose answers and get a yes:

1. **Which app, which platform.** Web, iOS, Android, desktop.
2. **Which slice.** "All of Notion" is not a project. "Notion's pages, blocks
   and sharing" is. Default to the core loop: the one flow users pay for.
3. **Who it is for.** The user's own business, a niche, a product to sell.

## Step 2: list the sources

Build a sources table first, with a URL on every row. In order of value:

| source | what it gives you |
| --- | --- |
| help center / docs | the most complete feature list there is, and the settings |
| pricing page | which features matter (they gate them) |
| changelog | what was added recently, what the team thinks is important |
| app store listing | screenshots of every key screen, the pitch, ratings |
| public walkthrough videos | real flows, click by click |
| marketing site | positioning, the core loop in their words |
| the user's own account | the real thing, every state, driven by the user |
| public API docs | the data model, almost for free |

## Step 3: screen inventory

One row per screen. IDs are stable: S01, S02... Every other file refers to them.

`ID | screen | route or how you get there | purpose | key components | states seen`

States matter: empty, loading, filled, error, permission denied, mobile. An
empty state you did not record is an empty state you will not build.

## Step 4: user flows

F01, F02... Each one is a goal and the screens it passes through:

```
F01 Guest books a meeting
    S07 booking page -> S08 pick a time -> S09 details form -> S10 confirmed
    edge: no slots this week, time zone differs, slot taken while filling the form
```

Count the clicks on the happy path. It becomes the number to beat.

## Step 5: components

Every repeated UI part: buttons, inputs, date pickers, modals, tables, toasts,
nav. Name, variants, states, which screens use it. This becomes
replica-design's component list.

## Step 6: inferred data model

Entities, fields and relationships, each with its evidence and a confidence:

```
Booking  id, event_type_id, start_at, end_at, guest_name, guest_email,
         status (confirmed | cancelled | rescheduled), answers (json)
         evidence: S09 form fields, S10 confirmation, help article "Cancel a booking"
         confidence: high
```

Mark guesses as guesses. replica-architect turns this into a real schema.

## Step 7: feature matrix

Write `replica/features.csv` (columns: feature, area, priority, original,
clone, notes). Priority is must / should / could. `clone` starts at `no` for
every row and gets filled in during the build. replica-diff scores it.

## Step 8: what cannot be cloned

List it honestly, as `skip` rows with a reason: licensed content (a music
catalogue, a stock library), the network and its users, data the app owns,
partner deals, hardware, regulated licences (banking, health). "Clone any
app" means the features and the flow, not what the app owns.

## Step 9: size it

Screens, flows, entities, and the hard parts (realtime, sync, payments,
calendar or email integrations, offline). Give a size: S (a weekend), M (a
few weeks), L (a quarter), XL (rescope it). No promises of a perfect clone.

## Output

`replica/recon.md` and `replica/features.csv`, then a five-line summary: the
core loop, screen and flow counts, the three hardest parts, what is out of
scope, and the next step: `/replica-architect`.
