from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    created_at: datetime
    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str


class SetupStatus(BaseModel):
    needs_setup: bool


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


# ── Teams ─────────────────────────────────────────────────────────────────────

class TeamResponse(BaseModel):
    id: int
    name: str
    short_name: Optional[str]
    country: Optional[str]
    crest_url: Optional[str]
    team_type: Optional[str]
    football_data_id: Optional[int]
    api_football_id: Optional[int]
    espn_id: Optional[int] = None
    is_followed: bool = False
    linked_competitions: list[str] = []
    model_config = {"from_attributes": True}


class TeamSearchResult(BaseModel):
    name: str
    short_name: Optional[str]
    country: Optional[str]
    crest_url: Optional[str]
    team_type: Optional[str]
    football_data_id: Optional[int]
    api_football_id: Optional[int]
    source: str  # 'football_data' | 'api_football'
    already_followed: bool = False
    internal_id: Optional[int] = None


class FollowTeamRequest(BaseModel):
    name: str
    short_name: Optional[str] = None
    country: Optional[str] = None
    crest_url: Optional[str] = None
    team_type: Optional[str] = None
    football_data_id: Optional[int] = None
    api_football_id: Optional[int] = None


# ── Competitions ──────────────────────────────────────────────────────────────

class CompetitionResponse(BaseModel):
    id: int
    name: str
    short_name: Optional[str]
    country: Optional[str]
    emblem_url: Optional[str]
    competition_type: Optional[str]
    football_data_id: Optional[str]
    api_football_id: Optional[int]
    preferred_source: str
    season: Optional[int]
    model_config = {"from_attributes": True}


# ── Fixtures ──────────────────────────────────────────────────────────────────

class TeamRef(BaseModel):
    id: Optional[int]
    name: str
    short_name: Optional[str]
    crest_url: Optional[str]


class CompetitionRef(BaseModel):
    id: Optional[int]
    name: str
    emblem_url: Optional[str]


class FixtureOut(BaseModel):
    id: str  # "{source}:{external_id}"
    external_id: int
    source: str
    utc_date: str  # ISO8601
    status: str
    minute: Optional[int]
    home_team: TeamRef
    away_team: TeamRef
    competition: CompetitionRef
    score_home: Optional[int]
    score_away: Optional[int]
    score_ht_home: Optional[int]
    score_ht_away: Optional[int]
    matchday: Optional[int]
    venue: Optional[str]


# ── Standings ─────────────────────────────────────────────────────────────────

class StandingEntry(BaseModel):
    position: int
    team_name: str
    team_crest: Optional[str]
    played: int
    won: int
    draw: int
    lost: int
    goals_for: int
    goals_against: int
    goal_difference: int
    points: int
    form: Optional[str]


class StandingsOut(BaseModel):
    competition: CompetitionRef
    season: Optional[int]
    stage: Optional[str]
    group: Optional[str]
    table: List[StandingEntry]
    cached_at: str
    source: str


# ── Match Detail ──────────────────────────────────────────────────────────────

class MatchEvent(BaseModel):
    minute: Optional[int]
    extra_time: Optional[int]
    type: str  # 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'var'
    team: str
    player: Optional[str]
    assist: Optional[str]
    detail: Optional[str]


class MatchStats(BaseModel):
    team: str
    possession: Optional[str]
    shots: Optional[int]
    shots_on_target: Optional[int]
    corners: Optional[int]
    fouls: Optional[int]
    yellow_cards: Optional[int]
    red_cards: Optional[int]
    offsides: Optional[int]
    saves: Optional[int]


class MatchLineupPlayer(BaseModel):
    name: str
    number: Optional[int]
    position: Optional[str]
    grid: Optional[str]


class MatchLineup(BaseModel):
    team: str
    formation: Optional[str]
    starting_xi: List[MatchLineupPlayer]
    substitutes: List[MatchLineupPlayer]


class MatchDetailOut(BaseModel):
    fixture: FixtureOut
    events: List[MatchEvent]
    stats: List[MatchStats]
    lineups: List[MatchLineup]
    cached_at: str
    source: str


# ── Admin ─────────────────────────────────────────────────────────────────────

class UsageEntry(BaseModel):
    date: str
    source: str
    request_count: int


class UsageResponse(BaseModel):
    today: List[UsageEntry]
    recent: List[UsageEntry]
