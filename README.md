# The Void — An Ephemeral 2AM Journal

> Type your thoughts into the dark. Watch them dissolve. Nothing is saved.

A minimalist, dark-mode web application designed for late-night overthinking. Built with Next.js, React Three Fiber, and Framer Motion.

---

## Features

- **Ephemeral thoughts** — press Enter, your text floats upward, fades, and is gone forever
- **3000 particle field** — custom GLSL shaders with additive blending for a glowing ember effect
- **Mouse gravity** — particles subtly drift toward/away from your cursor
- **Keystroke ripple** — every keypress sends a radial ripple through the particle field  
- **Enter shockwave** — submitting a thought triggers a particle blast from center
- **Ambient audio** — sub-bass drone + filtered rain noise + vinyl crackle, built with Web Audio API (fades in on first keystroke)
- **Dynamic float speed** — longer thoughts drift more slowly than short ones
- **Cityscape silhouette** — an ultra-faint SVG skyline anchors the bottom

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS**
- **Framer Motion** — 2D floating animation engine
- **React Three Fiber + Three.js** — 3D particle canvas
- **Web Audio API** — synthesized ambient soundscape

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build for Production

```bash
npm run build
npm start
```

## Architecture

```
app/
  page.tsx          — Main page: state, input, signal refs
  layout.tsx        — Root layout
  globals.css       — Base styles, font import, glow effects

components/
  VoidCanvas.tsx    — R3F Canvas wrapper (dynamically imported, ssr:false)
  ParticleField.tsx — Custom shader particle system with GLSL
  FloatingThought.tsx — Framer Motion thought animation
  CityscapeSVG.tsx  — Procedural SVG cityscape silhouette

hooks/
  useAmbientAudio.ts — Web Audio API ambient soundscape
```

## Design Notes

- All particle updates use `useRef` — zero React re-renders in the animation loop
- Framer Motion's `onAnimationComplete` handles garbage collection of thoughts
- The R3F canvas has `pointer-events: none` on its wrapper so mouse events pass through to the DOM input
- The input auto-focuses on load and re-focuses on window click
- No backend, no database, no persistence — everything is ephemeral by design

---

*"The night is the hardest time to be alive, and 4am knows all my secrets."*
