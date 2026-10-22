"""Простой in-memory rate limiter (скользящее окно).

Рассчитан на развёртывание в один процесс на одном VPS. При горизонтальном
масштабировании хранилище нужно вынести в Redis.
"""

import time
from collections import defaultdict, deque
from collections.abc import Callable

from fastapi import HTTPException, Request, status


class RateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def hit(self, key: str, limit: int, window: float) -> bool:
        now = time.monotonic()
        q = self._hits[key]
        while q and q[0] <= now - window:
            q.popleft()
        if len(q) >= limit:
            return False
        q.append(now)
        return True

    def reset(self) -> None:
        self._hits.clear()


limiter = RateLimiter()


def client_ip(request: Request) -> str:
    # Uvicorn запускается с --proxy-headers и доверяет только Caddy,
    # поэтому request.client уже содержит реальный адрес клиента.
    return request.client.host if request.client else "unknown"


def rate_limit(scope: str, limit: int, window: float) -> Callable[[Request], None]:
    def dependency(request: Request) -> None:
        if not limiter.hit(f"{scope}:{client_ip(request)}", limit, window):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Слишком много запросов. Повторите попытку позже.",
            )

    return dependency
