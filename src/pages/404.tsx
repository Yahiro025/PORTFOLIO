import type { FC, ReactNode } from 'react'

import Link from 'next/link'

import { Seo } from '@/components/generals/seo'

const NotFound: FC = (): ReactNode => {
    return (
        <main className='tone-ink flex min-h-svh flex-col items-center justify-center gap-6 px-5 text-center'>
            <Seo title='404 - Page not found' />

            <h1 className='display text-display font-bold'>
                404
            </h1>

            <p className='text-lead text-muted-ink'>
                Page not found.
            </p>

            <Link
                href='/'
                className='inline-flex items-center rounded-full bg-ember px-6 py-3.5 text-small font-semibold text-ink transition-[background-color,scale] duration-[160ms] ease-[var(--ease-out)] hover:bg-ember-hot active:scale-[0.97]'
            >
                Go back home
            </Link>
        </main>
    )
}

export default NotFound
