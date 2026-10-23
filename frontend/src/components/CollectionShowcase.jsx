import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import './collection-deck.css';

export default function CollectionShowcase({ categories, title, loading, error }) {
  const [activeId, setActiveId] = useState(null);
  const reducedMotion = useReducedMotion();
  const active = Math.max(0, categories.findIndex(item => item.id === activeId));
  const selected = categories[active];
  const count = categories.length;
  const move = direction => setActiveId(categories[(active + direction + count) % count]?.id);
  useEffect(() => {
    if (!categories.some(item => item.id === activeId)) setActiveId(categories[0]?.id ?? null);
  }, [categories, activeId]);

  return <section className="collection-deck" aria-label="Explore our collections" aria-roledescription="carousel">
    <div className="deck-introduction">
      <p className="eyebrow">The collections / Sahara</p><h2>{title}</h2>
      <Link className="deck-all" to="/shop">View all jewellery <ArrowRight size={18}/></Link>
      {count > 0 && <>
        <div className="deck-categories" aria-label="Choose a collection">{categories.map((category, index) => <button key={category.id} type="button" onClick={() => setActiveId(category.id)} aria-pressed={active === index}><span>{String(index + 1).padStart(2, '0')}</span>{category.name}<ArrowRight size={16}/></button>)}</div>
        <div className="deck-controls"><button type="button" disabled={count < 2} onClick={() => move(-1)} aria-label="Previous collection"><ArrowLeft size={20}/></button><span aria-live="polite" aria-atomic="true">{selected.name} · {active + 1} / {count}</span><button type="button" disabled={count < 2} onClick={() => move(1)} aria-label="Next collection"><ArrowRight size={20}/></button></div>
      </>}
      {loading ? <p role="status">Loading collections…</p> : error ? <p role="alert">Collections could not be loaded. Please refresh to try again.</p> : !count ? <p>New collections will appear when published.</p> : null}
    </div>
    {count > 0 && <div className="deck-stage">{categories.map((category, index) => {
      const position = (index - active + count) % count;
      return <motion.div className="deck-card" key={category.id} initial={false}
        animate={{ x: position === 0 ? 0 : Math.min(position, 3) * 18, y: position === 0 ? 0 : -Math.min(position, 3) * 9, rotate: position === 0 ? -2 : Math.min(position, 3) * 4, scale: 1 - Math.min(position, 3) * .035, opacity: position < 3 ? 1 : 0 }}
        transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 145, damping: 23, mass: .9 }}
        style={{ zIndex: count - position, pointerEvents: position === 0 ? 'auto' : 'none' }} aria-hidden={position !== 0} inert={position !== 0 ? true : undefined}>
        <Link to={`/shop?cat=${encodeURIComponent(category.slug)}`} tabIndex={position === 0 ? 0 : -1} aria-label={`Explore ${category.name}`}>
          <div className="deck-image">{category.image ? <img src={category.image} alt={category.imageAlt || category.name} loading="lazy"/> : <span className="collection-photo-empty">{category.name}<small>Explore the collection</small></span>}</div>
          <div className="deck-caption"><div><small>{category.count} {category.count === 1 ? 'piece' : 'pieces'}</small><h3>{category.name}</h3></div><span><ArrowRight size={22}/></span></div>
        </Link>
      </motion.div>;
    })}</div>}
  </section>;
}
