"""Matching engine: hard filters, Akinator-style question scoring and the compatibility model.

Everything here is deterministic maths over the in-memory store. The agent (agent.py) layers
Qloo and the LLM on top of it to choose and phrase the next question.
"""
from collections import Counter
from math import asin, cos, exp, log2, radians, sin, sqrt

from .catalog import AREAS, HARD_KEYS, SIMILARITY_WEIGHTS, TAGS, TRAIT_QUESTIONS
from .store import LISTINGS, USERS

MAX_QUESTIONS = 12
STOP_POOL = 8


# ----------------------------------------------------------------------------- helpers
def km(a: dict, b: dict) -> float:
    la1, lo1, la2, lo2 = map(radians, (a["lat"], a["lng"], b["lat"], b["lng"]))
    h = sin((la2 - la1) / 2) ** 2 + cos(la1) * cos(la2) * sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * asin(sqrt(h))


def gender_ok(pref: str, own: str, other: str) -> bool:
    if pref == "any":
        return True
    if pref == "same":
        return other == own
    return other == pref


def option_values(key: str) -> list[str]:
    return [o[0] for o in TRAIT_QUESTIONS[key]["options"]]


def feature_value(c: dict, qid: str) -> str | None:
    if qid.startswith("tag:"):
        return "yes" if qid[4:] in c["_tags"] else "no"
    return c["traits"].get(qid)


# ----------------------------------------------------------------------------- hard filters
def basics_ok(me: dict, c: dict) -> bool:
    """Filters that come from the basics step: who, budget and what each side is looking for."""
    if c["id"] == me["id"] or not c["onboarded"]:
        return False
    if me["intent"] == "has_room" and c["intent"] == "has_room":
        return False
    if not gender_ok(me["gender_pref"], me["gender"], c["gender"]):
        return False
    if not gender_ok(c["gender_pref"], c["gender"], me["gender"]):
        return False
    if me["budget_max"] > 0:  # budget is optional now: it lives in the results filters
        if max(me["budget_min"], c["budget_min"]) > min(me["budget_max"], c["budget_max"]) * 1.1:
            return False
        listing = LISTINGS.get(c["id"])
        if listing and me["intent"] == "seeking" and listing["rent"] > me["budget_max"] * 1.15:
            return False
    mine = LISTINGS.get(me["id"])
    if mine and c["intent"] == "seeking" and mine["rent"] > c["budget_max"] * 1.15:
        return False
    return True


def answers_ok(me: dict, c: dict) -> bool:
    """Deal-breakers (diet, smoking, drinking) removed outright, from both sides."""
    for key in HARD_KEYS:
        accept = me["prefs"].get(key)
        if accept and c["traits"].get(key) not in accept:
            return False
        theirs = c["prefs"].get(key)
        mine = me["traits"].get(key)
        if theirs and mine is not None and mine not in theirs:
            return False
    return True


def pool_for(me: dict, use_answers: bool = True) -> list[dict]:
    out = [c for c in USERS.values() if basics_ok(me, c)]
    if use_answers:
        out = [c for c in out if answers_ok(me, c)]
    return out


# ----------------------------------------------------------------------------- question scoring
def split_stats(pool: list[dict], qid: str, values: list[str]) -> dict | None:
    counts = Counter(v for v in (feature_value(c, qid) for c in pool) if v in values)
    n = sum(counts.values())
    if n < 5:
        return None
    p = [counts.get(v, 0) / n for v in values]
    ent = -sum(x * log2(x) for x in p if x > 0) / log2(len(values))
    return {
        "counts": {v: counts.get(v, 0) for v in values},
        "n": n,
        "entropy": ent,
        "max_share": max(p),
        "expected_keep": sum(x * x for x in p),
    }


def rank_questions(me: dict, pool: list[dict], limit: int = 6) -> list[dict]:
    asked = set(me["answers"])
    recent = [q for q in me["answers"].get("_order", [])[-2:]]
    taste_streak = len(recent) == 2 and all(q.startswith("tag:") for q in recent)
    out = []
    for key, q in TRAIT_QUESTIONS.items():
        if key in asked:
            continue
        st = split_stats(pool, key, option_values(key))
        if not st or st["max_share"] > 0.9:
            continue
        score = st["entropy"] * q["weight"] * (1.2 if q["hard"] else 1.0)
        out.append({"id": key, "kind": "trait", "label": q["text"], "hard": q["hard"], "score": score, "stats": st})
    for tag, (label, _e, _g, _x) in TAGS.items():
        qid = f"tag:{tag}"
        if qid in asked or tag in me["_tags"] or tag in me["_anti"]:
            continue
        st = split_stats(pool, qid, ["yes", "no"])
        if not st or st["max_share"] > 0.88:
            continue
        score = st["entropy"] * 1.2 * (0.7 if taste_streak else 1.0)
        out.append({"id": qid, "kind": "taste", "label": label, "hard": False, "score": score, "stats": st})
    out.sort(key=lambda x: x["score"], reverse=True)
    return out[:limit]


# ----------------------------------------------------------------------------- compatibility
def _diet_sim(a: str, b: str) -> float:
    if a == b:
        return 1.0
    pair = {a, b}
    if pair == {"veg", "eggetarian"}:
        return 0.75
    if pair == {"veg", "vegan"}:
        return 0.8
    if pair == {"eggetarian", "vegan"}:
        return 0.6
    if "non_veg" in pair and "vegan" in pair:
        return 0.2
    return 0.35


def lifestyle_sim(me: dict, c: dict) -> float:
    num = den = 0.0
    for key, w in SIMILARITY_WEIGHTS.items():
        a, b = me["traits"].get(key), c["traits"].get(key)
        if a is None or b is None:
            continue
        if key == "diet":
            s = _diet_sim(a, b)
        else:
            vals = option_values(key)
            s = 1 - abs(vals.index(a) - vals.index(b)) / (len(vals) - 1)
        num += s * w
        den += w
    # shrink toward a neutral prior until we actually know enough about both people
    return (num + 2.0 * 0.6) / (den + 2.0)


def _custom_hits(me: dict, c: dict) -> tuple[float, float]:
    text = " ".join([c["bio"], c["occupation"], " ".join(e["name"] for e in c["taste"]), " ".join(TAGS[t][0] for t in c["tags"] if t in TAGS)]).lower()
    want = avoid = 0.0
    for cp in me["custom_prefs"]:
        words = [w for w in cp.get("text", "").lower().replace(",", " ").split() if len(w) > 3]
        hit = any(w in text for w in words)
        if hit and cp.get("kind") == "avoid":
            avoid += 1
        elif hit:
            want += 1
    return want, avoid


def pref_score(me: dict, c: dict) -> float:
    ok = total = 0.0
    for key, accept in me["prefs"].items():
        if not accept or key in HARD_KEYS:
            continue
        total += 1
        if key.startswith("tag:"):
            has = key[4:] in c["_tags"]
            ok += 1 if (accept == ["yes"]) == has else 0
        elif key == "religion":
            ok += 1 if c["religion"] in accept else 0
        else:
            ok += 1 if c["traits"].get(key) in accept else 0
    for key, accept in c["prefs"].items():
        if not accept or key in HARD_KEYS or key.startswith("tag:") or key == "religion":
            continue
        mine = me["traits"].get(key)
        if mine is None:
            continue
        total += 1
        ok += 1 if mine in accept else 0
    want, avoid = _custom_hits(me, c)
    base = ok / total if total else 0.78
    return max(0.0, min(1.0, base + 0.06 * want - 0.15 * avoid))


def taste_score(me: dict, c: dict) -> tuple[float, list[str], list[str]]:
    a, b = me["_tags"], c["_tags"]
    shared = sorted(a & b)
    shared_ents = sorted(me["_names"] & c["_names"])
    if not a or not b:
        return 0.45, shared, shared_ents
    overlap = len(shared) / min(len(a), len(b))
    jac = len(shared) / len(a | b)
    t = 0.55 * overlap + 0.45 * jac * 1.6
    t += min(0.12, 0.04 * len(shared_ents))
    t -= 0.06 * len(me["_anti"] & b)
    conf = len(a) / (len(a) + 2)  # few known tastes: stay close to neutral
    t = conf * t + (1 - conf) * 0.45
    return max(0.0, min(1.0, t)), shared, shared_ents


def budget_score(me: dict, c: dict) -> float:
    if me["budget_max"] <= 0 or c["budget_max"] <= 0:
        return 0.7
    lo, hi = max(me["budget_min"], c["budget_min"]), min(me["budget_max"], c["budget_max"])
    span = min(me["budget_max"] - me["budget_min"], c["budget_max"] - c["budget_min"]) or 1
    return max(0.0, min(1.0, (hi - lo) / span + 0.35)) if hi >= lo else 0.3


def location_score(d_km: float) -> float:
    return max(0.1, exp(-d_km / 9))


def compat(me: dict, c: dict) -> dict:
    life = lifestyle_sim(me, c)
    pref = pref_score(me, c)
    taste, shared, shared_ents = taste_score(me, c)
    bud = budget_score(me, c)
    located = bool(me["area"])
    dist = km(me, c) if located else None
    loc = location_score(dist) if located else 0.6
    raw = 0.35 * life + 0.15 * pref + 0.30 * taste + 0.10 * bud + 0.10 * loc
    score = int(round(min(99, 35 + 65 * min(1.0, raw / 0.85) ** 1.2)))
    return {
        "score": score,
        "breakdown": {
            "lifestyle": round(life * 100), "taste": round(taste * 100), "preferences": round(pref * 100),
            "budget": round(bud * 100), "location": round(loc * 100),
        },
        "shared_tags": shared,
        "shared_entities": shared_ents,
        "distance_km": round(dist, 1) if dist is not None else None,
    }


def reasons_for(me: dict, c: dict, cm: dict, limit: int = 4) -> list[dict]:
    out: list[dict] = []
    for t in cm["shared_tags"][:2]:
        out.append({"icon": TAGS[t][1], "text": f"Both into {TAGS[t][0].lower()}"})
    if cm["shared_entities"]:
        out.append({"icon": "✨", "text": f"You both love {cm['shared_entities'][0]}"})
    mt, ct = me["traits"], c["traits"]
    labels = {
        "sleep": {"early_bird": "early birds", "night_owl": "night owls", "flexible": "flexible sleepers"},
        "cleanliness": {"neat": "spotless", "tidy": "reasonably tidy", "easygoing": "easygoing about mess"},
        "noise": {"quiet": "quiet at home", "moderate": "moderate on volume", "lively": "fine with a lively home"},
        "diet": {"veg": "vegetarian", "non_veg": "non-veg", "eggetarian": "eggetarian", "vegan": "vegan"},
        "guests": {"rarely": "rarely hosting", "sometimes": "occasionally hosting", "often": "happy hosting"},
    }
    icons = {"sleep": "🌙", "cleanliness": "🧼", "noise": "🎧", "diet": "🥗", "guests": "🏠"}
    for key in ("sleep", "cleanliness", "diet", "noise", "guests"):
        if mt.get(key) and mt.get(key) == ct.get(key):
            who = "Both" if key not in ("diet",) else "Both"
            out.append({"icon": icons[key], "text": f"{who} {labels[key][mt[key]]}"})
    if cm["breakdown"]["budget"] >= 70:
        lo, hi = max(me["budget_min"], c["budget_min"]), min(me["budget_max"], c["budget_max"])
        if hi >= lo:
            out.append({"icon": "💸", "text": f"Budgets overlap at ₹{lo // 1000}–{hi // 1000}k"})
    if cm["distance_km"] is not None and cm["distance_km"] <= 4:
        out.append({"icon": "📍", "text": f"Only {cm['distance_km']} km apart"})
    return out[:limit]


def heads_up(me: dict, c: dict) -> list[str]:
    notes = []
    mt, ct = me["traits"], c["traits"]
    if mt.get("sleep") and ct.get("sleep") and {mt["sleep"], ct["sleep"]} == {"early_bird", "night_owl"}:
        notes.append("Opposite sleep rhythms: one early bird, one night owl")
    if mt.get("cleanliness") and ct.get("cleanliness") and {mt["cleanliness"], ct["cleanliness"]} == {"neat", "easygoing"}:
        notes.append("Very different ideas of 'tidy'")
    if mt.get("noise") and ct.get("noise") and {mt["noise"], ct["noise"]} == {"quiet", "lively"}:
        notes.append("Quiet vs lively home, worth talking through")
    if mt.get("guests") and ct.get("guests") and {mt["guests"], ct["guests"]} == {"rarely", "often"}:
        notes.append("Different comfort with guests")
    return notes[:2]


# ----------------------------------------------------------------------------- listing views
def card(me: dict, c: dict, cm: dict | None = None) -> dict:
    cm = cm or compat(me, c)
    listing = LISTINGS.get(c["id"])
    return {
        "id": c["id"], "name": c["name"], "age": c["age"], "gender": c["gender"], "occupation": c["occupation"],
        "area": c["area"], "intent": c["intent"], "verified": c["verified"], "last_active": c["last_active"],
        "budget_min": c["budget_min"], "budget_max": c["budget_max"], "bio": c["bio"],
        "score": cm["score"], "distance_km": cm["distance_km"],
        "reasons": reasons_for(me, c, cm, 3),
        "shared_tags": [{"key": t, "label": TAGS[t][0], "emoji": TAGS[t][1]} for t in cm["shared_tags"][:4]],
        "tags": [{"key": t, "label": TAGS[t][0], "emoji": TAGS[t][1]} for t in c["tags"][:5] if t in TAGS],
        "listing": {"rent": listing["rent"], "title": listing["title"], "hue": listing["hue"]} if listing else None,
    }


def rank(me: dict, pool: list[dict] | None = None) -> list[tuple[dict, dict]]:
    pool = pool if pool is not None else pool_for(me)
    scored = [(c, compat(me, c)) for c in pool]
    scored.sort(key=lambda x: x[1]["score"], reverse=True)
    return scored
