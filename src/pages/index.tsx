import type { FC, ReactNode } from 'react'
import type { GetStaticProps } from 'next'
import type { HomeProps } from '@/types'

import { Seo } from '@/components/generals/seo'
import { FolioReel } from '@/components/landing/folio-reel'
import { loadGitHubSnapshot } from '@/lib/github'

const Home: FC<HomeProps> = ({ github }): ReactNode => (
    <>
        <Seo />

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
