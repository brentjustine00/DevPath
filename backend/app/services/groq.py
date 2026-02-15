import json
import logging
from collections import Counter
import requests

logger = logging.getLogger(__name__)

LANGUAGE_GROUPS = {
    "frontend": {"JavaScript", "TypeScript", "HTML", "CSS", "Vue", "Svelte"},
    "backend": {
        "Python",
        "C#",
        "Java",
        "Go",
        "Ruby",
        "PHP",
        "Node",
        "Node.js",
        "SQL",
        "PostgreSQL",
        "SQLite",
    },
    "data": {"Jupyter Notebook", "Python", "R", "SQL", "PostgreSQL", "SQLite"},
    "systems": {"C", "C++", "Rust"},
}


def _dedupe_evidence(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        if not item or item in seen:
            continue
        seen.add(item)
        result.append(item)
    return result


def _normalize_inference(payload: dict) -> dict:
    practice = payload.get("practice_dimensions", []) or []
    careers = payload.get("career_suggestions", []) or []
    for item in practice:
        evidence = item.get("evidence", []) or []
        label = (item.get("label") or "").lower()
        group = None
        if "frontend" in label:
            group = "frontend"
        elif "backend" in label:
            group = "backend"
        elif "data" in label or "ml" in label:
            group = "data"
        elif "systems" in label or "tooling" in label:
            group = "systems"
        if group:
            allowed = LANGUAGE_GROUPS[group]
            filtered = [lang for lang in evidence if lang in allowed]
            item["evidence"] = _dedupe_evidence(filtered)[:3]
        else:
            item["evidence"] = _dedupe_evidence(evidence)[:3]
    return {
        "practice_dimensions": practice,
        "career_suggestions": careers,
    }


def _heuristic_inference(repos: list[dict]) -> dict:
    def normalize_language(value: str | None) -> str:
        if not value:
            return "Unknown"
        if value.lower() == "jupyter notebook":
            return "Python"
        return value

    languages = []
    for repo in repos:
        repo_languages = repo.get("languages") or []
        if isinstance(repo_languages, list) and repo_languages:
            languages.extend([normalize_language(lang) for lang in repo_languages])
        else:
            languages.append(normalize_language(repo.get("language")))
    lang_counts = Counter(languages)
    total = max(1, sum(lang_counts.values()))

    def unique_evidence(allowed: set[str]) -> list[str]:
        seen: set[str] = set()
        result: list[str] = []
        for lang in languages:
            if lang in allowed and lang not in seen:
                seen.add(lang)
                result.append(lang)
            if len(result) >= 3:
                break
        return result

    def confidence_for(group: str) -> int:
        hits = sum(count for lang, count in lang_counts.items() if lang in LANGUAGE_GROUPS[group])
        return min(100, max(30, int((hits / total) * 120)))

    practice_dimensions = [
        {
            "label": "Frontend Craft",
            "confidence": confidence_for("frontend"),
            "evidence": unique_evidence(LANGUAGE_GROUPS["frontend"]),
        },
        {
            "label": "Backend Systems",
            "confidence": confidence_for("backend"),
            "evidence": unique_evidence(LANGUAGE_GROUPS["backend"]),
        },
        {
            "label": "Data & ML",
            "confidence": confidence_for("data"),
            "evidence": unique_evidence(LANGUAGE_GROUPS["data"]),
        },
        {
            "label": "Systems & Tooling",
            "confidence": confidence_for("systems"),
            "evidence": unique_evidence(LANGUAGE_GROUPS["systems"]),
        },
    ]

    career_suggestions = [
        {
            "title": "Full-Stack Engineer",
            "confidence": min(100, int((practice_dimensions[0]["confidence"] + practice_dimensions[1]["confidence"]) / 2)),
            "reasoning": "Balanced frontend and backend repo activity suggests end-to-end product delivery.",
        },
        {
            "title": "Frontend Engineer",
            "confidence": practice_dimensions[0]["confidence"],
            "reasoning": "Higher signal from web-focused languages and UI-heavy repositories.",
        },
        {
            "title": "Data Analyst",
            "confidence": practice_dimensions[2]["confidence"],
            "reasoning": "Notebook-heavy repos indicate data exploration and analysis practice.",
        },
    ]

    practice_dimensions = [item for item in practice_dimensions if item["confidence"] >= 30]
    career_suggestions = [item for item in career_suggestions if item["confidence"] >= 30]

    return _normalize_inference(
        {
            "practice_dimensions": practice_dimensions[:4],
            "career_suggestions": career_suggestions[:3],
        }
    )


def infer_practice_and_careers(
    api_key: str,
    model: str,
    repos: list[dict],
) -> dict:
    if not api_key:
        return _heuristic_inference(repos)

    prompt = {
        "role": "user",
        "content": (
            "You are an AI career and practice analyzer. "
            "Analyze the user's GitHub repos and infer practice dimensions "
            "and career suggestions. Return JSON with keys: practice_dimensions "
            "(array of {label, confidence, evidence}) and career_suggestions "
            "(array of {title, confidence, reasoning}). "
            "Confidence is 0-100. Evidence is a short list of repo signals.\n\n"
            f"Repos: {json.dumps(repos)}"
        ),
    }

    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": [prompt],
            "temperature": 0.4,
        },
        timeout=30,
    )
    try:
        response.raise_for_status()
    except requests.HTTPError:
        logger.warning("Groq inference failed: %s %s", response.status_code, response.text[:400])
        return _heuristic_inference(repos)
    data = response.json()
    content = data["choices"][0]["message"]["content"]
    try:
        data = json.loads(content)
        return _normalize_inference(data)
    except json.JSONDecodeError:
        return _heuristic_inference(repos)
