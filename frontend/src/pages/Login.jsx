import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOrganization } from '../context/OrganizationContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, ArrowRight, ShieldCheck, Sparkles, Server, Cpu, KeyRound } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import AnimatedButton from '../components/ui/AnimatedButton';
import { toast } from 'sonner';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState('login'); // 'login' or 'otp'
    const [userId, setUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const { login, verifyOtp } = useAuth();
    const { orgConfig } = useOrganization();
    const navigate = useNavigate();

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const result = await login(email, password);
            if (result.two_factor_required) {
                setUserId(result.user_id);
                setStep('otp');
                toast.info('Verification Required. Please enter the OTP sent to your phone.');
            } else if (result.success) {
                toast.success('System synchronization successful. Welcome back.');
                navigate('/');
            } else {
                toast.error(result.error || 'Authentication failure. Invalid credentials detected.');
            }
        } catch (err) {
            toast.error('Critical authentication error. System unreachable.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const result = await verifyOtp(userId, otp);
            if (result.success) {
                toast.success('Security verification complete. Access granted.');
                navigate('/');
            } else {
                toast.error(result.error || 'Invalid or expired security code.');
            }
        } catch (err) {
            toast.error('Verification system error.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#f8fafc] dark:bg-[#0a0a0f] transition-colors duration-500">
            {/* Dynamic Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-tytaj-500/10 dark:bg-tytaj-500/5 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[120px] animation-delay-2000" />

            {/* Tech Grid Background (Dark Mode Only) */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            <div className="container mx-auto px-6 relative z-10">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

                    {/* Left Side: Vanguard Branding */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="hidden lg:block space-y-10"
                    >
                        <div className="flex items-center gap-4">
                            {orgConfig?.logo_url ? (
                                <img
                                    src={`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}${orgConfig.logo_url}`}
                                    alt="Logo"
                                    className="w-20 h-20 object-contain"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-tytaj-500 to-tytaj-800 flex items-center justify-center text-white font-black text-3xl shadow-2xl shadow-tytaj-500/30">
                                    ILS
                                </div>
                            )}
                            <div>
                                <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">{orgConfig?.organization_name || 'Inphora Lending System'}</h1>
                                <span className="text-[10px] font-black text-tytaj-600 dark:text-tytaj-400 uppercase tracking-[0.5em] mt-2 block">Lending System</span>
                            </div>
                        </div>

                        <h2 className="text-6xl font-black text-gray-900 dark:text-white leading-[1] tracking-tight">
                            Professional <span className="text-tytaj-600">Lending</span> System.
                        </h2>

                        <p className="text-xl text-gray-500 dark:text-gray-400 leading-relaxed max-w-lg font-medium">
                            Advanced micro-finance platform with automated loan management, comprehensive analytics, and M-Pesa integration.
                        </p>

                        <div className="grid grid-cols-1 gap-6">
                            {[
                                { icon: ShieldCheck, text: 'Secure Transactions', desc: 'End-to-end data encryption' },
                                { icon: Sparkles, text: 'Financial Intelligence', desc: 'Portfolio risk assessment' },
                                { icon: Server, text: 'High Availability', desc: '99.9% uptime guaranteed' }
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 + (i * 0.1) }}
                                    className="flex items-start gap-4"
                                >
                                    <div className="p-3 rounded-2xl bg-white dark:bg-white/5 shadow-sm border border-gray-100 dark:border-white/5 text-tytaj-500 mt-1">
                                        <item.icon size={22} />
                                    </div>
                                    <div>
                                        <p className="text-gray-900 dark:text-white font-black text-sm uppercase tracking-wider">{item.text}</p>
                                        <p className="text-gray-500 dark:text-gray-500 text-xs font-medium mt-1">{item.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Right Side: Auth Terminal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <GlassCard className="p-10 md:p-14 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] border-white/40 dark:border-white/5 relative overflow-hidden group">
                            <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-tytaj-500/5 blur-[100px] group-hover:bg-tytaj-500/10 transition-all duration-700" />

                            <div className="lg:hidden text-center mb-10">
                                <div className="inline-flex items-center gap-3">
                                    {orgConfig?.logo_url ? (
                                        <img
                                            src={`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}${orgConfig.logo_url}`}
                                            alt="Logo"
                                            className="w-12 h-12 object-contain"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-xl bg-tytaj-600 flex items-center justify-center text-white font-black">{orgConfig?.organization_name?.charAt(0) || 'I'}</div>
                                    )}
                                    <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">{orgConfig?.organization_name || 'Inphora Lending System'}</span>
                                </div>
                            </div>

                            <div className="mb-12 text-center lg:text-left relative z-10">
                                <div className="flex items-center gap-2 mb-3 justify-center lg:justify-start">
                                    <Cpu size={14} className="text-tytaj-500" />
                                    <span className="text-[10px] font-black text-tytaj-600 dark:text-tytaj-400 uppercase tracking-[0.4em]">{step === 'login' ? 'Login' : 'Verification'}</span>
                                </div>
                                <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                                    {step === 'login' ? 'Sign In' : 'Two-Step Verification'}
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 font-medium mt-2">
                                    {step === 'login' ? 'Enter your credentials to continue.' : 'Enter the 6-digit security code sent to you.'}
                                </p>
                            </div>

                            {step === 'login' ? (
                                <form onSubmit={handleLoginSubmit} className="space-y-8 relative z-10">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-tytaj-500 transition-colors" size={20} />
                                            <input
                                                type="email"
                                                required
                                                className="w-full pl-14 pr-4 py-4.5 bg-gray-50/80 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all font-black text-gray-900 dark:text-white tracking-tight"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center ml-1">
                                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Password</label>
                                            <a href="#" className="text-[10px] font-black text-tytaj-600 dark:text-tytaj-400 hover:text-tytaj-700 tracking-widest uppercase">Forgot?</a>
                                        </div>
                                        <div className="relative group">
                                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-tytaj-500 transition-colors" size={20} />
                                            <input
                                                type="password"
                                                required
                                                className="w-full pl-14 pr-4 py-4.5 bg-gray-50/80 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all font-black text-gray-900 dark:text-white tracking-widest"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 ml-1">
                                        <input type="checkbox" id="remember" className="w-5 h-5 rounded-lg border-gray-300 dark:border-white/10 text-tytaj-600 focus:ring-tytaj-500/20 bg-white dark:bg-white/5" />
                                        <label htmlFor="remember" className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest select-none cursor-pointer">Remember Me</label>
                                    </div>

                                    <AnimatedButton
                                        type="submit"
                                        className="w-full py-5 rounded-2xl text-lg font-black uppercase tracking-widest shadow-2xl shadow-tytaj-600/30 mt-6"
                                        isLoading={isLoading}
                                    >
                                        Sign In <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </AnimatedButton>
                                </form>
                            ) : (
                                <form onSubmit={handleOtpSubmit} className="space-y-8 relative z-10">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Security Code</label>
                                        <div className="relative group">
                                            <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-tytaj-500 transition-colors" size={20} />
                                            <input
                                                type="text"
                                                required
                                                maxLength={6}
                                                placeholder="000000"
                                                className="w-full pl-14 pr-4 py-5 bg-gray-50/80 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all font-black text-gray-900 dark:text-white tracking-[0.5em] text-center text-2xl"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                            />
                                        </div>
                                    </div>

                                    <AnimatedButton
                                        type="submit"
                                        className="w-full py-5 rounded-2xl text-lg font-black uppercase tracking-widest shadow-2xl shadow-tytaj-600/30 mt-6"
                                        isLoading={isLoading}
                                    >
                                        Verify Identity <ShieldCheck className="ml-2 w-5 h-5 group-hover:scale-110 transition-transform" />
                                    </AnimatedButton>

                                    <button
                                        type="button"
                                        onClick={() => setStep('login')}
                                        className="w-full text-xs font-black text-gray-400 hover:text-tytaj-500 transition-colors uppercase tracking-widest"
                                    >
                                        Back to Login
                                    </button>
                                </form>
                            )}

                            <div className="mt-12 text-center relative z-10 border-t border-gray-100 dark:border-white/5 pt-10">
                                <p className="text-gray-500 dark:text-gray-500 font-bold text-sm tracking-tight">
                                    Don't have an account? {' '}
                                    <Link to="/register" className="text-tytaj-600 dark:text-tytaj-400 font-black hover:underline uppercase text-xs tracking-widest">Register</Link>
                                </p>
                            </div>
                        </GlassCard>

                        <div className="mt-12 flex items-center justify-center gap-4 opacity-50">
                            <div className="h-[1px] w-12 bg-gray-300 dark:bg-gray-800" />
                            <p className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.4em] whitespace-nowrap">Secure & Reliable</p>
                            <div className="h-[1px] w-12 bg-gray-300 dark:bg-gray-800" />
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Login;
