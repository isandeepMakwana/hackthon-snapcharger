from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from starlette import status
from app.api.deps import get_current_user, get_db, require_role, require_self_or_admin
from app.db.models.user import User
from app.models.user import UserCreate, UserList, UserOut, UserUpdate
from app.security import hash_password

router = APIRouter(prefix='/api/users', tags=['users'])


@router.get('', response_model=UserList)
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin_user: User = Depends(require_role('admin')),
    db: Session = Depends(get_db)
) -> UserList:
    offset = (page - 1) * limit
    users = db.query(User).order_by(User.created_at.desc()).offset(offset).limit(limit).all()
    total = db.query(User).count()

    return UserList(
        data=[UserOut.model_validate(user) for user in users],
        page=page,
        limit=limit,
        total=total
    )


@router.post('', response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    admin_user: User = Depends(require_role('admin')),
    db: Session = Depends(get_db)
) -> UserOut:
    role = payload.role or 'driver'
    if role not in {'driver', 'host', 'admin'}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'code': 'VALIDATION_ERROR', 'message': 'Invalid role.'}
        )

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
        role=role,
        permissions=payload.permissions
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return UserOut.model_validate(user)


@router.get('/{user_id}', response_model=UserOut)
async def get_user(
    user_id: str,
    current_user: User = Depends(require_self_or_admin),
    db: Session = Depends(get_db)
) -> UserOut:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={'code': 'NOT_FOUND', 'message': 'User not found.'}
        )

    return UserOut.model_validate(user)


@router.patch('/{user_id}', response_model=UserOut)
async def update_user(
    user_id: str,
    payload: UserUpdate,
    current_user: User = Depends(require_self_or_admin),
    db: Session = Depends(get_db)
) -> UserOut:
    if payload.role or payload.permissions:
        if current_user.role != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={'code': 'FORBIDDEN', 'message': 'Only admins can update roles or permissions.'}
            )

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'code': 'VALIDATION_ERROR', 'message': 'At least one field is required.'}
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={'code': 'NOT_FOUND', 'message': 'User not found.'}
        )

    if 'username' in updates:
        existing = db.query(User).filter(User.username == updates['username']).filter(User.id != user_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={'code': 'CONFLICT', 'message': 'Username already exists.'}
            )
        user.username = updates['username'].strip()

    if 'email' in updates:
        existing = db.query(User).filter(User.email == updates['email'].lower()).filter(User.id != user_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={'code': 'CONFLICT', 'message': 'Email already exists.'}
            )
        user.email = updates['email'].lower()

    if 'password' in updates:
        user.password_hash = hash_password(updates['password'])

    if 'role' in updates:
        if updates['role'] not in {'driver', 'host', 'admin'}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={'code': 'VALIDATION_ERROR', 'message': 'Invalid role.'}
            )
        user.role = updates['role']

    if 'permissions' in updates:
        user.permissions = updates['permissions']

    db.commit()
    db.refresh(user)

    return UserOut.model_validate(user)


@router.delete('/{user_id}', response_model=UserOut)
async def delete_user(
    user_id: str,
    admin_user: User = Depends(require_role('admin')),
    db: Session = Depends(get_db)
) -> UserOut:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={'code': 'NOT_FOUND', 'message': 'User not found.'}
        )

    db.delete(user)
    db.commit()

    return UserOut.model_validate(user)
