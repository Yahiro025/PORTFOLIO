import type { FolioLayout, PortfolioItem } from '@/types'
import { validatePortfolioItems } from '@/lib/portfolio'

export const PROFILE_IMAGE = {
    src: '/profile-640.webp',
    srcSet: '/profile-480.webp 480w, /profile-640.webp 640w, /profile-1080.webp 1080w',
    sizes: '(max-width: 768px) 80vw, 35vw',
    width: 640,
    height: 853,
    fallbackSrc: '/profile.png'
} as const

export const folioItems: PortfolioItem[] = validatePortfolioItems([
    {
        id: 'bantayog',
        kind: 'project',
        title: 'BANTAYOG',
        descriptor: 'Nutrition Subsidy Platform',
        year: '2026',
        meta: 'Full-stack · GovTech · 2026',
        summary: 'A full-stack nutrition-subsidy platform for LGUs, guardians, and sari-sari merchants, combining QR-based Nutri-Pass credits, server-enforced purchase rules, AI-assisted product recognition, and Stellar settlement.',
        owner: 'alxxrzfyr',
        repo: 'BANTAYOG',
        sourceUrl: 'https://github.com/alxxrzfyr/BANTAYOG',
        liveUrl: 'https://admin-bantayog.vercel.app',
        embed: true,
        posterUrl: '/previews/bantayog.jpg',
        stack: ['Next.js', 'Hono', 'Supabase', 'Stellar', 'Gemini', 'Turborepo'],
        role: 'Backend development',
        team: '4 developers',
        result: '1st Runner-Up · SparkFest 2026'
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
        posterUrl: '/previews/scholaraid.jpg',
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
        posterUrl: '/previews/bikol-dictionary.jpg',
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
        posterUrl: '/previews/tanglaw.jpg',
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
        posterUrl: '/previews/reviewer.jpg',
        stack: ['TypeScript']
    },
    {
        id: 'about',
        kind: 'about',
        title: 'About',
        descriptor: 'Student Profile',
        year: '2026',
        meta: 'Computer Science · PUP',
        summary: "I'm Bennett Payoyo, a second-year Computer Science student at PUP. I build full-stack applications and developer tools, focusing on backend engineering, databases, and software architecture. I learn primarily by building real projects, studying the systems behind them, and using linting, build checks, and end-to-end tests to catch issues before deployment.",
        avatarUrl: PROFILE_IMAGE.src,
        focus: ['Full-stack Engineering', 'Backend & APIs', 'Databases', 'Architecture & Tooling'],
        tagline: 'Full-stack Software Engineering · Backend · Developer Tooling',
        currently: [
            'Building and shipping full-stack products',
            'Strengthening backend, database, testing, and CS fundamentals',
            'Seeking software engineering internship opportunities'
        ]
    },
    {
        id: 'resume',
        kind: 'resume',
        title: 'Resume',
        descriptor: 'Education & Work',
        year: '2026',
        meta: 'Experience · Projects · Education',
        summary: 'My current experience, projects, education, and technical skills.',
        school: 'Polytechnic University of the Philippines',
        program: 'Bachelor of Science in Computer Science',
        status: 'Second year',
        highSchools: [
            { name: 'Bicol Regional Science High School', level: 'Senior high school' },
            { name: 'Marcial O. Ranola Memorial School', level: 'Junior high school' }
        ],
        focus: ['Full-stack Engineering', 'Backend & APIs', 'Databases', 'Architecture & Tooling'],
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
