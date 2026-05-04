# 📱 Building Chore Quest as an Android APK

Chore Quest is already configured for a production APK build. Here's how to create and install it.

---

## ⚙️ What's already done

- ✅ App name: **Chore Quest**
- ✅ Package name: `com.chorequest.app`
- ✅ Version: `1.0.0` (Android versionCode: 1)
- ✅ Camera & photo library permissions declared
- ✅ Dark splash screen matching medieval theme
- ✅ `eas.json` with `preview` profile that outputs a direct-install APK

---

## 🏗️ Step-by-step build

### 1. Save the project to GitHub
Use the **"Save to GitHub"** button in Emergent (top-right).

### 2. Clone to your local machine
```bash
git clone <your-repo-url>
cd <repo-name>/frontend
```

### 3. Install EAS CLI (one-time)
```bash
npm install -g eas-cli
```

### 4. Create a free Expo account & log in
Sign up at https://expo.dev — takes 30 seconds.
```bash
eas login
```

### 5. Link this project to your Expo account
```bash
eas init
```
(Answer **yes** when prompted to create a new project.)

### 6. (IMPORTANT) Deploy the backend first
Your APK needs a stable backend URL. In Emergent, click **Deploy** (top-right) to get a permanent URL. Then open `frontend/eas.json` and replace the placeholder `EXPO_PUBLIC_BACKEND_URL` in the `preview` (and `production`) profiles with your deployed URL. Example:
```json
"env": {
  "EXPO_PUBLIC_BACKEND_URL": "https://chore-quest-abc123.emergent.app"
}
```

### 7. Build the APK in the cloud ☁️
```bash
eas build -p android --profile preview
```

Expo builds it on their servers (~15–25 min on free tier). When it finishes, you get a download URL in the terminal AND on https://expo.dev (under your project → Builds).

### 8. Install on your kids' phones 📲
1. Open the download link on the Android phone (or email it to them)
2. Download the `.apk` file
3. Tap the file → Android will ask permission to install unknown apps → allow
4. Install → Chore Quest icon appears on their home screen ⚔️

---

## 🔄 Updating the app later

After code changes on GitHub:
```bash
# Bump versions in app.json
# "version": "1.0.1", "versionCode": 2

eas build -p android --profile preview
```
New APK overwrites the old one when installed.

### Optional: Over-the-air updates (no rebuild needed)
Later you can install `expo-updates` to push JS changes without rebuilding the APK — skip for now.

---

## 🆓 Free-tier limits (as of 2026)

Expo's free tier includes a generous monthly build quota. Chore Quest is small, so you'll have plenty of headroom. You'll hit no costs for normal personal/family use.

---

## 🎮 Want the Play Store version?

Change the profile:
```bash
eas build -p android --profile production
```
This produces an `.aab` file (Android App Bundle) for Play Store upload. Requires a $25 one-time Google Play Developer account.

---

## ⚠️ Troubleshooting

| Problem | Fix |
|---|---|
| "App can't connect to backend" | Verify `EXPO_PUBLIC_BACKEND_URL` in `eas.json` points to a deployed (not preview) URL |
| Camera/photo picker does nothing | Android needs permissions — already declared; user must accept on first use |
| Login PINs don't work | Backend URL unreachable — check above |
| Build fails with "keystore" error | Run `eas credentials` and let Expo generate one for you |

---

## 🗝️ Default login PINs

| Profile | PIN |
|---|---|
| Zach | 1111 |
| Jacob | 2222 |
| Boss | 9999 |

Boss can change any PIN after logging in → Settings tab.

Enjoy the realm! 🏰⚔️
