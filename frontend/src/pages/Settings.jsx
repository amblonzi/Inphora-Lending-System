import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Save, Key, CreditCard, MessageSquare, Lock, ShieldCheck, Smartphone, Radio, Settings as SettingsIcon, Terminal, Building, Upload } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import AnimatedButton from '../components/ui/AnimatedButton';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const Settings = () => {
  const { api, user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('organization');
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [orgConfig, setOrgConfig] = useState(null);
  const [orgLoading, setOrgLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    if (activeTab === 'payment' || activeTab === 'sms') {
      fetchSettings(activeTab);
    } else if (activeTab === 'organization') {
      fetchOrgConfig();
    }
  }, [activeTab]);

  const fetchSettings = async (category) => {
    setLoading(true);
    try {
      const data = await api.client.get(`/api/settings/?category=${category}`);
      const settingsObj = {};
      data.data.forEach(s => {
        settingsObj[s.setting_key] = s.setting_value;
      });
      setSettings(settingsObj);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load configuration settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key, value, category) => {
    try {
      await api.client.post('/api/settings/', null, {
        params: {
          setting_key: key,
          setting_value: value,
          category: category
        }
      });
      toast.success(`${key} saved`);
    } catch (error) {
      toast.error(`Error saving ${key}`);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Passcodes do not match');
      return;
    }

    try {
      await api.client.put('/api/settings/users/me/password/', null, {
        params: {
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }
      });
      toast.success('Security credentials updated');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error updating credentials');
    }
  };

  const handleUpdateAccount = async (data) => {
    if (data.two_factor_enabled && !user?.phone && !data.phone) {
      toast.error('Please set a phone number before enabling 2FA');
      return;
    }
    try {
      await api.users.update(user.id, data);
      toast.success('Security profile updated');
      await refreshUser();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error updating account security');
    }
  };

  const fetchOrgConfig = async () => {
    setOrgLoading(true);
    try {
      const data = await api.organization.getConfig();
      setOrgConfig(data);
    } catch (error) {
      console.error('Error fetching organization config:', error);
      toast.error('Failed to load organization configuration');
    } finally {
      setOrgLoading(false);
    }
  };

  const saveOrgConfig = async (updatedConfig) => {
    try {
      await api.organization.updateConfig(updatedConfig);
      toast.success('Organization configuration updated');
      // Update local state to reflect changes immediately without full reload if possible,
      // but to be safe we can just set it.
      setOrgConfig(updatedConfig);
    } catch (error) {
      console.error('Error updating organization config:', error);
      toast.error(error.response?.data?.detail || 'Failed to update organization configuration');
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'logo');

    setUploadingLogo(true);
    try {
      // Assuming generic upload endpoint at /api/upload
      // Use standard fetch or api client if it supports multipart/form-data efficiently
      // api.client is likely an axios instance
      const response = await api.client.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const logoUrl = response.data.url;
      // Save the new URL to org config
      const updatedConfig = { ...orgConfig, logo_url: logoUrl };
      setOrgConfig(updatedConfig); // optimistic update
      await saveOrgConfig(updatedConfig);

      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Logo upload error:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const tabs = [
    { id: 'organization', label: 'Organization', icon: Building },
    { id: 'payment', label: 'Payment Settings', icon: CreditCard },
    { id: 'sms', label: 'SMS Gateway', icon: MessageSquare },
    { id: 'account', label: 'Account Security', icon: Key },
  ];

  return (
    <div className="space-y-10 pb-10">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <SettingsIcon size={18} className="text-tytaj-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500">Settings</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-3 font-medium text-lg tracking-tight">Configure system integrations and security settings.</p>
        </div>
      </div>

      {/* Segmented Control Tabs */}
      <div className="flex bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl w-full xl:w-fit border border-gray-100 dark:border-white/5 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all min-w-[180px] ${activeTab === tab.id
              ? 'bg-white dark:bg-slate-900 text-tytaj-600 dark:text-tytaj-400 shadow-md ring-1 ring-gray-100 dark:ring-white/10'
              : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-5xl">
        {/* Organization Config Tab */}
        {activeTab === 'organization' && (
          <div className="space-y-8">
            <GlassCard className="p-10 border-white/20 dark:border-white/5 shadow-2xl relative overflow-hidden group">
              <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-tytaj-500/5 blur-[100px] group-hover:bg-tytaj-500/10 transition-all duration-700" />

              <div className="flex items-center gap-4 mb-10 pb-6 border-b border-gray-100 dark:border-white/5 relative z-10">
                <div className="p-4 bg-tytaj-500/10 dark:bg-tytaj-500/20 text-tytaj-600 dark:text-tytaj-400 rounded-2xl border border-tytaj-500/20">
                  <Building size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Organization Identity</h3>
                  <p className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">Branding & Business Configuration</p>
                </div>
              </div>

              {orgLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-pulse text-gray-400 dark:text-gray-600">Loading configuration...</div>
                </div>
              ) : orgConfig ? (
                <div className="space-y-10 relative z-10">
                  {/* Branding Section */}
                  <div>
                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6">Brand Identity</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Organization Name</label>
                        <input
                          type="text"
                          defaultValue={orgConfig.organization_name}
                          onBlur={(e) => saveOrgConfig({ ...orgConfig, organization_name: e.target.value })}
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Primary Color</label>
                        <div className="flex gap-3">
                          <input
                            type="color"
                            defaultValue={orgConfig.primary_color}
                            onBlur={(e) => saveOrgConfig({ ...orgConfig, primary_color: e.target.value })}
                            className="h-14 w-20 rounded-xl cursor-pointer border-2 border-gray-200 dark:border-white/10"
                          />
                          <input
                            type="text"
                            defaultValue={orgConfig.primary_color}
                            onBlur={(e) => saveOrgConfig({ ...orgConfig, primary_color: e.target.value })}
                            className="flex-1 px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-mono"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Secondary Color</label>
                        <div className="flex gap-3">
                          <input
                            type="color"
                            defaultValue={orgConfig.secondary_color}
                            onBlur={(e) => saveOrgConfig({ ...orgConfig, secondary_color: e.target.value })}
                            className="h-14 w-20 rounded-xl cursor-pointer border-2 border-gray-200 dark:border-white/10"
                          />
                          <input
                            type="text"
                            defaultValue={orgConfig.secondary_color}
                            onBlur={(e) => saveOrgConfig({ ...orgConfig, secondary_color: e.target.value })}
                            className="flex-1 px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-mono"
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Organization Logo</label>
                        <div className="flex items-center gap-4">
                          <div className="relative group/logo w-24 h-24 rounded-2xl bg-gray-50 dark:bg-black/30 border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden">
                            {orgConfig.logo_url ? (
                              <img src={orgConfig.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                            ) : (
                              <Building className="text-gray-300 dark:text-gray-600" size={32} />
                            )}
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity">
                              {uploadingLogo ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <label htmlFor="logo-upload" className="cursor-pointer text-white">
                                  <Upload size={20} />
                                </label>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Upload your organization's logo.</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-600">Recommended size: 500x500px </p>
                            <input
                              id="logo-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleLogoUpload}
                              disabled={uploadingLogo}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">System Slug (Unique ID)</label>
                        <div className="relative">
                          <span className="absolute left-5 top-4 text-gray-400 dark:text-gray-600 font-mono text-sm">app.inphora.com/</span>
                          <input
                            type="text"
                            defaultValue={orgConfig.slug || ''}
                            onBlur={(e) => saveOrgConfig({ ...orgConfig, slug: e.target.value })}
                            placeholder="my-organization"
                            className="w-full pl-36 pr-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-mono"
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 ml-1">This is your unique identifier for dedicated access links.</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="pt-8 border-t border-gray-100 dark:border-white/5">
                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6">Contact Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Contact Email</label>
                        <input
                          type="email"
                          defaultValue={orgConfig.contact_email || ''}
                          onBlur={(e) => saveOrgConfig({ ...orgConfig, contact_email: e.target.value })}
                          placeholder="contact@organization.com"
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Contact Phone</label>
                        <input
                          type="text"
                          defaultValue={orgConfig.contact_phone || ''}
                          onBlur={(e) => saveOrgConfig({ ...orgConfig, contact_phone: e.target.value })}
                          placeholder="+254 700 000 000"
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-medium"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Physical Address</label>
                        <textarea
                          defaultValue={orgConfig.address || ''}
                          onBlur={(e) => saveOrgConfig({ ...orgConfig, address: e.target.value })}
                          placeholder="Enter organization address"
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-medium min-h-[100px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Business Details */}
                  <div className="pt-8 border-t border-gray-100 dark:border-white/5">
                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6">Business Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Registration Number</label>
                        <input
                          type="text"
                          defaultValue={orgConfig.registration_number || ''}
                          onBlur={(e) => saveOrgConfig({ ...orgConfig, registration_number: e.target.value })}
                          placeholder="Business registration number"
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Tax ID / KRA PIN</label>
                        <input
                          type="text"
                          defaultValue={orgConfig.tax_id || ''}
                          onBlur={(e) => saveOrgConfig({ ...orgConfig, tax_id: e.target.value })}
                          placeholder="Tax identification number"
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Localization */}
                  <div className="pt-8 border-t border-gray-100 dark:border-white/5">
                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6">Localization</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Currency</label>
                        <input
                          type="text"
                          defaultValue={orgConfig.currency}
                          onBlur={(e) => saveOrgConfig({ ...orgConfig, currency: e.target.value })}
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Locale</label>
                        <input
                          type="text"
                          defaultValue={orgConfig.locale}
                          onBlur={(e) => saveOrgConfig({ ...orgConfig, locale: e.target.value })}
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Timezone</label>
                        <input
                          type="text"
                          defaultValue={orgConfig.timezone}
                          onBlur={(e) => saveOrgConfig({ ...orgConfig, timezone: e.target.value })}
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </GlassCard>
          </div>
        )}

        {/* Payment APIs Tab */}
        {activeTab === 'payment' && (
          <GlassCard className="p-10 border-white/20 dark:border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-blue-500/5 blur-[100px] group-hover:bg-blue-500/10 transition-all duration-700" />

            <div className="flex items-center gap-4 mb-10 pb-6 border-b border-gray-100 dark:border-white/5 relative z-10">
              <div className="p-4 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-500/20">
                <Smartphone size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">M-Pesa Integration</h3>
                <p className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">Daraja API Configuration</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Consumer Key</label>
                <input
                  type="text"
                  defaultValue={settings.mpesa_consumer_key || ''}
                  onBlur={(e) => saveSetting('mpesa_consumer_key', e.target.value, 'payment')}
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Consumer Secret</label>
                <input
                  type="password"
                  defaultValue={settings.mpesa_consumer_secret || ''}
                  onBlur={(e) => saveSetting('mpesa_consumer_secret', e.target.value, 'payment')}
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Business Shortcode</label>
                <input
                  type="text"
                  defaultValue={settings.mpesa_shortcode || ''}
                  onBlur={(e) => saveSetting('mpesa_shortcode', e.target.value, 'payment')}
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Passkey</label>
                <input
                  type="password"
                  defaultValue={settings.mpesa_passkey || ''}
                  onBlur={(e) => saveSetting('mpesa_passkey', e.target.value, 'payment')}
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black"
                />
              </div>
            </div>
          </GlassCard>
        )}

        {/* Bulk SMS Tab */}
        {activeTab === 'sms' && (
          <GlassCard className="p-10 border-white/20 dark:border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-amber-500/5 blur-[100px] group-hover:bg-amber-500/10 transition-all duration-700" />

            <div className="flex items-center gap-4 mb-10 pb-6 border-b border-gray-100 dark:border-white/5 relative z-10">
              <div className="p-4 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/20">
                <Radio size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">SMS Gateway</h3>
                <p className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">SMS Configuration</p>
              </div>
            </div>

            <div className="space-y-8 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">API Key</label>
                  <input
                    type="text"
                    defaultValue={settings.sms_api_key || ''}
                    onBlur={(e) => saveSetting('sms_api_key', e.target.value, 'sms')}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Sender ID</label>
                  <input
                    type="text"
                    defaultValue={settings.sms_sender_id || ''}
                    onBlur={(e) => saveSetting('sms_sender_id', e.target.value, 'sms')}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-black"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Loan Approval Message</label>
                <textarea
                  defaultValue={settings.sms_loan_approval || 'Dear {client_name}, your capital deployment of KES {amount} has been synchronized.'}
                  onBlur={(e) => saveSetting('sms_loan_approval', e.target.value, 'sms')}
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-tytaj-500/20 focus:border-tytaj-500 outline-none transition-all dark:text-white font-medium min-h-[120px]"
                />
              </div>
            </div>
          </GlassCard>
        )}

        {/* Security Tab */}
        {activeTab === 'account' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <GlassCard className="p-10 border-white/20 dark:border-white/5 shadow-2xl group relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-rose-500/5 blur-[100px] group-hover:bg-rose-500/10 transition-all duration-700" />

              <div className="flex items-center gap-4 mb-10 pb-6 border-b border-gray-100 dark:border-white/5 relative z-10">
                <div className="p-4 bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-500/20">
                  <Lock size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Change Password</h3>
                  <p className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">Update Your Password</p>
                </div>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-6 relative z-10">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all dark:text-white font-black"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all dark:text-white font-black"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all dark:text-white font-black"
                  />
                </div>
                <AnimatedButton type="submit" className="w-full py-4 mt-4 shadow-xl shadow-rose-600/20 bg-rose-600">
                  <Save size={18} className="mr-2" /> Update Password
                </AnimatedButton>
              </form>
            </GlassCard>

            <div className="space-y-8">
              <GlassCard className="p-10 border-white/20 dark:border-white/5 shadow-xl group relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-emerald-500/5 blur-[100px] group-hover:bg-emerald-500/10 transition-all duration-700" />
                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100 dark:border-white/5 relative z-10">
                  <div className="p-4 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-500/20">
                    <ShieldCheck size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Two-Factor Auth</h3>
                    <p className="text-[10px] font-black text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-widest mt-1">Status: {user?.two_factor_enabled ? 'Active' : 'Disabled'}</p>
                  </div>
                </div>

                <div className="space-y-6 relative z-10">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Phone Number</label>
                    <div className="relative">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        defaultValue={user?.phone || ''}
                        placeholder="+254 700 000 000"
                        onBlur={(e) => handleUpdateAccount({ phone: e.target.value })}
                        className="w-full pl-12 pr-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white font-black"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Enable 2FA</span>
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">OTP via SMS on Login</span>
                    </div>
                    <button
                      onClick={() => handleUpdateAccount({ two_factor_enabled: !user?.two_factor_enabled })}
                      className={`w-14 h-7 rounded-full transition-all relative ${user?.two_factor_enabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${user?.two_factor_enabled ? 'left-8' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-10 border-white/20 dark:border-white/5 shadow-xl group">
                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100 dark:border-white/5">
                  <div className="p-4 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-500/20">
                    <ShieldCheck size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Account Info</h3>
                    <p className="text-[10px] font-black text-blue-600/60 dark:text-blue-400/60 uppercase tracking-widest mt-1">Active Session</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-white/5">
                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Email</span>
                    <span className="text-sm font-black text-gray-900 dark:text-white tracking-tight">{user?.email}</span>
                  </div>
                  <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-white/5">
                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Role</span>
                    <span className="text-tytaj-600 dark:text-tytaj-400 font-black uppercase tracking-[0.2em] bg-tytaj-500/10 dark:bg-tytaj-500/20 px-4 py-1.5 rounded-xl text-[9px] border border-tytaj-500/20">{user?.role}</span>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-8 border-rose-500/20 dark:border-rose-500/10 bg-rose-500/5">
                <h4 className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-[0.3em] mb-3">Important Notice</h4>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-relaxed">
                  Modifying system settings can affect automated processes. Ensure all API keys are verified before saving changes.
                </p>
              </GlassCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
