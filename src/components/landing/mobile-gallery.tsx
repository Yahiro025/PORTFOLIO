import type { FC, MouseEvent, ReactNode } from 'react'
import type { AboutItem, ProjectItem } from '@/types'

import { useCallback, useEffect, useRef, useState } from 'react'

import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react'

import { PROFILE_IMAGE } from '@/constants/folio'
import { cn } from '@/lib/utils'

interface MobileGalleryProps {
    projects: ProjectItem[]
    profile: AboutItem
    selectedProjectIndex: number | null
    resumeUrl: string
    githubUrl: string
    reducedMotion: boolean
    onProjectChange: (index: number) => void
    onShowProfile: () => void
    onOpenDetails: (index: number) => void
    onOpenContact: () => void
    onFocusTarget: (target: HTMLElement) => void
}

const stop = (event: MouseEvent<HTMLElement>) => event.stopPropagation()

export const MobileGallery: FC<MobileGalleryProps> = ({
    projects,
    profile,
    selectedProjectIndex,
    resumeUrl,
    githubUrl,
    reducedMotion,
    onProjectChange,
    onShowProfile,
    onOpenDetails,
    onOpenContact,
    onFocusTarget
}): ReactNode => {
    const scrollRef = useRef<HTMLDivElement>(null)
    const scrollTimerRef = useRef<number | null>(null)
    const scrollFrameRef = useRef<number | null>(null)
    const reportedIndexRef = useRef<number | null>(null)
    const [failedPosters, setFailedPosters] = useState<Record<string, boolean>>({})
    const [livePreviewState, setLivePreviewState] = useState<Record<string, 'ready' | 'failed'>>({})

    const assignScrollRef = useCallback((element: HTMLDivElement | null) => {
        scrollRef.current = element
        if (!element || selectedProjectIndex === null || projects.length === 0) return

        const position = (selectedProjectIndex + 1) * element.clientWidth
        element.scrollTop = 0
        element.scrollLeft = position
        window.requestAnimationFrame(() => {
            if (scrollRef.current === element) {
                element.scrollTop = 0
                element.scrollLeft = position
            }
        })
    }, [projects.length, selectedProjectIndex])

    const clearPendingScroll = () => {
        if (scrollTimerRef.current !== null) window.clearTimeout(scrollTimerRef.current)
        if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current)
        scrollTimerRef.current = null
        scrollFrameRef.current = null
    }

    const scrollToProject = (index: number, behavior: ScrollBehavior = reducedMotion ? 'auto' : 'smooth') => {
        const element = scrollRef.current
        if (!element) return

        clearPendingScroll()
        const width = element.clientWidth
        if (!width) {
            scrollTimerRef.current = window.setTimeout(() => scrollToProject(index, behavior), 32)
            return
        }

        element.scrollTop = 0
        element.scrollTo({ left: (index + 1) * width, behavior })
    }

    useEffect(() => {
        if (selectedProjectIndex === null || projects.length === 0) return

        reportedIndexRef.current = selectedProjectIndex

        scrollFrameRef.current = window.requestAnimationFrame(() => {
            scrollToProject(selectedProjectIndex, 'auto')
        })

        return clearPendingScroll
    }, [selectedProjectIndex, reducedMotion, projects.length])

    useEffect(() => () => clearPendingScroll(), [])

    useEffect(() => {
        if (selectedProjectIndex === null || projects.length === 0) return

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.altKey || event.ctrlKey || event.metaKey) return
            const target = event.target as HTMLElement | null
            if (target?.closest('input, textarea, select, [contenteditable="true"]')) return

            const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
            if (step === 0) return

            event.preventDefault()
            const next = (selectedProjectIndex + step + projects.length) % projects.length
            onProjectChange(next)
            scrollToProject(next, 'auto')
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [selectedProjectIndex, reducedMotion, projects.length])

    const onScroll = () => {
        const element = scrollRef.current
        if (!element || projects.length === 0) return

        const width = element.clientWidth
        if (!width) return

        const rawIndex = Math.round(element.scrollLeft / width)
        const isLeadingClone = rawIndex <= 0
        const isTrailingClone = rawIndex >= projects.length + 1

        if (isLeadingClone || isTrailingClone) {
            const logicalIndex = isLeadingClone ? projects.length - 1 : 0
            if (scrollTimerRef.current !== null) window.clearTimeout(scrollTimerRef.current)
            scrollTimerRef.current = window.setTimeout(() => {
                const currentIndex = Math.round(element.scrollLeft / element.clientWidth)
                if (currentIndex !== rawIndex) return

                element.scrollTo({
                    left: (logicalIndex + 1) * element.clientWidth,
                    behavior: 'auto'
                })
                reportedIndexRef.current = logicalIndex
                onProjectChange(logicalIndex)
            }, reducedMotion ? 0 : 90)
            return
        }

        const logicalIndex = Math.max(0, Math.min(projects.length - 1, rawIndex - 1))
        if (logicalIndex === reportedIndexRef.current) return

        reportedIndexRef.current = logicalIndex
        onProjectChange(logicalIndex)
    }

    const moveBy = (step: number, event?: MouseEvent<HTMLElement>) => {
        if (event) onFocusTarget(event.currentTarget)
        const current = selectedProjectIndex ?? 0
        const next = (current + step + projects.length) % projects.length
        onProjectChange(next)
            scrollToProject(next, 'auto')
    }

    const projectSlides = [
        { project: projects[projects.length - 1], index: -1, boundary: true },
        ...projects.map((project, index) => ({ project, index, boundary: false })),
        { project: projects[0], index: projects.length, boundary: true }
    ]

    return (
        <div data-mobile-gallery className='absolute inset-x-0 bottom-0 top-[4.75rem] z-10'>
            {selectedProjectIndex === null ? (
                <div className='h-full overflow-y-auto px-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-3' data-mobile-profile>
                    <div className='mobile-profile-layout mx-auto flex min-h-full w-full max-w-lg flex-col'>
                        <div className='mobile-profile-image overflow-hidden rounded-2xl bg-muted' style={{ aspectRatio: '4 / 5' }}>
                            <picture>
                                <source type='image/webp' srcSet={PROFILE_IMAGE.srcSet} sizes='(max-width: 767px) 88vw' />
                                <img
                                    src={PROFILE_IMAGE.src}
                                    alt='Bennett Payoyo'
                                    width={PROFILE_IMAGE.width}
                                    height={PROFILE_IMAGE.height}
                                    fetchPriority='high'
                                    decoding='async'
                                    className='h-full w-full object-cover'
                                />
                            </picture>
                        </div>

                        <div className='mobile-profile-copy flex flex-col gap-5 py-6'>
                            <div>
                                <h2 className='text-[clamp(2rem,9vw,3rem)] font-semibold leading-[0.98] tracking-[-0.03em] text-foreground'>Bennett Payoyo</h2>
                                <p className='mt-2 text-sm text-foreground/70'>2nd year BSCS · PUP</p>
                                <p className='mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/60'>{profile.tagline}</p>
                            </div>

                            <p className='max-w-prose text-base leading-relaxed text-foreground/85'>{profile.summary}</p>

                            <div className='border-t border-border pt-4'>
                                <span className='font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/60'>Focus</span>
                                <div className='mt-3 flex flex-wrap gap-2'>
                                    {profile.focus.map(focus => (
                                        <span key={focus} className='rounded-full border border-border px-3 py-2 text-xs text-foreground/80'>{focus}</span>
                                    ))}
                                </div>
                            </div>

                            <div className='flex flex-wrap gap-3'>
                                <button
                                    type='button'
                                    onClick={event => {
                                        onFocusTarget(event.currentTarget)
                                        onProjectChange(0)
                                    }}
                                    className='inline-flex min-h-11 items-center justify-center rounded-lg bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground'
                                >
                                    View work
                                </button>
                                <a
                                    href={githubUrl}
                                    target='_blank'
                                    rel='noreferrer'
                                    onClick={stop}
                                    className='inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground'
                                >
                                    GitHub
                                    <ArrowUpRight className='size-4' />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div
                    ref={assignScrollRef}
                    onScroll={onScroll}
                    className='flex h-full snap-x snap-mandatory overflow-auto overscroll-contain pb-[calc(5.5rem+env(safe-area-inset-bottom))]'
                    style={{ scrollbarWidth: 'none', scrollSnapType: 'x mandatory', touchAction: 'pan-x pan-y' }}
                    aria-label='Work projects'
                >
                    {projectSlides.map(({ project, index, boundary }) => {
                        const logicalIndex = boundary ? (index < 0 ? projects.length - 1 : 0) : index
                        const hasPoster = !!project.posterUrl && !failedPosters[project.id]
                        const canEmbedLivePreview = !boundary
                            && logicalIndex === selectedProjectIndex
                            && project.embed
                            && !!project.liveUrl
                        const livePreviewReady = livePreviewState[project.id] === 'ready'
                        const livePreviewFailed = livePreviewState[project.id] === 'failed'

                        return (
                            <article
                                key={`${boundary ? 'clone' : 'project'}-${project.id}-${index}`}
                                aria-hidden={boundary}
                                className='w-full min-w-0 shrink-0 snap-center px-6 pt-3'
                            >
                                <div className='mobile-project-layout mx-auto flex w-full max-w-lg flex-col'>
                                    <div className='mobile-project-media relative overflow-hidden rounded-2xl bg-muted' style={{ aspectRatio: '4 / 5' }}>
                                        {hasPoster ? (
                                            <img
                                                src={project.posterUrl}
                                                alt={`${project.title} project poster`}
                                                loading={logicalIndex === selectedProjectIndex ? 'eager' : 'lazy'}
                                                decoding='async'
                                                className={cn(
                                                    'h-full w-full transition-opacity duration-200',
                                                    canEmbedLivePreview ? 'object-contain object-top bg-background' : 'object-cover',
                                                    livePreviewReady && 'opacity-0'
                                                )}
                                                onError={() => setFailedPosters(current => ({ ...current, [project.id]: true }))}
                                            />
                                        ) : (
                                            <div className='flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-foreground/60'>
                                                <span className='font-mono text-[10px] uppercase tracking-[0.2em]'>Poster unavailable</span>
                                                <span className='text-xl font-semibold text-foreground'>{project.title}</span>
                                            </div>
                                        )}

                                        {canEmbedLivePreview && !livePreviewFailed && (
                                            <iframe
                                                src={project.liveUrl}
                                                title={`Live ${project.title} mobile preview`}
                                                loading='lazy'
                                                referrerPolicy='strict-origin-when-cross-origin'
                                                scrolling='no'
                                                tabIndex={-1}
                                                aria-hidden='true'
                                                className={cn(
                                                    'pointer-events-none absolute inset-0 h-full w-full border-0 bg-background transition-opacity duration-200',
                                                    livePreviewReady ? 'opacity-100' : 'opacity-0'
                                                )}
                                                onLoad={() => setLivePreviewState(current => ({ ...current, [project.id]: 'ready' }))}
                                                onError={() => setLivePreviewState(current => ({ ...current, [project.id]: 'failed' }))}
                                            />
                                        )}
                                    </div>

                                    <div className='mobile-project-caption flex flex-col gap-4 py-5'>
                                        <div>
                                            <h2 className='text-[clamp(2rem,9vw,3rem)] font-semibold leading-[0.98] tracking-[-0.03em] text-foreground'>{project.title}</h2>
                                            {project.descriptor && <p className='mt-2 text-sm text-foreground/70'>{project.descriptor}</p>}
                                        </div>

                                        <p className='max-w-prose text-base leading-relaxed text-foreground/85'>{project.summary}</p>

                                        {(project.role || project.result) && (
                                            <div className='grid grid-cols-2 gap-4 border-t border-border pt-4'>
                                                {project.role && (
                                                    <div className='flex flex-col gap-1'>
                                                        <span className='font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/60'>Role</span>
                                                        <span className='text-sm text-foreground'>{project.role}</span>
                                                    </div>
                                                )}
                                                {project.result && (
                                                    <div className='flex flex-col gap-1'>
                                                        <span className='font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/60'>Result</span>
                                                        <span className='text-sm text-foreground'>{project.result}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className='flex flex-wrap gap-3'>
                                            <button
                                                type='button'
                                                tabIndex={boundary ? -1 : undefined}
                                                onClick={event => {
                                                    stop(event)
                                                    onFocusTarget(event.currentTarget)
                                                    onOpenDetails(logicalIndex)
                                                }}
                                                className='inline-flex min-h-11 items-center justify-center rounded-lg bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground'
                                            >
                                                View details
                                            </button>
                                            {project.liveUrl && (
                                                <a
                                                    href={project.liveUrl}
                                                    target='_blank'
                                                    rel='noreferrer'
                                                    tabIndex={boundary ? -1 : undefined}
                                                    onClick={stop}
                                                    className='inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground'
                                                >
                                                    Open live site
                                                    <ArrowUpRight className='size-4' />
                                                </a>
                                            )}
                                        </div>

                                        <div className='flex items-center justify-between border-t border-border pt-3'>
                                            <button
                                                type='button'
                                                tabIndex={boundary ? -1 : undefined}
                                                onClick={event => moveBy(-1, event)}
                                                aria-label='Previous project'
                                                className='grid size-11 place-items-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground'
                                            >
                                                <ArrowLeft className='size-5' />
                                            </button>
                                            <span aria-live='polite' className='font-mono text-xs uppercase tracking-[0.2em] text-foreground/60'>
                                                {String(logicalIndex + 1).padStart(2, '0')} / {String(projects.length).padStart(2, '0')}
                                            </span>
                                            <button
                                                type='button'
                                                tabIndex={boundary ? -1 : undefined}
                                                onClick={event => moveBy(1, event)}
                                                aria-label='Next project'
                                                className='grid size-11 place-items-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground'
                                            >
                                                <ArrowRight className='size-5' />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}

            <nav
                aria-label='Portfolio sections'
                data-mobile-nav
                className='absolute inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-background/95 backdrop-blur-sm'
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                <button
                    type='button'
                    onClick={event => {
                        onFocusTarget(event.currentTarget)
                        onProjectChange(0)
                    }}
                    aria-current={selectedProjectIndex !== null ? 'page' : undefined}
                    className='min-h-14 border-r border-border px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground'
                >
                    Work
                </button>
                <button
                    type='button'
                    onClick={event => {
                        onFocusTarget(event.currentTarget)
                        onShowProfile()
                    }}
                    aria-current={selectedProjectIndex === null ? 'page' : undefined}
                    className='min-h-14 border-r border-border px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground'
                >
                    Profile
                </button>
                <a
                    href={resumeUrl}
                    target='_blank'
                    rel='noreferrer'
                    className='flex min-h-14 items-center justify-center border-r border-border px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground'
                >
                    Resume
                </a>
                <button
                    type='button'
                    onClick={event => {
                        onFocusTarget(event.currentTarget)
                        onOpenContact()
                    }}
                    className='min-h-14 px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground'
                >
                    Contact
                </button>
            </nav>
        </div>
    )
}
