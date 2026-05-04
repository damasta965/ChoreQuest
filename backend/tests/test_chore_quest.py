"""Chore Quest backend regression tests."""
import os
import pytest
import requests
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
if not BASE_URL:
    # Fallback: read frontend env
    fe_env = Path("/app/frontend/.env").read_text()
    for line in fe_env.splitlines():
        if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().strip('"')
            break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
mongo = MongoClient(MONGO_URL)[DB_NAME]


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def profiles(s):
    r = s.get(f"{API}/profiles", timeout=15)
    assert r.status_code == 200
    data = r.json()
    return {p["name"]: p for p in data}


# -------- Profiles --------
class TestProfiles:
    def test_list_profiles_returns_three(self, s):
        r = s.get(f"{API}/profiles")
        assert r.status_code == 200
        data = r.json()
        names = sorted([p["name"] for p in data])
        assert names == ["Boss", "Jacob", "Zach"]
        for p in data:
            assert "pin" not in p, "PIN must not be exposed"
            assert "rank" in p and "level" in p
            assert "next_rank" in p
            assert "unlocked_gear" in p and isinstance(p["unlocked_gear"], list)

    def test_verify_pin_correct(self, s, profiles):
        for name, pin in [("Zach", "1111"), ("Jacob", "2222"), ("Boss", "9999")]:
            r = s.post(f"{API}/profiles/verify-pin", json={"profile_id": profiles[name]["id"], "pin": pin})
            assert r.status_code == 200, f"{name} pin failed: {r.text}"
            j = r.json()
            assert j["ok"] is True
            assert j["profile"]["name"] == name
            assert "pin" not in j["profile"]

    def test_verify_pin_wrong(self, s, profiles):
        r = s.post(f"{API}/profiles/verify-pin", json={"profile_id": profiles["Zach"]["id"], "pin": "0000"})
        assert r.status_code == 401


# -------- Quests --------
class TestQuests:
    def test_list_quests_seeded(self, s):
        r = s.get(f"{API}/quests")
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 15
        cats = {d["category"] for d in data}
        assert {"daily", "weekly", "extra"}.issubset(cats)

    def test_create_update_delete_quest(self, s):
        payload = {"title": "TEST_quest", "description": "test", "category": "extra", "xp": 5, "gold": 0.1, "icon": "scroll"}
        r = s.post(f"{API}/quests", json=payload)
        assert r.status_code == 200
        qid = r.json()["id"]

        r = s.patch(f"{API}/quests/{qid}", json={"xp": 99})
        assert r.status_code == 200
        assert r.json()["xp"] == 99

        r = s.delete(f"{API}/quests/{qid}")
        assert r.status_code == 200

        # verify deleted
        r = s.patch(f"{API}/quests/{qid}", json={"xp": 5})
        assert r.status_code == 404


# -------- Completions --------
class TestCompletions:
    @pytest.fixture(scope="class")
    def daily_quest(self, s):
        r = s.get(f"{API}/quests", params={"category": "daily"})
        return r.json()[0]

    def test_submit_then_duplicate_blocked(self, s, profiles, daily_quest):
        # Clean any existing completions for Zach for this quest today
        mongo.completions.delete_many({"profile_id": profiles["Zach"]["id"], "quest_id": daily_quest["id"]})
        # Reset Zach
        mongo.profiles.update_one({"id": profiles["Zach"]["id"]},
                                  {"$set": {"xp": 0, "gold": 0.0, "total_earned": 0.0,
                                            "streak": 0, "last_completion_date": None,
                                            "wheel_spins": 0}})

        r = s.post(f"{API}/completions", json={"quest_id": daily_quest["id"], "profile_id": profiles["Zach"]["id"]})
        assert r.status_code == 200
        cid = r.json()["id"]
        assert r.json()["status"] == "pending"

        # Duplicate
        r2 = s.post(f"{API}/completions", json={"quest_id": daily_quest["id"], "profile_id": profiles["Zach"]["id"]})
        assert r2.status_code == 400

        # Approve and check streak=1, xp/gold awarded
        r3 = s.post(f"{API}/completions/{cid}/approve")
        assert r3.status_code == 200
        body = r3.json()
        assert body["awarded"]["new_streak"] == 1
        assert body["awarded"]["xp"] == daily_quest["xp"]
        assert body["profile"]["xp"] == daily_quest["xp"]
        assert body["profile"]["rank"] == "Peasant"

        # double-approve fails
        r4 = s.post(f"{API}/completions/{cid}/approve")
        assert r4.status_code == 400

    def test_reject_does_not_award(self, s, profiles):
        # Pick a different daily quest to avoid conflict
        quests = s.get(f"{API}/quests", params={"category": "daily"}).json()
        # Find a quest not already submitted today
        for q in quests:
            existing = mongo.completions.find_one({
                "profile_id": profiles["Jacob"]["id"], "quest_id": q["id"],
                "status": {"$in": ["pending", "approved"]},
            })
            if not existing:
                target = q
                break
        # reset Jacob
        mongo.profiles.update_one({"id": profiles["Jacob"]["id"]},
                                  {"$set": {"xp": 0, "gold": 0.0, "streak": 0,
                                            "last_completion_date": None, "wheel_spins": 0}})
        r = s.post(f"{API}/completions", json={"quest_id": target["id"], "profile_id": profiles["Jacob"]["id"]})
        assert r.status_code == 200
        cid = r.json()["id"]
        r = s.post(f"{API}/completions/{cid}/reject")
        assert r.status_code == 200

        prof = s.get(f"{API}/profiles/{profiles['Jacob']['id']}").json()
        assert prof["xp"] == 0
        assert prof["streak"] == 0


# -------- Streak Bonus --------
class TestStreakBonus:
    def test_streak_milestone_3_grants_spin_and_bonus_xp(self, s, profiles):
        # Reset Boss role profile for streak test? Use Zach
        zid = profiles["Zach"]["id"]
        # set last_completion_date = yesterday, streak=2
        yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
        mongo.profiles.update_one({"id": zid},
                                  {"$set": {"streak": 2, "last_completion_date": yesterday,
                                            "wheel_spins": 0, "xp": 0, "gold": 0}})
        # Find a daily quest not already submitted today
        quests = s.get(f"{API}/quests", params={"category": "daily"}).json()
        target = None
        for q in quests:
            existing = mongo.completions.find_one({
                "profile_id": zid, "quest_id": q["id"],
                "submitted_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)},
                "status": {"$in": ["pending", "approved"]},
            })
            if not existing:
                target = q
                break
        assert target, "No available daily quest"
        r = s.post(f"{API}/completions", json={"quest_id": target["id"], "profile_id": zid})
        assert r.status_code == 200
        cid = r.json()["id"]
        r = s.post(f"{API}/completions/{cid}/approve")
        assert r.status_code == 200
        body = r.json()
        assert body["awarded"]["new_streak"] == 3
        assert body["awarded"]["wheel_spins"] == 1
        assert body["awarded"]["streak_bonus_xp"] == 25
        assert body["profile"]["wheel_spins"] >= 1


# -------- Wheel --------
class TestWheel:
    def test_spin_with_zero_fails(self, s, profiles):
        jid = profiles["Jacob"]["id"]
        mongo.profiles.update_one({"id": jid}, {"$set": {"wheel_spins": 0}})
        r = s.post(f"{API}/wheel/spin/{jid}")
        assert r.status_code == 400

    def test_spin_with_one_works(self, s, profiles):
        jid = profiles["Jacob"]["id"]
        mongo.profiles.update_one({"id": jid}, {"$set": {"wheel_spins": 1}})
        r = s.post(f"{API}/wheel/spin/{jid}")
        assert r.status_code == 200
        body = r.json()
        assert "reward" in body
        assert body["profile"]["wheel_spins"] == 0


# -------- Payouts --------
class TestPayouts:
    def test_payout_decrements_gold(self, s, profiles):
        zid = profiles["Zach"]["id"]
        mongo.profiles.update_one({"id": zid}, {"$set": {"gold": 5.0, "total_paid": 0.0}})
        r = s.post(f"{API}/payouts", json={"profile_id": zid, "amount": 3.0, "note": "TEST"})
        assert r.status_code == 200
        prof = r.json()["profile"]
        assert abs(prof["gold"] - 2.0) < 0.001
        assert abs(prof["total_paid"] - 3.0) < 0.001

    def test_payout_exceeds_gold_fails(self, s, profiles):
        zid = profiles["Zach"]["id"]
        mongo.profiles.update_one({"id": zid}, {"$set": {"gold": 1.0}})
        r = s.post(f"{API}/payouts", json={"profile_id": zid, "amount": 100.0})
        assert r.status_code == 400


# -------- Leaderboard / Stats --------
class TestStats:
    def test_leaderboard_only_kids_sorted(self, s):
        r = s.get(f"{API}/leaderboard")
        assert r.status_code == 200
        data = r.json()
        names = [d["name"] for d in data]
        assert "Boss" not in names
        xps = [d["xp"] for d in data]
        assert xps == sorted(xps, reverse=True)

    def test_stats_overview(self, s):
        r = s.get(f"{API}/stats/overview")
        assert r.status_code == 200
        d = r.json()
        assert "kids" in d
        assert "pending_approvals" in d
        assert "approved_today" in d
        assert isinstance(d["kids"], list)
