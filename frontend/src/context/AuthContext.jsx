import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { api } from '../services/api';
import { logger } from '../utils/logger';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Use the centralized API service
  // Note: Interceptors are already set up in the service

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await api.auth.getProfile();
          setUser(userData);
        } catch (error) {
          console.error("Failed to fetch user profile", error);
          // If fetching profile fails (e.g. invalid token), logout
          logout();
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.auth.login(email, password);

      if (response.two_factor_required) {
        return { two_factor_required: true, user_id: response.user_id };
      }

      const { access_token } = response;
      localStorage.setItem('token', access_token);

      // Fetch user profile immediately after login
      const userData = await api.auth.getProfile();
      setUser(userData);

      return { success: true };
    } catch (error) {
      console.error("Login failed", error);
      return { success: false, error: error.response?.data?.detail || "Login failed" };
    }
  };

  const verifyOtp = async (userId, otpCode) => {
    try {
      const response = await api.auth.verifyOtp(userId, otpCode);
      const { access_token } = response;

      localStorage.setItem('token', access_token);

      // Fetch user profile immediately after verification
      const userData = await api.auth.getProfile();
      setUser(userData);

      return { success: true };
    } catch (error) {
      console.error("OTP Verification failed", error);
      return { success: false, error: error.response?.data?.detail || "Verification failed" };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, verifyOtp, logout, loading, api }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
