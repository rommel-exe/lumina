# 🚀 Lumina Auto-Update System - Complete Setup

## ✅ What's Already Configured

Your app is **fully set up for automatic updates**. Here's what's been done:

### 1. **Frontend Update Checker** (`src/hooks/useAutoUpdate.ts`)
- ✅ Checks for updates every 30 minutes automatically
- ✅ Shows "Update Available" notification with new version
- ✅ One-click "Update" button that downloads & installs
- ✅ Auto-restarts app with new version

### 2. **Update Notification UI** (`src/App.tsx`)
- ✅ Animated notification banner at top of app
- ✅ Shows new version number
- ✅ "Update" button to install immediately
- ✅ "Dismiss" button to snooze notification

### 3. **Backend Updater Plugin** (`src-tauri/tauri.conf.json`)
- ✅ Configured to check GitHub Releases
- ✅ Points to: `https://github.com/rommel-exe/lumina/releases/latest/download/latest.json`
- ✅ Automatically downloads and installs updates

### 4. **Version Auto-Bump** (`scripts/bump-tauri-version.mjs`)
- ✅ Every build increments version: 0.0.8 → 0.0.9 → 0.0.10 (etc)
- ✅ Updates both `tauri.conf.json` and `Cargo.toml`
- ✅ Fully automatic, no manual changes needed

### 5. **Update Manifest Generator** (`scripts/generate-update-manifest.mjs`)
- ✅ Generates `latest.json` manifest file after build
- ✅ Includes version, signature, download URL
- ✅ Ready to upload to GitHub

---

## 🔄 The Release Workflow (What You Do)

### Step 1: Make Changes & Commit
```bash
# Edit your code
# Then commit
git add .
git commit -m "Add cool new feature"
```

### Step 2: Build the App
```bash
npm run tauri:build
```

This does 4 things automatically:
1. Bumps version: 0.0.8 → 0.0.9
2. Builds the app
3. Creates `.dmg` file
4. Generates `latest.json` manifest

### Step 3: Upload to GitHub
Go to: https://github.com/rommel-exe/lumina/releases

**Create a new release:**
1. Click "Create a new release"
2. Tag version: `v0.0.9` (matches your app version)
3. Title: `Version 0.0.9`
4. Upload these 2 files:
   - `lumina_0.0.9_aarch64.dmg` (from `src-tauri/target/release/bundle/dmg/`)
   - `latest.json` (from same directory)

### Step 4: Done! 🎉
- Users see "✨ Update Available: v0.0.9" notification
- They click "Update"
- App auto-downloads, installs, and restarts
- **New version running!**

---

## 📋 Quick Reference Commands

```bash
# Full build + manifest generation
npm run tauri:build

# Just generate the manifest (after manual build)
npm run generate:update-manifest

# Check for TypeScript errors
npm run lint

# Dev mode
npm run tauri dev
```

---

## 🔐 The Signature System (Security)

The `latest.json` includes a SHA256 signature of the `.dmg` file:
```json
{
  "version": "0.0.9",
  "pub_date": "2026-03-28T10:30:00Z",
  "url": "https://github.com/rommel-exe/lumina/releases/download/v0.0.9/lumina_0.0.9_aarch64.dmg",
  "signature": "a7c2e9f1b4d8e3c5a9b2f7e1d4c8a3b6e9f2c5d8a1b4e7f9c2d5e8a1b4c7",
  "notes": "Released on 3/28/2026"
}
```

- Signature is auto-generated from the `.dmg` file
- Tauri verifies this signature when installing
- Prevents tampering or corrupted downloads
- **You don't need to manage this** - it's automatic!

---

## 🛠️ Behind the Scenes

### Auto-Update Flow:
```
App Starts
    ↓
useAutoUpdate hook activates
    ↓
Checks GitHub releases every 30 min
    ↓
Compares version with latest.json
    ↓
If new version found:
    Show notification banner
    ↓
User clicks "Update"
    ↓
Downloads .dmg file
    ↓
Verifies signature
    ↓
Installs to /Applications
    ↓
Restarts app
    ↓
New version running!
```

---

## ❌ Troubleshooting

### "Update check failed"
- Internet connection issue
- GitHub is rate limiting your IP
- Check browser console for error details

### "Installation failed"
- Insufficient disk space
- App is locked/in use
- Permissions issue with /Applications

### "No update available when I know one exists"
- Manifest not uploaded to GitHub
- Version number doesn't match `latest.json`
- Browser cached old manifest (hard refresh)

### "App won't restart after update"
- Normal - restarts automatically after download
- If it doesn't, restart manually

---

## 🎯 For Windows (When Ready)

The system automatically builds for Windows too:

```bash
npm run tauri:build -- --target all
```

This creates:
- `.dmg` (macOS)
- `.msi` (Windows installer)
- `.exe` (Windows portable)

Just upload all to GitHub and Windows users get the same auto-update!

---

## 📊 Status Check

To see what version is current:

```bash
# Check app version
cat src-tauri/tauri.conf.json | grep version

# Check Cargo.toml version
head -3 src-tauri/Cargo.toml | tail -1
```

Both should match!

---

## 🚨 Important: Path in tauri.conf.json

The `beforeBuildCommand` uses an absolute path:
```json
"beforeBuildCommand": "node /Users/jackfu/TOP/lumina/scripts/bump-tauri-version.mjs && npm run build"
```

**If you move the project, update this path!**

To fix:
1. Open `src-tauri/tauri.conf.json`
2. Find `beforeBuildCommand`
3. Update the path to: `/path/to/your/lumina/scripts/bump-tauri-version.mjs`

---

## ✨ That's It!

Your app is ready for continuous updates.

**Release process:**
```
npm run tauri:build
↓
Upload .dmg + latest.json to GitHub Release
↓
Users auto-update!
```

No complicated versioning. No manual manifest editing. Fully automatic.

**You're done. Ship it! 🚀**
