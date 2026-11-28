export const clamp01 = (value: number): number => value < 0 ? 0 : value > 1 ? 1 : value

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)

export const easeInOutCubic = (t: number): number => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

export const smoothstep = (t: number): number => t * t * (3 - 2 * t)

export const normAngle = (angle: number): number => {
    let a = angle % (Math.PI * 2)
    if (a > Math.PI) a -= Math.PI * 2
    if (a < -Math.PI) a += Math.PI * 2

    return a
}

export const prefersReducedMotion = (): boolean =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const finePointer = (): boolean =>
    typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

let gpuCached: boolean | null = null

export const isSoftwareRenderer = (renderer: string): boolean =>
    /swiftshader|llvmpipe|software|basic render driver|mesa offscreen|subzero/i.test(renderer)

export const hasHardwareGpu = (): boolean => {
    if (typeof document === 'undefined') return true
    if (gpuCached !== null) return gpuCached

    try {
        const canvas = document.createElement('canvas')
        const options: WebGLContextAttributes = { failIfMajorPerformanceCaveat: true }
        const gl = (canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options)) as WebGLRenderingContext | null
        if (gl) {
            let renderer = ''
            try {
                const dbg = gl.getExtension('WEBGL_debug_renderer_info')
                renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? '') : ''
            } catch {
                // Blocked debug renderer info still leaves failIfMajorPerformanceCaveat as the signal.
            }
            gl.getExtension('WEBGL_lose_context')?.loseContext()
            gpuCached = !isSoftwareRenderer(renderer)
        } else {
            gpuCached = false
        }
    } catch {
        gpuCached = false
    }

    return gpuCached
}

export const detectLowPower = (env: {
    reduced: boolean
    hardwareGpu: boolean
    cores?: number
    memoryGb?: number
    saveData?: boolean
}): boolean =>
    env.reduced
    || !env.hardwareGpu
    || (typeof env.cores === 'number' && env.cores > 0 && env.cores <= 2)
    || (typeof env.memoryGb === 'number' && env.memoryGb > 0 && env.memoryGb <= 2)
    || env.saveData === true

export const isLowPowerDevice = (): boolean => {
    if (typeof window === 'undefined') return false

    const nav = typeof navigator !== 'undefined'
        ? (navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } })
        : undefined

    return detectLowPower({
        reduced: prefersReducedMotion(),
        hardwareGpu: hasHardwareGpu(),
        cores: nav?.hardwareConcurrency,
        memoryGb: nav?.deviceMemory,
        saveData: nav?.connection?.saveData
    })
}

// The full scroll choreography needs a mouse, room to breathe, and motion allowed.
export const richMotion = (): boolean =>
    finePointer() && !prefersReducedMotion() && !isLowPowerDevice() && window.innerWidth >= 768

// Progress of a tall scroll wrapper through its sticky reserve, 0 to 1.
export const pinProgress = (wrap: HTMLElement, rect: DOMRect = wrap.getBoundingClientRect()): number => {
    const reserve = rect.height - window.innerHeight

    return reserve > 0 ? clamp01(-rect.top / reserve) : rect.top <= 0 ? 1 : 0
}

// Splits text into per-character spans, keeping whitespace as text nodes.
export const splitChars = (root: HTMLElement, className: string): HTMLSpanElement[] => {
    const chars: HTMLSpanElement[] = []

    const walk = (node: Node) => {
        Array.from(node.childNodes).forEach(child => {
            if (child.nodeType === Node.TEXT_NODE) {
                const text = child.nodeValue ?? ''
                const fragment = document.createDocumentFragment()

                for (const char of text) {
                    if (/\s/.test(char)) {
                        fragment.appendChild(document.createTextNode(char))
                        continue
                    }
                    const span = document.createElement('span')
                    span.className = className
                    span.textContent = char
                    fragment.appendChild(span)
                    chars.push(span)
                }
                child.parentNode?.replaceChild(fragment, child)
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                walk(child)
            }
        })
    }

    walk(root)

    return chars
}
