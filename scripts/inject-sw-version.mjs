import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const swPath = join(__dirname, '..', 'dist', 'sw.js')
const version = Date.now().toString(36)
const content = readFileSync(swPath, 'utf8')
const replaced = content.replace('__BUILD_VERSION__', version)
writeFileSync(swPath, replaced)
console.log('[sw] versão injetada:', version)
