"""New features: PIN change, Avatar generation, Photo-proof quests."""
import os
import pytest
import requests
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
if not BASE_URL:
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
    return {p["name"]: p for p in r.json()}


# ---------- PIN Change ----------
class TestChangePin:
    def test_change_pin_wrong_boss_pin_401(self, s, profiles):
        r = s.post(f"{API}/profiles/change-pin", json={
            "profile_id": profiles["Zach"]["id"],
            "new_pin": "4242",
            "boss_pin": "0000",
        })
        assert r.status_code == 401

    def test_change_pin_invalid_format_400(self, s, profiles):
        r = s.post(f"{API}/profiles/change-pin", json={
            "profile_id": profiles["Zach"]["id"],
            "new_pin": "12",
            "boss_pin": "9999",
        })
        assert r.status_code == 400

        r2 = s.post(f"{API}/profiles/change-pin", json={
            "profile_id": profiles["Zach"]["id"],
            "new_pin": "abcd",
            "boss_pin": "9999",
        })
        assert r2.status_code == 400

    def test_change_pin_success_and_verify(self, s, profiles):
        zid = profiles["Zach"]["id"]
        # Change to new PIN
        r = s.post(f"{API}/profiles/change-pin", json={
            "profile_id": zid, "new_pin": "4242", "boss_pin": "9999",
        })
        assert r.status_code == 200
        assert r.json()["ok"] is True

        # Verify new PIN works
        rv = s.post(f"{API}/profiles/verify-pin", json={"profile_id": zid, "pin": "4242"})
        assert rv.status_code == 200

        # Old PIN fails
        ro = s.post(f"{API}/profiles/verify-pin", json={"profile_id": zid, "pin": "1111"})
        assert ro.status_code == 401

        # Reset back to 1111 for future tests
        rr = s.post(f"{API}/profiles/change-pin", json={
            "profile_id": zid, "new_pin": "1111", "boss_pin": "9999",
        })
        assert rr.status_code == 200

        rvr = s.post(f"{API}/profiles/verify-pin", json={"profile_id": zid, "pin": "1111"})
        assert rvr.status_code == 200


# ---------- Photo-required quests ----------
class TestPhotoQuests:
    @pytest.fixture(scope="class")
    def photo_quest(self, s):
        payload = {
            "title": "TEST_photo_quest", "description": "needs photo",
            "category": "extra", "xp": 10, "gold": 0.5,
            "icon": "camera", "photo_required": True,
        }
        r = s.post(f"{API}/quests", json=payload)
        assert r.status_code == 200
        q = r.json()
        assert q["photo_required"] is True
        yield q
        # cleanup
        s.delete(f"{API}/quests/{q['id']}")

    def test_get_quest_has_photo_required(self, s, photo_quest):
        r = s.get(f"{API}/quests")
        assert r.status_code == 200
        match = [q for q in r.json() if q["id"] == photo_quest["id"]]
        assert match and match[0]["photo_required"] is True

    def test_patch_photo_required_toggle(self, s, photo_quest):
        r = s.patch(f"{API}/quests/{photo_quest['id']}", json={"photo_required": False})
        assert r.status_code == 200
        assert r.json()["photo_required"] is False
        # toggle back
        r2 = s.patch(f"{API}/quests/{photo_quest['id']}", json={"photo_required": True})
        assert r2.status_code == 200
        assert r2.json()["photo_required"] is True

    def test_submit_without_photo_fails_400(self, s, profiles, photo_quest):
        mongo.completions.delete_many({"profile_id": profiles["Jacob"]["id"], "quest_id": photo_quest["id"]})
        r = s.post(f"{API}/completions", json={
            "quest_id": photo_quest["id"],
            "profile_id": profiles["Jacob"]["id"],
        })
        assert r.status_code == 400
        assert "photo" in r.text.lower()

    def test_submit_with_photo_succeeds(self, s, profiles, photo_quest):
        mongo.completions.delete_many({"profile_id": profiles["Jacob"]["id"], "quest_id": photo_quest["id"]})
        fake_photo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        r = s.post(f"{API}/completions", json={
            "quest_id": photo_quest["id"],
            "profile_id": profiles["Jacob"]["id"],
            "photo": fake_photo,
        })
        assert r.status_code == 200
        comp = r.json()
        assert comp["photo"] == fake_photo
        assert comp["status"] == "pending"


# ---------- Avatar generation ----------
class TestAvatarGen:
    def test_generate_avatar_and_clear(self, s, profiles):
        zid = profiles["Zach"]["id"]
        # Ensure avatar is null before
        mongo.profiles.update_one({"id": zid}, {"$set": {"avatar_image": None}})

        r = s.post(
            f"{API}/profiles/generate-avatar",
            json={"profile_id": zid, "prompt": "A brave knight with golden armor and a red cape"},
            timeout=90,
        )
        assert r.status_code == 200, f"avatar gen failed: {r.status_code} {r.text[:200]}"
        body = r.json()
        assert body["ok"] is True
        assert body["profile"]["avatar_image"].startswith("data:image/")
        # Non-empty base64 payload
        _, b64 = body["profile"]["avatar_image"].split("base64,", 1)
        assert len(b64) > 500

        # Verify persistence via GET
        rg = s.get(f"{API}/profiles/{zid}")
        assert rg.status_code == 200
        assert rg.json()["avatar_image"].startswith("data:image/")

        # Clear it
        rc = s.delete(f"{API}/profiles/{zid}/avatar-image")
        assert rc.status_code == 200
        assert rc.json()["avatar_image"] is None

        # Verify cleared
        rg2 = s.get(f"{API}/profiles/{zid}")
        assert rg2.json()["avatar_image"] is None
