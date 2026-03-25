import { spawnSync } from 'node:child_process'
import path from 'node:path'

const args = process.argv.slice(2)
const result = spawnSync('tauri', args, { stdio: 'inherit' })

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
