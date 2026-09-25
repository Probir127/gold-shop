import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export const useProducts = (category) => {
    return useQuery({
        queryKey: ['products', category],
        queryFn: () => api.getProducts(category),
    });
};

export const useCategories = () => {
    return useQuery({
        queryKey: ['categories'],
        queryFn: api.getCategories,
    });
};

export const useProduct = (id) => {
    return useQuery({
        queryKey: ['product', id],
        queryFn: () => api.getProduct(id),
        enabled: !!id,
    });
};

export const useGoldRates = () => {
    return useQuery({
        queryKey: ['goldRates'],
        queryFn: api.getLatestRates,
        refetchInterval: 5 * 60 * 1000,
        refetchOnWindowFocus: true,
    });
};

// Separate hook for live international market data — non-blocking
// Loads after stored rates are already displayed
export const useLiveMarketRates = () => {
    return useQuery({
        queryKey: ['liveMarketRates'],
        queryFn: api.getLiveMarketRates,
        refetchInterval: 2 * 60 * 1000, // Refresh every 2 min
        retry: 1,
        // Never throw — just return undefined if unavailable
        throwOnError: false,
    });
};

export const useGoldRateHistory = () => {
    return useQuery({
        queryKey: ['goldRateHistory'],
        queryFn: api.getGoldRatesHistory,
    });
};

