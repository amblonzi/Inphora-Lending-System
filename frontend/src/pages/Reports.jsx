import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon, 
  Calendar, Download, Filter, RefreshCw, Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import GlassCard from '../components/ui/GlassCard';
import ExportMenu from '../components/ExportMenu';

const Reports = () => {
  const { api } = useAuth();
  // ... existing hooks ... 

  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [pnLData, setPnLData] = useState(null);
  const [parData, setParData] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pnlRes, parRes, healthRes, trendsRes] = await Promise.all([
        api.reports.getProfitLoss({ start_date: dateRange.start, end_date: dateRange.end }),
        api.reports.getPAR(),
        api.reports.getPortfolioHealth(),
        api.reports.getClientTrends()
      ]);
      setPnLData(pnlRes);
      setParData(parRes);
      setHealthData(healthRes);
      setTrendsData(trendsRes);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to synchronize intelligence data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading || !pnLData || !parData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="relative">
            <RefreshCw className="animate-spin text-tytaj-500" size={48} />
            <div className="absolute inset-0 blur-xl bg-tytaj-500/20 animate-pulse rounded-full" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 font-black uppercase tracking-[0.4em] text-xs">Generating reports...</p>
      </div>
    );
  }

  const plChartData = [
    { name: 'Income', amount: pnLData.total_income, fill: '#10b981' },
    { name: 'Expenses', amount: pnLData.total_expenses, fill: '#ef4444' },
    { name: 'Net Profit', amount: pnLData.net_profit, fill: '#3b82f6' }
  ];

  const parChartData = [
    { name: 'Current', value: parData.par_distribution.current, color: '#10b981' },
    { name: 'PAR 30', value: parData.par_distribution.par_30, color: '#f59e0b' },
    { name: 'PAR 60', value: parData.par_distribution.par_60, color: '#f97316' },
    { name: 'PAR 90', value: parData.par_distribution.par_90, color: '#ef4444' },
    { name: 'PAR 90+', value: parData.par_distribution.par_90plus, color: '#991b1b' }
  ].filter(d => d.value > 0);

  const StatCard = ({ title, value, icon: Icon, color, subtitle, delay = 0 }) => (
    <GlassCard delay={delay} hoverEffect className="p-8 border-white/20 dark:border-white/5 relative group overflow-hidden">
      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${color.replace('bg-', 'bg-').replace('shadow-', '')}`} />
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className={`p-4 rounded-2xl ${color}`}>
          <Icon className="text-white" size={28} />
        </div>
        <div className="text-right">
            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">{title}</span>
        </div>
      </div>
      <div className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tighter relative z-10">
        <span className="text-xs text-gray-400 mr-1 font-medium tracking-normal">KES</span>
        {value.toLocaleString()}
      </div>
      <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-500 relative z-10">
        {subtitle}
      </div>
    </GlassCard>
  );
  
  // Expense export data
  const expenseExportData = pnLData?.expense_breakdown?.map(e => ({
      "Category": e.category,
      "Description": e.description || 'General Overhead',
      "Amount": e.amount
  })) || [];

  const expenseColumns = [
      { header: 'Category', dataKey: 'Category' },
      { header: 'Description', dataKey: 'Description' },
      { header: 'Amount', dataKey: 'Amount' }
  ];

  return (
    <div className="space-y-10 pb-10">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
        <div>
           <div className="flex items-center gap-2 mb-2">
                <Layers size={18} className="text-tytaj-500" />
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500">Financial Reports</span>
           </div>
           <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none">Business Analytics</h1>
           <p className="text-gray-500 dark:text-gray-400 mt-3 font-medium text-lg tracking-tight">Comprehensive visualization of financial performance and loan metrics.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white dark:bg-white/5 p-2 rounded-2xl border border-gray-100 dark:border-white/10 shadow-xl overflow-hidden group">
           <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-white/5 rounded-xl border border-transparent dark:border-white/5">
              <Calendar size={16} className="text-tytaj-500" />
              <div className="flex items-center gap-2">
                <input 
                    type="date" 
                    value={dateRange.start} 
                    onChange={e => setDateRange({...dateRange, start: e.target.value})}
                    className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 dark:text-gray-300 outline-none w-28"
                />
                <span className="text-gray-300 dark:text-gray-600 font-bold">/</span>
                <input 
                    type="date" 
                    value={dateRange.end} 
                    onChange={e => setDateRange({...dateRange, end: e.target.value})}
                    className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 dark:text-gray-300 outline-none w-28"
                />
              </div>
           </div>
           <button 
                onClick={fetchData} 
                className="p-3 text-gray-500 dark:text-gray-400 hover:text-tytaj-500 hover:bg-tytaj-500/10 dark:hover:bg-tytaj-500/20 rounded-xl transition-all active:scale-95"
                title="Recalibrate Data"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
           </button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
         <StatCard 
            title="Total Revenue" 
            value={pnLData.total_income} 
            icon={TrendingUp} 
            color="bg-emerald-500 shadow-xl shadow-emerald-500/20"
            subtitle="Gross Inflows"
            delay={0.1}
         />
         <StatCard 
            title="Total Expenses" 
            value={pnLData.total_expenses} 
            icon={TrendingDown} 
            color="bg-rose-500 shadow-xl shadow-rose-500/20"
            subtitle="Operational Costs"
            delay={0.2}
         />
         <StatCard 
            title="Net Yield" 
            value={pnLData.net_profit} 
            icon={DollarSign} 
            color="bg-blue-500 shadow-xl shadow-blue-500/20"
            subtitle={`${((pnLData.net_profit / pnLData.total_income) * 100 || 0).toFixed(1)}% Net Profit Margin`}
            delay={0.3}
         />
         <StatCard 
            title="Active Cap" 
            value={parData.total_active_portfolio} 
            icon={PieChartIcon} 
            color="bg-indigo-500 shadow-xl shadow-indigo-500/20"
            subtitle={`Outstanding Balance: KES ${(parData.total_active_portfolio - parData.par_distribution.current).toLocaleString()}`}
            delay={0.4}
         />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         {/* Profit & Loss Chart */}
         <GlassCard className="p-8 border-white/20 dark:border-white/5 shadow-2xl overflow-visible">
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-tytaj-500 rounded-full" />
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Profit & Loss Overview</h3>
                </div>
                <button 
                    className="p-3 text-gray-400 hover:text-tytaj-500 bg-gray-50 dark:bg-white/5 rounded-xl transition-all border border-gray-100 dark:border-white/5 active:scale-95"
                    title="Export Loan Data"
                >
                    <Download size={20} />
                </button>
            </div>
            <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={plChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="0" vertical={false} stroke={isDarkMode ? 'rgba(255,255,255,0.03)' : '#f1f5f9'} />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 800, textAnchor: 'middle'}}
                            dy={15}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 800}}
                            dx={-10}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                borderRadius: '24px', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                backdropFilter: 'blur(20px)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                                color: isDarkMode ? '#f8fafc' : '#1e293b',
                                padding: '20px'
                            }}
                            cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f8fafc' }}
                        />
                        <Bar dataKey="amount" radius={[12, 12, 0, 0]} barSize={48} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
         </GlassCard>

         {/* Client Acquisition Trends */}
         <GlassCard className="p-8 border-white/20 dark:border-white/5 shadow-2xl">
            <div className="flex items-center gap-3 mb-10">
                <div className="w-1.5 h-6 bg-violet-500 rounded-full" />
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">New Clients</h3>
            </div>
            <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendsData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                        <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="0" vertical={false} stroke={isDarkMode ? 'rgba(255,255,255,0.03)' : '#f1f5f9'} />
                        <XAxis 
                            dataKey="month" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 800}}
                            dy={15}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 800}}
                            dx={-10}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                borderRadius: '24px', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                backdropFilter: 'blur(20px)',
                                backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                                padding: '20px'
                            }} 
                        />
                        <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
         </GlassCard>

         {/* Product Distribution */}
         <GlassCard className="p-8 border-white/20 dark:border-white/5 shadow-2xl">
            <div className="flex items-center gap-3 mb-10">
                <div className="w-1.5 h-6 bg-tytaj-500 rounded-full" />
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Portfolio Distribution</h3>
            </div>
            <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={healthData.product_performance} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="0" horizontal={false} stroke={isDarkMode ? 'rgba(255,255,255,0.03)' : '#f1f5f9'} />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 800}} dy={10} />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: isDarkMode ? '#e2e8f0' : '#1e293b', fontSize: 10, fontWeight: 900, textTransform: 'uppercase'}} 
                            width={100} 
                        />
                        <Tooltip 
                            cursor={{fill: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f8fafc'}} 
                            contentStyle={{ borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)', padding: '20px' }}
                            formatter={(val) => [`KES ${val.toLocaleString()}`, 'Portfolio']} 
                        />
                        <Bar dataKey="disbursed" name="Deployed" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={24} />
                        <Bar dataKey="outstanding" name="Outstanding" fill="#f97316" radius={[0, 8, 8, 0]} barSize={24} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
         </GlassCard>

         {/* PAR Distribution Chart */}
         <GlassCard className="p-8 border-white/20 dark:border-white/5 shadow-2xl">
            <div className="flex items-center gap-3 mb-10">
                <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Risk Assessment</h3>
            </div>
            <div className="h-[400px] flex flex-col md:flex-row items-center gap-10">
                <div className="flex-1 w-full h-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <defs>
                                <filter id="shadow">
                                    <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="rgba(0,0,0,0.3)"/>
                                </filter>
                            </defs>
                            <Pie
                                data={parChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={120}
                                paddingAngle={6}
                                dataKey="value"
                                stroke="none"
                            >
                                {parChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', backdropFilter: 'blur(20px)', backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)', padding: '20px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Total Active Portfolio</span>
                        <span className="text-xl font-black text-gray-900 dark:text-white">KES {(parData.total_active_portfolio / 1000).toFixed(1)}k</span>
                    </div>
                </div>
                
                <div className="w-full md:w-2/5 space-y-6">
                    <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] mb-4">PAR Ratios</div>
                    {Object.entries(parData.par_ratios).map(([key, ratio]) => (
                        <div key={key} className="flex flex-col group/ratio">
                            <div className="flex justify-between text-[10px] font-black text-gray-700 dark:text-gray-400 mb-2">
                                <span className="uppercase tracking-widest">{key.replace('_', ' ')}</span>
                                <span className={ratio > 10 ? 'text-rose-500' : 'text-emerald-500'}>{ratio}%</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-white/5 h-2 rounded-full overflow-hidden border border-transparent dark:border-white/5">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${ratio}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className={`h-full rounded-full ${ratio > 10 ? 'bg-rose-500' : 'bg-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.3)]'}`}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
         </GlassCard>


         {/* Expense Breakdown */}
         <GlassCard className="lg:col-span-2 !p-0 border-white/20 dark:border-white/5 shadow-2xl overflow-hidden mt-4">
             <div className="p-8 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Expense Report</h3>
                 </div>
                 <div className="flex items-center gap-4">
                     <ExportMenu 
                        data={expenseExportData}
                        columns={expenseColumns}
                        filename="Expense_Report"
                        title={`Expense Report (${dateRange.start} - ${dateRange.end})`}
                     />
                     <div className="px-5 py-2.5 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                        <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Total Expenses: KES {pnLData.total_expenses.toLocaleString()}</span>
                     </div>
                 </div>
             </div>
             <div className="max-h-[500px] overflow-y-auto selection:bg-tytaj-500/30">
                 <table className="w-full">
                     <thead className="bg-gray-50/50 dark:bg-white/5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] sticky top-0 backdrop-blur-md z-10">
                         <tr>
                             <th className="px-10 py-5 text-left">Category</th>
                             <th className="px-10 py-5 text-left">Description</th>
                             <th className="px-10 py-5 text-right">Amount</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                         {pnLData.expense_breakdown.map((e, idx) => (
                             <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all group">
                                 <td className="px-10 py-6 font-black text-gray-900 dark:text-white tracking-tight text-base">{e.category}</td>
                                 <td className="px-10 py-6 text-gray-500 dark:text-gray-400 font-medium">{e.description || 'General Overhead'}</td>
                                 <td className="px-10 py-6 text-right font-black text-gray-900 dark:text-white text-lg tracking-tighter">
                                    <span className="text-xs text-rose-500 mr-1">-</span>
                                    {e.amount.toLocaleString()}
                                 </td>
                             </tr>
                         ))}
                         {pnLData.expense_breakdown.length === 0 && (
                             <tr><td colSpan="3" className="p-32 text-center text-gray-400 dark:text-gray-600 font-black uppercase tracking-[0.3em] italic text-xs">No expense data available.</td></tr>
                         )}
                     </tbody>
                 </table>
             </div>
         </GlassCard>
      </div>
    </div>
  );
};

export default Reports;
