import type { FC, ReactNode } from 'react'
import type { ProjectItem } from '@/types'
import type { FrameJob } from '@/lib/frame'

import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Plus, Trophy } from 'lucide-react'

import { cn } from '@/lib/utils'
import { addLoop } from '@/lib/frame'
import { projects } from '@/constants/folio'


const ProjectRow: FC<{
    project: ProjectItem
    open: boolean
    onToggle: () => void
    onHover: (poster: string | null) => void
}> = ({ project, open, onToggle, onHover }): ReactNode => (
    <li className='border-b border-ink-line'>
        <h3>
            <button
                type='button'
                aria-expanded={open}
                aria-controls={`project-${project.id}`}
                onClick={onToggle}
                onPointerEnter={() => onHover(open ? null : project.posterUrl ?? null)}
                onPointerLeave={() => onHover(null)}
                className='group grid w-full grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 py-7 text-left md:grid-cols-[minmax(0,1fr)_19rem_auto] md:py-9'
            >
                <span
                    className={cn(
                        'display text-display-lg font-bold transition-[color,transform] duration-500 ease-[var(--ease-out)] group-hover:translate-x-3',
                        open ? 'text-ember' : 'group-hover:text-ember'
                    )}
                >
                    {project.title}
                </span>
                <span className='col-start-1 row-start-2 flex flex-col text-small leading-snug text-muted-ink md:col-start-2 md:row-start-1'>
                    <span className='text-bone'>{project.descriptor}</span>
                    <span>{project.year} · {project.meta}</span>
                </span>
                <span
                    className={cn(
                        'col-start-2 row-span-2 row-start-1 grid size-12 place-items-center rounded-full border transition-[transform,background-color,border-color,color] duration-500 ease-[var(--ease-out)] md:col-start-3 md:row-span-1',
                        open ? 'rotate-45 border-ember bg-ember text-ink' : 'border-bone/30 group-hover:border-bone'
                    )}
                >
                    <Plus className='size-5' aria-hidden />
                </span>
            </button>
        </h3>

        <div id={`project-${project.id}`} role='region' aria-label={project.title} className='expand' data-open={open}>
            <div>
                <div className='grid gap-8 pb-12 md:grid-cols-12 md:gap-10'>
                    {project.posterUrl && (
                        <img
                            src={project.posterUrl}
                            alt={`${project.title} interface`}
                            loading='lazy'
                            className='max-h-[72svh] w-full rounded-[14px] object-cover object-top md:col-span-6'
                        />
                    )}
                    <div className={cn('flex flex-col gap-6', project.posterUrl ? 'md:col-span-5 md:col-start-8' : 'md:col-span-7')}>
                        {project.result && (
                            <p className='inline-flex w-fit items-center gap-2 rounded-full bg-ember/12 px-3.5 py-1.5 text-small text-ember'>
                                <Trophy className='size-4 shrink-0' aria-hidden />
                                {project.result}
                            </p>
                        )}
                        <p className='text-lead leading-relaxed'>{project.summary}</p>
                        <ul className='flex flex-col gap-2.5 text-body leading-relaxed text-muted-ink'>
                            {project.highlights.map(item => (
                                <li key={item} className='flex gap-3'>
                                    <span aria-hidden className='mt-[0.6em] size-1.5 shrink-0 rounded-full bg-ember' />
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <p className='font-mono text-data text-muted-ink'>
                            {project.stack.join(' · ')}
                        </p>
                        <div className='flex flex-wrap gap-3'>
                            {project.liveUrl && (
                                <a
                                    href={project.liveUrl}
                                    target='_blank'
                                    rel='noreferrer'
                                    className='inline-flex items-center gap-1.5 rounded-full bg-ember px-5 py-3 font-semibold text-ink transition-colors hover:bg-ember-hot'
                                >
                                    Open live site
                                    <ArrowUpRight className='size-4' aria-hidden />
                                </a>
                            )}
                            {project.sourceUrl && (
                                <a
                                    href={project.sourceUrl}
                                    target='_blank'
                                    rel='noreferrer'
                                    className='inline-flex items-center gap-1.5 rounded-full border border-bone/35 px-5 py-3 font-semibold transition-colors hover:border-bone hover:bg-bone hover:text-ink'
                                >
                                    Source
                                    <ArrowUpRight className='size-4' aria-hidden />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </li>
)

export const WorkIndex: FC = (): ReactNode => {
    const [openId, setOpenId] = useState<string | null>(projects[0].id)
    const [poster, setPoster] = useState<string | null>(null)
    const lensRef = useRef<HTMLDivElement>(null)

    // The lens trails the pointer on devices that hover.
    useEffect(() => {
        const lens = lensRef.current
        if (!lens || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

        let tx = 0
        let ty = 0
        let x = 0
        let y = 0
        let near = false
        let stop: (() => void) | null = null

        const place = () => {
            lens.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`
        }
        const job: FrameJob = {
            write: () => {
                x += (tx - x) * 0.18
                y += (ty - y) * 0.18
                place()
                if (Math.abs(tx - x) + Math.abs(ty - y) <= 0.5) {
                    stop?.()
                    stop = null
                }
            }
        }

        // Off-screen the lens is invisible: keep it on the pointer without animating.
        const section = lens.closest('section')
        const observer = new IntersectionObserver(([entry]) => {
            near = entry.isIntersecting
        }, { rootMargin: '25% 0px' })
        if (section) observer.observe(section)

        const onMove = (event: PointerEvent) => {
            tx = event.clientX
            ty = event.clientY
            if (!near) {
                x = tx
                y = ty
                place()
                return
            }
            if (!stop) stop = addLoop(job)
        }

        window.addEventListener('pointermove', onMove, { passive: true })

        return () => {
            window.removeEventListener('pointermove', onMove)
            observer.disconnect()
            stop?.()
        }
    }, [])

    return (
        <section id='work' data-tone='ink' className='tone-ink relative'>
            <div className='grid gap-6 px-5 pb-14 pt-28 sm:px-10 md:grid-cols-12 md:items-end md:pt-36'>
                <h2 className='display text-display-lg font-bold md:col-span-7'>
                    Every project,<br />in detail<span aria-hidden className='ml-[0.06em] inline-block size-[0.3em] rounded-full bg-ember' />
                </h2>
                <p className='text-lead text-muted-ink md:col-span-4 md:col-start-9'>
                    Six builds, from a hackathon podium to live deployments. Open one for the stack, the proof, and the links.
                </p>
            </div>

            <ul className='border-t border-ink-line px-5 sm:px-10' onPointerLeave={() => setPoster(null)}>
                {projects.map(project => (
                    <ProjectRow
                        key={project.id}
                        project={project}
                        open={openId === project.id}
                        onToggle={() => {
                            setOpenId(current => current === project.id ? null : project.id)
                            setPoster(null)
                        }}
                        onHover={setPoster}
                    />
                ))}
            </ul>

            <div
                ref={lensRef}
                aria-hidden
                className='work-lens pointer-events-none fixed left-0 top-0 z-40 hidden size-[min(22vw,20rem)] overflow-hidden rounded-full bg-ink-2 [@media(hover:hover)_and_(pointer:fine)]:block'
                data-on={poster ? 'true' : 'false'}
            >
                {poster && <img src={poster} alt='' className='size-full object-cover' />}
            </div>

            <div className='h-24 md:h-36' />
        </section>
    )
}
