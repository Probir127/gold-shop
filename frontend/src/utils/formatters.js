import { APP_CONFIG } from './constants';

export const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-BD', APP_CONFIG.currencyParams).format(amount);
};

export const calculateProductPrice = (weight, purity, rates, makingCharge = 0) => {
    const goldRate = rates?.[purity] ?? rates?.traditional;
    if (!goldRate || Number(weight) <= 0) return null;
    return Math.round((Number(weight) * goldRate) + (Number(weight) * Number(makingCharge)));
};
