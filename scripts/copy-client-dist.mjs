// Builds the React client (client/) and copies its static output into the
// repo-root public/ directory, where Cloudflare Pages' built-in static
// asset handler picks it up automatically (see src/index.tsx's SPA-fallback
// comment for how routing to it works). Run automatically as part of
// `npm run build` at the repo root — this is what Cloudflare Pages' git
// integration invokes on every push to main, so this script is what keeps
// chaposhub.pages.dev in sync with the client/ React app.
import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const clientDir = join(repoRoot, 'client')
const clientDist = join(clientDir, 'dist')
const publicDir = join(repoRoot, 'public')

console.log('[copy-client-dist] Building client/ (React SPA)...')
execSync('npm install && npm run build', { cwd: clientDir, stdio: 'inherit' })

if (!existsSync(clientDist)) {
  throw new Error(`[copy-client-dist] Expected build output at ${clientDist}, but it does not exist.`)
}

console.log('[copy-client-dist] Copying client/dist -> public/ ...')

// Clear out anything from a previous SPA build so stale hashed asset
// filenames never linger (public/static/* — the old server-rendered app's
// legacy assets — is left untouched; only files this script itself writes
// are removed first).
if (existsSync(join(publicDir, 'assets'))) rmSync(join(publicDir, 'assets'), { recursive: true, force: true })
if (existsSync(join(publicDir, 'images'))) rmSync(join(publicDir, 'images'), { recursive: true, force: true })
if (existsSync(join(publicDir, 'index.html'))) rmSync(join(publicDir, 'index.html'))

mkdirSync(publicDir, { recursive: true })

for (const entry of readdirSync(clientDist, { withFileTypes: true })) {
  cpSync(join(clientDist, entry.name), join(publicDir, entry.name), { recursive: true })
}

console.log('[copy-client-dist] Done. public/ now contains:', readdirSync(publicDir).join(', '))
