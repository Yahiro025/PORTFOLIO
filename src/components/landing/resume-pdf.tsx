import type { FC, ReactNode } from 'react'

import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

import { cn } from '@/lib/utils'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

interface ResumePdfProps {
    file: string
    className?: string
}

export const ResumePdf: FC<ResumePdfProps> = ({ file, className }): ReactNode => {
    const wrapperRef = useRef<HTMLDivElement>(null)
    const [size, setSize] = useState({ width: 0, height: 0 })
    const [pageAspect, setPageAspect] = useState<number | null>(null)

    useEffect(() => {
        const wrapper = wrapperRef.current

        if (!wrapper) return

        const observer = new ResizeObserver(([entry]) => {
            setSize({ width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) })
        })

        observer.observe(wrapper)
        return () => observer.disconnect()
    }, [])

    const renderWidth = pageAspect && size.height > 0
        ? Math.min(size.width, Math.floor(size.height * pageAspect))
        : size.width

    return (
        <div ref={wrapperRef} className={cn('flex h-full w-full items-center justify-center overflow-hidden', className)}>
            <Document
                file={file}
                loading={<div className='aspect-[1/1.414] animate-pulse bg-muted' />}
                error={<div className='grid aspect-[1/1.414] place-items-center bg-muted px-6 text-center font-mono text-xs text-muted-foreground'>Resume preview unavailable</div>}
            >
                {renderWidth > 0 && (
                    <Page
                        pageNumber={1}
                        width={renderWidth}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        onLoadSuccess={(page) => setPageAspect(page.width / page.height)}
                    />
                )}
            </Document>
        </div>
    )
}
