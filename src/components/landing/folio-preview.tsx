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
            <div data-preview-mode={mode} className='relative flex h-full w-full flex-col overflow-hidden border border-[#333] bg-[#101010] text-foreground'>
                {mode === 'reel' && (
                    <div className='z-10 flex flex-wrap items-center gap-2 border-b border-[#333] bg-[#101010] px-3 py-2'>
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

                <div ref={iframeWrapRef} className='relative mx-4 mt-4 min-h-0 flex-1 overflow-hidden border border-[#3b3b3b] bg-[#151515]'>
                    {mountIframe && (
                        useDesktopScale ? (
                            <iframe
                                src={item.liveUrl}
                                title={`Live ${item.title} project preview`}
                                loading='lazy'
                                referrerPolicy='strict-origin-when-cross-origin'
                                scrolling={interactive ? 'yes' : 'no'}
                                className={cn(
                                    'absolute left-1/2 bg-[#151515]',
                                    DESKTOP_SCALE_IFRAME[item.id].align === 'center'
                                        ? 'top-1/2 origin-center rounded-[3px] border border-[#555] shadow-none'
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
                                className='absolute inset-0 h-full w-full border-0 bg-[#151515]'
                                style={{
                                    visibility: mountIframe ? 'visible' : 'hidden',
                                    pointerEvents: interactive ? 'auto' : 'none'
                                }}
                            />
                        )
                    )}

                    {!mountIframe && (
                        <div className='absolute inset-0 flex h-full flex-col bg-[#151515] text-foreground'>
                            {item.posterUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={item.posterUrl}
                                    alt=''
                                    aria-hidden
                                    loading='lazy'
                                    decoding='async'
                                    fetchPriority='low'
                                    className='absolute inset-0 h-full w-full object-cover object-top opacity-[0.86]'
                                />
                            )}
                            {!item.posterUrl && (
                                <div className='absolute inset-0 grid place-items-center'>
                                    <span className='font-mono text-sm uppercase tracking-[0.18em] text-foreground/70'>{item.title}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {mode === 'reel' && !interactive && (
                        <Button
                            type='button'
                            variant='overlay'
                            size='pillSm'
                            className='absolute inset-x-3 bottom-3 z-10 border border-[#555] bg-[#101010]/90 font-mono text-[9px] uppercase tracking-[0.14em]'
                            onClick={event => { stop(event); onOpenDetails() }}
                        >
                            View details
                        </Button>
                    )}
                </div>

                {mode === 'reel' && (
                    <div className='shrink-0 border-t border-[#3b3b3b] px-4 pb-4 pt-3'>
                        <div className='flex items-baseline justify-between gap-3'>
                            <h4 className='font-mono text-lg leading-none tracking-tight text-foreground'>{item.title}</h4>
                            <span className='font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/50'>{item.year}</span>
                        </div>
                        <div className='mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-[0.14em] text-foreground/60'>
                            <span>{item.meta}</span>
                            {item.role && <span>{item.role}</span>}
                        </div>
                        <div className='mt-3 flex flex-wrap gap-2' aria-label='Technologies'>
                            {item.stack.map(tech => (
                                <span key={tech} className='rounded-[2px] border border-[#555] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/75'>
                                    {tech}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    if (item.kind === 'about') {
        return (
            <div data-preview-mode={mode} className='relative flex h-full flex-col overflow-hidden border border-[#333] bg-[#101010] text-foreground'>
                {mode === 'detail' ? (
                    <div className='profile-card-slot relative h-[54%] w-full shrink-0 overflow-hidden border-b border-[#3b3b3b] bg-[#151515]'>
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
                    <picture className={cn('relative flex w-full shrink-0 items-center justify-center overflow-hidden border-b border-[#3b3b3b] bg-[#151515] p-3', mode === 'reel' ? 'h-[46%]' : 'h-[59%]')}>
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
                            className='h-full w-full object-contain'
                        />
                    </picture>
                )}
                <div className={cn('flex min-h-0 flex-1 flex-col overflow-y-auto border-t border-[#333] bg-[#101010]', mode === 'detail' ? 'gap-4 p-6 justify-center' : 'gap-4 p-5 md:gap-5 md:p-6')}>
                    <div>
                        <h4 className='text-xl font-medium uppercase tracking-tight text-foreground'>Bennett Payoyo</h4>
                        {mode === 'reel' ? (
                            <span className='mt-1 block text-sm text-foreground/70'>Second-year Computer Science student · PUP</span>
                        ) : (
                            <span className='mt-1 block text-sm text-foreground/70 md:hidden'>2nd year BSCS · PUP</span>
                        )}
                        {mode === 'detail' && (
                            <span className='mt-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/65'>{item.tagline}</span>
                        )}
                    </div>

                    {mode === 'reel' ? (
                        <>
                            <p className='max-w-prose text-sm leading-relaxed text-foreground/85'>{item.summary}</p>
                            <div>
                                <span className='font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/65'>Currently</span>
                                <ul className='mt-2 space-y-2 border border-[#333] bg-[#151515] p-3 text-sm leading-relaxed text-foreground/70'>
                                    {item.currently.map((line, index) => (
                                        <li key={line} className='flex gap-3'>
                                            <span className='shrink-0 font-mono text-[9px] text-foreground/40'>{String(index + 1).padStart(2, '0')}</span>
                                            <span>{line}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </>
                    ) : (
                        <div>
                            <span className='font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/65'>Currently</span>
                            <ul className='mt-2 space-y-2 border border-[#333] bg-[#151515] p-3 text-sm text-foreground/65'>
                                {item.currently.map((line, index) => (
                                    <li key={line} className='flex gap-3'>
                                        <span className='shrink-0 font-mono text-[9px] text-foreground/40'>{String(index + 1).padStart(2, '0')}</span>
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
                    className='flex h-full w-full items-center justify-center bg-[#151515]'
                >
                    <div className='aspect-[1/1.414] h-full max-h-full w-auto border border-[#bdbdbd] bg-[#efefeb] shadow-[0_12px_24px_rgba(0,0,0,0.22)]' />
                </div>
            )

        const resumePaper = (
            <div className='min-h-0 flex-1 rotate-[-1.5deg] overflow-hidden border border-[#555] bg-[#efefeb] shadow-[0_18px_32px_rgba(0,0,0,0.24)]'>
                {resumePreview}
            </div>
        )

        return (
            <div data-preview-mode={mode} className='flex h-full flex-col overflow-hidden border border-[#333] bg-[#101010] text-foreground'>
                <span className='px-4 pt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/60'>Resume preview</span>
                {mode === 'detail' ? (
                    <a
                        href={item.pdfUrl}
                        target='_blank'
                        rel='noreferrer'
                        aria-label='Open the full resume PDF in a new tab'
                        className='mx-4 my-4 flex min-h-0 flex-1 overflow-hidden border border-[#333] bg-[#151515] p-3 shadow-none outline-none transition-colors hover:border-foreground/35 focus-visible:border-foreground/50 focus-visible:ring-2 focus-visible:ring-foreground/30'
                    >
                        {resumePaper}
                    </a>
                ) : (
                    <div className='mx-4 my-4 flex min-h-0 flex-1 overflow-hidden border border-[#333] bg-[#151515] p-3 shadow-none'>
                        {resumePaper}
                    </div>
                )}
            </div>
        )
    }

    const repoCount = mode === 'detail' ? 6 : 4

    return (
        <div data-preview-mode={mode} className='flex h-full flex-col overflow-y-auto border border-[#333] bg-[#101010] p-4 text-foreground md:p-5'>
            {github ? (
                <>
                    <div className='flex shrink-0 items-center gap-3 border-b border-[#333] pb-3 font-mono text-[9px] uppercase tracking-[0.14em]'>
                        <span className='flex gap-1.5' aria-hidden='true'>
                            <span className='size-1.5 rounded-full bg-foreground/25' />
                            <span className='size-1.5 rounded-full bg-foreground/25' />
                            <span className='size-1.5 rounded-full bg-foreground/25' />
                        </span>
                        <span className='truncate text-foreground/85'>@{github.login}</span>
                        <span className='ml-auto text-foreground/45'>Live public activity</span>
                    </div>

                    <div className='pt-5'>
                        <div className='flex items-start gap-4'>
                            <Avatar className='size-12 shrink-0 border border-[#555] grayscale after:hidden'>
                                <AvatarImage src={github.avatarUrl} alt={github.name} loading='lazy' />
                                <AvatarFallback>{github.login.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className='min-w-0'>
                                <h4 className='truncate text-xl font-medium tracking-tight text-foreground'>{github.name}</h4>
                                <p className='font-mono text-[10px] uppercase tracking-[0.14em] text-foreground/50'>@{github.login}</p>
                            </div>
                        </div>

                        {github.bio && <p className='mt-4 max-w-prose text-sm leading-relaxed text-foreground/75'>{github.bio}</p>}

                        <p className='mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-foreground/50'>
                            <span className='font-semibold text-foreground'>{github.followers}</span> followers
                            <span className='mx-1.5'>·</span>
                            <span className='font-semibold text-foreground'>{github.following}</span> following
                            <span className='mx-1.5'>·</span>
                            <span className='font-semibold text-foreground'>{github.publicRepos}</span> repositories
                            {typeof github.totalContributions === 'number' && github.totalContributions > 0 && (
                                <>
                                    <span className='mx-1.5'>·</span>
                                    <span className='font-semibold text-foreground'>{github.totalContributions}</span> contributions
                                </>
                            )}
                        </p>

                        <span className='mt-6 block font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/55'>Recent public work</span>
                        <ul className={cn('mt-3 grid gap-3', mode === 'detail' && 'sm:grid-cols-2')}>
                            {github.repos.slice(0, repoCount).map(repo => (
                                <li key={repo.url} className='rounded-[3px] border border-[#333] bg-[#151515] p-3 transition-colors hover:border-foreground/35'>
                                    <a
                                        href={repo.url}
                                        target='_blank'
                                        rel='noreferrer'
                                        onClick={stop}
                                        className='block truncate text-sm font-medium text-foreground hover:underline'
                                    >
                                        {repo.name}
                                    </a>
                                    {repo.description && (
                                        <p className='mt-1 line-clamp-2 text-xs text-foreground/55'>{repo.description}</p>
                                    )}
                                    <div className='mt-2 flex items-center gap-4 font-mono text-[10px] text-foreground/50'>
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

                    <div className='mt-6'>
                        <div className='flex items-center justify-between gap-3'>
                            <span className='font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/55'>Activity</span>
                            <span className='font-mono text-[9px] uppercase tracking-[0.14em] text-foreground/40'>
                                {github.totalContributions
                                    ? `${github.totalContributions} contributions / past year`
                                    : `${github.commits.length} recent commits`}
                            </span>
                        </div>
                        <div className='mt-3 grid w-fit grid-flow-col grid-rows-4 gap-1' aria-label='Recent public activity'>
                            {(github.contributions && github.contributions.length > 0
                                ? github.contributions.slice(-48)
                                : github.commits.slice(0, 48)
                            ).map((item, index) => {
                                const isContrib = 'level' in item
                                const level = isContrib ? item.level : (index % 7 === 0 ? 3 : index % 4 === 0 ? 2 : 1)
                                const count = isContrib ? item.count : 1
                                const label = isContrib
                                    ? `${count} contributions on ${item.date}`
                                    : `Commit ${item.message}`
                                const url = isContrib ? `https://github.com/${github.login}` : item.url
                                return (
                                    <a
                                        key={isContrib ? item.date : item.sha}
                                        href={url}
                                        target='_blank'
                                        rel='noreferrer'
                                        onClick={stop}
                                        aria-label={label}
                                        title={label}
                                        className={cn(
                                            'size-2 rounded-[1px] transition-colors hover:bg-foreground/80',
                                            level === 0 && 'bg-foreground/15',
                                            level === 1 && 'bg-foreground/35',
                                            level === 2 && 'bg-foreground/55',
                                            level === 3 && 'bg-foreground/75',
                                            level === 4 && 'bg-foreground'
                                        )}
                                    />
                                )
                            })}
                        </div>
                    </div>

                    {mode === 'reel' && (
                        <Button
                            render={<a href={item.profileUrl} target='_blank' rel='noreferrer' />}
                            nativeButton={false}
                            variant='overlay'
                            size='pillSm'
                            onClick={stop}
                            className='mt-5 w-fit self-end border border-[#555] bg-transparent font-mono text-[9px] uppercase tracking-[0.14em]'
                        >
                            Open Profile
                        </Button>
                    )}
                    </div>
                </>
            ) : (
                <p className='mt-6 text-sm text-muted-foreground'>GitHub data is temporarily unavailable.</p>
            )}
        </div>
    )
}
