from __future__ import annotations

from collections import Counter
from dataclasses import dataclass


@dataclass
class GamificationResult:
    xp: int
    level: int
    next_level_xp: int
    streak_days: int
    badges: list[dict]


def compute_xp_and_badges(repos: list[dict]) -> GamificationResult:
    commit_counts = [repo.get("commit_count", 0) for repo in repos]
    commit_xp = sum(commit_counts) * 2
    repo_xp = len(repos) * 50
    languages = []
    for repo in repos:
        repo_languages = repo.get("languages") or []
        if isinstance(repo_languages, list) and repo_languages:
            languages.extend([lang for lang in repo_languages if lang])
        else:
            languages.append(repo.get("language") or "Unknown")
    language_counts = Counter(languages)
    language_xp = max(0, len(language_counts) - 1) * 30
    stars_xp = sum(repo.get("stars", 0) for repo in repos)
    xp = commit_xp + repo_xp + language_xp + stars_xp

    level = max(1, xp // 500 + 1)
    next_level_xp = level * 500

    # Without commit history, streaks are unknown.
    streak_days = 0 if sum(commit_counts) == 0 else min(30, max(0, len(repos)))

    def rarity_for(idx: int, total: int) -> str:
        if idx >= total * 0.8:
            return "epic"
        if idx >= total * 0.5:
            return "rare"
        return "common"

    badges: list[dict] = []

    # 25 repo-count achievements
    for i, threshold in enumerate(range(1, 26), start=1):
        badges.append(
            {
                "label": f"Repo Builder {threshold}",
                "description": f"Create {threshold}+ repositories.",
                "criteria": f"Reach {threshold} public repositories.",
                "rarity": rarity_for(i, 25),
                "achieved": len(repos) >= threshold,
                "claimed": False,
            }
        )

    # 25 language diversity achievements
    for i, threshold in enumerate(range(1, 26), start=1):
        badges.append(
            {
                "label": f"Language Explorer {threshold}",
                "description": f"Use {threshold}+ distinct languages.",
                "criteria": f"Reach {threshold} unique languages across repos.",
                "rarity": rarity_for(i, 25),
                "achieved": len(language_counts) >= threshold,
                "claimed": False,
            }
        )

    # 25 commit volume achievements
    for i, threshold in enumerate(range(10, 260, 10), start=1):
        badges.append(
            {
                "label": f"Commit Momentum {threshold}",
                "description": f"Log {threshold}+ commits across repos.",
                "criteria": f"Reach {threshold} total commits.",
                "rarity": rarity_for(i, 25),
                "achieved": sum(commit_counts) >= threshold,
                "claimed": False,
            }
        )

    # 25 star achievements
    for i, threshold in enumerate(range(1, 26), start=1):
        badges.append(
            {
                "label": f"Star Magnet {threshold}",
                "description": f"Earn {threshold}+ stars across repos.",
                "criteria": f"Reach {threshold} total stars.",
                "rarity": rarity_for(i, 25),
                "achieved": stars_xp >= threshold,
                "claimed": False,
            }
        )

    return GamificationResult(
        xp=xp,
        level=level,
        next_level_xp=next_level_xp,
        streak_days=streak_days,
        badges=badges,
    )
