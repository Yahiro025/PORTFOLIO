import type {
    OpenSourceContribution,
    OrbitCard,
    ProjectItem
} from '@/types'

import { validatePortfolioItems } from '@/lib/portfolio'

export const PROFILE_IMAGE = {
    src: '/profile-640.webp',
    srcSet: '/profile-480.webp 480w, /profile-640.webp 640w, /profile-1080.webp 1080w',
    sizes: '(max-width: 767px) 90vw, 44vw',
    width: 1080,
    height: 1440
} as const

export const CONTACT = {
    email: 'bennettpayoyo3.14@gmail.com',
    linkedin: 'https://www.linkedin.com/in/bennett-payoyo/',
    github: 'https://github.com/Yahiro025',
    resume: '/resume.pdf',
    location: 'Metro Manila, Philippines',
    timeZone: 'Asia/Manila'
} as const

// Source: merged pull requests listed on the resume, verified against the GitHub API.
export const openSource: OpenSourceContribution[] = [
    {
        id: 'tabby',
        project: 'Tabby',
        repo: 'Eugeny/tabby',
        stars: 75,
        number: 11651,
        title: 'Flash taskbar/dock icon when the terminal bell rings',
        mergedAt: '2026-09-11',
        url: 'https://github.com/Eugeny/tabby/pull/11651',
        area: 'Electron · desktop UX',
        points: [
            'Taskbar flashing on Windows and Linux, dock bounce on macOS, via Electron flashFrame when the bell rings in an unfocused window.',
            'Shipped as an opt-in terminal.bellFlashFrame setting, off by default and hidden on the web build.'
        ]
    },
    {
        id: 'prettier',
        project: 'Prettier',
        repo: 'prettier/prettier',
        stars: 52,
        number: 20015,
        title: 'Angular: support @boundary / @error error boundaries',
        mergedAt: '2026-09-15',
        url: 'https://github.com/prettier/prettier/pull/20015',
        area: 'Parsers · formatting',
        points: [
            'Parsing and printing for Angular 22.2 error-boundary blocks, reusing the pairing rules of @if/@else and @defer.',
            'Upgraded angular-html-parser and iterated with a maintainer through review, adopting Angular’s official examples as fixtures.'
        ]
    },
    {
        id: 'pnpm',
        project: 'pnpm',
        repo: 'pnpm/pnpm',
        stars: 37,
        number: 14878,
        title: 'Use printf instead of echo for POSIX path normalization',
        mergedAt: '2026-09-15',
        url: 'https://github.com/pnpm/pnpm/pull/14878',
        area: 'Rust · shell · package managers',
        points: [
            'POSIX bin shims were corrupting Windows-style paths: echo turned \\n and \\t inside C:\\node_modules\\.bin into control characters.',
            'Switched the Rust cmd-shim header to printf, added regression tests, and made warm reinstalls rewrite stale shims.'
        ]
    },
    {
        id: 'undici',
        project: 'Undici',
        repo: 'nodejs/undici',
        stars: 8,
        number: 5819,
        title: 'Do not report aborted on successful cache hits',
        mergedAt: '2026-09-15',
        url: 'https://github.com/nodejs/undici/pull/5819',
        area: 'Node.js · HTTP caching',
        points: [
            'The cache interceptor reported aborted=true on successful hits because the flag aliased stream.destroyed.',
            'Tracked cancellation with an explicit flag set only in abort(), with regression tests for both paths.'
        ]
    }
]

export const OPEN_SOURCE_STARS = openSource.reduce((total, pr) => total + pr.stars, 0)

export const projects = validatePortfolioItems([
    {
        id: 'bantayog',
        kind: 'project',
        title: 'BANTAYOG',
        descriptor: 'Blockchain-backed nutrition subsidy',
        year: 'Jul 2026',
        meta: 'Backend developer · team of 4',
        summary: 'A nutrition-subsidy prototype for LGUs, guardians, and sari-sari merchants. QR Nutri-Passes restrict redemptions to approved food purchases, Gemini recognises the products at checkout, and settlement runs on the Polygon Amoy testnet.',
        liveUrl: 'https://admin-bantayog.vercel.app',
        posterUrl: '/previews/bantayog.jpg',
        stack: ['Next.js', 'Polygon Amoy', 'Gemini API'],
        highlights: [
            'Server-enforced purchase rules behind QR Nutri-Pass credits',
            'Gemini-powered product recognition wired into settlement'
        ],
        role: 'Backend developer',
        result: '1st Runner-Up, GDG on Campus PUP SparkFest · Top 20, CrypTita Plays Builder Showcase'
    },
    {
        id: 'bikol-dictionary',
        kind: 'project',
        title: 'Bikol Dictionary',
        descriptor: 'Bicol–Tagalog–English dictionary',
        year: 'May 2026 – now',
        meta: 'Solo build',
        summary: 'A searchable dictionary and learning app for the Bikol language, bringing together Mintz’s Bikol Dictionary, Wiktionary, LearnBikol, and community submissions, with flashcards, verb conjugations, and substitution drills.',
        sourceUrl: 'https://github.com/Yahiro025/bicol-app',
        liveUrl: 'https://bicol-app.vercel.app/',
        posterUrl: '/previews/bikol-dictionary.jpg',
        stack: ['Next.js', 'TypeScript', 'PostgreSQL', 'Supabase', 'Prisma'],
        highlights: [
            'Full-text search across 9,000+ entries',
            'PostgreSQL indexing for sub-second queries',
            'Data model ready for more Philippine regional languages'
        ]
    },
    {
        id: 'tanglaw',
        kind: 'project',
        title: 'TANGLAW',
        descriptor: 'AI scholarship navigator',
        year: 'May 2026 – now',
        meta: 'Co-developer · team of 3',
        summary: 'A scholarship portal for Filipino tertiary students: a filterable directory, readiness assessments, an exam reviewer, and Owel, a retrieval-augmented chatbot that answers from verified scholarship records instead of model recall.',
        sourceUrl: 'https://github.com/Yahiro025/tanglaw',
        liveUrl: 'https://tanglaw-project.vercel.app/',
        posterUrl: '/previews/tanglaw.jpg',
        stack: ['Next.js', 'Express', 'pgvector', 'LangChain', 'Gemini'],
        highlights: [
            'RAG answers grounded in curated scholarship data',
            'Unit tests in Vitest, end-to-end in Playwright'
        ]
    },
    {
        id: 'c-labs',
        kind: 'project',
        title: 'C-LABS',
        descriptor: 'C programming practice platform',
        year: '2025',
        meta: 'Solo build',
        summary: 'A browser-based C practice platform: 60 challenges across 12 core topics and five tiers from Novice to Expert, with progress tracking and real GCC output.',
        sourceUrl: 'https://github.com/Yahiro025/reviewer',
        liveUrl: 'https://reviewer-peach-three.vercel.app/',
        posterUrl: '/previews/reviewer.jpg',
        stack: ['Next.js', 'Monaco Editor', 'Piston API'],
        highlights: [
            'Monaco, VS Code’s editor engine, with C syntax highlighting',
            'Compiles through the Piston API and returns real terminal output'
        ]
    },
    {
        id: 'scholaraid',
        kind: 'project',
        title: 'ScholarAid',
        descriptor: 'AI scholarship assistance',
        year: 'May 2026',
        meta: 'Full-stack build',
        summary: 'A scholarship assistant for PUP Iskolars ng Bayan with personalised matching, eligibility checks, and application review, built on Next.js route handlers with Gemini and Groq through LangChain.',
        sourceUrl: 'https://github.com/Yahiro025/ScholarAid',
        liveUrl: 'https://scholar-aid-rho.vercel.app',
        posterUrl: '/previews/scholaraid.jpg',
        stack: ['Next.js', 'Prisma', 'PostgreSQL', 'NextAuth', 'LangChain'],
        highlights: [
            'Separate API routes for chat, matching, eligibility, and review',
            'Prisma schema on PostgreSQL, deployable to Vercel'
        ]
    },
    {
        id: 'booth',
        kind: 'project',
        title: 'Booth',
        descriptor: 'Two-player gaming platform',
        year: '2026',
        meta: 'Co-developer · team of 4',
        summary: 'A fully client-side, two-player local multiplayer platform for CWTS: split-screen panels, shared-keyboard controls, and four canvas games — Parkour, Bowling, Duck Pond, and a sky-battle shooter.',
        sourceUrl: 'https://github.com/Jimuelle07/Booth-cwts-web',
        stack: ['React', 'Vite', 'Zustand', 'HTML5 Canvas'],
        highlights: [
            'A game registry: new games plug in through one component interface',
            'No changes to core platform code to add a game'
        ]
    }
]) as ProjectItem[]

// Real screens from the live deployments and the merged pull requests, in orbit order.
export const ORBIT_CARDS: OrbitCard[] = [
    { id: 'bantayog-d1', src: '/orbit/bantayog-d1.webp', width: 1100, height: 688, ref: 'bantayog', label: 'BANTAYOG · LGU portal' },
    { id: 'bikol-word', src: '/orbit/bikol-word.webp', width: 1100, height: 688, ref: 'bikol-dictionary', label: 'Bikol Dictionary · word entry' },
    { id: 'pr-prettier', src: '/orbit/pr-prettier.webp', width: 1100, height: 705, ref: 'prettier', label: 'Prettier #20015 · merged' },
    { id: 'tanglaw-d1', src: '/orbit/tanglaw-d1.webp', width: 1100, height: 688, ref: 'tanglaw', label: 'TANGLAW · home' },
    { id: 'clabs-dash', src: '/orbit/clabs-dash.webp', width: 1100, height: 688, ref: 'c-labs', label: 'C-LABS · topic picker' },
    { id: 'scholaraid-d1', src: '/orbit/scholaraid-d1.webp', width: 1100, height: 688, ref: 'scholaraid', label: 'ScholarAid · home' },
    { id: 'pr-pnpm-files', src: '/orbit/pr-pnpm-files.webp', width: 1100, height: 705, ref: 'pnpm', label: 'pnpm #14878 · the diff' },
    { id: 'bikol-m1', src: '/orbit/bikol-m1.webp', width: 390, height: 844, ref: 'bikol-dictionary', label: 'Bikol Dictionary · mobile' },
    { id: 'pr-tabby', src: '/orbit/pr-tabby.webp', width: 1100, height: 705, ref: 'tabby', label: 'Tabby #11651 · merged' },
    { id: 'tanglaw-about', src: '/orbit/tanglaw-about.webp', width: 1100, height: 688, ref: 'tanglaw', label: 'TANGLAW · about' },
    { id: 'scholaraid-d2', src: '/orbit/scholaraid-d2.webp', width: 1100, height: 688, ref: 'scholaraid', label: 'ScholarAid · matcher' },
    { id: 'bantayog-m1', src: '/orbit/bantayog-m1.webp', width: 390, height: 844, ref: 'bantayog', label: 'BANTAYOG · mobile' },
    { id: 'pr-undici', src: '/orbit/pr-undici.webp', width: 1100, height: 705, ref: 'undici', label: 'Undici #5819 · merged' },
    { id: 'bikol-flash', src: '/orbit/bikol-flash.webp', width: 1100, height: 688, ref: 'bikol-dictionary', label: 'Bikol Dictionary · flashcards' },
    { id: 'clabs-d1', src: '/orbit/clabs-d1.webp', width: 1100, height: 688, ref: 'c-labs', label: 'C-LABS · home' },
    { id: 'pr-prettier-files', src: '/orbit/pr-prettier-files.webp', width: 1100, height: 705, ref: 'prettier', label: 'Prettier #20015 · the diff' },
    { id: 'scholaraid-m1', src: '/orbit/scholaraid-m1.webp', width: 390, height: 844, ref: 'scholaraid', label: 'ScholarAid · mobile' },
    { id: 'bikol-d1', src: '/orbit/bikol-d1.webp', width: 1100, height: 688, ref: 'bikol-dictionary', label: 'Bikol Dictionary · home' },
    { id: 'pr-pnpm', src: '/orbit/pr-pnpm.webp', width: 1100, height: 705, ref: 'pnpm', label: 'pnpm #14878 · merged' },
    { id: 'tanglaw-m1', src: '/orbit/tanglaw-m1.webp', width: 390, height: 844, ref: 'tanglaw', label: 'TANGLAW · mobile' },
    { id: 'scholaraid-d3', src: '/orbit/scholaraid-d3.webp', width: 1100, height: 688, ref: 'scholaraid', label: 'ScholarAid · eligibility check' },
    { id: 'pr-tabby-files', src: '/orbit/pr-tabby-files.webp', width: 1100, height: 705, ref: 'tabby', label: 'Tabby #11651 · the diff' },
    { id: 'clabs-m1', src: '/orbit/clabs-m1.webp', width: 390, height: 844, ref: 'c-labs', label: 'C-LABS · mobile' },
    { id: 'bikol-browse', src: '/orbit/bikol-browse.webp', width: 1100, height: 688, ref: 'bikol-dictionary', label: 'Bikol Dictionary · browse' }
]

export const TIMELINE = [
    { when: 'Aug 2026 – now', what: 'Media Partnership Lead', where: 'Seekers Guild' },
    { when: 'Jul 2026 – now', what: 'Backend AI Engineering, educational program', where: 'FlyRank AI' },
    { when: 'Oct 2025 – Aug 2026', what: 'Member', where: 'Junior Blockchain Education Consortium, PUP Manila' },
    { when: 'Oct 2025 – Aug 2026', what: 'Member', where: 'AWS Cloud Club PUP' },
    { when: '2025 – now', what: 'BS Computer Science · GPA 1.32', where: 'Polytechnic University of the Philippines' },
    { when: '2023 – 2025', what: 'STEM diploma', where: 'Bicol Regional Science High School' }
] as const

export const TOOLBOX = [
    'TypeScript',
    'JavaScript',
    'C',
    'Next.js',
    'React',
    'Node.js',
    'PostgreSQL',
    'Supabase',
    'Prisma',
    'Tailwind CSS',
    'Gemini API',
    'RAG',
    'Vercel',
    'Railway',
    'Render'
] as const
