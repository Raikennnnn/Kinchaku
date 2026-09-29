import { forwardRef, useImperativeHandle } from "react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";

export type Mood = "happy" | "okay" | "worried" | "sleepy" | "excited";

export type PetCatHandle = { jump: () => void };

const INK = "#2b2622";
const FUR = "#fbf6ee";
const PINK = "#f4a9a0";

type Props = { mood: Mood; size?: number; label?: string; hearts?: number };

/**
 * The budget cat: an original lucky-cat drawing with a 5-yen coin on its
 * collar. It breathes, blinks and swishes its tail; its face and body follow
 * the mood (waving when happy, trembling when worried, dozing at night).
 */
export const PetCat = forwardRef<PetCatHandle, Props>(function PetCat({ mood, size = 96, label = "Budget cat", hearts = 0 }, ref) {
  const reduce = useReducedMotion();
  const body = useAnimationControls();
  useImperativeHandle(ref, () => ({
    jump: () => {
      if (!reduce) void body.start({ y: [0, -16, 0], transition: { duration: 0.5, ease: [0.2, 0.8, 0.3, 1] } });
    },
  }));

  const live = !reduce;
  const loop = (duration: number, extra: object = {}) => ({ duration, repeat: Infinity, ease: "easeInOut" as const, ...extra });
  const waving = mood === "happy" || mood === "excited";
  const origin = (x: number, y: number) => ({ transformOrigin: `${x}px ${y}px`, transformBox: "view-box" as const });

  // Whole-body motion per mood.
  const moodMotion =
    !live
      ? {}
      : mood === "excited"
        ? { animate: { y: [0, -6, 0] }, transition: loop(0.7) }
        : mood === "happy"
          ? { animate: { y: [0, -3, 0] }, transition: loop(1.4) }
          : mood === "worried"
            ? { animate: { x: [-0.6, 0.6, -0.6] }, transition: loop(0.25) }
            : { animate: { y: [0, -1.2, 0] }, transition: loop(mood === "sleepy" ? 4.5 : 3) };

  return (
    <svg viewBox="0 0 120 130" width={size} height={size * (130 / 120)} role="img" aria-label={label} className="overflow-visible">
      <ellipse cx="60" cy="123" rx="27" ry="4.5" fill="rgb(10 14 30 / 0.16)" />
      <motion.g animate={body}>
        <motion.g {...moodMotion}>
          {/* Tail, behind the body */}
          <motion.g
            style={origin(78, 112)}
            animate={live ? { rotate: mood === "worried" ? [-3, 3, -3] : [-7, 11, -7] } : undefined}
            transition={loop(mood === "sleepy" ? 4 : 2.4)}
          >
            <path d="M78 112 C97 115 107 100 101 85 C98 77 90 79 93 88" fill="none" stroke={INK} strokeWidth="12" strokeLinecap="round" />
            <path d="M78 112 C97 115 107 100 101 85 C98 77 90 79 93 88" fill="none" stroke={FUR} strokeWidth="7.5" strokeLinecap="round" />
          </motion.g>

          {/* Body, belly and feet */}
          <path d="M38 119 C33 101 38 80 60 80 C82 80 87 101 82 119 Z" fill={FUR} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
          <ellipse cx="60" cy="104" rx="12.5" ry="11" fill="#ffffff" opacity="0.75" />
          <ellipse cx="49" cy="119" rx="7.5" ry="4.8" fill={FUR} stroke={INK} strokeWidth="2.2" />
          <ellipse cx="71" cy="119" rx="7.5" ry="4.8" fill={FUR} stroke={INK} strokeWidth="2.2" />

          {/* Raised beckoning paw (maneki-neko) when happy */}
          <AnimatePresence>
            {waving && (
              <motion.g
                key="paw"
                style={origin(40, 92)}
                initial={{ rotate: 40, opacity: 0 }}
                animate={live ? { rotate: [-12, 14, -12], opacity: 1 } : { rotate: 0, opacity: 1 }}
                exit={{ rotate: 40, opacity: 0 }}
                transition={live ? { rotate: loop(mood === "excited" ? 0.45 : 0.8), opacity: { duration: 0.2 } } : { duration: 0.2 }}
              >
                <rect x="31" y="60" width="15" height="33" rx="7.5" fill={FUR} stroke={INK} strokeWidth="2.2" />
                <path d="M34.5 64.5 v3 M38.5 63.5 v3.5 M42.5 64.5 v3" stroke={INK} strokeWidth="1.3" strokeLinecap="round" opacity="0.6" />
              </motion.g>
            )}
          </AnimatePresence>

          {/* Ears, drawn before the head so it covers their base */}
          <motion.g
            style={origin(44, 32)}
            animate={live ? { rotate: mood === "worried" ? -14 : mood === "sleepy" ? -6 : [0, 0, -9, 0] } : undefined}
            transition={mood === "worried" || mood === "sleepy" ? { duration: 0.4 } : loop(5, { times: [0, 0.8, 0.86, 1] })}
          >
            <path d="M31 45 L34 11 Q35 8.5 37.5 10 L58 25 Z" fill={FUR} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
            <path d="M36.5 37 L38.5 17.5 L51 26.5 Z" fill={PINK} />
          </motion.g>
          <motion.g style={origin(76, 32)} animate={live ? { rotate: mood === "worried" ? 14 : mood === "sleepy" ? 6 : 0 } : undefined} transition={{ duration: 0.4 }}>
            <path d="M89 45 L86 11 Q85 8.5 82.5 10 L62 25 Z" fill={FUR} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
            <path d="M83.5 37 L81.5 17.5 L69 26.5 Z" fill={PINK} />
          </motion.g>

          {/* Head */}
          <path d="M60 22 C83 22 92 38 92 53 C92 71 78 81 60 81 C42 81 28 71 28 53 C28 38 37 22 60 22 Z" fill={FUR} stroke={INK} strokeWidth="2.4" />
          <ellipse cx="40" cy="61" rx="5.5" ry="3.2" fill={PINK} opacity="0.55" />
          <ellipse cx="80" cy="61" rx="5.5" ry="3.2" fill={PINK} opacity="0.55" />
          <path d="M29 58 L39.5 59.5 M29.5 64 L39.5 62.5 M91 58 L80.5 59.5 M90.5 64 L80.5 62.5" stroke={INK} strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />

          <Face mood={mood} live={live} />

          {/* Collar with a 5-yen coin tag */}
          <path d="M40 77 Q60 87.5 80 77" fill="none" stroke="#c73b25" strokeWidth="5" strokeLinecap="round" />
          <circle cx="60" cy="87" r="6.3" fill="#e2b24c" stroke="#9c6e1e" strokeWidth="1.2" />
          <circle cx="60" cy="87" r="4.2" fill="none" stroke="#b8872a" strokeWidth="0.8" />
          <circle cx="60" cy="87" r="1.8" fill={FUR} stroke="#9c6e1e" strokeWidth="0.6" />
        </motion.g>
      </motion.g>

      {/* Dozing z's */}
      <AnimatePresence>
        {mood === "sleepy" && live &&
          [0, 1, 2].map((i) => (
            <motion.text
              key={`z${i}`}
              x={90 + i * 6}
              y={34 - i * 7}
              fontSize={9 + i * 3}
              fontWeight={700}
              fill="var(--muted)"
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: [0, 1, 0], y: [-2, -10] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8 }}
            >
              z
            </motion.text>
          ))}
      </AnimatePresence>

      {/* A heart pops up each time it's tapped */}
      <AnimatePresence>
        {hearts > 0 && (
          <motion.path
            key={hearts}
            d="M60 14 C60 9 53 7 51 12 C49 17 60 22 60 22 C60 22 71 17 69 12 C67 7 60 9 60 14 Z"
            fill="#e2786d"
            initial={{ opacity: 0, y: 6, scale: 0.4 }}
            animate={{ opacity: [0, 1, 1, 0], y: -14, scale: 1 }}
            transition={{ duration: 1 }}
            style={origin(60, 15)}
          />
        )}
      </AnimatePresence>
    </svg>
  );
});

function Face({ mood, live }: { mood: Mood; live: boolean }) {
  const blink = live
    ? { animate: { scaleY: [1, 1, 0.12, 1] }, transition: { duration: 4.2, times: [0, 0.9, 0.95, 1], repeat: Infinity } }
    : {};
  const eyeStyle = { transformBox: "fill-box" as const, transformOrigin: "center" };

  return (
    <g>
      {mood === "happy" || mood === "excited" ? (
        <g stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none">
          <path d="M43.5 54 Q48 48.5 52.5 54" />
          <path d="M67.5 54 Q72 48.5 76.5 54" />
        </g>
      ) : mood === "sleepy" ? (
        <g stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none">
          <path d="M43.5 52 Q48 56 52.5 52" />
          <path d="M67.5 52 Q72 56 76.5 52" />
        </g>
      ) : (
        <>
          {mood === "worried" && (
            <g stroke={INK} strokeWidth="1.8" strokeLinecap="round">
              <path d="M42.5 45.5 L51.5 42.5" />
              <path d="M77.5 45.5 L68.5 42.5" />
            </g>
          )}
          <motion.g style={eyeStyle} {...blink}>
            <ellipse cx="48" cy="53" rx="3.7" ry={mood === "worried" ? 4 : 4.7} fill={INK} />
            <circle cx="49.3" cy="51.3" r="1.25" fill="#fff" />
          </motion.g>
          <motion.g style={eyeStyle} {...blink}>
            <ellipse cx="72" cy="53" rx="3.7" ry={mood === "worried" ? 4 : 4.7} fill={INK} />
            <circle cx="73.3" cy="51.3" r="1.25" fill="#fff" />
          </motion.g>
        </>
      )}

      <path d="M57.4 60 L62.6 60 L60 63 Z" fill="#e2786d" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      {mood === "excited" ? (
        <path d="M55 64 Q60 73 65 64 Z" fill="#c95a52" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      ) : mood === "worried" ? (
        <path d="M55.5 68 Q60 64.5 64.5 68" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path d="M60 63 Q57.2 67 54 65 M60 63 Q62.8 67 66 65" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      )}
    </g>
  );
}
