'use client'

import { useRef, useCallback } from 'react'

/**
 * Haunting vintage soundscape built entirely with the Web Audio API:
 *
 *  Layer 1 — Sub-bass drone (sine, ~42Hz) with slow LFO wobble
 *  Layer 2 — Filtered noise shaped to sound like rain two floors down
 *  Layer 3 — "Vintage strings" approximated with detuned sawtooth
 *             oscillators passed through heavy reverb and a deep low-pass
 *             filter — sounds like it's coming from another room
 *  Layer 4 — Vinyl crackle pops at random intervals
 *
 * Everything fades in gently on the first keystroke.
 */
export function useAmbientAudio() {
  const ctxRef       = useRef<AudioContext | null>(null)
  const masterRef    = useRef<GainNode | null>(null)
  const triggeredRef = useRef(false)
  const nextGhostRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Convolution reverb from a synthesised impulse ───────────────────────
  function makeReverb(ctx: AudioContext, duration = 4, decay = 3): ConvolverNode {
    const len    = ctx.sampleRate * duration
    const buffer = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c)
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
      }
    }
    const conv = ctx.createConvolver()
    conv.buffer = buffer
    return conv
  }

  const buildAudio = useCallback(() => {
    const ctx = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )()
    ctxRef.current = ctx

    const master = ctx.createGain()
    master.gain.setValueAtTime(0, ctx.currentTime)
    master.connect(ctx.destination)
    masterRef.current = master

    // ── 1. Sub-bass drone ────────────────────────────────────────────────
    const drone     = ctx.createOscillator()
    drone.type      = 'sine'
    drone.frequency.value = 42

    const droneGain = ctx.createGain()
    droneGain.gain.value = 0.14

    const wobble    = ctx.createOscillator()
    wobble.type     = 'sine'
    wobble.frequency.value = 0.05
    const wobbleMod = ctx.createGain()
    wobbleMod.gain.value = 1.8
    wobble.connect(wobbleMod)
    wobbleMod.connect(drone.frequency)
    wobble.start()

    drone.connect(droneGain)
    droneGain.connect(master)
    drone.start()

    // ── 2. Rain / static layer ───────────────────────────────────────────
    const bufSize   = ctx.sampleRate * 6
    const noiseBuf  = ctx.createBuffer(1, bufSize, ctx.sampleRate)
    const noiseData = noiseBuf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) noiseData[i] = Math.random() * 2 - 1

    const noise     = ctx.createBufferSource()
    noise.buffer    = noiseBuf
    noise.loop      = true

    const hp        = ctx.createBiquadFilter()
    hp.type         = 'highpass'
    hp.frequency.value = 800
    const lp        = ctx.createBiquadFilter()
    lp.type         = 'lowpass'
    lp.frequency.value = 3200

    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0.028

    noise.connect(hp)
    hp.connect(lp)
    lp.connect(noiseGain)
    noiseGain.connect(master)
    noise.start()

    // ── 3. Vintage strings — detuned sawtooths + reverb + deep low-pass ──
    // Builds a chord: low F, A, C (minor-ish, melancholic)
    const stringFreqs = [87.3, 110, 130.8, 164.8, 196, 220]
    const reverb      = makeReverb(ctx, 5, 2.5)

    // The reverb output goes through a heavy low-pass to
    // sound like it's playing from another room down the hall
    const roomFilter  = ctx.createBiquadFilter()
    roomFilter.type   = 'lowpass'
    roomFilter.frequency.value = 600
    roomFilter.Q.value = 0.5

    const stringMaster = ctx.createGain()
    stringMaster.gain.value = 0.09

    reverb.connect(roomFilter)
    roomFilter.connect(stringMaster)
    stringMaster.connect(master)

    stringFreqs.forEach((freq, i) => {
      const osc    = ctx.createOscillator()
      osc.type     = 'sawtooth'
      // Slight detuning per voice for warmth
      osc.frequency.value = freq * (1 + (i % 3 - 1) * 0.003)

      // Each string has its own very slow vibrato
      const vib    = ctx.createOscillator()
      vib.type     = 'sine'
      vib.frequency.value = 3.5 + i * 0.3
      const vibMod = ctx.createGain()
      vibMod.gain.value   = freq * 0.004
      vib.connect(vibMod)
      vibMod.connect(osc.frequency)
      vib.start()

      const g      = ctx.createGain()
      // Stagger the attack so they don't all start together
      g.gain.setValueAtTime(0, ctx.currentTime)
      g.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 4 + i * 1.5)

      osc.connect(g)
      g.connect(reverb)
      osc.start()
    })

    // ── 4. Vinyl crackle pops ────────────────────────────────────────────
    const schedulePop = () => {
      if (!ctxRef.current) return
      const popLen  = Math.floor(ctx.sampleRate * 0.03)
      const popBuf  = ctx.createBuffer(1, popLen, ctx.sampleRate)
      const popData = popBuf.getChannelData(0)
      for (let i = 0; i < popLen; i++) {
        popData[i] = (Math.random() * 2 - 1) * Math.exp(-i * 0.15)
      }
      const pop     = ctx.createBufferSource()
      pop.buffer    = popBuf

      const popGain = ctx.createGain()
      popGain.gain.value = Math.random() * 0.06 + 0.02

      // Run crackle through the room filter too
      pop.connect(popGain)
      popGain.connect(roomFilter)
      pop.start()

      const next = Math.random() * 5000 + 1200
      nextGhostRef.current = setTimeout(schedulePop, next)
    }
    schedulePop()

    // ── Fade master in over 4s ────────────────────────────────────────────
    master.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 4)
  }, [])

  const triggerAudio = useCallback(() => {
    if (triggeredRef.current) return
    triggeredRef.current = true
    buildAudio()
  }, [buildAudio])

  return { triggerAudio }
}
