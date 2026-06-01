"""
Seeds the competitions table with known competitions.
Safe to call on every startup — uses upsert logic (match by football_data_id,
then api_football_id, then name).
"""
import logging
from database import SessionLocal
import models

logger = logging.getLogger(__name__)

# preferred_source="sofascore" everywhere; espn_slug kept as fallback.
# football_data_id/api_football_id retained for reference only.
KNOWN_COMPETITIONS = [
    # ── Top European leagues ───────────────────────────────────────────────────
    {"name": "Premier League",               "short_name": "PL",    "country": "England",       "football_data_id": "PL",  "api_football_id": 39,  "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "eng.1",                 "sofascore_tournament_id": 17},
    {"name": "La Liga",                      "short_name": "PD",    "country": "Spain",         "football_data_id": "PD",  "api_football_id": 140, "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "esp.1",                 "sofascore_tournament_id": 8},
    {"name": "Bundesliga",                   "short_name": "BL1",   "country": "Germany",       "football_data_id": "BL1", "api_football_id": 78,  "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "ger.1",                 "sofascore_tournament_id": 35},
    {"name": "Serie A",                      "short_name": "SA",    "country": "Italy",         "football_data_id": "SA",  "api_football_id": 135, "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "ita.1",                 "sofascore_tournament_id": 23},
    {"name": "Ligue 1",                      "short_name": "FL1",   "country": "France",        "football_data_id": "FL1", "api_football_id": 61,  "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "fra.1",                 "sofascore_tournament_id": 34},
    {"name": "Championship",                 "short_name": "ELC",   "country": "England",       "football_data_id": "ELC", "api_football_id": 40,  "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "eng.2",                 "sofascore_tournament_id": 18},
    {"name": "Eredivisie",                   "short_name": "DED",   "country": "Netherlands",   "football_data_id": "DED", "api_football_id": 88,  "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "ned.1",                 "sofascore_tournament_id": 37},
    {"name": "Primeira Liga",                "short_name": "PPL",   "country": "Portugal",      "football_data_id": "PPL", "api_football_id": 94,  "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "por.1",                 "sofascore_tournament_id": 238},
    {"name": "Brazilian Série A",            "short_name": "BSA",   "country": "Brazil",        "football_data_id": "BSA", "api_football_id": 71,  "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "bra.1",                 "sofascore_tournament_id": 325},
    {"name": "Scottish Premiership",         "short_name": None,    "country": "Scotland",      "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "sco.1",                "sofascore_tournament_id": 36},
    {"name": "Belgian Pro League",           "short_name": None,    "country": "Belgium",       "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "bel.1",                "sofascore_tournament_id": None},
    {"name": "Turkish Süper Lig",            "short_name": None,    "country": "Turkey",        "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "tur.1",                "sofascore_tournament_id": 52},
    {"name": "Danish Superliga",             "short_name": None,    "country": "Denmark",       "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "den.1",                "sofascore_tournament_id": 39},
    {"name": "Norwegian Eliteserien",        "short_name": None,    "country": "Norway",        "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "nor.1",                "sofascore_tournament_id": 20},
    {"name": "Swedish Allsvenskan",          "short_name": None,    "country": "Sweden",        "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "swe.1",                "sofascore_tournament_id": 40},
    {"name": "Austrian Bundesliga",          "short_name": None,    "country": "Austria",       "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "aut.1",                "sofascore_tournament_id": 45},
    {"name": "Swiss Super League",           "short_name": None,    "country": "Switzerland",   "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "sui.1",                "sofascore_tournament_id": 215},
    {"name": "Greek Super League",           "short_name": None,    "country": "Greece",        "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "gre.1",                "sofascore_tournament_id": 185},
    {"name": "Russian Premier League",       "short_name": None,    "country": "Russia",        "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "rus.1",                "sofascore_tournament_id": 203},
    # ── European cups ─────────────────────────────────────────────────────────
    {"name": "Champions League",             "short_name": "CL",    "country": "Europe",        "football_data_id": "CL",  "api_football_id": 2,   "preferred_source": "sofascore", "competition_type": "cup",    "espn_slug": "uefa.champions",        "sofascore_tournament_id": 7},
    {"name": "Europa League",                "short_name": "EL",    "country": "Europe",        "football_data_id": None,  "api_football_id": 3,   "preferred_source": "sofascore", "competition_type": "cup",    "espn_slug": "uefa.europa",           "sofascore_tournament_id": 679},
    {"name": "Conference League",            "short_name": "ECL",   "country": "Europe",        "football_data_id": None,  "api_football_id": 848, "preferred_source": "sofascore", "competition_type": "cup",    "espn_slug": "uefa.europa.conf",      "sofascore_tournament_id": 17015},
    # ── Americas domestic ─────────────────────────────────────────────────────
    {"name": "MLS",                          "short_name": None,    "country": "USA",           "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "usa.1",                "sofascore_tournament_id": 242},
    {"name": "Liga MX",                      "short_name": None,    "country": "Mexico",        "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "mex.1",                "sofascore_tournament_id": 11620},
    {"name": "Argentine Liga Profesional",   "short_name": None,    "country": "Argentina",     "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "arg.1",                "sofascore_tournament_id": 155},
    {"name": "Colombian Primera A",          "short_name": None,    "country": "Colombia",      "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "col.1",                "sofascore_tournament_id": 11539},
    {"name": "Chilean Primera División",     "short_name": None,    "country": "Chile",         "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "chi.1",                "sofascore_tournament_id": 11653},
    # ── Asia/Pacific domestic ─────────────────────────────────────────────────
    {"name": "A-League Men",                 "short_name": None,    "country": "Australia",     "football_data_id": None,  "api_football_id": 188, "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "aus.1",                "sofascore_tournament_id": 136},
    {"name": "A-League Women",               "short_name": None,    "country": "Australia",     "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "aus.w.1",              "sofascore_tournament_id": 1894},
    {"name": "J1 League",                    "short_name": None,    "country": "Japan",         "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "jpn.1",                "sofascore_tournament_id": 196},
    {"name": "Chinese Super League",         "short_name": None,    "country": "China",         "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "chn.1",                "sofascore_tournament_id": 649},
    {"name": "Indian Super League",          "short_name": None,    "country": "India",         "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "league", "espn_slug": "ind.1",                "sofascore_tournament_id": 1900},
    # ── Asian/African continental ─────────────────────────────────────────────
    {"name": "AFC Champions League",         "short_name": "ACL",   "country": "Asia",          "football_data_id": None,  "api_football_id": 17,  "preferred_source": "sofascore", "competition_type": "cup",    "espn_slug": "afc.champions",         "sofascore_tournament_id": 463},
    {"name": "CAF Champions League",         "short_name": None,    "country": "Africa",        "football_data_id": None,  "api_football_id": 12,  "preferred_source": "sofascore", "competition_type": "cup",    "espn_slug": "caf.champions",         "sofascore_tournament_id": 1054},
    {"name": "AFC Asian Cup",                "short_name": None,    "country": "Asia",          "football_data_id": None,  "api_football_id": 7,   "preferred_source": "sofascore", "competition_type": "cup",    "espn_slug": "afc.asian.cup",         "sofascore_tournament_id": 246},
    {"name": "Africa Cup of Nations",        "short_name": "AFCON", "country": "Africa",        "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "cup",    "espn_slug": "caf.nations",           "sofascore_tournament_id": 270},
    # ── Americas cups ─────────────────────────────────────────────────────────
    {"name": "Copa Libertadores",            "short_name": None,    "country": "South America", "football_data_id": None,  "api_football_id": 13,  "preferred_source": "sofascore", "competition_type": "cup",    "espn_slug": "conmebol.libertadores", "sofascore_tournament_id": 16940},
    {"name": "Copa Sudamericana",            "short_name": None,    "country": "South America", "football_data_id": None,  "api_football_id": 14,  "preferred_source": "sofascore", "competition_type": "cup",    "espn_slug": "conmebol.sudamericana", "sofascore_tournament_id": 480},
    {"name": "Copa América",                 "short_name": None,    "country": "South America", "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "cup",    "espn_slug": "conmebol.america",      "sofascore_tournament_id": 133},
    {"name": "CONCACAF Champions Cup",       "short_name": None,    "country": "CONCACAF",      "football_data_id": None,  "api_football_id": 128, "preferred_source": "sofascore", "competition_type": "cup",    "espn_slug": "concacaf.champions",    "sofascore_tournament_id": 498},
    {"name": "CONCACAF League",              "short_name": None,    "country": "CONCACAF",      "football_data_id": None,  "api_football_id": 129, "preferred_source": "sofascore", "competition_type": "cup",    "espn_slug": "concacaf.league",       "sofascore_tournament_id": None},
    # ── World / major tournaments ─────────────────────────────────────────────
    {"name": "FIFA World Cup",               "short_name": "WC",    "country": "World",         "football_data_id": "WC",  "api_football_id": 1,   "preferred_source": "sofascore", "competition_type": "cup",    "espn_slug": "fifa.world",            "sofascore_tournament_id": 16},
    {"name": "European Championship",        "short_name": "EC",    "country": "Europe",        "football_data_id": "EC",  "api_football_id": 4,   "preferred_source": "sofascore", "competition_type": "cup",    "espn_slug": "uefa.euro",             "sofascore_tournament_id": 160},
    {"name": "UEFA Nations League",          "short_name": "UNL",   "country": "Europe",        "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "cup",    "espn_slug": "uefa.nations",          "sofascore_tournament_id": 10783},
    {"name": "FIFA Club World Cup",          "short_name": "CWC",   "country": "World",         "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "cup",    "espn_slug": "fifa.cwc",              "sofascore_tournament_id": 357},
    {"name": "International Friendlies",     "short_name": None,    "country": "World",         "football_data_id": None,  "api_football_id": 10,  "preferred_source": "sofascore", "competition_type": "cup",    "espn_slug": "fifa.friendly",         "sofascore_tournament_id": 851},
    # ── World Cup qualifying ───────────────────────────────────────────────────
    {"name": "AFC World Cup Qualifying",     "short_name": None,    "country": "Asia",          "football_data_id": None,  "api_football_id": 29,  "preferred_source": "sofascore", "competition_type": "cup",    "espn_slug": "fifa.worldq.afc",       "sofascore_tournament_id": 308},
    {"name": "CONCACAF World Cup Qualifying","short_name": None,    "country": "CONCACAF",      "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "cup",    "espn_slug": "fifa.worldq.concacaf",  "sofascore_tournament_id": 14},
    {"name": "CONMEBOL World Cup Qualifying","short_name": None,    "country": "South America", "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "cup",    "espn_slug": "fifa.worldq.conmebol",  "sofascore_tournament_id": None},
    {"name": "UEFA World Cup Qualifying",    "short_name": None,    "country": "Europe",        "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "cup",    "espn_slug": "fifa.worldq.uefa",      "sofascore_tournament_id": None},
    {"name": "CAF World Cup Qualifying",     "short_name": None,    "country": "Africa",        "football_data_id": None,  "api_football_id": None, "preferred_source": "sofascore", "competition_type": "cup",    "espn_slug": "fifa.worldq.caf",       "sofascore_tournament_id": None},
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
            if not existing:
                existing = db.query(models.Competition).filter(
                    models.Competition.name == comp_data["name"]
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
