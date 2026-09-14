import React from 'react';
import { motion } from 'framer-motion';
import { Instagram, Heart, MessageCircle } from 'lucide-react';

const instagramPosts = [
    { id: 1, image: '/assets/images/2.jpg.jpeg', likes: '1.2k', comments: '45' },
    { id: 2, image: '/assets/images/3.jpg.jpeg', likes: '890', comments: '12' },
    { id: 3, image: '/assets/images/4.jpg.jpeg', likes: '2.1k', comments: '89' },
    { id: 4, image: '/assets/images/5.jpg.jpeg', likes: '1.5k', comments: '34' },
    { id: 5, image: '/assets/images/6.jpg.jpeg', likes: '940', comments: '21' },
    { id: 6, image: '/assets/images/7.jpg.jpeg', likes: '1.1k', comments: '28' },
];

const InstagramFeed = () => {
    return (
        <section style={{ backgroundColor: '#000', padding: '100px 0' }}>
            <div className="container">
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', color: 'var(--color-gold-primary)', marginBottom: '15px' }}>
                        <Instagram size={24} />
                        <span style={{ letterSpacing: '2px', fontWeight: 'bold', textTransform: 'uppercase' }}>@SaharaGoldBD</span>
                    </div>
                    <h2 className="section-title">Follow Our Journey</h2>
                    <p style={{ color: '#888', marginTop: '20px' }}>Join our community of 50k+ seekers of timeless elegance.</p>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '15px'
                }}>
                    {instagramPosts.map((post) => (
                        <motion.div
                            key={post.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: post.id * 0.1 }}
                            style={{ position: 'relative', paddingTop: '100%', overflow: 'hidden', cursor: 'pointer' }}
                        >
                            <img
                                src={post.image}
                                alt={`Instagram post ${post.id}`}
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            />
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '20px',
                                opacity: 0,
                                transition: 'opacity 0.3s ease',
                                color: '#fff'
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Heart size={18} fill="currentColor" /> {post.likes}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <MessageCircle size={18} fill="currentColor" /> {post.comments}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default InstagramFeed;
