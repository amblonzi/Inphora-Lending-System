import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { DollarSign, Users, TrendingUp, CreditCard, Plus, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import GlassCard from '../components/ui/GlassCard';
import AnimatedButton from '../components/ui/AnimatedButton';
import Skeleton from '../components/ui/Skeleton';

import { 
  AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const Dashboard = () => {
  const { api, user } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_disbursed: 0,
    active_clients: 0,
    total_revenue: 0,
    total_expenses: 0,
    active_loans: 0,
  });
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartsReady, setChartsReady] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, trendsData] = await Promise.all([
            api.dashboard.getStats(),
            api.dashboard.getTrends()
        ]);
        setStats(statsData);
        setTrends(trendsData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Delay chart rendering until after GlassCard animations complete
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setChartsReady(true);
      }, 800); // GlassCard delay (0.4s) + animation duration (0.5s) - slight buffer
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const metrics = [
    {
      title: 'Total Loans Disbursed',
      value: formatCurrency(stats.total_disbursed),
      icon: DollarSign,
      color: 'from-blue-500 to-indigo-600',
      iconColor: 'text-blue-600 dark:text-blue-400',
      glow: 'bg-blue-500/10 dark:bg-blue-500/20',
      bgBase: 'bg-blue-50',
    },
    {
      title: 'Active Clients',
      value: stats.active_clients,
      icon: Users,
      color: 'from-emerald-500 to-teal-600',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      glow: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      bgBase: 'bg-emerald-50',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.total_revenue),
      icon: TrendingUp,
      color: 'from-violet-500 to-purple-600',
      iconColor: 'text-violet-600 dark:text-violet-400',
      glow: 'bg-violet-500/10 dark:bg-violet-500/20',
      bgBase: 'bg-violet-50',
    },
    {
      title: 'Active Loans',
      value: stats.active_loans,
      icon: CreditCard,
      color: 'from-orange-500 to-amber-600',
      iconColor: 'text-orange-600 dark:text-orange-400',
      glow: 'bg-orange-500/10 dark:bg-orange-500/20',
      bgBase: 'bg-orange-50',
    },
  ];

  if (loading) {
    return (
        <div className="space-y-8 p-1">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-64 rounded-xl" />
                    <Skeleton className="h-4 w-80 rounded-lg" />
                </div>
                <div className="flex gap-3">
                    <Skeleton className="h-12 w-28 rounded-2xl" />
                    <Skeleton className="h-12 w-36 rounded-2xl" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1,2,3,4].map(i => (
                    <Skeleton key={i} className="h-44 rounded-[2rem]" />
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-[450px] rounded-[2.5rem]" />
                <Skeleton className="h-[450px] rounded-[2.5rem]" />
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-10 pb-10">
      
      {/* Welcome Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div>
            <div className="flex items-center gap-3 mb-2">
                <span className="w-12 h-[2px] bg-tytaj-500 rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-tytaj-600 dark:text-tytaj-400">Dashboard</span>
            </div>
            <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-tytaj-600 to-orange-400 dark:from-tytaj-400 dark:to-orange-200">{user?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}</span>!
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-3 font-medium text-lg tracking-tight">Managing <span className="text-gray-900 dark:text-white font-bold">{stats.active_loans} active loans</span> in the system.</p>
        </div>
        <div className="flex gap-4">
            <AnimatedButton variant="secondary" onClick={() => navigate('/settings')} className="border-gray-200 dark:border-white/10 dark:bg-white/5">
                Settings
            </AnimatedButton>
            <AnimatedButton onClick={() => navigate('/loans')} className="shadow-xl shadow-tytaj-600/20">
                <Plus className="w-5 h-5 mr-1" />
                New Loan
            </AnimatedButton>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <GlassCard 
                key={index} 
                delay={index * 0.1}
                hoverEffect
                className="p-8 flex flex-col justify-between group overflow-hidden"
            >
              {/* Decorative Glow */}
              <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${metric.glow}`} />
              
              <div className="flex justify-between items-start relative z-10">
                <div className={`p-4 rounded-2xl ${metric.glow} ring-1 ring-white/10 ${metric.iconColor} transition-transform group-hover:scale-110 duration-500 shadow-sm`}>
                    <Icon className="w-7 h-7" />
                </div>
                <div className="flex flex-col items-end">
                    <div className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full ${metric.bgBase} dark:bg-white/5 ${metric.iconColor} uppercase tracking-widest`}>
                        <TrendingUp className="w-3 h-3" />
                        +2.4%
                    </div>
                </div>
              </div>
              
              <div className="mt-8 relative z-10">
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1">{metric.title}</p>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{metric.value}</h3>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Trend */}
        <GlassCard className="p-8 border-white/20 dark:border-white/5" delay={0.3}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
                <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Loan Trends</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">Monthly loan activity (12 months)</p>
                </div>
                <div className="flex gap-4 p-1.5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest px-3 py-1.5 bg-white dark:bg-blue-500/10 rounded-xl shadow-sm border border-gray-100 dark:border-blue-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Disbursed
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest px-3 py-1.5 border border-transparent">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Repayments
                    </div>
                </div>
            </div>
            
            <div className="h-[350px] w-full mt-4 min-w-0 relative">
                {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends}>
                        <defs>
                            <linearGradient id="colorDisbursed" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorRepayments" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"} />
                        <XAxis 
                            dataKey="month" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 700, fill: isDarkMode ? '#64748b' : '#94a3b8' }}
                            dy={15}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 700, fill: isDarkMode ? '#64748b' : '#94a3b8' }}
                            tickFormatter={(value) => `K${value >= 1000 ? (value/1000).toFixed(0) : value}`}
                            dx={-10}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                borderRadius: '24px', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                                backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                                backdropFilter: 'blur(10px)',
                                padding: '16px'
                            }}
                            itemStyle={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                            labelStyle={{ fontWeight: 900, marginBottom: '8px', color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: '10px', textTransform: 'uppercase' }}
                            formatter={(value) => [formatCurrency(value), '']}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="disbursed" 
                            stroke="#3b82f6" 
                            strokeWidth={4}
                            fillOpacity={1} 
                            fill="url(#colorDisbursed)" 
                            animationDuration={2000}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="repayments" 
                            stroke="#10b981" 
                            strokeWidth={4}
                            fillOpacity={1} 
                            fill="url(#colorRepayments)" 
                            animationDuration={2000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600">
                        <div className="animate-pulse">Loading chart...</div>
                    </div>
                )}
            </div>
        </GlassCard>

        {/* Growth & Expenses */}
        <GlassCard className="p-8 border-white/20 dark:border-white/5" delay={0.4}>
            <div className="flex items-center justify-between mb-10">
                <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Expenses Overview</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">Monthly expenses breakdown</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                    <TrendingUp size={20} />
                </div>
            </div>
            
            <div className="h-[350px] w-full mt-4 min-w-0 relative">
                {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trends}>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"} />
                        <XAxis 
                            dataKey="month" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 700, fill: isDarkMode ? '#64748b' : '#94a3b8' }}
                            dy={15}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 700, fill: isDarkMode ? '#64748b' : '#94a3b8' }}
                            tickFormatter={(value) => `K${value >= 1000 ? (value/1000).toFixed(0) : value}`}
                            dx={-10}
                        />
                        <Tooltip 
                            cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', radius: 10 }}
                            contentStyle={{ 
                                borderRadius: '24px', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                                backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                                backdropFilter: 'blur(10px)',
                                padding: '16px'
                            }}
                            itemStyle={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f97316' }}
                            labelStyle={{ fontWeight: 900, marginBottom: '8px', color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: '10px', textTransform: 'uppercase' }}
                            formatter={(value) => [formatCurrency(value), 'EXPENSES']}
                        />
                        <Bar 
                            dataKey="expenses" 
                            fill="#f97316" 
                            radius={[12, 12, 0, 0]} 
                            barSize={32}
                            animationDuration={1500}
                        />
                    </BarChart>
                </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600">
                        <div className="animate-pulse">Loading chart...</div>
                    </div>
                )}
            </div>
        </GlassCard>
      </div>

      {/* Quick Actions & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Quick Actions */}
        <GlassCard className="p-8 lg:col-span-2 border-white/20 dark:border-white/5" delay={0.5}>
            <div className="flex items-center gap-3 mb-8">
                <div className="w-1.5 h-6 bg-tytaj-500 rounded-full" />
                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                    { label: 'Register Client', icon: Users, route: '/clients', color: 'blue', desc: 'Add new client' },
                    { label: 'New Loan', icon: DollarSign, route: '/loans', color: 'emerald', desc: 'Create loan' },
                    { label: 'Add Expense', icon: CreditCard, route: '/expenses', color: 'orange', desc: 'Record expense' }
                ].map((action, idx) => (
                    <motion.button
                        key={idx}
                        whileHover={{ y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate(action.route)}
                        className={`flex flex-col items-start p-6 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-[2rem] hover:border-blue-500 dark:hover:border-blue-500/50 transition-all group text-left relative overflow-hidden`}
                    >
                        <div className="w-12 h-12 rounded-2xl bg-gray-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <action.icon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                        </div>
                        <h4 className="font-black text-gray-900 dark:text-white mb-1 uppercase tracking-tighter">{action.label}</h4>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{action.desc}</p>
                        
                        {/* Decorative background element */}
                        <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-gray-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform" />
                    </motion.button>
                ))}
            </div>
        </GlassCard>

        {/* System Health / Mini Stats */}
        <GlassCard className="p-8 border-white/20 dark:border-white/5 overflow-hidden" delay={0.6}>
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">System Status</h3>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active</span>
                </div>
            </div>
            
            <div className="space-y-6">
                <div className="group relative flex items-center justify-between p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent dark:border-white/5 hover:border-tytaj-500/30 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-white/5">
                            <TrendingUp className="w-5 h-5 text-tytaj-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">System Uptime</p>
                            <p className="text-sm font-black text-gray-900 dark:text-white mt-0.5">99.9% Availability</p>
                        </div>
                    </div>
                </div>

                <div className="group relative flex items-center justify-between p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent dark:border-white/5 hover:border-purple-500/30 transition-all">
                    <div className="flex items-center gap-4">
                         <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-white/5">
                            <Users className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Database Status</p>
                            <p className="text-sm font-black text-gray-900 dark:text-white mt-0.5">All Systems Operational</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5">
                <button className="w-full py-4 rounded-2xl bg-gray-900 dark:bg-white/5 text-white dark:text-gray-300 font-black text-xs uppercase tracking-[0.2em] hover:bg-black dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2 group">
                    View Audit Logs <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
            </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Dashboard;
