import '@/styles/globals.css'

import type { FC, ReactNode } from 'react'
import type { AppProps } from 'next/app'

import { Geist, Geist_Mono } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/react'

const geistSans = Geist({
    variable: '--font-sans',
    subsets: ['latin']
})

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin']
})

const App: FC<AppProps> = ({ Component, pageProps }): ReactNode => {
    return (
        <div className={`${geistSans.variable} ${geistMono.variable} h-full font-sans antialiased`}>
            <Component {...pageProps} />
            <SpeedInsights />
        </div>
    )
}

export default App