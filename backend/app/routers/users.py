from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.db import get_db
from app.models import Badge, CareerSuggestion, PracticeDimension, Repo, User, PortfolioSettings
from app.schemas import (
    PortfolioResponse,
    PortfolioSettingsIn,
    UserResponse,
    RegistrationIn,
    LeaderboardEntryOut,
)
from app.services.github import fetch_public_repo_languages, fetch_public_repos, summarize_repo
from app.services.groq import infer_practice_and_careers
from app.services.gamification import badge_reward_xp, badge_visuals, compute_xp_and_badges


router = APIRouter(prefix="/api", tags=["users"])


def _badge_bonus_xp(badges: list[Badge]) -> int:
    return sum(badge_reward_xp(item.rarity) for item in badges if item.claimed)


def _badge_payload(item: Badge) -> dict:
    visuals = badge_visuals(item.label, item.rarity)
    reward_xp = badge_reward_xp(item.rarity)
    return {
        "label": item.label,
        "description": item.description,
        "criteria": item.criteria,
        "rarity": item.rarity,
        "achieved": item.achieved,
        "claimed": item.claimed,
        "reward_xp": reward_xp,
        **visuals,
    }


def _sync_badges(db: Session, user_id: int, generated_badges: list[dict]) -> None:
    existing_badges = {
        badge.label: badge
        for badge in db.query(Badge).filter(Badge.user_id == user_id).all()
    }
    seen_labels: set[str] = set()
    for badge in generated_badges:
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
                    user_id=user_id,
                    label=badge["label"],
                    description=badge["description"],
                    criteria=badge["criteria"],
                    rarity=badge["rarity"],
                    achieved=badge["achieved"],
                    claimed=badge.get("claimed", False),
                )
            )

    for label, stale in existing_badges.items():
        if label not in seen_labels:
            db.delete(stale)


@router.get("/user/{username}", response_model=UserResponse)
def get_user(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    repos = db.query(Repo).filter(Repo.user_id == user.id).all()
    gamification = compute_xp_and_badges([repo.__dict__ for repo in repos])
    practice_rows = db.query(PracticeDimension).filter(PracticeDimension.user_id == user.id).all()
    career_rows = db.query(CareerSuggestion).filter(CareerSuggestion.user_id == user.id).all()

    if not practice_rows or not career_rows:
        summaries = [
            {
                "name": repo.name,
                "description": repo.description,
                "language": repo.language,
                "languages": repo.languages,
                "stars": repo.stars,
                "topics": repo.topics,
                "last_push": repo.last_push,
                "commit_count": repo.commit_count,
            }
            for repo in repos
        ]
        inference = infer_practice_and_careers(
            settings.groq_api_key or "", settings.groq_model, summaries
        )
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
        db.commit()
        practice_rows = db.query(PracticeDimension).filter(PracticeDimension.user_id == user.id).all()
        career_rows = db.query(CareerSuggestion).filter(CareerSuggestion.user_id == user.id).all()

    badge_rows = db.query(Badge).filter(Badge.user_id == user.id).all()
    bonus_xp = _badge_bonus_xp(badge_rows)
    total_xp = gamification.xp + bonus_xp
    level = max(1, total_xp // 500 + 1)
    next_level_xp = level * 500

    return {
        "profile": {
            "username": user.username,
            "display_name": user.display_name,
            "bio": user.bio,
            "avatar_url": user.avatar_url,
            "level": level,
            "xp": total_xp,
            "next_level_xp": next_level_xp,
            "streak_days": gamification.streak_days,
        },
        "practice_dimensions": [
            {"label": item.label, "confidence": item.confidence, "evidence": item.evidence}
            for item in practice_rows
        ],
        "career_suggestions": [
            {"title": item.title, "confidence": item.confidence, "reasoning": item.reasoning}
            for item in career_rows
        ],
        "badges": [_badge_payload(item) for item in badge_rows],
        "repos": [
            {
                "name": repo.name,
                "description": repo.description,
                "language": repo.language,
                "languages": repo.languages,
                "stars": repo.stars,
                "last_push": repo.last_push if repo.last_push else None,
                "commit_count": repo.commit_count,
            }
            for repo in repos
        ],
    }


@router.put("/user/settings", response_model=PortfolioResponse)
def update_settings(
    payload: PortfolioSettingsIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload:
        raise HTTPException(status_code=400, detail="Missing payload")

    settings = (
        db.query(PortfolioSettings).filter(PortfolioSettings.user_id == current_user.id).one_or_none()
    )
    if not settings:
        settings = PortfolioSettings(user_id=current_user.id)
        db.add(settings)

    updates = payload.model_dump(exclude_unset=True)
    if "show_sections" in updates:
        current = settings.show_sections or {}
        merged = {**current, **(updates.get("show_sections") or {})}
        updates["show_sections"] = merged

    for field, value in updates.items():
        setattr(settings, field, value)

    db.commit()
    db.refresh(settings)

    response = get_user(current_user.username, db)
    return {
        **response,
        "settings": {
            "theme": settings.theme,
            "theme_light": settings.theme_light,
            "theme_dark": settings.theme_dark,
            "section_order": settings.section_order,
            "show_sections": settings.show_sections or {"badges": True, "repos": True, "preview_dark": False},
            "featured_repos": settings.featured_repos,
            "featured_badges": settings.featured_badges,
            "social_links": settings.social_links,
            "bio": settings.bio,
            "cover_image": settings.cover_image,
            "is_public": settings.is_public,
        },
    }


@router.post("/register", response_model=UserResponse)
def register(payload: RegistrationIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if payload.display_name is not None:
        current_user.display_name = payload.display_name
    if payload.bio is not None:
        current_user.bio = payload.bio
    db.commit()
    db.refresh(current_user)
    return get_user(current_user.username, db)


@router.post("/user/recompute", response_model=UserResponse)
def recompute_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        repos_raw = fetch_public_repos(current_user.username)
        summaries = []
        for repo in repos_raw:
            languages = fetch_public_repo_languages(repo.get("full_name", ""))
            summaries.append(summarize_repo(repo, languages))
        db.query(Repo).filter(Repo.user_id == current_user.id).delete()
        for repo in summaries:
            db.add(Repo(user_id=current_user.id, **repo))
        db.flush()
    except Exception:
        # Fallback to last synced repos when GitHub is temporarily unavailable.
        repos = db.query(Repo).filter(Repo.user_id == current_user.id).all()
        summaries = [
            {
                "name": repo.name,
                "description": repo.description,
                "language": repo.language,
                "languages": repo.languages,
                "stars": repo.stars,
                "topics": repo.topics,
                "last_push": repo.last_push,
                "commit_count": repo.commit_count,
            }
            for repo in repos
        ]

    if "summaries" not in locals():
        summaries = []

    if not summaries:
        repos = db.query(Repo).filter(Repo.user_id == current_user.id).all()
        summaries = [
            {
                "name": repo.name,
                "description": repo.description,
                "language": repo.language,
                "languages": repo.languages,
                "stars": repo.stars,
                "topics": repo.topics,
                "last_push": repo.last_push,
                "commit_count": repo.commit_count,
            }
            for repo in repos
        ]

    inference = infer_practice_and_careers(
        settings.groq_api_key or "", settings.groq_model, summaries
    )
    db.query(PracticeDimension).filter(PracticeDimension.user_id == current_user.id).delete()
    for item in inference.get("practice_dimensions", []):
        db.add(
            PracticeDimension(
                user_id=current_user.id,
                label=item["label"],
                confidence=item["confidence"],
                evidence=item.get("evidence", []),
            )
        )
    db.query(CareerSuggestion).filter(CareerSuggestion.user_id == current_user.id).delete()
    for item in inference.get("career_suggestions", []):
        db.add(
            CareerSuggestion(
                user_id=current_user.id,
                title=item["title"],
                confidence=item["confidence"],
                reasoning=item["reasoning"],
            )
        )

    gamification = compute_xp_and_badges(summaries)
    _sync_badges(db, current_user.id, gamification.badges)

    db.commit()
    return get_user(current_user.username, db)


@router.post("/user/claim-badges", response_model=UserResponse)
def claim_badges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updated_rows = db.query(Badge).filter(
        Badge.user_id == current_user.id, Badge.achieved.is_(True), Badge.claimed.is_(False)
    ).update({Badge.claimed: True})
    db.commit()
    return get_user(current_user.username, db)


@router.get("/portfolio/{username}", response_model=PortfolioResponse)
def get_portfolio(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    settings = db.query(PortfolioSettings).filter(PortfolioSettings.user_id == user.id).one_or_none()
    if not settings or not settings.is_public:
        raise HTTPException(status_code=404, detail="Portfolio not public")

    response = get_user(username, db)
    return {
        **response,
        "settings": {
            "theme": settings.theme,
            "theme_light": settings.theme_light,
            "theme_dark": settings.theme_dark,
            "section_order": settings.section_order,
            "show_sections": settings.show_sections or {"badges": True, "repos": True, "preview_dark": False},
            "featured_repos": settings.featured_repos,
            "featured_badges": settings.featured_badges,
            "social_links": settings.social_links,
            "bio": settings.bio,
            "cover_image": settings.cover_image,
            "is_public": settings.is_public,
        },
    }


@router.get("/user/me/portfolio", response_model=PortfolioResponse)
def get_owner_portfolio(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    settings = (
        db.query(PortfolioSettings).filter(PortfolioSettings.user_id == current_user.id).one_or_none()
    )
    if not settings:
        settings = PortfolioSettings(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    response = get_user(current_user.username, db)
    return {
        **response,
        "settings": {
            "theme": settings.theme,
            "theme_light": settings.theme_light,
            "theme_dark": settings.theme_dark,
            "section_order": settings.section_order,
            "show_sections": settings.show_sections or {"badges": True, "repos": True, "preview_dark": False},
            "featured_repos": settings.featured_repos,
            "featured_badges": settings.featured_badges,
            "social_links": settings.social_links,
            "bio": settings.bio,
            "cover_image": settings.cover_image,
            "is_public": settings.is_public,
        },
    }


@router.get("/leaderboard", response_model=list[LeaderboardEntryOut])
def get_leaderboard(db: Session = Depends(get_db)):
    users = db.query(User).all()
    entries: list[LeaderboardEntryOut] = []
    for user in users:
        repos = db.query(Repo).filter(Repo.user_id == user.id).all()
        gamification = compute_xp_and_badges([repo.__dict__ for repo in repos])
        badge_rows = db.query(Badge).filter(Badge.user_id == user.id).all()
        total_xp = gamification.xp + _badge_bonus_xp(badge_rows)
        level = max(1, total_xp // 500 + 1)
        entries.append(
            LeaderboardEntryOut(
                id=user.id,
                username=user.username,
                avatar_url=user.avatar_url,
                level=level,
                xp=total_xp,
                delta="+0 XP",
            )
        )
    entries.sort(key=lambda entry: entry.xp, reverse=True)
    return entries
