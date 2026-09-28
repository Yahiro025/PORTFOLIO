import type { FC, ReactNode } from 'react'
import type { GetStaticProps } from 'next'
import type { HomeProps } from '@/types'

import Head from 'next/head'

import { Seo } from '@/components/generals/seo'
import { Activity } from '@/components/landing/activity'
import { Constellation } from '@/components/landing/constellation'
import { Effects } from '@/components/landing/effects'
import { Finale, SiteFooter } from '@/components/landing/finale'
import { Hero } from '@/components/landing/hero'
import { Sequence } from '@/components/landing/sequence'
import { SiteHeader } from '@/components/landing/site-header'
import { Story } from '@/components/landing/story'
import { WorkIndex } from '@/components/landing/work-index'
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

        <Effects />
        <SiteHeader />

        <main id='main'>
            <Hero />
            <Sequence />
            <Constellation />
            <WorkIndex />
            {github && <Activity github={github} />}
            <Story />
            <Finale />
        </main>

        <SiteFooter />
    </>
)

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
    const github = await loadGitHubSnapshot()

    // Throwing keeps the last successful page instead of publishing an empty snapshot.
    if (!github) {
        throw new Error('Unable to load the GitHub snapshot for the homepage')
    }

    return {
        props: {
            github
        }
    }
}

export default Home
