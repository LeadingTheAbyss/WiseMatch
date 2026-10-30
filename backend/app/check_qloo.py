"""Smoke-test the live Qloo API with the key from .env.

    python -m app.check_qloo

Prints the raw response shapes so the client in qloo.py can be verified (or adjusted) in one go.
"""
import asyncio
import json
import sys

import httpx

from .config import settings
from .qloo import qloo


def show(title: str, data) -> None:
    print(f"\n=== {title}")
    print(json.dumps(data, indent=2, ensure_ascii=False)[:1800])


async def main() -> int:
    if not settings.qloo_api_key:
        print("QLOO_API_KEY is empty in backend/.env, nothing to test.")
        return 1
    headers = {"X-Api-Key": settings.qloo_api_key}
    async with httpx.AsyncClient(base_url=settings.qloo_base_url, headers=headers, timeout=15) as c:
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
    print("mode:", qloo.mode)
    show("search('Toit')", await qloo.search("Toit", "place", take=2))
    show("examples_for_tag('indie_music')", await qloo.examples_for_tag("indie_music"))
    show("hangout_spots", await qloo.hangout_spots(["Prateek Kuhad", "Toit"], ["cafes", "foodie"], take=3))
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
