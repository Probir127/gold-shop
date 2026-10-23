import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
export function usePaymentConfiguration() {
  return useQuery({queryKey:['paymentConfiguration'], queryFn:api.getPaymentConfiguration, staleTime:0, refetchOnWindowFocus:true});
}
