from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import store
from .api import router
from .config import settings
from .db import Base, SessionLocal, engine
from .seed import seed_if_empty
from sqlalchemy import inspect, text


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    insp = inspect(engine)
    if insp.has_table("conversations") and "status" not in {c["name"] for c in insp.get_columns("conversations")}:
        with engine.begin() as conn:  # lightweight migration for databases created before message requests
            conn.execute(text("ALTER TABLE conversations ADD COLUMN status VARCHAR(12) NOT NULL DEFAULT 'accepted'"))
            conn.execute(text("ALTER TABLE conversations ADD COLUMN initiator_id INTEGER"))
    seed_if_empty(settings.seed_users)
    with SessionLocal() as db:
        store.load_all(db)
    yield


app = FastAPI(title="WiseMatch API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.trycloudflare\.com|http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)


@app.get("/")
def root():
    return {"name": "WiseMatch API", "docs": "/docs"}
