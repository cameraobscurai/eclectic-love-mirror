import asyncio
from playwright.async_api import async_playwright
import os
import json

async def run_smoke_test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 1800})
        
        routes = [
            "/",
            "/collection",
            "/collection/pillows-throws",
            "/collection/lounge-seating",
            "/atelier",
            "/contact",
            "/gallery"
        ]
        
        results = {}
        
        for route in routes:
            page = await context.new_page()
            url = f"http://localhost:8080{route}"
            
            console_errors = []
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
            
            failing_requests = []
            def handle_request_failed(req):
                error_msg = "Unknown error"
                try:
                    if req.failure:
                        error_msg = req.failure.error_text
                except:
                    pass
                failing_requests.append(f"{req.url}: {error_msg}")

            page.on("requestfailed", handle_request_failed)
            page.on("response", lambda res: failing_requests.append(f"{res.url}: {res.status}") if res.status >= 400 else None)
            
            print(f"Testing {url}...")
            try:
                response = await page.goto(url, wait_until="networkidle")
                
                # Check for redirects (some might be JS redirects)
                # Wait a bit for JS redirects if any
                await page.wait_for_timeout(1000)
                current_url = page.url
                
                # Screenshot
                clean_route = route.strip("/").replace("/", "_") or "home"
                screenshot_path = f"/tmp/browser/smoke/{clean_route}.png"
                await page.screenshot(path=screenshot_path)
                
                # Check hero video on home
                video_playing = None
                if route == "/":
                    video_playing = await page.evaluate('''() => {
                        const video = document.querySelector('video');
                        return !!(video && !video.paused && video.readyState >= 2);
                    }''')
                
                # Check tiles on collection
                tiles_count = 0
                if "collection" in route or "collection" in current_url:
                    tiles_count = await page.evaluate('document.querySelectorAll(".group.relative").length')

                # Check head tags on /collection/pillows-throws
                head_findings = {}
                if "pillows-throws" in route:
                    head_findings['title'] = await page.title()
                    head_findings['description'] = await page.evaluate('document.querySelector("meta[name=\\"description\\"]")?.content')
                    head_findings['og_image'] = await page.evaluate('document.querySelector("meta[property=\\"og:image\\"]")?.content')
                    head_findings['canonical'] = await page.evaluate('document.querySelector("link[rel=\\"canonical\\"]")?.href')
                    head_findings['json_ld'] = await page.evaluate('!!document.querySelector("script[type=\\"application/ld+json\\"]")')
                    head_findings['h1_visible'] = await page.evaluate('!!document.querySelector("h1")')
                    head_findings['content_source'] = await page.content()

                results[route] = {
                    "status": response.status if response else "N/A",
                    "current_url": current_url,
                    "console_errors": console_errors,
                    "failing_requests": list(set(failing_requests)), # dedupe
                    "screenshot": screenshot_path,
                    "video_playing": video_playing,
                    "tiles_count": tiles_count,
                    "head_findings": head_findings if "pillows-throws" in route else None
                }
            except Exception as e:
                results[route] = {"error": str(e)}
            
            await page.close()
            
        await browser.close()
        return results

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    res = loop.run_until_complete(run_smoke_test())
    print("SMOKE_TEST_RESULTS_START")
    # Truncate content source for JSON output but keep it for reporting
    for r in res:
        if res[r].get("head_findings") and "content_source" in res[r]["head_findings"]:
             # We will just print the head tags part separately or keep it small
             pass
    print(json.dumps(res, indent=2))
    print("SMOKE_TEST_RESULTS_END")
