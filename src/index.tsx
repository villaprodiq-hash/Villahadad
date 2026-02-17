import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import './index.css';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// Lazy loading REMOVED for debugging
import App from './App';
// const App = lazy(() => import('./App'));

// Create React Query client with Aggressive Caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 Minutes (Data stays fresh)
      gcTime: 1000 * 60 * 30,   // 30 Minutes (Keep in memory)
      retry: 1,
      refetchOnWindowFocus: false, // Don't refetch on tab switch (reduces load)
    },
  },
});

// Create Persister (LocalStorage)
const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const isElectronRuntime =
  typeof window !== 'undefined' &&
  typeof (window as Window & { electronAPI?: unknown }).electronAPI !== 'undefined';

document.documentElement.classList.remove('runtime-electron', 'runtime-web');
document.documentElement.classList.add(isElectronRuntime ? 'runtime-electron' : 'runtime-web');

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <PersistQueryClientProvider 
      client={queryClient} 
      persistOptions={{ persister }}
    >
      <Toaster 
        position="top-center"
        richColors
        closeButton
        dir="rtl"
        theme="dark"
        offset={90}
      />
      <App />
    </PersistQueryClientProvider>
  </React.StrictMode>
);
