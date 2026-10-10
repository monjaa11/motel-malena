import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// "npm run build"      -> prava aplikacija za Netlify (folder dist/)
// "npm run build:preview" -> jedan HTML fajl za pregled tokom izrade (folder dist-preview/)
export default defineConfig(({ mode }) => ({
  plugins: mode === 'preview' ? [react(), viteSingleFile()] : [react()],
  build: mode === 'preview' ? { outDir: 'dist-preview', copyPublicDir: false } : { outDir: 'dist' },
}))
