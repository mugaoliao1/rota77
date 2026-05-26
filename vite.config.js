import { defineConfig } from 'vite'

function copyClassicScripts() {
  return {
    name: 'copy-classic-scripts',
    apply: 'build',
    async closeBundle() {
      const { cp } = await import('fs/promises')
      // Copia apenas o JS — CSS já é processado pelo Vite via <link rel="stylesheet">
      await cp('shared/js', 'dist/shared/js', { recursive: true })
      await cp('tablet/js', 'dist/tablet/js', { recursive: true })
      await cp('portal/js', 'dist/portal/js', { recursive: true })
      await cp('painel/js', 'dist/painel/js', { recursive: true })
    }
  }
}

export default defineConfig({
  root: '.',
  // public/ → copiado para dist/ na raiz (manifest, sw.js, ícones)
  publicDir: 'public',

  plugins: [copyClassicScripts()],

  build: {
    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      input: {
        tablet: 'tablet.html',
        portal: 'portal.html',
        painel: 'painel.html',
      },
    },

    assetsInlineLimit: 0,
  },

  server: {
    port: 3000,
  },

  preview: {
    port: 4173,
  },
})
