import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import defaults from '../data/storefrontDefaults.json';

export const storefrontDefaults = defaults;
export function useStorefrontContent() {
  const query = useQuery({
    queryKey: ['storefrontContent'],
    queryFn: async () => {
      const base = import.meta.env.VITE_API_URL || (import.meta.env.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL}/api` : '/api');
      const response = await fetch(`${base.replace(/\/$/, '')}/storefront/content/`);
      if (!response.ok) throw new Error('Website content could not be loaded.');
      return { ...defaults, ...await response.json() };
    },
    placeholderData: defaults,
    staleTime: 60000,
    retry: 1,
  });
  // New editable fields must also exist when the cache contains an older schema.
  const content = useMemo(() => ({ ...defaults, ...query.data }), [query.data]);
  return { ...query, data: content };
}
