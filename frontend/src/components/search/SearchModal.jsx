import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { formatPrice } from '../../utils/formatters';
export default function SearchModal({ isOpen, onClose }) {
  const dialog = useRef(null);
  const [query,setQuery] = useState('');
  const [results,setResults] = useState([]);
  const [status,setStatus] = useState('idle');
  useEffect(() => { if(isOpen && !dialog.current.open) dialog.current.showModal(); else if(!isOpen && dialog.current.open) dialog.current.close(); }, [isOpen]);
  useEffect(() => {
    let active = true;
    if(!isOpen || !query.trim()){setResults([]);setStatus('idle');return;}
    setStatus('loading');
    const timer=setTimeout(async () => {try {const data=await api.searchProducts(query.trim());if(active){setResults(Array.isArray(data)?data:data.results || []);setStatus('ready');}}catch {if(active){setResults([]);setStatus('error');}}},300);
    return () => {active=false;clearTimeout(timer);};
  },[query,isOpen]);
  return <dialog className="sf-search-dialog" ref={dialog} aria-labelledby="sf-search-title" onCancel={e => {e.preventDefault();onClose();}} onClick={e => {if(e.target===e.currentTarget)onClose();}}>
    <div className="sf-search-inner"><header><p className="eyebrow">The collection, at your fingertips</p><button className="sf-icon" onClick={onClose} aria-label="Close search"><X/></button></header><h2 id="sf-search-title">What speaks to you?</h2>
      <label className="sf-search-field"><Search size={22}/><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="A necklace, a ring, something precious…" aria-label="Search jewellery" maxLength={150}/></label>
      {!query.trim() ? <div className="sf-search-suggestions"><span>Begin exploring</span>{['Necklace','Ring','Bangles','Earrings'].map(term=><button key={term} onClick={()=>setQuery(term)}>{term}<ArrowUpRight size={13}/></button>)}</div> : <div className="sf-search-results" aria-live="polite">{status==='loading'?<p>Searching the collection…</p>:status==='error'?<p>Search is unavailable at the moment. Please try again.</p>:results.length?results.map(product=><Link key={product.id} to={`/product/${product.id}`} onClick={onClose}><img src={product.image} alt=""/><div><h3>{product.name}</h3><p>{product.purity} · {product.weight}g</p></div><span>{formatPrice(product.current_price ?? product.price)}</span><ArrowUpRight size={18}/></Link>):<p>No pieces found for “{query}”. Try a category or a different name.</p>}</div>}
    </div>
  </dialog>;
}
