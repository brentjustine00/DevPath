import type { Badge, CareerSuggestion, PracticeDimension, RepoSummary, UserProfile } from "../types"
import BadgeCard from "./BadgeCard"
import CareerCard from "./CareerCard"
import PathCard from "./PathCard"

type PortfolioPreviewProps = {
  profile: UserProfile
  paths: PracticeDimension[]
  careers: CareerSuggestion[]
  badges: Badge[]
  repos: RepoSummary[]
  enableRepoLinks?: boolean
  showBadgeStatus?: boolean
}

export default function PortfolioPreview({
  profile,
  paths,
  careers,
  badges,
  repos,
  enableRepoLinks = false,
  showBadgeStatus = true,
}: PortfolioPreviewProps) {
  return (
    <div className="rounded-3xl border border-ink/10 bg-white/70 p-6 shadow-soft backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex items-center gap-4">
          <img src={profile.avatarUrl} alt={profile.displayName} className="h-16 w-16 rounded-2xl" />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-ink/50">Portfolio</p>
            <h3 className="text-2xl font-semibold">{profile.displayName}</h3>
            <p className="text-sm text-ink/60">@{profile.username}</p>
          </div>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-3 text-sm text-ink/70">
          <span className="rounded-full border border-ink/10 px-3 py-1">Level {profile.level}</span>
          <span className="rounded-full border border-ink/10 px-3 py-1">
            {profile.xp} XP
          </span>
          <span className="rounded-full border border-ink/10 px-3 py-1">
            {profile.streakDays} day streak
          </span>
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h4 className="text-lg font-semibold">AI Skill Paths</h4>
          <div className="space-y-4">
            {paths.slice(0, 2).map((path) => (
              <PathCard key={path.id} path={path} />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <h4 className="text-lg font-semibold">Career Suggestions</h4>
          <div className="space-y-4">
            {careers.slice(0, 2).map((career) => (
              <CareerCard key={career.id} career={career} />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <h4 className="text-lg font-semibold">Featured Repos</h4>
          <div className="space-y-3">
            {repos.map((repo) => (
              <div
                key={repo.name}
                className="rounded-2xl border border-ink/10 bg-paper/60 p-4 dark:border-slate-700/60 dark:bg-slate-800/70"
              >
                {enableRepoLinks ? (
                  <a
                    href={`https://github.com/${profile.username}/${repo.name}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block transition hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{repo.name}</p>
                        <p className="text-sm text-ink/60">{repo.description}</p>
                      </div>
                      <div className="text-right text-xs text-ink/50">
                        <p>{repo.language}</p>
                        <p>{repo.lastUpdated ?? repo.last_push ?? "recently"}</p>
                      </div>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{repo.name}</p>
                      <p className="text-sm text-ink/60">{repo.description}</p>
                    </div>
                    <div className="text-right text-xs text-ink/50">
                      <p>{repo.language}</p>
                      <p>{repo.lastUpdated ?? repo.last_push ?? "recently"}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <h4 className="text-lg font-semibold">Badges</h4>
          <div className="space-y-3">
            {badges.filter((badge) => badge.achieved || badge.claimed).length === 0 ? (
              <div className="rounded-2xl border border-ink/10 bg-paper/80 p-4 text-sm text-ink/70 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-white/70">
                No badges yet. Keep building — the first badge lands fast with consistent commits.
              </div>
            ) : (
              badges
                .filter((badge) => badge.achieved || badge.claimed)
                .map((badge) => (
                  <BadgeCard key={badge.label} badge={badge} showStatus={showBadgeStatus} />
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
