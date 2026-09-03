import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, extend, useFrame, type ThreeElement, type ThreeEvent } from '@react-three/fiber'
import { useGLTF, useTexture, Environment, Lightformer } from '@react-three/drei'
import {
    BallCollider,
    CuboidCollider,
    Physics,
    RigidBody,
    useRopeJoint,
    useSphericalJoint,
    type RapierRigidBody,
    type RigidBodyProps
} from '@react-three/rapier'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'
import * as THREE from 'three'

const CARD_GLB_URL = '/lanyard/card.glb'
const LANYARD_PNG_URL = '/lanyard/lanyard.png'

// 1x1 transparent pixel — lets useTexture be called unconditionally when no
// frontImage is supplied.
const BLANK_PIXEL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

// The card model's front face is UV-mapped to the LEFT half of the texture
// atlas (measured from card.glb).
const FRONT_UV_RECT = { x: 0, y: 0, w: 0.5, h: 0.755 }

extend({ MeshLineGeometry, MeshLineMaterial })

declare module '@react-three/fiber' {
    interface ThreeElements {
        meshLineGeometry: ThreeElement<typeof MeshLineGeometry>
        meshLineMaterial: ThreeElement<typeof MeshLineMaterial>
    }
}

export interface FrontRegion {
    id: string
    x: number
    y: number
    w: number
    h: number
}

interface LanyardProps {
    position?: [number, number, number]
    gravity?: [number, number, number]
    fov?: number
    transparent?: boolean
    frontImage?: string | null
    frontRegions?: FrontRegion[]
    onRegionTap?: (id: string) => void
}

export default function Lanyard({
    position = [0, 0, 30],
    gravity = [0, -40, 0],
    fov = 20,
    transparent = true,
    frontImage = null,
    frontRegions,
    onRegionTap
}: LanyardProps) {
    const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 768)

    useEffect(() => {
        const handleResize = (): void => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return (
        <div className='relative z-0 flex h-full w-full items-center justify-center'>
            <Canvas
                camera={{ position, fov }}
                dpr={[1, isMobile ? 1.5 : 2]}
                gl={{ alpha: transparent }}
                onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1)}
            >
                <ambientLight intensity={Math.PI} />
                <Physics gravity={gravity} timeStep={isMobile ? 1 / 30 : 1 / 60}>
                    <Band
                        isMobile={isMobile}
                        frontImage={frontImage}
                        frontRegions={frontRegions}
                        onRegionTap={onRegionTap}
                    />
                </Physics>
                <Environment blur={0.75}>
                    <Lightformer
                        intensity={2}
                        color='white'
                        position={[0, -1, 5]}
                        rotation={[0, 0, Math.PI / 3]}
                        scale={[100, 0.1, 1]}
                    />
                    <Lightformer
                        intensity={3}
                        color='white'
                        position={[-1, -1, 1]}
                        rotation={[0, 0, Math.PI / 3]}
                        scale={[100, 0.1, 1]}
                    />
                    <Lightformer
                        intensity={3}
                        color='white'
                        position={[1, 1, 1]}
                        rotation={[0, 0, Math.PI / 3]}
                        scale={[100, 0.1, 1]}
                    />
                    <Lightformer
                        intensity={10}
                        color='white'
                        position={[-10, 0, 14]}
                        rotation={[0, Math.PI / 2, Math.PI / 3]}
                        scale={[100, 10, 1]}
                    />
                </Environment>
            </Canvas>
        </div>
    )
}

interface BandProps {
    maxSpeed?: number
    minSpeed?: number
    isMobile?: boolean
    frontImage?: string | null
    frontRegions?: FrontRegion[]
    onRegionTap?: (id: string) => void
}

type LanyardRigidBody = RapierRigidBody & {
    lerped?: THREE.Vector3
}

interface RegionUvRect {
    id: string
    u0: number
    u1: number
    v0: number
    v1: number
}

const TAP_MAX_DURATION_MS = 300
const TAP_MAX_MOVEMENT_PX = 6

function Band({
    maxSpeed = 50,
    minSpeed = 0,
    isMobile = false,
    frontImage = null,
    frontRegions,
    onRegionTap
}: BandProps) {
    const band = useRef<THREE.Mesh<InstanceType<typeof MeshLineGeometry>, InstanceType<typeof MeshLineMaterial>>>(null!)
    const fixed = useRef<RapierRigidBody>(null!)
    const j1 = useRef<LanyardRigidBody>(null!)
    const j2 = useRef<LanyardRigidBody>(null!)
    const j3 = useRef<RapierRigidBody>(null!)
    const card = useRef<RapierRigidBody>(null!)

    const vec = new THREE.Vector3()
    const ang = new THREE.Vector3()
    const rot = new THREE.Vector3()
    const dir = new THREE.Vector3()

    const segmentProps: RigidBodyProps = {
        type: 'dynamic',
        canSleep: true,
        colliders: false,
        angularDamping: 4,
        linearDamping: 4
    }

    const getLerped = (body: LanyardRigidBody): THREE.Vector3 => {
        if (!body.lerped) {
            body.lerped = new THREE.Vector3().copy(body.translation())
        }

        return body.lerped
    }

    const { nodes, materials } = useGLTF(CARD_GLB_URL) as any
    const texture = useTexture(LANYARD_PNG_URL)
    const frontTex = useTexture(frontImage || BLANK_PIXEL)
    const regionUvRectsRef = useRef<RegionUvRect[]>([])

    // Composite the front image into the card's texture atlas (left half).
    // Drawn aspect-preserving via "contain" so the contact-info card face
    // never gets cropped, letterboxed onto the vendor's baked base texture.
    // While we're at it, convert each clickable region (given in the source
    // image's own pixel space) into atlas UV bounds, using the exact same
    // placement math, so taps can be matched against the drawn layout.
    const cardMap = useMemo(() => {
        const baseMap = materials.base.map as THREE.Texture
        if (!frontImage) return baseMap

        const baseImg = baseMap.image as any
        const W = baseImg.width
        const H = baseImg.height
        const canvas = document.createElement('canvas')
        canvas.width = W
        canvas.height = H
        const ctx = canvas.getContext('2d')
        if (!ctx) return baseMap
        ctx.drawImage(baseImg, 0, 0, W, H)

        const img = frontTex.image as HTMLImageElement | undefined
        if (img) {
            const rx = FRONT_UV_RECT.x * W
            const ry = FRONT_UV_RECT.y * H
            const rw = FRONT_UV_RECT.w * W
            const rh = FRONT_UV_RECT.h * H
            const scale = Math.min(rw / img.width, rh / img.height)
            const dw = img.width * scale
            const dh = img.height * scale
            const dx = rx + (rw - dw) / 2
            const dy = ry + (rh - dh) / 2
            ctx.save()
            ctx.beginPath()
            ctx.rect(rx, ry, rw, rh)
            ctx.clip()
            ctx.drawImage(img, dx, dy, dw, dh)
            ctx.restore()

            if (frontRegions) {
                regionUvRectsRef.current = frontRegions.map(region => {
                    const px0 = dx + region.x * scale
                    const py0 = dy + region.y * scale
                    const px1 = dx + (region.x + region.w) * scale
                    const py1 = dy + (region.y + region.h) * scale
                    return {
                        id: region.id,
                        u0: px0 / W,
                        u1: px1 / W,
                        v0: py0 / H,
                        v1: py1 / H
                    }
                })
            }
        }

        const composite = new THREE.CanvasTexture(canvas)
        composite.colorSpace = THREE.SRGBColorSpace
        composite.flipY = baseMap.flipY
        composite.anisotropy = 16
        composite.needsUpdate = true
        return composite
    }, [frontImage, frontTex, materials.base.map, frontRegions])

    const [curve] = useState(
        () =>
            new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()])
    )
    const [dragged, drag] = useState<false | THREE.Vector3>(false)
    const [hovered, hover] = useState(false)
    const pointerDownRef = useRef<{ time: number; x: number; y: number; u: number; v: number } | null>(null)

    useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1])
    useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1])
    useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1])
    useSphericalJoint(j3, card, [
        [0, 0, 0],
        [0, 1.45, 0]
    ])

    useEffect(() => {
        if (hovered) {
            document.body.style.cursor = dragged ? 'grabbing' : 'grab'
            return () => {
                document.body.style.cursor = 'auto'
            }
        }
    }, [hovered, dragged])

    useFrame((state, delta) => {
        if (dragged && typeof dragged !== 'boolean') {
            vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
            dir.copy(vec).sub(state.camera.position).normalize()
            vec.add(dir.multiplyScalar(state.camera.position.length()))
            ;[card, j1, j2, j3, fixed].forEach(ref => ref.current?.wakeUp())
            card.current?.setNextKinematicTranslation({
                x: vec.x - dragged.x,
                y: vec.y - dragged.y,
                z: vec.z - dragged.z
            })
        }
        if (fixed.current) {
            ;[j1, j2].forEach(ref => {
                const lerped = getLerped(ref.current)
                const clampedDistance = Math.max(0.1, Math.min(1, lerped.distanceTo(ref.current.translation())))
                lerped.lerp(ref.current.translation(), delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed)))
            })
            curve.points[0].copy(j3.current.translation())
            curve.points[1].copy(getLerped(j2.current))
            curve.points[2].copy(getLerped(j1.current))
            curve.points[3].copy(fixed.current.translation())
            band.current.geometry.setPoints(curve.getPoints(isMobile ? 16 : 32))
            ang.copy(card.current.angvel())
            rot.copy(card.current.rotation())
            card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z }, true)
        }
    })

    curve.curveType = 'chordal'
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping

    return (
        <>
            <group position={[0, 4, 0]}>
                <RigidBody ref={fixed} {...segmentProps} type='fixed' />
                <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps} type='dynamic'>
                    <BallCollider args={[0.1]} />
                </RigidBody>
                <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps} type='dynamic'>
                    <BallCollider args={[0.1]} />
                </RigidBody>
                <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps} type='dynamic'>
                    <BallCollider args={[0.1]} />
                </RigidBody>
                <RigidBody
                    position={[2, 0, 0]}
                    ref={card}
                    {...segmentProps}
                    type={dragged ? 'kinematicPosition' : 'dynamic'}
                >
                    <CuboidCollider args={[0.8, 1.125, 0.01]} />
                    <group
                        scale={2.25}
                        position={[0, -1.2, -0.05]}
                        onPointerOver={() => hover(true)}
                        onPointerOut={() => hover(false)}
                        onPointerUp={(e: ThreeEvent<PointerEvent>) => {
                            (e.target as Element).releasePointerCapture(e.pointerId)
                            drag(false)

                            const down = pointerDownRef.current
                            pointerDownRef.current = null
                            if (down && onRegionTap) {
                                const elapsed = performance.now() - down.time
                                const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y)
                                if (elapsed <= TAP_MAX_DURATION_MS && moved <= TAP_MAX_MOVEMENT_PX) {
                                    const hit = regionUvRectsRef.current.find(
                                        r => down.u >= r.u0 && down.u <= r.u1 && down.v >= r.v0 && down.v <= r.v1
                                    )
                                    if (hit) onRegionTap(hit.id)
                                }
                            }
                        }}
                        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
                            (e.target as Element).setPointerCapture(e.pointerId)
                            drag(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation())))
                            pointerDownRef.current = {
                                time: performance.now(),
                                x: e.clientX,
                                y: e.clientY,
                                u: e.uv?.x ?? -1,
                                v: e.uv?.y ?? -1
                            }
                        }}
                    >
                        <mesh geometry={nodes.card.geometry}>
                            <meshPhysicalMaterial
                                map={cardMap}
                                map-anisotropy={16}
                                clearcoat={isMobile ? 0 : 1}
                                clearcoatRoughness={0.15}
                                roughness={0.9}
                                metalness={0.8}
                            />
                        </mesh>
                        <mesh geometry={nodes.clip.geometry} material={materials.metal} material-roughness={0.3} />
                        <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
                    </group>
                </RigidBody>
            </group>
            <mesh ref={band}>
                <meshLineGeometry />
                {/* @ts-expect-error meshline sets its props reactively, not via constructor args */}
                <meshLineMaterial
                    color='white'
                    depthTest={false}
                    resolution={isMobile ? [1000, 2000] : [1000, 1000]}
                    useMap={1}
                    map={texture}
                    repeat={[-4, 1]}
                    lineWidth={1}
                />
            </mesh>
        </>
    )
}
