import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const tauriConfigPath = path.join(root, 'src-tauri', 'tauri.conf.json')
const cargoTomlPath = path.join(root, 'src-tauri', 'Cargo.toml')

const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'))
const currentVersion = String(tauriConfig.version || '0.0.0')

const semverMatch = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)$/)
if (!semverMatch) {
  throw new Error(`Unsupported version format: ${currentVersion}. Expected MAJOR.MINOR.PATCH`)
}

const currentPatch = Number(semverMatch[3])
if (!Number.isFinite(currentPatch)) {
  throw new Error(`Invalid patch version: ${semverMatch[3]}`)
}

const nextVersion = `0.0.${currentPatch + 1}`

// Keep major/minor pinned at 0.0 and auto-iterate patch each build.
tauriConfig.version = nextVersion
fs.writeFileSync(tauriConfigPath, `${JSON.stringify(tauriConfig, null, 2)}\n`, 'utf8')

const cargoToml = fs.readFileSync(cargoTomlPath, 'utf8')
const packageVersionPattern = /(\[package\][\s\S]*?\nversion\s*=\s*")([^"]+)(")/m

if (!packageVersionPattern.test(cargoToml)) {
  throw new Error('Could not find [package] version in Cargo.toml')
}

const updatedCargoToml = cargoToml.replace(packageVersionPattern, `$1${nextVersion}$3`)
fs.writeFileSync(cargoTomlPath, updatedCargoToml, 'utf8')

console.log(`Bumped app version: ${currentVersion} -> ${nextVersion}`)
