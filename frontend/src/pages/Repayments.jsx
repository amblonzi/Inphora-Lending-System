import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Search, Filter, Calendar, 
  ArrowUpRight, ArrowDownLeft, RefreshCw, 
  ChevronRight, Download, Receipt
} from 'lucide-react';
import { api } from '../services/api';
import GlassCard from '../components/ui/GlassCard';
import AnimatedButton from '../components/ui/AnimatedButton';
import { motion } from 'framer-motion';

const Repayments = () => {
  const [repayments, setRepayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total_count: 0, total_amount: 0 });
  const [search, setSearch] = useState('');

  const fetchRepayments = async () => {
    setLoading(true);
    try {
      const data = await api.repayments.list();
      setRepayments(data);
      const statData = await api.repayments.getStats();
      setStats(statData);
    } catch (error) {
      console.error("Failed to fetch repayments", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepayments();
  }, []);

  const filteredRepayments = repayments.filter(r => 
    r.loan_id.toString().includes(search) || 
    r.payment_method.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
            Repayment <span className="text-tytaj-500">Ledger</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">Centralized track of all incoming payments</p>
        </div>
        <div className="flex items-center gap-3">
            <AnimatedButton onClick={fetchRepayments} className="!p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500">
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </AnimatedButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="!bg-emerald-500/5 border-emerald-500/10 p-6 flex items-center gap-5">
            <div className="p-4 bg-emerald-500/20 rounded-2xl text-emerald-600">
                <DollarSign size={24} />
            </div>
            <div>
                <span className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest block mb-1">Total Collected</span>
                <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">KES {stats.total_amount?.toLocaleString()}</div>
            </div>
        </GlassCard>
        
        <GlassCard className="!bg-blue-500/5 border-blue-500/10 p-6 flex items-center gap-5">
            <div className="p-4 bg-blue-500/20 rounded-2xl text-blue-600">
                <Receipt size={24} />
            </div>
            <div>
                <span className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest block mb-1">Transaction Count</span>
                <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{stats.total_count}</div>
            </div>
        </GlassCard>

        <GlassCard className="!bg-tytaj-500/5 border-tytaj-500/10 p-6 flex items-center gap-5">
            <div className="p-4 bg-tytaj-500/20 rounded-2xl text-tytaj-600">
                <Calendar size={24} />
            </div>
            <div>
                <span className="text-[10px] font-black text-tytaj-600/60 uppercase tracking-widest block mb-1">Average Payment</span>
                <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                    KES {(stats.total_amount / (stats.total_count || 1))?.toLocaleString(undefined, {maximumFractionDigits: 0})}
                </div>
            </div>
        </GlassCard>
      </div>

      <GlassCard className="overflow-hidden border-gray-200 dark:border-white/10 !p-0 shadow-2xl">
        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search Loan ID, Method..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-medium shadow-inner"
                />
            </div>
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filter:</span>
                <select className="bg-transparent text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 outline-none cursor-pointer">
                    <option>All Methods</option>
                    <option>M-Pesa</option>
                    <option>Bank</option>
                    <option>Manual</option>
                </select>
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    <tr>
                        <th className="px-8 py-5">Loan ID</th>
                        <th className="px-8 py-5">Date</th>
                        <th className="px-8 py-5">Amount</th>
                        <th className="px-8 py-5">Method</th>
                        <th className="px-8 py-5">Reference</th>
                        <th className="px-8 py-5 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {loading ? (
                        <tr>
                            <td colSpan="6" className="py-20 text-center">
                                <div className="flex flex-col items-center gap-4 opacity-50">
                                    <RefreshCw className="animate-spin text-tytaj-500" size={32} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Hydrating Ledger...</span>
                                </div>
                            </td>
                        </tr>
                    ) : filteredRepayments.length === 0 ? (
                        <tr>
                            <td colSpan="6" className="py-20 text-center text-gray-400 uppercase font-black text-[10px] tracking-widest">
                                No repayments found matching filters
                            </td>
                        </tr>
                    ) : filteredRepayments.map((rep, idx) => (
                        <motion.tr 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            key={rep.id} 
                            className="hover:bg-tytaj-500/5 dark:hover:bg-tytaj-500/10 transition-colors group"
                        >
                            <td className="px-8 py-6">
                                <span className="text-sm font-black text-gray-900 dark:text-white tracking-tight">#{rep.loan_id}</span>
                            </td>
                            <td className="px-8 py-6">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{new Date(rep.payment_date).toLocaleDateString()}</span>
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-tight">Verified</span>
                                </div>
                            </td>
                            <td className="px-8 py-6">
                                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tracking-tight">KES {rep.amount?.toLocaleString()}</span>
                            </td>
                            <td className="px-8 py-6">
                                <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] border ${
                                    rep.payment_method === 'mpesa' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' :
                                    rep.payment_method === 'bank' ? 'text-blue-500 bg-blue-500/10 border-blue-500/20' :
                                    'text-amber-500 bg-amber-500/10 border-amber-500/20'
                                }`}>
                                    {rep.payment_method}
                                </span>
                            </td>
                            <td className="px-8 py-6">
                                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{rep.mpesa_transaction_id || rep.notes?.substring(0, 15) || '-'}</span>
                            </td>
                            <td className="px-8 py-6 text-right">
                                <button className="p-2 text-gray-400 hover:text-tytaj-500 dark:hover:text-tytaj-400 transition-colors">
                                    <ChevronRight size={18} />
                                </button>
                            </td>
                        </motion.tr>
                    ))}
                </tbody>
            </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default Repayments;
