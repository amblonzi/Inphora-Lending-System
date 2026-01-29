import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, X, Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const NotificationDropdown = ({ notifications, onMarkAsRead, onMarkAllAsRead, onClose }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-rose-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgColor = (type) => {
    switch (type) {
      case 'success': return 'bg-emerald-500/10 dark:bg-emerald-500/20';
      case 'warning': return 'bg-amber-500/10 dark:bg-amber-500/20';
      case 'error': return 'bg-rose-500/10 dark:bg-rose-500/20';
      default: return 'bg-blue-500/10 dark:bg-blue-500/20';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="absolute right-0 top-full mt-4 w-96 max-h-[500px] flex flex-col bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5 bg-white/50 dark:bg-white/5">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-tytaj-500/10 rounded-xl">
                <Bell className="w-4 h-4 text-tytaj-600 dark:text-tytaj-400" />
            </div>
            <h3 className="font-black text-gray-900 dark:text-white">Notifications</h3>
        </div>
        
        {notifications.some(n => !n.is_read) && (
            <button 
                onClick={onMarkAllAsRead}
                className="text-[10px] font-bold uppercase tracking-wider text-tytaj-600 dark:text-tytaj-400 hover:text-tytaj-700 dark:hover:text-tytaj-300 transition-colors"
            >
                Mark all read
            </button>
        )}
      </div>

      {/* List */}
      <div className="overflow-y-auto custom-scrollbar flex-1 p-2">
        {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-gray-400 dark:text-gray-600" />
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">No notifications</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">You're all caught up!</p>
            </div>
        ) : (
            <div className="space-y-1">
                {notifications.map((notification) => (
                    <motion.div 
                        key={notification.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`group relative p-4 rounded-2xl transition-all ${
                            notification.is_read 
                                ? 'hover:bg-gray-50 dark:hover:bg-white/5' 
                                : 'bg-blue-50/50 dark:bg-blue-500/5 hover:bg-blue-50 dark:hover:bg-blue-500/10'
                        }`}
                    >
                        <div className="flex gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getBgColor(notification.type)}`}>
                                {getIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                    <h4 className={`text-xs font-bold ${notification.is_read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                                        {notification.title}
                                    </h4>
                                    <span className="text-[10px] font-medium text-gray-400 shrink-0 whitespace-nowrap">
                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed line-clamp-2">
                                    {notification.message}
                                </p>
                                
                                {!notification.is_read && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onMarkAsRead(notification.id);
                                        }}
                                        className="mt-2 text-[10px] font-bold text-tytaj-600 dark:text-tytaj-400 hover:underline flex items-center gap-1"
                                    >
                                        <Check className="w-3 h-3" /> Mark as read
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        )}
      </div>
    </motion.div>
  );
};

export default NotificationDropdown;
