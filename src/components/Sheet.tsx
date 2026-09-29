import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { motion, useAnimationControls, useDragControls, useReducedMotion } from "motion/react";
import { XIcon } from "@phosphor-icons/react";
import { useKeyboardFit } from "../lib/keyboard";
import { useMediaQuery } from "../lib/media";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Fixed height, and the content scrolls itself (e.g. a chat with its input pinned at the bottom). */
  fill?: boolean;
  /** Replaces the plain title in the header (it still names the dialog). */
  header?: ReactNode;
};

/**
 * Modal sheet built on <dialog> (focus trapping and Esc for free). Slides up
 * from the bottom on phones, where it can be dragged down to dismiss, and
 * scales in centred on desktop. It animates out before actually closing.
 * Mark the field that should get focus with data-autofocus.
 */
export function Sheet({ open, title, onClose, children, fill = false, header }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const controls = useAnimationControls();
  const drag = useDragControls();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const reduce = useReducedMotion();
  // Phones: sit on top of the on-screen keyboard instead of behind it.
  const keyboard = useKeyboardFit(open && !desktop);
  const closing = useRef(false);
  // Content stays mounted while the sheet animates out; each opening gets a fresh copy.
  const [session, setSession] = useState(0);
  const [mounted, setMounted] = useState(open);

  const hidden = desktop ? { opacity: 0, scale: 0.96, y: 12 } : { opacity: 1, scale: 1, y: "100%" };

  async function requestClose() {
    const dialog = ref.current;
    if (!dialog?.open || closing.current) return;
    closing.current = true;
    dialog.setAttribute("data-closing", "");
    await controls.start({ ...hidden, transition: reduce ? { duration: 0 } : { duration: 0.22, ease: [0.4, 0, 1, 1] } });
    dialog.removeAttribute("data-closing");
    dialog.close(); // fires the close event, which calls onClose
  }

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      closing.current = false;
      setSession((s) => s + 1);
      setMounted(true);
      dialog.showModal();
      controls.set(hidden);
      void controls.start({
        opacity: 1,
        scale: 1,
        y: 0,
        transition: reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 36 },
      });
    }
    if (!open && dialog.open) void requestClose();
    // `hidden` and requestClose only change with `desktop`, which doesn't need to re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Focus after the content has mounted: showModal alone would focus the Close button.
  useEffect(() => {
    if (open) ref.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, [open, session]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      // Keyboard open: the dialog covers exactly the visible area and the panel sits at its bottom.
      style={
        keyboard
          ? {
              top: keyboard.top,
              bottom: "auto",
              height: keyboard.height,
              maxHeight: keyboard.height,
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
            }
          : undefined
      }
      // React passes these events up to parent components, so a sheet opened on
      // top of this one (e.g. New category over New expense) would close both.
      // Only react to events from this dialog itself.
      onCancel={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        void requestClose();
      }}
      onClose={(e) => {
        if (e.target !== e.currentTarget) return;
        setMounted(false);
        onClose();
      }}
      // The panel fills the dialog, so a click that lands on the dialog itself is on the backdrop.
      onClick={(e) => e.target === e.currentTarget && void requestClose()}
    >
      <motion.div
        animate={controls}
        drag={desktop ? false : "y"}
        dragControls={drag}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.9 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 110 || info.velocity.y > 600) void requestClose();
        }}
        style={
          keyboard
            ? { maxHeight: keyboard.height - 8, height: fill ? keyboard.height - 8 : undefined, paddingBottom: "0.75rem" }
            : undefined
        }
        className={`sheet-panel max-h-[92dvh] rounded-t-3xl bg-bg px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-[0_-12px_40px_-20px_rgb(8_10_16/0.5)] lg:px-7 lg:pt-6 ${
          fill ? "flex h-[88dvh] flex-col overflow-hidden lg:h-[min(80dvh,720px)]" : "overflow-y-auto"
        }`}
      >
        {/* Drag area on phones: the grab handle and the title bar. */}
        <div onPointerDown={(e) => !desktop && drag.start(e)} className="shrink-0 touch-none pt-3 lg:pt-0">
          <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-line lg:hidden" aria-hidden="true" />
          <header className={`${header ? "mb-3" : "mb-5"} flex items-center justify-between gap-3`}>
            {header ? (
              <div id={titleId} className="min-w-0 flex-1">
                {header}
              </div>
            ) : (
              <h2 id={titleId} className="font-display text-[1.6rem] leading-tight font-semibold">
                {title}
              </h2>
            )}
            <button
              type="button"
              onClick={() => void requestClose()}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Close"
              className="grid size-9 place-items-center rounded-full bg-surface-2 text-muted transition hover:text-ink active:scale-95"
            >
              <XIcon size={16} weight="bold" />
            </button>
          </header>
        </div>
        {mounted &&
          (fill ? (
            <div key={session} className="flex min-h-0 flex-1 flex-col">
              {children}
            </div>
          ) : (
            <Fragment key={session}>{children}</Fragment>
          ))}
      </motion.div>
    </dialog>
  );
}
