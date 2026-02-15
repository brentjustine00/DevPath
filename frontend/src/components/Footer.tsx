export default function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-white/70 py-8 dark:border-slate-700/60 dark:bg-slate-900/70">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-semibold">DevPath</p>
          <p className="text-xs text-ink/60">AI-powered student portfolios with gamified growth.</p>
        </div>
        <div className="text-xs text-ink/50 dark:text-white/60">
          Built with React, Tailwind, Framer Motion, FastAPI, and Supabase.
        </div>
      </div>
    </footer>
  )
}
