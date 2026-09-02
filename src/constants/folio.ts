import type { FolioLayout, PortfolioItem } from '@/types'
import { validatePortfolioItems } from '@/lib/portfolio'

export const folioItems: PortfolioItem[] = validatePortfolioItems([
    {
        id: 'bantayog',
        kind: 'project',
        title: 'BANTAYOG',
        descriptor: 'Offline & Barcode',
        year: '2026',
        meta: 'TypeScript · 2026',
        summary: 'A TypeScript project with offline and barcode work documented in its repository history.',
        owner: 'Yahiro025',
        repo: 'BANTAYOG',
        sourceUrl: 'https://github.com/Yahiro025/BANTAYOG',
        liveUrl: 'https://admin-bantayog.vercel.app',
        embed: true,
        stack: ['TypeScript']
    },
    {
        id: 'scholaraid',
        kind: 'project',
        title: 'ScholarAid',
        descriptor: 'Scholarship Application',
        year: '2026',
        meta: 'Live project · TypeScript · 2026',
        summary: 'A scholarship application with mobile and AI-related work documented in its repository history.',
        owner: 'Yahiro025',
        repo: 'ScholarAid',
        sourceUrl: 'https://github.com/Yahiro025/ScholarAid',
        liveUrl: 'https://scholar-aid-rho.vercel.app',
        embed: true,
        stack: ['TypeScript']
    },
    {
        id: 'bikol-dictionary',
        kind: 'project',
        title: 'Bikol Dictionary',
        descriptor: 'Language Learning App',
        year: '2026',
        meta: 'Live project · TypeScript · 2026',
        summary: 'An interactive Bikol dictionary and language learning app.',
        owner: 'Yahiro025',
        repo: 'bicol-app',
        sourceUrl: 'https://github.com/Yahiro025/bicol-app',
        liveUrl: 'https://bicol-app.vercel.app/',
        embed: true,
        stack: ['TypeScript']
    },
    {
        id: 'tanglaw',
        kind: 'project',
        title: 'TANGLAW',
        descriptor: 'Web Project',
        year: '2026',
        meta: 'Live project · TypeScript · 2026',
        summary: 'A TypeScript web project documented in its repository history.',
        owner: 'Yahiro025',
        repo: 'tanglaw',
        sourceUrl: 'https://github.com/Yahiro025/tanglaw',
        liveUrl: 'https://tanglaw-project.vercel.app/',
        embed: true,
        stack: ['TypeScript']
    },
    {
        id: 'reviewer',
        kind: 'project',
        title: 'C Reviewer',
        descriptor: 'Hands-on Practice for C',
        year: '2026',
        meta: 'Live project · TypeScript · 2026',
        summary: 'Hands-on practice exercises for learning the C programming language.',
        owner: 'Yahiro025',
        repo: 'reviewer',
        sourceUrl: 'https://github.com/Yahiro025/reviewer',
        liveUrl: 'https://reviewer-peach-three.vercel.app/',
        embed: true,
        stack: ['TypeScript']
    },
    {
        id: 'about',
        kind: 'about',
        title: 'About',
        descriptor: 'Student Profile',
        year: '2026',
        meta: '2nd year BSCS · PUP',
        summary: "I'm Bennett Payoyo, a second-year BSCS student at PUP. I build and study web products, developer tools, and data systems through personal and collaborative projects.",
        avatarUrl: 'https://avatars.githubusercontent.com/u/75754746?v=4',
        focus: ['Web development', 'Data systems', 'Developer tools']
    },
    {
        id: 'resume',
        kind: 'resume',
        title: 'Resume',
        descriptor: 'Education & Work',
        year: '2026',
        meta: 'Selected work · Current focus',
        summary: 'A concise, current student resume based only on reviewed information.',
        school: 'Polytechnic University of the Philippines',
        program: 'Bachelor of Science in Computer Science',
        status: 'Second year',
        sourceUrl: 'https://github.com/Yahiro025/My-Resume',
        pdfUrl: '/resume.pdf'
    },
    {
        id: 'github',
        kind: 'github',
        title: 'GitHub',
        descriptor: 'Repositories & Activity',
        year: '2026',
        meta: '@Yahiro025',
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
    titleFontVhMax: 5.18,
    titleFontVhMin: 4.83,
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
