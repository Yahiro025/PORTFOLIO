from pathlib import Path
p=Path('src/components/landing/folio-reel.tsx')
s=p.read_text()
s=s.replace("import type { FC, ReactNode }", "import type { CSSProperties, FC, ReactNode }")
s=s.replace('GitHubSnapshot, PortfolioItem', 'FolioLayout, GitHubSnapshot, PortfolioItem')
s=s.replace('    getMotionPolicy,', '    getMotionPolicy,\n    getNavigationPosition,')
s=s.replace('    reduceInteraction,', '    reduceInteraction,\n    snapReelPosition,')
s=s.replace('const CURSOR_SIZE = 76\nconst CURSOR_HALF = CURSOR_SIZE / 2\nconst CURSOR_LERP = 0.22\n', '')
pos=s.index("type Phase =")
s=s[:pos]+'''// Both layouts are in the HTML. CSS selects one before hydration.
const initialLayoutStyle = (L: FolioLayout, prefix: string) => {
    const offsets = getReelOffsets(LANDING_POS, L, RENDERED)
    return {
        [`--${prefix}title-top`]: `${L.titleTopVh}dvh`,
        [`--${prefix}title-area`]: `${L.titleAreaVh}dvh`,
        [`--${prefix}title-slot`]: `${L.titleSlotVh}dvh`,
        [`--${prefix}title-font`]: `${L.titleFontVhMax}dvh`,
        [`--${prefix}title-offset`]: `${offsets.titleVh}dvh`,
        [`--${prefix}image-top`]: `${L.imageWrapperTopVh}dvh`,
        [`--${prefix}image-area`]: `${L.imageWrapperHeightVh}dvh`,
        [`--${prefix}image-height`]: `${L.imageHeightVh}dvh`,
        [`--${prefix}image-pitch`]: `${L.imagePitchVh}dvh`,
        [`--${prefix}image-offset`]: `calc(${offsets.previewVh}dvh + ${offsets.previewPx}px)`
    }
}

const INITIAL_STYLE = {
    ...initialLayoutStyle(DESKTOP_LAYOUT, ''),
    ...initialLayoutStyle(MOBILE_LAYOUT, 'mobile-')
} as CSSProperties

'''+s[pos:]
s=s.replace("const [liveMountEnabled, setLiveMountEnabled] = useState(false)", "const [liveMountEnabled, setLiveMountEnabled] = useState(false)")
s=s.replace("const [phase, setPhase] = useState<Phase>('idle')", "const phaseRef = useRef<Phase>('idle')")
s=s.replace('    const clickMeRef = useRef<HTMLDivElement>(null)\n','')
s=s.replace('useRef<HTMLDivElement>(null)\n    const detailImageRef', 'useRef<HTMLDialogElement>(null)\n    const detailImageRef')
s=s.replace('    const isMobileRef = useRef(false)\n','    const reducedMotionRef = useRef(false)\n')
s=s.replace('    const detailOpenRef = useRef(false)\n','')
s=s.replace('    const entranceDoneRef = useRef(false)\n','')
s=s.replace('    const lastWheelTimeRef = useRef(0)', '    const lastWheelTimeRef = useRef(0)\n    const lastDirectionRef = useRef(0)\n    const renderReelRef = useRef<() => void>(() => {})')
a=s.index('    const hoverRef = '); b=s.index('    const hoveredTitleIdxRef',a); s=s[:a]+s[b:]
a=s.index('    const prevBodyOverflowRef'); b=s.index('    const handleCloseRef',a); s=s[:a]+s[b:]
s=s.replace('    const handleCloseRef = useRef<() => void>(() => {})', '    const finishCloseRef = useRef<() => void>(() => {})')
s=s.replace('    const layout = isMobile ? MOBILE_LAYOUT : DESKTOP_LAYOUT\n','')
s=s.replace("        const update = () => setIsMobile(mq.matches)", "        const update = () => {\n            layoutRef.current = mq.matches ? MOBILE_LAYOUT : DESKTOP_LAYOUT\n            setIsMobile(mq.matches)\n        }")
s=s.replace('        const update = () => setPrefersReducedMotion(mq.matches)', '        const update = () => {\n            reducedMotionRef.current = mq.matches\n            setPrefersReducedMotion(mq.matches)\n        }')
a=s.index('    useEffect(() => {\n        layoutRef.current'); b=s.index('    useEffect(() => {\n        interactingRef.current',a); s=s[:a]+s[b:]
s=s.replace("        if (!counter || motionPolicy.sharedElementDuration === 0) return", "        if (!counter || motionPolicy.sharedElementDuration === 0) return\n        if (activeIdxRef.current === LANDING_POS) return")
a=s.index('    // Entrance timeline'); b=s.index('    // Main render loop',a)
s=s[:a]+'''    // Keep the initial About card visible and still; detail/hover motion stays intact.
    useEffect(() => {
        setLiveMountEnabled(true)
    }, [])

'''+s[b:]
a=s.index('        const skipEntranceIfRunning'); b=s.index('        const tick = () => {',a); s=s[:a]+s[b:]
a=s.index('        const tick = () => {'); b=s.index('            const L = layoutRef.current',a)
compute=s[a:b]
# Drawing is also used when opening details, before measuring the FLIP source.
s=s[:a]+'''        let lastPosition = NaN
        let lastHeight = 0
        let lastLayout = layoutRef.current
        let lastHovered: number | null = null
        let hoverMoving = false

        const render = () => {
            const next = posRef.current
            const hoveredIdx = hoveredTitleIdxRef.current
            if (next === lastPosition && window.innerHeight === lastHeight &&
                layoutRef.current === lastLayout && hoveredIdx === lastHovered && !hoverMoving) return

            lastPosition = next
            lastHeight = window.innerHeight
            lastLayout = layoutRef.current
            lastHovered = hoveredIdx
            hoverMoving = false

'''+s[b:]
s=s.replace('            const hoveredIdx = hoveredTitleIdxRef.current\n\n            for', '            for')
s=s.replace('const nextHover = curHover + (targetHover - curHover) * HOVER_LERP', 'const nextHover = Math.abs(targetHover - curHover) < 0.001 || reducedMotionRef.current\n                    ? targetHover : curHover + (targetHover - curHover) * HOVER_LERP\n                hoverMoving ||= nextHover !== targetHover')
s=s.replace('                    h3.style.fontSize = `${fontVh.toFixed(2)}dvh`', '                    h3.style.transform = `scale(${(fontVh / (L.titleFontVhMax * reg.scale)).toFixed(4)})`')
a=s.index('            const ring = '); b=s.index('        const onWheel = ',a)
compute=compute.replace('                entranceDoneRef.current &&\n','').replace('!detailOpenRef.current', "phaseRef.current === 'idle'")
compute=compute.replace('const snapped = Math.round(t)', 'const snapped = snapReelPosition(t, lastDirectionRef.current)')
compute=compute.replace('Math.abs(target - cur) < 0.0005 ? target', 'reducedMotionRef.current || Math.abs(target - cur) < 0.0005 ? target')
s=s[:a]+'''        }

        renderReelRef.current = render

'''+compute+'''            render()
            raf = requestAnimationFrame(tick)
        }

        raf = requestAnimationFrame(tick)

        const cancelNavigation = () => {
            gsap.killTweensOf(navProxyRef.current)
            navigatingRef.current = false
            setSettledRenderedIdx(null)
        }

'''+s[b:]
s=s.replace('            if (!onSectionRef.current) return\n','')
s=s.replace('            if (detailOpenRef.current) return', "            if (phaseRef.current === 'closing') finishCloseRef.current()\n            if (phaseRef.current !== 'idle') return")
s=s.replace("            if (target?.closest('[data-no-wheel]')) return", "            if (!target || !section.contains(target) || target.closest('[data-no-wheel]')) return")
s=s.replace('            if (!entranceDoneRef.current) skipEntranceIfRunning()\n','')
s=s.replace('''            if (navigatingRef.current) {
                gsap.killTweensOf(navProxyRef.current)
                navigatingRef.current = false
            }
''', '            cancelNavigation()\n')
s=s.replace('const delta = Math.max(-WHEEL_CAP, Math.min(WHEEL_CAP, e.deltaY))', "if (e.ctrlKey || e.deltaY === 0) return\n            const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1\n            const delta = Math.max(-WHEEL_CAP, Math.min(WHEEL_CAP, e.deltaY * unit))\n            lastDirectionRef.current = Math.sign(delta)")
s=s.replace('            targetPosRef.current += capped / layoutRef.current.pixelsPerItem', '            lastDirectionRef.current = Math.sign(capped)\n            targetPosRef.current += capped / layoutRef.current.pixelsPerItem')
a=s.index('        const onPointerEnter = '); b=s.index("        window.addEventListener('wheel'",a)
s=s[:a]+'''        const onKeyDown = (e: KeyboardEvent) => {
            if (phaseRef.current === 'closing') finishCloseRef.current()
            if (phaseRef.current !== 'idle' || interactingRef.current || e.altKey || e.ctrlKey || e.metaKey) return
            const target = e.target as HTMLElement | null
            if (target?.closest('input, textarea, select, [contenteditable="true"], [data-no-wheel]')) return
            const step = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 }[e.key]
            if (step === undefined && e.key !== 'Home' && e.key !== 'End') return
            e.preventDefault()
            cancelNavigation()
            lastDirectionRef.current = 0
            targetPosRef.current = step !== undefined
                ? Math.round(targetPosRef.current) + step
                : getNavigationPosition(posRef.current, e.key === 'Home' ? 0 : N - 1, N)
        }

'''+s[b:]
for line in ["        section.addEventListener('pointerenter', onPointerEnter)","        section.addEventListener('pointerleave', onPointerLeave)","        section.addEventListener('pointermove', onPointerMove)","            section.removeEventListener('pointerenter', onPointerEnter)","            section.removeEventListener('pointerleave', onPointerLeave)","            section.removeEventListener('pointermove', onPointerMove)"]:
 s=s.replace(line+'\n','')
s=s.replace("        window.addEventListener('wheel', onWheel, { passive: false })", "        section.addEventListener('wheel', onWheel, { passive: false })\n        window.addEventListener('keydown', onKeyDown)")
s=s.replace("            window.removeEventListener('wheel', onWheel)", "            section.removeEventListener('wheel', onWheel)\n            window.removeEventListener('keydown', onKeyDown)\n            gsap.killTweensOf(navProxyRef.current)")
s=s.replace("                } else if (detailIdx !== null) {\n                    handleCloseRef.current()",'')
s=s.replace("        if (phase !== 'idle' || !entranceDoneRef.current) return", "        if (phaseRef.current === 'closing') finalizeClose()\n        if (phaseRef.current !== 'idle') return")
s=s.replace('''        const slot = slotRefs.current[idx]
''','''        gsap.killTweensOf(navProxyRef.current)
        navigatingRef.current = false
        posRef.current = targetPosRef.current = idx
        activeIdxRef.current = idx
        setActiveIdx(idx)
        renderReelRef.current()
        phaseRef.current = 'opening'

        const slot = slotRefs.current[idx]
''',1)
s=s.replace("        setPhase('opening')\n",'')
a=s.index('        const currentLogical = '); b=s.index('        const proxy = navProxyRef.current',a)
s=s[:a]+'''        const destination = getNavigationPosition(currentPos, i, N)
        const delta = destination - currentPos

'''+s[b:]
s=s.replace('            value: currentPos + delta,', '            value: destination,')
s=s.replace("                requestAnimationFrame(() => openDetailFromActiveAt(activeIdxRef.current))", "                openDetailFromActiveAt(POS_MIN + ((destination % N) + N) % N)")
s=s.replace('    const finalizeClose = () => {\n', "    const finalizeClose = () => {\n        if (detailRef.current) {\n            gsap.killTweensOf([detailRef.current, ...detailRef.current.querySelectorAll('*')])\n            detailRef.current.close()\n        }\n")
s=s.replace("                if (row) gsap.set(row, { clearProps: 'transform' })", "                if (row) {\n                    gsap.killTweensOf(row)\n                    gsap.set(row, { clearProps: 'transform' })\n                }")
s=s.replace("        setPhase('idle')", "        phaseRef.current = 'idle'\n        interactingRef.current = false\n        setInteractingRenderedIdx(null)")
s=s.replace("        if (phase === 'closing' || phase === 'idle') return", "        if (phaseRef.current === 'closing' || phaseRef.current === 'idle') return")
s=s.replace("        setPhase('closing')", "        phaseRef.current = 'closing'")
s=s.replace('        handleCloseRef.current = handleClose', '        finishCloseRef.current = finalizeClose')
s=s.replace("        if (!root) return\n\n        const duration", "        if (!root) return\n        if (!root.open) root.showModal()\n\n        const duration")
s=s.replace("onComplete: () => setPhase('detail')", "onComplete: () => { phaseRef.current = 'detail' }")
s=s.replace("            setPhase('detail')", "            phaseRef.current = 'detail'")
s=s.replace("            className='relative h-[100dvh] w-full select-none overflow-hidden bg-background'", "            className='folio-reel relative h-[100dvh] w-full select-none overflow-hidden bg-background'\n            style={INITIAL_STYLE}")
s=s.replace("            {isMobile && <div aria-hidden className='absolute inset-x-0 top-0 z-[9] h-20 bg-background' />}", "            <div aria-hidden className='absolute inset-x-0 top-0 z-[9] h-20 bg-background md:hidden' />")
s=s.replace("                className={cn(\n                    'absolute left-6 top-5 z-10 opacity-0 md:left-12 md:top-10',\n                    isMobile && 'flex items-center gap-4'\n                )}", "                className='absolute left-6 top-5 z-10 md:left-12 md:top-10'")
s=s.replace("                <button type='button' onClick={() => navigateAndOpen(POS_MIN + folioItems.findIndex(item => item.id === 'about'))} className='text-sm font-semibold text-foreground'>Bennett Payoyo</button>\n                {!isMobile && <p className='mt-1 text-xs text-muted-foreground'>2nd year BSCS · PUP</p>}", "                <h1 className='text-sm font-semibold text-foreground'><button type='button' onClick={() => navigateAndOpen(LANDING_POS)}>Bennett Payoyo</button></h1>\n                <p className='mt-1 hidden text-xs text-muted-foreground md:block'>2nd year BSCS · PUP</p>")
s=s.replace('gap-3 opacity-0 md:right', 'gap-3 md:right')
a=s.index("                className={cn('absolute left-0 z-[1]"); b=s.index('                        {RENDERED_ITEMS.map',a)
s=s[:a]+'''                className='reel-titles absolute left-0 z-[1] w-full overflow-hidden md:w-1/2'
                style={{ maskImage: MASK_GRADIENT, WebkitMaskImage: MASK_GRADIENT }}
            >
                <div ref={titleRevealRef} className='absolute inset-0'>
                    <div ref={titleStripRef} className='reel-title-strip absolute inset-x-0 top-0 will-change-transform'>
'''+s[b:]
s=s.replace("                                    className={cn(\n                                        'cursor-target flex cursor-pointer items-center rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-foreground/40',\n                                        isMobile ? 'justify-center px-6 text-center' : 'gap-4 pl-8 pr-8 sm:pl-12 lg:pl-20'\n                                    )}\n                                    style={{ height: `${layout.titleSlotVh}dvh` }}", "                                    className='reel-title cursor-target flex cursor-pointer items-center justify-center rounded-lg px-6 text-center outline-none focus-visible:ring-1 focus-visible:ring-foreground/40 md:justify-start md:gap-4 md:pl-12 md:pr-8 md:text-left lg:pl-20'\n                                    style={{ '--title-scale': TITLE_REGISTER[getGroup(item)].scale } as CSSProperties}")
s=s.replace("<span className='font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground'>Profile", "<span className='font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/65'>Profile")
a=s.index("                className={cn('absolute overflow-hidden'"); b=s.index('                        {RENDERED_ITEMS.map',a)
s=s[:a]+'''                className='reel-images absolute left-0 w-full overflow-hidden md:left-auto md:right-0 md:w-1/2'
            >
                <div ref={imageRevealRef} className='absolute inset-0'>
                    <div ref={imageStripRef} className='reel-image-strip absolute inset-x-0 top-0 will-change-transform'>
'''+s[b:]
s=s.replace("                                    className='absolute inset-x-0 flex items-center justify-center'\n                                    style={{\n                                        top: `${(RENDERED - 1 - i) * layout.imagePitchVh}dvh`,\n                                        height: `${layout.imagePitchVh}dvh`\n                                    }}", "                                    className='reel-image-slot absolute inset-x-0 flex items-center justify-center'\n                                    style={{ '--slot': RENDERED - 1 - i } as CSSProperties}")
a=s.index('                                        onPointerEnter={() => {\n                                            isHoveringActiveRef'); b=s.index('                                    >\n                                        <FolioPreview',a)
s=s[:a]+'''                                        className='reel-card cursor-target relative overflow-hidden rounded-2xl bg-muted'
                                        style={{ opacity: i === LANDING_POS ? 1 : 0.78, aspectRatio: '4 / 5', willChange: 'transform, opacity' }}
'''+s[b:]
a=s.index('            <div\n                ref={clickMeRef}'); b=s.index('            {detailItem &&',a); s=s[:a]+s[b:]
s=s.replace("                        <div ref={detailRef} className='absolute inset-0 z-30' onClick={handleClose}>", "                        <dialog\n                            ref={detailRef}\n                            aria-labelledby='detail-title'\n                            className='absolute inset-0 z-30 m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-0 text-foreground outline-none backdrop:bg-transparent'\n                            onCancel={event => { event.preventDefault(); handleClose() }}\n                            onClick={handleClose}\n                        >")
s=s.replace('                                            ref={detailTitleRef}', "                                            ref={detailTitleRef}\n                                            id='detail-title'")
s=s.replace('                        </div>\n                    )\n                })()}', '                        </dialog>\n                    )\n                })()}')
p.write_text(s)
