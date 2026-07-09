import os
import uuid
import hashlib
import secrets
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models import User, RefreshToken
from app.schemas import UserCreate, UserLogin, UserResponse, Token, RefreshRequest, TokenRefreshResponse

# Security Contexts
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable is not set!")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
# Short-lived access token; long sessions are handled by refresh tokens below.
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

router = APIRouter(prefix="/auth", tags=["auth"])


def _hash_token(raw_token: str) -> str:
    """Hash an opaque refresh token before storing it (never store the raw value)."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


async def create_refresh_token(user_id: str, db: AsyncSession) -> str:
    """Issue a new opaque refresh token, persisting only its hash. Returns raw token."""
    raw_token = secrets.token_urlsafe(48)
    expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    db.add(RefreshToken(
        id=str(uuid.uuid4()),
        user_id=user_id,
        token_hash=_hash_token(raw_token),
        expires_at=expires_at.replace(tzinfo=None),
        revoked=False,
        created_at=datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    ))
    await db.flush()
    return raw_token

# Password Helper Operations
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

# Dependency: Get Active User from Session Token
async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token sesi tidak sah atau kedaluwarsa.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_user_optional(token: str = Depends(oauth2_scheme_optional), db: AsyncSession = Depends(get_db)):
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalars().first()
    except JWTError:
        return None

# Router POST: Register User
@router.post("/register", response_model=Token)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if email exists
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Alamat email sudah terdaftar di sistem WebCraft."
        )

    # Validate NISN / NIP
    if user_in.role == 'siswa':
        if not user_in.nisn_nip or len(user_in.nisn_nip) != 10 or not user_in.nisn_nip.isdigit():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="NISN untuk siswa harus tepat 10 digit angka."
            )
    elif user_in.role == 'guru':
        if not user_in.nisn_nip or len(user_in.nisn_nip) != 18 or not user_in.nisn_nip.isdigit():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="NIP untuk guru harus tepat 18 digit angka."
            )

    # Create new user
    db_user = User(
        id=str(uuid.uuid4()),
        name=user_in.name,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role,
        nisn_nip=user_in.nisn_nip,
        created_at=datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    )
    db.add(db_user)
    await db.flush() # Sync ID

    access_token = create_access_token(data={"sub": db_user.id, "role": db_user.role})
    refresh_token = await create_refresh_token(db_user.id, db)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user,
        "refresh_token": refresh_token
    }

# Router POST: Login User
@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalars().first()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau kata sandi Anda salah."
        )

    access_token = create_access_token(data={"sub": user.id, "role": user.role})
    refresh_token = await create_refresh_token(user.id, db)

    # Housekeeping: purge expired or revoked refresh tokens for this user to
    # prevent unbounded growth of the refresh_tokens table.
    cutoff = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    stale = await db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user.id,
            (RefreshToken.revoked == True) | (RefreshToken.expires_at < cutoff)  # noqa: E712
        )
    )
    for old_token in stale.scalars().all():
        await db.delete(old_token)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
        "refresh_token": refresh_token
    }

# Router GET: Get Current User Profile (Token Verification)
@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Router POST: Rotate a refresh token into a fresh access + refresh token pair
@router.post("/refresh", response_model=TokenRefreshResponse)
async def refresh_access_token(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Refresh token tidak sah atau kedaluwarsa.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == _hash_token(payload.refresh_token))
    )
    stored = result.scalars().first()
    if not stored or stored.revoked:
        raise invalid

    expires_at = stored.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=datetime.timezone.utc)
    if expires_at < datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None):
        raise invalid

    user_res = await db.execute(select(User).where(User.id == stored.user_id))
    user = user_res.scalars().first()
    if not user:
        raise invalid

    # Rotate: revoke the used token and issue a fresh pair.
    stored.revoked = True
    new_access = create_access_token(data={"sub": user.id, "role": user.role})
    new_refresh = await create_refresh_token(user.id, db)
    return {
        "access_token": new_access,
        "token_type": "bearer",
        "refresh_token": new_refresh,
    }

# Router POST: Revoke a refresh token (logout)
@router.post("/logout")
async def logout(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == _hash_token(payload.refresh_token))
    )
    stored = result.scalars().first()
    if stored:
        stored.revoked = True
    return {"message": "Logout berhasil."}
