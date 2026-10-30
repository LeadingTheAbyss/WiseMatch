"""Tiny in-process activity log. Every Qloo / Groq / agent decision lands here so the UI can
show the agent "thinking" live during a demo."""
import itertools
import time
from collections import deque

_counter = itertools.count(1)
EVENTS: deque[dict] = deque(maxlen=300)


def log(kind: str, title: str, detail: str = "", ms: int | None = None, source: str = "", ok: bool = True) -> dict:
    event = {
        "id": next(_counter),
        "t": int(time.time() * 1000),
        "kind": kind,  # pool | qloo | llm | decide
        "title": title,
        "detail": detail,
        "ms": ms,
        "source": source,
        "ok": ok,
    }
    EVENTS.append(event)
    return event


class Timer:
    def __enter__(self):
        self.start = time.perf_counter()
        return self

    def __exit__(self, *exc):
        self.ms = int((time.perf_counter() - self.start) * 1000)
        return False
