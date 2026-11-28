import type { FC, ReactNode } from 'react'
import type { FrameJob } from '@/lib/frame'

import { useEffect, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { requestFrame } from '@/lib/frame'
import { CONTACT } from '@/constants/folio'

export type Tone = 'ink' | 'bone' | 'ember'

interface SectionBound {
    el: HTMLElement
    top: number
    bottom: number
}

const NAV = [
    { href: '#open-source', label: 'Open source' },
    { href: '#work', label: 'Work' },
    { href: '#about', label: 'About' }
]

export const SiteHeader: FC = (): ReactNode => {
    const [tone, setTone] = useState<Tone>('ink')
    const [menuOpen, setMenuOpen] = useState(false)

    useEffect(() => {
        const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-tone]'))
        let bounds: SectionBound[] = []
        let boundsDirty = true
        let lastSection = ''
        let lastTone = ''
        let current: HTMLElement | undefined

        const refreshBounds = () => {
            const scrollY = window.scrollY
            bounds = sections.map(el => {
                // Sticky sections (such as .seq-stage) stay pinned while their parent scrolls,
                // so document bounds span from their static start to their parent's bottom.
                if (getComputedStyle(el).position === 'sticky' && el.parentElement) {
                    const parentRect = el.parentElement.getBoundingClientRect()
                    const prevRect = el.previousElementSibling?.getBoundingClientRect()

                    return {
                        el,
                        top: (prevRect ? prevRect.bottom : parentRect.top) + scrollY,
                        bottom: parentRect.bottom + scrollY
                    }
                }
                const rect = el.getBoundingClientRect()

                return {
                    el,
                    top: rect.top + scrollY,
                    bottom: rect.bottom + scrollY
                }
            })
            boundsDirty = false
        }

        const job: FrameJob = {
            read: () => {
                if (boundsDirty) refreshBounds()
                const probe = window.scrollY + 44
                current = bounds.find(bound => bound.top <= probe && bound.bottom > probe)?.el
            },
            write: () => {
                if (!current) return
                const nextTone = current.dataset.tone as Tone
                if (nextTone !== lastTone) {
                    lastTone = nextTone
                    document.documentElement.dataset.headerTone = nextTone
                    setTone(nextTone)
                }
                if (current.id !== lastSection) {
                    if (lastSection) window.dispatchEvent(new Event('gravity:section'))
                    lastSection = current.id
                }
            }
        }
        const onScroll = () => requestFrame(job)
        const onResize = () => {
            boundsDirty = true
            requestFrame(job)
        }

        onResize()
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onResize)

        const main = document.getElementById('main')
        let observer: ResizeObserver | null = null
        if (main) {
            observer = new ResizeObserver(onResize)
            observer.observe(main)
        }

        return () => {
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', onResize)
            observer?.disconnect()
        }
    }, [])

    const onDark = tone === 'ink'

    return (
        <header
            className={cn(
                'fixed inset-x-0 top-0 z-50 transition-colors duration-200',
                tone === 'ink' && 'bg-ink text-bone',
                tone === 'bone' && 'bg-bone text-ink',
                tone === 'ember' && 'bg-ember text-ink'
            )}
        >
            <a
                href='#main'
                className='sr-only rounded-full bg-ember px-4 py-2 text-ink focus:not-sr-only focus:absolute focus:left-4 focus:top-4'
            >
                Skip to content
            </a>

            <div className='flex flex-wrap items-center gap-x-1 px-5 py-3.5 sm:gap-x-2 sm:px-10 sm:py-4'>
                <a href='#top' className='flex items-center gap-3 whitespace-nowrap text-lead font-semibold tracking-[-0.02em]' aria-label='Bennett Payoyo, back to top'>
                    <span id='dock-target' aria-hidden className='relative hidden size-11 shrink-0 sm:block'>
                        <svg viewBox='-110.5 -137.6 280.3 474.3' className='hero-glyph is-docked dock-mini absolute inset-0 size-full'>
                            <circle className='glyph-mass' r='104.5' />
                            <circle className='glyph-small' cx='127.9' cy='-95.7' r='41.9' />
                            <circle className='glyph-ring' cx='-0.9' cy='227' r='78' strokeWidth='63.2' />
                        </svg>
                    </span>
                    <span>
                        bennett payoyo
                        <span className={cn('transition-colors duration-500', tone === 'bone' ? 'text-ink' : tone === 'ember' ? 'text-ink' : 'text-ember')}>.</span>
                    </span>
                </a>

                <button
                    type='button'
                    aria-expanded={menuOpen}
                    aria-controls='site-nav'
                    onClick={() => setMenuOpen(open => !open)}
                    className='order-1 ml-auto rounded-full px-2.5 py-2 text-small md:hidden'
                >
                    Menu
                </button>

                <nav
                    id='site-nav'
                    aria-label='Primary'
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                        'order-2 w-full pt-2 md:ml-auto md:w-auto md:pt-0',
                        menuOpen ? 'flex' : 'hidden md:flex'
                    )}
                >
                    <ul className='flex flex-col md:flex-row md:items-center md:gap-1'>
                        {NAV.map(item => (
                            <li key={item.href}>
                                <a
                                    href={item.href}
                                    className={cn(
                                        'rounded-full px-3.5 py-2 text-small transition-colors duration-300',
                                        onDark ? 'hover:bg-bone/10' : 'hover:bg-ink/10'
                                    )}
                                >
                                    {item.label}
                                </a>
                            </li>
                        ))}
                        <li>
                            <a
                                href={CONTACT.resume}
                                target='_blank'
                                rel='noreferrer'
                                className={cn(
                                    'inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-small transition-colors duration-300',
                                    onDark ? 'hover:bg-bone/10' : 'hover:bg-ink/10'
                                )}
                            >
                                Resume
                                <ArrowUpRight className='size-4' aria-hidden />
                            </a>
                        </li>
                    </ul>
                </nav>

                <a
                    href='#contact'
                    data-gravity-well
                    className={cn(
                        'order-1 whitespace-nowrap rounded-full px-4 py-2.5 text-small font-semibold transition-[background-color,color,translate,scale] duration-[160ms] ease-[var(--ease-out)] hover:-translate-y-px active:scale-[0.97] sm:px-5 md:order-3',
                        onDark ? 'bg-ember text-ink hover:bg-ember-hot' : 'bg-ink text-bone hover:bg-ink-2'
                    )}
                >
                    Get in touch
                </a>
            </div>

        </header>
    )
}
