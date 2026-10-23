import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingBag, Search, User, ArrowUpRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import SearchModal from '../search/SearchModal';
import { useGoldRates } from '../../hooks/useShopData';
import { useStorefrontContent } from '../../hooks/useStorefrontContent';
import './storefront-shell.css';

const links = [['/shop', 'Collections'], ['/gold-rates', 'Gold rates'], ['/about', 'Our story'], ['/contact', 'Visit Sahara']];
export default function Header() {
  const { data: content } = useStorefrontContent();
  const { data: rates } = useGoldRates();
  const { cartCount, toggleCart } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => { setMenuOpen(false); window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => { if(menuOpen && !menu.current.open) menu.current.showModal(); else if(!menuOpen && menu.current.open) menu.current.close(); }, [menuOpen]);
  return <>
    <a href="#storefront-main" className="sf-skip">Skip to content</a>
    <div className="sf-announcement"><span>Gold & diamond jewellery · Dhaka</span><Link to="/gold-rates">22K / {rates?.rate_22k ? `৳${Number(rates.rate_22k).toLocaleString()} per gram` : 'View published rates'} <ArrowUpRight size={11}/></Link></div>
    <header className="sf-header">
      <div className="sf-masthead">
        <div className="sf-header-left"><button className="sf-icon sf-menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={21}/></button><nav className="sf-navigation" aria-label="Main navigation">{links.map(([url,label]) => <NavLink to={url} key={url}>{label}</NavLink>)}</nav></div>
        <Link className="sf-logo" to="/" aria-label="New Sahara Gold and Diamond home"><img className="sf-supplied-logo" src="/brand/new-sahara-logo.png" alt="New Sahara Gold and Diamond" width="192" height="128"/></Link>
        <div className="sf-header-right"><button className="sf-header-search" onClick={() => setSearchOpen(true)}><span>Search</span><Search size={16}/></button><Link className="sf-account" to="/account" aria-label="My Sahara account"><User size={18}/><span>My Sahara</span></Link><button className="sf-icon sf-mobile-search" aria-label="Search the collection" onClick={() => setSearchOpen(true)}><Search size={20}/></button><button className="sf-bag" onClick={toggleCart} aria-label={`Open shopping bag, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}><ShoppingBag size={19}/><span>Bag</span><b>{cartCount}</b></button></div>
      </div>
    </header>
    <dialog ref={menu} className="sf-menu-dialog" aria-labelledby="sf-menu-title" onCancel={e => {e.preventDefault();setMenuOpen(false);}}>
      <div className="sf-menu-top"><p id="sf-menu-title">Explore Sahara</p><button className="sf-icon" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X/></button></div>
      <nav>{[['/','Home'],...links,['/track-order','Track your order'],['/account','My Sahara']].map(([url,label],i) => <Link to={url} key={url} onClick={() => setMenuOpen(false)}><small>0{i+1}</small>{label}<ArrowUpRight size={18}/></Link>)}</nav>
      <address>{content.address}<a href={`tel:${content.contact_phone}`}>{content.contact_phone}</a></address>
    </dialog>
    <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)}/>
  </>;
}
