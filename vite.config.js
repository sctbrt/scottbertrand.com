import { defineConfig } from 'vite'
import { resolve } from 'path'
import { imagetools } from 'vite-imagetools'

export default defineConfig({
  plugins: [imagetools()],
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        approach: resolve(__dirname, 'approach.html'),
        focus: resolve(__dirname, 'focus.html'),
        contact: resolve(__dirname, 'contact.html'),
        fieldNotes: resolve(__dirname, 'field-notes.html'),
        fieldNote: resolve(__dirname, 'field-note.html'),
      },
    },
  },
  server: {
    port: 8000,
    open: true,
  },
})
