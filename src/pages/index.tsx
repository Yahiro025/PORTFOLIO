import type { FC, ReactNode } from 'react'
import type { GetStaticProps } from 'next'
import type { HomeProps } from '@/types'

import Head from 'next/head'

import { Seo } from '@/components/generals/seo'
import { FolioReel } from '@/components/landing/folio-reel'
import { loadGitHubSnapshot } from '@/lib/github'
import { folioItems } from '@/constants/folio'

// Warms up DNS + TLS for each embedded project's own deployment ahead of
// the iframe request, since the connection handshake is the fixed cost
// that makes a first preview load feel slow — the origins are fixed at
// build time, so computing this once at module scope is free.
const PREVIEW_ORIGINS = Array.from(new Set(
    folioItems.flatMap(item =>
        item.kind === 'project' && item.embed && item.liveUrl ? [new URL(item.liveUrl).origin] : []
    )
))

const Home: FC<HomeProps> = ({ github }): ReactNode => (
    <>
        <Seo />

        <Head>
            {PREVIEW_ORIGINS.map(origin => (
                <link key={origin} rel='preconnect' href={origin} crossOrigin='anonymous' />
            ))}
        </Head>

        <main>
            <FolioReel github={github} />
        </main>
    </>
)

export const getStaticProps: GetStaticProps<HomeProps> = async () => ({
    props: {
        github: await loadGitHubSnapshot()
    },
    revalidate: 21600
})

export default Home
