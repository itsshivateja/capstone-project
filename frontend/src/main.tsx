import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const migrateStorageKeys = (storage: Storage): void => {
  const legacyPrefix = 'devmind_';

  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const oldKey = storage.key(index);
    if (!oldKey?.startsWith(legacyPrefix)) continue;

    const value = storage.getItem(oldKey);
    const newKey = `auron_ai_${oldKey.slice(legacyPrefix.length)}`;
    if (value !== null && storage.getItem(newKey) === null) {
      storage.setItem(newKey, value);
    }
    storage.removeItem(oldKey);
  }
};

migrateStorageKeys(window.localStorage);
migrateStorageKeys(window.sessionStorage);
document.documentElement.dataset.theme = 'dark';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
