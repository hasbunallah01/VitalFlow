#!/usr/bin/env python3
"""Take screenshots of the VitalFlow UI for review.

Use full_page=False with element.screenshot to avoid the recharts/SVG
rendering quirk where bars/line are dropped from full-page captures.
"""
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
OUT = "/workspace/VitalFlow/screenshots"

import os
os.makedirs(OUT, exist_ok=True)

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # Desktop dashboard
        ctx = browser.new_context(viewport={"width": 1280, "height": 1600}, device_scale_factor=2)
        page = ctx.new_page()
        page.goto(f"{BASE}/dashboard", wait_until="networkidle")
        page.wait_for_selector("h1", timeout=10000)
        # Wait for charts to settle
        page.wait_for_timeout(1500)
        page.screenshot(path=f"{OUT}/01-desktop-dashboard.png")
        print("desktop dashboard saved")

        page.goto(f"{BASE}/analysis/upload", wait_until="networkidle")
        page.wait_for_selector("h1", timeout=10000)
        page.screenshot(path=f"{OUT}/02-desktop-upload.png")
        print("desktop upload saved")
        ctx.close()

        # Mobile dashboard
        ctx2 = browser.new_context(viewport={"width": 390, "height": 2400}, device_scale_factor=3, is_mobile=True)
        page2 = ctx2.new_page()
        page2.goto(f"{BASE}/dashboard", wait_until="networkidle")
        page2.wait_for_selector("h1", timeout=10000)
        page2.wait_for_timeout(1500)
        page2.screenshot(path=f"{OUT}/03-mobile-dashboard.png")
        print("mobile dashboard saved")

        page2.goto(f"{BASE}/analysis/upload", wait_until="networkidle")
        page2.wait_for_selector("h1", timeout=10000)
        page2.screenshot(path=f"{OUT}/04-mobile-upload.png")
        print("mobile upload saved")
        ctx2.close()

        browser.close()

run()
