import type { FC, ReactNode } from 'react'
import type { FrameJob } from '@/lib/frame'

import { useEffect, useRef, useState } from 'react'

import {
    ArrowUp,
    ArrowUpRight,
    Check,
    Copy,
    Github,
    Linkedin
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { addLoop, requestFrame } from '@/lib/frame'
import { clamp01, prefersReducedMotion } from '@/lib/motion'
import { CONTACT } from '@/constants/folio'

// Orb flight, in viewport heights relative to the ring's centre.
const FLIGHT_MS = 1500
const START_Y = 0.55
const APEX_Y = 0.28
const APEX_AT = 0.62
const R_SMALL = 0.02
const R_LARGE = 0.125

const orbPath = (g: number) => {
    if (g <= APEX_AT) {
        const a = g / APEX_AT

        return START_Y - (START_Y + APEX_Y) * (1 - Math.pow(1 - a, 2))
    }
    const b = (g - APEX_AT) / (1 - APEX_AT)

    return -APEX_Y * (1 - (b < 0.5 ? 2 * b * b : 1 - Math.pow(-2 * b + 2, 2) / 2))
}

const useManilaTime = () => {
    const [time, setTime] = useState<string | null>(null)

    useEffect(() => {
        const format = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: CONTACT.timeZone })
        const update = () => setTime(format.format(new Date()))
        update()
        const timer = window.setInterval(update, 30_000)

        return () => window.clearInterval(timer)
    }, [])

    return time
}

export const Finale: FC = (): ReactNode => {
    const [copy, setCopy] = useState<'idle' | 'done' | 'failed'>('idle')
    const time = useManilaTime()
    const wrapRef = useRef<HTMLElement>(null)
    const groundRef = useRef<HTMLDivElement>(null)
    const ringRef = useRef<HTMLDivElement>(null)
    const orbRef = useRef<HTMLAnchorElement>(null)

    useEffect(() => {
        const wrap = wrapRef.current
        const ground = groundRef.current
        const ring = ringRef.current
        const orb = orbRef.current
        if (!wrap || !ground || !ring || !orb) return
        const reduced = prefersReducedMotion()
        let flightStart = 0
        let stopFlight: (() => void) | null = null

        const setOrb = (g: number) => {
            const vh = window.innerHeight
            orb.style.setProperty('--orb-y', `${(orbPath(g) * vh).toFixed(1)}px`)
            orb.style.setProperty('--orb-r', `${((R_SMALL + (R_LARGE - R_SMALL) * Math.pow(g, 1.6)) * vh).toFixed(1)}px`)
            orb.classList.toggle('is-front', g >= APEX_AT)
            orb.classList.toggle('is-cta', g > 0.86)
        }
        const flightJob: FrameJob = {
            write: () => {
                const g = clamp01((performance.now() - flightStart) / FLIGHT_MS)
                setOrb(g)
                if (g >= 1) {
                    stopFlight?.()
                    stopFlight = null
                }
            }
        }
        const launch = () => {
            if (flightStart) return
            if (reduced) {
                flightStart = 1
                setOrb(1)

                return
            }
            flightStart = performance.now()
            stopFlight = addLoop(flightJob)
        }
        const recall = () => {
            if (!flightStart) return
            stopFlight?.()
            stopFlight = null
            flightStart = 0
            setOrb(0)
        }

        // The horizon bulges as the section arrives: a circular arc across the full width.
        let rect = wrap.getBoundingClientRect()
        let wasFar = false
        const update = () => {
            const vh = window.innerHeight
            const vw = window.innerWidth
            const far = rect.bottom < -vh || rect.top > vh * 2
            if (far && wasFar) return
            wasFar = far
            const t = clamp01((vh * 1.1 - rect.top) / (vh * 0.9))
            const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
            const depth = e * vw * 0.134
            if (depth < 0.5) {
                ground.style.clipPath = 'none'
            } else {
                const radius = (vw * vw / 4 + depth * depth) / (2 * depth)
                ground.style.clipPath = `circle(${radius.toFixed(1)}px at 50% ${radius.toFixed(1)}px)`
            }
            ring.style.setProperty('--ring-in', e.toFixed(3))
            if (e > 0.999 && rect.top <= 1) launch()
            else if (e < 0.99) recall()
        }

        const job: FrameJob = {
            read: () => {
                rect = wrap.getBoundingClientRect()
            },
            write: update
        }
        const onScroll = () => requestFrame(job)
        const onResize = () => {
            wasFar = false
            requestFrame(job)
        }

        setOrb(0)
        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onResize)

        return () => {
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', onResize)
            stopFlight?.()
        }
    }, [])

    const copyEmail = async () => {
        try {
            await navigator.clipboard.writeText(CONTACT.email)
            setCopy('done')
        } catch {
            setCopy('failed')
        }
        window.setTimeout(() => setCopy('idle'), 2200)
    }

    return (
        <section ref={wrapRef} id='contact' data-tone='bone' className='finale relative'>
            <div className='finale-stage sticky top-0 h-[100svh] overflow-hidden'>
                <div ref={groundRef} aria-hidden className='absolute inset-0 bg-bone' />
                <div ref={ringRef} aria-hidden className='finale-ring' />
                <a
                    ref={orbRef}
                    href={`mailto:${CONTACT.email}?subject=Let%E2%80%99s%20build%20something`}
                    data-gravity-well
                    data-cursor-invert
                    className='finale-orb'
                    aria-label={`Email Bennett at ${CONTACT.email}`}
                >
                    <span aria-hidden>Let’s<br /><em>talk!</em></span>
                </a>
                <p className='absolute inset-x-0 top-[14svh] z-[2] px-5 text-center text-lead text-muted-bone'>
                    Internships, freelance builds, or an open-source bug you want fixed.
                </p>
            </div>

            <div aria-hidden className='h-[45svh]' />

            <div className='relative bg-bone px-5 pb-28 pt-10 text-ink sm:px-10'>
                <div className='flex flex-col items-center gap-6 text-center'>
                    <a
                        href={`mailto:${CONTACT.email}`}
                        className='display break-all text-heading font-bold underline decoration-[0.06em] underline-offset-[0.16em] transition-[text-decoration-color] hover:decoration-[var(--ember)]'
                    >
                        {CONTACT.email}
                    </a>
                    <button
                        type='button'
                        onClick={copyEmail}
                        className='inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-small font-semibold text-bone transition-colors hover:bg-ink-2'
                    >
                        {copy === 'done' ? <Check className='size-4' aria-hidden /> : <Copy className='size-4' aria-hidden />}
                        {copy === 'done' ? 'Copied' : copy === 'failed' ? 'Copy blocked, select the address' : 'Copy email'}
                    </button>
                    <span className='sr-only' aria-live='polite'>{copy === 'done' ? 'Email address copied' : ''}</span>
                </div>

                <ul className='mx-auto mt-16 grid max-w-5xl border-t border-bone-line sm:grid-cols-3'>
                    {[
                        { label: 'LinkedIn', href: CONTACT.linkedin, note: 'in/bennett-payoyo' },
                        { label: 'GitHub', href: CONTACT.github, note: '@Yahiro025' },
                        { label: 'Resume', href: CONTACT.resume, note: 'PDF · 2 pages' }
                    ].map(link => (
                        <li key={link.label} className='border-b border-bone-line sm:border-b-0 sm:border-r sm:px-6 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0'>
                            <a href={link.href} target='_blank' rel='noreferrer' className='group flex items-center justify-between gap-4 py-6'>
                                <span className='flex flex-col'>
                                    <span className='text-title font-bold tracking-[-0.02em]'>{link.label}</span>
                                    <span className='text-small text-muted-bone'>{link.note}</span>
                                </span>
                                <ArrowUpRight className='size-6 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1' aria-hidden />
                            </a>
                        </li>
                    ))}
                </ul>

                <p className='mt-12 text-center text-small text-muted-bone tabular'>
                    {CONTACT.location}
                    {time && <> · {time} GMT+8</>}
                </p>
            </div>
        </section>
    )
}

// Present at the very top and the very end; out of the way everywhere between.
export const SiteFooter: FC = (): ReactNode => {
    const [state, setState] = useState<'top' | 'end' | 'hidden'>('top')

    useEffect(() => {
        let next: 'top' | 'end' | 'hidden' = 'top'
        const job: FrameJob = {
            read: () => {
                const y = window.scrollY
                const end = y + window.innerHeight >= document.documentElement.scrollHeight - 4
                next = y <= 24 ? 'top' : end ? 'end' : 'hidden'
            },
            write: () => setState(next)
        }
        const onScroll = () => requestFrame(job)
        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onScroll)

        return () => {
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', onScroll)
        }
    }, [])

    return (
        <footer className={cn('site-footer', state !== 'hidden' && 'is-visible', state === 'end' && 'is-end')}>
            <div aria-hidden className='site-footer-tick'><i /></div>
            <div className='site-footer-row'>
                <p>© 2026 <span className='font-semibold'>Bennett Payoyo</span><span className='hidden sm:inline'> · built in Metro Manila</span></p>
                <a href='#top' className='inline-flex items-center gap-1.5'>
                    {state === 'end' ? <>Back to top <ArrowUp className='size-4' aria-hidden /></> : 'Scroll'}
                </a>
                <div className='flex items-center justify-end gap-4'>
                    <a href={CONTACT.github} target='_blank' rel='noreferrer' aria-label='GitHub profile'>
                        <Github className='size-5' aria-hidden />
                    </a>
                    <a href={CONTACT.linkedin} target='_blank' rel='noreferrer' aria-label='LinkedIn profile'>
                        <Linkedin className='size-5' aria-hidden />
                    </a>
                </div>
            </div>
        </footer>
    )
}
