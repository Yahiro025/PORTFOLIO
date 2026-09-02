import '@/styles/globals.css'
import '@/styles/profile-card.css'
import '@/styles/target-cursor.css'

import type { FC, ReactNode } from 'react'
import type { AppProps } from 'next/app'

import dynamic from 'next/dynamic'
import { Geist, Geist_Mono } from 'next/font/google'

const geistSans = Geist({
    variable: '--font-sans',
    subsets: ['latin']
})

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin']
})

const TargetCursor = dynamic(
    () => import('@/components/landing/target-cursor').then(module => module.TargetCursor),
    { ssr: false }
)

const App: FC<AppProps> = ({ Component, pageProps }): ReactNode => {
    return (
        <div className={`${geistSans.variable} ${geistMono.variable} h-full font-sans antialiased`}>
            <TargetCursor targetSelector='.cursor-target' spinDuration={2} hideDefaultCursor parallaxOn />
            <Component {...pageProps} />
        </div>
    )
}

export default App