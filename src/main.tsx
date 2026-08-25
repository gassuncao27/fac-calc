import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { requestPersistentStorage } from './utils/storage';
import './index.css';

// Atualização automática do Service Worker: novas versões são aplicadas
// silenciosamente no próximo carregamento; offline continua funcionando.
registerSW({ immediate: true });

// Pede ao navegador para não descartar os dados locais (essencial no iOS,
// onde dados de sites não instalados podem ser limpos após ~7 dias).
void requestPersistentStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
