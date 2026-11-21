import type { FC, ReactNode } from 'react'

import Link from 'next/link'

import { Seo } from '@/components/generals/seo'

const ServerError: FC = (): ReactNode => {
    return (
        <main className='tone-ink flex min-h-svh flex-col items-center justify-center gap-6 px-5 text-center'>
            <Seo title='500 - Server error' />

            <h1 className='display text-display font-bold'>
                Something went wrong.
            </h1>

            <Link
                href='/'
                className='inline-flex items-center rounded-full bg-ember px-6 py-3.5 text-small font-semibold text-ink transition-[background-color,scale] duration-[160ms] ease-[var(--ease-out)] hover:bg-ember-hot active:scale-[0.97]'
            >
                Go back home
            </Link>
        </main>
    )
}

export default ServerError
