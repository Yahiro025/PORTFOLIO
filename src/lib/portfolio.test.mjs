import assert from 'node:assert/strict'
import test from 'node:test'

import {
    getGroup,
    getGroupPosition,
    getMotionPolicy,
    getPreviewPresentation,
    getReelOffsets,
    reduceInteraction,
    TITLE_REGISTER,
    validatePortfolioItems
} from './portfolio.ts'

const layout = {
    titleAreaVh: 80,
    titleTopVh: 10,
    titleMidVh: 40,
    titleSlotVh: 80 / 9,
    titleVisible: 9,
    titleFontVhMax: 4.5,
    titleFontVhMin: 4.2,
    imageWrapperTopVh: 0,
    imageWrapperHeightVh: 100,
    imageWrapperMidViewportVh: 50,
    imageHeightVh: 60,
    imageGapVh: 5,
    imagePitchVh: 65,
    imageOffsetPx: 0,
    pixelsPerItem: 600
}

const project = {
    id: 'scholaraid',
    kind: 'project',
    title: 'ScholarAid',
    year: '2026',
    meta: 'Live project · TypeScript · 2026',
    summary: 'A scholarship application built as a student project.',
    owner: 'Yahiro025',
    repo: 'ScholarAid',
    sourceUrl: 'https://github.com/Yahiro025/ScholarAid',
    liveUrl: 'https://scholar-aid-rho.vercel.app',
    embed: true,
    stack: ['TypeScript']
}

test('increasing reel position moves titles up and previews down', () => {
    const before = getReelOffsets(3, layout, 27)
    const after = getReelOffsets(4, layout, 27)

    assert.ok(after.titleVh < before.titleVh)
    assert.ok(after.previewVh > before.previewVh)
})

test('only the settled rendered copy mounts a passive live preview', () => {
    assert.equal(getPreviewPresentation(project, 10, 10, 10, null), 'live-passive')
    assert.equal(getPreviewPresentation(project, 1, 10, 10, null), 'poster')
})

test('interaction is granted only to the exact active rendered copy', () => {
    assert.equal(getPreviewPresentation(project, 10, 10, 10, 10), 'live-interactive')
    assert.equal(getPreviewPresentation(project, 1, 10, 10, 10), 'poster')
})

test('projects without a verified embed remain posters', () => {
    assert.equal(getPreviewPresentation({ ...project, embed: false }, 10, 10, 10, null), 'poster')
})

test('profile item kinds select their matching preview', () => {
    const items = [
        {
            id: 'about',
            kind: 'about',
            title: 'About',
            year: '2026',
            meta: 'Profile',
            summary: 'Student profile',
            avatarUrl: 'https://avatars.githubusercontent.com/u/75754746?v=4',
            focus: ['Web development']
        },
        {
            id: 'resume',
            kind: 'resume',
            title: 'Resume',
            year: '2026',
            meta: 'Education',
            summary: 'Current resume',
            school: 'Polytechnic University of the Philippines',
            program: 'Bachelor of Science in Computer Science',
            status: 'Second year',
            sourceUrl: 'https://github.com/Yahiro025/My-Resume'
        },
        {
            id: 'github',
            kind: 'github',
            title: 'GitHub',
            year: '2026',
            meta: 'Repositories',
            summary: 'Public activity',
            login: 'Yahiro025',
            profileUrl: 'https://github.com/Yahiro025'
        }
    ]

    for (const item of items) {
        assert.equal(getPreviewPresentation(item, 10, 10, 10, null), item.kind)
    }
})

test('interaction reducer enters and exits one rendered preview', () => {
    assert.equal(reduceInteraction(null, { type: 'enter', renderedIndex: 10 }), 10)
    assert.equal(reduceInteraction(10, { type: 'exit' }), null)
})

test('reduced motion disables automatic and long entrance motion', () => {
    assert.deepEqual(getMotionPolicy(true), {
        autoPass: false,
        blurEntrance: false,
        sharedElementDuration: 0
    })
})

test('normal motion preserves the current entrance and FLIP timing', () => {
    assert.deepEqual(getMotionPolicy(false), {
        autoPass: true,
        blurEntrance: true,
        sharedElementDuration: 0.95
    })
})

test('portfolio item ids must be unique', () => {
    const duplicate = { ...project, id: 'same' }

    assert.throws(
        () => validatePortfolioItems([duplicate, duplicate]),
        new Error('Duplicate portfolio item id: same')
    )
})

test('live project URLs must use HTTPS', () => {
    const unsafe = { ...project, id: 'unsafe', liveUrl: 'http://example.com' }

    assert.throws(
        () => validatePortfolioItems([unsafe]),
        new Error('Live URL must use HTTPS: unsafe')
    )
})

test('portfolio items map to Work and Profile groups', () => {
    assert.equal(getGroup(project), 'work')

    for (const kind of ['about', 'resume', 'github']) {
        assert.equal(getGroup({ kind }), 'profile')
    }
})

test('group position is one-based within the active group', () => {
    const items = [
        project,
        { ...project, id: 'bantayog' },
        { kind: 'about' },
        { kind: 'resume' },
        { kind: 'github' }
    ]

    assert.deepEqual(getGroupPosition(items, 0), { group: 'work', index: 1, total: 2 })
    assert.deepEqual(getGroupPosition(items, 2), { group: 'profile', index: 1, total: 3 })
    assert.deepEqual(getGroupPosition(items, 4), { group: 'profile', index: 3, total: 3 })
})

test('title registers use the approved type scale and weight ranges', () => {
    assert.deepEqual(TITLE_REGISTER.work, { scale: 1, wghtMin: 420, wghtMax: 620 })
    assert.deepEqual(TITLE_REGISTER.profile, { scale: 0.6, wghtMin: 380, wghtMax: 480 })
})

test('resume items require a PDF URL', () => {
    assert.throws(
        () => validatePortfolioItems([{
            id: 'resume',
            kind: 'resume',
            title: 'Resume',
            year: '2026',
            meta: 'Current',
            summary: 'Resume',
            school: 'PUP',
            program: 'BSCS',
            status: 'Second year',
            sourceUrl: 'https://github.com/Yahiro025/My-Resume'
        }]),
        new Error('Resume PDF URL is required: resume')
    )
})
