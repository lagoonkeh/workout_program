import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Allow full rotation on mobile devices
if (typeof window !== 'undefined' && typeof screen !== 'undefined' && screen.orientation && typeof (screen.orientation as any).unlock === 'function') {
  try {
    (screen.orientation as any).unlock();
  } catch {
    // Graceful no-op if unsupported or restricted
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
