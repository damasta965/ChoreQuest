from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, date, timedelta
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Chore Quest API")
api_router = APIRouter(prefix="/api")

# ---------------- Constants ----------------
RANKS = [
    ("Peasant", 0),
    ("Squire", 100),
    ("Knight", 300),
    ("Champion", 700),
    ("Hero", 1500),
    ("Legend", 3000),
]

AVATAR_CLASSES = ["knight", "archer", "mage", "rogue"]

GEAR_UNLOCKS = [
    {"id": "wooden_sword", "name": "Wooden Sword", "slot": "weapon", "level": 1, "icon": "sword"},
    {"id": "iron_sword", "name": "Iron Sword", "slot": "weapon", "level": 3, "icon": "sword-cross"},
    {"id": "flame_blade", "name": "Flame Blade", "slot": "weapon", "level": 7, "icon": "fire"},
    {"id": "legendary_excalibur", "name": "Excalibur", "slot": "weapon", "level": 15, "icon": "sword"},
    {"id": "leather_shield", "name": "Leather Shield", "slot": "shield", "level": 2, "icon": "shield"},
    {"id": "iron_shield", "name": "Iron Shield", "slot": "shield", "level": 5, "icon": "shield-half-full"},
    {"id": "dragon_shield", "name": "Dragon Shield", "slot": "shield", "level": 10, "icon": "shield-star"},
    {"id": "leather_helm", "name": "Leather Helm", "slot": "helmet", "level": 2, "icon": "hat-fedora"},
    {"id": "iron_helm", "name": "Iron Helm", "slot": "helmet", "level": 6, "icon": "crown-outline"},
    {"id": "royal_crown", "name": "Royal Crown", "slot": "helmet", "level": 12, "icon": "crown"},
    {"id": "red_cape", "name": "Red Cape", "slot": "cape", "level": 4, "icon": "tshirt-crew"},
    {"id": "royal_cape", "name": "Royal Cape", "slot": "cape", "level": 8, "icon": "tshirt-crew"},
    {"id": "legend_cape", "name": "Legend's Mantle", "slot": "cape", "level": 20, "icon": "tshirt-crew"},
]

WHEEL_REWARDS = [
    {"id": "gold_1", "label": "+$1 Gold", "type": "gold", "value": 1.0, "weight": 25},
    {"id": "gold_2", "label": "+$2 Gold", "type": "gold", "value": 2.0, "weight": 15},
    {"id": "gold_5", "label": "+$5 Gold!", "type": "gold", "value": 5.0, "weight": 5},
    {"id": "xp_50", "label": "+50 XP", "type": "xp", "value": 50, "weight": 20},
    {"id": "xp_100", "label": "+100 XP", "type": "xp", "value": 100, "weight": 10},
    {"id": "double_xp", "label": "2x XP Token", "type": "double_xp", "value": 1, "weight": 10},
    {"id": "skip_chore", "label": "Skip Chore Token", "type": "skip", "value": 1, "weight": 10},
    {"id": "jackpot", "label": "JACKPOT! +10 XP +$0.50", "type": "combo", "value": 0, "weight": 5},
]

# ---------------- Models ----------------
class Profile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    role: Literal["kid", "boss"]
    pin: str
    avatar_class: str = "knight"
    avatar_image: Optional[str] = None  # base64 PNG string or None
    equipped_gear: dict = Field(default_factory=lambda: {"weapon": None, "shield": None, "helmet": None, "cape": None})
    xp: int = 0
    gold: float = 0.0  # unpaid gold
    total_earned: float = 0.0
    total_paid: float = 0.0
    streak: int = 0
    last_completion_date: Optional[str] = None  # YYYY-MM-DD
    wheel_spins: int = 0
    double_xp_tokens: int = 0
    skip_tokens: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProfileUpdate(BaseModel):
    avatar_class: Optional[str] = None
    avatar_image: Optional[str] = None
    equipped_gear: Optional[dict] = None
    pin: Optional[str] = None
    name: Optional[str] = None

class PinChange(BaseModel):
    profile_id: str
    new_pin: str
    boss_pin: str  # verify boss authority

class Quest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str = ""
    category: Literal["daily", "weekly", "extra"]
    xp: int
    gold: float
    assigned_to: str = "all"  # profile_id or "all"
    icon: str = "scroll"
    photo_required: bool = False
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuestCreate(BaseModel):
    title: str
    description: str = ""
    category: Literal["daily", "weekly", "extra"]
    xp: int
    gold: float
    assigned_to: str = "all"
    icon: str = "scroll"
    photo_required: bool = False

class QuestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[Literal["daily", "weekly", "extra"]] = None
    xp: Optional[int] = None
    gold: Optional[float] = None
    assigned_to: Optional[str] = None
    icon: Optional[str] = None
    photo_required: Optional[bool] = None
    active: Optional[bool] = None

class Completion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quest_id: str
    quest_title: str
    quest_category: str
    profile_id: str
    profile_name: str
    xp: int
    gold: float
    photo: Optional[str] = None  # base64 string
    status: Literal["pending", "approved", "rejected"] = "pending"
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None
    bonus_xp: int = 0  # from streaks/double_xp

class CompletionCreate(BaseModel):
    quest_id: str
    profile_id: str
    use_double_xp: bool = False
    photo: Optional[str] = None

class PinVerify(BaseModel):
    profile_id: str
    pin: str

class PayoutCreate(BaseModel):
    profile_id: str
    amount: float
    note: str = ""

class Payout(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    profile_id: str
    profile_name: str
    amount: float
    note: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SpinResult(BaseModel):
    reward_id: str
    label: str
    type: str
    value: float

# ---------------- Helpers ----------------
def clean(doc):
    if doc and "_id" in doc:
        doc.pop("_id")
    return doc

def get_rank(xp: int) -> dict:
    current = RANKS[0]
    next_rank = None
    for i, (name, threshold) in enumerate(RANKS):
        if xp >= threshold:
            current = (name, threshold)
            next_rank = RANKS[i + 1] if i + 1 < len(RANKS) else None
    next_info = None
    if next_rank:
        next_info = {"name": next_rank[0], "threshold": next_rank[1], "xp_to_next": next_rank[1] - xp}
    return {
        "rank": current[0],
        "rank_xp": current[1],
        "next_rank": next_info,
        "level": max(1, xp // 100 + 1),
    }

def get_unlocked_gear(xp: int) -> List[dict]:
    level = max(1, xp // 100 + 1)
    return [g for g in GEAR_UNLOCKS if g["level"] <= level]

def enrich_profile(p: dict) -> dict:
    p = clean(p)
    if not p:
        return p
    rank_info = get_rank(p.get("xp", 0))
    p["rank"] = rank_info["rank"]
    p["level"] = rank_info["level"]
    p["next_rank"] = rank_info["next_rank"]
    p["unlocked_gear"] = get_unlocked_gear(p.get("xp", 0))
    return p

def today_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

# ---------------- Seeding ----------------
DEFAULT_PROFILES = [
    {"name": "Zach", "role": "kid", "pin": "1111", "avatar_class": "knight"},
    {"name": "Jacob", "role": "kid", "pin": "2222", "avatar_class": "archer"},
    {"name": "Boss", "role": "boss", "pin": "9999", "avatar_class": "mage"},
]

DEFAULT_QUESTS = [
    {"title": "Make Your Bed", "description": "Tidy sheets and pillows.", "category": "daily", "xp": 10, "gold": 0.25, "icon": "bed"},
    {"title": "Do the Dishes", "description": "Load/unload or wash by hand.", "category": "daily", "xp": 15, "gold": 0.50, "icon": "silverware-fork-knife"},
    {"title": "Complete Homework", "description": "Finish all assigned schoolwork.", "category": "daily", "xp": 20, "gold": 0.50, "icon": "book-open-variant"},
    {"title": "Walk the Dog", "description": "At least 15 minutes outside.", "category": "daily", "xp": 15, "gold": 0.50, "icon": "dog"},
    {"title": "Feed the Pets", "description": "Food + fresh water.", "category": "daily", "xp": 10, "gold": 0.25, "icon": "food-drumstick"},
    {"title": "Brush Teeth (AM+PM)", "description": "Twice a day, no cheating!", "category": "daily", "xp": 5, "gold": 0.10, "icon": "tooth"},
    {"title": "Take Out Trash", "description": "All bins to the curb.", "category": "weekly", "xp": 20, "gold": 0.75, "icon": "trash-can"},
    {"title": "Vacuum the House", "description": "Living room, hallways, bedrooms.", "category": "weekly", "xp": 25, "gold": 1.00, "icon": "vacuum"},
    {"title": "Clean Bathroom", "description": "Sink, toilet, mirror.", "category": "weekly", "xp": 30, "gold": 1.50, "icon": "shower"},
    {"title": "Laundry Day", "description": "Wash, dry, fold, put away.", "category": "weekly", "xp": 35, "gold": 1.50, "icon": "washing-machine"},
    {"title": "Help Cook Dinner", "description": "Assist with a meal from start to finish.", "category": "extra", "xp": 30, "gold": 1.50, "icon": "chef-hat"},
    {"title": "Yard Work", "description": "Mow, rake, or weed for 30+ min.", "category": "extra", "xp": 40, "gold": 2.00, "icon": "tree"},
    {"title": "Wash the Car", "description": "Inside and out.", "category": "extra", "xp": 50, "gold": 3.00, "icon": "car-wash"},
    {"title": "Read a Book (30min)", "description": "Real books only, no screens.", "category": "extra", "xp": 25, "gold": 0.75, "icon": "bookshelf"},
    {"title": "Act of Kindness", "description": "Help a sibling or parent unprompted.", "category": "extra", "xp": 20, "gold": 0.50, "icon": "heart"},
]

async def seed_if_empty():
    prof_count = await db.profiles.count_documents({})
    if prof_count == 0:
        for p in DEFAULT_PROFILES:
            obj = Profile(**p)
            await db.profiles.insert_one(obj.model_dump())
    quest_count = await db.quests.count_documents({})
    if quest_count == 0:
        for q in DEFAULT_QUESTS:
            obj = Quest(**q)
            await db.quests.insert_one(obj.model_dump())

# ---------------- Routes ----------------
@api_router.get("/")
async def root():
    return {"message": "Chore Quest API", "version": "1.0"}

@api_router.post("/seed")
async def seed():
    await seed_if_empty()
    return {"ok": True}

@api_router.get("/meta")
async def meta():
    return {"ranks": [{"name": r[0], "threshold": r[1]} for r in RANKS], "gear": GEAR_UNLOCKS, "avatar_classes": AVATAR_CLASSES}

# Profiles
@api_router.get("/profiles")
async def list_profiles():
    await seed_if_empty()
    docs = await db.profiles.find({}, {"_id": 0, "pin": 0}).to_list(100)
    return [enrich_profile(d) for d in docs]

@api_router.get("/profiles/{pid}")
async def get_profile(pid: str):
    doc = await db.profiles.find_one({"id": pid}, {"_id": 0, "pin": 0})
    if not doc:
        raise HTTPException(404, "Profile not found")
    return enrich_profile(doc)

@api_router.post("/profiles/verify-pin")
async def verify_pin(body: PinVerify):
    doc = await db.profiles.find_one({"id": body.profile_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Profile not found")
    if doc.get("pin") != body.pin:
        raise HTTPException(401, "Incorrect PIN")
    doc.pop("pin", None)
    return {"ok": True, "profile": enrich_profile(doc)}

@api_router.post("/profiles/change-pin")
async def change_pin(body: PinChange):
    boss = await db.profiles.find_one({"role": "boss"}, {"_id": 0})
    if not boss or boss.get("pin") != body.boss_pin:
        raise HTTPException(401, "Incorrect Boss PIN")
    if not body.new_pin.isdigit() or len(body.new_pin) != 4:
        raise HTTPException(400, "PIN must be 4 digits")
    res = await db.profiles.update_one({"id": body.profile_id}, {"$set": {"pin": body.new_pin}})
    if res.matched_count == 0:
        raise HTTPException(404, "Profile not found")
    return {"ok": True}

@api_router.patch("/profiles/{pid}")
async def update_profile(pid: str, body: ProfileUpdate):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "No fields to update")
    res = await db.profiles.update_one({"id": pid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Profile not found")
    doc = await db.profiles.find_one({"id": pid}, {"_id": 0, "pin": 0})
    return enrich_profile(doc)

# Avatar generation
class AvatarGenBody(BaseModel):
    profile_id: str
    prompt: str

@api_router.post("/profiles/generate-avatar")
async def generate_avatar(body: AvatarGenBody):
    profile = await db.profiles.find_one({"id": body.profile_id}, {"_id": 0})
    if not profile:
        raise HTTPException(404, "Profile not found")
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "LLM key not configured")

    styled = (
        f"A medieval fantasy RPG character portrait, waist-up, facing slightly left. "
        f"Style: painterly digital illustration, dramatic rim lighting, parchment-paper background tone, "
        f"deep burgundy and royal gold color palette, ornate armor details. "
        f"Character description: {body.prompt.strip()}. "
        f"Clean composition, square framing, heroic pose, no text."
    )

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"avatar-{body.profile_id}-{uuid.uuid4()}",
            system_message="You generate medieval fantasy character portraits for a kids' chore app. Always produce a single image.",
        )
        chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
        msg = UserMessage(text=styled)
        _text, images = await chat.send_message_multimodal_response(msg)
    except Exception as e:
        logger.exception("Avatar gen failed")
        raise HTTPException(502, f"Image generation failed: {str(e)[:120]}")

    if not images:
        raise HTTPException(502, "No image returned")

    img = images[0]
    data_uri = f"data:{img.get('mime_type', 'image/png')};base64,{img['data']}"

    await db.profiles.update_one({"id": body.profile_id}, {"$set": {"avatar_image": data_uri}})
    updated = await db.profiles.find_one({"id": body.profile_id}, {"_id": 0, "pin": 0})
    return {"ok": True, "profile": enrich_profile(updated)}

@api_router.delete("/profiles/{pid}/avatar-image")
async def clear_avatar_image(pid: str):
    await db.profiles.update_one({"id": pid}, {"$set": {"avatar_image": None}})
    doc = await db.profiles.find_one({"id": pid}, {"_id": 0, "pin": 0})
    return enrich_profile(doc)

# Quests
@api_router.get("/quests")
async def list_quests(category: Optional[str] = None, profile_id: Optional[str] = None, active_only: bool = True):
    q = {}
    if active_only:
        q["active"] = True
    if category:
        q["category"] = category
    if profile_id:
        q["$or"] = [{"assigned_to": "all"}, {"assigned_to": profile_id}]
    docs = await db.quests.find(q, {"_id": 0}).to_list(500)
    return docs

@api_router.post("/quests")
async def create_quest(body: QuestCreate):
    obj = Quest(**body.model_dump())
    await db.quests.insert_one(obj.model_dump())
    return clean(obj.model_dump())

@api_router.patch("/quests/{qid}")
async def update_quest(qid: str, body: QuestUpdate):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "No fields")
    res = await db.quests.update_one({"id": qid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Quest not found")
    doc = await db.quests.find_one({"id": qid}, {"_id": 0})
    return doc

@api_router.delete("/quests/{qid}")
async def delete_quest(qid: str):
    res = await db.quests.delete_one({"id": qid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Quest not found")
    return {"ok": True}

# Completions
@api_router.post("/completions")
async def submit_completion(body: CompletionCreate):
    quest = await db.quests.find_one({"id": body.quest_id}, {"_id": 0})
    if not quest:
        raise HTTPException(404, "Quest not found")
    profile = await db.profiles.find_one({"id": body.profile_id}, {"_id": 0})
    if not profile:
        raise HTTPException(404, "Profile not found")

    # Prevent duplicate pending for same quest today (for dailies)
    today = today_str()
    start_today = datetime.strptime(today, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    if quest["category"] == "daily":
        existing = await db.completions.find_one({
            "quest_id": body.quest_id,
            "profile_id": body.profile_id,
            "status": {"$in": ["pending", "approved"]},
            "submitted_at": {"$gte": start_today},
        })
        if existing:
            raise HTTPException(400, "Already submitted today")

    # weekly: only once per calendar week
    if quest["category"] == "weekly":
        # start of week (Monday)
        now = datetime.now(timezone.utc)
        monday = now - timedelta(days=now.weekday())
        monday = monday.replace(hour=0, minute=0, second=0, microsecond=0)
        existing = await db.completions.find_one({
            "quest_id": body.quest_id,
            "profile_id": body.profile_id,
            "status": {"$in": ["pending", "approved"]},
            "submitted_at": {"$gte": monday},
        })
        if existing:
            raise HTTPException(400, "Already submitted this week")

    bonus = 0
    if body.use_double_xp and profile.get("double_xp_tokens", 0) > 0:
        bonus = quest["xp"]
        await db.profiles.update_one({"id": body.profile_id}, {"$inc": {"double_xp_tokens": -1}})

    if quest.get("photo_required") and not body.photo:
        raise HTTPException(400, "This quest requires a photo proof")

    comp = Completion(
        quest_id=quest["id"],
        quest_title=quest["title"],
        quest_category=quest["category"],
        profile_id=profile["id"],
        profile_name=profile["name"],
        xp=quest["xp"],
        gold=quest["gold"],
        photo=body.photo,
        bonus_xp=bonus,
    )
    await db.completions.insert_one(comp.model_dump())
    return clean(comp.model_dump())

@api_router.get("/completions")
async def list_completions(status: Optional[str] = None, profile_id: Optional[str] = None, limit: int = 100):
    q = {}
    if status:
        q["status"] = status
    if profile_id:
        q["profile_id"] = profile_id
    docs = await db.completions.find(q, {"_id": 0}).sort("submitted_at", -1).to_list(limit)
    return docs

@api_router.post("/completions/{cid}/approve")
async def approve_completion(cid: str):
    comp = await db.completions.find_one({"id": cid}, {"_id": 0})
    if not comp:
        raise HTTPException(404, "Completion not found")
    if comp["status"] != "pending":
        raise HTTPException(400, f"Already {comp['status']}")

    profile = await db.profiles.find_one({"id": comp["profile_id"]}, {"_id": 0})
    if not profile:
        raise HTTPException(404, "Profile not found")

    today = today_str()
    last = profile.get("last_completion_date")
    new_streak = profile.get("streak", 0)
    if last == today:
        pass
    elif last:
        y = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
        if last == y:
            new_streak += 1
        else:
            new_streak = 1
    else:
        new_streak = 1

    # streak bonuses: grant wheel spin at 3-day and 7-day milestones (only when crossing)
    spins_granted = 0
    streak_bonus_xp = 0
    if new_streak == 3 and profile.get("streak", 0) < 3:
        spins_granted += 1
        streak_bonus_xp += 25
    if new_streak == 7 and profile.get("streak", 0) < 7:
        spins_granted += 2
        streak_bonus_xp += 100
    if new_streak > 0 and new_streak % 14 == 0 and new_streak != profile.get("streak", 0):
        spins_granted += 3
        streak_bonus_xp += 200

    total_xp = comp["xp"] + comp.get("bonus_xp", 0) + streak_bonus_xp
    total_gold = comp["gold"]

    await db.profiles.update_one(
        {"id": profile["id"]},
        {
            "$inc": {
                "xp": total_xp,
                "gold": total_gold,
                "total_earned": total_gold,
                "wheel_spins": spins_granted,
            },
            "$set": {"streak": new_streak, "last_completion_date": today},
        },
    )
    await db.completions.update_one(
        {"id": cid},
        {"$set": {"status": "approved", "resolved_at": datetime.now(timezone.utc), "bonus_xp": comp.get("bonus_xp", 0) + streak_bonus_xp}},
    )

    updated = await db.profiles.find_one({"id": profile["id"]}, {"_id": 0, "pin": 0})
    return {
        "ok": True,
        "awarded": {"xp": total_xp, "gold": total_gold, "streak_bonus_xp": streak_bonus_xp, "wheel_spins": spins_granted, "new_streak": new_streak},
        "profile": enrich_profile(updated),
    }

@api_router.post("/completions/{cid}/reject")
async def reject_completion(cid: str):
    comp = await db.completions.find_one({"id": cid}, {"_id": 0})
    if not comp:
        raise HTTPException(404, "Completion not found")
    if comp["status"] != "pending":
        raise HTTPException(400, f"Already {comp['status']}")
    # refund double_xp token if used
    if comp.get("bonus_xp", 0) > 0:
        await db.profiles.update_one({"id": comp["profile_id"]}, {"$inc": {"double_xp_tokens": 1}})
    await db.completions.update_one({"id": cid}, {"$set": {"status": "rejected", "resolved_at": datetime.now(timezone.utc)}})
    return {"ok": True}

# Wheel
import random

@api_router.post("/wheel/spin/{pid}")
async def spin_wheel(pid: str):
    profile = await db.profiles.find_one({"id": pid}, {"_id": 0})
    if not profile:
        raise HTTPException(404, "Profile not found")
    if profile.get("wheel_spins", 0) <= 0:
        raise HTTPException(400, "No spins available")

    weights = [r["weight"] for r in WHEEL_REWARDS]
    reward = random.choices(WHEEL_REWARDS, weights=weights, k=1)[0]

    update_inc = {"wheel_spins": -1}
    if reward["type"] == "gold":
        update_inc["gold"] = reward["value"]
        update_inc["total_earned"] = reward["value"]
    elif reward["type"] == "xp":
        update_inc["xp"] = int(reward["value"])
    elif reward["type"] == "double_xp":
        update_inc["double_xp_tokens"] = 1
    elif reward["type"] == "skip":
        update_inc["skip_tokens"] = 1
    elif reward["type"] == "combo":
        update_inc["xp"] = 10
        update_inc["gold"] = 0.5
        update_inc["total_earned"] = 0.5

    await db.profiles.update_one({"id": pid}, {"$inc": update_inc})
    updated = await db.profiles.find_one({"id": pid}, {"_id": 0, "pin": 0})
    return {"reward": reward, "profile": enrich_profile(updated)}

@api_router.get("/wheel/rewards")
async def wheel_rewards():
    return WHEEL_REWARDS

# Leaderboard
@api_router.get("/leaderboard")
async def leaderboard():
    docs = await db.profiles.find({"role": "kid"}, {"_id": 0, "pin": 0}).to_list(100)
    enriched = [enrich_profile(d) for d in docs]
    enriched.sort(key=lambda x: x.get("xp", 0), reverse=True)
    return enriched

# Payouts
@api_router.post("/payouts")
async def create_payout(body: PayoutCreate):
    profile = await db.profiles.find_one({"id": body.profile_id}, {"_id": 0})
    if not profile:
        raise HTTPException(404, "Profile not found")
    if body.amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    if body.amount > profile.get("gold", 0) + 0.001:
        raise HTTPException(400, "Amount exceeds available gold")
    payout = Payout(profile_id=profile["id"], profile_name=profile["name"], amount=body.amount, note=body.note)
    await db.payouts.insert_one(payout.model_dump())
    await db.profiles.update_one(
        {"id": body.profile_id},
        {"$inc": {"gold": -body.amount, "total_paid": body.amount}},
    )
    updated = await db.profiles.find_one({"id": body.profile_id}, {"_id": 0, "pin": 0})
    return {"payout": clean(payout.model_dump()), "profile": enrich_profile(updated)}

@api_router.get("/payouts")
async def list_payouts(profile_id: Optional[str] = None):
    q = {}
    if profile_id:
        q["profile_id"] = profile_id
    docs = await db.payouts.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs

# Stats
@api_router.get("/stats/overview")
async def stats_overview():
    profiles = await db.profiles.find({"role": "kid"}, {"_id": 0, "pin": 0}).to_list(100)
    pending = await db.completions.count_documents({"status": "pending"})
    today = today_str()
    start_today = datetime.strptime(today, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    approved_today = await db.completions.count_documents({"status": "approved", "resolved_at": {"$gte": start_today}})
    return {
        "kids": [enrich_profile(p) for p in profiles],
        "pending_approvals": pending,
        "approved_today": approved_today,
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_seed():
    try:
        await seed_if_empty()
    except Exception as e:
        logger.exception(e)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
