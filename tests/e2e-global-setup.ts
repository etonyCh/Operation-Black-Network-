import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { resolve } from 'path'

export default async function globalSetup() {
  const mainOut = resolve(__dirname, '../out/main/index.js')
  if (!existsSync(mainOut)) {
    console.log('[E2E Setup] Building app...')
    execSync('npm run build', {
      cwd: resolve(__dirname, '..'),
      stdio: 'inherit'
    })
  }
}
