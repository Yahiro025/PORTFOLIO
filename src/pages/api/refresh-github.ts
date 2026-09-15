import type { NextApiRequest, NextApiResponse } from 'next'

const handler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        res.status(405).json({ error: 'Method not allowed' })
        return
    }

    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
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
