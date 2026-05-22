'use client'

import { motion } from 'framer-motion'
import { Thought } from '@/app/page'

interface FloatingThoughtProps {
  thought: Thought
  onComplete: (id: string) => void
}

function getDuration(length: number, isGhost: boolean): number {
  if (isGhost) return 6
  if (length < 30)  return 3.5
  if (length < 60)  return 5.5
  if (length < 100) return 7
  return Math.min(10, 7 + (length - 100) * 0.02)
}

function getTravel(length: number, isGhost: boolean): number {
  if (isGhost) return -100
  if (length < 30)  return -120
  if (length < 100) return -160
  return -200
}

export default function FloatingThought({ thought, onComplete }: FloatingThoughtProps) {
  const isGhost  = !!thought.isGhost
  const duration = getDuration(thought.length, isGhost)
  const travel   = getTravel(thought.length, isGhost)

  return (
    <motion.div
      key={thought.id}
      initial={{ opacity: isGhost ? 0 : 0.92, y: 0, scale: 1, filter: 'blur(0px)' }}
      animate={{
        opacity: 0,
        y: travel,
        scale: isGhost ? 0.96 : 0.91,
        filter: isGhost ? 'blur(2px)' : 'blur(3px)',
      }}
      transition={{
        duration,
        ease: [0.25, 0.1, 0.25, 1],
        // Ghost thoughts fade in before fading out
        opacity: isGhost
          ? { duration, ease: [0, 0.3, 0.7, 1] }
          : { duration, ease: [0.25, 0.1, 0.25, 1] },
      }}
      onAnimationComplete={() => onComplete(thought.id)}
      className="absolute pointer-events-none text-center px-8 max-w-xl"
      style={{
        color: isGhost ? 'rgba(168,178,209,0.22)' : '#a8b2d1',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: thought.length > 80 ? '0.95rem' : thought.length > 40 ? '1.1rem' : '1.25rem',
        fontWeight: isGhost ? 200 : 300,
        lineHeight: 1.6,
        letterSpacing: isGhost ? '0.12em' : '0.03em',
        fontStyle: isGhost ? 'italic' : 'normal',
        textShadow: isGhost
          ? '0 0 20px rgba(168,178,209,0.15)'
          : '0 0 12px rgba(168,178,209,0.5), 0 0 24px rgba(168,178,209,0.25), 0 0 48px rgba(168,178,209,0.1)',
        top:       '50%',
        left:      '50%',
        transform: 'translate(-50%, -50%)',
        whiteSpace: thought.length > 60 ? 'normal' : 'nowrap',
        width:      thought.length > 60 ? '100%' : 'auto',
      }}
    >
      {thought.text}
    </motion.div>
  )
}
