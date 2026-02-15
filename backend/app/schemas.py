from pydantic import BaseModel, Field


class PracticeDimensionOut(BaseModel):
    label: str
    confidence: int = Field(ge=0, le=100)
    evidence: list[str]


class CareerSuggestionOut(BaseModel):
    title: str
    confidence: int = Field(ge=0, le=100)
    reasoning: str


class BadgeOut(BaseModel):
    label: str
    description: str
    criteria: str
    rarity: str
    achieved: bool
    claimed: bool


class RepoOut(BaseModel):
    name: str
    description: str | None = None
    language: str | None = None
    languages: list[str] | None = None
    stars: int
    last_push: str | None = None
    commit_count: int


class UserOut(BaseModel):
    username: str
    display_name: str | None = None
    bio: str | None = None
    avatar_url: str
    level: int
    xp: int
    next_level_xp: int
    streak_days: int


class UserResponse(BaseModel):
    profile: UserOut
    practice_dimensions: list[PracticeDimensionOut]
    career_suggestions: list[CareerSuggestionOut]
    badges: list[BadgeOut]
    repos: list[RepoOut]


class PortfolioSettingsIn(BaseModel):
    theme: str | None = None
    theme_light: str | None = None
    theme_dark: str | None = None
    section_order: list[str] | None = None
    show_sections: dict | None = None
    featured_repos: list[str] | None = None
    featured_badges: list[str] | None = None
    social_links: dict | None = None
    bio: str | None = None
    cover_image: str | None = None
    is_public: bool | None = None


class PortfolioResponse(BaseModel):
    profile: UserOut
    practice_dimensions: list[PracticeDimensionOut]
    career_suggestions: list[CareerSuggestionOut]
    badges: list[BadgeOut]
    repos: list[RepoOut]
    settings: dict


class RegistrationIn(BaseModel):
    display_name: str | None = None
    bio: str | None = None


class LeaderboardEntryOut(BaseModel):
    id: int
    username: str
    avatar_url: str
    level: int
    xp: int
    delta: str
