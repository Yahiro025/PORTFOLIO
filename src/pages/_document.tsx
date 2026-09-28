import type { FC, ReactNode } from 'react'

import {
    Html,
    Head,
    Main,
    NextScript
} from 'next/document'

// Direction contract for the landing page. Kept in the emitted markup so it survives the build.
const DIRECTION_CONTRACT = `<!--
THESIS: Bennett as a gravitational body: real code pulled into large systems (four merged PRs, 172k combined stars). Refuses the dark card-grid developer portfolio.
OWN-WORLD: ink #0e0e0d ground, bone type, one ember #ff5b2e body; ring, disc and dot geometry, orbit rings, full-bleed ember and bone floods, Gabarito display caps, Geist Mono only for coordinates and data.
STORY: the visitor learns who Bennett is and what Bennett has proven in one viewport, drags the orbit of merged PRs, opens real projects, reads the story, and sends an email.
FIRST VIEWPORT: cut-out monochrome portrait left of centre, ring/disc/dot glyph right with live pointer coordinates, ember tagline, name and proof line bottom-left, availability chip, Get in touch in the header and hero.
FORM: user-pinned reference (gravity-design.de grammar) over the roll; seed key 17d8f271.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`

const Document: FC = (): ReactNode => {
    return (
        <Html lang='en'>
            <Head>
                <link rel='icon' type='image/png' href='/favicon.png' />
                <link rel='apple-touch-icon' href='/favicon.png' />
                <meta name='theme-color' content='#0e0e0d' />
            </Head>

            <body className='min-h-full'>
                <noscript dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT }} />
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}

export default Document
