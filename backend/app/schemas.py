import re
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, field_validator, ConfigDict

PHONE_DIGITS_RE = re.compile(r"^998\d{9}$")


def normalize_uzbek_phone(raw: str) -> str:
    """(+998) ___-__-__ formatidagi raqamni +998XXXXXXXXX ko'rinishiga keltiradi."""
    digits = re.sub(r"\D", "", raw or "")
    if digits.startswith("8") and len(digits) == 9:
        digits = "998" + digits
    if not digits.startswith("998"):
        digits = "998" + digits[-9:] if len(digits) >= 9 else digits
    if not PHONE_DIGITS_RE.match(digits):
        raise ValueError(
            "Telefon raqam formati noto'g'ri. Kerakli format: (+998) __-___-__-__"
        )
    return "+" + digits


def format_uzbek_phone(normalized: str) -> str:
    digits = normalized.lstrip("+")
    return f"(+{digits[:3]}) {digits[3:5]}-{digits[5:8]}-{digits[8:10]}-{digits[10:12]}"


class GmailEmailMixin(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def must_be_gmail(cls, v: EmailStr) -> EmailStr:
        if not str(v).lower().endswith("@gmail.com"):
            raise ValueError("Email manzil @gmail.com bilan tugashi shart")
        local_part = str(v).split("@")[0]
        if len(local_part) < 1:
            raise ValueError("Email manzil noto'g'ri")
        return v


# ---------- Roles ----------

class RoleOut(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)


# ---------- Auth ----------

class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    must_change_password: bool
    role: str
    user_id: int
    full_name: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Yangi parol kamida 8 belgidan iborat bo'lishi kerak")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Yangi parolda kamida 1 ta katta harf bo'lishi kerak")
        if not re.search(r"[a-z]", v):
            raise ValueError("Yangi parolda kamida 1 ta kichik harf bo'lishi kerak")
        if not re.search(r"\d", v):
            raise ValueError("Yangi parolda kamida 1 ta raqam bo'lishi kerak")
        return v


class ResetPasswordRequest(BaseModel):
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_strength(cls, v: str) -> str:
        return ChangePasswordRequest.validate_strength(v)


class UpdateEmailRequest(GmailEmailMixin):
    """Faqat superadmin o'ziga tegishli email manzilini kiritish/yangilash uchun."""
    pass


class ForgotPasswordRequest(BaseModel):
    """Login sahifasidagi 'Parolni unutdim' oynasi uchun — superadmin login (username) orqali."""
    username: str
    secret_phrase: str = ""

    @field_validator("username")
    @classmethod
    def username_ok(cls, v: str) -> str:
        v = (v or "").strip().lower()
        if not v:
            raise ValueError("Login kiritilishi shart")
        return v


class VerifySecretRequest(BaseModel):
    """'Parolni unutdim' oynasidagi kalit so'z tekshiruvi uchun."""
    secret_phrase: str = ""


class TelegramLinkRequest(BaseModel):
    chat_id: str
    telegram_username: Optional[str] = None
    telegram_first_name: Optional[str] = None


class TelegramCandidateOut(BaseModel):
    chat_id: str
    telegram_username: Optional[str] = None
    telegram_first_name: Optional[str] = None
    telegram_last_name: Optional[str] = None


# ---------- Users ----------

class UserCreate(GmailEmailMixin):
    role: Literal["admin", "user"]
    username: str
    first_name: str
    last_name: str
    father_name: str
    phone: str
    password: str

    @field_validator("username")
    @classmethod
    def username_ok(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_.]{3,64}$", v):
            raise ValueError(
                "Login faqat lotin harflari, raqam, '_' va '.' belgilaridan iborat bo'lishi (3-64 belgi) kerak"
            )
        return v.lower()

    @field_validator("phone")
    @classmethod
    def phone_ok(cls, v: str) -> str:
        return normalize_uzbek_phone(v)

    @field_validator("password")
    @classmethod
    def password_ok(cls, v: str) -> str:
        return ChangePasswordRequest.validate_strength(v)


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    father_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

    @field_validator("email")
    @classmethod
    def must_be_gmail(cls, v):
        if v is None:
            return v
        if not str(v).lower().endswith("@gmail.com"):
            raise ValueError("Email manzil @gmail.com bilan tugashi shart")
        return v

    @field_validator("phone")
    @classmethod
    def phone_ok(cls, v):
        if v is None:
            return v
        return normalize_uzbek_phone(v)


class UserOut(BaseModel):
    id: int
    username: str
    first_name: str
    last_name: str
    father_name: str
    email: str
    phone: str
    role: RoleOut
    is_active: bool
    must_change_password: bool
    telegram_chat_id: Optional[str] = None
    telegram_username: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("phone", mode="before")
    @classmethod
    def pretty_phone(cls, v):
        try:
            return format_uzbek_phone(v)
        except Exception:
            return v


# ---------- Services ----------

class ServiceCreate(BaseModel):
    project_name: str
    url_address: Optional[str] = None
    login: str
    password: str

    @field_validator("project_name", "login")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Bo'sh bo'lishi mumkin emas")
        return v.strip()

    @field_validator("url_address")
    @classmethod
    def url_trim(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        return v or None

    @field_validator("password")
    @classmethod
    def not_blank_pw(cls, v: str) -> str:
        if not v:
            raise ValueError("Parol bo'sh bo'lishi mumkin emas")
        return v


class AccessGrantOut(BaseModel):
    id: int
    role_name: Optional[str] = None
    user_id: Optional[int] = None
    user_full_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ServiceOut(BaseModel):
    id: int
    project_name: str
    url_address: Optional[str] = None
    login: str
    password: Optional[str] = None  # faqat ko'rish huquqi bo'lganlarga to'ldiriladi
    created_by_id: int
    created_by_name: Optional[str] = None
    created_at: datetime
    access_grants: list[AccessGrantOut] = []

    model_config = ConfigDict(from_attributes=True)


class ServiceAccessSet(BaseModel):
    """Superadmin ushbu xizmatni kimlar ko'rishini to'liq belgilaydi (replace semantics)."""
    role_names: list[Literal["admin", "user"]] = []
    user_ids: list[int] = []
