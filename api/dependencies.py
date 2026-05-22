from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .database import get_db
from .models import User, UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Numeric level for each role — higher means broader access
ROLE_LEVEL: dict[UserRole, int] = {
    UserRole.nurse: 1,
    UserRole.doctor: 2,
    UserRole.facility_manager: 3,
    UserRole.district_officer: 4,
    UserRole.provincial_officer: 5,
    UserRole.national_officer: 6,
    UserRole.minister: 7,
}


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": str(user_id), "exp": expire}, settings.secret_key, algorithm=settings.algorithm)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise credentials_exc

    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exc
    return user


def require_roles(*roles: UserRole):
    """Dependency factory: user must have one of the listed roles."""
    async def dep(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required: {[r.value for r in roles]}",
            )
        return current_user
    return dep


def require_min_role(min_role: UserRole):
    """Dependency factory: user must be at or above the given role level."""
    min_level = ROLE_LEVEL[min_role]

    async def dep(current_user: User = Depends(get_current_user)) -> User:
        if ROLE_LEVEL[current_user.role] < min_level:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient privileges")
        return current_user

    return dep


def assert_facility_access(user: User, facility_id: int) -> None:
    """Raise 403 if a facility-scoped user tries to access another facility's data."""
    if ROLE_LEVEL[user.role] <= ROLE_LEVEL[UserRole.facility_manager]:
        if user.facility_id != facility_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to this facility is denied")
