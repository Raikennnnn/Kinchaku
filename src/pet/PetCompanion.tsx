import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowUpIcon,
  CalendarDotsIcon,
  ChartDonutIcon,
  ChatCircleIcon,
  CheckCircleIcon,
  HandPalmIcon,
  HeartbeatIcon,
  LockSimpleIcon,
  PiggyBankIcon,
  ShoppingBagIcon,
  WarningCircleIcon,
  XIcon,
  type Icon,
} from "@phosphor-icons/react";
import { getSetting, setSetting } from "../db";
import { Sheet } from "../components/Sheet";
import { ScrollRow } from "../components/ui";
import { useKeyboardFit } from "../lib/keyboard";
import { useCurrency, useLedgerId } from "../state";
import { answer, greeting, insights, moodFor, QUICK_QUESTIONS, type Reply, type Verdict } from "./brain";
import { loadPetContext, type PetContext } from "./context";
import { detectLang, say, type Lang } from "./lang";
import { CAT, PetCat, type Mood, type PetCatHandle } from "./PetCat";

export type PetLangSetting = "auto" | "en" | "tl";
export const DEFAULT_PET_NAME = "Koban";

type Message = { id: number; from: "pet" | "me"; text: string; verdict?: Verdict };

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
  const tucked = useTuckOnScroll();
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
  const [face, setFace] = useState<Face>({ typing: false, mood: null, lang: null });
  // Each opening gets a fresh header, so the cat drops in again.
  const [session, setSession] = useState(0);
  const cat = useRef<PetCatHandle>(null);
  const onFace = useCallback((f: Face) => setFace(f), []);
  const openChat = () => {
    setSession((n) => n + 1);
    setOpen(true);
  };

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
      {/* Steps aside (down behind the tab bar) while you scroll down through a
          list, so it never sits on top of what you're reading. */}
      <motion.div
        initial={false}
        animate={tucked && !open ? { y: 110, opacity: 0 } : { y: 0, opacity: 1 }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 34 }}
        className={`pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+4.6rem)] left-2 z-10 lg:right-8 lg:bottom-6 lg:left-auto ${
          tucked && !open ? "[&_*]:!pointer-events-none" : ""
        }`}
      >
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
                <button type="button" onClick={openChat} className="text-left">
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
              setTimeout(openChat, 220);
            }}
            aria-label={say(lang, `Talk to ${settings.name}, your budget cat`, `Kausapin si ${settings.name}, ang budget cat mo`)}
            className="pointer-events-auto rounded-full p-1 active:scale-95"
          >
            <PetCat ref={cat} mood={mood} size={68} hearts={hearts} label={`${settings.name} (${mood})`} />
          </motion.button>
        </div>
      </motion.div>

      <Sheet
        open={open}
        title={settings.name}
        onClose={() => {
          setOpen(false);
          setFace({ typing: false, mood: null, lang: null });
        }}
        fill
        header={<ChatHeader key={session} name={settings.name} mood={face.mood ?? mood} typing={face.typing} lang={face.lang ?? lang} />}
      >
        <PetChat ctx={ctx} lang={lang} langSetting={settings.lang} name={settings.name} onFace={onFace} />
      </Sheet>
    </>
  );
}

type Face = { typing: boolean; mood: Mood | null; lang: Lang | null };

function PetChat({
  ctx,
  lang: startLang,
  langSetting,
  name,
  onFace,
}: {
  ctx: PetContext;
  lang: Lang;
  langSetting: PetLangSetting;
  name: string;
  onFace: (face: Face) => void;
}) {
  const currency = useCurrency();
  const reduce = useReducedMotion();
  const keyboard = useKeyboardFit(true);
  const [lang, setLang] = useState<Lang>(startLang);
  const [messages, setMessages] = useState<Message[]>([]);
  // Id the next pet message will take while its typing paws show.
  const [typing, setTyping] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [expectAmount, setExpectAmount] = useState(false);
  const [replyMood, setReplyMood] = useState<Mood | null>(null);
  const nextId = useRef(0);
  const log = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const queue = useRef(Promise.resolve());
  const greeted = useRef(false);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  // The header (drawn by the sheet) shows the cat's face and whether it's typing.
  useEffect(() => {
    onFace({ typing: typing !== null, mood: replyMood, lang });
  }, [typing, replyMood, lang, onFace]);

  // The cat "types" each line with a short pause, one after another. Ids are
  // taken outside the state updaters, which React may run twice.
  function speak(reply: Reply, wait = 0) {
    queue.current = queue.current.then(async () => {
      if (wait) await new Promise((r) => setTimeout(r, wait));
      for (const [i, text] of reply.messages.entries()) {
        const id = nextId.current++;
        setTyping(id);
        await new Promise((r) => setTimeout(r, Math.min(900, 300 + text.length * 5)));
        setTyping(null);
        setMessages((m) => [...m, { id, from: "pet", text, verdict: i === 0 ? reply.verdict : undefined }]);
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

  // Keep the newest message in view. Only the message list scrolls; the
  // header and the message box stay put.
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

  // The message box grows with what's typed, up to a few lines.
  const fitBox = () => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  };

  function send(text: string) {
    const clean = text.trim().slice(0, 300);
    if (!clean) return;
    const id = nextId.current++;
    setMessages((m) => [...m, { id, from: "me", text: clean }]);
    setDraft("");
    requestAnimationFrame(fitBox);
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

  // A cat face sits beside the last message of each run of the cat's messages.
  const lastInRun = (i: number) => messages[i + 1]?.from !== "pet" && !(i === messages.length - 1 && typing !== null);

  return (
    <>
      <div className="relative -mx-5 min-h-0 flex-1 lg:-mx-7">
        <KobanPattern />
        {/* layoutScroll lets bubbles grow from the right place while the list scrolls. */}
        <motion.div
          ref={log}
          layoutScroll
          className="relative h-full space-y-1.5 overflow-y-auto overscroll-contain px-4 py-4 [mask-image:linear-gradient(to_bottom,transparent,#000_16px,#000_calc(100%-16px),transparent)] lg:px-6"
          role="log"
          aria-live="polite"
          aria-label={say(lang, "Chat", "Usapan")}
        >
          <p className="mx-auto mb-3 flex w-fit items-center gap-1.5 rounded-full bg-surface/80 px-3 py-1 text-xs text-muted shadow-[inset_0_0_0_1px_var(--line)] backdrop-blur-sm">
            <LockSimpleIcon size={12} weight="bold" aria-hidden="true" />
            {say(lang, `${name} only reads your entries on this device`, `Sa device mo lang binabasa ni ${name} ang mga entry mo`)}
          </p>
          {messages.map((m, i) =>
            m.from === "pet" ? (
              <div key={m.id} className={`flex items-end gap-2 ${lastInRun(i) ? "pb-2" : ""}`}>
                {lastInRun(i) ? <CatFace /> : <span className="w-7 shrink-0" aria-hidden="true" />}
                {/* Grows out of the typing bubble that shared its id. */}
                <motion.p
                  layoutId={`pet-${m.id}`}
                  transition={{ layout: POP }}
                  style={m.verdict ? { ...PET_RADIUS, ...verdictLook(m.verdict) } : PET_RADIUS}
                  className={`max-w-[80%] px-3.5 py-2.5 text-[15px] leading-snug ${
                    m.verdict ? "font-semibold" : "bg-surface shadow-[inset_0_0_0_1px_var(--line),0_1px_2px_rgb(10_14_30/0.06)]"
                  }`}
                >
                  <motion.span
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: 0.08 }}
                    className="flex items-center gap-2"
                  >
                    {m.verdict && <VerdictIcon verdict={m.verdict} />}
                    <span>{m.text}</span>
                  </motion.span>
                </motion.p>
              </div>
            ) : (
              <div key={m.id} className="flex justify-end pb-2 pl-10">
                <motion.p
                  initial={{ opacity: 0, scale: 0.6, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={POP}
                  style={MY_RADIUS}
                  className="origin-bottom-right bg-accent px-3.5 py-2.5 text-[15px] leading-snug text-white shadow-[0_6px_16px_-8px_rgb(199_59_37/0.7)]"
                >
                  {m.text}
                </motion.p>
              </div>
            ),
          )}
          {typing !== null && (
            <div className="flex items-end gap-2" role="status" aria-label={say(lang, `${name} is typing`, `Nagta-type si ${name}`)}>
              <CatFace />
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
      </div>

      <div className="shrink-0 pt-3">
        {/* Quick questions step aside while typing, to leave room for the messages. */}
        <AnimatePresence initial={false}>
          {!keyboard && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.2 }}
              className="overflow-hidden"
            >
              <div className="pb-3">
                <ScrollRow label={say(lang, "Quick questions", "Mabilisang tanong")}>
                  {QUICK_QUESTIONS[lang].map((q, i) => {
                    const Glyph = QUICK_ICONS[i] ?? ChatCircleIcon;
                    return (
                      <motion.button
                        key={q}
                        type="button"
                        onClick={() => send(q)}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 420, damping: 26, delay: reduce ? 0 : 0.35 + i * 0.06 }}
                        className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface py-2 pr-3.5 pl-3 text-sm whitespace-nowrap shadow-[inset_0_0_0_1px_var(--line)] transition-colors hover:bg-surface-2 active:scale-95"
                      >
                        <Glyph size={16} weight="duotone" className="text-accent-text" aria-hidden="true" />
                        {q}
                      </motion.button>
                    );
                  })}
                </ScrollRow>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            send(draft);
          }}
          className="flex items-end gap-2 rounded-[26px] bg-surface p-1.5 pl-4 shadow-[inset_0_0_0_1px_var(--line)] transition-shadow focus-within:shadow-[inset_0_0_0_1.5px_var(--accent)]"
        >
          {/* A text area rather than a text field: iPhones then skip their password and card bar. */}
          <textarea
            ref={box}
            rows={1}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              fitBox();
            }}
            onKeyDown={(e) => {
              // Enter sends; Shift+Enter starts a new line.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(draft);
              }
            }}
            maxLength={300}
            placeholder={expectAmount ? say(lang, "How much? e.g. 2500", "Magkano? hal. 2500") : name.length > 10 ? say(lang, "Ask about your money", "Magtanong tungkol sa pera") : say(lang, `Message ${name}`, `Mensahe kay ${name}`)}
            autoComplete="off"
            enterKeyHint="send"
            className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2 text-base leading-6 placeholder:text-muted focus-visible:outline-none"
            aria-label={say(lang, "Message", "Mensahe")}
          />
          <motion.button
            type="submit"
            disabled={!draft.trim()}
            animate={{ scale: draft.trim() ? 1 : 0.88 }}
            transition={POP}
            aria-label={say(lang, "Send", "Ipadala")}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-white transition-colors disabled:bg-surface-2 disabled:text-muted"
          >
            <ArrowUpIcon size={18} weight="bold" />
          </motion.button>
        </form>
      </div>
    </>
  );
}

const QUICK_ICONS: Icon[] = [ShoppingBagIcon, CalendarDotsIcon, ChartDonutIcon, HeartbeatIcon, PiggyBankIcon];

const VERDICT_COLOR: Record<Verdict, string> = { ok: "var(--positive)", tight: "var(--caution)", wait: "var(--accent-text)" };

/** A verdict bubble takes its colour: green for yes, amber for tight, red for wait. */
const verdictLook = (v: Verdict): CSSProperties => ({
  color: VERDICT_COLOR[v],
  background: `color-mix(in oklab, ${VERDICT_COLOR[v]} 13%, var(--surface))`,
  boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${VERDICT_COLOR[v]} 38%, transparent)`,
});

function VerdictIcon({ verdict }: { verdict: Verdict }) {
  const Glyph = verdict === "ok" ? CheckCircleIcon : verdict === "tight" ? WarningCircleIcon : HandPalmIcon;
  return <Glyph size={20} weight="fill" className="shrink-0" aria-hidden="true" />;
}

const MOOD_LINE: Record<Mood, [string, string]> = {
  happy: ["Happy with how you're doing", "Masaya sa lagay mo"],
  excited: ["Excited for you", "Excited para sa'yo"],
  okay: ["Here to help with your money", "Nandito para sa pera mo"],
  worried: ["Keeping an eye on your spending", "Binabantayan ang gastos mo"],
  sleepy: ["Sleepy, but still listening", "Inaantok, pero nakikinig pa"],
};

const MOOD_RING: Record<Mood, string> = {
  happy: "var(--positive)",
  excited: "var(--caution)",
  okay: "var(--muted)",
  worried: "var(--accent)",
  sleepy: "#6366f1",
};

/** Chat header: the cat as an avatar (it drops in on opening), its name, and what it's up to. */
function ChatHeader({ name, mood, typing, lang }: { name: string; mood: Mood; typing: boolean; lang: Lang }) {
  const reduce = !!useReducedMotion();
  const ring = MOOD_RING[mood];
  const status = typing ? say(lang, "typing…", "nagta-type…") : say(lang, ...MOOD_LINE[mood]);
  return (
    <div className="flex items-center gap-3">
      <div
        className="grid size-13 shrink-0 place-items-center rounded-full transition-[background,box-shadow] duration-500"
        style={{
          background: `color-mix(in oklab, ${ring} 14%, var(--surface))`,
          boxShadow: `inset 0 0 0 2px color-mix(in oklab, ${ring} 50%, transparent)`,
        }}
      >
        <CatLanding reduce={reduce}>
          {/* Tilts its head while it "types". */}
          <motion.div
            animate={typing && !reduce ? { rotate: [0, -7, 0, 5, 0] } : { rotate: 0 }}
            transition={typing ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
            style={{ transformOrigin: "50% 80%" }}
          >
            <PetCat mood={mood} size={40} label={`${name} (${mood})`} />
          </motion.div>
        </CatLanding>
      </div>
      <div className="min-w-0">
        <h2 className="font-display text-xl leading-tight font-semibold">{name}</h2>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={status}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className={`text-sm leading-snug ${typing ? "text-accent-text" : "text-muted"}`}
          >
            {status}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Small still face beside the cat's messages (the full animated cat would be too busy in a long chat). */
function CatFace() {
  return (
    <svg viewBox="0 0 32 32" className="mb-0.5 size-7 shrink-0" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="var(--surface-2)" />
      {/* Calico ears: sumi black and persimmon, like the full drawing */}
      <path d="M7.2 15 L7.8 6 Q8.1 4.6 9.5 5.3 L15 9.8 Z" fill={CAT.sumi} stroke={CAT.line} strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M24.8 15 L24.2 6 Q23.9 4.6 22.5 5.3 L17 9.8 Z" fill={CAT.orange} stroke={CAT.line} strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M9.4 11.6 L9.7 7.6 L12.8 10.2 Z" fill={CAT.pinkDeep} opacity="0.85" />
      <path d="M22.6 11.6 L22.3 7.6 L19.2 10.2 Z" fill={CAT.pink} />
      <ellipse cx="16" cy="17.8" rx="10" ry="8.2" fill={CAT.fur} stroke={CAT.line} strokeWidth="1.2" />
      <path d="M7.3 15 C8.5 11.3 11.8 9.8 15 10.1 C14.4 12.6 11.6 14 7.3 15 Z" fill={CAT.sumi} />
      <path d="M10.6 17.4 q1.7 -1.8 3.4 0 M18 17.4 q1.7 -1.8 3.4 0" fill="none" stroke={CAT.line} strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="10" cy="20.2" rx="1.7" ry="1" fill={CAT.pink} opacity="0.7" />
      <ellipse cx="22" cy="20.2" rx="1.7" ry="1" fill={CAT.pink} opacity="0.7" />
      <path d="M15.2 19.3 Q16 18.9 16.8 19.3 Q16.4 20.2 16 20.3 Q15.6 20.2 15.2 19.3 Z" fill={CAT.pinkDeep} />
      <path d="M14.4 20.9 Q15.2 21.9 16 20.9 Q16.8 21.9 17.6 20.9" fill="none" stroke={CAT.line} strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

/** Faint koban (old oval gold coins) behind the conversation. */
function KobanPattern() {
  return (
    <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
      <defs>
        <pattern id="koban-pattern" width="56" height="56" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
          <g fill="none" stroke="var(--line)" strokeWidth="1.3" strokeLinecap="round">
            <ellipse cx="14" cy="14" rx="6" ry="9" />
            <path d="M10.5 10 h7 M10 14 h8 M10.5 18 h7" opacity="0.8" />
            <ellipse cx="42" cy="42" rx="6" ry="9" />
            <path d="M38.5 38 h7 M38 42 h8 M38.5 46 h7" opacity="0.8" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#koban-pattern)" />
    </svg>
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

/**
 * True while the page is being scrolled down (past the first screenful's top),
 * false again as soon as it scrolls up or reaches the top.
 */
function useTuckOnScroll(): boolean {
  const [tucked, setTucked] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 40) setTucked(false);
      else if (y > last + 6) setTucked(true);
      else if (y < last - 6) setTucked(false);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return tucked;
}
