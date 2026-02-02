import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package, Plus, Edit2, Trash2, Save, X,
    DollarSign, Calendar, Percent, Shield,
    Activity, AlertCircle, CheckCircle, Smartphone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import GlassCard from '../components/ui/GlassCard';
import AnimatedButton from '../components/ui/AnimatedButton';

const inputClass = "w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black uppercase tracking-tight placeholder:opacity-30";
const labelClass = "text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 block mb-2";

const LoanProducts = () => {
    const { api } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const initialFormState = {
        name: '',
        interest_rate: '',
        min_amount: '',
        max_amount: '',
        min_period_months: '',
        max_period_months: '',
        description: '',
        processing_fee_fixed: 0,
        processing_fee_percent: 0,
        registration_fee: 0,
        insurance_fee: 0,
        tracking_fee: 0,
        valuation_fee: 0,
        duration_unit: 'months',
        interest_rate_7_days_plus: 0,
        grace_period_days: 0
    };

    const [formData, setFormData] = useState(initialFormState);
    const [editId, setEditId] = useState(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const data = await api.loanProducts.list();
            setProducts(data);
        } catch (error) {
            toast.error('Failed to load loan products');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (product) => {
        setFormData({
            ...product,
            description: product.description || '',
        });
        setEditId(product.id);
        setIsEditing(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        try {
            await api.client.delete(`/api/loan-products/${id}`);
            toast.success('Product deleted successfully');
            fetchProducts();
        } catch (error) {
            toast.error('Failed to delete product');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const payload = {
            ...formData,
            interest_rate: parseFloat(formData.interest_rate),
            min_amount: parseFloat(formData.min_amount),
            max_amount: parseFloat(formData.max_amount),
            min_period_months: parseInt(formData.min_period_months),
            max_period_months: parseInt(formData.max_period_months),
            processing_fee_fixed: parseFloat(formData.processing_fee_fixed) || 0,
            processing_fee_percent: parseFloat(formData.processing_fee_percent) || 0,
            registration_fee: parseFloat(formData.registration_fee) || 0,
            insurance_fee: parseFloat(formData.insurance_fee) || 0,
            tracking_fee: parseFloat(formData.tracking_fee) || 0,
            valuation_fee: parseFloat(formData.valuation_fee) || 0,
            interest_rate_7_days_plus: parseFloat(formData.interest_rate_7_days_plus) || 0,
            grace_period_days: parseInt(formData.grace_period_days) || 0,
        };

        try {
            if (editId) {
                await api.client.put(`/api/loan-products/${editId}`, payload);
                toast.success('Product updated successfully');
            } else {
                await api.loanProducts.create(payload);
                toast.success('Product created successfully');
            }
            setIsEditing(false);
            setFormData(initialFormState);
            setEditId(null);
            fetchProducts();
        } catch (error) {
            console.error(error);
            toast.error('Failed to save product');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setIsEditing(false);
        setFormData(initialFormState);
        setEditId(null);
    };

    return (
        <div className="space-y-10 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Package size={18} className="text-tytaj-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500">Configuration</span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none">Loan Products</h1>
                </div>
                {!isEditing && (
                    <AnimatedButton onClick={() => setIsEditing(true)}>
                        <Plus size={20} className="mr-2" /> New Product
                    </AnimatedButton>
                )}
            </div>

            <AnimatePresence mode="wait">
                {isEditing ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <GlassCard className="p-10 border-tytaj-500/20 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                                <Package size={120} />
                            </div>

                            <div className="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-white/5 pb-6">
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                                    {editId ? 'Edit Product' : 'Create New Product'}
                                </h3>
                                <button onClick={resetForm} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                                    <X size={24} className="text-gray-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-3">
                                        <label className={labelClass}>Product Name</label>
                                        <input
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className={inputClass}
                                            placeholder="e.g. WEEKLY BUSINESS LOAN"
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClass}>Interest Rate (%)</label>
                                        <div className="relative">
                                            <Percent className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={formData.interest_rate}
                                                onChange={e => setFormData({ ...formData, interest_rate: e.target.value })}
                                                className={`${inputClass} pl-12`}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClass}>Min Amount</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="number"
                                                required
                                                value={formData.min_amount}
                                                onChange={e => setFormData({ ...formData, min_amount: e.target.value })}
                                                className={`${inputClass} pl-12`}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClass}>Max Amount</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="number"
                                                required
                                                value={formData.max_amount}
                                                onChange={e => setFormData({ ...formData, max_amount: e.target.value })}
                                                className={`${inputClass} pl-12`}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Duration Config */}
                                <div className="p-6 bg-blue-500/5 rounded-3xl border border-blue-500/10">
                                    <h4 className="text-blue-600 dark:text-blue-400 font-black uppercase text-xs tracking-widest mb-6 flex items-center gap-2">
                                        <Calendar size={14} /> Duration Settings
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <label className={labelClass}>Duration Unit</label>
                                            <select
                                                value={formData.duration_unit}
                                                onChange={e => setFormData({ ...formData, duration_unit: e.target.value })}
                                                className={`${inputClass} cursor-pointer`}
                                            >
                                                <option value="months">MONTHS</option>
                                                <option value="weeks">WEEKS</option>
                                                <option value="days">DAYS</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Min Duration</label>
                                            <input
                                                type="number"
                                                required
                                                value={formData.min_period_months}
                                                onChange={e => setFormData({ ...formData, min_period_months: e.target.value })}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Max Duration</label>
                                            <input
                                                type="number"
                                                required
                                                value={formData.max_period_months}
                                                onChange={e => setFormData({ ...formData, max_period_months: e.target.value })}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Fees Config */}
                                <div className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10">
                                    <h4 className="text-emerald-600 dark:text-emerald-400 font-black uppercase text-xs tracking-widest mb-6 flex items-center gap-2">
                                        <DollarSign size={14} /> Fees & Charges
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div>
                                            <label className={labelClass}>Registration Fee</label>
                                            <input
                                                type="number"
                                                value={formData.registration_fee}
                                                onChange={e => setFormData({ ...formData, registration_fee: e.target.value })}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Processing Fee (Fixed)</label>
                                            <input
                                                type="number"
                                                value={formData.processing_fee_fixed}
                                                onChange={e => setFormData({ ...formData, processing_fee_fixed: e.target.value })}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Processing Fee (%)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={formData.processing_fee_percent}
                                                onChange={e => setFormData({ ...formData, processing_fee_percent: e.target.value })}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Insurance Fee</label>
                                            <input
                                                type="number"
                                                value={formData.insurance_fee}
                                                onChange={e => setFormData({ ...formData, insurance_fee: e.target.value })}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Tracking Fee</label>
                                            <input
                                                type="number"
                                                value={formData.tracking_fee}
                                                onChange={e => setFormData({ ...formData, tracking_fee: e.target.value })}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Valuation Fee</label>
                                            <input
                                                type="number"
                                                value={formData.valuation_fee}
                                                onChange={e => setFormData({ ...formData, valuation_fee: e.target.value })}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Penalties Config */}
                                <div className="p-6 bg-rose-500/5 rounded-3xl border border-rose-500/10">
                                    <h4 className="text-rose-600 dark:text-rose-400 font-black uppercase text-xs tracking-widest mb-6 flex items-center gap-2">
                                        <AlertCircle size={14} /> Penalties
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className={labelClass}>Penalty Rate (7+ Days Late)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={formData.interest_rate_7_days_plus}
                                                onChange={e => setFormData({ ...formData, interest_rate_7_days_plus: e.target.value })}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Grace Period (Days)</label>
                                            <input
                                                type="number"
                                                value={formData.grace_period_days}
                                                onChange={e => setFormData({ ...formData, grace_period_days: e.target.value })}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-4 pt-4 border-t border-gray-100 dark:border-white/5">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <AnimatedButton type="submit" isLoading={submitting} className="px-10 py-4 rounded-2xl shadow-xl shadow-tytaj-500/20">
                                        <Save size={18} className="mr-2" /> Save Product
                                    </AnimatedButton>
                                </div>
                            </form>
                        </GlassCard>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products.map(product => (
                            <GlassCard key={product.id} className="p-8 border-white/10 hover:border-tytaj-500/30 transition-colors group relative overflow-hidden">
                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-gray-900 dark:text-white border border-gray-100 dark:border-white/10">
                                        <Package size={24} />
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(product)} className="p-2 hover:bg-tytaj-500 hover:text-white rounded-lg transition-colors text-gray-400">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(product.id)} className="p-2 hover:bg-rose-500 hover:text-white rounded-lg transition-colors text-gray-400">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2 relative z-10">
                                    {product.name}
                                </h3>
                                <div className="flex items-baseline gap-2 mb-6 relative z-10">
                                    <span className="text-3xl font-black text-tytaj-500">{product.interest_rate}%</span>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Interest</span>
                                </div>

                                <div className="space-y-3 relative z-10">
                                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Limits</span>
                                        <span className="text-xs font-bold dark:text-gray-300">
                                            {product.min_amount.toLocaleString()} - {product.max_amount.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Duration</span>
                                        <span className="text-xs font-bold dark:text-gray-300">
                                            {product.min_period_months} - {product.max_period_months} {product.duration_unit?.toUpperCase() || 'MONTHS'}
                                        </span>
                                    </div>
                                    {(product.registration_fee > 0 || product.processing_fee_fixed > 0) && (
                                        <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Initial Fees</span>
                                            <span className="text-xs font-bold text-emerald-500">
                                                KES {(product.registration_fee + product.processing_fee_fixed).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </GlassCard>
                        ))}
                        {products.length === 0 && !loading && (
                            <div className="col-span-full py-20 text-center text-gray-400 dark:text-gray-600 font-black uppercase tracking-widest text-xs border-2 border-dashed border-gray-200 dark:border-white/5 rounded-3xl">
                                No loan products defined
                            </div>
                        )}
                        {loading && (
                            <div className="col-span-full py-20 text-center text-tytaj-500 font-black uppercase tracking-widest text-xs animate-pulse">
                                Loading Products...
                            </div>
                        )}
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LoanProducts;
