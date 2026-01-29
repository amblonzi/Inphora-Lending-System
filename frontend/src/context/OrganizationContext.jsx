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
  const [orgConfig, setOrgConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrgConfig();
  }, []);

  const fetchOrgConfig = async () => {
    try {
      const data = await api.organization.getConfig();
      setOrgConfig(data);
      
      // Update document title
      if (data.organization_name) {
        document.title = data.organization_name;
      }
      
      // Apply theme colors to CSS variables
      if (data.primary_color) {
        document.documentElement.style.setProperty('--color-primary', data.primary_color);
      }
      if (data.secondary_color) {
        document.documentElement.style.setProperty('--color-secondary', data.secondary_color);
      }
    } catch (error) {
      console.error('Error fetching organization config:', error);
      // Set default config if fetch fails
      setOrgConfig({
        organization_name: 'Inphora Lending System',
        primary_color: '#f97316',
        secondary_color: '#0ea5e9',
        currency: 'KES',
        locale: 'en-KE',
        timezone: 'Africa/Nairobi'
      });
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
