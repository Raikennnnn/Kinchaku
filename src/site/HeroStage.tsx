import { useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { EASE_OUT } from "../components/motion";
import { PhonePreview } from "./PhonePreview";

/**
 * Hero visual: the app floating over an indigo "purse opening", with 5-yen
 * coins (the coin in the logo) spilling out and drifting around it. Coins at
 * different depths move at different rates with the pointer and the scroll,
 * and the far ones are softly blurred.
 */

type CoinSpec = {
  left: number; // % of the stage
  top: number;
  size: number; // px
  depth: number; // 0 far .. 1 near: parallax strength
  front?: boolean; // drawn over the phone
  blur?: number;
  spin?: boolean;
  tilt: number; // resting rotation, degrees
  float: number; // bob distance, px
  wide?: boolean; // only on wider screens, where there's room
};

const COINS: CoinSpec[] = [
  { left: 11, top: 21, size: 66, depth: 1, front: true, spin: true, tilt: -12, float: 14 },
  { left: 88, top: 13, size: 40, depth: 0.45, blur: 1.5, tilt: 20, float: 10 },
  { left: 91, top: 51, size: 78, depth: 0.9, front: true, tilt: 8, float: 18 },
  { left: 5, top: 61, size: 34, depth: 0.35, blur: 2, tilt: -25, float: 8, wide: true },
  { left: 85, top: 85, size: 52, depth: 0.7, front: true, spin: true, tilt: 14, float: 12 },
  { left: 17, top: 89, size: 30, depth: 0.3, blur: 2.5, tilt: 0, float: 9 },
  { left: 52, top: 3, size: 28, depth: 0.4, blur: 1.5, tilt: 30, float: 7, wide: true },
];

/** Approximate stage size, used to start each coin at the centre (the purse) before it flies out. */
const STAGE = { w: 480, h: 640 };

export function HeroStage() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // Pointer position relative to the window centre (-0.5..0.5), smoothed.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 50, damping: 16, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 50, damping: 16, mass: 0.6 });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  useEffect(() => {
    // Only for a mouse or trackpad; touch screens have no hover position.
    if (reduce || !window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      px.set(e.clientX / window.innerWidth - 0.5);
      py.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, px, py]);

  const phoneX = useTransform(sx, (v) => v * -12);
  const phoneY = useTransform(() => scrollYProgress.get() * -60 + sy.get() * -12);
  const haloY = useTransform(scrollYProgress, [0, 1], [0, 36]);

  return (
    <div ref={ref} className="relative mx-auto h-[560px] w-full max-w-[520px] sm:h-[720px]">
      {/* The purse opening: an indigo disc with faint coin-edge rings */}
      <motion.div
        aria-hidden="true"
        style={reduce ? undefined : { y: haloY }}
        className="absolute top-1/2 left-1/2 aspect-square w-[88%] max-w-[440px] -translate-x-1/2 -translate-y-1/2"
      >
        <motion.span
          className="absolute -inset-[12%] rounded-full border border-line"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.35, ease: EASE_OUT }}
        />
        <motion.span
          className="absolute -inset-[5%] rounded-full border border-line"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.25, ease: EASE_OUT }}
        />
        <motion.span
          className="absolute inset-0 overflow-hidden rounded-full bg-brand"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.1, ease: EASE_OUT }}
        >
          <span className="absolute inset-0 bg-[radial-gradient(70%_60%_at_30%_20%,rgb(255_255_255/0.16),transparent_65%)]" />
        </motion.span>
      </motion.div>

      {COINS.filter((c) => !c.front).map((c, i) => (
        <FloatingCoin key={i} spec={c} index={i} sx={sx} sy={sy} scroll={scrollYProgress} />
      ))}

      {/* Soft shadow on the "ground", breathing with the phone's float */}
      <motion.span
        aria-hidden="true"
        className="absolute bottom-[6%] left-1/2 h-7 w-40 sm:bottom-[3%] sm:w-52 -translate-x-1/2 rounded-full bg-[rgb(10_14_30/0.35)] blur-xl"
        animate={reduce ? undefined : { scaleX: [1, 0.82, 1], opacity: [0.9, 0.6, 0.9] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* The phone: rises in, then floats */}
      <motion.div
        style={reduce ? undefined : { x: phoneX, y: phoneY }}
        className="absolute top-1/2 left-1/2 z-[2] -translate-x-1/2 -translate-y-1/2 scale-[0.76] sm:scale-100"
      >
        <motion.div
          initial={{ opacity: 0, y: 90, rotate: -6 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ type: "spring", stiffness: 80, damping: 16, delay: 0.3 }}
        >
          <motion.div
            animate={reduce ? undefined : { y: [0, -12, 0], rotate: [-1.2, 0.8, -1.2] }}
            transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <PhonePreview />
          </motion.div>
        </motion.div>
      </motion.div>

      {COINS.filter((c) => c.front).map((c, i) => (
        <FloatingCoin key={i} spec={c} index={i + 3} sx={sx} sy={sy} scroll={scrollYProgress} />
      ))}
    </div>
  );
}

function FloatingCoin({
  spec,
  index,
  sx,
  sy,
  scroll,
}: {
  spec: CoinSpec;
  index: number;
  sx: MotionValue<number>;
  sy: MotionValue<number>;
  scroll: MotionValue<number>;
}) {
  const reduce = useReducedMotion();
  // Nearer coins move more: that difference is what reads as depth.
  const x = useTransform(sx, (v) => v * 44 * spec.depth);
  const y = useTransform(() => scroll.get() * -170 * spec.depth + sy.get() * 44 * spec.depth);

  // Start at the centre of the stage (the purse) and fly out to its place.
  const fromX = ((50 - spec.left) / 100) * STAGE.w;
  const fromY = ((50 - spec.top) / 100) * STAGE.h;

  return (
    <motion.div
      aria-hidden="true"
      className={`absolute -translate-x-1/2 -translate-y-1/2 scale-[0.8] sm:scale-100 ${spec.front ? "z-[3]" : "z-[1]"} ${spec.wide ? "hidden sm:block" : ""}`}
      style={{ left: `${spec.left}%`, top: `${spec.top}%`, ...(reduce ? {} : { x, y }) }}
    >
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.2, x: fromX, y: fromY, rotate: spec.tilt - 90 }}
        animate={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: spec.tilt }}
        transition={{ type: "spring", stiffness: 70, damping: 13, delay: 0.75 + index * 0.08 }}
      >
        <motion.div
          animate={reduce ? undefined : { y: [0, -spec.float, 0], rotate: [0, spec.tilt > 0 ? 7 : -7, 0] }}
          transition={{ duration: 5 + (index % 4) * 0.9, repeat: Infinity, ease: "easeInOut", delay: 1.4 + index * 0.3 }}
        >
          <Coin size={spec.size} blur={spec.blur} spin={spec.spin && !reduce} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/** A brass 5-yen coin: raised rim, inner ring and the hole in the middle (see .coin in site.css). */
function Coin({ size, blur = 0, spin = false }: { size: number; blur?: number; spin?: boolean }) {
  return (
    <span
      className="block"
      style={{ filter: `${blur ? `blur(${blur}px) ` : ""}drop-shadow(0 12px 14px rgb(40 26 4 / 0.28))` }}
    >
      <motion.span
        className="coin block"
        style={{ width: size, height: size, transformPerspective: 500 }}
        animate={spin ? { rotateY: [0, 360] } : undefined}
        transition={spin ? { duration: 8, repeat: Infinity, ease: "linear", delay: 2 } : undefined}
      />
    </span>
  );
}
