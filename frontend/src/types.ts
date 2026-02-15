export type PracticeDimension = {
  id?: string
  label: string
  confidence: number
  evidence: string[]
}

export type CareerSuggestion = {
  id?: string
  title: string
  confidence: number
  reasoning: string
}

export type Badge = {
  id?: string
  label: string
  description: string
  criteria: string
  rarity: "common" | "rare" | "epic"
  achieved?: boolean
  claimed?: boolean
}

export type RepoSummary = {
  id?: string
  name: string
  description: string
  language: string
  stars: number
  lastUpdated?: string
  last_push?: string | null
  commitCount?: number
}

export type UserProfile = {
  username: string
  displayName: string
  bio: string
  avatarUrl: string
  level: number
  xp: number
  nextLevelXp: number
  streakDays: number
}

export type LeaderboardEntry = {
  id: string
  username: string
  avatarUrl: string
  level: number
  xp: number
  delta: string
}

export type UserResponse = {
  profile: UserProfile
  practice_dimensions: PracticeDimension[]
  career_suggestions: CareerSuggestion[]
  badges: Badge[]
  repos: RepoSummary[]
}

export type PortfolioResponse = UserResponse & {
  settings: {
    theme?: string
    theme_light?: string
    theme_dark?: string
    section_order?: string[]
    show_sections?: Record<string, boolean>
    featured_repos?: string[]
    featured_badges?: string[]
    social_links?: Record<string, string>
    bio?: string
    cover_image?: string
    is_public?: boolean
  }
}
