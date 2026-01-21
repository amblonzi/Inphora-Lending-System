import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Smartphone, Search, RefreshCw, CheckCircle2, XCircle, 
  Settings, History, Wallet, AlertCircle, Link as LinkIcon,
  Activity, Fingerprint, Database, Cpu, ShieldCheck, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../components/ui/GlassCard';
import AnimatedButton from '../components/ui/AnimatedButton';

const MpesaManagement = () => {
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState('transactions');
  const [loading, setLoading] = useState(true);
  const [unmatched, setUnmatched] = useState([]);
  const [loans, setLoans] = useState([]);
  const [reconcilingId, setReconcilingId] = useState(null);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [balanceData, setBalanceData] = useState(null);
  
  const [settings, setSettings] = useState({
    mpesa_shortcode: '174379',
    mpesa_consumer_key: '',
    mpesa_consumer_secret: '',
    mpesa_passkey: '',
    mpesa_env: 'sandbox'
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'transactions') {
        const data = await api.mpesa.getUnmatched();
        setUnmatched(data);
        const loansData = await api.loans.list();
        setLoans(loansData.filter(l => l.status === 'active'));
      }
    } catch (error) {
      toast.error("Failed to load M-Pesa data");
    } finally {
      setLoading(false);
    }
  };

  const handleReconcile = async (transId) => {
    if (!selectedLoanId) {
      toast.error("Target loan not selected");
      return;
    }
    
    try {
      await api.mpesa.reconcile(transId, selectedLoanId);
      toast.success("Transaction reconciled successfully");
      setReconcilingId(null);
      setSelectedLoanId('');
      fetchData();
    } catch (error) {
      toast.error("Reconciliation failed");
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await api.mpesa.updateSettings(settings);
      toast.success("API settings saved");
    } catch (error) {
      toast.error("Failed to save settings");
    }
  };

  const handleCheckBalance = async () => {
    try {
      const data = await api.mpesa.getBalance();
      setBalanceData(data);
      toast.success("Balance updated successfully");
    } catch (error) {
      toast.error("Failed to check balance");
    }
  };

  const inputClass = "w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black uppercase tracking-tight placeholder:opacity-30";

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Cpu size={14} className="text-tytaj-500 animate-pulse" />
            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">Financial Management</span>
          </div>
          <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">Transaction History</h2>
        </div>
        
        <div className="flex bg-gray-100 dark:bg-white/5 p-1.5 rounded-[24px] overflow-hidden border border-gray-200 dark:border-white/5 shadow-inner">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-8 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'transactions' ? 'bg-white dark:bg-tytaj-500 text-tytaj-600 dark:text-white shadow-xl scale-105' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            Reconciliation
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-8 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-white dark:bg-tytaj-500 text-tytaj-600 dark:text-white shadow-xl scale-105' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            API Settings
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'transactions' ? (
          <motion.div 
            key="transactions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GlassCard className="!bg-tytaj-500/5 border-tytaj-500/10 p-8 group hover:-translate-y-1 transition-transform">
                <div className="flex items-center justify-between mb-6">
                  <div className="bg-tytaj-500/10 p-4 rounded-2xl text-tytaj-600 dark:text-tytaj-400">
                    <Activity size={28} />
                  </div>
                  <span className="text-[10px] font-black text-tytaj-500/50 uppercase tracking-widest">Status</span>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Unreconciled Transactions</h4>
                  <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{unmatched.length}</p>
                </div>
              </GlassCard>

              <GlassCard className="!bg-emerald-500/5 border-emerald-500/10 p-8 group hover:-translate-y-1 transition-transform md:col-span-2">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-emerald-500/10 p-4 rounded-2xl text-emerald-600 dark:text-emerald-400">
                      <Wallet size={28} />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">M-Pesa Gateway Balance</h4>
                      <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
                        {balanceData ? `KES ${balanceData.balance.toLocaleString()}` : '0.00'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={handleCheckBalance} 
                    className="p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-400 hover:text-tytaj-600 dark:hover:text-tytaj-400 rounded-2xl transition-all active:rotate-180"
                  >
                    <RefreshCw size={20} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest">Online</span>
                </div>
              </GlassCard>
            </div>

            <div className="rounded-[40px] border border-gray-100 dark:border-white/5 overflow-hidden shadow-2xl relative">
                <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <Database size={18} className="text-tytaj-500" />
                        <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">Transactions</h3>
                    </div>
                    <button 
                      onClick={fetchData} 
                      className="p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-tytaj-500/20 rounded-xl transition-all active:scale-95"
                    >
                      <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
                
                <div className="overflow-x-auto bg-white dark:bg-[#0a0a0f]">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                      <tr>
                        <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Transaction ID</th>
                        <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Sender</th>
                        <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Reference</th>
                        <th className="px-8 py-6 text-right text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Amount</th>
                        <th className="px-8 py-6 text-right text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {loading ? (
                        <tr><td colSpan="5" className="p-20 text-center"><div className="flex flex-col items-center gap-4"><div className="w-10 h-10 border-4 border-tytaj-500/10 border-t-tytaj-500 rounded-full animate-spin"></div><span className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-400">Loading transactions...</span></div></td></tr>
                      ) : unmatched.length === 0 ? (
                        <tr><td colSpan="5" className="p-20 text-center text-gray-400 dark:text-gray-500 font-black uppercase tracking-[0.3em] opacity-40">All transactions reconciled</td></tr>
                      ) : (
                        unmatched.map((tx) => (
                          <tr key={tx.id} className="hover:bg-tytaj-500/5 dark:hover:bg-white/5 transition-all group">
                            <td className="px-8 py-6 font-mono text-xs dark:text-gray-300 font-black">{tx.transaction_id}</td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-2">
                                <Smartphone size={12} className="text-gray-400" />
                                <span className="font-black text-gray-900 dark:text-gray-200 tracking-tight">+{tx.phone}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6 uppercase font-black text-tytaj-600 dark:text-tytaj-400 text-xs tracking-widest">{tx.bill_ref}</td>
                            <td className="px-8 py-6 text-right font-black text-lg text-gray-900 dark:text-white tracking-tighter">KES {tx.amount.toLocaleString()}</td>
                            <td className="px-8 py-6 text-right">
                              {reconcilingId === tx.id ? (
                                <motion.div 
                                  initial={{ opacity: 0, x: 20 }} 
                                  animate={{ opacity: 1, x: 0 }}
                                  className="flex items-center gap-2 justify-end"
                                >
                                  <select 
                                    className="text-[10px] font-black uppercase tracking-widest border-2 border-tytaj-500/20 dark:bg-[#1a1a24] dark:text-white rounded-[15px] p-3 outline-none focus:ring-4 focus:ring-tytaj-500/10 min-w-[200px]"
                                    value={selectedLoanId}
                                    onChange={(e) => setSelectedLoanId(e.target.value)}
                                  >
                                    <option value="">Select Loan...</option>
                                    {loans.map(l => (
                                      <option key={l.id} value={l.id}>LOAN #{l.id} - {l.client_name}</option>
                                    ))}
                                  </select>
                                  <button onClick={() => handleReconcile(tx.id)} className="bg-emerald-600 p-3 rounded-xl hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-90 transition-all">
                                    <CheckCircle2 size={18} />
                                  </button>
                                  <button onClick={() => {setReconcilingId(null); setSelectedLoanId('')}} className="bg-gray-200 dark:bg-white/10 p-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-rose-500 hover:text-white transition-all active:scale-90">
                                    <XCircle size={18} />
                                  </button>
                                </motion.div>
                              ) : (
                                <button
                                  onClick={() => setReconcilingId(tx.id)}
                                  className="px-6 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[9px] font-black uppercase tracking-[0.2em] text-tytaj-600 dark:text-tytaj-400 hover:bg-tytaj-600 hover:text-white dark:hover:bg-tytaj-500 dark:hover:text-white rounded-xl transition-all shadow-sm active:scale-95 ml-auto"
                                >
                                  Link Transaction
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="settings"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center"
          >
            <GlassCard className="border-white/20 dark:border-white/10 p-12 max-w-3xl w-full relative overflow-hidden bg-white dark:bg-[#0a0a0f] shadow-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <ShieldCheck size={120} />
              </div>
              
              <div className="flex items-center gap-6 mb-12">
                <div className="p-5 bg-tytaj-500/10 text-tytaj-600 dark:text-tytaj-400 rounded-[32px] shadow-xl">
                    <Settings size={32} className="animate-spin-slow" />
                </div>
                <div>
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">M-Pesa Settings</h3>
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">Daraja API Configuration</p>
                </div>
              </div>
              
              <form onSubmit={handleSaveSettings} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Paybill Shortcode</label>
                    <div className="relative">
                      <Zap className="absolute left-4 top-1/2 -translate-y-1/2 text-tytaj-500/50" size={20} />
                      <input 
                        className={`${inputClass} !pl-12`} 
                        placeholder="e.g. 174379" 
                        value={settings.mpesa_shortcode}
                        onChange={(e) => setSettings({...settings, mpesa_shortcode: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Consumer Key</label>
                    <input 
                      type="password" 
                      className={inputClass} 
                      value={settings.mpesa_consumer_key}
                      onChange={(e) => setSettings({...settings, mpesa_consumer_key: e.target.value})}
                      placeholder="••••••••••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Consumer Secret</label>
                    <input 
                      type="password" 
                      className={inputClass} 
                      value={settings.mpesa_consumer_secret}
                      onChange={(e) => setSettings({...settings, mpesa_consumer_secret: e.target.value})}
                      placeholder="••••••••••••••••"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Passkey</label>
                    <input 
                      type="password" 
                      className={inputClass} 
                      value={settings.mpesa_passkey}
                      onChange={(e) => setSettings({...settings, mpesa_passkey: e.target.value})}
                      placeholder="••••••••••••••••••••••••"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Environment</label>
                    <div className="relative">
                      <select 
                        className={`${inputClass} appearance-none cursor-pointer`} 
                        value={settings.mpesa_env}
                        onChange={(e) => setSettings({...settings, mpesa_env: e.target.value})}
                      >
                        <option value="sandbox" className="bg-white dark:bg-[#0a0a0f]">Sandbox (Testing)</option>
                        <option value="production" className="bg-white dark:bg-[#0a0a0f]">Production (Live)</option>
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                        <RefreshCw size={18} />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-6 flex flex-col sm:flex-row gap-6">
                  <button 
                    type="button" 
                    onClick={() => setSettings({
                       mpesa_shortcode: '174379',
                       mpesa_consumer_key: '',
                       mpesa_consumer_secret: '',
                       mpesa_passkey: '',
                       mpesa_env: 'sandbox'
                    })} 
                    className="flex-1 py-5 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                  >
                    Reset
                  </button>
                  <AnimatedButton 
                    type="submit" 
                    className="flex-1 py-5 rounded-3xl shadow-2xl shadow-tytaj-600/30"
                  >
                    Save Settings
                  </AnimatedButton>
                </div>

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-8 rounded-[32px] border-2 mt-4 ${settings.mpesa_env === 'sandbox' ? 'bg-blue-500/5 border-blue-500/10 text-blue-700 dark:text-blue-400' : 'bg-rose-500/5 border-rose-500/10 text-rose-700 dark:text-rose-400'}`}
                >
                  <div className="flex items-start gap-4">
                    <AlertCircle className="mt-1 flex-shrink-0" size={24} />
                    <div>
                      <h4 className="font-black text-[10px] uppercase tracking-widest mb-2">
                        {settings.mpesa_env === 'sandbox' ? 'Environment: Sandbox' : 'Environment: Production'}
                      </h4>
                      <p className="text-xs font-bold opacity-80 leading-relaxed">
                        {settings.mpesa_env === 'sandbox' 
                          ? 'Using Safaricom Sandbox environment. Transactions are simulated.' 
                          : 'Warning: Production mode active. Ensure all details are correct.'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MpesaManagement;
