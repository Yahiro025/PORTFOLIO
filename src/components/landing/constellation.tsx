import type { ComponentType, FC, ReactNode, Ref } from 'react'
import type { FrameJob } from '@/lib/frame'

import { useEffect, useRef, useState } from 'react'

import { ArrowUpRight, BellRing } from 'lucide-react'

import { cn } from '@/lib/utils'
import { addLoop, requestFrame } from '@/lib/frame'
import { finePointer, isLowPowerDevice, prefersReducedMotion, richMotion } from '@/lib/motion'
import { OPEN_SOURCE_PR_COUNT, OPEN_SOURCE_REPO_COUNT, OPEN_SOURCE_STARS, openSource } from '@/constants/folio'

const mark = (d: string): FC<{ className?: string }> => ({ className }) => (
    <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden className={className}>
        <path d={d} />
    </svg>
)

const PrettierMark = mark('M8.571 23.429A.571.571 0 0 1 8 24H2.286a.571.571 0 0 1 0-1.143H8c.316 0 .571.256.571.572zM8 20.57H6.857a.571.571 0 0 0 0 1.143H8a.571.571 0 0 0 0-1.143zm-5.714 1.143H4.57a.571.571 0 0 0 0-1.143H2.286a.571.571 0 0 0 0 1.143zM8 18.286H2.286a.571.571 0 0 0 0 1.143H8a.571.571 0 0 0 0-1.143zM16 16H5.714a.571.571 0 0 0 0 1.143H16A.571.571 0 0 0 16 16zM2.286 17.143h1.143a.571.571 0 0 0 0-1.143H2.286a.571.571 0 0 0 0 1.143zm17.143-3.429H16a.571.571 0 0 0 0 1.143h3.429a.571.571 0 0 0 0-1.143zM9.143 14.857h4.571a.571.571 0 0 0 0-1.143H9.143a.571.571 0 0 0 0 1.143zm-6.857 0h4.571a.571.571 0 0 0 0-1.143H2.286a.571.571 0 0 0 0 1.143zM20.57 11.43H11.43a.571.571 0 0 0 0 1.142h9.142a.571.571 0 0 0 0-1.142zM9.714 12a.571.571 0 0 0-.571-.571H5.714a.571.571 0 0 0 0 1.142h3.429A.571.571 0 0 0 9.714 12zm-7.428.571h1.143a.571.571 0 0 0 0-1.142H2.286a.571.571 0 0 0 0 1.142zm19.428-3.428H16a.571.571 0 0 0 0 1.143h5.714a.571.571 0 0 0 0-1.143zM2.286 10.286H8a.571.571 0 0 0 0-1.143H2.286a.571.571 0 0 0 0 1.143zm13.143-2.857c0 .315.255.571.571.571h5.714a.571.571 0 0 0 0-1.143H16a.571.571 0 0 0-.571.572zm-8.572-.572a.571.571 0 0 0 0 1.143H8a.571.571 0 0 0 0-1.143H6.857zM2.286 8H4.57a.571.571 0 0 0 0-1.143H2.286a.571.571 0 0 0 0 1.143zm16.571-2.857c0 .315.256.571.572.571h1.142a.571.571 0 0 0 0-1.143H19.43a.571.571 0 0 0-.572.572zm-1.143 0a.571.571 0 0 0-.571-.572H12.57a.571.571 0 0 0 0 1.143h4.572a.571.571 0 0 0 .571-.571zm-15.428.571h8a.571.571 0 0 0 0-1.143h-8a.571.571 0 0 0 0 1.143zm5.143-2.857c0 .316.255.572.571.572h11.429a.571.571 0 0 0 0-1.143H8a.571.571 0 0 0-.571.571zm-5.143.572h3.428a.571.571 0 0 0 0-1.143H2.286a.571.571 0 0 0 0 1.143zm0-2.286H16A.571.571 0 0 0 16 0H2.286a.571.571 0 0 0 0 1.143z')
const PnpmMark = mark('M0 0v7.5h7.5V0zm8.25 0v7.5h7.498V0zm8.25 0v7.5H24V0zM2 2h3.5v3.5H2zm8.25 0h3.498v3.5H10.25zm8.25 0H22v3.5h-3.5zM8.25 8.25v7.5h7.498v-7.5zm8.25 0v7.5H24v-7.5zm2 2H22v3.5h-3.5zM0 16.5V24h7.5v-7.5zm8.25 0V24h7.498v-7.5zm8.25 0V24H24v-7.5z')
const HonoMark = mark('M12.445.002a45.529 45.529 0 0 0-5.252 8.146 8.595 8.595 0 0 1-.555-.53 27.796 27.796 0 0 0-1.205-1.542 8.762 8.762 0 0 0-1.251 2.12 20.743 20.743 0 0 0-1.448 5.88 8.867 8.867 0 0 0 .338 3.468c1.312 3.48 3.794 5.593 7.445 6.337 3.055.438 5.755-.333 8.097-2.312 2.677-2.59 3.359-5.634 2.047-9.132a33.287 33.287 0 0 0-2.988-5.59A91.34 91.34 0 0 0 12.615.053a.216.216 0 0 0-.17-.051Zm-.336 3.906a50.93 50.93 0 0 1 4.794 6.552c.448.767.817 1.57 1.108 2.41.606 2.386-.044 4.354-1.951 5.904-1.845 1.298-3.87 1.683-6.072 1.156-2.376-.737-3.75-2.335-4.121-4.794a5.107 5.107 0 0 1 .242-2.266c.358-.908.79-1.774 1.3-2.601l1.446-2.121a397.33 397.33 0 0 0 3.254-4.24Z')
const HotwireMark = mark('m16.764 6.917-3.48.81L16.32 0 7.236 11.705l4.334-.854-4.087 7.982 2.364-.532L7.456 24l7.51-8.111-2.77.64 4.568-9.612z')
const SolidMark = mark('M11.558.788A9.082 9.082 0 0 0 9.776.99l-.453.15c-.906.303-1.656.755-2.1 1.348l-.301.452-2.035 3.528c.426-.387.974-.698 1.643-.894h.001l.613-.154h.001a8.82 8.82 0 0 1 1.777-.206c2.916-.053 6.033 1.148 8.423 2.36 2.317 1.175 3.888 2.32 3.987 2.39L24 5.518c-.082-.06-1.66-1.21-3.991-2.386-2.393-1.206-5.521-2.396-8.45-2.343zM8.924 5.366a8.634 8.634 0 0 0-1.745.203l-.606.151c-1.278.376-2.095 1.16-2.43 2.108-.334.948-.188 2.065.487 3.116.33.43.747.813 1.216 1.147L12.328 10h.001a6.943 6.943 0 0 1 6.013 1.013l2.844-.963c-.17-.124-1.663-1.2-3.91-2.34-2.379-1.206-5.479-2.396-8.352-2.344zm5.435 4.497a6.791 6.791 0 0 0-1.984.283L2.94 13.189 0 18.334l9.276-2.992a6.945 6.945 0 0 1 7.408 2.314v.001c.695.903.89 1.906.66 2.808l2.572-4.63c.595-1.041.45-2.225-.302-3.429a6.792 6.792 0 0 0-5.255-2.543zm-3.031 5.341a6.787 6.787 0 0 0-2.006.283L.008 18.492c.175.131 2.02 1.498 4.687 2.768 2.797 1.332 6.37 2.467 9.468 1.712l.454-.152h.002c1.278-.376 2.134-1.162 2.487-2.09.353-.93.207-2.004-.541-2.978a6.791 6.791 0 0 0-5.237-2.548z')
const LeafletMark = mark('M17.69 0c-.355.574-8.432 4.74-10.856 8.649-2.424 3.91-3.116 6.988-2.237 9.882.879 2.893 2.559 2.763 3.516 3.717.958.954 2.257 2.113 4.332 1.645 2.717-.613 5.335-2.426 6.638-7.508 1.302-5.082.448-9.533-.103-11.99A35.395 35.395 0 0 0 17.69 0zm-.138.858l-9.22 21.585-.574-.577Z')

type Variant = 'accent' | 'ink' | 'ring'

interface OrbitNode {
    radius: number
    duration: number
    restAngle: number
    size: number
    variant: Variant
    icon: ComponentType<{ className?: string }>
    label?: string
    moon?: number
}

// Flagship labelled tracks sit on the inner rings; the outer rings carry unlabelled OSS project marks.
const NODES: OrbitNode[] = [
    { radius: 130, duration: 12, restAngle: -42, size: 25, variant: 'accent', icon: PrettierMark, label: 'prettier #20015' },
    { radius: 195, duration: 21.6, restAngle: 28, size: 20, variant: 'ink', icon: PnpmMark, label: 'pnpm #14878', moon: 18 },
    { radius: 285, duration: 24, restAngle: -132, size: 18, variant: 'accent', icon: HonoMark, label: 'hono #5423' },
    { radius: 355, duration: 27, restAngle: 118, size: 26, variant: 'ring', icon: BellRing, label: 'tabby #11651' },
    { radius: 425, duration: 36, restAngle: -12, size: 19, variant: 'ring', icon: HotwireMark },
    { radius: 480, duration: 54, restAngle: -86, size: 25, variant: 'ink', icon: SolidMark, moon: 14.4 },
    { radius: 540, duration: 72, restAngle: 156, size: 26, variant: 'ring', icon: LeafletMark, moon: 43.2 }
]
const RINGS = [130, 195, 285, 355, 425, 480, 540]
const CASES = 'Tabby · Prettier · Leaflet · Swiper · Tiptap · Marked · pnpm · Solid · Hono · Actual · Immer · Plotly.js · Shiki · Undici · Turbo · TypeScript · Rust · '
const LINK_REACH = 0.5
const LINK_STRENGTH = 0.5

const formatDate = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

const formatStars = (count: number) => count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count)

const Dot: FC<{ dotRef?: Ref<HTMLSpanElement> }> = ({ dotRef }): ReactNode => (
    <span ref={dotRef} aria-hidden className='cn-dot ml-[0.06em] inline-block size-[0.3em] rounded-full bg-ember' />
)

export const Constellation: FC = (): ReactNode => {
    const [activeId, setActiveId] = useState('prettier')
    const [centerOpen, setCenterOpen] = useState(false)
    const sectionRef = useRef<HTMLElement>(null)
    const stickyRef = useRef<HTMLDivElement>(null)
    const fieldRef = useRef<HTMLDivElement>(null)
    const plexusRef = useRef<HTMLCanvasElement>(null)
    const casesRef = useRef<HTMLCanvasElement>(null)
    const guestRef = useRef<HTMLDivElement>(null)
    const centerRef = useRef<HTMLDivElement>(null)
    const titleRef = useRef<HTMLHeadingElement>(null)
    const titleDotRef = useRef<HTMLSpanElement>(null)

    // The system is born once visible, and rests while off-screen.
    useEffect(() => {
        const section = sectionRef.current
        const field = fieldRef.current
        if (!section || !field) return
        const rich = richMotion()

        const visibility = new IntersectionObserver(([entry]) => {
            field.classList.toggle('is-paused', !entry.isIntersecting)
        }, { rootMargin: '20% 0px' })
        visibility.observe(section)

        let top = 0
        const bornJob: FrameJob = {
            read: () => {
                top = section.getBoundingClientRect().top
            },
            write: () => {
                const born = rich ? top < window.innerHeight * 0.05 : top < window.innerHeight * 0.7
                field.classList.toggle('is-born', born)
            }
        }
        const check = () => requestFrame(bornJob)
        let inRange = false
        const onScroll = () => {
            if (inRange) check()
        }
        const range = new IntersectionObserver(([entry]) => {
            inRange = entry.isIntersecting
            check()
        }, { rootMargin: '60% 0px' })
        range.observe(section)
        window.addEventListener('scroll', onScroll, { passive: true })

        return () => {
            visibility.disconnect()
            range.disconnect()
            window.removeEventListener('scroll', onScroll)
        }
    }, [])

    // Plexus: faint lines between bodies that drift within reach, the cursor included.
    useEffect(() => {
        const sticky = stickyRef.current
        const field = fieldRef.current
        const canvas = plexusRef.current
        if (!sticky || !field || !canvas || prefersReducedMotion() || isLowPowerDevice()) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Tracks carry their orbit radius and period, so positions derive without a layout read.
        const tracks = Array.from(field.querySelectorAll<HTMLElement>('[data-track]')).map(el => ({
            el,
            radius: Number(el.style.getPropertyValue('--r')),
            duration: Number(el.dataset.dur)
        }))
        const guestTrack = field.querySelector<HTMLElement>('[data-guest-track]')
        const ink = getComputedStyle(sticky).getPropertyValue('--ink').trim() || '#0e0e0d'

        let pointer: { x: number; y: number } | null = null
        const onMove = (event: PointerEvent) => {
            pointer = { x: event.clientX, y: event.clientY }
        }
        const onLeave = () => {
            pointer = null
        }
        const fine = finePointer()
        if (fine) {
            sticky.addEventListener('pointermove', onMove, { passive: true })
            sticky.addEventListener('pointerleave', onLeave)
        }

        let boxLeft = 0
        let boxTop = 0
        let boxWidth = 0
        let boxHeight = 0
        let fieldHeight = 0
        let reach = 0
        // The sticky box only moves while it is still in flow, so its rect survives until a scroll or resize.
        let stop: (() => void) | null = null
        let layoutDirty = true
        const onLayout = () => {
            if (!stop) return
            layoutDirty = true
        }
        window.addEventListener('scroll', onLayout, { passive: true })
        window.addEventListener('resize', onLayout, { passive: true })

        const angleAt = (el: HTMLElement | null): number => {
            const current = el?.getAnimations()[0]?.currentTime
            const time = typeof current === 'number' ? current : 0
            const duration = Number(el?.dataset.dur) || 1

            return (time / 1000 / duration) * Math.PI * 2
        }

        let points: { x: number; y: number }[] = []
        let live = false
        let due = false
        let skip = 0
        const plexusJob: FrameJob = {
            read: () => {
                live = !field.classList.contains('is-paused') && field.classList.contains('is-born')
                if (!live) return
                if (layoutDirty) {
                    layoutDirty = false
                    const box = sticky.getBoundingClientRect()
                    boxLeft = box.left
                    boxTop = box.top
                    boxWidth = box.width
                    boxHeight = box.height
                    fieldHeight = field.getBoundingClientRect().height
                    reach = fieldHeight * LINK_REACH
                    const dpr = Math.min(window.devicePixelRatio || 1, 2)
                    const width = Math.round(boxWidth * dpr)
                    const height = Math.round(boxHeight * dpr)
                    // Resizing the backing store clears it, so only touch it when the box really changed.
                    if (canvas.width !== width || canvas.height !== height) {
                        canvas.width = width
                        canvas.height = height
                        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
                        ctx.strokeStyle = ink
                        ctx.lineWidth = 1
                    }
                }
                // Orbit periods run 12s to 72s: a 20Hz sample moves under 2px, so two frames in three are wasted.
                due = skip++ % 3 === 0
                if (!due) return
                const cx = boxWidth / 2
                const cy = boxHeight / 2
                const scale = fieldHeight / 640
                points = []
                for (const track of tracks) {
                    const a = angleAt(track.el)
                    points.push({ x: cx + Math.cos(a) * track.radius * scale, y: cy + Math.sin(a) * track.radius * scale })
                }
                if (guestRef.current?.classList.contains('is-in')) {
                    const a = angleAt(guestTrack)
                    points.push({ x: cx + Math.cos(a) * 165 * scale, y: cy + Math.sin(a) * 165 * scale })
                }
                points.push({ x: cx, y: cy })
                if (pointer) points.push({ x: pointer.x - boxLeft, y: pointer.y - boxTop })
            },
            write: () => {
                if (!live || !due) return
                ctx.clearRect(0, 0, boxWidth, boxHeight)
                for (let a = 0; a < points.length; a++) {
                    for (let b = a + 1; b < points.length; b++) {
                        const d = Math.hypot(points[b].x - points[a].x, points[b].y - points[a].y)
                        if (d < 16 || d >= reach) continue
                        const t = 1 - d / reach
                        ctx.globalAlpha = t * Math.sqrt(t) * LINK_STRENGTH
                        ctx.beginPath()
                        ctx.moveTo(points[a].x, points[a].y)
                        ctx.lineTo(points[b].x, points[b].y)
                        ctx.stroke()
                    }
                }
                ctx.globalAlpha = 1
            }
        }
        // Lines are drawn only while the section is on screen.
        const visible = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !stop) {
                layoutDirty = true
                stop = addLoop(plexusJob)
            } else if (!entry.isIntersecting && stop) {
                stop()
                stop = null
            }
        }, { rootMargin: '20% 0px' })
        visible.observe(sticky)

        return () => {
            stop?.()
            visible.disconnect()
            sticky.removeEventListener('pointermove', onMove)
            sticky.removeEventListener('pointerleave', onLeave)
            window.removeEventListener('scroll', onLayout)
            window.removeEventListener('resize', onLayout)
        }
    }, [])

    // Circular case list: drawn once into a canvas, rotated by the compositor.
    useEffect(() => {
        const field = fieldRef.current
        const canvas = casesRef.current
        if (!field || !canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        let disposed = false

        const draw = () => {
            if (disposed) return
            const size = field.getBoundingClientRect().width
            if (!size) return
            const dpr = isLowPowerDevice() ? 1 : 2
            canvas.width = Math.round(size * dpr)
            canvas.height = canvas.width
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.clearRect(0, 0, size, size)
            const style = getComputedStyle(field)
            const scale = size / 640
            const radius = 240 * scale
            const circumference = Math.PI * 2 * radius
            const chars = Array.from(CASES.repeat(2))
            const font = 9 * scale
            const family = style.fontFamily || 'sans-serif'
            ctx.fillStyle = style.getPropertyValue('--ink').trim() || '#0e0e0d'
            ctx.globalAlpha = 0.38
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            const measure = () => chars.map(char => ctx.measureText(char).width)
            const total = (widths: number[]) => widths.reduce((sum, width) => sum + width, 0)
            ctx.font = `400 ${font}px ${family}`
            let widths = measure()
            let advance = total(widths)
            // If the fallback face is wider than the orbit, fit the ring rather than overlap at the seam.
            if (advance > circumference) {
                ctx.font = `400 ${font * (circumference / advance)}px ${family}`
                widths = measure()
                advance = total(widths)
            }
            // Share the leftover arc evenly so the seam closes without touching glyphs.
            const gap = Math.max(0, (circumference - advance) / chars.length)
            ctx.translate(size / 2, size / 2)
            let angle = 0
            for (let i = 0; i < chars.length; i++) {
                const step = ((widths[i] + gap) / circumference) * Math.PI * 2
                angle += step / 2
                ctx.save()
                ctx.rotate(angle)
                ctx.fillText(chars[i], 0, -radius)
                ctx.restore()
                angle += step / 2
            }
        }

        const observer = new ResizeObserver(draw)
        observer.observe(field)
        document.fonts?.ready.then(draw)
        draw()

        return () => {
            disposed = true
            observer.disconnect()
        }
    }, [])

    // The headline's full stop leaves the sentence and joins the orbit as a guest body.
    useEffect(() => {
        const dot = titleDotRef.current
        const guest = guestRef.current
        const title = titleRef.current
        const field = fieldRef.current
        const section = sectionRef.current
        if (!dot || !guest || !title || !field || !section || prefersReducedMotion() || isLowPowerDevice() || window.innerWidth < 640) return

        const fly = document.createElement('div')
        fly.className = 'cn-fly'
        fly.setAttribute('aria-hidden', 'true')
        document.body.appendChild(fly)

        const DURATION = 750
        let state: 'text' | 'out' | 'orbit' | 'back' = 'text'
        let start = 0
        let fromX = 0
        let fromY = 0
        let size = 10
        let raf = 0
        const center = (el: Element) => {
            const r = el.getBoundingClientRect()

            return { x: r.left + r.width / 2, y: r.top + r.height / 2, d: Math.max(r.width, r.height) }
        }
        const place = (x: number, y: number) => {
            fly.style.transform = `translate3d(${(x - size / 2).toFixed(1)}px, ${(y - size / 2).toFixed(1)}px, 0)`
        }
        const step = (now: number) => {
            const t = Math.min(1, (now - start) / DURATION)
            const e = 1 - Math.pow(1 - t, 3)
            const target = state === 'out' ? center(guest) : center(dot)
            place(fromX + (target.x - fromX) * e, fromY + (target.y - fromY) * e)
            if (t < 1) {
                raf = requestAnimationFrame(step)

                return
            }
            raf = 0
            fly.classList.remove('is-flying')
            if (state === 'out') {
                state = 'orbit'
                guest.classList.add('is-in')
            } else {
                state = 'text'
                dot.classList.remove('is-away')
            }
        }
        const launch = (direction: 'out' | 'back') => {
            cancelAnimationFrame(raf)
            const from = direction === 'out' ? center(dot) : center(guest)
            size = Math.max(6, (field.getBoundingClientRect().width / 640) * 12)
            fly.style.width = `${size}px`
            fly.style.height = `${size}px`
            fromX = from.x
            fromY = from.y
            place(fromX, fromY)
            fly.classList.add('is-flying')
            if (direction === 'out') dot.classList.add('is-away')
            else guest.classList.remove('is-in')
            state = direction
            start = performance.now()
            raf = requestAnimationFrame(step)
        }
        let middle = 1
        const flyJob: FrameJob = {
            read: () => {
                const r = title.getBoundingClientRect()
                middle = (r.top + r.bottom) / 2 / window.innerHeight
            },
            write: () => {
                const born = field.classList.contains('is-born')
                if (state === 'text' && born && middle < 0.62) launch('out')
                else if (state === 'orbit' && (!born || middle > 0.72)) launch('back')
            }
        }
        const check = () => requestFrame(flyJob)
        let inRange = false
        const onScroll = () => {
            if (inRange) check()
        }
        const range = new IntersectionObserver(([entry]) => {
            inRange = entry.isIntersecting
            check()
        }, { rootMargin: '60% 0px' })
        range.observe(section)
        window.addEventListener('scroll', onScroll, { passive: true })

        return () => {
            range.disconnect()
            window.removeEventListener('scroll', onScroll)
            cancelAnimationFrame(raf)
            fly.remove()
        }
    }, [])

    // The centre disc opens in place; Escape or an outside press closes it.
    useEffect(() => {
        if (!centerOpen) return
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setCenterOpen(false)
        }
        const onDown = (event: PointerEvent) => {
            if (!centerRef.current?.contains(event.target as Node)) setCenterOpen(false)
        }
        window.addEventListener('keydown', onKey)
        document.addEventListener('pointerdown', onDown)

        return () => {
            window.removeEventListener('keydown', onKey)
            document.removeEventListener('pointerdown', onDown)
        }
    }, [centerOpen])

    return (
        <section ref={sectionRef} id='open-source' data-tone='bone' className='cn-section tone-bone relative'>
            <div ref={stickyRef} className='cn-sticky'>
                <canvas ref={plexusRef} aria-hidden className='cn-plexus pointer-events-none absolute inset-0 size-full' />

                <div className='cn-anchor' aria-hidden>
                    <div ref={fieldRef} className='cn-field is-paused'>
                        <svg viewBox='-320 -320 640 640' className='absolute inset-0 size-full overflow-visible'>
                            {RINGS.map(r => <circle key={r} className='cn-ring' r={r} />)}
                        </svg>

                        <canvas ref={casesRef} aria-hidden className='cn-cases pointer-events-none absolute inset-0 size-full' />

                        <div data-guest-track data-dur='13.5' className='cn-track' style={{ ['--r' as string]: '165', ['--dur' as string]: '13.5s' }}>
                            <div className='cn-offset'>
                                <div ref={guestRef} className='cn-guest' />
                            </div>
                        </div>

                        {NODES.map(node => {
                            const Icon = node.icon

                            return (
                                <div
                                    key={node.radius}
                                    data-track
                                    data-dur={node.duration}
                                    className='cn-track'
                                    style={{
                                        ['--r' as string]: String(node.radius),
                                        ['--s' as string]: String(node.size),
                                        ['--dur' as string]: `${node.duration}s`,
                                        ['--a' as string]: `${node.restAngle}deg`
                                    }}
                                >
                                    <div className='cn-offset'>
                                        <div className='cn-counter' style={{ ['--dur' as string]: `${node.duration}s` }}>
                                            <div aria-hidden className={cn('cn-body', `is-${node.variant}`)}>
                                                <Icon className='size-[48%] stroke-[1.8]' />
                                            </div>
                                            {node.label && <span className='cn-label'>{node.label}</span>}
                                        </div>
                                        {node.moon && (
                                            <div
                                                className='cn-track'
                                                style={{
                                                    ['--r' as string]: String(node.size + 13),
                                                    ['--dur' as string]: `${node.moon}s`
                                                }}
                                            >
                                                <div className='cn-offset'>
                                                    <div className='cn-moon' />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div
                    ref={centerRef}
                    role='button'
                    tabIndex={0}
                    aria-expanded={centerOpen}
                    aria-label='Your team next?'
                    onClick={() => setCenterOpen(open => !open)}
                    onKeyDown={event => {
                        if (event.target !== event.currentTarget) return
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setCenterOpen(open => !open)
                        }
                    }}
                    className={cn(
                        'cn-center absolute left-1/2 top-1/2 z-10 grid place-items-center rounded-full bg-ember text-ink',
                        centerOpen && 'is-open'
                    )}
                >
                    <span className='cn-center-inner flex flex-col items-center text-center opacity-0 pointer-events-none'>
                        <span className='text-small font-bold leading-tight'>Your team next?</span>
                        <a
                            href='#contact'
                            onClick={event => {
                                event.stopPropagation()
                                setCenterOpen(false)
                            }}
                            className='mt-1.5 rounded-full bg-ink px-2.5 py-1 text-micro font-semibold text-bone transition-transform duration-150 hover:-translate-y-px active:scale-[0.97]'
                        >
                            Contact &darr;
                        </a>
                    </span>
                </div>
            </div>

            <div className='cn-flow relative z-20 grid gap-10 px-5 pb-[30svh] sm:px-10 md:grid-cols-12'>
                <h2 ref={titleRef} className='cn-title display text-display font-bold md:col-span-6'>
                    {OPEN_SOURCE_PR_COUNT} merges<Dot dotRef={titleDotRef} />
                    <br />
                    {OPEN_SOURCE_STARS}k stars of pull<Dot />
                </h2>

                <div className='cn-panel tone-ember rounded-[14px] p-6 sm:p-8 md:col-span-6 md:col-start-7 lg:col-span-5 lg:col-start-8'>
                    <p className='text-body leading-relaxed'>
                        {OPEN_SOURCE_PR_COUNT} pull requests merged across {OPEN_SOURCE_REPO_COUNT} open-source repositories with {OPEN_SOURCE_STARS}k combined GitHub stars (Sept–Nov 2026). Each one ships a targeted fix or regression test verified through maintainer review.
                    </p>
                    <ul className='mt-6 flex flex-col border-t border-ink/25'>
                        {openSource.map(repo => {
                            const open = repo.id === activeId

                            return (
                                <li key={repo.id} className='border-b border-ink/25'>
                                    <button
                                        type='button'
                                        aria-expanded={open}
                                        aria-controls={`pr-${repo.id}`}
                                        onClick={() => setActiveId(current => current === repo.id ? '' : repo.id)}
                                        className='flex w-full items-baseline gap-4 py-4 text-left'
                                    >
                                        <span className={cn('size-3 shrink-0 self-center rounded-full border-2 border-ink transition-colors duration-300', open && 'bg-ink')} />
                                        <span className='text-title font-semibold tracking-[-0.02em]'>{repo.project}</span>
                                        <span className='ml-auto font-mono text-data tabular text-muted-ember'>
                                            {repo.prs.length > 1 ? `${repo.prs.length} PRs` : `#${repo.prs[0].number}`} · {formatStars(repo.stars)}
                                        </span>
                                    </button>
                                    <div id={`pr-${repo.id}`} className='expand' data-open={open} inert={!open || undefined} aria-hidden={!open} role='region' aria-label={`${repo.project} pull requests`}>
                                        <div>
                                            <div className='flex flex-col gap-4 pb-6 pl-7'>
                                                <p className='font-mono text-data text-muted-ember'>{repo.repo} · {repo.area}</p>
                                                {repo.prs.map(pr => (
                                                    <div key={pr.number} className='flex flex-col gap-3'>
                                                        <a href={pr.url} target='_blank' rel='noreferrer' className='link-underline inline-flex items-center gap-1 text-body font-semibold leading-snug'>
                                                            #{pr.number} · {pr.title} ({formatDate(pr.mergedAt)})
                                                            <ArrowUpRight className='size-4 shrink-0' aria-hidden />
                                                        </a>
                                                        {pr.points && (
                                                            <ul className='flex flex-col gap-2 text-body'>
                                                                {pr.points.map(point => (
                                                                    <li key={point} className='flex gap-3'>
                                                                        <span aria-hidden className='mt-[0.6em] size-1.5 shrink-0 rounded-full bg-ink' />
                                                                        {point}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            </div>
        </section>
    )
}
