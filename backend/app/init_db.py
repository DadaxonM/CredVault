from sqlalchemy import inspect, text

from app import models
from app.config import settings
from app.database import Base, engine, SessionLocal
from app.security import hash_password


def _run_light_migrations():
    """Alembic ishlatmasdan, mavjud jadvallarga yetishmayotgan ustunlarni avtomatik qo'shadi.
    Bu — allaqachon ma'lumot bilan ishlab turgan bazalar uchun (masalan production'dagi Docker
    konteyner) xavfsiz: faqat YETISHMAYOTGAN ustunlarni qo'shadi, mavjud ma'lumotga tegmaydi."""
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if table.name not in existing_tables:
                continue  # yangi jadval - create_all() allaqachon to'liq holda yaratadi
            existing_columns = {c["name"] for c in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in existing_columns:
                    continue
                col_type = column.type.compile(engine.dialect)
                nullable = "" if column.nullable else ""  # yangi ustun har doim NULL bo'lishi kerak (eski qatorlar uchun)
                conn.execute(text(f'ALTER TABLE {table.name} ADD COLUMN {column.name} {col_type}'))
                print(f"[init_db] Migratsiya: '{table.name}.{column.name}' ustuni qo'shildi.")


def init_db():
    Base.metadata.create_all(bind=engine)
    _run_light_migrations()
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
