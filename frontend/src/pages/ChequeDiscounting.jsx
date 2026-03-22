import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Search, Filter, Calendar, 
  Plus, History, Receipt, ArrowUpRight,
  TrendingDown, CheckCircle, AlertCircle, Trash2, X, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import GlassCard from '../components/ui/GlassCard';
import AnimatedButton from '../components/ui/AnimatedButton';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const ChequeDiscounting = () => {
    const [cheques, setCheques] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState({
        client_id: '',
        cheque_number: '',
        bank_name: '',
        drawer_name: '',
        face_amount: '',
        discount_rate: '2.5', // Default 2.5%
        due_date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const chequeData = await api.chequeDiscounting.list();
            setCheques(chequeData);
            const clientData = await api.clients.list();
            setClients(clientData);
        } catch {
            toast.error("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.chequeDiscounting.create({
                ...formData,
                client_id: parseInt(formData.client_id),
                face_amount: parseFloat(formData.face_amount),
                discount_rate: parseFloat(formData.discount_rate)
            });
            toast.success("Cheque discount recorded");
            setShowAddModal(false);
            fetchInitialData();
            setFormData({
                client_id: '',
                cheque_number: '',
                bank_name: '',
                drawer_name: '',
                face_amount: '',
                discount_rate: '2.5',
                due_date: new Date().toISOString().split('T')[0],
                notes: ''
            });
        } catch {
            toast.error("Failed to record cheque");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            await api.chequeDiscounting.updateStatus(id, status);
            toast.success(`Status updated to ${status}`);
            fetchInitialData();
        } catch {
            toast.error("Status update failed");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this record?")) return;
        try {
            await api.chequeDiscounting.delete(id);
            toast.success("Record deleted");
            fetchInitialData();
        } catch {
            toast.error("Delete failed");
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'cleared': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'bounced': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
            case 'cancelled': return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
            default: return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
        }
    };

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
                        Cheque <span className="text-tytaj-500">Discounting</span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">Manage and discount post-dated cheques</p>
                </div>
                <div className="flex items-center gap-3">
                    <AnimatedButton onClick={() => setShowAddModal(true)} className="bg-tytaj-600 shadow-xl shadow-tytaj-600/30">
                        <Plus className="mr-2" size={20} /> New Cheque
                    </AnimatedButton>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <GlassCard className="p-6">
                    <TrendingDown className="text-tytaj-500 mb-3" size={24} />
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Total Discounted</span>
                    <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                        KES {cheques.reduce((sum, c) => sum + c.face_amount, 0).toLocaleString()}
                    </div>
                </GlassCard>
                <GlassCard className="p-6">
                    <Receipt className="text-emerald-500 mb-3" size={24} />
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Interest Earned</span>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                        KES {cheques.reduce((sum, c) => sum + (c.discount_amount || 0), 0).toLocaleString()}
                    </div>
                </GlassCard>
                <GlassCard className="p-6">
                    <History className="text-blue-500 mb-3" size={24} />
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Pending Clearance</span>
                    <div className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                        {cheques.filter(c => c.status === 'pending').length} Cheques
                    </div>
                </GlassCard>
                <GlassCard className="p-6 border-rose-500/20 !bg-rose-500/5">
                    <AlertCircle className="text-rose-500 mb-3" size={24} />
                    <span className="text-[9px] font-black text-rose-600/60 uppercase tracking-widest block mb-1">Bounced Cheques</span>
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                        {cheques.filter(c => c.status === 'bounced').length} Cases
                    </div>
                </GlassCard>
            </div>

            <GlassCard className="!p-0 border-gray-200 dark:border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                            <tr>
                                <th className="px-8 py-5">Cheque #</th>
                                <th className="px-8 py-5">Client / Drawer</th>
                                <th className="px-8 py-5">Value</th>
                                <th className="px-8 py-5">Discount (Rate)</th>
                                <th className="px-8 py-5">Due Date</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="py-20 text-center opacity-50">
                                        <RefreshCw className="animate-spin text-tytaj-500 mx-auto mb-4" size={32} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Scanning Portfolio...</span>
                                    </td>
                                </tr>
                            ) : cheques.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-20 text-center text-gray-400 uppercase font-black text-[10px] tracking-widest">
                                        No cheques registered for discounting
                                    </td>
                                </tr>
                            ) : cheques.map((chq, idx) => (
                                <motion.tr 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={chq.id} 
                                    className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                >
                                    <td className="px-8 py-6">
                                        <span className="text-sm font-black text-gray-900 dark:text-white font-mono">{chq.cheque_number}</span>
                                        <span className="text-[9px] font-black text-gray-400 block uppercase mt-1">{chq.bank_name}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-gray-800 dark:text-gray-200">{chq.client?.first_name} {chq.client?.last_name}</span>
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Drawer: {chq.drawer_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-gray-900 dark:text-white">KES {chq.face_amount?.toLocaleString()}</span>
                                            <span className="text-[9px] font-black text-emerald-500 uppercase">Net: {chq.net_amount?.toLocaleString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-tytaj-600 dark:text-tytaj-400">KES {chq.discount_amount?.toLocaleString()}</span>
                                            <span className="text-[9px] font-black text-gray-400 uppercase">Rate: {chq.discount_rate}%</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{new Date(chq.due_date).toLocaleDateString()}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${getStatusColor(chq.status)}`}>
                                            {chq.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right space-x-2">
                                        {chq.status === 'pending' && (
                                            <>
                                                <button onClick={() => handleUpdateStatus(chq.id, 'cleared')} className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all" title="Mark Cleared">
                                                    <CheckCircle size={18} />
                                                </button>
                                                <button onClick={() => handleUpdateStatus(chq.id, 'bounced')} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all" title="Mark Bounced">
                                                    <AlertCircle size={18} />
                                                </button>
                                            </>
                                        )}
                                        <button onClick={() => handleDelete(chq.id)} className="p-2 text-gray-400 hover:text-rose-500 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-2xl"
                        >
                            <GlassCard className="p-8 border-white/20 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)]">
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Record <span className="text-tytaj-500">Discount</span></h2>
                                        <p className="text-gray-500 text-sm font-medium">Add a post-dated cheque for processing</p>
                                    </div>
                                    <button onClick={() => setShowAddModal(false)} className="p-3 bg-gray-100 dark:bg-white/5 rounded-2xl text-gray-500 hover:text-rose-500 transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>

                                <form onSubmit={handleCreate} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Client *</label>
                                            <select 
                                                required
                                                value={formData.client_id}
                                                onChange={e => setFormData({...formData, client_id: e.target.value})}
                                                className="w-full p-4 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-medium"
                                            >
                                                <option value="">Select Client</option>
                                                {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.id_number})</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cheque Number *</label>
                                            <input 
                                                required
                                                type="text"
                                                placeholder="e.g. 000542"
                                                value={formData.cheque_number}
                                                onChange={e => setFormData({...formData, cheque_number: e.target.value})}
                                                className="w-full p-4 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-medium"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bank Name *</label>
                                            <input 
                                                required
                                                type="text"
                                                placeholder="e.g. KCB, Equity..."
                                                value={formData.bank_name}
                                                onChange={e => setFormData({...formData, bank_name: e.target.value})}
                                                className="w-full p-4 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-medium"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Drawer Name *</label>
                                            <input 
                                                required
                                                type="text"
                                                placeholder="Name on cheque"
                                                value={formData.drawer_name}
                                                onChange={e => setFormData({...formData, drawer_name: e.target.value})}
                                                className="w-full p-4 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-medium"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Face Amount *</label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input 
                                                    required
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={formData.face_amount}
                                                    onChange={e => setFormData({...formData, face_amount: e.target.value})}
                                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-medium"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Discount Rate (%) *</label>
                                            <input 
                                                required
                                                type="number"
                                                step="0.1"
                                                value={formData.discount_rate}
                                                onChange={e => setFormData({...formData, discount_rate: e.target.value})}
                                                className="w-full p-4 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-medium"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Due Date *</label>
                                            <input 
                                                required
                                                type="date"
                                                value={formData.due_date}
                                                onChange={e => setFormData({...formData, due_date: e.target.value})}
                                                className="w-full p-4 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-medium"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-6">
                                        <AnimatedButton 
                                            type="submit" 
                                            disabled={submitting}
                                            className="w-full py-5 bg-tytaj-600 shadow-2xl shadow-tytaj-600/30 text-lg"
                                        >
                                            {submitting ? 'Processing...' : 'Complete Transaction'}
                                        </AnimatedButton>
                                    </div>
                                </form>
                            </GlassCard>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChequeDiscounting;
