import '@/styles/globals.css'

import type { FC, ReactNode } from 'react'
import type { AppProps } from 'next/app'

import { SpeedInsights } from '@vercel/speed-insights/react'
import { Gabarito, Geist_Mono } from 'next/font/google'

const gabarito = Gabarito({
    variable: '--font-sans',
    subsets: ['latin'],
    weight: ['400', '500', '600', '700', '800']
})

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin']
})

const App: FC<AppProps> = ({ Component, pageProps }): ReactNode => {
    return (
        <div className={`${gabarito.variable} ${geistMono.variable} min-h-full font-sans antialiased`}>
            <Component {...pageProps} />
            <SpeedInsights />
        </div>
    )
}

export default App
