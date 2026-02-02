import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Filter, Eye, RefreshCw, Calendar, DollarSign, Users, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LoanDetailsModal from '../components/LoanDetailsModal';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import GlassCard from '../components/ui/GlassCard';
import AnimatedButton from '../components/ui/AnimatedButton';

const Loans = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState('loans'); // default to loans/applications

  const [loanProducts, setLoanProducts] = useState([]);
  const [loans, setLoans] = useState([]);
  const [clients, setClients] = useState([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'products') {
        const response = await api.loanProducts.list();
        setLoanProducts(response);
      } else {
        const [loansRes, clientsRes, productsRes] = await Promise.all([
          api.loans.list(),
          api.clients.list(),
          api.loanProducts.list(),
        ]);
        setLoans(loansRes);
        setClients(clientsRes);
        setLoanProducts(productsRes);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const productData = {
      name: formData.get('name'),
      interest_rate: parseFloat(formData.get('interest_rate')),
      min_amount: parseFloat(formData.get('min_amount')),
      max_amount: parseFloat(formData.get('max_amount')),
      min_period_months: parseInt(formData.get('min_period_months')),
      max_period_months: parseInt(formData.get('max_period_months')),
      description: formData.get('description'),
      duration_unit: formData.get('duration_unit') || 'months',
      processing_fee_fixed: parseFloat(formData.get('processing_fee_fixed')) || 0,
      registration_fee: parseFloat(formData.get('registration_fee')) || 0,
    };

    try {
      if (editingProduct) {
        await api.loanProducts.update(editingProduct.id, productData);
        toast.success("Loan Product Updated");
      } else {
        await api.loanProducts.create(productData);
        toast.success("Loan Product Created");
      }
      setShowProductModal(false);
      setEditingProduct(null);
      fetchData();
    } catch (error) {
      toast.error(editingProduct ? 'Error updating product' : 'Error creating product');
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const handleViewLoan = (loan) => {
    setSelectedLoan(loan);
    setShowDetailsModal(true);
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : 'Unknown Client';
  };

  const getProductName = (productId) => {
    const product = loanProducts.find(p => p.id === productId);
    return product ? product.name : 'STND_PROTOCOL';
  };

  return (
    <div className="space-y-10 pb-10">

      {/* Header & Navigation */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={18} className="text-tytaj-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500">Loan Management</span>
          </div>
          <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
            {activeTab === 'products' ? 'Loan Products' : 'Active Loans'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-3 font-medium text-lg tracking-tight max-w-2xl">
            {activeTab === 'products' ? 'Managing loan products and their terms.' : 'Monitoring active loans and client risk.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 w-full xl:w-auto">
          <div className="flex bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl w-full sm:w-auto border border-gray-100 dark:border-white/5">
            <button
              onClick={() => setActiveTab('loans')}
              className={`flex-1 sm:flex-none px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'loans' ? 'bg-white dark:bg-slate-900 text-tytaj-600 dark:text-tytaj-400 shadow-md ring-1 ring-gray-100 dark:ring-white/10' : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Applications
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 sm:flex-none px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'products' ? 'bg-white dark:bg-slate-900 text-tytaj-600 dark:text-tytaj-400 shadow-md ring-1 ring-gray-100 dark:ring-white/10' : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Products
            </button>
          </div>

          <AnimatedButton
            onClick={() => {
              if (activeTab === 'products') {
                setEditingProduct(null);
                setShowProductModal(true);
              } else {
                navigate('/loans/new');
              }
            }}
            className="w-full sm:w-auto shadow-xl shadow-tytaj-600/20"
          >
            <Plus className="w-5 h-5 mr-1" />
            {activeTab === 'products' ? 'Create Product' : 'Create New Loan'}
          </AnimatedButton>
        </div>
      </div>

      {/* Loan Products Tab */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loanProducts.map((product, idx) => (
            <GlassCard key={product.id} delay={idx * 0.1} hoverEffect className="p-8 border-white/20 dark:border-white/5 group overflow-hidden">
              {/* Decorative background glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-tytaj-500/5 blur-[80px] group-hover:bg-tytaj-500/15 transition-all duration-700" />

              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="bg-tytaj-500/10 dark:bg-tytaj-500/20 p-4 rounded-2xl ring-1 ring-tytaj-500/20">
                  <DollarSign className="text-tytaj-600 dark:text-tytaj-400 w-7 h-7" />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-[10px] font-black text-tytaj-600 dark:text-tytaj-400 uppercase tracking-widest bg-tytaj-500/10 dark:bg-tytaj-500/20 px-3 py-1.5 rounded-full border border-tytaj-500/20">
                    {product.interest_rate}% Interest
                  </span>
                  <button
                    onClick={() => handleEditProduct(product)}
                    className="text-[10px] font-black text-gray-500 hover:text-tytaj-600 uppercase tracking-widest bg-white dark:bg-white/5 px-3 py-1.5 rounded-full border border-gray-100 dark:border-white/10 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>

              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight transition-colors group-hover:text-tytaj-600 dark:group-hover:text-tytaj-400">{product.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 font-medium line-clamp-2 leading-relaxed">{product.description || 'Standard loan product for approved clients.'}</p>

              <div className="grid grid-cols-2 gap-4 bg-gray-50/50 dark:bg-white/5 p-6 rounded-2xl border border-gray-100 dark:border-white/5 relative z-10">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Amount Range</p>
                  <p className="font-black text-gray-900 dark:text-white text-sm">
                    K{(product.min_amount / 1000).toFixed(0)}k - {(product.max_amount / 1000).toFixed(0)}k
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Duration</p>
                  <p className="font-black text-gray-900 dark:text-white text-sm">
                    {product.min_period_months} - {product.max_period_months}M
                  </p>
                </div>
              </div>
            </GlassCard>
          ))}

          {/* New Product Trigger */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowProductModal(true)}
            className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 hover:text-tytaj-500 group transition-all min-h-[300px] bg-white dark:bg-white/5 shadow-sm"
          >
            <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-6 group-hover:bg-tytaj-500/10 transition-colors">
              <Plus size={32} className="group-hover:scale-125 transition-transform" />
            </div>
            <span className="font-black text-[10px] uppercase tracking-[0.3em]">Create New Product</span>
          </motion.button>
        </div>
      )}

      {/* Loans Tab */}
      {activeTab === 'loans' && (
        <GlassCard className="!p-0 border-white/20 dark:border-white/5 overflow-visible shadow-2xl">
          <div className="p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-white/5 flex flex-col md:flex-row gap-6 justify-between items-center">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search loans..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-medium placeholder:text-gray-400"
              />
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-6 py-3.5 text-gray-500 dark:text-gray-400 hover:text-tytaj-600 dark:hover:text-tytaj-400 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/10 transition-all active:scale-95 shadow-sm font-black text-[10px] uppercase tracking-widest"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Recalibrate
            </button>
          </div>

          <div className="overflow-x-auto selection:bg-tytaj-500/30">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-white/5">
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Loan ID</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Client</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Product</th>
                  <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Capital Volume</th>
                  <th className="px-8 py-5 text-center text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Sync Status</th>
                  <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Ops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {loans.length === 0 ? (
                  <tr><td colSpan="6" className="p-20 text-center text-gray-400 dark:text-gray-600 font-bold italic tracking-tight">No active loans found.</td></tr>
                ) : (
                  loans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all group">
                      <td className="px-8 py-5 text-gray-500 dark:text-gray-400 text-xs font-black tracking-widest">#{loan.id.toString().padStart(4, '0')}</td>
                      <td className="px-8 py-5">
                        <div className="font-black text-gray-900 dark:text-white tracking-tight">{getClientName(loan.client_id)}</div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-transparent dark:border-white/5 uppercase tracking-widest">
                          {getProductName(loan.product_id)}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right text-gray-900 dark:text-white font-black text-lg tracking-tighter">
                        <span className="text-xs text-gray-400 mr-1 font-medium tracking-normal">K</span>
                        {loan.amount.toLocaleString()}
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border
                            ${loan.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                            loan.status === 'pending' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                              loan.status === 'approved' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                                loan.status === 'rejected' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' :
                                  'bg-gray-500/10 text-gray-600 dark:text-gray-500 border-gray-500/20'}
                          `}>
                          <div className={`w-1.5 h-1.5 rounded-full ${loan.status === 'active' ? 'bg-emerald-500 animate-pulse' : loan.status === 'pending' ? 'bg-amber-500' : 'bg-gray-500'}`} />
                          {loan.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button
                          onClick={() => handleViewLoan(loan)}
                          className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-2.5 rounded-xl text-tytaj-600 dark:text-tytaj-400 hover:bg-tytaj-500 hover:text-white transition-all active:scale-95 shadow-sm group/btn"
                        >
                          <Eye size={18} className="group-hover/btn:scale-110" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-xl"
          >
            <GlassCard className="!p-10 shadow-2xl border-white/20 dark:border-white/10 relative overflow-hidden">
              {/* Modal Glow */}
              <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-tytaj-500/10 blur-[100px]" />

              <div className="flex items-center justify-between mb-10 relative z-10">
                <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                  {editingProduct ? 'Edit Loan Product' : 'Create Loan Product'}
                </h3>
                <button onClick={() => {
                  setShowProductModal(false);
                  setEditingProduct(null);
                }} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-6 relative z-10">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 block">Product Name</label>
                    <input
                      name="name"
                      required
                      placeholder="e.g. ALPHA_LIQUIDITY_DEPLOY"
                      defaultValue={editingProduct?.name || ''}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black uppercase tracking-tight"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 block">Interest Rate (%)</label>
                    <input
                      name="interest_rate"
                      type="number"
                      step="0.01"
                      required
                      defaultValue={editingProduct?.interest_rate || ''}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black"
                    />
                  </div>
                  <div />

                  <div>
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 block">Min Amount (KES)</label>
                    <input
                      name="min_amount"
                      type="number"
                      required
                      defaultValue={editingProduct?.min_amount || ''}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 block">Max Amount (KES)</label>
                    <input
                      name="max_amount"
                      type="number"
                      required
                      defaultValue={editingProduct?.max_amount || ''}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 block">Min Duration</label>
                    <input
                      name="min_period_months"
                      type="number"
                      required
                      defaultValue={editingProduct?.min_period_months || ''}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 block">Max Duration</label>
                    <input
                      name="max_period_months"
                      type="number"
                      required
                      defaultValue={editingProduct?.max_period_months || ''}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 block">Duration Unit</label>
                    <select
                      name="duration_unit"
                      defaultValue={editingProduct?.duration_unit || 'months'}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black"
                    >
                      <option value="months">Months</option>
                      <option value="weeks">Weeks</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                  <div />

                  <div>
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 block">Processing Fee (Fixed)</label>
                    <input
                      name="processing_fee_fixed"
                      type="number"
                      step="0.01"
                      defaultValue={editingProduct?.processing_fee_fixed || '0'}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 block">Registration Fee</label>
                    <input
                      name="registration_fee"
                      type="number"
                      step="0.01"
                      defaultValue={editingProduct?.registration_fee || '0'}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 block">Description</label>
                    <textarea
                      name="description"
                      defaultValue={editingProduct?.description || ''}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-medium min-h-[100px]"
                      rows="3"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-10">
                  <AnimatedButton
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowProductModal(false);
                      setEditingProduct(null);
                    }}
                    className="flex-1 border-gray-200 dark:border-white/10"
                  >
                    Cancel
                  </AnimatedButton>
                  <AnimatedButton
                    type="submit"
                    className="flex-1 shadow-xl shadow-tytaj-600/20"
                  >
                    {editingProduct ? 'Update Product' : 'Save Product'}
                  </AnimatedButton>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailsModal && selectedLoan && (
        <LoanDetailsModal
          loan={selectedLoan}
          onClose={() => setShowDetailsModal(false)}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
};

export default Loans;
