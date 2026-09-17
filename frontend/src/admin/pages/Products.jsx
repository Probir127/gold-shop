import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getProductsAdmin, getCategories, createProductAdmin, updateProductAdmin, deleteProductAdmin } from '../api';
import toast from '../components/Toast';
import { queryClient } from '../../queryClient';
import { Diamond, Plus, Search, Trash2, Edit2, CheckCircle2, XCircle, Image as ImageIcon } from 'lucide-react';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: '',
    category: '',
    description: '',
    weight: '',
    purity: '22K',
    making_charge_per_gram: '500',
    in_stock: true,
    is_bestseller: false,
    is_new: false,
    image: null
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const [productsRes, categoriesRes] = await Promise.all([getProductsAdmin(), getCategories()]);
      setProducts(productsRes.data.results || productsRes.data || []);
      setCategories(categoriesRes.data.results || categoriesRes.data || []);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setForm({
      name: '',
      category: categories[0]?.id ? String(categories[0].id) : '',
      description: '',
      weight: '',
      purity: '22K',
      making_charge_per_gram: '500',
      in_stock: true,
      is_bestseller: false,
      is_new: false,
      image: null
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    setForm({
      name: p.name || '',
      category: p.category ? String(p.category) : '',
      description: p.description || '',
      weight: p.weight || '',
      purity: p.purity || '22K',
      making_charge_per_gram: String(p.making_charge_per_gram || '500'),
      in_stock: p.in_stock,
      is_bestseller: p.is_bestseller,
      is_new: p.is_new,
      image: null
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category) {
      toast.error('Select a valid product category.');
      return;
    }
    setSubmitting(true);

    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('category', form.category);
    formData.append('description', form.description);
    formData.append('weight', form.weight);
    formData.append('purity', form.purity);
    formData.append('making_charge_per_gram', form.making_charge_per_gram);
    formData.append('in_stock', form.in_stock);
    formData.append('is_bestseller', form.is_bestseller);
    formData.append('is_new', form.is_new);

    if (form.image) {
      formData.append('image', form.image);
    }

    try {
      if (editingProduct) {
        await updateProductAdmin(editingProduct.id, formData);
        toast.success(`Updated ${form.name}`);
      } else {
        await createProductAdmin(formData);
        toast.success(`Created product ${form.name}`);
      }
      setIsModalOpen(false);
      fetchProducts();
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (err) {
      toast.error('Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await deleteProductAdmin(id);
      toast.success(`Deleted ${name}`);
      fetchProducts();
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.category_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.purity?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-products flex bg-[#09090b] text-slate-100 min-h-screen">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 text-[#d4af37] text-xs font-semibold uppercase tracking-wider mb-1">
              <Diamond size={14} /> Catalog Management
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Jewelry Catalog</h1>
            <p className="text-slate-400 text-sm">Add handcrafted jewelry, manage purity karats, weights, and live calculating charges</p>
          </div>

          <button
            onClick={openCreateModal}
            className="bg-gradient-to-r from-[#d4af37] to-[#aa8c2c] text-black font-bold px-4 py-2.5 rounded-xl text-sm transition shadow-lg hover:brightness-110 flex items-center gap-2"
          >
            <Plus size={16} /> Add New Jewelry
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jewelry by name, category, or purity..."
            className="w-full bg-[#18181b] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#d4af37]"
          />
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-16 text-slate-500">Loading jewelry catalog...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-16 text-slate-500">No jewelry items found.</div>
          ) : (
            filteredProducts.map(p => (
              <div key={p.id} className="bg-[#121215] border border-white/5 rounded-2xl overflow-hidden shadow-lg hover:border-[#d4af37]/30 transition group flex flex-col">
                {/* Image */}
                <div className="relative h-48 bg-[#18181e] flex items-center justify-center overflow-hidden">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  ) : (
                    <div className="text-slate-600 flex flex-col items-center gap-1">
                      <ImageIcon size={32} />
                      <span className="text-xs">No image uploaded</span>
                    </div>
                  )}
                  <span className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm border border-white/10 text-white font-mono text-[11px] px-2.5 py-0.5 rounded-full font-bold">
                    {p.purity}
                  </span>
                  {p.is_bestseller && (
                    <span className="absolute top-3 right-3 bg-[#d4af37] text-black text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Bestseller
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">{p.category_name || 'Jewelry'}</span>
                    <h3 className="font-semibold text-white text-base mt-0.5 truncate">{p.name}</h3>
                    <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
                      <span>Weight: <strong className="text-slate-200">{p.weight}g</strong></span>
                      <span>Making: <strong className="text-slate-200">৳{p.making_charge_per_gram}/g</strong></span>
                    </div>
                    <div className="mt-3 text-lg font-bold text-[#d4af37]">
                      ৳{Number(p.current_price || 0).toLocaleString()}
                      <span className="text-[10px] text-slate-400 font-normal ml-1">(live calc)</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 mt-3 border-t border-white/5">
                    <span className={`text-xs flex items-center gap-1 ${p.in_stock ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {p.in_stock ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                      {p.in_stock ? 'In Stock' : 'Out of Stock'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                        title="Edit Item"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                        title="Delete Item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create / Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#141418] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#1a1a20]">
                <h3 className="font-bold text-white text-base">
                  {editingProduct ? 'Edit Jewelry Item' : 'Add New Handcrafted Piece'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Piece Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="e.g. Royal Bridal Choker"
                    className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Purity Karat</label>
                    <select
                      value={form.purity}
                      onChange={(e) => setForm({ ...form, purity: e.target.value })}
                      className="w-full bg-[#18181b] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37]"
                    >
                      <option value="22K">22 Karat (Bridal/Classic)</option>
                      <option value="21K">21 Karat (Everyday)</option>
                      <option value="18K">18 Karat (Diamond/Modern)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Weight (grams)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.weight}
                      onChange={(e) => setForm({ ...form, weight: e.target.value })}
                      required
                      placeholder="e.g. 5.50"
                      className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full bg-[#18181b] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37]"
                    >
                      <option value="">Select category</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Making Charge/gm</label>
                    <input
                      type="number"
                      value={form.making_charge_per_gram}
                      onChange={(e) => setForm({ ...form, making_charge_per_gram: e.target.value })}
                      required
                      className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Product Photograph</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setForm({ ...form, image: e.target.files[0] })}
                    className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/15 cursor-pointer"
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.in_stock}
                      onChange={(e) => setForm({ ...form, in_stock: e.target.checked })}
                      className="rounded accent-[#d4af37]"
                    />
                    Available in Stock
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_bestseller}
                      onChange={(e) => setForm({ ...form, is_bestseller: e.target.checked })}
                      className="rounded accent-[#d4af37]"
                    />
                    Featured Bestseller
                  </label>
                </div>

                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa8c2c] text-black font-bold text-sm hover:brightness-110 transition disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : editingProduct ? 'Update Piece' : 'Save Piece'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Products;
