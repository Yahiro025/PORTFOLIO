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
    const [width, setWidth] = useState(0)

    useEffect(() => {
        const wrapper = wrapperRef.current

        if (!wrapper) return

        const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))

        observer.observe(wrapper)
        return () => observer.disconnect()
    }, [])

    return (
        <div ref={wrapperRef} className={cn('w-full overflow-hidden', className)}>
            <Document
                file={file}
                loading={<div className='aspect-[1/1.414] animate-pulse bg-muted' />}
                error={<div className='grid aspect-[1/1.414] place-items-center bg-muted px-6 text-center font-mono text-xs text-muted-foreground'>Resume preview unavailable</div>}
            >
                {width > 0 && (
                    <Page
                        pageNumber={1}
                        width={width}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                    />
                )}
            </Document>
        </div>
    )
}
