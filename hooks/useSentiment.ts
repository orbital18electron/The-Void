'use client'

import { useRef, useCallback } from 'react'

/**
 * Lightweight client-side sentiment analysis.
 * Returns a normalised score in the range [-1, +1]:
 *   -1 = very negative / frustrated / stressed
 *    0 = neutral
 *   +1 = very positive / calm / hopeful
 *
 * We keep a smoothed running value so the particle field
 * transitions gradually rather than snapping on every word.
 */

// Minimal word-score lexicon tuned for 2AM introspective writing
const LEXICON: Record<string, number> = {
  // Strongly negative — stress / frustration / anger
  hate: -4, angry: -4, rage: -4, furious: -4, awful: -3, terrible: -3,
  horrible: -3, disgusting: -3, miserable: -4, despair: -4, hopeless: -4,
  worthless: -4, broken: -3, shattered: -3, ruined: -3, failure: -3,
  failed: -3, failing: -3, useless: -3, stupid: -3, idiot: -3,
  anxious: -3, anxiety: -3, panic: -3, stressed: -3, stress: -3,
  overwhelmed: -3, exhausted: -3, tired: -2, drained: -3, numb: -2,
  empty: -2, hollow: -2, alone: -2, lonely: -3, isolated: -3,
  lost: -2, confused: -2, scared: -3, afraid: -3, fear: -3,
  nightmare: -3, dark: -1, heavy: -1, crying: -2, tears: -2,
  hurt: -2, pain: -2, suffering: -3, regret: -2, shame: -3,
  guilt: -2, bad: -2, wrong: -2, sad: -2, depressed: -4, depression: -4,
  // Mildly negative / melancholic
  missing: -1, missed: -1, miss: -1, quiet: 0, silent: 0,
  distant: -1, fading: -1, gone: -1, leaving: -1, end: -1,
  // Neutral / contemplative (slightly positive for midnight context)
  thinking: 1, wondering: 1, maybe: 0, perhaps: 0, waiting: 0,
  sleeping: 1, dream: 1, dreaming: 1, breathe: 1, breathing: 1,
  // Positive / hopeful / calm
  okay: 1, fine: 1, better: 1, good: 2, great: 3, wonderful: 3,
  beautiful: 2, peaceful: 3, calm: 3, serene: 3, grateful: 3,
  thankful: 2, love: 3, loved: 3, happy: 3, joy: 3, hope: 2,
  hopeful: 2, light: 1, free: 2, release: 2, let: 1, go: 1,
  healing: 2, grow: 2, strength: 2, strong: 2, courage: 2, proud: 2,
  smile: 2, laugh: 2, warmth: 2, safe: 2, trust: 2,
}

function rawScore(text: string): number {
  if (!text.trim()) return 0
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/)
  let total = 0
  let hits  = 0
  for (const w of words) {
    if (LEXICON[w] !== undefined) {
      total += LEXICON[w]
      hits++
    }
  }
  if (hits === 0) return 0
  // Clamp average to [-4,4] then normalise to [-1,1]
  return Math.max(-1, Math.min(1, total / hits / 4))
}

export function useSentiment() {
  const smoothedRef = useRef(0)

  const analyze = useCallback((text: string): number => {
    const raw = rawScore(text)
    // Smooth: 85% old value + 15% new — slow, cinematic shifts
    smoothedRef.current = smoothedRef.current * 0.85 + raw * 0.15
    return smoothedRef.current
  }, [])

  return { analyze }
}
