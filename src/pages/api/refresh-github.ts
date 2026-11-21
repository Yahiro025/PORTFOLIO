import type { NextApiRequest, NextApiResponse } from 'next'

import { createHash, timingSafeEqual } from 'node:crypto'

const sha256 = (value: string) => createHash('sha256').update(value).digest()

// Equal-length digests keep the compare constant-time and hide the secret's length.
const isAuthorized = (header: string | undefined, secret: string) =>
    timingSafeEqual(sha256(header ?? ''), sha256(`Bearer ${secret}`))

const handler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        res.status(405).json({ error: 'Method not allowed' })
        return
    }

    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || !isAuthorized(req.headers.authorization, cronSecret)) {
        res.status(401).json({ error: 'Unauthorized' })
        return
    }

    try {
        await res.revalidate('/')
        res.status(200).json({ revalidated: '/' })
    } catch (error) {
        console.error(
            '[refresh-github] failed to revalidate /:',
            error instanceof Error ? error.message : 'unknown error'
        )
        res.status(500).json({ error: 'Failed to refresh the GitHub statistics' })
    }
}

export default handler
