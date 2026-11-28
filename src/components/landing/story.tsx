import type { CSSProperties, FC, ReactNode } from 'react'
import type { FrameJob } from '@/lib/frame'

import { Fragment, useEffect, useRef } from 'react'

import { requestFrame } from '@/lib/frame'
import { isLowPowerDevice, prefersReducedMotion, splitChars } from '@/lib/motion'
import { TOOLBOX } from '@/constants/folio'

interface Chapter {
    key: string
    plain: string
    body: ReactNode
}

const CHAPTERS: Chapter[] = [
    {
        key: 'My story',
        plain: 'I’m from Bicol. I studied STEM at Bicol Regional Science High School, then came to Metro Manila for Computer Science at PUP, where I hold a 1.32 GPA, with 1.00 the top mark. I learn by building real things and reading the systems underneath them. Backend, databases and architecture pull hardest. I use AI to move faster, and tests and code review to stay honest.',
        body: <>I’m from Bicol. I studied STEM at Bicol Regional Science High School, then came to Metro Manila for Computer Science at PUP, where I hold a 1.32 GPA, with 1.00 the top mark. I learn by building real things and reading the systems underneath them. Backend, databases and architecture pull hardest. I use AI to move faster, and tests and code review to <span className='bio-underline'>stay honest.</span></>
    },
    {
        key: 'Now & before',
        plain: 'Media Partnership Lead at Seekers Guild since August 2026. Backend AI Engineering in FlyRank AI’s educational program since July 2026. Member of the Junior Blockchain Education Consortium at PUP Manila and of AWS Cloud Club PUP, October 2025 to August 2026. BS Computer Science at PUP since 2025, after a STEM diploma from Bicol Regional Science High School.',
        body: <><span className='bio-underline'>Media Partnership Lead</span> at Seekers Guild since August 2026. Backend AI Engineering in FlyRank AI’s educational program since July 2026. Member of the Junior Blockchain Education Consortium at PUP Manila and of AWS Cloud Club PUP, October 2025 to August 2026. BS Computer Science at PUP since 2025, after a STEM diploma from Bicol Regional Science High School.</>
    },
    {
        key: 'Awards',
        plain: '1st Runner-Up at the GDG on Campus PUP SparkFest Hackathon with BANTAYOG, out of 15 teams and 10 finalists, July 2026. Top 20 Finalist at the CrypTita Plays Builder Showcase at WOCEE, also with BANTAYOG.',
        body: <><span className='bio-underline'>1st Runner-Up</span> at the GDG on Campus PUP SparkFest Hackathon with BANTAYOG, out of 15 teams and 10 finalists, July 2026. Top 20 Finalist at the CrypTita Plays Builder Showcase at WOCEE, also with BANTAYOG.</>
    },
    {
        key: 'Toolbox',
        plain: TOOLBOX.join(', '),
        body: <>{TOOLBOX.join(' · ')}</>
    }
]

const WINDOW = 14

export const Story: FC = (): ReactNode => {
    const sectionRef = useRef<HTMLElement>(null)
    const inviteRef = useRef<HTMLParagraphElement>(null)

    // Each chapter's text holds still while a short accent wave reads through it.
    useEffect(() => {
        const section = sectionRef.current
        if (!section) return
        const reduced = prefersReducedMotion()
        const staticMode = reduced || isLowPowerDevice()
        const slots = Array.from(section.querySelectorAll<HTMLElement>('[data-slot]'))
        const keys = Array.from(section.querySelectorAll<HTMLElement>('[data-key]'))
        const posts = slots.map(slot => ({
            slot,
            text: slot.querySelector<HTMLElement>('[data-wave]'),
            hold: slot.querySelector<HTMLElement>('[data-hold]'),
            chars: [] as HTMLSpanElement[],
            underline: slot.querySelector<HTMLElement>('.bio-underline'),
            underAt: -1,
            lo: 0,
            hi: -1
        }))

        const setWindow = (post: typeof posts[number], lo: number, hi: number) => {
            lo = Math.max(0, lo)
            hi = Math.min(post.chars.length - 1, hi)
            if (lo > hi) {
                lo = 0
                hi = -1
            }
            if (lo === post.lo && hi === post.hi) return
            for (let i = post.lo; i <= post.hi; i++) if (i < lo || i > hi) post.chars[i].classList.remove('is-hot')
            for (let i = lo; i <= hi; i++) if (i < post.lo || i > post.hi) post.chars[i].classList.add('is-hot')
            post.lo = lo
            post.hi = hi
        }

        // Sticky offsets and hold heights only change on resize or text split, so they are measured outside scroll frames.
        let holdTops: number[] = []
        let holdHeights: number[] = []
        const measure = () => {
            holdTops = posts.map(post => post.hold ? parseFloat(getComputedStyle(post.hold).top) || 0 : 0)
            holdHeights = posts.map(post => post.hold?.offsetHeight ?? 0)
        }
        measure()
        let inRange = false
        let needsLeaveSync = false
        let leaveAbove = false
        let lastCurrent = -1
        let rects: DOMRect[] = []

        const setCurrent = (current: number) => {
            if (current === lastCurrent) return
            lastCurrent = current
            keys.forEach((key, index) => key.classList.toggle('is-current', index === current))
        }

        const update = () => {
            const stacked = window.innerWidth <= 720
            if (!inRange) {
                if (!needsLeaveSync) return
                needsLeaveSync = false
                posts.forEach(post => {
                    setWindow(post, 0, -1)
                    post.underline?.classList.toggle('is-drawn', leaveAbove && (stacked || !post.hold || staticMode || post.underAt >= 0))
                })
                setCurrent(leaveAbove ? posts.length - 1 : -1)

                return
            }
            needsLeaveSync = false
            const vh = window.innerHeight
            let current = -1

            posts.forEach((post, index) => {
                const rect = rects[index]
                if (!rect) return
                if (rect.top < vh * 0.5) current = index
                if (stacked || !post.hold || staticMode) {
                    setWindow(post, 0, -1)
                    post.underline?.classList.toggle('is-drawn', rect.top < vh * 0.55)

                    return
                }
                const holdTop = holdTops[index]
                const travel = rect.height - holdHeights[index]
                const t = travel > 0 ? Math.min(1, Math.max(0, (holdTop - rect.top) / travel)) : 0
                const front = Math.floor(t * (post.chars.length + WINDOW * 2)) - WINDOW
                setWindow(post, front - WINDOW + 1, front)
                post.underline?.classList.toggle('is-drawn', post.underAt >= 0 && front >= post.underAt)
            })
            setCurrent(current)
        }
        const job: FrameJob = {
            read: () => {
                if (!inRange) return
                rects = posts.map(post => post.slot.getBoundingClientRect())
            },
            write: update
        }
        const onScroll = () => {
            if (!inRange && !needsLeaveSync) return
            requestFrame(job)
        }
        const onResize = () => {
            measure()
            onScroll()
        }

        let splitDone = false
        const ensureSplit = () => {
            if (splitDone || staticMode) return
            splitDone = true
            posts.forEach(post => {
                if (!post.text) return
                post.chars = splitChars(post.text, 'z')
                const firstUnder = post.underline?.querySelector<HTMLElement>('.z')
                post.underAt = firstUnder ? post.chars.indexOf(firstUnder) : -1
            })
            measure()
            onScroll()
        }

        const splitObserver = !staticMode
            ? new IntersectionObserver(([entry]) => {
                if (!entry.isIntersecting) return
                ensureSplit()
                splitObserver?.disconnect()
            }, { rootMargin: '600px 0px' })
            : null
        splitObserver?.observe(section)

        const scrollObserver = new IntersectionObserver(([entry]) => {
            const nextInRange = entry.isIntersecting
            if (inRange && !nextInRange) {
                needsLeaveSync = true
                leaveAbove = entry.boundingClientRect.bottom < 0
            }
            inRange = nextInRange
            onScroll()
        }, { rootMargin: '80% 0px' })
        scrollObserver.observe(section)

        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onResize)

        return () => {
            splitObserver?.disconnect()
            scrollObserver.disconnect()
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', onResize)
        }
    }, [])

    useEffect(() => {
        const invite = inviteRef.current
        if (!invite) return
        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) return
            invite.classList.add('is-risen')
            observer.disconnect()
        }, { rootMargin: '0px 0px -20% 0px' })
        observer.observe(invite)

        return () => observer.disconnect()
    }, [])

    const rows = CHAPTERS.length

    return (
        <section ref={sectionRef} id='about' data-tone='ink' className='bio tone-ink relative px-5 pb-[18svh] pt-[16svh] sm:px-10'>
            <div className='bio-grid'>
                <div className='bio-label-halt' style={{ gridRow: `1 / ${rows + 1}` }}>
                    <h2 className='bio-label display text-heading font-bold'>About/</h2>
                </div>

                {CHAPTERS.map((chapter, i) => (
                    <Fragment key={chapter.key}>
                        <div className='bio-key-halt' style={{ gridRow: `${i + 1} / ${rows + 1}`, ['--i' as string]: i } as CSSProperties}>
                            <h3 data-key className='bio-key display text-heading font-bold'>{chapter.key}</h3>
                        </div>
                        <div data-slot className='bio-slot' style={{ gridRow: i + 1 }}>
                            <div data-hold className='bio-hold'>
                                <p className='sr-only'>{chapter.plain}</p>
                                <p data-wave aria-hidden className='bio-text text-statement'>{chapter.body}</p>
                            </div>
                        </div>
                    </Fragment>
                ))}
            </div>

            <p ref={inviteRef} className='bio-invite display mx-auto mt-[22svh] max-w-[18ch] text-center text-display font-bold'>
                {'Want to build something together?'.split(' ').map((word, i) => (
                    <Fragment key={word}>
                        <span className='rise-mask'>
                            <span className='rise' style={{ transitionDelay: `${(i * 0.06).toFixed(2)}s` }}>{word}</span>
                        </span>{' '}
                    </Fragment>
                ))}
            </p>
        </section>
    )
}
