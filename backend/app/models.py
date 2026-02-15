from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, JSON, func
from sqlalchemy.orm import relationship

from app.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    github_id = Column(String(64), unique=True, index=True, nullable=False)
    username = Column(String(64), unique=True, index=True, nullable=False)
    avatar_url = Column(Text, nullable=False)
    display_name = Column(String(120), nullable=True)
    bio = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    repos = relationship("Repo", back_populates="user", cascade="all, delete-orphan")
    practice_dimensions = relationship(
        "PracticeDimension", back_populates="user", cascade="all, delete-orphan"
    )
    career_suggestions = relationship(
        "CareerSuggestion", back_populates="user", cascade="all, delete-orphan"
    )
    badges = relationship("Badge", back_populates="user", cascade="all, delete-orphan")
    portfolio_settings = relationship(
        "PortfolioSettings", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )


class Repo(Base):
    __tablename__ = "repos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    language = Column(String(64), nullable=True)
    languages = Column(JSON, default=list)
    stars = Column(Integer, default=0)
    topics = Column(JSON, default=list)
    last_push = Column(Text, nullable=True)
    commit_count = Column(Integer, default=0)

    user = relationship("User", back_populates="repos")


class PracticeDimension(Base):
    __tablename__ = "practice_dimensions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    label = Column(String(120), nullable=False)
    confidence = Column(Integer, nullable=False)
    evidence = Column(JSON, default=list)

    user = relationship("User", back_populates="practice_dimensions")


class CareerSuggestion(Base):
    __tablename__ = "career_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(160), nullable=False)
    confidence = Column(Integer, nullable=False)
    reasoning = Column(Text, nullable=False)

    user = relationship("User", back_populates="career_suggestions")


class Badge(Base):
    __tablename__ = "badges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    label = Column(String(120), nullable=False)
    description = Column(Text, nullable=False)
    criteria = Column(Text, nullable=False)
    rarity = Column(String(20), nullable=False)
    achieved = Column(Boolean, default=False)
    claimed = Column(Boolean, default=False)

    user = relationship("User", back_populates="badges")


class PortfolioSettings(Base):
    __tablename__ = "portfolio_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    theme = Column(String(32), default="aurora")
    theme_light = Column(String(32), default="aurora")
    theme_dark = Column(String(32), default="aurora")
    section_order = Column(JSON, default=list)
    show_sections = Column(JSON, default=lambda: {"badges": True, "repos": True, "preview_dark": False})
    featured_repos = Column(JSON, default=list)
    featured_badges = Column(JSON, default=list)
    social_links = Column(JSON, default=dict)
    bio = Column(Text, nullable=True)
    cover_image = Column(Text, nullable=True)
    is_public = Column(Boolean, default=True)

    user = relationship("User", back_populates="portfolio_settings")
