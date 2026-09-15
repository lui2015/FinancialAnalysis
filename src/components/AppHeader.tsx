export function AppHeader({ title = "个人财务分析" }: { title?: string }) {
  return (
    <header className="mb-7">
      <div className="flex items-center justify-between gap-3">
        <p className="hud-label flex min-w-0 items-center gap-2 truncate">
          <span className="live-dot shrink-0" />
          <span className="truncate">NEON LEDGER <span className="hidden sm:inline">// ONLINE</span></span>
        </p>
      </div>
      <h1 className="font-display flicker mt-3 text-[22px] font-semibold leading-none tracking-wide">
        {title}
      </h1>
    </header>
  );
}
