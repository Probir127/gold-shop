import React, { useEffect, useRef } from 'react';

/**
 * Sahara Gold — Luxury Gold Dust & Constellation Canvas
 * High-performance 60fps golden ember/dust engine with cursor magnetic swirl.
 */
const GoldParticles = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let isVisible = true;

        const resizeCanvas = () => {
            canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
            canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // Mouse tracking for interactive golden swirl
        const mouse = { x: null, y: null, radius: 120 };

        const handleMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        };

        const handleMouseLeave = () => {
            mouse.x = null;
            mouse.y = null;
        };

        const parent = canvas.parentElement || window;
        parent.addEventListener('mousemove', handleMouseMove);
        parent.addEventListener('mouseleave', handleMouseLeave);

        // Particle configuration
        const particleCount = Math.min(85, Math.floor((canvas.width * canvas.height) / 12000));
        const particles = [];

        class GoldMote {
            constructor() {
                this.reset(true);
            }

            reset(initial = false) {
                this.x = Math.random() * canvas.width;
                this.y = initial ? Math.random() * canvas.height : canvas.height + 15;
                this.size = Math.random() * 2.2 + 0.8;
                this.baseSize = this.size;
                this.speedY = Math.random() * 0.6 + 0.25;
                this.speedX = (Math.random() - 0.5) * 0.4;
                this.alpha = Math.random() * 0.5 + 0.2;
                this.pulsing = Math.random() * 0.02 + 0.01;
                this.pulseDir = 1;
                // Gold hue variation: yellow-gold, rose-gold, pale shimmer
                this.hue = Math.random() > 0.3 ? '212, 175, 55' : '243, 213, 138';
            }

            update() {
                this.y -= this.speedY;
                this.x += this.speedX;

                // Pulsate opacity for twinkling diamond/gold effect
                this.alpha += this.pulsing * this.pulseDir;
                if (this.alpha > 0.85) this.pulseDir = -1;
                if (this.alpha < 0.15) this.pulseDir = 1;

                // Mouse interaction — swirl gently away from cursor
                if (mouse.x !== null && mouse.y !== null) {
                    const dx = mouse.x - this.x;
                    const dy = mouse.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < mouse.radius) {
                        const force = (mouse.radius - distance) / mouse.radius;
                        const directionX = (dx / distance) * force * 3;
                        const directionY = (dy / distance) * force * 3;
                        this.x -= directionX;
                        this.y -= directionY;
                    }
                }

                // Wrap around edges
                if (this.y < -10) this.reset();
                if (this.x < -10) this.x = canvas.width + 10;
                if (this.x > canvas.width + 10) this.x = -10;
            }

            draw() {
                ctx.save();
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);

                // Radial glow for larger particles
                if (this.size > 1.6) {
                    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3);
                    gradient.addColorStop(0, `rgba(${this.hue}, ${this.alpha})`);
                    gradient.addColorStop(0.5, `rgba(${this.hue}, ${this.alpha * 0.3})`);
                    gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');
                    ctx.fillStyle = gradient;
                    ctx.fill();
                } else {
                    ctx.fillStyle = `rgba(${this.hue}, ${this.alpha})`;
                    ctx.fill();
                }
                ctx.restore();
            }
        }

        for (let i = 0; i < particleCount; i++) {
            particles.push(new GoldMote());
        }

        // Draw delicate constellation threads between close particles
        const drawConstellations = () => {
            const maxDistance = 90;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < maxDistance) {
                        const alpha = (1 - dist / maxDistance) * 0.12;
                        ctx.strokeStyle = `rgba(212, 175, 55, ${alpha})`;
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
        };

        const render = () => {
            if (!isVisible) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawConstellations();
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            animationFrameId = requestAnimationFrame(render);
        };

        // Visibility observer to save battery/GPU when off-screen
        const observer = new IntersectionObserver(([entry]) => {
            isVisible = entry.isIntersecting;
            if (isVisible) {
                cancelAnimationFrame(animationFrameId);
                render();
            }
        });
        observer.observe(canvas);

        render();

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', resizeCanvas);
            parent.removeEventListener('mousemove', handleMouseMove);
            parent.removeEventListener('mouseleave', handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 3,
                opacity: 0.85,
            }}
        />
    );
};

export default GoldParticles;
