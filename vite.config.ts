import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Para GitHub Pages em https://<usuario>.github.io/<repo>/ o base precisa ser /<repo>/.
// Pode ser sobrescrito com VITE_BASE (o workflow do GitHub Actions faz isso automaticamente).
const base = process.env.VITE_BASE ?? '/treino/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Treino',
        short_name: 'Treino',
        description: 'Treino, alimentação, rotina e progresso. Tudo fica no seu aparelho.',
        lang: 'pt-BR',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#09090b',
        theme_color: '#09090b',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
});
