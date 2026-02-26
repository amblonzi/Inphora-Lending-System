import React, { useState, useEffect } from 'react';
import {
  X, CheckCircle, XCircle, Calendar,
  DollarSign, FileText, User, CreditCard,
  MapPin, Clock, AlertCircle, Phone, Fingerprint, Activity, ReceiptText, ShieldCheck, History
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { toast } from 'sonner';
import DisbursementModal from './DisbursementModal';
import RepaymentModal from './RepaymentModal';
import GlassCard from './ui/GlassCard';
import AnimatedButton from './ui/AnimatedButton';
import { motion, AnimatePresence } from 'framer-motion';

const LoanDetailsModal = ({ loan, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [activeLoan, setActiveLoan] = useState(loan);
  const [activeTab, setActiveTab] = useState('overview');
  const [client, setClient] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExportStatement = async () => {
    setExporting(true);
    try {
      const response = await api.loans.exportStatement(activeLoan.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Statement_Loan_${activeLoan.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Statement exported successfully");
    } catch (error) {
      toast.error("Failed to export statement");
    } finally {
      setExporting(false);
    }
  };

  const refreshLoanData = async () => {
    try {
      const updated = await api.loans.get(loan.id);
      setActiveLoan(updated);
      onUpdate();
    } catch (error) {
      toast.error("Failed to refresh loan details");
    }
  };

  useEffect(() => {
    setActiveLoan(loan);
  }, [loan]);

  useEffect(() => {
    if (activeTab === 'schedule' && !schedule) {
      fetchSchedule();
    }
    if (!client) {
      fetchClient();
    }
  }, [activeTab]);

  const fetchClient = async () => {
    try {
      const data = await api.clients.get(activeLoan.client_id);
      setClient(data);
    } catch (error) {
      console.error("Failed to fetch client details", error);
    }
  };

  const fetchSchedule = async () => {
    setLoadingSchedule(true);
    try {
      const data = await api.loans.getSchedule(activeLoan.id);
      setSchedule(data);
    } catch (error) {
      toast.error("Failed to load repayment schedule");
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handleApproval = async (action) => {
    if (action === 'reject' && !showRejectInput) {
      setShowRejectInput(true);
      return;
    }

    if (action === 'reject' && !rejectionReason.trim()) {
      toast.error("Provide a reason for rejection");
      return;
    }

    setActionLoading(true);
    try {
      await api.loans.approve(activeLoan.id, {
        action: action,
        notes: action === 'reject' ? rejectionReason : null
      });
      toast.success(`Loan ${action === 'approve' ? 'Approved' : 'Rejected'} successfully`);
      refreshLoanData();
      if (action === 'reject' || (action === 'approve' && activeLoan.current_approval_level >= 2)) {
        onClose();
      } else {
        setShowRejectInput(false);
        setRejectionReason('');
      }
    } catch (error) {
      toast.error(`Failed to ${action} loan`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisburse = () => {
    if (!client) {
      toast.error("Waiting for client details...");
      return;
    }
    setShowDisburseModal(true);
  };

  // Calculate Real-time Balances
  const totalRepaid = activeLoan.repayments?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
  const projectedTotal = activeLoan.amount + (activeLoan.amount * activeLoan.interest_rate / 100);
  const outstandingBalance = Math.max(0, projectedTotal - totalRepaid);
  const progressPercent = Math.min((totalRepaid / projectedTotal) * 100, 100);

  const StatusBadge = ({ status, level }) => {
    const configs = {
      pending: { color: "text-amber-500 bg-amber-500/10 border-amber-500/20", label: level === 1 ? "Officer Review" : "Manager Review" },
      approved: { color: "text-blue-500 bg-blue-500/10 border-blue-500/20", label: "Approved" },
      active: { color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", label: "Active" },
      rejected: { color: "text-rose-500 bg-rose-500/10 border-rose-500/20", label: "Rejected" },
      completed: { color: "text-gray-500 bg-gray-500/10 border-gray-500/20", label: "Completed" }
    };
    const config = configs[status] || configs.pending;
    return (
      <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-5xl"
      >
        <GlassCard className="!p-0 border-white/20 dark:border-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden max-h-[90vh] flex flex-col">

          {/* Header Area */}
          <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-start bg-gray-50/50 dark:bg-white/5 relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-tytaj-500/5 blur-[100px]" />
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 flex items-center justify-center text-tytaj-500 shadow-sm">
                  <Fingerprint size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">Loan #{activeLoan.id}</h2>
                    <StatusBadge status={activeLoan.status} level={activeLoan.current_approval_level} />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Start Date:</span>
                    <span className="text-[10px] font-black text-gray-900 dark:text-gray-300 uppercase tracking-widest bg-white dark:bg-white/5 px-2 py-0.5 rounded border border-gray-100 dark:border-white/5">
                      {new Date(activeLoan.start_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 relative z-10">
              <button
                onClick={handleExportStatement}
                disabled={exporting}
                className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-tytaj-500 hover:text-tytaj-600 rounded-2xl transition-all text-gray-500 font-black text-[10px] uppercase tracking-widest active:scale-95 shadow-sm"
              >
                {exporting ? <RefreshCw size={18} className="animate-spin" /> : <FileText size={18} />}
                {exporting ? 'Exporting...' : 'Export Statement'}
              </button>
              <button
                onClick={onClose}
                className="p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-rose-500 dark:hover:bg-rose-500 hover:text-white rounded-2xl transition-all text-gray-500 group"
              >
                <X size={24} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>
          </div>

          {/* Tab Controller */}
          <div className="flex gap-2 p-2 bg-gray-100/50 dark:bg-black/20 border-b border-gray-100 dark:border-white/5 scroll-x-auto no-scrollbar">
            {[
              { id: 'overview', label: 'Details', icon: FileText },
              { id: 'guarantors', label: 'Guarantors', icon: User },
              { id: 'collateral', label: 'Collateral & Refs', icon: MapPin },
              { id: 'schedule', label: 'Schedule', icon: Calendar },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab.id
                    ? 'bg-white dark:bg-slate-900 text-tytaj-600 dark:text-tytaj-400 shadow-sm ring-1 ring-gray-100 dark:ring-white/10'
                    : 'text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Scrollable Context */}
          <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-[#0a0a0f] scroll-smooth custom-scrollbar">

            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-10"
                >
                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <GlassCard className="!bg-blue-500/5 border-blue-500/10 p-6 flex flex-col items-center text-center group hover:!bg-blue-500/10 transition-all">
                      <DollarSign className="text-blue-500 mb-3 group-hover:scale-110 transition-transform" size={24} />
                      <span className="text-[10px] font-black text-blue-600/60 dark:text-blue-400/60 uppercase tracking-[0.2em] mb-1">Principal Amount</span>
                      <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">KES {activeLoan.amount.toLocaleString()}</div>
                    </GlassCard>

                    <GlassCard className="!bg-emerald-500/5 border-emerald-500/10 p-6 flex flex-col items-center text-center group hover:!bg-emerald-500/10 transition-all relative overflow-hidden">
                      <div className="absolute inset-0 bg-emerald-500/5" style={{ width: `${progressPercent}%` }} />
                      <div className="relative z-10 flex flex-col items-center">
                        <CheckCircle className="text-emerald-500 mb-3 group-hover:scale-110 transition-transform" size={24} />
                        <span className="text-[10px] font-black text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-[0.2em] mb-1">Total Repaid</span>
                        <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">KES {totalRepaid.toLocaleString()}</div>
                      </div>
                    </GlassCard>

                    <GlassCard className="!bg-rose-500/5 border-rose-500/10 p-6 flex flex-col items-center text-center group hover:!bg-rose-500/10 transition-all">
                      <AlertCircle className="text-rose-500 mb-3 group-hover:scale-110 transition-transform" size={24} />
                      <span className="text-[10px] font-black text-rose-600/60 dark:text-rose-400/60 uppercase tracking-[0.2em] mb-1">Outstanding Bal.</span>
                      <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">KES {outstandingBalance.toLocaleString()}</div>
                    </GlassCard>

                    <GlassCard className="!bg-purple-500/5 border-purple-500/10 p-6 flex flex-col items-center text-center group hover:!bg-purple-500/10 transition-all">
                      <Activity className="text-purple-500 mb-3 group-hover:scale-110 transition-transform" size={24} />
                      <span className="text-[10px] font-black text-purple-600/60 dark:text-purple-400/60 uppercase tracking-[0.2em] mb-1">Interest Rate</span>
                      <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">{activeLoan.interest_rate}%</div>
                    </GlassCard>
                  </div>

                  {/* Financial Analysis Matrix */}
                  {activeLoan.financial_analysis && (
                    <GlassCard className="p-8 border-white/20 dark:border-white/5 shadow-lg">
                      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100 dark:border-white/5">
                        <ReceiptText size={20} className="text-tytaj-500" />
                        <h3 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.3em]">Financial Analysis</h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block">Sales (Mo)</span>
                          <span className="text-lg font-black text-gray-900 dark:text-gray-100 tracking-tighter">KES {activeLoan.financial_analysis.monthly_sales.toLocaleString()}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block">Expenses (Mo)</span>
                          <span className="text-lg font-black text-gray-900 dark:text-gray-100 tracking-tighter text-rose-500/80">KES {activeLoan.financial_analysis.expenditure.toLocaleString()}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block">Net Income</span>
                          <span className="text-lg font-black text-emerald-500 tracking-tighter">KES {activeLoan.financial_analysis.net_income.toLocaleString()}</span>
                        </div>
                      </div>
                    </GlassCard>
                  )}

                  {/* Multi-level Approval Controls */}
                  {activeLoan.status === 'pending' && (
                    <div className="pt-6 border-t border-gray-100 dark:border-white/5">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={14} className="text-tytaj-500" />
                          <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">
                            Approval Stage: {activeLoan.current_approval_level === 1 ? 'Credit Officer' : 'Manager Final'}
                          </span>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${activeLoan.current_approval_level === 1 ? 'border-amber-500/20 text-amber-500' : 'border-blue-500/20 text-blue-500'}`}>
                          Level {activeLoan.current_approval_level}
                        </span>
                      </div>

                      {showRejectInput ? (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-rose-500/5 p-8 rounded-[32px] border border-rose-500/20 space-y-6"
                        >
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest ml-1">Rejection Reason *</label>
                            <textarea
                              className="w-full p-5 bg-white dark:bg-black/20 border border-rose-500/20 rounded-2xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all dark:text-white font-medium min-h-[100px]"
                              placeholder="Enter reason for rejection..."
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-4">
                            <AnimatedButton
                              onClick={() => handleApproval('reject')}
                              disabled={actionLoading}
                              className="flex-1 bg-rose-600 shadow-xl shadow-rose-600/20"
                            >
                              {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                            </AnimatedButton>
                            <button
                              onClick={() => setShowRejectInput(false)}
                              className="flex-1 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <AnimatedButton
                              onClick={() => handleApproval('approve')}
                              disabled={actionLoading}
                              className={`w-full py-5 rounded-[24px] text-[12px] font-black uppercase tracking-widest shadow-2xl transition-all ${activeLoan.current_approval_level === 1
                                  ? 'bg-amber-600 shadow-amber-600/30'
                                  : 'bg-emerald-600 shadow-emerald-600/30'
                                }`}
                            >
                              <CheckCircle size={20} className="mr-2" />
                              {activeLoan.current_approval_level === 1 ? 'Verify & Pass to Manager' : 'Final Manager Approval'}
                            </AnimatedButton>
                            <button
                              onClick={() => handleApproval('reject')}
                              disabled={actionLoading}
                              className="w-full flex items-center justify-center gap-2 py-5 rounded-[24px] text-[12px] font-black uppercase tracking-widest dark:bg-white/5 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                            >
                              <XCircle size={20} /> Reject Loan
                            </button>
                          </div>

                          {/* Approval History Snippet */}
                          {activeLoan.approvals?.length > 0 && (
                            <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10">
                              <div className="flex items-center gap-2 mb-4">
                                <History size={14} className="text-gray-400" />
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Approval History</span>
                              </div>
                              <div className="space-y-3">
                                {activeLoan.approvals.map((app, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-[10px] font-black uppercase tracking-tight">
                                    <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      <span className="text-gray-500">Level {app.level} Verified</span>
                                    </div>
                                    <span className="text-gray-400">{new Date(app.created_at).toLocaleDateString()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Disbursement Vector */}
                  {activeLoan.status === 'approved' && (
                    <div className="pt-6 border-t border-gray-100 dark:border-white/5">
                      <GlassCard className="!bg-tytaj-500/5 dark:!bg-tytaj-500/10 p-10 border-tytaj-500/20 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
                        <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-tytaj-500/10 blur-[100px] group-hover:bg-tytaj-500/20 transition-all" />
                        <div className="relative z-10 text-center md:text-left">
                          <h3 className="text-2xl font-black text-tytaj-900 dark:text-tytaj-400 tracking-tight mb-2">Disburse Loan</h3>
                          <p className="text-sm font-medium text-tytaj-700 dark:text-tytaj-300 opacity-80">Loan approved. Ready for disbursement.</p>
                        </div>
                        <AnimatedButton
                          onClick={handleDisburse}
                          disabled={actionLoading}
                          className="w-full md:w-auto px-10 py-5 rounded-3xl text-[12px] font-black uppercase tracking-widest shadow-2xl shadow-tytaj-600/30 relative z-10"
                        >
                          <DollarSign size={20} className="mr-2" /> Disburse Funds
                        </AnimatedButton>
                      </GlassCard>
                    </div>
                  )}

                  {/* Repayment Vector */}
                  {activeLoan.status === 'active' && (
                    <div className="pt-6 border-t border-gray-100 dark:border-white/5">
                      <GlassCard className="!bg-emerald-500/5 dark:!bg-emerald-500/10 p-10 border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
                        <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-emerald-500/10 blur-[100px] group-hover:bg-emerald-500/20 transition-all" />
                        <div className="relative z-10 text-center md:text-left">
                          <h3 className="text-2xl font-black text-emerald-900 dark:text-emerald-400 tracking-tight mb-2">Active Loan</h3>
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 opacity-80">Loan is currently active. Record manual repayments.</p>
                        </div>
                        <AnimatedButton
                          onClick={() => setShowRepaymentModal(true)}
                          className="w-full md:w-auto px-10 py-5 rounded-3xl text-[12px] font-black uppercase tracking-widest shadow-2xl shadow-emerald-600/30 relative z-10 bg-emerald-600"
                        >
                          <DollarSign size={20} className="mr-2" /> Record Payment
                        </AnimatedButton>
                      </GlassCard>
                    </div>
                  )}

                  {/* Rejection Diagnostics */}
                  {activeLoan.status === 'rejected' && (
                    <GlassCard className="!bg-rose-500/5 border-rose-500/10 p-8 flex gap-5 items-start">
                      <div className="p-3 bg-rose-500/20 text-rose-600 rounded-2xl">
                        <AlertCircle size={24} />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-3">Rejection Reason</h4>
                        <p className="text-gray-600 dark:text-gray-400 font-medium leading-relaxed">{activeLoan.rejection_reason || 'No reason provided.'}</p>
                      </div>
                    </GlassCard>
                  )}
                </motion.div>
              )}

              {activeTab === 'guarantors' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {activeLoan.guarantors?.length === 0 ? (
                    <div className="col-span-full py-20 text-center space-y-4 opacity-50">
                      <User className="mx-auto text-gray-400" size={48} />
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">No guarantors listed.</p>
                    </div>
                  ) : (
                    activeLoan.guarantors?.map((g, i) => (
                      <GlassCard key={g.id} delay={i * 0.1} hoverEffect className="p-6 border-white/20 dark:border-white/5 relative group">
                        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-tytaj-500/5 blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 border border-gray-200 dark:border-white/10">
                              <User size={24} />
                            </div>
                            <span className="text-lg font-black text-gray-900 dark:text-white tracking-tight">{g.name}</span>
                          </div>
                          <span className="text-[9px] font-black bg-tytaj-500/10 text-tytaj-600 dark:text-tytaj-400 px-3 py-1 rounded-full border border-tytaj-500/20 uppercase tracking-wider">{g.relation}</span>
                        </div>
                        <div className="space-y-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                            <Phone size={14} className="text-tytaj-500" /> {g.phone}
                          </div>
                          <div className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                            <CreditCard size={14} className="text-tytaj-500" /> ID Number: {g.id_number}
                          </div>
                          <div className="flex items-start gap-3 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                            <MapPin size={14} className="text-tytaj-500 mt-0.5 shrink-0" />
                            <span className="leading-tight">{g.residence} ({g.landmark})</span>
                          </div>
                        </div>
                      </GlassCard>
                    ))
                  )}
                </motion.div>
              )}

              {activeTab === 'collateral' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-12"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-6">
                      <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">Collateral Assets</span>
                    </div>
                    {activeLoan.collateral?.length === 0 ? (
                      <div className="py-10 text-center opacity-40">
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest italic">No collateral listed.</p>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-[32px] border border-gray-200 dark:border-white/10 shadow-xl overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100/50 dark:bg-white/5">
                            <tr>
                              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Asset Name</th>
                              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Serial No.</th>
                              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Condition</th>
                              <th className="px-6 py-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {activeLoan.collateral?.map(c => (
                              <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <td className="px-6 py-5 font-black text-gray-900 dark:text-white tracking-tight">{c.name}</td>
                                <td className="px-6 py-5 text-gray-500 dark:text-gray-400 font-mono text-xs">{c.serial_number || '-'}</td>
                                <td className="px-6 py-5">
                                  <span className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-[9px] font-black uppercase text-gray-600 dark:text-gray-400 tracking-widest border border-gray-200 dark:border-white/5">{c.condition || 'Good'}</span>
                                </td>
                                <td className="px-6 py-5 text-right font-black text-tytaj-600 dark:text-tytaj-400">KES {c.estimated_value.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-2 mb-6">
                      <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">Referees</span>
                    </div>
                    {activeLoan.referees?.length === 0 ? (
                      <div className="py-10 text-center opacity-40">
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest italic">No referees listed.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {activeLoan.referees?.map(r => (
                          <GlassCard key={r.id} className="p-6 border-white/20 dark:border-white/5 flex justify-between items-center group">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-center text-gray-400 group-hover:text-tytaj-500 transition-colors">
                                <User size={20} />
                              </div>
                              <div>
                                <div className="font-black text-gray-900 dark:text-white text-sm tracking-tight mb-1">{r.name}</div>
                                <div className="text-[9px] font-black text-tytaj-600 dark:text-tytaj-400 uppercase tracking-widest">{r.relation}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-bold text-gray-700 dark:text-gray-300 font-mono">{r.phone}</div>
                              <div className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1 opacity-60">{r.address || "No Address"}</div>
                            </div>
                          </GlassCard>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'schedule' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="h-full"
                >
                  {loadingSchedule ? (
                    <div className="flex flex-col items-center justify-center py-32 text-gray-400 space-y-6">
                      <div className="w-12 h-12 border-4 border-tytaj-500/20 border-t-tytaj-500 rounded-full animate-spin" />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Generating Repayment Grid...</p>
                    </div>
                  ) : schedule ? (
                    <div className="space-y-10">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <GlassCard className="!bg-white dark:!bg-white/5 p-6 text-center border-white/20 dark:border-white/10 shadow-lg">
                          <div className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] mb-2">Total Amount</div>
                          <div className="font-black text-gray-900 dark:text-white text-2xl tracking-tighter">KES {schedule.total_amount?.toLocaleString()}</div>
                        </GlassCard>
                        <GlassCard className="!bg-tytaj-500/10 p-6 text-center border-tytaj-500/20 shadow-lg relative overflow-hidden group">
                          <div className="absolute inset-0 bg-tytaj-500/5 animate-pulse" />
                          <div className="relative z-10">
                            <div className="text-[9px] font-black text-tytaj-600 dark:text-tytaj-400 uppercase tracking-[0.3em] mb-2">Installment</div>
                            <div className="font-black text-tytaj-600 dark:text-tytaj-400 text-3xl tracking-tighter leading-none">KES {schedule.monthly_payment?.toLocaleString()}</div>
                          </div>
                        </GlassCard>
                        <GlassCard className="!bg-white dark:!bg-white/5 p-6 text-center border-white/20 dark:border-white/10 shadow-lg">
                          <div className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] mb-2">Next Payment</div>
                          <div className="font-black text-gray-900 dark:text-white text-2xl tracking-tighter leading-none">
                            {schedule.schedule?.[0] ? new Date(schedule.schedule[0].due_date).toLocaleDateString() : 'N/A'}
                          </div>
                        </GlassCard>
                      </div>

                      <div className="overflow-hidden rounded-[32px] border border-gray-200 dark:border-white/10 shadow-2xl overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100/50 dark:bg-white/5 backdrop-blur-md">
                            <tr>
                              <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">#</th>
                              <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Due Date</th>
                              <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Total Due</th>
                              <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Principal</th>
                              <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Interest</th>
                              <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {schedule.schedule?.map((row) => (
                              <tr key={row.installment_number} className="hover:bg-tytaj-500/5 dark:hover:bg-tytaj-500/10 transition-colors">
                                <td className="px-6 py-5 text-[10px] font-black text-gray-400 dark:text-gray-600">{row.installment_number.toString().padStart(2, '0')}</td>
                                <td className="px-6 py-5 font-black text-gray-900 dark:text-white text-xs tracking-tight">
                                  {new Date(row.due_date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-5 text-right font-black text-tytaj-600 dark:text-tytaj-400">
                                  {row.amount_due.toLocaleString()}
                                </td>
                                <td className="px-6 py-5 text-right text-xs font-bold text-gray-500 dark:text-gray-400">{row.principal_amount.toLocaleString()}</td>
                                <td className="px-6 py-5 text-right text-xs font-bold text-gray-500 dark:text-gray-400">{row.interest_amount.toLocaleString()}</td>
                                <td className="px-6 py-5 text-right font-black text-gray-900 dark:text-white">{row.balance.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-20 text-rose-500 font-black uppercase tracking-widest text-xs">Failed to load repayment schedule.</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </GlassCard>
      </motion.div>

      {showDisburseModal && client && (
        <DisbursementModal
          loan={activeLoan}
          client={client}
          api={api}
          onClose={() => setShowDisburseModal(false)}
          onSuccess={() => {
            refreshLoanData();
            onClose();
          }}
        />
      )}

      {showRepaymentModal && (
        <RepaymentModal
          loan={activeLoan}
          api={api}
          onClose={() => setShowRepaymentModal(false)}
          onSuccess={() => {
            setShowRepaymentModal(false);
            refreshLoanData();
          }}
        />
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default LoanDetailsModal;
