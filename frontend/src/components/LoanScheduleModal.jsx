import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Calendar, DollarSign, Activity, PieChart, TrendingUp, Fingerprint } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from './ui/GlassCard';

const LoanScheduleModal = ({ loanId, onClose }) => {
  const { api } = useAuth();
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedule();
  }, [loanId]);

  const fetchSchedule = async () => {
    try {
      const data = await api.loans.getSchedule(loanId);
      setSchedule(data);
    } catch (error) {
      console.error('Error fetching schedule details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <GlassCard className="p-12 flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-4 border-tytaj-500/20 border-t-tytaj-500 rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Loading Schedule...</p>
        </GlassCard>
      </div>
    );
  }

  if (!schedule) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-5xl"
      >
        <GlassCard className="!p-0 border-white/20 dark:border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-tytaj-500/5 blur-[100px]" />
            
            {/* Header Area */}
            <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-start bg-gray-50/50 dark:bg-white/5 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Activity size={14} className="text-tytaj-500" />
                        <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">Repayment Schedule</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Loan Schedule</h3>
                </div>
                <button 
                    onClick={onClose} 
                    className="p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-rose-500 dark:hover:bg-rose-500 hover:text-white rounded-2xl transition-all text-gray-500 group"
                >
                    <X size={24} className="group-hover:rotate-90 transition-transform" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 bg-white dark:bg-[#0a0a0f] scroll-smooth custom-scrollbar relative z-10">
                {/* Summary Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <GlassCard className="!bg-blue-500/5 border-blue-500/10 p-6">
                        <div className="text-[9px] font-black text-blue-600/60 dark:text-blue-400/60 uppercase tracking-widest mb-1">Total Amount</div>
                        <div className="text-xl font-black text-gray-900 dark:text-white tracking-tighter">KES {schedule.total_amount.toLocaleString()}</div>
                    </GlassCard>
                    <GlassCard className="!bg-emerald-500/5 border-emerald-500/10 p-6">
                        <div className="text-[9px] font-black text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-widest mb-1">Total Principal</div>
                        <div className="text-xl font-black text-gray-900 dark:text-white tracking-tighter">KES {schedule.principal.toLocaleString()}</div>
                    </GlassCard>
                    <GlassCard className="!bg-purple-500/5 border-purple-500/10 p-6">
                        <div className="text-[9px] font-black text-purple-600/60 dark:text-purple-400/60 uppercase tracking-widest mb-1">Total Interest</div>
                        <div className="text-xl font-black text-gray-900 dark:text-white tracking-tighter">KES {schedule.interest.toLocaleString()}</div>
                    </GlassCard>
                    <GlassCard className="!bg-tytaj-500/10 border-tytaj-500/20 p-6">
                        <div className="text-[9px] font-black text-tytaj-600 dark:text-tytaj-400 uppercase tracking-widest mb-1">Installment</div>
                        <div className="text-xl font-black text-tytaj-600 dark:text-tytaj-400 tracking-tighter">KES {schedule.monthly_payment.toLocaleString()}</div>
                    </GlassCard>
                </div>

                {/* Data Table */}
                <div className="rounded-[40px] border border-gray-100 dark:border-white/5 overflow-hidden shadow-2xl">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-white/5">
                            <tr>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">#</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Due Date</th>
                                <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Due</th>
                                <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Principal</th>
                                <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Interest</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {schedule.schedule.map((installment) => (
                                <tr key={installment.installment_number} className="hover:bg-tytaj-500/5 dark:hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-5 font-black text-gray-400 group-hover:text-tytaj-500 transition-colors">
                                        {installment.installment_number.toString().padStart(2, '0')}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3 text-gray-900 dark:text-gray-200 font-black tracking-tight text-xs">
                                            <Calendar className="w-4 h-4 text-tytaj-500" />
                                            {new Date(installment.payment_date).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right font-black text-gray-900 dark:text-white">
                                        KES {installment.amount_due.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-5 text-right font-bold text-gray-500 dark:text-gray-400 text-xs">
                                        KES {installment.principal_portion.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-5 text-right font-bold text-gray-500 dark:text-gray-400 text-xs">
                                        KES {installment.interest_portion.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-100/50 dark:bg-white/5 font-black text-[10px] uppercase tracking-widest">
                            <tr>
                                <td colSpan="2" className="px-6 py-6 text-right text-gray-400">Total:</td>
                                <td className="px-6 py-6 text-right text-tytaj-600 dark:text-tytaj-400">
                                    KES {schedule.total_amount.toLocaleString()}
                                </td>
                                <td className="px-6 py-6 text-right text-emerald-600 dark:text-emerald-400">
                                    KES {schedule.principal.toLocaleString()}
                                </td>
                                <td className="px-6 py-6 text-right text-purple-600 dark:text-purple-400">
                                    KES {schedule.interest.toLocaleString()}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <div className="p-8 border-t border-gray-100 dark:border-white/5 flex justify-end bg-gray-50 dark:bg-white/5">
                <button
                    onClick={onClose}
                    className="px-10 py-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 rounded-3xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all shadow-sm active:scale-95"
                >
                    Close View
                </button>
            </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default LoanScheduleModal;
