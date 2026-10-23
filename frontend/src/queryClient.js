import { QueryClient } from '@tanstack/react-query';
import { createStorefrontSync } from './services/storefrontSync.js';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      refetchInterval: false,
    },
  },
});

export const storefrontSync = createStorefrontSync(queryClient, typeof window === 'undefined' ? null : window);
if (import.meta.hot) import.meta.hot.dispose(() => storefrontSync.dispose());
