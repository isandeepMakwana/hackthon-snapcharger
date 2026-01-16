from sqlalchemy.orm import Session
from app.db.models.driver_profile import DriverProfile
from app.db.models.host_profile import HostProfile
from app.db.models.user import User
from app.models.user import UserOut


def build_user_out(db: Session, user: User) -> UserOut:
    user_out = UserOut.model_validate(user)
    user_out.driver_profile_complete = db.query(DriverProfile).filter(
        DriverProfile.user_id == user.id
    ).first() is not None
    user_out.host_profile_complete = db.query(HostProfile).filter(
        HostProfile.user_id == user.id
    ).first() is not None
    return user_out
