import type { Badge, RepoSummary, UserProfile } from "../types"
import BadgeCard from "./BadgeCard"

type ContactInfo = {
  email?: string
  linkedin?: string
  phone?: string
}

type PortfolioPreviewProps = {
  profile: UserProfile
  badges: Badge[]
  repos: RepoSummary[]
  techStack: string[]
  aboutMe: string
  contact: ContactInfo
  enableRepoLinks?: boolean
  showBadgeStatus?: boolean
}

function normalizeUrl(value: string) {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value
  }
  return `https://${value}`
}

export default function PortfolioPreview({
  profile,
  badges,
  repos,
  techStack,
  aboutMe,
  contact,
  enableRepoLinks = false,
  showBadgeStatus = true,
}: PortfolioPreviewProps) {
  const visibleBadges = badges.filter((badge) => badge.achieved || badge.claimed)

  return (
    <div className="rounded-3xl border border-ink/10 bg-white/70 p-6 shadow-soft backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-4">
          <img src={profile.avatarUrl} alt={profile.displayName} className="h-16 w-16 rounded-2xl" />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-ink/50">Portfolio</p>
            <h3 className="text-2xl font-semibold">{profile.displayName}</h3>
            <a
              href={`https://github.com/${profile.username}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-ink/60 underline-offset-2 transition hover:underline dark:text-white/70"
            >
              @{profile.username}
            </a>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-ink/10 bg-paper/60 p-4 dark:border-slate-700/60 dark:bg-slate-800/70">
        <h4 className="text-lg font-semibold">About Me</h4>
        <p className="mt-3 text-sm text-ink/70 dark:text-white/80">
          {aboutMe || "No profile summary yet."}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-ink/10 bg-paper/60 p-4 dark:border-slate-700/60 dark:bg-slate-800/70">
        <h4 className="text-lg font-semibold">Tech Stack</h4>
        <div className="mt-3 flex flex-wrap gap-2">
          {techStack.length === 0 ? (
            <p className="text-sm text-ink/60 dark:text-white/70">No tech stack selected yet.</p>
          ) : (
            techStack.map((item, index) => (
              <span
                key={`${item}-${index}`}
                className="rounded-full border border-ink/20 px-3 py-1 text-xs font-semibold text-ink/70 dark:border-white/20 dark:text-white/80"
              >
                {item}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <h4 className="text-lg font-semibold">Featured Repos</h4>
          <div className="space-y-3">
            {repos.map((repo) => {
              const repoUrl = repo.htmlUrl || `https://github.com/${profile.username}/${repo.name}`
              return (
                <div
                  key={repo.name}
                  className="rounded-2xl border border-ink/10 bg-paper/60 p-4 dark:border-slate-700/60 dark:bg-slate-800/70"
                >
                  {enableRepoLinks ? (
                    <a
                      href={repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block transition hover:-translate-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{repo.name}</p>
                          <p className="text-sm text-ink/60 dark:text-white/70">{repo.description}</p>
                        </div>
                        <div className="text-right text-xs text-ink/50 dark:text-white/60">
                          <p>{repo.language}</p>
                          <p>{repo.lastUpdated ?? repo.last_push ?? "recently"}</p>
                        </div>
                      </div>
                    </a>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{repo.name}</p>
                        <p className="text-sm text-ink/60 dark:text-white/70">{repo.description}</p>
                      </div>
                      <div className="text-right text-xs text-ink/50 dark:text-white/60">
                        <p>{repo.language}</p>
                        <p>{repo.lastUpdated ?? repo.last_push ?? "recently"}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <div className="space-y-3">
          <h4 className="text-lg font-semibold">Badges</h4>
          <div className="space-y-3">
            {visibleBadges.length === 0 ? (
              <div className="rounded-2xl border border-ink/10 bg-paper/80 p-4 text-sm text-ink/70 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-white/70">
                No badges yet. Keep building - the first badge lands fast with consistent commits.
              </div>
            ) : (
              visibleBadges.map((badge) => (
                <BadgeCard key={badge.label} badge={badge} showStatus={showBadgeStatus} />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-ink/10 bg-paper/60 p-4 dark:border-slate-700/60 dark:bg-slate-800/70">
        <h4 className="text-lg font-semibold">Contact</h4>
        <div className="mt-3 grid gap-4 text-sm text-ink/70 dark:text-white/80 md:grid-cols-[1fr_auto] md:items-start">
          <div className="space-y-2">
            {contact.email ? <p>Email: {contact.email}</p> : null}
            {contact.phone ? <p>Phone: {contact.phone}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {contact.linkedin ? (
              <a
                className="rounded-full border border-ink/20 px-3 py-1 font-semibold text-ink/80 transition hover:-translate-y-0.5 dark:border-white/20 dark:text-white"
                href={normalizeUrl(contact.linkedin)}
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn
              </a>
            ) : null}
          </div>
          {!contact.email && !contact.phone && !contact.linkedin ? (
            <p className="text-sm text-ink/60 dark:text-white/70">No contact details yet.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
