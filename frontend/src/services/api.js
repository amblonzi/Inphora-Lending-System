import axios from 'axios';
import { logger } from '../utils/logger';

// Create Axios Instance
const apiClient = axios.create({
  // Default to relative path in production (proxied by Nginx)
  // In local dev, VITE_API_URL can be set, or Vite proxy handles it
  baseURL: import.meta.env.VITE_API_URL || '',
});

// Request Interceptor: Add Token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

// Response Interceptor: Logging & Error Handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Session expiration handling is now moved to AuthContext for cleaner token refresh flow
    return Promise.reject(error);
  }
);

// Helper to ensure we always have an array
const ensureArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.items && Array.isArray(data.items)) return data.items;
  return [];
};

// API Service Object
export const api = {
  // Expose the raw client if needed
  client: apiClient,

  // Auth Methods
  auth: {
    login: async (email, password) => {
      // Backend expects OAuth2 form data at /api/token
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const res = await apiClient.post('/api/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      return res.data;
    },
    verifyOtp: async (userId, otpCode) => {
      const res = await apiClient.post('/api/auth/verify-otp', { user_id: userId, otp_code: otpCode });
      return res.data;
    },
    verify2FA: async (email, otp) => {
      const res = await apiClient.post('/api/auth/verify-2fa', { email, otp });
      return res.data;
    },
    getProfile: async () => {
      const res = await apiClient.get('/api/users/me');
      return res.data;
    }
  },

  // Resource Methods
  users: {
    getAll: async () => {
      const res = await apiClient.get('/api/users/');
      return ensureArray(res.data);
    },
    getMe: async () => (await apiClient.get('/api/users/me')).data,
    create: async (data) => (await apiClient.post('/api/users/', data)).data,
    update: async (id, data) => (await apiClient.put(`/api/users/${id}`, data)).data,
    getActivityLogs: async (limit = 100) => {
      const res = await apiClient.get('/api/users/activity-logs', { params: { limit } });
      return ensureArray(res.data);
    },
  },
  clients: {
    list: async (params) => {
      const res = await apiClient.get('/api/clients/', { params });
      return ensureArray(res.data);
    },
    create: async (data) => (await apiClient.post('/api/clients/', data)).data,
    get: async (id) => (await apiClient.get(`/api/clients/${id}`)).data,
    update: async (id, data) => (await apiClient.put(`/api/clients/${id}`, data)).data,
    delete: async (id) => (await apiClient.delete(`/api/clients/${id}`)).data,
    addKycDocument: async (clientId, data) => (await apiClient.post(`/api/clients/${clientId}/kyc-documents`, data)).data,
  },

  loans: {
    list: async (params) => {
      const res = await apiClient.get('/api/loans/', { params });
      return ensureArray(res.data);
    },
    create: async (data) => (await apiClient.post('/api/loans/', data)).data,
    get: async (id) => (await apiClient.get(`/api/loans/${id}`)).data,
    approve: async (id) => (await apiClient.post(`/api/loans/${id}/approve`)).data,
    reject: async (id) => (await apiClient.post(`/api/loans/${id}/reject`)).data,
    disburse: async (id) => (await apiClient.post(`/api/loans/${id}/disburse`)).data,
    repay: async (id, data) => (await apiClient.post(`/api/loans/${id}/repayments`, data)).data,
    getSchedule: async (id) => {
      const res = await apiClient.get(`/api/loans/${id}/schedule`);
      return ensureArray(res.data);
    },
    exportStatement: async (id) => (await apiClient.get(`/api/loans/${id}/statement`, { responseType: 'blob' })),
  },

  loanProducts: {
    list: async () => {
      const res = await apiClient.get('/api/loan-products/');
      return ensureArray(res.data);
    },
    create: async (data) => (await apiClient.post('/api/loan-products/', data)).data,
    update: async (id, data) => (await apiClient.put(`/api/loan-products/${id}`, data)).data,
    delete: async (id) => (await apiClient.delete(`/api/loan-products/${id}`)).data,
  },

  expenses: {
    list: async (params) => {
      const res = await apiClient.get('/api/expenses/', { params });
      return ensureArray(res.data);
    },
    create: async (data) => (await apiClient.post('/api/expenses/', data)).data,
    delete: async (id) => (await apiClient.delete(`/api/expenses/${id}`)).data,

    categories: {
      list: async () => {
        const res = await apiClient.get('/api/expenses/categories/');
        return ensureArray(res.data);
      },
      create: async (data) => (await apiClient.post('/api/expenses/categories/', data)).data,
    }
  },

  branches: {
    list: async () => {
      const res = await apiClient.get('/api/branches/');
      return ensureArray(res.data);
    },
    create: async (data) => (await apiClient.post('/api/branches/', data)).data,
    update: async (id, data) => (await apiClient.put(`/api/branches/${id}`, data)).data,
    delete: async (id) => (await apiClient.delete(`/api/branches/${id}`)).data,
  },

  customerGroups: {
    list: async () => {
      const res = await apiClient.get('/api/customer-groups/');
      return ensureArray(res.data);
    },
    create: async (data) => (await apiClient.post('/api/customer-groups/', data)).data,
    update: async (id, data) => (await apiClient.put(`/api/customer-groups/${id}`, data)).data,
    delete: async (id) => (await apiClient.delete(`/api/customer-groups/${id}`)).data,
  },

  reports: {
    getProfitLoss: async (params) => (await apiClient.get('/api/reports/profit-loss', { params })).data,
    getPAR: async () => (await apiClient.get('/api/reports/portfolio-at-risk')).data,
    getPortfolioHealth: async () => (await apiClient.get('/api/reports/portfolio-health')).data,
    getClientTrends: async (months = 12) => {
      const res = await apiClient.get('/api/reports/client-trends', { params: { months } });
      return ensureArray(res.data);
    },
  },

  mpesa: {
    getUnmatched: async () => {
      const res = await apiClient.get('/api/mpesa/transactions/unmatched');
      return ensureArray(res.data);
    },
    reconcile: async (transId, loanId) => (await apiClient.post(`/api/mpesa/reconcile/${transId}/${loanId}`)).data,
    stkPush: async (loanId, amount) => (await apiClient.post(`/api/mpesa/stk/push/${loanId}`, null, { params: { amount } })).data,
    updateSettings: async (settings) => (await apiClient.post('/api/mpesa/settings', settings)).data,
    getBalance: async () => (await apiClient.get('/api/mpesa/balance')).data,
    getApplications: async () => (await apiClient.get('/api/mpesa/applications')).data,
    register: async (data) => (await apiClient.post('/api/mpesa/register', data)).data,
    getSettings: async () => (await apiClient.get('/api/mpesa/settings')).data,
  },

  organization: {
    getConfig: async () => (await apiClient.get('/api/organization/config')).data,
    updateConfig: async (data) => (await apiClient.put('/api/organization/config', data)).data,
    uploadLogo: async (formData) => {
      return (await apiClient.post('/api/organization/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })).data;
    }
  },

  disbursements: {
    mpesa: async (loanId, phone) => (await apiClient.post(`/api/disbursements/loans/${loanId}/disburse/mpesa`, null, { params: { phone } })).data,
    bank: async (loanId, reference) => (await apiClient.post(`/api/disbursements/loans/${loanId}/disburse/bank`, null, { params: { bank_reference: reference } })).data,
    manual: async (loanId, notes) => (await apiClient.post(`/api/disbursements/loans/${loanId}/disburse/manual`, null, { params: { notes } })).data,
    getHistory: async (params) => {
      const res = await apiClient.get('/api/disbursements/history', { params });
      return ensureArray(res.data);
    },
  },

  notifications: {
    list: async (params) => {
      const res = await apiClient.get('/api/notifications/', { params });
      return res.data?.items ?? (Array.isArray(res.data) ? res.data : []);
    },
    markAsRead: async (id) => (await apiClient.put(`/api/notifications/${id}/read`)).data,
    markAllAsRead: async () => (await apiClient.put('/api/notifications/read-all')).data,
  },

  dashboard: {
    getStats: async () => (await apiClient.get('/api/dashboard/stats')).data,
    getTrends: async () => (await apiClient.get('/api/dashboard/trends')).data,
  },

  // File Upload
  uploadFile: async (file, type = 'kyc') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    const res = await apiClient.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
};

export default api;
