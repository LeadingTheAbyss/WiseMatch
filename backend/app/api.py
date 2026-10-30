import asyncio
import hashlib
import random
from collections import Counter
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from . import agent, llm, store, trace
from .auth import current_user, make_token
from .catalog import AREAS, ENTITIES, LANGUAGES, RELIGIONS, TAGS, TRAIT_QUESTIONS
from .db import IS_SQLITE, SessionLocal, get_db
from .engine import card, compat, heads_up, pool_for, rank, reasons_for
from .inbox import seed_inbox
from .models import Conversation, Interest, Listing, Message, User
from .qloo import qloo
from .store import LISTINGS, USERS

router = APIRouter(prefix="/api")

PERSIST_COLS = [c for c in store.USER_COLS if c != "id"]


def persist(me: dict) -> None:
    with SessionLocal() as db:
        u = db.get(User, me["id"])
        for k in PERSIST_COLS:
            setattr(u, k, me[k])
        db.commit()


# ----------------------------------------------------------------------------- views
def trait_chips(c: dict) -> list[dict]:
    chips = []
    for key, spec in TRAIT_QUESTIONS.items():
        val = c["traits"].get(key)
        if val is None:
            continue
        for v, label, emoji in spec["options"]:
            if v == val:
                chips.append({"key": key, "value": v, "label": label, "emoji": emoji})
    return chips


def pref_lines(c: dict) -> list[str]:
    out = []
    names = {"diet": "Diet", "smoking": "Smoking", "drinking": "Drinking", "sleep": "Sleep", "cleanliness": "Tidiness", "noise": "Noise", "guests": "Guests", "pets": "Pets", "social": "Social", "wfh": "Work", "cooking": "Cooking"}
    for key, accept in c["prefs"].items():
        if not accept:
            continue
        if key.startswith("tag:"):
            tag = key[4:]
            if tag in TAGS:
                out.append(f"{'Into' if accept == ['yes'] else 'Not into'} {TAGS[tag][0].lower()}")
            continue
        labels = {o[0]: o[1] for o in TRAIT_QUESTIONS[key]["options"]}
        out.append(f"{names[key]}: " + " / ".join(labels[a] for a in accept if a in labels))
    gp = {"same": "Same-gender roommate", "male": "Male roommate", "female": "Female roommate"}.get(c["gender_pref"])
    if gp:
        out.insert(0, gp)
    return out


def tag_chips(c: dict) -> list[dict]:
    return [{"key": t, "label": TAGS[t][0], "emoji": TAGS[t][1], "group": TAGS[t][2]} for t in c["tags"] if t in TAGS]


def counts_for(db: Session, uid: int) -> dict:
    unread = db.scalar(
        select(func.count()).select_from(Message).join(Conversation, Conversation.id == Message.conversation_id)
        .where(or_(Conversation.user_a == uid, Conversation.user_b == uid), Message.sender_id != uid, Message.read.is_(False))
    ) or 0
    liked_you = db.scalar(select(func.count()).select_from(Interest).where(Interest.to_id == uid)) or 0
    return {"unread": unread, "liked_you": liked_you}


def me_view(me: dict, db: Session) -> dict:
    listing = LISTINGS.get(me["id"])
    return {
        **{k: me[k] for k in ("id", "name", "age", "gender", "occupation", "area", "bio", "intent", "budget_min", "budget_max", "move_in", "gender_pref", "religion", "languages", "traits", "prefs", "custom_prefs", "taste", "onboarded", "verified")},
        "tags": tag_chips(me),
        "trait_chips": trait_chips(me),
        "answered": len(agent.answered_ids(me)),
        "listing": listing,
        "counts": counts_for(db, me["id"]),
    }


def profile_view(me: dict, c: dict, db: Session) -> dict:
    cm = compat(me, c)
    liked = db.scalar(select(Interest.id).where(Interest.from_id == me["id"], Interest.to_id == c["id"])) is not None
    liked_me = db.scalar(select(Interest.id).where(Interest.from_id == c["id"], Interest.to_id == me["id"])) is not None
    conv = _find_conv(db, me["id"], c["id"])
    return {
        **card(me, c, cm),
        "religion": c["religion"], "languages": c["languages"], "move_in": c["move_in"],
        "trait_chips": trait_chips(c), "all_tags": tag_chips(c), "taste": c["taste"], "looking_for": pref_lines(c),
        "breakdown": cm["breakdown"], "all_reasons": reasons_for(me, c, cm, 6), "heads_up": heads_up(me, c),
        "shared_entities": cm["shared_entities"],
        "listing": LISTINGS.get(c["id"]),
        "liked": liked, "liked_me": liked_me, "mutual": liked and liked_me, "conversation_id": conv.id if conv else None,
        "is_demo": c["is_demo"],
    }


# ----------------------------------------------------------------------------- meta
@router.get("/health")
def health():
    return {"ok": True, "users": len(USERS), "db": "sqlite" if IS_SQLITE else "postgres", "qloo": qloo.mode, "llm": "groq" if llm.available() else "off"}


@router.get("/catalog")
def catalog():
    return {
        "areas": [{"name": n, "lat": v[0], "lng": v[1]} for n, v in AREAS.items()],
        "tags": [{"key": k, "label": v[0], "emoji": v[1], "group": v[2]} for k, v in TAGS.items()],
        "traits": [
            {"key": k, "text": v["text"], "them": v["them"], "hard": v["hard"], "options": [{"value": o[0], "label": o[1], "emoji": o[2]} for o in v["options"]]}
            for k, v in TRAIT_QUESTIONS.items()
        ],
        "religions": RELIGIONS, "languages": LANGUAGES,
    }


@router.get("/stats")
def stats():
    by_area: dict[str, list[dict]] = {}
    for u in USERS.values():
        by_area.setdefault(u["area"], []).append(u)
    areas = []
    for name, people in by_area.items():
        lat, lng = AREAS[name][0], AREAS[name][1]
        rooms = sum(1 for p in people if p["intent"] == "has_room")
        areas.append({"name": name, "lat": lat, "lng": lng, "count": len(people), "rooms": rooms, "seekers": len(people) - rooms})
    areas.sort(key=lambda a: -a["count"])
    tag_counts = Counter(t for u in USERS.values() for t in u["tags"])
    return {
        "total": len(USERS),
        "rooms": sum(1 for u in USERS.values() if u["intent"] == "has_room"),
        "areas": areas,
        "top_tags": [{"key": k, "label": TAGS[k][0], "emoji": TAGS[k][1], "count": n} for k, n in tag_counts.most_common(10) if k in TAGS],
        "points": [{"id": u["id"], "lat": u["lat"], "lng": u["lng"], "name": u["name"], "intent": u["intent"], "area": u["area"]} for u in USERS.values()],
    }


@router.get("/agent/trace")
def agent_trace(after: int = 0, limit: int = 40):
    return {"events": [e for e in trace.EVENTS if e["id"] > after][-limit:], "qloo": qloo.mode, "llm": "groq" if llm.available() else "off"}


# ----------------------------------------------------------------------------- auth + profile
class GuestIn(BaseModel):
    name: str = Field(default="", max_length=60)


@router.post("/auth/guest")
def guest(body: GuestIn, db: Session = Depends(get_db)):
    name = body.name.strip() or "New roommate"
    u = User(name=name, age=25, gender="male", occupation="", area="Koramangala", lat=12.9352, lng=77.6245, bio="", intent="seeking",
             budget_min=12000, budget_max=22000, move_in="Flexible", traits={}, prefs={}, taste=[], tags=[], anti_tags=[],
             custom_prefs=[], answers={}, languages=["English"], onboarded=False, is_demo=False, verified=False, last_active="Active now")
    db.add(u)
    db.commit()
    store.refresh_user(u)
    return {"token": make_token(u.id), "user": me_view(USERS[u.id], db)}


class BasicsIn(BaseModel):
    name: str = Field(max_length=60)
    age: int = Field(ge=18, le=70)
    gender: str
    occupation: str = ""
    area: str
    budget_min: int = Field(ge=3000)
    budget_max: int = Field(le=200000)
    intent: str = "seeking"
    gender_pref: str = "any"
    move_in: str = "Flexible"


@router.put("/me/basics")
def set_basics(body: BasicsIn, me: dict = Depends(current_user), db: Session = Depends(get_db)):
    if body.area not in AREAS:
        raise HTTPException(400, "Unknown area")
    if body.gender not in ("male", "female", "non-binary") or body.intent not in ("seeking", "has_room") or body.gender_pref not in ("any", "same", "male", "female"):
        raise HTTPException(400, "Invalid value")
    rng = random.Random(me["id"])
    me.update(
        name=body.name.strip(), age=body.age, gender=body.gender, occupation=body.occupation.strip(), area=body.area,
        lat=round(AREAS[body.area][0] + rng.uniform(-0.004, 0.004), 5), lng=round(AREAS[body.area][1] + rng.uniform(-0.004, 0.004), 5),
        budget_min=min(body.budget_min, body.budget_max), budget_max=max(body.budget_min, body.budget_max),
        intent=body.intent, gender_pref=body.gender_pref, move_in=body.move_in,
    )
    first_time = not me["onboarded"]
    me["onboarded"] = True
    persist(me)
    if first_time:
        seed_inbox(db, me)
    return me_view(me, db)


class ProfileIn(BaseModel):
    name: str | None = None
    age: int | None = None
    occupation: str | None = None
    bio: str | None = None
    area: str | None = None
    budget_min: int | None = None
    budget_max: int | None = None
    intent: str | None = None
    gender_pref: str | None = None
    move_in: str | None = None
    religion: str | None = None
    languages: list[str] | None = None
    traits: dict[str, str] | None = None
    prefs: dict[str, list[str]] | None = None
    custom_prefs: list[dict] | None = None


@router.get("/me")
def get_me(me: dict = Depends(current_user), db: Session = Depends(get_db)):
    return me_view(me, db)


@router.patch("/me")
def patch_me(body: ProfileIn, me: dict = Depends(current_user), db: Session = Depends(get_db)):
    data = body.model_dump(exclude_none=True)
    if "area" in data:
        if data["area"] not in AREAS:
            raise HTTPException(400, "Unknown area")
        me["lat"], me["lng"] = AREAS[data["area"]][0], AREAS[data["area"]][1]
    for k in ("name", "age", "occupation", "bio", "area", "budget_min", "budget_max", "intent", "gender_pref", "move_in", "religion", "languages"):
        if k in data:
            me[k] = data[k]
    if "traits" in data:
        for k, v in data["traits"].items():
            if k in TRAIT_QUESTIONS and v in [o[0] for o in TRAIT_QUESTIONS[k]["options"]]:
                me["traits"][k] = v
    if "prefs" in data:
        for k, v in data["prefs"].items():
            if k in TRAIT_QUESTIONS or k.startswith("tag:"):
                if v:
                    me["prefs"][k] = v
                else:
                    me["prefs"].pop(k, None)
    if "custom_prefs" in data:
        me["custom_prefs"] = [{"text": str(p.get("text", ""))[:120], "kind": "avoid" if p.get("kind") == "avoid" else "want"} for p in data["custom_prefs"] if p.get("text")][:10]
    persist(me)
    return me_view(me, db)


class ListingIn(BaseModel):
    title: str
    rent: int
    deposit: int = 0
    room_type: str = "Private room"
    flat_type: str = "2 BHK"
    furnishing: str = "Semi-furnished"
    amenities: list[str] = []
    description: str = ""
    available_from: str = "Immediately"


@router.put("/me/listing")
def put_listing(body: ListingIn, me: dict = Depends(current_user), db: Session = Depends(get_db)):
    item = db.scalar(select(Listing).where(Listing.user_id == me["id"]))
    if not item:
        item = Listing(user_id=me["id"], area=me["area"], hue=random.randint(0, 359), photos=4, title=body.title, rent=body.rent)
        db.add(item)
    for k, v in body.model_dump().items():
        setattr(item, k, v)
    item.area = me["area"]
    me["intent"] = "has_room"
    db.commit()
    store.refresh_listing(item)
    persist(me)
    return me_view(me, db)


class FavIn(BaseModel):
    name: str
    type: str = "artist"
    id: str = ""


@router.get("/qloo/search")
async def qloo_search(q: str, type: str | None = None):
    return {"source": qloo.mode, "results": await qloo.search(q, type, take=8)}


@router.post("/me/favourites")
async def add_favourite(body: FavIn, me: dict = Depends(current_user)):
    if any(e["name"] == body.name for e in me["taste"]):
        return {"taste": me["taste"]}
    tags = ENTITIES.get(body.name, {}).get("tags", [])
    me["taste"] = (me["taste"] + [{"id": body.id or "custom:" + body.name.lower(), "name": body.name, "type": body.type, "tags": tags}])[-24:]
    me["tags"] = sorted(set(me["tags"]) | set(tags))
    me["_tags"], me["_names"] = set(me["tags"]), {e["name"] for e in me["taste"]}
    await run_in_threadpool(persist, me)
    return {"taste": me["taste"], "tags": tag_chips(me)}


@router.delete("/me/favourites")
async def remove_favourite(name: str, me: dict = Depends(current_user)):
    me["taste"] = [e for e in me["taste"] if e["name"] != name]
    me["_names"] = {e["name"] for e in me["taste"]}
    await run_in_threadpool(persist, me)
    return {"taste": me["taste"]}


# ----------------------------------------------------------------------------- agent
class AnswerIn(BaseModel):
    question_id: str
    you: str
    them: list[str] = []


@router.post("/agent/next")
async def agent_next(me: dict = Depends(current_user)):
    return await agent.next_step(me)


@router.post("/agent/answer")
async def agent_answer(body: AnswerIn, me: dict = Depends(current_user)):
    try:
        agent.apply_answer(me, body.question_id, body.you, body.them)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    await run_in_threadpool(persist, me)
    return await agent.next_step(me)


@router.post("/agent/undo")
async def agent_undo(me: dict = Depends(current_user)):
    agent.undo_last(me)
    await run_in_threadpool(persist, me)
    return await agent.next_step(me)


@router.post("/agent/reset")
async def agent_reset(me: dict = Depends(current_user)):
    me.update(traits={}, prefs={}, tags=[t for t in me["tags"] if False], anti_tags=[], answers={})
    me["_tags"], me["_anti"] = set(), set()
    await run_in_threadpool(persist, me)
    return await agent.next_step(me)


# ----------------------------------------------------------------------------- matches
@router.get("/matches")
def matches(
    sort: str = "score", areas: str = "", intent: str = "", min_score: int = 0, q: str = "", verified: bool = False,
    max_km: float = 0, limit: int = 30, offset: int = 0, me: dict = Depends(current_user),
):
    pool = pool_for(me)
    ranked = rank(me, pool)
    wanted = {a for a in areas.split(",") if a}
    needle = q.strip().lower()
    out = []
    for c, cm in ranked:
        if cm["score"] < min_score or (wanted and c["area"] not in wanted) or (intent and c["intent"] != intent) or (verified and not c["verified"]):
            continue
        if max_km and cm["distance_km"] > max_km:
            continue
        if needle and needle not in (c["name"] + " " + c["occupation"] + " " + c["area"]).lower():
            continue
        out.append((c, cm))
    if sort == "distance":
        out.sort(key=lambda x: x[1]["distance_km"])
    elif sort == "budget":
        out.sort(key=lambda x: x[0]["budget_min"])
    return {
        "total": len(out),
        "pool": {"initial": len(pool_for(me, use_answers=False)), "remaining": len(pool)},
        "answered": len(agent.answered_ids(me)),
        "items": [card(me, c, cm) for c, cm in out[offset:offset + limit]],
    }


@router.get("/users/{uid}")
def get_user(uid: int, me: dict = Depends(current_user), db: Session = Depends(get_db)):
    c = USERS.get(uid)
    if not c:
        raise HTTPException(404, "No such user")
    return profile_view(me, c, db)


@router.post("/users/{uid}/explain")
async def explain_user(uid: int, me: dict = Depends(current_user)):
    c = USERS.get(uid)
    if not c:
        raise HTTPException(404, "No such user")
    cm = compat(me, c)
    explanation, spots = await asyncio.gather(
        agent.explain(me, c),
        qloo.hangout_spots(cm["shared_entities"] + [e["name"] for e in me["taste"][:3]], cm["shared_tags"]),
    )
    return {**explanation, "spots": spots["spots"], "spots_source": spots["source"]}


# ----------------------------------------------------------------------------- interest + chat
def _find_conv(db: Session, a: int, b: int) -> Conversation | None:
    return db.scalar(select(Conversation).where(or_(and_(Conversation.user_a == a, Conversation.user_b == b), and_(Conversation.user_a == b, Conversation.user_b == a))))


def _like_back(me: dict, c: dict, score: int) -> bool:
    if not c["is_demo"]:
        return False
    h = int(hashlib.md5(f"{me['id']}:{c['id']}".encode()).hexdigest(), 16) % 100
    return h < (92 if score >= 80 else 60 if score >= 65 else 28)


@router.post("/users/{uid}/like")
def like(uid: int, me: dict = Depends(current_user), db: Session = Depends(get_db)):
    c = USERS.get(uid)
    if not c or uid == me["id"]:
        raise HTTPException(404, "No such user")
    if not db.scalar(select(Interest.id).where(Interest.from_id == me["id"], Interest.to_id == uid)):
        db.add(Interest(from_id=me["id"], to_id=uid))
        db.commit()
    cm = compat(me, c)
    if not db.scalar(select(Interest.id).where(Interest.from_id == uid, Interest.to_id == me["id"])) and _like_back(me, c, cm["score"]):
        db.add(Interest(from_id=uid, to_id=me["id"]))
        db.commit()
    mutual = db.scalar(select(Interest.id).where(Interest.from_id == uid, Interest.to_id == me["id"])) is not None
    conv_id = None
    if mutual:
        conv = _find_conv(db, me["id"], uid)
        if not conv:
            conv = Conversation(user_a=me["id"], user_b=uid)
            db.add(conv)
            db.flush()
            tag = TAGS[cm["shared_tags"][0]][0].lower() if cm["shared_tags"] else None
            hello = f"Hey {me['name'].split()[0]}! Looks like we both liked each other 🙂" + (f" Saw you're into {tag} too." if tag else "")
            db.add(Message(conversation_id=conv.id, sender_id=uid, body=hello))
            db.commit()
        conv_id = conv.id
    return {"liked": True, "mutual": mutual, "conversation_id": conv_id}


@router.delete("/users/{uid}/like")
def unlike(uid: int, me: dict = Depends(current_user), db: Session = Depends(get_db)):
    db.query(Interest).filter(Interest.from_id == me["id"], Interest.to_id == uid).delete()
    db.commit()
    return {"liked": False}


@router.get("/likes")
def likes(me: dict = Depends(current_user), db: Session = Depends(get_db)):
    got = [r for r in db.scalars(select(Interest.from_id).where(Interest.to_id == me["id"]))]
    sent = {r for r in db.scalars(select(Interest.to_id).where(Interest.from_id == me["id"]))}
    items = []
    for uid in got:
        c = USERS.get(uid)
        if c:
            cm = compat(me, c)
            items.append({**card(me, c, cm), "matched": uid in sent})
    items.sort(key=lambda x: -x["score"])
    return {"liked_you": [i for i in items if not i["matched"]], "matches": [i for i in items if i["matched"]]}


def _msg(m: Message, me_id: int) -> dict:
    return {"id": m.id, "body": m.body, "mine": m.sender_id == me_id, "at": m.created_at.isoformat() + "Z", "read": m.read}


@router.get("/conversations")
def conversations(me: dict = Depends(current_user), db: Session = Depends(get_db)):
    convs = db.scalars(select(Conversation).where(or_(Conversation.user_a == me["id"], Conversation.user_b == me["id"]))).all()
    out = []
    for cv in convs:
        other_id = cv.user_b if cv.user_a == me["id"] else cv.user_a
        c = USERS.get(other_id)
        if not c:
            continue
        last = db.scalar(select(Message).where(Message.conversation_id == cv.id).order_by(Message.id.desc()).limit(1))
        unread = db.scalar(select(func.count()).select_from(Message).where(Message.conversation_id == cv.id, Message.sender_id != me["id"], Message.read.is_(False))) or 0
        cm = compat(me, c)
        out.append({
            "id": cv.id, "other": {"id": c["id"], "name": c["name"], "area": c["area"], "verified": c["verified"], "last_active": c["last_active"], "score": cm["score"], "occupation": c["occupation"]},
            "last": _msg(last, me["id"]) if last else None, "unread": unread,
            "sort": (last.created_at if last else cv.created_at).isoformat(),
        })
    out.sort(key=lambda x: x["sort"], reverse=True)
    return {"items": out}


def _own_conv(db: Session, cid: int, me_id: int) -> Conversation:
    cv = db.get(Conversation, cid)
    if not cv or me_id not in (cv.user_a, cv.user_b):
        raise HTTPException(404, "No such conversation")
    return cv


@router.get("/conversations/{cid}/messages")
def messages(cid: int, after: int = 0, me: dict = Depends(current_user), db: Session = Depends(get_db)):
    cv = _own_conv(db, cid, me["id"])
    other = USERS[cv.user_b if cv.user_a == me["id"] else cv.user_a]
    rows = db.scalars(select(Message).where(Message.conversation_id == cid, Message.id > after).order_by(Message.id)).all()
    changed = False
    for m in rows:
        if m.sender_id != me["id"] and not m.read:
            m.read = True
            changed = True
    if changed:
        db.commit()
    cm = compat(me, other)
    return {
        "other": {"id": other["id"], "name": other["name"], "area": other["area"], "verified": other["verified"], "last_active": other["last_active"], "is_demo": other["is_demo"], "score": cm["score"], "occupation": other["occupation"]},
        "messages": [_msg(m, me["id"]) for m in rows],
    }


class MessageIn(BaseModel):
    body: str = Field(min_length=1, max_length=1000)


async def _demo_reply(cid: int, other_id: int, me_id: int, me_name: str) -> None:
    await asyncio.sleep(random.uniform(1.2, 2.6))
    with SessionLocal() as db:
        rows = db.scalars(select(Message).where(Message.conversation_id == cid).order_by(Message.id.desc()).limit(12)).all()
        history = [{"from_them": m.sender_id == other_id, "body": m.body} for m in reversed(rows)]
    c = USERS[other_id]
    text = await agent.persona_reply(c, me_name.split()[0], history)
    with SessionLocal() as db:
        db.query(Message).filter(Message.conversation_id == cid, Message.sender_id == me_id).update({"read": True})
        db.add(Message(conversation_id=cid, sender_id=other_id, body=text))
        db.commit()


@router.post("/conversations/{cid}/messages")
def send(cid: int, body: MessageIn, tasks: BackgroundTasks, me: dict = Depends(current_user), db: Session = Depends(get_db)):
    cv = _own_conv(db, cid, me["id"])
    other_id = cv.user_b if cv.user_a == me["id"] else cv.user_a
    m = Message(conversation_id=cid, sender_id=me["id"], body=body.body.strip())
    db.add(m)
    db.commit()
    if USERS[other_id]["is_demo"]:
        tasks.add_task(_demo_reply, cid, other_id, me["id"], me["name"])
    return _msg(m, me["id"])


@router.post("/users/{uid}/chat")
def open_chat(uid: int, me: dict = Depends(current_user), db: Session = Depends(get_db)):
    """Open (or create) a conversation. Needs mutual interest, like the product spec."""
    c = USERS.get(uid)
    if not c:
        raise HTTPException(404, "No such user")
    conv = _find_conv(db, me["id"], uid)
    if conv:
        return {"conversation_id": conv.id}
    raise HTTPException(403, "Both of you need to like each other first")
