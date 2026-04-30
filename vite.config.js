import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
        faq: resolve(__dirname, 'public/pages/faq.html'),
        ajuda: resolve(__dirname, 'public/pages/ajuda.html'),
        bug: resolve(__dirname, 'public/pages/bug.html'),
        contato: resolve(__dirname, 'public/pages/contato.html'),
        anuncie: resolve(__dirname, 'public/pages/anuncie.html'),
        termos: resolve(__dirname, 'public/pages/termos.html'),
        privacidade: resolve(__dirname, 'public/pages/privacidade.html'),
        cookies: resolve(__dirname, 'public/pages/cookies.html'),
        trabalhe: resolve(__dirname, 'public/pages/trabalhe.html')
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
