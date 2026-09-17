import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export const useProducts = (category) => {
    return useQuery({
        queryKey: ['products', category],
        queryFn: () => api.getProducts(category),
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

export const useGoldRateHistory = () => {
    return useQuery({
        queryKey: ['goldRateHistory'],
        queryFn: api.getGoldRatesHistory,
    });
};
