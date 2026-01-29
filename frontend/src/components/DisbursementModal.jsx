import React, { useState } from 'react';
import { X, CreditCard, Building, Banknote, Loader, Fingerprint, Activity, Smartphone, Landmark, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from './ui/GlassCard';
import AnimatedButton from './ui/AnimatedButton';
import { toast } from 'sonner';

const DisbursementModal = ({ loan, client, onClose, onSuccess, api }) => {
  const [method, setMethod] = useState('mpesa');
  const [phone, setPhone] = useState(client.mpesa_phone || client.phone || '');
  const [bankReference, setBankReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDisburse = async () => {
    setLoading(true);
    try {
      let response;
      
      if (method === 'mpesa') {
        response = await api.mpesa.disburse(loan.id);
        toast.success(`M-Pesa disbursement initiated: ${response.message || 'Processing'}`);
      } else if (method === 'bank') {
        response = await api.client.post(`/api/disbursements/loans/${loan.id}/disburse/bank`, null, {
          params: { bank_reference: bankReference }
        });
        toast.success(`Bank transfer recorded: ${bankReference}`);
      } else {
        response = await api.client.post(`/api/disbursements/loans/${loan.id}/disburse/manual`, null, {
          params: { notes }
        });
        toast.success('Manual disbursement recorded');
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Disbursement failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black uppercase tracking-tight placeholder:opacity-30";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <GlassCard className="!p-0 border-white/20 dark:border-white/10 shadow-2xl overflow-hidden relative">
            <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-tytaj-500/5 blur-[100px]" />
            
            {/* Header Area */}
            <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-start bg-gray-50/50 dark:bg-white/5 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Activity size={14} className="text-tytaj-500" />
                        <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">Loan Disbursement</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Disburse Loan</h3>
                </div>
                <button 
                    onClick={onClose} 
                    className="p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-rose-500 dark:hover:bg-rose-500 hover:text-white rounded-2xl transition-all text-gray-500 group"
                >
                    <X size={24} className="group-hover:rotate-90 transition-transform" />
                </button>
            </div>

            <div className="p-10 space-y-8 relative z-10 bg-white dark:bg-[#0a0a0f]">
                {/* Disbursement Summary */}
                <GlassCard className="!bg-tytaj-500/5 border-tytaj-500/10 p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                            <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block">Client</span>
                            <span className="text-lg font-black text-gray-900 dark:text-white tracking-tight">{client.first_name} {client.last_name}</span>
                        </div>
                        <Fingerprint size={20} className="text-tytaj-500/50" />
                    </div>
                    <div className="space-y-1">
                        <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block">Loan Amount</span>
                        <span className="text-3xl font-black text-tytaj-600 dark:text-tytaj-400 tracking-tighter">KES {loan.amount.toLocaleString()}</span>
                    </div>
                </GlassCard>

                {/* Vector Selection */}
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Payment Method</label>
                    <div className="grid grid-cols-3 gap-3">
                        <button
                            type="button"
                            onClick={() => setMethod('mpesa')}
                            className={`p-4 border-2 rounded-2xl flex flex-col items-center gap-2 transition-all group ${
                                method === 'mpesa' ? 'border-tytaj-500 bg-tytaj-500/10 text-tytaj-600 dark:text-tytaj-400' : 'border-gray-100 dark:border-white/5 text-gray-400'
                            }`}
                        >
                            <Smartphone className={`w-6 h-6 ${method === 'mpesa' ? 'animate-pulse' : ''}`} />
                            <span className="text-[9px] font-black uppercase tracking-widest">M-Pesa</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMethod('bank')}
                            className={`p-4 border-2 rounded-2xl flex flex-col items-center gap-2 transition-all ${
                                method === 'bank' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'border-gray-100 dark:border-white/5 text-gray-400'
                            }`}
                        >
                            <Landmark className="w-6 h-6" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Bank</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMethod('manual')}
                            className={`p-4 border-2 rounded-2xl flex flex-col items-center gap-2 transition-all ${
                                method === 'manual' ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'border-gray-100 dark:border-white/5 text-gray-400'
                            }`}
                        >
                            <Wallet className="w-6 h-6" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Manual</span>
                        </button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {method === 'mpesa' && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-2"
                    >
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">M-Pesa Phone Number</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className={inputClass}
                            placeholder="2547XXXXXXXX"
                        />
                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest opacity-60 ml-1">Instant mobile payment</p>
                    </motion.div>
                    )}

                    {method === 'bank' && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        <GlassCard className="bg-gray-50 dark:bg-white/5 p-4 space-y-2 border-gray-100 dark:border-white/5 shadow-sm">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <span>Institution:</span>
                                <span className="text-gray-900 dark:text-gray-200">{client.bank_name || 'NOT_SET'}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <span>Repository:</span>
                                <span className="text-gray-900 dark:text-gray-200 font-mono">{client.bank_account_number || 'NOT_SET'}</span>
                            </div>
                        </GlassCard>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Reference Number</label>
                            <input
                                type="text"
                                value={bankReference}
                                onChange={(e) => setBankReference(e.target.value)}
                                className={inputClass}
                                placeholder="e.g. FT2024..."
                            />
                        </div>
                    </motion.div>
                    )}

                    {method === 'manual' && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-2"
                    >
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className={`${inputClass} min-h-[100px] pt-4 resize-none`}
                            placeholder="Specify manual transfer details..."
                        />
                    </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer Actions */}
                <div className="pt-4 flex flex-col sm:flex-row gap-4">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <AnimatedButton
                        onClick={handleDisburse}
                        isLoading={loading}
                        className="flex-1 py-5 rounded-3xl shadow-xl shadow-tytaj-600/20"
                        disabled={
                            loading || 
                            (method === 'mpesa' && !phone) ||
                            (method === 'bank' && !bankReference) ||
                            (method === 'manual' && !notes)
                        }
                    >
                        Disburse Loan
                    </AnimatedButton>
                </div>
            </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default DisbursementModal;
