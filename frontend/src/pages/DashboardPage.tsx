import { motion } from "framer-motion"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import BadgeCard from "../components/BadgeCard"
import CareerCard from "../components/CareerCard"
import PathCard from "../components/PathCard"
import ProgressBar from "../components/ProgressBar"
import { badges, careerSuggestions, featuredRepos, practiceDimensions, profile } from "../data/mock"
import {
  claimBadges,
  fetchOwnerPortfolio,
  fetchUser,
  getStoredAuth,
  recomputeInsights,
  setStoredAuth,
  updateSettings,
} from "../lib/api"
import NotFoundPage from "./NotFoundPage"
import type { PortfolioResponse, UserResponse } from "../types"

export default function DashboardPage() {
  const [params] = useSearchParams()
  const usernameParam = params.get("username")
  const tokenParam = params.get("token")
  const stored = getStoredAuth()
  const isAuthenticated = Boolean(stored.token && stored.username)
  const username = isAuthenticated ? stored.username : ""
  const usernameMismatch = Boolean(isAuthenticated && usernameParam && usernameParam !== stored.username)
  const unauthenticatedProfilePeek = Boolean(!isAuthenticated && usernameParam && !tokenParam)
  const [data, setData] = useState<(UserResponse & { settings?: PortfolioResponse["settings"] }) | null>(null)
  const [recomputeLoading, setRecomputeLoading] = useState(false)
  const [toast, setToast] = useState("")
  const [editingHeaderBadges, setEditingHeaderBadges] = useState(false)
  const [savingHeaderBadges, setSavingHeaderBadges] = useState(false)
  const [selectedHeaderBadges, setSelectedHeaderBadges] = useState<string[]>([])

  useEffect(() => {
    // Only trust username from callback when a token is also present.
    // This prevents manual query-string username changes from hijacking the logged-in session.
    if (tokenParam && usernameParam) {
      setStoredAuth(tokenParam, usernameParam)
      return
    }
    if (tokenParam && stored.username) {
      setStoredAuth(tokenParam, stored.username)
    }
  }, [tokenParam, usernameParam, stored.username])

  useEffect(() => {
    if (!isAuthenticated || !username) {
      setData(null)
      return
    }
    const currentAuth = getStoredAuth()
    const load =
      currentAuth.token && currentAuth.username === username
        ? fetchOwnerPortfolio(currentAuth.token)
        : fetchUser(username)
    load
      .then((payload) => setData(payload))
      .catch(() => setData(null))
  }, [isAuthenticated, username])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(""), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const resolvedProfile = data?.profile ?? profile
  const resolvedBadges =
    data?.badges ??
    badges.map((badge) => ({
      ...badge,
      achieved: true,
      claimed: true,
    }))
  const resolvedCareers = data?.career_suggestions ?? careerSuggestions
  const resolvedPaths = data?.practice_dimensions ?? practiceDimensions
  const resolvedRepos = data?.repos ?? featuredRepos
  const achievedBadges = resolvedBadges.filter((badge) => badge.achieved)
  const selectableHeaderBadges = achievedBadges
  const selectableHeaderBadgeLabels = useMemo(
    () => new Set(selectableHeaderBadges.map((badge) => badge.label)),
    [selectableHeaderBadges]
  )
  const effectiveSelectedHeaderBadges = selectedHeaderBadges.filter((label) =>
    selectableHeaderBadgeLabels.has(label)
  )
  const displayedHeaderBadges =
    effectiveSelectedHeaderBadges.length > 0
      ? achievedBadges.filter((badge) => effectiveSelectedHeaderBadges.includes(badge.label))
      : achievedBadges
  const dashboardBadges = resolvedBadges
    .filter((badge) => badge.achieved)
    .sort((a, b) => {
      const aClaimable = a.achieved && !a.claimed
      const bClaimable = b.achieved && !b.claimed
      if (aClaimable !== bClaimable) {
        return aClaimable ? -1 : 1
      }
      const aClaimed = Boolean(a.claimed)
      const bClaimed = Boolean(b.claimed)
      if (aClaimed !== bClaimed) {
        return aClaimed ? -1 : 1
      }
      return a.label.localeCompare(b.label)
    })

  const unclaimedRewardXp = useMemo(
    () =>
      resolvedBadges
        .filter((badge) => badge.achieved && !badge.claimed)
        .reduce(
          (sum, badge) =>
            sum +
            (typeof badge.reward_xp === "number"
              ? badge.reward_xp
              : badge.rarity === "epic"
                ? 200
                : badge.rarity === "rare"
                  ? 100
                  : 50),
          0
        ),
    [resolvedBadges]
  )
  const claimedXpOnly = Math.max(0, resolvedProfile.xp - unclaimedRewardXp)

  useEffect(() => {
    const fromSettings = data?.settings?.featured_badges
    if (!Array.isArray(fromSettings)) {
      setSelectedHeaderBadges([])
      return
    }
    setSelectedHeaderBadges(fromSettings.filter((item): item is string => typeof item === "string"))
  }, [data?.settings?.featured_badges])

  useEffect(() => {
    if (selectedHeaderBadges.length === 0) {
      return
    }
    const filtered = selectedHeaderBadges.filter((label) => selectableHeaderBadgeLabels.has(label))
    if (filtered.length !== selectedHeaderBadges.length) {
      setSelectedHeaderBadges(filtered)
    }
  }, [selectableHeaderBadgeLabels, selectedHeaderBadges])

  const xpProgress = useMemo(
    () => (claimedXpOnly / resolvedProfile.nextLevelXp) * 100,
    [claimedXpOnly, resolvedProfile.nextLevelXp]
  )

  if (usernameMismatch || unauthenticatedProfilePeek) {
    return <NotFoundPage message="This dashboard is private to the signed-in account." />
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {toast ? (
        <div className="fixed right-6 top-24 z-50 rounded-xl border border-neon/40 bg-paper px-4 py-3 text-sm font-semibold text-ink shadow-soft dark:bg-slate-900 dark:text-white">
          {toast}
        </div>
      ) : null}
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl border border-ink/10 bg-white/70 p-6 shadow-soft backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={resolvedProfile.avatarUrl}
                alt={resolvedProfile.displayName}
                className="h-16 w-16 rounded-2xl"
              />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-ink/50 dark:text-white/60">Dashboard</p>
                <h2 className="text-2xl font-semibold dark:text-white">{resolvedProfile.displayName}</h2>
                <p className="text-sm text-ink/60 dark:text-white/70">@{resolvedProfile.username}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-ink/60 dark:text-white/70">
              <span className="rounded-full border border-ink/10 px-3 py-1 dark:border-white/20">
                Level {resolvedProfile.level}
              </span>
              <span className="rounded-full border border-ink/10 px-3 py-1 dark:border-white/20">
                {resolvedProfile.streakDays} day streak
              </span>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <ProgressBar value={xpProgress} label="XP to next level" max={100} />
            <p className="text-sm text-ink/60 dark:text-white/70">
              {claimedXpOnly} XP earned ·{" "}
              {Math.max(0, resolvedProfile.nextLevelXp - claimedXpOnly)} XP to level up
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-ink/50 dark:text-white/60">
                {displayedHeaderBadges.length} achievement{displayedHeaderBadges.length === 1 ? "" : "s"} shown
              </p>
              {getStoredAuth().token && getStoredAuth().username === username ? (
                <button
                  type="button"
                  onClick={() => setEditingHeaderBadges((prev) => !prev)}
                  className="rounded-full border border-ink/20 px-3 py-1 text-xs font-semibold text-ink/70 dark:border-white/20 dark:text-white/80"
                >
                  {editingHeaderBadges ? "Done" : "Edit"}
                </button>
              ) : null}
            </div>
            {editingHeaderBadges ? (
              <div className="space-y-3 rounded-2xl border border-ink/10 bg-paper/70 p-3 text-sm dark:border-slate-700/60 dark:bg-slate-800/70">
                <p className="text-xs text-ink/60 dark:text-white/70">
                  Select badges to show here. If none selected, all achieved badges are shown.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {selectableHeaderBadges.map((badge) => (
                    <label key={badge.id ?? badge.label} className="flex items-center gap-2 text-ink/80 dark:text-white/80">
                      <input
                        type="checkbox"
                        checked={selectedHeaderBadges.includes(badge.label)}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedHeaderBadges((prev) => [...prev, badge.label])
                          } else {
                            setSelectedHeaderBadges((prev) => prev.filter((item) => item !== badge.label))
                          }
                        }}
                      />
                      {badge.label}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-ink/20 px-3 py-1 text-xs font-semibold text-ink/70 dark:border-white/20 dark:text-white/80"
                    onClick={async () => {
                      const token = getStoredAuth().token
                      if (!token) return
                      setSavingHeaderBadges(true)
                      try {
                        const updated = await updateSettings(token, {
                          featured_badges: effectiveSelectedHeaderBadges,
                        })
                        setData(updated)
                        setEditingHeaderBadges(false)
                      } finally {
                        setSavingHeaderBadges(false)
                      }
                    }}
                    disabled={savingHeaderBadges}
                  >
                    {savingHeaderBadges ? "Saving..." : "Save badge view"}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-ink/10 px-3 py-1 text-xs text-ink/60 dark:border-white/10 dark:text-white/70"
                    onClick={() => {
                      setSelectedHeaderBadges([])
                    }}
                  >
                    Reset (show all)
                  </button>
                </div>
              </div>
            ) : null}
            {displayedHeaderBadges.length === 0 ? (
              <p className="text-xs text-ink/50 dark:text-white/60">
                No achieved achievements yet. Visit Achievements and claim your next milestone.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {displayedHeaderBadges.map((badge) => (
                  <div
                    key={badge.id ?? badge.label}
                    className="flex items-center gap-2 rounded-full border border-ink/10 bg-paper/70 px-3 py-1.5 text-xs dark:border-slate-700/60 dark:bg-slate-800/70"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-paper dark:bg-slate-100 dark:text-slate-900">
                      {badge.medal_icon || badge.label.charAt(0)}
                    </span>
                    <span className="text-ink/80 dark:text-white/80">{badge.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="space-y-4"
        >
          <div className="rounded-3xl border border-ink/10 bg-paper/80 p-5 shadow-soft dark:border-slate-700/60 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-[0.3em] text-ink/50 dark:text-white/60">AI Insight</p>
            <h3 className="mt-2 text-xl font-semibold dark:text-white">Career suggestions</h3>
            <p className="text-sm text-ink/60 dark:text-white/70">
              Updated as repositories change. Always visible with reasoning.
            </p>
          </div>
          {resolvedCareers.slice(0, 2).map((career) => (
            <CareerCard key={career.id ?? career.title} career={career} />
          ))}
        </motion.div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold dark:text-white">AI Practice Dimensions</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {resolvedPaths.map((path) => (
              <PathCard key={path.id ?? path.label} path={path} />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold dark:text-white">Achievements</h3>
            <button
              className="rounded-full border border-ink/20 px-4 py-2 text-xs font-semibold text-ink/70 disabled:opacity-60 dark:border-white/20 dark:text-white/80"
              disabled={!resolvedBadges.some((badge) => badge.achieved && !badge.claimed)}
              onClick={async () => {
                const token = getStoredAuth().token
                if (!token) {
                  return
                }
                const beforeClaimedSet = new Set(
                  resolvedBadges.filter((badge) => badge.claimed).map((badge) => badge.label)
                )
                const updated = await claimBadges(token)
                setData((prev) => ({ ...updated, settings: prev?.settings || {} }))
                const newlyClaimed = updated.badges.filter(
                  (badge) => badge.claimed && !beforeClaimedSet.has(badge.label)
                )
                if (newlyClaimed.length > 0) {
                  const xpGain = newlyClaimed.reduce(
                    (sum, badge) =>
                      sum +
                      (typeof badge.reward_xp === "number"
                        ? badge.reward_xp
                        : badge.rarity === "epic"
                          ? 200
                          : badge.rarity === "rare"
                            ? 100
                            : 50),
                    0
                  )
                  setToast(
                    `Celebration: Claimed ${newlyClaimed.length} achievement${newlyClaimed.length > 1 ? "s" : ""}! +${xpGain} XP`
                  )
                }
              }}
            >
              Claim available
            </button>
          </div>
          <div className="space-y-3">
            {dashboardBadges.length === 0 ? (
              <div className="rounded-2xl border border-ink/10 bg-paper/80 p-4 text-sm text-ink/70 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-white/70">
                No claimed achievements yet. Claim available achievements in the Achievements page.
              </div>
            ) : (
              dashboardBadges
                .slice(0, 3)
                .map((badge) => <BadgeCard key={badge.id ?? badge.label} badge={badge} />)
            )}
          </div>
        </div>
      </div>

      <div className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold dark:text-white">Featured Repos</h3>
          <button
            className="rounded-full border border-ink/20 px-4 py-2 text-xs font-semibold text-ink/70 disabled:opacity-60 dark:border-white/20 dark:text-white/80"
            onClick={async () => {
              const token = getStoredAuth().token
              if (!token || !username) {
                return
              }
              setRecomputeLoading(true)
              try {
                const updated = await recomputeInsights(token)
                setData((prev) => ({ ...updated, settings: prev?.settings || {} }))
              } finally {
                setRecomputeLoading(false)
              }
            }}
            disabled={recomputeLoading}
          >
            <span className="flex items-center gap-2">
              {recomputeLoading ? (
                <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-ink/40 border-t-ink dark:border-white/40 dark:border-t-white" />
              ) : null}
              {recomputeLoading ? "Recomputing..." : "Recompute"}
            </span>
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {resolvedRepos.map((repo) => (
            <motion.div
              key={repo.id ?? repo.name}
              whileHover={{ y: -6 }}
              className="rounded-2xl border border-ink/10 bg-white/80 p-4 shadow-soft dark:border-slate-700/60 dark:bg-slate-900/70"
            >
                <div className="flex items-center justify-between text-xs text-ink/60 dark:text-white/70">
                  <span>{repo.language}</span>
                  <span>{repo.lastUpdated ?? repo.last_push ?? "recently"}</span>
                </div>
                <h4 className="mt-2 text-lg font-semibold dark:text-white">{repo.name}</h4>
                <p className="mt-2 text-sm text-ink/70 dark:text-white/70">{repo.description}</p>
                <p className="mt-3 text-xs text-ink/50 dark:text-white/60">★ {repo.stars} stars</p>
              </motion.div>
            ))}
        </div>
      </div>
    </div>
  )
}
