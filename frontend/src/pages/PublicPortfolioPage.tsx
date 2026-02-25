import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import PortfolioPreview from "../components/PortfolioPreview"
import { badges, featuredRepos as mockFeaturedRepos, profile } from "../data/mock"
import { fetchOwnerPortfolio, fetchPortfolio, fetchUser, getStoredAuth, updateSettings } from "../lib/api"
import type { PortfolioResponse, RepoSummary } from "../types"

type PublicPortfolioPageProps = {
  mode?: "public" | "owner"
}

const themes = [
  { id: "aurora", label: "Aurora" },
  { id: "sunset", label: "Sunset" },
  { id: "ocean", label: "Ocean" },
]

function parseStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[]
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
}

function parseString(value: unknown) {
  return typeof value === "string" ? value : ""
}

function parseEducationHistory(value: unknown): Array<{ year?: string; title: string }> {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === "string") {
        const text = item.trim()
        if (!text) return null
        return { title: text }
      }
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>
        const year = typeof obj.year === "string" ? obj.year.trim() : ""
        const title = typeof obj.title === "string" ? obj.title.trim() : ""
        if (!title) return null
        return year ? { year, title } : { title }
      }
      return null
    })
    .filter((item): item is { year?: string; title: string } => Boolean(item?.title))
}

function parseJobExperience(value: unknown): Array<{ year?: string; title: string; description?: string }> {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === "string") {
        const text = item.trim()
        if (!text) return null
        return { title: text }
      }
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>
        const year = typeof obj.year === "string" ? obj.year.trim() : ""
        const title = typeof obj.title === "string" ? obj.title.trim() : ""
        const description = typeof obj.description === "string" ? obj.description.trim() : ""
        if (!title) return null
        const result: { year?: string; title: string; description?: string } = { title }
        if (year) result.year = year
        if (description) result.description = description
        return result
      }
      return null
    })
    .filter((item): item is { year?: string; title: string; description?: string } => Boolean(item?.title))
}

function deriveGeneratedTechStack(repos: RepoSummary[]) {
  const ordered = new Map<string, string>()

  repos.forEach((repo) => {
    if (repo.language && repo.language !== "Unknown") {
      ordered.set(repo.language.toLowerCase(), repo.language)
    }
    ;(repo.languages || []).forEach((language) => {
      ordered.set(language.toLowerCase(), language)
    })
    const description = (repo.description || "").toLowerCase()
    if (description.includes("react")) ordered.set("react", "React")
    if (description.includes("tailwind")) ordered.set("tailwindcss", "TailwindCSS")
    if (description.includes("fastapi")) ordered.set("fastapi", "FastAPI")
    if (description.includes("postgres")) ordered.set("postgresql", "PostgreSQL")
  })

  return Array.from(ordered.values()).slice(0, 12)
}

function deriveGeneratedAbout(
  displayName: string,
  username: string,
  repos: RepoSummary[],
  techStack: string[]
) {
  const profileName = displayName || username
  const topRepoNames = repos.map((repo) => repo.name).slice(0, 3)
  const topStack = techStack.slice(0, 3)
  const stackText = topStack.length > 0 ? topStack.join(", ") : "modern web technologies"
  const repoText =
    topRepoNames.length > 0 ? topRepoNames.join(", ") : "portfolio-driven product work"
  const opening = [
    `${profileName} is building a practical engineering journey around ${stackText}, with a focus on shipping features that solve real user problems.`,
    `${profileName} is actively growing as a builder through hands-on projects in ${stackText}, prioritizing clean execution and production-ready habits.`,
    `${profileName} is shaping a full-stack profile using ${stackText}, with consistent iteration, better architecture decisions, and user-centered delivery.`,
  ]
  const middle = [
    `Current project work includes ${repoText}, where each repository is used to practice maintainable code structure, readable documentation, and incremental releases.`,
    `Recent repositories such as ${repoText} are being used to strengthen planning, implementation, and polish from first commit to deployed output.`,
    `The repository set, including ${repoText}, reflects a process-first approach: design, build, test, review, and improve.`,
  ]
  const closing = [
    `The goal is to keep compounding technical depth while building a portfolio that demonstrates both product sense and engineering reliability.`,
    `Long-term, the direction is clear: turn consistent project execution into stronger system thinking and more complete end-to-end delivery.`,
    `Each cycle is focused on measurable progress: better code quality, better UX decisions, and stronger collaboration readiness.`,
  ]

  const pick = (items: string[]) => items[Math.floor(Math.random() * items.length)]
  return `${pick(opening)} ${pick(middle)} ${pick(closing)}`
}

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
  const [generatedTechStack, setGeneratedTechStack] = useState<string[]>([])
  const [manualTechStackInput, setManualTechStackInput] = useState("")
  const [generatedAbout, setGeneratedAbout] = useState("")
  const [manualAbout, setManualAbout] = useState("")
  const [customProfileImage, setCustomProfileImage] = useState("")
  const [educationHistoryEntries, setEducationHistoryEntries] = useState<Array<{ year: string; title: string }>>([])
  const [jobExperienceEntries, setJobExperienceEntries] = useState<Array<{ year: string; title: string; description: string }>>([])
  const [contactEmail, setContactEmail] = useState("")
  const [contactLinkedin, setContactLinkedin] = useState("")
  const [contactPhone, setContactPhone] = useState("")

  const auth = getStoredAuth()
  const resolvedUsername = mode === "owner" ? auth.username || username : username
  const isOwner = mode === "owner"
  const isLoggedIn = Boolean(auth.username)
  const canCustomize = isOwner && isLoggedIn

  useEffect(() => {
    if (!resolvedUsername) {
      if (isOwner && !isLoggedIn) {
        const mockTechStack = deriveGeneratedTechStack(mockFeaturedRepos)
        setData({
          profile,
          practice_dimensions: [],
          career_suggestions: [],
          badges: badges.map((badge) => ({ ...badge, achieved: true, claimed: true })),
          repos: mockFeaturedRepos,
          settings: {
            theme: "aurora",
            theme_light: "aurora",
            theme_dark: "aurora",
            show_sections: { badges: true, repos: true, preview_dark: false },
            featured_repos: [],
            featured_badges: [],
            social_links: {
              about_generated: deriveGeneratedAbout(profile.displayName, profile.username, mockFeaturedRepos, mockTechStack),
              tech_stack_generated: mockTechStack,
            },
            is_public: true,
          },
        })
      }
      return
    }

    const load =
      isOwner && isLoggedIn && auth.token
        ? fetchOwnerPortfolio(auth.token)
        : isOwner
          ? fetchUser(resolvedUsername).then((payload) => ({
              ...payload,
              settings: {
                theme: "aurora",
                theme_light: "aurora",
                theme_dark: "aurora",
                show_sections: { badges: true, repos: true, preview_dark: false },
                featured_repos: [],
                featured_badges: [],
                social_links: {},
                is_public: true,
              },
            }))
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

        const social = (payload.settings?.social_links || {}) as Record<string, unknown>
        const computedTech = deriveGeneratedTechStack(payload.repos || [])
        setGeneratedTechStack(computedTech)

        const manualTech = parseStringList(social.tech_stack_manual)
        setManualTechStackInput(manualTech.join(", "))

        const computedAbout = deriveGeneratedAbout(
          payload.profile.displayName,
          payload.profile.username,
          payload.repos || [],
          computedTech
        )
        setGeneratedAbout(parseString(social.about_generated) || computedAbout)
        setManualAbout(parseString(social.about_manual) || parseString(payload.settings?.bio))
        setCustomProfileImage(parseString(social.profile_image))
        const parsedEducation = parseEducationHistory(social.education_history)
        setEducationHistoryEntries(parsedEducation.map((item) => ({ year: item.year || "", title: item.title })))
        const parsedJobs = parseJobExperience(social.job_experience)
        setJobExperienceEntries(
          parsedJobs.map((item) => ({
            year: item.year || "",
            title: item.title,
            description: item.description || "",
          }))
        )
        setContactEmail(parseString(social.email))
        setContactLinkedin(parseString(social.linkedin))
        setContactPhone(parseString(social.phone))
      })
      .catch(() => {
        if (isOwner && !isLoggedIn) {
          const mockTechStack = deriveGeneratedTechStack(mockFeaturedRepos)
          setData({
            profile,
            practice_dimensions: [],
            career_suggestions: [],
            badges: badges.map((badge) => ({ ...badge, achieved: true, claimed: true })),
            repos: mockFeaturedRepos,
            settings: {
              theme: "aurora",
              theme_light: "aurora",
              theme_dark: "aurora",
              show_sections: { badges: true, repos: true, preview_dark: false },
              featured_repos: [],
              featured_badges: [],
              social_links: {
                about_generated: deriveGeneratedAbout(profile.displayName, profile.username, mockFeaturedRepos, mockTechStack),
                tech_stack_generated: mockTechStack,
              },
              is_public: true,
            },
          })
          return
        }
        setData(null)
      })
  }, [resolvedUsername, isOwner, isLoggedIn, auth.token])

  const resolvedProfile = data?.profile ?? profile
  const resolvedBadges = data?.badges ?? badges
  const resolvedRepos = data?.repos ?? mockFeaturedRepos
  const selectableBadges = resolvedBadges.filter((badge) => badge.achieved)
  const selectableBadgeLabels = useMemo(
    () => new Set(selectableBadges.map((badge) => badge.label)),
    [selectableBadges]
  )
  const effectiveSelectedBadges = selectedBadges.filter((label) => selectableBadgeLabels.has(label))

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

  const manualTechStack = useMemo(
    () =>
      manualTechStackInput
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    [manualTechStackInput]
  )

  const mergedTechStack = useMemo(() => {
    const ordered = new Map<string, string>()
    generatedTechStack.forEach((item) => ordered.set(item.toLowerCase(), item))
    manualTechStack.forEach((item) => ordered.set(item.toLowerCase(), item))
    return Array.from(ordered.values())
  }, [generatedTechStack, manualTechStack])

  const effectiveAbout = manualAbout.trim() || generatedAbout.trim() || resolvedProfile.bio
  const educationHistory = useMemo(
    () =>
      educationHistoryEntries
        .map((item) => ({ year: item.year.trim(), title: item.title.trim() }))
        .filter((item) => item.title.length > 0),
    [educationHistoryEntries]
  )
  const jobExperience = useMemo(
    () =>
      jobExperienceEntries
        .map((item) => ({
          year: item.year.trim(),
          title: item.title.trim(),
          description: item.description.trim(),
        }))
        .filter((item) => item.title.length > 0),
    [jobExperienceEntries]
  )

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
      if (activeTheme === "sunset") return "bg-gradient-to-br from-rose-950 via-orange-950 to-amber-950"
      if (activeTheme === "ocean") return "bg-gradient-to-br from-sky-950 via-cyan-950 to-blue-950"
      return "bg-gradient-to-br from-indigo-950 via-slate-950 to-emerald-950"
    }
    if (activeTheme === "sunset") return "bg-gradient-to-br from-rose-50 via-orange-50 to-amber-100"
    if (activeTheme === "ocean") return "bg-gradient-to-br from-sky-50 via-cyan-50 to-blue-100"
    return "bg-gradient-to-br from-indigo-50 via-slate-50 to-emerald-50"
  }, [activeTheme, effectivePreviewDark])

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ink/50 dark:text-white/60">Public Portfolio</p>
          <h2 className="text-3xl font-semibold dark:text-white">{isOwner ? "Customize your live profile" : "Portfolio"}</h2>
        </div>
        {isOwner ? (
          <div className="flex flex-wrap gap-2">
            {canCustomize ? (
              <button
                onClick={async () => {
                  if (!resolvedUsername) return
                  await navigator.clipboard.writeText(`${window.location.origin}/p/${resolvedUsername}`)
                  setShareCopied(true)
                  setTimeout(() => setShareCopied(false), 2000)
                }}
                className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper shadow-glow dark:bg-slate-100 dark:text-slate-900"
              >
                {shareCopied ? "Copied!" : "Share portfolio URL"}
              </button>
            ) : (
              <button
                onClick={() => window.alert("Log in to customize your own portfolio.")}
                className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper shadow-glow dark:bg-slate-100 dark:text-slate-900"
              >
                Customize portfolio
              </button>
            )}
            {auth.token ? (
              <button
                disabled={saving}
                onClick={async () => {
                  if (!auth.token) return
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
                      social_links: {
                        profile_image: customProfileImage,
                        education_history: educationHistory,
                        job_experience: jobExperience,
                        email: contactEmail,
                        linkedin: contactLinkedin,
                        phone: contactPhone,
                        about_generated: generatedAbout,
                        about_manual: manualAbout,
                        tech_stack_generated: generatedTechStack,
                        tech_stack_manual: manualTechStack,
                      },
                      bio: manualAbout || undefined,
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
            {!canCustomize ? (
              <div className="rounded-2xl border border-ink/10 bg-paper/70 p-4 text-sm text-ink/70 dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-white/70">
                <p>Log in to customize your own portfolio.</p>
                <button
                  type="button"
                  onClick={() => window.alert("Log in to customize your own portfolio.")}
                  className="mt-3 rounded-full border border-ink/20 px-3 py-1 text-xs font-semibold text-ink/70 dark:border-white/20 dark:text-white/80"
                >
                  Customize portfolio
                </button>
              </div>
            ) : null}

            <div className="space-y-3">
              <label className="text-sm font-medium dark:text-white/80">Theme</label>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-xs font-semibold text-ink/70 dark:border-white/20 dark:text-white/80">
                  <input
                    type="checkbox"
                    checked={previewDark}
                    disabled={!canCustomize}
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
                    disabled={!canCustomize}
                    onClick={() => {
                      setTheme(option.id)
                      if (previewDark) setThemeDark(option.id)
                      else setThemeLight(option.id)
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
                    disabled={!canCustomize}
                    onChange={(event) => setShowBadges(event.target.checked)}
                  />
                  Show badges
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showRepos}
                    disabled={!canCustomize}
                    onChange={(event) => setShowRepos(event.target.checked)}
                  />
                  Show featured repos
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium dark:text-white/80">Tech stack</label>
                <button
                  type="button"
                  disabled={!canCustomize}
                  onClick={() => setGeneratedTechStack(deriveGeneratedTechStack(resolvedRepos))}
                  className="rounded-full border border-ink/20 px-3 py-1 text-xs font-semibold text-ink/70 dark:border-white/20 dark:text-white/80"
                >
                  AI generate
                </button>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-paper/70 p-3 text-xs text-ink/70 dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-white/70">
                <p className="font-semibold">Generated</p>
                <p className="mt-1">{generatedTechStack.join(", ") || "No generated stack yet."}</p>
              </div>
              <input
                type="text"
                value={manualTechStackInput}
                disabled={!canCustomize}
                onChange={(event) => setManualTechStackInput(event.target.value)}
                placeholder="Manual add: React, FastAPI, PostgreSQL"
                className="w-full rounded-2xl border border-ink/20 bg-paper/80 px-3 py-2 text-sm outline-none dark:border-white/20 dark:bg-slate-900/70"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium dark:text-white/80">About me</label>
                <button
                  type="button"
                  disabled={!canCustomize}
                  onClick={() =>
                    setGeneratedAbout(
                      deriveGeneratedAbout(
                        resolvedProfile.displayName,
                        resolvedProfile.username,
                        resolvedRepos,
                        mergedTechStack
                      )
                    )
                  }
                  className="rounded-full border border-ink/20 px-3 py-1 text-xs font-semibold text-ink/70 dark:border-white/20 dark:text-white/80"
                >
                  AI generate
                </button>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-paper/70 p-3 text-xs text-ink/70 dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-white/70">
                <p className="font-semibold">Generated</p>
                <p className="mt-1">{generatedAbout || "No generated summary yet."}</p>
              </div>
              <textarea
                value={manualAbout}
                disabled={!canCustomize}
                onChange={(event) => setManualAbout(event.target.value)}
                placeholder="Manual add your about me..."
                className="h-24 w-full rounded-2xl border border-ink/20 bg-paper/80 px-3 py-2 text-sm outline-none dark:border-white/20 dark:bg-slate-900/70"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium dark:text-white/80">Profile picture (1:1)</label>
              <input
                type="file"
                accept="image/*"
                disabled={!canCustomize}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => {
                    const result = typeof reader.result === "string" ? reader.result : ""
                    setCustomProfileImage(result)
                  }
                  reader.readAsDataURL(file)
                }}
                className="w-full rounded-2xl border border-ink/20 bg-paper/80 px-3 py-2 text-sm outline-none file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-3 file:py-1 file:text-xs file:font-semibold file:text-paper dark:border-white/20 dark:bg-slate-900/70 dark:file:bg-slate-100 dark:file:text-slate-900"
              />
              {customProfileImage ? (
                <div className="flex items-center gap-3">
                  <img src={customProfileImage} alt="Custom profile" className="h-12 w-12 rounded-xl object-cover" />
                  <button
                    type="button"
                    disabled={!canCustomize}
                    onClick={() => setCustomProfileImage("")}
                    className="rounded-full border border-ink/20 px-3 py-1 text-xs font-semibold text-ink/70 dark:border-white/20 dark:text-white/80"
                  >
                    Remove uploaded image
                  </button>
                </div>
              ) : null}
              <p className="text-xs text-ink/50 dark:text-white/60">
                Upload a 1:1 image. If none is uploaded, GitHub profile image is used automatically.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium dark:text-white/80">Education history</label>
              <div className="space-y-2">
                {educationHistoryEntries.map((entry, index) => (
                  <div key={`edu-${index}`} className="grid gap-2 md:grid-cols-[110px_1fr_auto]">
                    <input
                      type="text"
                      value={entry.year}
                      disabled={!canCustomize}
                      onChange={(event) =>
                        setEducationHistoryEntries((prev) =>
                          prev.map((item, i) => (i === index ? { ...item, year: event.target.value } : item))
                        )
                      }
                      placeholder="Year"
                      className="rounded-2xl border border-ink/20 bg-paper/80 px-3 py-2 text-sm outline-none dark:border-white/20 dark:bg-slate-900/70"
                    />
                    <input
                      type="text"
                      value={entry.title}
                      disabled={!canCustomize}
                      onChange={(event) =>
                        setEducationHistoryEntries((prev) =>
                          prev.map((item, i) => (i === index ? { ...item, title: event.target.value } : item))
                        )
                      }
                      placeholder="School / Degree"
                      className="rounded-2xl border border-ink/20 bg-paper/80 px-3 py-2 text-sm outline-none dark:border-white/20 dark:bg-slate-900/70"
                    />
                    <button
                      type="button"
                      disabled={!canCustomize}
                      onClick={() =>
                        setEducationHistoryEntries((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="rounded-full border border-ink/20 px-3 py-1 text-xs font-semibold text-ink/70 dark:border-white/20 dark:text-white/80"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  disabled={!canCustomize}
                  onClick={() =>
                    setEducationHistoryEntries((prev) => [...prev, { year: "", title: "" }])
                  }
                  className="rounded-full border border-ink/20 px-3 py-1 text-xs font-semibold text-ink/70 dark:border-white/20 dark:text-white/80"
                >
                  Add education
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium dark:text-white/80">Job experience</label>
              <div className="space-y-2">
                {jobExperienceEntries.map((entry, index) => (
                  <div key={`job-${index}`} className="space-y-2 rounded-2xl border border-ink/10 bg-paper/60 p-3 dark:border-slate-700/60 dark:bg-slate-800/60">
                    <div className="grid gap-2 md:grid-cols-[110px_1fr_auto]">
                      <input
                        type="text"
                        value={entry.year}
                        disabled={!canCustomize}
                        onChange={(event) =>
                          setJobExperienceEntries((prev) =>
                            prev.map((item, i) => (i === index ? { ...item, year: event.target.value } : item))
                          )
                        }
                        placeholder="Year"
                        className="rounded-2xl border border-ink/20 bg-paper/80 px-3 py-2 text-sm outline-none dark:border-white/20 dark:bg-slate-900/70"
                      />
                      <input
                        type="text"
                        value={entry.title}
                        disabled={!canCustomize}
                        onChange={(event) =>
                          setJobExperienceEntries((prev) =>
                            prev.map((item, i) => (i === index ? { ...item, title: event.target.value } : item))
                          )
                        }
                        placeholder="Job title"
                        className="rounded-2xl border border-ink/20 bg-paper/80 px-3 py-2 text-sm outline-none dark:border-white/20 dark:bg-slate-900/70"
                      />
                      <button
                        type="button"
                        disabled={!canCustomize}
                        onClick={() => setJobExperienceEntries((prev) => prev.filter((_, i) => i !== index))}
                        className="rounded-full border border-ink/20 px-3 py-1 text-xs font-semibold text-ink/70 dark:border-white/20 dark:text-white/80"
                      >
                        Remove
                      </button>
                    </div>
                    <textarea
                      value={entry.description}
                      disabled={!canCustomize}
                      onChange={(event) =>
                        setJobExperienceEntries((prev) =>
                          prev.map((item, i) => (i === index ? { ...item, description: event.target.value } : item))
                        )
                      }
                      placeholder="Job description"
                      className="h-20 w-full rounded-2xl border border-ink/20 bg-paper/80 px-3 py-2 text-sm outline-none dark:border-white/20 dark:bg-slate-900/70"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  disabled={!canCustomize}
                  onClick={() =>
                    setJobExperienceEntries((prev) => [...prev, { year: "", title: "", description: "" }])
                  }
                  className="rounded-full border border-ink/20 px-3 py-1 text-xs font-semibold text-ink/70 dark:border-white/20 dark:text-white/80"
                >
                  Add job
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium dark:text-white/80">Contact</label>
              <div className="grid gap-2">
                <input
                  type="email"
                  value={contactEmail}
                  disabled={!canCustomize}
                  onChange={(event) => setContactEmail(event.target.value)}
                  placeholder="Email"
                  className="w-full rounded-2xl border border-ink/20 bg-paper/80 px-3 py-2 text-sm outline-none dark:border-white/20 dark:bg-slate-900/70"
                />
                <input
                  type="text"
                  value={contactLinkedin}
                  disabled={!canCustomize}
                  onChange={(event) => setContactLinkedin(event.target.value)}
                  placeholder="LinkedIn URL"
                  className="w-full rounded-2xl border border-ink/20 bg-paper/80 px-3 py-2 text-sm outline-none dark:border-white/20 dark:bg-slate-900/70"
                />
                <input
                  type="text"
                  value={contactPhone}
                  disabled={!canCustomize}
                  onChange={(event) => setContactPhone(event.target.value)}
                  placeholder="Contact number"
                  className="w-full rounded-2xl border border-ink/20 bg-paper/80 px-3 py-2 text-sm outline-none dark:border-white/20 dark:bg-slate-900/70"
                />
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
                        disabled={!canCustomize}
                        onChange={(event) => {
                          if (event.target.checked) setSelectedRepos((prev) => [...prev, repo.name])
                          else setSelectedRepos((prev) => prev.filter((item) => item !== repo.name))
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
                  <p className="text-xs text-ink/50 dark:text-white/60">Achieve badges first to feature badges here.</p>
                ) : (
                  selectableBadges.map((badge) => (
                    <label key={badge.label} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedBadges.includes(badge.label)}
                        disabled={!canCustomize}
                        onChange={(event) => {
                          if (event.target.checked) setSelectedBadges((prev) => [...prev, badge.label])
                          else setSelectedBadges((prev) => prev.filter((item) => item !== badge.label))
                        }}
                      />
                      {badge.label}
                    </label>
                  ))
                )}
              </div>
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
            badges={visibleBadges}
            repos={visibleRepos}
            techStack={mergedTechStack}
            aboutMe={effectiveAbout}
            educationHistory={educationHistory}
            jobExperience={jobExperience}
            profileImage={customProfileImage}
            contact={{
              email: contactEmail,
              linkedin: contactLinkedin,
              phone: contactPhone,
            }}
            enableRepoLinks={mode === "public"}
            showBadgeStatus={false}
          />
        </div>
      </div>
    </div>
  )
}
