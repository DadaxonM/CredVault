import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    CheckConstraint,
)
from sqlalchemy.orm import relationship

from app.database import Base


class RoleName(str, enum.Enum):
    SUPERADMIN = "superadmin"
    ADMIN = "admin"
    USER = "user"


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(32), unique=True, nullable=False, index=True)

    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)

    username = Column(String(64), unique=True, nullable=False, index=True)
    first_name = Column(String(100), nullable=False)          # Ismi
    last_name = Column(String(100), nullable=False)            # Familiyasi
    father_name = Column(String(100), nullable=False)          # Otasining ismi
    email = Column(String(150), unique=True, nullable=False)   # ____*@gmail.com
    phone = Column(String(20), unique=True, nullable=False)    # (+998) __-___-__-__

    hashed_password = Column(String(255), nullable=False)
    must_change_password = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)  # False -> disabled

    telegram_chat_id = Column(String(64), unique=True, nullable=True)
    telegram_username = Column(String(100), nullable=True)

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    role = relationship("Role", back_populates="users")
    creator = relationship("User", remote_side=[id], foreign_keys=[created_by_id])


class Service(Base):
    __tablename__ = "services"
    __table_args__ = (
        UniqueConstraint("project_name", "login", name="uq_service_project_login"),
    )

    id = Column(Integer, primary_key=True, index=True)
    project_name = Column(String(200), nullable=False, index=True)
    url_address = Column(String(500), nullable=True)
    login = Column(String(200), nullable=False)
    encrypted_password = Column(String(500), nullable=False)

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    creator = relationship("User")
    access_grants = relationship("ServiceAccess", back_populates="service", cascade="all, delete-orphan")


class ServiceAccess(Base):
    """Superadmin tomonidan belgilanadigan ko'rish huquqi (tick).
    Yoki butun rolga (barcha admin / barcha user), yoki aniq bir foydalanuvchiga beriladi."""

    __tablename__ = "service_access"
    __table_args__ = (
        UniqueConstraint("service_id", "role_id", "user_id", name="uq_service_access"),
        CheckConstraint(
            "(role_id IS NOT NULL AND user_id IS NULL) OR (role_id IS NULL AND user_id IS NOT NULL)",
            name="ck_service_access_one_target",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    granted_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    service = relationship("Service", back_populates="access_grants")
    role = relationship("Role")
    user = relationship("User", foreign_keys=[user_id])
