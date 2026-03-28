# Lumina - Deployment & Continuous Update Guide

## Current Status
- **App Version:** 0.0.6 (auto-increments on each build)
- **Platform:** macOS (arm64/aarch64)
- **Build System:** Tauri 2.5.6 + React 19 + Vite

---

## 📥 Download Current Base Version

**Location:** `/Users/jackfu/TOP/lumina/src-tauri/target/release/bundle/dmg/lumina_0.0.0_aarch64.dmg`

**Installation Steps:**
1. Open the `.dmg` file
2. Drag `Lumina.app` to `/Applications`
3. Launch from Launchpad or Spotlight (`cmd + space` → "Lumina")

---

## 🔄 Version Auto-Increment System (Already Configured)

Every time you build, the version automatically increments:
- **Controlled by:** `/scripts/bump-tauri-version.mjs`
- **Updates:** `src-tauri/tauri.conf.json` + `src-tauri/Cargo.toml`
- **Pattern:** `0.0.X` → `0.0.X+1`
- **Trigger:** Runs before every `npm run tauri build`

---

## 🚀 Continuous Update Strategies

### Option 1: Tauri Built-in Updater (Recommended for Production)

**Setup:**
1. Enable updater in `src-tauri/tauri.conf.json`:
```json
{
  "updater": {
    "active": true,
    "endpoints": [
      "https://your-server.com/updates/{{target}}/{{current_version}}"
    ],
    "dialog": true,
    "pubkey": "YOUR_PUBLIC_KEY"
  }
}
```

2. Generate signing keys:
```bash
npm run tauri signer generate
```

3. For each release:
   - Build: `npm run tauri build`
   - Create `latest.json` manifest (use `update_models.js` in repo)
   - Upload `.dmg` + `latest.json` to your update server

**Users get auto-update prompts** ✅

---

### Option 2: GitHub Releases (Free, Simple)

1. Use GitHub repository for storage
2. Tag each release: `git tag v0.0.6 && git push --tags`
3. Upload `.dmg` to GitHub Releases
4. Use GitHub API as update endpoint

**Minimal setup, no server needed** ✅

---

### Option 3: Manual Distribution (Current)

- Users download `.dmg` from your website
- Host on Dropbox, AWS S3, or file server
- Users manually install new version

**No update system needed** ✅

---

## 📋 Release Workflow

### For Each New Release:

```bash
# 1. Make code changes
# 2. Commit
git add .
git commit -m "Feature: Add X"

# 3. Build (auto-versions everything)
npm run tauri build

# 4. Output file location:
# /Users/jackfu/TOP/lumina/src-tauri/target/release/bundle/dmg/lumina_0.0.X_aarch64.dmg

# 5. Upload to your distribution method:
# - GitHub Releases
# - Your server
# - S3 bucket
# - Dropbox public link

# 6. Update your website/app store with new download link
```

---

## 🖥️ Windows Support (When Ready)

Add to `package.json` scripts:
```bash
"build:all": "npm run tauri build -- --target all"
```

This creates:
- `.dmg` (macOS)
- `.msi` + `.exe` (Windows)
- `.app.tar.gz` (Linux if needed)

---

## 🔐 Code Signing for macOS

To distribute outside the App Store:
```bash
npm run tauri build -- --sign-with-path=/path/to/certificate.p12 --sign-with-password=PASSWORD
```

---

## 📊 Version Bump Details

The auto-bump script reads current version and increments:
- **reads:** `0.0.5`
- **increments patch:** `0.0.5` → `0.0.6`
- **updates both files** in sync
- **logs:** "Bumped app version: 0.0.5 -> 0.0.6"

No manual intervention needed!

---

## 🎯 Recommended Setup for Production

```
1. Set up GitHub Releases (free)
2. Use Tauri's built-in updater with GitHub API endpoint
3. Users auto-notified when new version available
4. Click "Update Now" → auto-reinstalls
5. No server maintenance needed
```

---

## 📱 Dev Workflow Going Forward

```bash
# Daily development
npm run tauri dev

# When ready to release
npm run tauri build
# (automatically bumps version)
# upload the .dmg file
# users get notified of new version
```

---

## 🐛 Troubleshooting

**Q: "Build failed with beforeBuildCommand"**
- Ensure `pump-tauri-version.mjs` path is absolute in `tauri.conf.json`
- Current: `/Users/jackfu/TOP/lumina/scripts/bump-tauri-version.mjs`

**Q: "DMG file is old version"**
- Clear: `src-tauri/target/release/`
- Rebuild: `npm run tauri build`

**Q: "Users don't get update notifications"**
- Ensure updater is enabled in `tauri.conf.json`
- Check endpoint URL is accessible
- Verify `latest.json` manifest is correct format

---

**Next Steps:**
1. Download current `.dmg` from above location
2. Choose update strategy (GitHub Releases recommended)
3. Set up `src-tauri/tauri.conf.json` for auto-updates
4. Ready for continuous releases!
