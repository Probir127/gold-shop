import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Diamond, Layers, MapPin, PenTool, Phone, Sparkles } from 'lucide-react';
import './craft-visit.css';

// Photographic sections follow the approved craft/visit composition. Product
// inventory and the actual shop location remain separate from editorial art.
export default function CraftVisit({ content }) {
  const steps = [Layers, PenTool, Diamond, Sparkles];
  const directions = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(content.address)}`;
  return <>
    <section className="craft-story" aria-labelledby="craft-title">
      <figure className="craft-visual">
        <img src={content.craft_image} alt={content.craft_image_alt} loading="lazy" width="1536" height="1024" />
        <figcaption>{content.craft_image_caption}</figcaption>
      </figure>
      <div className="craft-copy">
        <span className="craft-star" aria-hidden="true">✧</span>
        <p className="eyebrow">{content.craft_eyebrow}</p>
        <h2 id="craft-title">{content.story_title}</h2>
        <p className="craft-description">{content.story_description}</p>
        <ol className="craft-steps" aria-label="The details of fine jewellery">
          {steps.map((Icon, index) => <li key={index}>
            <span className="craft-step-icon"><Icon size={24} strokeWidth={1} aria-hidden="true" /></span>
            <span>{index + 1}. {content[`craft_step_${index + 1}`]}</span>
            {index < steps.length - 1 && <ArrowRight className="craft-step-arrow" size={20} strokeWidth={1} aria-hidden="true" />}
          </li>)}
        </ol>
      </div>
    </section>
    <section className="visit-editorial" aria-labelledby="visit-title">
      <figure className="visit-visual">
        <img src={content.visit_image} alt={content.visit_image_alt} loading="lazy" width="800" height="600" />
        <figcaption>{content.visit_image_caption}</figcaption>
      </figure>
      <div className="visit-copy">
        <span className="craft-star" aria-hidden="true">✧</span>
        <p className="eyebrow">{content.visit_eyebrow}</p>
        <h2 id="visit-title">{content.visit_title}</h2>
        <p>{content.visit_description}</p>
        <a className="maison-button" href={directions} target="_blank" rel="noreferrer">Get directions <ArrowRight size={17} /></a>
      </div>
      <div className="visit-details">
        <div><MapPin size={25} strokeWidth={1} aria-hidden="true" /><div><h3>Showroom location</h3><address>{content.address}</address></div></div>
        <div><Phone size={25} strokeWidth={1} aria-hidden="true" /><div><h3>Plan your visit</h3><a href={`tel:${content.contact_phone}`}>{content.contact_phone}</a><Link to="/contact">Contact our team <ArrowRight size={13} /></Link></div></div>
      </div>
    </section>
  </>;
}
