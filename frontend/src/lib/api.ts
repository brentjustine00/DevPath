const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000"

const TOKEN_KEY = "devpath_token"
const USERNAME_KEY = "devpath_username"

export function setStoredAuth(token: string, username: string) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  }
  if (username) {
    localStorage.setItem(USERNAME_KEY, username)
  }
}

export function getStoredAuth() {
  return {
    token: localStorage.getItem(TOKEN_KEY) || "",
    username: localStorage.getItem(USERNAME_KEY) || "",
  }
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USERNAME_KEY)
}

function normalizeProfile(raw: {
  username: string
  display_name?: string | null
  bio?: string | null
  avatar_url: string
  level: number
  xp: number
  next_level_xp: number
  streak_days: number
}) {
  return {
    username: raw.username,
    displayName: raw.display_name || raw.username,
    bio: raw.bio || "",
    avatarUrl: raw.avatar_url,
    level: raw.level,
    xp: raw.xp,
    nextLevelXp: raw.next_level_xp,
    streakDays: raw.streak_days,
  }
}

function normalizeResponse(data: {
  profile: {
    username: string
    display_name?: string | null
    bio?: string | null
    avatar_url: string
    level: number
    xp: number
    next_level_xp: number
    streak_days: number
  }
  practice_dimensions: Array<{
    label: string
    confidence: number
    evidence: string[]
  }>
  career_suggestions: Array<{
    title: string
    confidence: number
    reasoning: string
  }>
  badges: Array<{
    label: string
    description: string
    criteria: string
    rarity: "common" | "rare" | "epic"
    achieved?: boolean
    claimed?: boolean
  }>
  repos: Array<{
    name: string
    description?: string | null
    language?: string | null
    stars: number
    last_push?: string | null
    commit_count?: number
  }>
}) {
  return {
    profile: normalizeProfile(data.profile),
    practice_dimensions: data.practice_dimensions,
    career_suggestions: data.career_suggestions,
    badges: data.badges,
    repos: data.repos.map((repo) => ({
      name: repo.name,
      description: repo.description || "",
      language: repo.language || "Unknown",
      stars: repo.stars,
      last_push: repo.last_push || undefined,
      commitCount: repo.commit_count,
    })),
  }
}

export async function getGithubLoginUrl(): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/github/login`)
  if (!response.ok) {
    throw new Error("Unable to start GitHub login")
  }
  const data = (await response.json()) as { url: string }
  return data.url
}

export async function fetchUser(username: string) {
  const response = await fetch(`${API_BASE}/api/user/${username}`)
  if (!response.ok) {
    throw new Error("Failed to fetch user")
  }
  const data = await response.json()
  return normalizeResponse(data)
}

export async function fetchPortfolio(username: string) {
  const response = await fetch(`${API_BASE}/api/portfolio/${username}`)
  if (!response.ok) {
    throw new Error("Failed to fetch portfolio")
  }
  const data = await response.json()
  return {
    ...normalizeResponse(data),
    settings: data.settings || {},
  }
}

export async function fetchOwnerPortfolio(token: string) {
  const response = await fetch(`${API_BASE}/api/user/me/portfolio`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) {
    throw new Error("Failed to fetch owner portfolio")
  }
  const data = await response.json()
  return {
    ...normalizeResponse(data),
    settings: data.settings || {},
  }
}

export async function registerUser(token: string, payload: { display_name?: string; bio?: string }) {
  const response = await fetch(`${API_BASE}/api/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error("Failed to register user")
  }
  return response.json()
}

export async function fetchLeaderboard() {
  const response = await fetch(`${API_BASE}/api/leaderboard`)
  if (!response.ok) {
    throw new Error("Failed to fetch leaderboard")
  }
  const data = (await response.json()) as Array<{
    id: number
    username: string
    avatar_url: string
    level: number
    xp: number
    delta: string
  }>
  return data.map((entry) => ({
    id: String(entry.id),
    username: entry.username,
    avatarUrl: entry.avatar_url,
    level: entry.level,
    xp: entry.xp,
    delta: entry.delta,
  }))
}

export async function updateSettings(
  token: string,
  payload: {
    theme?: string
    theme_light?: string
    theme_dark?: string
    show_sections?: Record<string, boolean>
    featured_repos?: string[]
    featured_badges?: string[]
    social_links?: Record<string, string>
    bio?: string
    cover_image?: string
    is_public?: boolean
  }
) {
  const response = await fetch(`${API_BASE}/api/user/settings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error("Failed to update settings")
  }
  const data = await response.json()
  return {
    ...normalizeResponse(data),
    settings: data.settings || {},
  }
}

export async function recomputeInsights(token: string) {
  const response = await fetch(`${API_BASE}/api/user/recompute`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) {
    throw new Error("Failed to recompute insights")
  }
  const data = await response.json()
  return normalizeResponse(data)
}

export async function claimBadges(token: string) {
  const response = await fetch(`${API_BASE}/api/user/claim-badges`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) {
    throw new Error("Failed to claim badges")
  }
  const data = await response.json()
  return normalizeResponse(data)
}
