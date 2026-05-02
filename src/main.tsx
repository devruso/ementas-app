import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from './App';
import './styles.css';

const cleanupLegacyServiceWorkers = async () => {
  const cleanupFlag = 'bdcp:legacy-sw-cleanup-v2';
  const legacyTokenKey = 'MATE85/token';
  const currentTokenKey = 'BDCP/token';

  // Always remove known token keys to avoid replaying stale auth state.
  window.localStorage.removeItem(legacyTokenKey);
  window.localStorage.removeItem(currentTokenKey);

  if (window.localStorage.getItem(cleanupFlag) === 'done') {
    return;
  }

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ('caches' in window) {
    const cacheKeys = await window.caches.keys();
    await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
  }

  window.localStorage.setItem(cleanupFlag, 'done');
};

void cleanupLegacyServiceWorkers();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);