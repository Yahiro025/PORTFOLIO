import type { FolioLayout, PortfolioItem } from '@/types'

export type PreviewPresentation =
    | 'poster'
    | 'live-passive'
    | 'live-interactive'
    | 'about'
    | 'resume'
    | 'github'

export type InteractionEvent =
    | { type: 'enter'; renderedIndex: number }
    | { type: 'exit' }

export interface MotionPolicy {
    autoPass: boolean
    blurEntrance: boolean
    sharedElementDuration: number
}

export const getReelOffsets = (
    position: number,
    layout: FolioLayout,
    renderedCount: number
) => ({
    titleVh: layout.titleMidVh - (position + 0.5) * layout.titleSlotVh,
    previewVh:
        layout.imageWrapperMidViewportVh -
        layout.imageWrapperTopVh -
        layout.imagePitchVh / 2 -
        (renderedCount - 1) * layout.imagePitchVh +
        position * layout.imagePitchVh,
    previewPx: layout.imageOffsetPx
})

export const getPreviewPresentation = (
    item: PortfolioItem,
    renderedIndex: number,
    activeIndex: number,
    settledIndex: number | null,
    interactingIndex: number | null
): PreviewPresentation => {
    if (item.kind !== 'project') return item.kind

    const exactActiveCopy = renderedIndex === activeIndex && renderedIndex === settledIndex

    if (!item.embed || !item.liveUrl || !exactActiveCopy) return 'poster'
    if (interactingIndex === renderedIndex) return 'live-interactive'

    return 'live-passive'
}

export const reduceInteraction = (
    current: number | null,
    event: InteractionEvent
): number | null => event.type === 'enter' ? event.renderedIndex : null

export const getMotionPolicy = (reduced: boolean): MotionPolicy => reduced
    ? { autoPass: false, blurEntrance: false, sharedElementDuration: 0 }
    : { autoPass: true, blurEntrance: true, sharedElementDuration: 0.95 }

export const validatePortfolioItems = (items: PortfolioItem[]): PortfolioItem[] => {
    const ids = new Set<string>()

    for (const item of items) {
        if (ids.has(item.id)) throw new Error(`Duplicate portfolio item id: ${item.id}`)
        ids.add(item.id)

        if (item.kind === 'project' && item.liveUrl && new URL(item.liveUrl).protocol !== 'https:') {
            throw new Error(`Live URL must use HTTPS: ${item.id}`)
        }
    }

    return items
}

