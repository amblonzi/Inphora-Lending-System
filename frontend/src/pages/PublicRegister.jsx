import React, { useState } from 'react';
import { Send, ArrowRight, Smartphone, Fingerprint, Mail, MapPin, Zap, ShieldCheck, Cpu, RefreshCw } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedButton from '../components/ui/AnimatedButton';

const PublicRegister = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    id_number: '',
    email: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${BASE_URL}/api/mpesa/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setApplication(data);
      } else {
        alert(data.detail || 'Registration failed');
      }
    } catch (error) {
      alert('Error submitting registration: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black uppercase tracking-tight placeholder:opacity-30";

  if (application) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#050508] flex items-center justify-center p-6 selection:bg-tytaj-500/30 overflow-hidden relative">
         {/* Decorative Gradients */}
         <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-tytaj-500/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/5 rounded-full blur-[120px]" />
        </div>

        <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-xl relative z-10"
        >
          <GlassCard className="p-16 border-white/40 dark:border-white/10 shadow-4xl bg-white dark:bg-[#0a0a0f] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5">
                <ShieldCheck size={140} />
            </div>
            
            <div className="text-center relative">
                <motion.div 
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 3 }}
                    transition={{ type: 'spring', damping: 12 }}
                    className="w-24 h-24 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-[32px] flex items-center justify-center mx-auto mb-10 border border-emerald-500/20 shadow-2xl"
                >
                  <Send className="w-12 h-12 text-emerald-500" />
                </motion.div>
                
                <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-4 tracking-tighter uppercase leading-none">Application Received</h2>
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-10 max-w-sm mx-auto leading-relaxed">{application.message}</p>
                
                <div className="bg-gray-50 dark:bg-white/5 p-10 rounded-[40px] text-left mb-10 border border-gray-100 dark:border-white/10 shadow-inner group">
                  <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                    <Zap size={14} className="text-tytaj-500" /> Payment Details
                  </h3>
                  <div className="space-y-6">
                    <div className="flex justify-between items-center group/item">
                        <span className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Paybill Number</span>
                        <span className="text-xl font-black text-gray-900 dark:text-white font-mono tracking-tighter bg-white dark:bg-[#0a0a0f] px-4 py-2 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm">{application.paybill}</span>
                    </div>
                    <div className="flex justify-between items-center group/item">
                        <span className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Account Number</span>
                        <span className="text-xl font-black text-gray-900 dark:text-white font-mono tracking-tighter bg-white dark:bg-[#0a0a0f] px-4 py-2 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm">{application.account}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-dashed border-gray-200 dark:border-white/10 pt-6 mt-2">
                        <span className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Registration Fee</span>
                        <span className="text-3xl font-black text-tytaj-500 tracking-tighter">KES {application.fee}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <p className="text-[10px] text-gray-400 dark:text-gray-600 font-black uppercase tracking-widest leading-relaxed italic opacity-80">
                    Once payment is confirmed, you will receive your credentials to access the system.
                  </p>
                </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#050508] flex items-center justify-center p-6 selection:bg-tytaj-500/30 overflow-hidden relative">
        {/* Decorative Gradients */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-tytaj-500/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-500/5 rounded-full blur-[120px]" />
        </div>

      <motion.div 
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl relative z-10"
      >
        <GlassCard className="p-16 border-white/40 dark:border-white/10 shadow-4xl bg-white dark:bg-[#0a0a0f] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-tytaj-400 via-tytaj-600 to-indigo-600"></div>
            
            <div className="text-center mb-16 relative">
                <div className="inline-flex items-center gap-3 px-6 py-2 bg-tytaj-500/5 text-tytaj-500 text-[10px] font-black uppercase tracking-[0.4em] rounded-[20px] mb-6 border border-tytaj-500/10">
                    <Cpu size={14} className="animate-spin-slow" />
                    Entity Onboarding
                </div>
                <h1 className="text-5xl font-black text-gray-900 dark:text-white mb-4 tracking-tighter uppercase leading-none">Join the Network</h1>
                <p className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest opacity-60">Register for an account to access our services</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 relative">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                        Full Name *
                    </label>
                    <div className="relative">
                        <Fingerprint className="absolute left-5 top-1/2 -translate-y-1/2 text-tytaj-500/50" size={20} />
                        <input
                            type="text"
                            required
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            className={`${inputClass} !pl-14`}
                            placeholder="e.g. Samuel Korir Ruto"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                            Phone Number (M-Pesa) *
                        </label>
                        <div className="relative">
                            <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 text-tytaj-500/50" size={20} />
                            <input
                                type="tel"
                                required
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className={`${inputClass} !pl-14`}
                                placeholder="07XXXXXXXX"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                            National ID *
                        </label>
                        <div className="relative">
                            <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-tytaj-500/50" size={20} />
                            <input
                                type="text"
                                required
                                value={formData.id_number}
                                onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                                className={`${inputClass} !pl-14 font-mono`}
                                placeholder="XXXXXXXX"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                        Email Address
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-tytaj-500/50" size={20} />
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className={`${inputClass} !pl-14`}
                            placeholder="user@example.com"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                        Physical Address
                    </label>
                    <div className="relative">
                        <MapPin className="absolute left-5 top-5 text-tytaj-500/50" size={20} />
                        <textarea
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className={`${inputClass} !pl-14 resize-none h-32 py-5`}
                            placeholder="Enter your physical address..."
                        />
                    </div>
                </div>

                <div className="pt-6">
                    <AnimatedButton
                        type="submit"
                        disabled={loading}
                        className="w-full py-6 rounded-[32px] shadow-3xl shadow-tytaj-500/20"
                    >
                        {loading ? (
                            <div className="flex items-center gap-3">
                                <RefreshCw className="animate-spin" size={20} />
                                <span>Submitting...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <Zap size={24} />
                                <span className="text-lg">Register</span>
                                <ArrowRight size={24} />
                            </div>
                        )}
                    </AnimatedButton>
                </div>
            </form>

            <div className="mt-12 pt-10 border-t border-gray-100 dark:border-white/5 text-center">
                <p className="text-[10px] text-gray-400 dark:text-gray-600 font-black uppercase tracking-[0.3em] leading-relaxed">
                    Initial provision fee: KES 100 <br />
                    <span className="text-tytaj-500/60 mt-2 block italic">Complete payment via M-Pesa after submission</span>
                </p>
            </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default PublicRegister;
