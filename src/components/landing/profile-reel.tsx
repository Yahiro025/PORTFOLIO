import type { FC, ReactNode } from 'react'
import type { GitHubContributionDay, GitHubSnapshot, PortfolioItem } from '@/types'

import { useState } from 'react'

import { PROFILE_IMAGE } from '@/constants/folio'
import { siteConfig } from '@/constants/site'
import { cn } from '@/lib/utils'

type ProfileItem = Extract<PortfolioItem, { kind: 'about' | 'resume' | 'github' }>
type AboutItem = Extract<PortfolioItem, { kind: 'about' }>
type ResumeItem = Extract<PortfolioItem, { kind: 'resume' }>
type GitHubItem = Extract<PortfolioItem, { kind: 'github' }>
type ProjectItem = Extract<PortfolioItem, { kind: 'project' }>

type RepoCard = {
    name: string
    url: string
    description: string | null
    language: string | null
    stars?: number
}

export interface ProfileReelProps {
    items: PortfolioItem[]
    github: GitHubSnapshot | null
    activeId?: string
    initialActiveId?: string
    className?: string
    contactHref?: string
    onSelect?: (item: PortfolioItem) => void
    onBackToWork?: () => void
}

const ACTIVITY_TONES = [
    'bg-[#121212]',
    'bg-[#1c1c1c]',
    'bg-[#262626]',
    'bg-[#323232]',
    'bg-[#404040]'
]

const isProfileItem = (item: PortfolioItem): item is ProfileItem => item.kind !== 'project'

const isProjectItem = (item: PortfolioItem): item is ProjectItem => item.kind === 'project'

const padIndex = (value: number) => String(value).padStart(2, '0')

const ActionLink = ({
    href,
    children,
    muted = false
}: {
    href: string
    children: ReactNode
    muted?: boolean
}): ReactNode => (
    <a
        href={href}
        target='_blank'
        rel='noreferrer'
        className={cn(
            'cursor-target flex h-10 items-center justify-center gap-2 rounded-full border px-5 font-mono text-[10px] uppercase tracking-[0.14em] transition-transform hover:-translate-y-0.5 motion-reduce:transform-none',
            muted ? 'border-[#474747] text-[#8a8a86]' : 'border-[#676767] text-[#f2f2f0]'
        )}
    >
        {children}
        <span aria-hidden='true'>↗</span>
    </a>
)

const MetaBlock = ({
    item,
    index,
    total,
    children
}: {
    item: ProfileItem
    index: number
    total: number
    children?: ReactNode
}): ReactNode => (
    <div className='relative z-10 mt-2 flex flex-col gap-2 px-1 lg:pl-8'>
        <p className='font-mono text-[1.3rem] leading-none tracking-[-0.04em] text-[#f2f2f0]'>
            {padIndex(index + 1)} / {item.title.toUpperCase()}
        </p>
        <p className='font-mono text-[10px] uppercase tracking-[0.16em] text-[#8a8a86]'>
            {item.meta} · {padIndex(total)} PROFILE STATES
        </p>
        {children}
    </div>
)

const Portrait = ({ item }: { item: AboutItem }): ReactNode => (
    <picture className='block h-full w-full'>
        <source type='image/webp' srcSet={PROFILE_IMAGE.srcSet} sizes={PROFILE_IMAGE.sizes} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
            src={item.avatarUrl || PROFILE_IMAGE.src}
            alt={siteConfig.name}
            width={PROFILE_IMAGE.width}
            height={PROFILE_IMAGE.height}
            loading='eager'
            fetchPriority='high'
            decoding='async'
            onError={event => {
                event.currentTarget.src = PROFILE_IMAGE.fallbackSrc
            }}
            className='h-full w-full object-contain p-8 grayscale'
        />
    </picture>
)

const AboutPanel = ({ item }: { item: AboutItem }): ReactNode => (
    <div className='relative min-h-[43rem]'>
        <div className='pointer-events-none absolute left-[2%] top-0 hidden h-[41.5rem] w-[82%] overflow-hidden rounded-[4px] border border-[#343434] bg-[#0d0d0d] lg:block'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src='/pup-campus.webp'
                alt=''
                width='1086'
                height='1448'
                loading='eager'
                decoding='async'
                aria-hidden='true'
                className='absolute inset-0 h-full w-full object-cover grayscale opacity-[0.36]'
            />
            <div className='pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0d0d0d]/65 via-[#0d0d0d]/35 to-[#0d0d0d]/80' />
            <p className='absolute left-9 top-7 z-10 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8a8a86]'>
                FULL-STACK SOFTWARE ENGINEERING
            </p>
            <p className='absolute right-[-6rem] top-7 z-10 text-right text-lg leading-tight text-[#8a8a86]'>
                Build. Study the system.
                <br />
                Ship. Repeat.
            </p>
        </div>

        <article className='relative z-10 mx-auto min-h-[38rem] w-full max-w-[35rem] rounded-[8px] border border-[#535353] bg-[#0f0f0f] p-8 lg:absolute lg:left-[5rem] lg:top-[1.4rem] lg:mx-0 lg:h-[38.125rem] lg:rotate-[-1.5deg]'>
            <div className='relative h-[18.75rem] overflow-hidden rounded-[4px] border border-[#2c2c2c] bg-[#181818]'>
                <Portrait item={item} />
                <div className='pointer-events-none absolute inset-0 bg-gradient-to-t from-[#181818]/80 via-transparent to-transparent' />
                <p className='absolute bottom-3 left-5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#555552]'>
                    PROFILE IMAGE · {PROFILE_IMAGE.src}
                </p>
            </div>

            <h2 className='mt-6 text-[1.7rem] font-medium leading-none tracking-[-0.04em] text-[#f2f2f0]'>
                {siteConfig.name.toUpperCase()}
            </h2>
            <p className='mt-2 text-[12px] leading-relaxed text-[#8a8a86]'>{item.tagline}</p>
            <div className='my-6 h-px w-full bg-[#343434]' />
            <p className='max-w-[32rem] text-[13px] leading-[1.45] text-[#b7b7b3]'>{item.summary}</p>
        </article>

        <aside className='relative z-20 mx-auto mt-[-1rem] min-h-[22.8rem] w-full max-w-[15.625rem] rotate-[1.5deg] rounded-[8px] border border-[#3a3a3a] bg-[#111111] p-9 lg:absolute lg:right-0 lg:top-[8.5rem] lg:mt-0'>
            <p className='font-mono text-[10px] uppercase tracking-[0.16em] text-[#8a8a86]'>CURRENTLY</p>
            <ol className='mt-8 space-y-8'>
                {item.currently.map((entry, index) => (
                    <li key={entry} className='grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2'>
                        <span className='font-mono text-[10px] text-[#555552]'>{padIndex(index + 1)}</span>
                        <span className='text-[12px] leading-[1.35] text-[#f2f2f0]'>{entry}</span>
                    </li>
                ))}
            </ol>
        </aside>
    </div>
)

const ResumePanel = ({ item }: { item: ResumeItem }): ReactNode => (
    <div className='relative min-h-[43rem]'>
        <div className='pointer-events-none absolute left-[14%] top-0 hidden h-[42rem] w-[65%] rotate-[-3.2deg] rounded-[5px] border border-[#3b3b3b] bg-[#1a1a1a] lg:block'>
            <p className='absolute right-[-1rem] top-8 text-right text-[2.15rem] font-medium leading-none text-[#777773]'>
                EXPERIENCE
                <br />
                PROJECTS
                <br />
                EDUCATION
            </p>
        </div>

        <article className='relative z-10 mx-auto min-h-[42.5rem] w-full max-w-[36rem] rotate-[2.1deg] rounded-[5px] border border-[#b9b9b3] bg-[#ecece7] p-8 text-[#181818] lg:absolute lg:left-[2rem] lg:top-[1.3rem] lg:mx-0'>
            <h2 className='text-[1.85rem] font-medium leading-none tracking-[-0.04em]'>{siteConfig.name.toUpperCase()}</h2>
            <p className='mt-2 text-[12px] text-[#50504d]'>
                {[item.program, item.status].filter(Boolean).join(' · ')}
            </p>
            <div className='my-5 h-px w-full bg-[#8a8a84]' />

            <p className='font-mono text-[10px] uppercase tracking-[0.14em] text-[#5d5d58]'>EDUCATION</p>
            <h3 className='mt-7 text-[17px] font-medium leading-tight'>{item.school}</h3>
            <p className='mt-2 text-[12px] text-[#51514d]'>{item.program} · {item.status}</p>

            <div className='mt-8 space-y-5'>
                {item.highSchools.map(school => (
                    <div key={school.name}>
                        <p className='text-[13px] font-medium'>{school.name}</p>
                        <p className='mt-1 text-[11px] text-[#62625d]'>{school.level}</p>
                    </div>
                ))}
            </div>

            <div className='my-7 h-px w-full bg-[#a1a19a]' />
            <p className='font-mono text-[10px] uppercase tracking-[0.14em] text-[#5d5d58]'>CURRENT FOCUS</p>
            <ol className='mt-5 space-y-3'>
                {item.focus.map((focus, index) => (
                    <li key={focus} className='grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2 text-[12px]'>
                        <span className='font-mono text-[10px] text-[#777770]'>{padIndex(index + 1)}</span>
                        <span>{focus}</span>
                    </li>
                ))}
            </ol>
            <p className='mt-7 text-[11px] leading-relaxed text-[#575752]'>{item.summary}</p>
        </article>

        <aside className='relative z-20 mx-auto mt-8 w-full max-w-[15.625rem] rotate-[-1.5deg] rounded-[8px] border border-[#3a3a3a] bg-[#101010] p-7 text-[#f2f2f0] lg:absolute lg:right-0 lg:top-[8.8rem] lg:mt-0'>
            <p className='font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a8a86]'>RESUME / {item.year}</p>
            <p className='mt-9 text-[13px] leading-relaxed'>
                A compact view of education, projects, experience, and technical focus.
            </p>
            <div className='mt-16 flex flex-col gap-3'>
                <ActionLink href={item.pdfUrl}>VIEW RESUME</ActionLink>
                <ActionLink href={item.sourceUrl} muted>SOURCE</ActionLink>
            </div>
        </aside>
    </div>
)

const ACTIVITY_LEVEL_TONES = [
    'bg-[#181818] border border-[#222222]',
    'bg-[#343434]',
    'bg-[#585854]',
    'bg-[#9a9a94]',
    'bg-[#f2f2f0]'
]

const getActivityTone = (commit: GitHubSnapshot['commits'][number] | null, index: number) => {
    if (!commit) return ACTIVITY_TONES[0]
    const seed = commit.sha.length > 0 ? commit.sha.charCodeAt(index % commit.sha.length) : index
    return ACTIVITY_TONES[(seed % (ACTIVITY_TONES.length - 1)) + 1]
}

const ActivityGrid = ({ github }: { github: GitHubSnapshot | null }): ReactNode => {
    const commits = github?.commits ?? []
    const contributions = github?.contributions ?? []
    const cellCount = 5 * 22

    const days = contributions.length > 0
        ? contributions.slice(-cellCount)
        : []
    const paddedDays: (GitHubContributionDay | null)[] = days.length > 0
        ? (days.length < cellCount ? [...Array.from({ length: cellCount - days.length }, () => null), ...days] : days)
        : []

    const totalContributions = github?.totalContributions ?? (contributions.length > 0 ? contributions.reduce((s, c) => s + c.count, 0) : 0)

    return (
        <div className='min-w-0 flex-1'>
            <div className='flex items-baseline justify-between gap-3'>
                <p className='font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a8a86]'>ACTIVITY</p>
                <span className='font-mono text-[9px] uppercase tracking-[0.12em] text-[#8a8a86]'>
                    {totalContributions > 0
                        ? `${totalContributions} contributions / past year`
                        : commits.length > 0
                            ? `${commits.length} recent commits`
                            : 'Activity unavailable'}
                </span>
            </div>

            <div className='mt-4 grid grid-cols-[repeat(22,minmax(0,1fr))] gap-1' aria-hidden='true'>
                {paddedDays.length > 0 ? (
                    paddedDays.map((day, index) => {
                        const level = day ? Math.min(Math.max(day.level, 0), 4) : 0
                        const tone = ACTIVITY_LEVEL_TONES[level]
                        const title = day
                            ? `${day.count} ${day.count === 1 ? 'contribution' : 'contributions'} on ${day.date}`
                            : 'No data'
                        return (
                            <span
                                key={`${day?.date ?? 'pad'}-${index}`}
                                title={title}
                                className={cn('aspect-square w-full rounded-[2px] transition-transform hover:scale-125', tone)}
                            />
                        )
                    })
                ) : (
                    Array.from({ length: cellCount }, (_, index) => {
                        const commit = commits[index] ?? null
                        return (
                            <span
                                key={`${commit?.sha ?? 'empty'}-${index}`}
                                title={commit ? `${commit.message} (${commit.repo})` : undefined}
                                className={cn('aspect-square w-full rounded-[2px]', getActivityTone(commit, index))}
                            />
                        )
                    })
                )}
            </div>

            <p className='sr-only'>
                {totalContributions > 0
                    ? `${totalContributions} public contributions in the last year.`
                    : commits.length > 0
                        ? `${commits.length} recent public commits in the loaded snapshot.`
                        : 'Public activity loaded from GitHub.'}
            </p>
        </div>
    )
}

const getRepoCards = (items: PortfolioItem[], github: GitHubSnapshot | null): RepoCard[] => {
    if (github && github.repos.length > 0) {
        return github.repos.slice(0, 4).map(({ name, url, description, language, stars }) => ({
            name,
            url,
            description,
            language,
            stars
        }))
    }

    return items
        .filter(isProjectItem)
        .slice(0, 4)
        .map(item => ({
            name: item.repo,
            url: item.sourceUrl,
            description: item.descriptor ?? item.summary,
            language: item.stack[0] ?? null
        }))
}

const GitHubPanel = ({
    item,
    github,
    repositories
}: {
    item: GitHubItem
    github: GitHubSnapshot | null
    repositories: RepoCard[]
}): ReactNode => {
    const login = github?.login ?? item.login

    return (
        <div className='relative min-h-[43rem]'>
            <div className='pointer-events-none absolute left-0 top-0 hidden h-[34.5rem] w-[45.6rem] rotate-[2.5deg] rounded-[5px] border border-[#363636] bg-[#0d0d0d] lg:block'>
                <p className='absolute left-8 top-7 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a8a86]'>CODE / BUILD / SHIP</p>
            </div>

            <article className='relative z-10 mx-auto min-h-[34.25rem] w-full max-w-[44rem] rounded-[7px] border border-[#535353] bg-[#0f0f0f] lg:absolute lg:left-[2rem] lg:top-[1.25rem] lg:mx-0 xl:left-[4rem]'>
                <div className='flex h-12 items-center gap-4 border-b border-[#303030] px-5'>
                    <div className='flex gap-2' aria-hidden='true'>
                        <span className='size-1.5 rounded-full bg-[#404040]' />
                        <span className='size-1.5 rounded-full bg-[#404040]' />
                        <span className='size-1.5 rounded-full bg-[#404040]' />
                    </div>
                    <span className='font-mono text-[10px] text-[#f2f2f0]'>@{login}</span>
                    <span className='ml-auto font-mono text-[9px] uppercase tracking-[0.12em] text-[#8a8a86]'>LIVE PUBLIC ACTIVITY</span>
                </div>

                <div className='p-7'>
                    <h2 className='text-[1.95rem] font-medium leading-none tracking-[-0.04em] text-[#f2f2f0]'>
                        {item.descriptor ?? item.title}
                    </h2>
                    <p className='mt-3 max-w-[32rem] text-[12px] leading-relaxed text-[#8a8a86]'>{item.summary}</p>

                    <div className='mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-[#262626] py-3 font-mono text-[11px] text-[#8a8a86]'>
                        <div>
                            <span className='font-semibold text-[#f2f2f0]'>{github?.publicRepos ?? '—'}</span>{' '}
                            <span>REPOSITORIES</span>
                        </div>
                        <span className='text-[#404040]' aria-hidden='true'>·</span>
                        <div>
                            <span className='font-semibold text-[#f2f2f0]'>{github?.totalContributions ?? '—'}</span>{' '}
                            <span>CONTRIBUTIONS</span>
                        </div>
                        <span className='text-[#404040]' aria-hidden='true'>·</span>
                        <div>
                            <span className='font-semibold text-[#f2f2f0]'>{github?.followers ?? '—'}</span>{' '}
                            <span>FOLLOWERS</span>
                        </div>
                        <span className='text-[#404040]' aria-hidden='true'>·</span>
                        <div>
                            <span className='font-semibold text-[#f2f2f0]'>{github?.following ?? '—'}</span>{' '}
                            <span>FOLLOWING</span>
                        </div>
                    </div>

                    <p className='mt-6 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a8a86]'>RECENT PUBLIC WORK</p>
                    <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                        {repositories.map(repository => (
                            <a
                                key={repository.url}
                                href={repository.url}
                                target='_blank'
                                rel='noreferrer'
                                className='cursor-target group flex min-h-[4.25rem] flex-col justify-between rounded-[5px] border border-[#2e2e2e] bg-[#151515] p-3.5 transition-colors hover:border-[#666666] motion-reduce:transition-none'
                            >
                                <div className='flex items-center justify-between gap-2'>
                                    <span className='text-[12px] font-medium text-[#f2f2f0] group-hover:underline'>{repository.name}</span>
                                    {repository.stars !== undefined && repository.stars > 0 && (
                                        <span className='font-mono text-[10px] text-[#8a8a86]'>★ {repository.stars}</span>
                                    )}
                                </div>
                                <span className='truncate text-[10px] text-[#777773]'>
                                    {repository.description ?? repository.language ?? 'Public repository'}
                                </span>
                            </a>
                        ))}
                    </div>

                    <div className='mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
                        <ActivityGrid github={github} />
                        <ActionLink href={item.profileUrl}>OPEN PROFILE</ActionLink>
                    </div>
                </div>
            </article>
        </div>
    )
}

export const ProfileReel: FC<ProfileReelProps> = ({
    items,
    github,
    activeId,
    initialActiveId,
    className,
    contactHref,
    onSelect,
    onBackToWork
}) => {
    const [selectedId, setSelectedId] = useState(initialActiveId ?? 'about')
    const profileItems = items.filter(isProfileItem)

    if (profileItems.length === 0) return null

    const aboutItem = profileItems.find((item): item is AboutItem => item.kind === 'about')
    const resumeItem = profileItems.find((item): item is ResumeItem => item.kind === 'resume')
    const githubItem = profileItems.find((item): item is GitHubItem => item.kind === 'github')
    const activeItem = profileItems.find(item => item.id === (activeId ?? selectedId)) ?? profileItems[0]
    const activeIndex = Math.max(0, profileItems.findIndex(item => item.id === activeItem.id))
    const brandSubtitle = aboutItem?.meta ?? resumeItem?.meta ?? ''
    const workCount = items.filter(isProjectItem).length
    const repositories = getRepoCards(items, github)

    const selectProfile = (item: ProfileItem) => {
        setSelectedId(item.id)
        onSelect?.(item)
    }

    const contact = contactHref ? (
        <a href={contactHref} className='cursor-target w-fit underline decoration-[#8a8a86] underline-offset-4 hover:text-[#f2f2f0]'>
            Contact
        </a>
    ) : (
        <span className='w-fit underline decoration-[#8a8a86] underline-offset-4'>Contact</span>
    )

    return (
        <section className={cn('relative min-h-[100dvh] overflow-x-hidden bg-[#080808] text-[#f2f2f0]', className)} aria-label='Profile'>
            <header className='absolute inset-x-0 top-0 z-30 flex items-start justify-between px-6 pt-7 sm:px-8 lg:px-12 lg:pt-8'>
                <div className='flex flex-col'>
                    <button
                        type='button'
                        onClick={() => aboutItem && selectProfile(aboutItem)}
                        className='cursor-target w-fit text-left text-[15px] font-medium text-[#f2f2f0]'
                    >
                        {siteConfig.name}
                    </button>
                    <span className='mt-1 text-[12px] text-[#8a8a86]'>{brandSubtitle}</span>
                    <span className='mt-1 text-[12px] text-[#8a8a86]'>{contact}</span>
                </div>

                <div className='flex items-center gap-3 pt-1'>
                    <span className='h-px w-8 bg-[rgba(138,138,134,0.45)]' />
                    <span className='font-mono text-[10px] uppercase tracking-[0.12em] text-[#f2f2f0]'>
                        PROFILE&nbsp;&nbsp;{padIndex(activeIndex + 1)} / {padIndex(profileItems.length)}
                    </span>
                </div>
            </header>

            <div className='pointer-events-none absolute left-0 top-1/2 z-0 hidden h-[24rem] w-5 -translate-y-1/2 items-center justify-center lg:flex'>
                <span className='rotate-90 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.16em] text-[#8a8a86]'>
                    BUILD / LEARN / CREATE / REPEAT
                </span>
            </div>
            <div className='pointer-events-none absolute right-0 top-1/2 z-0 hidden h-[24rem] w-5 -translate-y-1/2 items-center justify-center lg:flex'>
                <span className='-rotate-90 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.16em] text-[#8a8a86]'>
                    FULL-STACK / BACKEND / SYSTEMS / TOOLING
                </span>
            </div>

            <div className='relative z-10 grid min-h-[100dvh] grid-cols-1 gap-12 px-6 pb-28 pt-32 sm:px-10 lg:grid-cols-[minmax(24rem,35vw)_minmax(0,1fr)] lg:gap-0 lg:px-0 lg:pb-12 lg:pt-20'>
                <nav className='pt-10 lg:pl-[5.5rem] lg:pt-24' aria-label='Profile states'>
                    <p className='font-mono text-[10px] uppercase tracking-[0.16em] text-[#8a8a86]'>PROFILE</p>
                    <div className='mt-10 flex flex-col gap-8' role='tablist' aria-label='Profile states'>
                        {profileItems.map((item, index) => {
                            const isActive = item.id === activeItem.id
                            const tabId = `profile-tab-${item.id}`
                            const panelId = `profile-panel-${item.id}`

                            return (
                                <button
                                    key={item.id}
                                    id={tabId}
                                    type='button'
                                    role='tab'
                                    aria-selected={isActive}
                                    aria-controls={panelId}
                                    onClick={() => selectProfile(item)}
                                    className='cursor-target group grid grid-cols-[1.9rem_1px_minmax(0,1fr)] items-start gap-x-5 text-left outline-none focus-visible:ring-1 focus-visible:ring-[#f2f2f0]/50'
                                >
                                    <span className={cn('pt-3 font-mono text-[13px]', isActive ? 'text-[#f2f2f0]' : 'text-[#8a8a86]')}>
                                        {padIndex(index + 1)}
                                    </span>
                                    <span className={cn('h-[5.125rem] w-px', isActive ? 'bg-[rgba(242,242,240,0.75)]' : 'bg-[#343434]')} />
                                    <span className='min-w-0'>
                                        <span className={cn('block whitespace-nowrap leading-none tracking-[-0.04em] transition-[font-size,color] duration-500 motion-reduce:transition-none', isActive ? 'text-[3.375rem] font-medium text-[#f2f2f0]' : 'text-[2.5rem] font-medium text-[#8a8a86] group-hover:text-[#b9b9b5]')}>
                                            {item.title}
                                        </span>
                                        <span className={cn('mt-2 block text-[14px]', isActive ? 'text-[#8a8a86]' : 'text-[#555552]')}>
                                            {item.descriptor}
                                        </span>
                                        <span className={cn('mt-1 block text-[13px]', isActive ? 'text-[#8a8a86]' : 'text-[#555552]')}>
                                            {item.year}
                                        </span>
                                    </span>
                                </button>
                            )
                        })}
                    </div>

                    {onBackToWork ? (
                        <button
                            type='button'
                            onClick={onBackToWork}
                            className='cursor-target mt-14 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a8a86] hover:text-[#f2f2f0]'
                        >
                            ↑ WORK / {padIndex(workCount)} PROJECTS
                        </button>
                    ) : (
                        <span className='mt-14 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a8a86]'>
                            ↑ WORK / {padIndex(workCount)} PROJECTS
                        </span>
                    )}
                </nav>

                <main className='min-w-0 pr-0 lg:pr-16 xl:pl-16 xl:pr-[6.5rem]'>
                    <div
                        key={activeItem.id}
                        id={`profile-panel-${activeItem.id}`}
                        role='tabpanel'
                        aria-labelledby={`profile-tab-${activeItem.id}`}
                        className='motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500 motion-reduce:animate-none'
                    >
                        {activeItem.kind === 'about' && <AboutPanel item={activeItem} />}
                        {activeItem.kind === 'resume' && <ResumePanel item={activeItem} />}
                        {activeItem.kind === 'github' && <GitHubPanel item={activeItem} github={github} repositories={repositories} />}

                        <MetaBlock item={activeItem} index={activeIndex} total={profileItems.length}>
                            {activeItem.kind === 'about' && (
                                <div className='flex flex-wrap gap-2 pt-4'>
                                    {activeItem.focus.map(focus => (
                                        <span key={focus} className='rounded-[4px] border border-[#343434] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-[#8a8a86]'>
                                            {focus}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {activeItem.kind === 'github' && (
                                <>
                                    <div className='mt-5 h-px w-full bg-[#333333]'>
                                        <span className='block h-[2px] w-full bg-[rgba(242,242,240,0.85)]' />
                                    </div>
                                    <p className='self-end font-mono text-[9px] uppercase tracking-[0.12em] text-[#8a8a86]'>SCROLL / DRAG TO NAVIGATE</p>
                                </>
                            )}
                        </MetaBlock>
                    </div>
                </main>
            </div>

            <footer className='pointer-events-none absolute inset-x-0 bottom-7 z-20 flex items-end justify-between px-6 sm:px-8 lg:px-12'>
                <p className='font-mono text-[10px] leading-relaxed text-[#8a8a86]'>
                    Software Engineer
                    <br />
                    in the making.
                </p>
                <p className='font-mono text-[9px] leading-relaxed text-[#8a8a86]'>
                    {activeItem.year}
                    <br />
                    PUP
                    <br />
                    BSCS
                </p>
            </footer>
        </section>
    )
}
