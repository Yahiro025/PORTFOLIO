import type { FC, ReactNode } from 'react'
import type { GitHubSnapshot, PortfolioItem } from '@/types'

import gsap from 'gsap'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import {
    ArrowLeft,
    ArrowUpRight,
    X
} from 'lucide-react'

import { cn } from '@/lib/utils'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    DESKTOP_LAYOUT,
    MOBILE_LAYOUT,
    folioItems
} from '@/constants/folio'
import { FolioPreview } from '@/components/landing/folio-preview'
import {
    getGroup,
    getGroupPosition,
    getMotionPolicy,
    getPreviewPresentation,
    getReelOffsets,
    reduceInteraction,
    TITLE_REGISTER
} from '@/lib/portfolio'

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

const LOOP_COPIES = 3
const N = folioItems.length
const RENDERED = LOOP_COPIES * N
const POS_MIN = N
const POS_MAX = 2 * N

const SMOOTHING = 0.14
const WHEEL_CAP = 200
const SNAP_IDLE_MS = 90
const NONACTIVE_OPACITY = 0.7
const HOVER_LERP = 0.18
const HOVER_WGHT_BONUS = 80
const CURSOR_SIZE = 76
const CURSOR_HALF = CURSOR_SIZE / 2
const CURSOR_LERP = 0.22
const TITLE_MASK_PX = 20

const MASK_GRADIENT = `linear-gradient(to bottom, transparent 0, #000 ${TITLE_MASK_PX}px, #000 calc(100% - ${TITLE_MASK_PX}px), transparent 100%)`

const RENDERED_ITEMS: PortfolioItem[] = Array.from({ length: RENDERED }, (_, i) => folioItems[i % N])

const ABOUT_LOGICAL_IDX = folioItems.findIndex(item => item.id === 'about')
const LANDING_POS = POS_MIN + ABOUT_LOGICAL_IDX

type Phase = 'idle' | 'opening' | 'detail' | 'closing'

interface FolioReelProps {
    github: GitHubSnapshot | null
}

export const FolioReel: FC<FolioReelProps> = ({ github }): ReactNode => {
    const [isMobile, setIsMobile] = useState(false)
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
    const [activeIdx, setActiveIdx] = useState(LANDING_POS)
    const [settledRenderedIdx, setSettledRenderedIdx] = useState<number | null>(null)
    const [interactingRenderedIdx, setInteractingRenderedIdx] = useState<number | null>(null)
    const [phase, setPhase] = useState<Phase>('idle')
    const [detailIdx, setDetailIdx] = useState<number | null>(null)

    const sectionRef = useRef<HTMLElement>(null)
    const titleRevealRef = useRef<HTMLDivElement>(null)
    const titleStripRef = useRef<HTMLDivElement>(null)
    const imageRevealRef = useRef<HTMLDivElement>(null)
    const imageStripRef = useRef<HTMLDivElement>(null)
    const clickMeRef = useRef<HTMLDivElement>(null)
    const counterRef = useRef<HTMLSpanElement>(null)

    const detailRef = useRef<HTMLDivElement>(null)
    const detailImageRef = useRef<HTMLDivElement>(null)
    const detailTitleRef = useRef<HTMLHeadingElement>(null)

    const titleRefs = useRef<(HTMLDivElement | null)[]>([])
    const slotRefs = useRef<(HTMLDivElement | null)[]>([])
    const titleHoverProgressRef = useRef<number[]>([])

    const layoutRef = useRef(DESKTOP_LAYOUT)
    const isMobileRef = useRef(false)

    const targetPosRef = useRef(LANDING_POS)
    const posRef = useRef(LANDING_POS)
    const activeIdxRef = useRef(LANDING_POS)

    const detailOpenRef = useRef(false)
    const interactingRef = useRef(false)
    const navigatingRef = useRef(false)
    const entranceDoneRef = useRef(false)

    const lastWheelTimeRef = useRef(0)
    const navProxyRef = useRef({ value: LANDING_POS })
    const hoverRef = useRef({ x: 0, y: 0 })
    const cursorRenderRef = useRef({ x: 0, y: 0 })
    const isHoveringActiveRef = useRef(false)
    const onSectionRef = useRef(false)
    const hoveredTitleIdxRef = useRef<number | null>(null)

    const sourceImageRectRef = useRef<DOMRect | null>(null)
    const sourceTitleRectRef = useRef<DOMRect | null>(null)
    const hiddenIdxRef = useRef<number | null>(null)
    const flipAppliedRef = useRef(false)

    const prevBodyOverflowRef = useRef('')
    const entranceTimelineRef = useRef<ReturnType<typeof gsap.timeline> | null>(null)
    const handleCloseRef = useRef<() => void>(() => {})

    const layout = isMobile ? MOBILE_LAYOUT : DESKTOP_LAYOUT
    const detailItem = detailIdx !== null ? folioItems[detailIdx] : null
    const motionPolicy = getMotionPolicy(prefersReducedMotion)
    const activeGroupPosition = getGroupPosition(folioItems, activeIdx % N)

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)')
        const update = () => setIsMobile(mq.matches)

        update()
        mq.addEventListener('change', update)

        return () => mq.removeEventListener('change', update)
    }, [])

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
        const update = () => setPrefersReducedMotion(mq.matches)

        update()
        mq.addEventListener('change', update)

        return () => mq.removeEventListener('change', update)
    }, [])

    useEffect(() => {
        layoutRef.current = isMobile ? MOBILE_LAYOUT : DESKTOP_LAYOUT
        isMobileRef.current = isMobile
    }, [isMobile])

    useEffect(() => {
        detailOpenRef.current = phase !== 'idle'
    }, [phase])

    useEffect(() => {
        interactingRef.current = interactingRenderedIdx !== null
    }, [interactingRenderedIdx])

    useEffect(() => {
        const counter = counterRef.current

        if (!counter || motionPolicy.sharedElementDuration === 0) return

        gsap.fromTo(counter, { y: 6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power3.out' })
    }, [activeGroupPosition.group, motionPolicy.sharedElementDuration])

    // Settled index tracker: 300ms after active index changes
    useEffect(() => {
        setSettledRenderedIdx(null)
        const timeout = window.setTimeout(() => {
            setSettledRenderedIdx(activeIdx)
        }, 300)

        return () => window.clearTimeout(timeout)
    }, [activeIdx])

    // Entrance timeline — fade + un-blur the strips, late chrome reveal, and an
    // auto-scroll that flashes through every project before landing on a row.
    useEffect(() => {
        if (!motionPolicy.blurEntrance && !motionPolicy.autoPass) {
            entranceDoneRef.current = true
            gsap.set([titleRevealRef.current, imageRevealRef.current], {
                opacity: 1,
                y: 0,
                scale: 1,
                filter: 'none'
            })

            const chrome = sectionRef.current?.querySelectorAll('[data-chrome]')
            if (chrome && chrome.length > 0) gsap.set(chrome, { opacity: 1, y: 0 })
            return
        }

        prevBodyOverflowRef.current = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                onComplete: () => {
                    entranceDoneRef.current = true
                    document.body.style.overflow = prevBodyOverflowRef.current
                    entranceTimelineRef.current = null
                }
            })

            entranceTimelineRef.current = tl

            tl.fromTo(
                [titleRevealRef.current, imageRevealRef.current],
                { opacity: 0, y: 28, scale: 1.04, filter: 'blur(14px)' },
                { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.9, ease: 'power4.out', stagger: 0.06 },
                0
            )

            const chrome = sectionRef.current?.querySelectorAll('[data-chrome]')

            if (chrome && chrome.length > 0) {
                tl.fromTo(
                    chrome,
                    { opacity: 0, y: 8 },
                    { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.05 },
                    0.5
                )
            }

            const entranceProxy = { value: LANDING_POS }
            const cycleDistance = N * (1 + Math.floor(Math.random() * 2))

            tl.to(
                entranceProxy,
                {
                    value: LANDING_POS + cycleDistance,
                    duration: 1.7,
                    ease: 'power4.out',
                    onUpdate: () => {
                        let v = entranceProxy.value

                        while (v < POS_MIN) v += N
                        while (v >= POS_MAX) v -= N

                        posRef.current = v
                        targetPosRef.current = v
                    }
                },
                0
            )
        }, sectionRef)

        return () => {
            ctx.revert()
            document.body.style.overflow = prevBodyOverflowRef.current
            entranceTimelineRef.current = null
        }
    }, [motionPolicy.autoPass, motionPolicy.blurEntrance])

    // Main render loop + input. One rAF ticker drives every transform.
    useEffect(() => {
        const section = sectionRef.current

        if (!section) return

        let raf = 0
        let touchY = 0

        const skipEntranceIfRunning = () => {
            if (entranceDoneRef.current) return

            entranceTimelineRef.current?.kill()
            entranceTimelineRef.current = null

            gsap.set([titleRevealRef.current, imageRevealRef.current], {
                opacity: 1,
                y: 0,
                scale: 1,
                filter: 'blur(0px)'
            })

            const chrome = sectionRef.current?.querySelectorAll('[data-chrome]')

            if (chrome) gsap.set(chrome, { opacity: 1, y: 0 })

            entranceDoneRef.current = true
            document.body.style.overflow = prevBodyOverflowRef.current
        }

        const tick = () => {
            if (
                entranceDoneRef.current &&
                !navigatingRef.current &&
                !detailOpenRef.current &&
                performance.now() - lastWheelTimeRef.current > SNAP_IDLE_MS
            ) {
                const t = targetPosRef.current
                const snapped = Math.round(t)

                if (snapped !== t) targetPosRef.current = snapped
            }

            const target = targetPosRef.current
            const cur = posRef.current
            let next = Math.abs(target - cur) < 0.0005 ? target : cur + (target - cur) * SMOOTHING

            while (next < POS_MIN) {
                next += N
                targetPosRef.current += N
            }

            while (next >= POS_MAX) {
                next -= N
                targetPosRef.current -= N
            }

            posRef.current = next

            const L = layoutRef.current
            const vh = window.innerHeight / 100

            const offsets = getReelOffsets(next, L, RENDERED)

            const titleStrip = titleStripRef.current
            if (titleStrip) {
                titleStrip.style.transform = `translate3d(0, ${(offsets.titleVh * vh).toFixed(2)}px, 0)`
            }

            const imageStrip = imageStripRef.current
            if (imageStrip) {
                imageStrip.style.transform = `translate3d(0, ${(offsets.previewVh * vh + offsets.previewPx).toFixed(2)}px, 0)`
            }

            for (let i = 0; i < RENDERED; i++) {
                const el = slotRefs.current[i]

                if (!el) continue

                const dist = Math.abs(i - next)
                let opacity: number
                let scale: number

                if (dist < 1) {
                    const t = 1 - dist
                    opacity = 0.78 + 0.22 * t
                    scale = 0.93 + 0.07 * t
                } else if (dist < 2) {
                    const t = 1 - (dist - 1)
                    opacity = 0.18 + 0.6 * t
                    scale = 0.84 + 0.09 * t
                } else {
                    opacity = 0.18
                    scale = 0.84
                }

                el.style.opacity = opacity.toFixed(3)
                el.style.transform = `scale(${scale.toFixed(4)})`
            }

            const hoveredIdx = hoveredTitleIdxRef.current

            for (let i = 0; i < RENDERED; i++) {
                const el = titleRefs.current[i]

                if (!el) continue

                const dist = Math.abs(i - next)
                const reg = TITLE_REGISTER[getGroup(RENDERED_ITEMS[i])]
                const tColor = Math.min(Math.max(0, 1 - dist * 2), reg.scale === 1 ? 1 : 0.6)
                const tType = Math.max(0, 1 - dist * 0.55)

                const targetHover = hoveredIdx !== null && i % N === hoveredIdx % N ? 1 : 0
                const curHover = titleHoverProgressRef.current[i] ?? 0
                const nextHover = curHover + (targetHover - curHover) * HOVER_LERP

                titleHoverProgressRef.current[i] = nextHover

                el.style.color = `color-mix(in srgb, var(--foreground) ${(tColor * 100).toFixed(1)}%, var(--muted-foreground))`
                el.style.opacity = (NONACTIVE_OPACITY + (1 - NONACTIVE_OPACITY) * tColor).toFixed(3)

                const wght = reg.wghtMin + (reg.wghtMax - reg.wghtMin) * tType + nextHover * HOVER_WGHT_BONUS

                el.style.fontVariationSettings = `"wght" ${wght.toFixed(0)}`
                el.style.fontWeight = String(Math.round(wght))

                const h3 = el.querySelector('h3') as HTMLElement | null

                if (h3) {
                    const fontVh = (L.titleFontVhMin + (L.titleFontVhMax - L.titleFontVhMin) * tType) * reg.scale
                    h3.style.fontSize = `${fontVh.toFixed(2)}dvh`
                }
            }

            const rounded = Math.max(0, Math.min(RENDERED - 1, Math.round(next)))

            if (rounded !== activeIdxRef.current) {
                activeIdxRef.current = rounded
                setActiveIdx(rounded)
            }

            const ring = clickMeRef.current

            if (ring) {
                const visible =
                    !isMobileRef.current &&
                    isHoveringActiveRef.current &&
                    onSectionRef.current &&
                    !detailOpenRef.current &&
                    !interactingRef.current
                const lerp = visible ? CURSOR_LERP : 1

                cursorRenderRef.current.x += (hoverRef.current.x - cursorRenderRef.current.x) * lerp
                cursorRenderRef.current.y += (hoverRef.current.y - cursorRenderRef.current.y) * lerp

                ring.style.transform = `translate3d(${(cursorRenderRef.current.x - CURSOR_HALF).toFixed(2)}px, ${(cursorRenderRef.current.y - CURSOR_HALF).toFixed(2)}px, 0)`
                ring.style.opacity = visible ? '1' : '0'
            }

            raf = requestAnimationFrame(tick)
        }

        raf = requestAnimationFrame(tick)

        const onWheel = (e: WheelEvent) => {
            if (!onSectionRef.current) return
            if (detailOpenRef.current) return
            if (interactingRef.current) return

            const target = e.target as HTMLElement | null

            if (target?.closest('[data-no-wheel]')) return

            e.preventDefault()

            if (!entranceDoneRef.current) skipEntranceIfRunning()

            if (navigatingRef.current) {
                gsap.killTweensOf(navProxyRef.current)
                navigatingRef.current = false
            }

            lastWheelTimeRef.current = performance.now()

            const delta = Math.max(-WHEEL_CAP, Math.min(WHEEL_CAP, e.deltaY))

            targetPosRef.current += delta / layoutRef.current.pixelsPerItem
        }

        const onTouchStart = (e: TouchEvent) => {
            if (detailOpenRef.current) return
            if (interactingRef.current) return

            const target = e.target as HTMLElement | null

            if (target?.closest('[data-no-wheel]')) return
            if (!entranceDoneRef.current) skipEntranceIfRunning()

            touchY = e.touches[0]?.clientY ?? 0
        }

        const onTouchMove = (e: TouchEvent) => {
            if (detailOpenRef.current) return
            if (interactingRef.current) return

            const target = e.target as HTMLElement | null

            if (target?.closest('[data-no-wheel]')) return

            e.preventDefault()

            if (!entranceDoneRef.current) skipEntranceIfRunning()

            const y = e.touches[0]?.clientY ?? touchY
            const delta = touchY - y

            touchY = y

            if (navigatingRef.current) {
                gsap.killTweensOf(navProxyRef.current)
                navigatingRef.current = false
            }

            lastWheelTimeRef.current = performance.now()

            const capped = Math.max(-WHEEL_CAP, Math.min(WHEEL_CAP, delta))

            targetPosRef.current += capped / layoutRef.current.pixelsPerItem
        }

        const onPointerEnter = () => {
            onSectionRef.current = true
        }

        const onPointerLeave = () => {
            onSectionRef.current = false
            isHoveringActiveRef.current = false
        }

        const onPointerMove = (e: PointerEvent) => {
            const rect = section.getBoundingClientRect()

            hoverRef.current.x = e.clientX - rect.left
            hoverRef.current.y = e.clientY - rect.top
        }

        window.addEventListener('wheel', onWheel, { passive: false })
        section.addEventListener('touchstart', onTouchStart, { passive: true })
        section.addEventListener('touchmove', onTouchMove, { passive: false })
        section.addEventListener('pointerenter', onPointerEnter)
        section.addEventListener('pointerleave', onPointerLeave)
        section.addEventListener('pointermove', onPointerMove)

        return () => {
            cancelAnimationFrame(raf)
            window.removeEventListener('wheel', onWheel)
            section.removeEventListener('touchstart', onTouchStart)
            section.removeEventListener('touchmove', onTouchMove)
            section.removeEventListener('pointerenter', onPointerEnter)
            section.removeEventListener('pointerleave', onPointerLeave)
            section.removeEventListener('pointermove', onPointerMove)
        }
    }, [])

    // Lock body scroll + wire Esc while detail panel or interaction is active.
    // Note: Escape listener is best-effort when focus is inside a cross-origin iframe.
    useEffect(() => {
        if (detailIdx === null && interactingRenderedIdx === null) return

        const prev = document.body.style.overflow
        if (detailIdx !== null) document.body.style.overflow = 'hidden'

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (interactingRenderedIdx !== null) {
                    setInteractingRenderedIdx(null)
                } else if (detailIdx !== null) {
                    handleCloseRef.current()
                }
            }
        }

        window.addEventListener('keydown', onKey)

        return () => {
            window.removeEventListener('keydown', onKey)
            if (detailIdx !== null) document.body.style.overflow = prev
        }
    }, [detailIdx, interactingRenderedIdx])

    const openDetailFromActiveAt = (idx: number) => {
        if (phase !== 'idle' || !entranceDoneRef.current) return

        const slot = slotRefs.current[idx]
        const titleRow = titleRefs.current[idx]
        const titleH3 = titleRow?.querySelector('h3') as HTMLElement | null

        sourceImageRectRef.current = slot?.getBoundingClientRect() ?? null
        sourceTitleRectRef.current = titleH3?.getBoundingClientRect() ?? null
        hiddenIdxRef.current = idx

        if (slot) slot.style.visibility = 'hidden'
        if (titleH3) titleH3.style.visibility = 'hidden'

        setPhase('opening')
        setDetailIdx(idx % N)
    }

    const navigateAndOpen = (i: number) => {
        if (phase !== 'idle' || !entranceDoneRef.current) return

        const currentIdx = activeIdxRef.current

        if (i === currentIdx) {
            openDetailFromActiveAt(currentIdx)
            return
        }

        const currentPos = posRef.current
        const currentLogical = ((Math.round(currentPos) % N) + N) % N
        const clickedLogical = ((i % N) + N) % N
        let delta = clickedLogical - currentLogical

        if (delta > N / 2) delta -= N
        if (delta < -N / 2) delta += N

        if (delta === 0) {
            openDetailFromActiveAt(currentIdx)
            return
        }

        const proxy = navProxyRef.current
        proxy.value = currentPos
        navigatingRef.current = true

        const duration = motionPolicy.sharedElementDuration > 0
            ? 0.85 + Math.abs(delta) * 0.11
            : 0

        gsap.killTweensOf(proxy)
        gsap.to(proxy, {
            value: currentPos + delta,
            duration,
            ease: 'power3.inOut',
            onUpdate: () => {
                let v = proxy.value

                while (v < POS_MIN) v += N
                while (v >= POS_MAX) v -= N

                posRef.current = v
                targetPosRef.current = v
            },
            onComplete: () => {
                navigatingRef.current = false
                requestAnimationFrame(() => openDetailFromActiveAt(activeIdxRef.current))
            }
        })
    }

    const finalizeClose = () => {
        const hidIdx = hiddenIdxRef.current

        if (hidIdx !== null) {
            const slot = slotRefs.current[hidIdx]
            const titleRow = titleRefs.current[hidIdx]
            const titleH3 = titleRow?.querySelector('h3') as HTMLElement | null

            if (slot) slot.style.visibility = ''
            if (titleH3) titleH3.style.visibility = ''

            for (let i = 0; i < hidIdx; i++) {
                const row = titleRefs.current[i]

                if (row) gsap.set(row, { clearProps: 'transform' })
            }
        }

        hiddenIdxRef.current = null
        sourceImageRectRef.current = null
        sourceTitleRectRef.current = null
        setDetailIdx(null)
        setPhase('idle')
    }

    const handleClose = () => {
        if (phase === 'closing' || phase === 'idle') return

        setPhase('closing')

        const duration = motionPolicy.sharedElementDuration > 0 ? 0.85 : 0
        const sourceImg = sourceImageRectRef.current
        const sourceTitle = sourceTitleRectRef.current
        const imgEl = detailImageRef.current
        const titleEl = detailTitleRef.current
        const root = detailRef.current

        if (imgEl) gsap.killTweensOf(imgEl)
        if (titleEl) gsap.killTweensOf(titleEl)

        if (root) {
            const reveal = root.querySelectorAll('[data-detail-reveal]')

            gsap.killTweensOf(reveal)
            gsap.to(reveal, {
                y: 14,
                opacity: 0,
                filter: motionPolicy.blurEntrance ? 'blur(6px)' : 'none',
                duration: duration > 0 ? 0.35 : 0,
                ease: 'power3.in',
                stagger: duration > 0 ? 0.03 : 0
            })

            const scrim = root.querySelector('[data-detail-scrim]')

            if (scrim) {
                gsap.killTweensOf(scrim)
                gsap.to(scrim, { opacity: 0, duration: duration > 0 ? 0.55 : 0, delay: duration > 0 ? 0.25 : 0, ease: 'power2.in' })
            }
        }

        if (sourceImg && imgEl && duration > 0) {
            gsap.set(imgEl, { x: 0, y: 0, scaleX: 1, scaleY: 1 })

            const target = imgEl.getBoundingClientRect()
            const sx = sourceImg.width / target.width
            const sy = sourceImg.height / target.height

            gsap.to(imgEl, {
                x: sourceImg.left - target.left,
                y: sourceImg.top - target.top,
                scaleX: sx,
                scaleY: sy,
                duration,
                ease: 'power3.inOut',
                delay: 0.05
            })
        }

        if (sourceTitle && titleEl && duration > 0) {
            gsap.set(titleEl, { x: 0, y: 0, scale: 1 })

            const target = titleEl.getBoundingClientRect()
            const s = sourceTitle.height / target.height

            gsap.to(titleEl, {
                x: sourceTitle.left - target.left,
                y: sourceTitle.top - target.top,
                scale: s,
                duration,
                ease: 'power3.inOut',
                delay: 0.05,
                onComplete: finalizeClose
            })

            const activeIdxNow = hiddenIdxRef.current

            if (activeIdxNow !== null) {
                for (let i = 0; i < activeIdxNow; i++) {
                    const row = titleRefs.current[i]

                    if (row) {
                        gsap.killTweensOf(row)
                        gsap.to(row, { y: 0, duration, ease: 'power3.inOut', delay: 0.05 })
                    }
                }
            }
        } else {
            finalizeClose()
        }
    }

    useEffect(() => {
        handleCloseRef.current = handleClose
    })

    // Shared-element FLIP into the detail panel.
    useIsomorphicLayoutEffect(() => {
        if (detailIdx === null) {
            flipAppliedRef.current = false
            return
        }

        if (flipAppliedRef.current) return

        flipAppliedRef.current = true

        const sourceImg = sourceImageRectRef.current
        const sourceTitle = sourceTitleRectRef.current
        const imgEl = detailImageRef.current
        const titleEl = detailTitleRef.current
        const root = detailRef.current

        if (!root) return

        const duration = motionPolicy.sharedElementDuration

        const scrim = root.querySelector('[data-detail-scrim]')

        if (scrim) {
            gsap.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: duration > 0 ? 0.45 : 0, ease: 'power2.out' })
        }

        if (sourceImg && imgEl && duration > 0) {
            const target = imgEl.getBoundingClientRect()
            const dx = sourceImg.left - target.left
            const dy = sourceImg.top - target.top
            const sx = sourceImg.width / target.width
            const sy = sourceImg.height / target.height

            gsap.set(imgEl, { visibility: 'visible', transformOrigin: 'top left', x: dx, y: dy, scaleX: sx, scaleY: sy })
            gsap.to(imgEl, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration, ease: 'power4.out' })
        } else if (imgEl) {
            gsap.set(imgEl, { visibility: 'visible', x: 0, y: 0, scaleX: 1, scaleY: 1 })
        }

        if (sourceTitle && titleEl && duration > 0) {
            const target = titleEl.getBoundingClientRect()
            const dx = sourceTitle.left - target.left
            const dy = sourceTitle.top - target.top
            const s = sourceTitle.height / target.height

            gsap.set(titleEl, { visibility: 'visible', transformOrigin: 'top left', x: dx, y: dy, scale: s })
            gsap.to(titleEl, {
                x: 0,
                y: 0,
                scale: 1,
                duration,
                ease: 'power4.out',
                onComplete: () => setPhase('detail')
            })

            const lift = sourceTitle.top - target.top
            const activeIdxNow = hiddenIdxRef.current

            if (activeIdxNow !== null && lift !== 0) {
                for (let i = 0; i < activeIdxNow; i++) {
                    const row = titleRefs.current[i]

                    if (row) gsap.to(row, { y: -lift, duration, ease: 'power4.out' })
                }
            }
        } else {
            if (titleEl) gsap.set(titleEl, { visibility: 'visible', x: 0, y: 0, scale: 1 })
            setPhase('detail')
        }

        gsap.fromTo(
            root.querySelectorAll('[data-detail-reveal]'),
            { y: duration > 0 ? 24 : 0, opacity: 0, filter: motionPolicy.blurEntrance ? 'blur(8px)' : 'none' },
            { y: 0, opacity: 1, filter: 'none', duration: duration > 0 ? 0.9 : 0, ease: 'power4.out', stagger: duration > 0 ? 0.05 : 0, delay: duration > 0 ? 0.25 : 0 }
        )
    }, [detailIdx, motionPolicy.sharedElementDuration, motionPolicy.blurEntrance])

    return (
        <section
            ref={sectionRef}
            aria-label='Selected work'
            className='relative h-[100dvh] w-full select-none overflow-hidden bg-background'
        >
            {isMobile && <div aria-hidden className='absolute inset-x-0 top-0 z-[9] h-20 bg-background' />}

            <div
                data-chrome
                data-no-wheel
                className={cn(
                    'absolute left-6 top-5 z-10 opacity-0 md:left-12 md:top-10',
                    isMobile && 'flex items-center gap-4'
                )}
            >
                <button type='button' onClick={() => navigateAndOpen(POS_MIN + folioItems.findIndex(item => item.id === 'about'))} className='text-sm font-semibold text-foreground'>Bennett Payoyo</button>
                {!isMobile && <p className='mt-1 text-xs text-muted-foreground'>2nd year BSCS · PUP</p>}
            </div>

            <div
                data-chrome
                className='pointer-events-none absolute right-6 top-14 z-10 flex items-center gap-3 opacity-0 md:right-12 md:top-10'
            >
                <span ref={counterRef} className='font-mono text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground tabular-nums'>
                    {activeGroupPosition.group === 'work' ? 'Work' : 'Profile'} {String(activeGroupPosition.index).padStart(2, '0')}
                    <span className='mx-1.5 opacity-40'>/</span>
                    {String(activeGroupPosition.total).padStart(2, '0')}
                </span>

                <span className='hidden h-px w-8 bg-foreground/30 md:block' />
            </div>

            <div
                className={cn('absolute left-0 z-[1] overflow-hidden', isMobile ? 'w-full' : 'w-1/2')}
                style={{
                    top: `${layout.titleTopVh}dvh`,
                    height: `${layout.titleAreaVh}dvh`,
                    maskImage: MASK_GRADIENT,
                    WebkitMaskImage: MASK_GRADIENT
                }}
            >
                <div ref={titleRevealRef} className='absolute inset-0 opacity-0' style={{ willChange: 'transform, opacity, filter' }}>
                    <div ref={titleStripRef} className='absolute inset-x-0 top-0 will-change-transform'>
                        {RENDERED_ITEMS.map((item, i) => {
                            const isCanonical = i >= N && i < 2 * N
                            const groupPosition = getGroupPosition(folioItems, i % N)
                            const profile = groupPosition.group === 'profile'

                            return (
                                <div
                                    key={i}
                                    ref={(el) => {
                                        titleRefs.current[i] = el
                                    }}
                                    role='button'
                                    tabIndex={isCanonical ? 0 : -1}
                                    aria-hidden={!isCanonical}
                                    aria-label={`View ${item.title}`}
                                    onClick={() => navigateAndOpen(i)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault()
                                            navigateAndOpen(i)
                                        }
                                    }}
                                    onPointerEnter={() => {
                                        hoveredTitleIdxRef.current = i
                                    }}
                                    onPointerLeave={() => {
                                        if (hoveredTitleIdxRef.current === i) hoveredTitleIdxRef.current = null
                                    }}
                                    className={cn(
                                        'cursor-target flex cursor-pointer items-center rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-foreground/40',
                                        isMobile ? 'justify-center px-6 text-center' : 'gap-4 pl-8 pr-8 sm:pl-12 lg:pl-20'
                                    )}
                                    style={{ height: `${layout.titleSlotVh}dvh` }}
                                >
                                    <div className={cn(profile && 'flex flex-col gap-1')}>
                                        {profile && <span className='font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground'>Profile · {String(groupPosition.index).padStart(2, '0')}</span>}
                                        <h3 className='whitespace-nowrap leading-none tracking-[-0.015em]'>
                                            {item.title}
                                            {item.descriptor && (
                                                <span className='hidden 2xl:inline'>
                                                    <span className='mx-[0.35em] text-[0.7em]'>·</span>
                                                    <span className='text-[0.7em]'>{item.descriptor}</span>
                                                </span>
                                            )}
                                        </h3>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            <div
                className={cn('absolute overflow-hidden', isMobile ? 'left-0 w-full' : 'right-0 w-1/2')}
                style={{
                    top: `${layout.imageWrapperTopVh}dvh`,
                    height: `${layout.imageWrapperHeightVh}dvh`,
                    ...(isMobile ? { maskImage: MASK_GRADIENT, WebkitMaskImage: MASK_GRADIENT } : {})
                }}
            >
                <div ref={imageRevealRef} className='absolute inset-0 opacity-0' style={{ willChange: 'transform, opacity, filter' }}>
                    <div
                        ref={imageStripRef}
                        className='absolute inset-x-0 top-0 will-change-transform'
                        style={{ height: `${RENDERED * layout.imagePitchVh}dvh` }}
                    >
                        {RENDERED_ITEMS.map((item, i) => {
                            const isCanonical = i >= N && i < 2 * N
                            const presentation = getPreviewPresentation(
                                item,
                                i,
                                activeIdx,
                                settledRenderedIdx,
                                interactingRenderedIdx
                            )

                            return (
                                <div
                                    key={i}
                                    aria-hidden={!isCanonical}
                                    className='absolute inset-x-0 flex items-center justify-center'
                                    style={{
                                        top: `${(RENDERED - 1 - i) * layout.imagePitchVh}dvh`,
                                        height: `${layout.imagePitchVh}dvh`
                                    }}
                                >
                                    <div
                                        ref={(el) => {
                                            slotRefs.current[i] = el
                                        }}
                                        onClick={() => {
                                            if (interactingRenderedIdx === null) navigateAndOpen(i)
                                        }}
                                        onPointerEnter={() => {
                                            isHoveringActiveRef.current = true
                                        }}
                                        onPointerLeave={() => {
                                            isHoveringActiveRef.current = false
                                        }}
                                        className='relative overflow-hidden rounded-2xl bg-muted'
                                        style={{ height: `${layout.imageHeightVh}dvh`, aspectRatio: '4 / 5', willChange: 'transform, opacity' }}
                                    >
                                        <FolioPreview
                                            item={item}
                                            presentation={presentation}
                                            github={github}
                                            mode='reel'
                                            onInteract={() => setInteractingRenderedIdx(reduceInteraction(interactingRenderedIdx, { type: 'enter', renderedIndex: i }))}
                                            onExitInteract={() => setInteractingRenderedIdx(reduceInteraction(interactingRenderedIdx, { type: 'exit' }))}
                                            onOpenDetails={() => navigateAndOpen(i)}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            <div
                ref={clickMeRef}
                aria-hidden
                className='pointer-events-none absolute left-0 top-0 z-20 grid h-[76px] w-[76px] place-items-center rounded-full border border-white/55'
                style={{ opacity: 0, transition: 'opacity 260ms ease-out', mixBlendMode: 'difference', willChange: 'transform, opacity' }}
            >
                <span className='text-[9px] font-medium uppercase tracking-[0.32em] text-white'>View</span>
            </div>

            {detailItem &&
                (() => {
                    const it = detailItem

                    const backBtn = (
                        <button
                            data-detail-reveal
                            type='button'
                            onClick={handleClose}
                            className='cursor-target group inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground'
                        >
                            <ArrowLeft className='size-4 transition-transform group-hover:-translate-x-0.5' />
                            Back to projects
                        </button>
                    )

                    const detailPresentation = it.kind === 'project'
                        ? (it.embed && it.liveUrl ? 'live-interactive' : 'poster')
                        : it.kind

                    const detailContent = (
                        <div data-detail-reveal className='mt-6 flex flex-col gap-4 border-t border-border pt-6'>
                            {it.kind === 'project' && (
                                <>
                                    <div className='flex flex-wrap items-center gap-2'>
                                        {it.stack.map((tech) => (
                                            <Badge key={tech} variant='chipMono'>{tech}</Badge>
                                        ))}
                                    </div>

                                    {(it.role || it.team || it.result) && (
                                        <div className='grid grid-cols-2 gap-x-6 gap-y-3 pt-3 sm:grid-cols-3'>
                                            {it.role && (
                                                <div className='flex flex-col gap-1'>
                                                    <span className='font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-foreground/65'>Role</span>
                                                    <span className='text-sm text-foreground'>{it.role}</span>
                                                </div>
                                            )}
                                            {it.team && (
                                                <div className='flex flex-col gap-1'>
                                                    <span className='font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-foreground/65'>Team</span>
                                                    <span className='text-sm text-foreground'>{it.team}</span>
                                                </div>
                                            )}
                                            {it.result && (
                                                <div className='flex flex-col gap-1'>
                                                    <span className='font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-foreground/65'>Result</span>
                                                    <span className='text-sm text-foreground'>{it.result}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className='flex flex-wrap items-center gap-3 pt-2'>
                                        <Button render={<a href={it.sourceUrl} target='_blank' rel='noreferrer' />} nativeButton={false} variant='solid' size='pill' className='transition-transform hover:-translate-y-0.5'>
                                            Source code
                                            <ArrowUpRight className='size-3.5' />
                                        </Button>

                                        {it.liveUrl && (
                                            <Button render={<a href={it.liveUrl} target='_blank' rel='noreferrer' />} nativeButton={false} variant='pillOutline' size='pill' className='transition-transform hover:-translate-y-0.5'>
                                                Open live site
                                                <ArrowUpRight className='size-3.5' />
                                            </Button>
                                        )}
                                    </div>
                                </>
                            )}

                            {it.kind === 'about' && (
                                <div className='flex flex-col gap-3 border-t border-border pt-4'>
                                    <span className='font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-foreground/65'>Focus areas</span>
                                    <div className='flex flex-wrap gap-2'>
                                        {it.focus.map((f) => (
                                            <Badge key={f} variant='chip'>{f}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {it.kind === 'resume' && (
                                <div className='flex flex-col gap-3 border-t border-border pt-4'>
                                    <div className='flex flex-col gap-1'>
                                        <span className='font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground'>Education</span>
                                        <span className='text-sm font-medium text-foreground'>{it.school}</span>
                                        <span className='text-sm text-muted-foreground'>{it.program} · {it.status}</span>
                                    </div>

                                    {it.highSchools.map(hs => (
                                        <div key={hs.name} className='flex flex-col gap-1'>
                                            <span className='text-sm font-medium text-foreground'>{hs.name}</span>
                                            <span className='text-sm text-muted-foreground'>{hs.level}</span>
                                        </div>
                                    ))}

                                    <div className='flex flex-col gap-2 pt-1'>
                                        <span className='font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-foreground/65'>Current focus</span>
                                        <div className='flex flex-wrap gap-2'>
                                            {it.focus.map(f => (
                                                <Badge key={f} variant='chip'>{f}</Badge>
                                            ))}
                                        </div>
                                    </div>

                                    <div className='flex flex-wrap items-center gap-3 pt-2'>
                                        <Button render={<a href={it.pdfUrl} download />} nativeButton={false} variant='solid' size='pill' className='transition-transform hover:-translate-y-0.5'>
                                            Download resume
                                        </Button>
                                        <Button render={<a href={it.pdfUrl} target='_blank' rel='noreferrer' />} nativeButton={false} variant='pillOutline' size='pill' className='transition-transform hover:-translate-y-0.5'>
                                            View resume
                                            <ArrowUpRight className='size-3.5' />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {it.kind === 'github' && (
                                <div className='flex flex-col gap-3 border-t border-border pt-4'>
                                    {github ? (
                                        <>
                                            <p className='text-sm text-muted-foreground'>
                                                {github.publicRepos} public repositories · updated {github.fetchedAt.slice(0, 10)}
                                            </p>
                                            <ul className='space-y-2 text-foreground'>
                                                {github.repos.slice(0, 6).map((repo) => (
                                                    <li key={repo.url} className='grid grid-cols-[1fr_auto] gap-x-6 font-mono text-xs'>
                                                        <a href={repo.url} target='_blank' rel='noreferrer' className='hover:underline'>
                                                            {repo.name}
                                                        </a>
                                                        <span className='text-xs text-muted-foreground'>{repo.language ?? ''}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </>
                                    ) : (
                                        <p className='text-sm text-muted-foreground'>GitHub data is temporarily unavailable.</p>
                                    )}
                                    <div className='pt-2'>
                                        <Button render={<a href={it.profileUrl} target='_blank' rel='noreferrer' />} nativeButton={false} variant='solid' size='pill' className='transition-transform hover:-translate-y-0.5'>
                                            Open GitHub profile
                                            <ArrowUpRight className='size-3.5' />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )

                    return (
                        <div ref={detailRef} className='absolute inset-0 z-30' onClick={handleClose}>
                            <div data-detail-scrim className='absolute inset-0 bg-background' style={{ opacity: 0 }} />

                            {isMobile ? (
                                <div
                                    data-no-wheel
                                    onClick={(e) => e.stopPropagation()}
                                    className='absolute inset-0 overflow-y-auto'
                                    style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
                                >
                                    <div className='flex flex-col gap-6 px-6 pb-12 pt-8'>
                                        {backBtn}

                                        <h2
                                            ref={detailTitleRef}
                                            className='leading-none tracking-[-0.015em] text-foreground'
                                            style={{
                                                fontSize: `${MOBILE_LAYOUT.titleFontVhMax * 1.1}dvh`,
                                                fontWeight: 620,
                                                fontVariationSettings: '"wght" 620',
                                                transformOrigin: 'top left',
                                                visibility: 'hidden',
                                                wordBreak: 'break-word'
                                            }}
                                        >
                                            {it.title}
                                        </h2>

                                        <span data-detail-reveal className='font-mono text-xs uppercase tracking-[0.2em] text-foreground/65'>
                                            {it.meta}
                                        </span>

                                        <p data-detail-reveal className='text-base leading-relaxed text-foreground/85'>
                                            {it.summary}
                                        </p>

                                        {detailContent}

                                        <div
                                            ref={detailImageRef}
                                            className='relative w-full overflow-hidden rounded-2xl bg-muted'
                                            style={{ aspectRatio: '4 / 5', transformOrigin: 'top left', visibility: 'hidden' }}
                                        >
                                            <FolioPreview
                                                item={it}
                                                presentation={detailPresentation}
                                                github={github}
                                                mode='detail'
                                                onInteract={() => {}}
                                                onExitInteract={() => {}}
                                                onOpenDetails={() => {}}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div
                                        data-no-wheel
                                        onClick={(e) => e.stopPropagation()}
                                        className='absolute left-0 top-0 flex h-full flex-col overflow-y-auto p-8 md:p-14 lg:p-16'
                                        style={{ width: 'calc(55vw - 30px)' }}
                                    >
                                        {backBtn}

                                        <h2
                                            ref={detailTitleRef}
                                            className='mt-8 whitespace-nowrap leading-none tracking-[-0.015em] text-foreground'
                                            style={{
                                                fontSize: 'clamp(2.4rem, 7dvh, 5rem)',
                                                fontWeight: 620,
                                                fontVariationSettings: '"wght" 620',
                                                transformOrigin: 'top left',
                                                visibility: 'hidden'
                                            }}
                                        >
                                            {it.title}
                                        </h2>

                                        <span data-detail-reveal className='mt-3 font-mono text-xs uppercase tracking-[0.2em] text-foreground/65'>
                                            {it.meta}
                                        </span>

                                        <p data-detail-reveal className='mt-6 max-w-xl text-base leading-relaxed text-foreground/85'>
                                            {it.summary}
                                        </p>

                                        {detailContent}
                                    </div>

                                    <div
                                        data-no-wheel
                                        onClick={(e) => e.stopPropagation()}
                                        className='absolute'
                                        style={{ top: '30px', right: '30px', bottom: '30px', width: 'min(calc((100dvh - 60px) * 0.8), calc(45vw - 30px))' }}
                                    >
                                        <div
                                            ref={detailImageRef}
                                            className='relative h-full w-full overflow-hidden rounded-2xl bg-muted'
                                            style={{ transformOrigin: 'top left', visibility: 'hidden' }}
                                        >
                                            <FolioPreview
                                                item={it}
                                                presentation={detailPresentation}
                                                github={github}
                                                mode='detail'
                                                onInteract={() => {}}
                                                onExitInteract={() => {}}
                                                onOpenDetails={() => {}}
                                            />
                                        </div>

                                        <button
                                            type='button'
                                            onClick={handleClose}
                                            aria-label='Close'
                                            className='cursor-target absolute -right-2 -top-2 grid h-10 w-10 place-items-center rounded-full bg-foreground text-background shadow-lg transition-transform hover:scale-105'
                                        >
                                            <X className='size-4' />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )
                })()}
        </section>
    )
}
