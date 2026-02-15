import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import PortfolioPreview from "../components/PortfolioPreview"
import {
  badges,
  careerSuggestions,
  featuredRepos as mockFeaturedRepos,
  practiceDimensions,
  profile,
} from "../data/mock"
import { fetchOwnerPortfolio, fetchPortfolio, getStoredAuth, updateSettings } from "../lib/api"
import type { PortfolioResponse } from "../types"

type PublicPortfolioPageProps = {
  mode?: "public" | "owner"
}

const themes = [
  { id: "aurora", label: "Aurora" },
  { id: "sunset", label: "Sunset" },
  { id: "ocean", label: "Ocean" },
]

export default function PublicPortfolioPage({ mode = "public" }: PublicPortfolioPageProps) {
  const { username } = useParams()
  const [theme, setTheme] = useState("aurora")
  const [themeLight, setThemeLight] = useState("aurora")
  const [themeDark, setThemeDark] = useState("aurora")
  const [showBadges, setShowBadges] = useState(true)
  const [showRepos, setShowRepos] = useState(true)
  const [selectedRepos, setSelectedRepos] = useState<string[]>([])
  const [selectedBadges, setSelectedBadges] = useState<string[]>([])
  const [data, setData] = useState<PortfolioResponse | null>(null)
  const [saving, setSaving] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [previewDark, setPreviewDark] = useState(false)

  const auth = getStoredAuth()
  const resolvedUsername = mode === "owner" ? auth.username || username : username
  const isOwner = mode === "owner"
  const isLoggedIn = Boolean(auth.username)

  useEffect(() => {
    if (!resolvedUsername) {
      if (isOwner && !isLoggedIn) {
        setData({
          profile,
          practice_dimensions: practiceDimensions,
          career_suggestions: careerSuggestions,
          badges: badges.map((badge) => ({ ...badge, achieved: true, claimed: true })),
          repos: mockFeaturedRepos,
          settings: {
            theme: "aurora",
            theme_light: "aurora",
            theme_dark: "aurora",
            show_sections: { badges: true, repos: true, preview_dark: false },
            featured_repos: [],
            featured_badges: [],
            is_public: true,
          },
        })
      }
      return
    }
    const load = isOwner && isLoggedIn && auth.token
      ? fetchOwnerPortfolio(auth.token)
      : fetchPortfolio(resolvedUsername)

    load
      .then((payload) => {
        setData(payload)
        const resolvedLight = payload.settings?.theme_light || payload.settings?.theme || "aurora"
        const resolvedDark = payload.settings?.theme_dark || payload.settings?.theme || "aurora"
        const resolvedPreviewDark =
          typeof payload.settings?.show_sections?.preview_dark === "boolean"
            ? payload.settings.show_sections.preview_dark
            : false
        setPreviewDark(resolvedPreviewDark)
        setThemeLight(resolvedLight)
        setThemeDark(resolvedDark)
        setTheme(resolvedPreviewDark ? resolvedDark : resolvedLight)
        if (payload.settings?.show_sections) {
          if (typeof payload.settings.show_sections.badges === "boolean") {
            setShowBadges(payload.settings.show_sections.badges)
          }
          if (typeof payload.settings.show_sections.repos === "boolean") {
            setShowRepos(payload.settings.show_sections.repos)
          }
        }
        if (Array.isArray(payload.settings?.featured_repos)) {
          setSelectedRepos(payload.settings.featured_repos)
        }
        if (Array.isArray(payload.settings?.featured_badges)) {
          setSelectedBadges(payload.settings.featured_badges)
        }
      })
      .catch(() => {
        if (isOwner && !isLoggedIn) {
          setData({
            profile,
            practice_dimensions: practiceDimensions,
            career_suggestions: careerSuggestions,
            badges: badges.map((badge) => ({ ...badge, achieved: true, claimed: true })),
            repos: mockFeaturedRepos,
            settings: {
              theme: "aurora",
              theme_light: "aurora",
              theme_dark: "aurora",
              show_sections: { badges: true, repos: true, preview_dark: false },
              featured_repos: [],
              featured_badges: [],
              is_public: true,
            },
          })
          return
        }
        setData(null)
      })
  }, [resolvedUsername, isOwner, isLoggedIn])

  const resolvedProfile = data?.profile ?? profile
  const resolvedPaths = data?.practice_dimensions ?? practiceDimensions
  const resolvedCareers = data?.career_suggestions ?? careerSuggestions
  const resolvedBadges = data?.badges ?? badges
  const resolvedRepos = data?.repos ?? mockFeaturedRepos
  const selectableBadges = resolvedBadges.filter((badge) => badge.claimed)
  const selectableBadgeLabels = useMemo(
    () => new Set(selectableBadges.map((badge) => badge.label)),
    [selectableBadges]
  )
  const effectiveSelectedBadges = selectedBadges.filter((label) =>
    selectableBadgeLabels.has(label)
  )

  useEffect(() => {
    if (selectedBadges.length === 0) {
      return
    }
    const filtered = selectedBadges.filter((label) => selectableBadgeLabels.has(label))
    if (filtered.length !== selectedBadges.length) {
      setSelectedBadges(filtered)
    }
  }, [selectableBadgeLabels, selectedBadges])

  const repoSelectionActive = selectedRepos.length > 0
  const badgeSelectionActive = effectiveSelectedBadges.length > 0

  const visibleRepos = showRepos
    ? repoSelectionActive
      ? resolvedRepos.filter((repo) => selectedRepos.includes(repo.name))
      : resolvedRepos
    : []
  const visibleBadges = showBadges
    ? badgeSelectionActive
      ? resolvedBadges.filter((badge) => effectiveSelectedBadges.includes(badge.label))
      : resolvedBadges
    : []

  const effectivePreviewDark = isOwner
    ? previewDark
    : Boolean(data?.settings?.show_sections?.preview_dark)
  const effectiveThemeLight = isOwner
    ? themeLight
    : data?.settings?.theme_light || data?.settings?.theme || "aurora"
  const effectiveThemeDark = isOwner
    ? themeDark
    : data?.settings?.theme_dark || data?.settings?.theme || "aurora"
  const activeTheme = effectivePreviewDark ? effectiveThemeDark : effectiveThemeLight

  const themedClass = useMemo(() => {
    if (effectivePreviewDark) {
      if (activeTheme === "sunset") {
        return "bg-gradient-to-br from-rose-950 via-orange-950 to-amber-950"
      }
      if (activeTheme === "ocean") {
        return "bg-gradient-to-br from-sky-950 via-cyan-950 to-blue-950"
      }
      return "bg-gradient-to-br from-indigo-950 via-slate-950 to-emerald-950"
    }
    if (activeTheme === "sunset") {
      return "bg-gradient-to-br from-rose-50 via-orange-50 to-amber-100"
    }
    if (activeTheme === "ocean") {
      return "bg-gradient-to-br from-sky-50 via-cyan-50 to-blue-100"
    }
    return "bg-gradient-to-br from-indigo-50 via-slate-50 to-emerald-50"
  }, [activeTheme, effectivePreviewDark])

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ink/50 dark:text-white/60">Public Portfolio</p>
          <h2 className="text-3xl font-semibold dark:text-white">
            {isOwner ? "Customize your live profile" : "Portfolio"}
          </h2>
        </div>
        {isOwner ? (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={async () => {
                const url = `${window.location.origin}/p/${resolvedUsername}`
                await navigator.clipboard.writeText(url)
                setShareCopied(true)
                setTimeout(() => setShareCopied(false), 2000)
              }}
              className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper shadow-glow dark:bg-slate-100 dark:text-slate-900"
            >
              {shareCopied ? "Copied!" : "Share portfolio URL"}
            </button>
            {auth.token ? (
              <button
                disabled={saving}
                onClick={async () => {
                  if (!auth.token) {
                    return
                  }
                  setSaving(true)
                  try {
                    const saveThemeLight = previewDark ? themeLight : theme
                    const saveThemeDark = previewDark ? theme : themeDark
                    const updated = await updateSettings(auth.token, {
                      theme,
                      theme_light: saveThemeLight,
                      theme_dark: saveThemeDark,
                      show_sections: {
                        badges: showBadges,
                        repos: showRepos,
                        preview_dark: previewDark,
                      },
                      featured_repos: selectedRepos,
                      featured_badges: effectiveSelectedBadges,
                    })
                    setData(updated)
                    setThemeLight(saveThemeLight)
                    setThemeDark(saveThemeDark)
                  } finally {
                    setSaving(false)
                  }
                }}
                className="rounded-full border border-ink/20 px-5 py-2 text-sm font-semibold text-ink/70 disabled:opacity-60 dark:border-white/20 dark:text-white/80"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        {isOwner ? (
          <div className="space-y-4 rounded-3xl border border-ink/10 bg-white/70 p-6 shadow-soft backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
            <h3 className="text-lg font-semibold">Customization</h3>
            <div className="space-y-3">
              <label className="text-sm font-medium dark:text-white/80">Theme</label>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold border-ink/20 text-ink/70 dark:border-white/20 dark:text-white/80">
                  <input
                    type="checkbox"
                    checked={previewDark}
                    onChange={(event) => {
                      const next = event.target.checked
                      setPreviewDark(next)
                      setTheme(next ? themeDark : themeLight)
                    }}
                  />
                  Dark
                </label>
                {themes.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setTheme(option.id)
                      if (previewDark) {
                        setThemeDark(option.id)
                      } else {
                        setThemeLight(option.id)
                      }
                    }}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold ${
                      theme === option.id
                        ? "border-ink bg-ink text-paper dark:border-white dark:bg-slate-100 dark:text-slate-900"
                        : "border-ink/20 text-ink/70 dark:border-white/20 dark:text-white/70"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium dark:text-white/80">Sections</label>
              <div className="flex flex-col gap-2 text-sm text-ink/70 dark:text-white/70">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showBadges}
                    onChange={(event) => setShowBadges(event.target.checked)}
                  />
                  Show badges
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showRepos}
                    onChange={(event) => setShowRepos(event.target.checked)}
                  />
                  Show featured repos
                </label>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium dark:text-white/80">Featured repos to display</label>
              <div className="max-h-40 space-y-2 overflow-auto rounded-2xl border border-ink/10 bg-paper/70 p-3 text-sm text-ink/70 dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-white/70">
                {resolvedRepos.length === 0 ? (
                  <p className="text-xs text-ink/50 dark:text-white/60">No repos available.</p>
                ) : (
                  resolvedRepos.map((repo) => (
                    <label key={repo.name} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedRepos.includes(repo.name)}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedRepos((prev) => [...prev, repo.name])
                          } else {
                            setSelectedRepos((prev) => prev.filter((item) => item !== repo.name))
                          }
                        }}
                      />
                      {repo.name}
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium dark:text-white/80">Badges to display</label>
              <div className="max-h-40 space-y-2 overflow-auto rounded-2xl border border-ink/10 bg-paper/70 p-3 text-sm text-ink/70 dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-white/70">
                {selectableBadges.length === 0 ? (
                  <p className="text-xs text-ink/50 dark:text-white/60">
                    Claim achievements first to feature badges here.
                  </p>
                ) : (
                  selectableBadges.map((badge) => (
                    <label key={badge.label} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedBadges.includes(badge.label)}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedBadges((prev) => [...prev, badge.label])
                          } else {
                            setSelectedBadges((prev) => prev.filter((item) => item !== badge.label))
                          }
                        }}
                      />
                      {badge.label}
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-ink/10 bg-paper/80 p-4 text-sm text-ink/60 dark:border-slate-700/60 dark:bg-slate-900/70">
              Live preview updates instantly. AI paths and career suggestions are always visible.
            </div>
          </div>
        ) : null}

        <div
          className={`rounded-3xl border border-ink/10 p-4 ${themedClass} ${isOwner ? "" : "lg:col-span-2"} dark:border-slate-700/60 ${
            effectivePreviewDark ? "dark preview-dark" : "preview-light"
          }`}
        >
          <PortfolioPreview
            profile={resolvedProfile}
            paths={resolvedPaths}
            careers={resolvedCareers}
            badges={visibleBadges}
            repos={visibleRepos}
            enableRepoLinks={mode === "public"}
            showBadgeStatus={mode !== "public"}
          />
        </div>
      </div>
    </div>
  )
}
