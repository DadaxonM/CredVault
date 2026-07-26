import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user, require_roles
from app.security import hash_password

router = APIRouter(prefix="/api/users", tags=["users"])


def _role(db: Session, name: str) -> models.Role:
    role = db.query(models.Role).filter(models.Role.name == name).first()
    if not role:
        raise HTTPException(status_code=500, detail=f"'{name}' roli topilmadi. DB seed qilinmagan.")
    return role


def _assert_can_manage(actor: models.User, target_role_name: str):
    if target_role_name == models.RoleName.SUPERADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin hisobini bu yerdan boshqarib bo'lmaydi.",
        )
    if target_role_name == models.RoleName.ADMIN.value and actor.role.name != models.RoleName.SUPERADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Faqat superadmin admin hisoblarini boshqara oladi.",
        )
    if target_role_name == models.RoleName.USER.value and actor.role.name not in (
        models.RoleName.SUPERADMIN.value,
        models.RoleName.ADMIN.value,
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ruxsat yo'q.")


def _get_target(db: Session, user_id: int) -> models.User:
    target = (
        db.query(models.User)
        .options(joinedload(models.User.role))
        .filter(models.User.id == user_id)
        .first()
    )
    if not target:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi.")
    return target


@router.get("", response_model=list[schemas.UserOut])
def list_users(
    role: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles(models.RoleName.SUPERADMIN.value, models.RoleName.ADMIN.value)
    ),
):
    query = db.query(models.User).options(joinedload(models.User.role)).join(models.Role)

    if current_user.role.name == models.RoleName.ADMIN.value:
        # Admin faqat 'user' rolidagilarni ko'radi/boshqaradi
        query = query.filter(models.Role.name == models.RoleName.USER.value)
    elif role in (models.RoleName.ADMIN.value, models.RoleName.USER.value):
        query = query.filter(models.Role.name == role)
    else:
        query = query.filter(models.Role.name != models.RoleName.SUPERADMIN.value)

    return query.order_by(models.User.created_at.desc()).all()


@router.post("", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles(models.RoleName.SUPERADMIN.value, models.RoleName.ADMIN.value)
    ),
):
    _assert_can_manage(current_user, payload.role)

    role_obj = _role(db, payload.role)
    new_user = models.User(
        role_id=role_obj.id,
        username=payload.username,
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        father_name=payload.father_name.strip(),
        email=str(payload.email).lower(),
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
        must_change_password=True,
        is_active=True,
        created_by_id=current_user.id,
    )
    db.add(new_user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ushbu login, email yoki telefon raqami bilan foydalanuvchi allaqachon mavjud.",
        )
    db.refresh(new_user)
    return new_user


@router.put("/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: int,
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles(models.RoleName.SUPERADMIN.value, models.RoleName.ADMIN.value)
    ),
):
    target = _get_target(db, user_id)
    _assert_can_manage(current_user, target.role.name)

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        if field == "email" and value is not None:
            value = str(value).lower()
        setattr(target, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ushbu email yoki telefon raqami boshqa foydalanuvchida band.",
        )
    db.refresh(target)
    return target


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles(models.RoleName.SUPERADMIN.value, models.RoleName.ADMIN.value)
    ),
):
    target = _get_target(db, user_id)
    _assert_can_manage(current_user, target.role.name)
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="O'zingizni o'chira olmaysiz.")

    db.delete(target)
    db.commit()
    return {"detail": "Foydalanuvchi o'chirildi."}


@router.patch("/{user_id}/toggle-active", response_model=schemas.UserOut)
def toggle_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles(models.RoleName.SUPERADMIN.value, models.RoleName.ADMIN.value)
    ),
):
    target = _get_target(db, user_id)
    _assert_can_manage(current_user, target.role.name)
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="O'zingizni disable qila olmaysiz.")

    target.is_active = not target.is_active
    db.commit()
    db.refresh(target)
    return target


@router.post("/{user_id}/reset-password")
def reset_password(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles(models.RoleName.SUPERADMIN.value, models.RoleName.ADMIN.value)
    ),
):
    target = _get_target(db, user_id)
    _assert_can_manage(current_user, target.role.name)

    alphabet = string.ascii_letters + string.digits
    temp_password = "".join(secrets.choice(alphabet) for _ in range(10)) + "!A1"
    target.hashed_password = hash_password(temp_password)
    target.must_change_password = True
    db.commit()
    return {"detail": "Vaqtinchalik parol yaratildi.", "temp_password": temp_password}
