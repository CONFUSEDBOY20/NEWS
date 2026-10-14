import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Union, Any
import bcrypt
from jose import jwt, JWTError
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

security_bearer = HTTPBearer(auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a password against a bcrypt hash directly without passlib."""
    if not plain_password or not hashed_password:
        return False
    try:
        password_bytes = plain_password.encode("utf-8")
        # Bcrypt passwords can be at most 72 bytes
        if len(password_bytes) > 72:
            return False
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(password_bytes, hash_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Generates a bcrypt hash for a given password directly without passlib."""
    if not password:
        raise ValueError("Password cannot be empty")
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        raise ValueError("Password exceeds 72-byte limit for bcrypt")
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")

def verify_admin_credentials(email: str, password: str) -> bool:
    """
    Validates administrator login credentials securely:
    1. Checks email in constant time / normalized comparison.
    2. If ADMIN_PASSWORD_HASH is set, verifies with bcrypt.
    3. If ADMIN_PASSWORD is set, verifies with secrets.compare_digest.
    4. Fails closed if no password is configured.
    """
    if not email or not password:
        return False

    configured_email = settings.ADMIN_EMAIL.strip().lower()
    input_email = email.strip().lower()

    if not secrets.compare_digest(input_email, configured_email):
        return False

    # Check bcrypt hash first if available
    if settings.ADMIN_PASSWORD_HASH:
        return verify_password(password, settings.ADMIN_PASSWORD_HASH)

    # Check plain env password using constant-time comparison
    if settings.ADMIN_PASSWORD:
        return secrets.compare_digest(password, settings.ADMIN_PASSWORD)

    return False

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject), "role": "admin"}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def get_current_admin(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)):
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required for admin access",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        if not email or role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid token or insufficient administrative permissions"
            )
        return {"email": email, "role": role}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate admin credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
