import time
from collections import deque
from threading import Lock
from fastapi import HTTPException, Request
from starlette import status


class RateLimiter:
    def __init__(self) -> None:
        self.storage: dict[str, deque] = {}
        self.lock = Lock()

    def is_allowed(self, key: str, limit: int, window_seconds: int) -> bool:
        now = time.time()
        with self.lock:
            window = self.storage.get(key)
            if window is None:
                window = deque()
                self.storage[key] = window

            while window and window[0] <= now - window_seconds:
                window.popleft()

            if len(window) >= limit:
                return False

            window.append(now)
            return True


limiter = RateLimiter()


def rate_limit(limit: int, window_seconds: int):
    async def dependency(request: Request) -> None:
        client_ip = request.client.host if request.client else 'unknown'
        key = f'{client_ip}:{request.url.path}'
        if not limiter.is_allowed(key, limit, window_seconds):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    'code': 'RATE_LIMITED',
                    'message': 'Too many requests. Please try again later.'
                }
            )

    return dependency
