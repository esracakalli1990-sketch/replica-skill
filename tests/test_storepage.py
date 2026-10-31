import csv
import io
import json
import os
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from unittest import mock

from _load import load

sp = load("replica-recon", "storepage")

PLAY = """<html><head>
<meta property="og:image" content="https://play-lh.googleusercontent.com/icon">
<meta name="appstore:developer_url" content="https://example.test"></head><body>
<a href="/store/apps/dev?id=123"><span>Example Dev</span></a>
<h1><span itemprop="name">Example Planner</span></h1>
<span class="UIuSk">Contains ads</span><span class="UIuSk">In-app purchases</span>
<div itemprop="starRating"><div role="img" aria-label="Rated 4.5 stars out of five stars"><span>4.5</span></div></div>
<div>4.5</div><div>star</div><div>12.5K reviews</div><div>Everyone</div><div>100K+</div><div>Downloads</div>
<span itemprop="contentRating"><span>Everyone</span></span>
<span itemprop="genre"><div></div><span>Maps &amp; Navigation</span></span>
<meta itemprop="price" content="0">
<button data-trailer-url="https://www.youtube.com/watch?v=abc"></button>
<img alt="Screenshot image" src="https://play-lh.googleusercontent.com/shot1">
<img alt="Screenshot image" data-src="https://play-lh.googleusercontent.com/shot2">
<img alt="Screenshot image" src="https://play-lh.googleusercontent.com/shot1">
<meta itemprop="description" content="Plan many stops">
<div data-g-id="description">Plan routes.<br>Add stops &amp; go.</div>
<div>Updated on</div><div>Oct 19, 2026</div><div>Maps</div>
<div>Data safety</div><div>arrow_forward</div><div>No data shared with third parties</div><div>See details</div>
<div>Ratings and reviews</div>
<header><span class="X5PpBb">Ann</span><div aria-label="Rated 1 stars out of five stars"></div>
<span class="bp9Aid">November 24, 2024</span></header><div class="h3YV2d">Crashes &amp; slow.</div>
<header><span class="X5PpBb">Bob</span><div aria-label="Rated 5 stars out of five stars"></div>
<span class="bp9Aid">June 4, 2021</span></header><div class="h3YV2d">Great app.</div>
<header><span class="X5PpBb">Example Dev</span><span class="bp9Aid">May 17, 2022</span></header>
<div class="h3YV2d">Developer reply, no stars.</div>
<div>What’s new</div><div>• Faster search</div><div>Bug fixes</div><div>flag</div>
<div>About the developer</div><div>Example Dev Ltd</div><div>help@example.test</div><div>More by Example Dev</div>
<div>Similar apps</div><div>arrow_forward</div>
<div>Rival One</div><div>Rival Inc</div><div>4.1</div><div>star</div>
<div>Rival Two</div><div>Other Co</div><div>3.6</div><div>star</div>
<div>flag</div>
</body></html>"""

APPLE = {"results": [{
    "trackName": "Example", "sellerName": "Example Inc", "primaryGenreName": "Navigation",
    "description": "Plan.\nGo.", "releaseNotes": "Faster.\nFixes.", "averageUserRating": 4.62,
    "userRatingCount": 1234, "formattedPrice": "Free", "currentVersionReleaseDate": "2026-09-30T10:00:00Z",
    "screenshotUrls": ["https://is1-ssl.mzstatic.com/a/392x696bb.jpg"],
    "ipadScreenshotUrls": ["https://is1-ssl.mzstatic.com/b/552x414bb.jpg"],
    "artworkUrl512": "https://is1-ssl.mzstatic.com/icon.jpg", "sellerUrl": "https://example.test"}]}
APPLE_REVIEWS = {"feed": {"entry": [
    {"im:name": {"label": "Example"}},
    {"author": {"name": {"label": "Cem"}}, "updated": {"label": "2026-08-01T00:00:00-07:00"},
     "im:rating": {"label": "2"}, "title": {"label": "Slow"}, "content": {"label": "Takes ages to plan."}}]}}


class Identify(unittest.TestCase):
    def test_package_name(self):
        self.assertEqual(sp.identify("com.example.app")[:2], ("play", "com.example.app"))

    def test_play_url(self):
        store, ident, cc, _ = sp.identify("https://play.google.com/store/apps/details?id=a.b&hl=tr&gl=tr")
        self.assertEqual((store, ident, cc), ("play", "a.b", "tr"))

    def test_app_store_url(self):
        store, ident, cc, _ = sp.identify("https://apps.apple.com/gb/app/x/id123456789")
        self.assertEqual((store, ident, cc), ("appstore", "123456789", "gb"))

    def test_other_hosts_are_refused(self):
        with self.assertRaises(sp.StoreError):
            sp.identify("https://example.com/app")


class PlayParse(unittest.TestCase):
    def setUp(self):
        self.l = sp.parse_play(PLAY, "https://play.google.com/store/apps/details?id=a.b")

    def test_basic_fields(self):
        l = self.l
        self.assertEqual(l["name"], "Example Planner")
        self.assertEqual(l["developer"], "Example Dev")
        self.assertEqual(l["rating"], "4.5")
        self.assertEqual(l["rating_count"], "12.5K")
        self.assertEqual(l["downloads"], "100K+")
        self.assertEqual(l["updated"], "Oct 19, 2026")
        self.assertEqual(l["category"], "Maps & Navigation")
        self.assertEqual(l["badges"], ["Contains ads", "In-app purchases"])
        self.assertEqual(l["trailer"], "https://www.youtube.com/watch?v=abc")
        self.assertEqual(l["developer_site"], "https://example.test")

    def test_description_is_verbatim_with_line_breaks(self):
        self.assertEqual(self.l["description"], "Plan routes.\nAdd stops & go.")

    def test_screenshots_deduplicated_in_order(self):
        self.assertEqual(self.l["screenshots"], [
            "https://play-lh.googleusercontent.com/shot1", "https://play-lh.googleusercontent.com/shot2"])

    def test_reviews_skip_the_developer_reply(self):
        self.assertEqual([(r["author"], r["rating"]) for r in self.l["reviews"]], [("Ann", 1), ("Bob", 5)])
        self.assertEqual(self.l["reviews"][0]["text"], "Crashes & slow.")

    def test_sections(self):
        self.assertEqual(self.l["whats_new"], ["Faster search", "Bug fixes"])
        self.assertIn("No data shared with third parties", self.l["data_safety"])
        self.assertEqual(self.l["developer_contact"], ["Example Dev Ltd", "help@example.test"])
        self.assertEqual(self.l["similar_apps"][0],
                         {"name": "Rival One", "developer": "Rival Inc", "rating": "4.1"})
        self.assertEqual(len(self.l["similar_apps"]), 2)

    def test_empty_page_leaves_fields_empty_and_says_why(self):
        l = sp.parse_play("<html></html>")
        self.assertEqual(l["name"], "")
        self.assertEqual(l["reviews"], [])
        self.assertTrue(any("no app name" in n for n in l["notes"]))


class AppStoreParse(unittest.TestCase):
    def test_fields_and_reviews(self):
        l = sp.parse_appstore(APPLE, APPLE_REVIEWS, "https://apps.apple.com/us/app/x/id1")
        self.assertEqual((l["name"], l["developer"], l["rating"]), ("Example", "Example Inc", "4.6"))
        self.assertEqual(l["updated"], "2026-09-30")
        self.assertEqual(l["whats_new"], ["Faster.", "Fixes."])
        self.assertEqual(len(l["screenshots"]), 2)
        self.assertEqual([(r["author"], r["rating"], r["date"]) for r in l["reviews"]],
                         [("Cem", 2, "2026-08-01")])
        self.assertEqual(l["reviews"][0]["text"], "Slow. Takes ages to plan.")

    def test_unknown_app_is_reported_not_invented(self):
        l = sp.parse_appstore({"results": []}, None)
        self.assertEqual(l["name"], "")
        self.assertTrue(any("no app" in n for n in l["notes"]))


class Output(unittest.TestCase):
    def test_reviews_csv_feeds_the_entrepreneur_tool(self):
        reviews = load("replica-entrepreneur", "reviews")
        l = sp.parse_play(PLAY, "https://play.google.com/store/apps/details?id=a.b")
        rows = sp.reviews_rows(l)
        self.assertEqual(rows[0], ["google-play", l["url"], "2024-11-24", 1, "Crashes & slow."])
        with tempfile.TemporaryDirectory() as d:
            n = sp.write_all(l, d)
            self.assertEqual(n, 2)
            with open(os.path.join(d, "sources", "reviews.csv"), newline="") as fh:
                got = list(csv.DictReader(fh))
            self.assertEqual(got[1]["text"], "Great app.")
            loaded, dropped = reviews.load_reviews(os.path.join(d, "sources", "reviews.csv"))[:2]
            self.assertEqual(len(loaded), 2)
            with open(os.path.join(d, "sources", "listing.md"), encoding="utf-8") as fh:
                md = fh.read()
            self.assertIn("Plan routes.", md)
            self.assertIn("Rival One, Rival Inc, 4.1 stars", md)
            with open(os.path.join(d, "sources", "listing.json"), encoding="utf-8") as fh:
                self.assertEqual(json.load(fh)["name"], "Example Planner")


class Fetching(unittest.TestCase):
    def test_blocked_image_host_is_named_not_hidden(self):
        l = {"screenshots": ["https://play-lh.googleusercontent.com/shot1"]}
        with tempfile.TemporaryDirectory() as d, \
                mock.patch.object(sp, "http_get", side_effect=sp.StoreError("could not reach host (403)")):
            saved, notes = sp.save_screens(l, d, 5, 0, "play")
        self.assertEqual(saved, [])
        self.assertIn("play-lh.googleusercontent.com", notes[0])

    def test_screenshots_saved_with_a_cap(self):
        l = {"screenshots": ["https://play-lh.googleusercontent.com/s%d" % i for i in range(5)]}
        with tempfile.TemporaryDirectory() as d, \
                mock.patch.object(sp, "http_get", return_value=(b"\x89PNG", "image/png")) as get:
            saved, notes = sp.save_screens(l, d, 3, 0, "play")
            self.assertEqual(len(saved), 3)
            self.assertTrue(saved[0].endswith("store-01.png"))
        self.assertEqual(get.call_count, 3)
        self.assertEqual(notes, [])

    def test_non_image_response_stops_the_download(self):
        l = {"screenshots": ["https://play-lh.googleusercontent.com/s1"]}
        with tempfile.TemporaryDirectory() as d, \
                mock.patch.object(sp, "http_get", return_value=(b"<html>", "text/html")):
            saved, notes = sp.save_screens(l, d, 3, 0, "play")
        self.assertEqual(saved, [])
        self.assertIn("not an image", notes[0])

    def test_run_fetches_one_page_for_play(self):
        with tempfile.TemporaryDirectory() as d, \
                mock.patch.object(sp, "http_get", return_value=PLAY) as get:
            l, n = sp.run("a.b", d, images=False)
        self.assertEqual(get.call_count, 1)
        self.assertEqual(n, 2)

    def test_cli_reports_an_unreachable_page(self):
        err = io.StringIO()
        with mock.patch.object(sp, "http_get", side_effect=sp.StoreError("could not reach play.google.com")), \
                redirect_stderr(err), redirect_stdout(io.StringIO()):
            rc = sp.main(["a.b", "--out", tempfile.gettempdir() + "/unused"])
        self.assertEqual(rc, 2)
        self.assertIn("could not reach", err.getvalue())


if __name__ == "__main__":
    unittest.main()
