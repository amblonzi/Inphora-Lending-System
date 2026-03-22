import React, { useState } from 'react';
import { X, DollarSign, Calendar, Receipt, Fingerprint, Smartphone, Landmark, Wallet, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import GlassCard from './ui/GlassCard';
import AnimatedButton from './ui/AnimatedButton';

const RepaymentModal = ({ loan, onClose, onSuccess, api }) => {
    const [loading, setLoading] = useState(false);
    const [method, setMethod] = useState('manual');
    const [stkPushing, setStkPushing] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target);

        try {
            const payload = {
                amount: parseFloat(formData.get('amount')),
                payment_date: formData.get('payment_date'),
                notes: formData.get('notes'),
                payment_method: method,
                mpesa_transaction_id: formData.get('mpesa_ref') || null
            };

            await api.loans.repay(loan.id, payload);
            toast.success('Payment recorded successfully');
            onSuccess();
            onClose();
        } catch (error) {
            toast.error('Failed to record payment');
        } finally {
            setLoading(false);
        }
    };

    const handleStkPush = async () => {
        const amount = document.getElementsByName('amount')[0]?.value;
        if (!amount || parseFloat(amount) <= 0) {
            toast.error("Please enter a valid amount for STK Push");
            return;
        }

        setStkPushing(true);
        try {
            const res = await api.mpesa.stkPush(loan.id, parseFloat(amount));
            if (res.ResponseCode === "0") {
                toast.success("STK Push sent to phone. Enter PIN to complete.");
            } else {
                toast.error("STK Push failed: " + res.CustomerMessage);
            }
        } catch (error) {
            toast.error("Failed to initiate STK Push");
        } finally {
            setStkPushing(false);
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

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Payment Method</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setMethod('mpesa')}
                                        className={`p-4 border-2 rounded-2xl flex flex-col items-center gap-2 transition-all group ${method === 'mpesa' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-gray-100 dark:border-white/5 text-gray-400'
                                            }`}
                                    >
                                        <Smartphone className={`w-6 h-6 ${method === 'mpesa' ? 'animate-pulse' : ''}`} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">M-Pesa</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMethod('bank')}
                                        className={`p-4 border-2 rounded-2xl flex flex-col items-center gap-2 transition-all ${method === 'bank' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'border-gray-100 dark:border-white/5 text-gray-400'
                                            }`}
                                    >
                                        <Landmark className="w-6 h-6" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Bank</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMethod('manual')}
                                        className={`p-4 border-2 rounded-2xl flex flex-col items-center gap-2 transition-all ${method === 'manual' ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'border-gray-100 dark:border-white/5 text-gray-400'
                                            }`}
                                    >
                                        <Wallet className="w-6 h-6" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Manual</span>
                                    </button>
                                </div>
                            </div>

                            {method === 'mpesa' && (
                                <div className="pt-2">
                                    <button
                                        type="button"
                                        onClick={handleStkPush}
                                        disabled={stkPushing}
                                        className="w-full py-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
                                    >
                                        {stkPushing ? <Zap size={16} className="animate-spin" /> : <Zap size={16} />}
                                        {stkPushing ? 'Pushing STK...' : 'Send STK Push Request'}
                                    </button>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                                    {method === 'mpesa' ? 'M-Pesa Reference' : method === 'bank' ? 'Bank Reference' : 'Notes'}
                                </label>
                                <div className="relative">
                                    <Receipt className="absolute left-4 top-6 text-gray-400" size={20} />
                                    <textarea
                                        name={method === 'mpesa' ? 'mpesa_ref' : 'notes'}
                                        rows="3"
                                        className={`${inputClass} pl-12 min-h-[100px] pt-4 resize-none`}
                                        placeholder={method === 'mpesa' ? "Enter M-Pesa Receipt Number..." : "Enter transaction details..."}
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
