'use client'

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CanvasSignals } from '@/app/page'

const PARTICLE_COUNT = 3000

// ─── GLSL ────────────────────────────────────────────────────────────────────
const vertexShader = `
  attribute float size;
  attribute vec3  customColor;

  varying vec3  vColor;
  varying float vAlpha;

  uniform float uTime;
  uniform vec2  uMouse;
  uniform float uKeystroke;
  uniform float uShockwave;
  uniform float uSentiment;  // -1 (stressed) … 0 (neutral) … +1 (calm/happy)

  void main() {
    // Sentiment-driven color shift
    // Neutral:    customColor (midnight blue palette)
    // Stressed:   shift toward smouldering ember red/orange
    // Calm/happy: shift toward deep cool indigo/violet
    vec3 emberRed   = vec3(0.45, 0.12, 0.06);
    vec3 indigoDeep = vec3(0.10, 0.08, 0.38);
    vec3 col = customColor;

    if (uSentiment < 0.0) {
      // Negative — blend toward ember red
      col = mix(customColor, emberRed, clamp(-uSentiment * 1.2, 0.0, 1.0));
    } else {
      // Positive — blend toward indigo
      col = mix(customColor, indigoDeep, clamp(uSentiment * 0.9, 0.0, 1.0));
    }
    vColor = col;

    vec3 pos = position;

    // Mouse gravity
    vec2  toMouse        = uMouse - pos.xy * 0.05;
    float mouseDist      = length(toMouse);
    float mouseInfluence = smoothstep(0.0, 3.0, 1.5 - mouseDist) * 0.015;
    pos.xy += normalize(toMouse + vec2(0.001)) * mouseInfluence;

    // Keystroke ripple
    if (uKeystroke > 0.0) {
      float rr = uKeystroke * 8.0;
      float d  = length(pos.xy);
      float rp = smoothstep(rr - 0.5, rr, d) * smoothstep(rr + 0.5, rr, d);
      pos.xy  += normalize(pos.xy + vec2(0.001)) * rp * 0.4 * (1.0 - uKeystroke);
    }

    // Shockwave
    if (uShockwave > 0.0) {
      float d3  = length(pos);
      float swR = uShockwave * 12.0;
      float bl  = smoothstep(swR - 1.0, swR, d3) * smoothstep(swR + 1.0, swR, d3);
      pos      += normalize(pos + vec3(0.001)) * bl * 2.5 * (1.0 - uShockwave);
    }

    // Organic drift — velocity modulated by sentiment
    // Stressed: faster, jittery. Calm: slow crawl.
    float speedMod = 1.0 + max(0.0, -uSentiment) * 2.5   // stressed speeds up
                         - max(0.0,  uSentiment) * 0.65;  // calm slows down
    float t = uTime * 0.12 * speedMod;

    pos.x += sin(t * 1.25 + position.z * 0.8) * 0.04;
    pos.y += cos(t * 1.00 + position.x * 0.6) * 0.04;
    pos.z += sin(t * 0.83 + position.y * 0.7) * 0.03;

    // Stressed particles get extra micro-jitter
    if (uSentiment < -0.3) {
      float jitter = (-uSentiment - 0.3) * 0.12;
      pos.xy += vec2(
        sin(uTime * 18.0 + position.x * 4.0) * jitter,
        cos(uTime * 14.0 + position.y * 4.0) * jitter
      );
    }

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = size * (280.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
    vAlpha       = clamp(1.0 + mv.z * 0.08, 0.1, 1.0);
  }
`

const fragmentShader = `
  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    vec2  uv   = gl_PointCoord - vec2(0.5);
    float dist = length(uv);
    if (dist > 0.5) discard;

    float alpha  = smoothstep(0.5, 0.0, dist) * vAlpha;
    float glow   = smoothstep(0.3, 0.0, dist) * 0.6;
    vec3  col    = vColor + glow * vec3(0.3, 0.35, 0.5);
    gl_FragColor = vec4(col, alpha * 0.85);
  }
`

interface ParticleFieldProps {
  signals: CanvasSignals
}

export default function ParticleField({ signals }: ParticleFieldProps) {
  const pointsObj = useMemo(() => {
    const palette = [
      new THREE.Color('#1a1a2e'),
      new THREE.Color('#16213e'),
      new THREE.Color('#0f3460'),
      new THREE.Color('#a8b2d1'),
      new THREE.Color('#6272a4'),
      new THREE.Color('#3d4263'),
    ]

    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const sizes     = new Float32Array(PARTICLE_COUNT)
    const colors    = new Float32Array(PARTICLE_COUNT * 3)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      positions[i3]     = (Math.random() - 0.5) * 40
      positions[i3 + 1] = (Math.random() - 0.5) * 24
      positions[i3 + 2] = (Math.random() - 0.5) * 20 - 5

      sizes[i] = Math.random() < 0.7
        ? Math.random() * 1.5 + 0.5
        : Math.random() * 3.0 + 1.5

      const c  = palette[Math.floor(Math.random() * palette.length)]
      const br = Math.random() * 0.5 + 0.5
      colors[i3]     = c.r * br
      colors[i3 + 1] = c.g * br
      colors[i3 + 2] = c.b * br
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position',    new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('size',        new THREE.BufferAttribute(sizes,     1))
    geo.setAttribute('customColor', new THREE.BufferAttribute(colors,    3))

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime:      { value: 0 },
        uMouse:     { value: new THREE.Vector2(0, 0) },
        uKeystroke: { value: -1 },
        uShockwave: { value: -1 },
        uSentiment: { value: 0 },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    })

    return new THREE.Points(geo, mat)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    pointsObj.geometry.dispose()
    ;(pointsObj.material as THREE.ShaderMaterial).dispose()
  }, [pointsObj])

  const keystrokeAgeRef  = useRef(-1)
  const shockwaveAgeRef  = useRef(-1)
  const lastKeystrokeRef = useRef(0)
  const lastShockwaveRef = useRef(0)
  // Smoothed sentiment so color transitions are cinematic
  const smoothSentRef    = useRef(0)

  useFrame((_, delta) => {
    const mat = pointsObj.material as THREE.ShaderMaterial

    mat.uniforms.uTime.value += delta
    mat.uniforms.uMouse.value.set(
      signals.mouseX.current * 10,
      signals.mouseY.current * 6
    )

    // Smooth sentiment — ~8s to fully shift
    smoothSentRef.current += (signals.sentimentScore.current - smoothSentRef.current) * delta * 0.12
    mat.uniforms.uSentiment.value = smoothSentRef.current

    // Keystroke ripple
    const ks = signals.keystrokeSignal.current
    if (ks !== lastKeystrokeRef.current) {
      lastKeystrokeRef.current = ks
      keystrokeAgeRef.current  = 0
    }
    if (keystrokeAgeRef.current >= 0) {
      keystrokeAgeRef.current += delta * 0.8
      mat.uniforms.uKeystroke.value = keystrokeAgeRef.current > 1 ? -1 : keystrokeAgeRef.current
      if (keystrokeAgeRef.current > 1) keystrokeAgeRef.current = -1
    }

    // Shockwave
    const sw = signals.shockwaveSignal.current
    if (sw !== lastShockwaveRef.current) {
      lastShockwaveRef.current = sw
      shockwaveAgeRef.current  = 0
    }
    if (shockwaveAgeRef.current >= 0) {
      shockwaveAgeRef.current += delta * 0.5
      mat.uniforms.uShockwave.value = shockwaveAgeRef.current > 1 ? -1 : shockwaveAgeRef.current
      if (shockwaveAgeRef.current > 1) shockwaveAgeRef.current = -1
    }
  })

  return <primitive object={pointsObj} />
}
