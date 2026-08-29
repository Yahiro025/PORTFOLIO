import type { FC, ReactNode } from 'react'

import Head from 'next/head'
import Link from 'next/link'

const ServerError: FC = (): ReactNode => {
    return (
        <main className='flex min-h-screen flex-col items-center justify-center gap-4'>
            <Head>
                <title>
                    500 - Something went wrong!
                </title>
            </Head>

            <h1 className='text-4xl font-bold'>
                Something went wrong.
            </h1>

            <Link
                href='/'
                className='text-sm underline underline-offset-4 hover:text-primary'
            >
                Go back home
            </Link>
        </main>
    )
}

export default ServerError