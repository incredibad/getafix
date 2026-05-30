from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text, ForeignKey, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    short_name = Column(String, nullable=True)
    country = Column(String, nullable=True)
    crest_url = Column(String, nullable=True)
    team_type = Column(String, nullable=True)  # 'club' | 'national'
    football_data_id = Column(Integer, nullable=True, index=True)
    api_football_id = Column(Integer, nullable=True, index=True)
    espn_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    followed = relationship("FollowedTeam", back_populates="team", uselist=False)
    competitions = relationship("TeamCompetition", back_populates="team")


class Competition(Base):
    __tablename__ = "competitions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    short_name = Column(String, nullable=True)
    country = Column(String, nullable=True)
    emblem_url = Column(String, nullable=True)
    competition_type = Column(String, nullable=True)  # 'league' | 'cup'
    football_data_id = Column(String, nullable=True, index=True)  # e.g. "PL"
    api_football_id = Column(Integer, nullable=True, index=True)
    preferred_source = Column(String, nullable=False, default="football_data")
    season = Column(Integer, nullable=True)

    teams = relationship("TeamCompetition", back_populates="competition")


class FollowedTeam(Base):
    __tablename__ = "followed_teams"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, unique=True)
    followed_at = Column(DateTime, default=datetime.utcnow)

    team = relationship("Team", back_populates="followed")


class TeamCompetition(Base):
    __tablename__ = "team_competitions"

    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True)
    competition_id = Column(Integer, ForeignKey("competitions.id", ondelete="CASCADE"), primary_key=True)

    team = relationship("Team", back_populates="competitions")
    competition = relationship("Competition", back_populates="teams")


class ApiCache(Base):
    __tablename__ = "api_cache"

    id = Column(Integer, primary_key=True, index=True)
    cache_key = Column(String, unique=True, nullable=False, index=True)
    data_json = Column(Text, nullable=False)
    cached_at = Column(DateTime, nullable=False)
    is_permanent = Column(Boolean, default=False)


class ApiUsage(Base):
    __tablename__ = "api_usage"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, nullable=False)  # YYYY-MM-DD
    source = Column(String, nullable=False)  # 'football_data' | 'api_football'
    request_count = Column(Integer, default=0)

    __table_args__ = (UniqueConstraint("date", "source"),)
