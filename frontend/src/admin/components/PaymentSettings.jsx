import React, { useEffect, useState } from 'react';
import api from '../api';
import { queryClient } from '../../queryClient';
export default function PaymentSettings() {
  const [data,setData]=useState(null),[message,setMessage]=useState(''),[saving,setSaving]=useState(false);
  useEffect(()=>{ api.get('/checkout/admin-config/').then(r=>setData({...r.data,ssl_store_password:''})).catch(()=>setMessage('Payment settings could not be loaded.')); },[]);
  async function save(event) {
    event.preventDefault();setSaving(true);setMessage('');
    try {
      const {contact_phone,merchant_number,instructions,ssl_enabled,ssl_store_id,ssl_store_password}=data;
      const r=await api.patch('/checkout/admin-config/',{contact_phone,merchant_number,instructions,ssl_enabled,ssl_store_id,ssl_store_password});
      setData({...r.data,ssl_store_password:''});queryClient.invalidateQueries({queryKey:['paymentConfiguration']});setMessage('Payment settings saved.');
    } catch(error) { setMessage(JSON.stringify(error.response?.data || 'Unable to save payment settings.')); }
    finally {setSaving(false);}
  }
  return <section className="glass-premium rounded-3xl p-8 border border-white/10 mb-8"><h2 className="text-xl text-white mb-3">Checkout & payment approval</h2><p className="text-slate-300 text-sm mb-5">Merchant payments require admin verification before an order is confirmed. Enable SSLCommerz only after your live merchant account is approved.</p>{data&&<form onSubmit={save} className="grid gap-4">
    {['contact_phone','merchant_number','instructions','ssl_store_id'].map(key=><label key={key} className="text-slate-200 text-sm"><span className="block mb-2 capitalize">{key.replaceAll('_',' ')}{key==='merchant_number'?' (optional — leave blank to give it by phone)':''}</span><input className="w-full p-3 rounded-lg bg-black/30 border border-white/20" value={data[key]} onChange={e=>setData({...data,[key]:e.target.value})} required={key==='contact_phone'||key==='instructions'}/></label>)}
    <label className="text-slate-200 text-sm">SSLCommerz store password<input type="password" autoComplete="new-password" className="w-full p-3 rounded-lg bg-black/30 border border-white/20 mt-2" value={data.ssl_store_password} onChange={e=>setData({...data,ssl_store_password:e.target.value})} placeholder={data.ssl_secret_configured?'Saved securely — leave blank to keep':'Enter live store password'}/></label>
    <label className="text-slate-200"><input type="checkbox" checked={data.ssl_enabled} onChange={e=>setData({...data,ssl_enabled:e.target.checked})}/> Enable live SSLCommerz at checkout</label>
    <button disabled={saving} className="px-5 py-3 rounded-lg bg-amber-400 text-black disabled:opacity-50">{saving?'Saving…':'Save payment settings'}</button>
  </form>}<p role="status" className="text-slate-200 mt-3">{message}</p></section>;
}
