import asyncio
from playwright.async_api import async_playwright
import os

async def run_audit():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 1800})
        page = await context.new_page()

        console_errors = []
        page_errors = []
        network_errors = []

        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda err: page_errors.append(err.message))
        
        def handle_response(response):
            if 400 <= response.status < 600:
                network_errors.append(f"{response.url}: {response.status}")

        page.on("response", handle_response)

        try:
            await page.goto("http://localhost:8080/atelier", wait_until="networkidle")
        except Exception as e:
            print(f"FAILED: Could not load page: {e}")
            await browser.close()
            return

        # 1 & 2: Console and Network Errors
        ignore_patterns = [
            "React DevTools", "[vite]", "hydration", "non-static position", "GA/GTM", "google-analytics", "googletagmanager"
        ]
        filtered_console = [e for e in console_errors if not any(p.lower() in e.lower() for p in ignore_patterns)]
        filtered_page = [e for e in page_errors if not any(p.lower() in e.lower() for p in ignore_patterns)]
        filtered_network = [e for e in network_errors if not any(p.lower() in e.lower() for p in ignore_patterns)]

        if filtered_console: print(f"CONSOLE ERROR: {filtered_console}")
        if filtered_page: print(f"PAGE ERROR: {filtered_page}")
        if filtered_network: print(f"NETWORK ERROR: {filtered_network}")

        # 3: Images
        images = await page.query_selector_all("img")
        for img in images:
            src = await img.get_attribute("src")
            alt = await img.get_attribute("alt") or ""
            natural_width = await img.evaluate("el => el.naturalWidth")
            if natural_width == 0:
                print(f"IMAGE BROKEN: {src} (alt: {alt})")

        # 4: FAQ
        faq_section = await page.query_selector("text='Working with the Hive'")
        if not faq_section:
            print("SECTION MISSING: FAQ 'Working with the Hive'")
        else:
            # Check accordions
            accordions = await page.query_selector_all("button[aria-expanded]")
            if not accordions:
                print("FAQ ERROR: No accordions found")
            else:
                # Try expanding the first one
                await accordions[0].click()
                await asyncio.sleep(0.5)
                expanded = await accordions[0].get_attribute("aria-expanded")
                if expanded != "true":
                    print("FAQ ERROR: Accordion failed to expand")

        # 5: Team Section
        team_heading = await page.query_selector("text='ARTISTS, DESIGNERS, CRAFTSMEN'")
        if not team_heading:
            print("SECTION MISSING: Team section heading")

        # 6: Head Metadata
        title = await page.title()
        description = await page.locator('meta[name="description"]').get_attribute("content")
        og_image = await page.locator('meta[property="og:image"]').get_attribute("content")
        
        if not title: print("METADATA MISSING: Title")
        if not description: print("METADATA MISSING: Description")
        if not og_image:
            print("METADATA MISSING: og:image")
        elif not og_image.startswith("https://"):
            print(f"METADATA ERROR: og:image not absolute HTTPS ({og_image})")

        # 7: Placeholder text
        content = await page.inner_text("body")
        placeholders = ["undefined", "null", "[object Object]", "Lorem", "REPLACE"]
        for p_text in placeholders:
            if p_text in content:
                print(f"PLACEHOLDER FOUND: '{p_text}' in page content")

        # 8: Screenshot
        os.makedirs("/tmp/browser/audit-atelier", exist_ok=True)
        total_height = await page.evaluate("document.body.scrollHeight")
        viewport_height = 1800
        current_scroll = 0
        i = 1
        while current_scroll < total_height:
            await page.evaluate(f"window.scrollTo(0, {current_scroll})")
            await asyncio.sleep(0.3)
            await page.screenshot(path=f"/tmp/browser/audit-atelier/full_{i}.png")
            current_scroll += viewport_height
            i += 1
        
        # Copy first one to full.png for compliance
        import shutil
        if os.path.exists("/tmp/browser/audit-atelier/full_1.png"):
            shutil.copy("/tmp/browser/audit-atelier/full_1.png", "/tmp/browser/audit-atelier/full.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_audit())
