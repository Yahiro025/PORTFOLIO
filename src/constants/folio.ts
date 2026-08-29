import type { FolioLayout, PortfolioItem } from '@/types'
import { validatePortfolioItems } from '@/lib/portfolio'

export const folioItems: PortfolioItem[] = validatePortfolioItems([
    {
        id: 'bantayog',
        kind: 'project',
        title: 'BANTAYOG',
        year: '2026',
        meta: 'Offline & barcode · TypeScript · 2026',
        summary: 'A TypeScript project with offline and barcode work documented in its repository history.',
        owner: 'Yahiro025',
        repo: 'BANTAYOG',
        relationship: 'owner',
        sourceUrl: 'https://github.com/Yahiro025/BANTAYOG',
        embed: false,
        stack: ['TypeScript']
    },
    {
        id: 'scholaraid',
        kind: 'project',
        title: 'ScholarAid',
        year: '2026',
        meta: 'Live project · TypeScript · 2026',
        summary: 'A scholarship application with mobile and AI-related work documented in its repository history.',
        owner: 'Yahiro025',
        repo: 'ScholarAid',
        relationship: 'owner',
        sourceUrl: 'https://github.com/Yahiro025/ScholarAid',
        liveUrl: 'https://scholar-aid-rho.vercel.app',
        embed: true,
        stack: ['TypeScript']
    },
    {
        id: 'ph-data-dashboard',
        kind: 'project',
        title: 'PH Data Dashboard',
        year: '2026',
        meta: 'Data dashboard · TypeScript · 2026',
        summary: 'A TypeScript dashboard project for Philippine data.',
        owner: 'Yahiro025',
        repo: 'kiro-ph-data-dashboard',
        relationship: 'owner',
        sourceUrl: 'https://github.com/Yahiro025/kiro-ph-data-dashboard',
        embed: false,
        stack: ['TypeScript']
    },
    {
        id: 'soroban-ide',
        kind: 'project',
        title: 'Soroban IDE',
        year: '2026',
        meta: 'Fork · Developer tools · 2026',
        summary: 'A fork of an open-source VS Code-style IDE for developers building on Stellar with Soroban.',
        owner: 'Yahiro025',
        repo: 'soroban-ide',
        relationship: 'fork',
        sourceUrl: 'https://github.com/Yahiro025/soroban-ide',
        liveUrl: 'https://soroban.studio',
        embed: false,
        stack: ['TypeScript']
    },
    {
        id: 'tanglaw',
        kind: 'project',
        title: 'Tanglaw',
        year: '2026',
        meta: 'Fork · Live deployment · 2026',
        summary: 'A forked TypeScript project with a public live deployment.',
        owner: 'Yahiro025',
        repo: 'tanglaw',
        relationship: 'fork',
        sourceUrl: 'https://github.com/Yahiro025/tanglaw',
        liveUrl: 'https://tanglaw-project.vercel.app',
        embed: false,
        stack: ['TypeScript']
    },
    {
        id: 'yardshtick',
        kind: 'project',
        title: 'Yardshtick',
        year: '2026',
        meta: 'Fork · Buildathon project · 2026',
        summary: 'A fork of the third-place project from the OpenAI Buildathon Manila.',
        owner: 'Yahiro025',
        repo: 'yardshtick',
        relationship: 'fork',
        sourceUrl: 'https://github.com/Yahiro025/yardshtick',
        embed: false,
        stack: ['TypeScript']
    },
    {
        id: 'about',
        kind: 'about',
        title: 'About',
        year: '2026',
        meta: 'Profile · 2nd year BSCS · PUP',
        summary: "I'm Bennett Payoyo, a second-year BSCS student at PUP. I build and study web products, developer tools, and data systems through personal and collaborative projects.",
        avatarUrl: 'https://avatars.githubusercontent.com/u/75754746?v=4',
        focus: ['Web development', 'Data systems', 'Developer tools']
    },
    {
        id: 'resume',
        kind: 'resume',
        title: 'Resume',
        year: '2026',
        meta: 'Education · Selected work · Current focus',
        summary: 'A concise, current student resume based only on reviewed information.',
        school: 'Polytechnic University of the Philippines',
        program: 'Bachelor of Science in Computer Science',
        status: 'Second year',
        sourceUrl: 'https://github.com/Yahiro025/My-Resume'
    },
    {
        id: 'github',
        kind: 'github',
        title: 'GitHub',
        year: '2026',
        meta: 'Repositories · Activity · Profile',
        summary: 'A live view of public repositories and recent public coding activity.',
        login: 'Yahiro025',
        profileUrl: 'https://github.com/Yahiro025'
    }
])

export const DESKTOP_LAYOUT: FolioLayout = {
    titleAreaVh: 80,
    titleTopVh: 10,
    titleMidVh: 40,
    titleSlotVh: 80 / 9,
    titleVisible: 9,
    titleFontVhMax: 4.5,
    titleFontVhMin: 4.2,
    imageWrapperTopVh: 0,
    imageWrapperHeightVh: 100,
    imageWrapperMidViewportVh: 50,
    imageHeightVh: 60,
    imageGapVh: 5,
    imagePitchVh: 65,
    imageOffsetPx: 0,
    pixelsPerItem: 600
}

export const MOBILE_LAYOUT: FolioLayout = {
    titleAreaVh: 50,
    titleTopVh: 0,
    titleMidVh: 45,
    titleSlotVh: 50 / 5,
    titleVisible: 5,
    titleFontVhMax: 2.6,
    titleFontVhMin: 2.5,
    imageWrapperTopVh: 50,
    imageWrapperHeightVh: 50,
    imageWrapperMidViewportVh: 69,
    imageHeightVh: 38,
    imageGapVh: 4,
    imagePitchVh: 42,
    imageOffsetPx: 20,
    pixelsPerItem: 120
}
