import type { FC, ReactNode } from 'react'
import type { FrameJob } from '@/lib/frame'

import { useEffect, useRef } from 'react'
import Lenis from 'lenis'

import { addLoop, setBeforeFrame } from '@/lib/frame'
import { finePointer, prefersReducedMotion, richMotion } from '@/lib/motion'

// Every click shifts the one accent body to the next colour; ink text stays legible on all three.
const ACCENTS = [
    { base: '#ff5b2e', hot: '#ff7a52', muted: '#3b1a0f' },
    { base: '#5b8cff', hot: '#7da3ff', muted: '#0f1d3b' },
    { base: '#e0a82e', hot: '#ebbd55', muted: '#3b2a07' }
]

const CAPTURE_PX = 130
const RELEASE_PX = 210
const RELEASE_HOLD_MS = 320
const INERTIA = 8
const REST_MS = 420

const distanceToRect = (rect: DOMRect, x: number, y: number) => {
    const dx = Math.max(rect.left - x, 0, x - rect.right)
    const dy = Math.max(rect.top - y, 0, y - rect.bottom)

    return Math.hypot(dx, dy)
}

// A trailing cursor body. Calls to action carry gravity: come close and the cursor is captured.
const GravityCursor: FC = (): ReactNode => {
    const rootRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const root = rootRef.current
        if (!root || !finePointer() || prefersReducedMotion()) return

        let targetX = 0
        let targetY = 0
        let x = 0
        let y = 0
        let known = false
        let last = 0
        let well: HTMLElement | null = null
        let releaseTimer = 0
        let restTimer = 0
        let downX = 0
        let downY = 0

        // Wells are static page elements: collect them once.
        const wells = Array.from(document.querySelectorAll<HTMLElement>('[data-gravity-well]'))
        let nearest: HTMLElement | null = null
        let nearestDistance = Infinity
        let wellRect: DOMRect | null = null
        let captureDirty = false
        let onAccent = false
        let pointerMoved = false
        let skip = 0
        let stop: (() => void) | null = null

        const readCapture = () => {
            nearest = null
            nearestDistance = Infinity
            for (const node of wells) {
                if (node.offsetParent === null) continue
                const rect = node.getBoundingClientRect()
                if (rect.width === 0) continue
                const distance = distanceToRect(rect, targetX, targetY)
                if (distance < nearestDistance) {
                    nearest = node
                    nearestDistance = distance
                }
            }
            wellRect = well && well.offsetParent ? well.getBoundingClientRect() : null
        }

        const applyCapture = () => {
            if (nearest && nearestDistance <= CAPTURE_PX) {
                window.clearTimeout(releaseTimer)
                releaseTimer = 0
                well = nearest
            } else if (well && !releaseTimer) {
                const current = wellRect ? distanceToRect(wellRect, targetX, targetY) : Infinity
                if (current > RELEASE_PX) {
                    releaseTimer = window.setTimeout(() => {
                        releaseTimer = 0
                        well = null
                        root.classList.remove('is-captured')
                        wake()
                    }, RELEASE_HOLD_MS)
                }
            }
            root.classList.toggle('is-captured', !!well)
        }

        const job: FrameJob = {
            read: () => {
                if (captureDirty) readCapture()
                else if (well) wellRect = well.getBoundingClientRect()
                // The inversion eases over 0.3s, so while only the page scrolls a sparser hit test is invisible.
                if (pointerMoved || skip-- <= 0) {
                    pointerMoved = false
                    skip = 2
                    const under = document.elementFromPoint(x, y)
                    onAccent = !!under?.closest('.tone-ember, [data-cursor-invert]')
                }
            },
            write: () => {
                if (captureDirty) {
                    captureDirty = false
                    applyCapture()
                }
                const now = performance.now()
                const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
                last = now
                const k = Math.min(1, dt * INERTIA)
                const tx = well && wellRect ? wellRect.left + wellRect.width / 2 : targetX
                const ty = well && wellRect ? wellRect.bottom + 16 : targetY
                const dx = tx - x
                const dy = ty - y
                x += dx * k
                y += dy * k
                root.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
                root.classList.toggle('is-on-accent', onAccent)
                if (Math.abs(dx) <= 0.3 && Math.abs(dy) <= 0.3) {
                    stop?.()
                    stop = null
                    last = 0
                }
            }
        }

        const wake = () => {
            if (stop) return
            last = 0
            stop = addLoop(job)
        }

        const scheduleRest = () => {
            window.clearTimeout(restTimer)
            root.classList.remove('is-resting')
            restTimer = window.setTimeout(() => {
                root.classList.toggle('is-left', targetX > window.innerWidth - 220)
                root.classList.add('is-resting')
            }, REST_MS)
        }

        const onMove = (event: PointerEvent) => {
            if (event.pointerType === 'touch') return
            targetX = event.clientX
            targetY = event.clientY
            if (!known) {
                known = true
                x = targetX
                y = targetY
            }
            root.classList.add('is-live')
            pointerMoved = true
            readCapture()
            applyCapture()
            if (well) window.clearTimeout(restTimer)
            else scheduleRest()
            wake()
        }

        const onDown = (event: PointerEvent) => {
            downX = event.clientX
            downY = event.clientY
            root.classList.remove('is-resting')
        }

        // Inside the capture field a click anywhere lands on the well.
        const onClick = (event: MouseEvent) => {
            if (event.button !== 0 || !well) return
            if (Math.abs(event.clientX - downX) > 8 || Math.abs(event.clientY - downY) > 8) return
            if ((event.target as HTMLElement).closest('a, button, input, [role="button"]')) return
            if (distanceToRect(well.getBoundingClientRect(), event.clientX, event.clientY) > CAPTURE_PX) return
            event.preventDefault()
            event.stopPropagation()
            well.click()
        }

        const onLeave = () => root.classList.remove('is-live', 'is-resting')
        const onScroll = () => {
            captureDirty = true
            wake()
        }

        window.addEventListener('pointermove', onMove, { passive: true })
        window.addEventListener('pointerdown', onDown, { passive: true })
        window.addEventListener('click', onClick, true)
        window.addEventListener('scroll', onScroll, { passive: true })
        document.documentElement.addEventListener('pointerleave', onLeave)

        return () => {
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerdown', onDown)
            window.removeEventListener('click', onClick, true)
            window.removeEventListener('scroll', onScroll)
            document.documentElement.removeEventListener('pointerleave', onLeave)
            window.clearTimeout(releaseTimer)
            window.clearTimeout(restTimer)
            stop?.()
        }
    }, [])

    return (
        <div ref={rootRef} aria-hidden className='gravity-cursor'>
            <span className='gravity-cursor-dot' />
            <span className='gravity-cursor-arrow'>
                <svg viewBox='0 0 24 24' className='arrow-left'><path d='M15 5 8 12l7 7' /></svg>
                <svg viewBox='0 0 24 24' className='arrow-right'><path d='m9 5 7 7-7 7' /></svg>
            </span>
            <span className='gravity-cursor-text'>click to pull</span>
        </div>
    )
}

export const Effects: FC = (): ReactNode => {
    useEffect(() => {
        const root = document.documentElement
        const reduced = prefersReducedMotion()

        root.classList.toggle('js-motion', !reduced)
        root.classList.toggle('rich-motion', richMotion())

        let accent = 0
        const onClick = (event: MouseEvent) => {
            if (event.button !== 0) return
            accent = (accent + 1) % ACCENTS.length
            const next = ACCENTS[accent]
            root.style.setProperty('--ember', next.base)
            root.style.setProperty('--ember-hot', next.hot)
            root.style.setProperty('--muted-on-ember', next.muted)
        }
        document.addEventListener('click', onClick)

        let lenis: Lenis | undefined
        if (!reduced) {
            lenis = new Lenis({
                duration: 1.05,
                smoothWheel: true,
                syncTouch: false,
                anchors: true,
                autoRaf: false,
                prevent: node => node.hasAttribute('data-lenis-prevent')
            })
            const smooth = lenis
            setBeforeFrame(time => smooth.raf(time))
        }

        return () => {
            document.removeEventListener('click', onClick)
            setBeforeFrame(null)
            lenis?.destroy()
        }
    }, [])

    return <GravityCursor />
}
