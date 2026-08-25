/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Base relativa: o app funciona tanto na raiz de um domínio quanto em
  // subpasta (GitHub Pages: usuario.github.io/nome-do-repo/), sem reconfigurar.
  base: './',
  // Alvos conservadores: o app precisa rodar em iPads antigos (Safari 14+),
  // não só em navegadores recentes. Vale para JS e CSS.
  build: {
    target: ['es2020', 'safari14'],
    cssTarget: ['safari14'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'FactorCalc',
        short_name: 'FactorCalc',
        description: 'Cálculo de operações de factoring — duplicatas, cheques e recebíveis.',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        scope: './',
        lang: 'pt-BR',
        background_color: '#FAFAF9',
        theme_color: '#FAFAF9',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
