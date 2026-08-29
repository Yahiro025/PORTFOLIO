import type { SiteConfig } from '@/types'

export const siteConfig: SiteConfig = {
    name: 'Bennett Payoyo',
    description: 'Personal portfolio of Bennett Payoyo, a second-year BSCS student at PUP, featuring selected software projects and current learning.',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}
