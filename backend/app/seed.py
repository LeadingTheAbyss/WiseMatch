"""Deterministic generator for ~650 believable Bangalore profiles.

Run `python -m app.seed --reset` to wipe and regenerate, or let the API call `seed_if_empty`
on first boot.
"""
import random
import sys

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .catalog import AMENITIES, AREAS, ENTITIES, LANGUAGES, PERSONAS, TAGS, TRAIT_QUESTIONS
from .db import Base, SessionLocal, engine
from .models import Conversation, Interest, Listing, Message, User

MALE = ["Aarav", "Vihaan", "Aditya", "Rohan", "Karthik", "Arjun", "Siddharth", "Rahul", "Nikhil", "Varun", "Pranav", "Harsh", "Akash", "Manish", "Sandeep", "Vivek", "Ankit", "Abhishek", "Mohit", "Rajat", "Kunal", "Sameer", "Imran", "Faisal", "Arnav", "Ishaan", "Dhruv", "Yash", "Tejas", "Naveen", "Prashanth", "Suresh", "Ganesh", "Vignesh", "Aravind", "Harish", "Deepak", "Anirudh", "Joel", "Alan", "Jaspreet", "Gurpreet", "Rishi", "Kabir", "Neel", "Shaurya", "Omkar", "Parth", "Utkarsh", "Madhav"]
FEMALE = ["Ananya", "Diya", "Aditi", "Priya", "Sneha", "Kavya", "Isha", "Meera", "Neha", "Pooja", "Riya", "Shreya", "Divya", "Nisha", "Aishwarya", "Lakshmi", "Swati", "Tanvi", "Anjali", "Bhavna", "Sana", "Fatima", "Zoya", "Ayesha", "Mansi", "Pallavi", "Rashmi", "Sharanya", "Varsha", "Keerthi", "Harini", "Nandini", "Ira", "Mehak", "Simran", "Jasleen", "Tara", "Janvi", "Aarushi", "Shruti", "Sakshi", "Radhika", "Megha", "Rhea", "Anushka", "Trisha", "Ritika", "Kritika", "Sowmya", "Chitra"]
NONBINARY = ["Kiran", "Sasha", "Arya", "Noor", "Devi", "Jules"]
LAST = ["Sharma", "Gupta", "Reddy", "Nair", "Iyer", "Rao", "Patel", "Singh", "Kumar", "Menon", "Shetty", "Hegde", "Bhat", "Gowda", "Kulkarni", "Desai", "Joshi", "Mehta", "Banerjee", "Chatterjee", "Das", "Khan", "Ahmed", "Sheikh", "D'Souza", "Fernandes", "Thomas", "George", "Pillai", "Naidu", "Chowdhury", "Kapoor", "Malhotra", "Agarwal", "Jain", "Verma", "Mishra", "Pandey", "Yadav", "Shah", "Kamath", "Prabhu", "Murthy", "Krishnan", "Subramanian", "Raman", "Bose", "Sen", "Dhillon", "Gill"]

STUDENT = ["B.Tech student", "MBA student", "Design student", "Medical student", "Law student", "Journalism student", "Architecture student", "Commerce student"]
PRO = ["Software engineer", "Backend developer", "Frontend engineer", "Product designer", "Data analyst", "Data scientist", "Product manager", "Marketing associate", "Consultant", "Chartered accountant", "UX researcher", "Content creator", "Resident doctor", "Architect", "Financial analyst", "DevOps engineer", "QA engineer", "HR associate", "Freelance photographer", "Research scholar", "Musician", "Lawyer", "Brand strategist", "Mobile developer", "ML engineer"]
SENIOR = ["Senior software engineer", "Engineering manager", "Product lead", "Chef", "Startup founder", "Doctor", "Professor", "Design lead", "Principal engineer", "Entrepreneur"]
SECTORS = ["fintech", "e-commerce", "SaaS", "healthtech", "gaming", "edtech", "consulting", "AI startup", "media", "logistics", "a product startup", "a big-tech firm"]

SLEEP_PHRASE = {"early_bird": "Early bird", "night_owl": "Night owl", "flexible": "Flexible sleeper"}
CLEAN_PHRASE = {"neat": "keeps things spotless", "tidy": "reasonably tidy", "easygoing": "easygoing about mess"}
HAS_ROOM_OPENERS = ["Have a spare room in a {flat} in {area}.", "Moving in with a flatmate soon, room free in {area}.", "Our {flat} in {area} has one room open."]
SEEK_OPENERS = ["Looking for a room around {area}.", "Moving to {area} and need a flatmate.", "Hunting for a flat in or near {area}."]
MOVE_IN = ["Immediately", "Within 2 weeks", "1 Nov", "15 Nov", "1 Dec", "Flexible", "Mid-Dec", "1 Jan"]
ACTIVE = ["Active now", "Active 2h ago", "Active today", "Active yesterday", "Active 3 days ago"]
FLAT = ["2 BHK", "3 BHK", "3 BHK", "2 BHK", "1 BHK", "4 BHK"]
ROOM_TYPE = ["Private room", "Private room", "Shared room", "Private room with attached bath"]
FURNISH = ["Fully furnished", "Semi-furnished", "Semi-furnished", "Unfurnished"]
LISTING_DESC = [
    "Airy room with a big window, quiet lane and good cafés within a 5-minute walk. Society has 24x7 security.",
    "Bright, well-ventilated room in a friendly flat. Cook comes twice a day and the Wi-Fi is fibre. Metro and buses nearby.",
    "Recently renovated flat, walking distance to restaurants and a park. Looking for someone respectful, clean and chill.",
    "Large room with a balcony and a study desk. We keep common areas tidy and cook together on Sundays.",
    "Spacious flat in a gated society. Easy commute to tech parks, plenty of groceries and late-night food around.",
]


def wchoice(rng: random.Random, weights: dict[str, float]) -> str:
    keys = list(weights)
    return rng.choices(keys, weights=[max(weights[k], 0.001) for k in keys], k=1)[0]


def bump(w: dict[str, float], key: str, factor: float) -> None:
    if key in w:
        w[key] *= factor


def make_name(rng: random.Random):
    r = rng.random()
    if r < 0.02:
        return rng.choice(NONBINARY), "non-binary"
    if r < 0.52:
        return rng.choice(MALE), "male"
    return rng.choice(FEMALE), "female"


def religion_for(rng: random.Random, last: str) -> str:
    if last in ("Khan", "Ahmed", "Sheikh"):
        return "Muslim"
    if last in ("D'Souza", "Fernandes", "Thomas", "George"):
        return "Christian"
    if last in ("Dhillon", "Gill") or (last == "Singh" and rng.random() < 0.45):
        return "Sikh"
    if last == "Jain":
        return "Jain"
    return wchoice(rng, {"Hindu": 62, "Spiritual": 8, "Atheist / Agnostic": 14, "Christian": 4, "Muslim": 3, "Buddhist": 1, "Prefer not to say": 8})


def sample_tags(rng: random.Random) -> set[str]:
    names = list(PERSONAS)
    primary = rng.choice(names)
    secondary = rng.choice([n for n in names if n != primary])
    tags: set[str] = set()
    for t in TAGS:
        p = 0.04
        if t in PERSONAS[primary]:
            p = 0.62
        elif t in PERSONAS[secondary]:
            p = 0.28
        if rng.random() < p:
            tags.add(t)
    while len(tags) < 4:
        tags.add(rng.choice(PERSONAS[primary] + PERSONAS[secondary]))
    return tags


def sample_traits(rng: random.Random, tags: set[str], age: int) -> dict:
    w = {
        "diet": {"veg": 38, "eggetarian": 10, "non_veg": 47, "vegan": 5},
        "smoking": {"no": 78, "occasionally": 13, "yes": 9},
        "drinking": {"no": 38, "socially": 48, "regularly": 14},
        "sleep": {"early_bird": 26, "flexible": 34, "night_owl": 40},
        "cleanliness": {"neat": 30, "tidy": 47, "easygoing": 23},
        "social": {"introvert": 28, "ambivert": 44, "extrovert": 28},
        "guests": {"rarely": 40, "sometimes": 44, "often": 16},
        "wfh": {"remote": 32, "hybrid": 40, "office": 28},
        "pets": {"love": 34, "fine": 40, "none": 26},
        "cooking": {"daily": 24, "sometimes": 46, "never": 30},
        "noise": {"quiet": 38, "moderate": 42, "lively": 20},
    }
    if tags & {"nightlife", "edm", "craft_beer"}:
        bump(w["sleep"], "night_owl", 2.2); bump(w["social"], "extrovert", 2.0); bump(w["drinking"], "socially", 1.5)
        bump(w["drinking"], "no", 0.3); bump(w["guests"], "often", 2.2); bump(w["noise"], "lively", 2.4)
    if tags & {"fitness", "yoga", "trekking"}:
        bump(w["sleep"], "early_bird", 2.0); bump(w["smoking"], "no", 1.5); bump(w["cleanliness"], "neat", 1.3)
    if tags & {"gaming", "anime", "startups", "scifi"}:
        bump(w["wfh"], "remote", 1.8); bump(w["sleep"], "night_owl", 1.6); bump(w["social"], "introvert", 1.6)
        bump(w["guests"], "rarely", 1.4)
    if tags & {"books", "classical", "art_theatre", "yoga"}:
        bump(w["noise"], "quiet", 1.9); bump(w["social"], "introvert", 1.3)
    if tags & {"cooking_hobby", "foodie"}:
        bump(w["cooking"], "daily", 2.0); bump(w["cooking"], "never", 0.4)
    if age >= 30:
        bump(w["cleanliness"], "neat", 1.4); bump(w["sleep"], "early_bird", 1.5); bump(w["guests"], "rarely", 1.4)
    return {k: wchoice(rng, v) for k, v in w.items()}


def sample_prefs(rng: random.Random, traits: dict, gender: str) -> tuple[dict, str]:
    prefs: dict[str, list[str]] = {}
    if traits["diet"] in ("veg", "vegan") and rng.random() < 0.42:
        prefs["diet"] = ["veg", "eggetarian", "vegan"]
    if traits["smoking"] == "no" and rng.random() < 0.55:
        prefs["smoking"] = ["no"]
    elif traits["smoking"] == "occasionally" and rng.random() < 0.2:
        prefs["smoking"] = ["no", "occasionally"]
    if traits["drinking"] == "no" and rng.random() < 0.4:
        prefs["drinking"] = ["no"]
    elif traits["drinking"] == "socially" and rng.random() < 0.15:
        prefs["drinking"] = ["no", "socially"]
    for key in ("sleep", "cleanliness", "noise", "guests", "pets", "social", "wfh", "cooking"):
        if rng.random() < 0.25:
            opts = [o[0] for o in TRAIT_QUESTIONS[key]["options"]]
            mine = traits[key]
            idx = opts.index(mine)
            acc = [mine]
            if rng.random() < 0.4 and idx + 1 < len(opts):
                acc.append(opts[idx + 1])
            if rng.random() < 0.4 and idx - 1 >= 0:
                acc.append(opts[idx - 1])
            prefs[key] = acc
    if gender == "female":
        gp = "same" if rng.random() < 0.6 else "any"
    elif gender == "male":
        gp = "same" if rng.random() < 0.22 else "any"
    else:
        gp = "any"
    return prefs, gp


def bio_for(rng: random.Random, occ: str, area: str, intent: str, traits: dict, tags: set[str], flat: str) -> str:
    pick = rng.sample(sorted(tags), k=min(2, len(tags)))
    hobby = " and ".join(TAGS[t][0].lower() for t in pick)
    opener = rng.choice(HAS_ROOM_OPENERS if intent == "has_room" else SEEK_OPENERS).format(area=area, flat=flat)
    vibe = f"{SLEEP_PHRASE[traits['sleep']]}, {CLEAN_PHRASE[traits['cleanliness']]}."
    return f"{occ}. Into {hobby}. {vibe} {opener}"


def round500(x: float) -> int:
    return int(round(x / 500.0) * 500)


def build_user(rng: random.Random, area_names: list[str], area_weights: list[float]) -> tuple[User, dict | None]:
    first, gender = make_name(rng)
    last = rng.choice(LAST)
    age = int(min(38, max(19, rng.gauss(26, 3.6))))
    area = rng.choices(area_names, weights=area_weights, k=1)[0]
    lat0, lng0, _, typical = AREAS[area]
    lat = lat0 + rng.uniform(-0.007, 0.007)
    lng = lng0 + rng.uniform(-0.007, 0.007)

    if age <= 22 and rng.random() < 0.6:
        occ = rng.choice(STUDENT)
    elif age >= 31:
        occ = f"{rng.choice(SENIOR)}, {rng.choice(SECTORS)}"
    else:
        occ = f"{rng.choice(PRO)}, {rng.choice(SECTORS)}" if rng.random() < 0.7 else rng.choice(PRO)

    tags = sample_tags(rng)
    traits = sample_traits(rng, tags, age)
    prefs, gender_pref = sample_prefs(rng, traits, gender)

    entities = []
    chosen_tags = set()
    for t in sorted(tags):
        pool = TAGS[t][3]
        for name, _ in rng.sample(pool, k=min(len(pool), rng.choice([1, 1, 2]))):
            e = ENTITIES[name]
            if all(x["name"] != name for x in entities):
                entities.append({"id": e["id"], "name": name, "type": e["type"], "tags": e["tags"]})
            chosen_tags.update(e["tags"])
    all_tags = sorted(tags | chosen_tags)

    center = typical * rng.uniform(0.7, 1.2)
    spread = rng.choice([2000, 3000, 4000, 5000])
    b_min = round500(max(6000, center - spread))
    b_max = round500(center + spread)
    intent = "has_room" if rng.random() < 0.38 else "seeking"
    flat = rng.choice(FLAT)
    langs = ["English"] + rng.sample(LANGUAGES[1:], k=rng.choice([1, 2, 2, 3]))

    user = User(
        name=f"{first} {last}", age=age, gender=gender, occupation=occ, area=area,
        lat=round(lat, 5), lng=round(lng, 5), intent=intent, budget_min=b_min, budget_max=b_max,
        move_in=rng.choice(MOVE_IN), gender_pref=gender_pref, religion=religion_for(rng, last),
        languages=langs, traits=traits, prefs=prefs, taste=entities, tags=all_tags,
        bio=bio_for(rng, occ, area, intent, traits, tags, flat), is_demo=True,
        verified=rng.random() < 0.72, last_active=rng.choice(ACTIVE), onboarded=True,
    )
    listing = None
    if intent == "has_room":
        rent = round500(rng.uniform(b_min, b_max))
        room_type = rng.choice(ROOM_TYPE)
        listing = dict(
            title=f"{room_type} in a {flat}, {area}", area=area, rent=rent, deposit=rent * rng.choice([2, 2, 3]),
            room_type=room_type, flat_type=flat, furnishing=rng.choice(FURNISH),
            amenities=rng.sample(AMENITIES, k=rng.randint(4, 8)), description=rng.choice(LISTING_DESC),
            available_from=rng.choice(["Immediately", "1 Nov", "15 Nov", "1 Dec"]), photos=rng.randint(3, 7), hue=rng.randint(0, 359),
        )
    return user, listing


def seed(db: Session, n: int = 650, reset: bool = False) -> int:
    Base.metadata.create_all(engine)
    if reset:
        for m in (Message, Conversation, Interest, Listing, User):
            db.query(m).delete()
        db.commit()
    rng = random.Random(2026)
    names = list(AREAS)
    weights = [AREAS[a][2] for a in names]
    users, listings = [], []
    for _ in range(n):
        u, lst = build_user(rng, names, weights)
        users.append(u)
        listings.append(lst)
    db.add_all(users)
    db.flush()
    for u, lst in zip(users, listings):
        if lst:
            db.add(Listing(user_id=u.id, **lst))
    db.commit()
    return len(users)


def seed_if_empty(n: int) -> int:
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if db.scalar(select(func.count()).select_from(User).where(User.is_demo.is_(True))):
            return 0
        return seed(db, n)


if __name__ == "__main__":
    from .config import settings

    with SessionLocal() as session:
        count = seed(session, settings.seed_users, reset="--reset" in sys.argv)
    print(f"seeded {count} users")
