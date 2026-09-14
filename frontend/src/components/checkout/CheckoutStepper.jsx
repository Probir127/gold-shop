import React from 'react';
import { motion } from 'framer-motion';
import { Check, ShoppingBag, Truck, CreditCard, CheckCircle } from 'lucide-react';

const steps = [
    { id: 1, label: 'Cart', icon: ShoppingBag },
    { id: 2, label: 'Shipping', icon: Truck },
    { id: 3, label: 'Payment', icon: CreditCard },
    { id: 4, label: 'Confirm', icon: CheckCircle },
];

const CheckoutStepper = ({ currentStep }) => {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: '800px',
            margin: '0 auto 50px auto',
            position: 'relative'
        }}>
            {/* Progress Bar Background */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                width: '100%',
                height: '2px',
                backgroundColor: '#333',
                zIndex: 0,
                transform: 'translateY(-50%)'
            }}></div>

            {/* Active Progress Bar */}
            <motion.div
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    height: '2px',
                    backgroundColor: 'var(--color-gold-primary)',
                    zIndex: 0,
                    transform: 'translateY(-50%)'
                }}
                initial={{ width: '0%' }}
                animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
            />

            {steps.map((step) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                const Icon = step.icon;

                return (
                    <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 1 }}>
                        <motion.div
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: isActive || isCompleted ? '2px solid var(--color-gold-primary)' : '2px solid #333',
                                backgroundColor: isCompleted ? 'var(--color-gold-primary)' : '#111',
                                color: isCompleted ? '#000' : (isActive ? 'var(--color-gold-primary)' : '#555')
                            }}
                            initial={false}
                            animate={{
                                scale: isActive ? 1.2 : 1,
                                backgroundColor: isCompleted ? '#d4af37' : '#111',
                                borderColor: isActive || isCompleted ? '#d4af37' : '#333'
                            }}
                            transition={{ duration: 0.3 }}
                        >
                            {isCompleted ? <Check size={18} color="#000" /> : <Icon size={18} />}
                        </motion.div>
                        <span style={{
                            fontSize: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            fontWeight: '600',
                            color: isActive || isCompleted ? 'var(--color-gold-primary)' : '#666'
                        }}>
                            {step.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export default CheckoutStepper;
