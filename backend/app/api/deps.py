from typing import Generator, List
from datetime import datetime
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session
from starlette import status
from app.db.session import SessionLocal
from app.db.models.user import User
from app.db.models.session import Session as DbSession
from app.db.models.driver_profile import DriverProfile
from app.db.models.host_profile import HostProfile
from app.security import decode_access_token

security_scheme = HTTPBearer(auto_error=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={'code': 'UNAUTHORIZED', 'message': 'Missing authentication token.'}
        )

    token = credentials.credentials
    try:
        payload = decode_access_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={'code': 'UNAUTHORIZED', 'message': 'Invalid or expired access token.'}
        )

    user_id = payload.get('sub')
    session_id = payload.get('sid')
    if not user_id or not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={'code': 'UNAUTHORIZED', 'message': 'Invalid access token payload.'}
        )

    session = db.query(DbSession).filter(DbSession.id == session_id).first()
    if not session or session.revoked_at or session.expires_at <= datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={'code': 'UNAUTHORIZED', 'message': 'Session is no longer valid.'}
        )

    if session.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={'code': 'UNAUTHORIZED', 'message': 'Session does not match user.'}
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={'code': 'UNAUTHORIZED', 'message': 'User not found for session.'}
        )

    return user


def require_role(*roles: List[str]):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={'code': 'FORBIDDEN', 'message': 'You do not have permission to perform this action.'}
            )
        return user

    return dependency


def require_driver_profile(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    if user.role == 'admin':
        return user
    profile = db.query(DriverProfile).filter(DriverProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={'code': 'PROFILE_INCOMPLETE', 'message': 'Complete your driver profile to continue.'}
        )
    return user


def require_host_profile(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    if user.role == 'admin':
        return user
    profile = db.query(HostProfile).filter(HostProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={'code': 'PROFILE_INCOMPLETE', 'message': 'Complete your host profile to continue.'}
        )
    return user


def require_self_or_admin(user_id: str, user: User = Depends(get_current_user)) -> User:
    if user.role == 'admin' or user.id == user_id:
        return user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={'code': 'FORBIDDEN', 'message': 'You can only access your own account.'}
    )
