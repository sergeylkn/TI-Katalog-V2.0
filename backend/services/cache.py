"""Async LRU cache. TTL=5min, max=256 entries."""

import asyncio, hashlib, time
from collections import OrderedDict
from typing import Any, Optional

_lock  = asyncio.Lock()
_store: OrderedDict = OrderedDict()
_MAX, _TTL = 256, 300


def _k(q: str, sid: Optional[str]) -> str:
    return hashlib.md5(f"{q.lower()}|{sid or ''}".encode()).hexdigest()


async def cache_get(q: str, sid: Optional[str] = None) -> Optional[Any]:
    k = _k(q, sid)
    async with _lock:
        if k not in _store:
            return None
        ts, val = _store[k]
        if time.time() - ts > _TTL:
            del _store[k]; return None
        _store.move_to_end(k)
        return val


async def cache_set(q: str, val: Any, sid: Optional[str] = None):
    k = _k(q, sid)
    async with _lock:
        _store[k] = (time.time(), val)
        _store.move_to_end(k)
        while len(_store) > _MAX:
            _store.popitem(last=False)


async def cache_clear() -> int:
    async with _lock:
        n = len(_store); _store.clear(); return n


async def cache_stats() -> dict:
    async with _lock:
        now = time.time()
        alive = sum(1 for ts, _ in _store.values() if now - ts <= _TTL)
        return {"total": len(_store), "alive": alive, "ttl_seconds": _TTL}
