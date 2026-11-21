import type { FC, ReactNode } from 'react'

import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'
import { finePointer, prefersReducedMotion } from '@/lib/motion'
import { PROFILE_IMAGE } from '@/constants/folio'

interface DepthPortraitProps {
    className?: string
}

const PHOTO_SRC = '/profile-1080.webp'
const DEPTH_SRC = '/profile-depth.webp'
const STRENGTH = 0.014
const INERTIA = 3.2
const MAX_PIXELS = 2.4e6

const VERTEX = `attribute vec2 aPos; varying vec2 vUv;
void main(){ vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); gl_Position = vec4(aPos, 0.0, 1.0); }`

// Near pixels (bright in the depth map) shift further than far ones: a 2.5D head turn.
const FRAGMENT = `precision highp float;
uniform sampler2D uPhoto; uniform sampler2D uDepth; uniform vec2 uShift;
varying vec2 vUv;
void main(){
    float d = texture2D(uDepth, vUv).r;
    float t = 1.0 - exp(-max(0.0, d - 0.12) / 0.68);
    gl_FragColor = texture2D(uPhoto, clamp(vUv + uShift * t, 0.0, 1.0));
}`

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
})

export const DepthPortrait: FC<DepthPortraitProps> = ({ className }): ReactNode => {
    const wrapRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const imageRef = useRef<HTMLImageElement>(null)

    useEffect(() => {
        const wrap = wrapRef.current
        const canvas = canvasRef.current
        if (!wrap || !canvas || !finePointer() || prefersReducedMotion()) return

        // A lost WebGL canvas composites as solid white, so the fallback swap never fades.
        const hideCanvas = () => {
            canvas.style.transition = 'none'
            canvas.style.opacity = '0'
            canvas.style.visibility = 'hidden'
            if (imageRef.current) imageRef.current.style.visibility = ''
        }
        const showCanvas = () => {
            canvas.style.transition = ''
            canvas.style.visibility = 'visible'
            canvas.style.opacity = '1'
            if (imageRef.current) imageRef.current.style.visibility = 'hidden'
        }

        hideCanvas()

        const gl = canvas.getContext('webgl', {
            alpha: true,
            antialias: false,
            depth: false,
            stencil: false,
            premultipliedAlpha: true,
            preserveDrawingBuffer: true,
            powerPreference: 'low-power'
        })
        if (!gl) return

        const compile = (type: number, source: string) => {
            const shader = gl.createShader(type)
            if (!shader) return null
            gl.shaderSource(shader, source)
            gl.compileShader(shader)

            return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null
        }

        let program: WebGLProgram | null = null
        let uShift: WebGLUniformLocation | null = null

        // Everything below is rebuilt after a context restore, so it stays in one place.
        const initGl = () => {
            const vertex = compile(gl.VERTEX_SHADER, VERTEX)
            const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT)
            const next = gl.createProgram()
            if (!vertex || !fragment || !next) return false
            gl.attachShader(next, vertex)
            gl.attachShader(next, fragment)
            gl.linkProgram(next)
            if (!gl.getProgramParameter(next, gl.LINK_STATUS)) return false
            gl.useProgram(next)

            const buffer = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
            const aPos = gl.getAttribLocation(next, 'aPos')
            gl.enableVertexAttribArray(aPos)
            gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

            program = next
            uShift = gl.getUniformLocation(next, 'uShift')
            return true
        }

        const texture = (unit: number, image: HTMLImageElement, premultiply: boolean) => {
            const tex = gl.createTexture()
            gl.activeTexture(gl.TEXTURE0 + unit)
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        }

        let cachedPhoto: HTMLImageElement | null = null
        let cachedDepth: HTMLImageElement | null = null

        const uploadTextures = (photo: HTMLImageElement, depth: HTMLImageElement) => {
            if (!program) return false
            texture(0, photo, true)
            texture(1, depth, false)
            gl.uniform1i(gl.getUniformLocation(program, 'uPhoto'), 0)
            gl.uniform1i(gl.getUniformLocation(program, 'uDepth'), 1)
            cachedPhoto = photo
            cachedDepth = depth
            return true
        }

        if (!initGl()) return

        let disposed = false
        let frame = 0
        let last = 0
        let targetX = 0
        let targetY = 0
        let shiftX = 0
        let shiftY = 0
        let ready = false
        let inView = true

        const resize = () => {
            const ratio = Math.min(window.devicePixelRatio || 1, 2)
            let width = Math.round(wrap.clientWidth * ratio)
            let height = Math.round(wrap.clientHeight * ratio)
            const scale = Math.min(1, Math.sqrt(MAX_PIXELS / Math.max(1, width * height)))
            width = Math.round(width * scale)
            height = Math.round(height * scale)
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width
                canvas.height = height
                gl.viewport(0, 0, width, height)
            }
        }

        const draw = () => {
            gl.uniform2f(uShift, shiftX, shiftY)
            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }

        const tick = (now: number) => {
            const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
            last = now
            const k = 1 - Math.exp(-dt * INERTIA)
            shiftX += (targetX - shiftX) * k
            shiftY += (targetY - shiftY) * k
            draw()
            if (Math.abs(targetX - shiftX) + Math.abs(targetY - shiftY) > 1e-5) {
                frame = requestAnimationFrame(tick)
            } else {
                frame = 0
                last = 0
            }
        }

        const onMove = (event: PointerEvent) => {
            if (!ready || !inView) return
            targetX = -((event.clientX / window.innerWidth) - 0.5) * 2 * STRENGTH
            targetY = -((event.clientY / window.innerHeight) - 0.5) * 2 * STRENGTH
            if (!frame) frame = requestAnimationFrame(tick)
        }

        // The textures wait until the page has loaded and the main thread is idle;
        // the plain image shows the same pixels until the canvas takes over.
        let idle = 0
        const start = () => Promise.all([loadImage(PHOTO_SRC), loadImage(DEPTH_SRC)]).then(([photo, depth]) => {
            if (disposed) return
            if (!uploadTextures(photo, depth)) return
            resize()
            draw()
            if (gl.isContextLost() || gl.getError() !== gl.NO_ERROR) return
            ready = true
            showCanvas()
        }).catch(() => undefined)
        const whenIdle = () => {
            idle = typeof window.requestIdleCallback === 'function'
                ? window.requestIdleCallback(() => { start() }, { timeout: 1500 })
                : globalThis.setTimeout(() => { start() }, 600) as unknown as number
        }
        if (document.readyState === 'complete') whenIdle()
        else window.addEventListener('load', whenIdle, { once: true })

        const observer = new ResizeObserver(() => {
            if (!ready) return
            resize()
            draw()
        })
        observer.observe(wrap)

        // Off-screen moves would otherwise redraw the whole canvas on every pointer event.
        const view = new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting
            if (!inView && frame) {
                cancelAnimationFrame(frame)
                frame = 0
                last = 0
            } else if (inView && ready) {
                draw()
            }
        })
        view.observe(wrap)
        window.addEventListener('pointermove', onMove, { passive: true })

        // Chrome can drop the drawing buffer at any time: fall back to the plain image,
        // then rebuild the scene from the cached pixels once the context comes back.
        const onLost = (event: Event) => {
            event.preventDefault()
            ready = false
            if (frame) {
                cancelAnimationFrame(frame)
                frame = 0
                last = 0
            }
            hideCanvas()
        }
        const onRestored = () => {
            if (disposed || !cachedPhoto || !cachedDepth) return
            if (!initGl() || !uploadTextures(cachedPhoto, cachedDepth)) return
            resize()
            draw()
            if (gl.isContextLost() || gl.getError() !== gl.NO_ERROR) return
            ready = true
            showCanvas()
        }
        canvas.addEventListener('webglcontextlost', onLost)
        canvas.addEventListener('webglcontextrestored', onRestored)

        return () => {
            disposed = true
            hideCanvas()
            window.removeEventListener('load', whenIdle)
            if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle)
            globalThis.clearTimeout(idle)
            cancelAnimationFrame(frame)
            canvas.removeEventListener('webglcontextlost', onLost)
            canvas.removeEventListener('webglcontextrestored', onRestored)
            observer.disconnect()
            view.disconnect()
            window.removeEventListener('pointermove', onMove)
        }
    }, [])

    return (
        <div ref={wrapRef} className={cn('relative aspect-[3/4]', className)}>
            <img
                ref={imageRef}
                src={PROFILE_IMAGE.src}
                srcSet={PROFILE_IMAGE.srcSet}
                sizes={PROFILE_IMAGE.sizes}
                width={PROFILE_IMAGE.width}
                height={PROFILE_IMAGE.height}
                alt='Portrait of Bennett Payoyo'
                fetchPriority='high'
                className='size-full object-contain'
            />
            <canvas ref={canvasRef} aria-hidden className='absolute inset-0 size-full opacity-0 transition-opacity duration-500' />
        </div>
    )
}
