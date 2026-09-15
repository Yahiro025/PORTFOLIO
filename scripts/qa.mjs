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
        // The desktop title track lives inside the md:-translate-y-[22dvh]
        // reveal wrapper (folio-reel.tsx), so a settled row rests at 28% of
        // viewport height, not 50%. Mobile keeps the 45% mark. The 1px
        // tolerance absorbs fractional-vh rounding; anything in motion
        // moves tens of pixels per frame.
        const center = innerHeight * (innerWidth < 768 ? 0.45 : 0.28)
        return Math.abs(rect.top + rect.height / 2 - center) < 1
    }, title, { timeout: 5000 })
    assert.equal(await page.locator('.reel-titles, .reel-images').evaluateAll(elements => elements.some(e => e.scrollTop !== 0)), false)
}

async function closeDetail(page) {
    await page.getByRole('button', { name: 'Back to projects', exact: true }).click()
    await page.locator('[aria-labelledby="detail-title"]').waitFor({ state: 'detached', timeout: 2000 })
    await settled(page)
    // The stylesheet intentionally hides profile titles/cards while the
    // work group is active (and vice versa is always visible), so only
    // assert the active group's nodes have no leftover hidden state.
    const group = await page.locator('.folio-reel').getAttribute('data-active-group')
    const selector = group === 'work'
        ? '.reel-title[data-kind="project"] h3, .reel-card[data-kind="project"]'
        : '.reel-title h3, .reel-card'
    assert.equal(await page.locator(selector).evaluateAll(elements => elements.some(e => getComputedStyle(e).visibility === 'hidden')), false)
}

async function assertOnlyActivePreviewVisible(page) {
    // Geometric rest (settled) precedes visual rest: the outgoing card's
    // one-step crossfade tail lingers briefly above zero opacity.
    await page.waitForFunction(() => [...document.querySelectorAll('.reel-card')]
        .filter(element => Number.parseFloat(getComputedStyle(element).opacity) > 0.01).length === 1,
    null, { timeout: 5000 })
    const cards = page.locator('.reel-card')
    const visibleCards = await cards.evaluateAll(elements =>
        elements.filter(element => Number.parseFloat(getComputedStyle(element).opacity) > 0.01).length
    )

    assert.equal(visibleCards, 1)
}

try {
    for (const width of [375, 768, 1440]) {
        const page = await newPage({ viewport: { width, height: 900 }, javaScriptEnabled: false })
        if (width < 768) {
            // The desktop reel tracks are CSS-hidden below 768px; the mobile
            // gallery only renders with JavaScript enabled, so no preview
            // card can have a box here. Assert the hidden state instead.
            assert.equal(await page.locator('.reel-images').evaluate(el => getComputedStyle(el).display), 'none')
        } else {
            const about = page.locator('.reel-card[data-kind="about"]').nth(1)
            const box = await about.boundingBox()
            assert.ok(box && box.y > 0 && box.y < 900 && box.x >= 0 && box.x + box.width <= width)
            assert.equal(await about.evaluate(el => getComputedStyle(el).opacity), '1')
        }
        assert.equal(await page.locator('h1').count(), 1)
        assert.equal(await page.locator('iframe').count(), 0)
        await page.screenshot({ path: `${output}/ssr-${width}.png` })
        await page.close()
    }
    check('About is visible in server HTML at 768 and 1440px; reel tracks hidden at 375px')

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
    await assertOnlyActivePreviewVisible(page)
    await page.keyboard.press('ArrowDown')
    await settled(page, 'About')
    await assertOnlyActivePreviewVisible(page)
    await page.keyboard.press('End')
    await settled(page, 'GitHub')
    await assertOnlyActivePreviewVisible(page)
    await page.keyboard.press('PageDown')
    await settled(page, 'BANTAYOG')
    await assertOnlyActivePreviewVisible(page)
    await page.keyboard.press('PageUp')
    await settled(page, 'GitHub')
    await assertOnlyActivePreviewVisible(page)
    await page.keyboard.press('Home')
    await settled(page, 'BANTAYOG')
    await assertOnlyActivePreviewVisible(page)
    check('Wheel without pointer entry, single notch, arrows, PageUp/Down and wrapping')

    await page.getByRole('button', { name: 'View ScholarAid', exact: true }).click()
    await page.mouse.move(80, 450)
    await page.mouse.wheel(0, -100)
    await settled(page)
    assert.equal(await page.locator('[aria-labelledby="detail-title"]').count(), 0)
    check('Wheel cancels pending navigation without a stale detail open')

    // The ProfileReel overlay covers the reel chrome while a profile item
    // is active, so activate the chrome button by keyboard instead of pointer.
    await page.locator('h1').getByRole('button', { name: 'Bennett Payoyo', exact: true }).focus()
    await page.keyboard.press('Enter')
    await page.getByRole('heading', { name: 'BANTAYOG', exact: true }).waitFor()
    await closeDetail(page)
    await page.mouse.move(180, 375)
    await page.mouse.wheel(0, -190)
    // Click the live row instead of fixed coordinates: row geometry shifts
    // with viewport and fonts, but the product path (row activation during
    // momentum cancels the glide and opens that detail) is identical.
    // dispatchEvent avoids scroll-into-view, which would fight the fixed
    // 100dvh reel and chase its own tail.
    await page.locator('.reel-title[aria-current="true"]').dispatchEvent('click')
    await page.getByRole('button', { name: 'Back to projects', exact: true }).waitFor()
    await closeDetail(page)
    check('Click during momentum and early detail close restore exact row and visibility')

    for (const name of ['BANTAYOG', 'ScholarAid', 'Bikol Dictionary', 'TANGLAW', 'C Reviewer', 'GitHub']) {
        // Profile titles are visibility-hidden while the work group is
        // active, so reach the profile group before focusing its row.
        if (name === 'GitHub') {
            await page.keyboard.press('End')
            await settled(page, 'GitHub')
        }
        await page.getByRole('button', { name: `View ${name}`, exact: true }).focus()
        await settled(page, name)
        await page.keyboard.press('Enter')
        await page.getByRole('button', { name: 'Back to projects', exact: true }).waitFor()
        await page.getByRole('heading', { name, exact: true }).waitFor()
        if (name !== 'GitHub') {
            assert.equal(await page.locator('iframe').count(), 1)
            // Base UI renders these anchors with an explicit role="button",
            // so query by button role and assert the underlying hrefs.
            const live = page.getByRole('button', { name: 'Open live site', exact: true })
            assert.match(await live.getAttribute('href'), /^https:\/\//)
            assert.match(await page.getByRole('button', { name: 'Source code' }).getAttribute('href'), /^https:\/\/github.com\//)
        }
        await closeDetail(page)
    }
    check('All project and GitHub details; one detail iframe; Source/live links retained')

    await page.keyboard.press('Home')
    await settled(page, 'BANTAYOG')
    const activeCard = page.locator('.reel-card').filter({ has: page.locator('iframe') })
    // The preview header is a hover-reveal overlay (opacity 0 and inert
    // until the card is hovered), so move the pointer onto the button and
    // let the reveal settle before activating, like a real user would.
    const interact = activeCard.getByRole('button', { name: 'Interact', exact: true })
    const interactBox = await interact.boundingBox()
    await page.mouse.move(interactBox.x + interactBox.width / 2, interactBox.y + interactBox.height / 2)
    await page.waitForTimeout(800)
    await interact.dispatchEvent('click')
    assert.equal(await activeCard.locator('iframe').evaluate(e => getComputedStyle(e).pointerEvents), 'auto')
    const exitPreview = activeCard.getByRole('button', { name: 'Exit preview', exact: true })
    const exitBox = await exitPreview.boundingBox()
    await page.mouse.move(exitBox.x + exitBox.width / 2, exitBox.y + exitBox.height / 2)
    await page.waitForTimeout(800)
    await exitPreview.dispatchEvent('click')
    assert.equal(await activeCard.locator('iframe').evaluate(e => getComputedStyle(e).pointerEvents), 'none')
    check('Interact and parent-owned Exit preview retain iframe input control')

    await page.keyboard.press('End')
    await settled(page, 'GitHub')
    await assertOnlyActivePreviewVisible(page)

    const resumeTab = page.getByRole('tab', { name: /02 Resume/ })
    await resumeTab.click()
    await page.waitForFunction(() => document.querySelector('#profile-tab-resume')?.getAttribute('aria-selected') === 'true')

    await resumeTab.press('ArrowDown')

    const githubTab = page.getByRole('tab', { name: /03 GitHub/ })
    await page.waitForFunction(() => document.querySelector('#profile-tab-github')?.getAttribute('aria-selected') === 'true')
    assert.equal(await githubTab.evaluate(element => document.activeElement === element), true)

    await githubTab.press('ArrowUp')
    await page.waitForFunction(() => document.querySelector('#profile-tab-resume')?.getAttribute('aria-selected') === 'true')

    const aboutTab = page.getByRole('tab', { name: /01 About/ })
    await aboutTab.click()
    await page.waitForFunction(() => document.querySelector('#profile-tab-about')?.getAttribute('aria-selected') === 'true')
    await aboutTab.press('ArrowUp')
    await settled(page, 'C Reviewer')
    await assertOnlyActivePreviewVisible(page)

    await page.keyboard.press('End')
    await settled(page, 'GitHub')

    const lastProfileTab = page.getByRole('tab', { name: /03 GitHub/ })
    await lastProfileTab.focus()
    await lastProfileTab.press('ArrowDown')
    await settled(page, 'BANTAYOG')
    await assertOnlyActivePreviewVisible(page)
    check('Profile tabs move with ArrowUp/Down and boundaries continue into the work reel')

    const bantayogCard = page.locator('.reel-card').filter({ has: page.locator('iframe') })
    await bantayogCard.locator('iframe').waitFor()
    const bantayogCoverage = await bantayogCard.locator('iframe').evaluate(iframe => {
        const frame = iframe.parentElement.getBoundingClientRect()
        const content = iframe.getBoundingClientRect()
        const tolerance = 2

        return {
            coversWidth:
                content.left <= frame.left + tolerance &&
                content.right >= frame.right - tolerance,
            coversHeight:
                content.top <= frame.top + tolerance &&
                content.bottom >= frame.bottom - tolerance
        }
    })

    assert.equal(bantayogCoverage.coversWidth, true)
    assert.equal(bantayogCoverage.coversHeight, true)

    await page.getByRole('button', { name: 'View TANGLAW', exact: true }).focus()
    await settled(page, 'TANGLAW')
    await assertOnlyActivePreviewVisible(page)
    const tanglawCard = page.locator('.reel-card').filter({ has: page.locator('iframe') })
    await tanglawCard.locator('iframe').waitFor()
    const tanglawCoverage = await tanglawCard.locator('iframe').evaluate(iframe => {
        const frame = iframe.parentElement.getBoundingClientRect()
        const content = iframe.getBoundingClientRect()
        const tolerance = 2

        return {
            coversWidth:
                content.left <= frame.left + tolerance &&
                content.right >= frame.right - tolerance,
            topAligned: content.top <= frame.top + tolerance
        }
    })

    assert.equal(tanglawCoverage.coversWidth, true)
    assert.equal(tanglawCoverage.topAligned, true)
    check('BANTAYOG covers its frame on both axes; TANGLAW covers full width top-aligned')

    // Profile titles are visibility-hidden while the work group is active.
    await page.keyboard.press('End')
    await settled(page, 'GitHub')
    await page.getByRole('button', { name: 'View Resume', exact: true }).focus()
    await settled(page, 'Resume')
    await page.keyboard.press('Enter')
    await page.locator('[aria-labelledby="detail-title"] .react-pdf__Page canvas').waitFor({ timeout: 15000 })
    assert.equal(await page.getByRole('button', { name: 'Download resume', exact: true }).getAttribute('href'), '/resume.pdf')
    assert.equal(await page.getByRole('button', { name: 'View resume', exact: true }).getAttribute('href'), '/resume.pdf')
    assert.equal((await page.request.get(`${url}/resume.pdf`)).status(), 200)
    await closeDetail(page)
    check('Resume PDF renders; Download/View and PDF response work')

    await page.getByRole('button', { name: 'View About', exact: true }).focus()
    await settled(page, 'About')
    await page.keyboard.press('Enter')
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
        if (width === 375) {
            await p.locator('[data-mobile-profile]').waitFor()
        } else {
            await settled(p, 'About')
        }
        await p.screenshot({ path: `${output}/${width}.png` })
        assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
        if (width === 375) {
            const session = await p.context().newCDPSession(p)
            await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y: 360 }] })
            await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 190, y: 190 }] })
            await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
            await p.waitForTimeout(400)
            // A vertical swipe scrolls the profile panel without hijacking
            // selection: About stays shown and the reel tracks never scroll.
            assert.equal(await p.locator('[data-mobile-profile]').count(), 1)
            assert.equal(await p.locator('.reel-titles, .reel-images').evaluateAll(elements => elements.some(e => e.scrollTop !== 0)), false)
            await p.getByRole('button', { name: 'Open About details' }).click()
        } else {
            await p.locator('h1').getByRole('button', { name: 'Bennett Payoyo', exact: true }).focus()
            await p.keyboard.press('Enter')
        }
        await p.getByRole('button', { name: 'Back to projects', exact: true }).waitFor()
        if (width === 375) {
            // The mobile reel loop is parked, so a desktop settle check can
            // never pass after resizing into mobile: resize first (detail
            // stays open across the breakpoint), then close on desktop.
            await p.setViewportSize({ width: 900, height: 812 })
            await closeDetail(p)
        } else {
            await closeDetail(p)
            await p.setViewportSize({ width: 375, height: 812 })
            // The closed detail was a project, so mobile correctly lands on
            // the projects scroller rather than the profile panel.
            await p.locator('[aria-label="Work projects"]').waitFor()
        }
        await p.close()
    }
    check('Responsive layouts, touch scrolling and resize across detail breakpoints')

    for (const [width, height] of [[375, 812], [768, 900], [1440, 900], [1550, 925]]) {
        const p = await newPage({ viewport: { width, height } })
        if (width < 768) {
            await p.locator('[data-mobile-profile]').waitFor()
        } else {
            await settled(p, 'About')
        }
        await p.screenshot({ path: `${output}/viewport-${width}x${height}.png` })
        assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
        if (width >= 768) await assertOnlyActivePreviewVisible(p)
        await p.close()
    }
    check('Single visible preview without fragments at 375x812, 768x900, 1440x900 and 1550x925')

    const reduced = await newPage({ reducedMotion: 'reduce' })
    await settled(reduced, 'About')
    await reduced.keyboard.press('ArrowDown')
    await settled(reduced, 'Resume')
    // The ProfileReel overlay covers the reel titles while a profile item
    // is active, so open the detail by keyboard instead of pointer.
    await reduced.getByRole('button', { name: 'View Resume', exact: true }).focus()
    await reduced.keyboard.press('Enter')
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
