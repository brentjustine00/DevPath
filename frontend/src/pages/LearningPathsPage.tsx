import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import PathCard from "../components/PathCard"
import { practiceDimensions } from "../data/mock"
import { fetchUser, getStoredAuth, recomputeInsights } from "../lib/api"
import type { PracticeDimension } from "../types"

const recommendations = [
  {
    title: "Ship a feature every week",
    copy: "Consistent releases boost streaks and XP while improving narrative confidence.",
  },
  {
    title: "Document your AI experiments",
    copy: "Add README sections to explain model choices, prompts, and eval results.",
  },
  {
    title: "Collaborate in open source",
    copy: "Merged PRs increase both XP and the open-source badge probability.",
  },
]

export default function LearningPathsPage() {
  const [paths, setPaths] = useState<PracticeDimension[]>(practiceDimensions)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const stored = getStoredAuth()
    if (!stored.username) {
      return
    }
    fetchUser(stored.username)
      .then((data) => setPaths(data.practice_dimensions))
      .catch(() => setPaths(practiceDimensions))
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ink/50 dark:text-white/60">Learning Paths</p>
          <h2 className="text-3xl font-semibold dark:text-white">
            Practice dimensions with explainable AI
          </h2>
        </div>
        <button
          className="rounded-full border border-ink/20 px-5 py-2 text-sm font-semibold text-ink/70 disabled:opacity-60 dark:border-white/20 dark:text-white/80"
          disabled={loading}
          onClick={async () => {
            const stored = getStoredAuth()
            if (!stored.token) {
              return
            }
            setLoading(true)
            try {
              const data = await recomputeInsights(stored.token)
              setPaths(data.practice_dimensions)
            } finally {
              setLoading(false)
            }
          }}
        >
          <span className="flex items-center gap-2">
            {loading ? (
              <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-ink/40 border-t-ink dark:border-white/40 dark:border-t-white" />
            ) : null}
            {loading ? "Recomputing..." : "Recompute Insights"}
          </span>
        </button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {paths.map((path, index) => (
          <motion.div
            key={path.id ?? path.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <PathCard path={path} />
          </motion.div>
        ))}
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {recommendations.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-ink/10 bg-paper/80 p-5 shadow-soft dark:border-slate-700/60 dark:bg-slate-900/70"
          >
            <h4 className="text-lg font-semibold">{item.title}</h4>
            <p className="mt-2 text-sm text-ink/70">{item.copy}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
