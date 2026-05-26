// scripts/pwa-inject.mjs — injeta tags PWA nos HTML do MídiaCar
// Uso: node scripts/pwa-inject.mjs

import { readFileSync, writeFileSync } from 'node:fs'

function inject(file, title, manifestFile, orientation) {
  let html = readFileSync(file, 'utf-8')

  const meta = [
    `  <meta name="theme-color" content="#D7282B">`,
    `  <meta name="mobile-web-app-capable" content="yes">`,
    `  <meta name="apple-mobile-web-app-capable" content="yes">`,
    `  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`,
    `  <meta name="apple-mobile-web-app-title" content="MídiaCar">`,
    `  <link rel="manifest" href="/${manifestFile}">`,
    `  <link rel="apple-touch-icon" href="/icons/icon-192.png">`,
  ].join('\n')

  const sw = [
    `  <script>`,
    `    if ('serviceWorker' in navigator) {`,
    `      window.addEventListener('load', () => {`,
    `        navigator.serviceWorker.register('/sw.js')`,
    `      })`,
    `    }`,
    `  </script>`,
  ].join('\n')

  // Insere meta tags após o <title>
  if (!html.includes(title)) {
    console.error(`ERRO: <title> não encontrado em ${file}`)
    process.exit(1)
  }
  html = html.replace(title, `${title}\n${meta}`)

  // Insere registro do SW antes do último </body>
  const idx = html.lastIndexOf('</body>')
  if (idx === -1) {
    console.error(`ERRO: </body> não encontrado em ${file}`)
    process.exit(1)
  }
  html = html.slice(0, idx) + sw + '\n' + html.slice(idx)

  writeFileSync(file, html, 'utf-8')
  console.log(`✓ ${file}`)
}

inject('tablet.html', '<title>MídiaCar — Tablet</title>',             'manifest-tablet.json')
inject('portal.html', '<title>MídiaCar — Portal do Anunciante</title>', 'manifest-portal.json')
inject('painel.html', '<title>MídiaCar — Painel de Gestão</title>', 'manifest-painel.json')

console.log('\nTags PWA injetadas com sucesso.')
