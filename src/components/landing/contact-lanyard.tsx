import type { FC, ReactNode } from 'react'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'

import type { FrontRegion } from '@/components/landing/lanyard'

import {
    Dialog,
    DialogContent
} from '@/components/ui/dialog'

const Lanyard = dynamic(() => import('@/components/landing/lanyard'), { ssr: false })

const CONTACT_EMAIL = 'bennettpayoyo3.14@gmail.com'
const CONTACT_LINKEDIN = 'in/bennett-payoyo'
const CONTACT_WHATSAPP_NUMBER = '09913800307'
const CONTACT_VIBER_NUMBER = '09913800307'

const CONTACT_LINKS: Record<string, string> = {
    email: `https://mail.google.com/mail/?view=cm&fs=1&to=${CONTACT_EMAIL}`,
    linkedin: 'https://www.linkedin.com/in/bennett-payoyo/',
    whatsapp: `https://wa.me/63${CONTACT_WHATSAPP_NUMBER.slice(1)}`,
    viber: `viber://chat?number=%2B63${CONTACT_VIBER_NUMBER.slice(1)}`
}

const CARD_ROWS: { id: string; label: string; value: string }[] = [
    { id: 'email', label: 'Email', value: CONTACT_EMAIL },
    { id: 'linkedin', label: 'LinkedIn', value: CONTACT_LINKEDIN },
    { id: 'whatsapp', label: 'WhatsApp', value: CONTACT_WHATSAPP_NUMBER },
    { id: 'viber', label: 'Viber', value: CONTACT_VIBER_NUMBER }
]

const CANVAS_WIDTH = 640
const CANVAS_HEIGHT = 880
const PAD_X = 56
const ROW_START_Y = 300
const ROW_GAP = 110
const ROW_HIT_HEIGHT = 96

// Draws the ID card's front face: name, title, and contact rows. Composited
// onto the 3D card's texture atlas by <Lanyard frontImage />, so this is the
// only place the contact info appears — no separate panel. Also returns the
// clickable rect for each row (in this same canvas's pixel space) so taps on
// the 3D card can be matched to the right action.
const buildContactCard = (): { dataUrl: string; regions: FrontRegion[] } => {
    const canvas = document.createElement('canvas')
    canvas.width = CANVAS_WIDTH
    canvas.height = CANVAS_HEIGHT
    const ctx = canvas.getContext('2d')
    if (!ctx) return { dataUrl: '', regions: [] }

    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
    gradient.addColorStop(0, '#12141c')
    gradient.addColorStop(1, '#1d2130')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    ctx.fillStyle = '#ffffff'
    ctx.font = '700 52px system-ui, -apple-system, "Segoe UI", sans-serif'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('Bennett Payoyo', PAD_X, 130)

    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.font = '500 26px system-ui, -apple-system, "Segoe UI", sans-serif'
    ctx.fillText('Full-stack Software Engineer', PAD_X, 172)

    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(PAD_X, 220)
    ctx.lineTo(CANVAS_WIDTH - PAD_X, 220)
    ctx.stroke()

    const regions: FrontRegion[] = []
    let y = ROW_START_Y
    for (const { id, label, value } of CARD_ROWS) {
        ctx.fillStyle = 'rgba(255,255,255,0.45)'
        ctx.font = '600 22px system-ui, -apple-system, "Segoe UI", sans-serif'
        ctx.fillText(label.toUpperCase(), PAD_X, y)

        ctx.fillStyle = '#ffffff'
        ctx.font = '600 32px system-ui, -apple-system, "Segoe UI", sans-serif'
        ctx.fillText(value, PAD_X, y + 42)

        regions.push({
            id,
            x: PAD_X - 20,
            y: y - 40,
            w: CANVAS_WIDTH - 2 * (PAD_X - 20),
            h: ROW_HIT_HEIGHT
        })

        y += ROW_GAP
    }

    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.font = '500 20px system-ui, -apple-system, "Segoe UI", sans-serif'
    ctx.fillText('Tap a row to connect', PAD_X, CANVAS_HEIGHT - 40)

    return { dataUrl: canvas.toDataURL('image/png'), regions }
}

interface ContactLanyardProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export const ContactLanyard: FC<ContactLanyardProps> = ({ open, onOpenChange }): ReactNode => {
    const card = useMemo(
        () => (typeof document === 'undefined' ? { dataUrl: null, regions: [] } : buildContactCard()),
        []
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton
                className='h-[85vh] max-h-[820px] w-[760px] max-w-[95vw] overflow-visible bg-transparent p-0 shadow-none ring-0 sm:max-w-[95vw]'
            >
                <Lanyard
                    position={[0, 0, 11]}
                    gravity={[0, -40, 0]}
                    frontImage={card.dataUrl}
                    frontRegions={card.regions}
                    onRegionTap={id => {
                        const url = CONTACT_LINKS[id]
                        if (url) window.open(url, '_blank', 'noopener,noreferrer')
                    }}
                />
            </DialogContent>
        </Dialog>
    )
}
