import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api, { 
  getBotConfig, updateBotConfig, 
  getKnowledgeSources, createKnowledgeSource, deleteKnowledgeSource, syncKnowledgeSource,
  getMe, registerTelegramWebhook
} from '../api';
import toast from '../components/Toast';
import { Brain, Save, RefreshCw, Info, MessageCircle, Database, Globe, Trash2, Plus, AlertCircle, CheckCircle2, Clock, Copy, ExternalLink, ShieldCheck, Palette, Layout, Users, Mail, UserPlus, Shield, Send, Instagram, Facebook, Sparkles, Check, Smartphone } from 'lucide-react';


const Field = ({ label, hint, children }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-slate-300 block">{label}</label>
    {hint && <p className="text-[13px] text-slate-500 leading-relaxed">{hint}</p>}
    {children}
  </div>
);

const Section = ({ icon: Icon, title, children }) => (
  <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 md:p-8">
    <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
        <Icon className="text-blue-400" size={16} />
      </div>
      <h2 className="text-lg font-medium text-white">{title}</h2>
    </div>
    <div className="space-y-6">
      {children}
    </div>
  </div>
);

const BotTraining = () => {
  const [data, setData]       = useState(null);
  const [sources, setSources] = useState([]);
  const [members, setMembers] = useState([]);
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [userRole, setUserRole]   = useState('agent');

  // Form states
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSource, setNewSource] = useState({ title: '', url: '', source_type: 'url' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole]   = useState('agent');
  const [registeringWebhook, setRegisteringWebhook] = useState(false);

  // Interactive Live Widget Preview states
  const [previewMessages, setPreviewMessages] = useState([
    { id: 1, text: "Hey there! Ask me anything about our services or pricing! 🚀", sender: 'bot' }
  ]);
  const [previewInput, setPreviewInput] = useState('');
  const [previewTyping, setPreviewTyping] = useState(false);
  const [themeMode, setThemeMode] = useState('glass'); // 'light' | 'dark' | 'glass'
  const [widgetShape, setWidgetShape] = useState('pill'); // 'circle' | 'square' | 'pill'

  const fetchData = async () => {
    setLoading(true);
    try {
      const tenantSlug = localStorage.getItem('tenant_slug');
      
      const [configRes, sourcesRes, meRes, membersRes] = await Promise.all([
        getBotConfig(),
        getKnowledgeSources(),
        getMe(),
        api.get('/team/members/')
      ]);
      
      setData(configRes.data);
      setSources(sourcesRes.data.results || sourcesRes.data);
      setMembers(membersRes.data);
      
      const membership = (meRes.data.memberships || []).find(m => m.tenant_slug === tenantSlug);
      if (membership) setUserRole(membership.role);
      
    } catch (e) {
      toast.error('Failed to load configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const updateTenant = (field, value) => {
    setData(prev => ({
      ...prev,
      tenant: { ...prev.tenant, [field]: value }
    }));
  };

  const updateBot = (field, value) => {
    setData(prev => ({
      ...prev,
      bot_config: { ...prev.bot_config, [field]: value }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateBotConfig(data);
      setData(res.data);
      toast.success('Settings saved successfully! 🚀');
    } catch (e) {
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSource = async () => {
    if (!newSource.title) return toast.error('Please provide a title.');
    if (newSource.source_type === 'url' && !newSource.url) return toast.error('Please provide a URL.');
    if (newSource.source_type === 'pdf' && !newSource.uploaded_file) return toast.error('Please attach a PDF file.');

    try {
      let payload = newSource;
      // Use FormData for file uploads
      if (newSource.source_type === 'pdf') {
        payload = new FormData();
        payload.append('title', newSource.title);
        payload.append('source_type', 'pdf');
        payload.append('uploaded_file', newSource.uploaded_file);
      }

      const res = await createKnowledgeSource(payload);
      setSources(prev => [res.data, ...prev]);
      setShowAddSource(false);
      setNewSource({ title: '', url: '', source_type: 'url', uploaded_file: null });
      toast.success('Source added! Don\'t forget to sync it.');
    } catch (e) {
      toast.error('Failed to add source.');
    }
  };

  const handleDeleteSource = async (id) => {
    if (!window.confirm('Are you sure you want to delete this knowledge source?')) return;
    try {
      await deleteKnowledgeSource(id);
      setSources(prev => prev.filter(s => s.id !== id));
      toast.success('Source deleted.');
    } catch (e) {
      toast.error('Failed to delete source.');
    }
  };

  const handleSync = async (id) => {
    setSyncingId(id);
    try {
      await syncKnowledgeSource(id);
      const res = await getKnowledgeSources();
      setSources(res.data.results || res.data);
      toast.success('Sync completed! AI context updated.');
    } catch (e) {
      toast.error('Sync failed. Please check the URL.');
    } finally {
      setSyncingId(null);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) return toast.error('Email is required.');
    try {
      const tenantSlug = localStorage.getItem('tenant_slug');
      const res = await api.post('/team/invite/', 
        { email: inviteEmail, role: inviteRole }
      );
      setMembers(prev => [...prev, res.data]);
      setInviteEmail('');
      toast.success('Member added to workspace!');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to invite member.');
    }
  };

  const handleRemoveMember = async (id) => {
    if (!window.confirm('Remove this member from the workspace?')) return;
    try {
      const tenantSlug = localStorage.getItem('tenant_slug');
      await api.post(`/team/remove/${id}/`);
      setMembers(prev => prev.filter(m => m.id !== id));
      toast.success('Member removed.');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to remove member.');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleRegisterWebhook = async () => {
    if (!data.tenant.external_ids?.telegram_token) {
      toast.error('Please enter and save your Bot Token first.');
      return;
    }
    setRegisteringWebhook(true);
    try {
      const webhookUrl = `${window.location.origin.replace('5173', '8000')}/api/webhooks/telegram/${data.tenant.slug}/`;
      const res = await registerTelegramWebhook(data.tenant.slug, webhookUrl);
      toast.success(res.data.message || 'Webhook registered successfully!');
    } catch (e) {
      toast.error(e.response?.data?.detail || e.response?.data?.message || 'Failed to register webhook.');
    } finally {
      setRegisteringWebhook(false);
    }
  };

  const TrainingSkeleton = () => {
    return (
      <div className="flex bg-[#09090b] min-h-screen text-slate-300 font-sans">
        <Sidebar />
        <main className="flex-1 p-8 lg:p-12 space-y-8 animate-pulse">
          <div className="flex justify-between items-center mb-10">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-white/5 rounded-lg"></div>
              <div className="h-4 w-48 bg-white/5 rounded-md"></div>
            </div>
            <div className="h-10 w-32 bg-white/5 rounded-lg"></div>
          </div>
          <div className="flex border-b border-white/5 pb-px gap-6 mb-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 w-24 bg-white/5 rounded-md"></div>
            ))}
          </div>
          <div className="bg-[#121214] p-8 rounded-2xl border border-white/5 h-[400px]"></div>
        </main>
      </div>
    );
  };

  if (loading || !data) {
    return <TrainingSkeleton />;
  }

  const handleSendPreviewMessage = (text) => {
    if (!text.trim()) return;
    const userMsg = { id: Date.now(), text: text, sender: 'user' };
    setPreviewMessages(prev => [...prev, userMsg]);
    setPreviewInput('');
    setPreviewTyping(true);

    setTimeout(() => {
      setPreviewTyping(false);
      let replyText = "That sounds awesome! I can help you automate workflows, query documents, or configure integrations. 😊";
      const lower = text.toLowerCase();
      if (lower.includes('price') || lower.includes('cost') || lower.includes('billing')) {
        replyText = "Our multi-tenant SaaS tiers start at just $19/mo for the Starter plan, scaling up to dedicated Enterprise solutions. 💳";
      } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
        replyText = "Hello! I am your brand's dedicated AI assistant, loaded with custom business identity and RAG context. How can I help you today? 🌟";
      } else if (lower.includes('features') || lower.includes('capabilities') || lower.includes('what can you do')) {
        replyText = "I support multi-channel integrations (WhatsApp, Telegram, Messenger, Instagram), semantic RAG matching, live agent handoff, and automatic invoice drafting! 🤖";
      }
      setPreviewMessages(prev => [...prev, { id: Date.now() + 1, text: replyText, sender: 'bot' }]);
    }, 1500);
  };

  const { tenant, bot_config } = data;
  const webhookUrl = `${window.location.origin.replace('5173', '8000')}/api/whatsapp/${tenant.slug}/`;

  const getStatusIcon = (status) => {
    switch(status) {
      case 'ready':   return <CheckCircle2 size={16} className="text-green-400" />;
      case 'syncing': return <RefreshCw size={16} className="text-blue-400 animate-spin" />;
      case 'failed':  return <AlertCircle size={16} className="text-red-400" />;
      default:        return <Clock size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="flex bg-[#09090b] min-h-screen text-slate-300 font-sans selection:bg-blue-500/30">
      <Sidebar />
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar max-w-5xl mx-auto w-full">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
          <div>
            <h1 className="text-3xl font-semibold text-white tracking-tight flex items-center gap-3">
              Platform Settings
            </h1>
            <p className="text-sm text-slate-400 mt-2">
              Configure your business identity, AI brain, and messaging channels.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-white text-black hover:bg-slate-200 disabled:opacity-50 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-white/5 mb-8 overflow-x-auto custom-scrollbar">
          {[
            { id: 'profile', label: 'Business Profile' },
            { id: 'ai', label: 'AI Brain' },
            { id: 'channels', label: 'Channels' },
            { id: 'knowledge', label: 'Knowledge Base' },
            { id: 'branding', label: 'Branding' },
            { id: 'embed', label: 'Widget Embed' },
            { id: 'team', label: 'Team' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab.id 
                ? 'border-blue-500 text-white' 
                : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-8 pb-20">
          
          {activeTab === 'profile' && (
            <Section icon={Globe} title="Business Identity">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Business Name" hint="How the bot refers to your company">
                  <input
                    className="w-full bg-[#09090b] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
                    value={tenant.business_name || ''}
                    onChange={e => updateTenant('business_name', e.target.value)}
                  />
                </Field>
                <Field label="Tagline" hint="A short catchy catchphrase for your chat header">
                  <input
                    className="w-full bg-[#09090b] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
                    placeholder="E.g., Your friendly style assistant"
                    value={tenant.tagline || ''}
                    onChange={e => updateTenant('tagline', e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Field label="Contact Email">
                  <input
                    type="email"
                    className="w-full bg-[#09090b] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
                    value={tenant.contact_email || ''}
                    onChange={e => updateTenant('contact_email', e.target.value)}
                  />
                </Field>
                <Field label="Contact Phone">
                  <input
                    className="w-full bg-[#09090b] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
                    value={tenant.contact_phone || ''}
                    onChange={e => updateTenant('contact_phone', e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Address / Location">
                <input
                  className="w-full bg-[#09090b] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
                  value={tenant.address || ''}
                  onChange={e => updateTenant('address', e.target.value)}
                />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Website URL" hint="Your official business web page">
                  <input
                    type="url"
                    className="w-full bg-[#09090b] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
                    placeholder="https://example.com"
                    value={tenant.website_url || ''}
                    onChange={e => updateTenant('website_url', e.target.value)}
                  />
                </Field>
                <Field label="Workspace Slug" hint="Unique identifier used for embedding the chat widget">
                  <input
                    disabled
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-500 outline-none cursor-not-allowed"
                    value={tenant.slug || ''}
                  />
                </Field>
              </div>

              <Field label="Description" hint="A short summary for the AI to understand your mission">
                <textarea
                  rows={3}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-all resize-none"
                  value={tenant.description || ''}
                  onChange={e => updateTenant('description', e.target.value)}
                />
              </Field>
            </Section>
          )}

          {activeTab === 'ai' && (
            <Section icon={Brain} title="AI Persona & Reasoning">
              <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-2">
                <Info size={18} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-200/80">
                  Custom prompt overrides will bypass the auto-generated personality. Use this only if you want total control over the AI logic.
                </p>
              </div>

              <Field 
                label="Custom Prompt Override (Advanced)" 
                hint="Leave empty to use the auto-generated system prompt based on your business identity and knowledge base."
              >
                <textarea
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-4 text-white font-mono text-sm focus:border-blue-500 outline-none transition-all resize-y"
                  rows={20}
                  placeholder="Enter your custom system instructions here..."
                  value={bot_config.custom_prompt_override || ''}
                  onChange={e => updateBot('custom_prompt_override', e.target.value)}
                />
              </Field>

              <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                <h3 className="text-sm font-bold text-slate-300 mb-2 uppercase tracking-tight">Preview of Live Context</h3>
                <div className="text-xs text-slate-500 font-mono whitespace-pre-wrap line-clamp-6">
                  {bot_config.custom_prompt_override || bot_config.system_prompt || "No prompt generated yet. Save changes to trigger generation."}
                </div>
              </div>
            </Section>
          )}

          {activeTab === 'channels' && (
            <div className="space-y-8">
              <Section icon={MessageCircle} title="WhatsApp Business Channel">
                <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 space-y-6">
                  {/* Connection Status */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tenant.wa_connected ? 'bg-green-500/10' : 'bg-slate-800'}`}>
                        <MessageCircle className={tenant.wa_connected ? 'text-green-400' : 'text-slate-500'} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">WhatsApp Cloud API</h3>
                        <p className="text-xs text-slate-500">Connect your Meta Business account to go live</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${tenant.wa_connected ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                        {tenant.wa_connected ? 'Connected' : 'Setup Required'}
                      </span>
                    </div>
                  </div>

                  {/* Webhook Info */}
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5 space-y-3">
                    <h4 className="text-sm font-bold text-blue-300 flex items-center gap-2">
                      <Globe size={16} /> Webhook Configuration
                    </h4>
                    <p className="text-xs text-blue-200/60 leading-relaxed">
                      Paste this Callback URL into your Meta App's WhatsApp configuration. Set the verification token to your choosing and save it below.
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-400 truncate">
                        {webhookUrl}
                      </div>
                      <button 
                        onClick={() => copyToClipboard(webhookUrl)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-blue-400 transition-colors"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-5 pt-2">
                    <div className="grid grid-cols-2 gap-6">
                      <Field label="Phone Number ID" hint="From Meta App > WhatsApp > Setup">
                        <input
                          className="w-full bg-[#09090b] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
                          placeholder="104523..."
                          value={tenant.wa_phone_number_id || ''}
                          onChange={e => updateTenant('wa_phone_number_id', e.target.value)}
                        />
                      </Field>
                      <Field label="Webhook Verify Token" hint="Choose a secret string for Meta to verify">
                        <div className="relative">
                          <input
                            className="w-full bg-[#09090b] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
                            placeholder="grownk_secret_123"
                            value={tenant.wa_webhook_token || ''}
                            onChange={e => updateTenant('wa_webhook_token', e.target.value)}
                          />
                          <ShieldCheck className="absolute right-4 top-3.5 text-slate-600" size={18} />
                        </div>
                      </Field>
                    </div>

                    <Field label="Permanent Access Token" hint="Generate this in Business Settings > System Users">
                      <input
                        type="password"
                        className="w-full bg-[#09090b] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
                        placeholder="EAAG..."
                        value={tenant.wa_access_token || ''}
                        onChange={e => updateTenant('wa_access_token', e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              </Section>

              <Section icon={Send} title="Telegram Bot Channel">
                <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10`}>
                        <Send className="text-blue-400 -rotate-45" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">Telegram Bot API</h3>
                        <p className="text-xs text-slate-500">Connect your Telegram bot to respond via chat</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5 space-y-3">
                    <h4 className="text-sm font-bold text-blue-300 flex items-center gap-2">
                      <Globe size={16} /> Webhook Configuration
                    </h4>
                    <p className="text-xs text-blue-200/60 leading-relaxed">
                      Set your bot's webhook to this URL using the <code>setWebhook</code> API method or our auto-setup tool.
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-400 truncate">
                        {`${window.location.origin.replace('5173', '8000')}/api/webhooks/telegram/${tenant.slug}/`}
                      </div>
                      <button 
                        onClick={() => copyToClipboard(`${window.location.origin.replace('5173', '8000')}/api/webhooks/telegram/${tenant.slug}/`)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-blue-400 transition-colors"
                        title="Copy Webhook URL"
                      >
                        <Copy size={16} />
                      </button>
                      <button 
                        onClick={handleRegisterWebhook}
                        disabled={registeringWebhook}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 rounded-lg text-white font-semibold text-xs transition-colors flex items-center gap-2"
                        title="Auto-register Webhook with Telegram"
                      >
                        {registeringWebhook ? <RefreshCw size={14} className="animate-spin" /> : <Globe size={14} />}
                        Auto-Register
                      </button>
                    </div>
                  </div>

                  <Field label="Bot Token" hint="Get this from @BotFather on Telegram">
                    <input
                      type="password"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-all font-mono"
                      placeholder="123456789:ABCdef..."
                      value={tenant.external_ids?.telegram_token || ''}
                      onChange={e => {
                        const newIds = { ...(tenant.external_ids || {}), telegram_token: e.target.value };
                        updateTenant('external_ids', newIds);
                      }}
                    />
                  </Field>
                </div>
              </Section>

              <Section icon={Instagram} title="Instagram Direct Bot Channel">
                <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 space-y-6 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-transparent pointer-events-none"></div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-pink-500/10 text-pink-400">
                        <Instagram />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-slate-300">Instagram Direct API</h3>
                          <span className="text-[10px] bg-pink-600/20 text-pink-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Active Channel</span>
                        </div>
                        <p className="text-xs text-slate-500">Automate customer DMs, comment replies, and story mentions</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={tenant.external_ids?.instagram_connected ?? false}
                        onChange={e => {
                          const newIds = { ...(tenant.external_ids || {}), instagram_connected: e.target.checked };
                          updateTenant('external_ids', newIds);
                        }}
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600 peer-checked:after:bg-white"></div>
                    </label>
                  </div>

                  <div className="bg-pink-500/5 border border-pink-500/20 rounded-xl p-5 space-y-3">
                    <h4 className="text-sm font-bold text-pink-300 flex items-center gap-2">
                      <Globe size={16} /> Webhook Configuration
                    </h4>
                    <p className="text-xs text-pink-200/60 leading-relaxed">
                      Configure your Meta App's Webhook to send <code>messages</code> subscriptions to this callback URL.
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-400 truncate">
                        {`${window.location.origin.replace('5173', '8000')}/api/webhooks/instagram/${tenant.slug}/`}
                      </div>
                      <button 
                        onClick={() => copyToClipboard(`${window.location.origin.replace('5173', '8000')}/api/webhooks/instagram/${tenant.slug}/`)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-pink-400 transition-colors"
                        title="Copy Webhook URL"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Instagram Page ID" hint="From Facebook Page settings > Info">
                      <input
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-all"
                        placeholder="178414..."
                        value={tenant.external_ids?.instagram_page_id || ''}
                        onChange={e => {
                          const newIds = { ...(tenant.external_ids || {}), instagram_page_id: e.target.value };
                          updateTenant('external_ids', newIds);
                        }}
                      />
                    </Field>
                    <Field label="Verify Token" hint="Match your Meta Developer webhook config">
                      <input
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-all font-mono"
                        placeholder="grownk_ig_secret"
                        value={tenant.external_ids?.instagram_verify_token || ''}
                        onChange={e => {
                          const newIds = { ...(tenant.external_ids || {}), instagram_verify_token: e.target.value };
                          updateTenant('external_ids', newIds);
                        }}
                      />
                    </Field>
                  </div>

                  <Field label="Page Access Token" hint="Generate a permanent access token in Meta Business Suite">
                    <input
                      type="password"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-all font-mono"
                      placeholder="EAAG..."
                      value={tenant.external_ids?.instagram_page_access_token || ''}
                      onChange={e => {
                        const newIds = { ...(tenant.external_ids || {}), instagram_page_access_token: e.target.value };
                        updateTenant('external_ids', newIds);
                      }}
                    />
                  </Field>
                </div>
              </Section>

              <Section icon={Facebook} title="Facebook Messenger Channel">
                <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 space-y-6 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-blue-500/5 to-transparent pointer-events-none"></div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-400">
                        <Facebook />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-slate-300">Facebook Messenger</h3>
                          <span className="text-[10px] bg-blue-600/20 text-blue-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Active Channel</span>
                        </div>
                        <p className="text-xs text-slate-500">Respond to messages sent directly to your Facebook Page</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={tenant.external_ids?.messenger_connected ?? false}
                        onChange={e => {
                          const newIds = { ...(tenant.external_ids || {}), messenger_connected: e.target.checked };
                          updateTenant('external_ids', newIds);
                        }}
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white"></div>
                    </label>
                  </div>

                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5 space-y-3">
                    <h4 className="text-sm font-bold text-blue-300 flex items-center gap-2">
                      <Globe size={16} /> Webhook Configuration
                    </h4>
                    <p className="text-xs text-blue-200/60 leading-relaxed">
                      Configure your Meta App's Webhook to send <code>messages</code> subscriptions to this callback URL.
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-400 truncate">
                        {`${window.location.origin.replace('5173', '8000')}/api/webhooks/messenger/${tenant.slug}/`}
                      </div>
                      <button 
                        onClick={() => copyToClipboard(`${window.location.origin.replace('5173', '8000')}/api/webhooks/messenger/${tenant.slug}/`)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-blue-400 transition-colors"
                        title="Copy Webhook URL"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Facebook Page ID" hint="From your Facebook Page Info section">
                      <input
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-all"
                        placeholder="10927..."
                        value={tenant.external_ids?.messenger_page_id || ''}
                        onChange={e => {
                          const newIds = { ...(tenant.external_ids || {}), messenger_page_id: e.target.value };
                          updateTenant('external_ids', newIds);
                        }}
                      />
                    </Field>
                    <Field label="Verify Token" hint="Match your Meta Developer webhook config">
                      <input
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-all font-mono"
                        placeholder="grownk_messenger_secret"
                        value={tenant.external_ids?.messenger_verify_token || ''}
                        onChange={e => {
                          const newIds = { ...(tenant.external_ids || {}), messenger_verify_token: e.target.value };
                          updateTenant('external_ids', newIds);
                        }}
                      />
                    </Field>
                  </div>

                  <Field label="Page Access Token" hint="Generate a permanent access token in Meta Business Suite">
                    <input
                      type="password"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-all font-mono"
                      placeholder="EAAG..."
                      value={tenant.external_ids?.messenger_page_access_token || ''}
                      onChange={e => {
                        const newIds = { ...(tenant.external_ids || {}), messenger_page_access_token: e.target.value };
                        updateTenant('external_ids', newIds);
                      }}
                    />
                  </Field>
                </div>
              </Section>
            </div>
          )}

          {activeTab === 'knowledge' && (
            <Section icon={Database} title="Knowledge Sources">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-400">The bot retrieves relevant chunks from these sources to answer customer questions.</p>
                <button 
                  onClick={() => setShowAddSource(true)}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                >
                  <Plus size={14} /> Add Source
                </button>
              </div>

              {showAddSource && (
                <div className="p-4 bg-slate-800/40 border border-blue-500/30 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Source Title" hint="e.g. Main Website, Pricing Table">
                      <input
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                        value={newSource.title}
                        onChange={e => setNewSource({...newSource, title: e.target.value})}
                      />
                    </Field>
                    <Field label="Source Type" hint="URL Scraping or PDF Document">
                      <select 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                        value={newSource.source_type}
                        onChange={e => setNewSource({...newSource, source_type: e.target.value})}
                      >
                        <option value="url">Website URL</option>
                        <option value="pdf">PDF Document</option>
                      </select>
                    </Field>

                    {newSource.source_type === 'url' && (
                      <div className="col-span-2">
                        <Field label="URL" hint="Public link to scrape">
                          <input
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                            placeholder="https://example.com"
                            value={newSource.url || ''}
                            onChange={e => setNewSource({...newSource, url: e.target.value})}
                          />
                        </Field>
                      </div>
                    )}
                    
                    {newSource.source_type === 'pdf' && (
                      <div className="col-span-2">
                        <Field label="PDF Document" hint="Upload a PDF file to train the bot">
                          <input
                            type="file"
                            accept="application/pdf"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-blue-500 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                            onChange={e => setNewSource({...newSource, uploaded_file: e.target.files[0]})}
                          />
                        </Field>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowAddSource(false)} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white">Cancel</button>
                    <button onClick={handleAddSource} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-xs font-bold">Add Source</button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {sources.length > 0 ? sources.map(s => (
                  <div key={s.id} className="p-4 bg-slate-900/50 border border-slate-700 rounded-xl flex items-center justify-between hover:border-slate-600 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-slate-800 rounded-lg">
                        <Globe size={18} className="text-blue-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{s.title}</h4>
                          {getStatusIcon(s.status)}
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{s.url}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Database size={10} /> {s.chunk_count} chunks indexed
                          </span>
                          {s.last_synced && (
                            <span className="text-[10px] text-slate-500">
                              Last synced {new Date(s.last_synced).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleSync(s.id)}
                        disabled={syncingId === s.id || s.status === 'syncing'}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all disabled:opacity-50"
                        title="Sync Now"
                      >
                        <RefreshCw size={16} className={syncingId === s.id || s.status === 'syncing' ? 'animate-spin' : ''} />
                      </button>
                      <button 
                        onClick={() => handleDeleteSource(s.id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="p-10 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2">
                    <Database className="text-slate-700" size={32} />
                    <p className="text-slate-600 text-sm font-medium">No sources added yet. Add a website to train your AI.</p>
                  </div>
                )}
              </div>
            </Section>
          )}

          {activeTab === 'branding' && (
            <Section icon={Palette} title="Widget Visual Stylist & Live Customizer">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
                
                {/* Control Panel (Left 7 Columns) */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Designer Color Presets Card */}
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-xl backdrop-blur-md">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-800/60">
                      <Sparkles className="text-amber-400" size={18} />
                      <h4 className="font-bold text-sm text-slate-200">Curated Designer Palettes</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { name: 'Sapphire Nebula', color: '#6366f1', desc: 'Space Blue' },
                        { name: 'Emerald Forest', color: '#10b981', desc: 'Vibrant Mint' },
                        { name: 'Sunset Glow', color: '#f43f5e', desc: 'Warm Rose' },
                        { name: 'Volt Cyberpunk', color: '#eab308', desc: 'Electric Yellow' },
                        { name: 'Royal Velvet', color: '#a855f7', desc: 'Plum Violet' },
                        { name: 'Midnight Cyan', color: '#06b6d4', desc: 'Ocean Slate' },
                      ].map(preset => {
                        const isActive = (tenant.widget_color || '#3B82F6').toLowerCase() === preset.color.toLowerCase();
                        return (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => updateTenant('widget_color', preset.color)}
                            className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                              isActive 
                              ? 'bg-slate-800/80 border-blue-500/50 shadow-md shadow-blue-500/5' 
                              : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
                            }`}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <span className="w-4 h-4 rounded-full border border-white/10 shadow-sm shrink-0" style={{ backgroundColor: preset.color }} />
                              <span className="text-xs font-bold text-slate-300 truncate">{preset.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 mt-1 font-medium">{preset.desc}</span>
                            {isActive && (
                              <div className="absolute right-2 bottom-2 w-3.5 h-3.5 rounded-full bg-blue-600 flex items-center justify-center shadow">
                                <Check className="text-white" size={9} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Accent Color Configurator */}
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-xl backdrop-blur-md">
                    <Field label="Custom Accent Color" hint="Pick a custom hex color matching your official corporate style guides.">
                      <div className="flex items-center gap-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-700/60 shrink-0">
                          <input
                            type="color"
                            className="absolute -inset-2 w-16 h-16 bg-transparent border-none cursor-pointer scale-125"
                            value={tenant.widget_color || '#3B82F6'}
                            onChange={e => updateTenant('widget_color', e.target.value)}
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <input
                            type="text"
                            maxLength={7}
                            className="bg-transparent border-none p-0 text-lg font-mono font-bold text-white focus:outline-none w-full tracking-wider"
                            value={tenant.widget_color || '#3B82F6'}
                            onChange={e => updateTenant('widget_color', e.target.value)}
                          />
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">HEX Color Value</p>
                        </div>
                      </div>
                    </Field>
                  </div>

                  {/* Theme Mode & Bubble Shape Selector */}
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-5 shadow-xl backdrop-blur-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Window Style Mode */}
                      <div className="space-y-2">
                        <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Window Theme</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'glass', label: 'Glass', icon: '❄️' },
                            { id: 'dark', label: 'Midnight', icon: '🌑' },
                            { id: 'light', label: 'Classic', icon: '☀️' },
                          ].map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setThemeMode(t.id)}
                              className={`py-2 px-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                                themeMode === t.id
                                ? 'bg-blue-600/10 border-blue-500/60 text-blue-400 font-bold shadow-md shadow-blue-500/5'
                                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <span className="text-base">{t.icon}</span>
                              <span className="text-[10px] tracking-wide">{t.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Bubble Shape Selection */}
                      <div className="space-y-2">
                        <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Launcher Bubble Shape</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'circle', label: 'Circular', shape: 'rounded-full w-5 h-5' },
                            { id: 'square', label: 'Rounded Sq', shape: 'rounded-lg w-5 h-5' },
                            { id: 'pill', label: 'Pill Chat', shape: 'rounded-2xl rounded-bl-sm w-6 h-4' },
                          ].map(s => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setWidgetShape(s.id)}
                              className={`py-2 px-3 rounded-xl border flex flex-col items-center gap-2.5 transition-all ${
                                widgetShape === s.id
                                ? 'bg-blue-600/10 border-blue-500/60 text-blue-400 font-bold shadow-md shadow-blue-500/5'
                                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <div className={`border-2 ${widgetShape === s.id ? 'border-blue-400 bg-blue-500/30' : 'border-slate-500 bg-slate-800/40'} ${s.shape}`} />
                              <span className="text-[10px] tracking-wide">{s.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Positioning & Enabled Switch Card */}
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-xl backdrop-blur-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                      
                      <Field label="Widget Position Placement" hint="Choose which corner to dock in.">
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'bottom-right', label: 'Dock Right' },
                            { id: 'bottom-left', label: 'Dock Left' },
                          ].map(pos => {
                            const isSel = (tenant.widget_position || 'bottom-right') === pos.id;
                            return (
                              <button
                                key={pos.id}
                                type="button"
                                onClick={() => updateTenant('widget_position', pos.id)}
                                className={`py-2 px-3 rounded-xl border text-center transition-all text-xs font-bold ${
                                  isSel
                                  ? 'bg-blue-600/10 border-blue-500/60 text-blue-400 shadow-md shadow-blue-500/5'
                                  : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400'
                                }`}
                              >
                                {pos.label}
                              </button>
                            );
                          })}
                        </div>
                      </Field>

                      <div className="space-y-2">
                        <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Widget Visibility State</label>
                        <button
                          type="button"
                          onClick={() => updateTenant('web_widget_enabled', !tenant.web_widget_enabled)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                            tenant.web_widget_enabled
                            ? 'bg-green-500/5 border-green-500/30 text-green-400'
                            : 'bg-slate-950/40 border-slate-800 text-slate-500'
                          }`}
                        >
                          <div className="text-left">
                            <span className="text-xs font-bold block">Status: {tenant.web_widget_enabled ? 'Active & Live' : 'Disabled'}</span>
                            <span className="text-[10px] opacity-75">{tenant.web_widget_enabled ? 'Visibly loaded on pages' : 'Hidden from site code'}</span>
                          </div>
                          <div className={`w-9 h-5 rounded-full p-0.5 transition-all shrink-0 ${tenant.web_widget_enabled ? 'bg-green-600' : 'bg-slate-800'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full transition-all ${tenant.web_widget_enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                          </div>
                        </button>
                      </div>

                    </div>
                  </div>

                </div>

                {/* Smartphone Customizer Preview (Right 5 Columns) */}
                <div className="lg:col-span-5 flex flex-col items-center">
                  <div className="w-full max-w-[320px] bg-slate-950 rounded-[44px] border-[10px] border-slate-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden relative aspect-[9/19] flex flex-col shrink-0">
                    
                    {/* iPhone Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-50 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-slate-950 border border-slate-800/80 mr-2" />
                      <div className="w-12 h-1.5 rounded-full bg-slate-800" />
                    </div>

                    {/* iPhone Status Bar */}
                    <div className="h-10 pt-2 px-6 flex justify-between items-center text-[10px] text-slate-400 font-bold z-40 select-none bg-slate-950 shrink-0">
                      <span>9:41 AM</span>
                      <div className="flex items-center gap-1.5">
                        <span>LTE</span>
                        <div className="w-4 h-2.5 rounded-sm border border-slate-400/60 p-0.5 flex items-center">
                          <div className="w-full h-full bg-slate-400 rounded-2xs" />
                        </div>
                      </div>
                    </div>

                    {/* Simulated Widget Window (Theme Dependent) */}
                    <div className={`flex-1 flex flex-col overflow-hidden relative ${
                      themeMode === 'dark' 
                      ? 'bg-slate-950 text-slate-100' 
                      : themeMode === 'light' 
                        ? 'bg-slate-50 text-slate-900' 
                        : 'bg-gradient-to-br from-slate-900 to-slate-950 text-slate-200'
                    }`}>
                      
                      {/* Glassmorphism subtle overlay */}
                      {themeMode === 'glass' && (
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-2xl -z-10" />
                      )}

                      {/* Header bar */}
                      <div 
                        className="p-4 pt-6 flex items-center gap-3 text-white transition-colors duration-500 shadow-md relative shrink-0 animate-in fade-in"
                        style={{ backgroundColor: tenant.widget_color || '#3b82f6' }}
                      >
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm border border-white/10 shadow-inner">
                            {tenant.business_name ? tenant.business_name[0].toUpperCase() : 'G'}
                          </div>
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full animate-pulse" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold leading-tight truncate">{tenant.business_name || 'My AI Bot'}</h4>
                          <p className="text-[9px] opacity-80 leading-none truncate mt-0.5">{tenant.tagline || 'Online & Ready'}</p>
                        </div>
                      </div>

                      {/* Chat Messages Log */}
                      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 flex flex-col font-sans select-none scrollbar-none">
                        {previewMessages.map(msg => {
                          const isBot = msg.sender === 'bot';
                          return (
                            <div 
                              key={msg.id}
                              className={`max-w-[85%] text-[11px] px-3 py-2 rounded-2xl shadow-sm leading-relaxed ${
                                isBot 
                                ? themeMode === 'light'
                                  ? 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm self-start'
                                  : 'bg-slate-900/80 border border-slate-800 text-slate-300 rounded-bl-sm self-start'
                                : 'text-white rounded-br-sm self-end'
                              } animate-in fade-in slide-in-from-bottom-2 duration-300`}
                              style={!isBot ? { backgroundColor: tenant.widget_color || '#3b82f6' } : {}}
                            >
                              {msg.text}
                            </div>
                          );
                        })}

                        {/* Live Bouncing Typing Indicator Preview */}
                        {previewTyping && (
                          <div className={`typing-indicator animate-in fade-in duration-200 self-start ${
                            themeMode === 'light' ? 'bg-white border border-slate-200' : 'bg-slate-900/80 border border-slate-800'
                          }`}>
                            <div className="typing-dot" style={{ animationDelay: '0s' }} />
                            <div className="typing-dot" style={{ animationDelay: '0.2s' }} />
                            <div className="typing-dot" style={{ animationDelay: '0.4s' }} />
                          </div>
                        )}
                      </div>

                      {/* Live Input Field inside Preview smartphone */}
                      <form 
                        onSubmit={e => {
                          e.preventDefault();
                          handleSendPreviewMessage(previewInput);
                        }}
                        className={`p-2.5 flex gap-2 border-t shrink-0 ${
                          themeMode === 'light' ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800/80'
                        }`}
                      >
                        <input 
                          type="text" 
                          placeholder="Ask a preview question..." 
                          value={previewInput}
                          onChange={e => setPreviewInput(e.target.value)}
                          className={`flex-1 rounded-full px-3.5 py-2 text-[10px] outline-none transition-all ${
                            themeMode === 'light'
                            ? 'bg-slate-100 border border-slate-200 text-slate-800 focus:bg-white focus:border-blue-500'
                            : 'bg-slate-900 border border-slate-800 text-white focus:bg-slate-900/60 focus:border-blue-500'
                          }`}
                        />
                        <button 
                          type="submit"
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 hover:scale-105 active:scale-95 transition-transform"
                          style={{ backgroundColor: tenant.widget_color || '#3b82f6' }}
                        >
                          <Send size={10} />
                        </button>
                      </form>

                    </div>

                    {/* iPhone Home Indicator bar */}
                    <div className="h-6 bg-slate-950 flex items-center justify-center shrink-0 select-none">
                      <div className="w-28 h-1 bg-slate-800 rounded-full" />
                    </div>

                  </div>

                              {/* Reactive floating launcher preview */}
                  {tenant.web_widget_enabled && (
                    <div className="mt-6 flex items-center gap-3 bg-slate-900/40 px-5 py-3 rounded-2xl border border-slate-800/80 backdrop-blur-md animate-in fade-in duration-300">
                      <div 
                        className={`flex items-center justify-center text-white shadow-xl transition-transform hover:scale-110 duration-300 ${
                          widgetShape === 'circle' 
                          ? 'rounded-full w-11 h-11' 
                          : widgetShape === 'square'
                            ? 'rounded-xl w-11 h-11'
                            : 'rounded-2xl rounded-bl-sm w-12 h-11'
                        }`}
                        style={{ backgroundColor: tenant.widget_color || '#3b82f6' }}
                      >
                        <MessageCircle size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">LAUNCHER SHAPE</p>
                        <p className="text-xs text-slate-200 font-bold capitalize mt-1 leading-none">{widgetShape} Bubble</p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </Section>
          )}

          {activeTab === 'embed' && (
            <Section icon={ExternalLink} title="Install on your Website">
              <div className="space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-blue-300 mb-2">Embed Code</h3>
                  <p className="text-sm text-blue-200/60 mb-6">
                    Copy and paste this snippet into your website's <code>&lt;head&gt;</code> or just before the closing <code>&lt;/body&gt;</code> tag to show the chat widget on all pages.
                  </p>
                  
                  <div className="relative group">
                    <pre className="bg-slate-950 border border-slate-800 rounded-xl p-5 overflow-x-auto text-[13px] text-blue-400 font-mono leading-relaxed">
{`<!-- GrownK AI Chat Widget -->
<script 
  src="${window.location.origin.replace('5173', '8000')}/static/widget/grownk-widget.js" 
  data-tenant="${tenant.slug}"
  data-api="${window.location.origin.replace('5173', '8000')}"
  async>
</script>`}
                    </pre>
                    <button 
                      onClick={() => copyToClipboard(`<!-- GrownK AI Chat Widget -->\n<script \n  src="${window.location.origin.replace('5173', '8000')}/static/widget/grownk-widget.js" \n  data-tenant="${tenant.slug}"\n  data-api="${window.location.origin.replace('5173', '8000')}"\n  async>\n</script>`)}
                      className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl">
                      <h4 className="font-bold mb-2 flex items-center gap-2"><Globe size={16} className="text-blue-400" /> Platform Isolation</h4>
                      <p className="text-xs text-slate-500">The widget uses a Shadow DOM to ensure your website's CSS never leaks into the chat, and vice-versa.</p>
                   </div>
                   <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl">
                      <h4 className="font-bold mb-2 flex items-center gap-2"><ShieldCheck size={16} className="text-green-400" /> Secure Transport</h4>
                      <p className="text-xs text-slate-500">All messages are encrypted and routed through our secure multi-tenant backend.</p>
                   </div>
                </div>
              </div>
            </Section>
          )}

          {activeTab === 'team' && (
            <Section icon={Users} title="Workspace Team Members">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2 text-slate-300 mb-1">
                    <UserPlus size={16} />
                    <span className="text-sm font-bold">Invite Member</span>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                       <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                       <input 
                         className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-blue-500 outline-none"
                         placeholder="teammate@company.com"
                         value={inviteEmail}
                         onChange={e => setInviteEmail(e.target.value)}
                       />
                    </div>
                    <select 
                      className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none"
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value)}
                    >
                      <option value="agent">Agent</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button 
                      onClick={handleInvite}
                      disabled={userRole !== 'admin'}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 px-6 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                    >
                      Add to Team
                    </button>
                  </div>
                  {userRole !== 'admin' && <p className="text-[10px] text-red-400 italic flex items-center gap-1"><AlertCircle size={10}/> Only admins can invite new members.</p>}
                </div>
              </div>

              <div className="space-y-3">
                {members.map(m => (
                  <div key={m.id} className="p-4 bg-slate-900/50 border border-slate-700 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                        <span className="text-blue-400 font-bold uppercase">{m.user.username[0]}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{m.user.username}</h4>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${m.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-400'}`}>
                            {m.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{m.user.email}</p>
                      </div>
                    </div>
                    
                    {userRole === 'admin' && m.role !== 'admin' && (
                      <button 
                        onClick={() => handleRemoveMember(m.id)}
                        className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                        title="Remove Member"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    {m.role === 'admin' && <Shield size={16} className="text-slate-700 mr-2" />}
                  </div>
                ))}
              </div>
            </Section>
          )}

        </div>
      </main>
    </div>
  );
};

export default BotTraining;
