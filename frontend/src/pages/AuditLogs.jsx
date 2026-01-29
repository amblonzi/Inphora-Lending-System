import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { History, Search, Filter, Shield, User, Clock, Activity, Fingerprint, Database, Network, Terminal, MapPin, RefreshCw } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import { motion, AnimatePresence } from 'framer-motion';

const AuditLogs = () => {
    const { api } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState('all');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await api.users.getActivityLogs(200);
            setLogs(data);
        } catch (error) {
            console.error('Log fetch failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = 
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.user?.full_name || 'System').toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesAction = filterAction === 'all' || log.action === filterAction;
        
        return matchesSearch && matchesAction;
    });

    const getActionColor = (action) => {
        switch (action) {
            case 'create':
            case 'approved':
                return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'delete':
            case 'reject':
                return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
            case 'update':
                return 'text-tytaj-500 bg-tytaj-500/10 border-tytaj-500/20';
            case 'login':
                return 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20';
            case 'disburse':
                return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            default:
                return 'text-gray-400 bg-white/5 border-white/10';
        }
    };

    const formatDetails = (details) => {
        if (!details) return '-';
        try {
            const parsed = typeof details === 'string' ? JSON.parse(details) : details;
            return Object.entries(parsed)
                .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
                .join(' | ');
        } catch (e) {
            return details;
        }
    };

    const inputClass = "w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black uppercase tracking-tight placeholder:opacity-30";

    return (
        <div className="space-y-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Terminal size={14} className="text-tytaj-500" />
                        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">Security Center</span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">Activity Logs</h1>
                </div>
                <button 
                    onClick={fetchLogs}
                    className="flex items-center gap-2 px-8 py-3.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl hover:bg-tytaj-500 hover:text-white transition-all shadow-xl font-black text-[10px] uppercase tracking-widest active:scale-95"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Sync Logs
                </button>
            </div>

            {/* Filter Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-tytaj-500 transition-colors" size={20} />
                    <input 
                        type="text"
                        placeholder="Filter by hash, operator, or resource..."
                        className={inputClass}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative group">
                    <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-tytaj-500 pointer-events-none transition-colors" size={20} />
                    <select 
                        className={`${inputClass} appearance-none cursor-pointer`}
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                    >
                        <option value="all">All Operations</option>
                        <option value="create">Create Records</option>
                        <option value="update">Update Records</option>
                        <option value="delete">Delete Records</option>
                        <option value="login">Authentication</option>
                        <option value="disburse">Disbursements</option>
                        <option value="approve">Approvals</option>
                        <option value="reject">Rejections</option>
                    </select>
                </div>
            </div>

            {/* Data Ledger */}
            <GlassCard className="overflow-hidden !p-0 border-white/20 dark:border-white/10 shadow-3xl bg-white dark:bg-[#0a0a0f]">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">User</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Action</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Resource</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Details</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-right">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="5" className="px-8 py-6">
                                            <div className="h-10 bg-gray-50 dark:bg-white/5 rounded-2xl w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredLogs.map((log) => (
                                <motion.tr 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    key={log.id} 
                                    className="hover:bg-tytaj-500/5 dark:hover:bg-white/5 transition-all group"
                                >
                                    <td className="px-8 py-6 whitespace-nowrap">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-tytaj-500/10 flex items-center justify-center text-tytaj-600 dark:text-tytaj-400 group-hover:scale-110 transition-transform">
                                                <User size={18} />
                                            </div>
                                            <div>
                                                <span className="font-black text-gray-900 dark:text-gray-200 tracking-tight block uppercase text-xs">{log.user?.full_name || 'System Agent'}</span>
                                                <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{log.ip_address || '127.0.0.1'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 whitespace-nowrap">
                                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black tracking-widest border-2 ${getActionColor(log.action)}`}>
                                            {log.action.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <Activity size={14} className="text-tytaj-500" />
                                            <span className="font-black uppercase tracking-tight text-xs text-gray-600 dark:text-gray-400">{log.resource}</span>
                                            {log.resource_id && (
                                                <span className="text-[9px] bg-gray-100 dark:bg-white/10 px-2 py-1 rounded-lg font-black text-tytaj-500">#{log.resource_id}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 max-w-md">
                                        <span className="text-[10px] text-gray-500 dark:text-gray-500 font-bold font-mono block truncate group-hover:whitespace-normal group-hover:overflow-visible transition-all uppercase opacity-60">
                                            {formatDetails(log.details)}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 whitespace-nowrap text-right">
                                        <div className="text-sm font-black text-gray-900 dark:text-white tracking-tighter">
                                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">
                                            {new Date(log.timestamp).toLocaleDateString()}
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                            {!loading && filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center gap-6">
                                            <div className="p-8 bg-gray-50 dark:bg-white/5 rounded-full border-2 border-dashed border-gray-100 dark:border-white/10">
                                                <Shield size={64} className="text-gray-200 dark:text-gray-700" strokeWidth={1} />
                                            </div>
                                            <div className="space-y-2">
                                                <p className="font-black text-lg uppercase tracking-widest text-gray-400 dark:text-gray-600">No Logs Found</p>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 dark:text-gray-700">Adjust filters or sync logs</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
};

export default AuditLogs;
