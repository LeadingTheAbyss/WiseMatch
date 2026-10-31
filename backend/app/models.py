from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    age: Mapped[int] = mapped_column(Integer, default=25)
    gender: Mapped[str] = mapped_column(String(20), default="male")
    occupation: Mapped[str] = mapped_column(String(140), default="")
    area: Mapped[str] = mapped_column(String(60), index=True, default="Koramangala")
    lat: Mapped[float] = mapped_column(Float, default=12.9352)
    lng: Mapped[float] = mapped_column(Float, default=77.6245)
    bio: Mapped[str] = mapped_column(Text, default="")
    intent: Mapped[str] = mapped_column(String(12), default="seeking")  # seeking | has_room
    budget_min: Mapped[int] = mapped_column(Integer, default=10000)
    budget_max: Mapped[int] = mapped_column(Integer, default=20000)
    move_in: Mapped[str] = mapped_column(String(40), default="Flexible")
    gender_pref: Mapped[str] = mapped_column(String(12), default="any")  # any | same | male | female
    religion: Mapped[str] = mapped_column(String(30), default="")
    languages: Mapped[list] = mapped_column(JSON, default=list)
    traits: Mapped[dict] = mapped_column(JSON, default=dict)  # what the person is like
    prefs: Mapped[dict] = mapped_column(JSON, default=dict)  # what they accept in a roommate
    taste: Mapped[list] = mapped_column(JSON, default=list)  # taste entities they love
    tags: Mapped[list] = mapped_column(JSON, default=list)  # taste tags, derived
    anti_tags: Mapped[list] = mapped_column(JSON, default=list)
    custom_prefs: Mapped[list] = mapped_column(JSON, default=list)
    answers: Mapped[dict] = mapped_column(JSON, default=dict)  # onboarding log
    onboarded: Mapped[bool] = mapped_column(Boolean, default=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    last_active: Mapped[str] = mapped_column(String(30), default="Active today")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Listing(Base):
    __tablename__ = "listings"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(160))
    area: Mapped[str] = mapped_column(String(60), index=True)
    rent: Mapped[int] = mapped_column(Integer)  # monthly share
    deposit: Mapped[int] = mapped_column(Integer, default=0)
    room_type: Mapped[str] = mapped_column(String(60), default="Private room")
    flat_type: Mapped[str] = mapped_column(String(20), default="2 BHK")
    furnishing: Mapped[str] = mapped_column(String(30), default="Semi-furnished")
    amenities: Mapped[list] = mapped_column(JSON, default=list)
    description: Mapped[str] = mapped_column(Text, default="")
    available_from: Mapped[str] = mapped_column(String(40), default="Immediately")
    photos: Mapped[int] = mapped_column(Integer, default=4)
    hue: Mapped[int] = mapped_column(Integer, default=250)


class Interest(Base):
    __tablename__ = "interests"
    __table_args__ = (UniqueConstraint("from_id", "to_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    from_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    to_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Conversation(Base):
    __tablename__ = "conversations"
    __table_args__ = (UniqueConstraint("user_a", "user_b"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_a: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    user_b: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(12), default="accepted")  # accepted | request
    initiator_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id"), index=True)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
