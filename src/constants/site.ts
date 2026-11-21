import type { SiteConfig } from '@/types'

export const siteConfig: SiteConfig = {
    name: 'Bennett Payoyo',
    description: 'Bennett Payoyo, Computer Science student at PUP Manila with 27 pull requests merged across 16 open-source repositories (506k combined stars). Backend, systems, and full-stack builds. Open to internships and freelance work.',
    url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://bennettpayoyo.vercel.app').replace(/\/$/, '')
}
