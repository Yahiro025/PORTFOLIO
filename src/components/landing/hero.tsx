import type { FC, ReactNode } from 'react'
import type { FrameJob } from '@/lib/frame'

import { useEffect, useRef } from 'react'
import { ArrowRight } from 'lucide-react'

import { DepthPortrait } from '@/components/landing/depth-portrait'
import { addLoop, requestFrame } from '@/lib/frame'
import {
    clamp01,
    normAngle,
    prefersReducedMotion,
    smoothstep,
    splitChars
} from '@/lib/motion'

interface Guide {
    cx: number
    cy: number
    rx: number
    ry: number
    rot: number
    opacity: number
    fx: number
    fy: number
}

interface Satellite {
    homeR: number
    homeA: number
    apoOffset: number
    reachMax: number
    coreMin: number
    theta: number
    vel: number
    apo: number
    peri: number
    apoAng: number
    resting: boolean
    loops: number
    active: number
    gate: number
    accel: number
    x: number
    y: number
    guide: Guide | null
}

interface Transform {
    tx: number
    ty: number
    scale: number
}

const PROOF = 'Computer Science student at PUP Manila. Four pull requests merged into Prettier, pnpm, Tabby and Node.js’s Undici.'

// Orbit feel: seconds, radians, and design units (unit, rescaled per viewport).
const OMEGA = (2 * Math.PI) / 1.3
const RAMP_SEC = 0.5
const RADIAL_POW = 1.25
const DECAY_POW = 2.2
const SPEED_FLOOR = 0.35
const MIN_LOOPS = 2.2
const TAU_SHAPE = 0.35
const SHAPE_RATE = 700
const TAU_ANGLE = 0.5
const HOME_E = 0.1
const HOME_ANGLE = 1.2
const SPRING_K = 160
const SPRING_D = 16
const GATE_SEC = 0.5
const WAKE = 0.05
const MAX_STEP = 1 / 180
const ENV_HOLD = 0.9
const ENV_RELEASE = 1.8
const SMALL_ANGLE = Math.atan2(-111.5, 149)
const RING_ANGLE = Math.atan2(264, -1)
const DOCK_AT = 24
const UNDOCK_AT = 8
const SPINUP_MS = 850
const FLIGHT_MS = 1800
const FLIGHT_EASE = 'cubic-bezier(0.45, 0, 0.15, 1)'

const makeSatellite = (homeA: number, apoOffset: number): Satellite => ({
    homeR: 0,
    homeA,
    apoOffset,
    reachMax: 0,
    coreMin: 0,
    theta: homeA,
    vel: 0,
    apo: 0,
    peri: 0,
    apoAng: homeA,
    resting: true,
    loops: 0,
    active: 0,
    gate: 0,
    accel: 0,
    x: 0,
    y: 0,
    guide: null
})

// One Kepler-like step: the orbit stretches toward the attractor, loops, then springs home.
const stepSatellite = (s: Satellite, dt: number, env: number, dirTo: number, reachTo: number, unit: number, cx: number, cy: number) => {
    if (s.resting && env < WAKE) return
    if (s.resting) {
        s.loops = 0
        s.active = 0
        s.gate = 0
    }
    s.resting = false
    s.active += dt

    const targetPeri = s.homeR - env * Math.max(0, s.homeR - s.coreMin)
    const targetApo = targetPeri + env * Math.min(reachTo, s.reachMax)
    const mix = clamp01(env / (WAKE * 4))
    const targetApoAng = s.theta + normAngle(dirTo + s.apoOffset - s.theta) * mix

    const kShape = 1 - Math.exp(-dt / TAU_SHAPE)
    const cap = SHAPE_RATE * unit * dt
    const soft = (step: number) => cap * Math.tanh(step / cap)
    s.apo += soft((targetApo - s.apo) * kShape)
    s.peri += soft((targetPeri - s.peri) * kShape)
    s.apoAng += normAngle(targetApoAng - s.apoAng) * (1 - Math.exp(-dt / TAU_ANGLE))

    const a = (s.apo + s.peri) / 2
    const e = (s.apo - s.peri) / (s.apo + s.peri)
    const r = a * (1 - e * e) / (1 - e * Math.cos(s.theta - s.apoAng))

    const ramp = smoothstep(clamp01(s.active / RAMP_SEC))
    const decel = 1 - (1 - SPEED_FLOOR) * Math.pow(clamp01(s.loops / MIN_LOOPS), DECAY_POW)
    const kepler = OMEGA * ramp * decel * Math.pow(s.homeR / r, RADIAL_POW)
    const err = normAngle(s.theta - s.homeA)
    s.gate = s.loops >= MIN_LOOPS ? s.gate + dt : 0
    const homing = clamp01(1 - e / HOME_E) * clamp01(1 - Math.abs(err) / HOME_ANGLE) * clamp01(s.gate / GATE_SEC)
    const accel = (kepler - s.vel) * 40 * (1 - homing) + (-SPRING_K * err - SPRING_D * s.vel) * homing

    s.accel = accel
    s.vel += accel * dt
    s.theta += s.vel * dt
    s.loops += Math.abs(s.vel) * dt / (Math.PI * 2)

    const now = a * (1 - e * e) / (1 - e * Math.cos(s.theta - s.apoAng))
    s.x = cx + now * Math.cos(s.theta)
    s.y = cy + now * Math.sin(s.theta)
    s.guide = e > 0.01
        ? {
            cx: cx + a * e * Math.cos(s.apoAng),
            cy: cy + a * e * Math.sin(s.apoAng),
            rx: a,
            ry: a * Math.sqrt(Math.max(0, 1 - e * e)),
            rot: s.apoAng * 180 / Math.PI,
            opacity: Math.min(0.9, e * 2.2),
            fx: cx + (s.apo - s.peri) * Math.cos(s.apoAng),
            fy: cy + (s.apo - s.peri) * Math.sin(s.apoAng)
        }
        : null

    if (
        homing > 0.999 && Math.abs(err) < 0.01 && Math.abs(s.vel) < 0.05 &&
        Math.abs(s.apo - s.homeR) < 5 * unit && Math.abs(s.peri - s.homeR) < 5 * unit && env < WAKE
    ) {
        s.resting = true
        s.vel = 0
        s.guide = null
    }
}

const transformString = (t: Transform) => `translate(${t.tx.toFixed(2)}px, ${t.ty.toFixed(2)}px) scale(${t.scale.toFixed(4)})`

export const Hero: FC = (): ReactNode => {
    const heroRef = useRef<HTMLElement>(null)
    const svgRef = useRef<SVGSVGElement>(null)
    const massRef = useRef<SVGCircleElement>(null)
    const smallRef = useRef<SVGCircleElement>(null)
    const ringRef = useRef<SVGCircleElement>(null)
    const guideRefs = useRef<(SVGEllipseElement | null)[]>([])
    const focusRefs = useRef<(SVGCircleElement | null)[]>([])
    const labelRefs = useRef<(SVGTextElement | null)[]>([])
    const attractorRef = useRef<SVGCircleElement>(null)
    const taglineRef = useRef<HTMLParagraphElement>(null)
    const nameRef = useRef<HTMLSpanElement>(null)
    const proofRef = useRef<HTMLSpanElement>(null)
    const fadeRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const hero = heroRef.current
        const svg = svgRef.current
        const mass = massRef.current
        const smallEl = smallRef.current
        const ringEl = ringRef.current
        const attractorEl = attractorRef.current
        if (!hero || !svg || !mass || !smallEl || !ringEl || !attractorEl) return

        const root = document.documentElement
        const reduced = prefersReducedMotion()
        const small = makeSatellite(SMALL_ANGLE, 0)
        const ring = makeSatellite(RING_ANGLE, 0.5)

        let width = 0
        let height = 0
        let cx = 0
        let cy = 0
        let unit = 1
        let massR = 0
        let smallR = 0
        let ringOut = 0
        let docked = false
        let flying = false
        let dockScrollY = 0
        let dockTransform: Transform = { tx: 0, ty: 0, scale: 1 }
        let clickAt: number | null = null
        let attractor = { x: 0, y: 0 }
        let reachLimit = Infinity
        let clicked = false
        let introDone = reduced
        let stopLoop: (() => void) | null = null
        let last = 0
        let animation: Animation | null = null
        let spinTimer = 0

        const home = (s: Satellite) => ({ x: cx + s.homeR * Math.cos(s.homeA), y: cy + s.homeR * Math.sin(s.homeA) })

        const bounds = () => {
            const sh = home(small)
            const rh = home(ring)
            const left = Math.min(cx - massR, sh.x - smallR, rh.x - ringOut)
            const right = Math.max(cx + massR, sh.x + smallR, rh.x + ringOut)
            const top = Math.min(cy - massR, sh.y - smallR, rh.y - ringOut)
            const bottom = Math.max(cy + massR, sh.y + smallR, rh.y + ringOut)

            return { left, top, width: right - left, height: bottom - top }
        }

        // Where the glyph lands: the header mark slot, or off-screen when the slot is hidden.
        const dockedTransform = (): Transform => {
            const box = bounds()
            const target = document.getElementById('dock-target')?.getBoundingClientRect()
            if (!target || target.width === 0) {
                return { tx: -(box.left + box.width) - 60, ty: dockScrollY, scale: 1 }
            }
            const scale = Math.min(target.width / box.width, target.height / box.height)

            return {
                scale,
                tx: target.left + (target.width - box.width * scale) / 2 - scale * box.left,
                ty: target.top + (target.height - box.height * scale) / 2 - scale * box.top + dockScrollY
            }
        }

        const updateHint = () => {
            root.classList.toggle('hint-live', introDone && !clicked && !docked && !flying && !reduced)
        }

        const drawGuide = (s: Satellite, index: number) => {
            const guide = guideRefs.current[index]
            const focus = focusRefs.current[index]
            const label = labelRefs.current[index]
            if (!guide || !focus || !label) return
            const g = s.guide
            if (!g) {
                guide.setAttribute('opacity', '0')
                focus.setAttribute('opacity', '0')
                label.setAttribute('opacity', '0')

                return
            }
            const op = g.opacity.toFixed(3)
            guide.setAttribute('cx', g.cx.toFixed(1))
            guide.setAttribute('cy', g.cy.toFixed(1))
            guide.setAttribute('rx', g.rx.toFixed(1))
            guide.setAttribute('ry', g.ry.toFixed(1))
            guide.setAttribute('transform', `rotate(${g.rot.toFixed(2)} ${g.cx.toFixed(1)} ${g.cy.toFixed(1)})`)
            guide.setAttribute('opacity', op)
            focus.setAttribute('cx', g.fx.toFixed(1))
            focus.setAttribute('cy', g.fy.toFixed(1))
            focus.setAttribute('opacity', op)
            const [xy, accel] = Array.from(label.children) as SVGTSpanElement[]
            xy.setAttribute('x', (g.fx + 10).toFixed(1))
            xy.setAttribute('y', (g.fy + 4).toFixed(1))
            xy.textContent = `${Math.round(g.fx)}, ${Math.round(g.fy)}`
            accel.setAttribute('x', (g.fx + 10).toFixed(1))
            accel.setAttribute('y', (g.fy + 18).toFixed(1))
            accel.textContent = `a ${s.accel.toFixed(1)}`
            label.setAttribute('opacity', op)
        }

        const paint = (env: number) => {
            const sh = home(small)
            const rh = home(ring)
            const limit = 16 * (unit / 0.525)
            const recoilX = Math.max(-limit, Math.min(limit, -((small.x - sh.x) + (ring.x - rh.x)) * 0.045))
            const recoilY = Math.max(-limit, Math.min(limit, -((small.y - sh.y) + (ring.y - rh.y)) * 0.045))
            mass.setAttribute('transform', `translate(${recoilX.toFixed(2)} ${recoilY.toFixed(2)})`)
            smallEl.setAttribute('cx', small.x.toFixed(1))
            smallEl.setAttribute('cy', small.y.toFixed(1))
            ringEl.setAttribute('cx', ring.x.toFixed(1))
            ringEl.setAttribute('cy', ring.y.toFixed(1))
            drawGuide(small, 0)
            drawGuide(ring, 1)
            attractorEl.setAttribute('cx', attractor.x.toFixed(1))
            attractorEl.setAttribute('cy', attractor.y.toFixed(1))
            attractorEl.setAttribute('opacity', Math.min(0.9, env * 1.8).toFixed(3))
        }

        const layout = () => {
            const rect = hero.getBoundingClientRect()
            width = rect.width
            height = rect.height
            const wide = width >= 768
            unit = 0.7 * (wide ? Math.min(width / 1920, height / 1080) : (width / 1920) * 2.1)
            cx = wide ? width * 0.585 : width * 0.3
            cy = wide ? height * 0.42 : Math.max(150, height * 0.2)
            massR = 104.5 * unit
            smallR = 41.9 * unit
            ringOut = 109.65 * unit
            const ringIn = 46.44 * unit

            small.homeR = 159.6 * unit
            small.coreMin = massR + smallR + 6 * unit
            small.reachMax = 900 * unit
            ring.homeR = 227 * unit
            ring.coreMin = massR + ringOut + 6 * unit
            ring.reachMax = 900 * unit

            svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
            svg.style.width = `${width}px`
            svg.style.height = `${height}px`
            mass.setAttribute('r', massR.toFixed(1))
            mass.setAttribute('cx', cx.toFixed(1))
            mass.setAttribute('cy', cy.toFixed(1))
            smallEl.setAttribute('r', smallR.toFixed(1))
            ringEl.setAttribute('r', ((ringOut + ringIn) / 2).toFixed(1))
            ringEl.setAttribute('stroke-width', (ringOut - ringIn).toFixed(1))

            ;[small, ring].forEach(s => {
                if (!s.resting) return
                const h = home(s)
                s.x = h.x
                s.y = h.y
            })
            paint(0)

            if (taglineRef.current) {
                taglineRef.current.style.left = `${cx + massR + 22 * (unit / 0.525)}px`
                taglineRef.current.style.top = `${cy}px`
            }
            if (docked && !flying) {
                dockTransform = dockedTransform()
                svg.style.transform = transformString(dockTransform)
            }
        }

        const envelope = (now: number) => {
            if (clickAt === null) return 0
            const t = (now - clickAt) / 1000
            if (t <= ENV_HOLD) return 1
            const u = (t - ENV_HOLD) / ENV_RELEASE

            return u >= 1 ? 0 : 1 - smoothstep(u)
        }

        const frame = () => {
            const now = performance.now()
            const dt = last ? Math.min(0.033, (now - last) / 1000) : 1 / 60
            last = now
            const env = envelope(now)
            const dir = Math.atan2(attractor.y - cy, attractor.x - cx)
            const reach = Math.min(Math.hypot(attractor.x - cx, attractor.y - cy), reachLimit)

            let rest = dt
            while (rest > 1e-6) {
                const h = Math.min(rest, MAX_STEP)
                stepSatellite(small, h, env, dir, reach, unit, cx, cy)
                stepSatellite(ring, h, env, dir, reach, unit, cx, cy)
                ;[small, ring].forEach(s => {
                    if (s.resting) return
                    const dx = s.x - cx
                    const dy = s.y - cy
                    const d = Math.hypot(dx, dy)
                    if (d > 0 && d < s.coreMin) {
                        s.x = cx + dx * s.coreMin / d
                        s.y = cy + dy * s.coreMin / d
                    }
                })
                rest -= h
            }
            paint(env)

            if (!introDone && small.resting && ring.resting) {
                introDone = true
                updateHint()
            }
            if (small.resting && ring.resting && env === 0 && !flying) {
                stopLoop?.()
                stopLoop = null
                last = 0
            }
        }
        const heroJob: FrameJob = { write: frame }

        const wake = () => {
            if (stopLoop || reduced) return
            last = 0
            stopLoop = addLoop(heroJob)
        }

        const pull = (x: number, y: number, limit = Infinity) => {
            attractor = { x, y }
            reachLimit = limit
            clickAt = performance.now()
            small.loops = 0
            ring.loops = 0
            wake()
        }

        let checkScroll = () => {}

        const land = (anim: Animation, final: () => void) => {
            animation = anim
            const done = () => {
                if (animation !== anim) return
                animation = null
                final()
                anim.cancel()
                flying = false
                root.classList.remove('glyph-flying')
                svg.classList.remove('is-flying')
                updateHint()
                checkScroll()
            }
            anim.onfinish = done
            anim.oncancel = done
        }

        const dock = () => {
            if (docked || flying) return
            docked = true
            flying = true
            root.classList.add('glyph-flying')
            svg.classList.add('is-flying')
            updateHint()
            dockScrollY = window.scrollY
            svg.getAnimations().forEach(a => a.cancel())
            svg.style.position = 'fixed'
            svg.style.top = `${-dockScrollY}px`
            svg.style.transform = transformString({ tx: 0, ty: 0, scale: 1 })
            small.resting = false
            ring.resting = false
            pull(cx - 420 * unit, cy - 320 * unit)

            window.clearTimeout(spinTimer)
            spinTimer = window.setTimeout(() => {
                const from: Transform = { tx: 0, ty: 0, scale: 1 }
                const to = dockedTransform()
                const mid: Transform = {
                    scale: from.scale + (to.scale - from.scale) * 0.2,
                    tx: from.tx + (to.tx - from.tx) * 0.8,
                    ty: from.ty + (to.ty - from.ty) * 0.8
                }
                const anim = svg.animate([
                    { transform: transformString(from), offset: 0 },
                    { transform: transformString(mid), offset: 0.6 },
                    { transform: transformString(to), offset: 1 }
                ], { duration: FLIGHT_MS, easing: FLIGHT_EASE, fill: 'forwards' })
                land(anim, () => {
                    dockTransform = to
                    svg.style.transform = transformString(to)
                    svg.classList.add('is-docked')
                    root.classList.add('glyph-docked')
                })
            }, SPINUP_MS)
        }

        const undock = () => {
            if (!docked || flying) return
            window.clearTimeout(spinTimer)
            docked = false
            flying = true
            root.classList.remove('glyph-docked')
            root.classList.add('glyph-flying')
            svg.classList.remove('is-docked')
            svg.classList.add('is-flying')
            dockScrollY = window.scrollY
            svg.style.top = `${-dockScrollY}px`
            const from = dockedTransform()
            const to: Transform = { tx: 0, ty: 0, scale: 1 }
            const mid: Transform = {
                scale: from.scale + (to.scale - from.scale) * 0.75,
                tx: from.tx + (to.tx - from.tx) * 0.3,
                ty: from.ty + (to.ty - from.ty) * 0.3
            }
            pull(cx + 320 * unit, cy + 220 * unit)
            svg.getAnimations().forEach(a => a.cancel())
            const anim = svg.animate([
                { transform: transformString(from), offset: 0 },
                { transform: transformString(mid), offset: 0.4 },
                { transform: transformString(to), offset: 1 }
            ], { duration: FLIGHT_MS, easing: FLIGHT_EASE, fill: 'forwards' })
            land(anim, () => {
                svg.style.transform = ''
                svg.style.position = ''
                svg.style.top = ''
            })
        }

        // The name dissolves letter by letter, right to left, over the first stretch of scroll.
        const nameChars = nameRef.current ? splitChars(nameRef.current, 'dissolve') : []
        const proofChars = proofRef.current ? splitChars(proofRef.current, 'dissolve') : []
        const chars = [...nameChars, ...proofChars]
        const portrait = hero.querySelector<HTMLElement>('.hero-portrait')
        let lastP = -1
        let lastY = -1
        const dissolve = () => {
            if (reduced) return
            const y = window.scrollY
            const distance = Math.min(window.innerWidth, window.innerHeight) * 0.7
            const p = clamp01(y / distance)
            if (p !== lastP) {
                lastP = p
                const n = chars.length
                const WINDOW = 9
                const span = WINDOW / (n + WINDOW)
                chars.forEach((char, i) => {
                    const a = clamp01((p - (n - 1 - i) / (n + WINDOW)) / span)
                    const opacity = (1 - smoothstep(a)).toFixed(2)
                    if (char.style.opacity !== opacity) char.style.opacity = opacity
                })
                fadeRef.current?.style.setProperty('--fade', (1 - clamp01(p * 1.6)).toFixed(3))
                if (taglineRef.current) taglineRef.current.style.opacity = (1 - clamp01(p * 2)).toFixed(3)
            }
            // The portrait lags the page and leans in, so the hero feels deeper than one layer.
            if (portrait && y !== lastY && (y < window.innerHeight * 1.3 || lastY < window.innerHeight * 1.3)) {
                const q = clamp01(y / window.innerHeight)
                const clampedY = Math.min(y, window.innerHeight * 1.3)
                portrait.style.transform = `translate3d(0, ${(clampedY * 0.62).toFixed(1)}px, 0) scale(${(1 + q * 0.16).toFixed(4)})`
            }
            lastY = y
        }

        checkScroll = () => {
            const y = window.scrollY
            root.classList.toggle('is-scrolled', y > DOCK_AT)
            if (reduced) return
            if (!docked && !flying && y > DOCK_AT) dock()
            else if (docked && !flying && y < UNDOCK_AT) undock()
        }

        const scrollJob: FrameJob = {
            write: () => {
                dissolve()
                checkScroll()
            }
        }
        const onScroll = () => requestFrame(scrollJob)

        const onHeroClick = (event: MouseEvent) => {
            if (reduced || docked || flying) return
            if ((event.target as HTMLElement).closest('a, button')) return
            const rect = hero.getBoundingClientRect()
            clicked = true
            updateHint()
            pull(event.clientX - rect.left, event.clientY - rect.top)
        }

        // Once docked, gravity follows the visitor: every click tugs the header mark.
        const onDocumentClick = (event: MouseEvent) => {
            if (reduced || !docked || flying) return
            const t = dockTransform
            pull((event.clientX - t.tx) / t.scale, (event.clientY + dockScrollY - t.ty) / t.scale, 360 * unit)
        }

        const onSection = () => {
            if (reduced || !docked || flying) return
            const angle = Math.random() * Math.PI * 2
            pull(cx + Math.cos(angle) * 300 * unit, cy + Math.sin(angle) * 300 * unit, 300 * unit)
        }

        layout()
        dissolve()
        checkScroll()
        if (!reduced) {
            const intro = (s: Satellite, offset: number, apo: number, peri: number) => {
                s.resting = false
                s.theta = s.homeA - offset
                s.apo = apo
                s.peri = peri
                s.apoAng = s.theta
            }
            intro(small, 4.0, 1500 * unit, 500 * unit)
            intro(ring, 4.6, 1650 * unit, 600 * unit)
            wake()
        }
        // The hint arms once the bodies have swung into view, not when they fully come to rest.
        const hintTimer = window.setTimeout(() => {
            introDone = true
            updateHint()
        }, 2400)
        const offscreen = new IntersectionObserver(([entry]) => {
            hero.classList.toggle('is-offscreen', !entry.isIntersecting)
        })
        offscreen.observe(hero)

        const observer = new ResizeObserver(() => {
            layout()
            wake()
        })
        observer.observe(hero)
        hero.addEventListener('click', onHeroClick)
        document.addEventListener('click', onDocumentClick)
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('gravity:section', onSection)

        return () => {
            observer.disconnect()
            offscreen.disconnect()
            hero.removeEventListener('click', onHeroClick)
            document.removeEventListener('click', onDocumentClick)
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('gravity:section', onSection)
            window.clearTimeout(spinTimer)
            window.clearTimeout(hintTimer)
            stopLoop?.()
            animation?.cancel()
            root.classList.remove('glyph-docked', 'glyph-flying', 'hint-live')
        }
    }, [])

    return (
        <section
            id='top'
            data-tone='ink'
            ref={heroRef}
            className='relative flex min-h-[100svh] cursor-crosshair flex-col overflow-hidden bg-[radial-gradient(ellipse_70%_60%_at_45%_42%,#2a2926_0%,var(--ink)_68%)]'
        >
            <DepthPortrait className='hero-portrait pointer-events-none absolute right-[-12%] top-[4.5rem] z-0 h-[54svh] grayscale contrast-[1.08] [mask-image:linear-gradient(to_bottom,#000_55%,transparent_94%)] md:bottom-[4.25rem] md:left-[24%] md:right-auto md:top-auto md:h-[86svh]' />

            <svg ref={svgRef} aria-hidden className='hero-glyph pointer-events-none absolute left-0 top-0 z-10 overflow-visible'>
                {[0, 1].map(index => (
                    <ellipse key={`guide-${index}`} ref={node => { guideRefs.current[index] = node }} className='glyph-guide' opacity='0' />
                ))}
                {[0, 1].map(index => (
                    <circle key={`focus-${index}`} ref={node => { focusRefs.current[index] = node }} className='glyph-focus' r='4' opacity='0' />
                ))}
                {[0, 1].map(index => (
                    <text key={`label-${index}`} ref={node => { labelRefs.current[index] = node }} className='glyph-label' opacity='0'>
                        <tspan />
                        <tspan />
                    </text>
                ))}
                <circle ref={attractorRef} className='glyph-focus' r='7' opacity='0' />
                <circle ref={massRef} className='glyph-mass' />
                <circle ref={smallRef} className='glyph-small' />
                <circle ref={ringRef} className='glyph-ring' />
            </svg>

            <p
                ref={taglineRef}
                className='pointer-events-none absolute z-10 hidden -translate-y-1/2 whitespace-nowrap text-statement font-semibold text-ember md:block'
            >
                backend · systems · open source
            </p>

            <div
                ref={fadeRef}
                className='hero-lockup relative z-20 mt-auto flex cursor-auto flex-col gap-4 bg-[linear-gradient(to_top,var(--ink)_60%,transparent)] px-5 pb-24 pt-24 sm:px-10 md:max-w-[26rem] md:bg-none md:pb-24 md:pt-0'
            >
                <h1 className='text-title font-semibold tracking-[-0.02em]'>
                    <span className='sr-only'>Bennett Payoyo</span>
                    <span ref={nameRef} aria-hidden>Bennett Payoyo</span>
                </h1>
                <p className='text-body text-muted-ink'>
                    <span className='sr-only'>{PROOF}</span>
                    <span ref={proofRef} aria-hidden>{PROOF}</span>
                </p>
                <div className='hero-fade flex flex-col gap-4'>
                    <p className='flex items-center gap-2.5 text-small text-bone'>
                        <span className='pulse-dot size-2 shrink-0 rounded-full bg-ember' />
                        Open to internships and freelance work
                    </p>
                    <div className='mt-2 flex flex-wrap items-center gap-3'>
                        <a
                            href='#work'
                            className='group inline-flex items-center gap-2 rounded-full bg-ember px-6 py-3.5 font-semibold text-ink transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-ember-hot'
                        >
                            See the work
                            <ArrowRight className='size-4 transition-transform duration-300 group-hover:translate-x-0.5' aria-hidden />
                        </a>
                        <a
                            href='#contact'
                            className='inline-flex items-center rounded-full border border-bone/35 px-6 py-3.5 font-semibold transition-colors duration-300 hover:border-bone hover:bg-bone hover:text-ink'
                        >
                            Get in touch
                        </a>
                    </div>
                </div>
            </div>

            <p className='hero-tap-hint pointer-events-none absolute left-5 top-[calc(6rem+34vw)] z-10 text-small text-muted-ink md:hidden'>
                tap anywhere to pull
            </p>
        </section>
    )
}
