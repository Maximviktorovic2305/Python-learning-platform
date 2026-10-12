"use client";
import { motion, useReducedMotion, useMotionValue, useSpring } from "motion/react";

export function PythonMark({ animated = false }: { animated?: boolean }) {
  const reduced = useReducedMotion(); const mx = useMotionValue(0); const my = useMotionValue(0);
  const rotateX = useSpring(my, { stiffness: 80, damping: 20 }); const rotateY = useSpring(mx, { stiffness: 80, damping: 20 });
  const active = animated && !reduced;
  return <motion.div className={`python-mark ${animated ? "hero-mark" : ""}`} style={active ? { rotateX, rotateY } : {}} onPointerMove={event => { if (!active) return; const rect = event.currentTarget.getBoundingClientRect(); mx.set((event.clientX - rect.left - rect.width / 2) / 25); my.set(-(event.clientY - rect.top - rect.height / 2) / 25); }} onPointerLeave={() => { mx.set(0); my.set(0); }}>
    {animated && <><div className="orbit orbit-one" /><div className="orbit orbit-two" /><span className="coord coord-top">PY / 03.14</span><span className="coord coord-bottom">BUILD. BREAK. UNDERSTAND.</span><div className="mark-cross">+</div></>}
    <svg viewBox="0 0 120 120" role="img" aria-label="Python" className="python-svg">
      <defs><filter id={animated ? "hero-glow" : "small-glow"}><feGaussianBlur stdDeviation="2" /></filter></defs>
      <motion.g animate={active ? { x: [0, -12, 0, 0, -28, 0], y: [0, -8, 0, 0, -18, 0], opacity: [1, .1, 1, 1, .2, 1] } : {}} transition={{ duration: 14, repeat: Infinity, times: [0, .08, .17, .75, .88, 1] }}>
        <path fill="var(--python-blue)" d="M59 10C34 10 34 17 34 29v13h29v5H24C7 47 7 75 18 79h12V63c0-14 8-19 22-19h23c12 0 13-7 13-15v-5C88 10 75 10 59 10Z" />
        <circle cx="46" cy="24" r="3.5" fill="var(--bg)" />
      </motion.g>
      <motion.g animate={active ? { x: [0, 12, 0, 0, 28, 0], y: [0, 8, 0, 0, 18, 0], opacity: [1, .1, 1, 1, .2, 1] } : {}} transition={{ duration: 14, repeat: Infinity, times: [0, .08, .17, .75, .88, 1] }}>
        <path fill="var(--python-yellow)" d="M61 110c25 0 25-7 25-19V78H57v-5h39c17 0 17-28 6-32H90v16c0 14-8 19-22 19H45c-12 0-13 7-13 15v5c0 14 13 14 29 14Z" />
        <circle cx="74" cy="96" r="3.5" fill="var(--bg)" />
      </motion.g>
      {animated && Array.from({ length: 32 }, (_, i) => { const angle = i * Math.PI * 2 / 32; const x = 60 + Math.cos(angle) * 45; const y = 60 + Math.sin(angle) * 45; return <motion.circle key={i} cx={x} cy={y} r={i % 3 ? .6 : 1.2} fill={i % 2 ? "var(--python-blue)" : "var(--python-yellow)"} animate={active ? { cx: [x, 60 + Math.cos(angle) * 58, x, x, 60 + Math.cos(angle) * 59, x], cy: [y, 60 + Math.sin(angle) * 58, y, y, 60 + Math.sin(angle) * 59, y], opacity: [0, 1, 0, 0, 1, 0] } : { opacity: .4 }} transition={{ duration: 14, repeat: Infinity, times: [0, .08, .17, .75, .88, 1] }} />; })}
    </svg>
    {animated && <div className="mark-status"><span className="status-dot" />interpreter online</div>}
  </motion.div>;
}
