"use client";

import Image from "next/image";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Pause, Play } from "lucide-react";
import { startSnakeAnimation } from "./renderer";

const PausedContext = createContext(false);

export function LandingSnake({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<ReturnType<typeof startSnakeAnimation> | null>(
    null,
  );
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const animation = startSnakeAnimation(canvas);
    animationRef.current = animation;
    return () => {
      animation.dispose();
      animationRef.current = null;
    };
  }, []);

  return (
    <PausedContext.Provider value={paused}>
      <div className="landing-page" data-animation-paused={paused}>
        <canvas ref={canvasRef} className="landing-snake" aria-hidden="true" />
        <button
          type="button"
          className="snake-motion-toggle"
          aria-label={paused ? "Продолжить анимации" : "Приостановить анимации"}
          aria-pressed={paused}
          onClick={() => {
            const next = !paused;
            setPaused(next);
            animationRef.current?.setPaused(next);
          }}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
          <span>Анимация</span>
        </button>
        {children}
      </div>
    </PausedContext.Provider>
  );
}

export function HeroPythonGif() {
  const filterId = useId();
  const paused = useContext(PausedContext);
  const imageRef = useRef<HTMLImageElement>(null);
  const stillRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const freeze = () => {
      const image = imageRef.current;
      const canvas = stillRef.current;
      if (image?.complete && image.naturalWidth && canvas) {
        canvas
          .getContext("2d")
          ?.drawImage(image, 0, 0, canvas.width, canvas.height);
      }
    };
    if (paused || motion.matches) freeze();
    motion.addEventListener("change", freeze);
    return () => motion.removeEventListener("change", freeze);
  }, [paused]);

  return (
    <div className="hero-python-gif" aria-hidden="true">
      <svg width="0" height="0" className="gif-filter-defs">
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  1 1 1 0 0"
              result="keyed"
            />
            <feComponentTransfer in="keyed" result="transparent">
              <feFuncA
                type="discrete"
                tableValues="0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1"
              />
            </feComponentTransfer>
            <feComposite in="transparent" in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
      </svg>
      <div className="hero-gif-frame" style={{ filter: `url(#${filterId})` }}>
        <canvas ref={stillRef} width={800} height={600} />
        <Image
          ref={imageRef}
          src="/python-cube.gif"
          width={800}
          height={600}
          alt=""
          unoptimized
          preload
          onLoad={(event) => {
            const canvas = stillRef.current;
            if (canvas)
              canvas
                .getContext("2d")
                ?.drawImage(event.currentTarget, 0, 0, 800, 600);
          }}
        />
      </div>
    </div>
  );
}
