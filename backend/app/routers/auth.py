from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token
from app.db import get_db
from app.models import Badge, CareerSuggestion, PracticeDimension, Repo, User, PortfolioSettings
from app.services.github import (
    exchange_code_for_token,
    fetch_github_user,
    fetch_repo_commit_count,
    fetch_repos,
    fetch_repo_languages,
    summarize_repo,
)
from app.services.gamification import compute_xp_and_badges
from app.services.groq import infer_practice_and_careers


router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/github/login")
def github_login():
    url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={settings.github_client_id}"
        f"&redirect_uri={settings.github_redirect_uri}"
        "&scope=read:user%20repo"
    )
    return {"url": url}


@router.get("/github/callback")
def github_callback(code: str = Query(...), db: Session = Depends(get_db)):
    try:
        token = exchange_code_for_token(
            settings.github_client_id,
            settings.github_client_secret,
            code,
            settings.github_redirect_uri,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    gh_user = fetch_github_user(token)

    github_id = str(gh_user["id"])
    username = gh_user["login"]
    avatar_url = gh_user.get("avatar_url") or ""
    display_name = gh_user.get("name")
    bio = gh_user.get("bio")

    user = db.query(User).filter(User.github_id == github_id).one_or_none()
    is_new = False
    if not user:
        user = User(
            github_id=github_id,
            username=username,
            avatar_url=avatar_url,
            display_name=display_name,
            bio=bio,
            github_token=token,
        )
        db.add(user)
        db.flush()
        db.add(PortfolioSettings(user_id=user.id))
        is_new = True
    else:
        user.github_token = token

    repos_raw = fetch_repos(token)
    summaries = []
    for repo in repos_raw:
        full_name = repo.get("full_name", "")
        languages = fetch_repo_languages(token, repo.get("full_name", ""))
        commit_count = fetch_repo_commit_count(full_name, username, token=token)
        summaries.append(summarize_repo(repo, languages, commit_count=commit_count))

    db.query(Repo).filter(Repo.user_id == user.id).delete()
    for repo in summaries:
        db.add(Repo(user_id=user.id, **repo))

    if settings.inference_mode == "groq":
        inference = infer_practice_and_careers(settings.groq_api_key or "", settings.groq_model, summaries)
        db.query(PracticeDimension).filter(PracticeDimension.user_id == user.id).delete()
        for item in inference.get("practice_dimensions", []):
            db.add(
                PracticeDimension(
                    user_id=user.id,
                    label=item["label"],
                    confidence=item["confidence"],
                    evidence=item.get("evidence", []),
                )
            )
        db.query(CareerSuggestion).filter(CareerSuggestion.user_id == user.id).delete()
        for item in inference.get("career_suggestions", []):
            db.add(
                CareerSuggestion(
                    user_id=user.id,
                    title=item["title"],
                    confidence=item["confidence"],
                    reasoning=item["reasoning"],
                )
            )

    gamification = compute_xp_and_badges(summaries)
    existing_badges = {
        badge.label: badge for badge in db.query(Badge).filter(Badge.user_id == user.id).all()
    }
    seen_labels: set[str] = set()
    for badge in gamification.badges:
        seen_labels.add(badge["label"])
        existing = existing_badges.get(badge["label"])
        if existing:
            existing.description = badge["description"]
            existing.criteria = badge["criteria"]
            existing.rarity = badge["rarity"]
            existing.achieved = badge["achieved"]
            if badge["achieved"] is False:
                existing.claimed = False
        else:
            db.add(
                Badge(
                    user_id=user.id,
                    label=badge["label"],
                    description=badge["description"],
                    criteria=badge["criteria"],
                    rarity=badge["rarity"],
                    achieved=badge["achieved"],
                    claimed=False,
                )
            )

    for label, stale in existing_badges.items():
        if label not in seen_labels:
            db.delete(stale)

    db.commit()

    jwt_token = create_access_token(str(user.id), settings.jwt_secret, settings.jwt_issuer)
    if is_new:
        redirect_url = (
            f"{settings.frontend_url}/register?token={jwt_token}"
            f"&username={user.username}"
            f"&avatar={user.avatar_url}"
            f"&display_name={user.display_name or ''}"
            f"&bio={user.bio or ''}"
        )
    else:
        redirect_url = f"{settings.frontend_url}/dashboard?token={jwt_token}&username={user.username}"

    return RedirectResponse(url=redirect_url)
