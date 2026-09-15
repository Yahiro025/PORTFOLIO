import { chromium } from '/home/yahiro/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs'
import fs from 'node:fs/promises'

const browser = await chromium.launch({ executablePath: '/home/yahiro/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome', args: ['--no-sandbox'] })
const output = { samples: [], errors: [] }
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', error => output.errors.push(error.message))
await page.addInitScript(() => {
    window.qaVitals = { lcp: [], shifts: [] }
    new PerformanceObserver(list => list.getEntries().forEach(e => window.qaVitals.lcp.push({ time: e.startTime, size: e.size, url: e.url, element: e.element?.outerHTML.slice(0, 350) }))).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver(list => list.getEntries().forEach(e => window.qaVitals.shifts.push({ time: e.startTime, value: e.value, recent: e.hadRecentInput, sources: e.sources?.map(s => ({ element: s.node?.outerHTML.slice(0, 200), before: s.previousRect, after: s.currentRect })) }))).observe({ type: 'layout-shift', buffered: true })
})
const sample = async label => {
    output.samples.push({ label, ...await page.evaluate(() => ({
        counter: document.querySelector('[data-chrome] span')?.textContent,
        details: document.querySelector('h2')?.textContent,
        scrollY, documentHeight: document.documentElement.scrollHeight, height: innerHeight,
        iframes: document.querySelectorAll('iframe').length,
        strips: [...document.querySelectorAll('.will-change-transform')].map(e => ({ transform: e.style.transform, opacity: getComputedStyle(e.parentElement).opacity })),
        hidden: [...document.querySelectorAll('[style*="visibility: hidden"]')].map(e => e.textContent?.slice(0, 80)),
        rows: [...document.querySelectorAll('[role="button"][tabindex="0"]')].map(e => ({ label: e.getAttribute('aria-label'), top: e.getBoundingClientRect().top, opacity: getComputedStyle(e).opacity })),
    })) })
}
await page.goto('http://127.0.0.1:3100/')
await page.waitForTimeout(2500)
await sample('desktop load')
await page.screenshot({ path: 'scratch/qa/baseline-desktop.png' })
const cdp = await page.context().newCDPSession(page)
await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 50, y: 450, deltaY: -650, deltaX: 0 })
await page.waitForTimeout(1500)
await sample('wheel without pointer enter')
await page.mouse.move(150, 450)
for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, -200); await page.waitForTimeout(30) }
await page.waitForTimeout(1500)
await sample('wheel after pointer enter')
await page.getByRole('button', { name: 'View BANTAYOG', exact: true }).click()
await page.waitForTimeout(2500)
await sample('BANTAYOG detail')
await page.getByRole('button', { name: 'Close', exact: true }).click()
await page.waitForTimeout(1200)
await sample('closed after 1.2s')
await page.mouse.wheel(0, 180)
await page.waitForTimeout(1000)
await sample('wheel after close')
output.vitals = await page.evaluate(() => window.qaVitals)
await fs.writeFile('scratch/qa/baseline-interactions.json', JSON.stringify(output, null, 2))
console.log(JSON.stringify(output.samples, null, 2))
await page.close()
for (const width of [375, 768]) {
    const p = await browser.newPage({ viewport: { width, height: 900 }, isMobile: width < 768, hasTouch: width < 768 })
    await p.goto('http://127.0.0.1:3100/')
    await p.waitForTimeout(2500)
    await p.screenshot({ path: `scratch/qa/baseline-${width}.png` })
    await p.close()
}
const ssr = await browser.newPage({ viewport: { width: 375, height: 812 }, javaScriptEnabled: false })
await ssr.goto('http://127.0.0.1:3100/')
await ssr.screenshot({ path: 'scratch/qa/baseline-ssr-mobile.png' })
await browser.close()
