import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const SUPABASE = 'ojmkekoxupjebwixhgil.supabase.co'

// GitHub Pages can't send headers, so the CSP ships as a meta tag. Build only: Vite's dev server needs inline scripts.
const csp = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data:",
  `connect-src https://${SUPABASE} wss://${SUPABASE}`,
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
].join('; ')

export default defineConfig({
  base: '/fsd-workspace/',
  // Ship every asset as a file: the CSP allows fonts and images from 'self', not data: URLs.
  build: { assetsInlineLimit: 0 },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'csp',
      apply: 'build',
      transformIndexHtml: (html) =>
        html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}">`),
    },
  ],
})
