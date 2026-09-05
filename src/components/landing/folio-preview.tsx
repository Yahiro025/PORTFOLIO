import type { FC, MouseEvent, ReactNode } from 'react'
import type { GitHubSnapshot, PortfolioItem } from '@/types'
import type { PreviewPresentation } from '@/lib/portfolio'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

import { cn } from '@/lib/utils'
import { shouldMountProjectIframe, shouldMountResumePdf } from '@/lib/portfolio'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ContactLanyard } from '@/components/landing/contact-lanyard'
import { PROFILE_IMAGE } from '@/constants/folio'

const ResumePdf = dynamic(
    () => import('@/components/landing/resume-pdf').then(module => module.ResumePdf),
    { ssr: false }
)

const ProfileCard = dynamic(
    () => import('@/components/landing/profile-card').then(module => module.ProfileCard),
    { ssr: false }
)

const LANGUAGE_DOT_COLOR: Record<string, string> = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    Python: '#3572A5',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Shell: '#89e051'
}

const IFRAME_DESKTOP_WIDTH = 1440
const IFRAME_ZOOM_OUT = 0.85

// Projects whose own responsive breakpoints (or awkward crop at the
// preview box's aspect ratio) look better rendered at a fixed desktop
// width and scaled down, rather than filling the box at native size.
// `align: 'top'` crops a page taller than the box from its top (hero fold).
// `align: 'center'` is for a page shorter than the box, so it doesn't get
// pinned to the top with a large dead zone below.
const DESKTOP_SCALE_IFRAME: Record<string, { height: string; align: 'top' | 'center' }> = {
    tanglaw: { height: '2400px', align: 'top' },
    bantayog: { height: '950px', align: 'center' }
}

interface FolioPreviewProps {
    item: PortfolioItem
    presentation: PreviewPresentation
    github: GitHubSnapshot | null
    mode: 'reel' | 'detail'
    renderedIndex?: number
    activeIndex?: number
    settledIndex?: number | null
    liveMountEnabled?: boolean
    onInteract: () => void
    onExitInteract: () => void
    onOpenDetails: () => void
}

export const FolioPreview: FC<FolioPreviewProps> = ({
    item,
    presentation,
    github,
    mode,
    renderedIndex = 0,
    activeIndex = 0,
    settledIndex = null,
    liveMountEnabled = true,
    onInteract,
    onExitInteract,
    onOpenDetails
}): ReactNode => {
    const stop = (event: MouseEvent<HTMLElement>) => event.stopPropagation()

    const [contactOpen, setContactOpen] = useState(false)

    const iframeWrapRef = useRef<HTMLDivElement>(null)
    const [iframeWrapSize, setIframeWrapSize] = useState({ width: 0, height: 0 })

    const mountProjectIframe = item.kind === 'project'
        && shouldMountProjectIframe(presentation, item.liveUrl)
    const projectLiveUrl = item.kind === 'project' ? item.liveUrl : null

    useEffect(() => {
        if (!mountProjectIframe || !projectLiveUrl) return

        const origin = new URL(projectLiveUrl).origin
        const selector = `link[data-preview-preconnect="${origin}"]`

        if (document.querySelector(selector)) return

        const link = document.createElement('link')
        link.rel = 'preconnect'
        link.href = origin
        link.crossOrigin = 'anonymous'
        link.setAttribute('data-preview-preconnect', origin)
        document.head.appendChild(link)

        return () => {
            link.remove()
        }
    }, [mountProjectIframe, projectLiveUrl])

    useEffect(() => {
        const el = iframeWrapRef.current
        if (!el) return

        const observer = new ResizeObserver(([entry]) => {
            setIframeWrapSize({ width: entry.contentRect.width, height: entry.contentRect.height })
        })
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    // Below this width the box is a narrow mobile card/detail panel, where
    // scaling a fixed desktop-width render down leaves mostly dead space.
    // The site's own native mobile layout fills that space instead. A
    // 'center'-aligned item's content is landscape-shaped (short and wide),
    // so it also needs the box itself to be landscape/square — the detail
    // panel is structurally portrait (~0.8 width/height, always taller than
    // wide), and "contain"-fitting a wide screenshot into a tall box always
    // letterboxes there regardless of raw width.
    const desktopScaleCfg = item.kind === 'project' ? DESKTOP_SCALE_IFRAME[item.id] : undefined
    const useDesktopScale = !!desktopScaleCfg
        && iframeWrapSize.width >= 560
        && (desktopScaleCfg.align !== 'center' || iframeWrapSize.width >= iframeWrapSize.height)

    let iframeScale = 0
    if (useDesktopScale && desktopScaleCfg) {
        const cfg = desktopScaleCfg
        const widthScale = (iframeWrapSize.width / IFRAME_DESKTOP_WIDTH) * IFRAME_ZOOM_OUT

        if (cfg.align === 'center' && iframeWrapSize.height > 0) {
            // Fit the whole page inside the box on both axes (like
            // object-fit: contain) rather than filling it — filling would
            // crop the logo/content on whichever axis overflows. The
            // bordered/shadowed frame below makes the remaining space read
            // as deliberate padding around a screenshot, not blank/broken.
            const heightScale = (iframeWrapSize.height / parseInt(cfg.height, 10)) * IFRAME_ZOOM_OUT
            iframeScale = Math.min(widthScale, heightScale)
        } else {
            iframeScale = widthScale
        }
    }

    if (item.kind === 'project') {
        const interactive = presentation === 'live-interactive'
        const mountIframe = mountProjectIframe

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
                    {mountIframe && (
                        useDesktopScale ? (
                            <iframe
                                src={item.liveUrl}
                                title={`Live ${item.title} project preview`}
                                loading='lazy'
                                referrerPolicy='strict-origin-when-cross-origin'
                                scrolling={interactive ? 'yes' : 'no'}
                                className={cn(
                                    'absolute left-1/2 bg-background',
                                    DESKTOP_SCALE_IFRAME[item.id].align === 'center'
                                        ? 'top-1/2 origin-center rounded-lg border border-border shadow-sm'
                                        : 'top-0 origin-top border-0'
                                )}
                                style={{
                                    width: `${IFRAME_DESKTOP_WIDTH}px`,
                                    height: DESKTOP_SCALE_IFRAME[item.id].height,
                                    transform: DESKTOP_SCALE_IFRAME[item.id].align === 'center'
                                        ? `translate(-50%, -50%) scale(${iframeScale})`
                                        : `translateX(-50%) scale(${iframeScale})`,
                                    visibility: mountIframe && iframeScale ? 'visible' : 'hidden',
                                    pointerEvents: interactive ? 'auto' : 'none'
                                }}
                            />
                        ) : (
                            <iframe
                                src={item.liveUrl}
                                title={`Live ${item.title} project preview`}
                                loading='lazy'
                                referrerPolicy='strict-origin-when-cross-origin'
                                scrolling={interactive ? 'yes' : 'no'}
                                className='absolute inset-0 h-full w-full border-0 bg-background'
                                style={{
                                    visibility: mountIframe ? 'visible' : 'hidden',
                                    pointerEvents: interactive ? 'auto' : 'none'
                                }}
                            />
                        )
                    )}

                    {!mountIframe && (
                        <div className='absolute inset-0 flex h-full flex-col bg-foreground text-background'>
                            {item.posterUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={item.posterUrl}
                                    alt=''
                                    aria-hidden
                                    className='absolute inset-0 h-full w-full object-cover object-top'
                                />
                            )}
                            <div
                                className={cn(
                                    'relative mt-auto min-h-0 p-6',
                                    item.posterUrl && 'bg-gradient-to-t from-black/85 via-black/40 to-transparent pt-16'
                                )}
                            >
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
                {mode === 'detail' ? (
                    <div className='profile-card-slot h-[54%] w-full shrink-0 bg-background'>
                        <ProfileCard
                            avatarUrl={item.avatarUrl}
                            iconUrl='/profile-icon-pattern.svg'
                            name='Bennett Payoyo'
                            title='Full-stack Software Engineer'
                            handle='Yahiro025'
                            status='Open to work'
                            contactText='Contact'
                            enableTilt
                            enableMobileTilt={false}
                            behindGlowEnabled
                            onContactClick={() => setContactOpen(true)}
                        />
                        <ContactLanyard open={contactOpen} onOpenChange={setContactOpen} />
                    </div>
                ) : (
                    <picture className='block h-[59%] w-full shrink-0'>
                        <source
                            type='image/webp'
                            srcSet={PROFILE_IMAGE.srcSet}
                            sizes={PROFILE_IMAGE.sizes}
                        />
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
                )}
                <div className={cn('flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto border-t border-border p-6', mode === 'detail' && 'justify-center')}>
                    <div>
                        <h4 className='text-lg font-semibold uppercase tracking-tight text-foreground'>Bennett Payoyo</h4>
                        <span className='mt-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/65'>{item.tagline}</span>
                    </div>

                    {mode === 'detail' && (
                        <div>
                            <span className='font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/65'>Currently</span>
                            <ul className='mt-2 space-y-1.5 text-sm text-foreground/65'>
                                {item.currently.map(line => (
                                    <li key={line} className='flex gap-2'>
                                        <span className='shrink-0 text-foreground/40'>–</span>
                                        <span>{line}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    if (item.kind === 'resume') {
        const mountResumePdf = shouldMountResumePdf(
            item,
            renderedIndex,
            activeIndex,
            settledIndex,
            mode,
            liveMountEnabled
        )

        const resumePreview = mountResumePdf
            ? <ResumePdf file={item.pdfUrl} />
            : (
                <div
                    aria-hidden
                    className='flex h-full w-full items-center justify-center bg-muted'
                >
                    <div className='aspect-[1/1.414] h-full max-h-full w-auto border border-border bg-background shadow-sm' />
                </div>
            )

        return (
            <div data-preview-mode={mode} className='flex h-full flex-col bg-background'>
                <span className='px-6 pt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/65'>Resume preview</span>
                {mode === 'detail' ? (
                    <a
                        href={item.pdfUrl}
                        target='_blank'
                        rel='noreferrer'
                        aria-label='Open the full resume PDF in a new tab'
                        className='mx-6 my-4 block min-h-0 flex-1 overflow-hidden border border-border bg-background shadow-sm outline-none transition-colors hover:border-foreground/35 focus-visible:border-foreground/50 focus-visible:ring-2 focus-visible:ring-foreground/30'
                    >
                        {resumePreview}
                    </a>
                ) : (
                    <div className='mx-6 my-4 min-h-0 flex-1 overflow-hidden border border-border bg-background shadow-sm'>
                        {resumePreview}
                    </div>
                )}
            </div>
        )
    }

    const repoCount = mode === 'detail' ? 6 : 4

    return (
        <div data-preview-mode={mode} className='flex h-full flex-col overflow-y-auto bg-background p-6'>
            {github ? (
                <>
                    <div className='flex items-start gap-4'>
                        <Avatar className='size-16 shrink-0 after:hidden'>
                            <AvatarImage src={github.avatarUrl} alt={github.name} />
                            <AvatarFallback>{github.login.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className='min-w-0'>
                            <h4 className='truncate text-xl font-semibold tracking-tight text-foreground'>{github.name}</h4>
                            <p className='text-sm text-muted-foreground'>@{github.login}</p>
                        </div>
                    </div>

                    {github.bio && <p className='mt-4 text-sm text-foreground'>{github.bio}</p>}

                    <p className='mt-3 text-xs text-muted-foreground'>
                        <span className='font-semibold text-foreground'>{github.followers}</span> followers
                        <span className='mx-1.5'>·</span>
                        <span className='font-semibold text-foreground'>{github.following}</span> following
                        <span className='mx-1.5'>·</span>
                        {github.publicRepos} repositories
                    </p>

                    <span className='mt-6 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'>Pinned</span>
                    <ul className={cn('mt-3 grid gap-3', mode === 'detail' && 'sm:grid-cols-2')}>
                        {github.repos.slice(0, repoCount).map(repo => (
                            <li key={repo.url} className='rounded-lg border border-border p-3'>
                                <a
                                    href={repo.url}
                                    target='_blank'
                                    rel='noreferrer'
                                    onClick={stop}
                                    className='block truncate text-sm font-semibold text-foreground hover:underline'
                                >
                                    {repo.name}
                                </a>
                                {repo.description && (
                                    <p className='mt-1 line-clamp-2 text-xs text-muted-foreground'>{repo.description}</p>
                                )}
                                <div className='mt-2 flex items-center gap-4 text-xs text-muted-foreground'>
                                    {repo.language && (
                                        <span className='flex items-center gap-1.5'>
                                            <span
                                                className='size-2.5 rounded-full'
                                                style={{ backgroundColor: LANGUAGE_DOT_COLOR[repo.language] ?? 'var(--muted-foreground)' }}
                                            />
                                            {repo.language}
                                        </span>
                                    )}
                                    {repo.stars > 0 && <span>★ {repo.stars}</span>}
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            ) : (
                <p className='mt-6 text-sm text-muted-foreground'>GitHub data is temporarily unavailable.</p>
            )}
        </div>
    )
}
