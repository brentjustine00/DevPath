from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.db import Base, engine
from app.routers import auth, users


Base.metadata.create_all(bind=engine)

# Lightweight SQLite migration for older local DBs.
if engine.url.get_backend_name() == "sqlite":
    with engine.begin() as conn:
        cols = [row[1] for row in conn.execute(text("PRAGMA table_info(users)"))]
        if "github_token" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN github_token TEXT"))

app = FastAPI(title="DevPath API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)


@app.get("/health")
def health():
    return {"status": "ok"}
