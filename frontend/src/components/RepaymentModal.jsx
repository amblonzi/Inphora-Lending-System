import React, { useState } from 'react';
import { X, DollarSign, Calendar, Receipt, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import GlassCard from './ui/GlassCard';
import AnimatedButton from './ui/AnimatedButton';

const RepaymentModal = ({ loan, onClose, onSuccess, api }) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    
    try {
      await api.loans.repay(loan.id, {
        amount: parseFloat(formData.get('amount')),
        payment_date: formData.get('payment_date'),
        notes: formData.get('notes')
      });
      toast.success('Payment recorded successfully');
      onSuccess();
    } catch (error) {
      toast.error('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black uppercase tracking-tight placeholder:opacity-30";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <GlassCard className="!p-0 border-white/20 dark:border-white/10 shadow-2xl overflow-hidden relative">
            <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-emerald-500/5 blur-[100px]" />
            
            {/* Header Area */}
            <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-start bg-gray-50/50 dark:bg-white/5 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Fingerprint size={14} className="text-emerald-500" />
                        <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">Repayment</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Record Payment</h3>
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
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Amount (KES)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
                            <input
                                name="amount"
                                type="number"
                                step="0.01"
                                required
                                className={`${inputClass} pl-12`}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-tytaj-500" size={20} />
                            <input
                                name="payment_date"
                                type="date"
                                required
                                defaultValue={new Date().toISOString().split('T')[0]}
                                className={`${inputClass} pl-12`}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Notes</label>
                        <div className="relative">
                            <Receipt className="absolute left-4 top-6 text-gray-400" size={20} />
                            <textarea
                                name="notes"
                                rows="3"
                                className={`${inputClass} pl-12 min-h-[120px] pt-4 resize-none`}
                                placeholder="e.g. MPESA_REF: QH1234..."
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
                        className="flex-1 py-5 rounded-3xl shadow-xl shadow-emerald-600/20 bg-emerald-600"
                    >
                        {loading ? 'Processing...' : 'Submit Payment'}
                    </AnimatedButton>
                </div>
            </form>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default RepaymentModal;
