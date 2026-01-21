import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Upload, FileText, User, MapPin, CreditCard, Users, Heart, Camera, Fingerprint, Globe, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from './ui/GlassCard';
import AnimatedButton from './ui/AnimatedButton';

const InputWrapper = ({ label, children, required }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    {children}
  </div>
);

const ClientModal = ({ client, onClose, onSave }) => {
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [groups, setGroups] = useState([]);

  const [formData, setFormData] = useState({
    // Basic Info
    first_name: client?.first_name || '',
    last_name: client?.last_name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    id_number: client?.id_number || '',
    dob: client?.dob || '',
    gender: client?.gender || '',
    marital_status: client?.marital_status || '',
    
    // Location
    address: client?.address || '',
    town: client?.town || '',
    estate: client?.estate || '',
    house_number: client?.house_number || '',
    branch_id: client?.branch_id || '',
    
    // Grouping
    customer_group_id: client?.customer_group_id || '',
    
    // Next of Kin
    next_of_kin: client?.next_of_kin?.[0] || {
      name: '',
      phone: '',
      relation: '',
      residence: ''
    },
    
    // Financials
    mpesa_phone: client?.mpesa_phone || '',
    bank_name: client?.bank_name || '',
    bank_account_number: client?.bank_account_number || '',
    bank_account_name: client?.bank_account_name || '',
    preferred_disbursement: client?.preferred_disbursement || 'mpesa',
    
    // KYC
    document_url: client?.document_url || '',
    kyc_documents: client?.kyc_documents || []
  });

  const [kycFiles, setKycFiles] = useState([]); // Array of { file, type }

  useEffect(() => {
    fetchDropdowns();
  }, []);

  const fetchDropdowns = async () => {
    try {
      const [branchesRes, groupsRes] = await Promise.all([
        api.branches.list(),
        api.customerGroups.list()
      ]);
      setBranches(branchesRes);
      setGroups(groupsRes);
    } catch (error) {
      console.error("Failed to load dropdown options", error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNextOfKinChange = (e) => {
    setFormData({
      ...formData,
      next_of_kin: { ...formData.next_of_kin, [e.target.name]: e.target.value }
    });
  };

  const handleAddKycFile = (e) => {
    if (e.target.files[0]) {
      setKycFiles([...kycFiles, { file: e.target.files[0], type: 'National ID' }]);
    }
  };

  const removeKycFile = (index) => {
    setKycFiles(kycFiles.filter((_, i) => i !== index));
  };

  const updateKycFileType = (index, type) => {
    const updated = [...kycFiles];
    updated[index].type = type;
    setKycFiles(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Save or Update Client first to get an ID if it's new
      const clientPayload = {
        ...formData,
        branch_id: formData.branch_id ? parseInt(formData.branch_id) : null,
        customer_group_id: formData.customer_group_id ? parseInt(formData.customer_group_id) : null,
      };

      let savedClient;
      if (client) {
        savedClient = await api.clients.update(client.id, clientPayload);
      } else {
        savedClient = await api.clients.create(clientPayload);
      }

      // 2. Upload and attach multiple KYC documents
      if (kycFiles.length > 0) {
        for (const kyc of kycFiles) {
          const uploadRes = await api.uploadFile(kyc.file, 'kyc');
          await api.clients.addKycDocument(savedClient.id, {
            document_url: uploadRes.url,
            document_type: kyc.type
          });
        }
      }

      toast.success(client ? 'Client updated successfully' : 'Client added successfully');
      onSave();
    } catch (err) {
      const errorDetail = err.response?.data?.detail;
      if (typeof errorDetail === 'string') {
        toast.error(errorDetail);
      } else if (Array.isArray(errorDetail)) {
        errorDetail.forEach(err => toast.error(err.msg || JSON.stringify(err)));
      } else {
        toast.error('Failed to save client. Please check all fields.');
      }
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'kin', label: 'Next of Kin', icon: Heart },
    { id: 'financial', label: 'Financial Info', icon: CreditCard },
    { id: 'kyc', label: 'KYC Documents', icon: Camera },
  ];

  const inputClass = "w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black uppercase tracking-tight placeholder:opacity-30";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-3xl"
      >
        <GlassCard className="!p-0 border-white/20 dark:border-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Header Area */}
            <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-start bg-gray-50/50 dark:bg-white/5 relative overflow-hidden">
                <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-tytaj-500/5 blur-[100px]" />
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-1">
                        <Fingerprint size={16} className="text-tytaj-500" />
                        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">Client Registry</span>
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
                        {client ? 'Update Client' : 'New Client'}
                    </h2>
                </div>
                <button 
                    onClick={onClose} 
                    className="p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-rose-500 dark:hover:bg-rose-500 hover:text-white rounded-2xl transition-all text-gray-500 relative z-10 group"
                >
                    <X size={24} className="group-hover:rotate-90 transition-transform" />
                </button>
            </div>

            {/* Tab Controller */}
            <div className="flex gap-2 p-2 bg-gray-100/50 dark:bg-black/20 border-b border-gray-100 dark:border-white/5 scroll-x-auto no-scrollbar">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
                    activeTab === tab.id 
                      ? 'bg-white dark:bg-slate-900 text-tytaj-600 dark:text-tytaj-400 shadow-sm ring-1 ring-gray-100 dark:ring-white/10' 
                      : 'text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Form Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-[#0a0a0f] scroll-smooth custom-scrollbar">
              <form id="client-form" onSubmit={handleSubmit} className="space-y-8">
                <AnimatePresence mode="wait">
                    {activeTab === 'basic' && (
                    <motion.div 
                        key="basic"
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-6"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputWrapper label="First Name" required>
                                <input name="first_name" required value={formData.first_name} onChange={handleChange} className={inputClass} placeholder="e.g. JOHN" />
                            </InputWrapper>
                            <InputWrapper label="Last Name" required>
                                <input name="last_name" required value={formData.last_name} onChange={handleChange} className={inputClass} placeholder="e.g. DOE" />
                            </InputWrapper>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputWrapper label="ID Number" required>
                                <input name="id_number" required value={formData.id_number} onChange={handleChange} className={inputClass} placeholder="ID / PASSPORT" />
                            </InputWrapper>
                            <InputWrapper label="Date of Birth">
                                <input type="date" name="dob" value={formData.dob} onChange={handleChange} className={inputClass} />
                            </InputWrapper>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputWrapper label="Gender">
                                <select name="gender" value={formData.gender} onChange={handleChange} className={inputClass}>
                                    <option value="">Select...</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </InputWrapper>
                            <InputWrapper label="Marital Status">
                                <select name="marital_status" value={formData.marital_status} onChange={handleChange} className={inputClass}>
                                    <option value="">Select...</option>
                                    <option value="Single">Single</option>
                                    <option value="Married">Married</option>
                                    <option value="Divorced">Divorced</option>
                                </select>
                            </InputWrapper>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputWrapper label="Phone Number" required>
                                <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} className={inputClass} placeholder="07XXXXXXXX" />
                            </InputWrapper>
                            <InputWrapper label="Email Address">
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClass} placeholder="email@example.com" />
                            </InputWrapper>
                        </div>
                    </motion.div>
                    )}

                    {activeTab === 'location' && (
                    <motion.div 
                        key="location"
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-6"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputWrapper label="Branch">
                                <select name="branch_id" value={formData.branch_id} onChange={handleChange} className={inputClass}>
                                    <option value="">Select Branch...</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </InputWrapper>
                            <InputWrapper label="Group">
                                <select name="customer_group_id" value={formData.customer_group_id} onChange={handleChange} className={inputClass}>
                                    <option value="">Select Group...</option>
                                    {groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </InputWrapper>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputWrapper label="Town">
                                <input name="town" value={formData.town} onChange={handleChange} className={inputClass} placeholder="e.g. Nairobi" />
                            </InputWrapper>
                            <InputWrapper label="Estate/Area">
                                <input name="estate" value={formData.estate} onChange={handleChange} className={inputClass} placeholder="e.g. Upperhill" />
                            </InputWrapper>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <InputWrapper label="House Number">
                                <input name="house_number" value={formData.house_number} onChange={handleChange} className={inputClass} placeholder="e.g. B12" />
                            </InputWrapper>
                            <div className="md:col-span-2">
                                <InputWrapper label="Full Address & Landmarks" required>
                                    <input name="address" required value={formData.address} onChange={handleChange} className={inputClass} placeholder="e.g. Near ABC Plaza" />
                                </InputWrapper>
                            </div>
                        </div>
                    </motion.div>
                    )}

                    {activeTab === 'kin' && (
                    <motion.div 
                        key="kin"
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-6"
                    >
                        <div className="bg-tytaj-500/5 p-6 rounded-3xl border border-tytaj-500/10 flex items-center gap-4 mb-4">
                            <Globe size={20} className="text-tytaj-500" />
                            <p className="text-[10px] font-black text-tytaj-900 dark:text-tytaj-400 uppercase tracking-widest">Secondary Contact Information</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputWrapper label="Name">
                                <input name="name" value={formData.next_of_kin.name} onChange={handleNextOfKinChange} className={inputClass} placeholder="e.g. Mary Doe" />
                            </InputWrapper>
                            <InputWrapper label="Phone Number">
                                <input name="phone" value={formData.next_of_kin.phone} onChange={handleNextOfKinChange} className={inputClass} placeholder="07XXXXXXXX" />
                            </InputWrapper>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputWrapper label="Relationship">
                                <input name="relation" value={formData.next_of_kin.relation} onChange={handleNextOfKinChange} className={inputClass} placeholder="e.g. Spouse" />
                            </InputWrapper>
                            <InputWrapper label="Residence">
                                <input name="residence" value={formData.next_of_kin.residence} onChange={handleNextOfKinChange} className={inputClass} placeholder="Estate / Town" />
                            </InputWrapper>
                        </div>
                    </motion.div>
                    )}

                    {activeTab === 'financial' && (
                    <motion.div 
                        key="financial"
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-8"
                    >
                        <InputWrapper label="Preferred Disbursement Method">
                            <div className="flex gap-4">
                                <label className="flex-1 cursor-pointer">
                                    <input type="radio" name="preferred_disbursement" value="mpesa" checked={formData.preferred_disbursement === 'mpesa'} onChange={handleChange} className="hidden peer" />
                                    <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest peer-checked:bg-tytaj-500/10 peer-checked:border-tytaj-500/50 peer-checked:text-tytaj-600 dark:peer-checked:text-tytaj-400 transition-all">
                                        M-Pesa
                                    </div>
                                </label>
                                <label className="flex-1 cursor-pointer">
                                    <input type="radio" name="preferred_disbursement" value="bank" checked={formData.preferred_disbursement === 'bank'} onChange={handleChange} className="hidden peer" />
                                    <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest peer-checked:bg-tytaj-500/10 peer-checked:border-tytaj-500/50 peer-checked:text-tytaj-600 dark:peer-checked:text-tytaj-400 transition-all">
                                        Bank Account
                                    </div>
                                </label>
                            </div>
                        </InputWrapper>

                        <div className="grid grid-cols-1 gap-6">
                            <InputWrapper label="M-Pesa Phone Number">
                                <input name="mpesa_phone" value={formData.mpesa_phone} onChange={handleChange} className={inputClass} placeholder="07XXXXXXXX" />
                            </InputWrapper>
                        </div>
                        
                        <div className="pt-6 border-t border-gray-100 dark:border-white/5 space-y-6">
                            <div className="flex items-center gap-2">
                                <Landmark size={14} className="text-gray-400" />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bank Details (Optional)</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputWrapper label="Bank Name">
                                    <input name="bank_name" value={formData.bank_name} onChange={handleChange} className={inputClass} placeholder="Bank Name" />
                                </InputWrapper>
                                <InputWrapper label="Account Number">
                                    <input name="bank_account_number" value={formData.bank_account_number} onChange={handleChange} className={inputClass} placeholder="Account Number" />
                                </InputWrapper>
                            </div>
                            <InputWrapper label="Account Name">
                                <input name="bank_account_name" value={formData.bank_account_name} onChange={handleChange} className={inputClass} placeholder="Account Holder Name" />
                            </InputWrapper>
                        </div>
                    </motion.div>
                    )}

                    {activeTab === 'kyc' && (
                    <motion.div 
                        key="kyc"
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-6"
                    >
                        <div className="bg-tytaj-500/5 p-6 rounded-3xl border border-tytaj-500/10 flex items-center gap-4 mb-4">
                            <Camera size={20} className="text-tytaj-500" />
                            <p className="text-[10px] font-black text-tytaj-900 dark:text-tytaj-400 uppercase tracking-widest">Multi-Document KYC Verification</p>
                        </div>

                        {/* Existing Documents */}
                        {formData.kyc_documents?.length > 0 && (
                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Existing Documents</p>
                            <div className="grid grid-cols-1 gap-3">
                              {formData.kyc_documents.map((doc, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl">
                                  <div className="flex items-center gap-3">
                                    <FileText size={18} className="text-tytaj-500" />
                                    <span className="text-[10px] font-black uppercase">{doc.document_type || 'KYC Document'}</span>
                                  </div>
                                  <a href={doc.document_url} target="_blank" rel="noreferrer" className="text-tytaj-600 hover:text-tytaj-700 text-[10px] font-black uppercase tracking-widest">View</a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Staged Downloads */}
                        <div className="space-y-4">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Upload New Documents</p>
                          {kycFiles.map((kyc, idx) => (
                            <div key={idx} className="flex flex-col gap-3 p-4 bg-white dark:bg-slate-900 border border-tytaj-500/20 rounded-2xl">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-tytaj-500">{kyc.file.name}</span>
                                <button type="button" onClick={() => removeKycFile(idx)} className="text-rose-500 hover:text-rose-600">
                                  <X size={16} />
                                </button>
                              </div>
                              <select 
                                value={kyc.type} 
                                onChange={(e) => updateKycFileType(idx, e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl text-[10px] font-black uppercase"
                              >
                                <option value="National ID">National ID</option>
                                <option value="Passport">Passport</option>
                                <option value="Utility Bill">Utility Bill</option>
                                <option value="Passport Photo">Passport Photo</option>
                                <option value="KRA Pin">KRA Pin</option>
                                <option value="Other">Other</option>
                               </select>
                            </div>
                          ))}

                          <label className="flex items-center justify-center gap-3 w-full p-8 bg-gray-50 dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-[32px] hover:bg-tytaj-500/5 hover:border-tytaj-500/30 transition-all cursor-pointer group">
                            <Upload size={24} className="group-hover:text-tytaj-500 transition-colors" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Add Another Document</span>
                            <input type="file" className="hidden" onChange={handleAddKycFile} accept="image/*,.pdf" />
                          </label>
                        </div>
                    </motion.div>
                    )}
                </AnimatePresence>
              </form>
            </div>

            {/* Footer Area */}
            <div className="p-8 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row justify-end gap-6 bg-gray-50 dark:bg-white/5 rounded-b-2xl">
                <button 
                  onClick={onClose} 
                  type="button" 
                  className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <AnimatedButton 
                  form="client-form" 
                  type="submit" 
                  isLoading={loading}
                  className="px-10 py-5 rounded-3xl shadow-xl shadow-tytaj-600/20"
                >
                    {client ? 'Update Client' : 'Save Client'}
                </AnimatedButton>
            </div>
        </GlassCard>
      </motion.div>
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default ClientModal;
