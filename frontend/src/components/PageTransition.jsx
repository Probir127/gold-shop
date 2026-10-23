import React, { useEffect, useRef } from 'react';

export default function PageTransition({ children }) {
    const root = useRef(null);
    useEffect(() => {
        let disposed = false, media, observer;
        // Static content is the fallback while the animation module loads.
        Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ gsap }, { ScrollTrigger }]) => {
            if (disposed || !root.current) return;
            gsap.registerPlugin(ScrollTrigger);
            const node = root.current;
            media = gsap.matchMedia();
            media.add('(prefers-reduced-motion: no-preference)', () => {
                const seen = new WeakSet();
                const owned = [];
                const track = tween => { owned.push(tween); return tween; };
                const scan = () => {
                    node.querySelectorAll('h1, h2, .maison-product, .product-card-wrapper, .sv2-rate-band, .account-form, .pv2-checkout-form, .maison-story-copy > p, .maison-story-copy > a').forEach((element, index) => {
                        if (seen.has(element) || element.closest('.maison-category-grid, .collection-showcase') || (element.matches('.maison-product') && element.closest('.product-card-wrapper'))) return;
                        seen.add(element);
                        const heading = /^H[12]$/.test(element.tagName);
                        track(gsap.fromTo(element,
                            // Keep copy readable even when a browser suspends animation
                            // frames in a background tab. Photography carries the motion.
                            { y: heading ? 8 : 20, opacity: 1 },
                            { y: 0, opacity: 1, duration: 1.05,
                                delay: heading ? 0 : (index % 4) * .08, ease: 'power4.out', immediateRender: false,
                                clearProps: 'transform,opacity',
                                scrollTrigger: { trigger: element, start: 'top 92%', once: true } }));
                    });
                    node.querySelectorAll('.maison-product-image > img, .maison-category-image > img, .atelier-rate-art, .craft-visual img, .visit-visual img').forEach(element => {
                        if (seen.has(element)) return;
                        seen.add(element);
                        track(gsap.fromTo(element, { scale: 1.12, yPercent: -3 }, { scale: 1.08, yPercent: 3, ease: 'none',
                            scrollTrigger: { trigger: element.parentElement, start: 'top bottom', end: 'bottom top', scrub: .8 } }));
                    });
                };
                scan();
                observer = new MutationObserver(() => { scan(); });
                observer.observe(node, { childList: true, subtree: true });
                // Refresh once late-loading imagery establishes its actual height.
                const refresh = () => ScrollTrigger.refresh();
                node.addEventListener('load', refresh, true);
                return () => { observer?.disconnect(); node.removeEventListener('load', refresh, true); owned.forEach(t => { t.scrollTrigger?.kill(); t.revert(); }); };
            });
            media.add('(min-width: 1000px) and (prefers-reduced-motion: no-preference)', () => {
                const hero = node.querySelector('.maison-hero');
                if (hero) {
                    gsap.to(hero.querySelector('.maison-hero-image'), { scale: .95, borderRadius: 28, ease: 'none',
                        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: .8 } });
                    gsap.to(hero.querySelector('.maison-hero-copy'), { y: -65, ease: 'none',
                        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: .8 } });
                }
                const story = node.querySelector('.maison-story');
                if (story) gsap.to(story.querySelector('.maison-story-art'), { y: 50, ease: 'none',
                    scrollTrigger: { trigger: story, start: 'top bottom', end: 'bottom top', scrub: 1 } });
            });
            ScrollTrigger.refresh();
        }).catch(() => { /* Static page remains fully readable on load failure. */ });
        return () => { disposed = true; observer?.disconnect(); media?.revert(); };
    }, []);
    return <div ref={root} className="sahara-page-transition">{children}</div>;
}
