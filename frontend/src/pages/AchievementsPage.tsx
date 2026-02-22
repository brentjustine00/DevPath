import { useEffect, useState } from "react"
import { claimBadges, fetchUser, getStoredAuth } from "../lib/api"
import { badges as mockBadges } from "../data/mock"
import type { Badge } from "../types"

export default function AchievementsPage() {
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState("")

  const getBadgeXp = (badge: Badge) => {
    if (badge.rarity === "epic") return 200
    if (badge.rarity === "rare") return 100
    return 50
  }

  useEffect(() => {
    const stored = getStoredAuth()
    if (!stored.username) {
      setBadges(
        mockBadges.map((badge) => ({
          ...badge,
          achieved: false,
          claimed: false,
        }))
      )
      return
    }
    fetchUser(stored.username)
      .then((data) => setBadges(data.badges))
      .catch(() => setBadges([]))
  }, [])

  const hasClaimable = badges.some((badge) => badge.achieved && !badge.claimed)

  useEffect(() => {
    if (!toast) {
      return
    }
    const timer = window.setTimeout(() => setToast(""), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const runClaim = async () => {
    const token = getStoredAuth().token
    if (!token) {
      return
    }
    const claimedBefore = badges.filter((badge) => badge.claimed).length
    setLoading(true)
    try {
      const updated = await claimBadges(token)
      setBadges(updated.badges)
      const newlyClaimedBadges = updated.badges.filter((badge) => badge.claimed).length
      const newlyClaimed = Math.max(0, newlyClaimedBadges - claimedBefore)
      if (newlyClaimed > 0) {
        const beforeClaimedSet = new Set(
          badges.filter((badge) => badge.claimed).map((badge) => badge.label)
        )
        const actuallyNew = updated.badges.filter(
          (badge) => badge.claimed && !beforeClaimedSet.has(badge.label)
        )
        const xpGain = actuallyNew.reduce((sum, badge) => sum + getBadgeXp(badge), 0)
        setToast(`Celebration: Claimed ${newlyClaimed} achievement${newlyClaimed > 1 ? "s" : ""}! +${xpGain} XP`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {toast ? (
        <div className="fixed right-6 top-24 z-50 rounded-xl border border-neon/40 bg-paper px-4 py-3 text-sm font-semibold text-ink shadow-soft dark:bg-slate-900 dark:text-white">
          {toast}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ink/50 dark:text-white/60">Achievements</p>
          <h2 className="text-3xl font-semibold dark:text-white">All achievements</h2>
        </div>
        <button
          className="rounded-full border border-ink/20 px-4 py-2 text-xs font-semibold text-ink/70 disabled:opacity-60 dark:border-white/20 dark:text-white/80"
          disabled={!hasClaimable || loading}
          onClick={runClaim}
        >
          {loading ? "Claiming..." : "Claim available"}
        </button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {badges.length === 0 ? (
          <div className="rounded-2xl border border-ink/10 bg-paper/80 p-4 text-sm text-ink/70 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-white/70">
            No achievements yet. Keep building — the first badge lands fast with consistent commits.
          </div>
        ) : (
          badges.map((badge) => (
            <div
              key={badge.id ?? badge.label}
              className="rounded-2xl border border-ink/10 bg-paper/80 p-4 shadow-soft dark:border-slate-700/60 dark:bg-slate-900/70"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-lg font-semibold dark:text-white">{badge.label}</h4>
                <div className="flex items-center gap-2">
                  {badge.achieved ? (
                    <span className="rounded-full bg-neon/30 px-3 py-1.5 text-xs font-semibold text-ink">
                      {badge.claimed ? "Claimed" : "Achieved"}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-ink/10 px-3 py-1.5 text-xs text-ink/70 dark:bg-white/10 dark:text-white/70">
                    {badge.rarity}
                  </span>
                  {badge.achieved && !badge.claimed ? (
                    <button
                      className="rounded-full border border-ink/20 px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:-translate-y-0.5 dark:border-white/20 dark:text-white/80"
                      disabled={loading}
                      onClick={runClaim}
                    >
                      {loading ? "Claiming..." : "Claim"}
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="mt-2 text-sm text-ink/70 dark:text-white/70">{badge.description}</p>
              <p className="mt-2 text-xs font-semibold text-neon">Reward: +{getBadgeXp(badge)} XP</p>
              <p className="mt-3 text-xs text-ink/50 dark:text-white/60">Criteria: {badge.criteria}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
