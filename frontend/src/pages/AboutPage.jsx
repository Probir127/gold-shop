import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { useStorefrontContent } from '../hooks/useStorefrontContent';
import CollectionHeading from '../components/CollectionHeading';
import SEO from '../components/SEO';
export default function AboutPage() {
    const { data: content } = useStorefrontContent();
    return <div className="about-page">
        <SEO title="Our Story" description={content.about_description}/>
        <CollectionHeading eyebrow="New Sahara Gold and Diamond" title={content.about_title}><p>{content.about_description}</p></CollectionHeading>
        <section className="about-editorial maison-section"><div className="about-art"><img src={content.bangles_image} alt="Gold bangles in an editorial still life"/><span>Campaign artwork</span></div><div><p className="eyebrow">Objects of meaning</p><h2>{content.story_title}</h2><p className="about-prose">{content.story_description}</p><Link className="text-link" to="/shop">Discover the collection <ArrowRight size={16}/></Link></div></section>
        <section className="about-principles maison-section" aria-label="Shopping with Sahara">{[[content.about_value_one_title, content.about_value_one_text], [content.about_value_two_title, content.about_value_two_text], [content.about_value_three_title, content.about_value_three_text]].map(([title,text], i) => <article key={title}><p className="eyebrow">0{i+1}</p><h3>{title}</h3><p>{text}</p></article>)}</section>
        <section className="maison-section maison-visit"><p className="eyebrow">Come a little closer</p><h2>{content.visit_title}</h2><p>{content.visit_description}</p><address><MapPin size={16}/>{content.address}</address><Link className="maison-button" to="/contact">Plan your visit <ArrowRight size={16}/></Link></section>
    </div>;
}
