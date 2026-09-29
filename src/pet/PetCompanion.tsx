import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PaperPlaneRightIcon, XIcon } from "@phosphor-icons/react";
import { getSetting, setSetting } from "../db";
import { Sheet } from "../components/Sheet";
import { useKeyboardFit } from "../lib/keyboard";
import { useCurrency, useLedgerId } from "../state";
import { answer, greeting, insights, moodFor, QUICK_QUESTIONS, type Reply } from "./brain";
import { loadPetContext, type PetContext } from "./context";
import { detectLang, say, type Lang } from "./lang";
import { PetCat, type Mood, type PetCatHandle } from "./PetCat";

export type PetLangSetting = "auto" | "en" | "tl";
export const DEFAULT_PET_NAME = "Koban";

type Message = { id: number; from: "pet" | "me"; text: string };

const POP = { type: "spring", stiffness: 520, damping: 30 } as const;

// Radii live in style (not classes) so Motion can keep them round while a
// bubble grows from the typing dots into the full message.
const PET_RADIUS: CSSProperties = { borderRadius: "18px 18px 18px 6px" };
const MY_RADIUS: CSSProperties = { borderRadius: "18px 18px 6px 18px" };

/**
 * The budget cat: sits in a corner on every screen and opens a chat when
 * tapped. On Home it also shows its latest reminder in a speech bubble.
 * Everything runs on the device from the user's own entries.
 */
export function PetCompanion({ onHome }: { onHome: boolean }) {
  const ledgerId = useLedgerId();
  const currency = useCurrency();
  const reduce = useReducedMotion();
  const settings = useLiveQuery(async () => ({
    name: (await getSetting<string>("petName")) || DEFAULT_PET_NAME,
    hidden: (await getSetting<boolean>("petHidden")) ?? false,
    lang: (await getSetting<PetLangSetting>("petLang")) ?? "auto",
    lastLang: (await getSetting<Lang>("petLastLang")) ?? "en",
    dismissed: (await getSetting<string[]>("petDismissed")) ?? [],
  }));
  const ctx = useLiveQuery(() => loadPetContext(ledgerId), [ledgerId]);
  const [open, setOpen] = useState(false);
  const [hearts, setHearts] = useState(0);
  const [showBubble, setShowBubble] = useState(false);
  const cat = useRef<PetCatHandle>(null);

  // Let Home settle before the cat speaks; the bubble stays off other screens.
  useEffect(() => {
    if (!onHome) return setShowBubble(false);
    const t = setTimeout(() => setShowBubble(true), 1400);
    return () => clearTimeout(t);
  }, [onHome]);

  if (!settings || !ctx || settings.hidden) return null;

  const lang: Lang = settings.lang === "auto" ? settings.lastLang : settings.lang;
  const list = insights(ctx, lang, currency);
  const mood = moodFor(ctx, list);
  const key = (id: string) => `${id}@${ctx.month}`;
  const bubble = list.find((i) => !settings.dismissed.includes(key(i.id)));

  const dismiss = (id: string) => void setSetting("petDismissed", [...settings.dismissed, key(id)].slice(-150));

  // Peeks up from below on arrival, leaps out of the corner into the chat, and
  // hops back when the chat closes.
  const perch = reduce
    ? { opacity: open ? 0 : 1 }
    : open
      ? { opacity: 0, y: -80, x: 24, scale: 0.45, rotate: -18, transition: { duration: 0.32, ease: [0.55, 0, 0.8, 0.4] as const } }
      : { opacity: 1, y: 0, x: 0, scale: 1, rotate: 0, transition: { type: "spring" as const, stiffness: 300, damping: 13, delay: 0.3 } };

  return (
    <>
      <div className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+4.6rem)] left-2 z-10 lg:right-8 lg:bottom-6 lg:left-auto">
        <div className="relative flex flex-col items-start lg:items-end">
          <AnimatePresence>
            {showBubble && bubble && !open && (
              <motion.div
                key={bubble.id}
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
                className="pointer-events-auto relative mb-1 ml-2 max-w-[240px] origin-bottom-left rounded-2xl rounded-bl-md bg-surface p-3 pr-8 text-sm shadow-[0_12px_32px_-12px_rgb(10_14_30/0.45),inset_0_0_0_1px_var(--line)] lg:mr-2 lg:ml-0 lg:origin-bottom-right lg:rounded-br-md lg:rounded-bl-2xl"
              >
                <button type="button" onClick={() => setOpen(true)} className="text-left">
                  {bubble.text}
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(bubble.id)}
                  aria-label={say(lang, "Dismiss", "Isara")}
                  className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
                >
                  <XIcon size={12} weight="bold" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button
            type="button"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 56, scale: 0.7 }}
            animate={perch}
            onClick={() => {
              cat.current?.jump();
              setHearts((h) => h + 1);
              if (bubble && onHome) dismiss(bubble.id);
              setTimeout(() => setOpen(true), 220);
            }}
            aria-label={say(lang, `Talk to ${settings.name}, your budget cat`, `Kausapin si ${settings.name}, ang budget cat mo`)}
            className="pointer-events-auto rounded-full p-1 active:scale-95"
          >
            <PetCat ref={cat} mood={mood} size={68} hearts={hearts} label={`${settings.name} (${mood})`} />
          </motion.button>
        </div>
      </div>

      <Sheet open={open} title={settings.name} onClose={() => setOpen(false)} fill>
        <PetChat ctx={ctx} lang={lang} langSetting={settings.lang} name={settings.name} mood={mood} />
      </Sheet>
    </>
  );
}

function PetChat({ ctx, lang: startLang, langSetting, name, mood }: { ctx: PetContext; lang: Lang; langSetting: PetLangSetting; name: string; mood: Mood }) {
  const currency = useCurrency();
  const reduce = useReducedMotion();
  const keyboard = useKeyboardFit(true);
  const [lang, setLang] = useState<Lang>(startLang);
  const [messages, setMessages] = useState<Message[]>([]);
  // Id the next pet message will take while its typing dots show.
  const [typing, setTyping] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [expectAmount, setExpectAmount] = useState(false);
  const [replyMood, setReplyMood] = useState<Mood | null>(null);
  const nextId = useRef(0);
  const log = useRef<HTMLDivElement>(null);
  const queue = useRef(Promise.resolve());
  const greeted = useRef(false);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  // The cat "types" each line with a short pause, one after another. Ids are
  // taken outside the state updaters, which React may run twice.
  function speak(reply: Reply, wait = 0) {
    queue.current = queue.current.then(async () => {
      if (wait) await new Promise((r) => setTimeout(r, wait));
      for (const text of reply.messages) {
        const id = nextId.current++;
        setTyping(id);
        await new Promise((r) => setTimeout(r, Math.min(900, 300 + text.length * 5)));
        setTyping(null);
        setMessages((m) => [...m, { id, from: "pet", text }]);
      }
      if (reply.mood) setReplyMood(reply.mood);
      setExpectAmount(!!reply.expectAmount);
    });
  }

  // Greets once per opening, after the cat has landed. (Development mode runs
  // effects twice, hence the guard.)
  useEffect(() => {
    if (greeted.current) return;
    greeted.current = true;
    speak(greeting(ctx, insights(ctx, lang, currency), lang, name, currency), reduce ? 0 : 550);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the newest message in view. Only the message list scrolls; the cat
  // and the input stay put.
  useEffect(() => {
    const el = log.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [messages, typing, reduce]);

  // The list shrinks when the phone keyboard opens: stay on the newest message.
  useEffect(() => {
    const el = log.current;
    if (!el) return;
    let height = el.clientHeight;
    const observer = new ResizeObserver(() => {
      if (el.clientHeight < height) el.scrollTop = el.scrollHeight;
      height = el.clientHeight;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function send(text: string) {
    const clean = text.trim().slice(0, 300);
    if (!clean) return;
    const id = nextId.current++;
    setMessages((m) => [...m, { id, from: "me", text: clean }]);
    setDraft("");
    // Reply in the language the question was asked in (unless a language is fixed in Settings).
    let replyLang = lang;
    if (langSetting === "auto") {
      const detected = detectLang(clean);
      if (detected && detected !== lang) {
        replyLang = detected;
        setLang(detected);
        void setSetting("petLastLang", detected);
      }
    }
    const current = ctxRef.current;
    speak(answer(clean, current, insights(current, replyLang, currency), replyLang, name, currency, expectAmount));
  }

  const faceMood = replyMood ?? mood;

  return (
    <>
      {/* Folds away while the phone keyboard is open, to leave room for the messages. */}
      <motion.div
        initial={false}
        animate={keyboard ? { height: 0, opacity: 0 } : { height: "auto", opacity: 1 }}
        transition={{ duration: reduce ? 0 : 0.2 }}
        className="flex shrink-0 items-center gap-3"
        style={{ overflow: keyboard ? "hidden" : "visible" }}
      >
        <CatLanding reduce={!!reduce}>
          {/* Tilts its head while it "types". */}
          <motion.div
            animate={typing !== null && !reduce ? { rotate: [0, -7, 0, 5, 0] } : { rotate: 0 }}
            transition={typing !== null ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
            style={{ transformOrigin: "50% 80%" }}
          >
            <PetCat mood={faceMood} size={60} label={`${name} (${faceMood})`} />
          </motion.div>
        </CatLanding>
        <motion.p
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: reduce ? 0 : 0.45 }}
          className="text-sm text-muted"
        >
          {say(lang, "Your budget cat. Everything stays on this device.", "Ang budget cat mo. Nasa device mo lang ang lahat.")}
        </motion.p>
      </motion.div>

      {/* layoutScroll lets the bubbles grow from the right place while the list scrolls. */}
      <motion.div
        ref={log}
        layoutScroll
        className="-mx-5 mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-5 py-3 [mask-image:linear-gradient(to_bottom,transparent,#000_14px,#000_calc(100%-14px),transparent)] lg:-mx-7 lg:px-7"
        role="log"
        aria-live="polite"
        aria-label={say(lang, "Chat", "Usapan")}
      >
        {messages.map((m) =>
          m.from === "pet" ? (
            <div key={m.id} className="flex justify-start">
              {/* Grows out of the typing bubble that shared its id. */}
              <motion.p
                layoutId={`pet-${m.id}`}
                transition={{ layout: POP }}
                style={PET_RADIUS}
                className="max-w-[85%] bg-surface px-3.5 py-2.5 text-[15px] leading-snug shadow-[inset_0_0_0_1px_var(--line)]"
              >
                <motion.span layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: 0.08 }} className="block">
                  {m.text}
                </motion.span>
              </motion.p>
            </div>
          ) : (
            <div key={m.id} className="flex justify-end">
              <motion.p
                initial={{ opacity: 0, scale: 0.6, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={POP}
                style={MY_RADIUS}
                className="max-w-[85%] origin-bottom-right bg-ink px-3.5 py-2.5 text-[15px] leading-snug text-bg"
              >
                {m.text}
              </motion.p>
            </div>
          ),
        )}
        {typing !== null && (
          <div className="flex justify-start" role="status" aria-label={say(lang, `${name} is typing`, `Nagta-type si ${name}`)}>
            <motion.span
              layoutId={`pet-${typing}`}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={POP}
              style={PET_RADIUS}
              className="flex origin-bottom-left items-end gap-1.5 bg-surface px-3.5 py-2.5 shadow-[inset_0_0_0_1px_var(--line)]"
            >
              <PawSteps reduce={!!reduce} />
            </motion.span>
          </div>
        )}
      </motion.div>

      <div className="shrink-0 pt-2">
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-3 [scrollbar-width:none] lg:-mx-7 lg:px-7" role="group" aria-label={say(lang, "Quick questions", "Mabilisang tanong")}>
          {QUICK_QUESTIONS[lang].map((q, i) => (
            <motion.button
              key={q}
              type="button"
              onClick={() => send(q)}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 26, delay: reduce ? 0 : 0.35 + i * 0.06 }}
              className="shrink-0 rounded-full bg-surface px-3.5 py-2 text-sm whitespace-nowrap shadow-[inset_0_0_0_1px_var(--line)] transition-colors hover:bg-surface-2 active:scale-95"
            >
              {q}
            </motion.button>
          ))}
        </div>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            send(draft);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={300}
            placeholder={expectAmount ? say(lang, "How much? e.g. 2500", "Magkano? hal. 2500") : say(lang, `Ask ${name} anything about your money`, `Magtanong kay ${name} tungkol sa pera mo`)}
            autoComplete="off"
            enterKeyHint="send"
            className="field flex-1 rounded-full"
            aria-label={say(lang, "Message", "Mensahe")}
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label={say(lang, "Send", "Ipadala")}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-white transition active:scale-90 disabled:opacity-50"
          >
            <PaperPlaneRightIcon size={18} weight="fill" />
          </button>
        </form>
      </div>
    </>
  );
}

/**
 * The "typing" sign: little paw prints stepping across the bubble, left, right,
 * left, as if the cat were walking over to answer.
 */
function PawSteps({ reduce }: { reduce: boolean }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.svg
          key={i}
          layout
          viewBox="0 0 20 20"
          className="size-4 text-accent"
          style={{ rotate: i % 2 ? 14 : -14, y: i % 2 ? -4 : 0 }}
          initial={false}
          animate={reduce ? { opacity: 0.7 } : { opacity: [0.15, 1, 1, 0.15], scale: [0.6, 1.15, 1, 0.6] }}
          transition={reduce ? undefined : { duration: 1.5, times: [0, 0.18, 0.55, 1], repeat: Infinity, delay: i * 0.25, ease: "easeOut" }}
          aria-hidden="true"
        >
          <g fill="currentColor">
            <ellipse cx="10" cy="13.5" rx="4.6" ry="4" />
            <ellipse cx="4.2" cy="8.4" rx="1.9" ry="2.4" />
            <ellipse cx="8" cy="5" rx="1.9" ry="2.5" />
            <ellipse cx="12" cy="5" rx="1.9" ry="2.5" />
            <ellipse cx="15.8" cy="8.4" rx="1.9" ry="2.4" />
          </g>
        </motion.svg>
      ))}
    </>
  );
}

const SPARKS = [
  { x: -26, y: -8, c: "var(--accent)" },
  { x: -18, y: -24, c: "#d4a72c" },
  { x: 20, y: -22, c: "var(--accent)" },
  { x: 28, y: -4, c: "#d4a72c" },
];

/** The chat's cat drops in from above, squashes as it lands and kicks up a few sparks. */
function CatLanding({ reduce, children }: { reduce: boolean; children: ReactNode }) {
  if (reduce) return <div className="shrink-0">{children}</div>;
  return (
    <div className="relative shrink-0">
      <motion.div
        initial={{ y: -110, rotate: -24, opacity: 0 }}
        animate={{ y: 0, rotate: 0, opacity: 1 }}
        transition={{ y: { type: "spring", stiffness: 380, damping: 16, delay: 0.12 }, rotate: { duration: 0.45, delay: 0.12 }, opacity: { duration: 0.15, delay: 0.12 } }}
      >
        <motion.div
          style={{ transformOrigin: "50% 100%" }}
          animate={{ scaleY: [1, 1, 0.82, 1.06, 1], scaleX: [1, 1, 1.12, 0.97, 1] }}
          transition={{ duration: 0.55, times: [0, 0.45, 0.6, 0.8, 1], delay: 0.12 }}
        >
          {children}
        </motion.div>
      </motion.div>
      {SPARKS.map((s, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="absolute bottom-2 left-1/2 size-1.5 rounded-full"
          style={{ background: s.c }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
          animate={{ x: s.x, y: s.y, opacity: [0, 1, 0], scale: [0.4, 1.2, 0.6] }}
          transition={{ duration: 0.55, delay: 0.36, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
