import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { useStorefrontContent, storefrontDefaults } from '../../hooks/useStorefrontContent';

export default function StorefrontEditor() {
  const { data, isError } = useStorefrontContent();
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  useEffect(() => { if (data) setDraft(Object.fromEntries(Object.keys(storefrontDefaults).map(key => [key, data[key]]))); }, [data]);
  async function save(event) {
    event.preventDefault(); setSaving(true); setStatus('');
    try {
      const response = await api.patch('/storefront/content/', draft);
      queryClient.setQueryData(['storefrontContent'], response.data);
      setStatus('Website content saved.');
    } catch (error) {
      setStatus(error.response?.status === 403 ? 'Staff access is required, or this preview is read-only.' : JSON.stringify(error.response?.data || 'Could not save. Please retry.'));
    } finally { setSaving(false); }
  }
  return <section className="glass-premium rounded-3xl p-8 border border-white/10 mb-8">
    <h2 className="text-xl text-white mb-3">Website content & policies</h2>
    <p className="text-sm text-slate-300 mb-5">Edit storefront text, HTTPS image URLs, contact details, policies and the public GA4 measurement ID. Never enter API keys here. Policy wording must reflect the shop’s actual practices.</p>
    {isError && <p role="alert" className="text-amber-300">The saved content could not be loaded. Check the API connection before editing.</p>}
    {draft && <form onSubmit={save}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(draft).map(([key, value]) => <label key={key} className={`block text-sm text-slate-200 ${key.endsWith('_policy') ? 'md:col-span-2' : ''}`}>
          <span className="block mb-2 capitalize">{key.replaceAll('_', ' ')}</span>
          <textarea value={value} required={key !== 'ga4_measurement_id'} maxLength={key.endsWith('_policy') ? 30000 : 3000} rows={key.endsWith('_policy') ? 12 : 2} className="w-full p-3 rounded-lg bg-black/30 text-white border border-white/20" onChange={event => setDraft({ ...draft, [key]: event.target.value })} />
        </label>)}
      </div>
      <button disabled={saving || isError} className="mt-5 px-5 py-3 rounded-lg bg-amber-400 text-black disabled:opacity-50">{saving ? 'Saving…' : 'Save website content'}</button>
      <p role="status" className="mt-3 text-sm text-slate-200">{status}</p>
    </form>}
  </section>;
}
