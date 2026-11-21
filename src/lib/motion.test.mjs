import assert from 'node:assert/strict'
import test from 'node:test'

import {
    clamp01,
    easeInOutCubic,
    easeOutCubic,
    normAngle,
    pinProgress,
    smoothstep
} from './motion.ts'

const stubWindow = (innerHeight) => {
    const prior = globalThis.window
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { innerHeight }, writable: true })

    return () => {
        if (prior === undefined) delete globalThis.window
        else Object.defineProperty(globalThis, 'window', { configurable: true, value: prior, writable: true })
    }
}

const stubWrap = (rect) => {
    let calls = 0
    const wrap = {
        getBoundingClientRect: () => {
            calls += 1

            return rect
        }
    }

    return { calls: () => calls, wrap }
}

test('pinProgress reuses a premeasured rect instead of a second geometry read', () => {
    const restore = stubWindow(800)
    try {
        const rect = { height: 2800, top: -500 }
        const first = stubWrap(rect)
        const expected = pinProgress(first.wrap)
        assert.equal(first.calls(), 1)

        const second = stubWrap(rect)
        const premeasured = second.wrap.getBoundingClientRect()
        assert.equal(second.calls(), 1)
        const actual = pinProgress(second.wrap, premeasured)
        assert.equal(actual, expected)
        assert.equal(second.calls(), 1)
    } finally {
        restore()
    }
})

test('pinProgress measures once when no rect is passed', () => {
    const restore = stubWindow(800)
    try {
        const first = stubWrap({ height: 2800, top: -500 })
        pinProgress(first.wrap)
        assert.equal(first.calls(), 1)
    } finally {
        restore()
    }
})

test('clamp01 pins values to the 0 to 1 range', () => {
    assert.equal(clamp01(-0.5), 0)
    assert.equal(clamp01(0), 0)
    assert.equal(clamp01(0.42), 0.42)
    assert.equal(clamp01(1), 1)
    assert.equal(clamp01(7), 1)
})

test('easeOutCubic starts fast and lands on both ends', () => {
    assert.equal(easeOutCubic(0), 0)
    assert.equal(easeOutCubic(0.5), 0.875)
    assert.equal(easeOutCubic(1), 1)
})

test('easeInOutCubic is point-symmetric around the midpoint', () => {
    assert.equal(easeInOutCubic(0), 0)
    assert.equal(easeInOutCubic(0.25), 0.0625)
    assert.equal(easeInOutCubic(0.5), 0.5)
    assert.equal(easeInOutCubic(0.75), 0.9375)
    assert.equal(easeInOutCubic(1), 1)
})

test('smoothstep eases in and out between 0 and 1', () => {
    assert.equal(smoothstep(0), 0)
    assert.equal(smoothstep(0.25), 0.15625)
    assert.equal(smoothstep(0.5), 0.5)
    assert.equal(smoothstep(1), 1)
})

test('normAngle wraps into [-PI, PI] and keeps the same direction', () => {
    const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`)

    assert.equal(normAngle(0), 0)
    assert.equal(normAngle(0.3), 0.3)
    near(normAngle(3 * Math.PI / 2), -Math.PI / 2)
    near(normAngle(-3 * Math.PI / 2), Math.PI / 2)
    near(Math.abs(normAngle(5 * Math.PI)), Math.PI)

    for (const angle of [-17, -6.5, -3.2, 0.7, 4, 9.9, 21]) {
        const wrapped = normAngle(angle)

        assert.ok(wrapped >= -Math.PI && wrapped <= Math.PI, `${angle} wrapped to ${wrapped}`)
        near(Math.cos(wrapped), Math.cos(angle))
        near(Math.sin(wrapped), Math.sin(angle))
    }
})
