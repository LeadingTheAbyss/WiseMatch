"""Pre-populates a new user's inbox so every tab has life on first open.

Conversations, unread badges and "liked you" cards come from the best-scoring seeded profiles,
so the demo reads like a platform that has been running for weeks.
"""
import random
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from .catalog import TAGS
from .engine import compat, pool_for, rank
from .models import Conversation, Interest, Message

SCRIPTS = [
    # (them, me, them, them)  — me line may be None when the thread is waiting on the user
    ["Hey {me}! You came up as a {score}% match for me. Still looking around {area}?", "Hi {name}! Yes, still on the hunt. {tagline}", "Nice. Want to do a quick call this weekend to see if we vibe?", None],
    ["Hi {me} 👋 Saw we're both into {tag}. That's rare in a flatmate!", "Ha, same! What's your usual weekday like?", "WFH most days, cafés on weekends. Pretty chill. You?", None],
    ["Hey! Is the {area} side still on your list?", None, None, None],
    ["Hi {me}, your habits look very close to mine. Neat, quiet, early nights.", "Haha that's me. How soon are you looking to move?", "By {move}. Can show you the place if you like.", "Free Saturday morning?"],
    ["Hey {me}! What are you doing for food at home, cooking or ordering?", "Bit of both, mostly cooking on weekends.", "Perfect, same here. Let's chat more?", None],
    ["Just checking: are you okay with occasional guests?", "Yes, occasionally is fine!", "Great, that works for me then 🙂", None],
    ["Hi {me}! Thanks for the like. Anything specific you want to know about the flat?", None, None, None],
    ["Hello {me}, loved your taste in {tag}. Weekend plans?", "Not yet! Maybe a café run? Any suggestions?", "Blue Tokai in Koramangala is my go-to. Coffee on me if we meet.", None],
]


def seed_inbox(db: Session, me: dict, convos: int = 8, likes: int = 10) -> None:
    rng = random.Random(me["id"] * 7919)
    ranked = [(c, cm) for c, cm in rank(me, pool_for(me, use_answers=False)) if c["is_demo"]]
    top = ranked[:60]
    rng.shuffle(top)
    first = me["name"].split()[0]
    now = datetime.utcnow()

    chosen = top[:convos]
    for i, (c, cm) in enumerate(chosen):
        db.add(Interest(from_id=me["id"], to_id=c["id"]))
        db.add(Interest(from_id=c["id"], to_id=me["id"]))
        conv = Conversation(user_a=me["id"], user_b=c["id"], created_at=now - timedelta(days=3))
        db.add(conv)
        db.flush()
        script = SCRIPTS[i % len(SCRIPTS)]
        tag = TAGS[cm["shared_tags"][0]][0].lower() if cm["shared_tags"] else "good food"
        fmt = dict(me=first, name=c["name"].split()[0], score=cm["score"], area=c["area"], tag=tag, move=c["move_in"].lower(), tagline="Your place looks great.")
        senders = ["them", "me", "them", "them"]
        lines = [(who, line.format(**fmt)) for who, line in zip(senders, script) if line]
        t = now - timedelta(hours=rng.randint(3, 60))
        for n, (who, body) in enumerate(lines):
            t += timedelta(minutes=rng.randint(4, 90))
            from_me = who == "me"
            last_them = (not from_me) and n == len(lines) - 1
            db.add(Message(
                conversation_id=conv.id, sender_id=me["id"] if from_me else c["id"], body=body,
                read=not (last_them and rng.random() < 0.7), created_at=t,
            ))

    for c, cm in top[convos:convos + likes]:
        db.add(Interest(from_id=c["id"], to_id=me["id"]))
    db.commit()
