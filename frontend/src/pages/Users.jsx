import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Shield, CheckCircle2, XCircle, Edit, Plus, Mail, BadgeCheck, Users as UsersIcon } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import AnimatedButton from '../components/ui/AnimatedButton';
import UserModal from '../components/UserModal';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const Users = () => {
    const { api } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await api.users.getAll();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load user list');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveUser = async (formData) => {
        try {
            if (selectedUser) {
                const updated = await api.users.update(selectedUser.id, formData);
                setUsers(users.map(u => u.id === selectedUser.id ? updated : u));
                toast.success('User saved successfully');
            } else {
                const created = await api.users.create(formData);
                setUsers([created, ...users]);
                toast.success('New user created');
            }
            setShowModal(false);
            setSelectedUser(null);
        } catch (error) {
            throw error;
        }
    };

    const handleToggleStatus = async (user) => {
        try {
            const updated = await api.users.update(user.id, {
                is_active: !user.is_active
            });
            setUsers(users.map(u => u.id === user.id ? updated : u));
            toast.success(`User ${updated.is_active ? 'Activated' : 'Suspended'}`);
        } catch (error) {
            toast.error('Failed to update user status');
        }
    };

    return (
        <div className="space-y-10 pb-10">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <UsersIcon size={18} className="text-tytaj-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500">User Management</span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none">Users</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-3 font-medium text-lg tracking-tight">Manage system access and user roles.</p>
                </div>
                <AnimatedButton
                    onClick={() => { setSelectedUser(null); setShowModal(true); }}
                    className="w-full sm:w-auto shadow-xl shadow-tytaj-600/20"
                >
                    <Plus className="w-5 h-5 mr-1" /> New User
                </AnimatedButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? (
                    [1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-[320px] bg-gray-100/50 dark:bg-white/5 rounded-3xl animate-pulse border border-gray-100 dark:border-white/10" />
                    ))
                ) : users.map((user, idx) => (
                    <GlassCard key={user.id} delay={idx * 0.1} hoverEffect className="p-8 relative overflow-hidden group border-white/20 dark:border-white/5 shadow-xl">
                        {/* Decorative Glow */}
                        <div className={`absolute -top-16 -right-16 w-40 h-40 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${user.is_active ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`} />

                        <div className="flex items-start justify-between relative z-10">
                            <div className="flex items-center gap-5">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-all ${user.is_active ? 'bg-tytaj-500/10 dark:bg-tytaj-500/20 border-tytaj-500/20 text-tytaj-600 dark:text-tytaj-400 shadow-lg shadow-tytaj-500/10' : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500 opacity-50'}`}>
                                    <User size={32} />
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 dark:text-white text-xl tracking-tight leading-none">{user.full_name}</h3>
                                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-tytaj-600 dark:text-tytaj-400 mt-3 px-3 py-1 bg-tytaj-500/10 dark:bg-tytaj-500/20 rounded-full border border-tytaj-500/20 w-fit">
                                        <Shield size={10} />
                                        {user.role}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleToggleStatus(user)}
                                className={`p-3 rounded-2xl transition-all border shadow-sm ${user.is_active ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500 hover:text-white' : 'text-rose-500 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500 hover:text-white'} active:scale-90`}
                                title={user.is_active ? 'Suspend User' : 'Activate User'}
                            >
                                {user.is_active ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                            </button>
                        </div>

                        <div className="mt-10 space-y-5 relative z-10">
                            <div className="flex items-center gap-4 text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5 select-all group/mail hover:border-tytaj-500/30 transition-colors">
                                <Mail size={16} className="text-gray-400 group-hover/mail:text-tytaj-500 transition-colors" />
                                <span className="font-mono truncate">{user.email}</span>
                            </div>

                            <div className="flex items-center justify-between px-2">
                                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Two-Factor Auth</span>
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${user.two_factor_enabled ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${user.two_factor_enabled ? 'text-emerald-500' : 'text-gray-400'}`}>
                                        {user.two_factor_enabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-2">
                                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Status</span>
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${user.is_active ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {user.is_active ? 'Active' : 'Dormant'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 pt-8 border-t border-gray-100 dark:border-white/5 flex flex-col gap-4 relative z-10">
                            <button
                                className="w-full py-4 bg-gray-900 dark:bg-white/5 text-white dark:text-gray-300 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-gray-800 dark:hover:bg-tytaj-500 dark:hover:text-white transition-all shadow-xl shadow-gray-200 dark:shadow-none active:scale-[0.98] border border-transparent dark:border-white/10"
                                onClick={() => { setSelectedUser(user); setShowModal(true); }}
                            >
                                <Edit size={16} /> Edit User
                            </button>

                            {user.last_login && (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                                    <span className="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.3em]">
                                        Last Login: {new Date(user.last_login).toLocaleDateString()}
                                    </span>
                                    <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                                </div>
                            )}
                        </div>
                    </GlassCard>
                ))}
            </div>

            {showModal && (
                <UserModal
                    user={selectedUser}
                    onClose={() => { setShowModal(false); setSelectedUser(null); }}
                    onSave={handleSaveUser}
                />
            )}
        </div>
    );
};

export default Users;
