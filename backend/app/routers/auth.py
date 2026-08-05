import secrets
import string
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models, schemas
from app.config import settings
from app.database import get_db
from app.deps import get_current_user, require_roles
from app.ratelimit import limiter
from app.telegram_utils import send_telegram_message, get_latest_start_chat
from app.security import create_access_token, verify_password, hash_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/telegram/bot-info")
def telegram_bot_info():
    """Ochiq endpoint — botga o'tish havolasi uchun faqat username qaytaradi."""
    return {"bot_username": settings.telegram_bot_username}


@router.post("/login", response_model=schemas.TokenResponse)
@limiter.limit(settings.login_rate_limit)
def login(request: Request, payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    username = payload.username.strip().lower()
    user = db.query(models.User).filter(models.User.username == username).first()

    now = datetime.utcnow()

    # 1) Hisob ketma-ket noto'g'ri urinishlardan so'ng vaqtincha bloklanganmi?
    if user and user.locked_until and user.locked_until > now:
        remaining_min = int((user.locked_until - now).total_seconds() // 60) + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Ko'p marta noto'g'ri urinish sababli hisob vaqtincha bloklandi. "
                f"Iltimos, ~{remaining_min} daqiqadan so'ng qayta urinib ko'ring."
            ),
        )

    # 2) Login yoki parol noto'g'ri bo'lsa — hisoblagichni oshiramiz va kerak bo'lsa bloklaymiz.
    if not user or not verify_password(payload.password, user.hashed_password):
        if user:
            attempts = (user.failed_login_attempts or 0) + 1
            if attempts >= settings.max_failed_attempts:
                # Chegaraga yetdi — hisobni bloklaymiz va hisoblagichni nolga qaytaramiz.
                user.locked_until = now + timedelta(minutes=settings.lockout_minutes)
                user.failed_login_attempts = 0
            else:
                user.failed_login_attempts = attempts
            db.commit()
        # Xabar ataylab umumiy — qaysi biri (login/parol) xato ekani oshkor qilinmaydi.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Login yoki parol noto'g'ri.",
        )

    # 3) Hisob disabled qilinganmi?
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ushbu hisob faolsizlantirilgan (disabled). Administratorga murojaat qiling.",
        )

    # 4) Muvaffaqiyatli kirish — himoya hisoblagichlarini tozalaymiz.
    if (user.failed_login_attempts or 0) != 0 or user.locked_until is not None:
        user.failed_login_attempts = 0
        user.locked_until = None
        db.commit()

    token = create_access_token({"sub": str(user.id)})
    return schemas.TokenResponse(
        access_token=token,
        must_change_password=user.must_change_password,
        role=user.role.name,
        user_id=user.id,
        full_name=f"{user.last_name} {user.first_name}",
    )


@router.post("/change-password")
def change_password(
    payload: schemas.ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not verify_password(payload.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Joriy parol noto'g'ri.",
        )
    if verify_password(payload.new_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Yangi parol eskisidan farq qilishi kerak.",
        )
    current_user.hashed_password = hash_password(payload.new_password)
    current_user.must_change_password = False
    db.commit()
    return {"detail": "Parol muvaffaqiyatli o'zgartirildi."}


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.put("/email", response_model=schemas.UserOut)
def update_my_email(
    payload: schemas.UpdateEmailRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(models.RoleName.SUPERADMIN.value)),
):
    """Faqat superadmin o'zining email manzilini kiritishi/yangilashi mumkin."""
    current_user.email = str(payload.email).lower()
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ushbu email manzili boshqa hisobda band.",
        )
    db.refresh(current_user)
    return current_user


@router.get("/telegram/detect", response_model=schemas.TelegramCandidateOut)
def detect_telegram(
    current_user: models.User = Depends(require_roles(models.RoleName.SUPERADMIN.value)),
):
    """Botga so'nggi /start yozgan foydalanuvchini topadi (bog'lashdan oldingi 1-qadam)."""
    candidate = get_latest_start_chat()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Hech kim topilmadi. Avval Telegramda botga o'ting va /start bosing, "
                "so'ng qayta urinib ko'ring."
            ),
        )
    return candidate


@router.put("/telegram", response_model=schemas.UserOut)
def link_telegram(
    payload: schemas.TelegramLinkRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(models.RoleName.SUPERADMIN.value)),
):
    """Faqat superadmin o'z Telegram hisobini (chat_id) bog'laydi — parolni tiklash uchun."""
    current_user.telegram_chat_id = payload.chat_id
    current_user.telegram_username = payload.telegram_username
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ushbu Telegram hisobi allaqachon boshqa foydalanuvchiga bog'langan.",
        )
    db.refresh(current_user)
    return current_user


@router.post("/forgot-password")
@limiter.limit(settings.forgot_password_rate_limit)
def forgot_password(
    request: Request,
    payload: schemas.ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """Login sahifasidagi 'Parolni unutdim'. Faqat superadminning login (username)i to'g'ri
    kiritilsa va u Telegram orqali bog'langan bo'lsa ishlaydi.

    Eslatma: parollar bazada bir tomonlama xeshlanadi, shu sababli eski parolni
    tiklab bo'lmaydi — buning o'rniga yangi vaqtinchalik parol yaratilib, Telegram orqali
    yuboriladi va tizimga kirgach uni almashtirish majburiy qilinadi.
    """
    superadmin = (
        db.query(models.User)
        .join(models.Role)
        .filter(models.Role.name == models.RoleName.SUPERADMIN.value)
        .filter(models.User.username == payload.username)
        .first()
    )
    if not superadmin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bunday login bilan ro'yxatdan o'tgan superadmin topilmadi.",
        )
    if settings.telegram_bot_token and not superadmin.telegram_chat_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ushbu superadmin hisobi Telegram bilan bog'lanmagan. Administratorga murojaat qiling.",
        )

    alphabet = string.ascii_letters + string.digits
    temp_password = "".join(secrets.choice(alphabet) for _ in range(10)) + "!A1"
    superadmin.hashed_password = hash_password(temp_password)
    superadmin.must_change_password = True
    # Yangi vaqtinchalik parol berilganda hisobni blokdan chiqaramiz.
    superadmin.failed_login_attempts = 0
    superadmin.locked_until = None
    db.commit()

    initials = f"{superadmin.first_name[:1]}.{superadmin.father_name[:1]}."
    text = (
        f"Kimdan: {superadmin.last_name} {initials}\n"
        f"Login: {superadmin.username}\n"
        f"Mavzu: yangi vaqtinchalik parolingiz: {temp_password}"
    )
    chat_id = superadmin.telegram_chat_id or "N/A (Telegram sozlanmagan — offline/dev rejim)"
    sent = send_telegram_message(chat_id, text)
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Telegram orqali yuborishda xatolik yuz berdi. Birozdan so'ng qayta urinib ko'ring.",
        )

    if settings.telegram_bot_token:
        return {"detail": "Vaqtinchalik parol Telegram orqali yuborildi."}
    return {"detail": "Telegram sozlanmagan (offline rejim) — vaqtinchalik parol backend konsoliga (logga) chiqarildi."}
