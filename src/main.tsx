import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { StealthModeProvider } from './context/StealthModeContext';

// Global error tracker for mobile debugging
window.addEventListener('error', function(event) {
  alert("Erro Global capturado: " + event.message + "\nNo arquivo: " + event.filename + "\nNa linha: " + event.lineno);
});

window.addEventListener('unhandledrejection', function(event) {
  alert("Promise Rejection capturada: " + (event.reason ? event.reason.stack || event.reason.message : "Erro desconhecido"));
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StealthModeProvider>
      <App />
    </StealthModeProvider>
  </StrictMode>,
);

