'use client'

import dynamic from 'next/dynamic'
import { useState, useRef, useCallback, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { v4 as uuidv4 } from 'uuid'
import FloatingThought from '@/components/FloatingThought'
import { useAmbientAudio } from '@/hooks/useAmbientAudio'
import { useSentiment } from '@/hooks/useSentiment'
import { useGhostKeystrokes } from '@/hooks/useGhostKeystrokes'

const VoidCanvas = dynamic(() => import('@/components/VoidCanvas'), { ssr: false })

export interface Thought {
  id: string
  text: string
  length: number
  isGhost?: boolean
}

// All ref-based signals flowing to the 3D canvas — zero re-renders
export interface CanvasSignals {
  mouseX:           React.MutableRefObject<number>
  mouseY:           React.MutableRefObject<number>
  keystrokeSignal:  React.MutableRefObject<number>
  shockwaveSignal:  React.MutableRefObject<number>
  sentimentScore:   React.MutableRefObject<number>   // normalised –1 … +1
}

const GHOST_THOUGHTS = [
  "it's late",
  "still awake?",
  "let it go",
  "breathe",
  "it will pass",
  "you're not alone",
  "almost morning",
  "the city sleeps",
  "close your eyes",
  "one more minute",
  "it's quiet now",
  "rest soon",
]

export default function Home() {
  const [thoughts, setThoughts]     = useState<Thought[]>([])
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Canvas signal refs
  const mouseX          = useRef(0)
  const mouseY          = useRef(0)
  const keystrokeSignal = useRef(0)
  const shockwaveSignal = useRef(0)
  const sentimentScore  = useRef(0)

  const { triggerAudio }   = useAmbientAudio()
  const { analyze }        = useSentiment()

  // Ghost thought emitter
  const addGhostThought = useCallback(() => {
    const text = GHOST_THOUGHTS[Math.floor(Math.random() * GHOST_THOUGHTS.length)]
    setThoughts(prev => [...prev, { id: uuidv4(), text, length: text.length, isGhost: true }])
  }, [])

  useGhostKeystrokes({ onGhost: addGhostThought, idleMs: 90_000 })

  // Auto-focus + re-focus
  useEffect(() => { inputRef.current?.focus() }, [])
  const handleWindowClick = useCallback(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    window.addEventListener('click', handleWindowClick)
    return () => window.removeEventListener('click', handleWindowClick)
  }, [handleWindowClick])

  // Mouse tracking
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mouseX.current = (e.clientX / window.innerWidth)  * 2 - 1
    mouseY.current = -(e.clientY / window.innerHeight) * 2 + 1
  }, [])

  // Keystroke + sentiment analysis
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      triggerAudio()

      if (e.key === 'Enter') {
        const trimmed = inputValue.trim()
        if (!trimmed) return

        shockwaveSignal.current = Date.now()
        // Final sentiment on submit
        sentimentScore.current = analyze(trimmed)

        setThoughts(prev => [...prev, {
          id: uuidv4(), text: trimmed, length: trimmed.length
        }])
        setInputValue('')
      } else {
        keystrokeSignal.current = Date.now()
        // Live sentiment while typing
        sentimentScore.current = analyze(inputValue + (e.key.length === 1 ? e.key : ''))
      }
    },
    [inputValue, triggerAudio, analyze]
  )

  const handleRemoveThought = useCallback((id: string) => {
    setThoughts(prev => prev.filter(t => t.id !== id))
  }, [])

  const canvasSignals: CanvasSignals = {
    mouseX, mouseY, keystrokeSignal, shockwaveSignal, sentimentScore,
  }

  return (
    <main
      className="relative w-screen h-screen overflow-hidden bg-[#050510]"
      onMouseMove={handleMouseMove}
    >
      {/* 3D Canvas — particles + parallax cityscape, z-[-20] */}
      <div className="absolute inset-0 z-[-20]">
        <VoidCanvas signals={canvasSignals} />
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
        <AnimatePresence>
          {thoughts.map(thought => (
            <FloatingThought
              key={thought.id}
              thought={thought}
              onComplete={handleRemoveThought}
            />
          ))}
        </AnimatePresence>

        <div className="relative flex flex-col items-center w-full max-w-2xl px-8">
          <p
            className="no-select mb-8 text-xs tracking-[0.4em] uppercase opacity-20 font-mono"
            style={{ color: '#a8b2d1' }}
          >
            the void / 2am
          </p>

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="speak into the dark…"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="
              pointer-events-auto w-full bg-transparent border-none outline-none
              ring-0 focus:ring-0 focus:outline-none text-center text-xl md:text-2xl
              font-mono tracking-wide input-glow glow-text
            "
            style={{
              color: '#a8b2d1',
              caretColor: 'rgba(168,178,209,0.6)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          />

          <div
            className="mt-6 w-32 h-px opacity-10"
            style={{ background: 'linear-gradient(90deg, transparent, #a8b2d1, transparent)' }}
          />
          <p
            className="no-select mt-4 text-xs opacity-15 tracking-widest font-mono"
            style={{ color: '#a8b2d1' }}
          >
            press enter to release
          </p>
        </div>
      </div>

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-[5]"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(5,5,16,0.85) 100%)',
        }}
      />
    </main>
  )
}
