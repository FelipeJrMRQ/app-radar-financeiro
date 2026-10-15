import { bootstrapApplication } from '@angular/platform-browser';
import { isDevMode } from '@angular/core';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .then(() => {
    // O dev-server mantém a compilação em tempo real sem interferência do cache.
    // O PWA instalado em produção usa SW com cache exclusivo de arquivos estáticos.
    if (!isDevMode() && 'serviceWorker' in navigator) {
      const registrar = () => {
        void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
          // Sem Service Worker, a aplicação continua funcionando online normalmente.
        });
      };
      if (document.readyState === 'complete') registrar();
      else window.addEventListener('load', registrar, { once: true });
    }
  })
  .catch((err) => console.error(err));
