# 🚀 Deploy Chore Quest to Render

This guide walks you through deploying the **backend** to Render and pointing your APK at it. ~25 minutes total.

---

## Files already prepared for you

| File | Purpose |
|---|---|
| `/app/render.yaml` | One-click Blueprint config — Render reads this and sets up everything |
| `/app/backend/Procfile` | Backup process file (Render uses startCommand from render.yaml first) |

---

## Step 1: Set up MongoDB Atlas (10 min) — FREE forever

1. Go to https://www.mongodb.com/cloud/atlas → **Try Free**
2. Sign up (Google login is fastest)
3. Build a Database → choose **M0 FREE** tier → pick your region (closest to your home)
4. **Username & password** screen → create one (write it down!)
5. **Network Access** → **Add IP Address** → enter `0.0.0.0/0` → confirm
6. Database → **Connect** button → **Drivers** → **Python** → copy the connection string. It looks like:
   ```
   mongodb+srv://YOUR_USER:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Replace `<password>` with the password you wrote down.

✅ Save this connection string — you'll paste it into Render in step 5.

---

## Step 2: Get a free Google Gemini API key (3 min)

1. Go to https://aistudio.google.com → sign in with Google
2. Click **"Get API key"** in the left sidebar → **Create API key** → **Create API key in new project**
3. Copy the key (looks like `AIzaSy...`)

✅ Save this key — you'll paste it into Render too.

> **Note:** The free tier of Gemini Nano Banana 2 (`gemini-3.1-flash-image-preview`) gives you a generous quota. Personal/family use will not exceed it. Pricing: https://ai.google.dev/pricing

---

## Step 3: Save the project to GitHub (2 min)

In Emergent, click **"Save to GitHub"** (top-right). Pick a repo name like `chore-quest`.

---

## Step 4: Sign up for Render (2 min)

1. Go to https://render.com → **Get Started**
2. Sign up with **GitHub** (so it can read your repo)
3. Authorize Render

---

## Step 5: Deploy via Blueprint (5 min)

1. From your Render dashboard → **New ▾** → **Blueprint**
2. Connect your `chore-quest` GitHub repo
3. Render reads `/render.yaml` and shows the planned services. Click **Apply**.
4. Render will prompt you for the two **secret** env vars:
   - `MONGO_URL` → paste your MongoDB Atlas string from Step 1
   - `GOOGLE_API_KEY` → paste your Gemini key from Step 2
5. Click **Apply** → Render starts building (~5–10 min for the first build)

> ☁️ The free tier spins down after 15 min of inactivity. First request after sleep takes ~30 seconds. For always-on (no cold start), upgrade to **Starter** ($7/mo) by editing `render.yaml` → `plan: starter`.

---

## Step 6: Verify the backend works

Once Render shows **Live**, copy your service URL (e.g. `https://chore-quest-api.onrender.com`) and visit:
- `https://chore-quest-api.onrender.com/api/` → should return `{"message":"Chore Quest API","version":"1.0"}`
- `https://chore-quest-api.onrender.com/api/profiles` → should return JSON with Zach, Jacob, Boss profiles (auto-seeded)

✅ If both work, your backend is live.

---

## Step 7: Update the APK to use your Render backend (3 min)

1. Locally on your computer, after cloning the repo:
   ```bash
   cd chore-quest/frontend
   ```

2. Edit `eas.json` — replace the placeholder URL in BOTH the `preview` and `production` profiles:
   ```json
   "env": {
     "EXPO_PUBLIC_BACKEND_URL": "https://chore-quest-api.onrender.com"
   }
   ```

3. Build the APK:
   ```bash
   npm install -g eas-cli
   eas login
   eas init
   eas build -p android --profile preview
   ```

4. Wait ~15 min → download link appears → install on kids' phones.

---

## 🔄 Future updates

Every time you push a new commit to GitHub, Render auto-redeploys the backend (no manual steps).
For app changes, you'll need to rebuild the APK:
```bash
# Bump version in app.json (e.g. "1.0.1") and android.versionCode (e.g. 2)
eas build -p android --profile preview
```

---

## 💰 Cost summary

| Component | Tier | Cost |
|---|---|---|
| MongoDB Atlas | M0 free | $0 |
| Render web service | Free (sleeps after 15 min) | $0 |
| Render web service | Starter (always on) | $7/mo |
| Google Gemini API | Free tier (Nano Banana 2) | $0 (generous quota for personal use) |
| EAS Build | Free tier | $0 |

**Family use total: $0/month with cold starts, $7/month always-on.**

---

## ⚠️ Important notes

### Cold start mitigation
If you don't want to pay $7/mo but hate the 30s cold start, set up a free pinger:
- https://uptimerobot.com → ping `https://your-render-url.onrender.com/api/` every 5 minutes
- Keeps the service warm 24/7

### CORS
Already handled — `server.py` has `allow_origins=["*"]`, so the APK can call Render from any device.

---

## 🆘 Troubleshooting

| Problem | Fix |
|---|---|
| App stuck loading on phone | First request wakes the free Render service — wait 30s. Or upgrade to Starter plan. |
| `pymongo.errors.ServerSelectionTimeoutError` | Check MongoDB Atlas Network Access has `0.0.0.0/0` whitelisted |
| `Image generation failed: 401` or `403` | Your Google Gemini API key is wrong or doesn't have access. Re-check it in Google AI Studio. |
| `Image generation failed: 429` | You hit the free Gemini quota. Wait a minute or upgrade billing in Google Cloud. |
| 401 from `/api/profiles/verify-pin` | Default PINs: Zach=1111, Jacob=2222, Boss=9999. Boss can change them in Settings tab. |
| Cold start too slow | Upgrade plan to Starter ($7/mo) in `render.yaml` |

🎉 **You're done!** Share the APK with your kids and start the chore quests. ⚔️
