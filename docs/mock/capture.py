"""
Generate the README screenshots from mock data.

    npm install
    pip install playwright && playwright install chromium
    python docs/mock/capture.py

Starts a Vite dev server that serves fictional mock data in place of the real
/api (see vite.mock.config.js), drives it with headless Chromium and writes
PNGs into docs/screenshots/.
"""
import base64
import pathlib
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
OUT = ROOT / "docs" / "screenshots"
BASE = "http://127.0.0.1:5199"
ANIME = "moonlit-fox-chronicles-101"

OUT.mkdir(parents=True, exist_ok=True)


def font_css() -> str:
    """Serve Plus Jakarta Sans locally so screenshots match the real UI offline."""
    rules = []
    for weight in (400, 500, 600, 700, 800):
        f = HERE / "fonts" / f"plus-jakarta-sans-latin-{weight}-normal.woff2"
        if not f.exists():
            continue
        b64 = base64.b64encode(f.read_bytes()).decode()
        rules.append(
            "@font-face{font-family:'Plus Jakarta Sans';font-style:normal;"
            f"font-weight:{weight};src:url(data:font/woff2;base64,{b64}) format('woff2');}}"
        )
    return "\n".join(rules)


def start_server() -> subprocess.Popen:
    proc = subprocess.Popen(
        ["npx", "vite", "--config", str(HERE / "vite.mock.config.js")],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    for _ in range(80):
        try:
            urllib.request.urlopen(BASE + "/", timeout=1)
            return proc
        except Exception:
            time.sleep(0.5)
    proc.kill()
    sys.exit("Vite mock server did not start")


def settle(page, ms=600):
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(ms)


def load_images(page):
    """Scroll through the page so lazy images load, then return to the top."""
    height = page.evaluate("document.body.scrollHeight")
    y = 0
    while y < height:
        page.evaluate(f"window.scrollTo(0,{y})")
        page.wait_for_timeout(120)
        y += 600
    page.evaluate("window.scrollTo(0,0)")
    page.wait_for_timeout(300)


def scroll_to(page, selector, offset=110):
    """Scroll so the element sits just below the sticky header."""
    page.evaluate(
        "([sel, off]) => { const el = document.querySelector(sel);"
        " window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - off); }",
        [selector, offset],
    )


def shot(page, name, **kw):
    page.mouse.move(1, 899)  # park the cursor so no hover state leaks into the image
    page.wait_for_timeout(150)
    path = OUT / name
    page.screenshot(path=str(path), **kw)
    print("saved", path.relative_to(ROOT))


def main():
    server = start_server()
    css = font_css()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()

            def new_page(width=1440, height=900, scale=1, mobile=False):
                ctx = browser.new_context(
                    viewport={"width": width, "height": height},
                    device_scale_factor=scale,
                    is_mobile=mobile,
                    has_touch=mobile,
                    color_scheme="dark",
                    locale="en-US",
                )
                page = ctx.new_page()
                page.route("**/fonts.googleapis.com/**", lambda r: r.fulfill(status=200, content_type="text/css", body=css))
                page.route("**/fonts.gstatic.com/**", lambda r: r.abort())
                return page

            # ---------- Desktop ----------
            page = new_page()

            page.goto(BASE + "/")
            page.wait_for_selector(".hero-copy")
            load_images(page)
            page.click(".hero-dots button:first-child")
            page.evaluate("window.scrollTo(0,0)")
            settle(page)
            shot(page, "01-home.png")

            scroll_to(page, ".content-with-sidebar", 90)
            settle(page, 800)
            shot(page, "02-home-rails.png")

            scroll_to(page, "#schedule", 100)
            settle(page, 500)
            shot(page, "03-schedule.png")

            page.evaluate("window.scrollTo(0,0)")
            page.fill("input[aria-label='Search anime']", "moon")
            page.wait_for_selector(".search-suggestions button")
            settle(page, 400)
            shot(page, "04-search-suggestions.png", clip={"x": 0, "y": 0, "width": 1440, "height": 520})

            page.press("input[aria-label='Search anime']", "Enter")
            page.wait_for_selector(".search-view .card")
            load_images(page)
            scroll_to(page, ".search-view", 100)
            settle(page, 500)
            shot(page, "05-search-results.png")

            page.goto(BASE + "/")
            page.wait_for_selector(".hero-copy")
            page.click("button.filter-button")
            page.wait_for_selector(".filter-grid")
            page.click(".filter-genres-list button:has-text('Fantasy'), .filter-genres-list button:has-text('fantasy')")
            page.click(".filter-genres-list button:has-text('Adventure'), .filter-genres-list button:has-text('adventure')")
            settle(page, 400)
            shot(page, "06-filters.png")

            page.goto(BASE + "/")
            page.wait_for_selector(".hero-copy")
            page.click("button.burger")
            page.wait_for_selector(".menu-drawer.open .menu-genres a")
            settle(page, 700)
            shot(page, "07-menu.png")

            page.goto(BASE + "/movie.html")
            page.wait_for_selector(".list-results .card")
            load_images(page)
            settle(page, 400)
            shot(page, "08-movies.png")

            page.goto(f"{BASE}/detail.html?id={ANIME}")
            page.wait_for_selector(".detail-hero h1")
            settle(page, 800)
            shot(page, "09-detail.png")

            page.wait_for_selector(".character-card")
            page.click(".character-card:first-child")
            page.wait_for_selector(".character-profile")
            page.evaluate("document.querySelector('.characters-grid').scrollIntoView({block:'center'})")
            settle(page, 600)
            shot(page, "10-detail-characters.png")

            page.goto(f"{BASE}/watch.html?id={ANIME}")
            page.wait_for_selector(".watch-player iframe")
            page.wait_for_selector(".server-button")
            settle(page, 1200)
            shot(page, "11-watch.png")

            page.goto(BASE + "/news.html")
            page.wait_for_selector(".news-item")
            load_images(page)
            settle(page, 400)
            shot(page, "12-news.png")

            page.click(".news-item:first-child")
            page.wait_for_selector(".news-article-body")
            settle(page, 600)
            shot(page, "13-news-article.png")
            page.context.close()

            # ---------- Mobile ----------
            page = new_page(390, 844, scale=2, mobile=True)
            page.goto(BASE + "/")
            page.wait_for_selector(".hero-copy")
            load_images(page)
            page.click(".hero-dots button:first-child")
            page.evaluate("window.scrollTo(0,0)")
            settle(page, 500)
            shot(page, "14-mobile-home.png")

            scroll_to(page, ".anime-rails", 150)
            settle(page, 600)
            shot(page, "15-mobile-rails.png")

            page.evaluate("window.scrollTo(0,0)")
            page.click("button.burger")
            page.wait_for_selector(".menu-drawer.open .menu-genres a")
            settle(page, 700)
            shot(page, "16-mobile-menu.png")
            page.context.close()

            page = new_page(390, 844, scale=2, mobile=True)
            page.goto(f"{BASE}/watch.html?id={ANIME}")
            page.wait_for_selector(".watch-player iframe")
            settle(page, 1200)
            shot(page, "17-mobile-watch.png")

            browser.close()
    finally:
        server.terminate()


if __name__ == "__main__":
    main()
