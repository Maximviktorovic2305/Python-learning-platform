"use client";

import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
} from "motion/react";
import { PythonLogo } from "@/shared/ui/python-logo";

export function PythonMark({ animated = false }: { animated?: boolean }) {
  const reduced = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(my, { stiffness: 80, damping: 20 });
  const rotateY = useSpring(mx, { stiffness: 80, damping: 20 });
  return (
    <motion.div
      className={`python-mark ${animated ? "hero-mark" : ""}`}
      style={{ rotateX, rotateY }}
      onPointerMove={(event) => {
        if (!animated || reduced) return;
        const rect = event.currentTarget.getBoundingClientRect();
        mx.set((event.clientX - rect.left - rect.width / 2) / 25);
        my.set(-(event.clientY - rect.top - rect.height / 2) / 25);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      {animated && (
        <>
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <span className="coord coord-top">PY / 03.14</span>
          <span className="coord coord-bottom">BUILD. BREAK. UNDERSTAND.</span>
          <div className="mark-cross">+</div>
        </>
      )}
      <PythonLogo size={animated ? 215 : 28} className="python-svg" />
      {animated && (
        <div className="mark-status">
          <span className="status-dot" />
          interpreter online
        </div>
      )}
    </motion.div>
  );
}
