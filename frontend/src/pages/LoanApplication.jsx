import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, CreditCard, FileText, CheckCircle, 
  ArrowRight, ArrowLeft, Plus, Trash2, 
  Calculator, UserPlus, MapPin, Contact,
  Activity, ShieldCheck, Zap, Cpu, TrendingUp, Database, Smartphone, Fingerprint, Globe, Landmark
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/ui/GlassCard';
import AnimatedButton from '../components/ui/AnimatedButton';

const inputClass = "w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black uppercase tracking-tight placeholder:opacity-30";

const Step1ClientProduct = ({ formData, updateFormData, clients, products }) => (
    <div className="space-y-10">
      <div className="flex items-center gap-6">
        <div className="p-5 bg-tytaj-500/10 text-tytaj-600 dark:text-tytaj-400 rounded-[32px] border border-tytaj-500/10 shadow-xl">
            <Users size={32} />
        </div>
        <div>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none">Client & Product</h3>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">Select borrower and loan product</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="md:col-span-2 space-y-2">
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Select Client *</label>
          <div className="relative">
            <UserPlus className="absolute left-5 top-1/2 -translate-y-1/2 text-tytaj-500/50" size={20} />
            <select 
              className={`${inputClass} !pl-14 appearance-none cursor-pointer`}
              value={formData.client_id}
              onChange={(e) => updateFormData('client_id', e.target.value)}
            >
              <option value="" className="dark:bg-[#0a0a0f]">SELECT CLIENT...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id} className="dark:bg-[#0a0a0f]">{c.first_name.toUpperCase()} {c.last_name.toUpperCase()} / {c.id_number}</option>
              ))}
            </select>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                <ArrowRight size={18} />
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Loan Product *</label>
          <div className="relative">
            <Zap className="absolute left-5 top-1/2 -translate-y-1/2 text-tytaj-500/50" size={20} />
            <select 
              className={`${inputClass} !pl-14 appearance-none cursor-pointer`}
              value={formData.product_id}
              onChange={(e) => updateFormData('product_id', e.target.value)}
            >
              <option value="" className="dark:bg-[#0a0a0f]">SELECT PRODUCT...</option>
              {products.map(p => (
                <option key={p.id} value={p.id} className="dark:bg-[#0a0a0f]">{p.name.toUpperCase()} [{p.interest_rate}% APR]</option>
              ))}
            </select>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                <ShieldCheck size={18} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Loan Amount (KES) *</label>
          <div className="relative">
            <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 text-tytaj-500/50" size={20} />
            <input 
              type="number"
              className={`${inputClass} !pl-14`}
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => updateFormData('amount', e.target.value)}
            />
          </div>
          {formData.product_id && products.find(p => p.id == formData.product_id) && (
            <div className="flex justify-between px-1">
              <span className="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase">Min: KES {products.find(p => p.id == formData.product_id).min_amount.toLocaleString()}</span>
              <span className="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase">Max: KES {products.find(p => p.id == formData.product_id).max_amount.toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Duration (Months)</label>
            <input 
              type="number"
              className={inputClass}
              value={formData.duration_months}
              onChange={(e) => updateFormData('duration_months', e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Repayment Frequency</label>
            <select 
              className={`${inputClass} appearance-none cursor-pointer`}
              value={formData.repayment_frequency}
              onChange={(e) => updateFormData('repayment_frequency', e.target.value)}
            >
              <option value="monthly" className="dark:bg-[#0a0a0f]">MONTHLY</option>
              <option value="weekly" className="dark:bg-[#0a0a0f]">WEEKLY</option>
              <option value="daily" className="dark:bg-[#0a0a0f]">DAILY</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Start Date</label>
          <input 
            type="date"
            className={inputClass}
            value={formData.start_date}
            onChange={(e) => updateFormData('start_date', e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  const Step2Guarantors = ({ formData, addArrayItem, removeArrayItem }) => {
    const [newG, setNewG] = useState({ name: '', phone: '', id_number: '', relation: '', occupation: '', residence: '', landmark: '' });
    
    const addGuarantor = () => {
      if (!newG.name || !newG.phone || !newG.id_number) return toast.error("Name, Phone, and ID are required");
      addArrayItem('guarantors', newG);
      setNewG({ name: '', phone: '', id_number: '', relation: '', occupation: '', residence: '', landmark: '' });
      toast.success("Guarantor added successfully");
    };

    return (
      <div className="space-y-10">
        <div className="flex items-center gap-6">
            <div className="p-5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-[32px] border border-indigo-500/10 shadow-xl">
                <UserPlus size={32} />
            </div>
            <div>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none">Guarantors</h3>
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">Add guarantors for this loan</p>
            </div>
        </div>
        
        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {formData.guarantors.map((g, idx) => (
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={idx} 
                className="flex items-center justify-between p-6 bg-gray-50 dark:bg-white/5 rounded-[32px] border border-gray-100 dark:border-white/10 group hover:border-tytaj-500/30 transition-all shadow-lg"
            >
              <div>
                <p className="font-black text-gray-900 dark:text-white text-lg uppercase tracking-tight">{g.name}</p>
                <div className="text-[9px] text-gray-400 dark:text-gray-500 grid gap-1 mt-3 font-black uppercase tracking-[0.2em]">
                   <span className="flex items-center gap-2"><Fingerprint size={12} className="text-tytaj-500" /> {g.id_number}</span>
                   <span className="flex items-center gap-2"><Smartphone size={12} className="text-tytaj-500" /> {g.phone}</span>
                   <span className="flex items-center gap-2"><MapPin size={12} className="text-tytaj-500" /> {g.residence}</span>
                </div>
              </div>
              <button 
                onClick={() => removeArrayItem('guarantors', idx)} 
                className="text-gray-300 hover:bg-rose-500 hover:text-white p-3 rounded-2xl transition-all active:scale-90"
              >
                <Trash2 size={20} />
              </button>
            </motion.div>
          ))}
          {formData.guarantors.length === 0 && (
            <div className="md:col-span-2 text-center py-20 bg-gray-50/50 dark:bg-white/5 rounded-[40px] border-4 border-dashed border-gray-100 dark:border-white/10 opacity-40">
                <p className="text-gray-400 dark:text-gray-600 font-black uppercase tracking-[0.4em] text-[10px]">No guarantors added yet</p>
            </div>
          )}
        </div>

        {/* Add Form */}
        <div className="bg-white dark:bg-[#1a1a24]/50 p-10 rounded-[40px] border border-gray-200 dark:border-white/10 shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:rotate-6 transition-transform">
               <ShieldCheck size={100} />
           </div>
           
           <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 mb-8 uppercase tracking-[0.3em] flex items-center gap-2">
               <Plus size={14} className="text-tytaj-500" /> Add New Guarantor
           </h4>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
              <input placeholder="NAME *" className={inputClass} value={newG.name} onChange={e => setNewG({...newG, name: e.target.value})} />
              <input placeholder="PHONE *" className={inputClass} value={newG.phone} onChange={e => setNewG({...newG, phone: e.target.value})} />
              <input placeholder="ID NUMBER *" className={inputClass} value={newG.id_number} onChange={e => setNewG({...newG, id_number: e.target.value})} />
              <input placeholder="RELATIONSHIP" className={inputClass} value={newG.relation} onChange={e => setNewG({...newG, relation: e.target.value})} />
              <input placeholder="OCCUPATION" className={inputClass} value={newG.occupation} onChange={e => setNewG({...newG, occupation: e.target.value})} />
              <input placeholder="RESIDENCE" className={inputClass} value={newG.residence} onChange={e => setNewG({...newG, residence: e.target.value})} />
              <input placeholder="LANDMARK" className={`${inputClass} md:col-span-2`} value={newG.landmark} onChange={e => setNewG({...newG, landmark: e.target.value})} />
              
              <button 
                onClick={addGuarantor} 
                className="md:col-span-2 flex items-center justify-center gap-3 bg-slate-900 dark:bg-tytaj-500 text-white p-5 rounded-[28px] font-black uppercase tracking-widest text-[10px] hover:bg-black dark:hover:bg-tytaj-600 transition-all active:scale-95 shadow-2xl shadow-tytaj-500/20 mt-4"
              >
                <Plus size={20} /> Add Guarantor
              </button>
           </div>
        </div>
      </div>
    );
  };

  const Step3Referees = ({ formData, addArrayItem, removeArrayItem }) => {
    const [newR, setNewR] = useState({ name: '', phone: '', relation: '', address: '' });

    const addReferee = () => {
        if(!newR.name || !newR.phone) return toast.error("Essential verification data missing: Name/Phone required");
        addArrayItem('referees', newR);
        setNewR({ name: '', phone: '', relation: '', address: '' });
        toast.success("Referee added successfully");
    };

    return (
      <div className="space-y-12">


        {/* Referees Section */}
        <div>
           <div className="flex items-center gap-6 mb-10">
                <div className="p-5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-[32px] border border-emerald-500/10 shadow-xl">
                    <Contact size={32} />
                </div>
                <div>
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none">Referees</h3>
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">Add character references</p>
                </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              {formData.referees.map((r, idx) => (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={idx} className="flex items-center justify-between p-6 bg-gray-50 dark:bg-white/5 rounded-[32px] border border-gray-100 dark:border-white/10 group shadow-lg">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-white dark:bg-[#0a0a0f] rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-inner">
                        <Activity size={24} />
                    </div>
                    <div>
                        <p className="font-black text-gray-900 dark:text-gray-200 uppercase tracking-tight">{r.name}</p>
                        <p className="text-[9px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mt-1">{r.phone} | {r.relation || 'EXTERNAL'}</p>
                    </div>
                  </div>
                  <button onClick={() => removeArrayItem('referees', idx)} className="text-gray-300 hover:text-rose-500 p-3 rounded-2xl transition-all active:scale-90"><Trash2 size={20} /></button>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-[#1a1a24]/50 p-10 rounded-[40px] border border-gray-200 dark:border-white/10 shadow-2xl">
               <input placeholder="NAME *" className={inputClass} value={newR.name} onChange={e => setNewR({...newR, name: e.target.value})} />
               <input placeholder="PHONE *" className={inputClass} value={newR.phone} onChange={e => setNewR({...newR, phone: e.target.value})} />
               <input placeholder="RELATIONSHIP" className={inputClass} value={newR.relation} onChange={e => setNewR({...newR, relation: e.target.value})} />
               <input placeholder="ADDRESS" className={inputClass} value={newR.address} onChange={e => setNewR({...newR, address: e.target.value})} />
               <button onClick={addReferee} className="md:col-span-2 bg-slate-900 dark:bg-emerald-500 text-white p-5 rounded-[28px] font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all active:scale-95 shadow-xl shadow-emerald-500/10 mt-2">Add Referee</button>
            </div>
        </div>
      </div>
    );
  };

  const Step4BFA = ({ formData, handleBFAChange }) => {
    const { daily_sales, monthly_sales, cost_of_sales, expenditure, other_income } = formData.financial_analysis;
    const net_income = (parseFloat(monthly_sales) || 0) - (parseFloat(cost_of_sales) || 0) - (parseFloat(expenditure) || 0) + (parseFloat(other_income) || 0);

    return (
      <div className="space-y-12">
        <div className="flex items-center gap-6">
            <div className="p-5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-[32px] border border-blue-500/10 shadow-xl">
                <Calculator size={32} />
            </div>
            <div>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none">Financial Analysis</h3>
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">Enter business financial information</p>
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-8 p-10 bg-emerald-500/5 dark:bg-emerald-500/5 rounded-[48px] border-2 border-emerald-500/10 border-dashed group">
            <div className="flex items-center gap-4 text-emerald-600 dark:text-emerald-400">
                <TrendingUp size={24} />
                <h4 className="text-[11px] font-black uppercase tracking-[0.3em]">Income</h4>
            </div>
            <div className="space-y-6">
                <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Daily Sales</label>
                <input type="number" className={`${inputClass} !bg-white dark:!bg-[#0a0a0f] !border-emerald-500/20`} value={daily_sales} onChange={e => handleBFAChange('daily_sales', e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Monthly Sales</label>
                <input type="number" className={`${inputClass} !bg-white dark:!bg-[#0a0a0f] !border-emerald-500/20`} value={monthly_sales} onChange={e => handleBFAChange('monthly_sales', e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Other Income</label>
                <input type="number" className={`${inputClass} !bg-white dark:!bg-[#0a0a0f] !border-emerald-500/20`} value={other_income} onChange={e => handleBFAChange('other_income', e.target.value)} placeholder="0" />
                </div>
            </div>
          </div>
          
          <div className="space-y-8 p-10 bg-rose-500/5 dark:bg-rose-500/5 rounded-[48px] border-2 border-rose-500/10 border-dashed group">
            <div className="flex items-center gap-4 text-rose-600 dark:text-rose-400">
                <TrendingUp size={24} className="rotate-180" />
                <h4 className="text-[11px] font-black uppercase tracking-[0.3em]">Expenses</h4>
            </div>
            <div className="space-y-6">
                <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Cost of Sales</label>
                <input type="number" className={`${inputClass} !bg-white dark:!bg-[#0a0a0f] !border-rose-500/20`} value={cost_of_sales} onChange={e => handleBFAChange('cost_of_sales', e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Personal Expenses</label>
                <input type="number" className={`${inputClass} !bg-white dark:!bg-[#0a0a0f] !border-rose-500/20`} value={expenditure} onChange={e => handleBFAChange('expenditure', e.target.value)} placeholder="0" />
                </div>
            </div>
          </div>
        </div>

        <div className="mt-10 p-12 bg-gray-50 dark:bg-white/5 rounded-[48px] border border-gray-100 dark:border-white/10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform">
              <Database size={140} />
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative">
              <div>
                 <div className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.4em] mb-2">Net Income</div>
                 <div className="text-[10px] text-gray-400 dark:text-gray-600 font-black uppercase tracking-widest leading-relaxed">Calculated from financial data</div>
              </div>
              <motion.div 
                key={net_income}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`text-6xl font-black ${net_income >= 0 ? 'text-emerald-500 shadow-emerald-500/10' : 'text-rose-500 shadow-rose-500/10'} text-shadow-lg tracking-tighter`}
              >
                Ksh {net_income.toLocaleString()}
              </motion.div>
          </div>
        </div>
      </div>
    );
  };

const LoanApplication = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Data States
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  
  // Form State
  const [formData, setFormData] = useState({
    client_id: '',
    product_id: '',
    amount: '',
    duration_months: '',
    start_date: new Date().toISOString().split('T')[0],
    repayment_frequency: 'monthly',
    guarantors: [], 
    collateral: [], 
    referees: [],   
    financial_analysis: {
      daily_sales: 0,
      monthly_sales: 0,
      cost_of_sales: 0,
      expenditure: 0,
      other_income: 0,
      gross_profit: 0,
      net_income: 0
    }
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [clientsRes, productsRes] = await Promise.all([
        api.clients.list(),
        api.loanProducts.list()
      ]);
      setClients(clientsRes);
      setProducts(productsRes);
    } catch (error) {
      toast.error("Failed to load initial data");
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBFAChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      financial_analysis: { ...prev.financial_analysis, [field]: parseFloat(value) || 0 }
    }));
  };

  const addArrayItem = (field, item) => {
    setFormData(prev => ({ ...prev, [field]: [...prev[field], item] }));
  };

  const removeArrayItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    // Basic Validation
    if (!formData.client_id || !formData.product_id || !formData.amount) {
      return toast.error("Please fill in all required fields (Client, Product, Amount)");
    }

    const selectedProduct = products.find(p => p.id == formData.product_id);
    if (selectedProduct) {
      const amount = parseFloat(formData.amount);
      if (amount < selectedProduct.min_amount || amount > selectedProduct.max_amount) {
        return toast.error(`Amount must be between ${selectedProduct.min_amount} and ${selectedProduct.max_amount} for this product`);
      }
    }

    setLoading(true);
    try {
      const fa = formData.financial_analysis;
      const gross_profit = fa.monthly_sales; 
      const net_income = fa.monthly_sales - fa.cost_of_sales - fa.expenditure + fa.other_income;
      
      const bfaPayload = {
        ...fa,
        gross_profit, 
        net_income
      };

      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        duration_months: parseInt(formData.duration_months),
        client_id: parseInt(formData.client_id),
        product_id: parseInt(formData.product_id),
        financial_analysis: bfaPayload
      };

      await api.loans.create(payload);
      toast.success("Loan application submitted successfully");
      navigate('/loans');
    } catch (error) {
      toast.error("Failed to submit loan application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-10 space-y-12">
      <div className="flex items-center gap-10 mb-12">
         <button onClick={() => navigate('/loans')} className="w-16 h-16 flex items-center justify-center bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-[28px] hover:bg-tytaj-500 hover:text-white transition-all text-gray-400 active:scale-95 shadow-2xl">
           <ArrowLeft size={32} />
         </button>
         <div>
            <div className="flex items-center gap-2 mb-2">
              <Cpu size={14} className="text-tytaj-500" />
              <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">Loan Application</span>
            </div>
            <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none">New Loan Application</h1>
         </div>
      </div>
      
      {/* Progress Matrix */}
      <div className="flex items-center justify-between mb-16 relative px-10">
        <div className="absolute left-0 top-1/2 w-full h-2 bg-gray-100 dark:bg-white/5 -z-10 rounded-full -translate-y-1/2" />
        <div 
           className="absolute left-0 top-1/2 h-2 bg-tytaj-500 -z-10 rounded-full transition-all duration-700 -translate-y-1/2 shadow-[0_0_30px_rgba(255,107,0,0.6)]" 
           style={{ width: `${((step - 1) / 3) * 100}%` }}
        />
        
        {['Client', 'Guarantors', 'Referees', 'Financials'].map((label, idx) => {
            const num = idx + 1;
            const isActive = step >= num;
            const isCurrent = step === num;
            return (
              <div key={num} className="flex flex-col items-center gap-4">
                <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center font-black transition-all duration-500 border-4 shadow-2xl ${isCurrent ? 'bg-tytaj-500 border-tytaj-500 text-white scale-125 shadow-tytaj-500/30' : isActive ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white dark:bg-[#0a0a0f] border-gray-100 dark:border-white/10 text-gray-200 dark:text-gray-800'}`}>
                    {isActive ? (num < step ? <CheckCircle size={32} /> : num) : num}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] leading-none ${isCurrent ? 'text-tytaj-500' : isActive ? 'text-emerald-500' : 'text-gray-400'}`}>{label}</span>
              </div>
            );
        })}
      </div>

      <AnimatePresence>
        <motion.div 
            key={step} 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
            <GlassCard className="p-16 border-white/20 dark:border-white/10 min-h-[600px] shadow-4xl bg-white dark:bg-[#0a0a0f] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-tytaj-500/5 to-transparent pointer-events-none" />
                <div className="relative z-10">
                    {step === 1 && <Step1ClientProduct formData={formData} updateFormData={updateFormData} clients={clients} products={products} />}
                    {step === 2 && <Step2Guarantors formData={formData} addArrayItem={addArrayItem} removeArrayItem={removeArrayItem} />}
                    {step === 3 && <Step3Referees formData={formData} addArrayItem={addArrayItem} removeArrayItem={removeArrayItem} />}
                    {step === 4 && <Step4BFA formData={formData} handleBFAChange={handleBFAChange} />}
                </div>
            </GlassCard>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between items-center mt-16 bg-white dark:bg-white/5 p-10 rounded-[40px] border border-gray-100 dark:border-white/10 shadow-3xl">
        <button 
          onClick={() => setStep(prev => Math.max(1, prev - 1))}
          disabled={step === 1}
          className="px-10 py-5 rounded-3xl border-2 border-gray-100 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-500 disabled:opacity-20 hover:bg-gray-50 dark:hover:bg-white/10 transition-all active:scale-95 flex items-center gap-3"
        >
          <ArrowLeft size={20} />
          Previous
        </button>
        
        {step < 4 ? (
          <AnimatedButton 
            onClick={() => setStep(prev => Math.min(4, prev + 1))}
            className="px-12 py-5 rounded-3xl"
          >
            <div className="flex items-center gap-3">
               <span>Next</span>
               <ArrowRight size={20} />
            </div>
          </AnimatedButton>
        ) : (
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="px-12 py-5 rounded-3xl bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-emerald-500 shadow-2xl shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
          >
            {loading ? 'Submitting...' : 'Submit Application'} <CheckCircle size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default LoanApplication;
