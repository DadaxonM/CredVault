from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./app.db"
    secret_key: str = "dev-only-secret-please-change"
    encryption_key: str = ""
    access_token_expire_minutes: int = 480
    algorithm: str = "HS256"

    default_superadmin_username: str = "superadmin"
    default_superadmin_password: str = "Passwords1807*"

    inactivity_timeout_seconds: int = 60

    telegram_bot_token: str = ""
    telegram_bot_username: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
