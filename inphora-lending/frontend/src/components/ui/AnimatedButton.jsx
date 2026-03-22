import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export const AnimatedButton = ({ 
  children, 
  className, 
  variant = 'primary', 
  isLoading = false,
  disabled,
  onClick,
  ...props 
}) => {
  
  const variants = {
    primary: "bg-gradient-to-r from-tytaj-600 to-tytaj-500 text-white shadow-tytaj-500/20 hover:shadow-tytaj-500/40",
    secondary: "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-slate-800/50"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-medium transition-colors shadow-sm",
        variants[variant],
        (disabled || isLoading) && "opacity-70 cursor-not-allowed",
        className
      )}
      disabled={disabled || isLoading}
      onClick={!disabled && !isLoading ? onClick : undefined}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </motion.button>
  );
};

export default AnimatedButton;
