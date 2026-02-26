import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const OrganizationContext = createContext();

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
};

export const OrganizationProvider = ({ children }) => {
  const [orgConfig, setOrgConfig] = useState(() => {
    // Initial load from sessionStorage if available
    const cached = sessionStorage.getItem('org_config');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(!orgConfig);

  useEffect(() => {
    fetchOrgConfig();
  }, []);

  const applyBranding = (data) => {
    if (data.organization_name) {
      document.title = data.organization_name;
    }
    if (data.primary_color) {
      document.documentElement.style.setProperty('--color-primary', data.primary_color);
    }
    if (data.secondary_color) {
      document.documentElement.style.setProperty('--color-secondary', data.secondary_color);
    }
  };

  // Apply branding if we have cached config
  useEffect(() => {
    if (orgConfig) {
      applyBranding(orgConfig);
    }
  }, [orgConfig]);

  const fetchOrgConfig = async () => {
    try {
      const data = await api.organization.getConfig();
      setOrgConfig(data);
      sessionStorage.setItem('org_config', JSON.stringify(data));
      applyBranding(data);
    } catch (error) {
      console.error('Error fetching organization config:', error);
      if (!orgConfig) {
        // Only set defaults if we don't even have cached data
        const defaults = {
          organization_name: 'Inphora Lending System',
          primary_color: '#f97316',
          secondary_color: '#0ea5e9',
          currency: 'KES',
          locale: 'en-KE',
          timezone: 'Africa/Nairobi'
        };
        setOrgConfig(defaults);
        applyBranding(defaults);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshOrgConfig = () => {
    fetchOrgConfig();
  };

  return (
    <OrganizationContext.Provider value={{ orgConfig, loading, refreshOrgConfig }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export default OrganizationContext;
