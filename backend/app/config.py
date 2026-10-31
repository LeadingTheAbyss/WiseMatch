from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

    database_url: str = ""
    taste_api_key: str = ""
    taste_base_url: str = ""
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"
    jwt_secret: str = "dev-secret-change-me"
    cors_origins: str = "http://localhost:3000"
    seed_users: int = 650

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
