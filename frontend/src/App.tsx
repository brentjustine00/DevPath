import { Route, Routes, useLocation } from "react-router-dom"
import { useEffect } from "react"
import Footer from "./components/Footer"
import Navbar from "./components/Navbar"
import DashboardPage from "./pages/DashboardPage"
import LandingPage from "./pages/LandingPage"
import LeaderboardPage from "./pages/LeaderboardPage"
import LearningPathsPage from "./pages/LearningPathsPage"
import PublicPortfolioPage from "./pages/PublicPortfolioPage"
import RegisterPage from "./pages/RegisterPage"
import AchievementsPage from "./pages/AchievementsPage"
import { getStoredAuth, setStoredAuth } from "./lib/api"
import NotFoundPage from "./pages/NotFoundPage"

export default function App() {
  const location = useLocation()
  const isPublicPortfolio = location.pathname.startsWith("/p/")
  const auth = getStoredAuth()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const token = params.get("token") || ""
    const username = params.get("username") || ""
    const stored = getStoredAuth()
    // Accept query params only for real auth callback flows (token present).
    // Ignore standalone username query changes to avoid switching accounts unintentionally.
    if (token && username) {
      setStoredAuth(token, username)
      return
    }
    if (token && stored.username) {
      setStoredAuth(token, stored.username)
    }
  }, [location.search])

  useEffect(() => {
    const savedTheme = localStorage.getItem("devpath_theme")
    const shouldBeDark = savedTheme === "dark"
    if (isPublicPortfolio || !shouldBeDark) {
      document.documentElement.classList.remove("dark")
    } else {
      document.documentElement.classList.add("dark")
    }
  }, [isPublicPortfolio])

  return (
    <div className="min-h-screen">
      {!isPublicPortfolio ? <Navbar /> : null}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />
        <Route
          path="/learning-paths"
          element={<LearningPathsPage />}
        />
        <Route
          path="/leaderboard"
          element={<LeaderboardPage />}
        />
        <Route
          path="/achievements"
          element={<AchievementsPage />}
        />
        <Route
          path="/portfolio/:username"
          element={auth.username ? <PublicPortfolioPage mode="owner" /> : <NotFoundPage message="Sign in to view this page." />}
        />
        <Route path="/p/:username" element={<PublicPortfolioPage mode="public" />} />
        <Route
          path="/my-portfolio"
          element={<PublicPortfolioPage mode="owner" />}
        />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {!isPublicPortfolio ? <Footer /> : null}
    </div>
  )
}
