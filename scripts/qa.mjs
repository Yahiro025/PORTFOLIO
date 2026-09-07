// Run against `npm run build && npm run start`, with an existing Playwright install.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const url = process.env.QA_URL || 'http://127.0.0.1:3100'
const output = process.env.QA_OUTPUT || 'scratch/qa/browser'
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--no-sandbox']
})
const results = { checks: [], errors: [], firstPartyFailures: [] }
const check = name => { results.checks.push(name); console.log(`PASS ${name}`) }

async function newPage(options = {}) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, ...options })
    page.setDefaultTimeout(10000)
    page.on('pageerror', error => {
        // Cross-origin project failures are reported separately from portfolio errors.
        results.errors.push(error.stack || error.message)
    })
    page.on('console', message => {
        if (message.type() === 'error' && /Base UI error|client-side exception|Minified React error/.test(message.text())) {
            results.errors.push(message.text())
        }
    })
    page.on('response', response => {
        if (response.url().startsWith(url) && response.status() >= 400) {
            results.firstPartyFailures.push({ url: response.url(), status: response.status() })
        }
    })
    await page.goto(url)
    return page
}

async function settled(page, title) {
    await page.waitForFunction(expected => {
        const row = document.querySelector('.reel-title[aria-current="true"]')
        if (!row || (expected && row.getAttribute('aria-label') !== `View ${expected}`)) return false
        const rect = row.getBoundingClientRect()
        const center = innerHeight * (innerWidth < 768 ? 0.45 : 0.5)
        return Math.abs(rect.top + rect.height / 2 - center) < 0.15
    }, title, { timeout: 5000 })
    assert.equal(await page.locator('.reel-titles, .reel-images').evaluateAll(elements => elements.some(e => e.scrollTop !== 0)), false)
}

async function closeDetail(page) {
    await page.getByRole('button', { name: 'Back to projects', exact: true }).click()
    await page.locator('[aria-labelledby="detail-title"]').waitFor({ state: 'detached', timeout: 2000 })
    await settled(page)
    assert.equal(await page.locator('.reel-title h3, .reel-card').evaluateAll(elements => elements.some(e => getComputedStyle(e).visibility === 'hidden')), false)
}

try {
    for (const width of [375, 768, 1440]) {
        const page = await newPage({ viewport: { width, height: 900 }, javaScriptEnabled: false })
        const about = page.locator('.reel-card[data-kind="about"]').nth(1)
        const box = await about.boundingBox()
        assert.ok(box && box.y > 0 && box.y < 900 && box.x >= 0 && box.x + box.width <= width)
        assert.equal(await about.evaluate(el => getComputedStyle(el).opacity), '1')
        assert.equal(await page.locator('h1').count(), 1)
        assert.equal(await page.locator('iframe').count(), 0)
        await page.screenshot({ path: `${output}/ssr-${width}.png` })
        await page.close()
    }
    check('About is visible in server HTML at 375, 768 and 1440px')

    const page = await newPage()
    await settled(page, 'About')
    await page.waitForTimeout(2200) // Observe the old 1.7s entrance/PDF/iframe load window.
    assert.equal(await page.locator('iframe').count(), 0)
    assert.equal(await page.locator('.react-pdf__Document').count(), 0)
    assert.equal(await page.locator('.target-cursor-dot').count(), 0)
    await page.screenshot({ path: `${output}/desktop.png` })
    check('Initial load stays on About without project iframes, PDF or cursor dot')

    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 50, y: 450, deltaX: 0, deltaY: -100 })
    await settled(page, 'C Reviewer')
    await page.keyboard.press('ArrowDown')
    await settled(page, 'About')
    await page.keyboard.press('End')
    await settled(page, 'GitHub')
    await page.keyboard.press('PageDown')
    await settled(page, 'BANTAYOG')
    await page.keyboard.press('PageUp')
    await settled(page, 'GitHub')
    await page.keyboard.press('Home')
    await settled(page, 'BANTAYOG')
    check('Wheel without pointer entry, single notch, arrows, PageUp/Down and wrapping')

    await page.getByRole('button', { name: 'View ScholarAid', exact: true }).click()
    await page.mouse.move(80, 450)
    await page.mouse.wheel(0, -100)
    await settled(page)
    assert.equal(await page.locator('[aria-labelledby="detail-title"]').count(), 0)
    check('Wheel cancels pending navigation without a stale detail open')

    await page.getByRole('button', { name: 'Bennett Payoyo', exact: true }).click()
    await page.getByRole('heading', { name: 'About', exact: true }).waitFor()
    await closeDetail(page)
    await page.mouse.move(180, 375)
    await page.mouse.wheel(0, -190)
    await page.mouse.click(180, 370)
    await page.getByRole('button', { name: 'Back to projects', exact: true }).waitFor()
    await closeDetail(page)
    check('Click during momentum and early detail close restore exact row and visibility')

    for (const name of ['BANTAYOG', 'ScholarAid', 'Bikol Dictionary', 'TANGLAW', 'C Reviewer', 'GitHub']) {
        await page.getByRole('button', { name: `View ${name}`, exact: true }).focus()
        await settled(page, name)
        await page.keyboard.press('Enter')
        await page.getByRole('heading', { name, exact: true }).waitFor()
        if (name !== 'GitHub') {
            assert.equal(await page.locator('iframe').count(), 1)
            const live = page.getByRole('link', { name: 'Open live site', exact: true })
            assert.match(await live.getAttribute('href'), /^https:\/\//)
            assert.match(await page.getByRole('link', { name: 'Source code' }).getAttribute('href'), /^https:\/\/github.com\//)
        }
        await closeDetail(page)
    }
    check('All project and GitHub details; one detail iframe; Source/live links retained')

    await page.keyboard.press('Home')
    await settled(page, 'BANTAYOG')
    const activeCard = page.locator('.reel-card').filter({ has: page.locator('iframe') })
    await activeCard.getByRole('button', { name: 'Interact', exact: true }).click()
    assert.equal(await activeCard.locator('iframe').evaluate(e => getComputedStyle(e).pointerEvents), 'auto')
    await activeCard.getByRole('button', { name: 'Exit preview', exact: true }).click()
    assert.equal(await activeCard.locator('iframe').evaluate(e => getComputedStyle(e).pointerEvents), 'none')
    check('Interact and parent-owned Exit preview retain iframe input control')

    await page.getByRole('button', { name: 'View Resume', exact: true }).focus()
    await settled(page, 'Resume')
    await page.keyboard.press('Enter')
    await page.locator('[aria-labelledby="detail-title"] .react-pdf__Page canvas').waitFor({ timeout: 15000 })
    assert.equal(await page.getByRole('link', { name: 'Download resume', exact: true }).getAttribute('href'), '/resume.pdf')
    assert.equal(await page.getByRole('link', { name: 'View resume', exact: true }).getAttribute('href'), '/resume.pdf')
    assert.equal((await page.request.get(`${url}/resume.pdf`)).status(), 200)
    await closeDetail(page)
    check('Resume PDF renders; Download/View and PDF response work')

    await page.getByRole('button', { name: 'Bennett Payoyo', exact: true }).click()
    await page.getByRole('button', { name: 'Contact Bennett Payoyo' }).click()
    const contacts = page.getByRole('navigation', { name: 'Contact links' })
    await contacts.waitFor()
    const links = await contacts.locator('a').evaluateAll(elements => elements.map(a => a.getAttribute('href')))
    assert.deepEqual(links, ['mailto:bennettpayoyo3.14@gmail.com', 'https://www.linkedin.com/in/bennett-payoyo/', 'https://wa.me/639913800307', 'viber://chat?number=%2B639913800307'])
    await contacts.getByRole('link', { name: 'Email', exact: true }).focus()
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Email')
    await page.screenshot({ path: `${output}/contact.png` })
    await page.keyboard.press('Escape')
    await contacts.waitFor({ state: 'detached' })
    await closeDetail(page)
    check('Contact links exist, are keyboard reachable, and nested Escape preserves About')

    for (let i = 0; i < 18; i++) {
        await page.keyboard.press('Tab')
        assert.equal(await page.locator('.reel-titles, .reel-images').evaluateAll(elements => elements.some(e => e.scrollTop !== 0)), false)
    }
    check('Tab cannot scroll either track or enter inactive preview controls')
    await page.close()

    for (const width of [375, 768, 1920]) {
        const p = await newPage({ viewport: { width, height: 900 }, hasTouch: width === 375, isMobile: width === 375 })
        await settled(p, 'About')
        await p.screenshot({ path: `${output}/${width}.png` })
        assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
        if (width === 375) {
            const session = await p.context().newCDPSession(p)
            await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y: 360 }] })
            await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 190, y: 190 }] })
            await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
            await settled(p)
            assert.notEqual(await p.locator('.reel-title[aria-current="true"]').getAttribute('aria-label'), 'View About')
        }
        await p.getByRole('button', { name: 'Bennett Payoyo', exact: true }).click()
        await p.getByRole('button', { name: 'Back to projects', exact: true }).waitFor()
        await p.setViewportSize({ width: width === 375 ? 900 : 375, height: 812 })
        await closeDetail(p)
        await p.close()
    }
    check('Responsive layouts, touch scrolling and resize across detail breakpoints')

    const reduced = await newPage({ reducedMotion: 'reduce' })
    await settled(reduced, 'About')
    await reduced.keyboard.press('ArrowDown')
    await settled(reduced, 'Resume')
    await reduced.getByRole('button', { name: 'View Resume', exact: true }).click()
    await closeDetail(reduced)
    assert.equal(await reduced.locator('.target-cursor-wrapper').count(), 0)
    await reduced.close()
    check('Reduced motion preserves navigation and closes without long transitions')

    assert.deepEqual(results.firstPartyFailures, [])
    check('No failed first-party responses')
} finally {
    await fs.writeFile(`${output}/results.json`, JSON.stringify(results, null, 2))
    await browser.close()
}
