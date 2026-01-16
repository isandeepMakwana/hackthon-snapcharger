from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from starlette import status
from app.api.deps import get_db, get_current_user
from app.api.utils.users import build_user_out
from app.core.config import get_settings
from app.core.mailer import send_password_reset_email, send_verification_email
from app.db.models.email_verification import EmailVerificationToken
from app.db.models.password_reset import PasswordResetToken
from app.db.models.session import Session as DbSession
from app.db.models.user import User
from app.models.auth import (
    AuthResponse,
    EmailVerificationResponse,
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse
)
from app.models.user import UserOut, UserProfileUpdate
from app.security import create_access_token, generate_token, hash_password, hash_token, verify_password

settings = get_settings()

router = APIRouter(prefix='/api/auth', tags=['auth'])


@router.post(
    '/register',
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED
)
async def register(
    payload: RegisterRequest,
    request: Request,
    db: Session = Depends(get_db)
) -> AuthResponse:
    existing = db.query(User).filter(
        (User.email == payload.email.lower()) | (User.username == payload.username)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={'code': 'CONFLICT', 'message': 'Username or email already exists.'}
        )

    user = User(
        username=payload.username.strip(),
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        phone_number=payload.phone_number.strip(),
        role='member',
        permissions=[]
    )
    db.add(user)
    db.flush()

    verification_token = generate_token()
    db.add(EmailVerificationToken(
        user_id=user.id,
        token_hash=hash_token(verification_token),
        expires_at=datetime.utcnow() + timedelta(hours=24)
    ))

    refresh_token = generate_token()
    refresh_token_hash = hash_token(refresh_token)
    session = DbSession(
        user_id=user.id,
        refresh_token_hash=refresh_token_hash,
        user_agent=request.headers.get('user-agent'),
        ip_address=request.client.host if request.client else None,
        expires_at=datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days),
        last_used_at=datetime.utcnow()
    )
    db.add(session)
    db.commit()
    db.refresh(user)

    verification_link = f'{settings.app_base_url}/api/auth/verify-email?token={verification_token}'
    send_verification_email(to=user.email, username=user.username, link=verification_link)

    tokens = TokenResponse(
        access_token=create_access_token({
            'sub': user.id,
            'sid': session.id,
            'role': user.role,
            'permissions': user.permissions
        }),
        refresh_token=refresh_token,
        expires_in=settings.access_token_expire_minutes * 60
    )

    return AuthResponse(user=build_user_out(db, user), tokens=tokens)


@router.post(
    '/login',
    response_model=AuthResponse
)
async def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
) -> AuthResponse:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={'code': 'INVALID_CREDENTIALS', 'message': 'Invalid email or password.'}
        )

    refresh_token = generate_token()
    session = DbSession(
        user_id=user.id,
        refresh_token_hash=hash_token(refresh_token),
        user_agent=request.headers.get('user-agent'),
        ip_address=request.client.host if request.client else None,
        expires_at=datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days),
        last_used_at=datetime.utcnow()
    )
    db.add(session)
    db.commit()

    tokens = TokenResponse(
        access_token=create_access_token({
            'sub': user.id,
            'sid': session.id,
            'role': user.role,
            'permissions': user.permissions
        }),
        refresh_token=refresh_token,
        expires_in=settings.access_token_expire_minutes * 60
    )

    return AuthResponse(user=build_user_out(db, user), tokens=tokens)


@router.post('/refresh', response_model=AuthResponse)
async def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> AuthResponse:
    refresh_hash = hash_token(payload.refresh_token)
    session = db.query(DbSession).filter(DbSession.refresh_token_hash == refresh_hash).first()

    if not session or session.revoked_at or session.expires_at <= datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={'code': 'UNAUTHORIZED', 'message': 'Refresh token is invalid or expired.'}
        )

    user = db.query(User).filter(User.id == session.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={'code': 'UNAUTHORIZED', 'message': 'User not found for session.'}
        )

    new_refresh_token = generate_token()
    session.refresh_token_hash = hash_token(new_refresh_token)
    session.last_used_at = datetime.utcnow()
    session.expires_at = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    db.commit()

    tokens = TokenResponse(
        access_token=create_access_token({
            'sub': user.id,
            'sid': session.id,
            'role': user.role,
            'permissions': user.permissions
        }),
        refresh_token=new_refresh_token,
        expires_in=settings.access_token_expire_minutes * 60
    )

    return AuthResponse(user=build_user_out(db, user), tokens=tokens)


@router.post('/logout', response_model=MessageResponse)
async def logout(payload: LogoutRequest, db: Session = Depends(get_db)) -> MessageResponse:
    refresh_hash = hash_token(payload.refresh_token)
    session = db.query(DbSession).filter(DbSession.refresh_token_hash == refresh_hash).first()

    if session and not session.revoked_at:
        session.revoked_at = datetime.utcnow()
        db.commit()

    return MessageResponse(success=True)


@router.get('/verify-email', response_model=EmailVerificationResponse)
async def verify_email(token: str, db: Session = Depends(get_db)) -> EmailVerificationResponse:
    token_hash = hash_token(token)
    record = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token_hash == token_hash,
        EmailVerificationToken.used_at.is_(None)
    ).first()

    if not record or record.expires_at <= datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'code': 'INVALID_TOKEN', 'message': 'Verification token is invalid or expired.'}
        )

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={'code': 'NOT_FOUND', 'message': 'User not found.'}
        )

    user.email_verified = True
    record.used_at = datetime.utcnow()
    db.commit()

    return EmailVerificationResponse(user=build_user_out(db, user))


@router.post(
    '/forgot-password',
    response_model=MessageResponse
)
async def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)) -> MessageResponse:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user:
        return MessageResponse(success=True)

    reset_token = generate_token()
    db.add(PasswordResetToken(
        user_id=user.id,
        token_hash=hash_token(reset_token),
        expires_at=datetime.utcnow() + timedelta(hours=2)
    ))
    db.commit()

    reset_link = f'{settings.app_base_url}/reset-password?token={reset_token}'
    send_password_reset_email(to=user.email, link=reset_link)

    return MessageResponse(success=True)


@router.post(
    '/reset-password',
    response_model=MessageResponse
)
async def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> MessageResponse:
    token_hash = hash_token(payload.token)
    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used_at.is_(None)
    ).first()

    if not record or record.expires_at <= datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'code': 'INVALID_TOKEN', 'message': 'Reset token is invalid or expired.'}
        )

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={'code': 'NOT_FOUND', 'message': 'User not found.'}
        )

    user.password_hash = hash_password(payload.password)
    record.used_at = datetime.utcnow()

    db.query(DbSession).filter(DbSession.user_id == user.id, DbSession.revoked_at.is_(None)).update({
        DbSession.revoked_at: datetime.utcnow()
    })
    db.commit()

    return MessageResponse(success=True)


@router.get('/me', response_model=UserOut)
async def me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> UserOut:
    return build_user_out(db=db, user=current_user)


@router.patch('/me', response_model=UserOut)
async def update_me(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> UserOut:
    """
    Update current user's profile details.
    Allowed fields: username, email, phone_number, password
    """
    # Get only the fields that were actually provided
    updates = payload.model_dump(exclude_unset=True)
    
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'code': 'VALIDATION_ERROR', 'message': 'At least one field is required.'}
        )
    
    # Check for username conflicts
    if 'username' in updates and updates['username'] != current_user.username:
        existing = db.query(User).filter(
            User.username == updates['username'],
            User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={'code': 'CONFLICT', 'message': 'Username already exists.'}
            )
        current_user.username = updates['username'].strip()
    
    # Check for email conflicts
    if 'email' in updates and updates['email'] != current_user.email:
        existing = db.query(User).filter(
            User.email == updates['email'].lower(),
            User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={'code': 'CONFLICT', 'message': 'Email already exists.'}
            )
        current_user.email = updates['email'].lower()
        current_user.email_verified = False  # Require re-verification
    
    # Update phone number
    if 'phone_number' in updates:
        current_user.phone_number = updates['phone_number'].strip()
    
    # Update password
    if 'password' in updates:
        current_user.password_hash = hash_password(updates['password'])
        
        # Revoke all other sessions when password changes
        db.query(DbSession).filter(
            DbSession.user_id == current_user.id,
            DbSession.revoked_at.is_(None)
        ).update({DbSession.revoked_at: datetime.utcnow()})
    
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    
    return build_user_out(db=db, user=current_user)
