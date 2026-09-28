import type { FC, ReactNode } from 'react'
import type { OrbitCard } from '@/types'
import type { FrameJob } from '@/lib/frame'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight, ChevronRight, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { addLoop, requestFrame } from '@/lib/frame'
import {
    clamp01,
    easeInOutCubic,
    easeOutCubic,
    pinProgress,
    richMotion
} from '@/lib/motion'
import { ORBIT_CARDS, openSource, projects } from '@/constants/folio'

interface Caption {
    title: string
    detail: string
    href?: string
    hrefLabel?: string
    source?: string
}

interface CardState {
    data: OrbitCard
    dir: [number, number, number]
    back: HTMLDivElement
    front: HTMLDivElement
    w: number
    h: number
    z: number
    hover: number
    lastFilter: string
    inFront: boolean | null
    cx: number
    cy: number
}

// Scroll choreography, as fractions of the pinned wrapper's travel.
const MASK_START = 0.152
const MASK_DONE = 0.524
const ENTRY_DONE = 0.439
const COLLAPSE_START = 0.767
const FLASH_START = 0.52
const FLASH_PEAK = 0.72
const FLASH_GROW = 0.55
const EXPLODE_START = 0.8
const EXPLODE_OVERSHOOT = 1.7
const MASK_MIN_R = 78
const TEXT_GROW_START = 0.15
const TEXT_GROW_MAX = 11
const TEXT_TILT = 24
const TEXT_BLUR = 10
const ENTRY_SCALE = 2.3
const BUMP_END = 0.2
const BUMP = 0.18
const SUCK_END = 0.74
const CARD_SHRINK_START = 0.22

// Orbit handling.
const FRICTION = 0.94
const AUTO_SPEED = 4
const DRAG_GAIN = 0.22
const CLICK_SLOP = 6
const HOVER_SCALE = 0.12
const MAGNET_PX = 14
const FOCUS_FILL = 0.62
const FOCUS_DIM = 0.45
const BONE: [number, number, number] = [238, 235, 228]
const SLIDE_MS = 4200

const captionFor = (card: OrbitCard): Caption => {
    const project = projects.find(item => item.id === card.ref)
    if (project) {
        return {
            title: project.title,
            detail: card.label.split('·')[1]?.trim() ?? project.descriptor ?? '',
            href: project.liveUrl,
            hrefLabel: 'Open live site',
            source: project.sourceUrl
        }
    }
    const pr = openSource.find(item => item.id === card.ref)

    return {
        title: pr ? `${pr.project} #${pr.number}` : card.label,
        detail: pr?.title ?? '',
        href: pr?.url,
        hrefLabel: 'Read the merged PR'
    }
}

const hexToRgb = (value: string): [number, number, number] => {
    const hex = value.trim().replace('#', '')
    if (!/^[0-9a-f]{6}$/i.test(hex)) return [255, 91, 46]

    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
}

const Word: FC<{ children: ReactNode; index: number }> = ({ children, index }): ReactNode => (
    <span className='rise-mask'>
        <span className='rise' style={{ transitionDelay: `${(index * 0.075).toFixed(3)}s` }}>{children}</span>
    </span>
)

const Manifesto: FC = (): ReactNode => (
    <>
        <div data-row className='mf-row'>
            <Word index={0}>Still</Word> <Word index={1}>in</Word> <Word index={2}>school.</Word>
        </div>
        <div data-row className='mf-row flex flex-wrap justify-between gap-x-[0.3em]'>
            <Word index={3}>Already</Word>
            <Word index={4}>upstream.</Word>
        </div>
        <div data-row className='mf-row'>
            <Word index={5}>Shipping</Word>{' '}
            <Word index={6}><span className='mf-strike text-ink/35'>homework</span></Word>{' '}
            <Word index={7}>software.</Word>
        </div>
        <div data-row className='mf-foot mt-[4vh] grid items-end gap-6 md:grid-cols-12'>
            <p className='mf-close md:col-span-7'>
                <Word index={8}><span className='mf-underline'>Proof</span>,</Word> <Word index={9}>not</Word> <Word index={10}>promises.</Word>
            </p>
            <div className='mf-copy flex flex-col gap-3 text-body normal-case tracking-normal md:col-span-5 md:col-start-8 lg:col-span-4 lg:col-start-9'>
                <p>
                    Most student portfolios stop at mockups. Mine points at merged code: four pull requests accepted in September 2026 by the maintainers of Prettier, pnpm, Tabby and Undici.
                </p>
                <p>
                    At home I build for Bicol and for students like me, and I verify what I ship with regression tests, maintainer review and real deployments.
                </p>
            </div>
        </div>
    </>
)

const StaticStrip: FC = (): ReactNode => (
    <section aria-label='Project screens' className='tone-ink py-16'>
        <ul data-lenis-prevent className='no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 sm:px-10'>
            {ORBIT_CARDS.filter(card => !card.id.endsWith('-m1')).slice(0, 14).map(card => {
                const caption = captionFor(card)

                return (
                    <li key={card.id} className='w-[82vw] max-w-[34rem] shrink-0 snap-center'>
                        <img
                            src={card.src}
                            width={card.width}
                            height={card.height}
                            alt={card.label}
                            loading='lazy'
                            className='w-full rounded-[14px] object-cover'
                        />
                        <p className='mt-3 text-lead font-semibold'>{caption.title}</p>
                        <p className='text-small text-muted-ink'>{caption.detail}</p>
                        {caption.href && (
                            <a href={caption.href} target='_blank' rel='noreferrer' className='link-underline mt-2 inline-flex items-center gap-1 text-small font-semibold'>
                                {caption.hrefLabel}
                                <ArrowUpRight className='size-4' aria-hidden />
                            </a>
                        )}
                    </li>
                )
            })}
        </ul>
    </section>
)

export const Sequence: FC = (): ReactNode => {
    const [rich, setRich] = useState(false)
    const [focused, setFocused] = useState<OrbitCard | null>(null)
    const [slide, setSlide] = useState(0)
    const wrapRef = useRef<HTMLDivElement>(null)
    const stageRef = useRef<HTMLDivElement>(null)
    const floodRef = useRef<HTMLElement>(null)
    const manifestRef = useRef<HTMLDivElement>(null)
    const ringFieldRef = useRef<HTMLDivElement>(null)
    const satRef = useRef<HTMLElement>(null)
    const curveRef = useRef<SVGPathElement>(null)
    const backRef = useRef<HTMLDivElement>(null)
    const frontRef = useRef<HTMLDivElement>(null)
    const worldBackRef = useRef<HTMLDivElement>(null)
    const worldFrontRef = useRef<HTMLDivElement>(null)
    const hintRef = useRef<HTMLDivElement>(null)
    const overlayRef = useRef<HTMLDivElement>(null)
    const openFocusRef = useRef<(index: number) => void>(() => {})
    const closeFocusRef = useRef<() => void>(() => {})

    useEffect(() => setRich(richMotion()), [])

    // Words rise, the strike and underline draw: once, on entry, in both modes.
    useEffect(() => {
        const manifest = manifestRef.current
        if (!manifest) return
        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) return
            manifest.classList.add('is-risen')
            window.setTimeout(() => manifest.classList.add('is-struck'), 700)
            observer.disconnect()
        }, { rootMargin: '0px 0px -30% 0px' })
        observer.observe(manifest)

        return () => observer.disconnect()
    }, [])

    // The flood's top edge lands like jelly.
    useEffect(() => {
        const path = curveRef.current
        if (!path) return
        const state = { v: 0 }
        const render = () => path.setAttribute('d', `M0,160 L0,0 Q500,${state.v.toFixed(1)} 1000,0 L1000,160 Z`)
        render()
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        // Flat at rest; on arrival the edge swells up, then settles with a wobble.
        // GSAP is fetched after hydration so it never weighs on the first load.
        let timeline: { play: () => unknown; reverse: () => unknown; kill: () => unknown } | null = null
        let pending: 'play' | 'reverse' | null = null
        let cancelled = false
        import('gsap').then(({ default: gsap }) => {
            if (cancelled) return
            timeline = gsap.timeline({ paused: true, onUpdate: render })
                .to(state, { v: -140, duration: 0.3, ease: 'power2.out' })
                .to(state, { v: 0, duration: 0.55, ease: 'none' })
                .to(state, { v: 22, duration: 0.17, ease: 'none' })
                .to(state, { v: -12, duration: 0.16, ease: 'none' })
                .to(state, { v: 0, duration: 0.12, ease: 'none' })
            if (pending === 'play') timeline.play()
            else if (pending === 'reverse') timeline.reverse()
        }).catch(() => undefined)
        const observer = new IntersectionObserver(([entry]) => {
            const action = entry.isIntersecting ? 'play' : entry.boundingClientRect.top > 0 ? 'reverse' : null
            if (!action) return
            if (!timeline) pending = action
            else if (action === 'play') timeline.play()
            else timeline.reverse()
        }, { rootMargin: '0px 0px -15% 0px' })
        observer.observe(path)

        return () => {
            cancelled = true
            observer.disconnect()
            timeline?.kill()
        }
    }, [])

    // Infinite spins cost style work every frame; rest them while the flood is out of view.
    useEffect(() => {
        const flood = floodRef.current
        if (!flood) return
        const observer = new IntersectionObserver(([entry]) => {
            flood.classList.toggle('is-offscreen', !entry.isIntersecting)
        })
        observer.observe(flood)

        return () => observer.disconnect()
    }, [])

    // The ring's satellite leans toward the cursor.
    useEffect(() => {
        const sat = satRef.current
        if (!sat || !window.matchMedia('(pointer: fine)').matches) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        const NEAR = 260
        const FORCE = 0.95
        const MAX = 80
        let px = 0
        let py = 0
        let inside = false
        let x = 0
        let y = 0
        let rect: DOMRect | null = null
        let stop: (() => void) | null = null

        const job: FrameJob = {
            read: () => {
                rect = sat.getBoundingClientRect()
            },
            write: () => {
                if (!rect) return
                const onScreen = rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 0
                const restX = rect.left + rect.width / 2 - x
                const restY = rect.top + rect.height / 2 - y
                let tx = 0
                let ty = 0
                if (inside && onScreen) {
                    const dx = px - restX
                    const dy = py - restY
                    const d = Math.hypot(dx, dy)
                    if (d > 0.5 && d < NEAR) {
                        const reach = Math.min(d * FORCE * (1 - d / NEAR), MAX)
                        tx = dx / d * reach
                        ty = dy / d * reach
                    }
                }
                const k = tx || ty ? 0.055 : 0.018
                x += (tx - x) * k
                y += (ty - y) * k
                const strength = Math.min(1, Math.hypot(x, y) / (FORCE * NEAR / 4))
                sat.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`
                sat.style.scale = (1 + strength * 0.12).toFixed(3)
                // Keep tracking only while it can be seen or is still settling back.
                if (!(inside && onScreen) && Math.hypot(x, y) <= 0.3) {
                    stop?.()
                    stop = null
                }
            }
        }
        const wake = () => {
            if (!stop) stop = addLoop(job)
        }
        const onMove = (event: PointerEvent) => {
            px = event.clientX
            py = event.clientY
            inside = true
            wake()
        }
        const onLeave = () => {
            inside = false
        }
        const onScroll = () => {
            if (inside) wake()
        }
        window.addEventListener('pointermove', onMove, { passive: true })
        window.addEventListener('scroll', onScroll, { passive: true })
        document.documentElement.addEventListener('pointerleave', onLeave)

        return () => {
            stop?.()
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('scroll', onScroll)
            document.documentElement.removeEventListener('pointerleave', onLeave)
        }
    }, [])

    // The focus overlay mounts after state changes; animate it in from the card once it exists.
    useEffect(() => {
        if (focused) openFocusRef.current(-1)
    }, [focused])

    // The pinned choreography: flood shrinks to a disc, the orbit opens, then the big bang.
    useEffect(() => {
        if (!rich) return
        const wrap = wrapRef.current
        const stage = stageRef.current
        const flood = floodRef.current
        const manifest = manifestRef.current
        const ringField = ringFieldRef.current
        const back = backRef.current
        const front = frontRef.current
        const worldBack = worldBackRef.current
        const worldFront = worldFrontRef.current
        const hint = hintRef.current
        if (!wrap || !stage || !flood || !manifest || !ringField || !back || !front || !worldBack || !worldFront || !hint) return

        const root = document.documentElement
        const rows = Array.from(manifest.querySelectorAll<HTMLElement>('[data-row]'))
        let rowOffsets = rows.map(() => 0)
        const measureRows = () => {
            const saved = rows.map(row => row.style.transform)
            rows.forEach(row => { row.style.transform = 'none' })
            const rects = rows.map(row => row.getBoundingClientRect())
            const top = Math.min(...rects.map(r => r.top))
            const bottom = Math.max(...rects.map(r => r.bottom))
            const center = (top + bottom) / 2
            rowOffsets = rects.map(r => (r.top + r.bottom) / 2 - center)
            rows.forEach((row, i) => { row.style.transform = saved[i] })
        }

        // Cards on a golden-angle sphere, one copy behind the disc and one in front.
        const golden = Math.PI * (3 - Math.sqrt(5))
        const count = ORBIT_CARDS.length
        let sphereTarget = 600
        let cardBase = 170
        const sizeCards = () => {
            sphereTarget = Math.max(380, Math.min(780, window.innerWidth * 0.42))
            cardBase = Math.max(110, Math.min(200, window.innerWidth * 0.118))
            ;[back, front].forEach(layer => {
                const stageEl = layer.firstElementChild as HTMLElement | null
                if (stageEl) stageEl.style.perspective = `${sphereTarget * 3}px`
            })
        }

        const makeCard = (data: OrbitCard, index: number, layer: HTMLDivElement) => {
            const el = document.createElement('div')
            el.className = 'orbit-card'
            el.dataset.index = String(index)
            const img = document.createElement('img')
            img.src = data.src
            img.alt = ''
            img.decoding = 'async'
            img.draggable = false
            el.appendChild(img)
            layer.appendChild(el)

            return el
        }
        let cards: CardState[] = []
        const build = (): CardState[] => ORBIT_CARDS.map((data, i) => {
            const y = 1 - (i / (count - 1)) * 2
            const radius = Math.sqrt(Math.max(0, 1 - y * y))
            const theta = golden * i

            return {
                data,
                dir: [Math.cos(theta) * radius, y, Math.sin(theta) * radius],
                back: makeCard(data, i, worldBack),
                front: makeCard(data, i, worldFront),
                w: 0,
                h: 0,
                z: 0,
                hover: 0,
                lastFilter: '',
                inFront: null,
                cx: 0,
                cy: 0
            }
        })
        const sizeCardEls = () => {
            cards.forEach(card => {
                const aspect = card.data.width / card.data.height
                card.w = cardBase * Math.sqrt(aspect)
                card.h = cardBase / Math.sqrt(aspect)
                ;[card.back, card.front].forEach(el => {
                    el.style.width = `${card.w}px`
                    el.style.height = `${card.h}px`
                    el.style.marginLeft = `${-card.w / 2}px`
                    el.style.marginTop = `${-card.h / 2}px`
                })
            })
        }
        sizeCards()
        // Card elements and their images are created only as the section approaches.
        const builder = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting || cards.length) return
            cards = build()
            sizeCardEls()
            builder.disconnect()
        }, { rootMargin: '150% 0px' })
        builder.observe(wrap)

        let raw = 0
        let active = false
        let interactive = false
        let rotY = 0
        let rotX = 12
        let velY = 0
        let velX = 0
        let dragging = false
        let lastX = 0
        let lastY = 0
        let moved = 0
        let pointerX = -1
        let pointerY = -1
        let inside = false
        let spinDamp = 1
        let focusAmt = 0
        let focusIndex: number | null = null
        let pendingFrom: DOMRect | null = null
        let stopOrbit: (() => void) | null = null
        let lastFrame = 0
        let hovered: number | null = null
        let rect = wrap.getBoundingClientRect()
        let accentRgb: [number, number, number] = [255, 91, 46]
        let wasFar = false

        const collapseAmount = () => clamp01((raw - COLLAPSE_START) / (1 - COLLAPSE_START))

        const cardAt = (x: number, y: number) => {
            const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('.orbit-card')

            return el && front.contains(el) ? Number(el.dataset.index) : null
        }

        const setCursor = (value: string) => {
            if (document.body.dataset.cursor !== value) document.body.dataset.cursor = value
        }

        // FLIP: the overlay starts on the card's rect and grows to the focus box.
        const placeOverlay = () => {
            const overlay = overlayRef.current
            if (!overlay || focusIndex === null || !pendingFrom) return
            const card = cards[focusIndex]
            const vw = window.innerWidth
            const vh = window.innerHeight
            const aspect = card.data.width / card.data.height
            let h = vh * FOCUS_FILL
            let w = h * aspect
            if (w > vw * 0.8) {
                w = vw * 0.8
                h = w / aspect
            }
            const left = (vw - w) / 2
            const top = (vh - h) / 2 - vh * 0.06
            overlay.style.left = `${left}px`
            overlay.style.top = `${top}px`
            overlay.style.width = `${w}px`
            overlay.style.height = `${h}px`
            const from = pendingFrom
            pendingFrom = null
            overlay.animate([
                { transform: `translate(${from.left - left}px, ${from.top - top}px) scale(${from.width / w}, ${from.height / h})` },
                { transform: 'none' }
            ], { duration: 750, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' })
        }

        const openFocus = (index: number) => {
            if (index < 0) {
                placeOverlay()

                return
            }
            const card = cards[index]
            pendingFrom = (card.inFront ? card.front : card.back).getBoundingClientRect()
            focusIndex = index
            setFocused(card.data)
        }
        openFocusRef.current = openFocus

        const closeFocus = () => {
            if (focusIndex === null) return
            const overlay = overlayRef.current
            const card = cards[focusIndex]
            focusIndex = null
            if (!overlay) {
                setFocused(null)

                return
            }
            const target = (card.inFront ? card.front : card.back).getBoundingClientRect()
            const box = overlay.getBoundingClientRect()
            const anim = overlay.animate([
                { transform: 'none', opacity: 1 },
                {
                    transform: `translate(${target.left - box.left}px, ${target.top - box.top}px) scale(${card.w / box.width}, ${card.h / box.height})`,
                    opacity: 0.6
                }
            ], { duration: 520, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' })
            anim.onfinish = () => setFocused(null)
        }
        closeFocusRef.current = closeFocus

        const writeFlood = () => {
            const vw = window.innerWidth
            const vh = window.innerHeight
            const progress = clamp01((raw - MASK_START) / (MASK_DONE - MASK_START))
            const maxR = Math.hypot(vw, vh) / 2 * 1.05
            let r = maxR + (MASK_MIN_R - maxR) * progress
            const col = collapseAmount()
            let color = ''

            if (col > 0) {
                if (col < FLASH_PEAK) {
                    const up = clamp01((col - FLASH_START) / (FLASH_PEAK - FLASH_START))
                    r = MASK_MIN_R * (1 + FLASH_GROW * Math.sin(up * Math.PI / 2))
                } else if (col < EXPLODE_START) {
                    const down = clamp01((col - FLASH_PEAK) / (EXPLODE_START - FLASH_PEAK))
                    r = MASK_MIN_R * (1 + FLASH_GROW) * Math.pow(1 - down, 2.6)
                } else {
                    const out = clamp01((col - EXPLODE_START) / (1 - EXPLODE_START))
                    r = maxR * EXPLODE_OVERSHOOT * (1 - Math.pow(1 - out, 3))
                }
                const accent = accentRgb
                const white = clamp01((col - FLASH_START) / (FLASH_PEAK - FLASH_START))
                let rgb = accent.map(c => c + (255 - c) * white)
                if (col > FLASH_PEAK) {
                    const toBone = clamp01((col - FLASH_PEAK) / (EXPLODE_START - FLASH_PEAK))
                    rgb = rgb.map((c, i) => c + (BONE[i] - c) * toBone)
                }
                color = `rgb(${rgb.map(Math.round).join(',')})`
            }
            flood.style.backgroundColor = color
            flood.classList.toggle('is-collapsing', col > 0)
            flood.style.clipPath = `circle(${Math.max(0, r).toFixed(1)}px at 50% 50%)`

            // The manifesto flies at the viewer as the disc closes.
            const grow = clamp01((progress - TEXT_GROW_START) / (1 - TEXT_GROW_START))
            const eased = grow * grow * grow
            const scale = 1 + eased * TEXT_GROW_MAX
            const fade = 1 - clamp01((progress - 0.94) / 0.06)
            const center = (rows.length - 1) / 2
            rows.forEach((row, i) => {
                const d = center ? (i - center) / center : 0
                row.style.transform = `translateY(${(rowOffsets[i] * (scale - 1)).toFixed(1)}px) scale(${scale.toFixed(3)}) rotateX(${(d * TEXT_TILT * eased).toFixed(2)}deg)`
                row.style.opacity = fade.toFixed(3)
                row.style.filter = eased > 0.005 ? `blur(${(eased * TEXT_BLUR).toFixed(2)}px)` : ''
            })

            // Ring rises into place, then melts away ahead of its satellite.
            const ringT = clamp01((vh - rect.top) / (vh + MASK_START * (wrap.offsetHeight - vh)))
            const ringE = easeOutCubic(ringT)
            const grown = 0.62 + 0.38 * ringE
            ringField.style.setProperty('--ring-y', `${((1 - ringE) * -0.24 * vh).toFixed(1)}px`)
            ringField.style.setProperty('--ring-s', (Math.pow(clamp01(1 - progress / 0.5), 1.3) * grown).toFixed(4))
            ringField.style.setProperty('--sat-s', (Math.pow(clamp01(1 - Math.max(0, progress - 0.1) / 0.5), 1.3) * grown).toFixed(4))

            // Hint on the disc; the orbit is live between the closed disc and the collapse.
            const hintIn = clamp01((progress - 0.9) / 0.1)
            const hintOut = 1 - clamp01((col - 0.18) / 0.12)
            hint.style.opacity = (hintIn * hintOut).toFixed(3)
            interactive = hintIn * hintOut > 0.5
            front.style.pointerEvents = interactive ? 'auto' : 'none'
            if (!interactive && focusIndex !== null) closeFocus()

            // After the explosion the stage hands off to the bone constellation beneath.
            stage.style.opacity = (1 - clamp01((col - 0.95) / 0.05)).toFixed(3)
            stage.style.visibility = col >= 1 ? 'hidden' : ''
            const headerCovered = r > Math.hypot(vw / 2, vh / 2 - 40)
            const tone = col > EXPLODE_START && headerCovered ? 'bone' : headerCovered && col === 0 ? 'ember' : 'ink'
            if (stage.dataset.tone !== tone) stage.dataset.tone = tone
            flood.classList.toggle('tone-ember', col === 0)

            const shouldRun = rect.top < 80 && rect.bottom > -200 && col < 1
            if (shouldRun !== active) {
                active = shouldRun
                back.style.visibility = active ? 'visible' : 'hidden'
                front.style.visibility = active ? 'visible' : 'hidden'
                if (active && !stopOrbit) {
                    lastFrame = 0
                    stopOrbit = addLoop(orbitJob)
                } else if (!active && stopOrbit) {
                    stopOrbit()
                    stopOrbit = null
                }
            }
        }

        const orbitRead = () => {
            hovered = inside && interactive && !dragging && focusIndex === null ? cardAt(pointerX, pointerY) : null
            cards.forEach((card, i) => {
                if (card.hover <= 0.01 && i !== hovered) return
                const r = card.front.getBoundingClientRect()
                card.cx = r.left + r.width / 2
                card.cy = r.top + r.height / 2
            })
        }

        const tick = () => {
            const now = performance.now()
            const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 1 / 60
            lastFrame = now

            const entry = easeOutCubic(clamp01(raw / ENTRY_DONE))
            const col = collapseAmount()
            let sphereFactor = 1
            let cardFactor = 1
            if (col > 0) {
                if (col < BUMP_END) {
                    sphereFactor = 1 + BUMP * Math.sin((col / BUMP_END) * Math.PI / 2)
                } else {
                    const u = clamp01((col - BUMP_END) / (SUCK_END - BUMP_END))
                    sphereFactor = (1 + BUMP) * Math.pow(1 - u, 3)
                }
                cardFactor = Math.pow(1 - clamp01((col - CARD_SHRINK_START) / (SUCK_END - CARD_SHRINK_START)), 1.8)
            }
            const radius = sphereTarget * (ENTRY_SCALE - (ENTRY_SCALE - 1) * entry) * Math.max(0, sphereFactor)

            focusAmt = clamp01(focusAmt + (focusIndex !== null ? 1 : -1) * dt * 1.7)
            const spinTarget = focusIndex !== null || focusAmt > 0.02 ? 0 : 1
            spinDamp += (spinTarget - spinDamp) * Math.min(1, dt * 2.4)

            if (!dragging) {
                if (Math.abs(velY) > 0.02 || Math.abs(velX) > 0.02) {
                    rotY += velY * spinDamp
                    rotX += velX * spinDamp
                    const f = Math.pow(FRICTION, dt * 60)
                    velY *= f
                    velX *= f
                } else {
                    velY = 0
                    velX = 0
                    rotY += dt * AUTO_SPEED * spinDamp
                }
            }
            rotX = Math.max(-40, Math.min(50, rotX))

            const world = `rotateX(${rotX.toFixed(3)}deg) rotateY(${rotY.toFixed(3)}deg)`
            worldBack.style.transform = world
            worldFront.style.transform = world
            const ry = rotY * Math.PI / 180
            const rx = rotX * Math.PI / 180
            const cosY = Math.cos(ry)
            const sinY = Math.sin(ry)
            const cosX = Math.cos(rx)
            const sinX = Math.sin(rx)
            const billboard = `rotateY(${(-rotY).toFixed(3)}deg) rotateX(${(-rotX).toFixed(3)}deg)`
            const dim = 1 - (1 - FOCUS_DIM) * easeInOutCubic(focusAmt)

            cards.forEach((card, i) => {
                const [dx, dy, dz] = card.dir
                const px = dx * radius
                const py = dy * radius
                const pz = dz * radius
                const z1 = -px * sinY + pz * cosY
                const z2 = py * sinX + z1 * cosX
                card.z = z2
                const depth = clamp01((z2 / Math.max(1, radius) + 1) / 2)
                const inFront = z2 > 0
                if (inFront !== card.inFront) {
                    card.inFront = inFront
                    card.front.style.visibility = inFront ? 'visible' : 'hidden'
                    card.back.style.visibility = inFront ? 'hidden' : 'visible'
                    card.lastFilter = ''
                }
                const el = inFront ? card.front : card.back
                card.hover += ((hovered === i ? 1 : 0) - card.hover) * Math.min(1, dt * 9)

                let magX = 0
                let magY = 0
                if (card.hover > 0.01) {
                    const cx = card.cx
                    const cy = card.cy
                    const dist = Math.hypot(pointerX - cx, pointerY - cy) || 1
                    magX = (pointerX - cx) / dist * MAGNET_PX * card.hover
                    magY = (pointerY - cy) / dist * MAGNET_PX * card.hover
                }
                const scale = (1 + HOVER_SCALE * card.hover) * cardFactor * (focusIndex === i ? 0.001 : 1)
                const transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, ${pz.toFixed(1)}px) ${billboard} translate(${magX.toFixed(1)}px, ${magY.toFixed(1)}px) scale(${scale.toFixed(3)})`
                el.style.transform = transform

                const brightness = (0.26 + 0.74 * depth) * dim
                const filter = `brightness(${brightness.toFixed(2)}) blur(${((1 - depth) * 8).toFixed(1)}px)`
                if (filter !== card.lastFilter) {
                    card.lastFilter = filter
                    el.style.filter = filter
                }
            })

            if (inside && interactive) {
                const drag = dragging ? (velY < -0.05 ? 'orbit-left' : velY > 0.05 ? 'orbit-right' : 'orbit') : 'orbit'
                setCursor(hovered !== null ? 'orbit-card' : drag)
            }

        }
        const orbitJob: FrameJob = { read: orbitRead, write: tick }

        const floodJob: FrameJob = {
            read: () => {
                rect = wrap.getBoundingClientRect()
                raw = pinProgress(wrap)
                if (raw > COLLAPSE_START) accentRgb = hexToRgb(getComputedStyle(root).getPropertyValue('--ember'))
            },
            write: () => {
                // Far from the viewport nothing here is visible: settle once, then skip.
                const far = rect.bottom < -window.innerHeight || rect.top > window.innerHeight * 2
                if (far && wasFar) return
                wasFar = far
                writeFlood()
            }
        }
        const updateFlood = () => requestFrame(floodJob)

        const onDown = (event: PointerEvent) => {
            if (!interactive || event.button !== 0) return
            dragging = true
            moved = 0
            lastX = event.clientX
            lastY = event.clientY
            velX = 0
            velY = 0
            front.setPointerCapture(event.pointerId)
        }
        const onMove = (event: PointerEvent) => {
            pointerX = event.clientX
            pointerY = event.clientY
            if (!dragging) return
            const dx = event.clientX - lastX
            const dy = event.clientY - lastY
            lastX = event.clientX
            lastY = event.clientY
            moved += Math.abs(dx) + Math.abs(dy)
            if (focusIndex !== null) return
            rotY += dx * DRAG_GAIN
            rotX -= dy * DRAG_GAIN
            velY = dx * DRAG_GAIN
            velX = -dy * DRAG_GAIN
        }
        const onUp = (event: PointerEvent) => {
            if (!dragging) return
            dragging = false
            if (moved > CLICK_SLOP) return
            if (focusIndex !== null) {
                closeFocus()

                return
            }
            const index = cardAt(event.clientX, event.clientY)
            if (index !== null) openFocus(index)
        }
        const onEnter = () => { inside = true }
        const onLeave = () => {
            inside = false
            dragging = false
            setCursor('')
        }
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeFocus()
        }
        const onResize = () => {
            wasFar = false
            sizeCards()
            sizeCardEls()
            measureRows()
            updateFlood()
        }

        measureRows()
        updateFlood()
        window.addEventListener('scroll', updateFlood, { passive: true })
        window.addEventListener('resize', onResize)
        window.addEventListener('keydown', onKey)
        front.addEventListener('pointerdown', onDown)
        front.addEventListener('pointermove', onMove)
        front.addEventListener('pointerup', onUp)
        front.addEventListener('pointercancel', onLeave)
        front.addEventListener('pointerenter', onEnter)
        front.addEventListener('pointerleave', onLeave)

        return () => {
            stopOrbit?.()
            builder.disconnect()
            window.removeEventListener('scroll', updateFlood)
            window.removeEventListener('resize', onResize)
            window.removeEventListener('keydown', onKey)
            front.removeEventListener('pointerdown', onDown)
            front.removeEventListener('pointermove', onMove)
            front.removeEventListener('pointerup', onUp)
            front.removeEventListener('pointercancel', onLeave)
            front.removeEventListener('pointerenter', onEnter)
            front.removeEventListener('pointerleave', onLeave)
            worldBack.replaceChildren()
            worldFront.replaceChildren()
            setCursor('')
        }
    }, [rich])

    // A focused frame plays the rest of its project's screens, like a short film strip.
    const slides = useMemo(() => focused
        ? [focused, ...ORBIT_CARDS.filter(card => card.ref === focused.ref && card.id !== focused.id)]
        : [], [focused])

    useEffect(() => {
        setSlide(0)
        if (slides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        const timer = window.setInterval(() => setSlide(index => (index + 1) % slides.length), SLIDE_MS)

        return () => window.clearInterval(timer)
    }, [slides])

    const current = slides[slide] ?? focused
    const caption = current ? captionFor(current) : null

    return (
        <>
            <div ref={wrapRef} id='manifest' className={cn('seq relative', rich && 'is-rich')}>
                <svg aria-hidden viewBox='0 0 1000 160' preserveAspectRatio='none' className='seq-curve relative z-[3] -mt-px block h-[12vh] w-full overflow-visible'>
                    <path ref={curveRef} className='fill-[var(--ember)]' />
                </svg>

                <div ref={stageRef} data-tone='ember' className='seq-stage relative'>
                    <div ref={backRef} aria-hidden className='orbit-layer pointer-events-none z-10'>
                        <div className='orbit-stage'>
                            <div ref={worldBackRef} className='orbit-world' />
                        </div>
                    </div>

                    <section ref={floodRef} aria-label='Manifesto' className='seq-flood tone-ember relative z-20'>
                        <div ref={ringFieldRef} aria-hidden className='mf-ring-field'>
                            <div className='mf-ring' />
                            <div className='mf-ring-spin'>
                                <div className='mf-ring-track'>
                                    <i ref={satRef} className='mf-sat' />
                                </div>
                            </div>
                        </div>
                        <div ref={manifestRef} className='manifesto display relative text-display font-extrabold uppercase tracking-[-0.03em]'>
                            <Manifesto />
                        </div>
                    </section>

                    <div ref={frontRef} aria-hidden className='orbit-layer z-30'>
                        <div className='orbit-stage'>
                            <div ref={worldFrontRef} className='orbit-world' />
                        </div>
                    </div>

                    <div ref={hintRef} aria-hidden className='orbit-hint pointer-events-none absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 text-center text-small font-bold uppercase leading-[0.95] text-ink opacity-0'>
                        <span className='block'>Drag</span>
                        <span className='block'>to</span>
                        <span className='block'>orbit</span>
                    </div>
                </div>
            </div>

            {focused && caption && current && (
                <>
                    <div ref={overlayRef} className='orbit-focus fixed z-50 overflow-hidden rounded-[14px] bg-ink-2 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.75)]'>
                        {slides.map((card, index) => (
                            <img
                                key={card.id}
                                src={card.src}
                                alt={index === slide ? card.label : ''}
                                className={cn('orbit-slide absolute inset-0 size-full object-contain', index === slide && 'is-on')}
                            />
                        ))}
                    </div>
                    <div
                        role='dialog'
                        aria-label={current?.label}
                        className='orbit-caption fixed inset-x-0 bottom-[5vh] z-50 mx-auto flex w-[min(92vw,44rem)] flex-wrap items-end justify-between gap-4 text-bone'
                    >
                        <div className='min-w-0'>
                            <p className='text-title font-semibold tracking-[-0.02em]'>{caption.title}</p>
                            <p className='text-small text-muted-ink'>{caption.detail}</p>
                            {slides.length > 1 && (
                                <div className='mt-3 flex items-center gap-3'>
                                    <span className='orbit-progress' key={`${current?.id}-${slide}`} />
                                    <span className='font-mono text-data tabular text-muted-ink'>{slide + 1} / {slides.length}</span>
                                    <button
                                        type='button'
                                        onClick={() => setSlide(index => (index + 1) % slides.length)}
                                        aria-label='Next screen'
                                        className='grid size-8 place-items-center rounded-full border border-bone/35 transition-colors hover:border-bone hover:bg-bone hover:text-ink'
                                    >
                                        <ChevronRight className='size-4' aria-hidden />
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className='flex flex-wrap items-center gap-2'>
                            {caption.href && (
                                <a href={caption.href} target='_blank' rel='noreferrer' className='inline-flex items-center gap-1.5 rounded-full bg-ember px-4 py-2.5 text-small font-semibold text-ink transition-colors hover:bg-ember-hot'>
                                    {caption.hrefLabel}
                                    <ArrowUpRight className='size-4' aria-hidden />
                                </a>
                            )}
                            {caption.source && (
                                <a href={caption.source} target='_blank' rel='noreferrer' className='inline-flex items-center gap-1.5 rounded-full border border-bone/35 px-4 py-2.5 text-small font-semibold transition-colors hover:border-bone hover:bg-bone hover:text-ink'>
                                    Source
                                    <ArrowUpRight className='size-4' aria-hidden />
                                </a>
                            )}
                            <a href='#work' onClick={() => closeFocusRef.current()} className='inline-flex items-center gap-1.5 rounded-full border border-bone/35 px-4 py-2.5 text-small font-semibold transition-colors hover:border-bone hover:bg-bone hover:text-ink'>
                                Case notes
                                <ArrowDown className='size-4' aria-hidden />
                            </a>
                            <button
                                type='button'
                                autoFocus
                                onClick={() => closeFocusRef.current()}
                                aria-label='Close preview'
                                className='grid size-10 place-items-center rounded-full border border-bone/35 transition-colors hover:border-bone hover:bg-bone hover:text-ink'
                            >
                                <X className='size-4' aria-hidden />
                            </button>
                        </div>
                    </div>
                </>
            )}

            {!rich && <StaticStrip />}
        </>
    )
}
