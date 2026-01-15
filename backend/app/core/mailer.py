from datetime import datetime
from uuid import uuid4

_email_log: list[dict] = []


def send_email(payload: dict) -> dict:
    record = {
        'id': str(uuid4()),
        'sent_at': datetime.utcnow().isoformat(),
        **payload
    }
    _email_log.append(record)
    return record


def send_verification_email(to: str, username: str, link: str) -> dict:
    return send_email({
        'to': to,
        'subject': 'Verify your SnapCharge account',
        'type': 'verification',
        'meta': {'link': link, 'username': username}
    })


def send_password_reset_email(to: str, link: str) -> dict:
    return send_email({
        'to': to,
        'subject': 'Reset your SnapCharge password',
        'type': 'password_reset',
        'meta': {'link': link}
    })


def get_email_log() -> list[dict]:
    return list(_email_log)


def clear_email_log() -> None:
    _email_log.clear()
