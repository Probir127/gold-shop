import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 30 * 1000, // 30 seconds fresh data
      refetchInterval: 60 * 1000, // Background refresh every 60s
    },
  },
});
