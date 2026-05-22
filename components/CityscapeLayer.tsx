'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * One plane of the parallax cityscape.
 * Each layer is a flat ShaderMaterial painting buildings
 * as silhouettes, with the shape embedded in the fragment shader.
 * 
 * depth  0 = background (faintest, moves least)
 * depth  1 = midground
 * depth  2 = foreground (most visible, moves most)
 */

// Building layouts for 3 visual depths
// Each row: [x_start, width, height] — all in 0–1 UV space
const LAYERS: Array<[number, number, number][]> = [
  // Background — small, dense, far city
  [
    [0.00,0.025,0.18],[0.03,0.018,0.22],[0.05,0.022,0.16],[0.08,0.030,0.26],
    [0.11,0.015,0.18],[0.13,0.024,0.20],[0.16,0.020,0.28],[0.20,0.016,0.15],
    [0.22,0.032,0.30],[0.26,0.018,0.18],[0.29,0.022,0.22],[0.32,0.040,0.34],
    [0.37,0.020,0.18],[0.40,0.028,0.24],[0.44,0.018,0.16],[0.47,0.030,0.28],
    [0.51,0.024,0.22],[0.54,0.020,0.18],[0.57,0.035,0.32],[0.62,0.022,0.20],
    [0.65,0.028,0.24],[0.69,0.018,0.18],[0.72,0.030,0.26],[0.76,0.020,0.20],
    [0.79,0.035,0.28],[0.83,0.022,0.16],[0.86,0.025,0.22],[0.90,0.018,0.18],
    [0.93,0.030,0.24],[0.96,0.025,0.20],[0.99,0.015,0.16],
  ],
  // Midground — medium scale
  [
    [0.00,0.04,0.28],[0.05,0.03,0.22],[0.09,0.05,0.38],[0.15,0.04,0.30],
    [0.20,0.06,0.44],[0.27,0.04,0.26],[0.32,0.05,0.35],[0.38,0.07,0.48],
    [0.46,0.04,0.28],[0.51,0.06,0.40],[0.58,0.04,0.24],[0.63,0.07,0.52],
    [0.71,0.04,0.30],[0.76,0.05,0.36],[0.82,0.06,0.42],[0.89,0.04,0.28],
    [0.94,0.05,0.34],[0.98,0.03,0.20],
  ],
  // Foreground — large, stark, close buildings
  [
    [0.00,0.06,0.40],[0.07,0.08,0.55],[0.16,0.05,0.35],[0.22,0.10,0.62],
    [0.33,0.07,0.45],[0.41,0.06,0.38],[0.48,0.11,0.68],[0.60,0.07,0.44],
    [0.68,0.09,0.58],[0.78,0.06,0.40],[0.85,0.08,0.52],[0.94,0.06,0.38],
  ],
]

// Parallax strength per layer (foreground moves most)
const PARALLAX_STRENGTH = [0.015, 0.04, 0.09]
// Opacity per layer
const LAYER_OPACITY     = [0.04,  0.035, 0.045]
// Z position per layer (foreground closest to camera)
const LAYER_Z           = [-12,   -8,    -4]

interface LayerProps {
  depth:   number   // 0, 1, 2
  mouseX:  React.MutableRefObject<number>
  mouseY:  React.MutableRefObject<number>
}

function buildLayerTexture(buildings: [number, number, number][]): THREE.Texture {
  const W = 1024, H = 256
  const canvas  = document.createElement('canvas')
  canvas.width  = W
  canvas.height = H
  const ctx     = canvas.getContext('2d')!

  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#ffffff'

  for (const [x, w, h] of buildings) {
    const px = x * W
    const pw = w * W
    const ph = h * H
    const py = H - ph
    ctx.fillRect(px, py, pw, ph)

    // Antenna / spire on some buildings
    if (h > 0.35 && Math.random() > 0.5) {
      const spireW = Math.max(1, pw * 0.08)
      const spireH = ph * (0.12 + Math.random() * 0.18)
      ctx.fillRect(px + pw / 2 - spireW / 2, py - spireH, spireW, spireH)
    }

    // Windows — small bright dots
    const cols = Math.floor(pw / 8)
    const rows = Math.floor(ph / 12)
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (Math.random() > 0.65) {
          ctx.fillRect(px + c * 8 + 2, py + r * 12 + 3, 3, 4)
        }
      }
    }
    ctx.fillStyle = '#ffffff'
  }

  const tex       = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function CityscapeLayerMesh({ depth, mouseX, mouseY }: LayerProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const { mesh } = useMemo(() => {
    const tex       = buildLayerTexture(LAYERS[depth])
    const geo       = new THREE.PlaneGeometry(32, 8)
    const mat       = new THREE.MeshBasicMaterial({
      map:         tex,
      transparent: true,
      opacity:     LAYER_OPACITY[depth],
      alphaTest:   0.01,
      color:       new THREE.Color('#a8b2d1'),
      depthWrite:  false,
    })
    const m = new THREE.Mesh(geo, mat)
    m.position.set(0, -5 + depth * 0.4, LAYER_Z[depth])
    return { mesh: m }
  }, [depth])

  const strength = PARALLAX_STRENGTH[depth]

  useFrame(() => {
    if (!meshRef.current) return
    const targetX = -mouseX.current * strength * 10
    const targetY =  mouseY.current * strength * 3
    meshRef.current.position.x += (targetX - meshRef.current.position.x) * 0.04
    meshRef.current.position.y += (targetY - (-5 + depth * 0.4 + meshRef.current.position.y - (-5 + depth * 0.4))) * 0.04
  })

  return <primitive ref={meshRef} object={mesh} />
}

interface CityscapeLayerProps {
  mouseX: React.MutableRefObject<number>
  mouseY: React.MutableRefObject<number>
}

export default function CityscapeLayer({ mouseX, mouseY }: CityscapeLayerProps) {
  return (
    <>
      <CityscapeLayerMesh depth={0} mouseX={mouseX} mouseY={mouseY} />
      <CityscapeLayerMesh depth={1} mouseX={mouseX} mouseY={mouseY} />
      <CityscapeLayerMesh depth={2} mouseX={mouseX} mouseY={mouseY} />
    </>
  )
}
