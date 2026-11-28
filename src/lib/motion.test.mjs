import assert from 'node:assert/strict'
import test from 'node:test'

import {
    clamp01,
    detectLowPower,
    easeInOutCubic,
    easeOutCubic,
    hasHardwareGpu,
    isLowPowerDevice,
    isSoftwareRenderer,
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

test('detectLowPower identifies low-end, reduced-motion, and save-data environments', () => {
    const capable = { reduced: false, hardwareGpu: true, cores: 4, memoryGb: 8, saveData: false }

    assert.equal(detectLowPower(capable), false)
    assert.equal(detectLowPower({ reduced: false, hardwareGpu: true }), false)
    assert.equal(detectLowPower({ ...capable, hardwareGpu: false }), true)
    assert.equal(detectLowPower({ ...capable, cores: 2 }), true)
    assert.equal(detectLowPower({ ...capable, cores: 1 }), true)
    assert.equal(detectLowPower({ ...capable, cores: 0 }), false)
    assert.equal(detectLowPower({ ...capable, memoryGb: 2 }), true)
    assert.equal(detectLowPower({ ...capable, memoryGb: 1 }), true)
    assert.equal(detectLowPower({ ...capable, memoryGb: 0 }), false)
    assert.equal(detectLowPower({ ...capable, saveData: true }), true)
    assert.equal(detectLowPower({ ...capable, reduced: true }), true)
})

test('hasHardwareGpu and isLowPowerDevice fall back safely without DOM globals', () => {
    assert.equal(hasHardwareGpu(), true)
    assert.equal(isLowPowerDevice(), false)
})

test('isSoftwareRenderer detects software WebGL renderers and passes hardware GPUs', () => {
    assert.equal(isSoftwareRenderer('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)'), true)
    assert.equal(isSoftwareRenderer('llvmpipe (LLVM 15.0.7, 256 bits)'), true)
    assert.equal(isSoftwareRenderer('ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)'), true)
    assert.equal(isSoftwareRenderer('Mesa Offscreen'), true)
    assert.equal(isSoftwareRenderer('Apple M3'), false)
    assert.equal(isSoftwareRenderer('ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 Direct3D11 vs_5_0 ps_5_0, D3D11)'), false)
    assert.equal(isSoftwareRenderer('ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)'), false)
    assert.equal(isSoftwareRenderer(''), false)
})
