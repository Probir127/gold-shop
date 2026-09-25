import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import {
  getProductsAdmin, getCategories,
  createCategoryAdmin, updateCategoryAdmin, deleteCategoryAdmin,
  createProductAdmin, updateProductAdmin, deleteProductAdmin
} from '../api';
import toast from '../components/Toast';
import { queryClient } from '../../queryClient';
import {
  Diamond, Plus, Search, Trash2, Edit2, CheckCircle2, XCircle,
  Image as ImageIcon, ToggleLeft, ToggleRight, Tag, Package,
  Filter, AlertTriangle, X, Upload, Star, Sparkles, RefreshCw
} from 'lucide-react';

/* ── Confirmation Dialog ──────────────────────────────────────────── */
const ConfirmDialog = ({ open, title, message, onConfirm, onCancel, danger = true }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className={`h-1 w-full ${danger ? 'bg-rose-500' : 'bg-[#d4af37]'}`} />
        <div className="p-6">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${danger ? 'bg-rose-500/15' : 'bg-amber-500/15'}`}>
            <AlertTriangle size={20} className={danger ? 'text-rose-400' : 'text-amber-400'} />
          </div>
          <h3 className="text-white font-bold text-base mb-1">{title}</h3>
          <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl bg-white/8 hover:bg-white/12 text-slate-300 text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
                danger
                  ? 'bg-rose-500 hover:bg-rose-600 text-white'
                  : 'bg-[#d4af37] hover:brightness-110 text-black'
              }`}
            >
              {danger ? 'Yes, Delete' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Stock Toggle Button ─────────────────────────────────────────── */
const StockToggle = ({ productId, inStock, onToggled }) => {
  const [toggling, setToggling] = useState(false);
  const toggle = async () => {
    setToggling(true);
    try {
      const fd = new FormData();
      fd.append('in_stock', !inStock);
      await updateProductAdmin(productId, fd);
      onToggled();
      toast.success(inStock ? 'Marked as Out of Stock' : 'Marked as In Stock');
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to update stock';
      toast.error(msg);
    } finally {
      setToggling(false);
    }
  };
  return (
    <button
      onClick={toggle}
      disabled={toggling}
      title="Toggle stock status"
      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition font-medium ${
        inStock
          ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
          : 'text-rose-400 bg-rose-500/10 hover:bg-rose-500/20'
      } ${toggling ? 'opacity-50 cursor-wait' : ''}`}
    >
      {inStock ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
      {inStock ? 'In Stock' : 'No Stock'}
    </button>
  );
};

/* ── Image Preview ───────────────────────────────────────────────── */
const ImagePreview = ({ file, currentUrl }) => {
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const src = preview || currentUrl;
  if (!src) return (
    <div className="w-full h-32 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-slate-500 gap-2">
      <ImageIcon size={24} />
      <span className="text-xs">No image selected</span>
    </div>
  );
  return (
    <div className="relative w-full h-32 rounded-xl overflow-hidden border border-white/10">
      <img src={src} alt="preview" className="w-full h-full object-cover" />
      {preview && (
        <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">New</span>
      )}
    </div>
  );
};

/* ── Main Component ──────────────────────────────────────────────── */
const Products = () => {
  const [products, setProducts]           = useState([]);
  const [categories, setCategories]       = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStock, setFilterStock]     = useState('all');
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitting, setSubmitting]       = useState(false);
  const [selected, setSelected]           = useState(new Set());
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null, name: '' });
  const [bulkConfirm, setBulkConfirm]     = useState(false);
  const [categoryDraft, setCategoryDraft] = useState('');
  const [categoryConfirm, setCategoryConfirm] = useState({ open: false, id: null, name: '' });
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    name: '', category: '', description: '', weight: '',
    purity: '22K', making_charge_per_gram: '500',
    in_stock: true, is_bestseller: false, is_new: false, image: null
  });

  /* fetch */
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([getProductsAdmin(), getCategories()]);
      setProducts(pRes.data.results || pRes.data || []);
      setCategories(cRes.data.results || cRes.data || []);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to load products';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  /* open modals */
  const openCreate = () => {
    setEditingProduct(null);
    setForm({
      name: '', category: categories[0]?.id ? String(categories[0].id) : '',
      description: '', weight: '', purity: '22K',
      making_charge_per_gram: '500', in_stock: true, is_bestseller: false,
      is_new: false, image: null
    });
    setIsModalOpen(true);
  };

  const openEdit = (p) => {
    setEditingProduct(p);
    setForm({
      name: p.name || '', category: p.category ? String(p.category) : '',
      description: p.description || '', weight: p.weight || '',
      purity: p.purity || '22K',
      making_charge_per_gram: String(p.making_charge_per_gram || '500'),
      in_stock: p.in_stock, is_bestseller: p.is_bestseller, is_new: p.is_new,
      image: null
    });
    setIsModalOpen(true);
  };

  /* save */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category) { toast.error('Please select a category'); return; }
    setSubmitting(true);
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('category', form.category);
    fd.append('description', form.description);
    fd.append('weight', form.weight);
    fd.append('purity', form.purity);
    fd.append('making_charge_per_gram', form.making_charge_per_gram);
    fd.append('in_stock', form.in_stock);
    fd.append('is_bestseller', form.is_bestseller);
    fd.append('is_new', form.is_new);
    if (form.image) fd.append('image', form.image);

    try {
      if (editingProduct) {
        await updateProductAdmin(editingProduct.id, fd);
        toast.success(`✏️ Updated "${form.name}"`);
      } else {
        await createProductAdmin(fd);
        toast.success(`✨ Created "${form.name}"`);
      }
      setIsModalOpen(false);
      fetchProducts();
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail || err.response?.data?.message
        || Object.values(err.response?.data || {}).flat().join(', ')
        || 'Failed to save product';
      if (status === 403 || status === 401) {
        toast.error('⛔ Permission denied. Make sure you are logged in as admin or shara_gold.');
      } else {
        toast.error(detail);
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* delete single */
  const confirmDelete = (id, name) => setConfirmDialog({ open: true, id, name });
  const handleDelete = async () => {
    const { id, name } = confirmDialog;
    setConfirmDialog({ open: false, id: null, name: '' });
    try {
      await deleteProductAdmin(id);
      toast.success(`🗑️ Deleted "${name}"`);
      setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
      fetchProducts();
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (err) {
      const status = err.response?.status;
      if (status === 403 || status === 401) {
        toast.error('⛔ Permission denied. Log in as admin or shara_gold to delete products.');
      } else {
        toast.error(err.response?.data?.detail || 'Failed to delete product');
      }
    }
  };

  /* bulk delete */
  const handleBulkDelete = async () => {
    setBulkConfirm(false);
    let failed = 0;
    for (const id of selected) {
      try {
        await deleteProductAdmin(id);
      } catch {
        failed++;
      }
    }
    const deleted = selected.size - failed;
    if (deleted > 0) toast.success(`🗑️ Deleted ${deleted} item${deleted > 1 ? 's' : ''}`);
    if (failed > 0) toast.error(`Failed to delete ${failed} item${failed > 1 ? 's' : ''} — check permissions`);
    setSelected(new Set());
    fetchProducts();
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  /* selection */
  const toggleSelect = (id) => setSelected(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });
  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(p => p.id)));
  };

  const handleCategoryCreate = async (e) => {
    e.preventDefault();
    const name = categoryDraft.trim();
    if (!name) {
      toast.error('Category name is required');
      return;
    }

    try {
      await createCategoryAdmin({ name });
      setCategoryDraft('');
      fetchProducts();
      toast.success(`✅ Added category "${name}"`);
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || Object.values(err.response?.data || {}).flat().join(', ') || 'Failed to add category';
      toast.error(msg);
    }
  };

  const handleCategoryDelete = async () => {
    const { id, name } = categoryConfirm;
    if (!id) return;
    setCategoryConfirm({ open: false, id: null, name: '' });

    try {
      await deleteCategoryAdmin(id);
      if (filterCategory === String(id)) setFilterCategory('all');
      fetchProducts();
      toast.success(`🗑️ Removed category "${name}"`);
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to delete category';
      toast.error(msg);
    }
  };

  const safeCategoryName = (categoryId) => {
    const match = categories.find((cat) => String(cat.id) === String(categoryId));
    return match?.name || 'Uncategorized';
  };

  /* filter */
  const filtered = products.filter(p => {
    const matchSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.category_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.purity?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === 'all' || String(p.category) === filterCategory;
    const matchStock = filterStock === 'all' || (filterStock === 'in' ? p.in_stock : !p.in_stock);
    return matchSearch && matchCat && matchStock;
  });

  /* stats */
  const totalInStock = products.filter(p => p.in_stock).length;
  const totalBestsellers = products.filter(p => p.is_bestseller).length;

  return (
    <div className="admin-products flex bg-[#09090b] text-slate-100 min-h-screen">
      <Sidebar />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-h-screen">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-6 border-b border-white/5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#d4af37] text-xs font-semibold uppercase tracking-wider mb-1">
              <Diamond size={13} /> Catalog Management
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Jewelry Catalog</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {products.length} items &nbsp;·&nbsp;
              <span className="text-emerald-400">{totalInStock} in stock</span>
              &nbsp;·&nbsp;
              <span className="text-[#d4af37]">{totalBestsellers} bestsellers</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchProducts}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={openCreate}
              className="bg-gradient-to-r from-[#d4af37] to-[#aa8c2c] text-black font-bold px-4 py-2.5 rounded-xl text-sm hover:brightness-110 flex items-center gap-2 shadow-lg"
            >
              <Plus size={16} /> Add New Jewelry
            </button>
          </div>
        </div>

        {/* ── Filters Row ── */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, category, or purity…"
                className="w-full bg-[#18181b] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#d4af37] transition"
              />
            </div>
            {/* Category filter */}
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="bg-[#18181b] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#d4af37] min-w-[180px]"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
            {/* Stock filter */}
            <select
              value={filterStock}
              onChange={e => setFilterStock(e.target.value)}
              className="bg-[#18181b] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#d4af37] min-w-[140px]"
            >
              <option value="all">All Stock</option>
              <option value="in">In Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>

          <div className="bg-[#121215] border border-white/10 rounded-2xl p-3">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Product Types</p>
                <p className="text-sm text-slate-300">Manage product categories used in filtering</p>
              </div>
            </div>

            <form onSubmit={handleCategoryCreate} className="flex flex-col sm:flex-row gap-2">
              <input
                value={categoryDraft}
                onChange={(e) => setCategoryDraft(e.target.value)}
                placeholder="Add product category type"
                className="flex-1 bg-[#18181b] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#d4af37]"
              />
              <button
                type="submit"
                className="bg-[#d4af37] hover:brightness-110 text-black font-bold px-4 py-2.5 rounded-xl text-sm transition"
              >
                Add Type
              </button>
            </form>

            <div className="mt-3 flex flex-wrap gap-2">
              {categories.length === 0 ? (
                <span className="text-sm text-slate-500">No categories yet.</span>
              ) : (
                categories.map((cat) => (
                  <span
                    key={cat.id}
                    className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/40 bg-[#d4af37]/10 px-2.5 py-1 text-xs text-[#f2d67a]"
                  >
                    {cat.name}
                    <button
                      type="button"
                      onClick={() => setCategoryConfirm({ open: true, id: cat.id, name: cat.name })}
                      className="text-rose-300 hover:text-rose-200 transition"
                      aria-label={`Delete category ${cat.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Bulk Action Bar ── */}
        {selected.size > 0 && (
          <div className="flex items-center justify-between bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 mb-4">
            <span className="text-rose-300 text-sm font-medium">
              {selected.size} item{selected.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-3">
              <button onClick={() => setSelected(new Set())} className="text-slate-400 hover:text-white text-xs transition">
                Clear
              </button>
              <button
                onClick={() => setBulkConfirm(true)}
                className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
              >
                <Trash2 size={12} /> Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* ── Products Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-[#121215] rounded-2xl h-72 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Package size={40} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400 font-medium">No jewelry items found</p>
            <p className="text-slate-600 text-sm mt-1">Try adjusting your filters or add a new item</p>
            <button onClick={openCreate} className="mt-4 bg-[#d4af37] text-black text-sm font-bold px-4 py-2 rounded-xl hover:brightness-110 transition">
              Add First Item
            </button>
          </div>
        ) : (
          <>
            {/* Select-all bar */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <input
                type="checkbox"
                checked={selected.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                className="accent-[#d4af37] w-4 h-4 rounded cursor-pointer"
              />
              <span className="text-slate-500 text-xs">Select all ({filtered.length})</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map(p => (
                <div
                  key={p.id}
                  className={`bg-[#121215] border rounded-2xl overflow-hidden shadow-lg hover:border-[#d4af37]/40 transition group flex flex-col ${
                    selected.has(p.id) ? 'border-[#d4af37]/50 ring-1 ring-[#d4af37]/30' : 'border-white/5'
                  }`}
                >
                  {/* Image area */}
                  <div className="relative h-44 bg-[#18181e] flex items-center justify-center overflow-hidden">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    ) : (
                      <div className="text-slate-600 flex flex-col items-center gap-1">
                        <ImageIcon size={28} /><span className="text-xs">No image</span>
                      </div>
                    )}
                    {/* Select checkbox overlay */}
                    <div className="absolute top-2.5 left-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="accent-[#d4af37] w-4 h-4 cursor-pointer"
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                    {/* Purity badge */}
                    <span className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-sm border border-white/10 text-white font-mono text-[11px] px-2 py-0.5 rounded-full font-bold">
                      {p.purity}
                    </span>
                    {/* Bestseller */}
                    {p.is_bestseller && (
                      <span className="absolute bottom-2 left-2 bg-[#d4af37] text-black text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                        <Star size={9} fill="currentColor" /> Best
                      </span>
                    )}
                    {p.is_new && (
                      <span className="absolute bottom-2 right-2 bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                        <Sparkles size={9} /> New
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
                        {safeCategoryName(p.category) || 'Jewelry'}
                      </span>
                      <h3 className="font-semibold text-white text-sm mt-0.5 leading-snug line-clamp-2" title={p.name}>
                        {p.name}
                      </h3>
                      <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
                        <span>Weight: <strong className="text-slate-200">{p.weight}g</strong></span>
                        <span>Making: <strong className="text-slate-200">৳{p.making_charge_per_gram}/g</strong></span>
                      </div>
                      <div className="mt-2 text-base font-bold text-[#d4af37]">
                        ৳{Number(p.current_price || 0).toLocaleString()}
                        <span className="text-[10px] text-slate-500 font-normal ml-1">(live)</span>
                      </div>
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/5">
                      <StockToggle productId={p.id} inStock={p.in_stock} onToggled={fetchProducts} />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-[#d4af37]/20 text-slate-400 hover:text-[#d4af37] transition"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => confirmDelete(p.id, p.name)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 transition"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* ── Add / Edit Modal ─────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141418] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Title bar */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#1a1a20]">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Diamond size={15} className="text-[#d4af37]" />
                {editingProduct ? 'Edit Jewelry Item' : 'Add New Handcrafted Piece'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
              {/* Image preview */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                  Product Photo
                </label>
                <ImagePreview file={form.image} currentUrl={editingProduct?.image} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-2 w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2 text-sm text-slate-300 hover:text-white transition"
                >
                  <Upload size={14} />
                  {form.image ? 'Change Photo' : editingProduct?.image ? 'Replace Photo' : 'Upload Photo'}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => setForm({ ...form, image: e.target.files[0] })}
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                  Piece Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g. Royal Bridal Choker"
                  className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#d4af37] transition"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Short description shown on the product page…"
                  rows={2}
                  className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#d4af37] transition resize-none"
                />
              </div>

              {/* Purity + Weight */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                    Purity <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={form.purity}
                    onChange={e => setForm({ ...form, purity: e.target.value })}
                    className="w-full bg-[#18181b] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#d4af37]"
                  >
                    <option value="22K">22 Karat</option>
                    <option value="21K">21 Karat</option>
                    <option value="18K">18 Karat</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                    Weight (g) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number" step="0.01" min="0.01"
                    value={form.weight}
                    onChange={e => setForm({ ...form, weight: e.target.value })}
                    required placeholder="e.g. 2.50"
                    className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#d4af37] transition"
                  />
                </div>
              </div>

              {/* Category + Making charge */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                    Category <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-[#18181b] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#d4af37]"
                  >
                    <option value="">Select category</option>
                    {categories.map(c => (
                      <option key={c.id} value={String(c.id)}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                    Making Charge/g (৳) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number" min="0"
                    value={form.making_charge_per_gram}
                    onChange={e => setForm({ ...form, making_charge_per_gram: e.target.value })}
                    required
                    className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#d4af37] transition"
                  />
                </div>
              </div>

              {/* Flags */}
              <div className="flex flex-wrap gap-4 pt-1">
                {[
                  { key: 'in_stock', label: 'In Stock', color: 'text-emerald-400' },
                  { key: 'is_bestseller', label: '⭐ Bestseller', color: 'text-amber-400' },
                  { key: 'is_new', label: '✨ New Arrival', color: 'text-indigo-400' },
                ].map(({ key, label, color }) => (
                  <label key={key} className={`flex items-center gap-2 text-xs cursor-pointer ${color}`}>
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.checked })}
                      className="rounded accent-[#d4af37] w-4 h-4"
                    />
                    {label}
                  </label>
                ))}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/8 hover:bg-white/12 text-slate-300 text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa8c2c] text-black font-bold text-sm hover:brightness-110 transition disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : editingProduct ? 'Update Piece' : 'Save Piece'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Delete (single) ── */}
      <ConfirmDialog
        open={confirmDialog.open}
        title="Delete Jewelry Item"
        message={`Are you sure you want to permanently delete "${confirmDialog.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDialog({ open: false, id: null, name: '' })}
      />

      {/* ── Confirm Bulk Delete ── */}
      <ConfirmDialog
        open={bulkConfirm}
        title={`Delete ${selected.size} Items`}
        message={`Permanently delete ${selected.size} selected jewelry item${selected.size > 1 ? 's' : ''}? This cannot be undone.`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkConfirm(false)}
      />

      <ConfirmDialog
        open={categoryConfirm.open}
        title="Delete Category"
        message={`This will remove "${categoryConfirm.name}" from the product type filter. Products in this category may need reassigning. Continue?`}
        onConfirm={handleCategoryDelete}
        onCancel={() => setCategoryConfirm({ open: false, id: null, name: '' })}
      />
    </div>
  );
};

export default Products;
