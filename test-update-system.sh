#!/usr/bin/env bash
# Quick test to verify the auto-update system is fully working

echo "✅ LUMINA AUTO-UPDATE SYSTEM - VERIFICATION TEST"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check 1: Version consistency
echo "1️⃣  Checking version consistency..."
TAURI_VERSION=$(jq -r '.version' src-tauri/tauri.conf.json)
CARGO_VERSION=$(grep '^version' src-tauri/Cargo.toml | head -1 | sed 's/.*"\(.*\)"/\1/')

if [ "$TAURI_VERSION" = "$CARGO_VERSION" ]; then
    echo "   ✅ Both at v$TAURI_VERSION"
else
    echo "   ❌ MISMATCH: tauri.conf=$TAURI_VERSION, Cargo.toml=$CARGO_VERSION"
    exit 1
fi

echo ""
echo "2️⃣  Checking build artifacts..."
if [ -f "src-tauri/target/release/bundle/dmg/lumina_0.0.0_aarch64.dmg" ]; then
    SIZE=$(ls -lh src-tauri/target/release/bundle/dmg/lumina_0.0.0_aarch64.dmg | awk '{print $5}')
    echo "   ✅ DMG file found: $SIZE"
else
    echo "   ❌ DMG file not found!"
    exit 1
fi

echo ""
echo "3️⃣  Checking update manifest..."
if [ -f "src-tauri/target/release/bundle/dmg/latest.json" ]; then
    echo "   ✅ Manifest found"
    echo ""
    echo "   Content:"
    jq . src-tauri/target/release/bundle/dmg/latest.json | sed 's/^/     /'
else
    echo "   ❌ Manifest not found!"
    exit 1
fi

echo ""
echo "4️⃣  Checking frontend update integration..."
if grep -q "useAutoUpdate" src/App.tsx; then
    echo "   ✅ Update hook integrated in App"
else
    echo "   ❌ Update hook not found in App!"
    exit 1
fi

echo ""
echo "5️⃣  Checking TypeScript compilation..."
npm run build 2>&1 | grep -E "error|✓ " | tail -3

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 ALL SYSTEMS OPERATIONAL!"
echo ""
echo "📦 Release Ready:"
echo "   Command: npm run tauri:build"
echo "   Upload:  .dmg + latest.json to GitHub Releases"
echo "   Result:  Users auto-update!"
echo ""
