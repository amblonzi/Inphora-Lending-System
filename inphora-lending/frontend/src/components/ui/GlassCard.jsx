import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export const GlassCard = ({ children, className, delay = 0, hoverEffect = false, ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl shadow-sm transition-all duration-300",
        hoverEffect && "hover:shadow-lg hover:bg-white/80 dark:hover:bg-slate-900/60 hover:-translate-y-1",
        className
      )}
      {...props}
    >
      {/* Glossy Reflection Effect */}
      <div className="pointer-events-none absolute -inset-full top-0 block -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
      
      {children}
    </motion.div>
  );
};

export default GlassCard;
