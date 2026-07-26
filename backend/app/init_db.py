from app import models
from app.config import settings
from app.database import Base, engine, SessionLocal
from app.security import hash_password


def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1) Rollarni seed qilish
        role_map = {}
        for name in (models.RoleName.SUPERADMIN, models.RoleName.ADMIN, models.RoleName.USER):
            role = db.query(models.Role).filter(models.Role.name == name.value).first()
            if not role:
                role = models.Role(name=name.value)
                db.add(role)
                db.commit()
                db.refresh(role)
            role_map[name.value] = role

        # 2) Default superadminni seed qilish (agar mavjud bo'lmasa)
        existing = (
            db.query(models.User)
            .filter(models.User.username == settings.default_superadmin_username)
            .first()
        )
        if not existing:
            superadmin = models.User(
                role_id=role_map[models.RoleName.SUPERADMIN.value].id,
                username=settings.default_superadmin_username,
                first_name="Super",
                last_name="Admin",
                father_name="-",
                email="superadmin@gmail.com",
                phone="+998000000000",
                hashed_password=hash_password(settings.default_superadmin_password),
                must_change_password=True,
                is_active=True,
                created_by_id=None,
            )
            db.add(superadmin)
            db.commit()
            print(
                f"[init_db] Default superadmin yaratildi -> login: "
                f"{settings.default_superadmin_username} / parol: {settings.default_superadmin_password} "
                f"(birinchi kirishda parolni o'zgartirish MAJBURIY)"
            )
        else:
            print("[init_db] Superadmin allaqachon mavjud, o'tkazib yuborildi.")
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
