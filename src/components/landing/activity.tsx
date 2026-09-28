import type { FC, ReactNode } from 'react'
import type { GitHubSnapshot } from '@/types'

import { useEffect, useRef } from 'react'
import { ArrowUpRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { CONTACT } from '@/constants/folio'

const shortDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

const DOT_TONE = [
    'border border-bone-line bg-transparent',
    'bg-ember/30',
    'bg-ember/55',
    'bg-ember/80',
    'bg-ember'
]

export const Activity: FC<{ github: GitHubSnapshot }> = ({ github }): ReactNode => {
    const scrollerRef = useRef<HTMLDivElement>(null)
    const days = github.contributions ?? []
    const weeks: typeof days[] = []

    for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7))

    // Recent weeks first on narrow screens.
    useEffect(() => {
        const node = scrollerRef.current
        if (node) node.scrollLeft = node.scrollWidth
    }, [])

    // Curate: real projects only. Skip empty repos, mirrors of other projects, and the profile README repo.
    const repos = github.repos
        .filter(repo => (repo.description || repo.homepage || repo.language)
            && !/^fork of /i.test(repo.description ?? '')
            && repo.name.toLowerCase() !== github.login.toLowerCase())
        .slice(0, 6)

    return (
        <section id='activity' data-tone='bone' className='tone-bone px-5 py-28 sm:px-10 md:py-36'>
            <div className='grid gap-8 md:grid-cols-12 md:items-end'>
                <h2 className='display text-display font-bold md:col-span-6'>
                    In the commit log<span aria-hidden className='ml-[0.06em] inline-block size-[0.3em] rounded-full bg-ember' />
                </h2>
                <div className='flex flex-col items-start gap-5 md:col-span-5 md:col-start-8'>
                    <p className='text-lead leading-relaxed text-muted-bone'>
                        <span className='font-semibold text-ink tabular'>{(github.totalContributions ?? 0).toLocaleString('en-US')}</span> contributions in the last year across{' '}
                        <span className='font-semibold text-ink tabular'>{github.publicRepos}</span> public repositories on GitHub.
                    </p>
                    <div className='flex flex-wrap items-center gap-x-5 gap-y-2'>
                        <a
                            href={CONTACT.github}
                            target='_blank'
                            rel='noreferrer'
                            className='inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-3 font-semibold text-bone transition-colors hover:bg-ink-2'
                        >
                            @{github.login} on GitHub
                            <ArrowUpRight className='size-4' aria-hidden />
                        </a>
                        <span className='text-small text-muted-bone'>Snapshot refreshed {shortDate(github.fetchedAt)}</span>
                    </div>
                </div>
            </div>

            {weeks.length > 0 && (
                <div ref={scrollerRef} data-lenis-prevent className='no-scrollbar mt-14 overflow-x-auto'>
                    <div
                        role='img'
                        aria-label={`Contribution calendar: ${github.totalContributions ?? 0} contributions in the last year`}
                        className='grid min-w-[52rem] grid-flow-col gap-[3px] sm:gap-1'
                        style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
                    >
                        {weeks.map(week => (
                            <div key={week[0].date} className='grid grid-rows-7 gap-[3px] sm:gap-1'>
                                {week.map(day => (
                                    <span
                                        key={day.date}
                                        title={`${day.count} on ${day.date}`}
                                        className={cn('aspect-square w-full rounded-full', DOT_TONE[Math.min(day.level, 4)])}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <ul className='mt-16 grid border-t border-bone-line md:grid-cols-2 md:gap-x-10'>
                {repos.map(repo => (
                    <li key={repo.name} className='border-b border-bone-line'>
                        <a
                            href={repo.url}
                            target='_blank'
                            rel='noreferrer'
                            className='group grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 py-5'
                        >
                            <span className='text-title font-semibold tracking-[-0.02em] underline-offset-4 group-hover:underline'>{repo.name}</span>
                            <span className='font-mono text-data text-muted-bone tabular'>
                                {repo.language ?? 'Repository'} · {shortDate(repo.pushedAt)}
                            </span>
                            {repo.description && (
                                <span className='col-span-2 text-body text-muted-bone'>{repo.description}</span>
                            )}
                        </a>
                    </li>
                ))}
            </ul>
        </section>
    )
}
