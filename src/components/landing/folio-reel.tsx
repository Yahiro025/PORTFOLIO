import type { CSSProperties, FC, ReactNode } from 'react'
import type { FolioLayout, GitHubSnapshot, PortfolioItem } from '@/types'

import gsap from 'gsap'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { useRouter } from 'next/router'
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
import { ContactSheet, CONTACT_LINKS } from '@/components/landing/contact-lanyard'
import { MobileGallery } from '@/components/landing/mobile-gallery'
import {
    getGroup,
    getGroupPosition,
    getMotionPolicy,
    getNavigationPosition,
    getProjectIdFromSearch,
    getPreviewPresentation,
    getReelOffsets,
    reduceInteraction,
    snapReelPosition,
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
const TITLE_MASK_PX = 20

const MASK_GRADIENT = `linear-gradient(to bottom, transparent 0, #000 ${TITLE_MASK_PX}px, #000 calc(100% - ${TITLE_MASK_PX}px), transparent 100%)`

const RENDERED_ITEMS: PortfolioItem[] = Array.from({ length: RENDERED }, (_, i) => folioItems[i % N])

const ABOUT_LOGICAL_IDX = folioItems.findIndex(item => item.id === 'about')
const LANDING_POS = POS_MIN + ABOUT_LOGICAL_IDX

const PROJECT_ITEMS = folioItems.filter((item): item is Extract<PortfolioItem, { kind: 'project' }> => item.kind === 'project')
const PROFILE_ITEM = folioItems.find((item): item is Extract<PortfolioItem, { kind: 'about' }> => item.kind === 'about')!
const RESUME_ITEM = folioItems.find((item): item is Extract<PortfolioItem, { kind: 'resume' }> => item.kind === 'resume')!
const GITHUB_ITEM = folioItems.find((item): item is Extract<PortfolioItem, { kind: 'github' }> => item.kind === 'github')!

// Both layouts are in the HTML. CSS selects one before hydration.
const initialLayoutStyle = (L: FolioLayout, prefix: string) => {
    const offsets = getReelOffsets(LANDING_POS, L, RENDERED)
    return {
        [`--${prefix}title-top`]: `${L.titleTopVh}dvh`,
        [`--${prefix}title-area`]: `${L.titleAreaVh}dvh`,
        [`--${prefix}title-slot`]: `${L.titleSlotVh}dvh`,
        [`--${prefix}title-font`]: `${L.titleFontVhMax}dvh`,
        [`--${prefix}title-offset`]: `${offsets.titleVh}dvh`,
        [`--${prefix}image-top`]: `${L.imageWrapperTopVh}dvh`,
        [`--${prefix}image-area`]: `${L.imageWrapperHeightVh}dvh`,
        [`--${prefix}image-height`]: `${L.imageHeightVh}dvh`,
        [`--${prefix}image-pitch`]: `${L.imagePitchVh}dvh`,
        [`--${prefix}image-offset`]: `calc(${offsets.previewVh}dvh + ${offsets.previewPx}px)`
    }
}

const INITIAL_STYLE = {
    ...initialLayoutStyle(DESKTOP_LAYOUT, 'desktop-'),
    ...initialLayoutStyle(MOBILE_LAYOUT, 'mobile-')
} as CSSProperties

type Phase = 'idle' | 'opening' | 'detail' | 'closing'

interface FolioReelProps {
    github: GitHubSnapshot | null
}

export const FolioReel: FC<FolioReelProps> = ({ github }): ReactNode => {
    const router = useRouter()
    const [isMobile, setIsMobile] = useState(false)
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
    const [liveMountEnabled, setLiveMountEnabled] = useState(false)
    const [activeIdx, setActiveIdx] = useState(LANDING_POS)
    const [settledRenderedIdx, setSettledRenderedIdx] = useState<number | null>(null)
    const settledIdxRef = useRef<number | null>(null)
    const [interactingRenderedIdx, setInteractingRenderedIdx] = useState<number | null>(null)
    const phaseRef = useRef<Phase>('idle')
    const [detailIdx, setDetailIdx] = useState<number | null>(null)
    const [detailElement, setDetailElement] = useState<HTMLDivElement | null>(null)
    const [contactOpen, setContactOpen] = useState(false)

    const sectionRef = useRef<HTMLElement>(null)
    const titleRevealRef = useRef<HTMLDivElement>(null)
    const titleStripRef = useRef<HTMLDivElement>(null)
    const imageRevealRef = useRef<HTMLDivElement>(null)
    const imageStripRef = useRef<HTMLDivElement>(null)
    const counterRef = useRef<HTMLSpanElement>(null)

    const detailRef = useRef<HTMLDivElement>(null)
    const detailImageRef = useRef<HTMLDivElement>(null)
    const detailTitleRef = useRef<HTMLHeadingElement>(null)
    const mobileFocusRef = useRef<HTMLElement | null>(null)

    const titleRefs = useRef<(HTMLDivElement | null)[]>([])
    const slotRefs = useRef<(HTMLDivElement | null)[]>([])
    const titleHoverProgressRef = useRef<number[]>([])

    const layoutRef = useRef(DESKTOP_LAYOUT)
    const reducedMotionRef = useRef(false)

    const targetPosRef = useRef(LANDING_POS)
    const posRef = useRef(LANDING_POS)
    const activeIdxRef = useRef(LANDING_POS)

    const interactingRef = useRef(false)
    const navigatingRef = useRef(false)

    const lastWheelTimeRef = useRef(0)
    const lastDirectionRef = useRef(0)
    const renderReelRef = useRef<() => void>(() => {})
    const navProxyRef = useRef({ value: LANDING_POS })
    const hoveredTitleIdxRef = useRef<number | null>(null)

    const sourceImageRectRef = useRef<DOMRect | null>(null)
    const sourceTitleRectRef = useRef<DOMRect | null>(null)
    const hiddenIdxRef = useRef<number | null>(null)
    const flipAppliedRef = useRef(false)

    const finishCloseRef = useRef<() => void>(() => {})
    const initialProjectQueryHandledRef = useRef(false)

    const detailItem = detailIdx !== null ? folioItems[detailIdx] : null
    const motionPolicy = getMotionPolicy(prefersReducedMotion)
    const activeGroupPosition = getGroupPosition(folioItems, activeIdx % N)
    const viewportIsMobile = isMobile || layoutRef.current === MOBILE_LAYOUT
    const removeInvalidProjectQuery = () => {
        const url = new URL(window.location.href)
        url.searchParams.delete('project')
        void router.replace(`${url.pathname}${url.search}${url.hash}`, undefined, { shallow: true, scroll: false })
    }

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)')
        const update = () => {
            layoutRef.current = mq.matches ? MOBILE_LAYOUT : DESKTOP_LAYOUT
            setIsMobile(mq.matches)
        }

        update()
        mq.addEventListener('change', update)

        return () => mq.removeEventListener('change', update)
    }, [])

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
        const update = () => {
            reducedMotionRef.current = mq.matches
            setPrefersReducedMotion(mq.matches)
        }

        update()
        mq.addEventListener('change', update)

        return () => mq.removeEventListener('change', update)
    }, [])

    useEffect(() => {
        interactingRef.current = interactingRenderedIdx !== null
    }, [interactingRenderedIdx])

    useEffect(() => {
        const counter = counterRef.current

        if (!counter || motionPolicy.sharedElementDuration === 0) return
        if (activeIdxRef.current === LANDING_POS) return

        gsap.fromTo(counter, { y: 6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power3.out' })
    }, [activeGroupPosition.group, motionPolicy.sharedElementDuration])

    // Keep the initial About card visible and still; detail/hover motion stays intact.
    useEffect(() => {
        setLiveMountEnabled(true)
    }, [])

    // Main render loop + input. One rAF ticker drives every transform.
    useEffect(() => {
        const section = sectionRef.current

        if (!section || isMobile || window.matchMedia('(max-width: 767px)').matches) {
            renderReelRef.current = () => {}
            return
        }

        let raf = 0
        let touchY = 0

        let lastPosition = NaN
        let lastHeight = 0
        let lastLayout = layoutRef.current
        let lastHovered: number | null = null
        let hoverMoving = false

        const render = () => {
            const next = posRef.current
            const hoveredIdx = hoveredTitleIdxRef.current
            if (next === lastPosition && window.innerHeight === lastHeight &&
                layoutRef.current === lastLayout && hoveredIdx === lastHovered && !hoverMoving) return

            lastPosition = next
            lastHeight = window.innerHeight
            lastLayout = layoutRef.current
            lastHovered = hoveredIdx
            hoverMoving = false

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

            for (let i = 0; i < RENDERED; i++) {
                const el = titleRefs.current[i]

                if (!el) continue

                const dist = Math.abs(i - next)
                const reg = TITLE_REGISTER[getGroup(RENDERED_ITEMS[i])]
                const tColor = Math.min(Math.max(0, 1 - dist * 2), reg.scale === 1 ? 1 : 0.6)
                const tType = Math.max(0, 1 - dist * 0.55)

                const targetHover = hoveredIdx !== null && i % N === hoveredIdx % N ? 1 : 0
                const curHover = titleHoverProgressRef.current[i] ?? 0
                const nextHover = Math.abs(targetHover - curHover) < 0.001 || reducedMotionRef.current
                    ? targetHover : curHover + (targetHover - curHover) * HOVER_LERP
                hoverMoving ||= nextHover !== targetHover

                titleHoverProgressRef.current[i] = nextHover

                el.style.color = `color-mix(in srgb, var(--foreground) ${(tColor * 100).toFixed(1)}%, var(--muted-foreground))`
                el.style.opacity = (NONACTIVE_OPACITY + (1 - NONACTIVE_OPACITY) * tColor).toFixed(3)

                const wght = reg.wghtMin + (reg.wghtMax - reg.wghtMin) * tType + nextHover * HOVER_WGHT_BONUS

                el.style.fontVariationSettings = `"wght" ${wght.toFixed(0)}`
                el.style.fontWeight = String(Math.round(wght))

                const h3 = el.querySelector('h3') as HTMLElement | null

                if (h3) {
                    const fontVh = (L.titleFontVhMin + (L.titleFontVhMax - L.titleFontVhMin) * tType) * reg.scale
                    h3.style.transform = `scale(${(fontVh / (L.titleFontVhMax * reg.scale)).toFixed(4)})`
                }
            }

            const rounded = Math.max(0, Math.min(RENDERED - 1, Math.round(next)))

            if (rounded !== activeIdxRef.current) {
                activeIdxRef.current = rounded
                setActiveIdx(rounded)
            }

        }

        renderReelRef.current = render

        const tick = () => {
            if (
                !navigatingRef.current &&
                phaseRef.current === 'idle' &&
                performance.now() - lastWheelTimeRef.current > SNAP_IDLE_MS
            ) {
                const t = targetPosRef.current
                const snapped = snapReelPosition(t, lastDirectionRef.current)

                if (snapped !== t) targetPosRef.current = snapped
            }

            const target = targetPosRef.current
            const cur = posRef.current
            let next = reducedMotionRef.current || Math.abs(target - cur) < 0.0005 ? target : cur + (target - cur) * SMOOTHING

            while (next < POS_MIN) {
                next += N
                targetPosRef.current += N
            }

            while (next >= POS_MAX) {
                next -= N
                targetPosRef.current -= N
            }

            posRef.current = next

            const settled = !navigatingRef.current && next === targetPosRef.current && phaseRef.current === 'idle'
                ? Math.round(next) : null
            if (settled !== settledIdxRef.current) {
                settledIdxRef.current = settled
                setSettledRenderedIdx(settled)
            }

            render()
            raf = requestAnimationFrame(tick)
        }

        raf = requestAnimationFrame(tick)

        const cancelNavigation = () => {
            gsap.killTweensOf(navProxyRef.current)
            navigatingRef.current = false
            settledIdxRef.current = null
            setSettledRenderedIdx(null)
        }

        const onWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.deltaY === 0) return
            if (phaseRef.current === 'closing') finishCloseRef.current()
            if (phaseRef.current !== 'idle') return
            if (interactingRef.current) return

            const target = e.target as HTMLElement | null

            if (!target || !section.contains(target) || target.closest('[data-no-wheel]')) return

            e.preventDefault()
            cancelNavigation()

            lastWheelTimeRef.current = performance.now()

            const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1
            const delta = Math.max(-WHEEL_CAP, Math.min(WHEEL_CAP, e.deltaY * unit))
            lastDirectionRef.current = Math.sign(delta)

            targetPosRef.current += delta / layoutRef.current.pixelsPerItem
        }

        const onTouchStart = (e: TouchEvent) => {
            if (phaseRef.current === 'closing') finishCloseRef.current()
            if (phaseRef.current !== 'idle') return
            if (interactingRef.current) return

            const target = e.target as HTMLElement | null

            if (!target || !section.contains(target) || target.closest('[data-no-wheel]')) return

            touchY = e.touches[0]?.clientY ?? 0
        }

        const onTouchMove = (e: TouchEvent) => {
            if (phaseRef.current === 'closing') finishCloseRef.current()
            if (phaseRef.current !== 'idle') return
            if (interactingRef.current) return

            const target = e.target as HTMLElement | null

            if (!target || !section.contains(target) || target.closest('[data-no-wheel]')) return

            e.preventDefault()
            const y = e.touches[0]?.clientY ?? touchY
            const delta = touchY - y

            touchY = y

            cancelNavigation()

            lastWheelTimeRef.current = performance.now()

            const capped = Math.max(-WHEEL_CAP, Math.min(WHEEL_CAP, delta))

            lastDirectionRef.current = Math.sign(capped)
            targetPosRef.current += capped / layoutRef.current.pixelsPerItem
        }

        const onKeyDown = (e: KeyboardEvent) => {
            if (phaseRef.current === 'closing') finishCloseRef.current()
            if (phaseRef.current !== 'idle' || interactingRef.current || e.altKey || e.ctrlKey || e.metaKey) return
            const target = e.target as HTMLElement | null
            if (target?.closest('input, textarea, select, [contenteditable="true"], [data-no-wheel]')) return
            const step = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 }[e.key]
            if (step === undefined && e.key !== 'Home' && e.key !== 'End') return
            e.preventDefault()
            cancelNavigation()
            lastDirectionRef.current = 0
            targetPosRef.current = step !== undefined
                ? Math.round(targetPosRef.current) + step
                : getNavigationPosition(posRef.current, e.key === 'Home' ? 0 : N - 1, N)
        }

        section.addEventListener('wheel', onWheel, { passive: false })
        window.addEventListener('keydown', onKeyDown)
        section.addEventListener('touchstart', onTouchStart, { passive: true })
        section.addEventListener('touchmove', onTouchMove, { passive: false })

        return () => {
            cancelAnimationFrame(raf)
            section.removeEventListener('wheel', onWheel)
            window.removeEventListener('keydown', onKeyDown)
            gsap.killTweensOf(navProxyRef.current)
            section.removeEventListener('touchstart', onTouchStart)
            section.removeEventListener('touchmove', onTouchMove)
        }
    }, [isMobile])

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

                }
            }
        }

        window.addEventListener('keydown', onKey)

        return () => {
            window.removeEventListener('keydown', onKey)
            if (detailIdx !== null) document.body.style.overflow = prev
        }
    }, [detailIdx, interactingRenderedIdx])

    const openDetailFromActiveAt = (idx: number, fromHistory = false) => {
        if (phaseRef.current === 'closing') finalizeClose()
        if (phaseRef.current !== 'idle') return

        const item = folioItems[idx % N]

        if (!fromHistory && item.kind === 'project') {
            const url = new URL(window.location.href)
            url.searchParams.set('project', item.id)
            window.history.pushState(
                { ...(window.history.state ?? {}), portfolioProject: item.id },
                '',
                `${url.pathname}${url.search}${url.hash}`
            )
        }

        gsap.killTweensOf(navProxyRef.current)
        navigatingRef.current = false
        posRef.current = targetPosRef.current = idx
        activeIdxRef.current = idx
        setActiveIdx(idx)
        renderReelRef.current()
        phaseRef.current = 'opening'

        const slot = viewportIsMobile ? null : slotRefs.current[idx]
        const titleRow = viewportIsMobile ? null : titleRefs.current[idx]
        const titleH3 = titleRow?.querySelector('h3') as HTMLElement | null

        sourceImageRectRef.current = slot?.getBoundingClientRect() ?? null
        sourceTitleRectRef.current = titleH3?.getBoundingClientRect() ?? null
        hiddenIdxRef.current = viewportIsMobile ? null : idx

        if (slot) slot.style.visibility = 'hidden'
        if (titleH3) titleH3.style.visibility = 'hidden'

        setDetailIdx(idx % N)
    }

    const navigateAndOpen = (i: number, open = true, fromHistory = false) => {
        if (phaseRef.current === 'closing') finalizeClose()
        if (phaseRef.current !== 'idle') return
        interactingRef.current = false
        setInteractingRenderedIdx(null)

        const currentIdx = activeIdxRef.current

        if (i === currentIdx) {
            if (open) openDetailFromActiveAt(currentIdx, fromHistory)
            return
        }

        const currentPos = posRef.current
        const destination = getNavigationPosition(currentPos, i, N)
        const delta = destination - currentPos

        const proxy = navProxyRef.current
        proxy.value = currentPos
        navigatingRef.current = true

        const duration = motionPolicy.sharedElementDuration > 0
            ? 0.85 + Math.abs(delta) * 0.11
            : 0

        gsap.killTweensOf(proxy)
        gsap.to(proxy, {
            value: destination,
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
                if (open) openDetailFromActiveAt(POS_MIN + ((destination % N) + N) % N, fromHistory)
            }
        })
    }

    const finalizeClose = () => {
        if (detailRef.current) {
            gsap.killTweensOf([detailRef.current, ...detailRef.current.querySelectorAll('*')])
        }
        const hidIdx = hiddenIdxRef.current

        if (hidIdx !== null) {
            const slot = slotRefs.current[hidIdx]
            const titleRow = titleRefs.current[hidIdx]
            const titleH3 = titleRow?.querySelector('h3') as HTMLElement | null

            if (slot) slot.style.visibility = ''
            if (titleH3) titleH3.style.visibility = ''

            for (let i = 0; i < hidIdx; i++) {
                const row = titleRefs.current[i]

                if (row) {
                    gsap.killTweensOf(row)
                    gsap.set(row, { clearProps: 'transform' })
                }
            }
        }

        hiddenIdxRef.current = null
        sourceImageRectRef.current = null
        sourceTitleRectRef.current = null
        setDetailIdx(null)
        phaseRef.current = 'idle'
        interactingRef.current = false
        setInteractingRenderedIdx(null)
    }

    const handleClose = () => {
        if (phaseRef.current === 'closing' || phaseRef.current === 'idle') return

        if (
            detailItem?.kind === 'project' &&
            getProjectIdFromSearch(window.location.search) === detailItem.id
        ) {
            window.history.back()
            return
        }

        phaseRef.current = 'closing'

        const duration = motionPolicy.sharedElementDuration > 0 ? 0.85 : 0
        const sourceIdx = hiddenIdxRef.current
        const sourceImg = sourceIdx === null ? null : slotRefs.current[sourceIdx]?.getBoundingClientRect()
        const sourceTitle = sourceIdx === null ? null : titleRefs.current[sourceIdx]?.querySelector('h3')?.getBoundingClientRect()
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
        finishCloseRef.current = finalizeClose
    })

    // Keep project details addressable without turning the reel into a second
    // router. A same-document base entry means Back closes a detail panel even
    // when the visitor opened the project URL directly.
    useEffect(() => {
        if (initialProjectQueryHandledRef.current) return

        initialProjectQueryHandledRef.current = true
        const projectId = getProjectIdFromSearch(window.location.search)

        if (!projectId) return

        const logicalIndex = folioItems.findIndex(item => item.kind === 'project' && item.id === projectId)

        if (logicalIndex < 0) {
            removeInvalidProjectQuery()
            return
        }

        const projectUrl = new URL(window.location.href)
        const baseUrl = new URL(projectUrl)
        baseUrl.searchParams.delete('project')

        window.history.replaceState(
            { ...(window.history.state ?? {}), portfolioBase: true },
            '',
            `${baseUrl.pathname}${baseUrl.search}${baseUrl.hash}`
        )
        window.history.pushState(
            { ...(window.history.state ?? {}), portfolioProject: projectId },
            '',
            `${projectUrl.pathname}${projectUrl.search}${projectUrl.hash}`
        )

        window.requestAnimationFrame(() => {
            if (getProjectIdFromSearch(window.location.search) !== projectId) return

            const renderedIndex = POS_MIN + logicalIndex
            gsap.killTweensOf(navProxyRef.current)
            navigatingRef.current = false
            posRef.current = targetPosRef.current = renderedIndex
            activeIdxRef.current = renderedIndex
            setActiveIdx(renderedIndex)
            renderReelRef.current()
            openDetailFromActiveAt(renderedIndex, true)
        })
    }, [])

    useEffect(() => {
        const onPopState = () => {
            const projectId = getProjectIdFromSearch(window.location.search)

            if (!projectId) {
                if (detailIdx !== null || phaseRef.current !== 'idle') finishCloseRef.current()
                return
            }

            const logicalIndex = folioItems.findIndex(item => item.kind === 'project' && item.id === projectId)

            if (logicalIndex < 0) {
                removeInvalidProjectQuery()
                if (detailIdx !== null) finishCloseRef.current()
                return
            }

            if (detailIdx === logicalIndex) return
            if (detailIdx !== null) finishCloseRef.current()

            window.requestAnimationFrame(() => {
                navigateAndOpen(POS_MIN + logicalIndex, true, true)
            })
        }

        window.addEventListener('popstate', onPopState)
        return () => window.removeEventListener('popstate', onPopState)
    }, [detailIdx])

    // Shared-element FLIP into the detail panel.
    useIsomorphicLayoutEffect(() => {
        detailRef.current = detailElement
        if (detailIdx === null) {
            flipAppliedRef.current = false
            return
        }

        if (!detailElement) return

        if (flipAppliedRef.current) {
            if (phaseRef.current === 'closing') {
                finalizeClose()
            } else {
                const elements = [detailImageRef.current, detailTitleRef.current]
                gsap.killTweensOf(elements)
                gsap.set(elements, { visibility: 'visible', x: 0, y: 0, scale: 1 })
                phaseRef.current = 'detail'
            }
            return
        }

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
                onComplete: () => { phaseRef.current = 'detail' }
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
            phaseRef.current = 'detail'
        }

        gsap.fromTo(
            root.querySelectorAll('[data-detail-reveal]'),
            { y: duration > 0 ? 24 : 0, opacity: 0, filter: motionPolicy.blurEntrance ? 'blur(8px)' : 'none' },
            { y: 0, opacity: 1, filter: 'none', duration: duration > 0 ? 0.9 : 0, ease: 'power4.out', stagger: duration > 0 ? 0.05 : 0, delay: duration > 0 ? 0.25 : 0 }
        )
    }, [detailIdx, detailElement, isMobile, motionPolicy.sharedElementDuration, motionPolicy.blurEntrance])

    const activeLogicalIdx = ((activeIdx % N) + N) % N
    const mobileSelectedProjectIndex = PROJECT_ITEMS.findIndex(project => project.id === folioItems[activeLogicalIdx]?.id)

    const selectMobileLogicalItem = (logicalIndex: number) => {
        if (phaseRef.current === 'closing') finalizeClose()
        if (phaseRef.current !== 'idle') return false

        const renderedIndex = POS_MIN + logicalIndex
        gsap.killTweensOf(navProxyRef.current)
        navigatingRef.current = false
        posRef.current = targetPosRef.current = renderedIndex
        activeIdxRef.current = renderedIndex
        setActiveIdx(renderedIndex)
        renderReelRef.current()
        return true
    }

    const selectMobileProject = (projectIndex: number) => {
        if (PROJECT_ITEMS.length === 0) return
        const wrappedIndex = (projectIndex + PROJECT_ITEMS.length) % PROJECT_ITEMS.length
        const logicalIndex = folioItems.findIndex(item => item.id === PROJECT_ITEMS[wrappedIndex].id)
        if (logicalIndex >= 0) selectMobileLogicalItem(logicalIndex)
    }

    const openMobileDetails = (projectIndex: number) => {
        if (PROJECT_ITEMS.length === 0) return
        const wrappedIndex = (projectIndex + PROJECT_ITEMS.length) % PROJECT_ITEMS.length
        const logicalIndex = folioItems.findIndex(item => item.id === PROJECT_ITEMS[wrappedIndex].id)
        if (logicalIndex < 0 || !selectMobileLogicalItem(logicalIndex)) return
        openDetailFromActiveAt(POS_MIN + logicalIndex)
    }

    return (
        <section
            ref={sectionRef}
            aria-label='Selected work'
            className='folio-reel relative h-[100dvh] w-full select-none overflow-hidden bg-background'
            style={INITIAL_STYLE}
        >
            <div aria-hidden className='absolute inset-x-0 top-0 z-[9] h-20 bg-background md:hidden' />

            <div
                data-chrome
                className='absolute left-6 top-5 z-10 md:left-12 md:top-10'
            >
                <h1 className='text-sm font-semibold text-foreground'><button type='button' onClick={() => viewportIsMobile ? selectMobileLogicalItem(ABOUT_LOGICAL_IDX) : navigateAndOpen(LANDING_POS)}>Bennett Payoyo</button></h1>
                <p className='mt-1 text-xs text-muted-foreground'>2nd year BSCS · PUP</p>
                <a href={CONTACT_LINKS.email} className='cursor-target mt-1 hidden w-fit text-xs text-muted-foreground underline-offset-4 hover:underline md:block'>Contact</a>
            </div>

            <div
                data-chrome
                className='pointer-events-none absolute right-6 top-14 z-10 hidden items-center gap-3 md:right-12 md:top-10 md:flex'
            >
                <span ref={counterRef} className='font-mono text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground tabular-nums'>
                    {activeGroupPosition.group === 'work' ? 'Work' : 'Profile'} {String(activeGroupPosition.index).padStart(2, '0')}
                    <span className='mx-1.5 opacity-40'>/</span>
                    {String(activeGroupPosition.total).padStart(2, '0')}
                </span>

                <span className='hidden h-px w-8 bg-foreground/30 md:block' />
            </div>

            <div
                className='reel-titles absolute left-0 z-[1] w-full overflow-clip md:w-1/2'
                style={{ maskImage: MASK_GRADIENT, WebkitMaskImage: MASK_GRADIENT }}
            >
                <div ref={titleRevealRef} className='absolute inset-0'>
                    <div ref={titleStripRef} className='reel-title-strip absolute inset-x-0 top-0 will-change-transform'>
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
                                    aria-current={isCanonical && i % N === activeIdx % N ? 'true' : undefined}
                                    aria-label={`View ${item.title}`}
                                    onFocus={() => navigateAndOpen(i, false)}
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
                                    className='reel-title cursor-target flex cursor-pointer items-center justify-center rounded-lg px-6 text-center outline-none focus-visible:ring-1 focus-visible:ring-foreground/40 md:justify-start md:gap-4 md:pl-12 md:pr-8 md:text-left lg:pl-20'
                                    style={{ '--title-scale': TITLE_REGISTER[getGroup(item)].scale } as CSSProperties}
                                >
                                    <div className={cn(profile && 'flex flex-col gap-1')}>
                                        {profile && <span className='font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/65'>Profile · {String(groupPosition.index).padStart(2, '0')}</span>}
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
                className='reel-images absolute left-0 w-full overflow-clip md:left-auto md:right-0 md:w-1/2'
            >
                <div ref={imageRevealRef} className='absolute inset-0'>
                    <div ref={imageStripRef} className='reel-image-strip absolute inset-x-0 top-0 will-change-transform'>
                        {RENDERED_ITEMS.map((item, i) => {
                            const presentation = getPreviewPresentation(
                                item,
                                i,
                                activeIdx,
                                settledRenderedIdx,
                                interactingRenderedIdx,
                                liveMountEnabled && detailIdx === null && !viewportIsMobile
                            )

                            return (
                                <div
                                    key={i}
                                    aria-hidden={i !== activeIdx}
                                    className='reel-image-slot absolute inset-x-0 flex items-center justify-center'
                                    style={{ '--slot': RENDERED - 1 - i } as CSSProperties}
                                >
                                    <div
                                        ref={(el) => {
                                            slotRefs.current[i] = el
                                        }}
                                        onClick={() => {
                                            if (interactingRenderedIdx === null) navigateAndOpen(i)
                                        }}
                                        className='reel-card cursor-target relative overflow-hidden rounded-2xl bg-muted'
                                        data-kind={item.kind}
                                        style={{ opacity: i === LANDING_POS ? 1 : 0.78, aspectRatio: '4 / 5', willChange: 'transform, opacity' }}
                                    >
                                        <div className='h-full' inert={i !== activeIdx || detailIdx !== null}>
                                        <FolioPreview
                                            item={item}
                                            presentation={presentation}
                                            github={github}
                                            mode='reel'
                                            renderedIndex={i}
                                            activeIndex={activeIdx}
                                            settledIndex={settledRenderedIdx}
                                            liveMountEnabled={liveMountEnabled && detailIdx === null}
                                            onInteract={() => setInteractingRenderedIdx(reduceInteraction(interactingRenderedIdx, { type: 'enter', renderedIndex: i }))}
                                            onExitInteract={() => setInteractingRenderedIdx(reduceInteraction(interactingRenderedIdx, { type: 'exit' }))}
                                            onOpenDetails={() => navigateAndOpen(i)}
                                        />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {isMobile && (
                <>
                    <MobileGallery
                        projects={PROJECT_ITEMS}
                        profile={PROFILE_ITEM}
                        selectedProjectIndex={mobileSelectedProjectIndex < 0 ? null : mobileSelectedProjectIndex}
                        resumeUrl={RESUME_ITEM.pdfUrl}
                        githubUrl={GITHUB_ITEM.profileUrl}
                        reducedMotion={prefersReducedMotion}
                        onProjectChange={selectMobileProject}
                        onShowProfile={() => selectMobileLogicalItem(ABOUT_LOGICAL_IDX)}
                        onOpenDetails={openMobileDetails}
                        onOpenContact={() => setContactOpen(true)}
                        onFocusTarget={target => { mobileFocusRef.current = target }}
                    />
                    <ContactSheet open={contactOpen} onOpenChange={setContactOpen} />
                </>
            )}

            {detailItem &&
                (() => {
                    const it = detailItem

                    const backBtn = (
                        <button
                            data-detail-reveal
                            type='button'
                            onClick={event => {
                                event.stopPropagation()
                                handleClose()
                            }}
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
                                    <Button render={<a href={it.profileUrl} target='_blank' rel='noreferrer' />} nativeButton={false} variant='solid' size='pill' className='w-fit transition-transform hover:-translate-y-0.5'>
                                        Open GitHub profile
                                        <ArrowUpRight className='size-3.5' />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )

                    return (
                        <DialogPrimitive.Root open onOpenChange={open => { if (!open) handleClose() }}>
                        <DialogPrimitive.Portal container={sectionRef}>
                        <DialogPrimitive.Popup
                            ref={setDetailElement}
                            finalFocus={() => viewportIsMobile ? mobileFocusRef.current : titleRefs.current[activeIdxRef.current]}
                            aria-labelledby='detail-title'
                            className='absolute inset-0 z-30 m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-0 text-foreground outline-none'
                            onClick={handleClose}
                        >
                            <div data-detail-scrim className='absolute inset-0 bg-background' style={{ opacity: 0 }} />

                            {viewportIsMobile ? (
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
                                            id='detail-title'
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
                                            id='detail-title'
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
                        </DialogPrimitive.Popup>
                        </DialogPrimitive.Portal>
                        </DialogPrimitive.Root>
                    )
                })()}
        </section>
    )
}
