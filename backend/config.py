from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    secret_key: str = "dev-secret-key-please-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days
    database_url: str = "sqlite:////data/footrack.db"
    football_data_api_key: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

# Competitions natively covered by football-data.org (code -> display name)
FD_COMPETITIONS = {
    "PL":  "Premier League",
    "PD":  "La Liga",
    "BL1": "Bundesliga",
    "SA":  "Serie A",
    "FL1": "Ligue 1",
    "CL":  "Champions League",
    "DED": "Eredivisie",
    "PPL": "Primeira Liga",
    "ELC": "Championship",
    "BSA": "Brazilian Série A",
    "WC":  "FIFA World Cup",
    "EC":  "European Championship",
}
