/**
 * Application Entry Point
 * STORY-017A: Layout & Grid-System
 *
 * Main entry point for the React application.
 */

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/globals.css';

// Initialize i18n before rendering the app
import './i18n';

// Loading fallback component
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '1.5rem',
    color: '#666',
  }}>
    Loading...
  </div>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<LoadingFallback />}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Suspense>
  </React.StrictMode>,
);
