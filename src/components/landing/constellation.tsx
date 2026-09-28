import type { FC, ReactNode, Ref } from 'react'
import type { FrameJob } from '@/lib/frame'

import { useEffect, useRef, useState } from 'react'

import {
    ArrowUpRight,
    BellRing,
    Braces,
    Database,
    GitMerge,
    Network,
    Package,
    Terminal
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { addLoop, requestFrame } from '@/lib/frame'
import { finePointer, prefersReducedMotion, richMotion } from '@/lib/motion'
import { OPEN_SOURCE_STARS, openSource } from '@/constants/folio'

type Variant = 'accent' | 'ink' | 'ring'

interface OrbitNode {
    radius: number
    duration: number
    size: number
    variant: Variant
    icon: typeof Braces
    label?: string
    moon?: number
}

// Inner tracks turn faster; the four merged PRs sit closest to the centre.
const NODES: OrbitNode[] = [
    { radius: 130, duration: 12, size: 25, variant: 'accent', icon: Braces, label: 'prettier #20015' },
    { radius: 195, duration: 21.6, size: 20, variant: 'ink', icon: Package, label: 'pnpm #14878', moon: 18 },
    { radius: 285, duration: 24, size: 18, variant: 'accent', icon: Network, label: 'undici #5819' },
    { radius: 355, duration: 27, size: 26, variant: 'ring', icon: BellRing, label: 'tabby #11651' },
    { radius: 425, duration: 36, size: 19, variant: 'ring', icon: GitMerge },
    { radius: 480, duration: 54, size: 25, variant: 'ink', icon: Database, moon: 14.4 },
    { radius: 540, duration: 72, size: 26, variant: 'ring', icon: Terminal, moon: 43.2 }
]
const RINGS = [130, 195, 285, 355, 425, 480, 540]
const CASES = 'Prettier · pnpm · Tabby · Undici · TypeScript · Rust · Node.js · Electron · HTTP caching · Angular parsing · '
const LINK_REACH = 0.5
const LINK_STRENGTH = 0.5

const formatDate = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

const Dot: FC<{ dotRef?: Ref<HTMLSpanElement> }> = ({ dotRef }): ReactNode => (
    <span ref={dotRef} aria-hidden className='cn-dot ml-[0.06em] inline-block size-[0.3em] rounded-full bg-ember' />
)

export const Constellation: FC = (): ReactNode => {
    const [activeId, setActiveId] = useState('prettier')
    const sectionRef = useRef<HTMLElement>(null)
    const stickyRef = useRef<HTMLDivElement>(null)
    const fieldRef = useRef<HTMLDivElement>(null)
    const plexusRef = useRef<SVGSVGElement>(null)
    const guestRef = useRef<SVGCircleElement>(null)
    const centerRef = useRef<HTMLAnchorElement>(null)
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
        check()
        window.addEventListener('scroll', check, { passive: true })

        return () => {
            visibility.disconnect()
            window.removeEventListener('scroll', check)
        }
    }, [])

    // Plexus: faint lines between bodies that drift within reach, the cursor included.
    useEffect(() => {
        const sticky = stickyRef.current
        const field = fieldRef.current
        const plexus = plexusRef.current
        if (!sticky || !field || !plexus || prefersReducedMotion()) return

        const bodies = () => {
            const list: Element[] = Array.from(field.querySelectorAll('[data-node]'))
            if (guestRef.current?.classList.contains('is-in')) list.push(guestRef.current)
            if (centerRef.current) list.push(centerRef.current)
            const fly = document.querySelector('.cn-fly.is-flying')
            if (fly) list.push(fly)

            return list
        }
        const lines: SVGLineElement[] = []
        const line = (index: number) => {
            if (!lines[index]) {
                const el = document.createElementNS('http://www.w3.org/2000/svg', 'line')
                plexus.appendChild(el)
                lines[index] = el
            }

            return lines[index]
        }

        let pointer: { x: number; y: number } | null = null
        const onMove = (event: PointerEvent) => {
            pointer = { x: event.clientX, y: event.clientY }
        }
        const onLeave = () => {
            pointer = null
        }
        const fine = finePointer()
        if (fine) {
            window.addEventListener('pointermove', onMove, { passive: true })
            document.documentElement.addEventListener('pointerleave', onLeave)
        }

        let points: { x: number; y: number }[] = []
        let reach = 0
        let live = false
        const plexusJob: FrameJob = {
            read: () => {
                live = !field.classList.contains('is-paused') && field.classList.contains('is-born')
                if (!live) return
                const box = sticky.getBoundingClientRect()
                reach = field.getBoundingClientRect().height * LINK_REACH
                points = bodies().map(el => {
                    const r = el.getBoundingClientRect()

                    return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top }
                }).filter(p => p.x > -reach && p.y > -reach && p.x < box.width + reach && p.y < box.height + reach)
                if (pointer) points.push({ x: pointer.x - box.left, y: pointer.y - box.top })
            },
            write: () => {
                if (!live) return
                let n = 0
                for (let a = 0; a < points.length; a++) {
                    for (let b = a + 1; b < points.length; b++) {
                        const d = Math.hypot(points[b].x - points[a].x, points[b].y - points[a].y)
                        if (d < 16 || d >= reach) continue
                        const t = 1 - d / reach
                        const el = line(n++)
                        el.setAttribute('x1', points[a].x.toFixed(1))
                        el.setAttribute('y1', points[a].y.toFixed(1))
                        el.setAttribute('x2', points[b].x.toFixed(1))
                        el.setAttribute('y2', points[b].y.toFixed(1))
                        el.setAttribute('opacity', (t * Math.sqrt(t) * LINK_STRENGTH).toFixed(3))
                    }
                }
                for (let i = n; i < lines.length; i++) lines[i].setAttribute('opacity', '0')
            }
        }
        // Lines are drawn only while the section is on screen.
        let stop: (() => void) | null = null
        const visible = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !stop) stop = addLoop(plexusJob)
            else if (!entry.isIntersecting && stop) {
                stop()
                stop = null
            }
        }, { rootMargin: '20% 0px' })
        visible.observe(sticky)

        return () => {
            stop?.()
            visible.disconnect()
            window.removeEventListener('pointermove', onMove)
            document.documentElement.removeEventListener('pointerleave', onLeave)
        }
    }, [])

    // The headline's full stop leaves the sentence and joins the orbit as a guest body.
    useEffect(() => {
        const dot = titleDotRef.current
        const guest = guestRef.current
        const title = titleRef.current
        const field = fieldRef.current
        if (!dot || !guest || !title || !field || prefersReducedMotion() || window.innerWidth < 640) return

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
            size = Math.max(6, center(guest).d || 10)
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
        window.addEventListener('scroll', check, { passive: true })
        check()

        return () => {
            window.removeEventListener('scroll', check)
            cancelAnimationFrame(raf)
            fly.remove()
        }
    }, [])

    return (
        <section ref={sectionRef} id='open-source' data-tone='bone' className='cn-section tone-bone relative'>
            <div ref={stickyRef} className='cn-sticky'>
                <svg ref={plexusRef} aria-hidden className='cn-plexus pointer-events-none absolute inset-0 size-full' />

                <div className='cn-anchor' aria-hidden>
                    <div ref={fieldRef} className='cn-field is-paused'>
                        <svg viewBox='-320 -320 640 640' className='absolute inset-0 size-full overflow-visible'>
                            {RINGS.map(r => <circle key={r} className='cn-ring' r={r} />)}

                            <g className='cn-track' style={{ ['--dur' as string]: '13.5s' }}>
                                <circle ref={guestRef} className='cn-guest' cx='165' cy='0' r='6' />
                            </g>

                            {NODES.map(node => {
                                const Icon = node.icon

                                return (
                                    <g key={node.radius} className='cn-track' style={{ ['--dur' as string]: `${node.duration}s` }}>
                                        <g transform={`translate(${node.radius},0)`}>
                                            <g className='cn-counter' style={{ ['--dur' as string]: `${node.duration}s` }} data-node>
                                                <circle className={cn('cn-body', `is-${node.variant}`)} r={node.size} />
                                                <Icon
                                                    x={-node.size * 0.48}
                                                    y={-node.size * 0.48}
                                                    width={node.size * 0.96}
                                                    height={node.size * 0.96}
                                                    strokeWidth={1.8}
                                                    className={cn('cn-icon', `is-${node.variant}`)}
                                                />
                                                {node.label && (
                                                    <text className='cn-label' x={node.size + 8} y='4'>{node.label}</text>
                                                )}
                                            </g>
                                            {node.moon && (
                                                <g className='cn-track' style={{ ['--dur' as string]: `${node.moon}s` }}>
                                                    <circle className='cn-moon' cx={node.size + 13} cy='0' r='3.4' />
                                                </g>
                                            )}
                                        </g>
                                    </g>
                                )
                            })}
                        </svg>

                        <svg viewBox='-320 -320 640 640' className='cn-cases absolute inset-0 size-full overflow-visible'>
                            <defs>
                                <path id='cn-cases-path' d='M0,-240 A240,240 0 1,1 0,240 A240,240 0 1,1 0,-240' />
                            </defs>
                            <text className='cn-cases-text'>
                                <textPath href='#cn-cases-path'>{CASES.repeat(2)}</textPath>
                            </text>
                        </svg>
                    </div>
                </div>

                <a
                    ref={centerRef}
                    href='#contact'
                    data-gravity-well
                    className='cn-center absolute left-1/2 top-1/2 z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ember text-ink'
                >
                    <span className='whitespace-nowrap text-small font-bold'>Your team next?</span>
                </a>
            </div>

            <div className='cn-flow relative z-20 grid gap-10 px-5 pb-[30svh] sm:px-10 md:grid-cols-12'>
                <h2 ref={titleRef} className='cn-title display text-display font-bold md:col-span-6'>
                    Four merges<Dot dotRef={titleDotRef} />
                    <br />
                    {OPEN_SOURCE_STARS}k stars of pull<Dot />
                </h2>

                <div className='cn-panel tone-ember rounded-[14px] p-6 sm:p-8 md:col-span-6 md:col-start-7 lg:col-span-5 lg:col-start-8'>
                    <p className='text-body leading-relaxed'>
                        Pull requests merged in September 2026 into open-source projects with {OPEN_SOURCE_STARS}k combined GitHub stars. Each one is a real bug or feature, a regression test, and a round of maintainer review.
                    </p>
                    <ul className='mt-6 flex flex-col border-t border-ink/25'>
                        {openSource.map(pr => {
                            const open = pr.id === activeId

                            return (
                                <li key={pr.id} className='border-b border-ink/25'>
                                    <button
                                        type='button'
                                        aria-expanded={open}
                                        aria-controls={`pr-${pr.id}`}
                                        onClick={() => setActiveId(pr.id)}
                                        className='flex w-full items-baseline gap-4 py-4 text-left'
                                    >
                                        <span className={cn('size-3 shrink-0 self-center rounded-full border-2 border-ink transition-colors duration-300', open && 'bg-ink')} />
                                        <span className='text-title font-semibold tracking-[-0.02em]'>{pr.project}</span>
                                        <span className='ml-auto font-mono text-data tabular text-muted-ember'>#{pr.number} · {pr.stars}k</span>
                                    </button>
                                    <div id={`pr-${pr.id}`} className='expand' data-open={open} role='region' aria-label={`${pr.project} pull request`}>
                                        <div>
                                            <div className='flex flex-col gap-3 pb-6 pl-7'>
                                                <p className='text-lead font-semibold leading-snug'>{pr.title}</p>
                                                <p className='font-mono text-data text-muted-ember'>
                                                    {pr.repo} · merged {formatDate(pr.mergedAt)} · {pr.area}
                                                </p>
                                                <ul className='flex flex-col gap-2 text-body'>
                                                    {pr.points.map(point => (
                                                        <li key={point} className='flex gap-3'>
                                                            <span aria-hidden className='mt-[0.6em] size-1.5 shrink-0 rounded-full bg-ink' />
                                                            {point}
                                                        </li>
                                                    ))}
                                                </ul>
                                                <a href={pr.url} target='_blank' rel='noreferrer' className='link-underline inline-flex w-fit items-center gap-1 font-semibold'>
                                                    Read the merged PR
                                                    <ArrowUpRight className='size-4' aria-hidden />
                                                </a>
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
