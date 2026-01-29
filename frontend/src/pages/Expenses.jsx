import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, X, Filter, Trash2, Calendar, RefreshCw, Layers, Wallet, Activity, Zap, Cpu, TrendingDown, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../components/ui/GlassCard';
import AnimatedButton from '../components/ui/AnimatedButton';

const Expenses = () => {
  const { api } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Filters
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    fetchData();
  }, [filterCategory]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expRes, catRes] = await Promise.all([
        api.expenses.list({ category_id: filterCategory || undefined }),
        api.expenses.categories.list()
      ]);
      setExpenses(expRes);
      setCategories(catRes);
    } catch (error) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const isRecurring = formData.get('is_recurring') === 'on';
    
    const payload = {
       description: formData.get('description'),
       amount: parseFloat(formData.get('amount')),
       category_id: parseInt(formData.get('category_id')),
       date: formData.get('date'),
       is_recurring: isRecurring,
       recurrence_interval: isRecurring ? formData.get('recurrence_interval') : null
    };
    
    try {
      await api.expenses.create(payload);
      toast.success("Expense saved successfully");
      setShowExpenseModal(false);
      fetchData();
    } catch (error) {
      toast.error('Ledger commit failure');
    }
  };
  
  const handleCreateCategory = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      try {
          await api.expenses.categories.create({
              name: formData.get('name')
          });
          toast.success("New category created");
          setShowCategoryModal(false);
          const catRes = await api.expenses.categories.list();
          setCategories(catRes);
      } catch (error) {
          toast.error("Failed to create category");
      }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
        await api.expenses.delete(id);
        toast.success("Expense deleted");
        fetchData();
    } catch (error) {
        toast.error('Failed to delete expense');
    }
  };

  const inputClass = "w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black uppercase tracking-tight placeholder:opacity-30";

  return (
    <div className="space-y-10">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
           <div className="flex items-center gap-2 mb-2">
             <TrendingDown size={14} className="text-rose-500 animate-pulse" />
             <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">Expense Management</span>
           </div>
           <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">Expense Tracking</h2>
        </div>
        <div className="flex gap-4">
            <button
              onClick={() => setShowCategoryModal(true)}
              className="px-8 py-3.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-tytaj-500 hover:text-white transition-all shadow-xl active:scale-95"
            >
              <Layers size={18} className="inline mr-2" />
              Categories
            </button>
            <AnimatedButton
              onClick={() => setShowExpenseModal(true)}
              className="px-8 py-3.5 rounded-2xl shadow-xl"
            >
              <Plus size={18} className="inline mr-2" />
              Add Expense
            </AnimatedButton>
        </div>
      </div>
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard className="!bg-rose-500/5 border-rose-500/10 p-8 group overflow-hidden relative">
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                  <Wallet size={120} />
              </div>
              <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total Period Expenses</h4>
              <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
                  KES {expenses.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
              </p>
              <div className="mt-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-[9px] font-black text-rose-500/60 uppercase tracking-widest">Operating Expenses</span>
              </div>
          </GlassCard>
      </div>

      {/* Control Strip */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group w-full max-w-xs">
              <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-tytaj-500 transition-colors" size={20} />
              <select 
                  className={inputClass}
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
              >
                  <option value="">ALL CATEGORIES</option>
                  {categories.map(c => <option key={c.id} value={c.id} className="dark:bg-[#0a0a0f]">{c.name.toUpperCase()}</option>)}
              </select>
          </div>
          <button onClick={fetchData} className="p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-400 hover:text-tytaj-600 rounded-2xl transition-all active:rotate-180">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
      </div>

      {/* Ledger Table */}
      <GlassCard className="overflow-hidden border-white/20 dark:border-white/10 !p-0 shadow-3xl bg-white dark:bg-[#0a0a0f]">
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
            <thead>
                <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Date</th>
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Description</th>
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Category</th>
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Recurrence</th>
                    <th className="px-8 py-6 text-right text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Amount</th>
                    <th className="px-8 py-6 text-right text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                            <td colSpan="6" className="px-8 py-6"><div className="h-10 bg-gray-50 dark:bg-white/5 rounded-2xl w-full"></div></td>
                        </tr>
                    ))
                ) : expenses.length === 0 ? (
                    <tr>
                        <td colSpan="6" className="px-8 py-32 text-center">
                            <div className="flex flex-col items-center gap-6">
                                <div className="p-8 bg-gray-50 dark:bg-white/5 rounded-full border-2 border-dashed border-gray-100 dark:border-white/10">
                                    <Activity size={64} className="text-gray-200 dark:text-gray-800" strokeWidth={1} />
                                </div>
                                <div className="space-y-2">
                                    <p className="font-black text-lg uppercase tracking-widest text-gray-400 dark:text-gray-600">No Ledger Entries Found</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 dark:text-gray-700 italic opacity-60 italic">No expenses recorded for this period</p>
                                </div>
                            </div>
                        </td>
                    </tr>
                ) : (
                expenses.map((expense) => (
                    <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={expense.id} 
                        className="hover:bg-tytaj-500/5 dark:hover:bg-white/5 transition-all group"
                    >
                        <td className="px-8 py-6 font-mono text-xs dark:text-gray-400 font-black">
                            {new Date(expense.date).toLocaleDateString()}
                        </td>
                        <td className="px-8 py-6">
                            <span className="font-black text-gray-900 dark:text-gray-200 tracking-tight uppercase text-xs">{expense.description}</span>
                        </td>
                        <td className="px-8 py-6">
                            <span className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 rounded-xl border border-gray-200 dark:border-white/10">
                             {expense.category || 'Unspecified'}
                            </span>
                        </td>
                        <td className="px-8 py-6">
                            {expense.is_recurring ? (
                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20 w-fit">
                                <Repeat size={12} className="animate-spin-slow" />
                                <span>{expense.recurrence_interval || 'Recurring'}</span>
                            </div>
                            ) : (
                            <span className="text-[9px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-widest">One Time</span>
                            )}
                        </td>
                        <td className="px-8 py-6 text-right font-black text-lg text-rose-600 dark:text-rose-400 tracking-tighter">
                            KES {expense.amount.toLocaleString()}
                        </td>
                        <td className="px-8 py-6 text-right">
                            <button
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="p-3 text-gray-400 dark:text-gray-600 hover:bg-rose-500 hover:text-white rounded-xl transition-all group-hover:scale-110 active:scale-90"
                            >
                                <Trash2 size={18} />
                            </button>
                        </td>
                    </motion.tr>
                ))
                )}
            </tbody>
            </table>
        </div>
      </GlassCard>

      {/* Modals with AnimatePresence */}
      <AnimatePresence>
        {showExpenseModal && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-50 p-6">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 40 }}
                className="bg-white dark:bg-[#0a0a0f] rounded-[40px] p-12 w-full max-w-2xl shadow-4xl border border-white/20 dark:border-white/10 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <TrendingDown size={120} />
                </div>

                <div className="flex justify-between items-start mb-12 relative">
                  <div className="flex items-center gap-6">
                      <div className="p-5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-[32px] shadow-xl border border-rose-500/10">
                          <Plus size={32} />
                      </div>
                      <div>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none">Record Outflow</h3>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">Record expense details</p>
                      </div>
                  </div>
                  <button onClick={() => setShowExpenseModal(false)} className="text-gray-400 dark:text-gray-600 hover:bg-white/10 p-3 rounded-2xl transition-all">
                    <X size={28} />
                  </button>
                </div>

                <form onSubmit={handleCreateExpense} className="space-y-10 relative">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Description</label>
                    <input
                      name="description"
                      type="text"
                      required
                      placeholder="e.g. Office Rent, Utilities"
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Amount (KES)</label>
                        <div className="relative">
                            <Wallet className="absolute left-5 top-1/2 -translate-y-1/2 text-tytaj-500/50" size={20} />
                            <input
                              name="amount"
                              type="number"
                              step="0.01"
                              required
                              className={`${inputClass} !pl-14`}
                              placeholder="0.00"
                            />
                        </div>
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Date</label>
                          <div className="relative">
                            <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-tytaj-500/50" size={20} />
                            <input
                                name="date"
                                type="date"
                                required
                                defaultValue={new Date().toISOString().split('T')[0]}
                                className={`${inputClass} !pl-14 appearance-none`}
                            />
                          </div>
                      </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Category</label>
                    <div className="relative">
                        <Layers className="absolute left-5 top-1/2 -translate-y-1/2 text-tytaj-500/50" size={20} />
                        <select
                          name="category_id"
                          required
                          className={`${inputClass} !pl-14 appearance-none cursor-pointer`}
                        >
                          <option value="" className="dark:bg-[#0a0a0f]">SELECT CATEGORY...</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id} className="dark:bg-[#0a0a0f]">{cat.name.toUpperCase()}</option>
                          ))}
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                            <Plus size={18} />
                        </div>
                    </div>
                    {categories.length === 0 && <p className="text-[9px] text-amber-500 font-black uppercase tracking-[0.2em] mt-3 ml-1 animate-pulse">NO CATEGORIES CREATED. CREATE ONE FIRST.</p>}
                  </div>

                  <div className="bg-gray-50 dark:bg-white/5 p-8 rounded-[32px] border border-gray-100 dark:border-white/10 group">
                      <div className="flex items-center mb-6">
                        <div className="relative flex items-center">
                            <input
                            id="recurrence-check"
                            name="is_recurring"
                            type="checkbox"
                            className="w-6 h-6 text-tytaj-600 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-white/10 rounded-xl focus:ring-tytaj-500 transition-all cursor-pointer"
                            onChange={(e) => {
                                const select = document.getElementById('recurrence-select');
                                if(select) select.disabled = !e.target.checked;
                            }}
                            />
                        </div>
                        <label htmlFor="recurrence-check" className="ml-4 text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-gray-200 cursor-pointer">Enable Recurring Expense</label>
                      </div>
                      
                      <div className="pl-10 relative">
                          <select name="recurrence_interval" id="recurrence-select" disabled className="w-full px-6 py-4 bg-white dark:bg-[#1a1a24] border-2 border-gray-200 dark:border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest dark:text-white focus:ring-4 focus:ring-tytaj-500/10 outline-none appearance-none cursor-pointer disabled:opacity-30 disabled:grayscale transition-all shadow-inner">
                              <option value="monthly">Monthly</option>
                              <option value="weekly">Weekly</option>
                              <option value="daily">Daily</option>
                          </select>
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 group-hover:rotate-180 transition-transform">
                              <RefreshCw size={16} />
                          </div>
                      </div>
                  </div>

                  <div className="flex gap-6 pt-6">
                    <button
                      type="button"
                      onClick={() => setShowExpenseModal(false)}
                      className="flex-1 py-5 border border-gray-200 dark:border-white/10 rounded-3xl text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:bg-rose-500/5 hover:text-rose-500 transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                    <AnimatedButton
                      type="submit"
                      className="flex-1 py-5 rounded-3xl shadow-2xl shadow-tytaj-600/30"
                    >
                      Save Expense
                    </AnimatedButton>
                  </div>
                </form>
              </motion.div>
            </div>
        )}
        
        {showCategoryModal && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-50 p-6">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white dark:bg-[#0a0a0f] rounded-[40px] p-12 w-full max-w-md shadow-4xl border border-white/20 dark:border-white/10 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Cpu size={120} />
                </div>

                <div className="flex items-center gap-6 mb-12 relative">
                    <div className="p-5 bg-tytaj-500/10 text-tytaj-600 dark:text-tytaj-400 rounded-[32px] shadow-xl border border-tytaj-500/10">
                        <Layers size={32} />
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none">Create Category</h3>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">Create new category</p>
                    </div>
                </div>
                
                <form onSubmit={handleCreateCategory} className="space-y-10 relative">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Category Name</label>
                    <div className="relative">
                        <Zap className="absolute left-5 top-1/2 -translate-y-1/2 text-tytaj-500/50" size={20} />
                        <input 
                            name="name" 
                            placeholder="e.g. Operating Costs" 
                            required 
                            className={`${inputClass} !pl-14`}
                        />
                    </div>
                  </div>
                  <div className="flex gap-6">
                      <button type="button" onClick={() => setShowCategoryModal(false)} className="flex-1 py-5 border border-gray-200 dark:border-white/10 rounded-3xl text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:bg-rose-500/5 transition-all">Cancel</button>
                      <AnimatedButton type="submit" className="flex-1 py-5 rounded-3xl">Create Category</AnimatedButton>
                  </div>
                </form>
              </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Expenses;
