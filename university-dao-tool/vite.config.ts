import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  // 5173 belongs to Project.App; this tool sits beside it, not on top of it.
  server: { port: 5174, strictPort: true },
})
