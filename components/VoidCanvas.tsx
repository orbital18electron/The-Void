'use client'

import { Canvas } from '@react-three/fiber'
import { CanvasSignals } from '@/app/page'
import ParticleField from './ParticleField'
import CityscapeLayer from './CityscapeLayer'

interface VoidCanvasProps {
  signals: CanvasSignals
}

export default function VoidCanvas({ signals }: VoidCanvasProps) {
  return (
    <Canvas
      style={{ width: '100%', height: '100%', background: 'transparent' }}
      camera={{ position: [0, 0, 8], fov: 75, near: 0.1, far: 100 }}
      gl={{
        antialias: false,
        alpha:     true,
        powerPreference: 'high-performance',
      }}
      dpr={[1, 1.5]}
    >
      <ambientLight intensity={0.02} />
      <ParticleField signals={signals} />
      <CityscapeLayer mouseX={signals.mouseX} mouseY={signals.mouseY} />
    </Canvas>
  )
}
