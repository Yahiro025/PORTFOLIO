import type { FC, ReactNode } from 'react'

import Head from 'next/head'
import Link from 'next/link'

const NotFound: FC = (): ReactNode => {
    return (
        <main className='flex min-h-screen flex-col items-center justify-center gap-4'>
            <Head>
                <title>
                    404 - Page not found!
                </title>
            </Head>

            <h1 className='text-6xl font-bold'>
                404
            </h1>

            <p className='text-lg text-muted-foreground'>
                Page not found.
            </p>

            <Link
                href='/'
                className='text-sm underline underline-offset-4 hover:text-primary'
            >
                Go back home
            </Link>
        </main>
    )
}

export default NotFound