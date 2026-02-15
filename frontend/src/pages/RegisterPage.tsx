import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { registerUser, setStoredAuth } from "../lib/api"

export default function RegisterPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get("token") || ""
  const username = params.get("username") || ""
  const avatar = params.get("avatar") || ""
  const defaultName = params.get("display_name") || ""
  const defaultBio = params.get("bio") || ""

  const [displayName, setDisplayName] = useState(defaultName)
  const [bio, setBio] = useState(defaultBio)
  const [loading, setLoading] = useState(false)

  const canSubmit = useMemo(() => Boolean(token), [token])

  useEffect(() => {
    if (token && username) {
      setStoredAuth(token, username)
    }
  }, [token, username])

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="rounded-3xl border border-ink/10 bg-white/70 p-8 shadow-soft backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
        <div className="flex items-center gap-4">
          {avatar ? <img src={avatar} alt={username} className="h-16 w-16 rounded-2xl" /> : null}
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-ink/50 dark:text-white/60">Registration</p>
            <h2 className="text-2xl font-semibold dark:text-white">Welcome, @{username}</h2>
            <p className="text-sm text-ink/60 dark:text-white/70">Complete your profile to finish setup.</p>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <label className="flex flex-col gap-2 text-sm font-medium dark:text-white/80">
            Display name (optional)
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="rounded-2xl border border-ink/10 bg-paper/80 px-4 py-3 text-sm dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-white"
              placeholder="Your name"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium dark:text-white/80">
            Bio (optional)
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              className="min-h-[120px] rounded-2xl border border-ink/10 bg-paper/80 px-4 py-3 text-sm dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-white"
              placeholder="Tell the community what you are building"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            disabled={!canSubmit || loading}
            onClick={async () => {
              setLoading(true)
              await registerUser(token, { display_name: displayName, bio })
              navigate(`/dashboard?token=${token}`)
            }}
            className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper shadow-glow transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900"
          >
            Finish setup
          </button>
          <button
            onClick={() => navigate(`/dashboard?token=${token}`)}
            className="rounded-full border border-ink/20 px-6 py-3 text-sm font-semibold text-ink/70 dark:border-white/20 dark:text-white/80"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
