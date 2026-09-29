import { forwardRef, useId, useImperativeHandle } from "react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";

export type Mood = "happy" | "okay" | "worried" | "sleepy" | "excited";

export type PetCatHandle = { jump: () => void };

// Palette: warm cream fur with calico patches (sumi black and persimmon),
// drawn with a warm brown line rather than flat black.
export const CAT = {
  line: "#3b2a22",
  fur: "#fffaf2",
  shade: "#efe1cd",
  sumi: "#3a2e2a",
  orange: "#e8944f",
  orangeShade: "#cf7a37",
  pink: "#f2a3a0",
  pinkDeep: "#e2807e",
  iris: "#7a4e2c",
  gold: "#f0c052",
  goldDeep: "#c08a24",
  red: "#c73b25",
};

type Props = { mood: Mood; size?: number; label?: string; hearts?: number };

// Shapes shared by the drawing and its clip paths.
const HEAD =
  "M60 24 C80 24 92.5 36 93.5 51 C94 57 92.5 60.5 96.5 64 C92.5 64.8 90.5 66 91 69.5 C85.5 77 74 80.5 60 80.5 C46 80.5 34.5 77 29 69.5 C29.5 66 27.5 64.8 23.5 64 C27.5 60.5 26 57 26.5 51 C27.5 36 40 24 60 24 Z";
const BODY = "M33.5 121 C28.5 104 35 84 60 84 C85 84 91.5 104 86.5 121 Q60 125.5 33.5 121 Z";
const TAIL = "M83 116 C99 119 108 107 104.5 95 C102.5 87.5 95 87 95.5 93.5";

/**
 * Koban, the budget cat: an original calico maneki-neko hugging an oval gold
 * koban coin (the old Japanese coin it's named after). It breathes, blinks and
 * swishes its tail; its face follows the mood, and when things are good it
 * beckons with a raised paw.
 */
export const PetCat = forwardRef<PetCatHandle, Props>(function PetCat({ mood, size = 96, label = "Budget cat", hearts = 0 }, ref) {
  const reduce = useReducedMotion();
  const body = useAnimationControls();
  const uid = useId().replace(/:/g, "");
  useImperativeHandle(ref, () => ({
    jump: () => {
      if (!reduce) void body.start({ y: [0, -16, 0], transition: { duration: 0.5, ease: [0.2, 0.8, 0.3, 1] } });
    },
  }));

  const live = !reduce;
  const loop = (duration: number, extra: object = {}) => ({ duration, repeat: Infinity, ease: "easeInOut" as const, ...extra });
  const waving = mood === "happy" || mood === "excited";
  const origin = (x: number, y: number) => ({ transformOrigin: `${x}px ${y}px`, transformBox: "view-box" as const });
  const headClip = `koban-head-${uid}`;
  const bodyClip = `koban-body-${uid}`;

  // Whole-body motion per mood.
  const moodMotion = !live
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
      <defs>
        <clipPath id={headClip}>
          <path d={HEAD} />
        </clipPath>
        <clipPath id={bodyClip}>
          <path d={BODY} />
        </clipPath>
      </defs>

      <ellipse cx="60" cy="123.5" rx="30" ry="4.2" fill="rgb(10 14 30 / 0.16)" />
      <motion.g animate={body}>
        <motion.g {...moodMotion}>
          {/* Tail, behind the body, with a persimmon tip */}
          <motion.g
            style={origin(83, 116)}
            animate={live ? { rotate: mood === "worried" ? [-3, 3, -3] : [-7, 10, -7] } : undefined}
            transition={loop(mood === "sleepy" ? 4 : 2.4)}
          >
            <path d={TAIL} fill="none" stroke={CAT.line} strokeWidth="11.5" strokeLinecap="round" />
            <path d={TAIL} fill="none" stroke={CAT.fur} strokeWidth="7.4" strokeLinecap="round" />
            <path d={TAIL} pathLength={100} strokeDasharray="0 70 100" fill="none" stroke={CAT.orange} strokeWidth="7.4" strokeLinecap="round" />
          </motion.g>

          {/* Body: fur, a calico patch on the back, shade under the chin */}
          <path d={BODY} fill={CAT.fur} />
          <g clipPath={`url(#${bodyClip})`}>
            <path d="M74 86 C86 88 92 102 90 114 C84 110 78 101 74 86 Z" fill={CAT.orange} />
            <ellipse cx="60" cy="85" rx="24" ry="6.5" fill={CAT.shade} />
            <ellipse cx="60" cy="122" rx="30" ry="6" fill={CAT.shade} opacity="0.7" />
          </g>
          <path d={BODY} fill="none" stroke={CAT.line} strokeWidth="2.2" strokeLinejoin="round" />

          {/* Feet */}
          <g fill={CAT.fur} stroke={CAT.line} strokeWidth="1.8">
            <ellipse cx="47" cy="120" rx="7.4" ry="4.4" />
            <ellipse cx="73" cy="120" rx="7.4" ry="4.4" />
          </g>
          <path d="M44.5 118.5 v2.2 M49.5 118.5 v2.2 M70.5 118.5 v2.2 M75.5 118.5 v2.2" stroke={CAT.line} strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />

          {/* The koban coin, hugged to the chest */}
          <g>
            <ellipse cx="60" cy="106" rx="9" ry="11.5" fill={CAT.gold} stroke={CAT.goldDeep} strokeWidth="1.4" />
            <ellipse cx="60" cy="106" rx="6.4" ry="8.8" fill="none" stroke={CAT.goldDeep} strokeWidth="0.9" opacity="0.7" />
            <path d="M56 101 h8 M55.2 104.6 h9.6 M55.2 108.2 h9.6 M56 111.8 h8" stroke={CAT.goldDeep} strokeWidth="0.9" strokeLinecap="round" opacity="0.55" />
            <path d="M54.4 100 Q55.8 96.6 58.6 95.8" fill="none" stroke="#fff6d8" strokeWidth="1.4" strokeLinecap="round" opacity="0.9" />
          </g>
          {/* Paws holding it: the left one lets go to beckon */}
          <HoldingPaw x={69.6} tilt={24} />
          <AnimatePresence initial={false}>
            {!waving && (
              <motion.g key="hold" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <HoldingPaw x={50.4} tilt={-24} />
              </motion.g>
            )}
          </AnimatePresence>

          {/* Collar with a gold bell, under the chin */}
          <path d="M38 77.5 Q60 88.5 82 77.5" fill="none" stroke={CAT.red} strokeWidth="4.6" strokeLinecap="round" />
          <circle cx="60" cy="87" r="4.2" fill={CAT.gold} stroke={CAT.goldDeep} strokeWidth="1.1" />
          <path d="M57.4 87.8 h5.2" stroke={CAT.goldDeep} strokeWidth="1" strokeLinecap="round" />
          <circle cx="60" cy="89.5" r="0.75" fill={CAT.goldDeep} />
          <path d="M58 85.4 Q58.8 84.2 60.3 84" fill="none" stroke="#fff6d8" strokeWidth="0.9" strokeLinecap="round" />

          {/* Ears: sumi black on the left, persimmon on the right */}
          <motion.g
            style={origin(44, 34)}
            animate={live ? { rotate: mood === "worried" ? -14 : mood === "sleepy" ? -7 : [0, 0, -9, 0] } : undefined}
            transition={mood === "worried" || mood === "sleepy" ? { duration: 0.4 } : loop(5, { times: [0, 0.8, 0.86, 1] })}
          >
            <path d="M29.5 46 L31 15.5 Q31.8 10.5 36.8 12.8 L56 28 Z" fill={CAT.sumi} stroke={CAT.line} strokeWidth="2" strokeLinejoin="round" />
            <path d="M35 39 L36 19.5 Q36.6 17.6 38.4 18.6 L50.5 28.5 Z" fill={CAT.pinkDeep} opacity="0.85" />
            <path d="M37 34 l3 -4 M38.2 38.6 l3.6 -3.2" stroke={CAT.fur} strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
          </motion.g>
          <motion.g
            style={origin(76, 34)}
            animate={live ? { rotate: mood === "worried" ? 14 : mood === "sleepy" ? 7 : 0 } : undefined}
            transition={{ duration: 0.4 }}
          >
            <path d="M90.5 46 L89 15.5 Q88.2 10.5 83.2 12.8 L64 28 Z" fill={CAT.orange} stroke={CAT.line} strokeWidth="2" strokeLinejoin="round" />
            <path d="M85 39 L84 19.5 Q83.4 17.6 81.6 18.6 L69.5 28.5 Z" fill={CAT.pink} />
            <path d="M83 34 l-3 -4 M81.8 38.6 l-3.6 -3.2" stroke={CAT.fur} strokeWidth="0.9" strokeLinecap="round" opacity="0.8" />
          </motion.g>

          {/* Head: fur, calico patches, cheek shade, then the outline on top */}
          <path d={HEAD} fill={CAT.fur} />
          <g clipPath={`url(#${headClip})`}>
            <path d="M24 44 C27 30 40 22 55 23.5 C55 31 48 37.5 40 39.5 C33 41 27 43 24 44 Z" fill={CAT.sumi} />
            <path d="M96 40 C93 30 84 24.5 74 24 C75.5 29.5 81 33.5 88 34.5 C91.5 35 94 37 96 40 Z" fill={CAT.orange} />
          </g>
          <path d={HEAD} fill="none" stroke={CAT.line} strokeWidth="2.2" strokeLinejoin="round" />

          {/* Whiskers, outside the cheeks */}
          <path d="M25 59.5 L14.5 57.5 M25.5 63.5 L15 64.5 M95 59.5 L105.5 57.5 M94.5 63.5 L105 64.5" stroke={CAT.line} strokeWidth="1.1" strokeLinecap="round" opacity="0.5" />

          <Face mood={mood} live={live} />

          {/* Raised beckoning paw, pad towards you */}
          <AnimatePresence>
            {waving && (
              <motion.g
                key="beckon"
                style={origin(30, 92)}
                initial={{ rotate: 40, opacity: 0 }}
                animate={live ? { rotate: [-12, 12, -12], opacity: 1 } : { rotate: 0, opacity: 1 }}
                exit={{ rotate: 40, opacity: 0 }}
                transition={live ? { rotate: loop(mood === "excited" ? 0.45 : 0.8), opacity: { duration: 0.2 } } : { duration: 0.2 }}
              >
                <rect x="20.5" y="54" width="17" height="38" rx="8.5" fill={CAT.fur} stroke={CAT.line} strokeWidth="2" />
                <ellipse cx="29" cy="64.5" rx="3.8" ry="3.2" fill={CAT.pink} />
                <circle cx="24.8" cy="59.2" r="1.4" fill={CAT.pink} />
                <circle cx="29" cy="57.7" r="1.4" fill={CAT.pink} />
                <circle cx="33.2" cy="59.2" r="1.4" fill={CAT.pink} />
              </motion.g>
            )}
          </AnimatePresence>
        </motion.g>
      </motion.g>

      {/* Dozing z's */}
      <AnimatePresence>
        {mood === "sleepy" &&
          live &&
          [0, 1, 2].map((i) => (
            <motion.text
              key={`z${i}`}
              x={92 + i * 6}
              y={30 - i * 7}
              fontSize={8 + i * 3}
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
            fill={CAT.pinkDeep}
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

/** A front paw resting on the coin, tilted in towards it. */
function HoldingPaw({ x, tilt }: { x: number; tilt: number }) {
  return (
    <g transform={`rotate(${tilt} ${x} 104)`}>
      <ellipse cx={x} cy="104" rx="4.9" ry="6.2" fill={CAT.fur} stroke={CAT.line} strokeWidth="1.8" />
      <path d={`M${x - 1.9} 99 v2.1 M${x + 1.9} 99 v2.1`} stroke={CAT.line} strokeWidth="1" strokeLinecap="round" opacity="0.55" />
    </g>
  );
}

/** Open eye: dark almond with a warm brown iris and two catchlights. */
function OpenEye({ cx, sparkle = false, look = 0 }: { cx: number; sparkle?: boolean; look?: number }) {
  const cy = 52.5;
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx="5" ry="5.9" fill={CAT.line} />
      <ellipse cx={cx + look} cy={cy + 1.6} rx="3.5" ry="3.3" fill={CAT.iris} />
      <circle cx={cx + 1.7 + look} cy={cy - 2.1} r={sparkle ? 2.3 : 1.9} fill="#fff" />
      <circle cx={cx - 1.6 + look} cy={cy + 2.4} r={sparkle ? 1.1 : 0.85} fill="#fff" opacity="0.9" />
      {sparkle && <path d={`M${cx - 2.6} ${cy - 3.2} l0.6 1.2 l1.2 0.6 l-1.2 0.6 l-0.6 1.2 l-0.6 -1.2 l-1.2 -0.6 l1.2 -0.6 Z`} fill="#fff" />}
    </g>
  );
}

function Face({ mood, live }: { mood: Mood; live: boolean }) {
  const blink = live ? { animate: { scaleY: [1, 1, 0.1, 1] }, transition: { duration: 4.2, times: [0, 0.9, 0.95, 1], repeat: Infinity } } : {};
  const eyeStyle = { transformBox: "fill-box" as const, transformOrigin: "center" };
  const stroke = { stroke: CAT.line, strokeLinecap: "round" as const, fill: "none" };

  return (
    <g>
      {/* Blush and muzzle */}
      <ellipse cx="41.5" cy="63.5" rx="5.2" ry="2.7" fill={CAT.pink} opacity={mood === "worried" ? 0.3 : 0.5} />
      <ellipse cx="78.5" cy="63.5" rx="5.2" ry="2.7" fill={CAT.pink} opacity={mood === "worried" ? 0.3 : 0.5} />
      <ellipse cx="55.2" cy="64" rx="5" ry="3.6" fill="#fff" opacity="0.75" />
      <ellipse cx="64.8" cy="64" rx="5" ry="3.6" fill="#fff" opacity="0.75" />
      <g fill={CAT.line} opacity="0.35">
        <circle cx="52.6" cy="63" r="0.55" />
        <circle cx="54.6" cy="65.2" r="0.55" />
        <circle cx="52" cy="65.8" r="0.55" />
        <circle cx="67.4" cy="63" r="0.55" />
        <circle cx="65.4" cy="65.2" r="0.55" />
        <circle cx="68" cy="65.8" r="0.55" />
      </g>

      {/* Eyes */}
      {mood === "happy" ? (
        <g {...stroke} strokeWidth="2.4">
          <path d="M42 54.5 Q47 48.5 52 54.5" />
          <path d="M68 54.5 Q73 48.5 78 54.5" />
        </g>
      ) : mood === "sleepy" ? (
        <g {...stroke} strokeWidth="2.2">
          <path d="M42 52.5 Q47 56.5 52 52.5" />
          <path d="M68 52.5 Q73 56.5 78 52.5" />
          <path d="M42.6 53.6 l-1.8 1.4 M77.4 53.6 l1.8 1.4" strokeWidth="1.4" />
        </g>
      ) : (
        <>
          {mood === "worried" && (
            <g {...stroke} strokeWidth="1.8">
              <path d="M41.5 44.5 Q46 41.5 51 42.8" />
              <path d="M78.5 44.5 Q74 41.5 69 42.8" />
            </g>
          )}
          <motion.g style={eyeStyle} {...blink}>
            <OpenEye cx={47} sparkle={mood === "excited"} look={mood === "worried" ? -0.8 : 0} />
          </motion.g>
          <motion.g style={eyeStyle} {...blink}>
            <OpenEye cx={73} sparkle={mood === "excited"} look={mood === "worried" ? -0.8 : 0} />
          </motion.g>
        </>
      )}

      {/* Nose and mouth */}
      <path d="M57.4 59.3 Q60 58.3 62.6 59.3 Q61.4 61.9 60 62.1 Q58.6 61.9 57.4 59.3 Z" fill={CAT.pinkDeep} />
      <path d="M60 62.1 L60 63.4" {...stroke} strokeWidth="1.3" />
      {mood === "excited" ? (
        <g>
          <path d="M55.6 63.4 Q60 71.5 64.4 63.4 Q60 65 55.6 63.4 Z" fill="#9c3b36" stroke={CAT.line} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M57.8 67.6 Q60 66.2 62.2 67.6 Q60 69.6 57.8 67.6 Z" fill={CAT.pink} />
        </g>
      ) : mood === "worried" ? (
        <path d="M55.5 67 Q57.8 64.8 60 66.6 Q62.2 64.8 64.5 67" {...stroke} strokeWidth="1.5" />
      ) : (
        <path d="M55.8 63.2 Q57.9 66 60 63.4 Q62.1 66 64.2 63.2" {...stroke} strokeWidth="1.5" />
      )}

      {/* A drop of sweat when worried */}
      {mood === "worried" && (
        <motion.path
          d="M89 36 Q92.5 41.5 89 43.5 Q85.5 41.5 89 36 Z"
          fill="#9fd0ee"
          stroke={CAT.line}
          strokeWidth="0.9"
          animate={live ? { y: [0, 1.5, 0] } : undefined}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}
    </g>
  );
}
