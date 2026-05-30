"""
Seeds the competitions table with known competitions from both APIs.
Safe to call on every startup — uses upsert logic.
"""
import logging
from database import SessionLocal
import models

logger = logging.getLogger(__name__)

KNOWN_COMPETITIONS = [
    # football-data.org competitions (preferred_source=football_data)
    {"name": "Premier League",          "short_name": "PL",  "country": "England",       "football_data_id": "PL",  "api_football_id": 39,  "preferred_source": "football_data", "competition_type": "league"},
    {"name": "La Liga",                 "short_name": "PD",  "country": "Spain",         "football_data_id": "PD",  "api_football_id": 140, "preferred_source": "football_data", "competition_type": "league"},
    {"name": "Bundesliga",              "short_name": "BL1", "country": "Germany",       "football_data_id": "BL1", "api_football_id": 78,  "preferred_source": "football_data", "competition_type": "league"},
    {"name": "Serie A",                 "short_name": "SA",  "country": "Italy",         "football_data_id": "SA",  "api_football_id": 135, "preferred_source": "football_data", "competition_type": "league"},
    {"name": "Ligue 1",                 "short_name": "FL1", "country": "France",        "football_data_id": "FL1", "api_football_id": 61,  "preferred_source": "football_data", "competition_type": "league"},
    {"name": "Champions League",        "short_name": "CL",  "country": "Europe",        "football_data_id": "CL",  "api_football_id": 2,   "preferred_source": "football_data", "competition_type": "cup"},
    {"name": "Eredivisie",              "short_name": "DED", "country": "Netherlands",   "football_data_id": "DED", "api_football_id": 88,  "preferred_source": "football_data", "competition_type": "league"},
    {"name": "Primeira Liga",           "short_name": "PPL", "country": "Portugal",      "football_data_id": "PPL", "api_football_id": 94,  "preferred_source": "football_data", "competition_type": "league"},
    {"name": "Championship",            "short_name": "ELC", "country": "England",       "football_data_id": "ELC", "api_football_id": 40,  "preferred_source": "football_data", "competition_type": "league"},
    {"name": "Brazilian Série A",       "short_name": "BSA", "country": "Brazil",        "football_data_id": "BSA", "api_football_id": 71,  "preferred_source": "football_data", "competition_type": "league"},
    {"name": "FIFA World Cup",          "short_name": "WC",  "country": "World",         "football_data_id": "WC",  "api_football_id": 1,   "preferred_source": "football_data", "competition_type": "cup"},
    {"name": "European Championship",   "short_name": "EC",  "country": "Europe",        "football_data_id": "EC",  "api_football_id": 4,   "preferred_source": "football_data", "competition_type": "cup"},
    # API-Football only competitions
    {"name": "AFC Asian Cup",           "short_name": None,  "country": "Asia",          "football_data_id": None,  "api_football_id": 7,   "preferred_source": "api_football",  "competition_type": "cup"},
    {"name": "AFC World Cup Qualifying","short_name": None,  "country": "Asia",          "football_data_id": None,  "api_football_id": 29,  "preferred_source": "api_football",  "competition_type": "cup"},
    {"name": "A-League Men",            "short_name": None,  "country": "Australia",     "football_data_id": None,  "api_football_id": 188, "preferred_source": "api_football",  "competition_type": "league"},
    {"name": "International Friendlies","short_name": None,  "country": "World",         "football_data_id": None,  "api_football_id": 10,  "preferred_source": "api_football",  "competition_type": "cup"},
    {"name": "Europa League",           "short_name": "EL",  "country": "Europe",        "football_data_id": None,  "api_football_id": 3,   "preferred_source": "api_football",  "competition_type": "cup"},
    {"name": "Conference League",       "short_name": "ECL", "country": "Europe",        "football_data_id": None,  "api_football_id": 848, "preferred_source": "api_football",  "competition_type": "cup"},
]


def seed_competitions():
    db = SessionLocal()
    try:
        for comp_data in KNOWN_COMPETITIONS:
            existing = None
            if comp_data.get("football_data_id"):
                existing = db.query(models.Competition).filter(
                    models.Competition.football_data_id == comp_data["football_data_id"]
                ).first()
            if not existing and comp_data.get("api_football_id"):
                existing = db.query(models.Competition).filter(
                    models.Competition.api_football_id == comp_data["api_football_id"]
                ).first()

            if existing:
                for k, v in comp_data.items():
                    if v is not None:
                        setattr(existing, k, v)
            else:
                db.add(models.Competition(**comp_data))

        db.commit()
    except Exception as e:
        logger.error(f"seed_competitions error: {e}")
        db.rollback()
    finally:
        db.close()
