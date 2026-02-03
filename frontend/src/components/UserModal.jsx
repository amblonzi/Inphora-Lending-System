import React, { useState, useEffect } from 'react';
import { X, User, Mail, Shield, Lock, Save, Fingerprint, ShieldAlert, Key, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import AnimatedButton from './ui/AnimatedButton';
import GlassCard from './ui/GlassCard';
import { motion } from 'framer-motion';

const UserModal = ({ user, onClose, onSave }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: user?.email || '',
        full_name: user?.full_name || '',
        role: user?.role || 'loan_officer',
        phone: user?.phone || '',
        two_factor_enabled: user?.two_factor_enabled || false,
        password: '',
        confirm_password: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!user && !formData.password) {
            toast.error('Password required for new users');
            return;
        }

        if (formData.two_factor_enabled && !formData.phone) {
            toast.error('Phone number is required when 2FA is enabled');
            return;
        }

        if (formData.password && formData.password !== formData.confirm_password) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const payload = { ...formData };
            if (!payload.password) delete payload.password;
            delete payload.confirm_password;

            await onSave(payload);
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to save user data');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black uppercase tracking-tight placeholder:opacity-30";

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-lg"
            >
                <GlassCard className="!p-0 border-white/20 dark:border-white/10 shadow-2xl overflow-hidden relative">
                    <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-tytaj-500/5 blur-[100px]" />

                    {/* Header Area */}
                    <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-start bg-gray-50/50 dark:bg-white/5 relative z-10">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Fingerprint size={14} className="text-tytaj-500" />
                                <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">User Management</span>
                            </div>
                            <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
                                {user ? 'Edit User' : 'New User'}
                            </h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-rose-500 dark:hover:bg-rose-500 hover:text-white rounded-2xl transition-all text-gray-500 group"
                        >
                            <X size={24} className="group-hover:rotate-90 transition-transform" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-10 space-y-8 relative z-10 bg-white dark:bg-[#0a0a0f]">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        name="full_name"
                                        required
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        className={inputClass}
                                        placeholder="e.g. John Operator"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className={inputClass}
                                        placeholder="user@example.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Phone Number</label>
                                <div className="relative">
                                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className={inputClass}
                                        placeholder="+254 700 000 000"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 group-hover:border-tytaj-500/30 transition-all">
                                <input
                                    type="checkbox"
                                    id="two_factor_enabled"
                                    name="two_factor_enabled"
                                    checked={formData.two_factor_enabled}
                                    onChange={(e) => setFormData({ ...formData, two_factor_enabled: e.target.checked })}
                                    className="w-5 h-5 rounded-lg border-gray-300 dark:border-white/10 text-tytaj-600 focus:ring-tytaj-500/20 bg-white dark:bg-white/5"
                                />
                                <div className="flex flex-col">
                                    <label htmlFor="two_factor_enabled" className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest select-none cursor-pointer">
                                        Enable Two-Factor Authentication
                                    </label>
                                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">Requires a valid phone number</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Role</label>
                                <div className="relative">
                                    <ShieldAlert className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <select
                                        name="role"
                                        value={formData.role}
                                        onChange={handleChange}
                                        className={`${inputClass} appearance-none cursor-pointer`}
                                    >
                                        <option value="user" className="bg-white dark:bg-[#0a0a0f]">User</option>
                                        <option value="loan_officer" className="bg-white dark:bg-[#0a0a0f]">Loan Officer</option>
                                        <option value="finance_manager" className="bg-white dark:bg-[#0a0a0f]">Finance Manager</option>
                                        <option value="admin" className="bg-white dark:bg-[#0a0a0f]">Admin</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-gray-100 dark:border-white/5 space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Key size={14} className="text-tytaj-500" />
                                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                    {user ? 'Change Password' : 'Set Password'}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="password"
                                        name="password"
                                        required={!user}
                                        value={formData.password}
                                        onChange={handleChange}
                                        className={inputClass}
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="password"
                                        name="confirm_password"
                                        required={!user}
                                        value={formData.confirm_password}
                                        onChange={handleChange}
                                        className={inputClass}
                                        placeholder="Confirm Password"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex flex-col sm:flex-row gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <AnimatedButton
                                type="submit"
                                isLoading={loading}
                                className="flex-1 py-5 rounded-3xl shadow-xl shadow-tytaj-600/20"
                            >
                                <Save size={18} className="mr-2" /> {user ? 'Update User' : 'Save User'}
                            </AnimatedButton>
                        </div>
                    </form>
                </GlassCard>
            </motion.div>
        </div>
    );
};

export default UserModal;
