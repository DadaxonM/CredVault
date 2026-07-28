from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user, require_roles
from app.security import encrypt_secret, decrypt_secret

router = APIRouter(prefix="/api/services", tags=["services"])


def _get_service(db: Session, service_id: int) -> models.Service:
    service = (
        db.query(models.Service)
        .options(
            joinedload(models.Service.creator),
            joinedload(models.Service.access_grants).joinedload(models.ServiceAccess.role),
            joinedload(models.Service.access_grants).joinedload(models.ServiceAccess.user),
        )
        .filter(models.Service.id == service_id)
        .first()
    )
    if not service:
        raise HTTPException(status_code=404, detail="Xizmat topilmadi.")
    return service


def _can_view(user: models.User, service: models.Service) -> bool:
    if user.role.name == models.RoleName.SUPERADMIN.value:
        return True
    if service.created_by_id == user.id:
        return True
    for grant in service.access_grants:
        if grant.role_id == user.role_id:
            return True
        if grant.user_id == user.id:
            return True
    return False


def _to_out(service: models.Service, current_user: models.User) -> schemas.ServiceOut:
    is_superadmin = current_user.role.name == models.RoleName.SUPERADMIN.value
    grants = []
    if is_superadmin:
        for g in service.access_grants:
            grants.append(
                schemas.AccessGrantOut(
                    id=g.id,
                    role_name=g.role.name if g.role else None,
                    user_id=g.user_id,
                    user_full_name=(f"{g.user.last_name} {g.user.first_name}" if g.user else None),
                )
            )
    return schemas.ServiceOut(
        id=service.id,
        project_name=service.project_name,
        url_address=service.url_address,
        login=service.login,
        password=None,  # copy tugmasi uchun /reveal orqali olinadi
        created_by_id=service.created_by_id,
        created_by_name=(
            f"{service.creator.last_name} {service.creator.first_name}" if service.creator else None
        ),
        created_at=service.created_at,
        access_grants=grants,
    )


@router.get("", response_model=list[schemas.ServiceOut])
def list_services(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    services = (
        db.query(models.Service)
        .options(
            joinedload(models.Service.creator),
            joinedload(models.Service.access_grants).joinedload(models.ServiceAccess.role),
            joinedload(models.Service.access_grants).joinedload(models.ServiceAccess.user),
        )
        .order_by(models.Service.created_at.desc())
        .all()
    )
    visible = [s for s in services if _can_view(current_user, s)]
    return [_to_out(s, current_user) for s in visible]


@router.post("", response_model=schemas.ServiceOut, status_code=status.HTTP_201_CREATED)
def create_service(
    payload: schemas.ServiceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles(models.RoleName.SUPERADMIN.value, models.RoleName.ADMIN.value)
    ),
):
    service = models.Service(
        project_name=payload.project_name,
        url_address=payload.url_address,
        login=payload.login,
        encrypted_password=encrypt_secret(payload.password),
        created_by_id=current_user.id,
    )
    db.add(service)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ushbu 'Project name' + 'Login' juftligi bilan xizmat allaqachon mavjud.",
        )
    db.refresh(service)
    return _to_out(_get_service(db, service.id), current_user)


@router.put("/{service_id}", response_model=schemas.ServiceOut)
def update_service(
    service_id: int,
    payload: schemas.ServiceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles(models.RoleName.SUPERADMIN.value, models.RoleName.ADMIN.value)
    ),
):
    service = _get_service(db, service_id)
    if current_user.role.name != models.RoleName.SUPERADMIN.value and service.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Faqat o'zingiz yaratgan xizmatni tahrirlashingiz mumkin.")

    service.project_name = payload.project_name
    service.url_address = payload.url_address
    service.login = payload.login
    service.encrypted_password = encrypt_secret(payload.password)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ushbu 'Project name' + 'Login' juftligi bilan xizmat allaqachon mavjud.",
        )
    db.refresh(service)
    return _to_out(service, current_user)


@router.delete("/{service_id}")
def delete_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles(models.RoleName.SUPERADMIN.value, models.RoleName.ADMIN.value)
    ),
):
    service = _get_service(db, service_id)
    if current_user.role.name != models.RoleName.SUPERADMIN.value and service.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Faqat o'zingiz yaratgan xizmatni o'chirishingiz mumkin.")
    db.delete(service)
    db.commit()
    return {"detail": "Xizmat o'chirildi."}


@router.post("/{service_id}/reveal")
def reveal_secret(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Faqat login va parolni nusxalash (copy) uchun ochib beradi."""
    service = _get_service(db, service_id)
    if not _can_view(current_user, service):
        raise HTTPException(status_code=403, detail="Ushbu xizmatni ko'rishga ruxsatingiz yo'q.")
    return {
        "login": service.login,
        "password": decrypt_secret(service.encrypted_password),
    }


@router.put("/{service_id}/access", response_model=schemas.ServiceOut)
def set_access(
    service_id: int,
    payload: schemas.ServiceAccessSet,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(models.RoleName.SUPERADMIN.value)),
):
    service = _get_service(db, service_id)

    db.query(models.ServiceAccess).filter(models.ServiceAccess.service_id == service.id).delete()

    for role_name in set(payload.role_names):
        role_obj = db.query(models.Role).filter(models.Role.name == role_name).first()
        if role_obj:
            db.add(
                models.ServiceAccess(
                    service_id=service.id,
                    role_id=role_obj.id,
                    granted_by_id=current_user.id,
                )
            )

    if payload.user_ids:
        valid_users = (
            db.query(models.User.id).filter(models.User.id.in_(set(payload.user_ids))).all()
        )
        for (uid,) in valid_users:
            db.add(
                models.ServiceAccess(
                    service_id=service.id,
                    user_id=uid,
                    granted_by_id=current_user.id,
                )
            )

    db.commit()
    return _to_out(_get_service(db, service.id), current_user)
