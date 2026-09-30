/** Logo mark and wordmark. */
export function Brand({ size = 28, compact = false }: { size?: number; compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <img
        src={`${import.meta.env.BASE_URL}logo.svg`}
        alt=""
        width={size}
        height={size}
        className="rounded-lg"
        style={{ borderRadius: size * 0.28 }}
      />
      {/* In the phone header, the wordmark steps aside on the narrowest phones so a ledger name fits. */}
      <span className={`text-[1.05rem] font-semibold tracking-tight ${compact ? "hidden min-[360px]:inline" : ""}`}>Kinchaku</span>
      {/* The kanji steps aside on small phones so the header has room. */}
      <span className="hidden text-sm text-muted min-[400px]:inline" lang="ja">
        巾着
      </span>
    </span>
  );
}
