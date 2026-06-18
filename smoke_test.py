import asyncio
from playwright.async_api import async_playwright
import os

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
            page.on("requestfailed", lambda req: failing_requests.append(f"{req.url}: {req.failure.error_text}"))
            page.on("response", lambda res: failing_requests.append(f"{res.url}: {res.status}") if res.status >= 400 else None)
            
            print(f"Testing {url}...")
            try:
                response = await page.goto(url, wait_until="networkidle")
                
                # Special check for redirects on parent-category landing
                current_url = page.url
                
                # Screenshot
                screenshot_path = f"/tmp/browser/smoke/{route.replace('/', '_') or 'home'}.png"
                await page.screenshot(path=screenshot_path)
                
                # Check hero video on home
                video_playing = None
                if route == "/":
                    video_playing = await page.evaluate('''() => {
                        const video = document.querySelector('video');
                        return video && !video.paused && video.readyState >= 2;
                    }''')
                
                # Check tiles on collection
                tiles_count = 0
                if route == "/collection" or "category=" in current_url:
                    tiles_count = await page.evaluate('document.querySelectorAll(".group.relative").length')

                # Check head tags on /collection/pillows-throws
                head_findings = {}
                if route == "/collection/pillows-throws":
                    content = await page.content()
                    head_findings['title'] = await page.title()
                    head_findings['description'] = await page.evaluate('document.querySelector("meta[name=\\"description\\"]")?.content')
                    head_findings['og_image'] = await page.evaluate('document.querySelector("meta[property=\\"og:image\\"]")?.content')
                    head_findings['canonical'] = await page.evaluate('document.querySelector("link[rel=\\"canonical\\"]")?.href')
                    head_findings['json_ld'] = await page.evaluate('!!document.querySelector("script[type=\\"application/ld+json\\"]")')
                    head_findings['h1_visible'] = await page.evaluate('!!document.querySelector("h1")')

                results[route] = {
                    "status": response.status if response else "N/A",
                    "current_url": current_url,
                    "console_errors": console_errors,
                    "failing_requests": failing_requests,
                    "screenshot": screenshot_path,
                    "video_playing": video_playing,
                    "tiles_count": tiles_count,
                    "head_findings": head_findings if route == "/collection/pillows-throws" else None
                }
            except Exception as e:
                results[route] = {"error": str(e)}
            
            await page.close()
            
        await browser.close()
        return results

if __name__ == "__main__":
    import json
    loop = asyncio.get_event_loop()
    res = loop.run_until_complete(run_smoke_test())
    print("SMOKE_TEST_RESULTS_START")
    print(json.dumps(res, indent=2))
    print("SMOKE_TEST_RESULTS_END")
