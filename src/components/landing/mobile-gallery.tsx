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
    onOpenProfileDetails: () => void
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
    onOpenProfileDetails,
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
                <div className='h-full overflow-y-auto px-[22px] pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-6' data-mobile-profile>
                    <div className='mobile-profile-layout mx-auto flex min-h-full w-full max-w-lg flex-col'>
                        <div
                            role='button'
                            tabIndex={0}
                            aria-label='Open About details'
                            onClick={event => {
                                onFocusTarget(event.currentTarget)
                                onOpenProfileDetails()
                            }}
                            onKeyDown={event => {
                                if (event.key !== 'Enter' && event.key !== ' ') return
                                event.preventDefault()
                                onFocusTarget(event.currentTarget)
                                onOpenProfileDetails()
                            }}
                            className='cursor-pointer rounded-[18px] outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2'
                        >
                            <div className='mobile-profile-image overflow-hidden rounded-[18px] border border-border bg-muted' style={{ aspectRatio: '4 / 5' }}>
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

                            <div className='mobile-profile-copy flex flex-col gap-5 py-6 text-left'>
                                <div>
                                    <h2 className='text-[clamp(1.75rem,9vw,2.2rem)] font-medium leading-none tracking-[-0.04em] text-foreground'>Bennett Payoyo</h2>
                                    <p className='mt-2 text-sm text-muted-foreground'>2nd year BSCS · PUP</p>
                                    <p className='mt-3 font-mono text-[9px] uppercase leading-relaxed tracking-[0.18em] text-muted-foreground'>{profile.tagline}</p>
                                </div>

                                <p className='max-w-prose text-sm leading-6 text-foreground/80'>{profile.summary}</p>

                                <div className='border-t border-border/80 pt-4'>
                                    <span className='font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground'>Focus</span>
                                    <div className='mt-3 flex flex-wrap gap-2'>
                                        {profile.focus.map(focus => (
                                            <span key={focus} className='rounded-[3px] border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.04em] text-foreground/80'>{focus}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className='flex flex-col gap-2 pb-6'>
                            <button
                                type='button'
                                onClick={event => {
                                    onFocusTarget(event.currentTarget)
                                    onProjectChange(0)
                                }}
                                className='inline-flex min-h-11 w-full items-center justify-center rounded-full border border-foreground bg-foreground px-5 text-[11px] font-medium uppercase tracking-[0.12em] text-background transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground'
                            >
                                View work
                            </button>
                            <a
                                href={githubUrl}
                                target='_blank'
                                rel='noreferrer'
                                onClick={stop}
                                className='inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-border px-5 text-[11px] font-medium uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground'
                            >
                                GitHub
                                <ArrowUpRight className='size-4' />
                            </a>
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
                        const livePreviewReady = !boundary && livePreviewState[project.id] === 'ready'
                        const livePreviewFailed = livePreviewState[project.id] === 'failed'

                        return (
                            <article
                                key={`${boundary ? 'clone' : 'project'}-${project.id}-${index}`}
                                aria-hidden={boundary}
                                className='w-full min-w-0 shrink-0 snap-center px-[22px] pt-6'
                            >
                                <div className='mobile-project-layout mx-auto flex w-full max-w-lg flex-col'>
                                    <div className='mobile-project-header flex flex-col gap-1'>
                                        <span className='font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground'>Selected work</span>
                                        <h2 className='mt-2 text-[clamp(1.75rem,9vw,2.2rem)] font-medium leading-none tracking-[-0.04em] text-foreground'>{project.title}</h2>
                                        {project.descriptor && (
                                            <p className='text-[13px] leading-5 text-muted-foreground'>
                                                {project.descriptor} · {project.year}
                                            </p>
                                        )}
                                    </div>

                                    <div className='mobile-project-media relative mt-6 overflow-hidden rounded-[18px] border border-border bg-muted' style={{ aspectRatio: '4 / 5' }}>
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

                                        <span aria-hidden='true' className='pointer-events-none absolute inset-x-3 bottom-3 top-auto translate-y-0 rounded-[3px] bg-background/85 px-3 py-2 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/75'>
                                            {project.title} / {canEmbedLivePreview && livePreviewReady ? 'Live preview' : 'Project preview'}
                                        </span>
                                    </div>

                                    <div className='mobile-project-caption flex flex-col gap-4 py-6'>
                                        <p className='max-w-prose text-sm leading-6 text-foreground/80'>{project.summary}</p>

                                        {(project.role || project.result) && (
                                            <div className='grid grid-cols-2 gap-4 border-t border-border/80 pt-4'>
                                                {project.role && (
                                                    <div className='flex flex-col gap-1'>
                                                        <span className='font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground'>Role</span>
                                                        <span className='text-sm text-foreground/85'>{project.role}</span>
                                                    </div>
                                                )}
                                                {project.result && (
                                                    <div className='flex flex-col gap-1'>
                                                        <span className='font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground'>Result</span>
                                                        <span className='text-sm text-foreground/85'>{project.result}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className='flex flex-col gap-2'>
                                            <button
                                                type='button'
                                                tabIndex={boundary ? -1 : undefined}
                                                onClick={event => {
                                                    stop(event)
                                                    onFocusTarget(event.currentTarget)
                                                    onOpenDetails(logicalIndex)
                                                }}
                                                className='inline-flex min-h-11 w-full items-center justify-center rounded-full border border-foreground bg-foreground px-5 text-[11px] font-medium uppercase tracking-[0.12em] text-background transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground'
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
                                                    className='inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-border px-5 text-[11px] font-medium uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground'
                                                >
                                                    Open live site
                                                    <ArrowUpRight className='size-4' />
                                                </a>
                                            )}
                                        </div>

                                        <div className='mt-2 flex items-center justify-between border-t border-border/80 pt-4'>
                                            <button
                                                type='button'
                                                tabIndex={boundary ? -1 : undefined}
                                                onClick={event => moveBy(-1, event)}
                                                aria-label='Previous project'
                                                className='grid size-11 place-items-center rounded-full border border-border text-foreground/80 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground'
                                            >
                                                <ArrowLeft className='size-5' />
                                            </button>
                                            <span aria-live='polite' className='font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground'>
                                                {String(logicalIndex + 1).padStart(2, '0')} / {String(projects.length).padStart(2, '0')}
                                            </span>
                                            <button
                                                type='button'
                                                tabIndex={boundary ? -1 : undefined}
                                                onClick={event => moveBy(1, event)}
                                                aria-label='Next project'
                                                className='grid size-11 place-items-center rounded-full border border-border text-foreground/80 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground'
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
                className='absolute inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-background/95'
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                <button
                    type='button'
                    onClick={event => {
                        onFocusTarget(event.currentTarget)
                        onProjectChange(0)
                    }}
                    aria-current={selectedProjectIndex !== null ? 'page' : undefined}
                    className='min-h-14 border-r border-border px-2 font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-muted focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground'
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
                    className='min-h-14 border-r border-border px-2 font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-muted focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground'
                >
                    Profile
                </button>
                <a
                    href={resumeUrl}
                    target='_blank'
                    rel='noreferrer'
                    className='flex min-h-14 items-center justify-center border-r border-border px-2 font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-muted focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground'
                >
                    Resume
                </a>
                <button
                    type='button'
                    onClick={event => {
                        onFocusTarget(event.currentTarget)
                        onOpenContact()
                    }}
                    className='min-h-14 px-2 font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-muted focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground'
                >
                    Contact
                </button>
            </nav>
        </div>
    )
}
