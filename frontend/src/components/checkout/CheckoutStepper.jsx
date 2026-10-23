import React from 'react';
import { Check } from 'lucide-react';
const steps = ['Bag', 'Delivery', 'Payment', 'Confirmation'];
export default function CheckoutStepper({ currentStep }) {
    return <ol className="maison-checkout-steps" aria-label="Checkout progress">{steps.map((label,index) => <li key={label} aria-current={currentStep === index + 1 ? 'step' : undefined} className={index + 1 <= currentStep ? 'reached' : ''}><span>{index + 1 < currentStep ? <Check size={14}/> : `0${index + 1}`}</span>{label}</li>)}</ol>;
}
