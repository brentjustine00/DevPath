import { useEffect, useState } from "react"
import { NavLink } from "react-router-dom"
import { clearStoredAuth, getGithubLoginUrl, getStoredAuth } from "../lib/api"

const navLinkClass =
  "rounded-full px-4 py-2 text-sm font-medium transition hover:bg-ink/10 dark:hover:bg-white/10"

export default function Navbar() {
  const [username, setUsername] = useState("")
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const stored = getStoredAuth()
    if (stored.username) {
      setUsername(stored.username)
    }
    const savedTheme = localStorage.getItem("devpath_theme")
    const dark = savedTheme === "dark"
    setIsDark(dark)
    document.documentElement.classList.toggle("dark", dark)
  }, [])

  return (
    <nav className="sticky top-0 z-30 border-b border-ink/10 bg-white/70 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-paper dark:bg-slate-100 dark:text-slate-900 dark:invert">
            <span className="font-serif text-lg">D</span>
          </div>
          <div>
            <p className="text-sm font-semibold">DevPath</p>
            <p className="text-xs text-ink/60">AI Portfolio</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          {!username ? (
            <NavLink className={navLinkClass} to="/">
              Landing
            </NavLink>
          ) : null}
          <NavLink className={navLinkClass} to={username ? `/dashboard?username=${username}` : "/dashboard"}>
            Dashboard
          </NavLink>
          <NavLink className={navLinkClass} to="/learning-paths">
            Learning Paths
          </NavLink>
          <NavLink className={navLinkClass} to="/leaderboard">
            Leaderboard
          </NavLink>
          <NavLink className={navLinkClass} to="/achievements">
            Achievements
          </NavLink>
          <NavLink className={navLinkClass} to={username ? "/my-portfolio" : "/portfolio/nova-dev"}>
            Portfolio
          </NavLink>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="rounded-full border border-ink/20 px-4 py-2 text-xs font-semibold text-ink/70 transition hover:-translate-y-0.5 dark:border-white/20 dark:text-white/80"
            onClick={() => {
              const next = !isDark
              setIsDark(next)
              localStorage.setItem("devpath_theme", next ? "dark" : "light")
              document.documentElement.classList.toggle("dark", next)
            }}
          >
            {isDark ? "Light mode" : "Dark mode"}
          </button>
          {username ? (
            <button
              className="rounded-full border border-ink/20 px-5 py-2 text-sm font-semibold text-ink/70 transition hover:-translate-y-0.5 dark:border-white/20 dark:text-white/80"
              onClick={() => {
                clearStoredAuth()
                window.location.href = "/"
              }}
            >
              Log out
            </button>
          ) : (
            <button
              className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper transition hover:-translate-y-0.5 hover:shadow-glow dark:bg-slate-100 dark:text-slate-900"
              onClick={async () => {
                const url = await getGithubLoginUrl()
                window.location.href = url
              }}
            >
              GitHub Login
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
