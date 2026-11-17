import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { applyTheme, getTheme, requestPersistence } from './lib/device';
import './index.css';

applyTheme(getTheme());
// Pede ao navegador para não apagar os dados locais (o Safari apaga sites pouco usados).
void requestPersistence();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
