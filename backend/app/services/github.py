import datetime as dt
import requests


GITHUB_API = "https://api.github.com"


def exchange_code_for_token(client_id: str, client_secret: str, code: str, redirect_uri: str) -> str:
    response = requests.post(
        "https://github.com/login/oauth/access_token",
        headers={"Accept": "application/json"},
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
        },
        timeout=15,
    )
    response.raise_for_status()
    payload = response.json()
    token = payload.get("access_token")
    if not token:
        error = payload.get("error", "unknown_error")
        description = payload.get("error_description", "No access_token returned from GitHub.")
        raise ValueError(f"GitHub OAuth failed: {error} - {description}")
    return token


def fetch_github_user(token: str) -> dict:
    response = requests.get(
        f"{GITHUB_API}/user",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
        timeout=15,
    )
    response.raise_for_status()
    return response.json()


def fetch_repo_languages(token: str, full_name: str) -> list[str]:
    response = requests.get(
        f"{GITHUB_API}/repos/{full_name}/languages",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
        timeout=15,
    )
    if response.status_code != 200:
        return []
    payload = response.json()
    if not isinstance(payload, dict):
        return []
    return list(payload.keys())


def fetch_public_repo_languages(full_name: str) -> list[str]:
    response = requests.get(
        f"{GITHUB_API}/repos/{full_name}/languages",
        headers={"Accept": "application/vnd.github+json"},
        timeout=15,
    )
    if response.status_code != 200:
        return []
    payload = response.json()
    if not isinstance(payload, dict):
        return []
    return list(payload.keys())


def fetch_repos(token: str) -> list[dict]:
    repos = []
    page = 1
    while True:
        response = requests.get(
            f"{GITHUB_API}/user/repos",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
            params={"per_page": 100, "page": page, "sort": "updated"},
            timeout=20,
        )
        response.raise_for_status()
        page_data = response.json()
        repos.extend(page_data)
        if len(page_data) < 100:
            break
        page += 1
    return repos


def fetch_public_repos(username: str) -> list[dict]:
    repos = []
    page = 1
    while True:
        response = requests.get(
            f"{GITHUB_API}/users/{username}/repos",
            headers={"Accept": "application/vnd.github+json"},
            params={"per_page": 100, "page": page, "sort": "updated", "type": "owner"},
            timeout=20,
        )
        response.raise_for_status()
        page_data = response.json()
        repos.extend(page_data)
        if len(page_data) < 100:
            break
        page += 1
    return repos


def fetch_repo_commit_count(full_name: str, username: str, token: str | None = None, max_pages: int = 5) -> int:
    if not full_name:
        return 0
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    # Prefer contributors API: it returns contribution totals per user for this repo.
    contributors_response = requests.get(
        f"{GITHUB_API}/repos/{full_name}/contributors",
        headers=headers,
        params={"per_page": 100, "anon": "1"},
        timeout=20,
    )
    if contributors_response.status_code == 200:
        contributors = contributors_response.json()
        if isinstance(contributors, list):
            target = username.lower()
            for contributor in contributors:
                login = str(contributor.get("login") or "").lower()
                if login == target:
                    try:
                        return int(contributor.get("contributions") or 0)
                    except (TypeError, ValueError):
                        return 0

    # Fallback: paginate all commits when contributors endpoint is unavailable.
    total = 0
    for page in range(1, max_pages + 1):
        response = requests.get(
            f"{GITHUB_API}/repos/{full_name}/commits",
            headers=headers,
            params={"per_page": 100, "page": page},
            timeout=20,
        )
        if response.status_code == 409:
            # Empty repository
            return total
        if response.status_code != 200:
            return total
        page_data = response.json()
        if not isinstance(page_data, list):
            return total
        total += len(page_data)
        if len(page_data) < 100:
            break
    return total


def fetch_commit_streak_days(username: str, token: str | None = None, max_pages: int = 10) -> int:
    if not username:
        return 0
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    commit_days: set[str] = set()
    for page in range(1, max_pages + 1):
        events_url = f"{GITHUB_API}/users/{username}/events" if token else f"{GITHUB_API}/users/{username}/events/public"
        response = requests.get(
            events_url,
            headers=headers,
            params={"per_page": 100, "page": page},
            timeout=20,
        )
        if response.status_code != 200:
            break
        events = response.json()
        if not isinstance(events, list) or not events:
            break
        for event in events:
            if event.get("type") != "PushEvent":
                continue
            created_at = event.get("created_at")
            if created_at:
                commit_days.add(str(created_at)[:10])
        if len(events) < 100:
            break

    if not commit_days:
        return 0

    today = dt.datetime.now(dt.timezone.utc).date()
    start_day = today if today.isoformat() in commit_days else today - dt.timedelta(days=1)
    streak = 0
    cursor = start_day
    while cursor.isoformat() in commit_days:
        streak += 1
        cursor -= dt.timedelta(days=1)
    return streak


def summarize_repo(raw_repo: dict, languages: list[str], commit_count: int = 0) -> dict:
    last_push = raw_repo.get("pushed_at")
    last_push_dt = dt.datetime.fromisoformat(last_push.replace("Z", "+00:00")) if last_push else None
    primary_language = raw_repo.get("language")
    if not primary_language and languages:
        primary_language = languages[0]
    return {
        "name": raw_repo.get("name"),
        "description": raw_repo.get("description"),
        "language": primary_language,
        "languages": languages,
        "stars": raw_repo.get("stargazers_count", 0),
        "topics": raw_repo.get("topics", []),
        "last_push": last_push_dt.isoformat() if last_push_dt else None,
        "commit_count": commit_count,
    }
