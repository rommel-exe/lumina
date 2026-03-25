import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const root = process.cwd()
const bundleDir = path.join(root, 'src-tauri', 'target', 'release', 'bundle')
const macosDir = path.join(bundleDir, 'macos')

const tauriConfigPath = path.join(root, 'src-tauri', 'tauri.conf.json')
const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'))
const version = String(tauriConfig.version || '0.0.0')

const tarballName = fs
  .readdirSync(macosDir)
  .find((entry) => entry.endsWith('.app.tar.gz') && !entry.endsWith('.sig'))

if (!tarballName) {
  throw new Error(`Could not find updater tarball in ${macosDir}`)
}

const tarballPath = path.join(macosDir, tarballName)
const signaturePath = `${tarballPath}.sig`

if (!fs.existsSync(signaturePath)) {
  throw new Error(`Could not find updater signature file: ${signaturePath}`)
}

const signature = fs.readFileSync(signaturePath, 'utf8').trim()

const platformByArch = {
  arm64: 'darwin-aarch64',
  x64: 'darwin-x86_64',
}

const target = process.env.UPDATE_TARGET || platformByArch[process.arch] || 'darwin-aarch64'

const releaseTag = process.env.RELEASE_TAG || `v${version}`

const gitRemote = execSync('git remote get-url origin', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] })
  .toString()
  .trim()

const githubMatch = gitRemote.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?$/i)
const owner = process.env.GITHUB_OWNER || githubMatch?.[1]
const repo = process.env.GITHUB_REPO || githubMatch?.[2]

if (!owner || !repo) {
  throw new Error('Could not infer GitHub owner/repo from origin remote. Set GITHUB_OWNER and GITHUB_REPO.')
}

const url = process.env.UPDATE_ASSET_URL || `https://github.com/${owner}/${repo}/releases/download/${releaseTag}/${tarballName}`

const latest = {
  version,
  notes: process.env.UPDATE_NOTES || `Release ${version}`,
  pub_date: new Date().toISOString(),
  platforms: {
    [target]: {
      signature,
      url,
    },
  },
}

const outputPath = process.env.LATEST_JSON_OUTPUT || path.join(bundleDir, 'latest.json')
fs.writeFileSync(outputPath, `${JSON.stringify(latest, null, 2)}\n`, 'utf8')

console.log(`Generated latest.json at ${outputPath}`)
console.log(`Target: ${target}`)
console.log(`Asset URL: ${url}`)
