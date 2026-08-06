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

    # ---- Brute-force himoyasi ----
    # Rate limiting (slowapi) — IP bo'yicha login/forgot-password so'rovlari cheklovi.
    login_rate_limit: str = "5/minute"
    forgot_password_rate_limit: str = "3/hour"
    # "Parolni unutdim" funksiyasiga kirish uchun kalit so'z (bo'sh bo'lsa tekshirilmaydi).
    forgot_password_secret: str = ""
    # Account lockout — ketma-ket noto'g'ri urinishlardan keyin hisobni vaqtincha bloklash.
    max_failed_attempts: int = 5
    lockout_minutes: int = 15

    telegram_bot_token: str = ""
    telegram_bot_username: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
