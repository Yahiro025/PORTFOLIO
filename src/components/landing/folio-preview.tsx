import type { FC, MouseEvent, ReactNode } from 'react'
import type { GitHubSnapshot, PortfolioItem } from '@/types'
import type { PreviewPresentation } from '@/lib/portfolio'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const ResumePdf = dynamic(
    () => import('@/components/landing/resume-pdf').then(module => module.ResumePdf),
    { ssr: false }
)

const IFRAME_DESKTOP_WIDTH = 1440
const IFRAME_ZOOM_OUT = 0.85

interface FolioPreviewProps {
    item: PortfolioItem
    presentation: PreviewPresentation
    github: GitHubSnapshot | null
    mode: 'reel' | 'detail'
    onInteract: () => void
    onExitInteract: () => void
    onOpenDetails: () => void
}

export const FolioPreview: FC<FolioPreviewProps> = ({
    item,
    presentation,
    github,
    mode,
    onInteract,
    onExitInteract,
    onOpenDetails
}): ReactNode => {
    const stop = (event: MouseEvent<HTMLElement>) => event.stopPropagation()

    const iframeWrapRef = useRef<HTMLDivElement>(null)
    const [iframeScale, setIframeScale] = useState(0)

    useEffect(() => {
        const el = iframeWrapRef.current
        if (!el) return

        const observer = new ResizeObserver(([entry]) => {
            setIframeScale((entry.contentRect.width / IFRAME_DESKTOP_WIDTH) * IFRAME_ZOOM_OUT)
        })
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    if (item.kind === 'project') {
        const live = presentation === 'live-passive' || presentation === 'live-interactive'
        const interactive = presentation === 'live-interactive'

        return (
            <div data-preview-mode={mode} className='flex h-full w-full flex-col overflow-hidden bg-muted'>
                {mode === 'reel' && (
                    <div className='z-10 flex flex-wrap items-center gap-2 bg-muted p-3'>
                        <Button
                            render={<a href={item.sourceUrl} target='_blank' rel='noreferrer' />}
                            nativeButton={false}
                            variant='overlay'
                            size='pillSm'
                            onClick={stop}
                        >
                            Source
                        </Button>

                        {item.liveUrl && (
                            <Button
                                render={<a href={item.liveUrl} target='_blank' rel='noreferrer' />}
                                nativeButton={false}
                                variant='overlay'
                                size='pillSm'
                                onClick={stop}
                            >
                                Open live site
                            </Button>
                        )}

                        {presentation === 'live-passive' && (
                            <Button
                                type='button'
                                variant='solid'
                                size='pillSm'
                                className='shadow-sm hover:bg-foreground/90'
                                onClick={event => { stop(event); onInteract() }}
                            >
                                Interact
                            </Button>
                        )}

                        {interactive && (
                            <Button
                                type='button'
                                variant='solid'
                                size='pillSm'
                                className='shadow-sm hover:bg-foreground/90'
                                onClick={event => { stop(event); onExitInteract() }}
                            >
                                Exit preview
                            </Button>
                        )}
                    </div>
                )}

                <div ref={iframeWrapRef} className='relative min-h-0 flex-1 overflow-hidden'>
                    {live && item.liveUrl ? (
                        item.id === 'tanglaw' ? (
                            <iframe
                                src={item.liveUrl}
                                title={`Live ${item.title} project preview`}
                                loading='lazy'
                                referrerPolicy='strict-origin-when-cross-origin'
                                className='absolute left-1/2 top-0 origin-top border-0 bg-background'
                                style={{
                                    width: `${IFRAME_DESKTOP_WIDTH}px`,
                                    height: '2400px',
                                    transform: `translateX(-50%) scale(${iframeScale})`,
                                    visibility: iframeScale ? 'visible' : 'hidden',
                                    pointerEvents: interactive ? 'auto' : 'none'
                                }}
                            />
                        ) : (
                            <iframe
                                src={item.liveUrl}
                                title={`Live ${item.title} project preview`}
                                loading='lazy'
                                referrerPolicy='strict-origin-when-cross-origin'
                                className='h-full w-full border-0 bg-background'
                                style={{ pointerEvents: interactive ? 'auto' : 'none' }}
                            />
                        )
                    ) : (
                        <div className='flex h-full flex-col bg-foreground p-6 text-background'>
                            <div className='mt-auto mb-14 min-h-0'>
                                <h4 className='text-3xl font-semibold tracking-tight'>{item.title}</h4>
                                {item.descriptor && <p className='mt-2 text-sm text-background/70'>{item.descriptor}</p>}
                                <span className='mt-4 block font-mono text-[10px] uppercase tracking-[0.22em] text-background/70'>{item.meta}</span>
                            </div>
                        </div>
                    )}

                    {!interactive && (
                        <Button
                            type='button'
                            variant='overlay'
                            size='pillSm'
                            className='absolute inset-x-3 bottom-3 z-10'
                            onClick={event => { stop(event); onOpenDetails() }}
                        >
                            View details
                        </Button>
                    )}
                </div>
            </div>
        )
    }

    if (item.kind === 'about') {
        return (
            <div data-preview-mode={mode} className='flex h-full flex-col bg-background'>
                <Avatar className='h-[59%] w-full shrink-0 rounded-none after:hidden'>
                    <AvatarImage src={item.avatarUrl} alt='Bennett Payoyo' className='rounded-none object-cover' />
                    <AvatarFallback className='rounded-none text-4xl'>BP</AvatarFallback>
                </Avatar>
                <div className='flex min-h-0 flex-1 flex-col border-t border-border p-6'>
                    <span className='font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'>{item.meta}</span>
                    <h4 className='mt-3 text-2xl font-semibold tracking-tight text-foreground'>Bennett Payoyo</h4>
                    <p className='mt-3 text-sm leading-relaxed text-muted-foreground'>{item.summary}</p>
                    <p className='mt-auto text-xs text-muted-foreground'>{item.focus.join(' · ')}</p>
                </div>
            </div>
        )
    }

    if (item.kind === 'resume') {
        return (
            <div data-preview-mode={mode} className='flex h-full flex-col bg-background'>
                <span className='px-6 pt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'>{item.meta}</span>
                <div className='mx-6 mt-4 min-h-0 flex-1 overflow-hidden border border-border bg-background shadow-sm'>
                    <ResumePdf file={item.pdfUrl} />
                </div>
                <div className='flex items-center gap-3 p-6'>
                    <Button render={<a href={item.pdfUrl} download />} nativeButton={false} variant='overlay' size='pillSm' onClick={stop}>Download</Button>
                    <a href={item.sourceUrl} target='_blank' rel='noreferrer' onClick={stop} className='text-xs font-medium text-foreground hover:underline'>Reviewed source ↗</a>
                </div>
            </div>
        )
    }

    return (
        <div data-preview-mode={mode} className='flex h-full flex-col bg-background p-6'>
            <span className='font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'>{item.meta}</span>
            <h4 className='mt-5 text-3xl font-semibold tracking-tight text-foreground'>@{item.login}</h4>
            {github ? (
                <>
                    <p className='mt-2 text-sm text-muted-foreground'>{github.publicRepos} public repositories · updated {github.fetchedAt.slice(0, 10)}</p>
                    <ul className='mt-6 space-y-2 text-foreground'>
                        {github.repos.slice(0, 6).map(repo => (
                            <li key={repo.url} className='grid grid-cols-[1fr_auto] gap-x-4 font-mono text-xs'>
                                <span>{repo.name}</span>
                                <span className='text-muted-foreground'>{repo.language ?? ''}</span>
                            </li>
                        ))}
                    </ul>
                    <ul className='mt-5 space-y-2 text-xs text-muted-foreground'>
                        {github.commits.slice(0, 3).map(commit => <li key={commit.url}>{commit.message}</li>)}
                    </ul>
                </>
            ) : (
                <p className='mt-6 text-sm text-muted-foreground'>GitHub data is temporarily unavailable.</p>
            )}
            <a href={item.profileUrl} target='_blank' rel='noreferrer' onClick={stop} className='mt-auto text-sm font-medium text-foreground hover:underline'>Open GitHub profile ↗</a>
        </div>
    )
}
