import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { getStoredAuth } from "../lib/api"

const features = [
  {
    title: "GitHub-first onboarding",
    copy: "Login with GitHub, auto-import your public repos, and start building a living portfolio in minutes.",
  },
  {
    title: "Explainable AI skill paths",
    copy: "Practice dimensions and career insights backed by evidence from your real commits and repo structure.",
  },
  {
    title: "Deterministic gamification",
    copy: "Predictable XP, streaks, and badge rules that reward steady progress without dark patterns.",
  },
]

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const update = () => {
      const stored = getStoredAuth()
      setIsLoggedIn(Boolean(stored.username))
    }
    update()
    window.addEventListener("storage", update)
    return () => {
      window.removeEventListener("storage", update)
    }
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6"
        >
          <p className="text-xs uppercase tracking-[0.4em] text-ink/60 dark:text-white/60">
            AI-powered student portfolios
          </p>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl dark:text-white">
            Turn every repo into a proof of practice.
          </h1>
          <p className="text-lg text-ink/70 dark:text-white/70">
            DevPath converts your GitHub activity into dynamic learning paths, transparent career
            suggestions, and a portfolio that grows with you.
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper shadow-glow transition hover:-translate-y-0.5 dark:bg-slate-100 dark:text-slate-900">
              Start with GitHub
            </button>
            <button className="rounded-full border border-ink/20 px-6 py-3 text-sm font-semibold text-ink/80 dark:border-white/20 dark:text-white/80">
              View sample portfolio
            </button>
          </div>
          {!isLoggedIn ? (
            <div className="flex flex-wrap gap-4 text-sm text-ink/60">
            <span className="rounded-full border border-ink/10 px-4 py-2 dark:border-white/20">
              Explainable AI
            </span>
            <span className="rounded-full border border-ink/10 px-4 py-2 dark:border-white/20">
              Live preview
            </span>
            <span className="rounded-full border border-ink/10 px-4 py-2 dark:border-white/20">
              Gamified XP
            </span>
          </div>
          ) : null}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-neon/30 blur-3xl" />
          <div className="absolute -bottom-10 right-0 h-40 w-40 rounded-full bg-glow/40 blur-3xl" />
          <div className="rounded-3xl border border-ink/10 bg-white/70 p-6 shadow-soft backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-ink/50 dark:text-white/60">Live Insight</p>
                <h3 className="mt-2 text-2xl font-semibold dark:text-white">Practice DNA</h3>
              </div>
              <span className="rounded-full bg-ink/10 px-3 py-1 text-xs text-ink/70 dark:bg-white/10 dark:text-white/70">
                4 dimensions
              </span>
            </div>
            <div className="mt-6 space-y-4">
              {[
                { label: "Frontend Craft", value: 86 },
                { label: "AI Integration", value: 73 },
                { label: "Backend Systems", value: 64 },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-ink/60">
                    <span>{item.label}</span>
                    <span>{item.value}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-ink/10 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-neon via-glow to-neon"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-ink/10 bg-paper/80 p-4 dark:border-slate-700/60 dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.3em] text-ink/50">Career suggestion</p>
              <p className="mt-2 text-lg font-semibold">AI Product Engineer</p>
              <p className="text-sm text-ink/60 dark:text-white/70">
                Reasoning surfaced from repo topics, commit cadence, and AI integrations.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="mt-20 grid gap-6 md:grid-cols-3">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="rounded-2xl border border-ink/10 bg-white/70 p-6 shadow-soft backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70"
          >
            <h3 className="text-xl font-semibold">{feature.title}</h3>
            <p className="mt-3 text-sm text-ink/70 dark:text-white/70">{feature.copy}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
