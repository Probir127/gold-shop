import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, Star } from 'lucide-react';

const testimonials = [
    {
        name: "Farhana Ahmed",
        role: "Bridal Customer",
        text: "The craftsmanship at Sahara Gold is unparalleled. They created a custom wedding set for me that exceeded all expectations. The detail and purity are truly world-class.",
        rating: 5
    },
    {
        name: "Imran Hossain",
        role: "Collector",
        text: "I've been a regular customer for years. Their commitment to transparency and the quality of their diamond collection is what keeps me coming back. Highly recommended!",
        rating: 5
    },
    {
        name: "Sadia Islam",
        role: "Gift Buyer",
        text: "Found the perfect anniversary gift here. The staff was incredibly helpful and the packaging was as luxurious as the jewelry itself. A truly premium experience.",
        rating: 5
    }
];

const TestimonialSlider = () => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % testimonials.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <section style={{ backgroundColor: '#050505', padding: '120px 0', borderTop: '1px solid #111' }}>
            <div className="container">
                <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px', color: 'var(--color-gold-primary)' }}>
                        <Quote size={48} />
                    </div>

                    <div style={{ position: 'relative', height: '300px' }}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.6 }}
                                style={{ position: 'absolute', width: '100%' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '20px', color: '#facc15' }}>
                                    {[...Array(testimonials[index].rating)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
                                </div>
                                <p style={{ fontSize: '1.5rem', color: '#fff', fontStyle: 'italic', lineHeight: '1.6', marginBottom: '30px' }}>
                                    "{testimonials[index].text}"
                                </p>
                                <h4 style={{ fontSize: '1.1rem', color: 'var(--color-gold-primary)', fontWeight: 'bold', marginBottom: '4px' }}>
                                    {testimonials[index].name}
                                </h4>
                                <span style={{ fontSize: '0.875rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    {testimonials[index].role}
                                </span>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Dots */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '40px' }}>
                        {testimonials.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setIndex(i)}
                                style={{
                                    width: i === index ? '30px' : '8px',
                                    height: '8px',
                                    borderRadius: '4px',
                                    backgroundColor: i === index ? 'var(--color-gold-primary)' : '#333',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TestimonialSlider;
