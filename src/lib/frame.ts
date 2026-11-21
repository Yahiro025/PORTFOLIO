// One requestAnimationFrame driver for every scroll- and frame-driven effect.
// All reads run before all writes, so a frame costs at most one layout instead of one per handler.

export interface FrameJob {
    read?: () => void
    write?: () => void
}

const once = new Set<FrameJob>()
const loops = new Set<FrameJob>()
let before: ((time: number) => boolean | void) | null = null
let raf = 0

const flush = (time: number) => {
    raf = 0
    const keepBefore = before ? before(time) !== false : false
    const jobs = [...loops, ...once]
    once.clear()
    for (const job of jobs) job.read?.()
    for (const job of jobs) job.write?.()
    if ((loops.size || once.size || keepBefore) && !raf) raf = requestAnimationFrame(flush)
}

const schedule = () => {
    if (!raf) raf = requestAnimationFrame(flush)
}

// Runs a job once on the next frame; repeated requests within a frame collapse into one.
export const requestFrame = (job: FrameJob): void => {
    once.add(job)
    schedule()
}

// Runs a job every frame until the returned stop function is called.
export const addLoop = (job: FrameJob): (() => void) => {
    loops.add(job)
    schedule()

    return () => {
        loops.delete(job)
    }
}

// Runs ahead of every frame's reads, e.g. smooth scrolling, so its scroll never lands after layout reads.
// Returning false lets the loop idle until something calls wakeFrame().
export const setBeforeFrame = (fn: ((time: number) => boolean | void) | null): void => {
    before = fn
    if (fn) schedule()
}

// Restarts an idled frame loop, e.g. when new input means the before-frame has work again.
export const wakeFrame = (): void => {
    schedule()
}
