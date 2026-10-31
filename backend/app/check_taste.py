"""Smoke-test the live taste API with the key and base URL from .env.

    python -m app.check_taste

Prints the raw response shapes so the client in taste.py can be verified (or adjusted) in one go.
"""
import asyncio
import json
import sys

import httpx

from .config import settings
from .taste import taste


def show(title: str, data) -> None:
    print(f"\n=== {title}")
    print(json.dumps(data, indent=2, ensure_ascii=False)[:1800])


async def main() -> int:
    if not (settings.taste_api_key and settings.taste_base_url):
        print("TASTE_API_KEY / TASTE_BASE_URL are empty in backend/.env, nothing to test.")
        return 1
    headers = {"X-Api-Key": settings.taste_api_key}
    async with httpx.AsyncClient(base_url=settings.taste_base_url, headers=headers, timeout=15) as c:
        r = await c.get("/search", params={"query": "Prateek Kuhad", "types": "urn:entity:artist", "take": 2})
        print("GET /search ->", r.status_code)
        body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {"raw": r.text[:300]}
        show("search response (trimmed)", body)
        results = body.get("results") if isinstance(body, dict) else None
        entity_id = results[0].get("entity_id") or results[0].get("id") if results else None
        if entity_id:
            r2 = await c.get("/v2/insights", params={
                "filter.type": "urn:entity:place", "signal.interests.entities": entity_id,
                "filter.location.query": "Bangalore", "take": 3,
            })
            print("\nGET /v2/insights ->", r2.status_code)
            show("insights response (trimmed)", r2.json() if r2.status_code == 200 else {"raw": r2.text[:300]})

    print("\n--- through the app's client (normalised) ---")
    print("mode:", taste.mode)
    show("search('Toit')", await taste.search("Toit", "place", take=2))
    show("examples_for_tag('indie_music')", await taste.examples_for_tag("indie_music"))
    show("hangout_spots", await taste.hangout_spots(["Prateek Kuhad", "Toit"], ["cafes", "foodie"], take=3))
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
