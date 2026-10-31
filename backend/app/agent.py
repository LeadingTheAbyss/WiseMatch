"""The matching agent.

Each turn it: (1) measures the live candidate pool, (2) scores every possible question by how
evenly it would split that pool (Akinator-style), (3) pulls Qloo taste entities for taste
questions, and (4) lets the LLM pick and phrase the final question. Answers prune the pool, hard
deal-breakers remove people outright, everything else just reshapes the compatibility score.
"""
import hashlib
import json
import random

from . import llm, trace
from .catalog import TAGS, TRAIT_QUESTIONS, avatar_of
from .engine import MAX_QUESTIONS, STOP_POOL, card, compat, heads_up, option_values, pool_for, rank, rank_questions, reasons_for
from .qloo import qloo

ANSWER_META = "_order"


def answered_ids(me: dict) -> list[str]:
    return [k for k in me["answers"] if not k.startswith("_")]


# ----------------------------------------------------------------------------- answers
def _rebuild(me: dict) -> None:
    me["_tags"] = set(me["tags"])
    me["_anti"] = set(me["anti_tags"])


def apply_answer(me: dict, qid: str, you: str, them: list[str]) -> None:
    if qid.startswith("tag:"):
        tag = qid[4:]
        if tag not in TAGS or you not in ("yes", "no"):
            raise ValueError("bad taste answer")
        if you == "yes":
            me["tags"] = sorted(set(me["tags"]) | {tag})
            me["anti_tags"] = [t for t in me["anti_tags"] if t != tag]
        else:
            me["anti_tags"] = sorted(set(me["anti_tags"]) | {tag})
            me["tags"] = [t for t in me["tags"] if t != tag]
        if them in (["yes"], ["no"]):
            me["prefs"][qid] = them
        else:
            me["prefs"].pop(qid, None)
    else:
        if qid not in TRAIT_QUESTIONS:
            raise ValueError("unknown question")
        vals = option_values(qid)
        if you not in vals or any(t not in vals for t in them):
            raise ValueError("bad answer")
        me["traits"][qid] = you
        if them and len(set(them)) < len(vals):
            me["prefs"][qid] = list(dict.fromkeys(them))
        else:
            me["prefs"].pop(qid, None)
    order = [q for q in me["answers"].get(ANSWER_META, []) if q != qid]
    order.append(qid)
    me["answers"][qid] = {"you": you, "them": them}
    me["answers"][ANSWER_META] = order
    _rebuild(me)


def undo_last(me: dict) -> str | None:
    order = me["answers"].get(ANSWER_META, [])
    if not order:
        return None
    qid = order.pop()
    me["answers"].pop(qid, None)
    me["answers"][ANSWER_META] = order
    me["prefs"].pop(qid, None)
    if qid.startswith("tag:"):
        tag = qid[4:]
        me["tags"] = [t for t in me["tags"] if t != tag]
        me["anti_tags"] = [t for t in me["anti_tags"] if t != tag]
    else:
        me["traits"].pop(qid, None)
    _rebuild(me)
    return qid


# ----------------------------------------------------------------------------- question building
def _options(qid: str) -> list[dict]:
    if qid.startswith("tag:"):
        return [{"value": "yes", "label": "Yes, I'm into it", "emoji": "👍"}, {"value": "no", "label": "Not really", "emoji": "🙅"}]
    return [{"value": v, "label": l, "emoji": e} for v, l, e in TRAIT_QUESTIONS[qid]["options"]]


def _them_options(qid: str) -> list[dict]:
    if qid.startswith("tag:"):
        return [{"value": "yes", "label": "Into it too", "emoji": "🤝"}, {"value": "no", "label": "Not their thing", "emoji": "🌿"}]
    return _options(qid)


def _split_rows(cand: dict) -> list[dict]:
    qid, st = cand["id"], cand["stats"]
    labels = {o["value"]: o for o in _options(qid)}
    rows = []
    for v, n in st["counts"].items():
        rows.append({"value": v, "label": labels[v]["label"], "emoji": labels[v]["emoji"], "count": n, "pct": round(100 * n / st["n"])})
    return rows


def _fallback_text(cand: dict) -> tuple[str, str]:
    if cand["kind"] == "taste":
        return f"Are you into {cand['label'].lower()}?", ""
    return TRAIT_QUESTIONS[cand["id"]]["text"], ""


def _fallback_why(cand: dict, pool_n: int) -> str:
    rows = sorted(_split_rows(cand), key=lambda r: -r["count"])
    top = " / ".join(f"{r['pct']}%" for r in rows[:3])
    return f"Splits the {pool_n} remaining people {top}, the most useful cut right now."


async def _choose(me: dict, pool_n: int, cands: list[dict]) -> tuple[dict, str, str, bool]:
    """Ask the LLM to pick and phrase the next question. Falls back to the top-scored one."""
    payload = {
        "me": {"age": me["age"], "gender": me["gender"], "area": me["area"], "intent": me["intent"]},
        "answered": {k: v for k, v in me["answers"].items() if not k.startswith("_")},
        "pool_size": pool_n,
        "candidates": [
            {
                "id": c["id"], "topic": c["label"], "type": c["kind"], "deal_breaker": c["hard"],
                "split_counts": c["stats"]["counts"], "balance_score": round(c["score"], 2),
            }
            for c in cands
        ],
    }
    system = (
        "You are the matching agent inside WiseMatch, a Bangalore roommate finder. Like Akinator, you narrow "
        "a pool of candidate roommates using as few questions as possible. Pick the single best next question "
        "from the candidates: prefer a balanced split of the pool (high balance_score), take a deal_breaker "
        "question when its split is meaningful, and avoid three taste questions in a row. "
        'Reply with JSON only: {"question_id": "<id from candidates>", "question": "<friendly question, max 12 words, '
        'second person, no emoji>", "why": "<max 20 words, plain English for the end user, quoting real numbers from split_counts, '
        'e.g. Splits the 442 people roughly 32/46/22. Never mention balance_score or ids>"}'
    )
    res = await llm.complete_json(
        [{"role": "system", "content": system}, {"role": "user", "content": json.dumps(payload)}],
        "agent · pick next question", max_tokens=220, temperature=0.3,
    )
    by_id = {c["id"]: c for c in cands}
    if res and res.get("question_id") in by_id and res.get("question"):
        c = by_id[res["question_id"]]
        why = (res.get("why") or "").strip() or _fallback_why(c, pool_n)
        return c, res["question"].strip(), why, True
    c = cands[0]
    return c, _fallback_text(c)[0], _fallback_why(c, pool_n), False


async def _build(me: dict, cand: dict, text: str, why: str, pool_n: int, by_agent: bool) -> dict:
    qid = cand["id"]
    q: dict = {
        "id": qid, "kind": cand["kind"], "text": text, "why": why, "hard": cand["hard"], "by_agent": by_agent,
        "options": _options(qid), "them_options": _them_options(qid), "split": _split_rows(cand),
        "expected_keep": round(cand["stats"]["expected_keep"], 2),
    }
    if cand["kind"] == "taste":
        tag = qid[4:]
        q["emoji"] = TAGS[tag][1]
        q["topic"] = TAGS[tag][0]
        q["them_text"] = f"Should your roommate be into {TAGS[tag][0].lower()}?"
        q["examples"] = (await qloo.examples_for_tag(tag))[:4]
    else:
        spec = TRAIT_QUESTIONS[qid]
        q["emoji"] = spec["options"][0][2]
        q["topic"] = spec["text"]
        q["them_text"] = spec["them"]
        q["examples"] = []
    return q


# ----------------------------------------------------------------------------- orchestration
async def next_step(me: dict) -> dict:
    start = trace.last_id()
    initial = len(pool_for(me, use_answers=False))
    pool = pool_for(me)
    answered = answered_ids(me)
    trace.log("pool", f"Candidate pool: {len(pool)} of {initial} people", f"{len(answered)} answers so far · {initial - len(pool)} ruled out", source="engine")
    ranked = rank(me, pool)
    top = [{"id": c["id"], "name": c["name"], "score": cm["score"], "area": c["area"], "avatar": avatar_of(c)} for c, cm in ranked[:4]]

    question = None
    done = len(answered) >= MAX_QUESTIONS or len(pool) <= STOP_POOL
    if not done:
        cands = rank_questions(me, pool, limit=40)
        recent = me["answers"].get(ANSWER_META, [])[-2:]
        if len(recent) == 2 and not any(q.startswith("tag:") for q in recent):
            # two lifestyle questions in a row: the next one is a taste question grounded in Qloo
            taste_only = [c for c in cands if c["kind"] == "taste"]
            cands = taste_only or cands
        cands = cands[:6]
        if not cands:
            done = True
        else:
            trace.log("decide", f"Scored {len(cands)} candidate questions", ", ".join(f"{c['id']} {c['score']:.2f}" for c in cands[:4]), source="engine")
            cand, text, why, by_agent = await _choose(me, len(pool), cands)
            question = await _build(me, cand, text, why, len(pool), by_agent)
            trace.log("decide", f"Next question: {cand['id']}", "", source="agent" if by_agent else "engine")
    return {
        "pool": {"initial": initial, "remaining": len(pool), "removed": initial - len(pool)},
        "answered": len(answered),
        "max_questions": MAX_QUESTIONS,
        "done": done,
        "question": question,
        "top": top,
        "trace": trace.since(start),
    }


# ----------------------------------------------------------------------------- match explanation
_EXPLAIN_CACHE: dict[str, dict] = {}


def _brief(p: dict) -> dict:
    return {
        "name": p["name"].split()[0], "age": p["age"], "area": p["area"], "occupation": p["occupation"],
        "habits": p["traits"], "taste": [TAGS[t][0] for t in p["tags"] if t in TAGS][:8],
        "favourites": [e["name"] for e in p["taste"]][:6],
    }


async def explain(me: dict, c: dict) -> dict:
    cm = compat(me, c)
    reasons = reasons_for(me, c, cm, 5)
    key = hashlib.md5(f"{me['id']}:{c['id']}:{cm['score']}".encode()).hexdigest()
    if key in _EXPLAIN_CACHE:
        return _EXPLAIN_CACHE[key]
    shared = [TAGS[t][0].lower() for t in cm["shared_tags"][:3]]
    fallback = {
        "summary": f"{c['name'].split()[0]} and you line up on {', '.join(shared) or 'everyday habits'}. "
                   f"{'; '.join(r['text'] for r in reasons[:2])}.",
        "icebreakers": [
            f"Hey {c['name'].split()[0]}! I saw we're both into {shared[0]}. What's your go-to?" if shared else f"Hey {c['name'].split()[0]}! How's the flat hunt going?",
            f"What's a typical weekday like for you in {c['area']}?",
            "Any deal-breakers I should know about before we chat more?",
        ],
        "source": "engine",
    }
    system = (
        "You help two potential roommates in Bangalore see why they match. Be warm, specific and honest, "
        "never gushing. Use only the facts given. Reply with JSON only: "
        '{"summary": "<2 sentences, max 45 words, address the first person as you>", '
        '"icebreakers": ["<3 short, casual opening messages the first person could send, each under 18 words, '
        'each referencing a real shared interest or habit>"]}'
    )
    user = {"you": _brief(me), "them": _brief(c), "compatibility": cm["score"], "why": [r["text"] for r in reasons], "watch_out": heads_up(me, c)}
    res = await llm.complete_json(
        [{"role": "system", "content": system}, {"role": "user", "content": json.dumps(user)}],
        "agent · explain match", max_tokens=350, temperature=0.6,
    )
    if res and isinstance(res.get("icebreakers"), list) and res.get("summary"):
        out = {"summary": res["summary"], "icebreakers": [str(x) for x in res["icebreakers"]][:3], "source": "groq"}
    else:
        out = fallback
    _EXPLAIN_CACHE[key] = out
    return out


# ----------------------------------------------------------------------------- chat personas
CANNED = [
    "Haha nice, tell me more!", "Sounds good to me. When are you free to chat properly?", "That works for me! Which area are you looking at?",
    "Cool, I'm around this weekend if you want to meet over coffee.", "Totally get that. What's your usual routine like?",
]


async def persona_reply(c: dict, me_name: str, history: list[dict]) -> str:
    traits = ", ".join(f"{k}: {v}" for k, v in c["traits"].items())
    interests = ", ".join(TAGS[t][0] for t in c["tags"] if t in TAGS)[:200]
    system = (
        f"You are {c['name']}, {c['age']}, {c['occupation']}, living in {c['area']}, Bangalore. You are chatting on WiseMatch, "
        f"a roommate-finding app, with {me_name}. Your habits: {traits}. Interests: {interests}. Bio: {c['bio']} "
        f"You are {'offering a room' if c['intent'] == 'has_room' else 'looking for a room'}. Reply like a real person texting on WhatsApp: "
        "1-2 short sentences, max 30 words, casual Indian English, at most one emoji, stay in character, ask a natural follow-up when it fits. "
        "If asked directly whether you are real or an AI, say you are a demo profile on WiseMatch."
    )
    msgs = [{"role": "system", "content": system}]
    for m in history[-10:]:
        msgs.append({"role": "assistant" if m["from_them"] else "user", "content": m["body"]})
    text = await llm.complete(msgs, "chat persona reply", temperature=0.8, max_tokens=90)
    if text:
        return text.strip().strip('"')
    return random.Random(len(history)).choice(CANNED)
