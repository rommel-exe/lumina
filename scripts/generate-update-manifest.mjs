#!/usr/bin/env node

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const scriptPath = path.join(__dirname, 'generate-latest-json.mjs')
const result = spawnSync(process.execPath, [scriptPath], { stdio: 'inherit' })

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
