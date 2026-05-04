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

### Quest System
- Daily / Weekly / Extra Credit categories
- 15 pre-seeded chores with XP + $ values
- Mark complete → "Awaiting Boss Approval"
- Daily dedup (one submission/day), weekly dedup (one/week)
- Extra credit: unlimited submissions

### Boss Mode
- Approval queue with approve/reject
- Full CRUD on quests (title, description, category, XP, gold, icon, assignment)
- Payout ledger (cash owed, total paid)
- Realm overview with per-kid stats

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

## Stack
- Frontend: Expo SDK 54, React Native, expo-router, TypeScript
- Backend: FastAPI + MongoDB (motor)
- Storage: AsyncStorage for session persistence
- No external integrations (PIN-only auth, no LLM, no payments)

## Routes
- `/` — Profile select
- `/pin` — PIN entry modal
- `/hero/(dashboard|quests|wheel|leaderboard|locker)` — kid tabs
- `/boss/(approvals|manage|payouts|stats)` — parent tabs
