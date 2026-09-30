import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
  type Variants,
} from "motion/react";
import {
  AndroidLogoIcon,
  AppleLogoIcon,
  ArrowRightIcon,
  ArrowsClockwiseIcon,
  CloudSlashIcon,
  CompassIcon,
  DesktopIcon,
  DeviceMobileIcon,
  DownloadSimpleIcon,
  ExportIcon,
  HouseIcon,
  PlusSquareIcon,
  ShieldCheckIcon,
  type Icon,
} from "@phosphor-icons/react";
import { Brand } from "../components/Brand";
import { ThemeButton } from "../components/ThemeToggle";
import { CategoryIcon } from "../components/CategoryIcon";
import { AnimatedMoney, EASE_OUT, Reveal, RevealWords, Stagger, staggerChild } from "../components/motion";
import type { PresetIconName } from "../icons";
import { monthName, monthOf, shiftMonth, today } from "../lib/dates";
import { detectPlatform, useInstallPrompt, type Platform } from "../lib/install";
import { formatMoney } from "../lib/money";
import { APK_URL, APP_URL, REPO_URL } from "./links";
import { HeroStage } from "./HeroStage";
import { SAMPLE_CURRENCY, SAMPLE_MONTH, sampleCategory } from "./sample";

export function Landing() {
  const platform = useMemo(detectPlatform, []);
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Features />
        <Install platform={platform} />
        <Privacy />
      </main>
      <Footer />
    </>
  );
}

function Nav() {
  // The bar is borderless over the hero and gains an edge once the page scrolls.
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: EASE_OUT }}
      className={`sticky top-0 z-20 border-b backdrop-blur-md transition-colors duration-300 ${
        scrolled ? "border-line/80 bg-bg/80" : "border-transparent bg-bg/0"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <a href="#top" aria-label="Kinchaku home">
          <Brand />
        </a>
        <nav className="flex items-center gap-2 sm:gap-6" aria-label="Main">
          <a href="#install" className="hidden text-sm text-muted transition hover:text-ink sm:block">
            Install
          </a>
          <a href={REPO_URL} className="hidden text-sm text-muted transition hover:text-ink sm:block">
            GitHub
          </a>
          <ThemeButton className="-mx-1 sm:-mx-3" />
          <a href={APP_URL} className="btn btn-primary btn-sm">
            Open in browser
          </a>
        </nav>
      </div>
    </motion.header>
  );
}

function Hero() {
  return (
    <section
      id="top"
      className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-6 overflow-x-clip px-5 pt-10 pb-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-6 lg:pt-8 lg:pb-20"
    >
      <div>
        <RevealWords
          as="h1"
          text="See where your money goes each month."
          delay={0.15}
          className="max-w-[14ch] font-display text-[2.9rem] leading-[1.02] font-semibold text-balance sm:text-6xl lg:max-w-none lg:text-[3.55rem] xl:text-[3.7rem]"
        />
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55, ease: EASE_OUT }}
          className="mt-6 max-w-[40ch] text-lg text-muted"
        >
          Add what comes in, log what goes out, and carry what's left into next month. Free, offline, no ads.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7, ease: EASE_OUT }}
          className="mt-9 flex flex-wrap gap-3"
        >
          <a href="#install" className="btn btn-primary group">
            Get the app
            <ArrowRightIcon size={18} weight="bold" aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
          </a>
          <a href={APP_URL} className="btn btn-secondary">
            Open in browser
          </a>
        </motion.div>
      </div>

      <HeroStage />
    </section>
  );
}

function Features() {
  return (
    <section aria-labelledby="features-heading" className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
      <RevealWords
        id="features-heading"
        onView
        text="Made for month-to-month budgeting."
        className="max-w-[18ch] font-display text-4xl leading-[1.05] font-semibold sm:text-5xl"
      />

      <Stagger className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-3" stagger={0.1}>
        <motion.article
          variants={staggerChild}
          className="flex flex-col gap-8 rounded-3xl bg-surface p-7 shadow-[inset_0_0_0_1px_var(--line)] lg:col-span-2 lg:flex-row lg:items-center lg:p-9"
        >
          <div className="lg:max-w-[30ch]">
            <h3 className="font-display text-2xl font-semibold">Carry what's left into next month</h3>
            <p className="mt-3 text-muted">
              Add what comes in, log what goes out, and see what's left. At the end of the month, carry it over with one
              tap.
            </p>
          </div>
          <CarryOverPreview />
        </motion.article>

        <motion.article variants={staggerChild} className="relative overflow-hidden rounded-3xl bg-brand p-7 text-brand-ink lg:p-9">
          <motion.span
            className="inline-block"
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.3 }}
          >
            <CloudSlashIcon size={44} weight="duotone" aria-hidden="true" />
          </motion.span>
          <h3 className="mt-10 font-display text-2xl font-semibold">Works offline</h3>
          <p className="mt-3 text-brand-muted">
            On a plane or out of data, it still opens and saves. Changes sync when you're back online.
          </p>
        </motion.article>

        <motion.article variants={staggerChild} className="rounded-3xl bg-surface p-7 shadow-[inset_0_0_0_1px_var(--line)] lg:p-9">
          <IconCloud />
          <h3 className="mt-8 font-display text-2xl font-semibold">Categories that fit your life</h3>
          <p className="mt-3 text-muted">
            Start with Gas, Shopping, Food &amp; Drink, Self Care and Loan. Add your own with an icon or your own image.
          </p>
        </motion.article>

        <motion.article
          variants={staggerChild}
          className="flex flex-col justify-between gap-10 rounded-3xl bg-surface-2 p-7 lg:col-span-2 lg:flex-row lg:items-center lg:p-9"
        >
          <div className="lg:max-w-[34ch]">
            <h3 className="font-display text-2xl font-semibold">Phone and desktop, in sync</h3>
            <p className="mt-3 text-muted">
              Sign in on each device and your budget follows you. Use it on your phone in the shop and on a big screen at home.
            </p>
          </div>
          <div aria-hidden="true" className="flex items-center gap-4 self-center text-muted lg:gap-6">
            <DeviceTile icon={DeviceMobileIcon} label="Phone" from={-24} />
            <motion.span
              initial={{ rotate: 0 }}
              whileInView={{ rotate: 360 }}
              viewport={{ once: true, amount: 1 }}
              transition={{ duration: 1.1, delay: 0.5, ease: EASE_OUT }}
              className="text-accent-text"
            >
              <ArrowsClockwiseIcon size={28} weight="bold" />
            </motion.span>
            <DeviceTile icon={DesktopIcon} label="Desktop" from={24} />
          </div>
        </motion.article>
      </Stagger>
    </section>
  );
}

const rowList: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.16, delayChildren: 0.3 } },
};
const row: Variants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

/** Money in, minus what's spent, is what's left; and what's left moves into next month. */
function CarryOverPreview() {
  const month = monthOf(today());
  const next = monthName(shiftMonth(month, 1));
  const { income, expense } = SAMPLE_MONTH;
  const lines = [
    { id: "allowance", label: "Allowance", amount: 1_000_000 },
    { id: "paid-loans", label: "Paid loans", amount: 400_000 },
  ];
  return (
    <div
      role="img"
      aria-label={`Example: ${formatMoney(income, SAMPLE_CURRENCY)} in, ${formatMoney(expense, SAMPLE_CURRENCY)} spent, ${formatMoney(income - expense, SAMPLE_CURRENCY)} left, carried into ${next}`}
      className="w-full rounded-2xl bg-bg p-4 shadow-[inset_0_0_0_1px_var(--line)] lg:ml-auto lg:max-w-sm"
    >
      <p className="px-1 text-sm font-semibold">{monthName(month)}</p>
      <motion.ul className="mt-3 space-y-1 text-sm" variants={rowList} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.6 }}>
        {lines.map((l) => {
          const c = sampleCategory(l.id);
          return (
            <motion.li key={l.id} variants={row} className="flex items-center gap-3 px-1 py-1">
              <CategoryIcon icon={c.icon} color={c.color} size={30} />
              <span className="min-w-0 flex-1 wrap-break-word">{l.label}</span>
              <span className="shrink-0 font-semibold whitespace-nowrap text-positive tabular-nums">+{formatMoney(l.amount, SAMPLE_CURRENCY)}</span>
            </motion.li>
          );
        })}
        <motion.li variants={row} className="flex items-center gap-3 px-1 py-1">
          <CategoryIcon icon={{ kind: "preset", name: "utensils" }} color="#22c55e" size={30} />
          <span className="min-w-0 flex-1">Spent</span>
          <span className="shrink-0 font-semibold whitespace-nowrap tabular-nums">−{formatMoney(expense, SAMPLE_CURRENCY)}</span>
        </motion.li>
      </motion.ul>
      <div className="mt-3 flex items-center justify-between border-t border-line px-1 pt-3 text-sm">
        <span className="text-muted">Left</span>
        <AnimatedMoney value={income - expense} currency={SAMPLE_CURRENCY} onView className="text-base font-semibold tabular-nums" />
      </div>
      <motion.p
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 20, delay: 1.1 }}
        className="mt-3 flex items-center justify-center gap-2 rounded-full bg-[#6366f1]/12 px-3 py-2 text-sm font-medium text-[#6366f1]"
      >
        <ArrowsClockwiseIcon size={16} weight="bold" aria-hidden="true" />
        Carried into {next}
      </motion.p>
    </div>
  );
}

const CLOUD: [PresetIconName, string][] = [
  ["coffee", "#f59e0b"],
  ["house", "#6366f1"],
  ["paw", "#ec4899"],
  ["plane", "#06b6d4"],
  ["dumbbell", "#22c55e"],
  ["gamepad", "#a78bfa"],
  ["gift", "#ef4444"],
  ["book", "#14b8a6"],
];

function IconCloud() {
  return (
    <motion.div
      aria-hidden="true"
      className="grid w-fit grid-cols-4 gap-2.5"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.6 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.2 } } }}
    >
      {CLOUD.map(([name, color]) => (
        <motion.span
          key={name}
          variants={{
            hidden: { opacity: 0, scale: 0.4, rotate: -20 },
            show: { opacity: 1, scale: 1, rotate: 0, transition: { type: "spring", stiffness: 380, damping: 16 } },
          }}
        >
          <CategoryIcon icon={{ kind: "preset", name }} color={color} size={44} />
        </motion.span>
      ))}
    </motion.div>
  );
}

function DeviceTile({ icon: Glyph, label, from }: { icon: Icon; label: string; from: number }) {
  return (
    <motion.span
      className="flex flex-col items-center gap-2"
      initial={{ opacity: 0, x: from }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 1 }}
      transition={{ duration: 0.7, delay: 0.25, ease: EASE_OUT }}
    >
      <span className="grid size-20 place-items-center rounded-2xl bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] lg:size-24">
        <Glyph size={36} weight="duotone" />
      </span>
      <span className="text-xs">{label}</span>
    </motion.span>
  );
}

function Install({ platform }: { platform: Platform }) {
  const cards = [
    <AndroidCard key="android" current={platform === "android"} />,
    <IPhoneCard key="ios" current={platform === "ios"} />,
  ];
  if (platform === "ios") cards.reverse();

  return (
    <section id="install" aria-labelledby="install-heading" className="scroll-mt-16 border-y border-line bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
        <RevealWords
          id="install-heading"
          onView
          text="Install it on your phone"
          className="font-display text-4xl leading-[1.05] font-semibold sm:text-5xl"
        />
        <Reveal delay={0.2}>
          <p className="mt-4 max-w-[48ch] text-lg text-muted">No app store needed, and it's free on both.</p>
        </Reveal>

        <Stagger className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2" stagger={0.12}>
          {cards}
        </Stagger>

        <Reveal>
          <p className="mt-10 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
            <DesktopIcon size={20} weight="duotone" aria-hidden="true" className="text-ink" />
            On a computer?
            <a href={APP_URL} className="font-semibold text-accent-text underline-offset-4 hover:underline">
              Open in browser
            </a>
            and sign in to use the same budget as your phone.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function PlatformCard({ icon: Glyph, title, current, children }: { icon: Icon; title: string; current: boolean; children: ReactNode }) {
  return (
    <motion.article
      variants={staggerChild}
      className={`rounded-3xl bg-bg p-7 lg:p-9 ${
        current ? "shadow-[inset_0_0_0_2px_var(--accent)]" : "shadow-[inset_0_0_0_1px_var(--line)]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-3">
          <Glyph size={30} weight="duotone" aria-hidden="true" />
          <h3 className="font-display text-2xl font-semibold">{title}</h3>
        </span>
        {current && <span className="text-sm font-medium text-accent-text">Your device</span>}
      </div>
      {children}
    </motion.article>
  );
}

function AndroidCard({ current }: { current: boolean }) {
  const install = useInstallPrompt();
  return (
    <PlatformCard icon={AndroidLogoIcon} title="Android" current={current}>
      <p className="mt-4 text-muted">Download the APK and open it. If Android asks, allow installs from your browser.</p>
      <a href={APK_URL} className="btn btn-primary group mt-6">
        <DownloadSimpleIcon size={18} weight="bold" aria-hidden="true" className="transition-transform group-hover:translate-y-0.5" />
        Download APK
      </a>
      <p className="mt-8 border-t border-line pt-6 text-sm text-muted">
        Prefer not to sideload? Open Kinchaku in Chrome and choose <span className="text-ink">Install app</span> from the
        menu.
      </p>
      {install && (
        <button type="button" onClick={install} className="btn btn-secondary btn-sm mt-4">
          Install from Chrome
        </button>
      )}
    </PlatformCard>
  );
}

const IPHONE_STEPS: { icon: Icon; text: ReactNode }[] = [
  { icon: CompassIcon, text: <>Open Kinchaku in <span className="text-ink">Safari</span></> },
  { icon: ExportIcon, text: <>Tap the <span className="text-ink">Share</span> button</> },
  { icon: PlusSquareIcon, text: <>Choose <span className="text-ink">Add to Home Screen</span></> },
  { icon: HouseIcon, text: <>Open it from your Home Screen, like any app</> },
];

function IPhoneCard({ current }: { current: boolean }) {
  return (
    <PlatformCard icon={AppleLogoIcon} title="iPhone" current={current}>
      <p className="mt-4 text-muted">Apple only allows App Store downloads, so Kinchaku installs straight from Safari.</p>
      <motion.ol
        className="mt-6 space-y-3"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.25 } } }}
      >
        {IPHONE_STEPS.map(({ icon: Glyph, text }, i) => (
          <motion.li
            key={i}
            className="flex items-center gap-4"
            variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE_OUT } } }}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink">
              <Glyph size={20} weight="duotone" aria-hidden="true" />
            </span>
            <span className="text-muted">{text}</span>
          </motion.li>
        ))}
      </motion.ol>
      <a href={APP_URL} className="btn btn-secondary mt-7">
        Open in browser
      </a>
    </PlatformCard>
  );
}

const PRIVACY_POINTS = [
  {
    title: "Without an account",
    text: "Everything you enter is saved in this browser on this device and never leaves it. No cookies, no analytics.",
  },
  {
    title: "With an account",
    text: "Your entries and a few settings (currency, the cat's name) are copied to Google Firebase, on servers in Singapore, so your other devices can sync. Only your signed-in account can read them.",
  },
  {
    title: "What sign-in keeps",
    text: "Your email address, plus your name and photo if you use Google, to sign you in. Nothing else about you.",
  },
  {
    title: "Koban the cat",
    text: "Answers on your device from your own entries. Your questions aren't sent anywhere.",
  },
  {
    title: "Deleting",
    text: "Signing out clears the device. Settings, then Account, then Delete account removes your account and everything synced, for good.",
  },
  {
    title: "Honestly",
    text: "Kinchaku's developer runs the Firebase project, so could technically reach stored data. It isn't looked at, shared or sold.",
  },
];

function Privacy() {
  return (
    <section id="privacy" aria-labelledby="privacy-heading" className="mx-auto max-w-6xl scroll-mt-16 px-5 py-24 lg:py-36">
      <div className="grid gap-8 lg:grid-cols-[auto_1fr] lg:gap-14">
        <Reveal>
          <ShieldCheckIcon size={64} weight="duotone" aria-hidden="true" className="text-accent-text" />
        </Reveal>
        <div>
          <ScrollLitHeading
            id="privacy-heading"
            text="Your spending is nobody else's business."
            className="max-w-[20ch] font-display text-4xl leading-[1.08] font-semibold text-balance sm:text-5xl lg:text-6xl"
          />
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-[54ch] text-lg text-muted">
              No ads, no trackers and nothing sold. Your records stay on your device, and in your own account only if you
              turn on sync.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <dl className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2">
              {PRIVACY_POINTS.map(({ title, text }) => (
                <div key={title} className="border-t border-line pt-4">
                  <dt className="font-semibold">{title}</dt>
                  <dd className="mt-1 text-muted">{text}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/** A statement whose words light up one by one as you scroll through it. */
function ScrollLitHeading({ text, className, id }: { text: string; className?: string; id?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "end 0.5"] });
  const words = text.split(" ");
  if (reduce) {
    return (
      <h2 ref={ref} id={id} className={className}>
        {text}
      </h2>
    );
  }
  return (
    <h2 ref={ref} id={id} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, i) => (
          <LitWord key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
            {word}
            {i < words.length - 1 && " "}
          </LitWord>
        ))}
      </span>
    </h2>
  );
}

function LitWord({ progress, range, children }: { progress: MotionValue<number>; range: [number, number]; children: ReactNode }) {
  const opacity = useTransform(progress, range, [0.15, 1]);
  return <motion.span style={{ opacity }}>{children}</motion.span>;
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <Reveal y={12} className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <Brand />
          <p className="mt-3 text-sm text-muted">Free and open source. Named after the Japanese drawstring purse.</p>
        </div>
        <nav className="flex gap-6 text-sm" aria-label="Footer">
          <a href="#install" className="text-muted transition hover:text-ink">
            Install
          </a>
          <a href={APP_URL} className="text-muted transition hover:text-ink">
            Open in browser
          </a>
          <a href="#privacy" className="text-muted transition hover:text-ink">
            Privacy
          </a>
          <a href={REPO_URL} className="text-muted transition hover:text-ink">
            GitHub
          </a>
        </nav>
      </Reveal>
    </footer>
  );
}
