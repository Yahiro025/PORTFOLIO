# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Internship recruiters and freelance clients, weighted equally. A recruiter scans for who Bennett is, what is proven, and how to reach Bennett within one viewport; a client looks for shipped, working software and a clear way to start a conversation.

Success means an email, a LinkedIn visit, or a resume download, preceded by exploration: the merged pull requests opened, projects expanded, live demos and sources visited.

## Product Purpose

Personal portfolio for Bennett Payoyo, second-year Computer Science student at the Polytechnic University of the Philippines (PUP) in Manila. It proves engineering ability with merged upstream code and shipped projects rather than claims.

## Positioning

A student already contributing upstream. In September 2026 four pull requests were merged into Prettier (52k stars), pnpm (37k), Tabby (75k) and Node.js's Undici (8k): 172k combined stars. Alongside that, full-stack builds for Bicol and Filipino students: a 9,000+ entry Bikol dictionary, TANGLAW (RAG scholarship navigator), and BANTAYOG, 1st Runner-Up at GDG on Campus PUP SparkFest.

Bennett works AI-assisted and verifies with tests, maintainer review, and real deployments. The site says so plainly.

## Operating Context

Single scrolling landing page, sections in order: Hero (portrait, glyph, name, proof line, availability), Manifest (ember flood), Open source (drag-to-orbit gravity well plus PR accordion), Work (eclipse reveal plus expandable project index), About (bio, timeline, awards, toolbox), Activity (GitHub snapshot, contribution dots, recent repos), Contact (ember flood, email, LinkedIn, GitHub, resume).

The GitHub section renders a statically generated snapshot; a failed fetch keeps the last successful page instead of publishing empty. Resume is a static PDF at `/resume.pdf`.

## Capabilities and Constraints

Data lives in `src/constants/folio.ts`: `openSource` (four merged PRs, verified against the GitHub API), `projects` (BANTAYOG, Bikol Dictionary, TANGLAW, C-LABS, ScholarAid, Booth), `TIMELINE`, `TOOLBOX`, `CONTACT`. `validatePortfolioItems` in `src/lib/portfolio.ts` enforces unique ids and HTTPS live URLs.

Technical facts: Next.js Pages Router, `getStaticProps` home, path alias `@/` for `src/`. Do not invent contact channels, testimonials, customers, metrics, pricing, or employment claims beyond the resume and folio record.

## Brand Commitments

Name Bennett Payoyo. GitHub `@Yahiro025`. LinkedIn `in/bennett-payoyo`. Email `bennettpayoyo3.14@gmail.com`. Profile cut-out assets `/profile-480.webp`, `/profile-640.webp`, `/profile-1080.webp`. Share image `/og.jpg`.

Visual world (recorded in DESIGN.md): ink and bone grounds with one accent body that cycles on every click (ember, cobalt, mustard; ember is the resting default); disc, ring and dot geometry; full-bleed colour floods. The user pinned gravity-design.de as the reference grammar, including its interaction set: Kepler-orbit hero, cursor gravity, pinned manifesto-to-orbit sequence, big-bang constellation, reading wave, and horizon finale.

## Evidence on Hand

- Resume (Sep 2026) at `/resume.pdf`: experience, projects, open source, education, awards.
- Merged PRs: prettier/prettier#20015, pnpm/pnpm#14878, Eugeny/tabby#11651, nodejs/undici#5819.
- Project READMEs for bicol-app, tanglaw, ScholarAid, reviewer (C-LABS), Booth-cwts-web.

Open gaps, recorded not invented:
- BANTAYOG source repository (`alxxrzfyr/BANTAYOG`) returns 404; no source link is shown.
- BANTAYOG stack follows the resume (Polygon Amoy testnet); the earlier site listed Stellar settlement. Confirm which is current.
- ScholarAid is not on the resume; kept from the earlier site with README facts.

## Product Principles

- Proof over claims: every project resolves to a live URL, a source repo, or an explicit gap.
- Merged upstream code leads the evidence.
- Legible to strangers: a recruiter understands who, what, and how to reach Bennett in seconds.
- Gaps stay visible: undecided facts are recorded, not invented.

## Accessibility & Inclusion

WCAG AA contrast: ember text only on ink, never on bone; ink text on ember. Reduced motion freezes the orbit, the glyph settle, and scroll-driven geometry. Every interactive orbit element has a keyboard-reachable equivalent in the PR list.
