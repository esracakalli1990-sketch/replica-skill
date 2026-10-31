#!/usr/bin/env python3
"""Store listing reader for replica-recon. Standard library only.

Reads ONE public store page for the app you are cloning and writes down
everything it says, so you do not have to paste it by hand:

    python3 storepage.py "https://play.google.com/store/apps/details?id=com.example.app"
    python3 storepage.py com.example.app --lang en --out replica
    python3 storepage.py "https://apps.apple.com/us/app/example/id123456789"
    python3 storepage.py <url> --no-images

It writes, under --out (default: replica):

    sources/listing.json   everything parsed, plus notes on what could not be fetched
    sources/listing.md     the same, readable (description, features, what's new,
                           data safety, developer, similar apps, trailer link)
    sources/reviews.csv    the reviews shown on the page, in the columns
                           replica-entrepreneur/reviews.py reads
    screens/store-NN.png   the listing screenshots, when the image host is reachable

What it does, and does not do:

- One page per run, a few screenshots (default 12) one second apart. No crawling,
  no logging in, no private APIs, no app binaries. It is the same page a person
  opens in a browser.
- Only the page's own words are copied, verbatim. Nothing is paraphrased or guessed.
  A field the page does not show stays empty, and `notes` says why.
- Reviews: the page shows only a handful. Each row's link is the store page itself,
  because the page gives no per-review address. replica-entrepreneur counts those
  rows as one source, so it will mark them thin. Add more sources there.
- Field labels (Downloads, Updated on, What's new) are matched in English, so the
  default --lang is en. The description, name, developer and screenshots do not
  depend on the language.
- Screenshots come from another host than the page (play-lh.googleusercontent.com
  for Google Play, mzstatic.com for the App Store). If the network blocks that
  host, the screenshot addresses are still saved and the notes name the host to
  allow. The App Store path reads Apple's public lookup and review feeds; it is
  written from their documented format and has been tested on saved samples.
"""

import argparse
import csv
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

UA = "Mozilla/5.0 (compatible; replica-skill/1.0; reads one public store page)"
MAX_BYTES = 8 * 1024 * 1024
IMAGE_HOSTS = {
    "play": "play-lh.googleusercontent.com",
    "appstore": "is1-ssl.mzstatic.com",
}


class StoreError(Exception):
    pass


# ---------------------------------------------------------------- input

def identify(arg):
    """Return (store, id, country, url) from a URL or a bare Android package name."""
    arg = arg.strip()
    if re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)+", arg):
        return "play", arg, "us", "https://play.google.com/store/apps/details?id=" + arg
    u = urllib.parse.urlparse(arg)
    host = (u.hostname or "").lower()
    q = urllib.parse.parse_qs(u.query)
    if host == "play.google.com" and "id" in q:
        return "play", q["id"][0], (q.get("gl") or ["us"])[0], arg
    if host in ("apps.apple.com", "itunes.apple.com"):
        m = re.search(r"/id(\d+)", u.path)
        if not m:
            raise StoreError("no app id (idNNNNNNNN) in that App Store link")
        cc = re.match(r"^/([a-z]{2})/", u.path)
        return "appstore", m.group(1), cc.group(1) if cc else "us", arg
    raise StoreError("expected a Google Play or App Store link, or an Android package name")


def http_get(url, binary=False, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read(MAX_BYTES + 1)
            ctype = resp.headers.get("Content-Type", "")
    except urllib.error.HTTPError as e:
        raise StoreError("HTTP %s from %s" % (e.code, urllib.parse.urlparse(url).hostname))
    except (urllib.error.URLError, OSError) as e:
        reason = getattr(e, "reason", e)
        raise StoreError("could not reach %s (%s)" % (urllib.parse.urlparse(url).hostname, reason))
    if len(data) > MAX_BYTES:
        raise StoreError("response from %s is larger than 8 MB" % urllib.parse.urlparse(url).hostname)
    return (data, ctype) if binary else data.decode("utf-8", "replace")


# ------------------------------------------------------------ Google Play

def _text(fragment):
    fragment = re.sub(r"<br\s*/?>", "\n", fragment)
    fragment = re.sub(r"<[^>]+>", "", fragment)
    return html.unescape(fragment).strip()


def _lines(page):
    body = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", page, flags=re.S | re.I)
    body = re.sub(r"<[^>]+>", "\n", body)
    return [l.strip() for l in html.unescape(body).split("\n") if l.strip()]


def _after(lines, label, count=1):
    for i, l in enumerate(lines):
        if l == label:
            return lines[i + 1:i + 1 + count]
    return []


def parse_play(page, url=""):
    """Parse a Google Play details page (English labels). Missing fields stay empty."""
    notes = []

    def first(pattern, flags=re.S):
        m = re.search(pattern, page, flags)
        return html.unescape(m.group(1)).strip() if m else ""

    out = {
        "store": "play", "url": url,
        "name": first(r'itemprop="name">([^<]*)<'),
        "developer": first(r'<a href="/store/apps/dev(?:eloper)?\?id=[^"]*"><span>([^<]*)'),
        "badges": re.findall(r'class="UIuSk">([^<]*)', page),
        "short_description": first(r'<meta itemprop="description" content="([^"]*)"'),
        "category": first(r'itemprop="genre"[^>]*>.*?<span[^>]*>([^<]*)</span>'),
        "content_rating": first(r'itemprop="contentRating"><span>([^<]*)'),
        "price": first(r'itemprop="price" content="([^"]*)"'),
        "rating": first(r'aria-label="Rated ([0-9.]+) stars'),
        "developer_site": first(r'appstore:developer_url" content="([^"]*)"'),
        "trailer": first(r'data-trailer-url="([^"]*)"'),
    }
    m = re.search(r'data-g-id="description"[^>]*>(.*?)</div>', page, re.S)
    out["description"] = _text(m.group(1)) if m else ""

    lines = _lines(page)
    for i, l in enumerate(lines):
        if l == "Downloads" and i:
            out["downloads"] = lines[i - 1]
            break
    else:
        out["downloads"] = ""
    for i, l in enumerate(lines):
        m = re.fullmatch(r"([\d.,]+[KMB]?) reviews", l)
        if m:
            out["rating_count"] = m.group(1)
            break
    else:
        out["rating_count"] = ""
    out["updated"] = (_after(lines, "Updated on") or [""])[0]

    new = []
    if "What’s new" in lines:
        for l in lines[lines.index("What’s new") + 1:]:
            if l in ("flag", "Flag as inappropriate"):
                break
            new.append(l.lstrip("\u2022 ").strip())
    out["whats_new"] = new

    safety = []
    if "Data safety" in lines:
        start = lines.index("Data safety")
        for l in lines[start + 1:]:
            if l in ("Ratings and reviews", "See details"):
                break
            if l not in ("arrow_forward", "Learn more"):
                safety.append(l)
    out["data_safety"] = safety

    dev = []
    if "About the developer" in lines:
        for l in lines[lines.index("About the developer") + 1:]:
            if l.startswith("More by") or l in ("Similar apps",):
                break
            dev.append(l)
    out["developer_contact"] = dev

    similar = []
    if "Similar apps" in lines:
        j = lines.index("Similar apps") + 1
        chunk = lines[j:]
        k = 0
        while k + 3 < len(chunk) and chunk[k] != "flag":
            if chunk[k] == "arrow_forward":
                k += 1
                continue
            if re.fullmatch(r"[0-9.]+", chunk[k + 2]) and chunk[k + 3] == "star":
                similar.append({"name": chunk[k], "developer": chunk[k + 1], "rating": chunk[k + 2]})
                k += 4
            else:
                k += 1
    out["similar_apps"] = similar

    shots = []
    for img in re.finditer(r'<img[^>]*alt="Screenshot image"[^>]*>', page):
        u = re.search(r'(?:data-src|src)="(https://play-lh\.googleusercontent\.com[^"]+)"', img.group(0))
        if u and u.group(1) not in shots:
            shots.append(html.unescape(u.group(1)))
    out["screenshots"] = shots
    out["icon"] = first(r'property="og:image" content="([^"]*)"')

    reviews = []
    for m in re.finditer(r'class="h3YV2d">(.*?)</div>', page, re.S):
        head = page[max(0, m.start() - 5000):m.start()]
        head = head[head.rfind("<header"):] if "<header" in head else head
        stars = re.search(r"Rated (\d) stars", head)
        if not stars:
            continue  # the developer's reply has no star rating
        date = re.search(r'class="bp9Aid">([^<]*)', head)
        name = re.search(r'class="X5PpBb">([^<]*)', head)
        reviews.append({
            "author": html.unescape(name.group(1)) if name else "",
            "date": html.unescape(date.group(1)) if date else "",
            "rating": int(stars.group(1)),
            "text": _text(m.group(1)),
        })
    out["reviews"] = reviews

    if not out["name"]:
        notes.append("no app name found: the page layout may have changed or the app is not available in this country")
    for key in ("downloads", "updated", "rating_count"):
        if not out.get(key):
            notes.append("%s not found on the page" % key)
    if not shots:
        notes.append("no screenshot addresses found on the page")
    out["notes"] = notes
    return out


# -------------------------------------------------------------- App Store

def parse_appstore(lookup, reviews_feed, url=""):
    """Parse Apple's public lookup JSON and customer-review feed JSON (either may be None)."""
    notes = []
    results = (lookup or {}).get("results") or []
    r = results[0] if results else {}
    if not r:
        notes.append("Apple's lookup returned no app for that id and country")
    shots = list(r.get("screenshotUrls") or []) + list(r.get("ipadScreenshotUrls") or [])
    out = {
        "store": "appstore", "url": url,
        "name": r.get("trackName", ""),
        "developer": r.get("sellerName") or r.get("artistName", ""),
        "badges": [],
        "short_description": "",
        "category": r.get("primaryGenreName", ""),
        "content_rating": r.get("contentAdvisoryRating", ""),
        "price": r.get("formattedPrice", ""),
        "rating": str(round(r["averageUserRating"], 1)) if r.get("averageUserRating") else "",
        "rating_count": str(r.get("userRatingCount", "")),
        "developer_site": r.get("sellerUrl", ""),
        "trailer": "",
        "description": r.get("description", ""),
        "downloads": "",
        "updated": (r.get("currentVersionReleaseDate") or "")[:10],
        "whats_new": [l for l in (r.get("releaseNotes") or "").split("\n") if l.strip()],
        "data_safety": [],
        "developer_contact": [],
        "similar_apps": [],
        "screenshots": shots,
        "icon": r.get("artworkUrl512", ""),
        "reviews": [],
    }
    entries = ((reviews_feed or {}).get("feed") or {}).get("entry") or []
    if isinstance(entries, dict):
        entries = [entries]
    for e in entries:
        if "im:rating" not in e:
            continue  # the first entry of the feed describes the app itself
        out["reviews"].append({
            "author": (e.get("author") or {}).get("name", {}).get("label", ""),
            "date": (e.get("updated") or {}).get("label", "")[:10],
            "rating": int(e["im:rating"]["label"]),
            "text": ((e.get("title") or {}).get("label", "") + ". " if (e.get("title") or {}).get("label") else "")
                    + (e.get("content") or {}).get("label", ""),
        })
    if not reviews_feed:
        notes.append("Apple's review feed was not fetched")
    out["notes"] = notes
    return out


# ----------------------------------------------------------------- output

def reviews_rows(listing):
    """Rows for reviews.py. The link is the store page: the page gives none per review."""
    source = "google-play" if listing["store"] == "play" else "app-store"
    rows = []
    for r in listing.get("reviews", []):
        if not r["text"] or not listing.get("url"):
            continue
        rows.append([source, listing["url"], _iso(r["date"]), r["rating"], r["text"]])
    return rows


_MONTHS = {m: i for i, m in enumerate(
    ["January", "February", "March", "April", "May", "June", "July", "August",
     "September", "October", "November", "December"], 1)}


def _iso(text):
    m = re.fullmatch(r"([A-Za-z]+) (\d{1,2}), (\d{4})", text.strip())
    if m and m.group(1) in _MONTHS:
        return "%s-%02d-%02d" % (m.group(3), _MONTHS[m.group(1)], int(m.group(2)))
    return text.strip() if re.fullmatch(r"\d{4}-\d{2}-\d{2}", text.strip()) else ""


def render_md(l):
    def bullets(items):
        return "\n".join("- %s" % i for i in items) if items else "- (not on the page)"

    parts = [
        "# %s (%s)" % (l["name"] or "unknown app", "Google Play" if l["store"] == "play" else "App Store"),
        "",
        "Source: %s" % l["url"],
        "Developer: %s" % (l["developer"] or "(not on the page)"),
        "Category: %s | Content rating: %s | Price: %s" % (
            l["category"] or "?", l["content_rating"] or "?", l["price"] or "?"),
        "Rating: %s from %s ratings | Downloads: %s | Updated: %s" % (
            l["rating"] or "?", l.get("rating_count") or "?", l["downloads"] or "?", l["updated"] or "?"),
        "Badges: %s" % (", ".join(l["badges"]) or "none shown"),
        "Developer site: %s" % (l["developer_site"] or "(none)"),
        "Trailer: %s" % (l["trailer"] or "(none)"),
        "",
        "## Short description", "", l["short_description"] or "(none)",
        "",
        "## Full description (verbatim)", "", l["description"] or "(none)",
        "",
        "## What's new", "", bullets(l["whats_new"]),
        "",
        "## Data safety", "", bullets(l["data_safety"]),
        "",
        "## Developer", "", bullets(l["developer_contact"]),
        "",
        "## Similar apps (the store's own list)", "",
        "\n".join("- %s, %s, %s stars" % (s["name"], s["developer"], s["rating"])
                  for s in l["similar_apps"]) or "- (not on the page)",
        "",
        "## Reviews shown on the page (%d)" % len(l["reviews"]), "",
        "\n".join("- %s, %s stars, %s: \"%s\"" % (r["author"] or "anonymous", r["rating"],
                                                 r["date"] or "no date", r["text"].replace("\n", " "))
                  for r in l["reviews"]) or "- (none)",
        "",
        "## Screenshots", "",
        "%d addresses listed; %d saved to replica/screens/." % (len(l["screenshots"]), len(l.get("saved_screens", []))),
    ]
    if l.get("notes"):
        parts += ["", "## Notes", "", bullets(l["notes"])]
    return "\n".join(parts) + "\n"


def save_screens(listing, folder, limit, delay, store):
    """Download up to `limit` screenshots, one at a time. Returns (saved paths, notes)."""
    saved, notes = [], []
    urls = listing["screenshots"][:limit]
    if not urls:
        return saved, notes
    os.makedirs(folder, exist_ok=True)
    for n, u in enumerate(urls, 1):
        src = re.sub(r"=[^/=]*$", "", u) + "=w900" if store == "play" else re.sub(r"/\d+x\d+[a-z]*\.(jpg|png|webp)$", r"/720x1280bb.\1", u)
        try:
            data, ctype = http_get(src, binary=True)
        except StoreError as e:
            if "HTTP" in str(e):
                notes.append("screenshots not saved: %s" % e)
            else:
                notes.append("screenshots not saved: %s. Allow the host %s in the environment's network "
                             "settings, or send the screenshots by hand." % (e, IMAGE_HOSTS[store]))
            break
        if not ctype.startswith("image/"):
            notes.append("screenshot %d was not an image (%s); stopped" % (n, ctype or "unknown type"))
            break
        ext = "png" if "png" in ctype else "webp" if "webp" in ctype else "jpg"
        path = os.path.join(folder, "store-%02d.%s" % (n, ext))
        with open(path, "wb") as fh:
            fh.write(data)
        saved.append(path)
        time.sleep(delay)
    return saved, notes


def write_all(listing, out_dir):
    src = os.path.join(out_dir, "sources")
    os.makedirs(src, exist_ok=True)
    with open(os.path.join(src, "listing.json"), "w", encoding="utf-8") as fh:
        json.dump(listing, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    with open(os.path.join(src, "listing.md"), "w", encoding="utf-8") as fh:
        fh.write(render_md(listing))
    rows = reviews_rows(listing)
    with open(os.path.join(src, "reviews.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["source", "url", "date", "rating", "text"])
        w.writerows(rows)
    return len(rows)


def run(arg, out_dir="replica", lang="en", shots=12, delay=1.0, images=True):
    store, ident, cc, url = identify(arg)
    if store == "play":
        q = urllib.parse.urlencode({"id": ident, "hl": lang, "gl": cc})
        page_url = "https://play.google.com/store/apps/details?" + q
        listing = parse_play(http_get(page_url), url="https://play.google.com/store/apps/details?id=" + ident)
    else:
        listing = parse_appstore(
            json_get("https://itunes.apple.com/lookup?id=%s&country=%s" % (ident, cc)),
            json_get("https://itunes.apple.com/%s/rss/customerreviews/id=%s/sortby=mostrecent/json" % (cc, ident),
                     optional=True),
            url=url)
    if images and listing["screenshots"] and shots > 0:
        saved, notes = save_screens(listing, os.path.join(out_dir, "screens"), shots, delay, store)
        listing["saved_screens"] = saved
        listing["notes"] += notes
    else:
        listing["saved_screens"] = []
    n = write_all(listing, out_dir)
    return listing, n


def json_get(url, optional=False):
    try:
        return json.loads(http_get(url))
    except (StoreError, ValueError) as e:
        if optional:
            return None
        raise StoreError(str(e))


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("app", help="a Google Play or App Store link, or an Android package name")
    ap.add_argument("--out", default="replica", help="project folder to write into (default: replica)")
    ap.add_argument("--lang", default="en", help="page language; English labels are parsed best")
    ap.add_argument("--shots", type=int, default=12, help="max screenshots to save (default 12)")
    ap.add_argument("--delay", type=float, default=1.0, help="seconds between screenshots")
    ap.add_argument("--no-images", action="store_true", help="do not download screenshots")
    args = ap.parse_args(argv)
    try:
        listing, n = run(args.app, args.out, args.lang, args.shots, args.delay, not args.no_images)
    except StoreError as e:
        print("error: %s" % e, file=sys.stderr)
        return 2
    print("%s | %s | rating %s | %d screenshots listed, %d saved | %d reviews | %d similar apps" % (
        listing["name"] or "?", listing["developer"] or "?", listing["rating"] or "?",
        len(listing["screenshots"]), len(listing["saved_screens"]), n, len(listing["similar_apps"])))
    print("wrote %s/sources/listing.md, listing.json, reviews.csv" % args.out)
    for note in listing["notes"]:
        print("note: %s" % note)
    return 0


if __name__ == "__main__":
    sys.exit(main())
