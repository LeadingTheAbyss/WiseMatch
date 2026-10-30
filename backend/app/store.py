"""In-memory mirror of users and listings.

Matching scans every profile on each question, so we keep plain dicts in RAM (650 rows, a few MB)
and write through to the database on every change.
"""
import threading

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Listing, User

USER_COLS = [
    "id", "name", "age", "gender", "occupation", "area", "lat", "lng", "bio", "intent", "budget_min", "budget_max",
    "move_in", "gender_pref", "religion", "languages", "traits", "prefs", "taste", "tags", "anti_tags", "custom_prefs",
    "answers", "onboarded", "is_demo", "verified", "last_active",
]
LISTING_COLS = ["id", "user_id", "title", "area", "rent", "deposit", "room_type", "flat_type", "furnishing", "amenities", "description", "available_from", "photos", "hue"]

USERS: dict[int, dict] = {}
LISTINGS: dict[int, dict] = {}  # keyed by owner user_id
lock = threading.RLock()


def user_dict(u: User) -> dict:
    d = {c: getattr(u, c) for c in USER_COLS}
    d["languages"] = list(d["languages"] or [])
    d["traits"] = dict(d["traits"] or {})
    d["prefs"] = dict(d["prefs"] or {})
    d["taste"] = list(d["taste"] or [])
    d["tags"] = list(d["tags"] or [])
    d["anti_tags"] = list(d["anti_tags"] or [])
    d["custom_prefs"] = list(d["custom_prefs"] or [])
    d["answers"] = dict(d["answers"] or {})
    d["_tags"] = set(d["tags"])
    d["_anti"] = set(d["anti_tags"])
    d["_names"] = {e["name"] for e in d["taste"]}
    return d


def listing_dict(item: Listing) -> dict:
    d = {c: getattr(item, c) for c in LISTING_COLS}
    d["amenities"] = list(d["amenities"] or [])
    return d


def load_all(db: Session) -> None:
    with lock:
        USERS.clear()
        LISTINGS.clear()
        for u in db.scalars(select(User)):
            USERS[u.id] = user_dict(u)
        for item in db.scalars(select(Listing)):
            LISTINGS[item.user_id] = listing_dict(item)


def refresh_user(u: User) -> dict:
    with lock:
        USERS[u.id] = user_dict(u)
        return USERS[u.id]


def refresh_listing(item: Listing) -> None:
    with lock:
        LISTINGS[item.user_id] = listing_dict(item)
