# DevPath

DevPath is a full-stack AI-powered student portfolio platform.
It uses GitHub OAuth, repository analysis, explainable AI insights, and deterministic gamification.

## Stack

- Frontend: React, TypeScript, Tailwind CSS, Framer Motion, Vite
- Backend: FastAPI, SQLAlchemy
- Local DB: SQLite (`backend/devpath.db`)
- AI: Groq API (with fallback heuristic)
- Optional production DB: Supabase Postgres

## Features

- GitHub login and registration flow
- Repo sync and analyzer
- AI practice dimensions with confidence and evidence
- AI career suggestions with reasoning
- Rule-based XP, levels, streaks, badges, achievements
- Achievements claim flow
- Customizable portfolio preview and public share page
- Light/Dark portfolio theme settings
- Leaderboard and multi-page app navigation

## Project Structure

- `backend/` FastAPI app and data logic
- `frontend/` React app
- `supabase/` optional local Supabase config

## Local Setup

### 1) Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Backend runs at `http://127.0.0.1:8000`.

### 2) Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Environment Variables

### Backend (`backend/.env`)

- `DATABASE_URL` (example: `sqlite:///./devpath.db`)
- `JWT_SECRET`
- `FRONTEND_URL`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GROQ_API_KEY`
- `GROQ_MODEL`

See `backend/.env.example`.

### Frontend (`frontend/.env`)

- `VITE_API_BASE=http://localhost:8000`

See `frontend/.env.example`.

## Common Commands

- Recompute insights (authenticated): `POST /api/user/recompute`
- Claim achievements: `POST /api/user/claim-badges`
- User data: `GET /api/user/{username}`
- Public portfolio: `GET /api/portfolio/{username}`

## Deployment Notes

- Frontend target: Vercel
- Backend target: Render
- For Supabase production, use Postgres connection string in `DATABASE_URL`.

## License

Private project by default. Add a license if you plan to open source.
