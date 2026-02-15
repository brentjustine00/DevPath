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


def summarize_repo(raw_repo: dict, languages: list[str]) -> dict:
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
        "commit_count": 0,
    }
