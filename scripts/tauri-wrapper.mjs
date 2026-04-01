import { spawnSync } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'

const args = process.argv.slice(2)
const env = { ...process.env }

if (args[0] === 'build') {
  const bumpScriptPath = path.join(process.cwd(), 'scripts', 'bump-tauri-version.mjs')
  const bump = spawnSync(process.execPath, [bumpScriptPath], { stdio: 'inherit' })
  if (bump.status !== 0) {
    process.exit(bump.status ?? 1)
  }
}

if (args[0] === 'build' && !env.TAURI_SIGNING_PRIVATE_KEY) {
  const localKeyPath = path.join(process.cwd(), 'src-tauri', '.tauri', 'updater.key')
  if (fs.existsSync(localKeyPath)) {
    env.TAURI_SIGNING_PRIVATE_KEY = fs.readFileSync(localKeyPath, 'utf8').trim()
    console.log(`Loaded TAURI_SIGNING_PRIVATE_KEY from ${localKeyPath}`)

    if (env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD === undefined) {
      // Default to empty passphrase to avoid interactive build prompts.
      env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ''
    }
  }
}

const result = spawnSync('tauri', args, { stdio: 'inherit', env })

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

if (args[0] !== 'build') {
  process.exit(0)
}

const generatorPath = path.join(process.cwd(), 'scripts', 'generate-latest-json.mjs')
const gen = spawnSync(process.execPath, [generatorPath], { stdio: 'inherit' })

if (gen.status !== 0) {
  process.exit(gen.status ?? 1)
}
