from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..dependencies import get_current_user, hash_password, require_min_role, ROLE_LEVEL
from ..models import User, UserRole
from ..schemas import UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])

_manager = require_min_role(UserRole.facility_manager)


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    current_user: User = Depends(_manager),
    db: AsyncSession = Depends(get_db),
):
    # a facility manager can only create users at or below their own level
    if ROLE_LEVEL[body.role] >= ROLE_LEVEL[current_user.role]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create a user with an equal or higher role than your own",
        )

    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
        first_name=body.first_name,
        last_name=body.last_name,
        phone=body.phone,
        hpcsa_number=body.hpcsa_number,
        sanc_number=body.sanc_number,
        facility_id=body.facility_id,
        district_id=body.district_id,
        province_id=body.province_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/", response_model=list[UserRead])
async def list_users(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(_manager),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User)
    # facility managers see only their own facility's users
    if current_user.role == UserRole.facility_manager:
        stmt = stmt.where(User.facility_id == current_user.facility_id)
    result = await db.execute(stmt.offset(skip).limit(min(limit, 200)))
    return result.scalars().all()


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int,
    body: UserUpdate,
    current_user: User = Depends(_manager),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if current_user.role == UserRole.facility_manager and user.facility_id != current_user.facility_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
    return user
