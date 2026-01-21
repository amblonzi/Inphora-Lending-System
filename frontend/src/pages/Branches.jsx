import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Edit2, Trash2, Building2, Server, Network, ShieldCheck, Globe, Zap, Cpu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import GlassCard from '../components/ui/GlassCard';
import AnimatedButton from '../components/ui/AnimatedButton';

const Branches = () => {
    const { api } = useAuth();
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);
    const [formData, setFormData] = useState({ name: '', location: '' });

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        setLoading(true);
        try {
            const data = await api.branches.list();
            setBranches(data);
        } catch (error) {
            toast.error("Failed to sync branch list");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingBranch) {
                await api.branches.update(editingBranch.id, formData);
                toast.success("Branch updated");
            } else {
                await api.branches.create(formData);
                toast.success("New branch created");
            }
            setShowModal(false);
            setEditingBranch(null);
            setFormData({ name: '', location: '' });
            fetchBranches();
        } catch (error) {
            toast.error("Operation failed");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure? This will delete the branch.")) return;
        try {
            await api.branches.delete(id);
            toast.success("Branch deleted successfully");
            fetchBranches();
        } catch (error) {
            toast.error("Deletion failed");
        }
    };

    const openNewModal = () => {
        setEditingBranch(null);
        setFormData({ name: '', location: '' });
        setShowModal(true);
    };

    const handleEdit = (branch) => {
        setEditingBranch(branch);
        setFormData({ name: branch.name, location: branch.location });
        setShowModal(true);
    };

    const inputClass = "w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black uppercase tracking-tight placeholder:opacity-30";

    return (
        <div className="space-y-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Network size={14} className="text-tytaj-500 animate-pulse" />
                        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">Infrastructure</span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">Branch Network</h1>
                </div>
                <AnimatedButton 
                  onClick={openNewModal}
                  className="px-8 py-3.5 rounded-2xl shadow-xl"
                >
                  <div className="flex items-center gap-2">
                    <Plus size={20} />
                    <span>New Branch</span>
                  </div>
                </AnimatedButton>
            </div>

            {/* Stats / Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="!bg-tytaj-500/5 border-tytaj-500/10 p-8 group overflow-hidden relative">
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <Server size={120} />
                    </div>
                    <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Active Branches</h4>
                    <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{branches.length}</p>
                    <div className="mt-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">Online</span>
                    </div>
                </GlassCard>
            </div>

            {/* Node Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <AnimatePresence>
                    {branches.map((branch, index) => (
                        <motion.div
                            key={branch.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ y: -5 }}
                            className="group"
                        >
                            <GlassCard className="h-full border-white/20 dark:border-white/5 group-hover:border-tytaj-500/30 transition-all shadow-xl bg-white dark:bg-[#0a0a0f]">
                                <div className="flex items-start justify-between mb-8">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 bg-tytaj-500/5 dark:bg-tytaj-500/10 rounded-[28px] flex items-center justify-center border border-tytaj-500/10 group-hover:rotate-6 transition-transform">
                                            <Building2 className="text-tytaj-600 dark:text-tytaj-400" size={32} />
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-black text-tytaj-500 uppercase tracking-[0.2em] mb-1 block">Branch</span>
                                            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase leading-none">{branch.name}</h3>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 font-bold bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                                        <div className="p-2 bg-white dark:bg-white/5 rounded-xl text-tytaj-500">
                                          <MapPin size={16} />
                                        </div>
                                        <span className="uppercase tracking-tight">{branch.location || 'Location Undefined'}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-6 border-t border-gray-100 dark:border-white/5">
                                    <button
                                        onClick={() => handleEdit(branch)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-[9px] font-black uppercase tracking-widest bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-2xl hover:bg-tytaj-500 hover:text-white transition-all active:scale-95 border border-transparent hover:border-tytaj-500/50"
                                    >
                                        <Edit2 size={14} />
                                        Configure
                                    </button>
                                    <button
                                        onClick={() => handleDelete(branch.id)}
                                        className="px-4 py-3.5 bg-rose-500/5 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all active:scale-95 border border-rose-500/10"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {branches.length === 0 && !loading && (
                <div className="text-center py-32 bg-gray-50/50 dark:bg-white/5 rounded-[48px] border-4 border-dashed border-gray-100 dark:border-white/5">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-[32px] bg-white dark:bg-[#0a0a0f] shadow-2xl mb-8 relative">
                        <Building2 className="text-gray-200 dark:text-gray-800" size={48} />
                        <div className="absolute inset-0 border border-gray-100 dark:border-white/10 rounded-[32px]"></div>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tighter">No Branches Found</h3>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mb-10 max-w-sm mx-auto font-bold uppercase tracking-widest opacity-60 italic">Your organization has no branches. Create a new branch to begin operations.</p>
                    <AnimatedButton
                        onClick={openNewModal}
                        className="px-10 py-4 rounded-2xl shadow-2xl"
                    >
                        Create First Branch
                    </AnimatedButton>
                </div>
            )}

            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1,2,3].map(i => (
                        <div key={i} className="h-64 bg-gray-50 dark:bg-white/5 rounded-[40px] animate-pulse border-2 border-dashed border-gray-100 dark:border-white/5"></div>
                    ))}
                </div>
            )}

            {/* Modal Overlay */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-50 p-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 40 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 40 }}
                            className="bg-white dark:bg-[#0a0a0f] border border-white/20 dark:border-white/10 rounded-[40px] shadow-4xl max-w-xl w-full p-12 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Cpu size={120} />
                            </div>

                            <div className="flex items-center gap-6 mb-12 relative">
                                <div className="p-5 bg-tytaj-500/10 text-tytaj-600 dark:text-tytaj-400 rounded-[32px] shadow-xl border border-tytaj-500/10">
                                    <Building2 size={32} />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none">
                                        {editingBranch ? 'Edit Branch' : 'Create Branch'}
                                    </h2>
                                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">{editingBranch ? 'Update branch details' : 'Add a new branch'}</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-10 relative">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                                        Branch Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className={inputClass}
                                        placeholder="e.g. Nairobi Central 01"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                                        Location
                                    </label>
                                    <div className="relative">
                                        <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-tytaj-500/50" size={20} />
                                        <input
                                            type="text"
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            className={`${inputClass} !pl-14`}
                                            placeholder="e.g. CBD Plaza"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-6 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowModal(false);
                                            setEditingBranch(null);
                                            setFormData({ name: '', location: '' });
                                        }}
                                        className="flex-1 px-8 py-5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/5 hover:text-rose-500 hover:border-rose-500/20 transition-all active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                    <AnimatedButton
                                        type="submit"
                                        className="flex-1 py-5 rounded-3xl shadow-2xl shadow-tytaj-600/30"
                                    >
                                        {editingBranch ? 'Save Changes' : 'Create Branch'}
                                    </AnimatedButton>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Branches;
