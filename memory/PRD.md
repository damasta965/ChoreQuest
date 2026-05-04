# Chore Quest — Product Requirements

## Overview
A medieval RPG-themed gamified chore tracker for kids. Kids complete chores as "quests" to earn real money, XP, levels, and ranks (Peasant → Legend). Parents use "Boss Mode" to approve completions and manage payouts.

## Users
- **Zach (11)** — kid profile, PIN 1111, Knight class
- **Jacob (17)** — kid profile, PIN 2222, Archer class
- **Boss (parent)** — boss profile, PIN 9999

## Core Features
### Player System
- PIN-protected profile selection (3 characters)
- Session persisted via AsyncStorage
- Profile-based routing (kid → hero tabs, boss → boss tabs)
- **PIN customization**: Boss Settings tab — change any profile's PIN (requires current Boss PIN to authorize)

### Quest System
- Daily / Weekly / Extra Credit categories
- 15 pre-seeded chores with XP + $ values
- Mark complete → "Awaiting Boss Approval"
- Daily dedup (one submission/day), weekly dedup (one/week)
- Extra credit: unlimited submissions
- **Photo proof toggle** (per-quest): Boss can require photo proof; kids attach via camera or gallery; Boss sees thumbnail + full-screen viewer in approval queue

### Boss Mode (5 tabs)
- **Approvals** — queue with approve/reject, photo preview
- **Quests** — full CRUD (title, desc, category, XP, gold, icon, assignment, photo_required)
- **Payouts** — cash ledger (earned, paid, owed) + payout records
- **Realm** — overview stats, per-kid progress
- **Settings** — PIN management for all profiles

### Gamification
- Ranks: Peasant (0) → Squire (100) → Knight (300) → Champion (700) → Hero (1500) → Legend (3000)
- 3-day streak = 1 wheel spin + 25 bonus XP
- 7-day streak = 2 wheel spins + 100 bonus XP
- 14-day streak = 3 wheel spins + 200 bonus XP
- Wheel of Fate: 8 rewards (cash, XP, 2x token, skip token, jackpot)
- Leaderboard: XP-ranked sibling competition

### Avatars & Gear
- 4 classes: Knight, Archer, Mage, Rogue
- 13 gear items across 4 slots (weapon/shield/helmet/cape), unlocked by level
- Locker: switch class, equip/unequip gear
- **AI Avatar Generation** via Gemini Nano Banana (gemini-3.1-flash-image-preview):
  - Kid enters custom prompt OR picks from class-appropriate presets
  - Generates medieval fantasy portrait, saved as base64 data URI on profile
  - Rendered everywhere (profile picker, dashboard, leaderboard, payouts, stats)
  - Can be cleared to revert to class emoji

## Stack
- Frontend: Expo SDK 54, React Native, expo-router, TypeScript, expo-image-picker
- Backend: FastAPI + MongoDB (motor) + emergentintegrations (Gemini image gen)
- Storage: AsyncStorage for session persistence

## Integrations
- Gemini Nano Banana via Emergent Universal LLM Key (EMERGENT_LLM_KEY) — image generation only

## Routes
- `/` — Profile select
- `/pin` — PIN entry modal
- `/hero/(dashboard|quests|wheel|leaderboard|locker)` — kid tabs (5)
- `/boss/(approvals|manage|payouts|stats|settings)` — parent tabs (5)

## Key API Endpoints
- `POST /api/profiles/verify-pin` — auth
- `POST /api/profiles/change-pin` — boss-authorized PIN change
- `POST /api/profiles/generate-avatar` — AI portrait gen (Gemini Nano Banana)
- `DELETE /api/profiles/{id}/avatar-image` — revert to class emoji
- `POST /api/completions` — submit (validates photo_required)
- `POST /api/completions/{id}/approve` — award XP/gold, update streak
- `POST /api/wheel/spin/{pid}` — wheel reward
- `POST /api/payouts` — mark cash paid
