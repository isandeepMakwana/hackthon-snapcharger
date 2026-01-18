import time
from typing import Any


class RouteCache:
    def __init__(self) -> None:
        self._entries: dict[str, tuple[float, dict[str, Any]]] = {}

    def get(self, key: str) -> dict[str, Any] | None:
        entry = self._entries.get(key)
        if not entry:
            return None
        expires_at, payload = entry
        if time.time() >= expires_at:
            self._entries.pop(key, None)
            return None
        return payload

    def set(self, key: str, payload: dict[str, Any], ttl_seconds: int) -> None:
        self._entries[key] = (time.time() + ttl_seconds, payload)


route_cache = RouteCache()
