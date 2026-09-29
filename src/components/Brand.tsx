/** Logo mark and wordmark. */
export function Brand({ size = 28 }: { size?: number }) {
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
      <span className="text-[1.05rem] font-semibold tracking-tight">Kinchaku</span>
      <span className="text-sm text-muted" lang="ja">
        巾着
      </span>
    </span>
  );
}
