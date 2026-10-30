"""Qloo taste-graph client.

With QLOO_API_KEY set it talks to the hackathon API (X-Api-Key header, GET only). Without a
key, or when a call fails, it answers from the bundled catalog so the product keeps working.
Every call is written to the trace so the demo shows when Qloo is really being hit.
"""
import httpx

from . import trace
from .catalog import ENTITIES, TAGS
from .config import settings

TYPE_URN = {
    "artist": "urn:entity:artist",
    "movie": "urn:entity:movie",
    "tv_show": "urn:entity:tv_show",
    "place": "urn:entity:place",
    "brand": "urn:entity:brand",
    "book": "urn:entity:book",
    "podcast": "urn:entity:podcast",
    "person": "urn:entity:person",
    "videogame": "urn:entity:videogame",
    "destination": "urn:entity:destination",
}

# Rough, well-known localities so mock hangout spots look grounded in the city.
PLACE_LOCALITY = {
    "Toit": "Indiranagar", "CTR (Central Tiffin Room)": "Malleshwaram", "Vidyarthi Bhavan": "Basavanagudi",
    "MTR": "Lalbagh Road", "Meghana Foods": "Koramangala", "Corner House": "Indiranagar",
    "Third Wave Coffee": "Indiranagar", "Blue Tokai": "Koramangala", "Matteo Coffea": "Richmond Road",
    "Dyu Art Cafe": "Koramangala", "Bangalore Brewing Company": "Koramangala", "Arbor Brewing Company": "Brigade Road",
    "Byg Brewski": "Hennur", "Karavalli": "Residency Road", "Olive Beach": "Ashok Nagar", "Smoke House Deli": "Indiranagar",
    "The Permit Room": "Indiranagar", "Atta Galatta": "Koramangala", "Blossoms Book House": "Church Street",
    "Ranga Shankara": "JP Nagar", "Jagriti Theatre": "Whitefield", "National Gallery of Modern Art": "Palace Road",
    "Museum of Art & Photography": "Kasturba Road", "Lalbagh Botanical Garden": "Basavanagudi", "Cubbon Park": "Central Bangalore",
    "Skyye Bangalore": "UB City", "Social": "Koramangala", "Hard Rock Cafe Bangalore": "Central Bangalore",
    "M. Chinnaswamy Stadium": "MG Road", "Nandi Hills": "Chikkaballapur", "Skandagiri": "Chikkaballapur",
}
TAG_PLACE_FALLBACK = ["foodie", "cafes", "craft_beer"]


def _norm(e: dict) -> dict:
    types = e.get("types") or ([e["type"]] if e.get("type") else [])
    first = types[0] if types else ""
    props = e.get("properties") or {}
    image = (props.get("image") or {}).get("url") if isinstance(props.get("image"), dict) else props.get("image")
    tags = []
    for t in e.get("tags") or []:
        tags.append(t.get("name") if isinstance(t, dict) else str(t))
    return {
        "id": e.get("entity_id") or e.get("id") or "",
        "name": e.get("name", ""),
        "type": first.replace("urn:entity:", "") if isinstance(first, str) else "",
        "tags": [t for t in tags if t],
        "image": image,
        "locality": (e.get("location") or {}).get("address") if isinstance(e.get("location"), dict) else None,
        "source": "qloo",
    }


def _mock(name: str) -> dict:
    e = ENTITIES[name]
    return {"id": e["id"], "name": name, "type": e["type"], "tags": e["tags"], "image": None, "locality": PLACE_LOCALITY.get(name), "source": "mock"}


class QlooClient:
    @property
    def live(self) -> bool:
        return bool(settings.qloo_api_key)

    @property
    def mode(self) -> str:
        return "live" if self.live else "mock"

    async def _get(self, path: str, params: dict) -> dict | None:
        if not self.live:
            return None
        with trace.Timer() as tm:
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    r = await client.get(
                        settings.qloo_base_url + path,
                        params=params,
                        headers={"X-Api-Key": settings.qloo_api_key},
                    )
                r.raise_for_status()
                data = r.json()
                ok = True
            except Exception as exc:  # network, 4xx/5xx, bad json: fall back to the catalog
                data, ok = None, False
                trace.log("qloo", f"GET {path} failed", str(exc)[:140], source="qloo", ok=False)
        if ok:
            short = ", ".join(f"{k}={v}" for k, v in list(params.items())[:3])
            trace.log("qloo", f"GET {path}", short[:140], ms=tm.ms, source="qloo")
        return data

    async def search(self, query: str, kind: str | None = None, take: int = 8) -> list[dict]:
        params = {"query": query, "take": take}
        if kind and kind in TYPE_URN:
            params["types"] = TYPE_URN[kind]
        data = await self._get("/search", params)
        if data is not None:
            rows = data.get("results") or []
            if isinstance(rows, dict):
                rows = rows.get("entities", [])
            out = [_norm(r) for r in rows if isinstance(r, dict)]
            if out:
                return out
        q = query.lower()
        hits = [n for n, e in ENTITIES.items() if q in n.lower() and (not kind or e["type"] == kind)]
        trace.log("qloo", "search (offline catalog)", f"q={query}", source="mock")
        return [_mock(n) for n in hits[:take]]

    async def insights(self, kind: str, entity_ids: list[str], location: str = "Bangalore", take: int = 8) -> list[dict] | None:
        real_ids = [i for i in entity_ids if i and not i.startswith("mock:")]
        if not real_ids:
            return None
        params = {
            "filter.type": TYPE_URN[kind],
            "signal.interests.entities": ",".join(real_ids[:10]),
            "filter.location.query": location,
            "take": take,
        }
        data = await self._get("/v2/insights", params)
        if data is None:
            return None
        res = data.get("results") or {}
        rows = res.get("entities", []) if isinstance(res, dict) else res
        return [_norm(r) for r in rows if isinstance(r, dict)]

    async def examples_for_tag(self, tag: str) -> list[dict]:
        """Entities that exemplify a taste tag, shown on the question card."""
        label, _emoji, _group, ents = TAGS[tag]
        if self.live:
            out: list[dict] = []
            for name, kind in ents[:3]:
                found = await self.search(name, kind, take=1)
                if found and found[0]["source"] == "qloo":
                    out.append(found[0])
            if out:
                return out
        return [_mock(n) for n, _ in ents[:4]]

    async def resolve(self, name: str, kind: str | None = None) -> dict | None:
        found = await self.search(name, kind, take=1)
        return found[0] if found else None

    async def hangout_spots(self, shared_names: list[str], shared_tags: list[str], take: int = 5) -> dict:
        """Places in Bangalore that two people with overlapping taste would both enjoy."""
        if self.live:
            ids: list[str] = []
            for n in shared_names[:4]:
                hit = await self.resolve(n)
                if hit and hit["id"]:
                    ids.append(hit["id"])
            ids = list(dict.fromkeys(ids))
            rows = await self.insights("place", ids, take=take) if ids else None
            if rows:
                return {"source": "qloo", "spots": rows[:take]}
        tags = [t for t in shared_tags if t in ("foodie", "cafes", "craft_beer", "fine_dining", "art_theatre", "books", "nightlife", "trekking", "photography", "cricket")] or TAG_PLACE_FALLBACK
        spots, seen = [], set()
        for t in tags:
            for name, kind in TAGS[t][3]:
                if kind == "place" and name not in seen:
                    seen.add(name)
                    spots.append(_mock(name))
        trace.log("qloo", "hangout spots (offline catalog)", ",".join(tags[:3]), source="mock")
        return {"source": "mock", "spots": spots[:take]}


qloo = QlooClient()
