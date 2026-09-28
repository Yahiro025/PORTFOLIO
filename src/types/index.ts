import type { ReactNode } from 'react'

export interface LayoutProps {
    children: ReactNode
}

export interface LogoProps {
    width?: number
    height?: number
    className?: string
}

export interface SeoProps {
    title?: string
    description?: string
    ogImage?: string
}

export interface SiteConfig {
    name: string
    description: string
    url: string
}

export interface FolioLayout {
    titleAreaVh: number
    titleTopVh: number
    titleMidVh: number
    titleSlotVh: number
    titleVisible: number
    titleFontVhMax: number
    titleFontVhMin: number
    imageWrapperTopVh: number
    imageWrapperHeightVh: number
    imageWrapperMidViewportVh: number
    imageHeightVh: number
    imageGapVh: number
    imagePitchVh: number
    imageOffsetPx: number
    pixelsPerItem: number
}

interface PortfolioItemBase {
    id: string
    title: string
    descriptor?: string
    year: string
    meta: string
    summary: string
}

export interface ProjectItem extends PortfolioItemBase {
    kind: 'project'
    sourceUrl?: string
    liveUrl?: string
    embed?: boolean
    posterUrl?: string
    stack: string[]
    highlights: string[]
    role?: string
    result?: string
}

export interface OpenSourceContribution {
    id: string
    project: string
    repo: string
    stars: number
    number: number
    title: string
    mergedAt: string
    url: string
    area: string
    points: string[]
}

// One frame in the project orbit: a real screenshot tied to a project or merged PR.
export interface OrbitCard {
    id: string
    src: string
    width: number
    height: number
    ref: string
    label: string
}

export interface AboutItem extends PortfolioItemBase {
    kind: 'about'
    avatarUrl: string
    focus: string[]
    tagline: string
    currently: string[]
}

export interface ResumeItem extends PortfolioItemBase {
    kind: 'resume'
    school: string
    program: string
    status: string
    highSchools: { name: string; level: string }[]
    focus: string[]
    sourceUrl: string
    pdfUrl: string
}

export interface GitHubItem extends PortfolioItemBase {
    kind: 'github'
    login: string
    profileUrl: string
}

export type PortfolioItem = ProjectItem | AboutItem | ResumeItem | GitHubItem

export interface GitHubRepoSummary {
    name: string
    url: string
    homepage: string | null
    language: string | null
    description: string | null
    stars: number
    pushedAt: string
}

export interface GitHubCommitSummary {
    repo: string
    sha: string
    message: string
    url: string
    createdAt: string
}

export interface GitHubContributionDay {
    date: string
    count: number
    level: number
}

export interface GitHubSnapshot {
    login: string
    name: string
    avatarUrl: string
    bio: string | null
    followers: number
    following: number
    publicRepos: number
    totalStars?: number
    totalContributions?: number
    contributions?: GitHubContributionDay[]
    repos: GitHubRepoSummary[]
    commits: GitHubCommitSummary[]
    fetchedAt: string
}

export interface HomeProps {
    github: GitHubSnapshot | null
}
