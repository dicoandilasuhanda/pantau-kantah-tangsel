import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Plugin khusus kompatibilitas iOS WebKit (Safari & Chrome di iPhone):
 * 1. Mengubah <script type="module" crossorigin> dan <link rel="stylesheet" crossorigin>
 *    menjadi <script defer> dan <link rel="stylesheet"> tanpa atribut crossorigin/module,
 *    sehingga WebKit memuat bundel dalam mode 'no-cors' (sama seperti recovery.js)
 *    dan tidak memblokir eksekusi akibat header Access-Control-Allow-Origin.
 * 2. Membungkus bundel utama dalam IIFE ketat dan mengganti referensi import.meta
 *    agar 100% valid sebagai classic script.
 * 3. Menambahkan cache-buster ?v=<timestamp> pada /recovery.js agar tidak terjebak cache Cloudflare/iOS.
 */
function iosWebKitCompatibilityPlugin() {
  return {
    name: 'ios-webkit-compatibility',
    apply: 'build',
    closeBundle() {
      const distDir = path.resolve(import.meta.dirname, 'dist')
      const indexHtmlPath = path.join(distDir, 'index.html')
      const assetsDir = path.join(distDir, 'assets')

      if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir)
        for (const file of files) {
          if (file.startsWith('index-') && file.endsWith('.js')) {
            const filePath = path.join(assetsDir, file)
            let code = fs.readFileSync(filePath, 'utf8')
            code = code
              .replace(/import\.meta\.resolve/g, 'undefined')
              .replace(/import\.meta\.url/g, 'window.location.href')
            if (!code.startsWith('(function(){"use strict";')) {
              code = `(function(){"use strict";window.__BUNDLE_EXECUTING__=true;\n${code}\n})();\n`
            }
            fs.writeFileSync(filePath, code, 'utf8')
          }
        }
      }

      if (fs.existsSync(indexHtmlPath)) {
        const versionTag = Date.now()
        let html = fs.readFileSync(indexHtmlPath, 'utf8')
        html = html
          .replace(
            /<script\s+src="\/recovery\.js(?:\?[^"]*)?"\s*><\/script>/g,
            `<script src="/recovery.js?v=${versionTag}"></script>`
          )
          .replace(
            /<script\s+type="module"\s+crossorigin\s+src="([^"]+)"\s*><\/script>/g,
            `<script defer src="$1?v=${versionTag}"></script>`
          )
          .replace(
            /<link\s+rel="stylesheet"\s+crossorigin\s+href="([^"]+)"\s*\/?>/g,
            `<link rel="stylesheet" href="$1?v=${versionTag}">`
          )
        fs.writeFileSync(indexHtmlPath, html, 'utf8')
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), iosWebKitCompatibilityPlugin()],
  build: {
    target: ['es2018', 'safari13', 'ios13']
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
