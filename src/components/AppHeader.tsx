import Link from "next/link";

export function AppHeader({
  title = "个人财务分析",
  actionHref,
  actionLabel,
}: {
  title?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <header className="mb-7">
      <div className="flex items-center justify-between gap-3">
        <p className="hud-label flex min-w-0 items-center gap-2 truncate">
          <span className="live-dot shrink-0" />
          <span className="truncate">NEON LEDGER <span className="hidden sm:inline">// ONLINE</span></span>
        </p>
        {actionHref && actionLabel ? (
          <Link href={actionHref} className="cyber-btn inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap px-3 text-[11px] sm:px-4 sm:text-[12px]">
            {actionLabel}
          </Link>
        ) : null}
      </div>
      <h1 className="font-display flicker mt-3 text-[22px] font-semibold leading-none tracking-wide">
        {title}
      </h1>
    </header>
  );
}
