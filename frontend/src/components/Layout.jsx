import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useOrganization } from '../context/OrganizationContext';
import { LayoutDashboard, Users, User, DollarSign, PieChart, LogOut, Settings, Menu, X, Bell, Building2, UsersRound, TrendingUp, Smartphone, History, Shield, Moon, Sun, Terminal, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import GlassCard from './ui/GlassCard';
import NotificationDropdown from './NotificationDropdown';
import { api } from '../services/api';

const Layout = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { orgConfig } = useOrganization();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications
  React.useEffect(() => {
    fetchNotifications();

    // Poll every minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await api.notifications.list({ limit: 10 });
      const notificationsArray = Array.isArray(data) ? data : [];
      setNotifications(notificationsArray);
      setUnreadCount(notificationsArray.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.notifications.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Users, label: 'Clients', path: '/clients' },
    { icon: DollarSign, label: 'Loans', path: '/loans' },
    { icon: PieChart, label: 'Expenses', path: '/expenses' },
    { icon: Building2, label: 'Branches', path: '/branches' },
    { icon: UsersRound, label: 'Customer Groups', path: '/customer-groups' },
    { icon: TrendingUp, label: 'Reports', path: '/reports' },
    { icon: Smartphone, label: 'M-Pesa', path: '/mpesa' },
    { icon: History, label: 'Audit Logs', path: '/audit-logs', adminOnly: true },
    { icon: Shield, label: 'Users', path: '/users', adminOnly: true },
    { icon: Package, label: 'Loan Products', path: '/loan-products' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-8 flex items-center gap-4">
        {orgConfig?.logo_url ? (
          <img
            src={`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}${orgConfig.logo_url}`}
            alt="Logo"
            className="w-12 h-12 object-contain"
          />
        ) : (
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-tytaj-500 to-tytaj-800 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-tytaj-500/20">
            {orgConfig?.organization_name?.charAt(0) || 'ILS'}
          </div>
        )}
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
            {orgConfig?.organization_name || 'Inphora Lending System'}
          </h1>
          <span className="text-[9px] font-black text-tytaj-600 dark:text-tytaj-400 uppercase tracking-[0.4em] mt-1 block opacity-80">Lending System</span>
        </div>
      </div>

      <nav className="flex-1 mt-4 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {menuItems.filter(item => !item.adminOnly || user?.role === 'admin').map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "group flex items-center px-4 py-3.5 rounded-2xl transition-all duration-300 relative overflow-hidden",
                isActive
                  ? "bg-white dark:bg-white/5 text-tytaj-600 dark:text-tytaj-400 shadow-lg shadow-black/5 dark:shadow-none ring-1 ring-gray-100 dark:ring-white/10"
                  : "text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-tytaj-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              )}
              <Icon className={cn("w-5 h-5 mr-3.5 transition-all duration-300", isActive ? "text-tytaj-600 dark:text-tytaj-400 scale-110" : "text-gray-400 group-hover:text-tytaj-500 dark:group-hover:text-tytaj-400")} />
              <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
              {isActive && (
                <div className="ml-auto">
                  <div className="w-1.5 h-1.5 rounded-full bg-tytaj-500 dark:bg-tytaj-400 animate-pulse shadow-[0_0_8px_rgba(var(--tytaj-500-rgb),0.5)]" />
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-gray-100/50 dark:border-white/5 space-y-4">
        <button
          onClick={handleLogout}
          className="flex items-center text-gray-400 hover:text-rose-500 dark:text-gray-600 dark:hover:text-rose-400 w-full px-4 py-3 rounded-2xl hover:bg-rose-500/10 transition-all group"
        >
          <LogOut className="w-5 h-5 mr-3 transition-transform group-hover:-translate-x-1" />
          <span className="text-[10px] font-black uppercase tracking-widest">Logout</span>
        </button>

        <div className="px-4 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
          <span className="text-[8px] font-black text-tytaj-600 dark:text-tytaj-400 uppercase tracking-[0.3em] block mb-2">Support & Assistance</span>
          <a href="https://www.inphora.net" target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-gray-600 dark:text-gray-400 hover:text-tytaj-500 block mb-1">www.inphora.net</a>
          <div className="text-[9px] font-bold text-gray-500 dark:text-gray-500 space-y-0.5">
            <p className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-tytaj-500/40" />+254 705 522 155</p>
            <p className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-tytaj-500/40" />+254 720 439 821</p>
            <a href="mailto:contact@inphora.net" className="hover:text-tytaj-500 block">contact@inphora.net</a>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#efeff4] dark:bg-[#0a0a0f] transition-colors duration-500">

      {/* Background Decorative Element */}
      <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-tytaj-500/5 dark:bg-tytaj-500/[0.03] rounded-full blur-[150px] pointer-events-none" />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col border-r border-white/40 dark:border-white/5 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl z-20">
        <SidebarContent />
      </aside>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 35 }}
              className="fixed inset-y-0 left-0 w-80 bg-white/90 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl z-40 md:hidden border-r border-white/20 dark:border-white/5"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Topbar */}
        <header className="h-20 border-b border-white/40 dark:border-white/5 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl px-8 flex justify-between items-center z-10 sticky top-0">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-3 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-600 dark:text-gray-400"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <Terminal size={12} className="text-tytaj-500" />
                <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">Current Page</span>
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {menuItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-3 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-500 dark:text-gray-400 transition-all active:scale-95 hover:text-tytaj-500 dark:hover:text-tytaj-400 shadow-sm"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-3 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-500 dark:text-gray-400 transition-all hover:text-tytaj-500 dark:hover:text-tytaj-400 shadow-sm group"
              >
                <Bell className={`w-5 h-5 transition-transform ${showNotifications ? 'text-tytaj-500' : 'group-hover:rotate-12'}`} />
                {unreadCount > 0 && (
                  <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowNotifications(false)}
                    />
                    <NotificationDropdown
                      notifications={notifications}
                      onMarkAsRead={markAsRead}
                      onMarkAllAsRead={markAllAsRead}
                      onClose={() => setShowNotifications(false)}
                    />
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="h-8 w-[1px] bg-gray-200 dark:bg-white/10 mx-2 hidden sm:block" />

            <div className="flex items-center gap-4 pl-2 h-full group cursor-pointer">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-xs font-black text-gray-900 dark:text-white tracking-tight leading-none mb-1">
                  {user?.email?.split('@')[0].toUpperCase()}
                </span>
                <span className="text-[9px] font-black text-tytaj-600 dark:text-tytaj-400 uppercase tracking-widest opacity-70">{user?.role}</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-tytaj-500 to-tytaj-800 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-tytaj-500/20 group-hover:scale-105 transition-transform border border-white/20">
                {user?.email?.[0].toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content with Transition */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 scroll-smooth custom-scrollbar">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </div>
      </main>


    </div>
  );
};

export default Layout;
