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

// The full scroll choreography needs a mouse, room to breathe, and motion allowed.
export const richMotion = (): boolean =>
    finePointer() && !prefersReducedMotion() && window.innerWidth >= 768

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
