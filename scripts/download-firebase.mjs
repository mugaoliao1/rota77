// Baixa os SDKs Firebase compat 9.23.0 para shared/js/vendor/
// Executar uma vez: node scripts/download-firebase.mjs
// Os arquivos são commitados — estáticos, versionados, nunca mudam.

import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VENDOR     = join(__dirname, '..', 'shared', 'js', 'vendor')
const VERSION    = '9.23.0'
const BASE       = `https://www.gstatic.com/firebasejs/${VERSION}`

const FILES = [
  'firebase-app-compat.js',
  'firebase-database-compat.js',
  'firebase-auth-compat.js',
]

mkdirSync(VENDOR, { recursive: true })

for (const file of FILES) {
  const url = `${BASE}/${file}`
  console.log(`Baixando ${url} ...`)
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    writeFileSync(join(VENDOR, file), text, 'utf8')
    console.log(`  ✓ ${file} (${(text.length / 1024).toFixed(0)} KB)`)
  } catch (e) {
    console.error(`  ✗ Falhou: ${e.message}`)
    process.exit(1)
  }
}

console.log('\nFirebase SDKs salvos em shared/js/vendor/')
