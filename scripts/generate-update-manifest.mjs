#!/usr/bin/env node
/**
 * Generate latest.json manifest for Tauri updater
 * Run after building: node scripts/generate-update-manifest.mjs
 * 
 * This creates the manifest file that the updater checks for new versions.
 * Upload both the .dmg and latest.json to your GitHub releases.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const tauriConfPath = path.join(root, 'src-tauri', 'tauri.conf.json')
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'))
const version = tauriConf.version

// Look for the built .dmg file
const bundleDir = path.join(root, 'src-tauri', 'target', 'release', 'bundle', 'dmg')
const dmgFiles = fs.readdirSync(bundleDir).filter((f) => f.endsWith('.dmg') && !f.startsWith('rw.'))
const dmgFile = dmgFiles[dmgFiles.length - 1] // Get the most recent

if (!dmgFile) {
  console.error('❌ No .dmg file found in bundle/dmg/')
  console.error('Run: npm run tauri build')
  process.exit(1)
}

const dmgPath = path.join(bundleDir, dmgFile)
const dmgSize = fs.statSync(dmgPath).size

// Calculate SHA256 of the .dmg
const fileBuffer = fs.readFileSync(dmgPath)
const hashSum = crypto.createHash('sha256')
hashSum.update(fileBuffer)
const signature = hashSum.digest('hex')

// Create the manifest
const manifest = {
  version,
  pub_date: new Date().toISOString(),
  url: `https://github.com/rommel-exe/lumina/releases/download/v${version}/lumina_${version}_aarch64.dmg`,
  signature,
  notes: `Released on ${new Date().toLocaleDateString()}`,
}

// Write the manifest
const manifestPath = path.join(bundleDir, 'latest.json')
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')

console.log(`✅ Update manifest generated: latest.json`)
console.log(`   Version: ${version}`)
console.log(`   DMG: ${dmgFile} (${(dmgSize / 1024 / 1024).toFixed(1)}MB)`)
console.log(`   SHA256: ${signature}`)
console.log('')
console.log('📤 Next steps:')
console.log('   1. Go to https://github.com/rommel-exe/lumina/releases')
console.log('   2. Create a new release tagged: v' + version)
console.log('   3. Upload:')
console.log('      - ' + dmgFile)
console.log('      - latest.json')
console.log('   4. Users will auto-update! 🎉')
