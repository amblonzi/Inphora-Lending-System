import React, { createContext, useState, useContext, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const userData = await api.auth.getProfile();
          setUser(userData);
        } catch (error) {
          console.error("Failed to fetch user profile", error);
          logout();
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await api.auth.login(email, password);

      if (response.two_factor_required) {
        return { two_factor_required: true, user_id: response.user_id };
      }

      const { access_token, refresh_token } = response;
      localStorage.setItem('access_token', access_token);
      if (refresh_token) {
        localStorage.setItem('refresh_token', refresh_token);
      }

      // Fetch user profile immediately after login
      const userData = await api.auth.getProfile();
      setUser(userData);

      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message || "Login failed";
      setError(typeof errorMsg === 'object' ? errorMsg.message || JSON.stringify(errorMsg) : errorMsg);
      throw new Error(typeof errorMsg === 'object' ? errorMsg.message || "Login failed" : errorMsg);
    }
  };

  const verifyOtp = async (userId, otpCode) => {
    setError(null);
    try {
      const response = await api.auth.verifyOtp(userId, otpCode);
      const { access_token, refresh_token } = response;

      localStorage.setItem('access_token', access_token);
      if (refresh_token) {
        localStorage.setItem('refresh_token', refresh_token);
      }

      // Fetch user profile immediately after verification
      const userData = await api.auth.getProfile();
      setUser(userData);

      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || "Verification failed";
      setError(typeof errorMsg === 'object' ? errorMsg.message || "Verification failed" : errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // verify2FA via email + otp (used by /api/auth/verify-2fa endpoint)
  const verify2FA = async (email, otp) => {
    setError(null);
    try {
      const response = await api.auth.verify2FA(email, otp);

      if (response.success && response.data) {
        const { access_token, refresh_token } = response.data;
        localStorage.setItem('access_token', access_token);
        if (refresh_token) {
          localStorage.setItem('refresh_token', refresh_token);
        }

        const userData = await api.auth.getProfile();
        setUser(userData);
        return { success: true };
      }

      throw new Error(response.message || "2FA verification failed");
    } catch (error) {
      const errorMsg = error.response?.data?.detail?.message || error.message || "2FA verification failed";
      setError(typeof errorMsg === 'object' ? errorMsg.message || "2FA failed" : errorMsg);
      throw new Error(typeof errorMsg === 'object' ? errorMsg.message || "2FA failed" : errorMsg);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await api.auth.getProfile();
      setUser(userData);
    } catch (error) {
      console.error("Failed to refresh user profile", error);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, verifyOtp, verify2FA, logout, loading, error, clearError, api, refreshUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
