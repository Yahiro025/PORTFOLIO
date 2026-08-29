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
    year: string
    meta: string
    summary: string
}

export interface ProjectItem extends PortfolioItemBase {
    kind: 'project'
    owner: string
    repo: string
    relationship: 'owner' | 'fork'
    sourceUrl: string
    liveUrl?: string
    embed: boolean
    stack: string[]
}

export interface AboutItem extends PortfolioItemBase {
    kind: 'about'
    avatarUrl: string
    focus: string[]
}

export interface ResumeItem extends PortfolioItemBase {
    kind: 'resume'
    school: string
    program: string
    status: string
    sourceUrl: string
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
    fork: boolean
    pushedAt: string
}

export interface GitHubCommitSummary {
    repo: string
    sha: string
    message: string
    url: string
    createdAt: string
}

export interface GitHubSnapshot {
    login: string
    name: string
    avatarUrl: string
    publicRepos: number
    repos: GitHubRepoSummary[]
    commits: GitHubCommitSummary[]
    fetchedAt: string
}

export interface HomeProps {
    github: GitHubSnapshot | null
}
