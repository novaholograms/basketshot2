import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';

// DEBUG: global crash capture
window.addEventListener("error", (e) => {
  console.error("[GLOBAL_ERROR]", {
    message: e.message,
    filename: e.filename,
    lineno: e.lineno,
    colno: e.colno,
    error: (e as any).error?.stack ?? (e as any).error ?? null,
    ts: new Date().toISOString(),
  });
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("[GLOBAL_REJECTION]", {
    reason: (e as any).reason?.stack ?? (e as any).reason ?? null,
    ts: new Date().toISOString(),
  });
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);