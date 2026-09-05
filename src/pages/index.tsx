import type { FC, ReactNode } from 'react'
import type { GetStaticProps } from 'next'
import type { HomeProps } from '@/types'

import Head from 'next/head'

import { Seo } from '@/components/generals/seo'
import { FolioReel } from '@/components/landing/folio-reel'
import { loadGitHubSnapshot } from '@/lib/github'
import { PROFILE_IMAGE } from '@/constants/folio'

const Home: FC<HomeProps> = ({ github }): ReactNode => (
    <>
        <Seo />

        <Head>
            <link
                rel='preload'
                as='image'
                href={PROFILE_IMAGE.src}
                type='image/webp'
                fetchPriority='high'
                imageSrcSet={PROFILE_IMAGE.srcSet}
                imageSizes={PROFILE_IMAGE.sizes}
            />
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
