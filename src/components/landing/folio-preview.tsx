import type { FC, MouseEvent, ReactNode } from 'react'
import type { GitHubSnapshot, PortfolioItem } from '@/types'
import type { PreviewPresentation } from '@/lib/portfolio'

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

    if (item.kind === 'project') {
        const live = presentation === 'live-passive' || presentation === 'live-interactive'
        const interactive = presentation === 'live-interactive'

        return (
            <div data-preview-mode={mode} className='relative h-full w-full overflow-hidden bg-muted'>
                {live && item.liveUrl ? (
                    <iframe
                        src={item.liveUrl}
                        title={`Live ${item.title} project preview`}
                        loading='lazy'
                        referrerPolicy='strict-origin-when-cross-origin'
                        className='h-full w-full border-0 bg-background'
                        style={{ pointerEvents: interactive ? 'auto' : 'none' }}
                    />
                ) : (
                    <div className='flex h-full flex-col justify-between bg-foreground p-6 text-background'>
                        <span className='font-mono text-[10px] uppercase tracking-[0.22em]'>{item.meta}</span>
                        <h4 className='text-3xl font-semibold tracking-tight'>{item.title}</h4>
                        <span className='font-mono text-[10px] uppercase tracking-[0.22em]'>{item.relationship}</span>
                    </div>
                )}

                <div className='absolute inset-x-3 top-3 z-10 flex items-center justify-between gap-2'>
                    <a href={item.sourceUrl} target='_blank' rel='noreferrer' onClick={stop} className='rounded-full bg-background/90 px-3 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-background'>
                        Source
                    </a>

                    {item.liveUrl && (
                        <a href={item.liveUrl} target='_blank' rel='noreferrer' onClick={stop} className='rounded-full bg-background/90 px-3 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-background'>
                            Open live site
                        </a>
                    )}

                    {presentation === 'live-passive' && (
                        <button type='button' onClick={event => { stop(event); onInteract() }} className='rounded-full bg-foreground px-3 py-2 text-xs font-medium text-background shadow-sm hover:bg-foreground/90'>
                            Interact
                        </button>
                    )}

                    {interactive && (
                        <button type='button' onClick={event => { stop(event); onExitInteract() }} className='rounded-full bg-foreground px-3 py-2 text-xs font-medium text-background shadow-sm hover:bg-foreground/90'>
                            Exit preview
                        </button>
                    )}
                </div>

                {!interactive && (
                    <button type='button' onClick={event => { stop(event); onOpenDetails() }} className='absolute inset-x-3 bottom-3 z-10 rounded-full bg-background/90 px-3 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-background'>
                        View details
                    </button>
                )}
            </div>
        )
    }

    if (item.kind === 'about') {
        return (
            <div data-preview-mode={mode} className='flex h-full flex-col bg-background'>
                <img src={item.avatarUrl} alt='Bennett Payoyo' className='h-[59%] w-full object-cover' />
                <div className='flex min-h-0 flex-1 flex-col p-6'>
                    <span className='font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'>{item.meta}</span>
                    <h4 className='mt-3 text-3xl font-semibold tracking-tight text-foreground'>Bennett Payoyo</h4>
                    <p className='mt-3 text-sm leading-relaxed text-muted-foreground'>{item.summary}</p>
                    <p className='mt-auto text-xs text-muted-foreground'>{item.focus.join(' · ')}</p>
                </div>
            </div>
        )
    }

    if (item.kind === 'resume') {
        return (
            <div data-preview-mode={mode} className='flex h-full flex-col bg-background p-6'>
                <span className='font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'>{item.meta}</span>
                <h4 className='mt-5 text-3xl font-semibold tracking-tight text-foreground'>Bennett Payoyo</h4>
                <p className='mt-3 text-sm text-muted-foreground'>{item.status} · {item.program}</p>
                <p className='mt-1 text-sm text-muted-foreground'>{item.school}</p>
                <p className='mt-6 text-sm leading-relaxed text-muted-foreground'>{item.summary}</p>
                <a href={item.sourceUrl} target='_blank' rel='noreferrer' onClick={stop} className='mt-auto text-sm font-medium text-foreground hover:underline'>Reviewed source ↗</a>
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
                    <ul className='mt-6 space-y-2 text-sm text-foreground'>
                        {github.repos.slice(0, 6).map(repo => <li key={repo.url}>{repo.name}{repo.fork ? ' · fork' : ''}</li>)}
                    </ul>
                    <ul className='mt-5 space-y-2 text-xs text-muted-foreground'>
                        {github.commits.slice(0, 4).map(commit => <li key={commit.url}>{commit.message}</li>)}
                    </ul>
                </>
            ) : (
                <p className='mt-6 text-sm text-muted-foreground'>GitHub data is temporarily unavailable.</p>
            )}
            <a href={item.profileUrl} target='_blank' rel='noreferrer' onClick={stop} className='mt-auto text-sm font-medium text-foreground hover:underline'>Open GitHub profile ↗</a>
        </div>
    )
}
