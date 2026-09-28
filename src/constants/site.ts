import type { SiteConfig } from '@/types'

export const siteConfig: SiteConfig = {
    name: 'Bennett Payoyo',
    description: 'Bennett Payoyo, Computer Science student at PUP Manila with pull requests merged into Prettier, pnpm, Tabby and Undici. Backend, systems, and full-stack builds. Open to internships and freelance work.',
    url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://bennettpayoyo.vercel.app').replace(/\/$/, '')
}
