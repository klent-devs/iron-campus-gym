import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename="/m">
      <App />
    </BrowserRouter>
  </StrictMode>,
);

// Installable app that still opens without internet (the QR code works at the door).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () =>
    navigator.serviceWorker.register('/m/sw.js').catch(() => {}),
  );
}
