import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import LeaderboardRow from "../components/LeaderboardRow"
import { leaderboard } from "../data/mock"
import { fetchLeaderboard, getStoredAuth } from "../lib/api"
import type { LeaderboardEntry } from "../types"

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(leaderboard)

  useEffect(() => {
    const stored = getStoredAuth()
    if (!stored.username) {
      setEntries(leaderboard)
      return
    }
    fetchLeaderboard()
      .then((data) => setEntries(data))
      .catch(() => setEntries(leaderboard))
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ink/50 dark:text-white/60">Leaderboard</p>
          <h2 className="text-3xl font-semibold dark:text-white">Top builders this week</h2>
        </div>
        <div className="flex gap-2 text-xs text-ink/60">
          <span className="rounded-full border border-ink/10 px-3 py-1 dark:border-white/20">
            XP based
          </span>
          <span className="rounded-full border border-ink/10 px-3 py-1 dark:border-white/20">
            Deterministic
          </span>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {entries.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
          >
            <LeaderboardRow entry={entry} rank={index + 1} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
