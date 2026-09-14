import { APP_CONFIG } from './constants';

export const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-BD', APP_CONFIG.currencyParams).format(amount);
};

export const calculateProductPrice = (weight, purity, makingCharge = 0) => {
    // Circular dependency avoidance: pass rates or import
    // Simple version
    return 0; // Placeholder
};
